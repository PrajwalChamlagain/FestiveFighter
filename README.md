# Festive Fighter

Festive Fighter is a browser-based sprite-fighting game built with Phaser 4,
JavaScript, and Vite. It includes bot matches and online matchmaking over
Socket.IO.

## Run locally

Use Node.js 24 or later.

To run the standalone Vite frontend and multiplayer server in separate
terminals:

```powershell
npm.cmd run server
npm.cmd run dev -- --host 0.0.0.0
```

For the Netlify Server environment, install Netlify CLI 27.17.0 or later and
run from the project root:

```powershell
npx netlify-cli@latest dev
```

Netlify Dev serves the frontend and multiplayer server from one local origin.
Open the URL printed by the CLI in two browser sessions to try matchmaking.

## Deploy to Netlify

The repository includes `netlify.toml` with the Vite build command and `dist`
publish directory. Link the project to a Netlify site, then deploy with the
Netlify CLI or connect the repository for continuous deployment:

```powershell
npx netlify-cli@latest login
npx netlify-cli@latest link
npx netlify-cli@latest deploy --build
npx netlify-cli@latest deploy --build --prod
```

The build and server runtime require Node.js 24 or later. Set the Netlify
environment variable `FRONTEND_ORIGINS` to a comma-separated list of the exact
HTTPS origins that should be allowed to connect, including the production site
and any deploy-preview origins you intend to use. For example:

```text
https://your-game.netlify.app,https://game.example.com
```

Leave `VITE_SERVER_URL` unset for Netlify deployments so the game connects to
the same origin that serves its frontend. For standalone Vite development,
`LanClient` uses port 3000 by default; set `VITE_SERVER_URL` if your backend is
at a different address.

## Multiplayer state and scaling

Matchmaking, player connections, and active projectiles are stored in memory
inside one server instance. This preserves the existing implementation and
works for initial low-volume evaluation on a single Netlify Server instance.
State is lost when the instance is replaced, and multiple instances do not
share matchmaking state. Use shared storage and a Socket.IO adapter before
scaling multiplayer across instances.

## Game code

The combat scene is `src/scenes/MatchScene.js`; sprite animation and hitboxes
live in `src/entities/SpriteFighter.js`, and bot behavior lives in
`src/entities/BotAI.js`. Shared character and firework data is in
`src/data/catalog.js`. Map definitions live in `src/maps/`.

See [the gameplay and code guide](./docs/GAMEPLAY_GUIDE.md) for scene
responsibilities, controls, combat rules, and ability modules.
