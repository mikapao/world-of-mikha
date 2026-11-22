# T01 test report: debug overlay (`?debug`)

**Verdict: BLOCKED** (all checks that can run without a browser pass; the overlay's runtime behaviour, acceptance criteria 1–3, could not be exercised here)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D1. Task: `team/tasks/T01.md`.
No application code was changed. No test file was added (see "Not run" for why). `package.json` untouched.

## Commands run

```
node --test tests/
npm run build
grep -n "await" src/debug.js
git -C "E:/Dev/world-of-mikha" diff -- src/main.js
```

Run from `E:\Dev\world-of-mikha` (Node v26.13.0).

## Results

### Automated checks (run)

| Check | Result |
|---|---|
| `node --test tests/`: 38 existing baseline checks still pass after T01 (no regression) | PASS |
| `npm run build` exits 0 (Vite 6, built in 1.38 s) | PASS |
| `src/debug.js` contains no `await` (no top-level await; criterion 4) | PASS |
| `src/main.js` diff is exactly 3 added lines: the import from `./debug.js`, `initDebug()` at the top of `boot()`, `debugFrame(renderer)` after `renderer.render(scene, cam)` in `loop` | PASS |

### Source reading (checked by reading, not executed)

| Check | Result |
|---|---|
| `src/debug.js`: `ON` is false unless `location.search` contains "debug"; `initDebug()` returns before creating any DOM when `ON` is false; `debugFrame()` returns before doing anything when `ON` is false | PASS (by reading) |
| Overlay is a `div` with `pointer-events:none`, `position:fixed`, `font:12px/1.4 monospace` (criterion 2, style part) | PASS (by reading) |
| Text refreshed every 500 ms (`now - lastText >= 500`); env tris recomputed every 5 s (`now - lastEnv >= 5000`) | PASS (by reading) |
| env tris walk skips `player` subtree and the `ocean` mesh, counts `index.count / 3` per mesh (criterion 3, same method as `team/baseline/README.md`) | PASS (by reading) |

### Runtime behaviour (acceptance criteria 1–3)

| Check | Result |
|---|---|
| Without `?debug`: no `#debug-overlay` element, game unchanged | NOT RUN (needs a browser) |
| With `?debug`: fps, tris, calls, env tris shown and updating | NOT RUN (needs a browser) |
| With `?debug`: overlay does not block taps | NOT RUN (needs a browser) |
| env tris value close to the baseline (~37,078 excluding ocean, varies with random placement) | NOT RUN (needs a browser) |

## Failures

None found. No check failed.

## Observations (no action taken; for the Commander)

1. `src/debug.js` imports `engine.js`, `player.js` and `world/ocean.js`. `engine.js` creates a `THREE.WebGLRenderer` and touches `window` and `document` at import time, so the module cannot be imported in plain Node. This is why no Node test was written for it.
2. The first fps reading after start is computed over the time since `initDebug()` ran (boot), so it may read high or low for the first 0.5 s. Cosmetic only.
3. env tris includes the ocean sparkle and foam meshes (only the 140×140 plane is skipped). This matches the Coder's note and the baseline method in `team/baseline/README.md`, which skips only the plane.

## Not run

| Item | Reason |
|---|---|
| A Node test file `tests/debug.test.mjs` | Not written. Testing `debug.js` in Node needs `engine.js` to load, which needs WebGL and a DOM. The only Node alternative is string matching on the source, which the task says to skip. The two source checks above were done by reading instead. |
| Overlay appears only with `?debug`; no DOM without it | Needs a browser (`npm run dev`, load with and without `?debug`). |
| fps, tris, calls, env tris values and update rate | Needs the Three.js renderer running in a browser. |
| Overlay does not block touches | Needs a browser pointer test. |
| Game looks and behaves unchanged without `?debug` | Needs a browser and a person's eye (also the Commander's screenshot check). |

## For the user's browser checklist (T01)

- Run `npm run dev`, open `http://localhost:5173/` (no `?debug`). The top of the screen shows no small dark box with numbers.
- Open `http://localhost:5173/?debug`. A small dark box at top-centre shows `fps`, `tris`, `calls` and `env tris`. Numbers change about twice a second.
- `env tris` should be close to 37,000 (the baseline excluding ocean is about 37,078; it varies a little with random placement).
- With `?debug` on, tap and drag the avatar and tap the monument circles. Taps must reach the game as before.
- Compare the screenshot with `team/baseline/1-home.jpg` (no change expected apart from the overlay box).

## Totals

- node --test: **38 run, 38 passed, 0 failed** (existing baseline; no new tests).
- npm run build: **1 run, 1 passed**.
- Source checks: 4 by running or diffing, 4 by reading; 0 failed.
- Runtime criteria 1–3: not run (browser needed).

## Commander browser check (2026-11-22): PASS
- Without `?debug`: `document.getElementById('debug-overlay')` was `null`, and the game looked normal.
- With `?debug`: the overlay shows at top-centre with `fps 30, tris 20,656, calls 277, env tris 37,186`. Env tris matches the baseline method (~37,078 ± random placement). The fps value comes from a background browser pane, not the tablet.
- Criteria 1–4 are met. **T01 accepted.**
