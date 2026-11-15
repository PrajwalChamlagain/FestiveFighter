# Festive Fighter: code and gameplay guide

This guide describes the current code, not a planned architecture. The game is
a local browser game built with Phaser 4 and Vite. Its current menu starts
single-player matches against a CPU bot; it does not connect to a server or
provide online multiplayer.

Screenshots of the username screen, fighter menu, live match, and rocket aim
preview are attached to the task conversation.

## 1. Start-up path

```text
index.html
  └─ src/main.js: creates the Phaser game
      └─ BootScene: loads shared assets and the arena background
          └─ MenuScene: username → fighter menu / shop
              └─ MatchScene: player vs. BotAI in diwaliArena
```

- [`index.html`](../index.html) supplies the `#game` element, page sizing, and
  the module entry point.
- [`src/main.js`](../src/main.js) configures the 960×540 Phaser canvas, aspect
  ratio scaling, DOM support, and scene order.
- [`src/scenes/BootScene.js`](../src/scenes/BootScene.js) uses
  [`src/assets/data/assets.json`](../src/assets/data/assets.json) to load
  shared assets and reports missing assets before opening the menu.
- Vite serves local development with `npm run dev` and creates a production
  bundle with `npm run build`.

## 2. Menu, username, and saved profile

[`src/scenes/menuScene.js`](../src/scenes/menuScene.js) owns the login, fighter
picker, shop, and transition into a match. The username is kept in the current
scene flow, not sent to an authentication service. The login is a Phaser DOM
input, so `clearScreen()` removes its DOM node as well as Phaser display
objects when the menu changes screens.

The shop reads the item lists in [`src/data/catalog.js`](../src/data/catalog.js)
and saves purchases/equipped weapons through
[`src/data/playerProfile.js`](../src/data/playerProfile.js). The profile is
stored in browser `localStorage` under `festive-fighter-profile`; there is no
account database. Invalid saved JSON is reported in the console and replaced
with a fresh profile. Current development profiles have 1,000,000 coins.

`startMatch()` sends the selected fighter and weapon plus randomized bot
fighter, weapon, and parry gear to `MatchScene`. Shop ownership and the player
weapon are persisted; the opponent's random loadout is not.

## 3. Important source folders and files

| Location | Responsibility |
| --- | --- |
| [`src/scenes/`](../src/scenes) | Phaser scenes: boot, menu/login/shop, and combat |
| [`src/entities/SpriteFighter.js`](../src/entities/SpriteFighter.js) | Fighter sprite poses, action timing, hurtboxes, and melee hitboxes |
| [`src/entities/BotAI.js`](../src/entities/BotAI.js) | Bot movement, spacing, attacks, projectile throws, and evasion |
| [`src/data/catalog.js`](../src/data/catalog.js) | Characters, weapons, parry gear, weapon physics, and starting profile |
| [`src/data/combatMoves.js`](../src/data/combatMoves.js) | Jab, kick, sweep, and character special move definitions |
| [`src/data/abilities.js`](../src/data/abilities.js) | Tunable spit and aimed-rocket presentation values |
| [`src/systems/abilities/`](../src/systems/abilities) | Isolated spit projectile and manual rocket aiming behavior |
| [`src/maps/diwaliArena.js`](../src/maps/diwaliArena.js) | Arena image, image dimensions, and platform collision layout |
| [`src/assets/sprites/`](../src/assets/sprites) | Idle, walk, spit, explosion, and large rocket artwork |
| [`src/assets/arena-background/`](../src/assets/arena-background) | Diwali combat background |
| [`src/assets/login-arena/`](../src/assets/login-arena) | Login/menu background |

Static image imports go through Vite so the same asset references work in
development and in the built game. `MatchScene.preload()` loads the fighter
sprite sheets, explosion sheet, and large rocket when the match scene starts.

## 4. Arena and movement

[`src/maps/diwaliArena.js`](../src/maps/diwaliArena.js) owns the background and
three platform tops: ground, lower balcony, and upper balcony. The platform
coordinates are expressed against the 1024×576 source image. `MatchScene`
converts them to the current viewport and uses those entries for landing,
shadow placement, and projectile bounce checks.

The orange platform debug lines have been removed from the rendered scene.
The map entries themselves remain as collision platforms, so removing the
debug drawing does not remove the two elevated landing surfaces.

`MatchScene.updatePhysics()` integrates horizontal velocity, gravity, platform
landings, arena boundaries, and fighter shadows. The player moves with A/D or
the arrow keys and jumps with W, Space, or Up. Acceleration and braking are
handled in `handleInput()`. Melee moves include small lunge values from
`combatMoves.js`; firecracker blast hops add a larger airborne boost.

## 5. Controls

