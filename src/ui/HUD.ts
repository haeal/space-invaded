import { GameStateType } from '../config/constants';
import { POWERUP_DEFS, PowerupType } from '../config/powerups';

export class HUD {
  private scoreEl: HTMLElement;
  private highScoreEl: HTMLElement;
  private waveEl: HTMLElement;
  private livesEl: HTMLElement;
  private livesBarEl: HTMLElement;
  private livesLabelEl: HTMLElement;
  private shieldIndicatorEl: HTMLElement;
  private powerupEl: HTMLElement;
  private powerupBarEl: HTMLElement;
  private comboEl: HTMLElement;
  private maxLives = 3;

  private menuScreen: HTMLElement;
  private pauseScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private waveIntroScreen: HTMLElement;
  private finalScoreEl: HTMLElement;
  private finalHighEl: HTMLElement;
  private waveIntroNumber: HTMLElement;

  constructor() {
    // Create HUD container
    const hud = document.getElementById('hud')!;

    // Top bar
    const topBar = document.createElement('div');
    topBar.className = 'hud-top';
    topBar.innerHTML = `
      <div class="hud-score">SCORE: <span id="score-val">0</span></div>
      <div class="hud-highscore">HI: <span id="highscore-val">0</span></div>
      <div class="hud-wave">WAVE: <span id="wave-val">1</span></div>
    `;
    hud.appendChild(topBar);

    // Bottom bar
    const bottomBar = document.createElement('div');
    bottomBar.className = 'hud-bottom';
    bottomBar.innerHTML = `
      <div class="hud-lives-container">
        <div class="hud-lives-label">HULL <span id="lives-label">3/3</span></div>
        <div class="hud-lives-icons" id="lives-val"></div>
        <div class="hud-lives-bar-outer">
          <div class="hud-lives-bar" id="lives-bar"></div>
        </div>
        <div class="hud-shield-indicator hidden" id="shield-indicator">SHIELD: <span id="shield-hits">0</span></div>
      </div>
      <div class="hud-powerup">
        <span id="powerup-name"></span>
        <div class="powerup-bar-container">
          <div class="powerup-bar" id="powerup-bar"></div>
        </div>
      </div>
      <div class="hud-combo" id="combo-val"></div>
    `;
    hud.appendChild(bottomBar);

    this.scoreEl = document.getElementById('score-val')!;
    this.highScoreEl = document.getElementById('highscore-val')!;
    this.waveEl = document.getElementById('wave-val')!;
    this.livesEl = document.getElementById('lives-val')!;
    this.livesBarEl = document.getElementById('lives-bar')!;
    this.livesLabelEl = document.getElementById('lives-label')!;
    this.shieldIndicatorEl = document.getElementById('shield-indicator')!;
    this.powerupEl = document.getElementById('powerup-name')!;
    this.powerupBarEl = document.getElementById('powerup-bar')!;
    this.comboEl = document.getElementById('combo-val')!;

    // Menu screen
    this.menuScreen = document.getElementById('menu-screen')!;
    this.pauseScreen = document.getElementById('pause-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.waveIntroScreen = document.getElementById('wave-intro-screen')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.finalHighEl = document.getElementById('final-high')!;
    this.waveIntroNumber = document.getElementById('wave-intro-number')!;
  }

  updateScore(score: number) {
    this.scoreEl.textContent = score.toLocaleString();
  }

  updateHighScore(score: number) {
    this.highScoreEl.textContent = score.toLocaleString();
  }

  updateWave(wave: number) {
    this.waveEl.textContent = String(wave);
  }

  updateLives(lives: number, maxLives?: number) {
    if (maxLives !== undefined) this.maxLives = maxLives;
    // Ship icons
    this.livesEl.innerHTML = '';
    for (let i = 0; i < this.maxLives; i++) {
      const active = i < lives;
      this.livesEl.innerHTML += `<span class="life-icon ${active ? '' : 'life-lost'}">${active ? '&#9672;' : '&#9673;'}</span>`;
    }
    // Label
    this.livesLabelEl.textContent = `${lives}/${this.maxLives}`;
    // Bar width & color
    const pct = (lives / this.maxLives) * 100;
    this.livesBarEl.style.width = `${pct}%`;
    if (pct > 60) {
      this.livesBarEl.className = 'hud-lives-bar hp-high';
    } else if (pct > 30) {
      this.livesBarEl.className = 'hud-lives-bar hp-mid';
    } else {
      this.livesBarEl.className = 'hud-lives-bar hp-low';
    }
  }

  updateShield(hits: number) {
    if (hits > 0) {
      this.shieldIndicatorEl.classList.remove('hidden');
      const hitsSpan = document.getElementById('shield-hits')!;
      hitsSpan.textContent = String(hits);
    } else {
      this.shieldIndicatorEl.classList.add('hidden');
    }
  }

  updatePowerup(type: PowerupType | null, timeRemaining: number, totalTime: number) {
    if (!type) {
      this.powerupEl.textContent = '';
      this.powerupBarEl.style.width = '0%';
      return;
    }
    const def = POWERUP_DEFS[type];
    this.powerupEl.textContent = def.name;
    this.powerupEl.style.color = `#${def.color.toString(16).padStart(6, '0')}`;
    const pct = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 100;
    this.powerupBarEl.style.width = `${pct}%`;
    this.powerupBarEl.style.background = `#${def.color.toString(16).padStart(6, '0')}`;
  }

  updateCombo(combo: number) {
    if (combo > 1) {
      this.comboEl.textContent = `x${combo} COMBO`;
      this.comboEl.style.opacity = '1';
    } else {
      this.comboEl.style.opacity = '0';
    }
  }

  showState(state: GameStateType, score = 0, highScore = 0, wave = 1) {
    this.menuScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.waveIntroScreen.classList.add('hidden');

    switch (state) {
      case GameStateType.MENU:
        this.menuScreen.classList.remove('hidden');
        break;
      case GameStateType.PAUSED:
        this.pauseScreen.classList.remove('hidden');
        break;
      case GameStateType.GAME_OVER:
        this.gameOverScreen.classList.remove('hidden');
        this.finalScoreEl.textContent = score.toLocaleString();
        this.finalHighEl.textContent = highScore.toLocaleString();
        break;
      case GameStateType.WAVE_INTRO:
        this.waveIntroScreen.classList.remove('hidden');
        this.waveIntroNumber.textContent = String(wave);
        break;
    }
  }
}
