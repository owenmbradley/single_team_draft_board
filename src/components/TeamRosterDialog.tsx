import { Dialog } from '@/components/Dialog';
import { TotalScore } from '@/components/RatingPips';
import { teamCaptains, teamPicks } from '@/lib/listPlayers';
import { formatOverall, overall } from '@/lib/ratings';
import type { DraftSession, Player } from '@/types';

type TeamRosterDialogProps = {
  session: DraftSession;
  teamId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function TeamRosterDialog({ session, teamId, onClose, onSelect }: TeamRosterDialogProps) {
  const team = session.teams.find((item) => item.id === teamId);
  const picks = teamPicks(session.players, teamId);
  const captains = teamCaptains(session.players, teamId);
  const title = team ? `${team.name} roster` : 'Team roster';

  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-sm text-slate-500">
        {captains.length > 0 ? `${captains.length} captain · ` : ''}
        {picks.length === 0
          ? 'No picks yet for this team.'
          : `${picks.length} pick${picks.length === 1 ? '' : 's'} so far`}
        {team?.isUs ? ' · Our team' : ''}
      </p>
      {captains.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow text-slate-500">Captain</p>
          <div className="mt-2 space-y-2">
            {captains.map((player) => (
              <RosterPlayerButton
                key={player.id}
                player={player}
                meta="Captain · off the board"
                onSelect={() => {
                  onSelect(player.id);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className={captains.length > 0 ? 'mt-5' : 'mt-4'}>
        {captains.length > 0 && <p className="eyebrow mb-2 text-slate-500">Picks</p>}
        <div className="space-y-2">
          {picks.map((player) => (
            <RosterPlayerButton
              key={player.id}
              player={player}
              meta={`#${player.pickNumber} · ${player.position}`}
              onSelect={() => {
                onSelect(player.id);
                onClose();
              }}
            />
          ))}
          {picks.length === 0 && captains.length > 0 && (
            <p className="text-sm text-slate-500">No draft picks yet.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function RosterPlayerButton({
  player,
  meta,
  onSelect,
}: {
  player: Player;
  meta: string;
  onSelect: () => void;
}) {
  const score = overall(player.talent, player.vibes);
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:bg-slate-50"
      onClick={onSelect}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{player.name}</p>
        <p className="text-[11px] text-slate-500">{meta}</p>
      </div>
      <TotalScore score={score} formatted={formatOverall(player.talent, player.vibes)} />
    </button>
  );
}
