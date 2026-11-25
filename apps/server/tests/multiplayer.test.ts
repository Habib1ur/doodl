import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io as ioc, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@doodlio/shared';
import { RoomManager } from '../src/rooms/roomManager';
import { registerSocketHandlers } from '../src/sockets/registerHandlers';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Multiplayer room & game flow integration', () => {
  let httpServer: http.Server;
  let port: number;
  let ioServer: Server<ClientToServerEvents, ServerToClientEvents>;

  beforeAll(async () => {
    httpServer = http.createServer();
    ioServer = new Server(httpServer);
    const roomManager = new RoomManager(ioServer);
    registerSocketHandlers(ioServer, roomManager);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 4555;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    httpServer.close();
  });

  function connectClient(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const client: ClientSocket = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
      });
      client.on('connect', () => resolve(client));
    });
  }

  it('runs a complete turn: create, join, ready, start, word select, draw, and guess', async () => {
    const p1 = await connectClient();
    const p2 = await connectClient();

    try {
      // 1. P1 creates room
      const createAck = await new Promise<any>((resolve) => {
        p1.emit(
          'room:create',
          { playerName: 'Alice', avatar: 'fox', settings: { rounds: 1, drawTime: 60 } },
          resolve
        );
      });
      expect(createAck.ok).toBe(true);
      const roomCode = createAck.room.code;

      // 2. P2 joins room
      const joinAck = await new Promise<any>((resolve) => {
        p2.emit('room:join', { code: roomCode, playerName: 'Bob', avatar: 'panda' }, resolve);
      });
      expect(joinAck.ok).toBe(true);
      expect(joinAck.room.players).toHaveLength(2);

      // 3. P2 marks ready
      const readyAck = await new Promise<any>((resolve) => {
        p2.emit('room:ready', { isReady: true }, resolve);
      });
      expect(readyAck.ok).toBe(true);

      // 4. Listen for word options on P1 (first drawer) and ensure P2 does NOT get them
      let p2ReceivedOptions = false;
      p2.on('game:word-options', () => {
        p2ReceivedOptions = true;
      });

      const wordOptionsPromise = new Promise<string[]>((resolve) => {
        p1.once('game:word-options', ({ options }) => resolve(options));
      });

      const startAck = await new Promise<any>((resolve) => {
        p1.emit('game:start', resolve);
      });
      expect(startAck.ok).toBe(true);

      const options = await wordOptionsPromise;
      expect(options).toHaveLength(3);
      expect(p2ReceivedOptions).toBe(false);

      // 5. P1 selects the first word
      const chosenWord = options[0]!;
      const drawingPhasePromise = new Promise<void>((resolve) => {
        p2.on('game:phase-changed', (payload) => {
          if (payload.phase === 'DRAWING') resolve();
        });
      });

      const selectAck = await new Promise<any>((resolve) => {
        p1.emit('word:select', { word: chosenWord }, resolve);
      });
      expect(selectAck.ok).toBe(true);
      await drawingPhasePromise;

      // 6. P2 guesses the secret word and earns 100 points
      const roundEndedPromise = new Promise<any>((resolve) => {
        p1.once('game:round-ended', resolve);
      });

      const guessAck = await new Promise<any>((resolve) => {
        p2.emit('guess:submit', { text: chosenWord }, resolve);
      });
      expect(guessAck.ok).toBe(true);

      const roundEnd = await roundEndedPromise;
      expect(roundEnd.word).toBe(chosenWord);
      expect(roundEnd.reason).toBe('all_guessed');
      expect(roundEnd.roundScores[joinAck.playerId]).toBe(100);
      expect(roundEnd.roundScores[createAck.playerId]).toBe(50); // 25 per guess + 25 all-guessed bonus
    } finally {
      p1.disconnect();
      p2.disconnect();
    }
  });
});
