const MAX_ACTIVE_PROJECTILES = 64;
const MAX_REQUESTS_PER_WINDOW = 30;

class ProjectileManager {
  constructor(io, rules, physics) {
    this.io = io;
    this.rules = rules;
    this.physics = physics;
    this.matches = new Map();
    this.nextProjectileId = 1;
    this.lastTick = Date.now();
    this.accumulator = 0;
    this.timer = setInterval(() => this.tick(), 1000 / 60);
    this.timer.unref?.();
  }

  createMatch(matchId, playerRecords) {
    const players = new Map();
    const floorY = this.rules.arena.platforms[0].y;
    for (const [playerId, record] of playerRecords) {
      players.set(playerId, {
        id: playerId,
        slot: record.slot,
        loadout: record.loadout,
        health: this.rules.maxHealth,
        state: {
          x: record.slot === 0 ? 255 : 705,
          y: floorY,
          vx: 0,
          vy: 0,
          grounded: true,
          facing: record.slot === 0 ? 1 : -1,
          crouching: false
        },
        weaponReadyAt: 0,
        parryReadyAt: 0,
        parryUntil: 0,
        requestTimes: [],
        requestIds: new Set()
      });
    }
    this.matches.set(matchId, { players, projectiles: new Map() });
  }

  removeMatch(matchId) {
    this.matches.delete(matchId);
  }

  updatePlayerState(matchId, playerId, state) {
    const player = this.matches.get(matchId)?.players.get(playerId);
    if (!player) return;
    player.state = { ...player.state, ...state };
  }

  updatePlayerHealth(matchId, playerId, health) {
    const player = this.matches.get(matchId)?.players.get(playerId);
    if (!player || !Number.isInteger(health)) return;
    player.health = this.physics.clamp(health, 0, this.rules.maxHealth);
  }

  requestProjectile(matchId, playerId, request) {
    const match = this.matches.get(matchId);
    const player = match?.players.get(playerId);
    if (!player || !request || !Number.isSafeInteger(request.requestId) || request.requestId < 1) return;
    if (!this.allowRequest(player, request.requestId)) return;

    if (player.health <= 0) {
      this.reject(playerId, request.requestId, request.type, "player-defeated");
      return;
    }

    if (request.type !== "firework" && request.type !== "anar") {
      this.reject(playerId, request.requestId, request.type, "invalid-action");
      return;
    }

    const weaponId = player.loadout.weaponId;
    const data = this.rules.weapons[weaponId];
    if (!data || (request.weaponId && request.weaponId !== weaponId)) {
      this.reject(playerId, request.requestId, request.type, "weapon-unavailable");
      return;
    }
    if (Boolean(data.aimRange) !== (request.type === "anar")) {
      this.reject(playerId, request.requestId, request.type, "invalid-weapon-action");
      return;
    }
    const now = Date.now();
    if (now < player.weaponReadyAt) {
      this.reject(playerId, request.requestId, request.type, "cooldown");
      return;
    }
    if (match.projectiles.size >= MAX_ACTIVE_PROJECTILES) {
      this.reject(playerId, request.requestId, request.type, "projectile-limit");
      return;
    }

    const state = player.state;
    const direction = state.facing;
    let x;
    let y;
    let vx;
    let vy;
    let crouchedDrop = false;
    if (request.type === "anar") {
      const velocityX = request.velocityX;
      const velocityY = request.velocityY;
      if (!Number.isFinite(velocityX) || !Number.isFinite(velocityY)) {
        this.reject(playerId, request.requestId, request.type, "invalid-aim");
        return;
      }
      const speed = Math.hypot(velocityX, velocityY);
      if (speed < data.aimMinSpeed || speed > data.aimMaxSpeed) {
        this.reject(playerId, request.requestId, request.type, "aim-out-of-range");
        return;
      }
      x = state.x;
      y = state.y - 96 * this.rules.arena.fighterScale;
      const requestedX = Number.isFinite(request.originX) ? request.originX : x;
      const requestedY = Number.isFinite(request.originY) ? request.originY : y;
      if (Math.hypot(requestedX - x, requestedY - y) > 32) {
        this.reject(playerId, request.requestId, request.type, "invalid-origin");
        return;
      }
      vx = velocityX;
      vy = velocityY;
    } else {
      crouchedDrop = state.crouching === true;
      x = state.x + direction * (crouchedDrop ? -55 : 37) * this.rules.arena.fighterScale;
      y = state.y - (crouchedDrop ? 28 : 105) * this.rules.arena.fighterScale;
      vx = crouchedDrop ? 0 : direction * data.speed;
      vy = crouchedDrop ? 180 : -135;
    }

    const projectile = {
      projectileId: `p-${this.nextProjectileId++}`,
      kind: "firework",
      weaponId,
      ownerId: playerId,
      x,
      y,
      vx,
      vy,
      gravity: data.gravity,
      age: 0,
      fuse: crouchedDrop ? Math.min(data.fuse, 0.5) : data.fuse,
      damage: data.damage,
      radius: data.radius,
      selfDamage: playerId === player.id ? data.selfDamage : 0,
      selfBoost: data.selfBoost,
      selfKnockback: data.selfKnockback,
      enemyKnockback: data.enemyKnockback,
      enemyLift: data.enemyLift,
      acceleration: crouchedDrop ? 0 : data.acceleration || 0,
      maxSpeed: data.maxSpeed || data.speed,
      bounces: 0,
      color: data.color,
      spriteKey: data.spriteKey || null,
      spriteSize: data.spriteSize || null,
      canManualDetonate: request.type === "firework",
      requestId: request.requestId,
      createdAt: Date.now()
    };
    match.projectiles.set(projectile.projectileId, projectile);

    const cooldownMs = data.cooldown;
    player.weaponReadyAt = Date.now() + cooldownMs;
    const recoilX = request.type === "anar" || crouchedDrop ? 0 : -direction * data.recoil;
    const recoilY = request.type === "anar" || crouchedDrop ? 0 : -data.upwardRecoil;
    player.state.vx += recoilX;
    player.state.vy += recoilY;
    if (player.state.vy < 0) player.state.grounded = false;

    this.io.to(matchId).emit("projectile:launched", {
      ...projectile,
      crouchedDrop,
      cooldownMs,
      recoilX,
      recoilY,
      serverTime: projectile.createdAt
    });
  }

