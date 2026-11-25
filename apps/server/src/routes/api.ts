import { Router, type Request } from 'express';
import { avatarSchema, loginSchema, registerSchema, reportSchema } from '@doodlio/shared';
import { z } from 'zod';
import { SlidingWindowLimiter } from '../middleware/rateLimit';
import type { RoomManager } from '../rooms/roomManager';
import { hashPassword, signAuthToken, verifyAuthToken, verifyPassword } from '../services/auth';
import { getPrisma } from '../services/prisma';
import { logger } from '../utils/logger';

const authLimiter = new SlidingWindowLimiter(12, 60_000);
const reportLimiter = new SlidingWindowLimiter(6, 60_000);

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export function createApiRouter(roomManager: RoomManager): Router {
  const router = Router();

  router.get('/rooms/public', (_req, res) => {
    res.json({ rooms: roomManager.getPublicRooms() });
  });

  router.get('/leaderboard', async (_req, res) => {
    const prisma = getPrisma();
    if (!prisma) {
      res.json({ entries: [], databaseConnected: false });
      return;
    }
    try {
      const profiles = await prisma.userProfile.findMany({
        take: 20,
        orderBy: { totalPoints: 'desc' },
        include: { user: { select: { username: true } } },
      });
      res.json({
        databaseConnected: true,
        entries: profiles.map((p, idx) => ({
          rank: idx + 1,
          username: p.user.username,
          avatar: p.avatar,
          gamesPlayed: p.gamesPlayed,
          gamesWon: p.gamesWon,
          totalPoints: p.totalPoints,
          correctGuesses: p.correctGuesses,
        })),
      });
    } catch (err) {
      logger.warn('Failed to fetch leaderboard', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Unable to load leaderboard' });
    }
  });

  router.post('/auth/register', async (req, res) => {
    const ip = req.ip ?? 'unknown';
    if (!authLimiter.allow(ip)) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
      return;
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration data.' });
      return;
    }

    const prisma = getPrisma();
    if (!prisma) {
      res.status(503).json({
        error: 'Database is not configured yet. You can still play as a guest!',
      });
      return;
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { username: parsed.data.username },
      });
      if (existing) {
        res.status(409).json({ error: 'Username is already taken.' });
        return;
      }

      const passwordHash = hashPassword(parsed.data.password);
      const user = await prisma.user.create({
        data: {
          username: parsed.data.username,
          passwordHash,
          profile: {
            create: {
              avatar: parsed.data.avatar,
            },
          },
        },
        include: { profile: true },
      });

      const token = signAuthToken({ userId: user.id, username: user.username });
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.profile?.avatar ?? parsed.data.avatar,
        },
      });
    } catch (err) {
      logger.warn('Registration failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Unable to create account.' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const ip = req.ip ?? 'unknown';
    if (!authLimiter.allow(ip)) {
      res.status(429).json({ error: 'Too many login attempts. Please wait a moment.' });
      return;
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid credentials.' });
      return;
    }

    const prisma = getPrisma();
    if (!prisma) {
      res.status(503).json({
        error: 'Database is not configured yet. You can still play as a guest!',
      });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { username: parsed.data.username },
        include: { profile: true },
      });

      if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }

      const token = signAuthToken({ userId: user.id, username: user.username });
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.profile?.avatar ?? 'fox',
        },
      });
    } catch (err) {
      logger.warn('Login failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Unable to sign in.' });
    }
  });

  router.get('/profile', async (req, res) => {
    const token = getBearerToken(req);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const prisma = getPrisma();
    if (!prisma) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          profile: true,
          achievements: {
            include: { achievement: true },
            orderBy: { unlockedAt: 'desc' },
          },
          matches: {
            take: 10,
            orderBy: { match: { startedAt: 'desc' } },
            include: {
              match: {
                select: {
                  id: true,
                  roomCode: true,
                  language: true,
                  rounds: true,
                  startedAt: true,
                  endedAt: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.profile) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }

      const winRate =
        user.profile.gamesPlayed > 0
          ? Math.round((user.profile.gamesWon / user.profile.gamesPlayed) * 100)
          : 0;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        },
        profile: {
          avatar: user.profile.avatar,
          gamesPlayed: user.profile.gamesPlayed,
          gamesWon: user.profile.gamesWon,
          totalPoints: user.profile.totalPoints,
          correctGuesses: user.profile.correctGuesses,
          bestScore: user.profile.bestScore,
          winRate,
        },
        achievements: user.achievements.map((ua) => ({
          slug: ua.achievement.slug,
          title: ua.achievement.title,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          unlockedAt: ua.unlockedAt,
        })),
        recentMatches: user.matches.map((mp) => ({
          id: mp.match.id,
          roomCode: mp.match.roomCode,
          language: mp.match.language,
          rounds: mp.match.rounds,
          score: mp.score,
          rank: mp.rank,
          correctGuesses: mp.correctGuesses,
          startedAt: mp.match.startedAt,
        })),
      });
    } catch (err) {
      logger.warn('Failed to fetch profile', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Unable to load profile.' });
    }
  });

  router.patch('/profile', async (req, res) => {
    const token = getBearerToken(req);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = z.object({ avatar: avatarSchema }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid avatar selection.' });
      return;
    }

    const prisma = getPrisma();
    if (!prisma) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    try {
      const updated = await prisma.userProfile.update({
        where: { userId: payload.userId },
        data: { avatar: parsed.data.avatar },
      });
      res.json({ avatar: updated.avatar });
    } catch {
      res.status(500).json({ error: 'Unable to update profile.' });
    }
  });

  router.post('/reports', async (req, res) => {
    const ip = req.ip ?? 'unknown';
    if (!reportLimiter.allow(ip)) {
      res.status(429).json({ error: 'Too many reports submitted. Please wait.' });
      return;
    }

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid report.' });
      return;
    }

    const token = getBearerToken(req);
    const reporter = token ? verifyAuthToken(token) : null;

    const prisma = getPrisma();
    if (prisma) {
      try {
        await prisma.report.create({
          data: {
            roomCode: parsed.data.roomCode,
            reason: parsed.data.reason,
            details: parsed.data.details,
            reportedName: parsed.data.reportedName,
            reporterId: reporter?.userId ?? null,
          },
        });
        res.status(201).json({ ok: true, persisted: true });
        return;
      } catch (err) {
        logger.warn('Failed to persist report', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    logger.warn('Player report received (in-memory log)', {
      roomCode: parsed.data.roomCode,
      reportedName: parsed.data.reportedName,
      reason: parsed.data.reason,
    });
    res.status(201).json({ ok: true, persisted: false });
  });

  return router;
}
