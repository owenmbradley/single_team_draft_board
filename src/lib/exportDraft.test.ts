import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildDraftWorkbook, canExportDraft, exportFileName, isDraftComplete } from '@/lib/exportDraft';
import { createStore, reduceSession } from '@/lib/session';
import type { PlayerInput } from '@/types';

const miles: PlayerInput = {
  name: 'Miles Irwin',
  position: 'Skater',
  talent: 4,
  vibes: 5,
  notes: 'bench',
  classYear: '2027',
};

const pat: PlayerInput = {
  name: 'Pat Lee',
  position: 'Goalie',
  talent: 5,
  vibes: 4,
  notes: '',
  classYear: '',
};

describe('draft export', () => {
  it('is complete only after every player is off the available list', () => {
    let store = createStore();
    expect(isDraftComplete(store.session)).toBe(false);
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    expect(isDraftComplete(store.session)).toBe(false);
    expect(canExportDraft(store.session)).toBe(false);

    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[0].id,
    });
    expect(isDraftComplete(store.session)).toBe(true);
    expect(canExportDraft(store.session)).toBe(true);
  });

  it('writes a pick board and team rosters into the workbook', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });
    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[0].id,
    });
    store = reduceSession(store, {
      type: 'markCaptain',
      playerId: store.session.players[1].id,
      teamId: store.session.teams[1].id,
    });

    const workbook = buildDraftWorkbook(store.session);
    expect(workbook.SheetNames).toEqual(['Summary', 'Pick board', 'Rosters']);

    const board = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Pick board']);
    expect(board[0]).toMatchObject({
      Pick: 1,
      Team: 'Team 1',
      Player: 'Miles Irwin',
      Position: 'Skater',
    });

    const rosters = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Rosters);
    expect(rosters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Team: 'Team 1', Role: 'Pick', Player: 'Miles Irwin', Pick: 1 }),
        expect.objectContaining({ Team: 'Team 2', Role: 'Captain', Player: 'Pat Lee' }),
      ]),
    );
  });

  it('exports out-of-cycle assignments on the roster sheet', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, {
      type: 'assignOutsideDraft',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[0].id,
    });

    expect(canExportDraft(store.session)).toBe(true);
    const workbook = buildDraftWorkbook(store.session);
    const rosters = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Rosters);
    expect(rosters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Team: 'Team 1', Role: 'Assigned', Player: 'Miles Irwin' }),
      ]),
    );
  });

  it('names the file from the draft title', () => {
    expect(exportFileName({ name: 'Tripod Hockey Draft' } as never)).toBe('tripod-hockey-draft.xlsx');
  });
});
