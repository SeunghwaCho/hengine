import type { Vec2 } from "../types.js";

export interface JoystickState {
  active: boolean;
  origin: Vec2;
  current: Vec2;
  /** Normalized direction. Magnitude in [0, 1]. */
  direction: Vec2;
  magnitude: number;
}

export interface JoystickOptions {
  /** Pixel radius the knob can travel from origin. Default 60. */
  radius?: number;
  /** Below this fraction of radius, magnitude is reported as 0. Default 0.1. */
  deadZone?: number;
}

/**
 * Virtual on-screen joystick driven by a single touch/pointer.
 * Caller is responsible for:
 *   - calling onDown/onMove/onUp from Scene callbacks
 *   - rendering the visual (use state.origin/current to draw)
 */
export class Joystick {
  private readonly radius: number;
  private readonly deadZone: number;
  private pointerId: number | null = null;
  private state: JoystickState = {
    active: false,
    origin: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    magnitude: 0,
  };

  constructor(options: JoystickOptions = {}) {
    this.radius = options.radius ?? 60;
    this.deadZone = options.deadZone ?? 0.1;
  }

  onDown(x: number, y: number, pointerId: number): void {
    if (this.pointerId !== null) return;
    this.pointerId = pointerId;
    this.state.active = true;
    this.state.origin = { x, y };
    this.state.current = { x, y };
    this.state.direction = { x: 0, y: 0 };
    this.state.magnitude = 0;
  }

  onMove(x: number, y: number, pointerId: number): void {
    if (pointerId !== this.pointerId) return;
    this.state.current = { x, y };
    this.recompute();
  }

  onUp(_x: number, _y: number, pointerId: number): void {
    if (pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.state.active = false;
    this.state.direction = { x: 0, y: 0 };
    this.state.magnitude = 0;
  }

  /** Snapshot of current joystick state. */
  read(): Readonly<JoystickState> {
    return this.state;
  }

  private recompute(): void {
    const dx = this.state.current.x - this.state.origin.x;
    const dy = this.state.current.y - this.state.origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < this.deadZone * this.radius || dist === 0) {
      this.state.direction = { x: 0, y: 0 };
      this.state.magnitude = 0;
      return;
    }
    const mag = Math.min(dist / this.radius, 1);
    this.state.direction = { x: dx / dist, y: dy / dist };
    this.state.magnitude = mag;
  }
}
