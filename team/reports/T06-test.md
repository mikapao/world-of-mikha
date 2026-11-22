**Verdict: PASS** (12 of 12 T06 checks pass after the pine trunk change; combined triangle growth +22.2%, inside the +20–30% target; `node --test tests/` 85 of 85 run checks pass, 4 skipped as before; `npm run build` succeeds)

# T06 test report: more detail, Crystal Isle + Winter Wonderland

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D5. Task: `team/tasks/T06.md`. Review of the Commander's changes included: Crystal Isle top and base back at 6 radial segments (hexagon). Changes against the T05 commit: spire radial 5 to 8 (`crystalIsle.js`); Winter top/base 12 to 16, drifts 8x5 to 10x6, igloo dome 10x6 to 14x7, pine cones 7 to 8, and pine trunks 5 to 8 radial (`winterIsle.js` line 53, added by the Commander after the first run).
Test file added: `tests/T06-detail.test.mjs`. Test file changed: `tests/T05-detail.test.mjs` (baseline reference only, see Failures note 1). No application code was changed. `package.json` untouched.

## Commands run

```
node --test tests/T06-detail.test.mjs
node --test tests/
npm run build
git show 0c7c887:src/world/homeIsland.js
git show 0c7c887:src/world/bridge.js
git show 499d635:src/world/crystalIsle.js
git show 499d635:src/world/winterIsle.js
git diff src/world/
git log --oneline
```

Run from `E:\Dev\world-of-mikha` (Node v26.13.0). The `git show` and `git diff` calls are read-only. A probe script was run from the scratchpad folder (not in the project) to check constructor triangle counts and the spire and rim-chunk placement loops.

## Results

### tests/T06-detail.test.mjs

| Check | Result |
|---|---|
| Git base snapshot (`499d635`) is readable, so the source checks are not skipped | PASS |
| Source: after replacing only the 8 allowed segment arguments in the base text, both working copies are identical (no other change) | PASS |
| Source: Crystal Isle top and base are still 6-sided cylinders (same lines as base, same radii and positions) | PASS |
| Source: colour list (`0x…`) and material calls are identical to base, same order, in both files | PASS |
| Source: obstacle, reserved and walk-area lines unchanged; `layout.js`, `lighting.js`, `engine.js` unchanged | PASS |
| Source: snow points (count 420, colour, size), winter glints (0.12, 0), crystal clusters (0.3, 0), motes (0.05, 5, 4), grass patches and pond not raised | PASS |
| Triangles: per-object counts (cylinder incl. pine trunk 20 to 32, cone, sphere, octahedron, dodecahedron) match the constructors | PASS |
| Layout replay: 8 spires placed (of 9), 13 rim chunks placed (of 14) | PASS |
| Triangles: Crystal Isle alone, 1132 to 1228 (reported, not gated) | PASS |
| Triangles: Winter Wonderland alone, 3342 to 4238 (reported, not gated) | PASS |
| Triangles: Crystal + Winter combined grows by 20–30%, 4474 to 5466 | PASS (+22.2%) |
| Triangles: combined growth without motes, 3874 to 4866 (reported, not gated, +25.6%) | PASS |

### Triangle table (constructor count, index / 3; same method as T01 and T05, not a live overlay)

| Area | Before (base, `499d635`) | Now | Change |
|---|---|---|---|
| Crystal Isle (top 6+base 6 at 24 each, 8 spires 20 to 32, 33 octahedra, 20 motes, 10 grass patches) | 1132 | 1228 | +96 (+8.5%) |
| Winter Wonderland (top 48 to 64 and base 48 to 64, 13 rim rocks 36, 12 drifts 64 to 100, pond 14, igloo dome 110 to 182, box 12, doorway 10, 12 pines 146 to 164 (trunk 20 to 32), 14 glints 8) | 3342 | 4238 | +896 (+26.8%) |
| Pair (ocean and snow points excluded) | 4474 | 5466 | +992 (+22.2%) |
| Pair without motes (motes unchanged; shown for the denominator question) | 3874 | 4866 | +992 (+25.6%) |

Breakdown of the +992: spires +96, Winter top and base +32, drifts +432, igloo dome +72, pine cones +216 (72 cones, 21 to 24 each), pine trunks +144 (12 trunks, 20 to 32 each).

