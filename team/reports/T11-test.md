# T11 test report: performance pass (animals merged, pixel budget)

**Verdict: PASS** (the full suite passes: 163 of 163 run checks, 4 skipped as before. `npm run build` passes. The pixel floor is now 0.5 by Commander decision; the earlier 4K failure is resolved.)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Task: `team/tasks/T11.md`. Design: `team/02_design.md` D8.
Test file added: `tests/T11-perf.test.mjs`. Guards updated: `tests/T06-detail.test.mjs`, `tests/T07-detail.test.mjs` (engine.js allows exactly the D8 line, now with floor 0.5). No application code was changed.

## Commands run

```
node --test --test-reporter=tap tests/                      (before my edits: 153 run, 147 pass, 2 fail, 4 skipped)
node --test --test-reporter=tap tests/                      (floor 0.75 run: 167 run, 162 pass, 1 fail, 4 skipped)
node --test --test-reporter=tap tests/                      (final, floor 0.5: 167 run, 163 pass, 0 fail, 4 skipped)
npm run build                                               (exit 0, "built in 1.46s")
```

All run from `E:\Dev\world-of-mikha`. The TAP reporter was used so the counts are easy to read.

## How the checks run (no browser, no WebGL)

- `src/world/animals.js` is loaded in Node as the real file. Its `../engine.js` import is replaced by a stub: `scene.add` records objects, and `mat()` / `mesh()` copy the real `engine.js` definitions. `layout.js` has no imports and is loaded as is.
- For colour and triangle checks, the test appends an `export { ... }` line to the animals source, so it can reach `ROSTER`, `bake` and each design. Each design is built twice, raw and baked.
- The pixel-ratio checks read the real `renderer.setPixelRatio(...)` line inside `resize()` in `src/engine.js` and evaluate it with a given `innerWidth`, `innerHeight` and `devicePixelRatio`. Buffer pixels are `floor(w × ratio) × floor(h × ratio)`.

## Results

### Guards (T06 and T07 "engine.js unchanged" checks)

| Check | Before | After |
|---|---|---|
| T06 source: only allowed edits; layout/lighting unchanged; engine.js = HEAD + the D8 line (floor 0.5) in `resize()` | FAIL | PASS |
| T07 source: layout/lighting/crystal/winter unchanged; engine.js = base + the D8 line (floor 0.5) | FAIL | PASS |

The guards use the D8 line as an exact anchor. It must occur once in the base, and the working file must equal the base with that one line inserted.

### tests/T11-perf.test.mjs (14 checks)

| Check | Result |
|---|---|
| Source: ROSTER has 12 land animals; the kind list has 15 (12 land + dolphin, gull, turtle) | PASS |
| Source: every colour literal in animals.js has no 0x00 channel (comment-free text, more than 20 literals) | PASS |
| Source: merged materials are `mat(hex, { vertexColors: true, side })`; bake() called for every land, dolphin, gull and turtle build | PASS |
| Meshes after baking: bunny 1, bird 1, penguin 1, duckling 1, ladybug 1, frog 1, dolphin 1, butterfly 3, gull 3, turtle 5 (each within its limit) | PASS |
| Triangles: baked count equals the raw count for all 15 kinds, and each species is within ±5% of its T08/T09 reference | PASS |
| Colour round trip: every baked vertex (colour × material colour), with position, shadow flag and side, matches an original part within 1/255 (multiset check, 15 kinds) | PASS |
| Negative control: the colour comparison flags a bunny's baked mesh checked against frog parts | PASS |
| Motion: butterfly wings, gull wings and turtle flippers are direct child groups with meshes; each one's rotation.z changes between t = 1.0 and t = 1.3 through `updateAnimals()` | PASS |
| Source: `resize()` has exactly one `setPixelRatio` call with the D8 formula (floor 0.5), before `setSize`; `resize` is on the `resize` event | PASS |
| Pixel ratio, 1280×800 at dpr 2: ratio 1.5625, buffer 2,500,000 px | PASS |
| Pixel ratio, 2560×1440 at dpr 2: ratio 0.8236, buffer ≤ 2.5 M (and > 2.4 M) | PASS |
| Pixel ratio, 3840×2160 at dpr 2: ratio = sqrt(2.5 M / 8,294,400) = 0.549, buffer ≤ 2.5 M | PASS |
| Pixel ratio, 7680×4320 at dpr 2 and dpr 0.25: ratio exactly 0.5 (the floor holds) | PASS |
| Pixel ratio grid (7 screen sizes × dpr 0.5, 1, 1.5, 2, 3, missing): ratio always ≥ 0.5 and ≤ 2; missing dpr counts as 1 | PASS |

