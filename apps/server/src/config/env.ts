import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load root .env if present (useful in monorepo local dev)
loadDotenv({ path: path.resolve(process.cwd(), '../../.env') });
loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default('dev-only-doodlio-secret-change-in-prod'),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.SESSION_SECRET === 'dev-only-doodlio-secret-change-in-prod'
) {
  console.error('❌ SESSION_SECRET must be set to a secure value in production');
  process.exit(1);
}

export const env = parsed.data;
