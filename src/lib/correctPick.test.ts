import { describe, expect, it } from 'vitest';
import { applyPickCorrection, clearPickAssignment } from '@/lib/correctPick';
import { createStore, reduceSession } from '@/lib/session';
import type { PlayerInput } from '@/types';

const miles: PlayerInput = {
  name: 'Miles Irwin',
  position: 'Skater',
  talent: 4,
  vibes: 5,
  notes: '',
  classYear: '2027',
};

const pat: PlayerInput = {
  name: 'Pat Lee',
  position: 'Goalie',
  talent: 5,
  vibes: 4,
  notes: '',
  classYear: '',
};

const cal: PlayerInput = {
  name: 'Cal Pike',
  position: 'Skater',
  talent: 3,
  vibes: 3,
  notes: '',
  classYear: '',
};

function draftThree() {
  let store = createStore();
  store = reduceSession(store, { type: 'addPlayer', input: miles });
  store = reduceSession(store, { type: 'addPlayer', input: pat });
  store = reduceSession(store, { type: 'addPlayer', input: cal });
  const [first, second] = store.session.teams;
  store = reduceSession(store, {
    type: 'recordPick',
    playerId: store.session.players[0].id,
    teamId: first.id,
  });
  store = reduceSession(store, {
    type: 'recordPick',
    playerId: store.session.players[1].id,
    teamId: second.id,
  });
  return store;
}

describe('pick corrections', () => {
  it('replaces a past pick and leaves later assignments on their original slots', () => {
    const store = draftThree();
    const cal = store.session.players.find((player) => player.name === 'Cal Pike');
    if (!cal) throw new Error('expected Cal');

    const players = applyPickCorrection(store.session, 1, cal.id);
    expect(players?.find((player) => player.name === 'Cal Pike')).toMatchObject({
      pickNumber: 1,
      draftedByTeamId: store.session.teams[0].id,
      status: 'drafted',
    });
    expect(players?.find((player) => player.name === 'Miles Irwin')).toMatchObject({
      status: 'available',
      pickNumber: null,
    });
    expect(players?.find((player) => player.name === 'Pat Lee')).toMatchObject({
      pickNumber: 2,
      draftedByTeamId: store.session.teams[1].id,
    });
  });

  it('swaps two already-taken players without moving the rest of the board', () => {
    const store = draftThree();
    const miles = store.session.players.find((player) => player.name === 'Miles Irwin');
    const pat = store.session.players.find((player) => player.name === 'Pat Lee');
    if (!miles || !pat) throw new Error('expected drafted players');

    const players = applyPickCorrection(store.session, 2, miles.id);
    expect(players?.find((player) => player.name === 'Miles Irwin')).toMatchObject({
      pickNumber: 2,
      draftedByTeamId: store.session.teams[1].id,
    });
    expect(players?.find((player) => player.name === 'Pat Lee')).toMatchObject({
      pickNumber: 1,
      draftedByTeamId: store.session.teams[0].id,
    });
  });

  it('clears one pick without renumbering later picks', () => {
    const store = draftThree();
    const players = clearPickAssignment(store.session, 1);
    expect(players?.find((player) => player.name === 'Miles Irwin')?.status).toBe('available');
    expect(players?.find((player) => player.name === 'Pat Lee')).toMatchObject({ pickNumber: 2 });
  });

  it('keeps later picks in place after a reducer correction', () => {
    let store = draftThree();
    const cal = store.session.players.find((player) => player.name === 'Cal Pike');
    if (!cal) throw new Error('expected Cal');

    store = reduceSession(store, { type: 'correctPick', pickNumber: 1, playerId: cal.id });
    expect(store.session.currentPick).toBe(3);
    expect(store.session.players.find((player) => player.name === 'Pat Lee')?.pickNumber).toBe(2);

    store = reduceSession(store, { type: 'clearPick', pickNumber: 1 });
    expect(store.session.currentPick).toBe(1);
    expect(store.session.players.find((player) => player.name === 'Pat Lee')?.pickNumber).toBe(2);
  });
});