  requestDetonation(matchId, playerId, projectileId) {
    const match = this.matches.get(matchId);
    const projectile = match?.projectiles.get(projectileId);
    if (!projectile || projectile.kind !== "firework" ||
        projectile.ownerId !== playerId || !projectile.canManualDetonate) return;
    this.impactFirework(matchId, match, projectile, "manual");
  }

  requestParry(matchId, playerId) {
    const match = this.matches.get(matchId);
    const player = match?.players.get(playerId);
    if (!player || player.health <= 0) return;
    if (player.loadout.parryToolId !== "puja-thali") {
      this.io.to(playerId).emit("parry:rejected", { reason: "no-parry-tool" });
      return;
    }
    const now = Date.now();
    if (now < player.parryReadyAt) {
      this.io.to(playerId).emit("parry:rejected", { reason: "cooldown" });
      return;
    }

    const ability = this.rules.abilities.parry;
    player.parryUntil = now + ability.windowMs;
    player.parryReadyAt = now + ability.cooldownMs;
    this.io.to(matchId).emit("parry:started", {
      playerId,
      windowMs: ability.windowMs,
      cooldownMs: ability.cooldownMs,
      serverTime: now
    });
  }

  allowRequest(player, requestId) {
    const now = Date.now();
    player.requestTimes = player.requestTimes.filter(time => now - time < 1000);
    if (player.requestTimes.length >= MAX_REQUESTS_PER_WINDOW || player.requestIds.has(requestId)) {
      return false;
    }
    player.requestTimes.push(now);
    player.requestIds.add(requestId);
    if (player.requestIds.size > 128) {
      player.requestIds.delete(player.requestIds.values().next().value);
    }
    return true;
  }

  reject(playerId, requestId, type, reason) {
    this.io.to(playerId).emit("weapon:rejected", { requestId, type, reason });
  }

  tick() {
    const now = Date.now();
    const elapsed = Math.min(0.1, Math.max(0, now - this.lastTick) / 1000);
    this.lastTick = now;
    this.accumulator += elapsed;
    const step = this.physics.PROJECTILE_STEP_SECONDS;
    while (this.accumulator >= step) {
      for (const [matchId, match] of this.matches) {
        this.stepMatch(matchId, match, step, now);
      }
      this.accumulator -= step;
    }
  }

  stepMatch(matchId, match, dt, now) {
    for (const projectile of [...match.projectiles.values()]) {
      const reason = this.physics.advanceProjectile(
        projectile,
        dt,
        this.rules.arena.platforms,
        this.rules.arena
      );

      if (this.tryParry(matchId, match, projectile, now)) continue;

      const target = [...match.players.values()].find(player => player.id !== projectile.ownerId && player.health > 0);
      const hitTarget = target && this.physics.projectileTouchesFighter(
        projectile.x,
        projectile.y,
        target.state.x,
        target.state.y,
        this.rules.arena.fighterScale,
        projectile.spriteKey ? 13 : 7
      );

      if (hitTarget || reason === "fuse") {
        this.impactFirework(matchId, match, projectile, hitTarget ? "player" : "fuse");
      } else if (reason === "bounds") {
        this.destroyProjectile(matchId, match, projectile, "bounds");
      }
    }
  }

