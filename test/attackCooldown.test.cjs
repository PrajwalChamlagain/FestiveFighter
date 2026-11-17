const test = require("node:test");
const assert = require("node:assert/strict");

test("attack cooldown stays closed until its ready time", async () => {
  const { default: AttackCooldown } = await import("../src/systems/AttackCooldown.mjs");
  const cooldown = new AttackCooldown();

  assert.equal(cooldown.isReady(0), true);
  cooldown.start(120, 900);
  assert.equal(cooldown.isReady(1019), false);
  assert.equal(cooldown.isReady(1020), true);
});
