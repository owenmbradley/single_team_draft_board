import type { FormEvent } from 'react';
import { useState } from 'react';
import { Dialog, Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import { RatingPips } from '@/components/RatingPips';
import { DEFAULT_RATING } from '@/lib/ratings';
import type { PlayerInput, Position } from '@/types';

const emptyForm: PlayerInput = {
  name: '',
  position: 'Skater',
  talent: DEFAULT_RATING,
  vibes: DEFAULT_RATING,
  notes: '',
  classYear: '',
};

type AddPlayerDialogProps = {
  onClose: () => void;
  onAdd: (input: PlayerInput) => boolean;
};

export function AddPlayerDialog({ onClose, onAdd }: AddPlayerDialogProps) {
  const [form, setForm] = useState<PlayerInput>(emptyForm);
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Enter a player name.');
      return;
    }
    const added = onAdd(form);
    if (!added) {
      setError('That player is already on the board.');
      return;
    }
    onClose();
  };

  return (
    <Dialog title="Add player" onClose={onClose}>
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Name">
          <input
            autoFocus
            className={inputClass}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Last-minute add"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Position">
            <select
              className={inputClass}
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value as Position }))}
            >
              <option value="Skater">Skater</option>
              <option value="Goalie">Goalie</option>
            </select>
          </Field>
          <Field label="Class year">
            <input
              className={inputClass}
              value={form.classYear}
              onChange={(event) => setForm((current) => ({ ...current, classYear: event.target.value }))}
              placeholder="Optional"
            />
          </Field>
        </div>
        <Field label="Talent">
          <RatingPips label="Talent" value={form.talent} onChange={(talent) => setForm((current) => ({ ...current, talent }))} />
        </Field>
        <Field label="Vibes">
          <RatingPips label="Vibes" value={form.vibes} onChange={(vibes) => setForm((current) => ({ ...current, vibes }))} />
        </Field>
        <Field label="Notes">
          <input
            className={inputClass}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Shot, room presence, anything useful"
          />
        </Field>
        {error && <p className="text-sm font-semibold text-coral">{error}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass}>
            Add to pool
          </button>
        </div>
      </form>
    </Dialog>
  );
}
