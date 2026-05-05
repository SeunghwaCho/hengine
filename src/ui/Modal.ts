import type { Layout, Rect } from "../types.js";
import { pointInRect } from "../types.js";
import { fillRoundRect, strokeRoundRect, drawText } from "../render/draw.js";
import { Button } from "./Button.js";

export interface ModalAction {
  label: string;
  onPress: () => void;
}

export interface ModalOptions {
  title: string;
  message?: string;
  actions: readonly ModalAction[];
  /** Width as a fraction of layout.width (0..1). Default 0.7, clamped to [240, 480]. */
  widthRatio?: number;
  /** Dismissable by clicking the backdrop. Default false. */
  dismissOnBackdrop?: boolean;
  onDismiss?: () => void;
}

/**
 * Modal dialog rendered on the same canvas. Layout recomputed each frame
 * via setLayout() so it stays centered through resizes.
 */
export class Modal {
  private title: string;
  private message: string;
  private actionDefs: readonly ModalAction[];
  private widthRatio: number;
  private dismissOnBackdrop: boolean;
  private onDismiss?: () => void;

  private buttons: Button[] = [];
  private box: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private currentLayout: Layout | null = null;

  constructor(opts: ModalOptions) {
    this.title = opts.title;
    this.message = opts.message ?? "";
    this.actionDefs = opts.actions;
    this.widthRatio = opts.widthRatio ?? 0.7;
    this.dismissOnBackdrop = opts.dismissOnBackdrop ?? false;
    this.onDismiss = opts.onDismiss;
    this.buttons = this.actionDefs.map(
      (a) => new Button({ bounds: { x: 0, y: 0, w: 0, h: 0 }, label: a.label, onPress: a.onPress }),
    );
  }

  setLayout(layout: Layout): void {
    this.currentLayout = layout;
    const targetW = Math.max(240, Math.min(480, Math.floor(layout.width * this.widthRatio)));
    const w = Math.min(targetW, Math.floor(layout.width - 32));
    const padding = 20;
    const titleH = 28;
    const messageH = this.message ? 60 : 0;
    const btnH = 40;
    const btnGap = 8;
    const h = padding + titleH + (this.message ? padding + messageH : 0) + padding + btnH + padding;
    const x = Math.floor((layout.width - w) / 2);
    const y = Math.floor((layout.height - h) / 2);
    this.box = { x, y, w, h };

    const totalBtnGap = btnGap * Math.max(0, this.buttons.length - 1);
    const btnW = Math.floor((w - padding * 2 - totalBtnGap) / Math.max(1, this.buttons.length));
    let bx = x + padding;
    const by = y + h - padding - btnH;
    for (const b of this.buttons) {
      b.setBounds({ x: bx, y: by, w: btnW, h: btnH });
      bx += btnW + btnGap;
    }
  }

  onDown(x: number, y: number): boolean {
    if (!this.currentLayout) return false;
    let consumed = false;
    for (const b of this.buttons) {
      if (b.onDown(x, y)) consumed = true;
    }
    if (consumed) return true;
    if (pointInRect(x, y, this.box)) return true; // click inside modal — consume
    if (this.dismissOnBackdrop) {
      this.onDismiss?.();
      return true;
    }
    return true; // always consume input while modal is open
  }

  onMove(x: number, y: number): void {
    for (const b of this.buttons) b.onMove(x, y);
  }

  onUp(x: number, y: number): boolean {
    let pressed = false;
    for (const b of this.buttons) {
      if (b.onUp(x, y)) pressed = true;
    }
    return pressed;
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    // backdrop
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.restore();

    // dialog
    const r = this.box;
    fillRoundRect(ctx, r.x, r.y, r.w, r.h, 12, "#ffffff");
    strokeRoundRect(ctx, r.x, r.y, r.w, r.h, 12, "#cbd5e1", 1);

    drawText(ctx, this.title, r.x + r.w / 2, r.y + 24, {
      size: 20,
      weight: 600,
      color: "#111",
      align: "center",
      baseline: "middle",
    });
    if (this.message) {
      drawText(ctx, this.message, r.x + r.w / 2, r.y + 60, {
        size: 14,
        color: "#475569",
        align: "center",
        baseline: "top",
      });
    }
    for (const b of this.buttons) b.draw(ctx);
  }
}
