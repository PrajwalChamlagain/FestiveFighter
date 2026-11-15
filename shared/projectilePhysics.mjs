export const PROJECTILE_STEP_SECONDS = 1 / 60;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function advanceProjectile(projectile, dt, platforms, bounds) {
  const previousY = projectile.y;
  projectile.age += dt;
  projectile.vy += projectile.gravity * dt;

  if (projectile.acceleration > 0) {
    const direction = Math.sign(projectile.vx);
    projectile.vx = direction * Math.min(
      projectile.maxSpeed,
      Math.abs(projectile.vx) + projectile.acceleration * dt
    );
  }

  projectile.x += projectile.vx * dt;
  projectile.y += projectile.vy * dt;

  const landingPlatform = platforms
    .filter(platform =>
      previousY <= platform.y - 10 &&
      projectile.y >= platform.y - 10 &&
      projectile.x >= platform.x &&
      projectile.x <= platform.x + platform.width
    )
    .sort((a, b) => a.y - b.y)[0];

  if (landingPlatform) {
    projectile.y = landingPlatform.y - 10;
    if (projectile.bounces < 1) {
      projectile.vy = -Math.abs(projectile.vy) * 0.3;
      projectile.vx *= 0.7;
      projectile.bounces++;
    } else {
      projectile.vy = 0;
      projectile.vx = 0;
    }
  }

  if (projectile.age >= projectile.fuse) return "fuse";
  if (
    projectile.x < -60 ||
    projectile.x > bounds.width + 60 ||
    projectile.y > bounds.height + 80
  ) {
    return "bounds";
  }
  return null;
}

export function advanceSpitProjectile(projectile, dt, bounds) {
  projectile.age += dt;
  projectile.x += projectile.velocityX * dt;
  if (projectile.age >= projectile.lifetime) return "fuse";
  if (projectile.x < -30 || projectile.x > bounds.width + 30) return "bounds";
  return null;
}

export function getFighterHurtboxes(x, y, scale) {
  const rect = (zone, offsetY, width, height) => ({
    zone,
    x: x - width * scale / 2,
    y: y + offsetY * scale - height * scale / 2,
    width: width * scale,
    height: height * scale
  });
  return [
    rect("head", -151, 31, 32),
    rect("torso", -96, 48, 62),
    rect("legs", -30, 45, 55)
  ];
}

export function projectileTouchesFighter(x, y, fighterX, fighterY, scale, radius) {
  return getFighterHurtboxes(fighterX, fighterY, scale).some(box => {
    const nearestX = clamp(x, box.x, box.x + box.width);
    const nearestY = clamp(y, box.y, box.y + box.height);
    return Math.hypot(x - nearestX, y - nearestY) <= radius;
  });
}

export function findExplosionHit(x, y, radius, fighterX, fighterY, scale) {
  let bestHit = null;
  for (const box of getFighterHurtboxes(fighterX, fighterY, scale)) {
    const nearestX = clamp(x, box.x, box.x + box.width);
    const nearestY = clamp(y, box.y, box.y + box.height);
    const distance = Math.hypot(x - nearestX, y - nearestY);
    if (distance <= radius && (!bestHit || distance < bestHit.distance)) {
      bestHit = { zone: box.zone, distance };
    }
  }
  return bestHit;
}
