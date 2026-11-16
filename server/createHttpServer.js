const express = require("express");
const http = require("node:http");
const { Server } = require("socket.io");
const MatchManager = require("./matchManager");
const ProjectileManager = require("./projectileManager");
const combatRules = require("../shared/combatRules.json");

const frontendPort = process.env.FRONTEND_PORT || "5173";
const configuredOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

function isAllowedFrontendOrigin(origin) {
  if (configuredOrigins.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    const isLocalDevelopmentOrigin = parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    return isLocalDevelopmentOrigin ||
      (parsed.protocol === "http:" && parsed.port === frontendPort);
  } catch {
    return false;
  }
}

async function createHttpServer() {
  const app = express();
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        // Native clients and same-origin requests may omit Origin.
        if (!origin || isAllowedFrontendOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("This frontend origin is not allowed."));
      }
    }
  });

  const projectilePhysics = await import("../shared/projectilePhysics.mjs");
  const projectileManager = new ProjectileManager(io, combatRules, projectilePhysics);
  const matchManager = new MatchManager(io, projectileManager, combatRules);

  io.on("connection", socket => {
    socket.emit("connection:ready", { playerId: socket.id });

    socket.on("match:join", loadout => {
      matchManager.join(socket, loadout);
    });

    socket.on("player:move", state => {
      matchManager.relayMovement(socket, state);
    });

    socket.on("combat:attack-start", attack => {
      matchManager.relayCombat(socket, "attack-start", attack);
    });

    socket.on("combat:attack-result", result => {
      matchManager.relayCombat(socket, "attack-result", result);
    });

    socket.on("combat:health", health => {
      matchManager.relayHealth(socket, health);
    });

    socket.on("projectile:request", request => {
      matchManager.requestProjectile(socket, request);
    });

    socket.on("projectile:detonate", projectileId => {
      matchManager.requestDetonation(socket, projectileId);
    });

    socket.on("parry:request", () => {
      matchManager.requestParry(socket);
    });

    socket.on("disconnect", () => {
      matchManager.remove(socket);
    });
  });

  httpServer.once("close", () => projectileManager.close());
  return httpServer;
}

module.exports = createHttpServer;
