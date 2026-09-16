import type { DraftSession, ParsedPlayer, Player, PlayerInput } from './types';
import { applyPickCorrection, clearPickAssignment } from './correctPick';
import {
  buildTeams,
  draftRounds,
  maxPicks,
  moveTeam,
  nextOpenPick,
  normalizeDraftType,
  ourTeam,
  teamForPick,
  type MoveDirection,
} from './draftOrder';
import { createId } from './playerIds';
import { clampRating, normalizeName } from './ratings';

export type SessionAction =
  | { type: 'hydrate'; session: DraftSession }
  | {
      type: 'configure';
      name?: string;
      teamCount: number;
      ourSlot: number;
      draftType: DraftSession['draftType'];
      teamNames: string[];
      teamIds?: string[];
    }
  | { type: 'renameTeam'; teamId: string; name: string }
  | { type: 'reorderTeam'; teamId: string; direction: MoveDirection }
  | { type: 'importPlayers'; players: ParsedPlayer[]; mode: 'merge' | 'replace' }
  | { type: 'addPlayer'; input: PlayerInput }
  | { type: 'editPlayer'; id: string; input: Partial<PlayerInput> }
  | { type: 'recordPick'; playerId: string; teamId: string }
  | { type: 'skipPick' }
  | { type: 'correctPick'; pickNumber: number; playerId: string }
  | { type: 'clearPick'; pickNumber: number }
  | { type: 'markCaptain'; playerId: string; teamId: string }
  | { type: 'assignOutsideDraft'; playerId: string; teamId: string }
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
    skippedPicks: [],
  };
}


export function createStore(session = createSession()): SessionStore {
  return { session: withDerivedDraft(session), past: [] };
}

function normalizeSkippedPicks(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((pick) => (typeof pick === 'number' ? pick : Number(pick)))
        .filter((pick) => Number.isInteger(pick) && pick > 0),
    ),
  ].sort((a, b) => a - b);
}

function withoutSkippedPick(skippedPicks: number[], pickNumber: number): number[] {
  return skippedPicks.filter((pick) => pick !== pickNumber);
}

