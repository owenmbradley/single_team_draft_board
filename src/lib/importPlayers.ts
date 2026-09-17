import * as XLSX from 'xlsx';
import type { ImportResult, ParsedPlayer } from '@/types';
import { clampRating, DEFAULT_RATING, normalizeName, parsePosition } from '@/lib/ratings';

const NAME_HEADERS = ['player name', 'name', 'player'];
const TALENT_HEADERS = ['talent', 'skating (1-5)', 'skating', 'skill', 'ability'];
const VIBES_HEADERS = ['vibes (1-5)', 'vibes', 'vibe'];
const POSITION_HEADERS = ['position', 'pos', 'player type'];
const NOTES_HEADERS = ['comments', 'comment', 'notes', 'note'];
const CLASS_HEADERS = ['class', 'class year', 'year'];

export const TEMPLATE_CSV = `Player Name,Position,Class,Talent,Vibes,Notes
Miles Irwin,Skater,2027,4.5,5,Hilarious on the bench
Noah Bennett,Goalie,2028,5,4,Calm in net
Oliver Mercer,Skater,2027,5,3.5,Natural leader
`;

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/\s+/g, ' ').trim();
}

function headerKey(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const entries = Object.keys(row).map((key) => [key, normalizeHeader(key)] as const);

  for (const candidate of candidates) {
    const exact = entries.find(([, normalized]) => normalized === candidate);
    if (exact) return exact[0];
  }

  for (const candidate of candidates) {
    const partial = entries.find(([, normalized]) => normalized.startsWith(candidate));
    if (partial) return partial[0];
  }

  return undefined;
}

function cellString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function cellRating(value: unknown): number {
  if (value == null || cellString(value) === '') return DEFAULT_RATING;
  return clampRating(Number(value));
}

export function parsePlayerRows(rows: Record<string, unknown>[]): Omit<ImportResult, 'sheetName'> {
  if (rows.length === 0) {
    return { players: [], warnings: ['No player rows were found in that file.'] };
  }

  const sample = rows[0];
  const nameKey = headerKey(sample, NAME_HEADERS);
  if (!nameKey) {
    return {
      players: [],
      warnings: ['Could not find a player name column. Use "Player Name" or "Name".'],
    };
  }

  const talentKey = headerKey(sample, TALENT_HEADERS);
  const vibesKey = headerKey(sample, VIBES_HEADERS);
  const positionKey = headerKey(sample, POSITION_HEADERS);
  const notesKey = headerKey(sample, NOTES_HEADERS);
  const classKey = headerKey(sample, CLASS_HEADERS);
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const players: ParsedPlayer[] = [];

  if (!talentKey) warnings.push('No talent column found. Defaulted new players to 0.');
  if (!vibesKey) warnings.push('No vibes column found. Defaulted new players to 0.');
  if (!positionKey) warnings.push('No position column found. Defaulted players to Skater.');

  rows.forEach((row, index) => {
    const name = cellString(row[nameKey]);
    if (!name) return;

    const key = normalizeName(name);
    const player: ParsedPlayer = {
      name,
      position: positionKey ? parsePosition(row[positionKey]) : 'Skater',
      talent: talentKey ? cellRating(row[talentKey]) : DEFAULT_RATING,
      vibes: vibesKey ? cellRating(row[vibesKey]) : DEFAULT_RATING,
      notes: notesKey ? cellString(row[notesKey]) : '',
      classYear: classKey ? cellString(row[classKey]) : '',
    };

    const existingIndex = seen.get(key);
    if (existingIndex != null) {
      players[existingIndex] = player;
      warnings.push(`Duplicate name "${name}" on row ${index + 2}; kept the last copy.`);
      return;
    }

    seen.set(key, players.length);
    players.push(player);
  });

  if (players.length === 0) {
    warnings.push('The name column was present, but every row was empty.');
  }

  return { players, warnings };
}

function pickSheetName(workbook: XLSX.WorkBook): string {
  if (workbook.SheetNames.includes('Players')) return 'Players';

  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes('draft')) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[name], {
      header: 1,
      defval: '',
    });
    const header = (rows[0] ?? []).map((cell) => String(cell).toLowerCase()).join(' ');
    if (header.includes('player') || header.includes('name')) return name;
  }

  return workbook.SheetNames[0] ?? '';
}

export function parsePlayerWorkbook(data: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(data, { type: 'array' });
  if (workbook.SheetNames.length === 0) {
    return { players: [], warnings: ['That file does not contain any sheets.'], sheetName: '' };
  }

  const sheetName = pickSheetName(workbook);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const parsed = parsePlayerRows(rows);
  return { ...parsed, sheetName };
}

export function downloadTemplate(): void {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'draft-board-players.csv';
  link.click();
  URL.revokeObjectURL(url);
}
