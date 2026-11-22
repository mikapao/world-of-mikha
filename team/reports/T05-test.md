# T05 test report: more detail, home island + bridges

**Verdict: PASS** (7 of 7 T05 checks pass; full suite 73 of 73 run checks pass, 4 skipped as before; `npm run build` succeeds). Triangle growth of home island + bridges is 27.9%, inside the 20–30% band. Home island alone is +49%, above 30%; see Failures/Observations.

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D5. Task: `team/tasks/T05.md`. Review of the Commander's changes included (bridge posts back to plain boxes, lanterns 8,6 to 10,6, tree trunks 6 to 8 radial).
Test file added: `tests/T05-detail.test.mjs`. No application code was changed. `package.json` untouched.

## Commands run

```
node --test tests/T05-detail.test.mjs
node --test tests/
npm run build
git show HEAD:src/world/homeIsland.js
git show HEAD:src/world/bridge.js
git diff src/world/
```

Run from `E:\Dev\world-of-mikha` (Node v26.13.0). The `git show` calls are read-only and are used by the test file to get the HEAD text. A scratch count script was run from the scratchpad folder (not in the project).

## Results

### tests/T05-detail.test.mjs

| Check | Result |
|---|---|
| git HEAD snapshot is readable (`git show`), so the source-diff checks are not skipped | PASS |
| Source: after replacing only the 5 allowed segment arguments in HEAD text, the working copy is identical (no other change) | PASS |
| Each allowed replacement matches exactly once in HEAD (no silent no-op) | PASS (inside the check above) |
| Source: colour list (`0x…`) in homeIsland.js (14 values) and bridge.js (4 values) is identical to HEAD, same order | PASS |
| Source: material calls (`mat(...)`, `MeshStandardMaterial(...)`) identical to HEAD | PASS |
| Source: flowers `SphereGeometry(0.12, 5, 4)`, pebbles `Dodecahedron(…, 0)`, cloud blobs `Icosahedron(…, 0)`, bridge posts `BoxGeometry(0.14, 0.7, 0.14)` are unchanged | PASS |
| Triangles, per object (three.js 0.128 constructors): island cylinder 56, tree trunk 32, leaf 80, lantern 100, post box 12 | PASS |
| Triangles, growth of home + bridges with rocks counted at max on both sides: 6862 to 8774 = +27.9% (band 20–30%) | PASS |
| Triangles, totals match the T05 numbers (HEAD 2826 + 4036; now 4218 + 4556) | PASS |
| Triangles, home alone and bridges alone reported (see table below) | PASS (reported, not gated) |

### Triangle table (T01 formula: geometry index count / 3, not a live overlay)

| Area | Before (HEAD) | Now | Change |
|---|---|---|---|
| Home island (grass + earth 2x, trunks 20x, leaves 20x, flowers 45x, clouds 15x, pebbles max 6x) | 2826 | 4218 | +49.2% |
| Home island, pebbles excluded | 2610 | 4002 | +53.3% |
| Bridges (planks 71, posts 50, rails 42, lanterns 26; 4 bridges) | 4036 | 4556 | +12.9% |
| Home + bridges (pebbles at max) | 6862 | 8774 | +27.9% |

Notes on the breakdown: the leaves account for +1200 (20 leaves x 20 tris to 20 x 80 tris), the island cylinders +32, trunks +160, lanterns +520 (26 x 80 to 26 x 100). The bridge posts change (+400) that the Coder had made is no longer present, as the Commander asked.

### Commander's diff check (`git diff src/world/`)

- `homeIsland.js`: 4 segment arguments changed (grass 10 to 14, earth 10 to 14, trunk 6 to 8, leaf detail 0 to 1). Nothing else.
- `bridge.js`: 1 segment argument changed (lantern sphere 8,6 to 10,6). Post boxes are plain `BoxGeometry(0.14, 0.7, 0.14)`, as at HEAD.
- Positions, scales, obstacles (`obstacles.push` radii), `reserved`, walk circles (`layout.js` not touched), colours and materials: unchanged.

## Failures

No check failed.

## Observations (no action taken; for the Commander)

1. Acceptance criterion 1 is worded per area ("Home island + bridges"). Combined growth is 27.9%, which passes. Home island alone is +49%, and bridges alone +12.9%. If the Commander reads the 20–30% band per sub-area, the home island is over and the bridges are under. The design file's wording ("within its own area") supports the combined reading.
2. The Coder's notes are out of date after the Commander's review. The Coder quoted bridges 4436 (it included the posts +400 and not the lanterns). With the posts reverted and the lanterns at 10,6, the bridge count is 4556. The Coder quoted home 4058 (it had no trunk change). Current home is 4218 with pebbles at max.
3. Pebbles (rocks) are random in count (0 to 6). They are unchanged, so they only shift the percentage. Both results are reported above (with and without them): 27.9% and 28.8%.
4. The triangle counts come from geometry constructors in Node, with object counts from the source and `layout.js` (bridge object counts were replayed from the bridge loop). This matches the T01 formula but was not read from the live overlay in a browser.

## Not run

| Item | Reason |
|---|---|
| Live triangle count from the `?debug` overlay (T01 method on the real scene) | Needs a browser. Counts above come from the geometry constructors in Node. |
| Visual check that the island and bridges look the same shape and colour | Needs a browser (user checklist). |
| Walk circle and obstacle positions in the running game | Not needed for the source check (no position or obstacle code changed, verified by the exact source diff). Runtime check not run. |
| YAML workflow tests (4, pre-existing) | No YAML parser in `node_modules`; same skips as T04. |

## For the user's browser checklist

- Open the game (`npm run dev`, or the `?debug` URL). The home island and the four bridges should look the same as before, with slightly rounder edges on the island rim and tree trunks, and smoother tree blobs.
- Bridge lanterns should look the same colour and glow as before (only a little rounder).
- Walk the avatar across each bridge and around the home island. Nothing should snag on a tree or a post.
- Check the `?debug` overlay triangle count against the before number (about 37,078 excluding ocean in the T01 baseline, before this task). The increase should be roughly the 27.9% above for the home + bridges part.

## Commander review and browser check (2026-11-22): PASS
- Review fix: the bridge-post height segments added triangles with no visible change (against D5), so I reverted them. Those triangles went instead into tree trunks (6→8) and lanterns (8,6→10,6).
- Live `?debug` env tris went from 37,186 to **39,062** (+1,876). Home + bridges is +27.9% (Tester's geometry count), within the band. Home alone is above 30% and bridges below, which is acceptable because the target is per area pair.
- Screenshot compared with `baseline/1-home.jpg`: rounder faceted canopies and a smoother island edge, with the same palette and lighting.
**T05 accepted.**
