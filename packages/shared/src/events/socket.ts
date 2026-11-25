import type {
  ChatMessage,
  GameEndPayload,
  GamePhase,
  Player,
  ReactionEventPayload,
  RoomSettings,
  RoomState,
  RoundEndPayload,
  Stroke,
} from '../types/game';
import type {
  ChatOrGuessInput,
  CreateRoomInput,
  DrawingEndInput,
  DrawingMoveInput,
  DrawingStartInput,
  JoinRoomInput,
  UpdateSettingsInput,
} from '../schemas/events';
import type { ReactionEmoji } from '../constants/game';

export interface SessionAck {
  ok: true;
  room: RoomState;
  playerId: string;
  sessionToken: string;
  strokes: Stroke[];
  chatHistory: ChatMessage[];
}

export interface ErrorAck {
  ok: false;
  error: string;
  code?: string;
}

export type RoomActionAck = SessionAck | ErrorAck;
export type SimpleAck = { ok: true } | ErrorAck;

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomInput, cb?: (ack: RoomActionAck) => void) => void;
  'room:join': (payload: JoinRoomInput, cb?: (ack: RoomActionAck) => void) => void;
  'room:leave': (cb?: (ack: SimpleAck) => void) => void;
  'room:ready': (payload: { isReady: boolean }, cb?: (ack: SimpleAck) => void) => void;
  'room:settings': (payload: UpdateSettingsInput, cb?: (ack: SimpleAck) => void) => void;
  'game:start': (cb?: (ack: SimpleAck) => void) => void;
  'game:end-turn': (cb?: (ack: SimpleAck) => void) => void;
  'game:play-again': (cb?: (ack: SimpleAck) => void) => void;
  'word:select': (payload: { word: string }, cb?: (ack: SimpleAck) => void) => void;
  'drawing:start': (payload: DrawingStartInput) => void;
  'drawing:move': (payload: DrawingMoveInput) => void;
  'drawing:end': (payload: DrawingEndInput) => void;
  'drawing:undo': () => void;
  'drawing:redo': () => void;
  'drawing:clear': () => void;
  'guess:submit': (payload: ChatOrGuessInput, cb?: (ack: SimpleAck) => void) => void;
  'chat:send': (payload: ChatOrGuessInput, cb?: (ack: SimpleAck) => void) => void;
  'reaction:send': (payload: { emoji: ReactionEmoji }) => void;
  'player:reconnect': (
    payload: { token: string; roomCode: string },
    cb?: (ack: RoomActionAck) => void
  ) => void;
}

export interface ServerToClientEvents {
  'room:updated': (room: RoomState) => void;
  'room:settings-updated': (settings: RoomSettings) => void;
  'room:error': (payload: { message: string; code?: string }) => void;
  'player:updated': (player: Player) => void;
  'game:started': (room: RoomState) => void;
  'game:phase-changed': (payload: {
    phase: GamePhase;
    currentRound: number;
    currentDrawerId: string | null;
    wordHint: string;
    wordLength: number;
    phaseEndsAt: number | null;
    serverTime: number;
    players: Player[];
  }) => void;
  'game:word-options': (payload: { options: string[]; expiresAt: number }) => void;
  'game:word-assigned': (payload: { word: string }) => void;
  'game:hint-updated': (payload: { wordHint: string }) => void;
  'game:timer': (payload: { phaseEndsAt: number; serverTime: number }) => void;
  'game:round-ended': (payload: RoundEndPayload) => void;
  'game:ended': (payload: GameEndPayload) => void;
  'drawing:start': (stroke: Stroke) => void;
  'drawing:move': (payload: DrawingMoveInput) => void;
  'drawing:end': (payload: DrawingEndInput) => void;
  'drawing:sync': (payload: { strokes: Stroke[] }) => void;
  'drawing:clear': () => void;
  'guess:correct': (payload: {
    playerId: string;
    playerName: string;
    points: number;
    players: Player[];
  }) => void;
  'chat:message': (message: ChatMessage) => void;
  'reaction:received': (reaction: ReactionEventPayload) => void;
}
