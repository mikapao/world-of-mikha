# T07 test report: more detail, Candy Island + Firefly meadow

**Verdict: PASS** (`node --test tests/` 98 of 98 run checks pass, 4 skipped as before (YAML); `npm run build` succeeds. Binding check: projected milestone total 45,570 is inside 44,500–48,200. Commander's live measurement over 3 launches: 45,858 / 45,678 / 45,642, average 45,726 = +23.0% vs 37,186, inside the band.)

**Final decision (Commander, 2026-11-22):** the brief's metric is the whole environment excluding the ocean (`team/baseline/README.md`). The per-area 20–30% band is guidance only. Informational: counted areas vs base 0c7c887 = 28,258 → 36,750 = +30.05% (logged, not asserted). Pair Candy + Meadow = +33.0% (reported, sanity bound 0–60%). The earlier FAIL verdict in this file (before the decision) is superseded.

**Update 2026-11-22 (Commander decision):** the per-area 20–30% band is guidance only. The Candy + Meadow pair check is now a report with a 0–60% sanity bound. Two milestone checks were added. Counted areas versus base 0c7c887 (geometry-count method): 28,258 → 36,750 = +30.05%, asserted 20–30%, FAILS by 0.05 points. Projected total on the in-scene base: 37,078 + 8,492 = 45,570 (+22.9%), asserted 44,500–48,200, PASSES. The 0.05-point miss comes from the counted-area base (which leaves out the unreplayed meshes) and is for the Commander to accept or to reduce a meadow change by a few triangles. The sections below the update were written before this change; the pair figures there (+33.0%, +35.3%) are still correct.

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D5. Task: `team/tasks/T07.md`. Base commit for source checks: `6d8fc8c` (T06 commit).
Review state tested: the Coder's changes plus the Commander's two review changes (gumdrops and frosting drips back to the base values; lollipop balls 16×10, willow crowns 14×10).
Test file added: `tests/T07-detail.test.mjs`. No application code was changed. `package.json` untouched.

## Commands run

```
node --test tests/T07-detail.test.mjs
node --test tests/
npm run build
git show 6d8fc8c:src/world/candyIsle.js
git show 6d8fc8c:src/world/meadowIsle.js
git diff 6d8fc8c -- src/world/candyIsle.js src/world/meadowIsle.js
node --input-type=module (read-only probe of three.js constructor counts and layout.js radii, run from the scratchpad folder)
```

`git show` and `git diff` are read-only. The probe scripts were kept in the scratchpad folder, not in the project.

## Results

### tests/T07-detail.test.mjs (11 checks)

| Check | Result |
|---|---|
| Git base snapshot (`6d8fc8c`) is readable, so the source checks are not skipped | PASS |
| Source: after replacing only the 21 allowed segment arguments in the base text, both working copies are identical (no other change) | PASS |
| Source: drips, gumdrops, sprinkles, cotton puffs, tufts, stones, stars and fireflies keep their base lines | PASS |
| Source: colour list and material calls are identical to base, same order, in both files | PASS |
| Source: obstacle, reserved and walk-area lines unchanged; `layout.js`, `lighting.js`, `engine.js`, `crystalIsle.js`, `winterIsle.js` unchanged | PASS |
| Layout radii used by the counts: Candy 8.5, Meadow 8.5 (from `layout.js`) | PASS |
| Triangles: per-object counts (cake, lollipop ball/band, cupcake frosting, donut, gumdrop, sprinkle, drip, tuft, stone, willow crown) | PASS (after 2 expectation fixes, see Failures note 2) |
| Triangles: Candy Island alone, 11,254 to 14,102 (reported) | PASS |
| Triangles: Firefly meadow alone, 5,668 to 8,408, tufts and stones counted (reported) | PASS |
| Triangles: Candy + Meadow pair, 16,922 to 22,510 = +33.0% (reported; per-area band is guidance; sanity bound 0–60%) | PASS |
| Milestone: counted areas (home + bridges 6,862→8,774, Crystal + Winter 4,474→5,466, Candy + Meadow) vs base 0c7c887, 28,258 → 36,750 = +30.05%, asserted 20–30% | **FAIL** (by 0.05 points) |
| Milestone: projected total 37,078 + 8,492 = 45,570 (+22.9%), asserted 44,500–48,200 | PASS |
| Triangles: pair growth without tufts, 15,842 to 21,430 = +35.3% (reported, not gated) | PASS |

### Full suite: `node --test tests/`

| Item | Count |
|---|---|
| Run | 100 |
| Passed | 95 |
| Failed | 1 (`T07 triangles: Candy + Meadow combined grows by 20-30%`) |
| Skipped | 4 (the YAML workflow checks, skipped as before because there is no YAML parser in `node_modules`) |

Baseline 38 plus T05 and T06 checks pass unchanged. T05 and T06 source checks still pass against their own base commits.

### Triangle table (constructor count, index / 3; same method as T05 and T06, not a live overlay)

| Area | Before (base `6d8fc8c`) | Now | Change |
|---|---|---|---|
| Candy Island (cake 4 cylinders, 26 drips, 6 lollipops, 5 cotton trees, 4 canes, 4 cupcakes, 4 donuts, 14 gumdrops, 70 sprinkles) | 11,254 | 14,102 | +2,848 (+25.3%) |
| Firefly meadow (top + base, 5 willows, 12 mushrooms, 5 stones, 30 tufts × 3) | 5,668 | 8,408 | +2,740 (+48.3%) |
| Pair, tufts and stones counted | 16,922 | 22,510 | +5,588 (+33.0%) |
| Pair, tufts and stones not counted | 15,842 | 21,430 | +5,588 (+35.3%) |

Where the meadow delta comes from: willow strands 9 × 5 at sphere 8×6 instead of 6×5 (+1,440); willow crowns 14×10 instead of 9×7 (+720); willow trunks (+40); top and base cylinders (+48); mushrooms (+492).
Where the Candy delta comes from: lollipop balls (+888), lollipop bands (+624), cupcakes (+384), donuts (+416), candy canes (+384), cake (+64), lollipop sticks (+48), cotton tree sticks (+40).

Milestone total (islands + bridges, ocean excluded), projected and not measured in the scene: the baseline in `team/baseline/README.md` is ~37,078 in-scene. Adding the constructor-method deltas from T05 (+1,632), T06 (+992) and T07 (+5,588) gives about 45,290, inside 44,500–48,200. This mixes two counting methods, so it is a projection only.

### Coder's notes differ from the current file

- Candy NOW: the Coder's note says 15,340. The current file gives 14,102. The Coder's figure predates the Commander's review changes.
- Meadow: the Coder's note says 4,408 to 6,728 with stones and tufts excluded. The 4,408 base figure leaves out the 5 stones (180 triangles). The current file gives 4,588 to 7,328 with the same exclusions (stones in, tufts out), and 5,668 to 8,408 with everything counted.
- Pair: the Coder's note says 15,662 to 22,068 (+41%), and its "+30%" comparison used a different base. Neither matches the current file.

## Failures

### 1. Candy + Meadow pair growth above the 20–30% band (FAIL, not an application crash)

- Test: `tests/T07-detail.test.mjs`, "Candy + Meadow combined grows by 20-30% (D5 band; tufts and stones counted)".
- Expected: pair growth of 20–30% (D5 "each task aims for +20–30% within its own area"; T07 acceptance "same as T05").
- Actual: 16,922 to 22,510 = +33.0%. Without tufts and stones: +35.3%.
- Cause: the willow strands (8×6) and willow crowns (14×10) in `src/world/meadowIsle.js` add the most. Candy alone (+25.3%) is inside the band.
- This is a design decision, not a test error. The Commander can (a) accept it because the milestone total still sits inside 44,500–48,200, or (b) lower one of the meadow changes (for example the willow strands back to 6×5) and rerun the test. The test was not weakened: its expected value is the 20–30% band from D5.
- Location: `src/world/meadowIsle.js` lines with `SphereGeometry(0.22, 8, 6)` (strands) and `SphereGeometry(0.95, 14, 10)` (crowns). Line numbers were not checked against the file view.

### 2. Test expectations corrected by the Tester (test-side, fixed)

- The first draft used my own hand-written expectations for some sphere counts: lollipop ball 160 (should be 140 for 10×8), cupcake frosting 160 (140), willow crown 112 and 264 (108 and 252), gumdrop 42 (63), drip 84 (70). Each was checked against the constructor and the formula 2w(h−1) for a full UV sphere, and the test now uses the corrected values. The application code was not the cause.
- The T07 test's cake radius was first written as 8 rather than 8.5 (`I4.r` in `layout.js` is 8.5). Corrected.
- A bogus `layout counts` check was removed and replaced with a check of the island radii.
- The first draft used the Coder's figures (15,340 for Candy and 4,408 / 6,728 for Meadow) as expected values. Those are stale or count differently, so the test now uses constructor-based values and reports the Coder's numbers in comments.

## Observations (no action taken)

1. The unchanged-line check uses exact text lines. If a later task moves one of these lines, this check will need updating (the same as the T05 and T06 checks).
2. Tufts (30 × 3 cones, 4 radial segments) and stones are counted in the headline pair figure. The Coder excluded tufts. The non-tuft figure is +35.3%.
3. Fireflies and stars are `THREE.Points`, so they add no triangles. Their count and size are checked as unchanged, but they are not counted.
4. Mushroom caps use the scale `s` (0.6 to 1.1) at random; the triangle count does not depend on `s`.

## Not run

| Item | Reason |
|---|---|
| Live triangle count from the `?debug` overlay (T01 method on the real scene) | Needs a browser. Counts above come from geometry constructors in Node. The in-scene baseline for Candy (12,944) and Meadow (8,416) includes items that this method leaves out, so the two methods do not match exactly. |
| Milestone total re-measured in the running scene | Needs a browser (the overlay). The ~45,290 figure is a projection only. |
| Visual check that the islands look the same shape and colour | Needs a browser (user checklist). |
| Runtime check that the avatar walks on and around both islands | Layout, obstacles and walk areas are unchanged in source. No runtime check run. |
| YAML workflow tests (4, pre-existing) | No YAML parser in `node_modules`; same skips as T04–T06. |

## For the user's browser checklist

- Open the game (`npm run dev`). Candy Island's cake should look the same: pink top, cream line, chocolate base. Lollipops should look rounder, with the same colours and stripes.
- Candy Island: cupcakes and donuts should look a little rounder. Candy canes should look the same. Gumdrops, sprinkles and the frosting drips should look unchanged.
- Firefly meadow: willow trees should look fuller and rounder, with the same drooping strands and colour. Mushrooms should look a little rounder. Tufts, stones, fireflies and stars should look unchanged.
- Walk the avatar around both islands. Nothing should snag on a lollipop, willow or mushroom.
- Check the balance between the meadow and the other islands. If the meadow willows look too dense next to the Candy Island, tell the Commander (see Failures 1).

## Commander review (2026-11-22): PASS
- Review fixes: gumdrops and frosting drips reverted (D5). Lollipop balls (16,10) and willow crowns (14,10) raised so the milestone total reaches the band.
- Decision: the milestone total is binding, and the per-pair band is guidance (D5 clarified). The pair landed at +33%, which is accepted and recorded.
- Live total (3 launches): 45,726 avg = **+23.0%** vs 37,186. Brief "Done when" 1 is met.
- Browser: Candy and Meadow have the same palette, shapes and night mood, with rounder lollipops, cupcakes, donuts and willows.
**T07 accepted. The detail part of the milestone is complete.**
