import { useEffect, useMemo, useReducer, useState } from 'react';
import { ClipboardList, Download, LogOut, PenLine, Plus, Settings2, Undo2, Upload, Users } from 'lucide-react';
import { AddPlayerDialog } from '@/components/AddPlayerDialog';
import { AvailableList } from '@/components/AvailableList';
import { ImportDialog } from '@/components/ImportDialog';
import { PickBoard } from '@/components/PickBoard';
import { PlanningBoard } from '@/components/PlanningBoard';
import { RosterPanel } from '@/components/RosterPanel';
import { CorrectPicksDialog } from '@/components/CorrectPicksDialog';
import { RoomLobby } from '@/components/RoomLobby';
import { SetupDialog } from '@/components/SetupDialog';
import { TeamRosterDialog } from '@/components/TeamRosterDialog';
import { primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import {
  clearRoomConnection,
  loadRoomConnection,
  saveRoomConnection,
  type RoomConnection,
} from '@/lib/roomConnection';
import { readRoom, type RoomPayload } from '@/lib/roomsApi';
import { maxPicks, ourUpcomingPicks, teamForPick } from '@/lib/draftOrder';
import { parsePlayerWorkbook } from '@/lib/importPlayers';
import {
  filterPlayers,
  classYearOptions,
  defaultSortDir,
  type ClassFilter,
  type PoolView,
  type PositionFilter,
  type SortDir,
  type SortKey,
} from '@/lib/listPlayers';
import { normalizeName } from '@/lib/ratings';
import { lastOccupiedPick } from '@/lib/correctPick';
import { canExportDraft, downloadDraftExport, isDraftComplete } from '@/lib/exportDraft';
import { createSeededSession, createStore, playerById, reduceSession } from '@/lib/session';
import { clearSavedSession } from '@/lib/storage';
import { useRoomSync } from '@/lib/useRoomSync';
import type { ImportResult, PlayerInput } from '@/types';

export default function App() {
  const [store, dispatch] = useReducer(reduceSession, undefined, () => createStore(createSeededSession()));
  const { session, past } = store;
  const [query, setQuery] = useState('');
  const [pool, setPool] = useState<PoolView>('available');
  const [rosterTeamId, setRosterTeamId] = useState<string | null>(null);
  const [position, setPosition] = useState<PositionFilter>('ALL');
  const [classYear, setClassYear] = useState<ClassFilter>([]);
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captainTeamId, setCaptainTeamId] = useState(
    session.teams.find((team) => !team.isUs)?.id ?? session.teams[0].id,
  );
  const [assignTeamId, setAssignTeamId] = useState(session.teams[0]?.id ?? '');
  const [dialog, setDialog] = useState<'import' | 'add' | 'setup' | 'correct' | null>(null);
  const [view, setView] = useState<'draft' | 'plan'>('draft');
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctPickNumber, setCorrectPickNumber] = useState<number | null>(null);
  const [gate, setGate] = useState<'lobby' | 'board' | 'rejoining'>(() =>
    loadRoomConnection() ? 'rejoining' : 'lobby',
  );
  const [room, setRoom] = useState<RoomConnection | null>(null);
  const { commit, setVersion } = useRoomSync(room, dispatch);

  useEffect(() => {
    const existing = loadRoomConnection();
    if (!existing) return undefined;
    let cancelled = false;
    void readRoom(existing.id, existing.token)
      .then((payload) => {
        if (cancelled) return;
        dispatch({ type: 'hydrate', session: payload.session });
        setRoom({ id: payload.id, name: payload.name, token: payload.token });
        setVersion(payload.version);
        setGate('board');
      })
      .catch(() => {
        if (cancelled) return;
        clearRoomConnection();
        setRoom(null);
        setGate('lobby');
      });
    return () => {
      cancelled = true;
    };
  }, [setVersion]);

  const listed = useMemo(
    () =>
      filterPlayers(session.players, {
        query,
        position,
        classYear,
        status: view === 'plan' ? 'all' : pool,
        sortKey,
        sortDir,
      }),
    [session.players, query, position, classYear, pool, sortKey, sortDir, view],
  );
  const classOptions = useMemo(() => classYearOptions(session.players), [session.players]);

  useEffect(() => {
    setClassYear((current) => {
      const next = current.filter((year) => classOptions.includes(year));
      return next.length === current.length ? current : next;
    });
  }, [classOptions]);

  useEffect(() => {
    if (!session.teams.some((team) => team.id === captainTeamId && !team.isUs)) {
      const fallback = session.teams.find((team) => !team.isUs);
      if (fallback) setCaptainTeamId(fallback.id);
    }
  }, [session.teams, captainTeamId]);

  useEffect(() => {
    if (!session.teams.some((team) => team.id === assignTeamId)) {
      const fallback = session.teams[0];
      if (fallback) setAssignTeamId(fallback.id);
    }
  }, [session.teams, assignTeamId]);

  const selected = playerById(session, selectedId);
  const onClock = teamForPick(session.teams, session.currentPick, session.draftType).team;
  const nextOurs = ourUpcomingPicks(session, 1)[0];
  const availableCount = session.players.filter((player) => player.status === 'available').length;
  const draftedCount = session.players.filter(
    (player) =>
      player.status === 'drafted' || player.status === 'my_team' || player.status === 'assigned',
  ).length;
  const filledPicks = lastOccupiedPick(session);
  const exportReady = canExportDraft(session);
  const draftDone = isDraftComplete(session);

  const resetBoardUi = () => {
    setQuery('');
    setPool('available');
    setRosterTeamId(null);
    setPosition('ALL');
    setClassYear([]);
    setSortKey('overall');
    setSortDir('desc');
    setSelectedId(null);
    setDialog(null);
    setView('draft');
    setCorrectionMode(false);
    setCorrectPickNumber(null);
  };

  const enterRoom = (payload: RoomPayload) => {
    const connection = { id: payload.id, name: payload.name, token: payload.token };
    saveRoomConnection(connection);
    setRoom(connection);
    setVersion(payload.version);
    dispatch({ type: 'hydrate', session: payload.session });
    resetBoardUi();
    setGate('board');
  };

  const enterSandbox = () => {
    clearSavedSession();
    dispatch({ type: 'hydrate', session: createSeededSession() });
    resetBoardUi();
    setGate('board');
  };

  const leaveRoom = () => {
    clearRoomConnection();
    setRoom(null);
    resetBoardUi();
    setGate('lobby');
  };

  const canRecordPick = session.currentPick <= maxPicks(session);

  const recordClockPick = (playerId: string) => {
    if (!canRecordPick) return;
    commit({ type: 'recordPick', playerId, teamId: onClock.id });
    setSelectedId(null);
  };

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(defaultSortDir(key));
  };

  const openCorrectMenu = (pickNumber?: number) => {
    setCorrectionMode(true);
    setCorrectPickNumber(pickNumber ?? null);
    setDialog('correct');
  };

  const correctAssignment = (pickNumber: number, playerId: string) => {
    commit({ type: 'correctPick', pickNumber, playerId });
  };

  const clearAssignment = (pickNumber: number) => {
    commit({ type: 'clearPick', pickNumber });
  };

  const markCaptain = (playerId: string) => {
    const team = session.teams.find((item) => item.id === captainTeamId);
    if (!team || team.isUs) return;
    commit({ type: 'markCaptain', playerId, teamId: team.id });
    setSelectedId(null);
  };

  const selectPlayer = (playerId: string) => {
    setSelectedId(playerId);
    const player = session.players.find((item) => item.id === playerId);
    const currentTeamId = player?.draftedByTeamId ?? player?.captainOfTeamId;
    if (!currentTeamId) return;
    const otherTeam = session.teams.find((team) => team.id !== currentTeamId);
    if (otherTeam) setAssignTeamId(otherTeam.id);
  };

  const assignOutsideDraft = (playerId: string) => {
    const team = session.teams.find((item) => item.id === assignTeamId);
    if (!team) return;
    commit({ type: 'assignOutsideDraft', playerId, teamId: team.id });
    setSelectedId(null);
  };

  const addPlayer = (input: PlayerInput): boolean => {
    const exists = session.players.some(
      (player) => normalizeName(player.name) === normalizeName(input.name),
    );
    if (exists) return false;
    commit({ type: 'addPlayer', input });
    return true;
  };

  const previewImport = async (file: File): Promise<ImportResult> => {
    const buffer = await file.arrayBuffer();
    return parsePlayerWorkbook(buffer);
  };

  if (gate === 'rejoining') {
    return (
      <main className="grid min-h-screen place-items-center bg-rink text-ice">
        <p className="font-semibold text-slate-500">Opening room…</p>
      </main>
    );
  }

  if (gate === 'lobby') {
    return <RoomLobby onEnterRoom={enterRoom} onEnterSandbox={enterSandbox} />;
  }

  return (
    <main className="min-h-screen bg-rink text-ice">
      <header className="border-b border-white/10 bg-ice text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/tuck-logo.png"
              alt="Tuck School of Business"
              className="h-8 w-auto shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-sm tracking-wide">{session.name}</p>
              <p className="truncate text-[9px] font-semibold uppercase tracking-[.16em] text-slate-400">
                {room ? `Room ${room.id} · shared` : 'Sandbox · not saved'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              className={headerActionClass}
              disabled={Boolean(room) || past.length === 0}
              title={room ? 'Undo is only available in sandbox mode' : undefined}
              onClick={() => commit({ type: 'undo' })}
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
            <button type="button" className={headerActionClass} onClick={() => setDialog('import')}>
              <Upload className="size-3.5" />
              Import
            </button>
            <button
              type="button"
              className={`${headerActionClass} ${view === 'plan' ? 'border-mint/40 bg-mint/15 text-mint' : ''}`}
              disabled={session.players.length === 0}
              onClick={() => setView((current) => (current === 'plan' ? 'draft' : 'plan'))}
            >
              <ClipboardList className="size-3.5" />
              Plan
            </button>
            <button
              type="button"
              className={`${headerActionClass} ${correctionMode ? 'border-mint/40 bg-mint/15 text-mint' : ''}`}
              disabled={filledPicks === 0}
              onClick={() => {
                if (correctionMode && dialog === 'correct') {
                  setCorrectionMode(false);
                  setDialog(null);
                  setCorrectPickNumber(null);
                  return;
                }
                openCorrectMenu();
              }}
            >
              <PenLine className="size-3.5" />
              Correct
            </button>
            <button
              type="button"
              className={`${headerActionClass} ${draftDone ? 'border-mint/40 bg-mint/15 text-mint hover:bg-mint/20' : ''}`}
              disabled={!exportReady}
              onClick={() => downloadDraftExport(session)}
            >
              <Download className="size-3.5" />
              Export
            </button>
            <button type="button" className={headerActionClass} onClick={() => setDialog('add')}>
              <Plus className="size-3.5" />
              Add player
            </button>
            <button type="button" className={headerActionClass} onClick={() => setDialog('setup')}>
              <Settings2 className="size-3.5" />
              Setup
            </button>
            <button
              type="button"
              className={headerActionClass}
              onClick={() => (room ? leaveRoom() : setGate('lobby'))}
            >
              <LogOut className="size-3.5" />
              {room ? 'Leave' : 'Rooms'}
            </button>
          </div>
        </div>
      </header>

      {!room && (
        <div className="border-b border-gold/30 bg-[#fff6db] px-4 py-2.5 text-center sm:px-6">
          <p className="text-sm font-semibold text-ice">
            Sandbox trial — this board stays in this tab only. It is not saved when you close the
            browser or leave this space.
          </p>
        </div>
      )}

      <section className="border-b bg-ice-2 text-white">
        <div className="mx-auto max-w-[1500px] px-4 py-2 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-4">
            <Stat label="On the clock" value={onClock.name} accent={onClock.isUs} />
            <Stat label="Our next pick" value={nextOurs ? `#${nextOurs}` : '—'} />
            <Stat label="Still available" value={String(availableCount)} />
            <Stat label="Picks made" value={`${draftedCount} / ${session.players.length || 0}`} />
          </div>
          {session.players.length > 0 && view === 'draft' && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <PickBoard
                session={session}
                correctionMode={correctionMode}
                onOpenTeam={setRosterTeamId}
                onCorrectPick={openCorrectMenu}
                onMoveTeam={(teamId, direction) => {
                  const hasOccupied =
                    session.players.some((player) => player.pickNumber != null) ||
                    (session.skippedPicks?.length ?? 0) > 0;
                  if (
                    hasOccupied &&
                    !window.confirm('Reorder teams and clear all picks and skips? Captains and ratings stay.')
                  ) {
                    return;
                  }
                  commit({ type: 'reorderTeam', teamId, direction });
                }}
              />
            </div>
          )}
        </div>
      </section>

      {correctionMode && (
        <div className="mx-auto mt-4 flex max-w-[calc(1500px-64px)] flex-wrap items-center justify-between gap-2 rounded-xl border border-mint/20 bg-[#e8f7f3] px-4 py-3 text-sm font-semibold text-[#087064]">
          <p>Correction mode — click a past pick to change who went there. The draft order stays put.</p>
          <div className="flex gap-2">
            <button type="button" className={secondaryButtonClass + ' h-8 px-3 text-xs'} onClick={() => openCorrectMenu()}>
              Open list
            </button>
            <button
              type="button"
              className={secondaryButtonClass + ' h-8 px-3 text-xs'}
              onClick={() => {
                setCorrectionMode(false);
                setDialog(null);
                setCorrectPickNumber(null);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {session.players.length === 0 ? (
        <div className="mx-auto grid max-w-[720px] place-items-center px-4 py-20 text-center">
          <Users className="size-10 text-slate-300" />
          <h1 className="mt-4 font-display text-4xl text-ice">Load the player pool</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Import the Tripod spreadsheet or a CSV with Name, Talent, Vibes, and Position. Rate the
            pool in Plan, then mark other captains and take players when you are on the clock.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => setDialog('import')}>
              <Upload className="size-4" />
              Import Excel
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setDialog('add')}>
              Add one player
            </button>
          </div>
        </div>
      ) : (
        view === 'plan' ? (
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <PlanningBoard
            players={listed}
            classOptions={classOptions}
            selectedId={selectedId}
            query={query}
            position={position}
            classYear={classYear}
            sortKey={sortKey}
            sortDir={sortDir}
            onQuery={setQuery}
            onPosition={setPosition}
            onClassYear={setClassYear}
            onSort={changeSort}
            onSelect={selectPlayer}
            onEdit={(id, patch) => commit({ type: 'editPlayer', id, input: patch })}
            onBackToDraft={() => setView('draft')}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="min-w-0">
            <AvailableList
              players={listed}
              classOptions={classOptions}
              teams={session.teams}
              pool={pool}
              selectedId={selectedId}
              query={query}
              position={position}
              classYear={classYear}
              sortKey={sortKey}
              sortDir={sortDir}
              onPool={setPool}
              onQuery={setQuery}
              onPosition={setPosition}
              onClassYear={setClassYear}
              onSort={changeSort}
              onSelect={selectPlayer}
              onRecordPick={recordClockPick}
              onSkipPick={() => commit({ type: 'skipPick' })}
              canSkip={canRecordPick}
              canRecordPick={canRecordPick}
              ourTurn={onClock.isUs}
              onClockName={onClock.name}
            />
          </div>
          <div>
            <RosterPanel
              session={session}
              selected={selected}
              captainTeamId={captainTeamId}
              assignTeamId={assignTeamId}
              ourTurn={onClock.isUs}
              onClockName={onClock.name}
              onCaptainTeamId={setCaptainTeamId}
              onAssignTeamId={setAssignTeamId}
              onRecordPick={recordClockPick}
              canRecordPick={canRecordPick}
              onMarkCaptain={markCaptain}
              onAssignOutsideDraft={assignOutsideDraft}
              onRestore={(id) => {
                commit({ type: 'restorePlayer', playerId: id });
              }}
              onSelect={selectPlayer}
              onEdit={(id, patch) => commit({ type: 'editPlayer', id, input: patch })}
            />
          </div>
        </div>
      )
      )}

      {dialog === 'import' && (
        <ImportDialog
          onClose={() => setDialog(null)}
          onPreview={previewImport}
          onImport={(result, mode) => {
            commit({ type: 'importPlayers', players: result.players, mode });
            setDialog(null);
            setView('plan');
          }}
        />
      )}
      {dialog === 'add' && <AddPlayerDialog onClose={() => setDialog(null)} onAdd={addPlayer} />}
      {dialog === 'correct' && (
        <CorrectPicksDialog
          key={correctPickNumber ?? 'menu'}
          session={session}
          initialPick={correctPickNumber}
          onClose={() => setDialog(null)}
          onCorrect={correctAssignment}
          onClear={clearAssignment}
        />
      )}
      {rosterTeamId && (
        <TeamRosterDialog
          session={session}
          teamId={rosterTeamId}
          onClose={() => setRosterTeamId(null)}
          onSelect={selectPlayer}
        />
      )}
      {dialog === 'setup' && (
        <SetupDialog
          session={session}
          onClose={() => setDialog(null)}
          onSave={(next) => {
            commit({
              type: 'configure',
              name: next.name,
              teamCount: next.teamCount,
              ourSlot: next.ourSlot,
              draftType: next.draftType,
              teamNames: next.teamNames,
              teamIds: next.teamIds,
            });
          }}
          onResetPicks={() => {
            if (!window.confirm('Clear every pick and out-of-cycle assignment, and keep the player ratings? Captains stay marked. Skipped picks are cleared.')) return;
            commit({ type: 'resetPicks' });
          }}
          onClearPlayers={() => {
            if (!window.confirm('Remove every player from this draft session?')) return;
            commit({ type: 'clearPlayers' });
            setView('draft');
            setDialog(null);
          }}
        />
      )}
    </main>
  );
}

const headerActionClass =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-40';

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="eyebrow text-slate-400">{label}</p>
      <p className={`truncate font-display text-lg ${accent ? 'text-mint' : ''}`}>{value}</p>
    </div>
  );
}
