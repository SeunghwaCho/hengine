import type { Scene } from "./Scene.js";
import type { Layout } from "./types.js";
import { GameLoop, type GameLoopOptions } from "./GameLoop.js";

export interface AppOptions extends GameLoopOptions {
  /** Background fill applied each frame before scene.draw. Use 'transparent' or null to skip. */
  clearColor?: string | null;
  /**
   * Logical sizing strategy:
   * - "parent" (default): match canvas to its parent's getBoundingClientRect.
   * - "window": match canvas to window.innerWidth/innerHeight.
   * - "fixed": leave canvas size as-is (caller manages it).
   */
  sizing?: "parent" | "window" | "fixed";
  /** When true, captures keyboard at window scope. Default true. */
  captureKeyboard?: boolean;
}

/**
 * Top-level app: owns a canvas, runs the loop, dispatches input to the active scene.
 *
 * Coordinate system contract:
 * - Canvas backing buffer is sized at logicalSize * devicePixelRatio.
 * - Each frame, ctx is reset to a dpr-only transform → scene draws in CSS pixels.
 * - Pointer/mouse coordinates passed to scene callbacks are CSS pixels relative to canvas.
 */
export class App {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private scene: Scene | null = null;
  private loop: GameLoop;

  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private layout: Layout = { width: 0, height: 0, dpr: 1 };

  private readonly clearColor: string | null;
  private readonly sizing: "parent" | "window" | "fixed";
  private readonly captureKeyboard: boolean;

  private activePointerId: number | null = null;
  private resizeListenerAttached = false;

  constructor(canvas: HTMLCanvasElement, options: AppOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("hengine: 2d context unavailable");
    this.ctx = ctx;

    this.clearColor = options.clearColor === undefined ? "#000000" : options.clearColor;
    this.sizing = options.sizing ?? "parent";
    this.captureKeyboard = options.captureKeyboard ?? true;

    this.loop = new GameLoop(
      (dt) => this.scene?.update?.(dt, this.layout),
      () => this.drawFrame(),
      options,
    );

    this.attachInput();
    this.attachResize();
    this.fitLayout();
  }

  /** Replace the active scene. Calls leave() on previous, enter() on new. */
  setScene(scene: Scene): void {
    this.scene?.leave?.();
    this.scene = scene;
    scene.enter?.();
  }

  getScene(): Scene | null {
    return this.scene;
  }

  getLayout(): Layout {
    return this.layout;
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  get fps(): number {
    return this.loop.fps;
  }

  /** Force a layout recalculation (e.g., after parent visibility change). */
  refreshLayout(): void {
    this.fitLayout();
  }

  private drawFrame(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.clearColor !== null) {
      ctx.fillStyle = this.clearColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scene?.draw(ctx, this.layout);
  }

  private fitLayout(): void {
    if (this.sizing === "fixed") {
      const dpr = window.devicePixelRatio || 1;
      this.cssW = this.canvas.width / dpr;
      this.cssH = this.canvas.height / dpr;
      this.dpr = dpr;
      this.layout = { width: this.cssW, height: this.cssH, dpr };
      return;
    }

    let cssW = 0;
    let cssH = 0;
    if (this.sizing === "window") {
      cssW = window.innerWidth;
      cssH = window.innerHeight;
    } else {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
    }
    const dpr = window.devicePixelRatio || 1;
    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return;

    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.layout = { width: cssW, height: cssH, dpr };
  }

  private toCss(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private attachInput(): void {
    const c = this.canvas;
    c.style.touchAction = "none";

    c.addEventListener("pointerdown", (e) => {
      if (this.activePointerId !== null) return;
      this.activePointerId = e.pointerId;
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const { x, y } = this.toCss(e);
      this.scene?.onDown?.(x, y, e.pointerId);
    });

    c.addEventListener("pointermove", (e) => {
      const { x, y } = this.toCss(e);
      this.scene?.onMove?.(x, y, e.pointerId);
    });

    const upHandler = (e: PointerEvent): void => {
      if (e.pointerId !== this.activePointerId) return;
      this.activePointerId = null;
      try {
        c.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const { x, y } = this.toCss(e);
      this.scene?.onUp?.(x, y, e.pointerId);
    };
    c.addEventListener("pointerup", upHandler);
    c.addEventListener("pointercancel", upHandler);

    c.addEventListener("wheel", (e) => {
      const { x, y } = this.toCss(e as unknown as PointerEvent);
      this.scene?.onWheel?.(e.deltaY, x, y);
    }, { passive: true });

    if (this.captureKeyboard) {
      window.addEventListener("keydown", (e) => this.scene?.onKeyDown?.(e.code, e));
      window.addEventListener("keyup", (e) => this.scene?.onKeyUp?.(e.code, e));
    }
  }

  private attachResize(): void {
    if (this.resizeListenerAttached) return;
    this.resizeListenerAttached = true;
    const trigger = (): void => this.fitLayout();
    window.addEventListener("resize", trigger);
    window.addEventListener("orientationchange", () => setTimeout(trigger, 100));
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", trigger);
    }
  }
}
