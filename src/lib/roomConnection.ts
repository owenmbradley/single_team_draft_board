export type RoomConnection = {
  id: string;
  name: string;
  token: string;
};

export const ROOM_CONNECTION_KEY = 'tripod-draft-room-v1';

function memory(): Storage | null {
  try {
    const storage = globalThis.window?.localStorage;
    if (!storage) return null;
    const probe = '__tripod-draft-room-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadRoomConnection(): RoomConnection | null {
  const storage = memory();
  const raw = storage?.getItem(ROOM_CONNECTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RoomConnection;
    if (!parsed.id || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRoomConnection(connection: RoomConnection): void {
  memory()?.setItem(ROOM_CONNECTION_KEY, JSON.stringify(connection));
}

export function clearRoomConnection(): void {
  memory()?.removeItem(ROOM_CONNECTION_KEY);
}
