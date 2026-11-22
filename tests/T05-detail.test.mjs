// T05 checks: home island + bridges get more geometry detail, and nothing else changes.
// Source checks compare the working copy with git HEAD (read-only `git show`).
// Triangle counts use three.js 0.128 geometry constructors in Node (no browser, no renderer).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Baseline commit for source checks: the state before T05 was committed. Update when a new task is committed.
const BASE = "0c7c887";
const FILES = ["src/world/homeIsland.js", "src/world/bridge.js"];

const headText = f => {
  try {
    return execFileSync("git", ["show", `${BASE}:${f}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
  } catch (e) { return null; }
};
const workText = f => readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

// The only edits allowed by D5 / T05 (geometry detail arguments). Each must match exactly once in HEAD.
const ALLOWED = [
  ["src/world/homeIsland.js", "new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.6, 0.8, 10)", "new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.6, 0.8, 14)"],
  ["src/world/homeIsland.js", "new THREE.CylinderGeometry(ISLAND_R - 0.6, ISLAND_R - 3, 2.2, 10)", "new THREE.CylinderGeometry(ISLAND_R - 0.6, ISLAND_R - 3, 2.2, 14)"],
  ["src/world/homeIsland.js", "new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 1 * s, 6)", "new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 1 * s, 8)"],
  ["src/world/homeIsland.js", "new THREE.IcosahedronGeometry(0.85 * s, 0)", "new THREE.IcosahedronGeometry(0.85 * s, 1)"],
  ["src/world/bridge.js", "new THREE.SphereGeometry(0.13, 8, 6)", "new THREE.SphereGeometry(0.13, 10, 6)"],
];

// Colours and materials that must appear, in this order, in each file (from HEAD).
const HEX_HOME = ["0xa8dc8c", "0xd9b48c", "0x8fd19e", "0x79c48b", "0xf5b8cf", "0xb9a7ec", "0x9fd8c8", "0xb08a68",
  "0xffffff", "0xf7a8c0", "0xffe08a", "0xc7b5f5", "0xc9cfd6", "0xffffff"];
const HEX_BRIDGE = ["0xc89a6c", "0x9c7350", "0xffe9a8", "0xffc860"];

test("HEAD snapshot is available (git show works)", t => {
  if (headText("src/world/homeIsland.js") === null) t.skip("git not available; source-diff checks skipped");
});

test("T05 source: only the allowed geometry detail arguments differ from HEAD", t => {
  for (const f of FILES) {
    const head = headText(f);
    if (head === null) { t.skip("git not available"); return; }
    let expected = head;
    for (const [file, from, to] of ALLOWED.filter(a => a[0] === f)) {
      const n = expected.split(from).length - 1;
      assert.equal(n, 1, `${from} should occur exactly once in HEAD ${f}, found ${n}`);
      expected = expected.replace(from, to);
    }
    assert.equal(workText(f), expected, `${f} differs from HEAD by more than the allowed segment arguments`);
  }
});

test("T05 source: colours and materials are the same, in the same order", t => {
  if (headText("src/world/homeIsland.js") === null) { t.skip("git not available"); return; }
  const hexes = f => [...workText(f).matchAll(/0x[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
  assert.deepEqual(hexes("src/world/homeIsland.js"), HEX_HOME);
  assert.deepEqual(hexes("src/world/bridge.js"), HEX_BRIDGE);
  for (const f of FILES) {
    const head = headText(f);
    assert.deepEqual(
      [...workText(f).matchAll(/MeshStandardMaterial\(\{[^}]*\}\)|mat\([^)]*\)/g)].map(m => m[0]),
      [...head.matchAll(/MeshStandardMaterial\(\{[^}]*\}\)|mat\([^)]*\)/g)].map(m => m[0]),
      `${f}: material calls changed`);
  }
});

test("T05 source: small items and bridge posts are not raised", t => {
  if (headText("src/world/homeIsland.js") === null) { t.skip("git not available"); return; }
  const w = workText("src/world/homeIsland.js"), b = workText("src/world/bridge.js");
  assert.ok(w.includes("new THREE.SphereGeometry(0.12, 5, 4)"), "flowers changed");
  assert.ok(w.includes("new THREE.DodecahedronGeometry(rnd(0.25, 0.45), 0)"), "pebbles changed");
  assert.ok(w.includes("new THREE.IcosahedronGeometry(rnd(0.7, 1.1), 0)"), "cloud blobs changed");
  assert.ok(b.includes("new THREE.BoxGeometry(0.14, 0.7, 0.14)"), "bridge posts are not plain boxes");
});

// ---- triangle counts (geometry constructors, same counting as T01: index.count / 3) ----
const THREE = await import("file:///" + path.join(ROOT, "node_modules/three/build/three.module.js").replace(/\\/g, "/"));
const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const cyl = (...a) => tri(new THREE.CylinderGeometry(...a));
const ico = (...a) => tri(new THREE.IcosahedronGeometry(...a));
const sph = (...a) => tri(new THREE.SphereGeometry(...a));
const box = (...a) => tri(new THREE.BoxGeometry(...a));
const dod = (...a) => tri(new THREE.DodecahedronGeometry(...a));

// Object counts: 20 trees, 45 flowers, 6 pebble max (only if placed), 5 clouds x 3 blobs (layout-independent),
// bridges from layout.js: 71 planks, 50 posts, 42 rails, 26 lanterns (counted by replaying bridge.js loop).
function homeTotal(v) {
  return cyl(11, 10.4, 0.8, v.island) + cyl(10.4, 8, 2.2, v.island)
    + 20 * (cyl(0.13, 0.2, 1, v.trunk) + ico(0.85, v.leaf))
    + 45 * sph(0.12, 5, 4) + 15 * ico(1, 0);
}
const HEAD_HOME = { island: 10, trunk: 6, leaf: 0 }, NOW_HOME = { island: 14, trunk: 8, leaf: 1 };
const PEBBLES_MAX = 6 * dod(0.45, 0); // unchanged by T05, counted at the maximum so totals are an upper bound
function bridgeTotal(lanternSeg) {
  return 71 * box(2.3, 0.14, 0.46) + 50 * box(0.14, 0.7, 0.14) + 42 * box(0.08, 0.08, 1)
    + 26 * sph(0.13, ...lanternSeg);
}

test("T05 triangles: per-object counts after the change", () => {
  assert.equal(cyl(11, 10.4, 0.8, 14), 56);
  assert.equal(cyl(10.4, 8, 2.2, 14), 56);
  assert.equal(cyl(0.13, 0.2, 1, 8), 32);
  assert.equal(ico(0.85, 1), 80);
  assert.equal(sph(0.13, 10, 6), 100);
  assert.equal(box(0.14, 0.7, 0.14), 12);
});

test("T05 triangles: home island + bridges grow by 20-30% (rocks at maximum on both sides)", () => {
  const before = homeTotal(HEAD_HOME) + PEBBLES_MAX + bridgeTotal([8, 6]);
  const after = homeTotal(NOW_HOME) + PEBBLES_MAX + bridgeTotal([10, 6]);
  const pct = (after / before - 1) * 100;
  assert.equal(before, 2826 + 4036, "HEAD total differs from the T05 notes");
  assert.equal(after, 4218 + 4556, "current total differs from the expected count");
  assert.ok(pct >= 20 && pct <= 30, `growth ${pct.toFixed(1)}% outside 20-30%`);
});

test("T05 triangles: home island alone and bridges alone (reported, not gated)", () => {
  const homeBefore = homeTotal(HEAD_HOME), homeAfter = homeTotal(NOW_HOME);
  const brBefore = bridgeTotal([8, 6]), brAfter = bridgeTotal([10, 6]);
  assert.equal(homeBefore, 2610);
  assert.equal(homeAfter, 4002);
  assert.equal(brBefore, 4036);
  assert.equal(brAfter, 4556);
});
