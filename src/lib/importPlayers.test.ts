import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePlayerRows, parsePlayerWorkbook, TEMPLATE_CSV } from '@/lib/importPlayers';

describe('parsePlayerRows', () => {
  it('reads the Tripod spreadsheet column names and maps skating to talent', () => {
    const result = parsePlayerRows([
      {
        'Player Name': 'Miles Irwin',
        Class: '2027',
        'Vibes (1-5)': 5,
        'Skating (1-5)': 4,
        Overall: 4.5,
        Comments: 'hilarious on the bench',
      },
      {
        'Player Name': 'Beckett Bell',
        Class: '2028',
        'Vibes (1-5)': 2,
        'Skating (1-5)': 4,
        Comments: 'great hands, quiet in the room',
      },
    ]);

    expect(result.players).toEqual([
      {
        name: 'Miles Irwin',
        position: 'Skater',
        talent: 4,
        vibes: 5,
        notes: 'hilarious on the bench',
        classYear: '2027',
      },
      {
        name: 'Beckett Bell',
        position: 'Skater',
        talent: 4,
        vibes: 2,
        notes: 'great hands, quiet in the room',
        classYear: '2028',
      },
    ]);
  });

  it('keeps decimal talent and vibes ratings', () => {
    const result = parsePlayerRows([
      {
        'Player Name': 'Hayden Novak',
        Position: 'Skater',
        Talent: 4.5,
        Vibes: 3.2,
      },
    ]);

    expect(result.players[0]).toMatchObject({
      name: 'Hayden Novak',
      talent: 4.5,
      vibes: 3.2,
    });
  });

  it('includes a Class column in the downloadable template', () => {
    const workbook = XLSX.read(TEMPLATE_CSV, { type: 'string' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
    const result = parsePlayerRows(rows);

    expect(result.players).toEqual([
      {
        name: 'Miles Irwin',
        position: 'Skater',
        talent: 4.5,
        vibes: 5,
        notes: 'Hilarious on the bench',
        classYear: '2027',
      },
      {
        name: 'Noah Bennett',
        position: 'Goalie',
        talent: 5,
        vibes: 4,
        notes: 'Calm in net',
        classYear: '2028',
      },
      {
        name: 'Oliver Mercer',
        position: 'Skater',
        talent: 5,
        vibes: 3.5,
        notes: 'Natural leader',
        classYear: '2027',
      },
    ]);
  });

  it('reads talent, vibes, and Goalie/Skater position columns', () => {
    const result = parsePlayerRows([
      {
        'Player Name': 'Noah Bennett',
        Position: 'G',
        Talent: 5,
        Vibes: 4,
        Notes: 'Calm in net',
      },
    ]);

    expect(result.players[0]).toEqual({
      name: 'Noah Bennett',
      position: 'Goalie',
      talent: 5,
      vibes: 4,
      notes: 'Calm in net',
      classYear: '',
    });
  });

  it('skips blank names and warns when rating columns are missing', () => {
    const result = parsePlayerRows([
      { Name: 'Pat Lee' },
      { Name: '   ' },
    ]);

    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({ name: 'Pat Lee', talent: 3, vibes: 3, position: 'Skater' });
    expect(result.warnings.some((warning) => warning.includes('talent'))).toBe(true);
  });

  it('requires a name column', () => {
    const result = parsePlayerRows([{ Talent: 4, Vibes: 2 }]);
    expect(result.players).toEqual([]);
    expect(result.warnings[0]).toMatch(/player name/i);
  });

  it('reads a Players sheet out of an Excel workbook', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      { 'Player Name': 'Ada Cole', Position: 'Goalie', Talent: 5, Vibes: 2, Notes: 'Last-minute add' },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Players');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const buffer = bytes instanceof ArrayBuffer ? bytes : Uint8Array.from(bytes as number[]).buffer;
    const result = parsePlayerWorkbook(buffer);
    expect(result.sheetName).toBe('Players');
    expect(result.players[0]).toMatchObject({ name: 'Ada Cole', position: 'Goalie', talent: 5 });
  });

  it('imports the Tripod testing spreadsheet', () => {
    const filePath = '/Users/owenbradley/Downloads/Tripod Drafter Testing.xlsx';
    if (!existsSync(filePath)) return;
    const file = readFileSync(filePath);
    const result = parsePlayerWorkbook(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect(result.sheetName).toBe('Players');
    expect(result.players).toHaveLength(100);
    expect(result.players[0]).toMatchObject({
      name: 'Miles Irwin',
      talent: 4,
      vibes: 5,
      notes: 'hilarious on the bench',
      classYear: '2027',
    });
  });
});
