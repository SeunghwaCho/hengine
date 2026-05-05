# hengine

[한국어 README](./README_kr.md)

Zero-dependency TypeScript + HTML5 Canvas 2D game engine. Browser standard APIs only — no React, no Phaser, no PixiJS, no bundler required.

Distilled from a collection of small TypeScript canvas games, hengine packages the patterns that kept showing up: a DPR-aware canvas/RAF loop, scene lifecycle, pointer + keyboard input, procedural Web Audio, IndexedDB persistence with memory fallback, and a couple of canvas-rendered UI primitives.

## Why

Most "small" canvas games re-implement the same plumbing: a high-DPI resize handler, a fixed-timestep loop, a Scene abstraction, a synth for blips and bloops, an IndexedDB save with a memory fallback. hengine extracts that plumbing so the next game can start at "draw the gameplay."

Constraints kept on purpose:

- No external runtime dependencies. `package.json` lists only `typescript` as a dev dep.
- Plain ES2020 modules. Works with any static server, no bundler required.
- TypeScript-first. `strict` mode, strong types on every public API.
- `localStorage` is intentionally avoided in favor of IndexedDB (with auto-fallback).

## Install

Not on npm yet. Clone and build locally:

```bash
git clone https://github.com/SeunghwaCho/hengine.git
cd hengine
npm install
npm run build
```

Then either:
- import directly from a sibling path (`import { App } from "../hengine/dist/index.js"`),
- or `npm install /path/to/hengine` to add it as a local-file dependency.

## Quick start

```ts
import { App, Scene, drawText, fillRect } from "hengine"; // or "./path/to/hengine/dist/index.js"

class Hello implements Scene {
  draw(ctx, layout) {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0f172a");
    drawText(ctx, "Hello, hengine!", layout.width / 2, layout.height / 2, {
      color: "#fff", size: 32, align: "center", baseline: "middle",
    });
  }
}

const canvas = document.querySelector("canvas")!;
const app = new App(canvas, { sizing: "window" });
app.setScene(new Hello());
app.start();
```

A complete Breakout example with persistent high score, modal dialogs, procedural audio, and keyboard controls lives in [`examples/breakout`](./examples/breakout).

## What's in the box

```
src/
├── App.ts                 # canvas + RAF + scene + input dispatch
├── GameLoop.ts            # fixed-timestep / variable-timestep loop
├── Scene.ts               # Scene interface
├── types.ts               # Vec2, Rect, Layout, point-in-rect/circle
├── input/
│   ├── KeyboardInput.ts   # polling-style key state with edge detection
│   └── Joystick.ts        # virtual on-screen joystick (touch)
├── render/
│   ├── draw.ts            # roundRect, drawText, drawCircle, drawLine, fillRect
│   └── Camera.ts          # pan/zoom, world<->screen transforms
├── audio/
│   ├── Synth.ts           # Web Audio synth — tones, sequences, noise
│   └── AssetSound.ts      # sample-based playback (decodeAudioData)
├── storage/
│   ├── KvStore.ts         # async key-value interface
│   ├── MemoryStore.ts     # in-memory backing
│   └── IndexedDbStore.ts  # IndexedDB with auto memory fallback on failure
├── assets/
│   └── AssetLoader.ts     # parallel image loading with progress
├── ui/
│   ├── Button.ts          # canvas-rendered button widget
│   └── Modal.ts           # centered modal dialog
└── math/
    ├── random.ts          # mulberry32 seeded RNG, dice, pick, shuffle
    ├── geometry.ts        # distance, lerp, clamp, AABB/circle overlaps
    └── SpatialGrid.ts     # broad-phase collision grid
```

## Coordinate-system contract

- The canvas backing buffer is sized at `cssSize × devicePixelRatio`.
- Every frame, the 2D context is reset to a `dpr`-only transform before `Scene.draw` runs. Inside your scene, **draw in CSS pixels**.
- Pointer/mouse coordinates passed to `Scene.onDown/onMove/onUp` are CSS pixels relative to the canvas.

That single rule keeps a game looking sharp on Retina, on a phone, and after a window resize, without anyone having to think about it again.

## Loop modes

`App` uses `GameLoop` underneath, which supports both:

- **Fixed timestep** (default): `update(dt)` is called at exactly `1000/targetFPS` ms intervals, accumulator absorbs RAF jitter, `render(interpolation)` gets a 0..1 factor for visual smoothing. Best for physics-heavy or deterministic games.
- **Variable timestep** (`variableTimestep: true`): `update(dt)` runs once per RAF with the actual delta. Best for casual UI-driven games.

## Persistence

```ts
import { IndexedDbStore } from "hengine";

const store = new IndexedDbStore({ dbName: "mygame", version: 1 });
await store.init();
await store.set("save", { level: 3, hp: 22 });
const save = await store.get<{ level: number; hp: number }>("save");
```

If IndexedDB is unavailable or any transaction fails, the store transparently demotes to `MemoryStore`. Reads/writes still succeed — they just don't persist across reloads. Inspect `store.isUsingFallback()` if you want to surface that.

## Audio gotcha

Browsers won't start an `AudioContext` until the user interacts with the page. Both `Synth` and `AssetSound` lazily create their context. Wire `synth.ensureCtx()` + `synth.resume()` into your first pointer or keydown handler.

## Build

```bash
npm run typecheck    # type-only check, no emit
npm run build        # tsc → dist/ (with .d.ts)
```

## License

MIT — see [LICENSE](./LICENSE).
