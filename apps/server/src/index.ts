import http from 'node:http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@doodlio/shared';
import { env } from './config/env';
import { RoomManager } from './rooms/roomManager';
import { createApiRouter } from './routes/api';
import { checkDatabaseHealth } from './services/prisma';
import { registerSocketHandlers } from './sockets/registerHandlers';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);

const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '64kb' }));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  pingInterval: 10_000,
  pingTimeout: 20_000,
});

const roomManager = new RoomManager(io);
registerSocketHandlers(io, roomManager);

app.get('/health', async (_req, res) => {
  const db = await checkDatabaseHealth();
  res.json({
    status: 'ok',
    service: 'doodlio-server',
    uptimeSec: Math.round(process.uptime()),
    activeRooms: roomManager.getRoomCount(),
    database: db,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', createApiRouter(roomManager));

server.listen(env.PORT, () => {
  logger.info(`Doodlio server listening on port ${env.PORT}`, {
    env: env.NODE_ENV,
    origins: allowedOrigins,
  });
});

function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
