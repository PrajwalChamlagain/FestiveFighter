# Festive Fighter

Festive Fighter is a browser-based sprite-fighting game built with Phaser 4,
JavaScript, and Vite. Its current playable mode is a local match against a bot;
it does not use an online server.

## Arena maps

Map definitions live in `src/maps/`. Each definition owns its background asset,
reference dimensions, and platform tops measured in image coordinates.
`MatchScene` scales that data to the viewport for fighter landings and projectile
collisions. Edit `src/maps/diwaliArena.js` to adjust the current arena.

## Fighters and shop

The sprite-based combat scene is `src/scenes/MatchScene.js`; sprite animation and
hitboxes live in `src/entities/SpriteFighter.js`, while `src/entities/BotAI.js`
controls the bot in VS Bot mode. Shared character and firework data is in
`src/data/catalog.js`. After username entry, the menu lets the player choose an
unlocked fighter, start a bot match, or open the shop. The opponent's fighter
and loadout are randomized each match. Purchased palettes, weapons, and parry
gear are saved in the browser; development profiles start with ample coins.

## Project guide

See [the gameplay and code guide](./docs/GAMEPLAY_GUIDE.md) for the startup
flow, scene responsibilities, controls, combat rules, and ability modules.
    