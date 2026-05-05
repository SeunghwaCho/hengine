import type { Vec2 } from "../types.js";

/**
 * Simple 2D camera: world-space center + zoom.
 * Apply with begin(ctx) / end(ctx) inside a Scene.draw().
 */
export class Camera {
  /** World-space coordinate at the center of the viewport. */
  position: Vec2 = { x: 0, y: 0 };
  zoom = 1;

  private viewportW = 0;
  private viewportH = 0;

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
  }

  /** Push transform: world coordinates → screen pixels. */
  begin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.viewportW / 2, this.viewportH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.position.x, -this.position.y);
  }

  end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /** Convert a screen-space point (CSS pixels) to world-space. */
  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.position.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.position.y,
    };
  }

  /** Convert a world-space point to screen-space (CSS pixels). */
  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: (wx - this.position.x) * this.zoom + this.viewportW / 2,
      y: (wy - this.position.y) * this.zoom + this.viewportH / 2,
    };
  }

  /** Smooth-follow a target. dt in seconds, lerp ~5..15 for typical camera follow. */
  follow(target: Vec2, dt: number, lerp = 8): void {
    const k = 1 - Math.exp(-lerp * dt);
    this.position.x += (target.x - this.position.x) * k;
    this.position.y += (target.y - this.position.y) * k;
  }
}
