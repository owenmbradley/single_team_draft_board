var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/_lib/fileStore.ts
var fileStore_exports = {};
__export(fileStore_exports, {
  FileRoomStore: () => FileRoomStore
});
var import_promises, import_node_path, FileRoomStore;
var init_fileStore = __esm({
  "api/_lib/fileStore.ts"() {
    import_promises = require("node:fs/promises");
    import_node_path = require("node:path");
    FileRoomStore = class {
      filePath;
      constructor(filePath) {
        this.filePath = filePath;
      }
      async readAll() {
        try {
          const raw = await (0, import_promises.readFile)(this.filePath, "utf8");
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          return {};
        }
      }
      async writeAll(rooms) {
        await (0, import_promises.mkdir)((0, import_node_path.dirname)(this.filePath), { recursive: true });
        await (0, import_promises.writeFile)(this.filePath, JSON.stringify(rooms), "utf8");
      }
      async list() {
        return Object.values(await this.readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
      async get(id) {
        const rooms = await this.readAll();
        return rooms[id] ?? null;
      }
      async save(room) {
        const rooms = await this.readAll();
        rooms[room.id] = room;
        await this.writeAll(rooms);
      }
    };
  }
});

// server/roomsEntry.ts
var roomsEntry_exports = {};
__export(roomsEntry_exports, {
  default: () => handler
});
module.exports = __toCommonJS(roomsEntry_exports);

// api/_lib/ids.ts
var import_node_crypto = require("node:crypto");
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function createRoomId() {
  const bytes = (0, import_node_crypto.randomBytes)(6);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
function normalizeRoomId(id) {
  return id.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// api/_lib/password.ts
var import_node_crypto2 = require("node:crypto");
function hashPassword(password) {
  const salt = (0, import_node_crypto2.randomBytes)(16).toString("hex");
  const hash = (0, import_node_crypto2.scryptSync)(password, salt, 64).toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const next = (0, import_node_crypto2.scryptSync)(password, salt, 64);
  const previous = Buffer.from(hash, "hex");
  return next.length === previous.length && (0, import_node_crypto2.timingSafeEqual)(next, previous);
}

// api/_lib/store.ts
function toPublicRoom(room) {
  return {
    id: room.id,
    name: room.name,
    playerCount: room.store.session.players.length,
    pickCount: room.store.session.players.filter((player) => player.pickNumber != null).length,
    updatedAt: room.updatedAt
  };
}
var MemoryRoomStore = class {
  rooms = /* @__PURE__ */ new Map();
  async list() {
    return [...this.rooms.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id) {
    return this.rooms.get(id) ?? null;
  }
  async save(room) {
    this.rooms.set(room.id, room);
  }
};
var KvRoomStore = class {
  kv;
  constructor(kv) {
    this.kv = kv;
  }
  async list() {
    const ids = await this.kv.get("rooms:index") ?? [];
    const rooms = [];
    for (const id of ids) {
      const room = await this.get(id);
      if (room) rooms.push(room);
    }
    return rooms.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id) {
    return await this.kv.get(`room:${id}`) ?? null;
  }
  async save(room) {
    await this.kv.set(`room:${room.id}`, room);
    const ids = await this.kv.get("rooms:index") ?? [];
    if (!ids.includes(room.id)) {
      await this.kv.set("rooms:index", [...ids, room.id]);
    }
  }
};
var cached;
async function getRoomStore() {
  if (cached) return cached;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis");
      cached = new KvRoomStore(Redis.fromEnv());
      return cached;
    } catch (caught) {
      console.error("Redis unavailable, using memory store.", caught);
    }
  }
  if (process.env.VERCEL) {
    cached = new MemoryRoomStore();
    return cached;
  }
  const { FileRoomStore: FileRoomStore2 } = await Promise.resolve().then(() => (init_fileStore(), fileStore_exports));
  const { resolve } = await import("node:path");
  cached = new FileRoomStore2(resolve(process.cwd(), process.env.ROOMS_DATA_PATH ?? ".data/rooms.json"));
  return cached;
}

// api/_lib/token.ts
var import_node_crypto3 = require("node:crypto");
var DAY_MS = 1e3 * 60 * 60 * 24 * 14;
function secret() {
  return process.env.ROOM_TOKEN_SECRET?.trim() || "dev-only-room-token";
}
function sign(value) {
  return (0, import_node_crypto3.createHmac)("sha256", secret()).update(value).digest("base64url");
}
function issueRoomToken(roomId) {
  const payload = Buffer.from(JSON.stringify({ roomId, exp: Date.now() + DAY_MS }), "utf8").toString(
    "base64url"
  );
  return `${payload}.${sign(payload)}`;
}
function readRoomToken(token) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !(0, import_node_crypto3.timingSafeEqual)(given, want)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.roomId || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { roomId: parsed.roomId };
  } catch {
    return null;
  }
}

// api/_lib/draftOrder.ts
function draftRounds(playerCount, teamCount) {
  const teams = Math.max(1, Math.round(teamCount));
  const players = Math.max(0, Math.round(playerCount));
  if (players === 0) return 1;
  return Math.max(1, Math.ceil(players / teams));
}
function normalizeDraftType(value) {
  return value === "linear" ? "linear" : "snake";
}
function moveTeam(teams, teamId, direction) {
  const sorted = [...teams].sort((a, b) => a.slot - b.slot);
  const index = sorted.findIndex((team) => team.id === teamId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return teams;
  const current = sorted[index];
  const neighbor = sorted[target];
  return teams.map((team) => {
    if (team.id === current.id) return { ...team, slot: neighbor.slot };
    if (team.id === neighbor.id) return { ...team, slot: current.slot };
    return team;
  }).sort((a, b) => a.slot - b.slot);
}
function buildTeams(count, ourSlot, names = []) {
  const teamCount = Math.min(20, Math.max(2, Math.round(count)));
  const slot = Math.min(teamCount, Math.max(1, Math.round(ourSlot)));
  return Array.from({ length: teamCount }, (_, index) => {
    const teamSlot = index + 1;
    const isUs = teamSlot === slot;
    const provided = names[index]?.trim();
    return {
      id: `team-${teamSlot}`,
      slot: teamSlot,
      isUs,
      name: provided || (isUs ? "Our Team" : `Team ${teamSlot}`)
    };
  });
}
function maxPicks(session) {
  return session.teams.length * Math.max(1, session.rounds);
}
function teamForPick(teams, pick, draftType = "snake") {
  const sorted = [...teams].sort((a, b) => a.slot - b.slot);
  if (sorted.length === 0) {
    throw new Error("A draft needs at least one team.");
  }
  const index = Math.max(0, pick - 1);
  const roundIndex = Math.floor(index / sorted.length);
  const slotInRound = index % sorted.length;
  const snakes = draftType === "snake" && roundIndex % 2 === 1;
  const teamIndex = snakes ? sorted.length - slotInRound - 1 : slotInRound;
  return {
    team: sorted[teamIndex],
    round: roundIndex + 1
  };
}
function usedPickNumbers(players) {
  return new Set(
    players.map((player) => player.pickNumber).filter((pick) => pick != null)
  );
}
function nextOpenPick(players, totalPicks) {
  const used = usedPickNumbers(players);
  const limit = Math.max(1, totalPicks);
  for (let pick = 1; pick <= limit; pick += 1) {
    if (!used.has(pick)) return pick;
  }
  return limit + 1;
}
function ourTeam(session) {
  return session.teams.find((team) => team.isUs);
}

// api/_lib/correctPick.ts
function playerOnPick(players, pickNumber) {
  return players.find((player) => player.pickNumber === pickNumber);
}
function applyPickCorrection(session, pickNumber, playerId) {
  if (pickNumber < 1 || pickNumber > maxPicks(session)) return null;
  const incoming = session.players.find((player) => player.id === playerId);
  if (!incoming || incoming.pickNumber === pickNumber) return null;
  const { team } = teamForPick(session.teams, pickNumber, session.draftType);
  const current = playerOnPick(session.players, pickNumber);
  const swapPick = incoming.pickNumber;
  const swapTeam = swapPick != null ? session.teams.find((item) => item.id === incoming.draftedByTeamId) ?? teamForPick(session.teams, swapPick, session.draftType).team : null;
  return session.players.map((player) => {
    if (player.id === incoming.id) return assignToPick(player, pickNumber, team);
    if (current && player.id === current.id) {
      return swapPick != null && swapTeam ? assignToPick(player, swapPick, swapTeam) : releaseFromPick(player);
    }
    return player;
  });
}
function clearPickAssignment(session, pickNumber) {
  const current = playerOnPick(session.players, pickNumber);
  if (!current) return null;
  return session.players.map((player) => player.id === current.id ? releaseFromPick(player) : player);
}
function assignToPick(player, pickNumber, team) {
  return {
    ...player,
    status: team.isUs ? "my_team" : "drafted",
    pickNumber,
    draftedByTeamId: team.id,
    captainOfTeamId: null
  };
}
function releaseFromPick(player) {
  return {
    ...player,
    status: "available",
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: null
  };
}

// api/_lib/playerIds.ts
function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// api/_lib/ratings.ts
var MIN_RATING = 1;
var MAX_RATING = 5;
var DEFAULT_RATING = 3;
var MAX_TOTAL = MAX_RATING * 2;
var RATING_PRECISION = 10;
function clampRating(value) {
  if (!Number.isFinite(value)) return DEFAULT_RATING;
  const rounded = Math.round(value * RATING_PRECISION) / RATING_PRECISION;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rounded));
}
function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// api/_lib/session.ts
var UNDO_LIMIT = 30;
function createSession() {
  const teams = buildTeams(8, 3);
  return {
    name: "Tripod Hockey Draft",
    draftType: "snake",
    rounds: draftRounds(0, teams.length),
    currentPick: 1,
    teams,
    players: []
  };
}
function createStore(session = createSession()) {
  return { session: withDerivedDraft(session), past: [] };
}
function withDerivedDraft(session) {
  const draftType = normalizeDraftType(session.draftType);
  const rounds = draftRounds(session.players.length, session.teams.length);
  return {
    ...session,
    draftType,
    rounds,
    currentPick: nextOpenPick(session.players, maxPicks({ ...session, rounds }))
  };
}
function snapshot(store, next) {
  return {
    session: withDerivedDraft(next),
    past: [...store.past, store.session].slice(-UNDO_LIMIT)
  };
}
function toPlayer(input, existing) {
  return {
    id: existing?.id ?? createId(),
    name: input.name.trim(),
    position: input.position,
    talent: clampRating(input.talent),
    vibes: clampRating(input.vibes),
    notes: input.notes.trim(),
    classYear: input.classYear.trim(),
    status: existing?.status ?? "available",
    pickNumber: existing?.pickNumber ?? null,
    draftedByTeamId: existing?.draftedByTeamId ?? null,
    captainOfTeamId: existing?.captainOfTeamId ?? null
  };
}
function availablePlayer(input) {
  return toPlayer(input);
}
function resetAssignment(player) {
  return {
    ...player,
    status: player.status === "captain" ? "captain" : "available",
    pickNumber: null,
    draftedByTeamId: null,
    captainOfTeamId: player.status === "captain" ? player.captainOfTeamId : null
  };
}
function reduceSession(store, action) {
  const { session } = store;
  switch (action.type) {
    case "hydrate":
      return createStore(action.session);
    case "undo": {
      const previous = store.past.at(-1);
      if (!previous) return store;
      return { session: previous, past: store.past.slice(0, -1) };
    }
    case "configure": {
      const teams = buildTeams(action.teamCount, action.ourSlot, action.teamNames);
      const draftType = normalizeDraftType(action.draftType);
      const teamCountChanged = teams.length !== session.teams.length;
      const slotChanged = teams.find((team) => team.isUs)?.slot !== ourTeam(session)?.slot;
      const orderChanged = draftType !== session.draftType;
      let players = session.players;
      if (teamCountChanged || slotChanged) {
        players = session.players.map((player) => ({
          ...resetAssignment(player),
          status: "available",
          captainOfTeamId: null
        }));
      } else if (orderChanged) {
        players = session.players.map(resetAssignment);
      }
      return snapshot(store, {
        ...session,
        name: action.name?.trim() ? action.name.slice(0, 80) : session.name,
        draftType,
        teams,
        players
      });
    }
    case "reorderTeam": {
      const teams = moveTeam(session.teams, action.teamId, action.direction);
      if (teams === session.teams) return store;
      const players = session.players.some((player) => player.pickNumber != null) ? session.players.map(resetAssignment) : session.players;
      return snapshot(store, { ...session, teams, players });
    }
    case "renameTeam":
      return snapshot(store, {
        ...session,
        teams: session.teams.map(
          (team) => team.id === action.teamId ? { ...team, name: action.name.slice(0, 40) } : team
        )
      });
    case "importPlayers": {
      if (action.mode === "replace") {
        return snapshot(store, {
          ...session,
          players: action.players.map(availablePlayer)
        });
      }
      const existingByName = new Map(
        session.players.map((player) => [normalizeName(player.name), player])
      );
      const nextPlayers = [...session.players];
      for (const incoming of action.players) {
        const key = normalizeName(incoming.name);
        const existing = existingByName.get(key);
        if (existing) {
          const index = nextPlayers.findIndex((player2) => player2.id === existing.id);
          nextPlayers[index] = toPlayer(incoming, existing);
          continue;
        }
        const player = availablePlayer(incoming);
        nextPlayers.push(player);
        existingByName.set(key, player);
      }
      return snapshot(store, { ...session, players: nextPlayers });
    }
    case "addPlayer": {
      const name = action.input.name.trim();
      if (!name) return store;
      const duplicate = session.players.some(
        (player) => normalizeName(player.name) === normalizeName(name)
      );
      if (duplicate) return store;
      return snapshot(store, {
        ...session,
        players: [...session.players, toPlayer(action.input)]
      });
    }
    case "editPlayer":
      return snapshot(store, {
        ...session,
        players: session.players.map(
          (player) => player.id === action.id ? toPlayer({ ...player, ...action.input, name: action.input.name ?? player.name }, player) : player
        )
      });
    case "recordPick": {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || player.status !== "available" || !team) return store;
      const pickNumber = nextOpenPick(session.players, maxPicks(session));
      return snapshot(store, {
        ...session,
        players: session.players.map(
          (item) => item.id === player.id ? {
            ...item,
            status: team.isUs ? "my_team" : "drafted",
            pickNumber,
            draftedByTeamId: team.id,
            captainOfTeamId: null
          } : item
        )
      });
    }
    case "correctPick": {
      const players = applyPickCorrection(session, action.pickNumber, action.playerId);
      if (!players) return store;
      return snapshot(store, { ...session, players });
    }
    case "clearPick": {
      const players = clearPickAssignment(session, action.pickNumber);
      if (!players) return store;
      return snapshot(store, { ...session, players });
    }
    case "markCaptain": {
      const player = session.players.find((item) => item.id === action.playerId);
      const team = session.teams.find((item) => item.id === action.teamId);
      if (!player || player.status !== "available" || !team || team.isUs) return store;
      return snapshot(store, {
        ...session,
        players: session.players.map(
          (item) => item.id === player.id ? {
            ...item,
            status: "captain",
            pickNumber: null,
            draftedByTeamId: null,
            captainOfTeamId: team.id
          } : item
        )
      });
    }
    case "restorePlayer":
      return snapshot(store, {
        ...session,
        players: session.players.map(
          (player) => player.id === action.playerId ? {
            ...player,
            status: "available",
            pickNumber: null,
            draftedByTeamId: null,
            captainOfTeamId: null
          } : player
        )
      });
    case "resetPicks":
      return snapshot(store, {
        ...session,
        players: session.players.map(resetAssignment)
      });
    case "clearPlayers":
      return snapshot(store, { ...session, players: [] });
    default:
      return store;
  }
}

