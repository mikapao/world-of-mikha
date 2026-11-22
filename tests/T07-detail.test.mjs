// T07 checks: Candy island + Firefly meadow get more geometry detail, and nothing else changes.
// Source checks compare the working copy with the base commit (read-only `git show`).
// Triangle counts use three.js 0.128 geometry constructors in Node (no browser, no renderer),
// same counting as T05 and T06: index.count / 3 (or position count / 3 when not indexed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Baseline commit for source checks: the state before T07 (commit 6d8fc8c, the T06 commit). Update when a new task is committed.
const BASE = "6d8fc8c";
const FILES = ["src/world/candyIsle.js", "src/world/meadowIsle.js"];

const headText = f => {
  try {
    return execFileSync("git", ["show", `${BASE}:${f}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
  } catch (e) { return null; }
};
const workText = f => readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const haveGit = () => headText(FILES[0]) !== null;

// The only edits allowed by D5 / T07 (geometry detail arguments). Each must match exactly once in the base.
const ALLOWED = [
  // Candy island
  ["src/world/candyIsle.js", "CylinderGeometry(I4.r, I4.r, 0.5, 20)", "CylinderGeometry(I4.r, I4.r, 0.5, 24)"],
  ["src/world/candyIsle.js", "CylinderGeometry(I4.r - 0.15, I4.r - 0.15, 0.9, 20)", "CylinderGeometry(I4.r - 0.15, I4.r - 0.15, 0.9, 24)"],
  ["src/world/candyIsle.js", "CylinderGeometry(I4.r - 0.1, I4.r - 0.1, 0.18, 20)", "CylinderGeometry(I4.r - 0.1, I4.r - 0.1, 0.18, 24)"],
  ["src/world/candyIsle.js", "CylinderGeometry(I4.r - 0.2, I4.r - 2.2, 1.6, 20)", "CylinderGeometry(I4.r - 0.2, I4.r - 2.2, 1.6, 24)"],
  ["src/world/candyIsle.js", "CylinderGeometry(0.06, 0.06, 1.5, 6)", "CylinderGeometry(0.06, 0.06, 1.5, 8)"],
  ["src/world/candyIsle.js", "SphereGeometry(0.48, 10, 8)", "SphereGeometry(0.48, 16, 10)"],
  ["src/world/candyIsle.js", "TorusGeometry(0.48, 0.06, 6, 18)", "TorusGeometry(0.48, 0.06, 8, 20)"],
  ["src/world/candyIsle.js", "CylinderGeometry(0.07, 0.09, 1.2, 6)", "CylinderGeometry(0.07, 0.09, 1.2, 8)"],
  ["src/world/candyIsle.js", "CylinderGeometry(0.11, 0.11, 1.6, 10)", "CylinderGeometry(0.11, 0.11, 1.6, 12)"],
  ["src/world/candyIsle.js", "TorusGeometry(0.28, 0.11, 8, 12, Math.PI)", "TorusGeometry(0.28, 0.11, 10, 14, Math.PI)"],
  ["src/world/candyIsle.js", "CylinderGeometry(0.42, 0.32, 0.45, 10)", "CylinderGeometry(0.42, 0.32, 0.45, 12)"],
  ["src/world/candyIsle.js", "SphereGeometry(0.46, 10, 8)", "SphereGeometry(0.46, 12, 8)"],
  ["src/world/candyIsle.js", "SphereGeometry(0.11, 8, 6)", "SphereGeometry(0.11, 10, 8)"],
  ["src/world/candyIsle.js", "TorusGeometry(0.32, 0.15, 8, 16)", "TorusGeometry(0.32, 0.15, 10, 18)"],
  // Firefly meadow
  ["src/world/meadowIsle.js", "CylinderGeometry(I5.r, I5.r - 0.4, 0.8, 14)", "CylinderGeometry(I5.r, I5.r - 0.4, 0.8, 20)"],
  ["src/world/meadowIsle.js", "CylinderGeometry(I5.r - 0.4, I5.r - 2.6, 3, 14)", "CylinderGeometry(I5.r - 0.4, I5.r - 2.6, 3, 20)"],
  ["src/world/meadowIsle.js", "CylinderGeometry(0.16, 0.26, 1.8, 6)", "CylinderGeometry(0.16, 0.26, 1.8, 8)"],
  ["src/world/meadowIsle.js", "SphereGeometry(0.95, 9, 7)", "SphereGeometry(0.95, 14, 10)"],
  ["src/world/meadowIsle.js", "SphereGeometry(0.22, 6, 5)", "SphereGeometry(0.22, 8, 6)"],
  ["src/world/meadowIsle.js", "CylinderGeometry(0.06 * s, 0.09 * s, 0.45 * s, 6)", "CylinderGeometry(0.06 * s, 0.09 * s, 0.45 * s, 8)"],
  ["src/world/meadowIsle.js", "SphereGeometry(0.26 * s, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2)", "SphereGeometry(0.26 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)"],
];

// Lines that must be identical to the base (D5: sprinkles, gumdrops, tufts, stars, fireflies, stones, cotton puffs, drips are not raised).
const UNCHANGED_LINES = {
  "src/world/candyIsle.js": [
    "SphereGeometry(rnd(0.22, 0.34), 7, 6)",                     // frosting drips
    "SphereGeometry(0.17, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2)", // gumdrops
    "BoxGeometry(0.16, 0.04, 0.05)",                             // sprinkles
    "IcosahedronGeometry(rnd(0.32, 0.5), 1)",                    // cotton puffs
    "const a = rnd(0, 6.28), r = rnd(1, I4_WALK);",              // gumdrop placement
  ],
  "src/world/meadowIsle.js": [
    "ConeGeometry(0.05, rnd(0.4, 0.7), 4)",                      // tall grass tufts
    "DodecahedronGeometry(rnd(0.22, 0.4), 0)",                   // stones
    "PointsMaterial({ size: 0.22",                               // fireflies
    "PointsMaterial({ size: 0.16",                               // stars
    "const FLY_N = 40, STAR_N = 160;",
    "if (!farFrom(x, z, reservedMeadow.slice(3), 1.8)) continue;", // tuft placement
  ],
};

// Lines that define obstacles, reserved spots and walk areas. They must not change at all.
const placementLines = text => text.split("\n").filter(l => /obstacles\.push|reserved\w*\.push|reserved\w* = |I[45]_WALK|\.set\(/.test(l));

// ---- source checks ----

test("HEAD snapshot is available (git show works)", t => {
  if (!haveGit()) t.skip("git not available; source-diff checks skipped");
});

test("T07 source: only the allowed geometry detail arguments differ from the base", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) {
    const head = headText(f);
    let expected = head;
    for (const [, from, to] of ALLOWED.filter(a => a[0] === f)) {
      const n = expected.split(from).length - 1;
      assert.equal(n, 1, `${from} should occur exactly once in base ${f}, found ${n}`);
      expected = expected.replace(from, to);
    }
    assert.equal(workText(f), expected, `${f} differs from the base by more than the allowed segment arguments`);
  }
});

test("T07 source: unchanged items (drips, gumdrops, sprinkles, cotton puffs, tufts, stones, stars, fireflies) keep their lines", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) {
    const w = workText(f), h = headText(f);
    for (const line of UNCHANGED_LINES[f]) {
      assert.ok(h.includes(line), `${f}: "${line}" not found in base`);
      assert.ok(w.includes(line), `${f}: "${line}" missing from working copy`);
    }
  }
});

test("T07 source: colours and material calls are the same, in the same order", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) {
    const hexes = s => [...s.matchAll(/0x[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
    assert.deepEqual(hexes(workText(f)), hexes(headText(f)), `${f}: colour list changed`);
    const re = /MeshStandardMaterial\(\{[^}]*\}\)|MeshBasicMaterial\(\{[^}]*\}\)|PointsMaterial\(\{[^}]*\}\)|mat\([^)]*\)/g;
    assert.deepEqual([...workText(f).matchAll(re)].map(m => m[0]), [...headText(f).matchAll(re)].map(m => m[0]),
      `${f}: material calls changed`);
  }
});

test("T07 source: obstacles, reserved spots, walk areas and positions are unchanged", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) assert.deepEqual(placementLines(workText(f)), placementLines(headText(f)), `${f}: placement lines changed`);
  for (const f of ["src/world/layout.js", "src/world/lighting.js", "src/engine.js", "src/world/crystalIsle.js", "src/world/winterIsle.js"]) {
    assert.equal(workText(f), headText(f), `${f} changed; T07 must not touch it`);
  }
});

// ---- triangle counts ----
const THREE = await import(pathToFileURL(path.join(ROOT, "node_modules/three/build/three.module.js")).href);
const L = await import(pathToFileURL(path.join(ROOT, "src/world/layout.js")).href);
const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const cyl = (...a) => tri(new THREE.CylinderGeometry(...a));
const cone = (...a) => tri(new THREE.ConeGeometry(...a));
const sph = (...a) => tri(new THREE.SphereGeometry(...a));
const tor = (...a) => tri(new THREE.TorusGeometry(...a));
const ico = (...a) => tri(new THREE.IcosahedronGeometry(...a));
const dod = (...a) => tri(new THREE.DodecahedronGeometry(...a));
const box = (...a) => tri(new THREE.BoxGeometry(...a));

// Candy Island, all triangles on the island (cake, drips, lollipops, cotton trees, canes, cupcakes, donuts, gumdrops, sprinkles).
// Object counts are the loop counts in candyIsle.js (6, 26, 5, 4, 4, 4, 14, 70). Fixed, so no randomness.
function candyTotal(v) {
  const R = L.I4.r;
  return cyl(R, R, 0.5, v.cake) + cyl(R - 0.15, R - 0.15, 0.9, v.cake) + cyl(R - 0.1, R - 0.1, 0.18, v.cake) + cyl(R - 0.2, R - 2.2, 1.6, v.cake)
    + 26 * sph(0.28, 7, 6)                                                        // frosting drips, unchanged
    + 6 * (cyl(0.06, 0.06, 1.5, v.stick) + sph(0.48, ...v.ball) + tor(0.48, 0.06, ...v.band)) // lollipop trees
    + 5 * (cyl(0.07, 0.09, 1.2, v.cstick) + 5 * ico(0.4, 1))                      // cotton-candy trees, puffs unchanged
    + 4 * (cyl(0.11, 0.11, 1.6, v.cane) + tor(0.28, 0.11, ...v.hook, Math.PI))    // candy canes
    + 4 * (cyl(0.42, 0.32, 0.45, v.cup) + sph(0.46, ...v.frost) + sph(0.11, ...v.cherry)) // cupcakes
    + 4 * tor(0.32, 0.15, ...v.donut)                                             // donuts
    + 14 * sph(0.17, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2)                        // gumdrops, unchanged
    + 70 * box(0.16, 0.04, 0.05);                                                 // sprinkles, unchanged
}

// Firefly meadow, all triangles on the island (top, base, willows, mushrooms, stones, tufts).
// Fireflies and stars are THREE.Points (no triangles) and are not counted.
function meadowTotal(v, withTufts = true) {
  const R = L.I5.r;
  let n = cyl(R, R - 0.4, 0.8, v.top) + cyl(R - 0.4, R - 2.6, 3, v.top)
    + 5 * (cyl(0.16, 0.26, 1.8, v.trunk) + sph(0.95, ...v.crown) + 9 * sph(0.22, ...v.strand)) // willows
    + 12 * (cyl(0.06, 0.09, 0.45, v.stem) + sph(0.26, ...v.cap, 0, Math.PI * 2, 0, Math.PI / 2)) // mushrooms (scale s does not change counts)
    + 5 * dod(0.3, 0);                                                            // stones, unchanged
  if (withTufts) n += 30 * 3 * cone(0.05, 0.55, 4);                               // tufts, unchanged (30 x 3; the tuft loop has an empty skip list, so none are skipped)
  return n;
}

const CANDY_HEAD = { cake: 20, stick: 6, ball: [10, 8], band: [6, 18], cstick: 6, cane: 10, hook: [8, 12], cup: 10, frost: [10, 8], cherry: [8, 6], donut: [8, 16] };
const CANDY_NOW = { cake: 24, stick: 8, ball: [16, 10], band: [8, 20], cstick: 8, cane: 12, hook: [10, 14], cup: 12, frost: [12, 8], cherry: [10, 8], donut: [10, 18] };
const MEADOW_HEAD = { top: 14, trunk: 6, crown: [9, 7], strand: [6, 5], stem: 6, cap: [9, 6] };
const MEADOW_NOW = { top: 20, trunk: 8, crown: [14, 10], strand: [8, 6], stem: 8, cap: [12, 6] };

test("T07 layout radii used by the counts (from layout.js)", () => {
  assert.equal(L.I4.r, 8.5, "Candy island radius");
  assert.equal(L.I5.r, 8.5, "Meadow island radius");
});

test("T07 triangles: per-object counts after the change", () => {
  assert.equal(cyl(8.5, 8.5, 0.5, 20), 80, "Candy cake top HEAD");
  assert.equal(cyl(8.5, 8.5, 0.5, 24), 96, "Candy cake top NOW");
  // full UV sphere with w width and h height segments: 2w(h-1) triangles
  assert.equal(sph(0.48, 10, 8), 140, "lollipop ball HEAD");
  assert.equal(sph(0.48, 16, 10), 288, "lollipop ball NOW");
  assert.equal(tor(0.48, 0.06, 6, 18), 216, "lollipop band HEAD");
  assert.equal(tor(0.48, 0.06, 8, 20), 320, "lollipop band NOW");
  assert.equal(sph(0.46, 10, 8), 140, "cupcake frosting HEAD");
  assert.equal(sph(0.46, 12, 8), 168, "cupcake frosting NOW");
  assert.equal(tor(0.32, 0.15, 8, 16), 256, "donut HEAD");
  assert.equal(tor(0.32, 0.15, 10, 18), 360, "donut NOW");
  assert.equal(sph(0.17, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), 63, "gumdrop (unchanged)");
  assert.equal(box(0.16, 0.04, 0.05), 12, "sprinkle (unchanged)");
  assert.equal(sph(0.28, 7, 6), 70, "frosting drip (unchanged)");
  assert.equal(cone(0.05, 0.55, 4), 12, "tuft cone (unchanged)");
  assert.equal(dod(0.3, 0), 36, "stone (unchanged)");
  assert.equal(sph(0.95, 9, 7), 108, "willow crown HEAD");
  assert.equal(sph(0.95, 14, 10), 252, "willow crown NOW");
});

test("T07 triangles: Candy Island alone (reported)", () => {
  // The Coder's note gave Candy NOW as 15,340. That figure predates the Commander's review changes; the current file gives 14,102.
  assert.equal(candyTotal(CANDY_HEAD), 11254, "Candy HEAD total");
  assert.equal(candyTotal(CANDY_NOW), 14102, "Candy NOW total");
});

test("T07 triangles: Firefly meadow alone, tufts and stones counted (reported)", () => {
  // The Coder's note gave Meadow 4,408 -> 6,728, without stones or tufts. Current file with the same method gives:
  assert.equal(meadowTotal(MEADOW_HEAD), 5668, "Meadow HEAD total");
  assert.equal(meadowTotal(MEADOW_NOW), 8408, "Meadow NOW total");
});

test("T07 triangles: Candy + Meadow pair growth (reported; per-area band is guidance only, sanity bound 0-60%)", t => {
  const before = candyTotal(CANDY_HEAD) + meadowTotal(MEADOW_HEAD);
  const after = candyTotal(CANDY_NOW) + meadowTotal(MEADOW_NOW);
  const pct = (after / before - 1) * 100;
  t.diagnostic(`Candy + Meadow pair growth: ${before} -> ${after} = +${pct.toFixed(1)}% (tufts and stones counted)`);
  assert.equal(before, 16922, "pair HEAD total");
  assert.equal(after, 22510, "pair NOW total");
  assert.ok(pct >= 0 && pct <= 60, `pair growth ${pct.toFixed(1)}% outside the 0-60% sanity bound`);
});

// Milestone total (binding target, brief "Done when" 1; D5 clarified 2026-11-22).
// Home + bridges, Crystal + Winter and Candy + Meadow, each from the same geometry-count method as T05, T06 and this file.
// Home + bridges values are the T05 test's asserted totals (base 0c7c887 = pre-T05 code, after = T05 commit 499d635).
// Crystal + Winter values are the T06 test's asserted totals (T05 changed only homeIsland.js and bridge.js, so their pre-T05 values are the same).
// Candy + Meadow are unchanged between 0c7c887 and 6d8fc8c except for this task.
const MILESTONE_BEFORE_COUNTED = 6862 + 4474 + 16922; // 28258, pre-T05 code (0c7c887)
const MILESTONE_AFTER_COUNTED = 8774 + 5466 + 22510;  // 36750, current code
// In-scene total excluding the ocean, measured before any change (team/baseline/README.md). Other meshes (monuments, trophies, middle bridge bits) are not replayed here, so they are carried at their baseline size.
const IN_SCENE_BASE_EXCL_OCEAN = 37078;

test("T07 milestone: counted areas (home + bridges, Crystal, Winter, Candy, Meadow) vs pre-T05 base 0c7c887 (informational, not asserted)", t => {
  // The brief's metric is the whole environment excluding the ocean (team/baseline/README.md), so this partial figure is logged only.
  const pct = (MILESTONE_AFTER_COUNTED / MILESTONE_BEFORE_COUNTED - 1) * 100;
  t.diagnostic(`counted areas: ${MILESTONE_BEFORE_COUNTED} -> ${MILESTONE_AFTER_COUNTED} = +${pct.toFixed(2)}% (informational)`);
  assert.equal(MILESTONE_BEFORE_COUNTED, 28258, "counted-area base changed");
  assert.equal(MILESTONE_AFTER_COUNTED, 36750, "counted-area total changed");
});

test("T07 milestone: projected total (in-scene base excl. ocean + counted delta) is inside 44,500-48,200 (binding target)", t => {
  const delta = MILESTONE_AFTER_COUNTED - MILESTONE_BEFORE_COUNTED;
  const projected = IN_SCENE_BASE_EXCL_OCEAN + delta;
  const pct = (projected / IN_SCENE_BASE_EXCL_OCEAN - 1) * 100;
  t.diagnostic(`projected milestone total: ${IN_SCENE_BASE_EXCL_OCEAN} + ${delta} = ${projected} (+${pct.toFixed(1)}%)`);
  assert.ok(projected >= 44500 && projected <= 48200, `projected total ${projected} outside 44,500-48,200`);
});

test("T07 triangles: pair growth without tufts (reported, not gated)", () => {
  const before = candyTotal(CANDY_HEAD) + meadowTotal(MEADOW_HEAD, false);
  const after = candyTotal(CANDY_NOW) + meadowTotal(MEADOW_NOW, false);
  assert.equal(before, 15842, "pair HEAD total without tufts");
  assert.equal(after, 21430, "pair NOW total without tufts");
});
