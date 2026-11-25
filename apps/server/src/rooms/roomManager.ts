import crypto from 'node:crypto';
import type { Server } from 'socket.io';
import {
  GAME_DEFAULTS,
  SCORING,
  type ChatMessage,
  type ClientToServerEvents,
  type DrawingEndInput,
  type DrawingMoveInput,
  type DrawingStartInput,
  type GameEndPayload,
  type GamePhase,
  type Player,
  type PublicRoomSummary,
  type RoomSettings,
  type RoomState,
  type ServerToClientEvents,
  type Stroke,
  type UpdateSettingsInput,
} from '@doodlio/shared';
import {
  createInitialHint,
  evaluateGuess,
  pickWordOptions,
  revealOneHintLetter,
} from '../game/words';
import { persistMatchResults } from '../services/persistence';
import { signSessionToken } from '../services/token';
import { logger } from '../utils/logger';

export type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;

interface InternalPlayer extends Player {
  socketId: string | null;
  userId?: string;
  correctGuessesCount: number;
  drawerPointsTotal: number;
  hadFirstGuess: boolean;
  hadFullRoomDraw: boolean;
  disconnectTimer?: NodeJS.Timeout;
}

interface InternalRoom {
  code: string;
  phase: GamePhase;
  players: Map<string, InternalPlayer>;
  settings: RoomSettings;
  currentRound: number;
  turnQueue: string[];
  turnIndex: number;
  currentDrawerId: string | null;
  wordOptions: string[];
  secretWord: string | null;
  wordHint: string;
  usedWords: Set<string>;
  guessOrderCount: number;
  roundScores: Record<string, number>;
  phaseEndsAt: number | null;
  phaseTimer?: NodeJS.Timeout;
  hintTimers: NodeJS.Timeout[];
  cleanupTimer?: NodeJS.Timeout;
  strokes: Stroke[];
  redoStack: Stroke[];
  chatHistory: ChatMessage[];
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < GAME_DEFAULTS.ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function toPublicPlayer(p: InternalPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: p.score,
    roundScore: p.roundScore,
    isHost: p.isHost,
    isReady: p.isReady,
    isConnected: p.isConnected,
    hasGuessed: p.hasGuessed,
    role: p.role,
  };
}

export class RoomManager {
  private readonly rooms = new Map<string, InternalRoom>();
  private readonly socketToPlayer = new Map<string, { roomCode: string; playerId: string }>();

