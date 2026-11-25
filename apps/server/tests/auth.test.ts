import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
} from '../src/services/auth';
import { signSessionToken, verifySessionToken } from '../src/services/token';

describe('Auth & token security', () => {
  it('hashes and verifies passwords with scrypt', () => {
    const hash = hashPassword('super-secret-123');
    expect(hash).toContain(':');
    expect(verifyPassword('super-secret-123', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
    expect(verifyPassword('super-secret-123', 'malformed')).toBe(false);
  });

  it('signs and verifies auth tokens and rejects tampering', () => {
    const token = signAuthToken({ userId: 'user-1', username: 'alice' });
    const verified = verifyAuthToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user-1');
    expect(verified?.username).toBe('alice');

    const [body, sig] = token.split('.');
    const tampered = `${body}.${sig!.slice(0, -1)}X`;
    expect(verifyAuthToken(tampered)).toBeNull();
  });

  it('signs and verifies room session tokens', () => {
    const token = signSessionToken({
      playerId: 'p-1',
      roomCode: 'ABCD12',
      iat: Date.now(),
    });
    const decoded = verifySessionToken(token);
    expect(decoded?.playerId).toBe('p-1');
    expect(decoded?.roomCode).toBe('ABCD12');
    expect(verifySessionToken('invalid.token')).toBeNull();
  });
});
