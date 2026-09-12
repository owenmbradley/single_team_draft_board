import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const next = scryptSync(password, salt, 64);
  const previous = Buffer.from(hash, 'hex');
  return next.length === previous.length && timingSafeEqual(next, previous);
}
