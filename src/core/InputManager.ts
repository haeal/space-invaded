export class InputManager {
  keys: Record<string, boolean> = {};
  private justPressedKeys: Set<string> = new Set();
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.keys[e.code]) {
      this.justPressedKeys.add(e.code);
    }
    this.keys[e.code] = true;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  isDown(code: string): boolean {
    return !!this.keys[code];
  }

  justPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  get moveLeft(): boolean {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }

  get moveRight(): boolean {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }

  get shoot(): boolean {
    return this.isDown('Space');
  }

  get shootJustPressed(): boolean {
    return this.justPressed('Space');
  }

  get pause(): boolean {
    return this.justPressed('Escape');
  }

  get enter(): boolean {
    return this.justPressed('Enter') || this.justPressed('Space');
  }

  endFrame() {
    this.justPressedKeys.clear();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
  }
}
