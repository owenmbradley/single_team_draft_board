import { describe, expect, it } from 'vitest';
import { comparePlayers, defaultSortDir, filterPlayers, teamCaptains, teamPicks } from '@/lib/listPlayers';
import type { Player } from '@/types';

function player(name: string, patch: Partial<Player> = {}): Player {
  return {
    id: name,
    name,
    position: 'Skater',
    talent: 3,
    vibes: 3,
    notes: '',
    classYear: '',
    status: 'available',
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: null,
    ...patch,
  };
}

describe('player list sorting', () => {
  it('defaults numeric columns to high-first and names to A-Z', () => {
    expect(defaultSortDir('overall')).toBe('desc');
    expect(defaultSortDir('name')).toBe('asc');
  });

  it('sorts overall descending, then by name', () => {
    const ada = player('Ada', { talent: 5, vibes: 5 });
    const bo = player('Bo', { talent: 2, vibes: 2 });
    expect(comparePlayers(ada, bo, 'overall', 'desc')).toBeLessThan(0);
    expect(comparePlayers(ada, bo, 'overall', 'asc')).toBeGreaterThan(0);
  });

  it('sorts class year as its own column', () => {
    const younger = player('Ada', { classYear: '2028' });
    const older = player('Bo', { classYear: '2027' });
    expect(defaultSortDir('classYear')).toBe('asc');
    expect(comparePlayers(older, younger, 'classYear', 'asc')).toBeLessThan(0);
    expect(comparePlayers(younger, older, 'classYear', 'desc')).toBeLessThan(0);
  });

  it('sorts decimal totals the same way as whole-number totals', () => {
    const high = player('Ada', { talent: 4.5, vibes: 3.2 });
    const low = player('Bo', { talent: 4, vibes: 3 });
    expect(comparePlayers(high, low, 'overall', 'desc')).toBeLessThan(0);
    expect(comparePlayers(high, low, 'talent', 'desc')).toBeLessThan(0);
  });
});

describe('player list filters', () => {
  const pool = [
    player('Ada Cole', { position: 'Goalie', notes: 'Calm in net' }),
    player('Bo Hale', { position: 'Skater', classYear: '2028' }),
  ];

  it('keeps only matching position, search, and status', () => {
    const goalies = filterPlayers(pool, {
      query: '',
      position: 'Goalie',
      status: 'available',
      sortKey: 'name',
      sortDir: 'asc',
    });
    expect(goalies.map((item) => item.name)).toEqual(['Ada Cole']);

    const search = filterPlayers(pool, {
      query: '2028',
      position: 'ALL',
      status: 'available',
      sortKey: 'name',
      sortDir: 'asc',
    });
    expect(search.map((item) => item.name)).toEqual(['Bo Hale']);
  });

  it('lists taken players and a team roster in pick order', () => {
    const taken = [
      player('Ada Cole', { status: 'my_team', pickNumber: 3, draftedByTeamId: 'team-us' }),
      player('Bo Hale', { status: 'drafted', pickNumber: 1, draftedByTeamId: 'team-1' }),
      player('Cal Pike', { status: 'captain', captainOfTeamId: 'team-1' }),
    ];

    expect(
      filterPlayers(taken, {
        query: '',
        position: 'ALL',
        status: 'taken',
        sortKey: 'name',
        sortDir: 'asc',
      }).map((item) => item.name),
    ).toEqual(['Ada Cole', 'Bo Hale']);

    expect(teamPicks(taken, 'team-1').map((item) => item.name)).toEqual(['Bo Hale']);
    expect(teamCaptains(taken, 'team-1').map((item) => item.name)).toEqual(['Cal Pike']);
  });
});
