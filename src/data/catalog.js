export const CHARACTERS = [
    { id: "sunfire", name: "SUNFIRE", tint: 0xffc28c, price: 0 },
    { id: "shadow", name: "SHADOW", tint: 0xb9a1f2, price: 150 },
    { id: "royal", name: "ROYAL", tint: 0xffd166, price: 225 }
];

export const WEAPONS = [
    { id: "sutli", name: "SUTLI BOMB", price: 0 },
    { id: "firecracker", name: "FIRECRACKER", price: 150 },
    { id: "anar", name: "ANAR ROCKET", price: 175 },
    { id: "chakri", name: "CHAKRI", price: 200 }
];

export const PARRY_TOOLS = [
    { id: "puja-thali", name: "BRASS PUJA THALI", price: 125 }
];

export const WEAPON_PHYSICS = {
    sutli: {
        speed: 390,
        cooldown: 3000,
        fuse: 1.45,
        damage: 24,
        radius: 85,
        selfDamage: 3,
        selfBoost: 650,
        selfKnockback: 240,
        enemyKnockback: 9,
        enemyLift: 2.8,
        recoil: 230,
        upwardRecoil: 110,
        gravity: 380,
        color: 0xff6a21
    },
    firecracker: {
        speed: 205,
        acceleration: 720,
        maxSpeed: 650,
        cooldown: 2500,
        fuse: 0.85,
        damage: 5,
        radius: 185,
        selfDamage: 1,
        selfBoost: 1350,
        selfKnockback: 720,
        enemyKnockback: 3.5,
        enemyLift: 0.8,
        recoil: 100,
        upwardRecoil: 40,
        gravity: 470,
        color: 0xffd23f
    },
    anar: {
        speed: 480,
        aimRange: 420,
        aimMinSpeed: 370,
        aimMaxSpeed: 650,
        cooldown: 5600,
        fuse: 1.9,
        damage: 28,
        radius: 125,
        selfDamage: 0,
        selfBoost: 0,
        selfKnockback: 0,
        enemyKnockback: 5,
        enemyLift: 1.8,
        recoil: 0,
        upwardRecoil: 0,
        gravity: 420,
        spriteKey: "diwali_rocket_big",
        spriteSize: 44,
        color: 0xff414d
    },
    chakri: {
        speed: 300,
        cooldown: 2200,
        fuse: 0.72,
        damage: 4,
        radius: 115,
        selfDamage: 1,
        selfBoost: 820,
        selfKnockback: 310,
        enemyKnockback: 3,
        enemyLift: 0.7,
        recoil: 60,
        upwardRecoil: 20,
        gravity: 350,
        color: 0x54d8cb
    }
};

export const STARTING_PROFILE = {
    coins: 1000000,
    characters: ["sunfire"],
    weapons: ["sutli"],
    parryTools: [],
    equippedWeaponId: "sutli"
};
