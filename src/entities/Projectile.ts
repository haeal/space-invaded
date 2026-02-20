import * as THREE from 'three';
import { COLORS, PROJECTILE_SPEED, ENEMY_PROJECTILE_SPEED } from '../config/constants';

export interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  alive: boolean;
  isPlayerProjectile: boolean;
  piercing: boolean;
  damage: number;
}

export class ProjectilePool {
  projectiles: Projectile[] = [];
  private scene: THREE.Scene;

  // Shared geometries & materials
  private playerBoltGeo: THREE.SphereGeometry;
  private playerBoltMat: THREE.MeshBasicMaterial;
  private enemyBoltGeo: THREE.SphereGeometry;
  private enemyBoltMat: THREE.MeshBasicMaterial;
  private beamGeo: THREE.CylinderGeometry;
  private beamMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.playerBoltGeo = new THREE.SphereGeometry(0.08, 6, 4);
    this.playerBoltMat = new THREE.MeshBasicMaterial({
      color: COLORS.playerProjectile,
      transparent: true,
      opacity: 0.9,
    });
    this.enemyBoltGeo = new THREE.SphereGeometry(0.06, 6, 4);
    this.enemyBoltMat = new THREE.MeshBasicMaterial({
      color: COLORS.enemyProjectile,
      transparent: true,
      opacity: 0.9,
    });
    this.beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    });
  }

  firePlayerBolt(x: number, y: number, angle = 0, piercing = false) {
    const mesh = new THREE.Mesh(this.playerBoltGeo, this.playerBoltMat.clone());
    mesh.position.set(x, y + 0.3, 0);

    // Trail elongation
    mesh.scale.set(1, 2.5, 1);

    const vx = Math.sin(angle) * PROJECTILE_SPEED;
    const vy = Math.cos(angle) * PROJECTILE_SPEED;

    const proj: Projectile = {
      mesh,
      velocity: new THREE.Vector3(vx, vy, 0),
      alive: true,
      isPlayerProjectile: true,
      piercing,
      damage: 1,
    };
    this.projectiles.push(proj);
    this.scene.add(mesh);
  }

  fireEnemyBolt(x: number, y: number) {
    const mesh = new THREE.Mesh(this.enemyBoltGeo, this.enemyBoltMat.clone());
    mesh.position.set(x, y - 0.3, 0);
    mesh.scale.set(1, 2, 1);

    const proj: Projectile = {
      mesh,
      velocity: new THREE.Vector3(0, -ENEMY_PROJECTILE_SPEED, 0),
      alive: true,
      isPlayerProjectile: false,
      piercing: false,
      damage: 1,
    };
    this.projectiles.push(proj);
    this.scene.add(mesh);
  }

  fireBeam(x: number, y: number) {
    // Continuous beam for Quantum Beam powerup
    const mesh = new THREE.Mesh(this.beamGeo, this.beamMat.clone());
    mesh.position.set(x, y + 0.5, 0);
    mesh.scale.set(2, 60, 2);

    const proj: Projectile = {
      mesh,
      velocity: new THREE.Vector3(0, PROJECTILE_SPEED * 2, 0),
      alive: true,
      isPlayerProjectile: true,
      piercing: true,
      damage: 2,
    };
    this.projectiles.push(proj);
    this.scene.add(mesh);
  }

  fireNanoSwarm(x: number, y: number, targetX: number, targetY: number) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xccff00 })
    );
    mesh.position.set(x, y, 0);

    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = PROJECTILE_SPEED * 0.8;

    const proj: Projectile = {
      mesh,
      velocity: new THREE.Vector3((dx / len) * speed, (dy / len) * speed, 0),
      alive: true,
      isPlayerProjectile: true,
      piercing: false,
      damage: 1,
    };
    this.projectiles.push(proj);
    this.scene.add(mesh);
  }

  update(dt: number) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

      // Remove if out of bounds
      if (
        p.mesh.position.y > 18 ||
        p.mesh.position.y < -16 ||
        Math.abs(p.mesh.position.x) > 15
      ) {
        p.alive = false;
        p.mesh.visible = false;
        this.scene.remove(p.mesh);
      }
    }

    // Cleanup dead projectiles periodically
    if (this.projectiles.length > 200) {
      this.projectiles = this.projectiles.filter((p) => p.alive);
    }
  }

  killProjectile(p: Projectile) {
    p.alive = false;
    p.mesh.visible = false;
    this.scene.remove(p.mesh);
  }

  clearAll() {
    for (const p of this.projectiles) {
      p.alive = false;
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];
  }

  getPlayerProjectiles(): Projectile[] {
    return this.projectiles.filter((p) => p.alive && p.isPlayerProjectile);
  }

  getEnemyProjectiles(): Projectile[] {
    return this.projectiles.filter((p) => p.alive && !p.isPlayerProjectile);
  }
}
