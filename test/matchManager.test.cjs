const test = require("node:test");
const assert = require("node:assert/strict");
const MatchManager = require("../server/matchManager");
const rules = require("../shared/combatRules.json");

function createSocket(id) {
  return {
    id,
    events: [],
    rooms: [],
    emit(name, payload) {
      this.events.push({ name, payload });
    },
    join(room) {
      this.rooms.push(room);
    },
    leave(room) {
      this.rooms = this.rooms.filter(item => item !== room);
    }
  };
}

function createManager() {
  const sockets = new Map();
  const io = {
    sockets: { sockets },
    to() {
      return { emit() {} };
    }
  };
  const projectileManager = {
    matches: [],
    createMatch(matchId, players) {
      this.matches.push({ matchId, players });
    },
    removeMatch() {}
  };
  return { manager: new MatchManager(io, projectileManager, rules), sockets, projectileManager };
}

function loadout(characterId) {
  return {
    characterId,
    weaponId: "sutli",
    weapons: ["sutli"],
    parryTools: []
  };
}

test("FIFO matchmaking pairs players and shares each selected character", () => {
  const { manager, sockets, projectileManager } = createManager();
  const first = createSocket("first");
  const second = createSocket("second");
  sockets.set(first.id, first);
  sockets.set(second.id, second);

  manager.join(first, loadout("olaal-babu"));
  assert.equal(first.events.at(-1).name, "match:waiting");

  manager.join(second, loadout("laure"));

  const firstMatch = first.events.find(event => event.name === "match:found").payload;
  const secondMatch = second.events.find(event => event.name === "match:found").payload;
  assert.equal(firstMatch.opponentCharacterId, "laure");
  assert.equal(secondMatch.opponentCharacterId, "olaal-babu");
  assert.equal(projectileManager.matches.length, 1);
});

test("matchmaking rejects unknown fighters and removed kick attacks", () => {
  const { manager } = createManager();

  assert.equal(manager.normalizeLoadout(loadout("unknown")), null);
  assert.equal(manager.normalizeLoadout(loadout("shadow")), null);
  assert.equal(manager.normalizeLoadout(loadout("ballin")).characterId, "ballin");
  assert.equal(MatchManager.normalizeAttackStart({
    attackId: 1,
    move: "kick",
    facing: 1
  }), null);
  assert.deepEqual(MatchManager.normalizeAttackStart({
    attackId: 1,
    move: "special",
    facing: 1
  }), { attackId: 1, move: "special", facing: 1 });
});

test("melee attack results accept bounded Harke stun durations", () => {
  const result = {
    attackId: 1,
    hit: true,
    blocked: false,
    zone: "torso",
    damage: 16,
    knockbackX: 130,
    knockbackY: -25,
    stunMs: 1250
  };

  assert.equal(MatchManager.normalizeAttackResult(result).stunMs, 1250);
  assert.equal(MatchManager.normalizeAttackResult({ ...result, stunMs: 2001 }), null);
});
