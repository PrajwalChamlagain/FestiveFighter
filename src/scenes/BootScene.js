import Phaser from "phaser";
import assetManifest from "../assets/data/assets.json";
import diwaliArena from "../maps/diwaliArena.js";

// Static imports let Vite rewrite these files to valid URLs in both dev and build output.
import swordEffectUrl from "../assets/effects/sword-effects.gif";
import loginArenaUrl from "../assets/login-arena/login-arena.jpg";

const assetUrls = {
  arena_background: diwaliArena.backgroundUrl,
  sword_effect: swordEffectUrl,
  login_arena: loginArenaUrl
};

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const pack = {
      files: assetManifest.files.map(asset => ({
        ...asset,
        url: assetUrls[asset.key]
      }))
    };

    this.load.on("loaderror", file => {
      console.error(`Failed to load asset "${file.key}" from ${file.src}.`);
    });

    this.load.pack("game-assets", pack);
  }

  create() {
    const keys = ["arena_background", "sword_effect", "login_arena"];
    const missingKeys = keys.filter(key => !this.textures.exists(key));

    if (missingKeys.length > 0) {
      console.error("Some game assets did not load:", missingKeys);
    } else {
      console.info("Game assets loaded:", keys);
    }

    this.scene.start("MenuScene");
  }
}
