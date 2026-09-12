import { ArrowDown, ArrowUp, Search, Users } from 'lucide-react';
import { RatingPips, TotalScore } from '@/components/RatingPips';
import { formatOverall, overall } from '@/lib/ratings';
import { type PoolView, type PositionFilter, type SortDir, type SortKey } from '@/lib/listPlayers';
import type { Player, Position, Team } from '@/types';

const headerClass =
  'px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[.13em] text-slate-500';
const cellClass = 'px-3 py-2.5 align-middle';

type AvailableListProps = {
  players: Player[];
  teams: Team[];
  pool: PoolView;
  selectedId: string | null;
  query: string;
  position: PositionFilter;
  sortKey: SortKey;
  sortDir: SortDir;
  onPool: (value: PoolView) => void;
  onQuery: (value: string) => void;
  onPosition: (value: PositionFilter) => void;
  onSort: (key: SortKey) => void;
  onSelect: (id: string) => void;
  onRecordPick: (id: string) => void;
  ourTurn: boolean;
  onClockName: string;
};

export function AvailableList({
  players,
  teams,
  pool,
  selectedId,
  query,
  position,
  sortKey,
  sortDir,
  onPool,
  onQuery,
  onPosition,
  onSort,
  onSelect,
  onRecordPick,
  ourTurn,
  onClockName,
}: AvailableListProps) {
  const showingTaken = pool === 'taken';

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-teal">{showingTaken ? 'Taken' : 'Available pool'}</p>
          <h1 className="font-display text-3xl tracking-tight text-ice">
            {showingTaken ? 'Who has already been taken' : 'Who is still on the board'}
          </h1>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <PoolButton label="Available" active={!showingTaken} onClick={() => onPool('available')} />
            <PoolButton label="Taken" active={showingTaken} onClick={() => onPool('taken')} />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {showingTaken
              ? `${players.length} taken`
              : ourTurn
                ? 'Your pick — Take'
                : `${onClockName} is on the clock — Picked`}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(8,31,43,.06)]">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="w-full min-w-[800px] table-fixed border-separate border-spacing-0">
            <colgroup>
              <col />
              <col className="w-[7.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[6.25rem]" />
              <col className="w-[6.5rem]" />
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
                  <SortButton
                    label="Class"
                    active={sortKey === 'classYear'}
                    dir={sortDir}
                    onClick={() => onSort('classYear')}
                  />
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
                <th scope="col" className={`${headerClass} text-right`}>
                  {showingTaken ? 'Team' : ourTurn ? 'Take' : 'Picked'}
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
                      <button type="button" className="block w-full min-w-0 text-left" onClick={() => onSelect(player.id)}>
                        <span className="block truncate font-semibold normal-case tracking-normal text-ice">
                          {player.name}
                        </span>
                        <span className="mt-0.5 block line-clamp-3 whitespace-normal text-[11px] font-medium leading-snug normal-case tracking-normal text-slate-500">
                          {player.notes || 'No notes'}
                        </span>
                      </button>
                    </td>
                    <td className={cellClass}>{positionBadge(player.position)}</td>
                    <td className={`${cellClass} text-sm font-semibold tabular-nums text-ice`}>
                      {player.classYear || '—'}
                    </td>
                    <td className={cellClass}>
                      <RatingPips label={`${player.name} talent`} value={player.talent} />
                    </td>
                    <td className={cellClass}>
                      <RatingPips label={`${player.name} vibes`} value={player.vibes} />
                    </td>
                    <td className={cellClass}>
                      <TotalScore score={score} formatted={formatOverall(player.talent, player.vibes)} />
                    </td>
                    <td className={`${cellClass} text-right`}>
                      {showingTaken ? (
                        <TakenMeta player={player} teams={teams} />
                      ) : (
                        <button
                          type="button"
                          className={`h-8 rounded-lg px-2.5 text-xs font-bold text-white ${
                            ourTurn ? 'bg-teal hover:bg-[#0b7565]' : 'bg-coral hover:bg-[#ca3f31]'
                          }`}
                          onClick={() => onRecordPick(player.id)}
                        >
                          {ourTurn ? 'Take' : 'Picked'}
                        </button>
                      )}
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
                <p className="font-semibold">
                  {showingTaken ? 'No taken players match' : 'No available players match'}
                </p>
                <p className="text-sm text-slate-500">
                  {showingTaken
                    ? 'Mark picks as they happen, or clear the filters.'
                    : 'Import a list, add a player, or clear the filters.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PoolButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 rounded-md px-3 text-xs font-bold ${
        active ? 'bg-white text-ice shadow-sm' : 'text-slate-500 hover:text-ice'
      }`}
    >
      {label}
    </button>
  );
}

function TakenMeta({ player, teams }: { player: Player; teams: Team[] }) {
  const team = teams.find((item) => item.id === player.draftedByTeamId);
  return (
    <div className="leading-tight">
      <p className="text-xs font-bold text-ice">{team?.name ?? 'Taken'}</p>
      <p className="text-[11px] font-semibold text-slate-500">
        {player.pickNumber != null ? `#${player.pickNumber}` : 'No pick'}
      </p>
    </div>
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

function positionBadge(position: Position) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
        position === 'Goalie' ? 'bg-[#fff7df] text-[#8b6110]' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {position}
    </span>
  );
}
