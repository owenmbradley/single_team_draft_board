import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import { draftRounds } from '@/lib/draftOrder';
import type { DraftSession, DraftType } from '@/types';

type SetupDialogProps = {
  session: DraftSession;
  onClose: () => void;
  onSave: (next: {
    name: string;
    teamCount: number;
    ourSlot: number;
    draftType: DraftType;
    teamNames: string[];
  }) => void;
  onResetPicks: () => void;
  onClearPlayers: () => void;
};

export function SetupDialog({ session, onClose, onSave, onResetPicks, onClearPlayers }: SetupDialogProps) {
  const [name, setName] = useState(session.name);
  const [teamCount, setTeamCount] = useState(session.teams.length);
  const [ourSlot, setOurSlot] = useState(session.teams.find((team) => team.isUs)?.slot ?? 1);
  const [draftType, setDraftType] = useState<DraftType>(session.draftType);
  const [teamNames, setTeamNames] = useState(session.teams.map((team) => team.name));
  const rounds = draftRounds(session.players.length, teamCount);

  const names = useMemo(() => {
    return Array.from({ length: teamCount }, (_, index) => {
      if (teamNames[index]) return teamNames[index];
      const slot = index + 1;
      return slot === ourSlot ? 'Our Team' : `Team ${slot}`;
    });
  }, [teamCount, teamNames, ourSlot]);

  const moveSetupTeam = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= names.length) return;
    const next = [...names];
    [next[index], next[target]] = [next[target], next[index]];
    setTeamNames(next);
    if (ourSlot === index + 1) setOurSlot(target + 1);
    else if (ourSlot === target + 1) setOurSlot(index + 1);
  };

  return (
    <Dialog title="Draft setup" onClose={onClose} wide>
      <div className="grid gap-3">
        <Field label="Draft name">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <div>
          <p className="mb-1 text-sm font-semibold text-ice-3">Draft type</p>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <TypeButton
              label="Snake"
              active={draftType === 'snake'}
              onClick={() => setDraftType('snake')}
            />
            <TypeButton
              label="Linear"
              active={draftType === 'linear'}
              onClick={() => setDraftType('linear')}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {draftType === 'snake'
              ? 'Snake reverses the order at the end of each round.'
              : 'Linear keeps the same first-to-last order every round.'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Teams">
            <input
              className={inputClass}
              type="number"
              min={2}
              max={20}
              value={teamCount}
              onChange={(event) => {
                const next = Number(event.target.value);
                setTeamCount(next);
                if (ourSlot > next) setOurSlot(next);
              }}
            />
          </Field>
          <Field label="Our slot">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={teamCount}
              value={ourSlot}
              onChange={(event) => setOurSlot(Number(event.target.value))}
            />
          </Field>
          <div>
            <p className="text-sm font-semibold text-ice-3">Rounds</p>
            <p className="mt-2 font-display text-2xl leading-none text-ice">{rounds}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              {session.players.length} players ÷ {Math.max(1, teamCount)} teams
            </p>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500">
          Rounds update from the player pool and team count. Changing teams or our slot clears picks
          and captains. Switching snake/linear clears picks so the board matches the new order;
          captains stay.
        </p>
        <div>
          <p className="eyebrow mb-2 text-slate-500">Draft order</p>
          <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
            {names.map((teamName, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-8 font-mono text-xs text-slate-400">{index + 1}</span>
                <input
                  className={inputClass}
                  value={teamName}
                  onChange={(event) => {
                    const next = [...names];
                    next[index] = event.target.value;
                    setTeamNames(next);
                  }}
                />
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="grid size-5 place-items-center text-slate-400 hover:text-ice disabled:opacity-25"
                    aria-label={`Move ${teamName} up`}
                    disabled={index === 0}
                    onClick={() => moveSetupTeam(index, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="grid size-5 place-items-center text-slate-400 hover:text-ice disabled:opacity-25"
                    aria-label={`Move ${teamName} down`}
                    disabled={index === names.length - 1}
                    onClick={() => moveSetupTeam(index, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onResetPicks}>
              Reset picks
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-coral/30 px-4 text-sm font-bold text-coral hover:bg-[#fff0ed]"
              onClick={onClearPlayers}
            >
              Clear pool
            </button>
          </div>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              onSave({ name, teamCount, ourSlot, draftType, teamNames: names });
              onClose();
            }}
          >
            Save setup
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function TypeButton({
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
      className={`h-9 rounded-md px-3 text-sm font-bold ${
        active ? 'bg-white text-ice shadow-sm' : 'text-slate-500 hover:text-ice'
      }`}
    >
      {label}
    </button>
  );
}
