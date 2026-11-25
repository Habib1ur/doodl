import { getPrisma } from './prisma';
import { logger } from '../utils/logger';

export interface MatchPlayerRecord {
  userId?: string;
  guestName: string;
  avatar: string;
  score: number;
  rank: number;
  correctGuesses: number;
  hadFirstGuess: boolean;
  hadFullRoomDraw: boolean;
}

export interface PersistMatchInput {
  roomCode: string;
  language: string;
  rounds: number;
  winnerUserId?: string;
  players: MatchPlayerRecord[];
}

export async function persistMatchResults(input: PersistMatchInput): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.match.create({
        data: {
          roomCode: input.roomCode,
          language: input.language,
          rounds: input.rounds,
          endedAt: new Date(),
          winnerId: input.winnerUserId ?? null,
          players: {
            create: input.players.map((p) => ({
              userId: p.userId ?? null,
              guestName: p.guestName,
              avatar: p.avatar,
              score: p.score,
              rank: p.rank,
              correctGuesses: p.correctGuesses,
            })),
          },
        },
      });

      const registeredPlayers = input.players.filter((p) => Boolean(p.userId));
      if (registeredPlayers.length === 0) return;

      const allAchievements = await tx.achievement.findMany();
      const achBySlug = new Map(allAchievements.map((a) => [a.slug, a.id]));

      for (const p of registeredPlayers) {
        const userId = p.userId!;
        const existingProfile = await tx.userProfile.findUnique({
          where: { userId },
        });
        if (!existingProfile) continue;

        const nextGamesPlayed = existingProfile.gamesPlayed + 1;
        const nextGamesWon = existingProfile.gamesWon + (p.rank === 1 ? 1 : 0);

        await tx.userProfile.update({
          where: { userId },
          data: {
            gamesPlayed: nextGamesPlayed,
            gamesWon: nextGamesWon,
            totalPoints: existingProfile.totalPoints + p.score,
            correctGuesses: existingProfile.correctGuesses + p.correctGuesses,
            bestScore: Math.max(existingProfile.bestScore, p.score),
          },
        });

        const earnedSlugs: string[] = [];
        if (p.rank === 1) earnedSlugs.push('first-win');
        if (p.hadFirstGuess) earnedSlugs.push('speed-guesser');
        if (p.hadFullRoomDraw) earnedSlugs.push('master-artist');
        if (nextGamesPlayed >= 10) earnedSlugs.push('social-butterfly');

        for (const slug of earnedSlugs) {
          const achievementId = achBySlug.get(slug);
          if (!achievementId) continue;
          await tx.userAchievement.upsert({
            where: { userId_achievementId: { userId, achievementId } },
            update: {},
            create: { userId, achievementId },
          });
        }
      }
    });
  } catch (err) {
    logger.warn('Failed to persist match results', {
      roomCode: input.roomCode,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
