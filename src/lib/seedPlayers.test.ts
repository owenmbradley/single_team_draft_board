import { describe, expect, it } from 'vitest';
import { SEED_PLAYERS } from '@/lib/seedPlayers';
import { createSeededSession } from '@/lib/session';

describe('test player seed', () => {
  it('loads 100 unique available players including goalies', () => {
    const names = SEED_PLAYERS.map((player) => player.name);
    expect(SEED_PLAYERS).toHaveLength(100);
    expect(new Set(names).size).toBe(100);
    expect(SEED_PLAYERS.filter((player) => player.position === 'Goalie')).toHaveLength(8);
    expect(SEED_PLAYERS.every((player) => player.status === 'available')).toBe(true);
    expect(createSeededSession().players).toHaveLength(100);
  });
});
