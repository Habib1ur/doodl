import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient | null {
  if (!env.DATABASE_URL) {
    return null;
  }
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

export async function checkDatabaseHealth(): Promise<{ connected: boolean; configured: boolean }> {
  if (!env.DATABASE_URL) {
    return { connected: false, configured: false };
  }
  try {
    const prisma = getPrisma();
    if (!prisma) return { connected: false, configured: false };
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, configured: true };
  } catch (err) {
    logger.warn('Database health check failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return { connected: false, configured: true };
  }
}
