
import Phaser from "phaser";
import fallbackMapUrl from "../assets/images/1.png?url";
import PolygonFighter from "../entities/PolygonFighter.js";
import BotAI from "../entities/BotAI.js";

// =============================================
// RANDOM MAP DATABASE
// =============================================

const discoveredMaps = import.meta.glob(
  "../assets/images/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    query: "?url",
    import: "default"
  }
);

const MAPS = Object.entries(discoveredMaps).map(
  ([path, url], index) => ({
    key: `fight-map-${index}`,
    url,
    name: path.split("/").pop().replace(/\.[^.]+$/, "").toUpperCase()
  })
);

if (MAPS.length === 0) {
  MAPS.push({
    key: "fight-map-default",
    url: fallbackMapUrl,
    name: "DIWALI ARENA"
  });
}


// =============================================
// DUMMY CHARACTER
// =============================================

const BOT_CHARACTERS = [
  {
    id: "sunfire",
    name: "AGNI RIVAL",
    team: "ARENA RIVAL",
    colors: {
      body: 0xb94f27,
      dark: 0x5b241c,
      gloves: 0xf0bd54,
      skin: 0xd09b78,
      hair: 0x2a1812
    }
  },
  {
    id: "shadow",
    name: "NIGHT RIVAL",
    team: "ARENA RIVAL",
    colors: {
      body: 0x39435f,
      dark: 0x1b2237,
      gloves: 0x8e63c7,
      skin: 0xb98262,
      hair: 0x17151e
    }
  },
  {
    id: "royal",
    name: "ROYAL RIVAL",
    team: "ARENA RIVAL",
    colors: {
      body: 0x763e9f,
      dark: 0x39204d,
      gloves: 0xe7b83f,
      skin: 0xc58c69,
      hair: 0x302019
    }
  }
];

const BOT_PARRY_TOOLS = [
  null,
  {
    id: "puja-thali",
    name: "BRASS PUJA THALI"
  }
];

const MAX_HEALTH = 150;
const PARRY_WINDOW_MS = 80;
const PARRY_CONTACT_RADIUS = 7;

const WEAPON_NAMES = {
  sutli: "SUTLI BOMB",
  firecracker: "FIRECRACKER",
  anar: "ANAR ROCKET",
  chakri: "CHAKRI"
};


// =============================================
// WEAPON PHYSICS
// =============================================

const WEAPON_PHYSICS = {
  sutli: {
    speed: 390,
    fuse: 1.45,
    damage: 24,
    radius: 85,
    selfDamage: 3,
    selfBoost: 650,
    selfKnockback: 240,
    enemyKnockback: 9,
    enemyLift: 2.8,
    recoil: 230,
    upwardRecoil: 110,
    gravity: 380,
    color: 0xff6a21
  },

  firecracker: {
    speed: 205,
    acceleration: 720,
    maxSpeed: 650,
    fuse: 0.85,
    damage: 5,
    radius: 185,
    selfDamage: 1,
    selfBoost: 1150,
    selfKnockback: 620,
    enemyKnockback: 3.5,
    enemyLift: 0.8,
    recoil: 100,
    upwardRecoil: 40,
    gravity: 470,
    color: 0xffd23f
  },

  anar: {
    speed: 175,
    fuse: 1.05,
    damage: 8,
    radius: 145,
    selfDamage: 1,
    selfBoost: 900,
    selfKnockback: 340,
    enemyKnockback: 3.8,
    enemyLift: 0.9,
    recoil: 75,
    upwardRecoil: 30,
    gravity: 520,
    color: 0xff414d
  },

  chakri: {
    speed: 300,
    fuse: 0.72,
    damage: 4,
    radius: 115,
    selfDamage: 1,
    selfBoost: 820,
    selfKnockback: 310,
    enemyKnockback: 3,
    enemyLift: 0.7,
    recoil: 60,
    upwardRecoil: 20,
    gravity: 350,
    color: 0x54d8cb
  }
};


// =============================================
// MAIN FIGHT SCENE
// =============================================

export default class FightScene extends Phaser.Scene {
  constructor() {
    super("FightScene");
  }

  init(data) {
    this.playerData = data.character || null;
    this.weapon = data.weapon || null;
    this.parryTool = data.parryTool || null;

    this.mode = data.mode || "bot";

    this.playerHealth = MAX_HEALTH;
    this.dummyHealth = MAX_HEALTH;

    this.projectiles = [];

    this.gravity = 1550;
    this.moveSpeed = 330;
    this.jumpVelocity = -720;
    this.actionSpeed = 0.96;

    // Smaller characters
    this.fighterScale = 0.72;

    // Ground baseline
    this.floorY = 422;

    // Cooldowns
    this.throwCooldown = 3000;
    this.throwReadyAt = 0;
    this.botThrowReadyAt = 0;
    this.botMobilityReadyAt = 0;
    this.botThrowPoseUntil = 0;
    this.botParryUntil = 0;
    this.botParryCooldownUntil = 0;

    this.specialCooldown = 3400;
    this.specialReadyAt = 0;
    this.parryCooldown = 1200;

    // Parry timing
    this.parryUntil = 0;
    this.parryCooldownUntil = 0;

    this.dummyStunnedUntil = 0;

    this.playerState = {
      x: 255,
      y: this.floorY,
      vx: 0,
      vy: 0,
      grounded: true
    };

    this.dummyState = {
      x: 705,
      y: this.floorY,
      vx: 0,
      vy: 0,
      grounded: true
    };

    this.touch = {
      left: false,
      right: false,
      crouch: false,
      block: false
    };

    this.debugHitboxes = false;
  }

  // ==========================================
  // LOAD RANDOM MAP
  // ==========================================

  preload() {
    this.selectedMap = Phaser.Utils.Array.GetRandom(MAPS);

    MAPS.forEach(map => {
      this.load.image(map.key, map.url);
    });
  }

  // ==========================================
  // CREATE MATCH
  // ==========================================

  create() {
    const { width, height } = this.scale;

    // Fight background
    const bg = this.add.image(
      width / 2,
      height / 2,
      this.selectedMap.key
    );

    const bgScale = Math.max(
      width / bg.width,
      height / bg.height
    );

    bg.setScale(bgScale);
    bg.setDepth(-100);

    // Atmospheric tint
    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x08040c,
      0.12
    ).setDepth(-90);

    // World
    this.createFloor();

    // Fighters
    this.playerFighter = new PolygonFighter(
      this,
      this.playerState.x,
      this.floorY,
      this.playerData || BOT_CHARACTERS[0],
      this.weapon,
      this.parryTool
    );

    this.playerFighter.setScale(this.fighterScale);
    this.playerFighter.setFacing(1);
    this.playerFighter.setDepth(10);