// api/_lib/service.ts
var ALLOWED_ACTIONS = /* @__PURE__ */ new Set([
  "configure",
  "renameTeam",
  "reorderTeam",
  "importPlayers",
  "addPlayer",
  "editPlayer",
  "recordPick",
  "correctPick",
  "clearPick",
  "markCaptain",
  "restorePlayer",
  "resetPicks",
  "clearPlayers",
  "undo"
]);
var RoomError = class extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
function createRoomService(store) {
  async function requireRoom(id) {
    const room = await store.get(normalizeRoomId(id));
    if (!room) throw new RoomError("That room was not found.", 404);
    return room;
  }
  async function requireAuthorized(id, token) {
    const parsed = readRoomToken(token);
    const roomId = normalizeRoomId(id);
    if (!parsed || parsed.roomId !== roomId) {
      throw new RoomError("Enter the room password again.", 401);
    }
    return requireRoom(roomId);
  }
  function payload(room, token = issueRoomToken(room.id)) {
    return {
      id: room.id,
      name: room.name,
      token,
      version: room.version,
      session: room.store.session
    };
  }
  return {
    async list() {
      const rooms = await store.list();
      return rooms.map(toPublicRoom);
    },
    async create(name, password) {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) throw new RoomError("Give the room a name.", 400);
      if (password.length < 4) throw new RoomError("Use a password with at least 4 characters.", 400);
      const { salt, hash } = hashPassword(password);
      const session = { ...createSession(), name: trimmed };
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const room = {
        id: createRoomId(),
        name: trimmed,
        passwordHash: hash,
        passwordSalt: salt,
        version: 1,
        createdAt: now,
        updatedAt: now,
        store: createStore(session)
      };
      await store.save(room);
      return payload(room);
    },
    async join(id, password) {
      const room = await requireRoom(id);
      if (!verifyPassword(password, room.passwordSalt, room.passwordHash)) {
        throw new RoomError("That password does not match this room.", 401);
      }
      return payload(room);
    },
    async read(id, token) {
      const room = await requireAuthorized(id, token);
      return payload(room, token);
    },
    async apply(id, token, action) {
      if (!action || typeof action !== "object" || !ALLOWED_ACTIONS.has(action.type)) {
        throw new RoomError("That action cannot be synced.", 400);
      }
      const room = await requireAuthorized(id, token);
      const next = reduceSession(room.store, action);
      const changed = next !== room.store;
      const saved = {
        ...room,
        version: changed ? room.version + 1 : room.version,
        updatedAt: changed ? (/* @__PURE__ */ new Date()).toISOString() : room.updatedAt,
        store: next
      };
      if (changed) await store.save(saved);
      return payload(saved, token);
    }
  };
}

