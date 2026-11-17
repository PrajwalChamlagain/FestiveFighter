export const DEFAULT_BOT_DIFFICULTY = "normal";

export const BOT_DIFFICULTIES = [
  { id: "easy", label: "EASY" },
  { id: "normal", label: "NORMAL" },
  { id: "hard", label: "HARD" },
  { id: "super-hard", label: "SUPER HARD" }
];

const SETTINGS = {
  easy: {
    thinkIntervalMs: 230,
    decisionChance: 0.7,
    evadeChance: 0.4,
    parryChance: 0.2,
    jabCooldownMultiplier: 1.5,
    specialCooldownMultiplier: 1.3,
    jumpCooldownMultiplier: 1.4,
    movementSpeedMultiplier: 0.8
  },
  normal: {
    thinkIntervalMs: 110,
    decisionChance: 1,
    evadeChance: 1,
    parryChance: 0.5,
    jabCooldownMultiplier: 1,
    specialCooldownMultiplier: 1,
    jumpCooldownMultiplier: 1,
    movementSpeedMultiplier: 1
  },
  hard: {
    thinkIntervalMs: 80,
    decisionChance: 1,
    evadeChance: 1,
    parryChance: 0.65,
    jabCooldownMultiplier: 0.85,
    specialCooldownMultiplier: 0.9,
    jumpCooldownMultiplier: 0.9,
    movementSpeedMultiplier: 1.08
  },
  "super-hard": {
    thinkIntervalMs: 55,
    decisionChance: 1,
    evadeChance: 1,
    parryChance: 0.8,
    jabCooldownMultiplier: 0.7,
    specialCooldownMultiplier: 0.75,
    jumpCooldownMultiplier: 0.75,
    movementSpeedMultiplier: 1.16
  }
};

export function isBotDifficulty(id) {
  return Object.hasOwn(SETTINGS, id);
}

export function getBotDifficultySettings(id) {
  return SETTINGS[id] || SETTINGS[DEFAULT_BOT_DIFFICULTY];
}
