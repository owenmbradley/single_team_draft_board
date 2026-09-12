import { describe, expect, it } from 'vitest';
import { buildTeams, draftRounds, moveTeam, nextOpenPick, teamForPick } from '@/lib/draftOrder';

describe('snake draft order', () => {
  const teams = buildTeams(8, 3);

  it('labels the chosen slot as Our Team', () => {
    expect(teams[2]).toMatchObject({ slot: 3, isUs: true, name: 'Our Team' });
    expect(teams.filter((team) => team.isUs)).toHaveLength(1);
  });

  it('snakes the order after each round', () => {
    expect(teamForPick(teams, 1).team.slot).toBe(1);
    expect(teamForPick(teams, 3)).toMatchObject({ team: { isUs: true }, round: 1 });
    expect(teamForPick(teams, 8).team.slot).toBe(8);
    expect(teamForPick(teams, 9).team.slot).toBe(8);
    expect(teamForPick(teams, 14)).toMatchObject({ team: { isUs: true }, round: 2 });
    expect(teamForPick(teams, 16).team.slot).toBe(1);
    expect(teamForPick(teams, 19)).toMatchObject({ team: { isUs: true }, round: 3 });
  });

  it('keeps the same first-to-last order in a linear draft', () => {
    expect(teamForPick(teams, 1, 'linear').team.slot).toBe(1);
    expect(teamForPick(teams, 8, 'linear').team.slot).toBe(8);
    expect(teamForPick(teams, 9, 'linear').team.slot).toBe(1);
    expect(teamForPick(teams, 11, 'linear')).toMatchObject({ team: { isUs: true }, round: 2 });
    expect(teamForPick(teams, 16, 'linear').team.slot).toBe(8);
  });

  it('sets rounds from the player pool and team count', () => {
    expect(draftRounds(0, 8)).toBe(1);
    expect(draftRounds(100, 8)).toBe(13);
    expect(draftRounds(96, 8)).toBe(12);
    expect(draftRounds(10, 8)).toBe(2);
  });

  it('swaps neighboring teams and keeps their identities', () => {
    const moved = moveTeam(teams, 'team-3', 'up');
    expect(moved.map((team) => team.id)).toEqual([
      'team-1',
      'team-3',
      'team-2',
      'team-4',
      'team-5',
      'team-6',
      'team-7',
      'team-8',
    ]);
    expect(moved.find((team) => team.id === 'team-3')).toMatchObject({ slot: 2, isUs: true });
    expect(moved.find((team) => team.id === 'team-2')).toMatchObject({ slot: 3, isUs: false });
    expect(teamForPick(moved, 2).team.id).toBe('team-3');
    expect(moveTeam(teams, 'team-1', 'up')).toBe(teams);
  });

  it('fills the first missing pick number after a restore gap', () => {
    expect(nextOpenPick([{ pickNumber: 1 }, { pickNumber: 3 }] as never, 96)).toBe(2);
    expect(nextOpenPick([{ pickNumber: 1 }, { pickNumber: 2 }] as never, 96)).toBe(3);
  });
});
