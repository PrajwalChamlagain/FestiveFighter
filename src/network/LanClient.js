import { io } from "socket.io-client";

function getServerUrl() {
  const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const hostname = window.location.hostname || "localhost";
  return `http://${hostname}:3000`;
}

export default class LanClient {
  constructor() {
    this.listeners = new Map();
    this.joinOnConnect = false;
    this.loadout = null;
    this.nextRequestId = 1;
    this.socket = io(getServerUrl(), {
      autoConnect: false,
      reconnection: false,
      timeout: 7000
    });

    this.socket.on("connect", () => {
      this.notify("connected");
      if (this.joinOnConnect) this.socket.emit("match:join", this.loadout);
    });
    this.socket.on("connect_error", error => {
      this.notify("connection-error", error);
    });
    this.socket.on("disconnect", reason => {
      this.notify("disconnected", reason);
    });
    this.socket.on("match:waiting", data => this.notify("waiting", data));
    this.socket.on("match:found", data => this.notify("match-found", data));
    this.socket.on("player:moved", data => this.notify("player-moved", data));
    this.socket.on("match:player-disconnected", data => {
      this.notify("opponent-disconnected", data);
    });
    this.socket.on("combat:attack-start", data => {
      this.notify("attack-start", data);
    });
    this.socket.on("combat:attack-result", data => {
      this.notify("attack-result", data);
    });
    this.socket.on("combat:health", data => {
      this.notify("health", data);
    });
    for (const eventName of ["projectile:launched", "projectile:impact", "projectile:destroyed", "projectile:deflected", "weapon:rejected", "parry:started", "parry:rejected", "match:error"]) {
      this.socket.on(eventName, data => this.notify(eventName, data));
    }
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.listeners.get(eventName)?.delete(handler);
  }

  notify(eventName, data) {
    for (const handler of this.listeners.get(eventName) || []) {
      handler(data);
    }
  }

  connectAndJoin(loadout) {
    this.loadout = loadout;
    this.joinOnConnect = true;
    this.socket.connect();
  }

  requestProjectile(type, details = {}) {
    if (!this.socket.connected) return null;
    const requestId = this.nextRequestId++;
    this.socket.emit("projectile:request", { requestId, type, ...details });
    return requestId;
  }

  requestDetonation(projectileId) {
    if (this.socket.connected) this.socket.emit("projectile:detonate", projectileId);
  }

  requestParry() {
    if (this.socket.connected) this.socket.emit("parry:request");
  }

  sendMovement(state) {
    if (this.socket.connected) this.socket.emit("player:move", state);
  }

  sendAttackStart(attack) {
    if (this.socket.connected) this.socket.emit("combat:attack-start", attack);
  }

  sendAttackResult(result) {
    if (this.socket.connected) this.socket.emit("combat:attack-result", result);
  }

  sendHealth(health) {
    if (this.socket.connected) this.socket.emit("combat:health", health);
  }

  get connected() {
    return this.socket.connected;
  }

  destroy() {
    this.joinOnConnect = false;
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.listeners.clear();
  }
}
