import type { Rect } from "../types.js";
import { pointInRect } from "../types.js";
import { fillRoundRect, strokeRoundRect, drawText } from "../render/draw.js";

export interface ButtonStyle {
  bgIdle?: string;
  bgHover?: string;
  bgPressed?: string;
  bgDisabled?: string;
  bgActive?: string;
  border?: string;
  borderDisabled?: string;
  textColor?: string;
  textColorDisabled?: string;
  font?: string;
  textSizeRatio?: number;
  borderRadius?: number;
}

export interface ButtonOptions {
  bounds: Rect;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  style?: ButtonStyle;
}

const DEFAULT_STYLE: Required<ButtonStyle> = {
  bgIdle: "#ffffff",
  bgHover: "#f3f4f6",
  bgPressed: "#cfd8e3",
  bgDisabled: "#e8e8e8",
  bgActive: "#dde7f0",
  border: "#aab2bd",
  borderDisabled: "#d0d0d0",
  textColor: "#222222",
  textColorDisabled: "#999999",
  font: "system-ui, -apple-system, sans-serif",
  textSizeRatio: 0.5,
  borderRadius: 8,
};

/**
 * Canvas-rendered button. Caller wires onDown/onMove/onUp from Scene callbacks
 * and invokes draw() each frame. Coordinates are CSS pixels.
 */
export class Button {
  bounds: Rect;
  label: string;
  onPress: () => void;
  disabled: boolean;
  active: boolean;
  style: Required<ButtonStyle>;

  private hover = false;
  private pressed = false;

  constructor(opts: ButtonOptions) {
    this.bounds = { ...opts.bounds };
    this.label = opts.label;
    this.onPress = opts.onPress;
    this.disabled = opts.disabled ?? false;
    this.active = opts.active ?? false;
    this.style = { ...DEFAULT_STYLE, ...(opts.style ?? {}) };
  }

  setBounds(r: Rect): void {
    this.bounds = { ...r };
  }

  hit(x: number, y: number): boolean {
    return pointInRect(x, y, this.bounds);
  }

  /** Returns true if the press was captured by this button. */
  onDown(x: number, y: number): boolean {
    if (this.disabled || !this.hit(x, y)) return false;
    this.pressed = true;
    return true;
  }

  onMove(x: number, y: number): void {
    this.hover = this.hit(x, y);
    if (!this.hover) this.pressed = false;
  }

  /** Returns true if the press was completed inside this button (firing onPress). */
  onUp(x: number, y: number): boolean {
    const wasPressed = this.pressed;
    this.pressed = false;
    if (this.disabled) return false;
    if (wasPressed && this.hit(x, y)) {
      this.onPress();
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = this.bounds;
    const s = this.style;
    const bg = this.disabled
      ? s.bgDisabled
      : this.pressed
        ? s.bgPressed
        : this.active
          ? s.bgActive
          : this.hover
            ? s.bgHover
            : s.bgIdle;
    fillRoundRect(ctx, r.x, r.y, r.w, r.h, s.borderRadius, bg);
    strokeRoundRect(
      ctx,
      r.x,
      r.y,
      r.w,
      r.h,
      s.borderRadius,
      this.disabled ? s.borderDisabled : s.border,
      1,
    );
    drawText(ctx, this.label, r.x + r.w / 2, r.y + r.h / 2, {
      color: this.disabled ? s.textColorDisabled : s.textColor,
      size: Math.floor(r.h * s.textSizeRatio),
      font: s.font,
      align: "center",
      baseline: "middle",
    });
  }
}
