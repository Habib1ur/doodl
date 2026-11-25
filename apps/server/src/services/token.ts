import crypto from 'node:crypto';
import { env } from '../config/env';

export interface SessionPayload {
  playerId: string;
  roomCode: string;
  iat: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function signSessionToken(payload: SessionPayload): string {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!parsed.playerId || !parsed.roomCode) return null;
    return parsed;
  } catch {
    return null;
  }
}
