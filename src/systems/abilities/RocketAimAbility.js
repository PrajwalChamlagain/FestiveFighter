import { ABILITIES } from "../../data/abilities.js";
import { WEAPON_PHYSICS } from "../../data/catalog.js";

export default class RocketAimAbility {
  constructor(scene) {
    this.scene = scene;
    this.isAiming = false;
    this.source = null;
    this.currentShot = null;
    this.graphics = null;
    this.preview = null;
  }

  begin(source = "keyboard") {
    const scene = this.scene;
    const data = WEAPON_PHYSICS[scene.weapon.id];

    if (
      this.isAiming ||
      !data?.aimRange ||
      scene.playerHealth <= 0 ||
      scene.playerFighter.isActing
    ) {
      return false;
    }

    const remaining = scene.throwReadyAt - scene.time.now;
    if (remaining > 0) {
      scene.showMessage(`ROCKET RECHARGING · ${(remaining / 1000).toFixed(1)}s`);
      return false;
    }

    this.isAiming = true;
    this.source = source;
    this.graphics = scene.add.graphics().setDepth(34);
    this.preview = scene.add.image(0, 0, "diwali_rocket_big")
      .setDisplaySize(ABILITIES.rocketAim.displaySize, ABILITIES.rocketAim.displaySize)
      .setDepth(35);
    scene.showMessage("AIM WITH MOUSE · RELEASE F OR CLICK TO LAUNCH");
    this.update(scene.input.activePointer);
    return true;
  }

  update(pointer) {
    if (!this.isAiming) return;

    const scene = this.scene;
    const data = WEAPON_PHYSICS[scene.weapon.id];
    if (!data) return;

    const originX = scene.playerState.x;
    const originY = scene.playerState.y - 96 * scene.fighterScale;
    const pointerX = Number.isFinite(pointer?.worldX) ? pointer.worldX : pointer?.x ?? originX;
    const pointerY = Number.isFinite(pointer?.worldY) ? pointer.worldY : pointer?.y ?? originY;
    const dx = pointerX - originX;
    const dy = pointerY - originY;
    const distance = Math.hypot(dx, dy) || 1;
    const aimDistance = Math.min(distance, data.aimRange);
    const directionX = dx / distance;
    const directionY = dy / distance;
    const speed = data.aimMinSpeed +
      aimDistance / data.aimRange * (data.aimMaxSpeed - data.aimMinSpeed);
    const velocityX = directionX * speed;
    const velocityY = directionY * speed;
    const targetX = originX + directionX * aimDistance;
    const targetY = originY + directionY * aimDistance;

    this.currentShot = { originX, originY, velocityX, velocityY };

    const graphics = this.graphics;
    graphics.clear();
    graphics.lineStyle(2, 0xffd166, 0.75);
    graphics.lineBetween(originX, originY, targetX, targetY);
    graphics.fillStyle(0xffd166, 0.95);
    graphics.fillCircle(targetX, targetY, 5);

    graphics.lineStyle(2, 0xffd166, 0.5);
    graphics.beginPath();
    graphics.moveTo(originX, originY);

    for (
      let t = ABILITIES.rocketAim.trajectoryStep;
      t <= data.fuse;
      t += ABILITIES.rocketAim.trajectoryStep
    ) {
      const x = originX + velocityX * t;
      const y = originY + velocityY * t + 0.5 * data.gravity * t ** 2;
      graphics.lineTo(x, y);
      if (x < 0 || x > scene.scale.width || y > scene.scale.height) break;
    }

    graphics.strokePath();
    this.preview
      .setPosition(originX, originY)
      .setRotation(Math.atan2(velocityY, velocityX) + ABILITIES.rocketAim.spriteForwardOffset);
  }

  launch() {
    if (!this.isAiming || !this.currentShot) return false;

    const shot = this.currentShot;
    this.clear();
    return this.scene.launchAimedRocket(shot);
  }

  cancel() {
    if (!this.isAiming) return false;
    this.clear();
    this.scene.showMessage("ROCKET AIM CANCELED");
    return true;
  }

  clear() {
    this.isAiming = false;
    this.source = null;
    this.currentShot = null;
    this.graphics?.destroy();
    this.preview?.destroy();
    this.graphics = null;
    this.preview = null;
  }

  destroy() {
    this.clear();
  }
}
