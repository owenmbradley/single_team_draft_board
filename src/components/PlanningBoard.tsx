import { ArrowDown, ArrowUp, Search, Users } from 'lucide-react';
import { ClassYearFilter } from '@/components/ClassYearFilter';
import { RatingPips, TotalScore } from '@/components/RatingPips';
import { formatOverall, overall } from '@/lib/ratings';
import { type ClassFilter, type PositionFilter, type SortDir, type SortKey } from '@/lib/listPlayers';
import type { Player, PlayerInput, Position } from '@/types';

const headerClass =
  'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[.13em] text-slate-500';
const cellClass = 'px-3 py-2.5 align-middle';

type PlanningBoardProps = {
  players: Player[];
  classOptions: string[];
  selectedId: string | null;
  query: string;
  position: PositionFilter;
  classYear: ClassFilter;
  sortKey: SortKey;
  sortDir: SortDir;
  onQuery: (value: string) => void;
  onPosition: (value: PositionFilter) => void;
  onClassYear: (value: ClassFilter) => void;
  onSort: (key: SortKey) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string, patch: Partial<PlayerInput>) => void;
  onBackToDraft: () => void;
};

export function PlanningBoard({
  players,
  classOptions,
  selectedId,
  query,
  position,
  classYear,
  sortKey,
  sortDir,
  onQuery,
  onPosition,
  onClassYear,
  onSort,
  onSelect,
  onEdit,
  onBackToDraft,
}: PlanningBoardProps) {
  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-teal">Planning</p>
          <h1 className="font-display text-3xl tracking-tight text-ice">Rate the pool</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set talent, vibes, and notes after import. Everything saves as you go.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-teal px-4 text-sm font-bold text-white hover:bg-[#0b7565]"
          onClick={onBackToDraft}
        >
          Back to draft
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(8,31,43,.06)]">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col />
              <col className="w-[7.5rem]" />
              <col className="w-[6rem]" />
              <col className="w-[13.5rem]" />
              <col className="w-[13.5rem]" />
              <col className="w-[6.25rem]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#f3f6f6]">
              <tr>
                <th scope="col" className={headerClass}>
                  <div className="flex flex-col gap-2">
                    <SortButton label="Player" active={sortKey === 'name'} dir={sortDir} onClick={() => onSort('name')} />
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(event) => onQuery(event.target.value)}
                        className="h-8 w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 text-[11px] font-medium normal-case tracking-normal text-ice"
                        placeholder="Filter names..."
                      />
                    </div>
                  </div>
                </th>
                <th scope="col" className={headerClass}>
                  <div className="flex flex-col gap-2">
                    <SortButton
                      label="Pos."
                      active={sortKey === 'position'}
                      dir={sortDir}
                      onClick={() => onSort('position')}
                    />
                    <select
                      value={position}
                      onChange={(event) => onPosition(event.target.value as PositionFilter)}
                      className="h-8 rounded-md border border-slate-300 bg-white px-1 text-[11px] font-semibold normal-case tracking-normal text-ice"
                      aria-label="Filter by position"
                    >
                      <option value="ALL">All</option>
                      <option value="Skater">Skater</option>
                      <option value="Goalie">Goalie</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className={headerClass}>
                  <div className="flex flex-col gap-2">
                    <SortButton
                      label="Class"
                      active={sortKey === 'classYear'}
                      dir={sortDir}
                      onClick={() => onSort('classYear')}
                    />
                    <ClassYearFilter options={classOptions} value={classYear} onChange={onClassYear} />
                  </div>
                </th>
                <th scope="col" className={headerClass}>
                  <SortButton
                    label="Talent"
                    active={sortKey === 'talent'}
                    dir={sortDir}
                    onClick={() => onSort('talent')}
                  />
                </th>
                <th scope="col" className={headerClass}>
                  <SortButton
                    label="Vibes"
                    active={sortKey === 'vibes'}
                    dir={sortDir}
                    onClick={() => onSort('vibes')}
                  />
                </th>
                <th scope="col" className={headerClass}>
                  <SortButton
                    label="Total"
                    active={sortKey === 'overall'}
                    dir={sortDir}
                    onClick={() => onSort('overall')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const score = overall(player.talent, player.vibes);
                const selected = selectedId === player.id;
                return (
                  <tr
                    key={player.id}
                    className={`border-t border-slate-100 ${
                      selected ? 'bg-[#e8f7f3]' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <td className={cellClass}>
                      <button
                        type="button"
                        className="block w-full min-w-0 text-left"
                        onClick={() => onSelect(player.id)}
                      >
                        <span className="block truncate font-semibold text-ice">{player.name}</span>
                      </button>
                      <input
                        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-ice"
                        value={player.notes}
                        placeholder="Notes"
                        aria-label={`${player.name} notes`}
                        onChange={(event) => onEdit(player.id, { notes: event.target.value })}
                      />
                    </td>
                    <td className={cellClass}>
                      <select
                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-1 text-xs font-semibold text-ice"
                        value={player.position}
                        aria-label={`${player.name} position`}
                        onChange={(event) =>
                          onEdit(player.id, { position: event.target.value as Position })
                        }
                      >
                        <option value="Skater">Skater</option>
                        <option value="Goalie">Goalie</option>
                      </select>
                    </td>
                    <td className={cellClass}>
                      <input
                        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold tabular-nums text-ice"
                        value={player.classYear}
                        placeholder="Year"
                        aria-label={`${player.name} class`}
                        onChange={(event) => onEdit(player.id, { classYear: event.target.value })}
                      />
                    </td>
                    <td className={cellClass}>
                      <RatingPips
                        label={`${player.name} talent`}
                        value={player.talent}
                        onChange={(talent) => onEdit(player.id, { talent })}
                      />
                    </td>
                    <td className={cellClass}>
                      <RatingPips
                        label={`${player.name} vibes`}
                        value={player.vibes}
                        onChange={(vibes) => onEdit(player.id, { vibes })}
                      />
                    </td>
                    <td className={cellClass}>
                      <TotalScore score={score} formatted={formatOverall(player.talent, player.vibes)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <Users className="mx-auto mb-2 size-8 text-slate-300" />
                <p className="font-semibold">No players match</p>
                <p className="text-sm text-slate-500">Import a list or clear the filters.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${active ? 'text-ice' : 'text-slate-500 hover:text-ice'}`}
      aria-label={`Sort by ${label}${active ? `, ${dir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <span className="size-3" />
      )}
    </button>
  );
}
