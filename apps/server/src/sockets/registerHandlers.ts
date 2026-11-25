import crypto from 'node:crypto';
import type { Socket } from 'socket.io';
import {
  chatOrGuessSchema,
  createRoomSchema,
  drawingEndSchema,
  drawingMoveSchema,
  drawingStartSchema,
  joinRoomSchema,
  reactionSendSchema,
  readyToggleSchema,
  reconnectSchema,
  selectWordSchema,
  updateSettingsSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@doodlio/shared';
import { SlidingWindowLimiter } from '../middleware/rateLimit';
import type { RoomManager, TypedIO } from '../rooms/roomManager';
import { verifyAuthToken } from '../services/auth';
import { verifySessionToken } from '../services/token';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const chatLimiter = new SlidingWindowLimiter(8, 5000);
const reactionLimiter = new SlidingWindowLimiter(5, 5000);
const roomCreateLimiter = new SlidingWindowLimiter(5, 60_000);

export function registerSocketHandlers(io: TypedIO, roomManager: RoomManager): void {
  io.on('connection', (socket: TypedSocket) => {
    socket.on('room:create', (rawPayload, cb) => {
      if (!roomCreateLimiter.allow(socket.handshake.address)) {
        cb?.({ ok: false, error: 'Too many rooms created. Please wait a moment.' });
        return;
      }

      const parsed = createRoomSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid room payload.' });
        return;
      }

      const authPayload = parsed.data.authToken ? verifyAuthToken(parsed.data.authToken) : null;
      const { room, player, token } = roomManager.createRoom(
        socket.id,
        parsed.data.playerName,
        parsed.data.avatar,
        parsed.data.settings,
        authPayload?.userId
      );

      socket.join(room.code);
      cb?.({
        ok: true,
        room: roomManager.toRoomState(room),
        playerId: player.id,
        sessionToken: token,
        strokes: room.strokes,
        chatHistory: room.chatHistory,
      });
    });

    socket.on('room:join', (rawPayload, cb) => {
      const parsed = joinRoomSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid join payload.' });
        return;
      }

      const authPayload = parsed.data.authToken ? verifyAuthToken(parsed.data.authToken) : null;
      const res = roomManager.joinRoom(
        socket.id,
        parsed.data.code,
        parsed.data.playerName,
        parsed.data.avatar,
        authPayload?.userId
      );

      if (!res.ok) {
        cb?.({ ok: false, error: res.error });
        return;
      }

      socket.join(res.room.code);
      cb?.({
        ok: true,
        room: roomManager.toRoomState(res.room),
        playerId: res.player.id,
        sessionToken: res.token,
        strokes: res.room.strokes,
        chatHistory: res.room.chatHistory,
      });
    });

    socket.on('player:reconnect', (rawPayload, cb) => {
      const parsed = reconnectSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid reconnect payload.' });
        return;
      }

      const tokenData = verifySessionToken(parsed.data.token);
      if (!tokenData || tokenData.roomCode !== parsed.data.roomCode.toUpperCase()) {
        cb?.({ ok: false, error: 'Invalid or expired session token.' });
        return;
      }

      const res = roomManager.reconnectPlayer(socket.id, tokenData.roomCode, tokenData.playerId);
      if (!res.ok) {
        cb?.({ ok: false, error: res.error });
        return;
      }

      socket.join(res.room.code);
      cb?.({
        ok: true,
        room: roomManager.toRoomState(res.room),
        playerId: res.player.id,
        sessionToken: parsed.data.token,
        strokes: res.room.strokes,
        chatHistory: res.room.chatHistory,
      });

      if (res.wordOptions.length > 0 && res.room.phaseEndsAt) {
        socket.emit('game:word-options', {
          options: res.wordOptions,
          expiresAt: res.room.phaseEndsAt,
        });
      }
      if (res.secretWord) {
        socket.emit('game:word-assigned', { word: res.secretWord });
      }
    });

    socket.on('room:leave', (cb) => {
      const left = roomManager.leaveRoom(socket.id);
      if (left) {
        socket.leave(left.roomCode);
      }
      cb?.({ ok: true });
    });

    socket.on('room:ready', (rawPayload, cb) => {
      const parsed = readyToggleSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid ready payload.' });
        return;
      }
      cb?.(roomManager.toggleReady(socket.id, parsed.data.isReady));
    });

    socket.on('room:settings', (rawPayload, cb) => {
      const parsed = updateSettingsSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid settings.' });
        return;
      }
      cb?.(roomManager.updateSettings(socket.id, parsed.data));
    });

    socket.on('game:start', (cb) => {
      cb?.(roomManager.startGame(socket.id));
    });

    socket.on('game:end-turn', (cb) => {
      cb?.(roomManager.endTurn(socket.id));
    });

    socket.on('game:play-again', (cb) => {
      cb?.(roomManager.playAgain(socket.id));
    });

    socket.on('word:select', (rawPayload, cb) => {
      const parsed = selectWordSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: 'Invalid word selection.' });
        return;
      }
      cb?.(roomManager.selectWord(socket.id, parsed.data.word));
    });

    socket.on('drawing:start', (rawPayload) => {
      const parsed = drawingStartSchema.safeParse(rawPayload);
      if (parsed.success) {
        roomManager.handleDrawingStart(socket.id, parsed.data);
      }
    });

    socket.on('drawing:move', (rawPayload) => {
      const parsed = drawingMoveSchema.safeParse(rawPayload);
      if (parsed.success) {
        roomManager.handleDrawingMove(socket.id, parsed.data);
      }
    });

    socket.on('drawing:end', (rawPayload) => {
      const parsed = drawingEndSchema.safeParse(rawPayload);
      if (parsed.success) {
        roomManager.handleDrawingEnd(socket.id, parsed.data);
      }
    });

    socket.on('drawing:undo', () => {
      roomManager.handleDrawingUndo(socket.id);
    });

    socket.on('drawing:redo', () => {
      roomManager.handleDrawingRedo(socket.id);
    });

    socket.on('drawing:clear', () => {
      roomManager.handleDrawingClear(socket.id);
    });

    const handleChatOrGuess = (rawPayload: unknown, cb?: (ack: { ok: true } | { ok: false; error: string }) => void) => {
      if (!chatLimiter.allow(socket.id)) {
        cb?.({ ok: false, error: 'Slow down! You are sending messages too fast.' });
        return;
      }
      const parsed = chatOrGuessSchema.safeParse(rawPayload);
      if (!parsed.success) {
        cb?.({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid message.' });
        return;
      }
      cb?.(roomManager.handleGuessOrChat(socket.id, parsed.data.text));
    };

    socket.on('guess:submit', handleChatOrGuess);
    socket.on('chat:send', handleChatOrGuess);

    socket.on('reaction:send', (rawPayload) => {
      if (!reactionLimiter.allow(socket.id)) return;
      const parsed = reactionSendSchema.safeParse(rawPayload);
      if (!parsed.success) return;
      const ctx = roomManager.getPlayerContext(socket.id);
      if (!ctx) return;
      io.to(ctx.room.code).emit('reaction:received', {
        id: crypto.randomUUID(),
        playerId: ctx.player.id,
        playerName: ctx.player.name,
        emoji: parsed.data.emoji,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      chatLimiter.clear(socket.id);
      reactionLimiter.clear(socket.id);
      roomManager.handleDisconnect(socket.id);
    });
  });
}
