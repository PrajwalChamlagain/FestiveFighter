export const MOVES = {
    jab: {
        name: "QUICK JAB",
        pose: "jab",
        windup: 65,
        active: 110,
        recovery: 155,
        damage: 6,
        knockback: 115,
        lift: 20,
        lunge: 42,
        targetZones: ["head", "torso"],
        hitbox: { x: 55, y: -99, width: 58, height: 34 }
    },
    kick: {
        name: "FRONT KICK",
        pose: "kick",
        windup: 105,
        active: 120,
        recovery: 210,
        damage: 12,
        knockback: 200,
        lift: 190,
        lunge: 80,
        targetZones: ["torso", "legs"],
        hitbox: { x: 75, y: -66, width: 92, height: 55 }
    },
    sweep: {
        name: "LOW SWEEP",
        pose: "sweep",
        windup: 90,
        active: 140,
        recovery: 240,
        damage: 13,
        knockback: 180,
        lift: 25,
        lunge: 30,
        targetZones: ["legs"],
        hitbox: { x: 70, y: -25, width: 100, height: 29 }
    }
};

export const SPECIAL_MOVES = {
    sunfire: {
        name: "AGNI UPPERCUT",
        pose: "uppercut",
        windup: 145,
        active: 135,
        recovery: 320,
        damage: 26,
        knockback: 440,
        lift: 220,
        lunge: 115,
        targetZones: ["head", "torso"],
        hitbox: { x: 65, y: -119, width: 80, height: 85 },
        effectColor: 0xff7625
    },
    shadow: {
        name: "SHADOW SWEEP",
        pose: "shadowSweep",
        windup: 100,
        active: 140,
        recovery: 290,
        damage: 21,
        knockback: 360,
        lift: 55,
        lunge: 90,
        targetZones: ["torso", "legs"],
        hitbox: { x: 80, y: -39, width: 105, height: 46 },
        effectColor: 0x9b59dc
    }
};

export const DEFAULT_SPECIAL = {
    name: "POWER STRIKE",
    pose: "kick",
    windup: 140,
    active: 130,
    recovery: 300,
    damage: 18,
    knockback: 300,
    lift: 65,
    lunge: 75,
    targetZones: ["head", "torso"],
    hitbox: { x: 65, y: -90, width: 80, height: 75 },
    effectColor: 0xffc66b
};
