import * as XLSX from 'xlsx';
import { maxPicks, teamForPick } from '@/lib/draftOrder';
import { teamCaptains, teamPicks } from '@/lib/listPlayers';
import { formatOverall, formatRating, overall } from '@/lib/ratings';
import type { DraftSession, Player } from '@/types';

export function isDraftComplete(session: DraftSession): boolean {
  if (session.players.length === 0) return false;
  const noneAvailable = session.players.every((player) => player.status !== 'available');
  const boardFull = session.currentPick > maxPicks(session);
  return noneAvailable || boardFull;
}

export function canExportDraft(session: DraftSession): boolean {
  return session.players.some(
    (player) => player.pickNumber != null || player.status === 'captain',
  );
}

export function exportFileName(session: DraftSession): string {
  const slug = session.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${slug || 'draft-results'}.xlsx`;
}

export function buildDraftWorkbook(session: DraftSession): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows(session)), 'Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(boardRows(session)), 'Pick board');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rosterRows(session)), 'Rosters');

  const leftover = session.players
    .filter((player) => player.status === 'available')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(playerRow);
  if (leftover.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(leftover), 'Still available');
  }

  return workbook;
}

export function downloadDraftExport(session: DraftSession): void {
  const bytes = XLSX.write(buildDraftWorkbook(session), { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(session);
  link.click();
  URL.revokeObjectURL(url);
}

function summaryRows(session: DraftSession) {
  const picks = session.players.filter((player) => player.pickNumber != null).length;
  const captains = session.players.filter((player) => player.status === 'captain').length;
  return [
    { Field: 'Draft', Value: session.name },
    { Field: 'Type', Value: session.draftType === 'linear' ? 'Linear' : 'Snake' },
    { Field: 'Teams', Value: session.teams.length },
    { Field: 'Rounds', Value: session.rounds },
    { Field: 'Picks made', Value: picks },
    { Field: 'Captains', Value: captains },
    { Field: 'Still available', Value: session.players.filter((player) => player.status === 'available').length },
    { Field: 'Complete', Value: isDraftComplete(session) ? 'Yes' : 'No' },
  ];
}

function boardRows(session: DraftSession) {
  const last = Math.max(
    ...session.players.map((player) => player.pickNumber ?? 0),
    session.currentPick - 1,
  );
  const end = Math.min(maxPicks(session), Math.max(last, 0));
  const assigned = new Map(
    session.players
      .filter((player) => player.pickNumber != null)
      .map((player) => [player.pickNumber as number, player]),
  );

  return Array.from({ length: end }, (_, index) => {
    const pick = index + 1;
    const { team, round } = teamForPick(session.teams, pick, session.draftType);
    const player = assigned.get(pick);
    return {
      Pick: pick,
      Round: round,
      Team: team.name,
      Player: player?.name ?? '',
      Position: player?.position ?? '',
      Talent: player ? formatRating(player.talent) : '',
      Vibes: player ? formatRating(player.vibes) : '',
      Total: player ? formatOverall(player.talent, player.vibes) : '',
      Class: player?.classYear ?? '',
      Notes: player?.notes ?? '',
    };
  });
}

function rosterRows(session: DraftSession) {
  return session.teams.flatMap((team) => {
    const captains = teamCaptains(session.players, team.id).map((player) => ({
      Team: team.name,
      Role: 'Captain',
      Pick: '',
      ...playerFields(player),
    }));
    const picks = teamPicks(session.players, team.id).map((player) => ({
      Team: team.name,
      Role: 'Pick',
      Pick: player.pickNumber ?? '',
      ...playerFields(player),
    }));
    return [...captains, ...picks];
  });
}

function playerRow(player: Player) {
  return {
    Player: player.name,
    Position: player.position,
    Talent: formatRating(player.talent),
    Vibes: formatRating(player.vibes),
    Total: formatOverall(player.talent, player.vibes),
    Class: player.classYear,
    Notes: player.notes,
  };
}

function playerFields(player: Player) {
  return {
    Player: player.name,
    Position: player.position,
    Talent: formatRating(player.talent),
    Vibes: formatRating(player.vibes),
    Total: overall(player.talent, player.vibes),
    Class: player.classYear,
    Notes: player.notes,
  };
}
