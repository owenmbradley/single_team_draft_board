import { ShieldCheck, Undo2 } from 'lucide-react';
import { RatingPips, TotalScore } from '@/components/RatingPips';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import { formatOverall, overall } from '@/lib/ratings';
import { rosterCounts } from '@/lib/listPlayers';
import type { DraftSession, Player, PlayerInput, Position } from '@/types';

type RosterPanelProps = {
  session: DraftSession;
  selected: Player | undefined;
  captainTeamId: string;
  assignTeamId: string;
  ourTurn: boolean;
  onClockName: string;
  onCaptainTeamId: (id: string) => void;
  onAssignTeamId: (id: string) => void;
  onRecordPick: (id: string) => void;
  onMarkCaptain: (id: string) => void;
  onAssignOutsideDraft: (id: string) => void;
  onRestore: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string, patch: Partial<PlayerInput>) => void;
};

export function RosterPanel({
  session,
  selected,
  captainTeamId,
  assignTeamId,
  ourTurn,
  onClockName,
  onCaptainTeamId,
  onAssignTeamId,
  onRecordPick,
  onMarkCaptain,
  onAssignOutsideDraft,
  onRestore,
  onSelect,
  onEdit,
}: RosterPanelProps) {
  const ourTeam = session.teams.find((team) => team.isUs);
  const mine = session.players
    .filter(
      (player) =>
        player.status === 'my_team' ||
        (player.status === 'assigned' && player.draftedByTeamId === ourTeam?.id),
    )
    .sort((a, b) => {
      if (a.pickNumber != null && b.pickNumber != null) return a.pickNumber - b.pickNumber;
      if (a.pickNumber != null) return -1;
      if (b.pickNumber != null) return 1;
      return a.name.localeCompare(b.name);
    });
  const counts = rosterCounts(session.players, ourTeam?.id);
  const otherTeams = session.teams.filter((team) => !team.isUs);
  const selectedTeamId = selected
    ? selected.draftedByTeamId ?? selected.captainOfTeamId
    : null;
  const selectedTeam = session.teams.find((team) => team.id === selectedTeamId);
  const canMoveAssign = Boolean(selected && assignTeamId !== selectedTeamId);

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(8,31,43,.06)]">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-slate-500">Selected player</p>
          <ShieldCheck className="size-4 text-teal" />
        </div>
        <p className="mt-3 font-display text-2xl text-ice">{selected?.name ?? 'Choose a player'}</p>
        {selected ? (
          <>
            <p className="mt-1 text-sm text-slate-500">
              {selected.position}
              {selected.classYear ? ` · ${selected.classYear}` : ''}
              {selected.status !== 'available' && selectedTeam
                ? ` · ${selectedTeam.name}${selected.pickNumber != null ? ` #${selected.pickNumber}` : selected.status === 'captain' ? ' · Captain' : ' · Assigned'}`
                : ''}
            </p>
            {selected.status === 'available' ? (
              <label className="mt-3 grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Notes
                <textarea
                  className="min-h-[6.5rem] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-ice outline-none focus:border-teal"
                  value={selected.notes}
                  placeholder="Add scouting notes"
                  aria-label={`${selected.name} notes`}
                  onChange={(event) => onEdit(selected.id, { notes: event.target.value })}
                />
              </label>
            ) : (
              selected.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ice">{selected.notes}</p>
              )
            )}
            {selected.status === 'available' && (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Position
                  <select
                    className={inputClass}
                    value={selected.position}
                    onChange={(event) =>
                      onEdit(selected.id, { position: event.target.value as Position })
                    }
                  >
                    <option value="Skater">Skater</option>
                    <option value="Goalie">Goalie</option>
                  </select>
                </label>
                <div className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Talent</span>
                  <RatingPips
                    label="Talent"
                    value={selected.talent}
                    onChange={(talent) => onEdit(selected.id, { talent })}
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vibes</span>
                  <RatingPips
                    label="Vibes"
                    value={selected.vibes}
                    onChange={(vibes) => onEdit(selected.id, { vibes })}
                  />
                </div>
                <button
                  type="button"
                  className={`${ourTurn ? primaryButtonClass : 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-coral px-4 text-sm font-bold text-white hover:bg-[#ca3f31]'} h-11 w-full`}
                  onClick={() => onRecordPick(selected.id)}
                >
                  {ourTurn ? 'Take for our team' : `Mark picked by ${onClockName}`}
                </button>
                <AssignTeamControls
                  session={session}
                  assignTeamId={assignTeamId}
                  onAssignTeamId={onAssignTeamId}
                  onAssign={() => onAssignOutsideDraft(selected.id)}
                  label="Assign without pick"
                  disabled={false}
                />
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Other team captain
                  <select
                    className={inputClass}
                    value={captainTeamId}
                    onChange={(event) => onCaptainTeamId(event.target.value)}
                  >
                    {otherTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={secondaryButtonClass} onClick={() => onMarkCaptain(selected.id)}>
                  Not available — captain
                </button>
              </div>
            )}
            {selected.status !== 'available' && (
              <div className="mt-4 grid gap-3">
                <AssignTeamControls
                  session={session}
                  assignTeamId={assignTeamId}
                  onAssignTeamId={onAssignTeamId}
                  onAssign={() => onAssignOutsideDraft(selected.id)}
                  label="Move to team"
                  disabled={!canMoveAssign}
                />
                <button type="button" className={`${secondaryButtonClass} w-full`} onClick={() => onRestore(selected.id)}>
                  <Undo2 className="size-4" />
                  Return to available
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Select anyone in the available pool or a roster to scout or move them.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-slate-500">Our roster</p>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {counts.skaters} skaters · {counts.goalies} goalies
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {mine.map((player) => (
            <button
              key={player.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onSelect(player.id)}
            >
              <RosterRow
                player={player}
                teamLabel={player.pickNumber != null ? `#${player.pickNumber}` : 'Assigned'}
              />
            </button>
          ))}
          {mine.length === 0 && <p className="text-sm text-slate-500">No picks yet.</p>}
        </div>
      </div>
    </aside>
  );
}

function AssignTeamControls({
  session,
  assignTeamId,
  onAssignTeamId,
  onAssign,
  label,
  disabled,
}: {
  session: DraftSession;
  assignTeamId: string;
  onAssignTeamId: (id: string) => void;
  onAssign: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        Assign to team
        <select
          className={inputClass}
          value={assignTeamId}
          onChange={(event) => onAssignTeamId(event.target.value)}
        >
          {session.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
              {team.isUs ? ' (us)' : ''}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className={secondaryButtonClass} onClick={onAssign} disabled={disabled}>
        {label}
      </button>
    </>
  );
}

function RosterRow({
  player,
  teamLabel,
}: {
  player: Player;
  teamLabel: string;
}) {
  const score = overall(player.talent, player.vibes);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold">{player.name}</p>
        <p className="text-[11px] text-slate-500">
          {teamLabel} · {player.position}
        </p>
      </div>
      <TotalScore score={score} formatted={formatOverall(player.talent, player.vibes)} />
    </div>
  );
}
