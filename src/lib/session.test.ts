import { describe, expect, it } from 'vitest';
import { createSeededSession, createStore, reduceSession } from '@/lib/session';
import type { PlayerInput } from '@/types';

const pat: PlayerInput = {
  name: 'Pat Lee',
  position: 'Goalie',
  talent: 5,
  vibes: 4,
  notes: 'Calm in net',
  classYear: '',
};

const miles: PlayerInput = {
  name: 'Miles Irwin',
  position: 'Skater',
  talent: 4,
  vibes: 5,
  notes: 'Hilarious on the bench',
  classYear: '2027',
};

describe('draft session', () => {
  it('adds a last-minute player and records them to our team when we are on the clock', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });

    const onClock = store.session.teams[0];
    const milesPlayer = store.session.players.find((player) => player.name === 'Miles Irwin');
    if (!milesPlayer) throw new Error('expected Miles');

    store = reduceSession(store, { type: 'recordPick', playerId: milesPlayer.id, teamId: onClock.id });
    expect(store.session.players[0]).toMatchObject({
      status: 'drafted',
      pickNumber: 1,
      draftedByTeamId: onClock.id,
    });

    const nextTeam = store.session.teams.find((team) => team.slot === 2);
    const patPlayer = store.session.players.find((player) => player.name === 'Pat Lee');
    if (!nextTeam || !patPlayer) throw new Error('expected next team and Pat');

    store = reduceSession(store, { type: 'recordPick', playerId: patPlayer.id, teamId: nextTeam.id });
    expect(store.session.players.find((player) => player.name === 'Pat Lee')).toMatchObject({
      status: 'drafted',
      pickNumber: 2,
      draftedByTeamId: nextTeam.id,
    });
    expect(store.session.currentPick).toBe(3);
  });

  it('marks another team captain without consuming a draft pick', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const otherTeam = store.session.teams.find((team) => !team.isUs);
    const player = store.session.players[0];
    if (!otherTeam) throw new Error('expected another team');

    store = reduceSession(store, { type: 'markCaptain', playerId: player.id, teamId: otherTeam.id });

    expect(store.session.players[0]).toMatchObject({
      status: 'captain',
      pickNumber: null,
      captainOfTeamId: otherTeam.id,
    });
    expect(store.session.currentPick).toBe(1);
  });

  it('moves an assigned player to another team without consuming a pick', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const [first, second] = store.session.teams;
    store = reduceSession(store, {
      type: 'assignOutsideDraft',
      playerId: store.session.players[0].id,
      teamId: first.id,
    });
    store = reduceSession(store, {
      type: 'assignOutsideDraft',
      playerId: store.session.players[0].id,
      teamId: second.id,
    });
    expect(store.session.players[0]).toMatchObject({
      status: 'assigned',
      pickNumber: null,
      draftedByTeamId: second.id,
    });
    expect(store.session.currentPick).toBe(1);
  });

  it('keeps the pick number when moving a drafted player to another team', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });
    const [first, second] = store.session.teams;
    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: first.id,
    });
    store = reduceSession(store, {
      type: 'assignOutsideDraft',
      playerId: store.session.players[0].id,
      teamId: second.id,
    });
    expect(store.session.players[0]).toMatchObject({
      status: 'drafted',
      pickNumber: 1,
      draftedByTeamId: second.id,
    });
    expect(store.session.currentPick).toBe(2);
  });

  it('does not record picks past the end of the board', () => {
    let store = createStore();
    store = reduceSession(store, {
      type: 'configure',
      teamCount: 2,
      ourSlot: 1,
      draftType: 'snake',
      teamNames: ['Us', 'Them'],
    });
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });
    store = reduceSession(store, { type: 'skipPick' });
    store = reduceSession(store, { type: 'skipPick' });
    expect(store.session.currentPick).toBe(3);
    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[0].id,
    });
    expect(store.session.players[0].status).toBe('available');
    expect(store.session.currentPick).toBe(3);
  });

  it('assigns a player to any team without consuming a draft pick', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });
    const ourTeam = store.session.teams.find((team) => team.isUs);
    const otherTeam = store.session.teams.find((team) => !team.isUs);
    if (!ourTeam || !otherTeam) throw new Error('expected teams');

    store = reduceSession(store, {
      type: 'assignOutsideDraft',
      playerId: store.session.players[0].id,
      teamId: ourTeam.id,
    });
    expect(store.session.players[0]).toMatchObject({
      status: 'assigned',
      pickNumber: null,
      draftedByTeamId: ourTeam.id,
    });
    expect(store.session.currentPick).toBe(1);

    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[1].id,
      teamId: otherTeam.id,
    });
    expect(store.session.players[1]).toMatchObject({
      status: 'drafted',
      pickNumber: 1,
    });
    expect(store.session.currentPick).toBe(2);

    store = reduceSession(store, { type: 'resetPicks' });
    expect(store.session.players[0].status).toBe('available');
    expect(store.session.players[0].draftedByTeamId).toBeNull();
    expect(store.session.players[1].status).toBe('available');
    expect(store.session.currentPick).toBe(1);
  });

  it('skips the team on the clock without assigning a player', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const firstTeam = store.session.teams[0];

    store = reduceSession(store, { type: 'skipPick' });
    expect(store.session.skippedPicks).toEqual([1]);
    expect(store.session.currentPick).toBe(2);

    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[1].id,
    });
    expect(store.session.players[0]).toMatchObject({
      pickNumber: 2,
      draftedByTeamId: store.session.teams[1].id,
    });
    expect(store.session.currentPick).toBe(3);
    expect(store.session.skippedPicks).toEqual([1]);

    store = reduceSession(store, { type: 'clearPick', pickNumber: 1 });
    expect(store.session.skippedPicks).toEqual([]);
    expect(store.session.currentPick).toBe(1);
    expect(firstTeam.id).toBe(store.session.teams[0].id);
  });

  it('keeps the clock from snapping back when a drafted player fills a skip', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    store = reduceSession(store, { type: 'addPlayer', input: pat });
    store = reduceSession(store, { type: 'skipPick' });
    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[1].id,
    });
    expect(store.session).toMatchObject({
      currentPick: 3,
      skippedPicks: [1],
    });

    store = reduceSession(store, {
      type: 'correctPick',
      pickNumber: 1,
      playerId: store.session.players[0].id,
    });
    expect(store.session.players[0].pickNumber).toBe(1);
    expect(store.session.skippedPicks).toEqual([2]);
    expect(store.session.currentPick).toBe(3);
  });

  it('merges imported ratings without wiping players already off the board', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const otherTeam = store.session.teams.find((team) => !team.isUs);
    if (!otherTeam) throw new Error('expected another team');
    store = reduceSession(store, {
      type: 'markCaptain',
      playerId: store.session.players[0].id,
      teamId: otherTeam.id,
    });

    store = reduceSession(store, {
      type: 'importPlayers',
      mode: 'merge',
      players: [{ ...miles, talent: 5, notes: 'Updated scouting' }, pat],
    });

    expect(store.session.players).toHaveLength(2);
    expect(store.session.players[0]).toMatchObject({
      name: 'Miles Irwin',
      talent: 5,
      notes: 'Updated scouting',
      status: 'captain',
    });
    expect(store.session.players[1].name).toBe('Pat Lee');
  });

  it('assigns every recorded pick to the next open snake slot', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const onClock = store.session.teams[0];

    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: onClock.id,
    });

    expect(store.session.players[0]).toMatchObject({
      status: 'drafted',
      pickNumber: 1,
      draftedByTeamId: onClock.id,
    });
    expect(store.session.currentPick).toBe(2);
  });

  it('updates rounds from the uploaded pool and can switch to a linear draft', () => {
    let store = createStore(createSeededSession());
    expect(store.session.rounds).toBe(13);
    expect(store.session.draftType).toBe('snake');

    store = reduceSession(store, {
      type: 'configure',
      teamCount: 10,
      ourSlot: 3,
      draftType: 'linear',
      teamNames: [],
    });

    expect(store.session.draftType).toBe('linear');
    expect(store.session.rounds).toBe(10);
    expect(store.session.players.every((player) => player.status === 'available')).toBe(true);

    store = reduceSession(store, { type: 'addPlayer', input: pat });
    expect(store.session.rounds).toBe(11);
  });

  it('reorders teams and clears picks so the new snake order is clean', () => {
    let store = createStore(createSeededSession());
    const ours = store.session.teams.find((team) => team.isUs);
    if (!ours) throw new Error('expected our team');

    store = reduceSession(store, { type: 'reorderTeam', teamId: ours.id, direction: 'up' });
    expect(store.session.teams.find((team) => team.isUs)?.slot).toBe(2);

    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: store.session.teams[0].id,
    });
    expect(store.session.players.some((player) => player.pickNumber != null)).toBe(true);

    store = reduceSession(store, { type: 'reorderTeam', teamId: ours.id, direction: 'up' });
    expect(store.session.teams.find((team) => team.isUs)?.slot).toBe(1);
    expect(store.session.players.every((player) => player.pickNumber == null)).toBe(true);
  });

  it('restores a marked player back to the available list', () => {
    let store = createStore();
    store = reduceSession(store, { type: 'addPlayer', input: miles });
    const team = store.session.teams[0];
    store = reduceSession(store, {
      type: 'recordPick',
      playerId: store.session.players[0].id,
      teamId: team.id,
    });
    store = reduceSession(store, { type: 'restorePlayer', playerId: store.session.players[0].id });
    expect(store.session.players[0].status).toBe('available');
    expect(store.session.currentPick).toBe(1);
  });
});