Measured values: 1280×800 @2 = 1.5625; 2560×1440 @2 = 0.8236; 3840×2160 @2 = 0.549 (buffer ≤ 2.5 M); 7680×4320 @2 = 0.5.

Counts: 167 run (153 before this task, of which 2 were the guards now fixed, plus 14 new T11 checks). Pass 163, fail 0, skipped 4 (YAML checks skipped in earlier reports, unchanged).

## Failures

None in the final run.

Resolved during this task: with the 0.75 floor, 3840×2160 at dpr 2 gave a buffer of 4,665,600 px and failed the 2.5 M budget check. The Commander changed the floor to 0.5, and the test now asserts the 0.549 ratio and the budget.

### Premise note (not a failure): 1280×800 at dpr 2

The task said this case "gives dpr" and quoted "≈ 2.05 M px". Both numbers are wrong. 1280×800 is 1.024 M CSS pixels. At dpr 2 the native size would be 4.096 M. The formula gives 1.5625, so the buffer is exactly 2.5 M. The test asserts the formula's value, as the task asked.

### Budget note for the Commander

At 7680×4320 the 0.5 floor gives a buffer of 3840×2160 = 8.3 M pixels, above the 2.5 M budget. This is the accepted trade-off of the 0.5 floor on very large screens. It is not asserted in the tests.

## Not run

- **Frame rate at 2560×1440 (≥ 30 fps with `?debug`):** needs a real GPU and browser.
- **Scene-wide draw-call total (≤ ~300 target):** per-animal counts are checked (land 14 meshes for 12 animals; marine 16 for 2 dolphins, 3 gulls and 1 turtle). Islands and monuments need a browser or a full build.
- **Pixel count as the real renderer sees it:** modelled from `setSize` and `setPixelRatio`; no WebGL context.
- **Visual identity of the merged animals:** the maths and material settings are checked, not the pixels.

## For the user's browser checklist

1. Run `npm run dev`, open `?debug` on a desktop browser at about 2560×1440, and check the frame rate stays ≥ 30 fps (the D8 target).
2. Check each animal (2 bunnies and 1 butterfly on Home; 2 birds on Crystal; 2 penguins on Winter; duckling and 2 ladybugs on Candy; 2 frogs on Meadow) looks the same colour as before. Look especially at the bunny's white tail, the frog's eyes and the ladybug's spots.
3. Check the butterfly's and gulls' wings flap, and the turtle's four flippers each move.
4. Check the animals' shadows still fall on the ground.
5. Check the dolphins still leap and the turtle still swims.
6. Resize a browser window to a narrow phone-size width and back. The picture should stay sharp and not zoom or shift.
7. On the tablet, and on a 4K desktop, check the picture is sharp enough at the new floor of 0.5.

## Notes on the tests themselves

- `tests/T06-detail.test.mjs` and `tests/T07-detail.test.mjs` were edited only in the engine.js guard, to allow the D8 line with floor 0.5.
- The T11 file loads the real `animals.js` with its own stub. The stub's `mat()` copies the real one, so `vertexColors` options are kept.
- The top-level `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))` in `engine.js` (above `resize()`) is still there. `resize()` runs straight after it at load, so the final ratio is the D8 one. This is harmless.

## Commander review and browser measurement (2026-11-22): PASS
- Review decisions: turtle at 5 draw calls accepted. Pixel-ratio floor lowered 0.75 → 0.5, because 0.75 contradicted the 2.5 M budget at 4K (D8 note). The colour-division trick is guarded and tested (no 0x00 channels).
- Fresh dev server, Claude pane visible, 2560×1440 viewport, `?debug`: pixel ratio 0.82 (canvas 2108×1185), **60 fps on all five islands** (home, crystal, winter, candy, meadow). Before T11: 36 fps. Draw calls 337, above the ~300 estimate but no longer limiting.
**T11 accepted.**
