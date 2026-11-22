# T08 test report: land animals (src/world/animals.js) and main.js call sites

**Verdict: PASS** (`tests/animals.test.mjs` 19 of 19 checks pass; `node --test tests/` 117 of 117 run checks pass, 4 skipped as before (YAML); `npm run build` succeeds.)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Task: `team/tasks/T08.md`. Design: `team/02_design.md` D6 (land part).
No application code was changed. Test file added: `tests/animals.test.mjs`. `package.json` untouched.
Note: `npm run build` writes `dist/`, which is a generated folder.

## Commands run

```
node --test tests/animals.test.mjs
node --test tests/
npm run build
```

All run from `E:\Dev\world-of-mikha` (Node v26.13.0).

## How the runtime checks work (no WebGL)

- The real `src/world/animals.js` and the five real island builders (`homeIsland`, `crystalIsle`, `winterIsle`, `candyIsle`, `meadowIsle`) are loaded in Node. Each module is loaded as a `data:` URL with its imports rewritten, so every run gets fresh module state.
- Stubs: `src/engine.js` (scene.add records objects; `mesh()` and `mat()` make plain three.js objects; `document` is a no-op canvas for the candy stripe texture) and `src/world/lighting.js` (fixed values). No pixels are drawn and no image is checked.
- Monuments are not built (they import UI code). Their rings and obstacles are added from the constants in their source files, and the test checks each constant against the source text (`countingWaterfall.js`, `singingStone.js`, `snowman.js`, `lollipop.js`, `fireflyPond.js`).
- Math.random is seeded per run. The island trees and props therefore come from the real builders, with seeded placement.
- The keep-out thresholds in the test are written from the task and D6, not copied from `animals.js`: walk circle minus 1.0, `walkable()`, 0.6 + r from obstacles, 2.8 from rings, 2.0 from bridge ends (both ends of every bridge).

## Results

### tests/animals.test.mjs (19 checks)

| Check | Result |
|---|---|
| Source: ROSTER is D6 (home 2 bunnies + butterfly; crystal 2 birds; winter 2 penguins; candy duckling + 2 ladybugs; meadow 2 frogs; 12 rows) | PASS |
| Source: no audio imports, no SFX or speech calls, no obstacle pushes, no player import (no sound, no collision with the avatar) | PASS |
| Source: `const CULL = 22`; `> CULL` test on the camera target (xz); `main.js` passes `camTarget` | PASS |
| Source: keep-out thresholds present in `spotOk` (walk − 1.0, `walkable`, 0.6 + r, 2.8, 2.0); start spot from `pickSpot`; targets only from `pickSpot`; every step through `spotOk` | PASS |
| Source: bridge ends built from both `a` and `b` of every bridge | PASS |
| Source: monument constants used by the harness match the monument files | PASS |
| Source: no asset loads (glb, png, jpg, mp3, texture loaders, fetch); designs use `engine.js` `mat()`/`mesh()` | PASS |
| Source: `main.js` has one `buildAnimals(monuments)` after `buildMeadowIsle()`, and `updateAnimals(t, dt, camTarget)` after `updateMeadowIsle(t, dt)`; import line correct | PASS |
| Source: no top-level await in `animals.js` or `main.js` (brace-depth check; every await sits in an `async` function) | PASS |
| Runtime: built roster per island matches D6 (12 placed; species counted by their colours) | PASS |
| Runtime: every animal ≤ 300 triangles, seeds 1–3 (max per species: bunny 232, butterfly 28, bird 254, penguin 279, duckling 203, ladybug 156, frog 228) | PASS |
| Runtime: start spot of every animal passes every keep-out rule, seeds 1–4 | PASS |
| Runtime: 0 keep-out breaks on every frame, every animal, 5 island cameras × 60 s, seeds 1–3 (dt 1/60) | PASS |
| Runtime: dt at the game cap 0.05 (`main.js` clamps dt to 0.05), seed 4: 0 breaks | PASS |
| Runtime: with the camera on its island, every animal of that island moves at least once in 60 s (none frozen) | PASS |
| Runtime: culling. Animal 22.5 units from the camera target: no movement and no rotation change in 1,200 frames. Animal 21.5 units away: moves | PASS |
| Runtime: culling uses the camera target's x and z only (y = 500 gives the same result) | PASS |
| Negative control: the checker flags a ring centre, an obstacle centre, open sea, and a bridge end | PASS |
| Runtime: heights reported (see Observations below); assertion only that heights are between 0 and 1.5 | PASS |

