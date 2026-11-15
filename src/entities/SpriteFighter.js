import Phaser from "phaser";
import { DEFAULT_SPECIAL, MOVES, SPECIAL_MOVES } from "../data/combatMoves.js";

const ATTACK_POSES = new Set([
    "jab",
    "kick",
    "sweep",
    "uppercut",
    "shadowSweep",
    "spit",
    "throw",
    "hit"
]);

export default class SpriteFighter extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, character) {
        super(scene, x, y, "fighter_idle");
        this.sceneRef = scene;
        this.character = character;
        this.characterTint = character.tint;
        this.facing = 1;
        this.fighterScale = scene.fighterScale;
        this.baseSpriteScale = (5.4 * scene.scale.height) / 540;
        this.currentPose = null;
        this.isActing = false;
        this.actionToken = 0;
        this.currentMove = null;
        this.actionPhase = null;

        scene.add.existing(this);
        this.setOrigin(0.5, 1)
            .setTint(this.characterTint)
            .setScale(this.fighterScale);
        this.setPose("idle", 0);
    }

    setScale(scaleX, scaleY = scaleX) {
        this.fighterScale = scaleX;
        return super.setScale(
            this.baseSpriteScale * scaleX,
            this.baseSpriteScale * scaleY
        );
    }

    setFacing(direction) {
        this.facing = direction < 0 ? -1 : 1;
        this.setFlipX(this.facing < 0);
    }

    setPose(name) {
        if (this.currentPose === name) return;
        this.currentPose = name;

        let animationKey = "fighter_idle_animation";
        if (name === "walk" || name === "jump") {
            animationKey = "fighter_walking_animation";
        } else if (ATTACK_POSES.has(name)) {
            animationKey = "fighter_spitting_animation";
        }

        if (this.anims.currentAnim?.key !== animationKey) {
            this.play(animationKey);
        } else {
            this.anims.resume();
        }
    }

    getMove(name) {
        if (name === "special") {
            return SPECIAL_MOVES[this.character.id] || DEFAULT_SPECIAL;
        }
        return MOVES[name] || null;
    }

    perform(name, callbacks = {}) {
        if (this.isActing) return false;
        const move = this.getMove(name);
        if (!move) return false;

        this.isActing = true;
        this.currentMove = move;
        this.actionPhase = "windup";
        const token = ++this.actionToken;
        const speed = this.sceneRef.actionSpeed || 1;
        const windup = Math.round(move.windup * speed);
        const active = Math.round(move.active * speed);
        const recovery = Math.round(move.recovery * speed);

        this.setPose("guard");
        this.sceneRef.time.delayedCall(windup, () => {
            if (token !== this.actionToken || !this.active) return;
            this.actionPhase = "active";
            this.setPose(move.pose);
            if (move.effectColor) this.showSpecialEffect(move.effectColor);
        });

        this.sceneRef.time.delayedCall(
            windup + Math.round(active * 0.35),
            () => {
                if (token !== this.actionToken || !this.active) return;
                this.actionPhase = "active";
                callbacks.onImpact?.(move);
            }
        );
        this.sceneRef.time.delayedCall(windup + active, () => {
            if (token !== this.actionToken || !this.active) return;
            this.actionPhase = "recovery";
            this.setPose("guard");
        });
        this.sceneRef.time.delayedCall(windup + active + recovery, () => {
            if (token !== this.actionToken || !this.active) return;
            this.isActing = false;
            this.currentMove = null;
            this.actionPhase = null;
            this.setPose("idle");
            callbacks.onComplete?.();
        });
        return true;
    }

    getHurtboxes() {
        const scale = Math.abs(this.fighterScale || 1);
        const rect = (zone, offsetY, width, height) => ({
            zone,
            x: this.x - width * scale / 2,
            y: this.y + offsetY * scale - height * scale / 2,
            width: width * scale,
            height: height * scale
        });

        return [
            rect("head", -151, 31, 32),
            rect("torso", -96, 48, 62),
            rect("legs", -30, 45, 55)
        ];
    }

    getAttackHitbox(move) {
        const { hitbox } = move;
        const scale = Math.abs(this.fighterScale || 1);
        const centerX = this.x + this.facing * hitbox.x * scale;
        const centerY = this.y + hitbox.y * scale;
        return {
            x: centerX - hitbox.width * scale / 2,
            y: centerY - hitbox.height * scale / 2,
            width: hitbox.width * scale,
            height: hitbox.height * scale
        };
    }

    showSpecialEffect(color) {
        const effect = this.sceneRef.add.circle(this.x, this.y - 68 * this.fighterScale, 28)
            .setStrokeStyle(3, color, 0.9)
            .setFillStyle(color, 0.12)
            .setDepth(12);
        this.sceneRef.tweens.add({
            targets: effect,
            scale: 1.7,
            alpha: 0,
            duration: 300,
            onComplete: () => effect.destroy()
        });
    }

    reactToHit() {
        this.actionToken++;
        this.isActing = false;
        this.currentMove = null;
        this.actionPhase = null;
        this.setTint(0xff7777);
        this.currentPose = null;
        this.setPose("hit");
        this.sceneRef.time.delayedCall(260, () => {
            if (!this.active) return;
            this.setTint(this.characterTint);
            if (!this.isActing) {
                this.currentPose = null;
                this.setPose("idle");
            }
        });
    }

    resetPose() {
        this.actionToken++;
        this.isActing = false;
        this.currentMove = null;
        this.actionPhase = null;
        this.currentPose = null;
        this.setPose("idle");
    }
}
