import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { maxPicks, teamForPick, type MoveDirection } from '@/lib/draftOrder';
import { teamPicks } from '@/lib/listPlayers';
import type { DraftSession } from '@/types';

/** Approx chip width including gap — keeps the strip from needing horizontal scroll. */
const CHIP_SLOT_PX = 148;
const MIN_VISIBLE_PICKS = 3;

type PickBoardProps = {
  session: DraftSession;
  correctionMode?: boolean;
  onOpenTeam: (teamId: string) => void;
  onCorrectPick?: (pickNumber: number) => void;
  onMoveTeam?: (teamId: string, direction: MoveDirection) => void;
};

export function PickBoard({
  session,
  correctionMode = false,
  onOpenTeam,
  onCorrectPick,
  onMoveTeam,
}: PickBoardProps) {
  const stripRef = useRef<HTMLOListElement>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    const node = stripRef.current;
    if (!node) return undefined;

    const update = () => {
      const width = node.clientWidth;
      const next = Math.max(MIN_VISIBLE_PICKS, Math.floor(width / CHIP_SLOT_PX));
      setVisibleCount(next);
    };

    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const total = maxPicks(session);
  const { start, end } = visiblePickWindow(session.currentPick, total, visibleCount);
  const rows = [];

  for (let pick = start; pick <= end; pick += 1) {
    rows.push({ pick, ...teamForPick(session.teams, pick, session.draftType) });
  }

  const assigned = new Map(
    session.players
      .filter((player) => player.pickNumber != null)
      .map((player) => [player.pickNumber as number, player]),
  );
  const onClockId = teamForPick(session.teams, session.currentPick, session.draftType).team.id;
  const canEditOrder = Boolean(onMoveTeam);
  const [editingOrder, setEditingOrder] = useState(false);
  const teams = [...session.teams].sort((a, b) => a.slot - b.slot);

  useEffect(() => {
    if (!canEditOrder) setEditingOrder(false);
  }, [canEditOrder]);

  return (
    <section className="space-y-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <p className="eyebrow shrink-0 text-slate-400">Teams</p>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {teams.map((team, index) => {
            const count = teamPicks(session.players, team.id).length;
            const onClock = team.id === onClockId;
            if (editingOrder) {
              return (
                <div
                  key={team.id}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-1.5 ${chipTone(onClock, team.isUs)}`}
                >
                  <span className="font-mono text-[10px] font-bold text-slate-400">#{team.slot}</span>
                  <span className={`max-w-[5.5rem] truncate text-xs font-bold ${team.isUs ? 'text-mint' : 'text-white'}`}>
                    {team.name}
                  </span>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="grid size-3.5 place-items-center text-slate-300 hover:text-white disabled:opacity-25"
                      aria-label={`Move ${team.name} up`}
                      disabled={index === 0}
                      onClick={() => onMoveTeam?.(team.id, 'up')}
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="grid size-3.5 place-items-center text-slate-300 hover:text-white disabled:opacity-25"
                      aria-label={`Move ${team.name} down`}
                      disabled={index === teams.length - 1}
                      onClick={() => onMoveTeam?.(team.id, 'down')}
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={team.id}
                type="button"
                aria-label={`${team.name} roster`}
                onClick={() => onOpenTeam(team.id)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-left ${chipTone(onClock, team.isUs)}`}
              >
                <span className={`truncate text-xs font-bold ${team.isUs ? 'text-mint' : 'text-white'}`}>
                  {team.name}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>
        {canEditOrder && (
          <button
            type="button"
            className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
              editingOrder
                ? 'border-mint/40 bg-mint/15 text-mint'
                : 'border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setEditingOrder((current) => !current)}
          >
            {editingOrder ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <p className="eyebrow shrink-0 text-slate-400">Snake</p>
        <ol ref={stripRef} className="flex min-w-0 flex-1 gap-1 overflow-hidden">
          {rows.map(({ pick, team, round }) => {
            const player = assigned.get(pick);
            const isCurrent = pick === session.currentPick;
            return (
              <li key={pick} className="min-w-0 flex-1 basis-0">
                <button
                  type="button"
                  aria-label={
                    correctionMode && (player || pick < session.currentPick)
                      ? `Correct pick ${pick}`
                      : `${team.name} roster`
                  }
                  onClick={() => {
                    if (correctionMode && onCorrectPick && (player || pick < session.currentPick)) {
                      onCorrectPick(pick);
                      return;
                    }
                    onOpenTeam(team.id);
                  }}
                  className={`inline-flex h-7 w-full items-center gap-1.5 rounded-md border px-2 text-left ${chipTone(isCurrent, team.isUs)} ${
                    correctionMode && player ? 'ring-1 ring-mint/40' : ''
                  }`}
                >
                  <span className="shrink-0 font-mono text-[10px] font-bold text-slate-400">#{pick}</span>
                  <span className={`truncate text-xs font-semibold ${player ? 'text-white' : 'text-slate-400'}`}>
                    {player?.name ?? (isCurrent ? 'On the clock' : `${team.name} R${round}`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:inline">
          {session.draftType === 'linear' ? 'Linear' : 'Snake'} · {session.teams.length} · {session.rounds}r
        </span>
      </div>
    </section>
  );
}

/** Fill the strip with past picks ending at the current pick (pad forward only at the start). */
export function visiblePickWindow(
  currentPick: number,
  total: number,
  visibleCount: number,
): { start: number; end: number } {
  const count = Math.max(MIN_VISIBLE_PICKS, Math.min(visibleCount, total));
  let end = Math.min(total, currentPick);
  let start = Math.max(1, end - count + 1);
  if (end - start + 1 < count) {
    end = Math.min(total, start + count - 1);
  }
  return { start, end };
}

function chipTone(active: boolean, isUs: boolean): string {
  if (active) {
    return isUs ? 'border-mint/40 bg-mint/15' : 'border-coral/40 bg-coral/15';
  }
  return isUs
    ? 'border-mint/25 bg-white/5 hover:bg-white/10'
    : 'border-white/15 bg-white/5 hover:bg-white/10';
}