  tryParry(matchId, match, projectile, now) {
    for (const player of match.players.values()) {
      if (player.id === projectile.ownerId || now > player.parryUntil) continue;
      if (!this.physics.projectileTouchesFighter(
        projectile.x,
        projectile.y,
        player.state.x,
        player.state.y,
        this.rules.arena.fighterScale,
        this.rules.abilities.parry.contactRadius
      )) continue;

      projectile.ownerId = player.id;
      projectile.vx = -projectile.vx * 1.5;
      projectile.vy = -220;
      projectile.damage *= 1.5;
      projectile.color = 0xffe08a;
      projectile.selfDamage = 0;
      projectile.canManualDetonate = false;
      player.parryUntil = 0;
      this.io.to(matchId).emit("projectile:deflected", {
        projectileId: projectile.projectileId,
        ownerId: projectile.ownerId,
        x: projectile.x,
        y: projectile.y,
        vx: projectile.vx,
        vy: projectile.vy,
        damage: projectile.damage,
        color: projectile.color,
        serverTime: now
      });
      return true;
    }
    return false;
  }

  impactFirework(matchId, match, projectile, reason) {
    const outcomes = [];
    const multipliers = { head: 1.5, torso: 1, legs: 0.8 };
    const owner = match.players.get(projectile.ownerId);

    for (const player of match.players.values()) {
      if (player.id === projectile.ownerId || player.health <= 0) continue;
      const hit = this.physics.findExplosionHit(
        projectile.x,
        projectile.y,
        projectile.radius,
        player.state.x,
        player.state.y,
        this.rules.arena.fighterScale
      );
      if (!hit) continue;

      const damage = Math.round(projectile.damage * multipliers[hit.zone]);
      const direction = Math.sign(player.state.x - projectile.x) ||
        (owner && player.slot > owner.slot ? 1 : -1);
      outcomes.push(this.applyOutcome(player, damage, {
        vx: player.state.vx + direction * damage * projectile.enemyKnockback,
        vy: player.state.vy - damage * projectile.enemyLift
      }, hit.zone));
    }

    if (owner && projectile.selfBoost > 0 && projectile.selfDamage > 0 &&
        this.physics.projectileTouchesFighter(
          projectile.x,
          projectile.y,
          owner.state.x,
          owner.state.y,
          this.rules.arena.fighterScale,
          projectile.radius
        )) {
      const playerCenterY = owner.state.y - 90 * this.rules.arena.fighterScale;
      const distance = Math.hypot(projectile.x - owner.state.x, projectile.y - playerCenterY);
      const boost = this.physics.clamp(
        1 - distance / (projectile.radius + 150),
        0.2,
        1
      );
      const awayDirection = Math.sign(owner.state.x - projectile.x) || -owner.state.facing;
      const vx = this.physics.clamp(
        owner.state.vx + awayDirection * projectile.selfKnockback * boost,
        -760,
        760
      );
      const vy = Math.min(owner.state.vy, 0) - projectile.selfBoost * boost;
      outcomes.push(this.applyOutcome(owner, projectile.selfDamage, { vx, vy }, "self"));
    }

    this.emitImpact(matchId, match, projectile, reason, outcomes);
  }

  applyOutcome(player, damage, motion, zone) {
    player.health = Math.max(0, player.health - damage);
    player.state.vx = motion.vx;
    player.state.vy = motion.vy;
    player.state.grounded = false;
    return {
      playerId: player.id,
      health: player.health,
      damage,
      zone,
      x: player.state.x,
      y: player.state.y,
      vx: player.state.vx,
      vy: player.state.vy,
      grounded: false
    };
  }

  emitImpact(matchId, match, projectile, reason, outcomes) {
    match.projectiles.delete(projectile.projectileId);
    this.io.to(matchId).emit("projectile:impact", {
      projectileId: projectile.projectileId,
      kind: projectile.kind,
      weaponId: projectile.weaponId || null,
      ownerId: projectile.ownerId,
      reason,
      x: projectile.x,
      y: projectile.y,
      color: projectile.color,
      radius: projectile.radius || 0,
      outcomes,
      serverTime: Date.now()
    });
  }

  destroyProjectile(matchId, match, projectile, reason) {
    match.projectiles.delete(projectile.projectileId);
    this.io.to(matchId).emit("projectile:destroyed", {
      projectileId: projectile.projectileId,
      reason
    });
  }

  close() {
    clearInterval(this.timer);
    this.matches.clear();
  }
}

module.exports = ProjectileManager;
