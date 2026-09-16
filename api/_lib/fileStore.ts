import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RoomRecord, RoomStore } from './store';

export class FileRoomStore implements RoomStore {
  readonly kind = 'file' as const;
  private readonly filePath: string;
  private queue: Promise<void> = Promise.resolve();

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

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async list() {
    return this.enqueue(async () =>
      Object.values(await this.readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  async get(id: string) {
    return this.enqueue(async () => {
      const rooms = await this.readAll();
      return rooms[id] ?? null;
    });
  }

  async save(room: RoomRecord) {
    await this.enqueue(async () => {
      const rooms = await this.readAll();
      rooms[room.id] = room;
      await this.writeAll(rooms);
    });
  }
}