| Action | Keyboard | Notes |
| --- | --- | --- |
| Move | A / D or ← / → | Horizontal movement and air control |
| Jump | W / Space / ↑ | Jump while grounded |
| Crouch | S / ↓ | Lowers movement speed; kick becomes a sweep |
| Punch | J | Quick jab |
| Kick | K | Front kick; while crouching, a leg sweep |
| Spit | G | Fast, long-range green projectile |
| Character special | E | Character-specific move on cooldown |
| Firework | F | Throw/detonate normal fireworks; with Anar, aim and release |
| Parry | R | Short projectile-reflect window; requires parry gear |
| Cancel rocket aim | Esc | Cancels an active Anar aim |
| Hitbox overlay | F1 | Toggles fighter hurtboxes and the latest melee hitbox |

The combat HUD repeats the core controls. The F button is also clickable; for
Anar, clicking it starts aim mode and clicking the arena launches. On keyboard,
hold F, aim with the mouse, then release F. The rocket trajectory preview
updates while aiming.

## 6. Combat and bot behavior

[`src/scenes/MatchScene.js`](../src/scenes/MatchScene.js) coordinates health,
input, physics, collision, cooldowns, and effects. Each fighter starts with
150 health. `SpriteFighter` defines moves by windup, active, and recovery
phases; `MatchScene` checks the resulting attack rectangle against head,
torso, and leg hurtboxes. Head hits deal 1.5× base damage, torso 1×, and legs
0.8×. Hits apply knockback, lift, a short stun, camera shake, and expanding
impact sparks.

[`src/entities/BotAI.js`](../src/entities/BotAI.js) thinks on a short interval,
keeps a preferred distance, attacks, throws weapons, jumps away from threats,
and attempts to parry if equipped. When the player stands still and the bot is
in its preferred-distance band, the bot now paces/repositions instead of
remaining idle. It also drifts slightly during attack animations.

Parry is handled in `MatchScene.beginParry()` and `tryReflectProjectiles()`.
It only works with the Brass Puja Thali and can reflect a projectile during a
brief timing window. The menu shop unlocks that gear.

## 7. Abilities and weapons

The behavior is split into tuning data, focused ability systems, and the scene
integration points:

- [`src/systems/abilities/SpitAbility.js`](../src/systems/abilities/SpitAbility.js)
  creates, moves, collides, and cleans up spit shots. It uses the existing
  `Spitting.png` fighter animation through the `spit` pose. The current tuning
  is 15 damage, 700 px/s, 1.65 seconds of lifetime, and a 950 ms cooldown.
- [`src/systems/abilities/RocketAimAbility.js`](../src/systems/abilities/RocketAimAbility.js)
  reproduces the older hold-to-aim/release-to-fire control using mouse world
  coordinates, a ballistic trajectory preview, and
  `firework-rocket-big.png`. It delegates the actual projectile/damage work to
  `MatchScene`.
- [`src/data/abilities.js`](../src/data/abilities.js) holds special, parry,
  spit, and rocket-aim tuning. [`src/data/catalog.js`](../src/data/catalog.js)
  holds each weapon's damage, blast radius, fuse, gravity, cooldown, and
  special properties.

**Firecracker** is the mobility choice: it accelerates and can give the owner a
blast hop. Crouch and press F to drop it at the fighter's feet; pressing F
again manually detonates a player-owned throwable when available.

**Anar Rocket** is the high-damage, longer-cooldown weapon. Hold F and point the
mouse, then release F (or click in the arena) to launch the large rocket along
the previewed arc. It deals 28 base damage with a 125 px blast radius and a
5.6 second cooldown. It is not the mobility firecracker.

Sutli and Chakri remain regular timed fireworks. Their physics are in the same
weapon catalog and their projectiles use the scene's common throw, collision,
and explosion path.

## 8. Extending the game

1. Add character, weapon, or parry gear entries to `catalog.js`; define any
   weapon physics in `WEAPON_PHYSICS`.
2. Add or tune a melee move in `combatMoves.js`. Use `SpriteFighter.getMove()`
   for character-specific specials.
3. Keep a self-contained projectile/ability's state and cleanup in
   `src/systems/abilities/`; call it from `MatchScene` rather than growing the
   scene with another independent update loop.
4. Edit `diwaliArena.js` for background or platform layout. Platform positions
   use the map's reference image coordinate system.
5. Keep profile changes compatible with `loadPlayerProfile()` and save them
   with `savePlayerProfile()`.

## 9. Run and validate

```sh
npm install
npm run dev
npm run build
```

The `test` script in `package.json` is currently a placeholder, not a working
test suite. The game currently has no networking, matchmaking, server-side
damage verification, or multiplayer party codes.
