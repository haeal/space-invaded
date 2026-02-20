import * as THREE from 'three';
import {
  COLORS,
  PLAYER_Y,
  PLAYER_SPEED,
  PLAYER_FIRE_RATE,
  GAME_WIDTH,
} from '../config/constants';
import { PowerupType } from '../config/powerups';
import { InputManager } from '../core/InputManager';

export class Player {
  mesh: THREE.Group;
  x = 0;
  y = PLAYER_Y;
  speed = PLAYER_SPEED;
  fireRate = PLAYER_FIRE_RATE;
  fireCooldown = 0;
  wantsFire = false;

  // Powerup state
  activePowerup: PowerupType | null = null;
  powerupTimer = 0;
  shieldHits = 0;
  phaseActive = false;

  // Decoys
  decoys: THREE.Group[] = [];

  // Visuals
  private bodyMat: THREE.MeshStandardMaterial;
  private glowTime = 0;

  // Shield visual
  shieldMesh: THREE.Mesh | null = null;

  constructor() {
    this.mesh = new THREE.Group();

    // Main saucer body
    const bodyGeo = new THREE.SphereGeometry(0.6, 16, 8);
    bodyGeo.scale(1, 0.35, 1);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.playerPrimary,
      emissive: COLORS.playerEmissive,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.mesh.add(body);

    // Dome on top
    const domeGeo = new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x88ffee,
      emissive: 0x44ffcc,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
      metalness: 0.2,
      roughness: 0.1,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.1;
    this.mesh.add(dome);

    // Engine glow underneath
    const engineGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.1, 8);
    const engineMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.8,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.y = -0.2;
    this.mesh.add(engine);

    // Point light for glow effect
    const light = new THREE.PointLight(COLORS.playerPrimary, 1, 4);
    light.position.y = -0.3;
    this.mesh.add(light);

    this.mesh.position.set(this.x, this.y, 0);
  }

  update(dt: number, input: InputManager) {
    this.glowTime += dt;

    // Movement
    let dx = 0;
    if (input.moveLeft) dx -= 1;
    if (input.moveRight) dx += 1;
    this.x += dx * this.speed * dt;
    this.x = Math.max(-GAME_WIDTH / 2 + 0.5, Math.min(GAME_WIDTH / 2 - 0.5, this.x));
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;

    // Tilt when moving
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, -dx * 0.2, 0.1);

    // Hover bob
    this.mesh.position.y = this.y + Math.sin(this.glowTime * 3) * 0.05;

    // Emissive pulse
    this.bodyMat.emissiveIntensity = 0.6 + Math.sin(this.glowTime * 4) * 0.2;

    // Firing
    this.fireCooldown -= dt;
    this.wantsFire = input.shoot && this.fireCooldown <= 0;
    if (this.wantsFire) {
      this.fireCooldown = this.getFireRate();
    }

    // Powerup timer
    if (this.activePowerup && this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this.clearPowerup();
      }
    }

    // Phase shift visual
    if (this.phaseActive) {
      this.mesh.visible = Math.sin(this.glowTime * 20) > 0;
    } else {
      this.mesh.visible = true;
    }

    // Shield mesh
    if (this.shieldMesh) {
      this.shieldMesh.position.copy(this.mesh.position);
      this.shieldMesh.rotation.y += dt * 2;
    }

    // Update decoys
    for (const decoy of this.decoys) {
      decoy.position.y = this.y + Math.sin(this.glowTime * 3 + 1) * 0.05;
    }
  }

  getFireRate(): number {
    if (this.activePowerup === PowerupType.TRI_SHOT) return this.fireRate * 1.2;
    if (this.activePowerup === PowerupType.QUANTUM_BEAM) return this.fireRate * 2;
    return this.fireRate;
  }

  activatePowerup(type: PowerupType, scene: THREE.Scene) {
    // Clear previous
    this.clearPowerup();
    this.activePowerup = type;

    switch (type) {
      case PowerupType.PLASMA_SHIELD:
        this.shieldHits = 3;
        this.powerupTimer = 999; // Until depleted
        this.createShieldVisual(scene);
        break;
      case PowerupType.PHASE_SHIFT:
        this.phaseActive = true;
        this.powerupTimer = 4;
        break;
      case PowerupType.HOLO_DECOY:
        this.powerupTimer = 12;
        this.createDecoys(scene);
        break;
      case PowerupType.ORBITAL_CANNON:
        this.powerupTimer = 0; // Instant, handled by game
        break;
      default:
        // Timed powerup
        const defs: Record<string, number> = {
          [PowerupType.TRI_SHOT]: 10,
          [PowerupType.CHRONO_FIELD]: 8,
          [PowerupType.GRAVITY_WELL]: 6,
          [PowerupType.QUANTUM_BEAM]: 5,
          [PowerupType.NANO_SWARM]: 8,
          [PowerupType.TESLA_COIL]: 7,
        };
        this.powerupTimer = defs[type] || 10;
        break;
    }
  }

  private createShieldVisual(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(1.0, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.playerShield,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    this.shieldMesh = new THREE.Mesh(geo, mat);
    this.shieldMesh.position.copy(this.mesh.position);
    scene.add(this.shieldMesh);
  }

  private createDecoys(scene: THREE.Scene) {
    const offsets = [-3, 3];
    for (const offset of offsets) {
      const decoy = this.mesh.clone();
      decoy.position.x = this.x + offset;
      decoy.position.y = this.y;
      decoy.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = (child.material as THREE.Material).clone();
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.transparent = true;
            mat.opacity = 0.4;
          }
          child.material = mat;
        }
      });
      scene.add(decoy);
      this.decoys.push(decoy);
    }
  }

  clearPowerup() {
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.shieldHits = 0;
    this.phaseActive = false;

    if (this.shieldMesh) {
      this.shieldMesh.removeFromParent();
      this.shieldMesh = null;
    }

    for (const decoy of this.decoys) {
      decoy.removeFromParent();
    }
    this.decoys = [];
  }

  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.x, this.y, 0),
      new THREE.Vector3(1.2, 0.5, 0.8)
    );
  }
}
