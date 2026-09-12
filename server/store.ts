import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { SessionStore } from '../src/lib/session';

export type RoomRecord = {
  id: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  store: SessionStore;
};

export type RoomStore = {
  list(): Promise<RoomRecord[]>;
  get(id: string): Promise<RoomRecord | null>;
  save(room: RoomRecord): Promise<void>;
};

export type PublicRoom = {
  id: string;
  name: string;
  playerCount: number;
  pickCount: number;
  updatedAt: string;
};

export function toPublicRoom(room: RoomRecord): PublicRoom {
  return {
    id: room.id,
    name: room.name,
    playerCount: room.store.session.players.length,
    pickCount: room.store.session.players.filter((player) => player.pickNumber != null).length,
    updatedAt: room.updatedAt,
  };
}

class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();

  async list() {
    return [...this.rooms.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return this.rooms.get(id) ?? null;
  }

  async save(room: RoomRecord) {
    this.rooms.set(room.id, room);
  }
}

class FileRoomStore implements RoomStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readAll(): Promise<Record<string, RoomRecord>> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, RoomRecord>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async writeAll(rooms: Record<string, RoomRecord>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(rooms), 'utf8');
  }

  async list() {
    return Object.values(await this.readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    const rooms = await this.readAll();
    return rooms[id] ?? null;
  }

  async save(room: RoomRecord) {
    const rooms = await this.readAll();
    rooms[room.id] = room;
    await this.writeAll(rooms);
  }
}

class KvRoomStore implements RoomStore {
  private readonly kv: { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<unknown> };

  constructor(kv: { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<unknown> }) {
    this.kv = kv;
  }

  async list() {
    const ids = (await this.kv.get<string[]>('rooms:index')) ?? [];
    const rooms: RoomRecord[] = [];
    for (const id of ids) {
      const room = await this.get(id);
      if (room) rooms.push(room);
    }
    return rooms.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return (await this.kv.get<RoomRecord>(`room:${id}`)) ?? null;
  }

  async save(room: RoomRecord) {
    await this.kv.set(`room:${room.id}`, room);
    const ids = (await this.kv.get<string[]>('rooms:index')) ?? [];
    if (!ids.includes(room.id)) {
      await this.kv.set('rooms:index', [...ids, room.id]);
    }
  }
}

let cached: RoomStore | undefined;

export async function getRoomStore(): Promise<RoomStore> {
  if (cached) return cached;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import('@upstash/redis');
    cached = new KvRoomStore(Redis.fromEnv());
    return cached;
  }

  if (process.env.VERCEL) {
    cached = new MemoryRoomStore();
    return cached;
  }

  cached = new FileRoomStore(resolve(process.cwd(), process.env.ROOMS_DATA_PATH ?? '.data/rooms.json'));
  return cached;
}

export function createMemoryRoomStore(): RoomStore {
  return new MemoryRoomStore();
}
