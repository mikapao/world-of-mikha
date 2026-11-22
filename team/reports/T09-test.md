# T09 test report: marine life (src/world/animals.js, marine section)

**Verdict: FAIL** (`tests/animals.test.mjs`: 35 of 39 checks pass. The 4 failures are all T09 checks. `node --test tests/`: 141 checks run, 133 pass, 4 fail (the T09 checks above), 4 skipped as before (YAML). `npm run build` succeeds.)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Task: `team/tasks/T09.md`. Design: `team/02_design.md` D6 (marine part).
No application code was changed. Test file changed: `tests/animals.test.mjs` (T09 checks added; T08 harness changed, see below). `package.json` untouched. `npm run build` writes `dist/`, a generated folder.

## Commands run

```
node --test tests/animals.test.mjs
node --test tests/
npm run build
```

All run from `E:\Dev\world-of-mikha` (Node v26.13.0). Two temporary debug tests were appended to `tests/animals.test.mjs` during diagnosis (the gull radius trace and the per-run sweep print). They were removed, and the file was checked for leftovers (none).

## How the runtime checks work (no WebGL)

Same stubbed-engine harness as T08 (`src/engine.js` and `src/world/lighting.js` stubbed; real `animals.js`, layout and island builders loaded in Node). Monuments are not built; their rings and obstacles come from the T08 constants.

- **Harness change (T08 checks):** `makeWorld()` now splits the scene groups. Groups with a marine colour go to `marine`; the rest stay in `groups`. The T08 checks still see land animals only. All 19 T08 checks pass unchanged in meaning.
- **Island outlines:** the marine checks measure distance to the drawn outline (CylinderGeometry polygons with their real segment counts: home 14, crystal 6, winter 16, candy 24, meadow 20), not to the nominal circle. Each island file is checked to contain its CylinderGeometry line.
- **Sweeps:** 2 seeds × 5 island cameras, 120 s at 1/60 s. Each run starts with one frame at the player's start (-1, 0, 2), as the game does, then the island camera. 18,659 dolphin visible samples; every gull and turtle sample on every frame.
- Marine kinds are told apart by one colour each (dolphin 0x7f9fc2, gull 0xdfe6ee, turtle 0x5f9a62).

## Results

### tests/animals.test.mjs: T08 (19 checks, unchanged, all pass)

Roster, keep-out rules, culling, sound and source checks, all as recorded in `team/reports/T08-test.md`.

### T09 checks (20)

| Check | Result |
|---|---|
| Source: marine built at end of `buildAnimals`, updated from `updateAnimals`; gull centres and island outlines as the tests assume | PASS |
| Runtime: every build has 2 dolphins, 3 seagulls, 1 turtle (seeds 1-4) | PASS |
| Runtime: find rate over 200 builds (reported) | PASS (info) |
| Runtime: every marine animal ≤ 300 triangles (seeds 1-3) | PASS |
| Runtime: no marine mesh casts a shadow (seeds 1-2) | PASS |
| Runtime: dolphins start hidden (visible=false, y -1.5) | PASS |
| Runtime: gulls and turtle in place before the first frame | **FAIL** (failure 1) |
| Runtime: dolphin visible samples ≥ 3 from every island outline (min 3.49) | PASS |
| Runtime: dolphin visible samples never on walkable ground or a bridge | PASS |
| Runtime: every dolphin visible sample ≤ 10 from an island outline | **FAIL** (failure 2) |
| Runtime: hidden dolphins at y ≤ -1.3 (all at -1.50) | PASS |
| Runtime: dolphins leap in the sweep (positive control, 17 to 19 leaps per run) | PASS |
| Runtime: hidden time between leaps 8–15 s (measured 8.02 to 14.83) | PASS |
| Runtime: start-to-start leap interval (reported: 9.80 to 16.62 s) | PASS (info) |
| Runtime: gull radius 4–7 and height 4–6 in every sample | **FAIL** (failure 3, height; radius passes) |
| Runtime: once placed, turtle at y -0.85 ±0.05, not over walkable ground, ≥ 2.5 from an island outline | PASS |
| Runtime: turtle placed (not at the world origin) in every sweep run | **FAIL** (failure 1, turtle part) |
| Culling: no dolphin leaps with the camera 200 units away | PASS |
| Culling: gull frozen at 30.5, moves at 29.5 (30 by design) | PASS |
| Culling: turtle frozen at 22.5, moves at 21.5 | PASS |

