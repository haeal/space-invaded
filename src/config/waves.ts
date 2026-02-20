import { EnemyType } from './constants';

export interface WaveDef {
  wave: number;
  cols: number;
  rows: number;
  composition: EnemyType[]; // one entry per row, from front (bottom) to back (top)
  speedMultiplier: number;
  fireRateMultiplier: number;
  hpMultiplier: number;
  isBoss: boolean;
}

function generateWave(n: number): WaveDef {
  const isBoss = n % 5 === 0 && n > 0;

  if (isBoss) {
    return {
      wave: n,
      cols: Math.min(6 + Math.floor(n / 10), 10),
      rows: 3,
      composition: [EnemyType.MECH, EnemyType.ROCKET, EnemyType.DRONE],
      speedMultiplier: 1 + n * 0.08,
      fireRateMultiplier: 1 + n * 0.06,
      hpMultiplier: 1 + n * 0.15,
      isBoss: true,
    };
  }

  const baseCols = Math.min(8 + Math.floor(n / 3), 12);
  const baseRows = Math.min(5 + Math.floor(n / 4), 8);

  // Build composition: front rows are drones, middle are rockets, back are mechs
  const composition: EnemyType[] = [];
  for (let r = 0; r < baseRows; r++) {
    const ratio = r / (baseRows - 1);
    if (ratio < 0.4) composition.push(EnemyType.DRONE);
    else if (ratio < 0.75) composition.push(EnemyType.ROCKET);
    else composition.push(EnemyType.MECH);
  }

  return {
    wave: n,
    cols: baseCols,
    rows: baseRows,
    composition,
    speedMultiplier: 1 + n * 0.06,
    fireRateMultiplier: 1 + n * 0.04,
    hpMultiplier: 1 + n * 0.1,
    isBoss: false,
  };
}

export function getWaveDef(waveNumber: number): WaveDef {
  return generateWave(waveNumber);
}
