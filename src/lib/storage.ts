import type { DraftSession } from '@/types';

export const STORAGE_KEY = 'tripod-draft-board-v3';

function memory(): Storage | null {
  try {
    const storage = globalThis.window?.localStorage;
    if (!storage) return null;
    const probe = '__tripod-draft-board-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadSession(): DraftSession | null {
  const storage = memory();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DraftSession;
    if (!parsed || !Array.isArray(parsed.players) || !Array.isArray(parsed.teams)) {
      return null;
    }
    if (parsed.players.length < 10) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: DraftSession): void {
  const storage = memory();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(session));
}
