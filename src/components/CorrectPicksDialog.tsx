import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, inputClass, secondaryButtonClass } from '@/components/Dialog';
import { lastFilledPick, playerOnPick } from '@/lib/correctPick';
import { teamForPick } from '@/lib/draftOrder';
import type { DraftSession, Player } from '@/types';

type CorrectPicksDialogProps = {
  session: DraftSession;
  initialPick?: number | null;
  onClose: () => void;
  onCorrect: (pickNumber: number, playerId: string) => void;
  onClear: (pickNumber: number) => void;
};

export function CorrectPicksDialog({
  session,
  initialPick,
  onClose,
  onCorrect,
  onClear,
}: CorrectPicksDialogProps) {
  const lastPick = lastFilledPick(session.players);
  const pickNumbers = Array.from({ length: lastPick }, (_, index) => index + 1);
  const [pickNumber, setPickNumber] = useState(initialPick && initialPick <= lastPick ? initialPick : lastPick);
  const [query, setQuery] = useState('');
  const current = playerOnPick(session.players, pickNumber);
  const pickTeam = pickNumber > 0 ? teamForPick(session.teams, pickNumber, session.draftType).team : undefined;

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return session.players
      .filter((player) => player.id !== current?.id)
      .filter((player) => !needle || player.name.toLowerCase().includes(needle))
      .sort((a, b) => statusRank(a) - statusRank(b) || a.name.localeCompare(b.name));
  }, [session.players, current?.id, query]);

  return (
    <Dialog title="Correct a pick" onClose={onClose} wide>
      <p className="text-sm text-slate-500">
        Change who went in a past slot. Later picks stay on their numbers. Choosing someone already
        taken swaps the two.
      </p>
      {lastPick === 0 ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">No picks to correct yet.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2 text-slate-500">Past picks</p>
            <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1">
              {pickNumbers.map((pick) => {
                const player = playerOnPick(session.players, pick);
                const team = teamForPick(session.teams, pick, session.draftType).team;
                const selected = pick === pickNumber;
                return (
                  <button
                    key={pick}
                    type="button"
                    onClick={() => {
                      setPickNumber(pick);
                      setQuery('');
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      selected ? 'border-teal/40 bg-[#e8f7f3]' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{pick}</span>
                      <span className={`truncate text-xs font-bold ${team.isUs ? 'text-teal' : 'text-slate-500'}`}>
                        {team.name}
                      </span>
                    </div>
                    <p className={`mt-1 truncate text-sm font-semibold ${player ? 'text-ice' : 'text-slate-400'}`}>
                      {player?.name ?? 'Empty slot'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2 text-slate-500">
              {pickTeam ? `Assign to #${pickNumber} · ${pickTeam.name}` : 'Choose a pick'}
            </p>
            {current && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{current.name}</p>
                  <p className="text-[11px] text-slate-500">Currently assigned</p>
                </div>
                <button
                  type="button"
                  className={secondaryButtonClass + ' h-8 px-3 text-xs'}
                  onClick={() => onClear(pickNumber)}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a replacement..."
              />
            </div>
            <div className="grid max-h-56 gap-1 overflow-y-auto pr-1">
              {candidates.slice(0, 40).map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                  aria-label={`Assign ${player.name} to pick ${pickNumber}`}
                  onClick={() => onCorrect(pickNumber, player.id)}
                >
                  <span className="truncate text-sm font-semibold">{player.name}</span>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {candidateLabel(player)}
                  </span>
                </button>
              ))}
              {candidates.length === 0 && (
                <p className="px-1 py-3 text-sm text-slate-500">No matching players.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function statusRank(player: Player): number {
  if (player.status === 'available') return 0;
  if (player.status === 'captain') return 1;
  return 2;
}

function candidateLabel(player: Player): string {
  if (player.status === 'available') return 'Available';
  if (player.status === 'captain') return 'Captain';
  return player.pickNumber != null ? `Swap #${player.pickNumber}` : 'Taken';
}
