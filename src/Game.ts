import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  COLORS,
  CAMERA_FRUSTUM_HALF_HEIGHT,
  CAMERA_Z,
  GAME_WIDTH,
  PLAYER_LIVES,
  POWERUP_DROP_CHANCE,
  GameStateType,
} from './config/constants';
import { PowerupType } from './config/powerups';
import { getWaveDef } from './config/waves';

import { InputManager } from './core/InputManager';
import { GameState } from './core/GameState';
import { AudioManager } from './core/AudioManager';

import { PlayField } from './entities/PlayField';
import { Player } from './entities/Player';
import { EnemyGrid } from './entities/EnemyGrid';
import { ProjectilePool } from './entities/Projectile';
import { PowerupManager } from './entities/Powerup';

import { ParticleSystem } from './effects/ParticleSystem';
import { HUD } from './ui/HUD';

export class Game {
  // Three.js
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private composer: EffectComposer;
  private clock: THREE.Clock;

  // Systems
  private input: InputManager;
  private gameState: GameState;
  private audio: AudioManager;
  private hud: HUD;

  // Entities
  private playField: PlayField;
  private player: Player;
  private enemyGrid: EnemyGrid | null = null;
  private projectiles: ProjectilePool;
  private powerups: PowerupManager;
  private particles: ParticleSystem;

  // Wave intro
  private waveIntroTimer = 0;

  // Nano swarm timer
  private nanoSwarmTimer = 0;

  // Tesla coil timer
  private teslaTimer = 0;

  // Gravity well timer
  private gravityTimer = 0;

  // Player hit invulnerability
  private invulnTimer = 0;

  constructor() {
    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(COLORS.background);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // ── Scene ──
    this.scene = new THREE.Scene();

    // ── Camera (orthographic 2D) ──
    const aspect = window.innerWidth / window.innerHeight;
    const halfH = CAMERA_FRUSTUM_HALF_HEIGHT;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(
      -halfW, halfW, halfH, -halfH, 0.1, 100
    );
    this.camera.position.set(0, 0, CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x8888ff, 0.8);
    dirLight.position.set(0, 0, 10);
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x6600cc, 1, 50);
    pointLight1.position.set(-10, 5, 8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00cc66, 0.8, 50);
    pointLight2.position.set(10, 5, 8);
    this.scene.add(pointLight2);

