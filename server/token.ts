import { createHmac, timingSafeEqual } from 'node:crypto';

const DAY_MS = 1000 * 60 * 60 * 24 * 14;

function secret(): string {
  return process.env.ROOM_TOKEN_SECRET?.trim() || 'dev-only-room-token';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function issueRoomToken(roomId: string): string {
  const payload = Buffer.from(JSON.stringify({ roomId, exp: Date.now() + DAY_MS }), 'utf8').toString(
    'base64url',
  );
  return `${payload}.${sign(payload)}`;
}

export function readRoomToken(token: string): { roomId: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      roomId?: string;
      exp?: number;
    };
    if (!parsed.roomId || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return { roomId: parsed.roomId };
  } catch {
    return null;
  }
}
