import type { DraftSession, ParsedPlayer, Player, PlayerInput } from '@/types';
import { createId } from '@/lib/ids';
import { applyPickCorrection, clearPickAssignment } from '@/lib/correctPick';
import {
  buildTeams,
  draftRounds,
  maxPicks,
  moveTeam,
  nextOpenPick,
  normalizeDraftType,
  ourTeam,
  type MoveDirection,
} from '@/lib/draftOrder';
import { clampRating, normalizeName } from '@/lib/ratings';
import { SEED_PLAYERS } from '@/lib/seedPlayers';

export type SessionAction =
  | { type: 'hydrate'; session: DraftSession }
  | {
      type: 'configure';
      name?: string;
      teamCount: number;
      ourSlot: number;
      draftType: DraftSession['draftType'];
      teamNames: string[];
    }
  | { type: 'renameTeam'; teamId: string; name: string }
  | { type: 'reorderTeam'; teamId: string; direction: MoveDirection }
  | { type: 'importPlayers'; players: ParsedPlayer[]; mode: 'merge' | 'replace' }
  | { type: 'addPlayer'; input: PlayerInput }
  | { type: 'editPlayer'; id: string; input: Partial<PlayerInput> }
  | { type: 'recordPick'; playerId: string; teamId: string }
  | { type: 'correctPick'; pickNumber: number; playerId: string }
  | { type: 'clearPick'; pickNumber: number }
  | { type: 'markCaptain'; playerId: string; teamId: string }
  | { type: 'restorePlayer'; playerId: string }
  | { type: 'resetPicks' }
  | { type: 'clearPlayers' }
  | { type: 'undo' };

export type SessionStore = {
  session: DraftSession;
  past: DraftSession[];
};

const UNDO_LIMIT = 30;

export function createSession(): DraftSession {
  const teams = buildTeams(8, 3);
  return {
    name: 'Tripod Hockey Draft',
    draftType: 'snake',
    rounds: draftRounds(0, teams.length),
    currentPick: 1,
    teams,
    players: [],
  };
}

export function createSeededSession(): DraftSession {
  return {
    ...createSession(),
    players: SEED_PLAYERS.map((player) => ({ ...player })),
  };
}

export function createStore(session = createSession()): SessionStore {
  return { session: withDerivedDraft(session), past: [] };
}

function withDerivedDraft(session: DraftSession): DraftSession {
  const draftType = normalizeDraftType(session.draftType);
  const rounds = draftRounds(session.players.length, session.teams.length);
  return {
    ...session,
    draftType,
    rounds,
    currentPick: nextOpenPick(session.players, maxPicks({ ...session, rounds })),
  };
}

function snapshot(store: SessionStore, next: DraftSession): SessionStore {
  return {
    session: withDerivedDraft(next),
    past: [...store.past, store.session].slice(-UNDO_LIMIT),
  };
}

function toPlayer(input: PlayerInput, existing?: Player): Player {
  return {
    id: existing?.id ?? createId(),
    name: input.name.trim(),
    position: input.position,
    talent: clampRating(input.talent),
    vibes: clampRating(input.vibes),
    notes: input.notes.trim(),
    classYear: input.classYear.trim(),
    status: existing?.status ?? 'available',
    pickNumber: existing?.pickNumber ?? null,
    draftedByTeamId: existing?.draftedByTeamId ?? null,
    captainOfTeamId: existing?.captainOfTeamId ?? null,
  };
}

function availablePlayer(input: ParsedPlayer): Player {
  return toPlayer(input);
}

function resetAssignment(player: Player): Player {
  return {
    ...player,
    status: player.status === 'captain' ? 'captain' : 'available',
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: player.status === 'captain' ? player.captainOfTeamId : null,
  };
}

