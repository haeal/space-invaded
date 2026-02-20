// ── Game Constants ──

export const GAME_WIDTH = 20;
export const GAME_HEIGHT = 28;
export const PLAYER_Y = -12;
export const PLAYER_SPEED = 12;
export const PLAYER_FIRE_RATE = 0.25; // seconds between shots
export const PLAYER_LIVES = 3;

export const PROJECTILE_SPEED = 25;
export const ENEMY_PROJECTILE_SPEED = 12;

export const ENEMY_LATERAL_SPEED = 2.0;
export const ENEMY_DROP_DISTANCE = 0.6;
export const ENEMY_FIRE_CHANCE = 0.003; // per enemy per frame

export const POWERUP_DROP_CHANCE = 0.07;
export const POWERUP_FALL_SPEED = 4;

export const GRID_SIZE = 40;
export const GRID_DIVISIONS = 40;

// Score values
export const SCORE_DRONE = 10;
export const SCORE_ROCKET = 25;
export const SCORE_MECH = 50;
export const SCORE_BOSS = 500;

// Camera (orthographic 2D)
export const CAMERA_FRUSTUM_HALF_HEIGHT = 16;
export const CAMERA_Z = 30;

// Colors (neon palette)
export const COLORS = {
  playerPrimary: 0x00ffcc,
  playerEmissive: 0x00ffaa,
  playerShield: 0x00aaff,

  dronePrimary: 0xff6644,
  droneEmissive: 0xff4422,

  rocketPrimary: 0xffaa33,
  rocketEmissive: 0xff8811,

  mechPrimary: 0xff3355,
  mechEmissive: 0xff1133,

  bossPrimary: 0xff0066,
  bossEmissive: 0xff0044,

  playerProjectile: 0x00ffcc,
  enemyProjectile: 0xff4444,

  gridColor: 0x331166,
  gridEmissive: 0x220044,

  powerupGlow: 0xffff00,

  explosion: [0xff4400, 0xff6600, 0xffaa00, 0xffcc00, 0xffffff],

  background: 0x050510,
  fogColor: 0x080818,
};

export enum EnemyType {
  DRONE = 'drone',
  ROCKET = 'rocket',
  MECH = 'mech',
  BOSS = 'boss',
}

export enum GameStateType {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  WAVE_INTRO = 'wave_intro',
  GAME_OVER = 'game_over',
}
