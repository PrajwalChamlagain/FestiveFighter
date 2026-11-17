import Phaser from "phaser";
import idleSpriteSheetUrl from "../assets/sprites/IDLE.png";
import {
  CHARACTERS,
  PARRY_TOOLS,
  WEAPONS,
  WEAPON_PHYSICS
} from "../data/catalog.js";
import { ABILITIES } from "../data/abilities.js";
import { SPECIAL_MOVES } from "../data/combatMoves.js";
import {
  BOT_DIFFICULTIES,
  DEFAULT_BOT_DIFFICULTY,
  isBotDifficulty
} from "../data/botDifficulty.mjs";
import { loadPlayerProfile, savePlayerProfile } from "../data/playerProfile.js";
import LanClient from "../network/LanClient.js";
import laurePortraitUrl from "../assets/characters/laure.svg";
import harkePortraitUrl from "../assets/characters/harke.svg";
import ballinPortraitUrl from "../assets/characters/ballin.svg";
import sutliShopUrl from "../assets/shop/sutli.svg";
import firecrackerShopUrl from "../assets/shop/firecracker.svg";
import anarShopUrl from "../assets/shop/anar.svg";
import chakriShopUrl from "../assets/shop/chakri.svg";
import thaliShopUrl from "../assets/shop/puja-thali.svg";