Counts from the runtime sweep (seeds 1–3, dt 1/60, 5 cameras × 3,600 frames × 12 animals = 648,000 samples; seed 4 at dt 0.05 adds 72,000 more, not in the count):

| Measure | Value | Rule |
|---|---|---|
| Keep-out breaks, all samples | 0 | 0 |
| Minimum ring distance | 2.80 | ≥ 2.8 |
| Minimum bridge-end distance | 2.00 | ≥ 2.0 |
| Minimum obstacle clearance (distance − r) | 0.60 | ≥ 0.6 |
| Minimum walk-circle margin ((walk − 1.0) − distance) | 0.01 | ≥ 0 |
| Position changes (animal moved or turned) | 109,682 | (informational) |

The minima sit exactly on the rule thresholds, which is what a checker that keeps animals at the edge of the allowed area should show.

### Full suite: `node --test tests/`

| Item | Count |
|---|---|
| Run | 121 |
| Passed | 117 |
| Failed | 0 |
| Skipped | 4 (the YAML workflow checks, skipped as before because there is no YAML parser in `node_modules`) |

### Build

`npm run build`: PASS (`vite build` in 1.32 s; `dist/index-*.js` 654.80 kB).

## Commander's browser run (recorded, not reproduced by me)

As reported by the Commander: 12 animals × about 90 frames each (about 1,100 samples) over 5 islands. Minimum ring distance 3.14, 0 off-walkable samples, 0 samples inside an obstacle. These are the Commander's figures from the live app. My Node runs give the same kind of result: 0 breaks.

## Observations for the Commander (not failures)

1. **Height guide in D6 (about 0.35–0.6 tall).** Measured from the built groups (seed 1, bounding box incl. scale):
   - bunny 0.70 and penguin 0.70 are above the guide;
   - bird 0.46, duckling 0.47 and frog 0.37 are in range;
   - ladybug 0.26 is below it (already scaled ×1.25; the Coder notes this was chosen on purpose);
   - butterfly 0.05 at rest (its wings are flat; it flies 0.8–1.4 above the ground, so this figure does not apply).
   This is not one of the four acceptance criteria in T08, so it is not a FAIL. The Commander should accept these sizes or ask for a change.
2. **"They don't block the avatar."** Verified by source only: animals.js never adds to `obstacles` and does not import the player, so the avatar walks through animals. Whether that feels right on screen is for the user's browser check.
3. **Targets are not observable from outside the module.** Every target goes through `pickSpot`, which returns only spots that pass `spotOk` (source check). Every step is also checked on every frame (runtime sweep). Together these cover the "every target" criterion.

## Not run

| Item | Why |
|---|---|
| Real WebGL render, look, size on screen, shadows | No browser or WebGL in Node. Stubbed `engine.js`. |
| Monuments actually built | They import UI code. Rings and obstacles are added from the source constants (checked against source lines). |
| Real `lighting.js` | Replaced with fixed values; it does not affect animal placement. |
| Exact browser sample reproduction | The Commander's run is recorded above, not repeated. |
| Real camera follow (`camTarget` lerp) | The sweep passes fixed camera positions; the lerp is only a source check (`main.js` passes `camTarget`). |
| Frame timing on the tablet | Not measured. |

## For the user's browser checklist

- Each island shows its animals: 2 bunnies and a butterfly on Home; 2 birds on Crystal Isle; 2 penguins on Winter; a duckling and 2 ladybugs on Candy; 2 frogs on the Meadow.
- Animals wander slowly, pause, and turn to face the way they walk. They do not stand on a monument circle or at a bridge end.
- No animal sits inside a tree, rock, crystal, or candy prop.
- Walking the avatar through an animal is not stopped (animals do not block).
- Animals make no sound, and nothing plays when the avatar is near them.
- Sizes look right: the bunnies and penguins look large, and the ladybugs look small (see Observations 1).
- The butterfly flutters above the grass and does not drop into the ground.

## Commander review and browser check (2026-11-22): PASS
- Browser: 12 animals were found, one roster per island. Over 1,100 live samples: min ring distance 3.14, 0 off-walkable, 0 inside obstacles. All animals sit on the ground except the butterfly (y ≈ 1.2).
- Heights: bunny/penguin 0.70 and ladybug 0.26 are outside the D6 guide (0.35–0.6). Accepted: ladybugs should be tiny, and 0.7 is still small next to the 2.3-unit avatar. The owner judges the size on the tablet (Gate 2 checklist).
- Close-up visuals not captured: the hidden browser pane ran at 1–3 fps, so the camera couldn't settle.
**T08 accepted.**
