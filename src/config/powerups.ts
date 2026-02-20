export enum PowerupType {
  PLASMA_SHIELD = 'plasma_shield',
  TRI_SHOT = 'tri_shot',
  CHRONO_FIELD = 'chrono_field',
  GRAVITY_WELL = 'gravity_well',
  QUANTUM_BEAM = 'quantum_beam',
  HOLO_DECOY = 'holo_decoy',
  NANO_SWARM = 'nano_swarm',
  PHASE_SHIFT = 'phase_shift',
  TESLA_COIL = 'tesla_coil',
  ORBITAL_CANNON = 'orbital_cannon',
}

export interface PowerupDef {
  type: PowerupType;
  name: string;
  description: string;
  duration: number; // seconds, 0 = instant
  color: number;
  glowColor: number;
}

export const POWERUP_DEFS: Record<PowerupType, PowerupDef> = {
  [PowerupType.PLASMA_SHIELD]: {
    type: PowerupType.PLASMA_SHIELD,
    name: 'Plasma Shield',
    description: 'Absorbs 3 hits',
    duration: 0, // until depleted
    color: 0x00aaff,
    glowColor: 0x0088ff,
  },
  [PowerupType.TRI_SHOT]: {
    type: PowerupType.TRI_SHOT,
    name: 'Tri-Shot',
    description: 'Fires 3 spread projectiles',
    duration: 10,
    color: 0xff6600,
    glowColor: 0xff4400,
  },
  [PowerupType.CHRONO_FIELD]: {
    type: PowerupType.CHRONO_FIELD,
    name: 'Chrono Field',
    description: 'Slows enemies to 50%',
    duration: 8,
    color: 0xaa00ff,
    glowColor: 0x8800cc,
  },
  [PowerupType.GRAVITY_WELL]: {
    type: PowerupType.GRAVITY_WELL,
    name: 'Gravity Well',
    description: 'Pulls & damages nearby enemies',
    duration: 6,
    color: 0x6600ff,
    glowColor: 0x4400cc,
  },
  [PowerupType.QUANTUM_BEAM]: {
    type: PowerupType.QUANTUM_BEAM,
    name: 'Quantum Beam',
    description: 'Piercing laser through all enemies',
    duration: 5,
    color: 0x00ffff,
    glowColor: 0x00cccc,
  },
  [PowerupType.HOLO_DECOY]: {
    type: PowerupType.HOLO_DECOY,
    name: 'Holo Decoy',
    description: 'Spawns 2 firing decoy copies',
    duration: 12,
    color: 0x00ff66,
    glowColor: 0x00cc44,
  },
  [PowerupType.NANO_SWARM]: {
    type: PowerupType.NANO_SWARM,
    name: 'Nano Swarm',
    description: 'Auto-targeting mini projectiles',
    duration: 8,
    color: 0xccff00,
    glowColor: 0xaacc00,
  },
  [PowerupType.PHASE_SHIFT]: {
    type: PowerupType.PHASE_SHIFT,
    name: 'Phase Shift',
    description: 'Invulnerable, pass through shots',
    duration: 4,
    color: 0xffffff,
    glowColor: 0xccccff,
  },
  [PowerupType.TESLA_COIL]: {
    type: PowerupType.TESLA_COIL,
    name: 'Tesla Coil',
    description: 'Chain lightning between enemies',
    duration: 7,
    color: 0xffff00,
    glowColor: 0xcccc00,
  },
  [PowerupType.ORBITAL_CANNON]: {
    type: PowerupType.ORBITAL_CANNON,
    name: 'Orbital Cannon',
    description: 'Massive beam clears a column',
    duration: 0, // instant
    color: 0xff00ff,
    glowColor: 0xcc00cc,
  },
};

export const ALL_POWERUP_TYPES = Object.values(PowerupType);