export function reduceSession(store: SessionStore, action: SessionAction): SessionStore {
  const { session } = store;

  switch (action.type) {
    case 'hydrate':
      return createStore(action.session);
    case 'undo': {
      const previous = store.past.at(-1);
      if (!previous) return store;
      return { session: previous, past: store.past.slice(0, -1) };
    }
    case 'configure': {
      const teams = buildTeams(action.teamCount, action.ourSlot, action.teamNames);
      const draftType = normalizeDraftType(action.draftType);
      const teamCountChanged = teams.length !== session.teams.length;
      const slotChanged = teams.find((team) => team.isUs)?.slot !== ourTeam(session)?.slot;
      const orderChanged = draftType !== session.draftType;
      let players = session.players;
      if (teamCountChanged || slotChanged) {
        players = session.players.map((player) => ({
          ...resetAssignment(player),
          status: 'available' as const,
          captainOfTeamId: null,
        }));
      } else if (orderChanged) {
        players = session.players.map(resetAssignment);
      }
      return snapshot(store, {
        ...session,
        name: action.name?.trim() ? action.name.slice(0, 80) : session.name,
        draftType,
        teams,
        players,
      });
    }
    case 'reorderTeam': {
      const teams = moveTeam(session.teams, action.teamId, action.direction);
      if (teams === session.teams) return store;
      const players = session.players.some((player) => player.pickNumber != null)
        ? session.players.map(resetAssignment)
        : session.players;
      return snapshot(store, { ...session, teams, players });
    }
    case 'renameTeam':
      return snapshot(store, {
        ...session,
        teams: session.teams.map((team) =>
          team.id === action.teamId ? { ...team, name: action.name.slice(0, 40) } : team,
        ),
      });
    case 'importPlayers': {
      if (action.mode === 'replace') {
        return snapshot(store, {
          ...session,
          players: action.players.map(availablePlayer),
        });
      }

      const existingByName = new Map(
        session.players.map((player) => [normalizeName(player.name), player]),
      );
      const nextPlayers = [...session.players];

      for (const incoming of action.players) {
        const key = normalizeName(incoming.name);
        const existing = existingByName.get(key);
        if (existing) {
          const index = nextPlayers.findIndex((player) => player.id === existing.id);
          nextPlayers[index] = toPlayer(incoming, existing);
          continue;
        }
        const player = availablePlayer(incoming);
        nextPlayers.push(player);
        existingByName.set(key, player);
      }

      return snapshot(store, { ...session, players: nextPlayers });
    }
    case 'addPlayer': {
      const name = action.input.name.trim();
      if (!name) return store;
      const duplicate = session.players.some(
        (player) => normalizeName(player.name) === normalizeName(name),
      );
      if (duplicate) return store;
      return snapshot(store, {
        ...session,
        players: [...session.players, toPlayer(action.input)],
      });
    }
    case 'editPlayer':
      return snapshot(store, {
        ...session,
        players: session.players.map((player) =>
          player.id === action.id ? toPlayer({ ...player, ...action.input, name: action.input.name ?? player.name }, player) : player,
        ),
      });
    case 'recordPick': {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || player.status !== 'available' || !team) return store;
      const pickNumber = nextOpenPick(session.players, maxPicks(session));
      return snapshot(store, {
        ...session,
        players: session.players.map((item) =>
          item.id === player.id
            ? {
                ...item,
                status: team.isUs ? 'my_team' : 'drafted',
                pickNumber,
                draftedByTeamId: team.id,
                captainOfTeamId: null,
              }
            : item,
        ),
      });
    }
    case 'correctPick': {
      const players = applyPickCorrection(session, action.pickNumber, action.playerId);
      if (!players) return store;
      return snapshot(store, { ...session, players });
    }
    case 'clearPick': {
      const players = clearPickAssignment(session, action.pickNumber);
      if (!players) return store;
      return snapshot(store, { ...session, players });
    }
    case 'markCaptain': {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || player.status !== 'available' || !team || team.isUs) return store;
      return snapshot(store, {
        ...session,
        players: session.players.map((item) =>
          item.id === player.id
            ? {
                ...item,
                status: 'captain',
                pickNumber: null,
                draftedByTeamId: null,
                captainOfTeamId: team.id,
              }
            : item,
        ),
      });
    }
    case 'restorePlayer':
      return snapshot(store, {
        ...session,
        players: session.players.map((player) =>
          player.id === action.playerId
            ? {
                ...player,
                status: 'available',
                pickNumber: null,
                draftedByTeamId: null,
                captainOfTeamId: null,
              }
            : player,
        ),
      });
    case 'resetPicks':
      return snapshot(store, {
        ...session,
        players: session.players.map(resetAssignment),
      });
    case 'clearPlayers':
      return snapshot(store, { ...session, players: [] });
    default:
      return store;
  }
}

export function playerById(session: DraftSession, id: string | null): Player | undefined {
  if (!id) return undefined;
  return session.players.find((player) => player.id === id);
}
