export default class AttackCooldown {
  constructor() {
    this.readyAt = 0;
  }

  isReady(now) {
    return now >= this.readyAt;
  }

  start(now, durationMs) {
    this.readyAt = now + durationMs;
  }
}
