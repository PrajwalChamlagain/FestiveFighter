import Phaser from "phaser";
import idleSpriteSheetUrl from "../assets/sprites/IDLE.png";
import { CHARACTERS, PARRY_TOOLS, WEAPONS } from "../data/catalog.js";
import { loadPlayerProfile, savePlayerProfile } from "../data/playerProfile.js";

const SHOP_CATEGORIES = ["characters", "weapons", "parryTools"];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  init(data) {
    this.username = data?.username?.trim() || "";
  }

  preload() {
    if (!this.textures.exists("menu_fighter_preview")) {
      this.load.spritesheet("menu_fighter_preview", idleSpriteSheetUrl, {
        frameWidth: 16,
        frameHeight: 32
      });
    }
  }

  create() {
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

    this.drawCharacterPicker(
      "",
      this.playerCharacterId,
      width / 2,
      247,
      CHARACTERS.filter(character => this.profile.characters.includes(character.id)),
      id => { this.playerCharacterId = id; }
    );
    this.addButton(width / 2, 380, "START MATCH", () => this.startMatch(), {
      width: 230,
      fontSize: "17px"
    });
    this.addButton(width / 2, 442, "SHOP", () => this.showLobby("shop"), {
      width: 190,
      fontSize: "14px"
    });
  }

  drawCharacterPicker(title, selectedId, x, y, options, onChange) {
    const selected = options.find(character => character.id === selectedId) || options[0];
    const selectedIndex = options.findIndex(character => character.id === selected.id);
    if (title) {
      this.add.text(x, y - 70, title, {
        fontSize: "12px",
        fontStyle: "bold",
        color: "#fbbf24"
      }).setOrigin(0.5);
    }

    const preview = this.add.sprite(x, y - 3, "menu_fighter_preview", 0)
      .setScale(2.8)
      .setTint(selected.tint);
    preview.setDepth(2);
    this.add.text(x, y + 62, selected.name, {
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.addButton(x - 100, y + 2, "‹", () => {
      onChange(options[(selectedIndex - 1 + options.length) % options.length].id);
      this.showLobby("play");
    }, { width: 40, fontSize: "25px" });
    this.addButton(x + 100, y + 2, "›", () => {
      onChange(options[(selectedIndex + 1) % options.length].id);
      this.showLobby("play");
    }, { width: 40, fontSize: "25px" });
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
      this.add.sprite(width / 2, 253, "menu_fighter_preview", 0)
        .setScale(3)
        .setTint(item.tint);
    } else {
      this.add.image(width / 2, 253, "weapon")
        .setDisplaySize(72, 72);
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
    this.add.text(
      width / 2,
      379,
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
      this.add.text(width / 2, 466, this.shopMessage, {
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

  shopDescription(item) {
    if (item.id === "firecracker") return "A fast, accelerating blast with a strong self-boost.";
    if (item.id === "sutli") return "A heavy bomb with a powerful blast hop.";
    if (item.id === "anar") return "A high-damage rocket aimed with the mouse; hold F and release to launch.";
    if (item.id === "chakri") return "A quick, light firework with a small blast.";
    if (item.id === "puja-thali") return "Unlock the short-window projectile parry.";
    return "A new color for your sprite fighter.";
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
