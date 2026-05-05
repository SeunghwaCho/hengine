// Core
export { App, type AppOptions } from "./App.js";
export { GameLoop, type GameLoopOptions, type UpdateCallback, type RenderCallback } from "./GameLoop.js";
export type { Scene, SceneFactory } from "./Scene.js";
export {
  type Vec2,
  type Rect,
  type Layout,
  pointInRect,
  pointInCircle,
} from "./types.js";

// Input
export { KeyboardInput } from "./input/KeyboardInput.js";
export { Joystick, type JoystickState, type JoystickOptions } from "./input/Joystick.js";

// Render
export {
  roundRectPath,
  fillRoundRect,
  strokeRoundRect,
  drawText,
  drawCircle,
  strokeCircle,
  drawLine,
  fillRect,
  type TextOptions,
} from "./render/draw.js";
export { Camera } from "./render/Camera.js";

// Audio
export { Synth, NOTE, type ToneOptions, type Note } from "./audio/Synth.js";
export { AssetSound, type PlayOptions } from "./audio/AssetSound.js";

// Storage
export type { KvStore } from "./storage/KvStore.js";
export { MemoryStore } from "./storage/MemoryStore.js";
export { IndexedDbStore, type IndexedDbStoreOptions } from "./storage/IndexedDbStore.js";

// Assets
export { AssetLoader, type ImageEntry, type LoadProgress } from "./assets/AssetLoader.js";

// UI
export { Button, type ButtonOptions, type ButtonStyle } from "./ui/Button.js";
export { Modal, type ModalOptions, type ModalAction } from "./ui/Modal.js";

// Math
export {
  mulberry32,
  randInt,
  randRange,
  pick,
  shuffle,
  rollDie,
  type Rng,
} from "./math/random.js";
export {
  distance,
  distanceSq,
  lerp,
  clamp,
  rectsOverlap,
  circleRectOverlap,
  circlesOverlap,
  normalize,
  direction,
  smoothstep,
} from "./math/geometry.js";
export { SpatialGrid } from "./math/SpatialGrid.js";
