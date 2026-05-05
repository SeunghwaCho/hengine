/**
 * Standalone keyboard state tracker. Useful when you want polling-style input
 * (e.g., per-frame "is this key currently held?") instead of Scene event callbacks.
 *
 * Usage:
 *   const kb = new KeyboardInput();
 *   kb.attach();
 *   if (kb.isDown('ArrowLeft')) ...
 *   kb.detach();
 */
export class KeyboardInput {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private attached = false;
  private preventDefaultCodes: Set<string>;

  /** Codes for which to call event.preventDefault() on keydown. Default: arrows + Space. */
  constructor(preventDefaultCodes?: readonly string[]) {
    this.preventDefaultCodes = new Set(
      preventDefaultCodes ?? ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"],
    );
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
    this.keys.clear();
    this.justPressed.clear();
    this.justReleased.clear();
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True only on the frame the key was first pressed. Call endFrame() each frame. */
  wasPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  /** True only on the frame the key was released. */
  wasReleased(code: string): boolean {
    return this.justReleased.has(code);
  }

  /** Call once per frame (after read) to clear edge states. */
  endFrame(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  private onDown = (e: KeyboardEvent): void => {
    if (this.preventDefaultCodes.has(e.code)) e.preventDefault();
    if (!this.keys.has(e.code)) this.justPressed.add(e.code);
    this.keys.add(e.code);
  };

  private onUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this.justReleased.add(e.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
  };
}
