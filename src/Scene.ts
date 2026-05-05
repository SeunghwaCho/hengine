import type { Layout } from "./types.js";

export interface Scene {
  enter?(): void;
  leave?(): void;
  update?(dt: number, layout: Layout): void;
  draw(ctx: CanvasRenderingContext2D, layout: Layout): void;
  onDown?(cssX: number, cssY: number, pointerId: number): void;
  onMove?(cssX: number, cssY: number, pointerId: number): void;
  onUp?(cssX: number, cssY: number, pointerId: number): void;
  onKeyDown?(code: string, event: KeyboardEvent): void;
  onKeyUp?(code: string, event: KeyboardEvent): void;
  onWheel?(deltaY: number, cssX: number, cssY: number): void;
}

export interface SceneFactory<TArgs = void> {
  (args: TArgs): Scene;
}
