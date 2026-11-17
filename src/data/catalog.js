import combatRules from "../../shared/combatRules.json";

export const CHARACTERS = [
    { id: "olaal-babu", name: "OLAAL BABU", tint: 0xffc28c, price: 0 },
    { id: "laure", name: "LAURE", tint: 0x7bd8c2, price: 150, customSprite: true },
    { id: "royal", name: "ROYAL", tint: 0xffd166, price: 225 },
    { id: "harke", name: "HARKE", tint: 0xd8a36a, price: 350, customSprite: true },
    { id: "ballin", name: "BALLIN", tint: 0x86d991, price: 0, customSprite: true }
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

export const WEAPON_PHYSICS = combatRules.weapons;

export const STARTING_PROFILE = {
    coins: 1000000,
    characters: ["olaal-babu", "ballin"],
    weapons: ["sutli"],
    parryTools: [],
    equippedWeaponId: "sutli"
};

