import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from 'socket.io';
import { io as ioc, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@doodlio/shared';
import { RoomManager } from '../src/rooms/roomManager';
import { registerSocketHandlers } from '../src/sockets/registerHandlers';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Room security, authorization, drawing sync & reconnection', () => {
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
        port = typeof addr === 'object' && addr ? addr.port : 4556;
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

  it('enforces duplicate nickname rejection, maxPlayers limit, and host-only start', async () => {
    const p1 = await connectClient();
    const p2 = await connectClient();
    const p3 = await connectClient();

    try {
      const createAck = await new Promise<any>((resolve) => {
        p1.emit(
          'room:create',
          { playerName: 'Host', avatar: 'fox', settings: { maxPlayers: 2 } },
          resolve
        );
      });
      expect(createAck.ok).toBe(true);
      const code = createAck.room.code;

      // Cannot start with 1 player
      const soloStart = await new Promise<any>((resolve) => {
        p1.emit('game:start', resolve);
      });
      expect(soloStart.ok).toBe(false);

      // Duplicate nickname rejected
      const dupJoin = await new Promise<any>((resolve) => {
        p2.emit('room:join', { code, playerName: 'host', avatar: 'cat' }, resolve);
      });
      expect(dupJoin.ok).toBe(false);

      // Valid join
      const joinAck = await new Promise<any>((resolve) => {
        p2.emit('room:join', { code, playerName: 'Player2', avatar: 'cat' }, resolve);
      });
      expect(joinAck.ok).toBe(true);

      // Room full rejected
      const fullJoin = await new Promise<any>((resolve) => {
        p3.emit('room:join', { code, playerName: 'Player3', avatar: 'dog' }, resolve);
      });
      expect(fullJoin.ok).toBe(false);

      // Non-host cannot start
      await new Promise<void>((resolve) => {
        p2.emit('room:ready', { isReady: true }, () => resolve());
      });
      const nonHostStart = await new Promise<any>((resolve) => {
        p2.emit('game:start', resolve);
      });
      expect(nonHostStart.ok).toBe(false);
    } finally {
      p1.disconnect();
      p2.disconnect();
      p3.disconnect();
    }
  });

  it('blocks non-drawer drawing events, syncs undo/clear, and restores state on reconnect', async () => {
    const p1 = await connectClient();
    const p2 = await connectClient();

    try {
      const createAck = await new Promise<any>((resolve) => {
        p1.emit(
          'room:create',
          { playerName: 'Drawer', avatar: 'fox', settings: { rounds: 1, drawTime: 60 } },
          resolve
        );
      });
      const code = createAck.room.code;

      const joinAck = await new Promise<any>((resolve) => {
        p2.emit('room:join', { code, playerName: 'Guesser', avatar: 'panda' }, resolve);
      });
      expect(joinAck.ok).toBe(true);

      await new Promise<void>((resolve) => {
        p2.emit('room:ready', { isReady: true }, () => resolve());
      });

      const optionsPromise = new Promise<string[]>((resolve) => {
        p1.once('game:word-options', ({ options }) => resolve(options));
      });
      await new Promise<void>((resolve) => {
        p1.emit('game:start', () => resolve());
      });
      const options = await optionsPromise;

      const drawingPhase = new Promise<void>((resolve) => {
        p2.on('game:phase-changed', (payload) => {
          if (payload.phase === 'DRAWING') resolve();
        });
      });
      await new Promise<void>((resolve) => {
        p1.emit('word:select', { word: options[0]! }, () => resolve());
      });
      await drawingPhase;

      // Non-drawer stroke should be ignored
      let receivedGuesserStroke = false;
      p1.once('drawing:start', (stroke) => {
        if (stroke.id === 'illegal-stroke') receivedGuesserStroke = true;
      });
      p2.emit('drawing:start', {
        strokeId: 'illegal-stroke',
        tool: 'pencil',
        color: '#000000',
        size: 6,
        point: { x: 0.2, y: 0.2 },
      });

      // Drawer stroke should be broadcast
      const drawerStrokePromise = new Promise<any>((resolve) => {
        p2.once('drawing:start', resolve);
      });
      p1.emit('drawing:start', {
        strokeId: 'valid-stroke-1',
        tool: 'pencil',
        color: '#16A36A',
        size: 8,
        point: { x: 0.1, y: 0.1 },
      });
      const received = await drawerStrokePromise;
      expect(received.id).toBe('valid-stroke-1');
      expect(receivedGuesserStroke).toBe(false);

      // Reconnect P2 with session token and verify stroke snapshot is restored
      const p2Reconnect = await connectClient();
      const reconnectAck = await new Promise<any>((resolve) => {
        p2Reconnect.emit(
          'player:reconnect',
          { token: joinAck.sessionToken, roomCode: code },
          resolve
        );
      });
      expect(reconnectAck.ok).toBe(true);
      expect(reconnectAck.strokes).toHaveLength(1);
      expect(reconnectAck.strokes[0].id).toBe('valid-stroke-1');

      // Undo removes stroke
      const syncPromise = new Promise<any>((resolve) => {
        p2Reconnect.once('drawing:sync', resolve);
      });
      p1.emit('drawing:undo');
      const syncPayload = await syncPromise;
      expect(syncPayload.strokes).toHaveLength(0);

      p2Reconnect.disconnect();
    } finally {
      p1.disconnect();
      p2.disconnect();
    }
  });
});
