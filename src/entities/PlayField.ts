import * as THREE from 'three';
import { COLORS, GRID_SIZE, GRID_DIVISIONS } from '../config/constants';

/* ═══════════════════ Alien-world constants ═══════════════════ */
const PLANET_RADIUS = 50;
const PLANET_CENTER_Y = -63;
const ATMOS_INNER = PLANET_RADIUS;
const ATMOS_OUTER = PLANET_RADIUS + 3.5;
const SUN_ORBIT_R = PLANET_RADIUS + 2;

/* ═══════════════════ GLSL Shaders ═══════════════════ */

// Shared simple vertex shader (just passes UVs)
const BASIC_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ── Planet surface ──
const PLANET_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uSunDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float dist = length(c);
  if (dist > 1.0) discard;

  // Multi-octave terrain
  vec2 uv1 = c * 6.0;
  float t1 = fbm(uv1);
  float t2 = fbm(uv1 * 1.5 + 50.0);
  float t3 = fbm(uv1 * 0.5 + 200.0);

  // Palette
  vec3 ocean  = vec3(0.01, 0.03, 0.09);
  vec3 land1  = vec3(0.02, 0.09, 0.13);
  vec3 land2  = vec3(0.11, 0.02, 0.20);
  vec3 biolum = vec3(0.0, 0.65, 0.4);

  vec3 col = mix(ocean, land1, smoothstep(0.35, 0.55, t1));
  col = mix(col, land2, smoothstep(0.50, 0.70, t2) * 0.7);

  // Bio-luminescent veins
  float veins = abs(sin(t1 * 30.0 + c.x * 10.0)) * abs(cos(t2 * 25.0 + c.y * 8.0));
  veins = smoothstep(0.93, 0.98, veins);
  col += biolum * veins * 0.4 * (0.6 + 0.4 * sin(uTime * 1.5 + t1 * 10.0));

  // Alien cities / volcanoes
  float spots = smoothstep(0.72, 0.74, t3) * smoothstep(0.77, 0.74, t3);
  col += vec3(0.5, 0.15, 0.7) * spots * 0.6 * (0.7 + 0.3 * sin(uTime * 3.0));

  // Limb darkening (edges fade out like a real planet)
  col *= 1.0 - 0.7 * smoothstep(0.6, 1.0, dist);

  // Day / night terminator
  float sunlit = dot(normalize(c), uSunDir) * 0.5 + 0.5;
  vec3 nightCol = col * 0.04 + biolum * veins * 0.25
                + vec3(0.5, 0.15, 0.7) * spots * 0.3;
  col = mix(nightCol, col * 0.6, smoothstep(-0.1, 0.5, sunlit));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Atmosphere ring ──
const ATMOS_VERT = `
varying vec2 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOS_FRAG = `
precision highp float;
varying vec2 vWorldPos;
uniform float uSunAngle;
uniform float uTime;
uniform vec2  uCenter;
uniform float uInner;
uniform float uOuter;

void main() {
  vec2  dir   = vWorldPos - uCenter;
  float dist  = length(dir);
  float angle = atan(dir.y, dir.x);
  float t     = clamp((dist - uInner) / (uOuter - uInner), 0.0, 1.0);

  // Layered alien atmosphere
  vec3 inner = vec3(0.15, 0.0, 0.35);
  vec3 mid   = vec3(0.0, 0.35, 0.45);
  vec3 outer = vec3(0.05, 0.15, 0.50);
  vec3 col   = mix(inner, mid, smoothstep(0.0, 0.4, t));
  col        = mix(col, outer, smoothstep(0.4, 1.0, t));

  // Sun-proximity brightening
  float ad = mod(angle - uSunAngle + 3.14159, 6.28318) - 3.14159;
  float sp = exp(-ad * ad * 2.5);

  vec3 warm = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.5, 0.1), t);
  col = mix(col, warm, sp * 0.5);
  col += vec3(1.0, 0.95, 0.85) * sp * sp * 0.6;

  float alpha = (1.0 - t) * 0.4 + sp * 0.35;
  alpha *= 0.85 + 0.15 * sin(uTime * 0.7 + angle * 5.0);

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

// ── Sun glow + lens flare ──
const SUN_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;

