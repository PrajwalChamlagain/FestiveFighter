import combatRules from "../../shared/combatRules.json";

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

export const WEAPON_PHYSICS = combatRules.weapons;

export const STARTING_PROFILE = {
    coins: 1000000,
    characters: ["sunfire"],
    weapons: ["sutli"],
    parryTools: [],
    equippedWeaponId: "sutli"
};