Measured values:

| Measure | Value | Rule | Note |
|---|---|---|---|
| Find rate, 200 builds | 2 dolphins, 3 gulls, 1 turtle in all 200 builds | turtle spot always found | 0 misses. Nothing counted as "not found". |
| Turtle still at world origin after one frame at the start position | 175 of 200 builds | should be 0 | see failure 1 |
| Max triangles (seeds 1-3) | dolphin 224, gull 120, turtle 188 | ≤ 300 | counted with `triCount` |
| Dolphin min gap to outline (visible) | 3.49 | ≥ 3 | PASS |
| Dolphin max gap to outline (visible) | 12.11 | ≤ 10 | 2,581 of 18,659 visible samples over 10 |
| Hidden gap between leaps | 8.02 to 14.83 s | 8–15 s | PASS |
| Start-to-start | 9.80 to 16.62 s | (design 8–15 s wait + 1.8 s leap) | see observations |
| Gull y | 3.90 to 5.90 | 4–6 | gull 0 dips below 4 |
| Gull radius | 4.00 to 6.60 | 4–7 | PASS (checked with a 1e-6 float margin at the exact r = 4 gull) |
| Turtle y (placed samples) | -0.88 to -0.82 | -0.85 ±0.05 | PASS |

## Failures

### 1. Turtle sits at the world origin until the camera comes near its spot (defect, visible in play)

- **What I did:** built 200 worlds, ran one frame with the camera at the player's start (-1, 0, 2), and checked the turtle's position. Also ran the 2-seed × 5-island sweeps (each starts at the start position).
- **Expected:** the turtle is on its ellipse (y ≈ -0.85) from the first frame.
- **Happened:** the turtle group is never positioned at build. Its mesh stays at (0, 0, 0), y = 0, which is the centre of the home island, until the camera is within 22 units of its spot (the update step returns early when culled, so it never gets placed). After one start frame: 175 of 200 builds still at the origin. In the sweeps: 4 of 10 runs had the turtle at the origin for all 7,200 frames (seeds 2 home, crystal, candy, meadow); the other 6 runs placed it within the first frames or never had it at the origin.
- **File and line:** `src/world/animals.js` line 318 (`scene.add(g); turtleA = {...}` with no `g.position.set`). Culling in `updateMarine`, line 353. The mesh is only positioned inside that culled block (lines 355–358).
- **Impact:** a green turtle shape likely sits in the middle of the home island (partly in the grass) for most of a session. Not confirmed in a browser.

### 2. Dolphin leap ends reach up to 12.1 from an island outline (criterion: every visible sample ≤ 10)

- **What I did:** measured the distance to the outline for every visible dolphin sample, 2 seeds × 5 islands, 120 s.
- **Expected:** every visible sample within 10 units of an island edge (acceptance wording; D6: "a spot ≤ 10 from one").
- **Happened:** the spot (arc midpoint) is ≤ 10, as coded. The arc runs 2.2 units either side of it (`LEAP_L` 4.4), so the arc ends can reach about 12.1. 2,581 of 18,659 visible samples are over 10 (max 12.11).
- **File and line:** `src/world/animals.js` line 291 (`return e <= 10;` tests the midpoint only, `leapOk` lines 284–292).
- **Note:** this is a wording gap between the criterion (every sample) and the D6 rule (the spot). The Commander should choose: test the midpoint (current), or tighten the spot to about 7.8 for the arc ends.

### 3. Seagull 0 dips below 4 units (criterion: y 4–6)

