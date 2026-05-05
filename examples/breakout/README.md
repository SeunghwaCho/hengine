# Breakout (hengine example)

A complete Breakout-style game built using only `hengine` and browser APIs.

Demonstrates:
- `App` + `Scene` lifecycle
- Fixed-timestep `GameLoop` (default)
- `KeyboardInput` polling-style controls
- `Synth` procedural audio (no audio files)
- `IndexedDbStore` for persistent high score
- `Modal` dialog for game-over UX
- `mulberry32` seeded RNG

## Run

From the repository root:

```bash
npm install
npm run build               # compiles src/ → dist/
cd examples/breakout
npx tsc -p tsconfig.json    # compiles main.ts → main.js (sibling to index.html)
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

The example imports from `../../dist/index.js`, so the engine must be built
(`npm run build` from the repo root) before serving. Mount the repo root through
any static server so the relative path resolves.
