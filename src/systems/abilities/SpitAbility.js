import { ABILITIES } from "../../data/abilities.js";

export default class SpitAbility {
  constructor(scene) {
    this.scene = scene;
    this.readyAt = 0;
    this.poseUntil = 0;
    this.shots = [];
  }

  fire() {
    const scene = this.scene;
    const now = scene.time.now;

    if (
      scene.playerHealth <= 0 ||
      scene.playerFighter.isActing ||
      now < this.readyAt
    ) {
      return false;
    }

    if (scene.mode === "lan") {
      scene.lanClient?.requestProjectile("spit");
      return true;
    }

    this.readyAt = now + ABILITIES.spit.cooldownMs;
    this.poseUntil = now + ABILITIES.spit.poseDurationMs;

    const direction = scene.playerFighter.facing;
    const x = scene.playerState.x + direction * 38;
    const y = scene.playerState.y - 100 * scene.fighterScale;
    const trail = scene.add.ellipse(x - direction * 8, y, 18, 8, 0x80b944, 0.28)
      .setDepth(14);
    const orb = scene.add.ellipse(x, y, 12, 8, 0xd7f5a1, 1)
      .setStrokeStyle(2, 0x669a37, 0.95)
      .setDepth(15);
    const shine = scene.add.circle(x - 2, y - 2, 2, 0xffffff, 0.9)
      .setDepth(16);

    this.shots.push({
      x,
      y,
      velocityX: direction * ABILITIES.spit.speed,
      age: 0,
      trail,
      orb,
      shine
    });

    scene.playerFighter.setPose("spit");
    scene.createHitEffect(x, y, 0xc3ee7a);
    return true;
  }

  update(dt) {
    const scene = this.scene;
    const remaining = [];

    for (const shot of this.shots) {
      if (shot.networked) {
        shot.age += dt;
        shot.x += shot.velocityX * dt;
        shot.trail.setPosition(shot.x - Math.sign(shot.velocityX) * 8, shot.y);
        shot.orb.setPosition(shot.x, shot.y);
        shot.shine.setPosition(shot.x - 2, shot.y - 2);
        remaining.push(shot);
        continue;
      }
      shot.age += dt;
      shot.x += shot.velocityX * dt;
      shot.trail.setPosition(shot.x - Math.sign(shot.velocityX) * 8, shot.y);
      shot.orb.setPosition(shot.x, shot.y);
      shot.shine.setPosition(shot.x - 2, shot.y - 2);

      if (
        scene.projectileTouchesFighter(
          shot.x,
          shot.y,
          scene.opponentFighter,
          ABILITIES.spit.hitRadius
        )
      ) {
        scene.damageDummy(ABILITIES.spit.damage);
        scene.dummyState.vx += Math.sign(shot.velocityX) * ABILITIES.spit.knockback;
        scene.dummyState.vy -= ABILITIES.spit.lift;
        scene.dummyState.grounded = false;
        scene.dummyStunnedUntil = scene.time.now + 300;
        scene.opponentFighter.reactToHit();
        scene.createHitEffect(shot.x, shot.y, 0xc3ee7a);
        scene.cameras.main.shake(65, 0.0035);
        scene.showMessage(`SPIT HIT · -${ABILITIES.spit.damage}`);
        this.destroyShot(shot);
        continue;
      }

      if (
        shot.age >= ABILITIES.spit.lifetimeSeconds ||
        shot.x < -30 ||
        shot.x > scene.scale.width + 30
      ) {
        this.destroyShot(shot);
        continue;
      }

      remaining.push(shot);
    }

    this.shots = remaining;
  }

  addNetworkShot(event, owner) {
    if (this.shots.some(shot => shot.projectileId === event.projectileId)) return;
    const direction = Math.sign(event.velocityX) || 1;
    const trail = this.scene.add.ellipse(event.x - direction * 8, event.y, 18, 8, 0x80b944, 0.28).setDepth(14);
    const orb = this.scene.add.ellipse(event.x, event.y, 12, 8, 0xd7f5a1, 1).setStrokeStyle(2, 0x669a37, 0.95).setDepth(15);
    const shine = this.scene.add.circle(event.x - 2, event.y - 2, 2, 0xffffff, 0.9).setDepth(16);
    this.shots.push({
      projectileId: event.projectileId, networked: true, owner,
      x: event.x, y: event.y, velocityX: event.velocityX,
      age: event.age || 0, trail, orb, shine
    });
    if (owner === "player") this.readyAt = this.scene.time.now + event.cooldownMs;
  }

  removeNetworkShot(projectileId) {
    const shot = this.shots.find(item => item.projectileId === projectileId);
    if (!shot) return;
    this.destroyShot(shot);
    this.shots = this.shots.filter(item => item !== shot);
  }

  clearNetworkShots() {
    const networked = this.shots.filter(shot => shot.networked);
    networked.forEach(shot => this.destroyShot(shot));
    this.shots = this.shots.filter(shot => !shot.networked);
  }

  destroyShot(shot) {
    shot.trail.destroy();
    shot.orb.destroy();
    shot.shine.destroy();
  }

  destroy() {
    this.shots.forEach(shot => this.destroyShot(shot));
    this.shots = [];
  }
}
