export const MOVES = {
    jab: {
        name: "QUICK JAB",
        pose: "jab",
        windup: 65,
        active: 110,
        recovery: 155,
        cooldownMs: 500,
        botCooldownMs: 900,
        damage: 6,
        knockback: 115,
        lift: 20,
        lunge: 42,
        targetZones: ["head", "torso"],
        hitbox: { x: 55, y: -99, width: 58, height: 34 }
    }
};

export const SPECIAL_MOVES = {
    "olaal-babu": {
        name: "OLAAL SPIT",
        pose: "spit",
        windup: 110,
        active: 110,
        recovery: 360,
        cooldownMs: 3800,
        damage: 38,
        knockback: 300,
        lift: 85,
        lunge: 18,
        targetZones: ["head", "torso"],
        hitbox: { x: 53, y: -98, width: 50, height: 46 },
        effectColor: 0xc3ee7a
    },
    royal: {
        name: "ROYAL RISING PALM",
        pose: "uppercut",
        windup: 155,
        active: 130,
        recovery: 350,
        cooldownMs: 3600,
        damage: 30,
        knockback: 390,
        lift: 245,
        lunge: 75,
        targetZones: ["head", "torso"],
        hitbox: { x: 64, y: -117, width: 76, height: 82 },
        effectColor: 0xffd166
    },
    laure: {
        name: "KHUKURI CUT",
        pose: "jab",
        windup: 125,
        active: 105,
        recovery: 390,
        damage: 40,
        knockback: 320,
        lift: 55,
        lunge: 10,
        targetZones: ["head", "torso"],
        hitbox: { x: 48, y: -96, width: 30, height: 44 },
        effectColor: 0x7bd8c2,
        specialEffect: "khukuri",
        cooldownMs: 5000
    },
    harke: {
        name: "DIRT TOSS",
        pose: "throw",
        windup: 180,
        active: 180,
        recovery: 420,
        cooldownMs: 4800,
        damage: 16,
        knockback: 130,
        lift: 25,
        stunDurationMs: 700,
        targetZones: ["head", "torso"],
        hitbox: { x: 110, y: -103, width: 116, height: 62 },
        effectColor: 0xc98d53,
        specialEffect: "dirtToss"
    },
    ballin: {
        name: "BURNING HERB",
        pose: "spit",
        windup: 180,
        active: 480,
        recovery: 150,
        cooldownMs: 8500,
        damage: 0,
        knockback: 0,
        lift: 0,
        meleeBuffMultiplier: 1.35,
        meleeBuffDurationMs: 5000,
        effectColor: 0x88d979,
        specialEffect: "burningHerb"
    }
};

export const DEFAULT_SPECIAL = {
    name: "POWER STRIKE",
    pose: "jab",
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