    this.botCharacter = Phaser.Utils.Array.GetRandom(BOT_CHARACTERS);
    this.botWeapon = Phaser.Utils.Array.GetRandom(
      Object.keys(WEAPON_PHYSICS).map(id => ({
        id,
        name: WEAPON_NAMES[id]
      }))
    );
    this.botParryTool = Phaser.Utils.Array.GetRandom(BOT_PARRY_TOOLS);

    this.opponentFighter = new PolygonFighter(
      this,
      this.dummyState.x,
      this.floorY,
      this.botCharacter,
      this.botWeapon,
      this.botParryTool
    );

    this.opponentFighter.setScale(this.fighterScale);
    this.opponentFighter.setFacing(-1);
    this.opponentFighter.setDepth(10);
    this.botAI = new BotAI(this);

    // UI
    this.createHealthUI();
    this.createNavigation();
    this.createBottomHUD();

    // Input
    this.createKeyboardControls();
    this.createTouchControls();

    // Debug hitboxes
    this.debugGraphics = this.add.graphics().setDepth(50);

    this.debugKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.F1
    );

    this.events.once("shutdown", this.cleanup, this);

    this.showMessage("FIGHT!");
  }

  // ==========================================
  // FLOOR / COMBAT PLATFORM
  // ==========================================

  createFloor() {
    const { width, height } = this.scale;
    const y = this.floorY;

    const floor = this.add.graphics();

    // Dark arena floor
    floor.fillGradientStyle(
      0x38262d,
      0x38262d,
      0x130d18,
      0x130d18,
      0.98
    );

    floor.fillRect(0, y, width, height - y);

    // Raised floor edge
    floor.fillStyle(0x805037);
    floor.fillRect(0, y, width, 9);

    floor.lineStyle(2, 0xe1b66c, 0.9);
    floor.lineBetween(0, y, width, y);

    // Tile patterns
    floor.lineStyle(1, 0xc08b65, 0.17);

    for (let x = 0; x <= width; x += 80) {
      floor.lineBetween(
        x, y + 9,
        x + 32, height
      );
    }

    for (let row = 0; row < 3; row++) {
      floor.lineStyle(1, 0xb58a63, 0.12);

      floor.lineBetween(
        0,
        y + 35 + row * 30,
        width,
        y + 35 + row * 30
      );
    }

    // Golden decorative lights
    for (let x = 35; x < width; x += 85) {
      floor.fillStyle(0xffc05d, 0.75);
      floor.fillCircle(x, y + 4, 3);

      floor.fillStyle(0xffa32b, 0.13);
      floor.fillCircle(x, y + 4, 11);
    }

    floor.setDepth(2);

    // Dynamic fighter shadows
    this.playerShadow = this.add.ellipse(
      this.playerState.x,
      y - 2,
      85,
      14,
      0x000000,
      0.38
    ).setDepth(4);

    this.dummyShadow = this.add.ellipse(
      this.dummyState.x,
      y - 2,
      85,
      14,
      0x000000,
      0.38
    ).setDepth(4);
  }

  // ==========================================
  // HEALTH BAR UI
  // ==========================================

  createHealthUI() {
    const { width } = this.scale;

    this.healthBackgrounds = this.add.graphics();
    this.playerHealthGraphics = this.add.graphics();
    this.dummyHealthGraphics = this.add.graphics();

    // Player panel
    this.healthBackgrounds.fillStyle(0x170f19, 0.92);
    this.healthBackgrounds.fillRoundedRect(
      24, 19, 354, 57, 8
    );

    this.healthBackgrounds.lineStyle(1.5, 0xc69b57, 0.8);
    this.healthBackgrounds.strokeRoundedRect(
      24, 19, 354, 57, 8
    );

    // Dummy panel
    this.healthBackgrounds.fillStyle(0x170f19, 0.92);
    this.healthBackgrounds.fillRoundedRect(
      582, 19, 354, 57, 8
    );

    this.healthBackgrounds.lineStyle(1.5, 0xa16a6a, 0.8);
    this.healthBackgrounds.strokeRoundedRect(
      582, 19, 354, 57, 8
    );

    this.healthBackgrounds.fillStyle(0x241925, 0.98);
    this.healthBackgrounds.fillRoundedRect(
      width / 2 - 59, 22, 118, 51, 10
    );
    this.healthBackgrounds.lineStyle(1.5, 0xd1a75f, 0.9);
    this.healthBackgrounds.strokeRoundedRect(
      width / 2 - 59, 22, 118, 51, 10
    );

    this.add.text(
      width / 2,
      32,
      "ARENA · 01",
      {
        fontSize: "8px",
        color: "#d8bd91",
        fontStyle: "bold",
        letterSpacing: 1
      }
    ).setOrigin(0.5).setDepth(30);

    this.add.text(
      width / 2,
      52,
      "VS",
      {
        fontSize: "18px",
        color: "#fff0d4",
        fontStyle: "bold italic",
        stroke: "#70451f",
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(30);

    this.add.text(
      40, 28,
      this.playerData?.name || "PLAYER",
      {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffdda1"
      }
    ).setDepth(30);

    this.add.text(
      926, 28,
      this.botCharacter.name,
      {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#f0dede"
      }
    ).setOrigin(1, 0).setDepth(30);

    this.add.text(
      926,
      46,
      `${this.botWeapon.name}${this.botParryTool ? " · THALI" : ""}`,
      {
        fontSize: "8px",
        color: "#d8bd91",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(30);

    this.playerHPText = this.add.text(
      360, 29, "100",
      {
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(30);

    this.dummyHPText = this.add.text(
      596, 29, "100",
      {
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setDepth(30);

    this.drawHealth();
  }

  drawOneHealthBar(graphics, x, y, width, health, color) {
    graphics.clear();

    graphics.fillStyle(0x08070d, 0.95);
    graphics.fillRoundedRect(x, y, width, 13, 3);

    graphics.fillStyle(0x423340);
    graphics.fillRoundedRect(x + 2, y + 2, width - 4, 9, 2);

    const amount = (width - 4) * health / MAX_HEALTH;

    if (amount > 0) {
      graphics.fillStyle(color);
      graphics.fillRoundedRect(x + 2, y + 2, amount, 9, 2);
    }
  }

  drawHealth() {
    this.drawOneHealthBar(
      this.playerHealthGraphics,
      40, 52, 315,
      this.playerHealth,
      0xeeb74f
    );

    this.drawOneHealthBar(
      this.dummyHealthGraphics,
      605, 52, 315,
      this.dummyHealth,
      0xd85d65
    );

    this.playerHPText.setText(`${Math.ceil(this.playerHealth)}/${MAX_HEALTH}`);
    this.dummyHPText.setText(`${Math.ceil(this.dummyHealth)}/${MAX_HEALTH}`);
  }

  damageDummy(amount) {
    if (this.dummyHealth <= 0) return;

    this.dummyHealth = Math.max(
      0,
      this.dummyHealth - amount
    );

    this.drawHealth();

    if (this.dummyHealth === 0 && !this.knockoutText) {
      this.knockoutText = this.add.text(
        480, 160,
        "KNOCKOUT!",
        {
          fontSize: "48px",
          fontStyle: "bold italic",
          color: "#ffce73",
          stroke: "#57220e",
          strokeThickness: 6
        }
      ).setOrigin(0.5).setDepth(60);
    }
  }

  // Ready for future opponent melee attacks.
  receivePlayerDamage(amount) {
    const crouching =
      this.keys?.crouch.isDown ||
      this.touch.crouch;

    if (crouching) {
      this.showMessage("MELEE BLOCKED!");
      return 0;
    }

    this.playerHealth = Math.max(
      0,
      this.playerHealth - amount
    );

    this.drawHealth();

    return amount;
  }

  damagePlayer(amount) {
    const previousHealth = this.playerHealth;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.drawHealth();

    if (this.playerHealth === 0 && !this.knockoutText) {
      this.knockoutText = this.add.text(
        480, 160,
        "DEFEATED",
        {
          fontSize: "48px",
          fontStyle: "bold italic",
          color: "#ffce73",
          stroke: "#57220e",
          strokeThickness: 6
        }
      ).setOrigin(0.5).setDepth(60);
    }

    return previousHealth - this.playerHealth;
  }

  // ==========================================
  // BOTTOM COMBAT HUD
  // ==========================================

  createBottomHUD() {
    const { width, height } = this.scale;

    const panel = this.add.graphics();

    panel.fillStyle(0x100b16, 0.94);
    panel.fillRect(0, height - 70, width, 70);

    panel.lineStyle(2, 0xb58a53, 0.8);
    panel.lineBetween(
      0,
      height - 70,
      width,
      height - 70
    );

    panel.setDepth(30);

    this.add.text(
      22,
      height - 48,
      "MOVE   A / D",
      {
        fontSize: "10px",
        color: "#e5c99f",
        fontStyle: "bold"
      }
    ).setDepth(31);

    this.add.text(
      150,
      height - 48,
      "JUMP   W",
      {
        fontSize: "10px",
        color: "#e5c99f",
        fontStyle: "bold"
      }
    ).setDepth(31);

    this.add.text(
      260,
      height - 48,
      "CROUCH / BLOCK   S",
      {
        fontSize: "10px",
        color: "#e5c99f",
        fontStyle: "bold"
      }
    ).setDepth(31);

    this.add.text(
      455,
      height - 48,
      "PUNCH   J",
      {
        fontSize: "10px",
        color: "#e5c99f",
        fontStyle: "bold"
      }
    ).setDepth(31);

    this.add.text(
      555,
      height - 48,
      "KICK / SWEEP   K",
      {
        fontSize: "10px",
        color: "#e5c99f",
        fontStyle: "bold"
      }
    ).setDepth(31);

    // Circular throw cooldown indicator
    this.throwRingX = 915;
    this.throwRingY = height - 39;

    this.throwCooldownGraphics = this.add.graphics()
      .setDepth(35);

    this.throwRingText = this.add.text(
      this.throwRingX,
      this.throwRingY,
      "F",
      {
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(36);

    this.throwCooldownText = this.add.text(
      this.throwRingX,
      height - 9,
      "READY",
      {
        fontSize: "8px",
        color: "#8fcfff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(36);

    this.throwButton = this.add.circle(
      this.throwRingX,
      this.throwRingY,
      26,
      0x000000,
      0
    ).setInteractive({ useHandCursor: true })
      .setDepth(37);

    this.throwButton.on("pointerdown", () => {
      this.throwProjectile();
    });

    this.drawThrowCooldown();
    this.specialButton = this.createCooldownButton(
      740,
      "E",
      "SPECIAL",
      () => this.activateSpecial(this.time.now)
    );
    this.parryButton = this.createCooldownButton(
      825,
      "R",
      "PARRY",
      () => this.beginParry(this.time.now)
    );
    this.drawAbilityCooldown(
      this.specialButton,
      this.specialReadyAt,
      this.specialCooldown
    );
    this.drawAbilityCooldown(
      this.parryButton,
      this.parryCooldownUntil,
      this.parryCooldown,
      this.parryTool?.id === "puja-thali",
      "NO THALI"
    );
  }

  createCooldownButton(x, label, title, action) {
    const y = this.scale.height - 39;
    const graphics = this.add.graphics().setDepth(35);
    const glyph = this.add.text(x, y, label, {
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(36);
    const status = this.add.text(x, y + 30, "READY", {
      fontSize: "8px",
      color: "#8fcfff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(36);
    const button = this.add.circle(x, y, 26, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(37);

    button.on("pointerdown", action);

    return { x, y, title, graphics, glyph, status };
  }

  drawAbilityCooldown(button, readyAt, cooldown, available = true, unavailableText = "LOCKED") {
    const remaining = Math.max(0, readyAt - this.time.now);
    const ready = available && remaining === 0;
    const progress = readyAt === 0 || ready
      ? 1
      : 1 - remaining / cooldown;
    const graphics = button.graphics;

    graphics.clear();
    graphics.fillStyle(!available ? 0x535660 : ready ? 0x176fba : 0x535660);
    graphics.fillCircle(button.x, button.y, 19);
    graphics.lineStyle(2.5, !available ? 0x747681 : ready ? 0x71c7ff : 0x858995);
    graphics.strokeCircle(button.x, button.y, 21);
    graphics.lineStyle(3, ready ? 0x81d3ff : 0xf3c56c);
    graphics.beginPath();
    graphics.arc(
      button.x,
      button.y,
      25,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Phaser.Math.Clamp(progress, 0, 1),
      false
    );
    graphics.strokePath();

    button.glyph.setColor(available ? (ready ? "#ffffff" : "#d4d5dc") : "#aaa8b0");
    button.status.setText(
      !available
        ? unavailableText
        : ready
          ? `${button.title} READY`
          : `${button.title} ${(remaining / 1000).toFixed(1)}s`
    );
    button.status.setColor(
      !available ? "#aaa8b0" : ready ? "#8fcfff" : "#b8bac3"
    );
  }

  // ==========================================
  // CIRCULAR FIRECRACKER COOLDOWN
  // Blue = ready; grey = cooling down.
  // Gold ring = recharge progress.
  // ==========================================

  drawThrowCooldown() {
    if (!this.throwCooldownGraphics) return;

    const now = this.time.now;
    const armed = this.getArmedProjectile();
    const remaining = Math.max(
      0,
      this.throwReadyAt - now
    );

    const ready = remaining <= 0;

    const fuseRemaining = armed
      ? Math.max(0, armed.fuse - armed.age)
      : 0;

    const progress = armed
      ? 1 - fuseRemaining / armed.fuse
      : ready
        ? 1
        : 1 - remaining / this.throwCooldown;

    const g = this.throwCooldownGraphics;

    g.clear();

    // Main circle
    g.fillStyle(
      armed ? 0x9f252c : ready ? 0x176fba : 0x535660,
      1
    );

    g.fillCircle(
      this.throwRingX,
      this.throwRingY,
      19
    );

    // Outer outline
    g.lineStyle(
      2.5,
      armed ? 0xff6961 : ready ? 0x71c7ff : 0x858995,
      1
    );

    g.strokeCircle(
      this.throwRingX,
      this.throwRingY,
      21
    );

    // The red fuse arc counts down; otherwise the gold ring tracks recharge.
    if (armed || !ready) {
      g.lineStyle(3, 0xf3c56c, 1);

      g.beginPath();

      g.arc(
        this.throwRingX,
        this.throwRingY,
        25,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
        false
      );

      g.strokePath();
    } else {
      g.lineStyle(2, 0x81d3ff, 1);
      g.strokeCircle(
        this.throwRingX,
        this.throwRingY,
        25
      );
    }

    this.throwRingText.setColor(
      armed || ready ? "#ffffff" : "#d4d5dc"
    );

    this.throwCooldownText.setText(
      armed
        ? `DETONATE ${fuseRemaining.toFixed(1)}s`
        : ready
          ? "READY"
          : `${(remaining / 1000).toFixed(1)}s`
    );

    this.throwCooldownText.setColor(
      armed ? "#ff8c83" : ready ? "#8fcfff" : "#b8bac3"
    );
  }

  // ==========================================
  // TOP NAVIGATION
  // ==========================================

  createNavigation() {
    const back = this.add.text(
      24,
      103,
      "← MENU",
      {
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#332034",
        padding: { x: 12, y: 7 }
      }
    ).setInteractive({ useHandCursor: true })
      .setDepth(40);

    back.on("pointerdown", () => {
      this.scene.start("MenuScene", {
        skipSplash: true
      });
    });

    const fullscreen = this.add.text(
      936,
      103,
      "⛶ FULLSCREEN",
      {
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#332034",
        padding: { x: 11, y: 7 }
      }
    ).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);

    fullscreen.on("pointerdown", () => {
      try {
        if (!this.scale.isFullscreen) {
          this.scale.startFullscreen();
        }
      } catch (error) {
        console.log("Fullscreen unavailable", error);
      }
    });
  }

  // ==========================================
  // KEYBOARD CONTROLS
  // ==========================================

  createKeyboardControls() {
    const codes = Phaser.Input.Keyboard.KeyCodes;

    this.keys = this.input.keyboard.addKeys({
      left: codes.A,
      right: codes.D,

      jump: codes.W,
      jumpAlt: codes.SPACE,

      crouch: codes.S,

      punch: codes.J,
      kick: codes.K,

      special: codes.E,
      throw: codes.F,
      parry: codes.R
    });
  }

  // ==========================================
  // MOVEMENT / INPUT
  // ==========================================

  isCrouching() {
    return Boolean(
      this.keys?.crouch.isDown ||
      this.touch.crouch
    );
  }

  isPlayerCrouching() {
    return this.isCrouching();
  }

  handleInput(time, dt) {
    const k = this.keys;
    const player = this.playerState;

    const left =
      k.left.isDown || this.touch.left;

    const right =
      k.right.isDown || this.touch.right;

    const crouching = this.isCrouching();

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(k.jump) ||
      Phaser.Input.Keyboard.JustDown(k.jumpAlt);

    // Jump
    if (
      jumpPressed &&
      player.grounded &&
      !this.playerFighter.isActing &&
      !crouching
    ) {
      player.vy = this.jumpVelocity;
      player.grounded = false;

      this.playerFighter.setPose("jump", 80);
    }

    // Direction
    let direction = 0;

    if (left) direction--;
    if (right) direction++;

    if (crouching && !this.playerFighter.isActing) {
      player.vx = Phaser.Math.Linear(
        player.vx,
        0,
        Math.min(1, 15 * dt)
      );

      if (player.grounded) {
        this.playerFighter.setPose("crouch", 80);
      }
    } else if (!this.playerFighter.isActing) {
      if (direction !== 0) {
        player.vx = Phaser.Math.Linear(
          player.vx,
          direction * this.moveSpeed,
          Math.min(1, 10 * dt)
        );

        this.playerFighter.setFacing(direction);

        if (player.grounded) {
          this.playerFighter.setPose("walk", 95);
        }
      } else {
        player.vx = Phaser.Math.Linear(
          player.vx,
          0,
          Math.min(1, 9 * dt)
        );

        if (player.grounded) {
          this.playerFighter.setPose("idle", 110);
        }
      }
    }

    // Punch
    if (Phaser.Input.Keyboard.JustDown(k.punch)) {
      this.startAttack("jab");
    }

    // Kick changes to sweep while crouching.
    if (Phaser.Input.Keyboard.JustDown(k.kick)) {
      this.startAttack(
        crouching ? "sweep" : "kick"
      );
    }

    // Signature move
    if (Phaser.Input.Keyboard.JustDown(k.special)) {
      this.activateSpecial(time);
    }

    // Firecracker
    if (Phaser.Input.Keyboard.JustDown(k.throw)) {
      this.throwProjectile();
    }

    // Brass thali
    if (Phaser.Input.Keyboard.JustDown(k.parry)) {
      this.beginParry(time);
    }

    this.tryReflectProjectiles(time);

    // Return from parry after its timing window.
    if (
      this.parryUntil > 0 &&
      time > this.parryUntil
    ) {
      this.parryUntil = 0;

      if (!this.playerFighter.isActing) {
        this.playerFighter.setPose(
          crouching ? "crouch" : "idle",
          100
        );
      }
    }
  }

  // ==========================================
  // ATTACKS
  // ==========================================

  startAttack(name) {
    if (
      this.playerFighter.isActing ||
      !this.playerState.grounded
    ) {
      return false;
    }

    return this.playerFighter.perform(name, {
      onImpact: move => this.resolveMelee(move)
    });
  }

  activateSpecial(time) {
    if (time < this.specialReadyAt) {
      this.showMessage("SPECIAL RECHARGING");
      return false;
    }

    if (!this.startAttack("special")) return false;

    this.specialReadyAt = time + this.specialCooldown;
    return true;
  }

  startBotAttack(name) {
    if (
      this.mode !== "bot" ||
      this.dummyHealth <= 0 ||
      this.playerHealth <= 0 ||
      this.opponentFighter.isActing ||
      !this.dummyState.grounded
    ) {
      return false;
    }

    return this.opponentFighter.perform(name, {
      onImpact: move => this.resolveBotMelee(move)
    });
  }

  resolveBotMelee(move) {
    const attackBox = this.opponentFighter.getAttackHitbox(move);
    const possibleHits = this.playerFighter
      .getHurtboxes()
      .filter(box =>
        move.targetZones.includes(box.zone) &&
        this.rectanglesOverlap(attackBox, box)
      );

    if (possibleHits.length === 0) return;

    const multipliers = {
      head: 1.5,
      torso: 1,
      legs: 0.8
    };

    possibleHits.sort(
      (a, b) => multipliers[b.zone] - multipliers[a.zone]
    );

    const hitZone = possibleHits[0].zone;
    const damage = Math.round(move.damage * multipliers[hitZone]);
    const blocked = this.isCrouching() && hitZone !== "legs";
    const actualDamage = blocked
      ? this.receivePlayerDamage(damage)
      : this.damagePlayer(damage);

    if (actualDamage <= 0) return;

    this.playerState.vx +=
      this.opponentFighter.facing * move.knockback;
    this.playerState.vy -= move.lift;
    this.playerState.grounded = false;
    this.playerFighter.reactToHit();

    this.cameras.main.shake(
      100,
      damage > 25 ? 0.007 : 0.003
    );

    this.createHitEffect(
      this.playerState.x,
      this.playerState.y - 100,
      hitZone === "head" ? 0xffe28a : 0xffa75d
    );

    this.showMessage(
      `${move.name} · ${hitZone.toUpperCase()} -${damage}`
    );
  }

  // ==========================================
  // RECTANGLE COLLISION
  // ==========================================

  rectanglesOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // ==========================================
  // BODY-PART HIT DETECTION
  // ==========================================

  resolveMelee(move) {
    const attackBox =
      this.playerFighter.getAttackHitbox(move);

    const hurtboxes =
      this.opponentFighter.getHurtboxes();

    const possibleHits = hurtboxes.filter(box => {
      return (
        move.targetZones.includes(box.zone) &&
        this.rectanglesOverlap(attackBox, box)
      );
    });

    if (possibleHits.length === 0) {
      this.showMessage("MISS");
      return;
    }

    // Choose the most damaging body part hit.
    const multipliers = {
      head: 1.5,
      torso: 1,
      legs: 0.8
    };

    possibleHits.sort(
      (a, b) =>
        multipliers[b.zone] - multipliers[a.zone]
    );

    const hitZone = possibleHits[0].zone;

    const damage = Math.round(
      move.damage * multipliers[hitZone]
    );

    this.damageDummy(damage);

    const dummy = this.dummyState;

    dummy.vx +=
      this.playerFighter.facing * move.knockback;

    dummy.vy -= move.lift;
    dummy.grounded = false;
    this.dummyStunnedUntil = this.time.now + 380;
    this.opponentFighter.reactToHit();

    this.cameras.main.shake(
      100,
      damage > 25 ? 0.007 : 0.003
    );

    this.createHitEffect(
      dummy.x,
      dummy.y - 110,
      hitZone === "head"
        ? 0xffe28a
        : 0xffa75d
    );

    this.showMessage(
      `${move.name} · ${hitZone.toUpperCase()} -${damage}`
    );

    // Store for optional F1 hitbox debugging.
    this.lastAttackBox = attackBox;
    this.lastAttackBoxUntil = this.time.now + 180;
  }

  // ==========================================
  // THROW FIRECRACKER
  // Strict three-second cooldown.
  // ==========================================

  throwProjectile() {
    const armed = this.getArmedProjectile();

    if (armed) {
      this.detonateProjectile(armed, true);
      return;
    }

    if (this.playerFighter.isActing) return;

    const now = this.time.now;

    if (now < this.throwReadyAt) {
      this.showMessage(
        `FIRECRACKER RECHARGING · ${((this.throwReadyAt - now) / 1000).toFixed(1)}s`
      );
      return;
    }

    const data = this.weapon && WEAPON_PHYSICS[this.weapon.id];

    if (!data) {
      this.showMessage("NO THROWABLE EQUIPPED");
      return;
    }

    this.throwReadyAt = now + this.throwCooldown;

    const direction = this.playerFighter.facing;
    const player = this.playerState;
    const throwDownward = this.isCrouching();
    const startX = player.x + direction * (
      throwDownward ? -55 : 37
    ) * this.fighterScale;
    const startY = player.y - (throwDownward ? 28 : 105) * this.fighterScale;

    const projectile = this.spawnProjectile(
      startX,
      startY,
      direction,
      data,
      "player",
      throwDownward ? 180 : -135,
      true,
      throwDownward
    );

    if (throwDownward) {
      projectile.vx = 0;
      projectile.acceleration = 0;
      projectile.fuse = Math.min(projectile.fuse, 0.5);
    }

    if (!throwDownward) {
      player.vx -= direction * data.recoil;
    }
    if (!throwDownward) player.vy -= data.upwardRecoil;

    if (player.vy < 0) {
      player.grounded = false;
    }

    this.playerFighter.setPose("throw", 85);

    this.createHitEffect(
      startX,
      startY,
      data.color
    );

    this.showMessage(
      `${this.weapon.name} ${throwDownward ? "DROPPED BELOW" : "PRIMED"} · F AGAIN TO DETONATE`
    );
  }

  spawnProjectile(
    x,
    y,
    direction,
    data,
    owner,
    velocityY,
    canManualDetonate = false,
    mobility = false
  ) {
    const projectile = this.add.container(x, y).setDepth(15);
    const shellColor = data.color;
    const glow = this.add.circle(0, 0, 16, shellColor, 0.3);
    const graphics = this.add.graphics();

    graphics.fillStyle(
      shellColor === 0xffd23f ? 0x681719 : 0x71310f
    );
    graphics.fillRoundedRect(-10, -7, 21, 14, 5);
    graphics.fillStyle(shellColor);
    graphics.fillRoundedRect(-8, -5, 17, 10, 4);
    graphics.fillStyle(0xffd166);
    graphics.fillRect(-6, -2, 12, 3);
    graphics.lineStyle(2, 0xffefba);
    graphics.lineBetween(8, -2, 14, -10);

    const ember = this.add.circle(14, -10, 3, 0xfff5c7, 1);
    projectile.add([glow, graphics, ember]);

    const state = {
      object: projectile,
      glow,
      ember,
      vx: direction * data.speed,
      vy: velocityY,
      gravity: data.gravity,
      age: 0,
      fuse: data.fuse,
      damage: data.damage,
      radius: data.radius,
      selfDamage: owner === "player" || mobility ? data.selfDamage : 0,
      selfBoost: owner === "player" || mobility ? data.selfBoost : 0,
      selfKnockback: owner === "player" || mobility ? data.selfKnockback : 0,
      enemyKnockback: data.enemyKnockback,
      enemyLift: data.enemyLift,
      acceleration: data.acceleration || 0,
      maxSpeed: data.maxSpeed || data.speed,
      bounces: 0,
      color: data.color,
      owner,
      canManualDetonate
    };

    this.projectiles.push(state);

    return state;
  }

  startBotProjectile() {
    if (
      this.mode !== "bot" ||
      this.dummyHealth <= 0 ||
      this.playerHealth <= 0 ||
      this.opponentFighter.isActing ||
      this.projectiles.some(projectile => projectile.owner === "cpu")
    ) {
      return false;
    }

    const data = WEAPON_PHYSICS[this.botWeapon.id];

    if (!data) return false;

    const bot = this.dummyState;
    const player = this.playerState;
    const direction = Math.sign(player.x - bot.x) || -1;
    const startX = bot.x + direction * 34;
    const startY = bot.y - 105 * this.fighterScale;
    const horizontalDistance = Math.abs(player.x - startX);
    const flightTime = data.acceleration
      ? (
          -data.speed +
          Math.sqrt(
            data.speed ** 2 +
            2 * data.acceleration * horizontalDistance
          )
        ) / data.acceleration
      : horizontalDistance / data.speed;
    const leadTime = Phaser.Math.Clamp(flightTime, 0.12, 1.1);
    const predictedY =
      player.y -
      92 * this.fighterScale +
      player.vy * leadTime * 0.35;
    const velocityY = Phaser.Math.Clamp(
      (predictedY - startY - 0.5 * data.gravity * leadTime ** 2) /
        leadTime,
      -450,
      300
    );

    this.spawnProjectile(
      startX,
      startY,
      direction,
      data,
      "cpu",
      velocityY
    );

    this.opponentFighter.setPose("throw", 90);
    this.botThrowPoseUntil = this.time.now + 220;
    this.createHitEffect(startX, startY, data.color);
    this.showMessage("RIVAL THREW A FIRECRACKER");

    return true;
  }

  startBotMobilityProjectile(direction) {
    if (
      this.mode !== "bot" ||
      this.botWeapon.id !== "firecracker" ||
      !this.dummyState.grounded ||
      this.opponentFighter.isActing ||
      this.time.now < this.botMobilityReadyAt ||
      this.projectiles.some(projectile => projectile.owner === "cpu")
    ) {
      return false;
    }

    const data = WEAPON_PHYSICS.firecracker;
    const bot = this.dummyState;
    const launchDirection = Math.sign(direction) || -this.opponentFighter.facing;
    const startX = bot.x - launchDirection * 55 * this.fighterScale;
    const startY = bot.y - 28 * this.fighterScale;
    const projectile = this.spawnProjectile(
      startX,
      startY,
      launchDirection,
      data,
      "cpu",
      150,
      false,
      true
    );

    projectile.vx = 0;
    projectile.acceleration = 0;
    projectile.fuse = 0.48;
    bot.vx = Phaser.Math.Clamp(
      bot.vx + launchDirection * 90,
      -760,
      760
    );
    this.botMobilityReadyAt = this.time.now + 4200;
    this.botThrowPoseUntil = this.time.now + 160;
    this.opponentFighter.setPose("throw", 85);
    this.createHitEffect(startX, startY, data.color);

    return true;
  }

  getArmedProjectile() {
    return this.projectiles.find(
      projectile =>
        projectile.owner === "player" &&
        projectile.canManualDetonate
    ) || null;
  }

  detonateProjectile(projectile, manual = false) {
    if (projectile.detonated) return;

    projectile.detonated = true;
    projectile.canManualDetonate = false;
    this.projectiles = this.projectiles.filter(
      activeProjectile => activeProjectile !== projectile
    );

    this.explodeProjectile(projectile, manual);
    projectile.object.destroy();
  }

  // ==========================================
  // PROJECTILE PHYSICS
  // ==========================================

  updateProjectiles(dt) {
    const remaining = [];

    for (const p of this.projectiles) {
      p.age += dt;

      p.vy += p.gravity * dt;

      if (p.acceleration > 0) {
        const direction = Math.sign(p.vx);
        p.vx = direction * Math.min(
          p.maxSpeed,
          Math.abs(p.vx) + p.acceleration * dt
        );
      }

      p.object.x += p.vx * dt;
      p.object.y += p.vy * dt;

      p.object.rotation += dt * 5;

      const fusePulse = (Math.sin(this.time.now * 0.025) + 1) / 2;
      p.glow?.setAlpha(0.2 + fusePulse * 0.55);
      p.ember?.setAlpha(0.45 + fusePulse * 0.55);
      p.ember?.setScale(0.8 + fusePulse * 0.65);

      // One bounce on the stage floor.
      if (p.object.y >= this.floorY - 10 && p.bounces < 1) {
        p.object.y = this.floorY - 10;
        p.vy = -Math.abs(p.vy) * 0.3;
        p.vx *= 0.7;
        p.bounces++;
      } else if (p.object.y >= this.floorY - 10) {
        p.object.y = this.floorY - 10;
        p.vy = 0;
        p.vx = 0;
      }

      const targetFighter = p.owner === "player"
        ? this.opponentFighter
        : p.owner === "cpu"
          ? this.playerFighter
          : null;

      const hitTarget =
        targetFighter &&
        this.projectileTouchesFighter(
          p.object.x,
          p.object.y,
          targetFighter,
          7
        );

      if (hitTarget || p.age >= p.fuse) {
        this.detonateProjectile(p);
        continue;
      }

      if (
        p.object.x < -60 ||
        p.object.x > this.scale.width + 60 ||
        p.object.y > this.scale.height + 80
      ) {
        p.object.destroy();
        continue;
      }

      remaining.push(p);
    }

    this.projectiles = remaining;
  }

  projectileTouchesFighter(x, y, fighter, radius) {
    const hurtboxes = fighter.getHurtboxes();

    return hurtboxes.some(box => {
      const closestX = Phaser.Math.Clamp(
        x,
        box.x,
        box.x + box.width
      );

      const closestY = Phaser.Math.Clamp(
        y,
        box.y,
        box.y + box.height
      );

      return Phaser.Math.Distance.Between(
        x, y, closestX, closestY
      ) <= radius;
    });
  }

  // ==========================================
  // EXPLOSIONS
  // ==========================================

  explodeProjectile(projectile, manual = false) {
    const x = projectile.object.x;
    const y = projectile.object.y;
    let impactMessage = "";

    const targetFighter = projectile.owner === "player"
      ? this.opponentFighter
      : projectile.owner === "cpu"
        ? this.playerFighter
        : null;
    const targetState = projectile.owner === "player"
      ? this.dummyState
      : this.playerState;

    if (targetFighter) {
      const multipliers = { head: 1.5, torso: 1, legs: 0.8 };
      let bestHit = null;

      for (const box of targetFighter.getHurtboxes()) {
        const nearestX = Phaser.Math.Clamp(x, box.x, box.x + box.width);
        const nearestY = Phaser.Math.Clamp(y, box.y, box.y + box.height);
        const distance = Phaser.Math.Distance.Between(x, y, nearestX, nearestY);

        if (
          distance <= projectile.radius &&
          (!bestHit || distance < bestHit.distance)
        ) {
          bestHit = { zone: box.zone, distance };
        }
      }

      if (bestHit) {
        const damage = Math.round(
          projectile.damage * multipliers[bestHit.zone]
        );

        if (projectile.owner === "player") {
          this.damageDummy(damage);
          this.dummyStunnedUntil = this.time.now + 380;
        } else {
          this.damagePlayer(damage);
        }

        const direction =
          Math.sign(targetState.x - x) ||
          (projectile.owner === "player" ? 1 : -1);

        targetState.vx +=
          direction * damage * projectile.enemyKnockback;
        targetState.vy -= damage * projectile.enemyLift;
        targetState.grounded = false;
        targetFighter.reactToHit();

        impactMessage =
          `EXPLOSION · ${bestHit.zone.toUpperCase()} -${damage}`;
      }
    }

    if (projectile.selfBoost > 0) {
      const ownerIsPlayer = projectile.owner === "player";
      const player = ownerIsPlayer ? this.playerState : this.dummyState;
      const fighter = ownerIsPlayer ? this.playerFighter : this.opponentFighter;

      if (
        projectile.selfDamage > 0 &&
        this.projectileTouchesFighter(
          x,
          y,
          fighter,
          projectile.radius
        )
      ) {
        const playerCenterY = player.y - 90 * this.fighterScale;
        const distance = Phaser.Math.Distance.Between(
          x,
          y,
          player.x,
          playerCenterY
        );
        const boost = Phaser.Math.Clamp(
          1 - distance / (projectile.radius + 150),
          0.2,
          1
        );
        const awayDirection =
          Math.sign(player.x - x) || -fighter.facing;

        if (ownerIsPlayer) {
          this.damagePlayer(projectile.selfDamage);
        } else {
          this.damageDummy(projectile.selfDamage);
        }
        player.vx = Phaser.Math.Clamp(
          player.vx + awayDirection * projectile.selfKnockback * boost,
          -760,
          760
        );
        player.vy = Math.min(player.vy, 0) - projectile.selfBoost * boost;
        player.grounded = false;

        impactMessage = impactMessage
          ? `${impactMessage} · SELF -${projectile.selfDamage} · BLAST HOP`
          : `${ownerIsPlayer ? "BLAST HOP" : "RIVAL BLAST HOP"} · SELF -${projectile.selfDamage}`;
      }
    }

    // Expanding explosion visual
    const blast = this.add.circle(
      x, y, 10,
      projectile.color,
      0.85
    ).setDepth(22);

    const inner = this.add.circle(
      x, y, 5,
      0xffedb0,
      0.95
    ).setDepth(23);

    this.tweens.add({
      targets: blast,
      scale: projectile.radius / 10,
      alpha: 0,
      duration: 270,
      onComplete: () => blast.destroy()
    });

    this.tweens.add({
      targets: inner,
      scale: 4,
      alpha: 0,
      duration: 170,
      onComplete: () => inner.destroy()
    });

    this.cameras.main.shake(90, 0.004);

    if (impactMessage) {
      this.showMessage(impactMessage);
    } else if (manual) {
      this.showMessage("REMOTE DETONATION");
    }
  }

  // ==========================================
  // PARRY
  // Only report success on a real reflection.
  // ==========================================

  beginParry(time) {
    if (this.playerFighter.isActing) return;

    if (this.parryTool?.id !== "puja-thali") {
      this.showMessage("NO PARRY EQUIPMENT");
      return;
    }

    if (time < this.parryCooldownUntil) {
      this.showMessage("PARRY RECHARGING");
      return;
    }

    this.parryUntil = time + PARRY_WINDOW_MS;
    this.parryCooldownUntil = time + this.parryCooldown;

    this.playerFighter.setPose("parry", 60);

    this.showMessage("PARRY! · PERFECT TIMING");
  }

  tryReflectProjectiles(time) {
    for (const p of this.projectiles) {
      const parriedByPlayer =
        p.owner === "cpu" &&
        time <= this.parryUntil &&
        this.projectileTouchesFighter(
          p.object.x,
          p.object.y,
          this.playerFighter,
          PARRY_CONTACT_RADIUS
        );

      const parriedByBot =
        p.owner === "player" &&
        this.botParryTool &&
        time <= this.botParryUntil &&
        this.projectileTouchesFighter(
          p.object.x,
          p.object.y,
          this.opponentFighter,
          PARRY_CONTACT_RADIUS
        );

      if (!parriedByPlayer && !parriedByBot) continue;

      p.owner = parriedByPlayer ? "player" : "cpu";
      p.vx = -p.vx * 1.5;
      p.vy = -220;
      p.damage *= 1.5;
      p.color = 0xffe08a;
      p.selfDamage = 0;
      p.botParryAttempted = false;

      if (parriedByPlayer) {
        this.parryUntil = 0;
        this.showPerfectParry();
      } else {
        this.botParryUntil = 0;
        this.showMessage("RIVAL PARRIED YOUR FIRECRACKER");
      }

      this.createHitEffect(p.object.x, p.object.y, 0xffdf83);
      this.cameras.main.shake(90, 0.005);
    }
  }

  showPerfectParry() {
    const text = this.add.text(
      this.scale.width / 2,
      165,
      "✦ PERFECT PARRY! ✦",
      {
        fontSize: "28px",
        fontStyle: "bold italic",
        color: "#ffe38b",
        stroke: "#59300e",
        strokeThickness: 5,
        shadow: {
          offsetX: 0,
          offsetY: 3,
          color: "#000000",
          blur: 6,
          fill: true
        }
      }
    ).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: text,
      y: 140,
      alpha: 0,
      delay: 500,
      duration: 500,
      onComplete: () => text.destroy()
    });
  }

  // ==========================================
  // HIT EFFECT
  // ==========================================

  createHitEffect(x, y, color) {
    const flash = this.add.circle(
      x, y, 7,
      color, 0.95
    ).setDepth(25);

    this.tweens.add({
      targets: flash,
      scale: 3.5,
      alpha: 0,
      duration: 190,
      onComplete: () => flash.destroy()
    });
  }

  showMessage(message) {
    if (this.actionMessage) {
      this.tweens.killTweensOf(this.actionMessage);
      this.actionMessage.destroy();
    }

    const messageText = this.add.text(
      this.scale.width / 2,
      139,
      message,
      {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffe0a0",
        stroke: "#28111a",
        strokeThickness: 3,
        backgroundColor: "#201421",
        padding: { x: 12, y: 7 }
      }
    ).setOrigin(0.5).setDepth(45);

    this.actionMessage = messageText;

    this.tweens.add({
      targets: messageText,
      alpha: 0,
      delay: 800,
      duration: 300,
      onComplete: () => {
        if (this.actionMessage === messageText) {
          messageText.destroy();
          this.actionMessage = null;
        }
      }
    });
  }

  // ==========================================
  // MOBILE CONTROLS
  // ==========================================

  createTouchControls() {
    if (!this.sys.game.device.input.touch) return;

    const y = this.scale.height - 88;

    const makeButton = (x, label, action, hold = false) => {
      const button = this.add.circle(
        x,
        y,
        21,
        0x211827,
        0.88
      )
        .setStrokeStyle(1.5, 0xe0b968, 0.85)
        .setInteractive({ useHandCursor: true })
        .setDepth(40);

      this.add.text(
        x,
        y,
        label,
        {
          fontSize: "10px",
          color: "#fff1d4",
          fontStyle: "bold"
        }
      ).setOrigin(0.5).setDepth(41);

      if (hold) {
        button.on("pointerdown", () => {
          this.touch[action] = true;
          button.setFillStyle(0x77502c);
        });

        const release = () => {
          this.touch[action] = false;
          button.setFillStyle(0x211827);
        };

        button.on("pointerup", release);
        button.on("pointerupoutside", release);
      } else {
        button.on("pointerdown", () => {
          if (action === "jump") this.mobileJump();
          if (action === "punch") this.startAttack("jab");

          if (action === "kick") {
            this.startAttack(
              this.isCrouching() ? "sweep" : "kick"
            );
          }

          if (action === "special") this.mobileSpecial();
          if (action === "parry") this.beginParry(this.time.now);
        });
      }
    };

    makeButton(38, "◀", "left", true);
    makeButton(87, "▶", "right", true);
    makeButton(141, "S", "crouch", true);

    makeButton(682, "J", "punch");
    makeButton(730, "K", "kick");
    makeButton(826, "W", "jump");

    // Cooldown abilities use their interactive HUD rings.
  }

  mobileJump() {
    if (
      !this.playerState.grounded ||
      this.playerFighter.isActing ||
      this.isCrouching()
    ) {
      return;
    }

    this.playerState.vy = this.jumpVelocity;
    this.playerState.grounded = false;

    this.playerFighter.setPose("jump", 80);
  }

  mobileSpecial() {
    this.activateSpecial(this.time.now);
  }

  // ==========================================
  // DEBUG HITBOXES
  // Press F1 to display body and attack boxes.
  // ==========================================

  drawDebugHitboxes(time) {
    const g = this.debugGraphics;
    g.clear();

    if (!this.debugHitboxes) return;

    const drawBoxes = (fighter, color) => {
      fighter.getHurtboxes().forEach(box => {
        g.lineStyle(2, color, 0.9);
        g.strokeRect(
          box.x,
          box.y,
          box.width,
          box.height
        );

        g.fillStyle(color, 0.15);
        g.fillRect(
          box.x,
          box.y,
          box.width,
          box.height
        );
      });
    };

    drawBoxes(this.playerFighter, 0x44c7ff);
    drawBoxes(this.opponentFighter, 0xff5757);

    if (
      this.lastAttackBox &&
      time < this.lastAttackBoxUntil
    ) {
      g.lineStyle(3, 0xffe46a, 1);

      g.strokeRect(
        this.lastAttackBox.x,
        this.lastAttackBox.y,
        this.lastAttackBox.width,
        this.lastAttackBox.height
      );
    }
  }

  // ==========================================
  // PHYSICS
  // ==========================================

  updatePhysics(state, fighter, dt, isPlayer = false) {
    state.vy += this.gravity * dt;

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    // Friction
    state.vx *= Math.exp(-3.5 * dt);

    // Side boundaries
    state.x = Phaser.Math.Clamp(
      state.x,
      45,
      this.scale.width - 45
    );

    // Ground collision: feet are aligned to floorY.
    if (state.y >= this.floorY) {
      state.y = this.floorY;
      state.vy = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }

    fighter.setPosition(state.x, state.y);

    // Shadow stays on the floor.
    if (isPlayer) {
      this.playerShadow.setPosition(
        state.x,
        this.floorY - 1
      );

      this.playerShadow.setScale(
        state.grounded ? 1 : 0.72
      );
    } else {
      this.dummyShadow.setPosition(
        state.x,
        this.floorY - 1
      );

      this.dummyShadow.setScale(
        state.grounded ? 1 : 0.72
      );
    }

    // Passive dummy returns to idle after knockback.
    if (
      !isPlayer &&
      (!this.botAI || this.mode !== "bot") &&
      this.time.now >= this.dummyStunnedUntil &&
      state.grounded &&
      !fighter.isActing
    ) {
      fighter.setPose("idle", 100);
    }
  }

  // ==========================================
  // FIGHTER COLLISION
  // ==========================================

  resolveFighterSpacing() {
    if (Math.abs(this.dummyState.y - this.playerState.y) > 48) {
      return;
    }

    const minimumDistance = 52;

    const difference =
      this.dummyState.x - this.playerState.x;

    if (Math.abs(difference) < minimumDistance) {
      const direction = Math.sign(difference) || 1;
      const correction =
        (minimumDistance - Math.abs(difference)) / 2;

      if (!this.playerFighter.isActing) {
        this.playerState.x -= direction * correction;
      }

      this.dummyState.x += direction * correction;
    }
  }

  // ==========================================
  // MAIN UPDATE LOOP
  // ==========================================

  update(time, delta) {
    const dt = Math.min(delta, 40) / 1000;

    if (!this.playerFighter || !this.opponentFighter) return;

    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugHitboxes = !this.debugHitboxes;

      this.showMessage(
        this.debugHitboxes
          ? "HITBOX DEBUG ON"
          : "HITBOX DEBUG OFF"
      );
    }

    this.handleInput(time, dt);

    if (this.mode === "bot") {
      this.botAI?.update(time, dt);
    }

    this.updatePhysics(
      this.playerState,
      this.playerFighter,
      dt,
      true
    );

    this.updatePhysics(
      this.dummyState,
      this.opponentFighter,
      dt,
      false
    );

    this.resolveFighterSpacing();

    this.playerFighter.setPosition(
      this.playerState.x,
      this.playerState.y
    );

    this.opponentFighter.setPosition(
      this.dummyState.x,
      this.dummyState.y
    );

    this.updateProjectiles(dt);

    this.drawThrowCooldown();
    this.drawAbilityCooldown(
      this.specialButton,
      this.specialReadyAt,
      this.specialCooldown
    );
    this.drawAbilityCooldown(
      this.parryButton,
      this.parryCooldownUntil,
      this.parryCooldown,
      this.parryTool?.id === "puja-thali",
      "NO THALI"
    );

    this.drawDebugHitboxes(time);
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  cleanup() {
    this.projectiles.forEach(p => {
      p.object.destroy();
    });

    this.projectiles = [];
  }
}
