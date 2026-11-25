import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@doodlio/shared';

export type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: TypedClientSocket | null = null;

export function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
}

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function getSocket(): TypedClientSocket {
  if (!socketInstance) {
    socketInstance = io(getSocketUrl(), {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}
