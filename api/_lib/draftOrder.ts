import type { DraftSession, DraftType, Player, Team } from './types';

export function draftRounds(playerCount: number, teamCount: number): number {
  const teams = Math.max(1, Math.round(teamCount));
  const players = Math.max(0, Math.round(playerCount));
  if (players === 0) return 1;
  return Math.max(1, Math.ceil(players / teams));
}

export function normalizeDraftType(value: unknown): DraftType {
  return value === 'linear' ? 'linear' : 'snake';
}

export type MoveDirection = 'up' | 'down';

export function moveTeam(teams: Team[], teamId: string, direction: MoveDirection): Team[] {
  const sorted = [...teams].sort((a, b) => a.slot - b.slot);
  const index = sorted.findIndex((team) => team.id === teamId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return teams;

  const current = sorted[index];
  const neighbor = sorted[target];
  return teams
    .map((team) => {
      if (team.id === current.id) return { ...team, slot: neighbor.slot };
      if (team.id === neighbor.id) return { ...team, slot: current.slot };
      return team;
    })
    .sort((a, b) => a.slot - b.slot);
}

export function buildTeams(count: number, ourSlot: number, names: string[] = []): Team[] {
  const teamCount = Math.min(20, Math.max(2, Math.round(count)));
  const slot = Math.min(teamCount, Math.max(1, Math.round(ourSlot)));

  return Array.from({ length: teamCount }, (_, index) => {
    const teamSlot = index + 1;
    const isUs = teamSlot === slot;
    const provided = names[index]?.trim();
    return {
      id: `team-${teamSlot}`,
      slot: teamSlot,
      isUs,
      name: provided || (isUs ? 'Our Team' : `Team ${teamSlot}`),
    };
  });
}

export function maxPicks(session: Pick<DraftSession, 'teams' | 'rounds'>): number {
  return session.teams.length * Math.max(1, session.rounds);
}

export function teamForPick(
  teams: Team[],
  pick: number,
  draftType: DraftType = 'snake',
): { team: Team; round: number } {
  const sorted = [...teams].sort((a, b) => a.slot - b.slot);
  if (sorted.length === 0) {
    throw new Error('A draft needs at least one team.');
  }

  const index = Math.max(0, pick - 1);
  const roundIndex = Math.floor(index / sorted.length);
  const slotInRound = index % sorted.length;
  const snakes = draftType === 'snake' && roundIndex % 2 === 1;
  const teamIndex = snakes ? sorted.length - slotInRound - 1 : slotInRound;

  return {
    team: sorted[teamIndex],
    round: roundIndex + 1,
  };
}

export function usedPickNumbers(players: Player[]): Set<number> {
  return new Set(
    players
      .map((player) => player.pickNumber)
      .filter((pick): pick is number => pick != null),
  );
}

export function nextOpenPick(players: Player[], totalPicks: number): number {
  const used = usedPickNumbers(players);
  const limit = Math.max(1, totalPicks);
  for (let pick = 1; pick <= limit; pick += 1) {
    if (!used.has(pick)) return pick;
  }
  return limit + 1;
}

export function ourUpcomingPicks(session: DraftSession, count = 6): number[] {
  const total = maxPicks(session);
  const used = usedPickNumbers(session.players);
  const picks: number[] = [];

  for (let pick = 1; pick <= total && picks.length < count; pick += 1) {
    if (used.has(pick)) continue;
    if (teamForPick(session.teams, pick, session.draftType).team.isUs) {
      picks.push(pick);
    }
  }

  return picks;
}

export function ourTeam(session: DraftSession): Team | undefined {
  return session.teams.find((team) => team.isUs);
}
