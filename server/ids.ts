import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoomId(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export function normalizeRoomId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
