import { GameStateType } from '../config/constants';

type StateListener = (newState: GameStateType, oldState: GameStateType) => void;

export class GameState {
  private _state: GameStateType = GameStateType.MENU;
  private listeners: StateListener[] = [];

  score = 0;
  highScore = 0;
  lives = 3;
  wave = 1;
  comboCount = 0;
  comboTimer = 0;
  shieldHits = 0;

  constructor() {
    const saved = localStorage.getItem('space-invaded-highscore');
    if (saved) this.highScore = parseInt(saved, 10) || 0;
  }

  get state(): GameStateType {
    return this._state;
  }

  setState(s: GameStateType) {
    const old = this._state;
    if (old === s) return;
    this._state = s;
    for (const fn of this.listeners) fn(s, old);
  }

  onStateChange(fn: StateListener) {
    this.listeners.push(fn);
  }

  addScore(pts: number) {
    // Combo multiplier
    this.comboCount++;
    this.comboTimer = 2;
    const multiplier = Math.min(1 + (this.comboCount - 1) * 0.1, 3.0);
    this.score += Math.round(pts * multiplier);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('space-invaded-highscore', String(this.highScore));
    }
  }

  updateCombo(dt: number) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.shieldHits = 0;
  }
}