- **What I did:** checked the height of every gull sample (2 seeds × 5 islands).
- **Expected:** y in 4–6.
- **Happened:** gull 0 base height is 4.2 with a bob of ±0.3, so it reaches 3.90. Below 4 in 11,094 of its 72,000 samples (about 15%). Gulls 1 and 2 stay in 4–6 (4.6–5.9).
- **File and line:** `src/world/animals.js` line 307 (`y: 4.2 + i * 0.7`) with the bob on line 346 (`* 0.3`).

### 4. Gulls and turtle start at the world origin before the first frame (construction)

- **What I did:** checked the positions straight after `buildAnimals`, before any update.
- **Expected:** gulls on their circles (radius 4–7, y 4–6) and the turtle at y ≈ -0.85.
- **Happened:** all three gulls and the turtle sit at (0, 0, 0). The mesh is only positioned by the first update. For gulls, the first frame places them (the start camera is within 30 of every gull centre), so this is not visible in play. For the turtle it is the cause of failure 1.
- **File and line:** `src/world/animals.js` lines 306 (gull `scene.add(g)`) and 318 (turtle).

### Observations (not failures)

- **Timing against D6:** D6 says the leap arc takes about 3 s and peaks at y ≈ 0.6. The code takes 1.8 s (`LEAP_T`) and peaks at 0.8 (`LEAP_Y0 + LEAP_H`, line 281). The acceptance wording "leaping every 8–15 s" is ambiguous: the hidden gap is 8–15 s, and start-to-start is 9.8–16.6 s. The Commander should say which is meant.
- **Gull culling** is 30 units, as the Coder chose (`CULL + 8`, line 342). Tested at 30.5 and 29.5.
- **Turtle find rate:** 0 misses in 200 builds. The dolphin and gull counts were also right in every build.
- **Dolphin shape:** from the source, the mesh reaches about 1.16 units ahead of its centre (snout) and about 1.45 behind it (flukes), in local units. The ≥ 3 check is on the centre point only, so the nearest body point is closer to the outline than 3 (not measured).

## Not run

| Item | Why |
|---|---|
| Real WebGL render: dolphin leap pitch, gull banking, turtle paddling, sizes, colours | No browser or WebGL in Node. Stubbed `engine.js`. |
| Turtle visible at the home centre (failure 1 on screen) | Needs a browser. Shown only by the position data. |
| Dolphin mesh extent against the outline | Only the centre point is checked, as the criteria say. |
| Sound check at runtime | Covered by the T08 source check on `animals.js` (no audio imports, no SFX/speech calls). Nothing plays at runtime because the code has no sound calls. |
| Top-level await in `animals.js` | Covered by the T08 source check (passes). |
| Triangle counts from the built GLB or the browser | Counted with `triCount` on the built groups. |
| Frame timing on the tablet | Not measured. |

## For the user's browser checklist

- After the fix for failure 1: the turtle is out on the water, not in the middle of the home island, from the first screen.
- Dolphins leap in open water beside the islands, never through the grass or bridges. Their arcs look right: the nose points along the jump, and the dolphin is hidden between leaps.
- Dolphins leap about every 10 to 17 seconds (start to start), and do not all leap together.
- Gulls circle between islands at a height that looks right; gull 0 may look slightly low at its lowest point.
- The turtle paddles slowly on the water and its flippers look right.
- No sound from any marine animal.

## Rework (attempt 2) and Commander re-run (2026-11-22): PASS
- Coder fixed: turtle and gulls are now placed on their paths at build (no more turtle on the home island); every dolphin arc sample is 3.2–8 from a nominal island edge (≤ 10 from the outline); gull y stays within 4.1–5.7; leap is 2.8 s with apex y 0.6 (D6).
- Commander re-ran the Tester's unchanged suite: `node --test tests/` 141 run, 137 pass, 0 fail, 4 skipped (YAML); `npm run build` OK. All 4 earlier T09 failures now pass.
- Visual check not done: the browser pane was hidden, so requestAnimationFrame was paused and the game couldn't load. Moved to the owner's Gate 2 checklist (dolphins, gulls, turtle on the tablet).
**T09 accepted.**
