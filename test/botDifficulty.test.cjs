const test = require("node:test");
const assert = require("node:assert/strict");

test("bot difficulty choices have ordered challenge settings", async () => {
  const {
    BOT_DIFFICULTIES,
    DEFAULT_BOT_DIFFICULTY,
    getBotDifficultySettings,
    isBotDifficulty
  } = await import("../src/data/botDifficulty.mjs");

  assert.deepEqual(
    BOT_DIFFICULTIES.map(({ id }) => id),
    ["easy", "normal", "hard", "super-hard"]
  );
  assert.equal(DEFAULT_BOT_DIFFICULTY, "normal");
  assert.ok(BOT_DIFFICULTIES.every(({ id }) => isBotDifficulty(id)));

  const easy = getBotDifficultySettings("easy");
  const normal = getBotDifficultySettings("normal");
  const hard = getBotDifficultySettings("hard");
  const superHard = getBotDifficultySettings("super-hard");

  assert.ok(
    easy.thinkIntervalMs > normal.thinkIntervalMs &&
    normal.thinkIntervalMs > hard.thinkIntervalMs &&
    hard.thinkIntervalMs > superHard.thinkIntervalMs
  );
  assert.ok(
    easy.movementSpeedMultiplier < normal.movementSpeedMultiplier &&
    normal.movementSpeedMultiplier < hard.movementSpeedMultiplier &&
    hard.movementSpeedMultiplier < superHard.movementSpeedMultiplier
  );
  assert.equal(getBotDifficultySettings("invalid"), normal);
  assert.equal(isBotDifficulty("invalid"), false);
});
