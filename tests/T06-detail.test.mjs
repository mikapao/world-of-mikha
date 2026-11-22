// T06 checks: Crystal Isle + Winter Wonderland get more geometry detail, and nothing else changes.
// Source checks compare the working copy with git HEAD (read-only `git show`).
// Triangle counts use three.js 0.128 geometry constructors in Node (no browser, no renderer),
// same counting as T01 and T05: index.count / 3 (or position count / 3 when not indexed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Baseline commit for source checks: the state before T06 was committed (T05 commit). Update when a new task is committed.
const BASE = "499d635";
const FILES = ["src/world/crystalIsle.js", "src/world/winterIsle.js"];

const headText = f => {
  try {
    return execFileSync("git", ["show", `${BASE}:${f}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");
  } catch (e) { return null; }
};
const workText = f => readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const haveGit = () => headText(FILES[0]) !== null;

// The only edits allowed by D5 / T06 (geometry detail arguments). Each must match exactly once in HEAD.
// Crystal Isle top and base cylinders stay at 6 radial segments (hexagon), so they are NOT listed.
const ALLOWED = [
  ["src/world/crystalIsle.js", "rnd(0.7, 1), h, 5), mat(0x8a68b0)", "rnd(0.7, 1), h, 8), mat(0x8a68b0)"],
  ["src/world/winterIsle.js", "new THREE.CylinderGeometry(I3.r, I3.r - 0.4, 0.8, 12)", "new THREE.CylinderGeometry(I3.r, I3.r - 0.4, 0.8, 16)"],
  ["src/world/winterIsle.js", "new THREE.CylinderGeometry(I3.r - 0.4, I3.r - 2.8, 3, 12)", "new THREE.CylinderGeometry(I3.r - 0.4, I3.r - 2.8, 3, 16)"],
  ["src/world/winterIsle.js", "new THREE.SphereGeometry(rnd(0.4, 0.8), 8, 5)", "new THREE.SphereGeometry(rnd(0.4, 0.8), 10, 6)"],
  ["src/world/winterIsle.js", "new THREE.SphereGeometry(1.2, 10, 6, 0, Math.PI * 2", "new THREE.SphereGeometry(1.2, 14, 7, 0, Math.PI * 2"],
  ["src/world/winterIsle.js", "new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.5 * s, 5)", "new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.5 * s, 8)"],
  ["src/world/winterIsle.js", "new THREE.ConeGeometry(rr * s, 0.75 * s, 7)", "new THREE.ConeGeometry(rr * s, 0.75 * s, 8)"],
  ["src/world/winterIsle.js", "new THREE.ConeGeometry(rr * s * 0.62, 0.32 * s, 7)", "new THREE.ConeGeometry(rr * s * 0.62, 0.32 * s, 8)"],
];

// Colours that must appear, in this order, in each file (from HEAD).
// crystalCols (5), top, base, grass, spire, then the three point-light colours.
const HEX_CRYSTAL_ALL = ["0x6ff0ff", "0xff7fd0", "0xffe36b", "0xa98bff", "0x7dffb5", "0xc565d6", "0x6e4a8e", "0xe07ad6",
  "0x8a68b0", "0x6ff0ff", "0xff7fd0", "0xffe36b"];
const HEX_WINTER = ["0xe6edf4", "0xa9c8e0", "0xcfe6f7", "0xeef3f8", "0xbfe3f5", "0xf7fbff", "0xeaf3fb", "0x7f9bb5",
  "0x3f7a5a", "0x4a8a66", "0x366b50", "0x8a6a4f", "0xffffff", "0xdff4ff", "0x9fdcff", "0xffffff"]; // last: snow points colour

// Lines that define obstacles, reserved spots and walk areas. They must not change at all.
const placementLines = text => text.split("\n").filter(l => /obstacles\.push|reserved\w*\.push|reserved\w* = |I[23]_WALK|\.set\(/.test(l));

// ---- source checks ----

test("HEAD snapshot is available (git show works)", t => {
  if (!haveGit()) t.skip("git not available; source-diff checks skipped");
});

test("T06 source: only the allowed geometry detail arguments differ from HEAD", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) {
    const head = headText(f);
    let expected = head;
    for (const [, from, to] of ALLOWED.filter(a => a[0] === f)) {
      const n = expected.split(from).length - 1;
      assert.equal(n, 1, `${from} should occur exactly once in HEAD ${f}, found ${n}`);
      expected = expected.replace(from, to);
    }
    assert.equal(workText(f), expected, `${f} differs from HEAD by more than the allowed segment arguments`);
  }
});

test("T06 source: Crystal Isle top and base stay hexagons (6 radial segments, same radii and positions)", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  const w = workText("src/world/crystalIsle.js"), h = headText("src/world/crystalIsle.js");
  const lines = s => s.split("\n").filter(l => l.includes("CylinderGeometry(I2.r"));
  assert.deepEqual(lines(w), lines(h), "Crystal Isle top/base cylinder lines differ from HEAD");
  assert.ok(w.includes("new THREE.CylinderGeometry(I2.r, I2.r - 0.4, 0.8, 6), mat(0xc565d6), 0, -0.4, 0)"), "top is not a 6-sided cylinder");
  assert.ok(w.includes("new THREE.CylinderGeometry(I2.r - 0.4, I2.r - 2.6, 3, 6), mat(0x6e4a8e), 0, -2.3, 0, false)"), "base is not a 6-sided cylinder");
});

test("T06 source: colours and materials are the same, in the same order", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  const hexes = f => [...workText(f).matchAll(/0x[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
  assert.deepEqual(hexes("src/world/crystalIsle.js"), HEX_CRYSTAL_ALL);
  assert.deepEqual(hexes("src/world/winterIsle.js"), HEX_WINTER);
  for (const f of FILES) {
    const re = /MeshStandardMaterial\(\{[^}]*\}\)|MeshBasicMaterial\(\{[^}]*\}\)|PointsMaterial\(\{[^}]*\}\)|mat\([^)]*\)/g;
    assert.deepEqual([...workText(f).matchAll(re)].map(m => m[0]), [...headText(f).matchAll(re)].map(m => m[0]),
      `${f}: material calls changed`);
  }
});

test("T06 source: obstacles, reserved spots, walk areas and positions are unchanged", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  for (const f of FILES) assert.deepEqual(placementLines(workText(f)), placementLines(headText(f)), `${f}: placement lines changed`);
  for (const f of ["src/world/layout.js", "src/world/lighting.js"]) {
    assert.equal(workText(f), headText(f), `${f} changed; T06 must not touch it`);
  }
  // engine.js: the only allowed change is the T11 / D8 pixel-budget line in resize() (see ENGINE_D8 below).
  assert.equal(workText("src/engine.js"), engineWithD8(headText("src/engine.js")), "src/engine.js differs from HEAD by more than the D8 pixel-ratio line");
});

// T11 / D8: the one line allowed in src/engine.js. The anchor must match exactly once in the base commit.
const ENGINE_D8_FROM = "  cam.updateProjectionMatrix();\n  renderer.setSize(innerWidth, innerHeight);";
const ENGINE_D8_TO = "  cam.updateProjectionMatrix();\n  renderer.setPixelRatio(Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2500000 / (innerWidth * innerHeight)))));\n  renderer.setSize(innerWidth, innerHeight);";
const engineWithD8 = head => {
  const n = head.split(ENGINE_D8_FROM).length - 1;
  assert.equal(n, 1, `engine.js resize() anchor should occur once in base, found ${n}`);
  return head.replace(ENGINE_D8_FROM, ENGINE_D8_TO);
};

test("T06 source: snow points, glints, crystals and motes are not raised", t => {
  if (!haveGit()) { t.skip("git not available"); return; }
  const w = workText("src/world/winterIsle.js"), c = workText("src/world/crystalIsle.js");
  assert.ok(w.includes("const SNOW_N = 420, SNOW_H = 9;"), "snow count changed");
  assert.ok(w.includes("new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14"), "snow points changed");
  assert.ok(w.includes("new THREE.OctahedronGeometry(0.12, 0)"), "winter glints changed");
  assert.ok(c.includes("new THREE.OctahedronGeometry(0.3, 0)"), "crystal clusters changed");
  assert.ok(c.includes("new THREE.SphereGeometry(0.05, 5, 4)"), "crystal motes changed");
  assert.ok(c.includes("new THREE.CircleGeometry(rnd(0.5, 1.1), 6)"), "magenta grass patches changed");
  assert.ok(w.includes("new THREE.CircleGeometry(1.6, 14)"), "frozen pond changed");
});

// ---- triangle counts ----
const THREE = await import(pathToFileURL(path.join(ROOT, "node_modules/three/build/three.module.js")).href);
const L = await import(pathToFileURL(path.join(ROOT, "src/world/layout.js")).href);
const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
const cyl = (...a) => tri(new THREE.CylinderGeometry(...a));
const cone = (...a) => tri(new THREE.ConeGeometry(...a));
const oct = (...a) => tri(new THREE.OctahedronGeometry(...a));
const dod = (...a) => tri(new THREE.DodecahedronGeometry(...a));
const sph = (...a) => tri(new THREE.SphereGeometry(...a));
const circ = (...a) => tri(new THREE.CircleGeometry(...a));
const box = (...a) => tri(new THREE.BoxGeometry(...a));

// Counts that depend on layout.js, replayed exactly as the island builders loop (no randomness in the skip test).
const SPIRES_N = (() => {
  let n = 0;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * 6.28 + 0.3, r = L.I2.r - 0.7, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x + L.BR.ux * L.I2.r, z + L.BR.uz * L.I2.r) < 3) continue;
    n++;
  }
  return n;
})();
const RIM_N = (() => {
  const entry = { x: -L.BR3.ux * L.I3.r, z: -L.BR3.uz * L.I3.r };
  let n = 0;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.28 + 0.2, x = Math.cos(a) * (L.I3.r - 0.15), z = Math.sin(a) * (L.I3.r - 0.15);
    if (Math.hypot(x - entry.x, z - entry.z) < 2.6) continue;
    n++;
  }
  return n;
})();

// Crystal Isle, all triangles on the island (magenta grass, top, base, spires, crystals, motes).
function crystalTotal(v) {
  return cyl(8, 7.6, 0.8, v.top) + cyl(7.6, 5.4, 3, v.top)
    + SPIRES_N * cyl(0.5, 0.85, 1.5, v.spire)
    + 33 * oct(0.3, 0)                 // 11 clusters x 3 octahedra, unchanged
    + 20 * sph(0.05, 5, 4)             // motes, unchanged
    + 10 * circ(0.8, 6);               // magenta grass patches, unchanged
}
// Winter Wonderland, all triangles on the island (top, base, rim, drifts, pond, igloo, pines, glints).
// Falling snow is THREE.Points (no triangles) and is not counted.
function winterTotal(v) {
  return cyl(9, 8.6, 0.8, v.top) + cyl(8.6, 6.2, 3, v.top)
    + RIM_N * dod(0.42, 0)             // icy rim chunks, unchanged
    + 12 * sph(0.6, v.drift[0], v.drift[1])
    + circ(1.6, 14)                    // pond
    + sph(1.2, v.dome[0], v.dome[1], 0, Math.PI * 2, 0, Math.PI / 2)
    + box(0.85, 0.7, 0.6) + circ(0.3, 10)
    + 12 * (cyl(0.1, 0.14, 0.5, v.trunk) + 6 * cone(0.8, 1, v.cone))
    + 14 * oct(0.12, 0);               // glints, unchanged
}

const CRYSTAL_HEAD = { top: 6, spire: 5 }, CRYSTAL_NOW = { top: 6, spire: 8 };
const WINTER_HEAD = { top: 12, drift: [8, 5], dome: [10, 6], cone: 7, trunk: 5 }, WINTER_NOW = { top: 16, drift: [10, 6], dome: [14, 7], cone: 8, trunk: 8 };

test("T06 triangles: per-object counts after the change", () => {
  assert.equal(cyl(8, 7.6, 0.8, 6), 24, "Crystal top (hexagon)");
  assert.equal(cyl(7.6, 5.4, 3, 6), 24, "Crystal base (hexagon)");
  assert.equal(cyl(0.5, 0.85, 1.5, 5), 20, "Crystal spire HEAD");
  assert.equal(cyl(0.5, 0.85, 1.5, 8), 32, "Crystal spire NOW");
  assert.equal(cyl(9, 8.6, 0.8, 12), 48, "Winter top HEAD");
  assert.equal(cyl(9, 8.6, 0.8, 16), 64, "Winter top NOW");
  assert.equal(sph(0.6, 8, 5), 64, "drift HEAD");
  assert.equal(sph(0.6, 10, 6), 100, "drift NOW");
  assert.equal(sph(1.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 110, "igloo dome HEAD");
  assert.equal(sph(1.2, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), 182, "igloo dome NOW");
  assert.equal(cone(0.8, 1, 7), 21, "pine cone HEAD");
  assert.equal(cone(0.8, 1, 8), 24, "pine cone NOW");
  assert.equal(cyl(0.1, 0.14, 0.5, 5), 20, "pine trunk HEAD");
  assert.equal(cyl(0.1, 0.14, 0.5, 8), 32, "pine trunk NOW");
  assert.equal(oct(0.3, 0), 8);
  assert.equal(sph(0.05, 5, 4), 30, "mote");
  assert.equal(dod(0.42, 0), 36, "rim rock");
});

test("T06 layout counts: 8 spires, 13 rim chunks (replayed from layout.js)", () => {
  assert.equal(SPIRES_N, 8);
  assert.equal(RIM_N, 13);
});

test("T06 triangles: Crystal Isle alone (reported, not gated)", () => {
  const before = crystalTotal(CRYSTAL_HEAD), after = crystalTotal(CRYSTAL_NOW);
  assert.equal(before, 1132, "Crystal HEAD total");
  assert.equal(after, 1228, "Crystal NOW total");
});

test("T06 triangles: Winter Wonderland alone (reported, not gated)", () => {
  const before = winterTotal(WINTER_HEAD), after = winterTotal(WINTER_NOW);
  assert.equal(before, 3342, "Winter HEAD total");
  assert.equal(after, 4238, "Winter NOW total");
});

test("T06 triangles: Crystal + Winter combined grows by 20-30% (target from D5)", () => {
  const before = crystalTotal(CRYSTAL_HEAD) + winterTotal(WINTER_HEAD);
  const after = crystalTotal(CRYSTAL_NOW) + winterTotal(WINTER_NOW);
  const pct = (after / before - 1) * 100;
  assert.equal(before, 4474, "combined HEAD total");
  assert.equal(after, 5466, "combined NOW total");
  assert.ok(pct >= 20 && pct <= 30, `combined growth ${pct.toFixed(1)}% outside 20-30%`);
});

test("T06 triangles: combined growth without motes (reported, not gated)", () => {
  // Motes are unchanged by design; this shows how much the percentage depends on counting them.
  const motes = 20 * sph(0.05, 5, 4);
  const before = crystalTotal(CRYSTAL_HEAD) + winterTotal(WINTER_HEAD) - motes;
  const after = crystalTotal(CRYSTAL_NOW) + winterTotal(WINTER_NOW) - motes;
  assert.equal(before, 3874);
  assert.equal(after, 4866);
});
