import type { Player, PlayerStatus, Position } from '@/types';
import { overall } from '@/lib/ratings';

export type SortKey = 'overall' | 'talent' | 'vibes' | 'name' | 'position' | 'classYear';
export type SortDir = 'asc' | 'desc';
export type PositionFilter = 'ALL' | Position;
export type PoolView = 'available' | 'taken';
export type StatusFilter = PlayerStatus | 'all' | 'taken';

export function defaultSortDir(sortKey: SortKey): SortDir {
  return sortKey === 'name' || sortKey === 'position' || sortKey === 'classYear' ? 'asc' : 'desc';
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
    status: StatusFilter;
    sortKey: SortKey;
    sortDir: SortDir;
  },
): Player[] {
  const query = options.query.trim().toLowerCase();

  return players
    .filter((player) => matchesStatus(player, options.status))
    .filter((player) => options.position === 'ALL' || player.position === options.position)
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

export function rosterCounts(players: Player[]): { skaters: number; goalies: number } {
  const mine = players.filter((player) => player.status === 'my_team');
  return {
    skaters: mine.filter((player) => player.position === 'Skater').length,
    goalies: mine.filter((player) => player.position === 'Goalie').length,
  };
}

export function matchesStatus(player: Player, status: StatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'taken') return player.status === 'drafted' || player.status === 'my_team';
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
