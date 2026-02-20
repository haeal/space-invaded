import * as THREE from 'three';
import { COLORS, EnemyType } from '../config/constants';

export interface EnemyData {
  type: EnemyType;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  gridCol: number;
  gridRow: number;
  alive: boolean;
  hitFlash: number;
}

function createDroneMesh(): THREE.Group {
  const group = new THREE.Group();
  // Small quad body
  const bodyGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.dronePrimary,
    emissive: COLORS.droneEmissive,
    emissiveIntensity: 0.6,
    metalness: 0.5,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // 4 rotors
  const rotorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 6);
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    emissive: 0x666666,
    emissiveIntensity: 0.3,
  });
  const positions = [
    [-0.25, 0.1, -0.25],
    [0.25, 0.1, -0.25],
    [-0.25, 0.1, 0.25],
    [0.25, 0.1, 0.25],
  ];
  for (const [x, y, z] of positions) {
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.set(x, y, z);
    group.add(rotor);
  }
  return group;
}

function createRocketMesh(): THREE.Group {
  const group = new THREE.Group();
  // Cylindrical body
  const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.7, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.rocketPrimary,
    emissive: COLORS.rocketEmissive,
    emissiveIntensity: 0.6,
    metalness: 0.6,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI; // point downward
  group.add(body);

  // Nose cone
  const noseGeo = new THREE.ConeGeometry(0.15, 0.25, 8);
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffaa33,
    emissiveIntensity: 0.5,
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.y = -0.45;
  nose.rotation.x = Math.PI;
  group.add(nose);

  // Fins
  const finGeo = new THREE.BoxGeometry(0.05, 0.3, 0.15);
  const finMat = new THREE.MeshStandardMaterial({ color: 0xcc6622, metalness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 0.2, 0.25, Math.sin(angle) * 0.2);
    group.add(fin);
  }

  return group;
}

function createMechMesh(): THREE.Group {
  const group = new THREE.Group();

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
  const torsoMat = new THREE.MeshStandardMaterial({
    color: COLORS.mechPrimary,
    emissive: COLORS.mechEmissive,
    emissiveIntensity: 0.7,
    metalness: 0.8,
    roughness: 0.2,
  });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  group.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.25, 0.2, 0.25);
  const head = new THREE.Mesh(headGeo, torsoMat);
  head.position.y = 0.3;
  group.add(head);

  // Eyes (emissive)
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.02);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.06, 0.32, 0.13);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.06, 0.32, 0.13);
  group.add(eyeR);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
  const armMat = new THREE.MeshStandardMaterial({
    color: 0xaa2244,
    metalness: 0.7,
    roughness: 0.3,
  });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.35, -0.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.35, -0.05, 0);
  group.add(armR);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.14, 0.3, 0.14);
  const legL = new THREE.Mesh(legGeo, armMat);
  legL.position.set(-0.15, -0.35, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, armMat);
  legR.position.set(0.15, -0.35, 0);
  group.add(legR);

  group.scale.setScalar(0.8);
  return group;
}

function createBossMesh(): THREE.Group {
  const group = new THREE.Group();

  // Large hull
  const hullGeo = new THREE.SphereGeometry(1.2, 16, 12);
  hullGeo.scale(1, 0.3, 0.7);
  const hullMat = new THREE.MeshStandardMaterial({
    color: COLORS.bossPrimary,
    emissive: COLORS.bossEmissive,
    emissiveIntensity: 0.8,
    metalness: 0.7,
    roughness: 0.2,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  group.add(hull);

  // Command bridge
  const bridgeGeo = new THREE.BoxGeometry(0.6, 0.3, 0.4);
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff4488,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
  });
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.position.y = 0.25;
  group.add(bridge);

  // Engine pods
  const podGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
  const podMat = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff0022,
    emissiveIntensity: 0.6,
  });
  const podL = new THREE.Mesh(podGeo, podMat);
  podL.position.set(-1.0, 0, 0);
  group.add(podL);
  const podR = new THREE.Mesh(podGeo, podMat);
  podR.position.set(1.0, 0, 0);
  group.add(podR);

  // Glow
  const light = new THREE.PointLight(0xff0066, 2, 6);
  light.position.y = -0.3;
  group.add(light);

  return group;
}

export function createEnemyMesh(type: EnemyType): THREE.Group {
  switch (type) {
    case EnemyType.DRONE:
      return createDroneMesh();
    case EnemyType.ROCKET:
      return createRocketMesh();
    case EnemyType.MECH:
      return createMechMesh();
    case EnemyType.BOSS:
      return createBossMesh();
  }
}

export function getEnemyHP(type: EnemyType, hpMultiplier: number): number {
  const base: Record<EnemyType, number> = {
    [EnemyType.DRONE]: 1,
    [EnemyType.ROCKET]: 2,
    [EnemyType.MECH]: 4,
    [EnemyType.BOSS]: 30,
  };
  return Math.ceil(base[type] * hpMultiplier);
}

export function getEnemyScore(type: EnemyType): number {
  const scores: Record<EnemyType, number> = {
    [EnemyType.DRONE]: 10,
    [EnemyType.ROCKET]: 25,
    [EnemyType.MECH]: 50,
    [EnemyType.BOSS]: 500,
  };
  return scores[type];
}