  constructor(private readonly io: TypedIO) {}

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPublicRooms(): PublicRoomSummary[] {
    const list: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.settings.isPublic) continue;
      const connected = Array.from(room.players.values()).filter((p) => p.isConnected);
      if (connected.length === 0) continue;
      const host = Array.from(room.players.values()).find((p) => p.isHost);
      list.push({
        code: room.code,
        hostName: host?.name ?? 'Host',
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        phase: room.phase,
        language: room.settings.language,
        rounds: room.settings.rounds,
      });
    }
    return list;
  }

  toRoomState(room: InternalRoom): RoomState {
    return {
      code: room.code,
      phase: room.phase,
      players: Array.from(room.players.values()).map(toPublicPlayer),
      settings: room.settings,
      currentRound: room.currentRound,
      totalRounds: room.settings.rounds,
      currentDrawerId: room.currentDrawerId,
      wordHint: room.wordHint,
      wordLength: room.secretWord ? room.secretWord.length : 0,
      phaseEndsAt: room.phaseEndsAt,
      serverTime: Date.now(),
    };
  }

  createRoom(
    socketId: string,
    playerName: string,
    avatar: string,
    settingsInput?: Partial<RoomSettings>,
    userId?: string
  ): { room: InternalRoom; player: InternalPlayer; token: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const playerId = crypto.randomUUID();
    const settings: RoomSettings = {
      isPublic: settingsInput?.isPublic ?? false,
      language: settingsInput?.language ?? 'en',
      categories: settingsInput?.categories?.length ? settingsInput.categories : ['random'],
      rounds: settingsInput?.rounds ?? GAME_DEFAULTS.DEFAULT_ROUNDS,
      drawTime: settingsInput?.drawTime ?? GAME_DEFAULTS.DEFAULT_DRAW_TIME,
      maxPlayers: settingsInput?.maxPlayers ?? GAME_DEFAULTS.MAX_PLAYERS,
    };

    const player: InternalPlayer = {
      id: playerId,
      socketId,
      userId,
      name: playerName,
      avatar,
      score: 0,
      roundScore: 0,
      isHost: true,
      isReady: true,
      isConnected: true,
      hasGuessed: false,
      role: 'GUESSER',
      correctGuessesCount: 0,
      drawerPointsTotal: 0,
      hadFirstGuess: false,
      hadFullRoomDraw: false,
    };

    const room: InternalRoom = {
      code,
      phase: 'WAITING',
      players: new Map([[playerId, player]]),
      settings,
      currentRound: 0,
      turnQueue: [],
      turnIndex: 0,
      currentDrawerId: null,
      wordOptions: [],
      secretWord: null,
      wordHint: '',
      usedWords: new Set(),
      guessOrderCount: 0,
      roundScores: {},
      phaseEndsAt: null,
      hintTimers: [],
      strokes: [],
      redoStack: [],
      chatHistory: [],
    };

    this.rooms.set(code, room);
    this.socketToPlayer.set(socketId, { roomCode: code, playerId });

    const token = signSessionToken({ playerId, roomCode: code, iat: Date.now() });
    this.pushSystemMessage(room, `${player.name} created the room.`);
    logger.info('Room created', { roomCode: code, isPublic: settings.isPublic });

    return { room, player, token };
  }

  joinRoom(
    socketId: string,
    code: string,
    playerName: string,
    avatar: string,
    userId?: string
  ): { ok: true; room: InternalRoom; player: InternalPlayer; token: string } | { ok: false; error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      return { ok: false, error: 'Room not found. Check the code and try again.' };
    }

    if (room.players.size >= room.settings.maxPlayers) {
      return { ok: false, error: 'This room is full.' };
    }

    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
    );
    if (nameTaken) {
      return { ok: false, error: 'That nickname is already taken in this room.' };
    }

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = undefined;
    }

    const playerId = crypto.randomUUID();
    const player: InternalPlayer = {
      id: playerId,
      socketId,
      userId,
      name: playerName.trim(),
      avatar,
      score: 0,
      roundScore: 0,
      isHost: false,
      isReady: false,
      isConnected: true,
      hasGuessed: false,
      role: room.phase === 'DRAWING' || room.phase === 'WORD_SELECTION' ? 'GUESSER' : 'GUESSER',
      correctGuessesCount: 0,
      drawerPointsTotal: 0,
      hadFirstGuess: false,
      hadFullRoomDraw: false,
    };

    room.players.set(playerId, player);
    this.socketToPlayer.set(socketId, { roomCode: room.code, playerId });

    const token = signSessionToken({ playerId, roomCode: room.code, iat: Date.now() });
    this.pushSystemMessage(room, `${player.name} joined the room.`);
    this.broadcastRoomState(room);

    return { ok: true, room, player, token };
  }

  reconnectPlayer(
    socketId: string,
    roomCode: string,
    playerId: string
  ):
    | { ok: true; room: InternalRoom; player: InternalPlayer; secretWord: string | null; wordOptions: string[] }
    | { ok: false; error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      return { ok: false, error: 'Room no longer exists.' };
    }
    const player = room.players.get(playerId);
    if (!player) {
      return { ok: false, error: 'Player session expired.' };
    }

    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
    }
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = undefined;
    }

    if (player.socketId) {
      this.socketToPlayer.delete(player.socketId);
    }

    player.socketId = socketId;
    player.isConnected = true;
    this.socketToPlayer.set(socketId, { roomCode: room.code, playerId });
    this.broadcastRoomState(room);

    const isDrawer = room.currentDrawerId === player.id;
    return {
      ok: true,
      room,
      player,
      secretWord: isDrawer ? room.secretWord : null,
      wordOptions: isDrawer && room.phase === 'WORD_SELECTION' ? room.wordOptions : [],
    };
  }

  handleDisconnect(socketId: string): void {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(mapping.roomCode);
    if (!room) return;
    const player = room.players.get(mapping.playerId);
    if (!player) return;

    player.isConnected = false;
    player.socketId = null;
    this.broadcastRoomState(room);

    player.disconnectTimer = setTimeout(() => {
      this.removePlayer(room.code, player.id, 'disconnected');
    }, GAME_DEFAULTS.RECONNECT_GRACE_MS);

    this.checkEmptyRoom(room);
  }

  leaveRoom(socketId: string): { roomCode: string } | null {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return null;
    this.socketToPlayer.delete(socketId);
    this.removePlayer(mapping.roomCode, mapping.playerId, 'left');
    return { roomCode: mapping.roomCode };
  }

  private removePlayer(roomCode: string, playerId: string, reason: 'left' | 'disconnected'): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
    }

    const wasHost = player.isHost;
    const wasDrawer = room.currentDrawerId === playerId;
    room.players.delete(playerId);

    this.pushSystemMessage(
      room,
      `${player.name} ${reason === 'left' ? 'left' : 'disconnected from'} the room.`
    );

    if (room.players.size === 0) {
      this.scheduleRoomCleanup(room);
      return;
    }

    if (wasHost) {
      const nextHost = Array.from(room.players.values())[0];
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
        this.pushSystemMessage(room, `${nextHost.name} is now the host.`);
      }
    }

    if (wasDrawer && (room.phase === 'DRAWING' || room.phase === 'WORD_SELECTION')) {
      this.endRound(room, 'drawer_left');
      return;
    }

    if (room.phase !== 'WAITING' && room.players.size < GAME_DEFAULTS.MIN_PLAYERS) {
      this.endGame(room);
      return;
    }

    this.broadcastRoomState(room);
  }

  private checkEmptyRoom(room: InternalRoom): void {
    const anyConnected = Array.from(room.players.values()).some((p) => p.isConnected);
    if (!anyConnected) {
      this.scheduleRoomCleanup(room);
    }
  }

  private scheduleRoomCleanup(room: InternalRoom): void {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.cleanupTimer = setTimeout(() => {
      const r = this.rooms.get(room.code);
      if (!r) return;
      const anyConnected = Array.from(r.players.values()).some((p) => p.isConnected);
      if (!anyConnected) {
        this.clearRoomTimers(r);
        this.rooms.delete(r.code);
        logger.info('Cleaned up empty room', { roomCode: r.code });
      }
    }, GAME_DEFAULTS.EMPTY_ROOM_TTL_MS);
  }

  getPlayerContext(socketId: string): { room: InternalRoom; player: InternalPlayer } | null {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return null;
    const room = this.rooms.get(mapping.roomCode);
    if (!room) return null;
    const player = room.players.get(mapping.playerId);
    if (!player) return null;
    return { room, player };
  }

  toggleReady(socketId: string, isReady: boolean): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    if (ctx.room.phase !== 'WAITING') {
      return { ok: false, error: 'Game already in progress.' };
    }
    ctx.player.isReady = ctx.player.isHost ? true : isReady;
    this.broadcastRoomState(ctx.room);
    return { ok: true };
  }

  updateSettings(
    socketId: string,
    input: UpdateSettingsInput
  ): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    if (!ctx.player.isHost) return { ok: false, error: 'Only the host can change settings.' };
    if (ctx.room.phase !== 'WAITING') {
      return { ok: false, error: 'Cannot change settings during a match.' };
    }

    ctx.room.settings = {
      ...ctx.room.settings,
      ...input,
      categories: input.categories?.length ? input.categories : ctx.room.settings.categories,
    };

    this.io.to(ctx.room.code).emit('room:settings-updated', ctx.room.settings);
    this.broadcastRoomState(ctx.room);
    return { ok: true };
  }

  startGame(socketId: string): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    const { room, player } = ctx;
    if (!player.isHost) return { ok: false, error: 'Only the host can start the game.' };
    if (room.phase !== 'WAITING' && room.phase !== 'GAME_END') {
      return { ok: false, error: 'Game is already running.' };
    }

    const activePlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    if (activePlayers.length < GAME_DEFAULTS.MIN_PLAYERS) {
      return { ok: false, error: `At least ${GAME_DEFAULTS.MIN_PLAYERS} players are required.` };
    }

    const allReady = activePlayers.every((p) => p.isHost || p.isReady);
    if (!allReady) {
      return { ok: false, error: 'Waiting for all players to be ready.' };
    }

    // Reset scores & turn queue
    room.currentRound = 1;
    room.usedWords.clear();
    room.strokes = [];
    room.redoStack = [];
    for (const p of room.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
      p.role = 'GUESSER';
      p.correctGuessesCount = 0;
      p.drawerPointsTotal = 0;
    }

    room.turnQueue = activePlayers.map((p) => p.id);
    room.turnIndex = 0;

    this.io.to(room.code).emit('game:started', this.toRoomState(room));
    this.startNextTurn(room);
    return { ok: true };
  }

  playAgain(socketId: string): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    if (!ctx.player.isHost) return { ok: false, error: 'Only the host can restart the game.' };

    ctx.room.phase = 'WAITING';
    ctx.room.currentRound = 0;
    ctx.room.currentDrawerId = null;
    ctx.room.secretWord = null;
    ctx.room.wordHint = '';
    ctx.room.strokes = [];
    ctx.room.redoStack = [];
    for (const p of ctx.room.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.hasGuessed = false;
      p.role = 'GUESSER';
      p.isReady = p.isHost;
    }

    this.broadcastRoomState(ctx.room);
    return { ok: true };
  }

  private startNextTurn(room: InternalRoom): void {
    this.clearRoomTimers(room);

    // Advance round if queue exhausted
    while (room.turnIndex < room.turnQueue.length) {
      const candidateId = room.turnQueue[room.turnIndex]!;
      const candidate = room.players.get(candidateId);
      if (candidate && candidate.isConnected) {
        break;
      }
      room.turnIndex++;
    }

    if (room.turnIndex >= room.turnQueue.length) {
      if (room.currentRound >= room.settings.rounds) {
        this.endGame(room);
        return;
      }
      room.currentRound += 1;
      room.turnQueue = Array.from(room.players.values())
        .filter((p) => p.isConnected)
        .map((p) => p.id);
      room.turnIndex = 0;
    }

    const drawerId = room.turnQueue[room.turnIndex] ?? null;
    room.turnIndex += 1;
    if (!drawerId) {
      this.endGame(room);
      return;
    }

    room.currentDrawerId = drawerId;
    room.secretWord = null;
    room.wordHint = '';
    room.guessOrderCount = 0;
    room.roundScores = {};
    room.strokes = [];
    room.redoStack = [];

    for (const p of room.players.values()) {
      p.roundScore = 0;
      p.hasGuessed = false;
      p.role = p.id === drawerId ? 'DRAWER' : 'GUESSER';
    }

    const options = pickWordOptions(
      room.settings.language,
      room.settings.categories,
      room.usedWords,
      3
    );
    room.wordOptions = options;
    room.phase = 'WORD_SELECTION';
    const expiresAt = Date.now() + GAME_DEFAULTS.WORD_SELECTION_TIME * 1000;
    room.phaseEndsAt = expiresAt;

    this.io.to(room.code).emit('drawing:clear');
    this.emitPhaseChanged(room);

    const drawer = room.players.get(drawerId);
    if (drawer?.socketId) {
      this.io.to(drawer.socketId).emit('game:word-options', {
        options,
        expiresAt,
      });
    }

    this.pushSystemMessage(room, `${drawer?.name ?? 'Drawer'} is choosing a word...`);

    room.phaseTimer = setTimeout(() => {
      if (room.phase === 'WORD_SELECTION' && room.wordOptions[0]) {
        this.activateWord(room, room.wordOptions[0]);
      }
    }, GAME_DEFAULTS.WORD_SELECTION_TIME * 1000);
  }

  selectWord(socketId: string, word: string): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    const { room, player } = ctx;

    if (room.phase !== 'WORD_SELECTION') {
      return { ok: false, error: 'Not currently selecting a word.' };
    }
    if (room.currentDrawerId !== player.id) {
      return { ok: false, error: 'Only the current drawer can select the word.' };
    }
    if (!room.wordOptions.includes(word)) {
      return { ok: false, error: 'Invalid word choice.' };
    }

    this.activateWord(room, word);
    return { ok: true };
  }

  private activateWord(room: InternalRoom, word: string): void {
    this.clearRoomTimers(room);

    room.secretWord = word;
    room.usedWords.add(word);
    room.wordHint = createInitialHint(word);
    room.phase = 'DRAWING';

    const drawMs = room.settings.drawTime * 1000;
    room.phaseEndsAt = Date.now() + drawMs;

    this.emitPhaseChanged(room);

    const drawer = room.currentDrawerId ? room.players.get(room.currentDrawerId) : null;
    if (drawer?.socketId) {
      this.io.to(drawer.socketId).emit('game:word-assigned', { word });
    }

    // Progressive hints at 50% and 25% remaining time
    const hintAt1 = Math.floor(drawMs * 0.5);
    const hintAt2 = Math.floor(drawMs * 0.75);
    room.hintTimers.push(
      setTimeout(() => this.revealHint(room), hintAt1),
      setTimeout(() => this.revealHint(room), hintAt2)
    );

    room.phaseTimer = setTimeout(() => {
      this.endRound(room, 'time_up');
    }, drawMs);
  }

  private revealHint(room: InternalRoom): void {
    if (room.phase !== 'DRAWING' || !room.secretWord) return;
    const nextHint = revealOneHintLetter(room.secretWord, room.wordHint);
    if (nextHint !== room.wordHint) {
      room.wordHint = nextHint;
      this.io.to(room.code).emit('game:hint-updated', { wordHint: nextHint });
    }
  }

  handleGuessOrChat(socketId: string, text: string): { ok: true } | { ok: false; error: string } {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return { ok: false, error: 'Not in a room.' };
    const { room, player } = ctx;

    // During DRAWING phase, guessers submit guesses; drawer & already-guessed players chat
    if (
      room.phase === 'DRAWING' &&
      room.secretWord &&
      player.role === 'GUESSER' &&
      !player.hasGuessed
    ) {
      const result = evaluateGuess(text, room.secretWord);

      if (result === 'exact') {
        player.hasGuessed = true;
        player.correctGuessesCount += 1;
        room.guessOrderCount += 1;

        const points =
          room.guessOrderCount === 1
            ? SCORING.FIRST_GUESS
            : room.guessOrderCount === 2
              ? SCORING.SECOND_GUESS
              : room.guessOrderCount === 3
                ? SCORING.THIRD_GUESS
                : SCORING.OTHER_GUESS;

        player.score += points;
        player.roundScore += points;
        if (room.guessOrderCount === 1) {
          player.hadFirstGuess = true;
        }
        room.roundScores[player.id] = (room.roundScores[player.id] ?? 0) + points;

        // Drawer earns bonus per guess
        const drawer = room.currentDrawerId ? room.players.get(room.currentDrawerId) : null;
        if (drawer) {
          drawer.score += SCORING.DRAWER_PER_GUESS;
          drawer.roundScore += SCORING.DRAWER_PER_GUESS;
          drawer.drawerPointsTotal += SCORING.DRAWER_PER_GUESS;
          room.roundScores[drawer.id] =
            (room.roundScores[drawer.id] ?? 0) + SCORING.DRAWER_PER_GUESS;
        }

        const playersList = Array.from(room.players.values()).map(toPublicPlayer);
        this.io.to(room.code).emit('guess:correct', {
          playerId: player.id,
          playerName: player.name,
          points,
          players: playersList,
        });

        this.pushMessage(room, {
          id: crypto.randomUUID(),
          playerId: player.id,
          playerName: player.name,
          text: `${player.name} guessed the word! (+${points})`,
          type: 'correct',
          timestamp: Date.now(),
        });

        // Check if all connected guessers have guessed
        const remainingGuessers = Array.from(room.players.values()).filter(
          (p) => p.isConnected && p.role === 'GUESSER' && !p.hasGuessed
        );
        if (remainingGuessers.length === 0) {
          if (drawer) {
            drawer.hadFullRoomDraw = true;
            drawer.score += SCORING.DRAWER_ALL_GUESSED_BONUS;
            drawer.roundScore += SCORING.DRAWER_ALL_GUESSED_BONUS;
            drawer.drawerPointsTotal += SCORING.DRAWER_ALL_GUESSED_BONUS;
            room.roundScores[drawer.id] =
              (room.roundScores[drawer.id] ?? 0) + SCORING.DRAWER_ALL_GUESSED_BONUS;
          }
          this.endRound(room, 'all_guessed');
        }
        return { ok: true };
      }

      if (result === 'close') {
        if (player.socketId) {
          this.io.to(player.socketId).emit('chat:message', {
            id: crypto.randomUUID(),
            playerId: null,
            playerName: 'System',
            text: `"${text}" is very close!`,
            type: 'guess-close',
            timestamp: Date.now(),
          });
        }
        return { ok: true };
      }
    }

    // Prevent drawer from leaking secret word in chat
    if (
      room.phase === 'DRAWING' &&
      room.secretWord &&
      player.id === room.currentDrawerId &&
      evaluateGuess(text, room.secretWord) === 'exact'
    ) {
      return { ok: false, error: 'You cannot type the secret word while drawing!' };
    }

    this.pushMessage(room, {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text,
      type: 'chat',
      timestamp: Date.now(),
    });
    return { ok: true };
  }

  private endRound(
    room: InternalRoom,
    reason: 'all_guessed' | 'time_up' | 'drawer_left'
  ): void {
    this.clearRoomTimers(room);

    const revealedWord = room.secretWord ?? '';
    room.phase = 'ROUND_END';
    room.phaseEndsAt = Date.now() + GAME_DEFAULTS.ROUND_END_TIME * 1000;

    this.io.to(room.code).emit('game:round-ended', {
      word: revealedWord,
      drawerId: room.currentDrawerId ?? '',
      reason,
      roundScores: room.roundScores,
      players: Array.from(room.players.values()).map(toPublicPlayer),
    });

    this.emitPhaseChanged(room);

    room.phaseTimer = setTimeout(() => {
      this.startNextTurn(room);
    }, GAME_DEFAULTS.ROUND_END_TIME * 1000);
  }

  private endGame(room: InternalRoom): void {
    this.clearRoomTimers(room);
    room.phase = 'GAME_END';
    room.phaseEndsAt = null;
    room.secretWord = null;

    const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    const rankings = sorted.map((p, idx) => ({
      player: toPublicPlayer(p),
      rank: idx + 1,
      correctGuesses: p.correctGuessesCount,
      pointsEarned: p.score,
    }));

    const bestDrawer = [...room.players.values()].sort(
      (a, b) => b.drawerPointsTotal - a.drawerPointsTotal
    )[0];

    const payload: GameEndPayload = {
      rankings,
      bestDrawerId: bestDrawer && bestDrawer.drawerPointsTotal > 0 ? bestDrawer.id : null,
      totalRounds: room.settings.rounds,
    };

    this.emitPhaseChanged(room);
    this.io.to(room.code).emit('game:ended', payload);

    void persistMatchResults({
      roomCode: room.code,
      language: room.settings.language,
      rounds: room.settings.rounds,
      winnerUserId: sorted[0]?.userId,
      players: sorted.map((p, idx) => ({
        userId: p.userId,
        guestName: p.name,
        avatar: p.avatar,
        score: p.score,
        rank: idx + 1,
        correctGuesses: p.correctGuessesCount,
        hadFirstGuess: p.hadFirstGuess,
        hadFullRoomDraw: p.hadFullRoomDraw,
      })),
    });
  }

  // Drawing operations
  handleDrawingStart(socketId: string, input: DrawingStartInput): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;

    const stroke: Stroke = {
      id: input.strokeId,
      playerId: player.id,
      tool: input.tool,
      color: input.color,
      size: input.size,
      points: [input.point],
      ...(input.filled !== undefined ? { filled: input.filled } : {}),
      ...(input.opacity !== undefined ? { opacity: input.opacity } : {}),
    };
    room.strokes.push(stroke);
    room.redoStack = [];
    this.io.to(room.code).except(socketId).emit('drawing:start', stroke);
  }

  handleDrawingMove(socketId: string, input: DrawingMoveInput): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;

    const stroke = room.strokes.find((s) => s.id === input.strokeId);
    if (!stroke) return;
    stroke.points.push(...input.points);
    this.io.to(room.code).except(socketId).emit('drawing:move', input);
  }

  handleDrawingEnd(socketId: string, input: DrawingEndInput): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;
    this.io.to(room.code).except(socketId).emit('drawing:end', input);
  }

  handleDrawingUndo(socketId: string): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;

    const removed = room.strokes.pop();
    if (!removed) return;
    room.redoStack.push(removed);
    this.io.to(room.code).emit('drawing:sync', { strokes: room.strokes });
  }

  handleDrawingRedo(socketId: string): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;

    const restored = room.redoStack.pop();
    if (!restored) return;
    room.strokes.push(restored);
    this.io.to(room.code).emit('drawing:sync', { strokes: room.strokes });
  }

  handleDrawingClear(socketId: string): void {
    const ctx = this.getPlayerContext(socketId);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.phase !== 'DRAWING' || room.currentDrawerId !== player.id) return;

    room.strokes = [];
    room.redoStack = [];
    this.io.to(room.code).emit('drawing:clear');
  }

  private emitPhaseChanged(room: InternalRoom): void {
    this.io.to(room.code).emit('game:phase-changed', {
      phase: room.phase,
      currentRound: room.currentRound,
      currentDrawerId: room.currentDrawerId,
      wordHint: room.wordHint,
      wordLength: room.secretWord ? room.secretWord.length : 0,
      phaseEndsAt: room.phaseEndsAt,
      serverTime: Date.now(),
      players: Array.from(room.players.values()).map(toPublicPlayer),
    });
  }

  private broadcastRoomState(room: InternalRoom): void {
    this.io.to(room.code).emit('room:updated', this.toRoomState(room));
  }

  private pushSystemMessage(room: InternalRoom, text: string): void {
    this.pushMessage(room, {
      id: crypto.randomUUID(),
      playerId: null,
      playerName: 'Doodl',
      text,
      type: 'system',
      timestamp: Date.now(),
    });
  }

  private pushMessage(room: InternalRoom, msg: ChatMessage): void {
    room.chatHistory.push(msg);
    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }
    this.io.to(room.code).emit('chat:message', msg);
  }

  private clearRoomTimers(room: InternalRoom): void {
    if (room.phaseTimer) {
      clearTimeout(room.phaseTimer);
      room.phaseTimer = undefined;
    }
    for (const t of room.hintTimers) {
      clearTimeout(t);
    }
    room.hintTimers = [];
  }
}