Note on the Coder's notes (`team/tasks/T06.md`): the Coder's numbers are out of date and do not match the code now. The Crystal top and base change (+48) was reverted by the Commander, so Crystal now adds +96, not +144. The Coder counted pine cones as 14 to 16 triangles, but a cone with 7 radial segments has 21 triangles (14 side plus 7 base cap); the 7 to 8 change gives 21 to 24, so pines add +216, not +144. The Coder also left out the motes, rim rocks and grass. The Coder's combined "+25.7%" is therefore not the right number.

## Failures

None in the final run.

Earlier run (before the pine trunk change): the combined growth check failed at +19.0% (4474 to 5322, short by about 47 triangles). The Commander applied the suggested fix (pine trunks 5 to 8 radial, `winterIsle.js` line 53). The test was updated for that change (new allowed argument in the source check, trunk counted in the Winter total, expected totals 4238 / 5466 / 4866), not weakened. The 20% floor is now met at +22.2%.

### Test fixed, not an app bug: T05 source test broke after the T05 commit

- Symptom: `node --test tests/` showed `T05 source: only the allowed geometry detail arguments differ from HEAD` failing ("…should occur exactly once in HEAD…, found 0").
- Cause: the T05 test compared against `HEAD`. Commit `499d635` (T05) is now HEAD, so the T05 changes are part of the baseline and the allowed replacements no longer match.
- Fix (test only): `tests/T05-detail.test.mjs` uses `BASE = "0c7c887"` (the state before T05). `tests/T06-detail.test.mjs` uses `BASE = "499d635"`. Both constants need updating when a task is committed (the comment in each file says so). I checked that these commits contain the pre-change code (`grep` counts 1 each).

## Observations (no action taken)

1. Motes (`SphereGeometry(0.05, 5, 4)`, 30 triangles each, 20 of them) are counted as island triangles. Their count is fixed. With motes excluded the growth is +25.6%; with them, +22.2%. Both pass.
2. Rim rocks (13, `DodecahedronGeometry` detail 0, 36 triangles each) and pines were not raised. Rim rocks at radius ≥ 0.5 could go to detail 1 under the D5 rule, but their radii are random, so the count would be random. Not tested.
3. Snow is `THREE.Points`, so it has no triangles. The test checks that its count and size are unchanged, but does not count it.
4. The Commander's hexagon check passes: Crystal top and base are 6-sided in both base and working copy.

## Not run

| Item | Reason |
|---|---|
| Live triangle count from the `?debug` overlay (T01 method on the real scene) | Needs a browser. Counts above come from geometry constructors in Node. |
| Visual check that the islands look the same shape and colour | Needs a browser (user checklist). |
| Runtime check that the avatar can walk on and around both islands | Not needed for the source check (layout, obstacles and walk areas are unchanged in source). No runtime check run. |
| YAML workflow tests (4, pre-existing) | No YAML parser in `node_modules`; same skips as T04 and T05. |

## For the user's browser checklist

- Open the game (`npm run dev`, or the `?debug` URL). Crystal Isle's rocky rim should look the same, with rounder spires. Its top should still look like a six-sided island from above.
- Winter Wonderland: the snow drifts and the igloo dome should look a little rounder. Pine trees should look the same shape. Falling snow and the sparkly glints should look unchanged.
- Walk the avatar around Crystal Isle and Winter Wonderland. Nothing should snag on a spire, pine or igloo.
- Pine trunks should look a little rounder, and the pines should look the same colour and height.
- Check the colours of crystals, pines and snow are the same as before.

## Commander review and browser check (2026-11-22): PASS
- Review fix 1: Crystal Isle's top and base went back to 6 sides. The Coder's 12 sides turned the deliberate hexagon into a 12-gon that no longer matched the hexagonal rim (seen in the browser).
- Review fix 2 (Tester's suggestion): pine trunks 5→8 to reach the band. Final Crystal + Winter is +22.2%.
- Browser: Winter has a rounder igloo, drifts and pines, with the same palette and light. Crystal Isle keeps its hexagon, with rounder pillars only.
**T06 accepted.**