const SHOP_CATEGORIES = ["characters", "weapons", "parryTools"];
const CHARACTER_PORTRAITS = {
  laure: laurePortraitUrl,
  harke: harkePortraitUrl,
  ballin: ballinPortraitUrl
};
const SHOP_ITEM_ART = {
  sutli: sutliShopUrl,
  firecracker: firecrackerShopUrl,
  anar: anarShopUrl,
  chakri: chakriShopUrl,
  "puja-thali": thaliShopUrl
};

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  init(data) {
    this.username = data?.username?.trim() || "";
    this.difficulty = isBotDifficulty(data?.difficulty)
      ? data.difficulty
      : DEFAULT_BOT_DIFFICULTY;
    this.playerCharacterId = data?.characterId || this.playerCharacterId;
  }

  preload() {
    if (!this.textures.exists("menu_fighter_preview")) {
      this.load.spritesheet("menu_fighter_preview", idleSpriteSheetUrl, {
        frameWidth: 16,
        frameHeight: 32
      });
    }
    for (const [characterId, url] of Object.entries(CHARACTER_PORTRAITS)) {
      const key = `character_${characterId}_portrait`;
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
    for (const [itemId, url] of Object.entries(SHOP_ITEM_ART)) {
      const key = `shop_${itemId}`;
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
  }

  create() {
    this.events.once("shutdown", this.cleanupLanConnection, this);
    this.profile = loadPlayerProfile();
    if (!this.profile.characters.includes(this.playerCharacterId)) {
      this.playerCharacterId = this.profile.characters[0];
    }
    this.shopCategory = this.shopCategory || "characters";
    this.shopIndex = this.shopIndex || 0;

    if (this.username) this.showLobby("play");
    else this.showLogin();
  }

  drawBackground() {
    const { width, height } = this.scale;
    const background = this.add.image(width / 2, height / 2, "login_arena");
    const source = this.textures.get("login_arena").getSourceImage();
    background.setScale(Math.max(width / source.width, height / source.height));
    this.add.rectangle(width / 2, height / 2, width, height, 0x100b1b, 0.38);
  }

  clearScreen() {
    if (this.usernameInput) {
      this.usernameInput.removeElement();
      this.usernameInput = null;
    }
    this.usernameField = null;
    this.errorText = null;
    this.children.removeAll(true);
  }

  showLogin() {
    this.clearScreen();
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    this.drawBackground();
    this.add.rectangle(centerX, centerY, 440, 270, 0x111827, 0.9)
      .setStrokeStyle(2, 0xfbbf24, 0.8);
    this.add.text(centerX, centerY - 94, "FESTIVE FIGHTER", {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#ffc107"
    }).setOrigin(0.5);
    this.add.text(centerX, centerY - 47, "Enter your username to continue", {
      fontSize: "18px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.usernameInput = this.add.dom(centerX, centerY + 9)
      .createElement("div", {
        display: "flex",
        width: "340px",
        height: "46px"
      })
      .setOrigin(0.5);
    this.usernameField = document.createElement("input");
    this.usernameField.type = "text";
    this.usernameField.maxLength = 20;
    this.usernameField.autocomplete = "nickname";
    this.usernameField.setAttribute("aria-label", "Username");
    Object.assign(this.usernameField.style, {
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      padding: "8px 12px",
      border: "2px solid #ffc107",
      borderRadius: "6px",
      background: "#ffffff",
      color: "#111827",
      fontSize: "18px",
      textAlign: "center",
      outline: "none"
    });
    this.usernameInput.node.appendChild(this.usernameField);
    this.errorText = this.add.text(centerX, centerY + 52, "", {
      fontSize: "14px",
      color: "#ff8080"
    }).setOrigin(0.5);
    this.addButton(centerX, centerY + 100, "CONTINUE", () => this.continueFromLogin(), {
      width: 190,
      fontSize: "18px"
    });
    this.usernameField.addEventListener("keydown", event => {
      if (event.key === "Enter") this.continueFromLogin();
    });
    this.usernameField.focus();
  }

  continueFromLogin() {
    const username = this.usernameField.value.trim();
    if (!username) {
      this.errorText.setText("Please enter a username.");
      this.usernameField.focus();
      return;
    }
    this.username = username;
    this.showLobby("play");
  }

  showLobby(screen) {
    this.activeScreen = screen;
    this.clearScreen();
    const { width } = this.scale;
    this.drawBackground();
    this.add.text(34, 20, "FESTIVE FIGHTER", {
      fontSize: "23px",
      fontStyle: "bold",
      color: "#ffc107"
    }).setOrigin(0, 0);
    this.add.text(width - 34, 24, `${this.username}  ·  ${this.profile.coins.toLocaleString()} COINS`, {
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffe6b7"
    }).setOrigin(1, 0);

    this.addButton(width - 72, 64, "LOG OUT", () => {
      this.username = "";
      this.showLogin();
    }, { width: 108, fontSize: "11px" });

    if (screen === "shop") {
      this.addButton(78, 64, "← BACK", () => this.showLobby("play"), {
        width: 100,
        fontSize: "11px"
      });
      this.drawShop();
    } else {
      this.drawPlayMenu();
      if (this.lanError) {
        this.add.text(width / 2, 515, this.lanError, {
          fontSize: "11px",
          color: "#ffaaa0"
        }).setOrigin(0.5);
      }
    }
  }

  drawPlayMenu() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 297, 870, 408, 0x111827, 0.88)
      .setStrokeStyle(1.5, 0xfbbf24, 0.6);
    this.add.text(width / 2, 112, "CHOOSE YOUR FIGHTER", {
      fontSize: "17px",
      fontStyle: "bold",
      color: "#fff1d4"
    }).setOrigin(0.5);

    const ownedCharacters = CHARACTERS.filter(character =>
      this.profile.characters.includes(character.id)
    );
    const selected = ownedCharacters.find(character =>
      character.id === this.playerCharacterId
    ) || ownedCharacters[0];
    this.playerCharacterId = selected.id;

    this.add.text(160, 151, "YOUR FIGHTERS", {
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fbbf24"
    }).setOrigin(0.5);
    ownedCharacters.forEach((character, index) => {
      this.addButton(160, 190 + index * 48, character.name, () => {
        this.playerCharacterId = character.id;
        this.showLobby("play");
      }, {
        width: 190,
        fontSize: "12px",
        selected: character.id === selected.id
      });
    });

    const previewX = 570;
    this.drawCharacterArt(selected, previewX, 211, 106);
    this.add.text(previewX, 279, selected.name, {
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.add.text(previewX, 306, "E SPECIAL", {
      fontSize: "10px",
      fontStyle: "bold",
      color: "#fbbf24"
    }).setOrigin(0.5);
    this.add.text(previewX, 327, this.shopDescription(selected), {
      fontSize: "11px",
      color: "#e5c99f",
      align: "center",
      wordWrap: { width: 400 }
    }).setOrigin(0.5);

    this.add.text(previewX, 345, "BOT DIFFICULTY", {
      fontSize: "10px",
      fontStyle: "bold",
      color: "#fbbf24"
    }).setOrigin(0.5);
    BOT_DIFFICULTIES.forEach((difficulty, index) => {
      this.addButton(previewX + (index - 1.5) * 94, 366, difficulty.label, () => {
        this.difficulty = difficulty.id;
        this.showLobby("play");
      }, {
        width: 88,
        fontSize: "9px",
        selected: this.difficulty === difficulty.id
      });
    });

    this.addButton(previewX, 405, "START BOT MATCH", () => this.startMatch(), {
      width: 230,
      fontSize: "15px"
    });
    this.addButton(previewX, 444, "LAN MATCH", () => this.startLanMatch(), {
      width: 230,
      fontSize: "15px"
    });
    this.addButton(previewX, 483, "SHOP", () => this.showLobby("shop"), {
      width: 190,
      fontSize: "14px"
    });
  }

  startLanMatch() {
    if (!this.profile.characters.includes(this.playerCharacterId) ||
        !this.profile.weapons.includes(this.profile.equippedWeaponId)) {
      this.showLobby("shop");
      return;
    }

    this.lanError = "";
    this.lanTransferred = false;
    this.lanClient = new LanClient();
    this.showLanWaiting("Connecting to the multiplayer server…");

    this.lanSubscriptions = [
      this.lanClient.on("connected", () => {
        this.setLanWaitingMessage("Connected. Finding another player…");
      }),
      this.lanClient.on("waiting", () => {
        this.setLanWaitingMessage("Waiting for another player to join…");
      }),
      this.lanClient.on("match-found", match => this.enterLanMatch(match)),
      this.lanClient.on("match:error", () => {
        this.failLanMatch("Your multiplayer loadout is not available on the server.");
      }),
      this.lanClient.on("connection-error", () => {
        this.failLanMatch("Could not connect. Check the server address and firewall.");
      }),
      this.lanClient.on("disconnected", () => {
        if (!this.lanTransferred && this.lanClient) {
          this.failLanMatch("Connection lost while waiting for a match.");
        }
      })
    ];

    this.lanClient.connectAndJoin({
      weaponId: this.profile.equippedWeaponId,
      characterId: this.playerCharacterId,
      weapons: this.profile.weapons,
      parryToolId: this.profile.parryTools.includes(PARRY_TOOLS[0].id)
        ? PARRY_TOOLS[0].id
        : null,
      parryTools: this.profile.parryTools
    });
  }

  showLanWaiting(message) {
    this.clearScreen();
    const { width, height } = this.scale;
    this.drawBackground();
    this.add.rectangle(width / 2, height / 2, 520, 220, 0x111827, 0.93)
      .setStrokeStyle(2, 0xfbbf24, 0.75);
    this.add.text(width / 2, height / 2 - 62, "LAN MATCH", {
      fontSize: "24px",
      fontStyle: "bold",
      color: "#ffc107"
    }).setOrigin(0.5);
    this.lanWaitingText = this.add.text(width / 2, height / 2 - 5, message, {
      fontSize: "15px",
      color: "#fff1d4",
      align: "center",
      wordWrap: { width: 430 }
    }).setOrigin(0.5);
    this.addButton(width / 2, height / 2 + 65, "CANCEL", () => {
      this.lanError = "";
      this.cleanupLanConnection();
      this.showLobby("play");
    }, { width: 140, fontSize: "13px" });
  }

  setLanWaitingMessage(message) {
    if (this.lanWaitingText?.active) this.lanWaitingText.setText(message);
  }

  enterLanMatch(match) {
    if (!this.lanClient || this.lanTransferred) return;

    const lanClient = this.lanClient;
    this.lanTransferred = true;
    this.clearLanSubscriptions();
    this.lanClient = null;
    this.scene.start("MatchScene", {
      username: this.username,
      mode: "lan",
      characterId: this.playerCharacterId,
      opponentCharacterId: match.opponentCharacterId || CHARACTERS[0].id,
      weaponId: this.profile.equippedWeaponId,
      parryToolId: this.profile.parryTools.includes(PARRY_TOOLS[0].id)
        ? PARRY_TOOLS[0].id
        : null,
      lanMatch: match,
      lanClient
    });
  }

  failLanMatch(message) {
    if (!this.lanClient) return;
    this.cleanupLanConnection();
    this.lanError = message;
    this.showLobby("play");
  }

  clearLanSubscriptions() {
    this.lanSubscriptions?.forEach(unsubscribe => unsubscribe());
    this.lanSubscriptions = [];
  }

  cleanupLanConnection() {
    this.clearLanSubscriptions();
    this.lanClient?.destroy();
    this.lanClient = null;
  }

  drawShop() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 297, 870, 408, 0x111827, 0.9)
      .setStrokeStyle(1.5, 0xfbbf24, 0.65);
    this.add.text(width / 2, 107, "FESTIVAL SHOP", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#fff1d4"
    }).setOrigin(0.5);

    const categoryLabels = {
      characters: "CHARACTERS",
      weapons: "FIREWORKS",
      parryTools: "PARRY GEAR"
    };
    SHOP_CATEGORIES.forEach((category, index) => {
      this.addButton(width / 2 - 220 + index * 220, 147, categoryLabels[category], () => {
        this.shopCategory = category;
        this.shopIndex = 0;
        this.showLobby("shop");
      }, {
        width: 190,
        fontSize: "11px",
        selected: this.shopCategory === category
      });
    });

    const catalog = this.catalogForCategory(this.shopCategory);
    this.shopIndex = Phaser.Math.Clamp(this.shopIndex, 0, catalog.length - 1);
    const item = catalog[this.shopIndex];
    const owned = this.isItemOwned(this.shopCategory, item.id);
    const equipped = this.shopCategory === "weapons" &&
      this.profile.equippedWeaponId === item.id;

    if (this.shopCategory === "characters") {
      this.drawCharacterArt(item, width / 2, 253, 84);
    } else {
      this.add.image(width / 2, 253, `shop_${item.id}`)
        .setDisplaySize(112, 112);
    }

    this.add.text(width / 2, 315, item.name, {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.add.text(width / 2, 345, this.shopDescription(item), {
      fontSize: "12px",
      color: "#e5c99f"
    }).setOrigin(0.5);
    const cooldownMs = this.getShopCooldown(item);
    if (cooldownMs !== null) {
      this.add.text(width / 2, 367, `COOLDOWN · ${(cooldownMs / 1000).toFixed(1)}s`, {
        fontSize: "10px",
        fontStyle: "bold",
        color: "#8fcfff"
      }).setOrigin(0.5);
    }
    this.add.text(
      width / 2,
      392,
      equipped ? "EQUIPPED" : owned ? "OWNED" : `${item.price} COINS`,
      {
        fontSize: "14px",
        fontStyle: "bold",
        color: owned ? "#86efac" : "#fbbf24"
      }
    ).setOrigin(0.5);
    this.addButton(width / 2 - 150, 253, "‹", () => {
      this.shopIndex = (this.shopIndex - 1 + catalog.length) % catalog.length;
      this.shopMessage = "";
      this.showLobby("shop");
    }, { width: 42, fontSize: "24px" });
    this.addButton(width / 2 + 150, 253, "›", () => {
      this.shopIndex = (this.shopIndex + 1) % catalog.length;
      this.shopMessage = "";
      this.showLobby("shop");
    }, { width: 42, fontSize: "24px" });
    let actionLabel = "BUY / UNLOCK";
    if (equipped) actionLabel = "EQUIPPED";
    else if (owned && this.shopCategory === "weapons") actionLabel = "EQUIP";
    else if (owned) actionLabel = "ALREADY UNLOCKED";
    this.addButton(width / 2, 428, actionLabel, () => {
      this.buyShopItem(item);
    }, { width: 230, fontSize: "13px" });
    if (this.shopMessage) {
      this.add.text(width / 2, 475, this.shopMessage, {
        fontSize: "12px",
        color: "#fff1d4"
      }).setOrigin(0.5);
    }
  }

  catalogForCategory(category) {
    if (category === "characters") return CHARACTERS;
    if (category === "weapons") return WEAPONS;
    return PARRY_TOOLS;
  }

  isItemOwned(category, id) {
    const ownershipKey = category === "parryTools" ? "parryTools" : category;
    return this.profile[ownershipKey].includes(id);
  }

  getShopCooldown(item) {
    if (this.shopCategory === "characters") {
      return SPECIAL_MOVES[item.id]?.cooldownMs ?? null;
    }
    if (this.shopCategory === "weapons") {
      return WEAPON_PHYSICS[item.id]?.cooldown ?? null;
    }
    if (this.shopCategory === "parryTools") {
      return ABILITIES.parry.cooldownMs;
    }
    return null;
  }

  shopDescription(item) {
    const specialDescriptions = {
      "olaal-babu": "E: a high-damage spit strike at point-blank range.",
      royal: "E: a rising palm strike with a powerful launch.",
      laure: "E: a very short-range khukuri slash for heavy damage.",
      harke: "E: toss dirt to hit and briefly stun a rival.",
      ballin: "E: use a burning herb to boost melee damage."
    };
    if (specialDescriptions[item.id]) return specialDescriptions[item.id];
    if (item.id === "firecracker") return "A fast, accelerating blast with a strong self-boost.";
    if (item.id === "sutli") return "A heavy bomb with a powerful blast hop.";
    if (item.id === "anar") return "A high-damage rocket aimed with the mouse; hold F and release to launch.";
    if (item.id === "chakri") return "A quick, light firework with a small blast.";
    if (item.id === "puja-thali") return "Unlock the short-window projectile parry.";
    return "A new color for your sprite fighter.";
  }

  drawCharacterArt(character, x, y, size) {
    const portraitKey = `character_${character.id}_portrait`;
    if (this.textures.exists(portraitKey)) {
      return this.add.image(x, y, portraitKey).setDisplaySize(size, size).setDepth(2);
    }
    return this.add.sprite(x, y, "menu_fighter_preview", 0)
      .setScale(size / 32)
      .setTint(character.tint)
      .setDepth(2);
  }

  buyShopItem(item) {
    if (this.isItemOwned(this.shopCategory, item.id)) {
      if (this.shopCategory === "weapons" && this.profile.equippedWeaponId !== item.id) {
        this.profile.equippedWeaponId = item.id;
        savePlayerProfile(this.profile);
        this.shopMessage = `${item.name} equipped.`;
        this.showLobby("shop");
        return;
      }
      this.shopMessage = "Already unlocked.";
      this.showLobby("shop");
      return;
    }
    if (this.profile.coins < item.price) {
      this.shopMessage = "Not enough coins. Win a match to earn more.";
      this.showLobby("shop");
      return;
    }

    const ownershipKey = this.shopCategory === "parryTools" ? "parryTools" : this.shopCategory;
    this.profile.coins -= item.price;
    this.profile[ownershipKey].push(item.id);
    if (this.shopCategory === "weapons") {
      this.profile.equippedWeaponId = item.id;
    }
    savePlayerProfile(this.profile);
    this.shopMessage = `${item.name} unlocked!`;
    this.showLobby("shop");
  }

  startMatch() {
    if (!this.profile.characters.includes(this.playerCharacterId) ||
        !this.profile.weapons.includes(this.profile.equippedWeaponId)) {
      this.showLobby("shop");
      return;
    }

    const randomFrom = items => items[Math.floor(Math.random() * items.length)];
    this.scene.start("MatchScene", {
      username: this.username,
      mode: "bot",
      difficulty: this.difficulty,
      characterId: this.playerCharacterId,
      opponentCharacterId: randomFrom(CHARACTERS).id,
      weaponId: this.profile.equippedWeaponId,
      botWeaponId: randomFrom(WEAPONS).id,
      parryToolId: this.profile.parryTools.includes(PARRY_TOOLS[0].id)
        ? PARRY_TOOLS[0].id
        : null,
      botHasParry: Math.random() < 0.5
    });
  }

  addButton(x, y, label, action, options = {}) {
    const button = this.add.text(x, y, label, {
      fontSize: options.fontSize || "14px",
      fontStyle: "bold",
      color: options.selected ? "#111827" : "#fff1d4",
      backgroundColor: options.selected ? "#fbbf24" : "#302235",
      padding: { x: 14, y: 8 },
      align: "center"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    if (options.width) button.setFixedSize(options.width, 34);
    button.on("pointerdown", action);
    return button;
  }
}
