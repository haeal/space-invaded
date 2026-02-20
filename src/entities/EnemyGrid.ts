import * as THREE from 'three';
import {
  ENEMY_LATERAL_SPEED,
  ENEMY_DROP_DISTANCE,
  ENEMY_FIRE_CHANCE,
  GAME_WIDTH,
  EnemyType,
} from '../config/constants';
import { WaveDef } from '../config/waves';
import { EnemyData, createEnemyMesh, getEnemyHP, getEnemyScore } from './Enemy';

export class EnemyGrid {
  group: THREE.Group;
  enemies: EnemyData[] = [];

  private direction = 1; // 1 = right, -1 = left
  private lateralSpeed: number;
  private fireChance: number;
  private speedMultiplier: number;
  private time = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private needsDrop = false;

  // Boss reference (if boss wave)
  boss: EnemyData | null = null;

  constructor(waveDef: WaveDef) {
    this.group = new THREE.Group();
    this.lateralSpeed = ENEMY_LATERAL_SPEED * waveDef.speedMultiplier;
    this.fireChance = ENEMY_FIRE_CHANCE * waveDef.fireRateMultiplier;
    this.speedMultiplier = waveDef.speedMultiplier;

    const spacing = 1.4;
    const startX = -((waveDef.cols - 1) * spacing) / 2;
    const startY = 10;

    for (let row = 0; row < waveDef.rows; row++) {
      const type = waveDef.composition[row] || EnemyType.DRONE;
      for (let col = 0; col < waveDef.cols; col++) {
        const mesh = createEnemyMesh(type);
        const x = startX + col * spacing;
        const y = startY - row * spacing;
        mesh.position.set(x, y, 0);
        this.group.add(mesh);

        const hp = getEnemyHP(type, waveDef.hpMultiplier);
        this.enemies.push({
          type,
          mesh,
          hp,
          maxHp: hp,
          gridCol: col,
          gridRow: row,
          alive: true,
          hitFlash: 0,
        });
      }
    }

    // If boss wave, add the boss in the center-top
    if (waveDef.isBoss) {
      const bossMesh = createEnemyMesh(EnemyType.BOSS);
      bossMesh.position.set(0, startY + 2, 0);
      this.group.add(bossMesh);
      const bossHp = getEnemyHP(EnemyType.BOSS, waveDef.hpMultiplier);
      this.boss = {
        type: EnemyType.BOSS,
        mesh: bossMesh,
        hp: bossHp,
        maxHp: bossHp,
        gridCol: Math.floor(waveDef.cols / 2),
        gridRow: -1,
        alive: true,
        hitFlash: 0,
      };
      this.enemies.push(this.boss);
    }
  }

  get aliveCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  get allDead(): boolean {
    return this.aliveCount === 0;
  }

  update(dt: number, chronoActive: boolean) {
    this.time += dt;
    const timeMult = chronoActive ? 0.5 : 1.0;

    // Increase speed as enemies are killed (classic Space Invaders mechanic)
    const aliveRatio = this.aliveCount / Math.max(this.enemies.length, 1);
    const killSpeedBoost = 1 + (1 - aliveRatio) * 1.5;
    const effectiveSpeed = this.lateralSpeed * killSpeedBoost * timeMult;

    // Lateral movement
    this.gridOffsetX += this.direction * effectiveSpeed * dt;

    // Check boundaries — find leftmost and rightmost alive enemy
    let minX = Infinity, maxX = -Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const worldX = e.mesh.position.x + this.gridOffsetX;
      if (worldX < minX) minX = worldX;
      if (worldX > maxX) maxX = worldX;
    }

    const bound = GAME_WIDTH / 2 - 0.5;
    if (maxX >= bound && this.direction > 0) {
      this.direction = -1;
      this.needsDrop = true;
    } else if (minX <= -bound && this.direction < 0) {
      this.direction = 1;
      this.needsDrop = true;
    }

    // Drop down
    if (this.needsDrop) {
      this.gridOffsetY -= ENEMY_DROP_DISTANCE;
      this.needsDrop = false;
    }

    // Apply position to group
    this.group.position.x = this.gridOffsetX;
    this.group.position.y = this.gridOffsetY;

    // Animate individual enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Hover animation
      // Flat 2D — no Z wobble

      // Hit flash
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = 2.0;
          }
        });
      } else {
        e.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = 0.6;
          }
        });
      }
    }
  }

  getWorldPosition(enemy: EnemyData): THREE.Vector3 {
    const pos = enemy.mesh.position.clone();
    pos.x += this.gridOffsetX;
    pos.y += this.gridOffsetY;
    return pos;
  }

  getBoundingBox(enemy: EnemyData): THREE.Box3 {
    const pos = this.getWorldPosition(enemy);
    const size = enemy.type === EnemyType.BOSS
      ? new THREE.Vector3(2.5, 0.8, 1.5)
      : new THREE.Vector3(0.7, 0.7, 0.7);
    return new THREE.Box3().setFromCenterAndSize(pos, size);
  }

  getShooters(): EnemyData[] {
    // Only front-row enemies per column can shoot
    const columnFront: Map<number, EnemyData> = new Map();
    for (const e of this.enemies) {
      if (!e.alive || e.type === EnemyType.BOSS) continue;
      const existing = columnFront.get(e.gridCol);
      if (!existing || e.gridRow < existing.gridRow) {
        columnFront.set(e.gridCol, e);
      }
    }
    // Mechs from any row can also shoot
    for (const e of this.enemies) {
      if (!e.alive || e.type !== EnemyType.MECH) continue;
      if (!columnFront.has(e.gridCol + 100)) {
        columnFront.set(e.gridCol + 100, e);
      }
    }
    return Array.from(columnFront.values());
  }

  getRandomShootPosition(dt: number): THREE.Vector3 | null {
    const shooters = this.getShooters();
    for (const s of shooters) {
      if (Math.random() < this.fireChance * dt * 60) {
        return this.getWorldPosition(s);
      }
    }
    // Boss shoots more frequently
    if (this.boss && this.boss.alive && Math.random() < this.fireChance * dt * 120) {
      return this.getWorldPosition(this.boss);
    }
    return null;
  }

  hasReachedBottom(): boolean {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const pos = this.getWorldPosition(e);
      if (pos.y <= -11) return true;
    }
    return false;
  }

  damageEnemy(enemy: EnemyData, damage: number): boolean {
    enemy.hp -= damage;
    enemy.hitFlash = 0.1;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.mesh.visible = false;
      return true; // killed
    }
    return false;
  }

  getScoreForEnemy(enemy: EnemyData): number {
    return getEnemyScore(enemy.type);
  }

  getAliveEnemies(): EnemyData[] {
    return this.enemies.filter((e) => e.alive);
  }

  dispose() {
    this.group.removeFromParent();
  }
}