void main() {
  vec2  c = vUv * 2.0 - 1.0;
  float d = length(c);

  // Core + glow layers (tight falloff so it vanishes well inside the quad)
  float core  = smoothstep(0.06, 0.0, d) * 0.8;
  float inner = exp(-d * 8.0) * 0.5;
  float outer = exp(-d * 3.0) * 0.18;

  // Anamorphic horizontal lens flare streak
  float hStreak = exp(-abs(c.y) * 12.0) * exp(-abs(c.x) * 1.8) * 0.35;

  // Vertical streak (smaller)
  float vStreak = exp(-abs(c.x) * 14.0) * exp(-abs(c.y) * 2.5) * 0.12;

  // Star-burst rays
  float angle = atan(c.y, c.x);
  float rays4 = pow(abs(cos(angle * 2.0)), 40.0) * exp(-d * 4.0) * 0.15;
  float rays6 = pow(abs(sin(angle * 3.0)), 30.0) * exp(-d * 5.0) * 0.08;

  // Ghosts (lens flare circles)
  float ghost1 = smoothstep(0.02, 0.0, abs(d - 0.25)) * 0.06;
  float ghost2 = smoothstep(0.015, 0.0, abs(d - 0.42)) * 0.03;

  // Chromatic aberration on ghosts
  float gDist1 = abs(d - 0.25);
  vec3 ghostCol1 = vec3(
    smoothstep(0.03, 0.0, gDist1) * 0.04,
    smoothstep(0.025, 0.0, gDist1) * 0.06,
    smoothstep(0.02, 0.0, gDist1) * 0.08
  );

  float b = core + inner + outer + hStreak + vStreak + rays4 + rays6 + ghost1 + ghost2;

  vec3 coreC  = vec3(1.0, 1.0, 0.97);
  vec3 glowC  = vec3(1.0, 0.82, 0.35);
  vec3 outerC = vec3(1.0, 0.5, 0.12);
  vec3 flareC = vec3(0.7, 0.85, 1.0);

  vec3 col = outerC * outer;
  col += glowC * inner;
  col += coreC * core;
  col += mix(glowC, flareC, 0.5) * hStreak;
  col += flareC * vStreak;
  col += glowC * (rays4 + rays6);
  col += ghostCol1;
  col += vec3(0.6, 0.7, 1.0) * ghost2;

  gl_FragColor = vec4(col, clamp(b, 0.0, 1.0));
}
`;

/* ═══════════════════ PlayField class ═══════════════════ */

export class PlayField {
  group: THREE.Group;
  private time = 0;

  private planetMat: THREE.ShaderMaterial;
  private atmosMat: THREE.ShaderMaterial;
  private sunMat!: THREE.ShaderMaterial;
  private sunGroup: THREE.Group;
  private stars: THREE.Points;

  constructor() {
    this.group = new THREE.Group();

    this.stars = this.buildStars();
    this.group.add(this.stars);

    this.sunGroup = this.buildSun();
    this.group.add(this.sunGroup);

    const planet = this.buildPlanet();
    this.planetMat = planet.mat;
    this.group.add(planet.mesh);

    const atmos = this.buildAtmosphere();
    this.atmosMat = atmos.mat;
    this.group.add(atmos.mesh);

    this.group.add(this.buildGrid());
  }

  /* ──────────── builders ──────────── */

  private buildStars(): THREE.Points {
    const COUNT = 350;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 35 - 10;   // mostly above planet
      pos[i * 3 + 2] = -8;

      const hue = Math.random() < 0.7
        ? 0.6 + Math.random() * 0.1        // pale blue
        : 0.08 + Math.random() * 0.08;     // warm white
      const c = new THREE.Color().setHSL(hue, 0.3, 0.6 + Math.random() * 0.4);
      col[i * 3]     = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    return new THREE.Points(geo, mat);
  }

  private buildSun(): THREE.Group {
    const g = new THREE.Group();

    const glowGeo = new THREE.PlaneGeometry(30, 30);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: BASIC_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    this.sunMat = glowMat;
    g.add(new THREE.Mesh(glowGeo, glowMat));

    g.position.z = -6;
    return g;
  }

  private buildPlanet() {
    const geo = new THREE.CircleGeometry(PLANET_RADIUS, 128);
    const mat = new THREE.ShaderMaterial({
      vertexShader: BASIC_VERT,
      fragmentShader: PLANET_FRAG,
      uniforms: {
        uTime:   { value: 0 },
        uSunDir: { value: new THREE.Vector2(0, 1) },
      },
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, PLANET_CENTER_Y, -5);
    return { mesh, mat };
  }

  private buildAtmosphere() {
    const geo = new THREE.RingGeometry(ATMOS_INNER, ATMOS_OUTER, 128, 4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      uniforms: {
        uSunAngle: { value: Math.PI * 0.5 },
        uTime:     { value: 0 },
        uCenter:   { value: new THREE.Vector2(0, PLANET_CENTER_Y) },
        uInner:    { value: ATMOS_INNER as number },
        uOuter:    { value: ATMOS_OUTER as number },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, PLANET_CENTER_Y, -4);
    return { mesh, mat };
  }

  private buildGrid(): THREE.LineSegments {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const spacing = GRID_SIZE / GRID_DIVISIONS;
    const half = GRID_SIZE / 2;
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const p = -half + i * spacing;
      verts.push(p, -half, -2, p, half, -2);
      verts.push(-half, p, -2, half, p, -2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: COLORS.gridColor,
        transparent: true,
        opacity: 0.05,
      }),
    );
  }

  /* ──────────── animation loop ──────────── */

  update(dt: number) {
    this.time += dt;

    // Cinematic sunrise: sun rises straight up from behind the planet
    // Slow cycle: ~100s full period. Starts below horizon, rises to just
    // above the limb, lingers, then sinks back.
    const cycle = this.time * 0.025;                        // slow pace
    const rise = Math.sin(cycle) * 0.5 + 0.5;              // 0 → 1 → 0
    const sunAngle = Math.PI * 0.5 * (0.6 + rise * 0.55);  // ~27°→~52° from center
    const sunX = Math.cos(sunAngle) * SUN_ORBIT_R;          // stays near center-x
    const sunY = PLANET_CENTER_Y + Math.sin(sunAngle) * SUN_ORBIT_R;
    this.sunGroup.position.set(sunX, sunY, -6);

    // Sun uniform
    this.sunMat.uniforms.uTime.value = this.time;

    // Planet uniforms
    this.planetMat.uniforms.uTime.value = this.time;
    this.planetMat.uniforms.uSunDir.value.set(
      Math.cos(sunAngle),
      Math.sin(sunAngle),
    );

    // Atmosphere uniforms
    this.atmosMat.uniforms.uSunAngle.value = sunAngle;
    this.atmosMat.uniforms.uTime.value = this.time;

    // Gentle star drift
    const positions = this.stars.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(this.time * 0.5 + i) * 0.001;
    }
    this.stars.geometry.attributes.position.needsUpdate = true;
  }
}
