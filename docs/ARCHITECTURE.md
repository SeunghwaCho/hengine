# Architecture

hengine is intentionally small. This doc maps the layers, calls out the contracts each one upholds, and gives the reasoning behind a few choices that aren't obvious from the code.

## Layers

```
                    ┌─────────────────┐
                    │   Your Scene    │      (game logic)
                    └────────▲────────┘
                             │ Scene
                    ┌────────┴────────┐
                    │       App       │      input dispatch + render frame
                    └────────▲────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
        GameLoop                       Browser canvas / RAF
   (fixed/variable dt)                (PointerEvent, KeyboardEvent)
```

Subsystems (`Synth`, `IndexedDbStore`, `AssetLoader`, `Camera`, `SpatialGrid`, `Button`, `Modal`, `KeyboardInput`, `Joystick`) are intentionally **opt-in** — instantiate only what your game needs. None of them are required by `App`.

## The Scene contract

A `Scene` is just an object with these optional and one required methods:

| Method                      | When called                                             |
| --------------------------- | ------------------------------------------------------- |
| `enter()`                   | When `App.setScene()` activates this scene              |
| `leave()`                   | Just before being replaced                              |
| `update(dt, layout)`        | Each loop tick (`dt` in seconds)                        |
| `draw(ctx, layout)` *(req.)* | Each rendered frame (CSS-pixel coordinate space)        |
| `onDown / onMove / onUp`    | Pointer events, in CSS pixels relative to canvas        |
| `onKeyDown / onKeyUp`       | Keyboard events from window                             |
| `onWheel`                   | `wheel` event with deltaY in CSS pixels                 |

Everything except `draw` is optional. If you don't need keyboard input, don't implement `onKeyDown`. The dispatcher checks for the method's presence each event.

## Why dpr-only transform per frame

Every `Scene.draw` call begins with the context reset to:

```
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
```

This means **scene code never has to think about device pixel ratio**. You draw at, say, `(100, 100)` and the engine has already scaled the backing buffer so that's a sharp position on a 3× phone display. Resize-aware games are the most common source of "blurry on Retina" bugs in hand-rolled canvas projects; centralizing this here eliminates the class.

If a scene needs additional transforms (camera pan/zoom, world-space rendering), it does `ctx.save()`, applies them, draws, and `ctx.restore()`. `Camera.begin()/end()` follows that pattern.

## Fixed timestep + interpolation

`GameLoop` defaults to a 60 Hz fixed update step with a render interpolation factor. The reasoning:

- **Determinism**: physics that uses a fixed `dt` is reproducible (replays, AI tests, networked sync later).
- **Stability**: a brief frame hitch doesn't change physics behavior, just buffers up extra updates.
- **Spiral-of-death guard**: the accumulator is capped at 5 steps so a really slow frame won't cause a runaway catch-up loop.

The trade-off is a tiny visual jitter on non-60 Hz monitors, mitigated by the `interpolation` argument passed to `render()` (use it to lerp drawn positions).

For UI-driven games (puzzles, board games), set `variableTimestep: true` and ignore the interpolation factor.

## Storage: why IndexedDB and not localStorage

Three reasons:

1. `localStorage` is synchronous → blocks the main thread, hurts framerate on save.
2. `localStorage` has a tiny per-origin quota (~5 MB) that's easy to overflow with a binary-ish save.
3. `localStorage` only stores strings → forces JSON.stringify/parse round-trips even for tiny saves.

`IndexedDbStore` wraps the awkward IDB API in a clean `KvStore` interface and degrades gracefully — corrupt DB, blocked open, quota errors all transparently demote to an in-memory `MemoryStore`. Your save calls still resolve; you can choose to surface "playing without persistence" via `isUsingFallback()`.

## Coordinate spaces

Three live in the engine, kept distinct on purpose:

| Space                | Unit                  | Used in                                          |
| -------------------- | --------------------- | ------------------------------------------------ |
| Backing buffer       | physical pixels (dpr) | Only inside `App` for the clear/transform setup  |
| **CSS pixel** *(default)* | CSS pixels       | All `Scene.draw`, all input callbacks, all UI    |
| World                | game units            | Inside `Camera.begin()` / `end()` only           |

If you stick to CSS pixels in scenes, the engine's resize/DPR logic is the only place that ever has to worry about backing buffers.

## Input model

Two complementary styles are supported:

- **Event-driven**: implement `onDown/onMove/onUp/onKeyDown/onKeyUp` on the Scene. Best for click-driven UI and turn-based games.
- **Polling**: instantiate `KeyboardInput` (or `Joystick`), call `attach()`, then read state inside `update(dt)`. Best for action games where "is left held" matters per-frame.

You can mix them — `KeyboardInput` listens at window scope and is independent of the Scene's `onKeyDown`.

## What's deliberately out of scope

The engine does **not** include:

- A scene-graph / display-list (you draw directly with the 2D context)
- Sprite atlases / texture packing (load `Image`s yourself; trivial when there's no bundler)
- A physics engine (geometry helpers + `SpatialGrid` are enough for most casual games)
- Networking
- A particle system (each game has different needs; ~50 lines per game is cheaper than a config)
- A scripting/ECS framework

These are easy to add per-game; baking them in would have made hengine bigger than the games using it. The Breakout example is ~280 lines, hengine itself is ~900 lines of TypeScript — that ratio is the goal.