    // ── Post-processing ──
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35, // strength
      0.3,  // radius
      0.92  // threshold
    );
    this.composer.addPass(bloomPass);

    // ── Systems ──
    this.clock = new THREE.Clock();
    this.input = new InputManager();
    this.gameState = new GameState();
    this.audio = new AudioManager();
    this.hud = new HUD();

    // ── Entities ──
    this.playField = new PlayField();
    this.scene.add(this.playField.group);

    this.player = new Player();
    this.scene.add(this.player.mesh);

    this.projectiles = new ProjectilePool(this.scene);
    this.powerups = new PowerupManager(this.scene);
    this.particles = new ParticleSystem(this.scene);

    // ── State management ──
    this.gameState.onStateChange((newState) => {
      this.hud.showState(
        newState,
        this.gameState.score,
        this.gameState.highScore,
        this.gameState.wave
      );
    });

    // ── Resize handler ──
    window.addEventListener('resize', this.onResize.bind(this));

    // ── Start at menu ──
    this.gameState.setState(GameStateType.MENU);
    this.hud.updateHighScore(this.gameState.highScore);
    this.player.mesh.visible = false;
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const halfH = CAMERA_FRUSTUM_HALF_HEIGHT;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  start() {
    this.loop();
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05); // cap delta

    this.handleInput(dt);

    switch (this.gameState.state) {
      case GameStateType.PLAYING:
        this.updatePlaying(dt);
        break;
      case GameStateType.WAVE_INTRO:
        this.updateWaveIntro(dt);
        break;
    }

    // Always update visuals
    this.playField.update(dt);
    this.particles.update(dt);

    this.composer.render();
    this.input.endFrame();
  };

  private handleInput(_dt: number) {
    const state = this.gameState.state;

    if (state === GameStateType.MENU) {
      if (this.input.enter) {
        this.audio.init();
        this.startNewGame();
      }
      return;
    }

    if (state === GameStateType.GAME_OVER) {
      if (this.input.enter) {
        this.startNewGame();
      }
      return;
    }

    if (state === GameStateType.PLAYING) {
      if (this.input.pause) {
        this.gameState.setState(GameStateType.PAUSED);
      }
      return;
    }

    if (state === GameStateType.PAUSED) {
      if (this.input.pause || this.input.enter) {
        this.gameState.setState(GameStateType.PLAYING);
      }
      return;
    }
  }

  private startNewGame() {
    this.gameState.reset();
    this.player.clearPowerup();
    this.player.x = 0;
    this.player.mesh.visible = true;
    this.projectiles.clearAll();
    this.powerups.clearAll();
    this.particles.clearAll();
    if (this.enemyGrid) {
      this.enemyGrid.dispose();
      this.enemyGrid = null;
    }
    this.hud.updateScore(0);
    this.hud.updateLives(PLAYER_LIVES, PLAYER_LIVES);
    this.hud.updateShield(0);
    this.hud.updateWave(1);
    this.startWave(1);
  }

  private startWave(waveNum: number) {
    this.gameState.wave = waveNum;
    this.waveIntroTimer = 2.0;
    this.gameState.setState(GameStateType.WAVE_INTRO);
    this.hud.updateWave(waveNum);

    // Clean up previous
    if (this.enemyGrid) {
      this.enemyGrid.dispose();
    }
    this.projectiles.clearAll();
    this.powerups.clearAll();

    // Create new grid
    const waveDef = getWaveDef(waveNum);
    this.enemyGrid = new EnemyGrid(waveDef);
    this.scene.add(this.enemyGrid.group);
  }

  private updateWaveIntro(dt: number) {
    this.waveIntroTimer -= dt;
    if (this.waveIntroTimer <= 0) {
      this.gameState.setState(GameStateType.PLAYING);
    }
  }

  private updatePlaying(dt: number) {
    // ── Player ──
    this.player.update(dt, this.input);

    // Invulnerability timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.player.mesh.visible = Math.sin(this.invulnTimer * 20) > 0;
      if (this.invulnTimer <= 0) {
        this.player.mesh.visible = true;
      }
    }

    // ── Player shooting ──
    if (this.player.wantsFire) {
      this.audio.playShoot();
      const powerup = this.player.activePowerup;

      if (powerup === PowerupType.TRI_SHOT) {
        this.projectiles.firePlayerBolt(this.player.x, this.player.y, -0.15);
        this.projectiles.firePlayerBolt(this.player.x, this.player.y, 0);
        this.projectiles.firePlayerBolt(this.player.x, this.player.y, 0.15);
      } else if (powerup === PowerupType.QUANTUM_BEAM) {
        this.projectiles.fireBeam(this.player.x, this.player.y);
      } else {
        this.projectiles.firePlayerBolt(this.player.x, this.player.y);
      }

      // Decoys also fire
      for (const decoy of this.player.decoys) {
        this.projectiles.firePlayerBolt(decoy.position.x, decoy.position.y);
      }
    }

    // ── Enemies ──
    if (this.enemyGrid) {
      const chronoActive = this.player.activePowerup === PowerupType.CHRONO_FIELD;
      this.enemyGrid.update(dt, chronoActive);

      // Enemy shooting
      const shootPos = this.enemyGrid.getRandomShootPosition(dt);
      if (shootPos) {
        this.projectiles.fireEnemyBolt(shootPos.x, shootPos.y);
      }

      // Check if enemies reached bottom
      if (this.enemyGrid.hasReachedBottom()) {
        this.gameOver();
        return;
      }

      // Check if wave is complete
      if (this.enemyGrid.allDead) {
        this.audio.playWaveComplete();
        this.startWave(this.gameState.wave + 1);
        return;
      }
    }

    // ── Projectiles ──
    this.projectiles.update(dt);
    this.powerups.update(dt);

    // ── Collision detection ──
    this.checkCollisions(dt);

    // ── Powerup effects ──
    this.updatePowerupEffects(dt);

    // ── Combo ──
    this.gameState.updateCombo(dt);

    // ── HUD ──
    this.hud.updateScore(this.gameState.score);
    this.hud.updateHighScore(this.gameState.highScore);
    this.hud.updateCombo(this.gameState.comboCount);

    // Powerup HUD
    if (this.player.activePowerup) {
      const defs: Record<string, number> = {
        [PowerupType.PLASMA_SHIELD]: 999,
        [PowerupType.TRI_SHOT]: 10,
        [PowerupType.CHRONO_FIELD]: 8,
        [PowerupType.GRAVITY_WELL]: 6,
        [PowerupType.QUANTUM_BEAM]: 5,
        [PowerupType.HOLO_DECOY]: 12,
        [PowerupType.NANO_SWARM]: 8,
        [PowerupType.PHASE_SHIFT]: 4,
        [PowerupType.TESLA_COIL]: 7,
        [PowerupType.ORBITAL_CANNON]: 0,
      };
      const totalTime = defs[this.player.activePowerup] || 10;
      this.hud.updatePowerup(this.player.activePowerup, this.player.powerupTimer, totalTime);
    } else {
      this.hud.updatePowerup(null, 0, 0);
      this.hud.updateShield(0);
    }
  }

  private checkCollisions(dt: number) {
    if (!this.enemyGrid) return;

    const playerBox = this.player.getBoundingBox();

    // ── Player projectiles vs enemies ──
    const playerProjs = this.projectiles.getPlayerProjectiles();
    const aliveEnemies = this.enemyGrid.getAliveEnemies();

    for (const proj of playerProjs) {
      if (!proj.alive) continue;

      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        const enemyBox = this.enemyGrid.getBoundingBox(enemy);
        const projBox = new THREE.Box3().setFromCenterAndSize(
          proj.mesh.position,
          new THREE.Vector3(0.3, 0.5, 0.3)
        );

        if (projBox.intersectsBox(enemyBox)) {
          const killed = this.enemyGrid.damageEnemy(enemy, proj.damage);

          if (killed) {
            const pos = this.enemyGrid.getWorldPosition(enemy);
            this.audio.playExplosion();
            this.particles.createExplosion(pos.x, pos.y);
            this.gameState.addScore(this.enemyGrid.getScoreForEnemy(enemy));

            // Powerup drop chance
            if (Math.random() < POWERUP_DROP_CHANCE) {
              this.powerups.spawnAt(pos.x, pos.y);
            }
          } else {
            this.audio.playHit();
          }

          if (!proj.piercing) {
            this.projectiles.killProjectile(proj);
          }
          break;
        }
      }
    }

    // ── Enemy projectiles vs player ──
    if (this.invulnTimer <= 0 && !this.player.phaseActive) {
      const enemyProjs = this.projectiles.getEnemyProjectiles();
      for (const proj of enemyProjs) {
        if (!proj.alive) continue;
        const projBox = new THREE.Box3().setFromCenterAndSize(
          proj.mesh.position,
          new THREE.Vector3(0.2, 0.3, 0.2)
        );

        if (projBox.intersectsBox(playerBox)) {
          this.projectiles.killProjectile(proj);
          this.playerTakeHit();
          break;
        }
      }
    }

    // ── Player vs powerups ──
    for (const pu of this.powerups.powerups) {
      if (!pu.alive) continue;
      const puBox = this.powerups.getBoundingBox(pu);
      if (puBox.intersectsBox(playerBox)) {
        this.audio.playPowerup();
        this.powerups.collect(pu);
        this.activatePowerup(pu.type);
      }
    }
  }

  private playerTakeHit() {
    // Shield absorbs hit
    if (this.player.activePowerup === PowerupType.PLASMA_SHIELD && this.player.shieldHits > 0) {
      this.player.shieldHits--;
      this.audio.playHit();
      this.hud.updateShield(this.player.shieldHits);
      if (this.player.shieldHits <= 0) {
        this.player.clearPowerup();
      }
      return;
    }

    this.gameState.lives--;
    this.hud.updateLives(this.gameState.lives, PLAYER_LIVES);
    this.audio.playHit();
    this.particles.createExplosion(this.player.x, this.player.y, 0x00ffcc, 20);
    this.invulnTimer = 2.0;

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.audio.playGameOver();
    this.gameState.setState(GameStateType.GAME_OVER);
    this.player.mesh.visible = false;
    this.player.clearPowerup();
  }

  private activatePowerup(type: PowerupType) {
    this.player.activatePowerup(type, this.scene);

    // Instant-effect powerups
    if (type === PowerupType.ORBITAL_CANNON) {
      this.fireOrbitalCannon();
      this.player.clearPowerup();
    }

    if (type === PowerupType.PLASMA_SHIELD) {
      this.hud.updateShield(this.player.shieldHits);
    }

    if (type === PowerupType.GRAVITY_WELL) {
      this.particles.showGravityWell(this.player.x, this.player.y + 5);
    }
  }

  private fireOrbitalCannon() {
    if (!this.enemyGrid) return;

    this.particles.showOrbitalCannon(this.player.x);
    this.audio.playExplosion();

    // Damage all enemies in a 2-unit column centered on player
    for (const enemy of this.enemyGrid.getAliveEnemies()) {
      const pos = this.enemyGrid.getWorldPosition(enemy);
      if (Math.abs(pos.x - this.player.x) < 1.5) {
        const killed = this.enemyGrid.damageEnemy(enemy, 100);
        if (killed) {
          this.particles.createExplosion(pos.x, pos.y, 0xff00ff);
          this.gameState.addScore(this.enemyGrid.getScoreForEnemy(enemy));
        }
      }
    }
  }

  private updatePowerupEffects(dt: number) {
    if (!this.enemyGrid) return;
    const powerup = this.player.activePowerup;

    // Nano Swarm: auto-target fire
    if (powerup === PowerupType.NANO_SWARM) {
      this.nanoSwarmTimer -= dt;
      if (this.nanoSwarmTimer <= 0) {
        this.nanoSwarmTimer = 0.2;
        const enemies = this.enemyGrid.getAliveEnemies();
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          const tPos = this.enemyGrid.getWorldPosition(target);
          this.projectiles.fireNanoSwarm(
            this.player.x + (Math.random() - 0.5) * 0.5,
            this.player.y + 0.3,
            tPos.x,
            tPos.y
          );
        }
      }
    }

    // Tesla Coil: chain lightning
    if (powerup === PowerupType.TESLA_COIL) {
      this.teslaTimer -= dt;
      if (this.teslaTimer <= 0) {
        this.teslaTimer = 0.3;
        const enemies = this.enemyGrid.getAliveEnemies();
        // Find nearest 3 enemies to player and chain between them
        const sorted = enemies
          .map((e) => ({
            enemy: e,
            pos: this.enemyGrid!.getWorldPosition(e),
          }))
          .sort((a, b) => {
            const da = Math.hypot(a.pos.x - this.player.x, a.pos.y - this.player.y);
            const db = Math.hypot(b.pos.x - this.player.x, b.pos.y - this.player.y);
            return da - db;
          })
          .slice(0, 4);

        let prevPos = new THREE.Vector3(this.player.x, this.player.y, 0);
        for (const { enemy, pos } of sorted) {
          this.particles.showTeslaArc(prevPos.x, prevPos.y, pos.x, pos.y);
          this.enemyGrid!.damageEnemy(enemy, 1);
          if (!enemy.alive) {
            this.audio.playExplosion();
            this.particles.createExplosion(pos.x, pos.y, 0xffff00);
            this.gameState.addScore(this.enemyGrid!.getScoreForEnemy(enemy));
            if (Math.random() < POWERUP_DROP_CHANCE) {
              this.powerups.spawnAt(pos.x, pos.y);
            }
          }
          prevPos = pos;
        }
      }
    }

    // Gravity Well: pull and damage enemies
    if (powerup === PowerupType.GRAVITY_WELL) {
      this.gravityTimer -= dt;
      const centerX = this.player.x;
      const centerY = this.player.y + 5;

      this.particles.showGravityWell(centerX, centerY);

      if (this.gravityTimer <= 0) {
        this.gravityTimer = 0.5;
        for (const enemy of this.enemyGrid.getAliveEnemies()) {
          const pos = this.enemyGrid.getWorldPosition(enemy);
          const dist = Math.hypot(pos.x - centerX, pos.y - centerY);
          if (dist < 5) {
            this.enemyGrid.damageEnemy(enemy, 1);
            if (!enemy.alive) {
              this.audio.playExplosion();
              this.particles.createExplosion(pos.x, pos.y, 0x6600ff);
              this.gameState.addScore(this.enemyGrid.getScoreForEnemy(enemy));
            }
          }
        }
      }
    } else {
      this.particles.hideGravityWell();
    }
  }
}