// api/_lib/http.ts
function bearer(authorization) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}
function asObject(body) {
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}
async function handleApi(request) {
  try {
    const path = request.pathname.replace(/\/+$/, "") || "/";
    const method = request.method.toUpperCase();
    const body = asObject(request.body);
    const store = await getRoomStore();
    const service = createRoomService(store);
    if (method === "GET" && path === "/api/rooms") {
      const rooms = (await store.list()).map(toPublicRoom);
      return { status: 200, body: { rooms } };
    }
    if (method === "POST" && path === "/api/rooms") {
      return {
        status: 201,
        body: await service.create(String(body.name ?? ""), String(body.password ?? ""))
      };
    }
    const join = path.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (method === "POST" && join) {
      return {
        status: 200,
        body: await service.join(join[1], String(body.password ?? ""))
      };
    }
    const action = path.match(/^\/api\/rooms\/([^/]+)\/actions$/);
    if (method === "POST" && action) {
      return {
        status: 200,
        body: await service.apply(action[1], bearer(request.authorization), body.action)
      };
    }
    const room = path.match(/^\/api\/rooms\/([^/]+)$/);
    if (method === "GET" && room) {
      return { status: 200, body: await service.read(room[1], bearer(request.authorization)) };
    }
    return { status: 404, body: { error: "Not found." } };
  } catch (caught) {
    if (caught instanceof RoomError) {
      return { status: caught.status, body: { error: caught.message } };
    }
    const message = caught instanceof Error ? caught.message : "The room server failed.";
    console.error(caught);
    return { status: 500, body: { error: message } };
  }
}

// api/_lib/vercel.ts
function requestUrl(req) {
  const raw = req.url ?? "/api";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return new URL(raw);
  return new URL(raw, `https://${req.headers.host ?? "localhost"}`);
}
async function runVercelApi(req, res) {
  try {
    const url = requestUrl(req);
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const result = await handleApi({
      method: req.method ?? "GET",
      pathname: url.pathname,
      body: req.body,
      authorization
    });
    res.status(result.status).json(result.body);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "The room server failed.";
    res.status(500).json({ error: message });
  }
}

// server/roomsEntry.ts
async function handler(req, res) {
  try {
    await runVercelApi(req, res);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "The room server failed.";
    res.status(500).json({ error: message });
  }
}
