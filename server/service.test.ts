import { describe, expect, it } from 'vitest';
import { createRoomService } from './service';
import { createMemoryRoomStore } from './store';

describe('room service', () => {
  it('lists rooms without passwords, rosters, or comments', async () => {
    const service = createRoomService(createMemoryRoomStore());
    const created = await service.create('Tripod 2026', 'puck');
    await service.apply(created.id, created.token, {
      type: 'addPlayer',
      input: {
        name: 'Miles Irwin',
        position: 'Skater',
        talent: 4.5,
        vibes: 5,
        notes: 'Keep this private',
        classYear: '2027',
      },
    });

    const listed = await service.list();
    expect(listed).toEqual([
      expect.objectContaining({
        id: created.id,
        name: 'Tripod 2026',
        playerCount: 1,
        pickCount: 0,
      }),
    ]);
    expect(JSON.stringify(listed)).not.toContain('Keep this private');
    expect(JSON.stringify(listed)).not.toContain('Miles Irwin');
    expect(JSON.stringify(listed)).not.toContain('password');
  });

  it('keeps two rooms isolated and lets the latest ranking and note win', async () => {
    const service = createRoomService(createMemoryRoomStore());
    const tripod = await service.create('Tripod', 'alpha');
    const other = await service.create('Alumni', 'bravo');

    await service.apply(tripod.id, tripod.token, {
      type: 'addPlayer',
      input: {
        name: 'Miles Irwin',
        position: 'Skater',
        talent: 4,
        vibes: 4,
        notes: 'First note',
        classYear: '2027',
      },
    });

    const playerId = (await service.read(tripod.id, tripod.token)).session.players[0]?.id;
    if (!playerId) throw new Error('missing player');

    await service.apply(tripod.id, tripod.token, {
      type: 'editPlayer',
      id: playerId,
      input: { notes: 'Latest note', talent: 5 },
    });

    const latest = await service.read(tripod.id, tripod.token);
    expect(latest.session.players[0]).toMatchObject({ notes: 'Latest note', talent: 5, vibes: 4 });

    await expect(service.read(other.id, tripod.token)).rejects.toThrow('Enter the room password again.');
    expect((await service.read(other.id, other.token)).session.players).toEqual([]);
  });

  it('rejects a wrong password and a second pick of the same player', async () => {
    const service = createRoomService(createMemoryRoomStore());
    const room = await service.create('Tripod', 'puck');
    await expect(service.join(room.id, 'wrong')).rejects.toThrow('That password does not match this room.');

    await service.apply(room.id, room.token, {
      type: 'addPlayer',
      input: {
        name: 'James Whitby',
        position: 'Skater',
        talent: 3,
        vibes: 3,
        notes: '',
        classYear: '2028',
      },
    });
    const playerId = (await service.read(room.id, room.token)).session.players[0]?.id;
    if (!playerId) throw new Error('missing player');
    const teamId = room.session.teams[0]?.id;
    if (!teamId) throw new Error('missing team');

    await service.apply(room.id, room.token, { type: 'recordPick', playerId, teamId });
    const second = await service.apply(room.id, room.token, { type: 'recordPick', playerId, teamId });
    expect(second.session.players.filter((player) => player.pickNumber != null)).toHaveLength(1);
  });
});
