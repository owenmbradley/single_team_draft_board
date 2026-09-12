import type { SessionAction } from '@/lib/session';
import type { DraftSession } from '@/types';

export type PublicRoom = {
  id: string;
  name: string;
  playerCount: number;
  pickCount: number;
  updatedAt: string;
};

export type RoomPayload = {
  id: string;
  name: string;
  token: string;
  version: number;
  session: DraftSession;
};

export class RoomsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new RoomsApiError(body.error ?? 'The room server could not complete that.', response.status);
  }
  return body;
}

export function listRooms(): Promise<{ rooms: PublicRoom[] }> {
  return request('/api/rooms');
}

export function createRoom(name: string, password: string): Promise<RoomPayload> {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
}

export function joinRoom(id: string, password: string): Promise<RoomPayload> {
  return request(`/api/rooms/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function readRoom(id: string, token: string): Promise<RoomPayload> {
  return request(`/api/rooms/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function applyRoomAction(id: string, token: string, action: SessionAction): Promise<RoomPayload> {
  return request(`/api/rooms/${id}/actions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
}
