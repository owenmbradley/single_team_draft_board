import { useEffect, useState } from 'react';
import { DoorOpen, Plus, Users } from 'lucide-react';
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/Dialog';
import { createRoom, joinRoom, listRooms, RoomsApiError, type PublicRoom, type RoomPayload } from '@/lib/roomsApi';

type RoomLobbyProps = {
  onEnterRoom: (payload: RoomPayload) => void;
  onUseLocal: () => void;
};

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function RoomLobby({ onEnterRoom, onUseLocal }: RoomLobbyProps) {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const result = await listRooms();
      setRooms(result.rooms);
    } catch (caught) {
      setRooms([]);
      setError(caught instanceof RoomsApiError ? caught.message : 'Could not load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const enter = async (work: () => Promise<RoomPayload>) => {
    setBusy(true);
    setError('');
    try {
      onEnterRoom(await work());
    } catch (caught) {
      setError(caught instanceof RoomsApiError ? caught.message : 'Could not enter that room.');
    } finally {
      setBusy(false);
    }
  };

  const selected = rooms.find((room) => room.id === selectedId) ?? null;

  return (
    <main className="min-h-screen bg-rink text-ice">
      <header className="border-b border-white/10 bg-ice text-white">
        <div className="mx-auto flex max-w-[720px] items-center gap-2 px-4 py-3 sm:px-6">
          <img src="/tuck-logo.png" alt="Tuck School of Business" className="h-8 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm tracking-wide">Draft rooms</p>
            <p className="truncate text-[9px] font-semibold uppercase tracking-[.16em] text-slate-400">
              Shared board · password to enter
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[720px] gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="eyebrow text-teal">Open rooms</p>
          <h1 className="mt-1 font-display text-3xl text-ice">Choose a draft</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Room names are listed here so captains can find tonight&apos;s board. Rosters, rankings, and
            comments stay inside the room until someone enters the password.
          </p>

          {loading ? (
            <p className="mt-5 text-sm font-semibold text-slate-500">Loading rooms…</p>
          ) : rooms.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
              No rooms yet. Create one below for tonight&apos;s draft.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(room.id);
                      setJoinPassword('');
                      setError('');
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                      selectedId === room.id ? 'bg-[#e8f7f3]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      <span className="block font-display text-lg text-ice">{room.name}</span>
                      <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {room.id} · {room.playerCount} players · {room.pickCount} picks
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {formatUpdated(room.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void enter(() => joinRoom(selected.id, joinPassword));
              }}
            >
              <p className="text-sm font-semibold text-ice-3">
                Enter {selected.name} <span className="text-slate-400">({selected.id})</span>
              </p>
              <Field label="Password">
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  value={joinPassword}
                  onChange={(event) => setJoinPassword(event.target.value)}
                />
              </Field>
              <button type="submit" className={primaryButtonClass} disabled={busy || joinPassword.length < 4}>
                <DoorOpen className="size-4" />
                Enter room
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-2xl text-ice">Create a room</h2>
          <p className="mt-1 text-sm text-slate-600">
            Share the room ID and password with the other captains. Each room keeps its own pool.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void enter(() => createRoom(createName, createPassword));
            }}
          >
            <Field label="Room name">
              <input
                className={inputClass}
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Tripod 2026"
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
              />
            </Field>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={busy || createName.trim().length === 0 || createPassword.length < 4}
            >
              <Plus className="size-4" />
              Create and enter
            </button>
          </form>
        </section>

        {error && <p className="text-sm font-semibold text-coral">{error}</p>}

        <button type="button" className={`${secondaryButtonClass} w-full`} onClick={onUseLocal}>
          <Users className="size-4" />
          Use this device only
        </button>
      </div>
    </main>
  );
}
