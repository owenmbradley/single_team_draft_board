import type { DraftSession, Player, Team } from './types';
import { maxPicks, teamForPick } from './draftOrder';

export function lastFilledPick(players: Player[]): number {
  return players.reduce((highest, player) => Math.max(highest, player.pickNumber ?? 0), 0);
}

export function playerOnPick(players: Player[], pickNumber: number): Player | undefined {
  return players.find((player) => player.pickNumber === pickNumber);
}

export function applyPickCorrection(
  session: DraftSession,
  pickNumber: number,
  playerId: string,
): Player[] | null {
  if (pickNumber < 1 || pickNumber > maxPicks(session)) return null;

  const incoming = session.players.find((player) => player.id === playerId);
  if (!incoming || incoming.pickNumber === pickNumber) return null;

  const { team } = teamForPick(session.teams, pickNumber, session.draftType);
  const current = playerOnPick(session.players, pickNumber);
  const swapPick = incoming.pickNumber;
  const swapTeam =
    swapPick != null
      ? (session.teams.find((item) => item.id === incoming.draftedByTeamId) ??
        teamForPick(session.teams, swapPick, session.draftType).team)
      : null;

  return session.players.map((player) => {
    if (player.id === incoming.id) return assignToPick(player, pickNumber, team);
    if (current && player.id === current.id) {
      return swapPick != null && swapTeam
        ? assignToPick(player, swapPick, swapTeam)
        : releaseFromPick(player);
    }
    return player;
  });
}

export function clearPickAssignment(session: DraftSession, pickNumber: number): Player[] | null {
  const current = playerOnPick(session.players, pickNumber);
  if (!current) return null;

  return session.players.map((player) => (player.id === current.id ? releaseFromPick(player) : player));
}

function assignToPick(player: Player, pickNumber: number, team: Team): Player {
  return {
    ...player,
    status: team.isUs ? 'my_team' : 'drafted',
    pickNumber,
    draftedByTeamId: team.id,
    captainOfTeamId: null,
  };
}

function releaseFromPick(player: Player): Player {
  return {
    ...player,
    status: 'available',
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: null,
  };
}
