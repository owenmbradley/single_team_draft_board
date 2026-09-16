import { createRoomId, normalizeRoomId } from './ids';
import { hashPassword, verifyPassword } from './password';
import { toPublicRoom, type PublicRoom, type RoomRecord, type RoomStore } from './store';
import { issueRoomToken, readRoomToken } from './token';
import { createSession, createStore, reduceSession, type SessionAction } from './session';

const ALLOWED_ACTIONS = new Set<SessionAction['type']>([
  'configure',
  'renameTeam',
  'reorderTeam',
  'importPlayers',
  'addPlayer',
  'editPlayer',
  'recordPick',
  'skipPick',
  'correctPick',
  'clearPick',
  'markCaptain',
  'assignOutsideDraft',
  'restorePlayer',
  'resetPicks',
  'clearPlayers',
  'undo',
]);

export class RoomError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type RoomPayload = {
  id: string;
  name: string;
  token: string;
  version: number;
  session: RoomRecord['store']['session'];
};

export function createRoomService(store: RoomStore) {
  async function requireRoom(id: string): Promise<RoomRecord> {
    const room = await store.get(normalizeRoomId(id));
    if (!room) throw new RoomError('That room was not found.', 404);
    return room;
  }

  async function requireAuthorized(id: string, token: string): Promise<RoomRecord> {
    const parsed = readRoomToken(token);
    const roomId = normalizeRoomId(id);
    if (!parsed || parsed.roomId !== roomId) {
      throw new RoomError('Enter the room password again.', 401);
    }
    return requireRoom(roomId);
  }

  function payload(room: RoomRecord, token = issueRoomToken(room.id)): RoomPayload {
    return {
      id: room.id,
      name: room.name,
      token,
      version: room.version,
      session: room.store.session,
    };
  }

  return {
    async list(): Promise<PublicRoom[]> {
      const rooms = await store.list();
      return rooms.map(toPublicRoom);
    },

    async create(name: string, password: string): Promise<RoomPayload> {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) throw new RoomError('Give the room a name.', 400);
      if (password.length < 4) throw new RoomError('Use a password with at least 4 characters.', 400);

      const { salt, hash } = hashPassword(password);
      const session = { ...createSession(), name: trimmed };
      const now = new Date().toISOString();
      const room: RoomRecord = {
        id: createRoomId(),
        name: trimmed,
        passwordHash: hash,
        passwordSalt: salt,
        version: 1,
        createdAt: now,
        updatedAt: now,
        store: createStore(session),
      };
      await store.save(room);
      return payload(room);
    },

    async join(id: string, password: string): Promise<RoomPayload> {
      const room = await requireRoom(id);
      if (!verifyPassword(password, room.passwordSalt, room.passwordHash)) {
        throw new RoomError('That password does not match this room.', 401);
      }
      return payload(room);
    },

    async read(id: string, token: string): Promise<RoomPayload> {
      const room = await requireAuthorized(id, token);
      return payload(room, token);
    },

    async apply(id: string, token: string, action: SessionAction): Promise<RoomPayload> {
      if (!action || typeof action !== 'object' || !ALLOWED_ACTIONS.has(action.type)) {
        throw new RoomError('That action cannot be synced.', 400);
      }
      if (action.type === 'undo') {
        throw new RoomError('Undo is only available in sandbox mode.', 400);
      }
      const room = await requireAuthorized(id, token);
      const expectedVersion = room.version;
      const next = reduceSession(room.store, action);
      const changed = next !== room.store;
      if (!changed) return payload(room, token);

      const latest = await store.get(id);
      if (!latest || latest.version !== expectedVersion) {
        throw new RoomError('Room was updated by someone else. Try again.', 409);
      }

      const saved: RoomRecord = {
        ...latest,
        version: latest.version + 1,
        updatedAt: new Date().toISOString(),
        store: next,
      };
      await store.save(saved);
      return payload(saved, token);
    },
  };
}

export type RoomService = ReturnType<typeof createRoomService>;
