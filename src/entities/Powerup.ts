import * as THREE from 'three';
import { POWERUP_FALL_SPEED } from '../config/constants';
import { PowerupType, POWERUP_DEFS, ALL_POWERUP_TYPES } from '../config/powerups';

export interface PowerupEntity {
  mesh: THREE.Group;
  type: PowerupType;
  alive: boolean;
  y: number;
  x: number;
}

export class PowerupManager {
  powerups: PowerupEntity[] = [];
  private scene: THREE.Scene;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnAt(x: number, y: number) {
    const type = ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)];
    const def = POWERUP_DEFS[type];

    const group = new THREE.Group();

    // Core gem
    const coreGeo = new THREE.OctahedronGeometry(0.25);
    const coreMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.glowColor,
      emissiveIntensity: 1.0,
      metalness: 0.3,
      roughness: 0.2,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    group.add(ring);

    // Glow light
    const light = new THREE.PointLight(def.glowColor, 1.5, 3);
    group.add(light);

    group.position.set(x, y, 0);
    this.scene.add(group);

    this.powerups.push({
      mesh: group,
      type,
      alive: true,
      x,
      y,
    });
  }

  update(dt: number) {
    this.time += dt;

    for (const p of this.powerups) {
      if (!p.alive) continue;

      p.y -= POWERUP_FALL_SPEED * dt;
      p.mesh.position.y = p.y;

      // Spin
      p.mesh.rotation.y += dt * 3;
      p.mesh.rotation.x = Math.sin(this.time * 2) * 0.3;

      // Pulse scale
      const pulse = 1 + Math.sin(this.time * 5) * 0.1;
      p.mesh.scale.setScalar(pulse);

      // Out of bounds
      if (p.y < -15) {
        p.alive = false;
        p.mesh.visible = false;
        this.scene.remove(p.mesh);
      }
    }

    // Cleanup
    if (this.powerups.length > 50) {
      this.powerups = this.powerups.filter((p) => p.alive);
    }
  }

  getBoundingBox(p: PowerupEntity): THREE.Box3 {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(p.x, p.y, 0),
      new THREE.Vector3(0.7, 0.7, 0.7)
    );
  }

  collect(p: PowerupEntity) {
    p.alive = false;
    this.scene.remove(p.mesh);
  }

  clearAll() {
    for (const p of this.powerups) {
      p.alive = false;
      this.scene.remove(p.mesh);
    }
    this.powerups = [];
  }
}
