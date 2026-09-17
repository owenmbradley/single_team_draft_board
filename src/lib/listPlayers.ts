import type { Player, PlayerStatus, Position } from '@/types';
import { overall } from '@/lib/ratings';

export type SortKey = 'overall' | 'talent' | 'vibes' | 'name' | 'position' | 'classYear';
export type SortDir = 'asc' | 'desc';
export type PositionFilter = 'ALL' | Position;
/** Empty array means all class years. */
export type ClassFilter = string[];
export type PoolView = 'available' | 'taken';
export type StatusFilter = PlayerStatus | 'all' | 'taken';

export function defaultSortDir(sortKey: SortKey): SortDir {
  return sortKey === 'name' || sortKey === 'position' || sortKey === 'classYear' ? 'asc' : 'desc';
}

export function classYearOptions(players: Player[]): string[] {
  return [
    ...new Set(
      players
        .map((player) => player.classYear.trim())
        .filter((year) => year.length > 0),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function pruneClassFilter(selected: ClassFilter, options: string[]): ClassFilter {
  return selected.filter((year) => options.includes(year));
}

export function matchesClassFilter(player: Player, selected: ClassFilter): boolean {
  if (selected.length === 0) return true;
  return selected.includes(player.classYear.trim());
}

export function comparePlayers(a: Player, b: Player, sortKey: SortKey, sortDir: SortDir): number {
  const dir = sortDir === 'asc' ? 1 : -1;
  let result = 0;

  if (sortKey === 'name') result = a.name.localeCompare(b.name);
  else if (sortKey === 'position') {
    result = a.position.localeCompare(b.position) || a.name.localeCompare(b.name);
  } else if (sortKey === 'classYear') {
    result = a.classYear.localeCompare(b.classYear, undefined, { numeric: true }) || a.name.localeCompare(b.name);
  } else if (sortKey === 'talent') {
    result = a.talent - b.talent || a.name.localeCompare(b.name);
  } else if (sortKey === 'vibes') {
    result = a.vibes - b.vibes || a.name.localeCompare(b.name);
  } else {
    result =
      overall(a.talent, a.vibes) - overall(b.talent, b.vibes) ||
      a.talent - b.talent ||
      a.name.localeCompare(b.name);
  }

  return result * dir;
}

export function filterPlayers(
  players: Player[],
  options: {
    query: string;
    position: PositionFilter;
    classYear?: ClassFilter;
    status: StatusFilter;
    sortKey: SortKey;
    sortDir: SortDir;
  },
): Player[] {
  const query = options.query.trim().toLowerCase();
  const classYear = options.classYear ?? [];

  return players
    .filter((player) => matchesStatus(player, options.status))
    .filter((player) => options.position === 'ALL' || player.position === options.position)
    .filter((player) => matchesClassFilter(player, classYear))
    .filter(
      (player) =>
        !query ||
        player.name.toLowerCase().includes(query) ||
        player.notes.toLowerCase().includes(query) ||
        player.classYear.toLowerCase().includes(query),
    )
    .slice()
    .sort((a, b) => comparePlayers(a, b, options.sortKey, options.sortDir));
}

/** Keep a prior row order when ratings change so Plan edits do not reshuffle mid-score. */
export function applyStablePlayerOrder(players: Player[], priorIds: string[]): Player[] {
  if (priorIds.length === 0) return players;
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered: Player[] = [];
  for (const id of priorIds) {
    const player = byId.get(id);
    if (!player) continue;
    ordered.push(player);
    byId.delete(id);
  }
  for (const player of players) {
    if (byId.has(player.id)) ordered.push(player);
  }
  return ordered;
}

export function rosterCounts(players: Player[], ourTeamId?: string): { skaters: number; goalies: number } {
  const mine = players.filter(
    (player) =>
      player.status === 'my_team' ||
      (player.status === 'assigned' && ourTeamId != null && player.draftedByTeamId === ourTeamId) ||
      (player.status === 'captain' && ourTeamId != null && player.captainOfTeamId === ourTeamId),
  );
  return {
    skaters: mine.filter((player) => player.position === 'Skater').length,
    goalies: mine.filter((player) => player.position === 'Goalie').length,
  };
}

export function matchesStatus(player: Player, status: StatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'taken') {
    return (
      player.status === 'drafted' ||
      player.status === 'my_team' ||
      player.status === 'assigned' ||
      player.status === 'captain'
    );
  }
  return player.status === status;
}

export function teamPicks(players: Player[], teamId: string): Player[] {
  return players
    .filter((player) => player.draftedByTeamId === teamId && player.pickNumber != null)
    .sort((a, b) => (a.pickNumber ?? 0) - (b.pickNumber ?? 0));
}

export function teamCaptains(players: Player[], teamId: string): Player[] {
  return players.filter((player) => player.status === 'captain' && player.captainOfTeamId === teamId);
}

export function teamAssigned(players: Player[], teamId: string): Player[] {
  return players
    .filter((player) => player.status === 'assigned' && player.draftedByTeamId === teamId)
    .sort((a, b) => a.name.localeCompare(b.name));
}
