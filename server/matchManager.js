const MAX_PLAYERS_PER_MATCH = 2;
const MAX_MOVEMENT_RATE = 60;
const MAX_COMBAT_EVENT_RATE = 20;
const MAX_PENDING_ATTACKS = 32;
const MAX_HEALTH = 150;
const VALID_MOVES = new Set(["jab", "kick", "sweep", "special"]);
const VALID_HIT_ZONES = new Set(["head", "torso", "legs"]);
const BLOCKABLE_HIT_ZONES = new Set(["head", "torso"]);
const VALID_POSES = new Set([
  "idle", "walk", "jump", "crouch", "guard", "jab", "kick", "sweep",
  "uppercut", "shadowSweep", "spit", "throw", "hit", "parry"
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMovement(state) {
  if (!state || typeof state !== "object") return null;

  const { x, y, vx, vy, grounded, facing, pose } = state;
  if (![x, y, vx, vy].every(Number.isFinite) || typeof grounded !== "boolean") {
    return null;
  }
  if (facing !== -1 && facing !== 1) return null;

  return {
    x: clamp(x, 0, 960),
    y: clamp(y, 0, 540),
    vx: clamp(vx, -2000, 2000),
    vy: clamp(vy, -2500, 2500),
    grounded,
    facing,
    pose: VALID_POSES.has(pose) ? pose : "idle",
    crouching: typeof state.crouching === "boolean"
      ? state.crouching
      : pose === "crouch"
  };
}

function normalizeAttackStart(attack) {
  if (!attack || typeof attack !== "object") return null;
  const { attackId, move, facing } = attack;
  if (!Number.isSafeInteger(attackId) || attackId < 1) return null;
  if (!VALID_MOVES.has(move) || (facing !== -1 && facing !== 1)) return null;
  return { attackId, move, facing };
}

function normalizeAttackResult(result) {
  if (!result || typeof result !== "object") return null;
  const { attackId, hit, blocked, zone, damage, knockbackX, knockbackY } = result;
  if (!Number.isSafeInteger(attackId) || attackId < 1) return null;
  if (typeof hit !== "boolean" || typeof blocked !== "boolean") return null;
  if (!Number.isInteger(damage) || damage < 0 || damage > MAX_HEALTH) return null;
  if (!Number.isFinite(knockbackX) || Math.abs(knockbackX) > 1000) return null;
  if (!Number.isFinite(knockbackY) || knockbackY < -1000 || knockbackY > 0) return null;

  if (!hit) {
    if (blocked || zone !== null || damage !== 0 || knockbackX !== 0 || knockbackY !== 0) return null;
  } else if (blocked) {
    if (!BLOCKABLE_HIT_ZONES.has(zone) || damage !== 0 || knockbackX !== 0 || knockbackY !== 0) return null;
  } else if (!VALID_HIT_ZONES.has(zone) || damage < 1) {
    return null;
  }

  return { attackId, hit, blocked, zone, damage, knockbackX, knockbackY };
}

class MatchManager {
  constructor(io, projectileManager, rules) {
    this.io = io;
    this.projectileManager = projectileManager;
    this.rules = rules;
    this.waitingPlayerId = null;
    this.waitingLoadout = null;
    this.nextMatchId = 1;
    this.matches = new Map();
    this.playerMatches = new Map();
    this.lastMovementAt = new Map();
    this.lastCombatAt = new Map();
    this.pendingAttacks = new Map();
  }

  normalizeLoadout(rawLoadout) {
    if (!rawLoadout || typeof rawLoadout !== "object") return null;
    const knownWeapons = new Set(Object.keys(this.rules.weapons));
    const weapons = Array.isArray(rawLoadout.weapons)
      ? [...new Set(rawLoadout.weapons.filter(id => knownWeapons.has(id)))]
      : [];
    const weaponId = rawLoadout.weaponId;
    if (!knownWeapons.has(weaponId) || !weapons.includes(weaponId)) return null;

    const parryTools = Array.isArray(rawLoadout.parryTools)
      ? rawLoadout.parryTools.filter(id => id === "puja-thali")
      : [];
    return {
      weaponId,
      weapons,
      parryToolId: rawLoadout.parryToolId === "puja-thali" && parryTools.includes("puja-thali")
        ? "puja-thali"
        : null
    };
  }

  join(socket, rawLoadout) {
    if (this.playerMatches.has(socket.id)) return;

    const loadout = this.normalizeLoadout(rawLoadout);
    if (!loadout) {
      socket.emit("match:error", { reason: "invalid-loadout" });
      return;
    }

    if (this.waitingPlayerId === socket.id) return;

    const waitingSocket = this.waitingPlayerId
      ? this.io.sockets.sockets.get(this.waitingPlayerId)
      : null;

    if (!waitingSocket || waitingSocket.id === socket.id) {
      this.waitingPlayerId = socket.id;
      this.waitingLoadout = loadout;
      socket.emit("match:waiting", { playerId: socket.id });
      return;
    }

    const waitingLoadout = this.waitingLoadout;
    this.waitingPlayerId = null;
    this.waitingLoadout = null;
    const matchId = `match-${this.nextMatchId++}`;
    const players = new Map([
      [waitingSocket.id, { slot: 0, loadout: waitingLoadout }],
      [socket.id, { slot: 1, loadout }]
    ]);
    this.matches.set(matchId, players);
    this.projectileManager.createMatch(matchId, players);

    for (const [playerId, player] of players) {
      this.playerMatches.set(playerId, matchId);
      const playerSocket = this.io.sockets.sockets.get(playerId);
      playerSocket.join(matchId);
      playerSocket.emit("match:found", {
        matchId,
        playerId,
        opponentId: playerId === waitingSocket.id ? socket.id : waitingSocket.id,
        slot: player.slot,
        playerCount: MAX_PLAYERS_PER_MATCH,
        weaponId: player.loadout.weaponId,
        parryToolId: player.loadout.parryToolId
      });
    }
  }

  relayMovement(socket, rawState) {
    const matchId = this.playerMatches.get(socket.id);
    if (!matchId) return;

    const now = Date.now();
    const previousUpdate = this.lastMovementAt.get(socket.id) || 0;
    if (now - previousUpdate < 1000 / MAX_MOVEMENT_RATE) return;

    const state = normalizeMovement(rawState);
    if (!state) return;

    this.lastMovementAt.set(socket.id, now);
    this.projectileManager.updatePlayerState(matchId, socket.id, state);
    socket.to(matchId).emit("player:moved", {
      playerId: socket.id,
      state,
      serverTime: now
    });
  }

  requestProjectile(socket, request) {
    const matchId = this.playerMatches.get(socket.id);
    if (matchId) this.projectileManager.requestProjectile(matchId, socket.id, request);
  }

  requestDetonation(socket, projectileId) {
    const matchId = this.playerMatches.get(socket.id);
    if (matchId) this.projectileManager.requestDetonation(matchId, socket.id, projectileId);
  }

  requestParry(socket) {
    const matchId = this.playerMatches.get(socket.id);
    if (matchId) this.projectileManager.requestParry(matchId, socket.id);
  }

  relayCombat(socket, eventType, rawPayload) {
    const matchId = this.playerMatches.get(socket.id);
    if (!matchId || !["attack-start", "attack-result"].includes(eventType)) return;

    const now = Date.now();
    const rateKey = `${socket.id}:${eventType}`;
    const previousUpdate = this.lastCombatAt.get(rateKey) || 0;
    if (now - previousUpdate < 1000 / MAX_COMBAT_EVENT_RATE) return;

    if (eventType === "attack-start") {
      const attack = normalizeAttackStart(rawPayload);
      if (!attack) return;

      let pending = this.pendingAttacks.get(socket.id);
      if (!pending) {
        pending = new Set();
        this.pendingAttacks.set(socket.id, pending);
      }
      if (pending.has(attack.attackId) || pending.size >= MAX_PENDING_ATTACKS) return;

      pending.add(attack.attackId);
      this.lastCombatAt.set(rateKey, now);
      socket.to(matchId).emit("combat:attack-start", {
        playerId: socket.id,
        ...attack
      });
      return;
    }

    const result = normalizeAttackResult(rawPayload);
    const pending = this.pendingAttacks.get(socket.id);
    if (!result || !pending?.has(result.attackId)) return;

    pending.delete(result.attackId);
    this.lastCombatAt.set(rateKey, now);
    socket.to(matchId).emit("combat:attack-result", {
      playerId: socket.id,
      ...result
    });
  }

  relayHealth(socket, rawHealth) {
    const matchId = this.playerMatches.get(socket.id);
    if (!matchId || !Number.isInteger(rawHealth) || rawHealth < 0 || rawHealth > MAX_HEALTH) {
      return;
    }

    const now = Date.now();
    const rateKey = `${socket.id}:health`;
    const previousUpdate = this.lastCombatAt.get(rateKey) || 0;
    if (now - previousUpdate < 1000 / MAX_COMBAT_EVENT_RATE) return;

    this.lastCombatAt.set(rateKey, now);
    this.projectileManager.updatePlayerHealth(matchId, socket.id, rawHealth);
    socket.to(matchId).emit("combat:health", {
      playerId: socket.id,
      health: rawHealth
    });
  }

  remove(socket) {
    if (this.waitingPlayerId === socket.id) {
      this.waitingPlayerId = null;
      this.waitingLoadout = null;
    }

    const matchId = this.playerMatches.get(socket.id);
    if (matchId) {
      const players = this.matches.get(matchId);
      players?.delete(socket.id);
      this.playerMatches.delete(socket.id);

      for (const opponentId of players?.keys() || []) {
        const opponentSocket = this.io.sockets.sockets.get(opponentId);
        opponentSocket?.emit("match:player-disconnected", {
          matchId,
          playerId: socket.id
        });
        this.playerMatches.delete(opponentId);
        this.pendingAttacks.delete(opponentId);
        for (const key of this.lastCombatAt.keys()) {
          if (key.startsWith(`${opponentId}:`)) this.lastCombatAt.delete(key);
        }
        opponentSocket?.leave(matchId);
      }

      this.matches.delete(matchId);
      this.projectileManager.removeMatch(matchId);
    }

    this.lastMovementAt.delete(socket.id);
    this.pendingAttacks.delete(socket.id);
    for (const key of this.lastCombatAt.keys()) {
      if (key.startsWith(`${socket.id}:`)) this.lastCombatAt.delete(key);
    }
  }
}

MatchManager.normalizeMovement = normalizeMovement;
MatchManager.normalizeAttackStart = normalizeAttackStart;
MatchManager.normalizeAttackResult = normalizeAttackResult;
module.exports = MatchManager;
