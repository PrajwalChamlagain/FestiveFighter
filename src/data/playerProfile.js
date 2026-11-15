import { CHARACTERS, PARRY_TOOLS, STARTING_PROFILE, WEAPONS } from "./catalog.js";

const PROFILE_KEY = "festive-fighter-profile";

export function loadPlayerProfile() {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) {
        return {
            ...STARTING_PROFILE,
            characters: [...STARTING_PROFILE.characters],
            weapons: [...STARTING_PROFILE.weapons],
            parryTools: [...STARTING_PROFILE.parryTools]
        };
    }

    try {
        const profile = JSON.parse(saved);
        const valid = profile &&
            Number.isFinite(profile.coins) &&
            Array.isArray(profile.characters) &&
            Array.isArray(profile.weapons) &&
            Array.isArray(profile.parryTools);
        if (!valid) throw new Error("Saved profile has an invalid shape.");

        const characters = [...new Set(
            profile.characters.filter(id => CHARACTERS.some(character => character.id === id))
        )];
        const weapons = [...new Set(
            profile.weapons.filter(id => WEAPONS.some(weapon => weapon.id === id))
        )];
        const parryTools = [...new Set(
            profile.parryTools.filter(id => PARRY_TOOLS.some(tool => tool.id === id))
        )];
        if (characters.length === 0) characters.push(STARTING_PROFILE.characters[0]);
        if (weapons.length === 0) weapons.push(STARTING_PROFILE.weapons[0]);

        return {
            coins: Math.max(STARTING_PROFILE.coins, Math.floor(profile.coins)),
            characters,
            weapons,
            parryTools,
            equippedWeaponId: weapons.includes(profile.equippedWeaponId)
                ? profile.equippedWeaponId
                : weapons[0]
        };
    } catch (error) {
        console.error("Could not read the saved player profile.", error);
        return {
            ...STARTING_PROFILE,
            characters: [...STARTING_PROFILE.characters],
            weapons: [...STARTING_PROFILE.weapons],
            parryTools: [...STARTING_PROFILE.parryTools]
        };
    }
}

export function savePlayerProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
