import { useCallback, useEffect, useRef } from 'react';
import type { RoomConnection } from '@/lib/roomConnection';
import { applyRoomAction, readRoom } from '@/lib/roomsApi';
import type { SessionAction } from '@/lib/session';
import type { DraftSession, PlayerInput } from '@/types';

function mergePending(session: DraftSession, pending: Map<string, Partial<PlayerInput>>): DraftSession {
  if (pending.size === 0) return session;
  return {
    ...session,
    players: session.players.map((player) => {
      const patch = pending.get(player.id);
      return patch ? { ...player, ...patch } : player;
    }),
  };
}

export function useRoomSync(room: RoomConnection | null, dispatch: (action: SessionAction) => void) {
  const pending = useRef(new Map<string, Partial<PlayerInput>>());
  const versionRef = useRef(0);
  const timers = useRef(new Map<string, number>());
  const roomRef = useRef(room);
  roomRef.current = room;

  const hydrate = (session: DraftSession, version: number) => {
    versionRef.current = version;
    dispatch({ type: 'hydrate', session: mergePending(session, pending.current) });
  };

  const send = async (action: SessionAction) => {
    const current = roomRef.current;
    if (!current) return;
    const result = await applyRoomAction(current.id, current.token, action);
    if (action.type === 'editPlayer') {
      const open = pending.current.get(action.id);
      if (open) {
        const next = { ...open };
        for (const key of Object.keys(action.input) as (keyof PlayerInput)[]) {
          if (next[key] === action.input[key]) delete next[key];
        }
        if (Object.keys(next).length === 0) pending.current.delete(action.id);
        else pending.current.set(action.id, next);
      }
    }
    hydrate(result.session, result.version);
  };

  const commit = (action: SessionAction) => {
    dispatch(action);
    if (!roomRef.current) return;

    if (action.type === 'editPlayer') {
      pending.current.set(action.id, { ...pending.current.get(action.id), ...action.input });
      const notesOnly = Object.keys(action.input).length === 1 && action.input.notes !== undefined;
      if (notesOnly) {
        const previous = timers.current.get(action.id);
        if (previous) window.clearTimeout(previous);
        const handle = window.setTimeout(() => {
          timers.current.delete(action.id);
          void send(action).catch(() => undefined);
        }, 400);
        timers.current.set(action.id, handle);
        return;
      }
    }

    void send(action).catch(() => undefined);
  };

  useEffect(() => {
    if (!room) return undefined;
    const poll = () => {
      void readRoom(room.id, room.token)
        .then((result) => {
          if (result.version !== versionRef.current) hydrate(result.session, result.version);
        })
        .catch(() => undefined);
    };
    const interval = window.setInterval(poll, 1500);
    poll();
    return () => window.clearInterval(interval);
  }, [room]);

  const setVersion = useCallback((version: number) => {
    versionRef.current = version;
  }, []);

  return { commit, setVersion };
}
