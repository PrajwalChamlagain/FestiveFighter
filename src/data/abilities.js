export const ABILITIES = {
  special: {
    cooldownMs: 3400,
    botCooldownMs: 3900
  },
  parry: {
    windowMs: 80,
    contactRadius: 7,
    cooldownMs: 1200,
    botCooldownMs: 1000
  },
  spit: {
    cooldownMs: 950,
    damage: 15,
    speed: 700,
    lifetimeSeconds: 1.65,
    hitRadius: 10,
    poseDurationMs: 320,
    knockback: 235,
    lift: 115
  },
  rocketAim: {
    displaySize: 44,
    spriteForwardOffset: Math.PI / 4,
    trajectoryStep: 0.06
  }
};
