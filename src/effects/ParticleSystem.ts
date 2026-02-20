import * as THREE from 'three';
import { COLORS } from '../config/constants';

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private bursts: ParticleBurst[] = [];
  private scene: THREE.Scene;

  // Tesla coil lines
  teslaLines: THREE.Line[] = [];

  // Orbital beam
  orbitalBeam: THREE.Mesh | null = null;
  orbitalTimer = 0;

  // Gravity well visual
  gravityWell: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createExplosion(x: number, y: number, color?: number, count = 30) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const baseColor = new THREE.Color(color ?? COLORS.explosion[Math.floor(Math.random() * COLORS.explosion.length)]);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.sin(angle) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 3;

      const c = baseColor.clone();
      c.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({
      points,
      velocities,
      life: 0.8,
      maxLife: 0.8,
    });
  }

  showTeslaArc(x1: number, y1: number, x2: number, y2: number) {
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(x1, x2, t) + (i > 0 && i < segments ? (Math.random() - 0.5) * 0.5 : 0),
          THREE.MathUtils.lerp(y1, y2, t) + (i > 0 && i < segments ? (Math.random() - 0.5) * 0.5 : 0),
          0
        )
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.teslaLines.push(line);

    // Auto remove after short time
    setTimeout(() => {
      this.scene.remove(line);
      const idx = this.teslaLines.indexOf(line);
      if (idx >= 0) this.teslaLines.splice(idx, 1);
    }, 100);
  }

  showOrbitalCannon(x: number) {
    if (this.orbitalBeam) {
      this.scene.remove(this.orbitalBeam);
    }
    const geo = new THREE.CylinderGeometry(0.5, 0.3, 30, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.orbitalBeam = new THREE.Mesh(geo, mat);
    this.orbitalBeam.position.set(x, 2, 0);
    this.scene.add(this.orbitalBeam);
    this.orbitalTimer = 0.6;

    // Also create a big flash
    this.createExplosion(x, 5, 0xff00ff, 50);
    this.createExplosion(x, 0, 0xff00ff, 50);
    this.createExplosion(x, -5, 0xff00ff, 50);
  }

  showGravityWell(x: number, y: number) {
    if (this.gravityWell) {
      this.scene.remove(this.gravityWell);
    }
    const geo = new THREE.TorusGeometry(2, 0.1, 8, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6600ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.gravityWell = new THREE.Mesh(geo, mat);
    this.gravityWell.position.set(x, y, 0);
    this.gravityWell.rotation.x = Math.PI / 2;
    this.scene.add(this.gravityWell);
  }

  hideGravityWell() {
    if (this.gravityWell) {
      this.scene.remove(this.gravityWell);
      this.gravityWell = null;
    }
  }

  update(dt: number) {
    // Update particle bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life -= dt;

      if (burst.life <= 0) {
        this.scene.remove(burst.points);
        this.bursts.splice(i, 1);
        continue;
      }

      const positions = burst.points.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < positions.length; j += 3) {
        positions[j] += burst.velocities[j] * dt;
        positions[j + 1] += burst.velocities[j + 1] * dt;
        positions[j + 2] += burst.velocities[j + 2] * dt;
        // Gravity
        burst.velocities[j + 1] -= 5 * dt;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;

      const progress = 1 - burst.life / burst.maxLife;
      (burst.points.material as THREE.PointsMaterial).opacity = 1 - progress;
    }

    // Orbital beam
    if (this.orbitalBeam) {
      this.orbitalTimer -= dt;
      if (this.orbitalTimer <= 0) {
        this.scene.remove(this.orbitalBeam);
        this.orbitalBeam = null;
      } else {
        (this.orbitalBeam.material as THREE.MeshBasicMaterial).opacity =
          this.orbitalTimer / 0.6 * 0.7;
      }
    }

    // Gravity well spin
    if (this.gravityWell) {
      this.gravityWell.rotation.z += dt * 4;
      const pulse = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
      (this.gravityWell.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }

  clearAll() {
    for (const b of this.bursts) {
      this.scene.remove(b.points);
    }
    this.bursts = [];
    for (const l of this.teslaLines) {
      this.scene.remove(l);
    }
    this.teslaLines = [];
    if (this.orbitalBeam) {
      this.scene.remove(this.orbitalBeam);
      this.orbitalBeam = null;
    }
    this.hideGravityWell();
  }
}