function withDerivedDraft(session: DraftSession): DraftSession {
  const draftType = normalizeDraftType(session.draftType);
  const rounds = draftRounds(session.players.length, session.teams.length);
  const skippedPicks = normalizeSkippedPicks(session.skippedPicks);
  return {
    ...session,
    draftType,
    rounds,
    skippedPicks,
    currentPick: nextOpenPick(session.players, maxPicks({ ...session, rounds }), skippedPicks),
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
  if (player.status === 'captain') {
    return {
      ...player,
      pickNumber: null,
      draftedByTeamId: null,
      captainOfTeamId: player.captainOfTeamId,
    };
  }
  return {
    ...player,
    status: 'available',
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: null,
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
      const draftType = normalizeDraftType(action.draftType);
      const teamCount = Math.min(20, Math.max(2, Math.round(action.teamCount)));
      const ourSlot = Math.min(teamCount, Math.max(1, Math.round(action.ourSlot)));
      const countChanged = teamCount !== session.teams.length;
      const previousOurSlot = ourTeam(session)?.slot;
      const slotChanged = previousOurSlot !== ourSlot;
      const orderChanged = draftType !== session.draftType;

      let teams = session.teams;
      if (countChanged) {
        teams = buildTeams(teamCount, ourSlot, action.teamNames);
      } else {
        const sorted = [...session.teams].sort((a, b) => a.slot - b.slot);
        const orderedIds =
          action.teamIds && action.teamIds.length === sorted.length
            ? action.teamIds
            : sorted.map((team) => team.id);
        const byId = new Map(session.teams.map((team) => [team.id, team]));
        teams = orderedIds.map((id, index) => {
          const existing = byId.get(id) ?? sorted[index];
          const slot = index + 1;
          const provided = action.teamNames[index]?.trim();
          return {
            id: existing.id,
            slot,
            isUs: slot === ourSlot,
            name: provided || existing.name || (slot === ourSlot ? 'Our Team' : `Team ${slot}`),
          };
        });
      }

      let players = session.players;
      let skippedPicks = normalizeSkippedPicks(session.skippedPicks);
      if (countChanged || slotChanged) {
        players = session.players.map((player) => ({
          ...resetAssignment(player),
          status: 'available' as const,
          captainOfTeamId: null,
          draftedByTeamId: null,
        }));
        skippedPicks = [];
      } else if (orderChanged) {
        players = session.players.map(resetAssignment);
        skippedPicks = [];
      }
      return snapshot(store, {
        ...session,
        name: action.name?.trim() ? action.name.slice(0, 80) : session.name,
        draftType,
        teams,
        players,
        skippedPicks,
      });
    }
    case 'reorderTeam': {
      const teams = moveTeam(session.teams, action.teamId, action.direction);
      if (teams === session.teams) return store;
      const hasOccupied =
        session.players.some((player) => player.pickNumber != null) ||
        (session.skippedPicks?.length ?? 0) > 0;
      const players = hasOccupied ? session.players.map(resetAssignment) : session.players;
      return snapshot(store, {
        ...session,
        teams,
        players,
        skippedPicks: hasOccupied ? [] : session.skippedPicks ?? [],
      });
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
          skippedPicks: [],
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
    case 'editPlayer': {
      const existing = session.players.find((player) => player.id === action.id);
      if (!existing) return store;
      const nextName = action.input.name !== undefined ? action.input.name.trim() : existing.name;
      if (!nextName) return store;
      return snapshot(store, {
        ...session,
        players: session.players.map((player) =>
          player.id === action.id
            ? toPlayer({ ...player, ...action.input, name: nextName }, player)
            : player,
        ),
      });
    }    case 'recordPick': {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || player.status !== 'available' || !team) return store;
      const skippedPicks = normalizeSkippedPicks(session.skippedPicks);
      const pickNumber = nextOpenPick(session.players, maxPicks(session), skippedPicks);
      if (pickNumber > maxPicks(session)) return store;
      const onClock = teamForPick(session.teams, pickNumber, session.draftType).team;
      if (onClock.id !== team.id) return store;
      return snapshot(store, {
        ...session,
        skippedPicks: withoutSkippedPick(skippedPicks, pickNumber),
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
    case 'skipPick': {
      const skippedPicks = normalizeSkippedPicks(session.skippedPicks);
      const pickNumber = nextOpenPick(session.players, maxPicks(session), skippedPicks);
      if (pickNumber > maxPicks(session)) return store;
      return snapshot(store, {
        ...session,
        skippedPicks: [...skippedPicks, pickNumber].sort((a, b) => a - b),
      });
    }
    case 'correctPick': {
      const skippedPicks = normalizeSkippedPicks(session.skippedPicks);
      const wasSkipped = skippedPicks.includes(action.pickNumber);
      const incoming = session.players.find((player) => player.id === action.playerId);
      const vacatedPick = incoming?.pickNumber ?? null;
      const players = applyPickCorrection(session, action.pickNumber, action.playerId);
      if (!players) return store;
      let nextSkipped = withoutSkippedPick(skippedPicks, action.pickNumber);
      if (
        wasSkipped &&
        vacatedPick != null &&
        vacatedPick !== action.pickNumber &&
        !players.some((player) => player.pickNumber === vacatedPick)
      ) {
        nextSkipped = [...nextSkipped, vacatedPick].sort((a, b) => a - b);
      }
      return snapshot(store, {
        ...session,
        players,
        skippedPicks: nextSkipped,
      });
    }
    case 'clearPick': {
      const skippedPicks = normalizeSkippedPicks(session.skippedPicks);
      const wasSkipped = skippedPicks.includes(action.pickNumber);
      const players = clearPickAssignment(session, action.pickNumber);
      if (!players && !wasSkipped) return store;
      return snapshot(store, {
        ...session,
        players: players ?? session.players,
        skippedPicks: withoutSkippedPick(skippedPicks, action.pickNumber),
      });
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
    case 'assignOutsideDraft': {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || !team) return store;
      if (
        player.status !== 'available' &&
        player.status !== 'assigned' &&
        player.status !== 'drafted' &&
        player.status !== 'my_team' &&
        player.status !== 'captain'
      ) {
        return store;
      }
      const keepPick = player.pickNumber != null;
      return snapshot(store, {
        ...session,
        players: session.players.map((item) =>
          item.id === player.id
            ? {
                ...item,
                status: keepPick ? (team.isUs ? 'my_team' : 'drafted') : 'assigned',
                pickNumber: keepPick ? player.pickNumber : null,
                draftedByTeamId: team.id,
                captainOfTeamId: null,
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
        skippedPicks: [],
      });
    case 'clearPlayers':
      return snapshot(store, { ...session, players: [], skippedPicks: [] });
    default:
      return store;
  }
}

export function playerById(session: DraftSession, id: string | null): Player | undefined {
  if (!id) return undefined;
  return session.players.find((player) => player.id === id);
}
