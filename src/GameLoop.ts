export type UpdateCallback = (dt: number) => void;
export type RenderCallback = (interpolation: number) => void;

export interface GameLoopOptions {
  /** Fixed timestep target FPS for update(). Default 60. */
  targetFPS?: number;
  /** Maximum allowed delta in ms (clamps after tab focus). Default 100. */
  maxDeltaMs?: number;
  /** If true, run update() every RAF frame (variable timestep) instead of fixed-step. */
  variableTimestep?: boolean;
}

/**
 * RAF-driven loop with optional fixed timestep + interpolation.
 * - Fixed mode: update() called at exactly 1/targetFPS, accumulator absorbs jitter.
 * - Variable mode: update(dt) called once per RAF with the actual delta.
 */
export class GameLoop {
  private readonly update: UpdateCallback;
  private readonly render: RenderCallback;
  private readonly targetFPS: number;
  private readonly maxDeltaMs: number;
  private readonly variable: boolean;

  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private _running = false;
  private _fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;

  constructor(update: UpdateCallback, render: RenderCallback, options: GameLoopOptions = {}) {
    this.update = update;
    this.render = render;
    this.targetFPS = options.targetFPS ?? 60;
    this.maxDeltaMs = options.maxDeltaMs ?? 100;
    this.variable = options.variableTimestep ?? false;
  }

  get fixedStepMs(): number {
    return 1000 / this.targetFPS;
  }

  get fps(): number {
    return this._fps;
  }

  get running(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this._running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (now: number): void => {
    if (!this._running) return;

    let delta = now - this.lastTime;
    this.lastTime = now;
    if (delta > this.maxDeltaMs) delta = this.maxDeltaMs;

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      this._fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.variable) {
      this.update(delta / 1000);
      this.render(0);
    } else {
      const step = this.fixedStepMs;
      this.accumulator += delta;
      // Cap accumulator to avoid spiraling on slow devices
      if (this.accumulator > step * 5) this.accumulator = step * 5;
      while (this.accumulator >= step) {
        this.update(step / 1000);
        this.accumulator -= step;
      }
      this.render(this.accumulator / step);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
