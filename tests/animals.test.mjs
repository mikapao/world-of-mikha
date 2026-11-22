// T08 checks: land animals (src/world/animals.js) and the two call sites in src/main.js.
// Source checks read the real text (comments removed). Runtime checks load the REAL animals.js and the
// five real island builders in Node, with two stubs: src/engine.js (no WebGL renderer; scene.add records
// objects, mesh()/mat() make plain three.js objects) and src/world/lighting.js (fixed values). Monuments are
// not built (they pull in UI code); their rings and obstacles are added from the constants in their source
// files, and each constant is checked against the source text. Every module is loaded as a data: URL with its
// imports rewritten, so each run gets fresh module state. Math.random is seeded per run.
// Keep-out thresholds below are written from the task and D6, not copied from animals.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const ANIM = path.join(SRC, "world", "animals.js");
const MAIN = path.join(SRC, "main.js");
const THREE_FILE = path.join(ROOT, "node_modules", "three", "build", "three.module.js");
const THREE_URL = pathToFileURL(THREE_FILE).href;

const text = f => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const code = s => s.replace(/\/\/[^\n]*/g, "");          // comments removed for code checks
const enc = s => "data:text/javascript," + encodeURIComponent(s);
const THREE = await import(THREE_URL);
// candyIsle.js makes its stripe texture on a canvas. Node has no DOM, so a no-op canvas stands in (no pixels are checked).
const noop2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => noop2d }) };

// ---------------------------------------------------------------- fixed inputs (from the source, checked below)
const ISLAND_R = 11;
const CENTRES = { home: [0, 0], crystal: [4, -27], winter: [-21, 15], candy: [20, 12], meadow: [2, 24] };
const WALK = { home: ISLAND_R - 0.9, crystal: 8 - 1.5, winter: 9 - 1.3, candy: 8.5 - 1.3, meadow: 8.5 - 1.3 };
// monuments: ring centre (m.ring) and the obstacle each one pushes in its own file
const MONS = [
  { name: "countingWaterfall", ring: { x: 3.5, z: -1.5 }, obst: { x: 5, z: -4, r: 1.7 } },
  { name: "singingStone", ring: { x: 4.2, z: -25.8 }, obst: { x: 4.6, z: -29.4, r: 2.2 } },
  { name: "snowman", ring: { x: -19.6, z: 15.9 }, obst: { x: -22, z: 13.5, r: 1.4 } },
  { name: "lollipop", ring: { x: 21.3, z: 13.1 }, obst: { x: 19, z: 10.8, r: 1.3 } },
  { name: "fireflyPond", ring: { x: 3.6, z: 25.2 }, obst: { x: 1, z: 22.6, r: 2.15 } },
];
const MON_SOURCE_LINES = {
  "countingWaterfall.js": ["const POS = { x: 5, z: -4 };", "const RING = { x: POS.x - 1.5, z: POS.z + 2.5 };", "obstacles.push({ x: POS.x, z: POS.z, r: 1.7 });"],
  "singingStone.js": ["const S = { x: 0.6, z: -2.4 };", "const R = { x: S.x - 0.4, z: S.z + 3.6 };", "obstacles.push({ x: I2.x + S.x, z: I2.z + S.z, r: 2.2 });"],
  "snowman.js": ["const S = { x: -1, z: -1.5 };", "const R = { x: S.x + 2.4, z: S.z + 2.4 };", "obstacles.push({ x: I3.x + S.x, z: I3.z + S.z, r: 1.4 });"],
  "lollipop.js": ["const L = { x: -1, z: -1.2 };", "const R = { x: L.x + 2.3, z: L.z + 2.3 };", "obstacles.push({ x: I4.x + L.x, z: I4.z + L.z, r: 1.3 });"],
  "fireflyPond.js": ["const P = { x: -1, z: -1.4 };", "const R = { x: P.x + 2.6, z: P.z + 2.6 };", "obstacles.push({ x: I5.x + P.x, z: I5.z + P.z, r: 2.15 });"],
};
const SPECIES = {
  bunny: [0xfbf3ea, 0xd9c2a3], butterfly: [0x6b4f5a], bird: [0x9bb8e8, 0xc9a8e8],
  penguin: [0x4a5a73], duckling: [0xffe27a], ladybug: [0xe8584f], frog: [0x7fcf8a],
};
// D6 roster: island -> species -> count
const D6 = {
  home: { bunny: 2, butterfly: 1 }, crystal: { bird: 2 }, winter: { penguin: 2 },
  candy: { duckling: 1, ladybug: 2 }, meadow: { frog: 2 },
};

// ---------------------------------------------------------------- stubs and loader
const ENGINE_SRC = `
import * as THREE from ${JSON.stringify(THREE_URL)};
export const scene = { children: [], add(o) { this.children.push(o); } };
export const mat = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, side: o.side || THREE.FrontSide });
export function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; return o; }
export const rnd = (a, b) => a + Math.random() * (b - a);
export const farFrom = (x, z, list, d) => list.every(p => Math.hypot(p.x - x, p.z - z) > d);
`;
const LIGHT_SRC = `
export const winterAmount = () => 0; export const nightAmount = () => 0; export const duskAmount = () => 0;
export const sunHeight = () => 1; export function updateLighting() {}
`;

let runNo = 0;
// Rewrites the imports of one src file to data: URLs (memoised per world, so modules are shared inside a world).
function load(abs, g) {
  if (g.memo.has(abs)) return g.memo.get(abs);
  const src = text(abs).replace(/from\s+"([^"]+)"/g, (m, spec) => {
    if (spec === "three") return `from ${JSON.stringify(THREE_URL)}`;
    if (/(^|\/)engine\.js$/.test(spec)) return `from ${JSON.stringify(g.engine)}`;
    if (/(^|\/)lighting\.js$/.test(spec)) return `from ${JSON.stringify(g.lighting)}`;
    return `from ${JSON.stringify(load(path.resolve(path.dirname(abs), spec), g))}`;
  });
  const url = enc(g.marker + src);
  g.memo.set(abs, url);
  return url;
}

// A fresh world: stubs, layout, the five island builders and animals.js. Monument rings/obstacles are added first,
// as main.js does (monuments are created before the islands). Math.random must be seeded by the caller.
async function makeWorld() {
  const run = ++runNo;
  const g = { memo: new Map(), marker: `//run ${run}\n` };
  g.engine = enc(g.marker + ENGINE_SRC);
  g.lighting = enc(g.marker + LIGHT_SRC);
  const layout = await import(load(path.join(SRC, "world", "layout.js"), g));
  await import(g.engine);
  const animals = await import(load(ANIM, g));
  const islandFiles = ["homeIsland.js", "crystalIsle.js", "winterIsle.js", "candyIsle.js", "meadowIsle.js"];
  const islands = [];
  for (const f of islandFiles) islands.push(await import(load(path.join(SRC, "world", f), g)));
  const engine = await import(g.engine);
  for (const m of MONS) layout.obstacles.push(m.obst);
  islands[0].buildHomeIsland(); islands[1].buildCrystalIsle(); islands[2].buildWinterIsle();
  islands[3].buildCandyIsle(); islands[4].buildMeadowIsle();
  const before = engine.scene.children.length;
  animals.buildAnimals(MONS.map(m => ({ ring: m.ring })));
  const groups = engine.scene.children.slice(before);
  return { layout, animals, groups };
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Runs fn with a seeded Math.random, then restores it.
async function seeded(seed, fn) {
  const real = Math.random; Math.random = mulberry32(seed);
  try { return await fn(); } finally { Math.random = real; }
}

// Keep-out rules, written from the task and D6 (thresholds independent of animals.js).
function islandOf(x, z) {
  let best = null, bd = Infinity;
  for (const [k, [cx, cz]] of Object.entries(CENTRES)) { const d = Math.hypot(x - cx, z - cz); if (d < bd) { bd = d; best = k; } }
  return best;
}
function rulesFor(layout) {
  const ends = [];
  for (const b of layout.BRIDGES) for (const s of [b.a, b.b]) ends.push({ x: b.ox + b.ux * s, z: b.oz + b.uz * s });
  return { ends, rings: MONS.map(m => m.ring), obstacles: layout.obstacles };
}
// returns the list of rules broken at (x, z) on island isl, plus the clearances measured
function check(layout, rules, x, z, isl) {
  const bad = [];
  const cx = CENTRES[isl][0], cz = CENTRES[isl][1];
  const walkMargin = (WALK[isl] - 1.0) - Math.hypot(x - cx, z - cz);
  if (walkMargin < 0) bad.push("walk circle");
  if (!layout.walkable(x, z)) bad.push("not walkable");
  let obsClear = Infinity;
  for (const o of rules.obstacles) { const c = Math.hypot(x - o.x, z - o.z) - o.r; obsClear = Math.min(obsClear, c); if (c < 0.6) bad.push("obstacle"); }
  let ringD = Infinity;
  for (const r of rules.rings) { const d = Math.hypot(x - r.x, z - r.z); ringD = Math.min(ringD, d); if (d < 2.8) bad.push("ring"); }
  let endD = Infinity;
  for (const e of rules.ends) { const d = Math.hypot(x - e.x, z - e.z); endD = Math.min(endD, d); if (d < 2.0) bad.push("bridge end"); }
  return { bad, walkMargin, obsClear, ringD, endD };
}
function speciesOf(g) {
  const cols = new Set();
  g.traverse(o => { if (o.isMesh && o.material && o.material.color) cols.add(o.material.color.getHex()); });
  const hits = Object.keys(SPECIES).filter(k => SPECIES[k].some(c => cols.has(c)));
  return hits.length === 1 ? hits[0] : "unknown(" + hits.join("+") + ")";
}
function triCount(g) {   // same method as animals.js triCount(): index.count / 3 (or position count / 3)
  let n = 0;
  g.traverse(o => { if (o.isMesh) { const ge = o.geometry; n += (ge.index ? ge.index.count : ge.attributes.position.count) / 3; } });
  return n;
}
const countBy = arr => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});

// ---------------------------------------------------------------- source checks
test("source: roster is D6 (12 animals: home 2 bunnies + butterfly, crystal 2 birds, winter 2 penguins, candy duckling + 2 ladybugs, meadow 2 frogs)", () => {
  const rows = [...code(text(ANIM)).matchAll(/\{ isl: "(\w+)", make: (?:\(\) => )?(\w+)/g)].map(m => [m[1], m[2]]);
  assert.equal(rows.length, 12, "ROSTER rows");
  const tally = {};
  for (const [isl, mk] of rows) { tally[isl] = tally[isl] || {}; tally[isl][mk] = (tally[isl][mk] || 0) + 1; }
  assert.deepEqual(tally, {
    home: { bunny: 2, butterfly: 1 }, crystal: { bird: 2 }, winter: { penguin: 2 },
    candy: { duckling: 1, ladybug: 2 }, meadow: { frog: 2 },
  });
});

test("source: no sound (no audio imports, no SFX/speech calls) and no collision with the avatar", () => {
  const s = code(text(ANIM));
  assert.doesNotMatch(s, /from\s+"[^"]*(sound|speech|music|voice)[^"]*"/, "audio module import");
  assert.doesNotMatch(s, /\b(ping|squeak|whoosh|speak|AudioContext|new Audio|playSound)\b/, "sound call");
  assert.doesNotMatch(s, /obstacles\.push/, "animals must not add obstacles (player collision)");
  assert.doesNotMatch(s, /from\s+"[^"]*player\.js"/, "no player import");
});

test("source: culling at 22 units from the camera target, and main.js passes camTarget", () => {
  const s = code(text(ANIM));
  assert.match(s, /const CULL = 22;/);
  assert.match(s, /Math\.hypot\(a\.x - cam\.x, a\.z - cam\.z\) > CULL\) continue;/);
  assert.match(text(MAIN), /updateAnimals\(t, dt, camTarget\);/);
});

test("source: keep-out rules are in spotOk, and every start spot, target and step goes through it", () => {
  const s = code(text(ANIM));
  assert.match(s, /Math\.hypot\(x - i\.x, z - i\.z\) > i\.w - 1\.0\) return false;/, "walk circle minus 1.0");
  assert.match(s, /if \(!walkable\(x, z\)\) return false;/, "walkable()");
  assert.match(s, /for \(const o of obstacles\) if \(Math\.hypot\(x - o\.x, z - o\.z\) < 0\.6 \+ o\.r\) return false;/, "obstacles 0.6 + r");
  assert.match(s, /for \(const r of rings\) if \(Math\.hypot\(x - r\.x, z - r\.z\) < 2\.8\) return false;/, "rings 2.8");
  assert.match(s, /for \(const e of ends\) if \(Math\.hypot\(x - e\.x, z - e\.z\) < 2\.0\) return false;/, "bridge ends 2.0");
  assert.match(s, /const start = pickSpot\(a\)/, "start spot");
  assert.match(s, /if \(s\) \{ a\.tx = s\.x; a\.tz = s\.z;/, "targets come only from pickSpot");
  assert.match(s, /if \(!spotOk\(a, nx, nz\)\)/, "every step is checked");
  assert.match(s, /if \(spotOk\(a, x, z\)\) return \{ x, z \};/, "pickSpot returns only checked spots");
});

test("source: bridge ends are built from both ends of every bridge (a and b)", () => {
  const s = code(text(ANIM));
  assert.match(s, /for \(const b of BRIDGES\) for \(const s of \[b\.a, b\.b\]\) ends\.push\(\{ x: b\.ox \+ b\.ux \* s, z: b\.oz \+ b\.uz \* s \}\);/);
});

test("source: monument constants used by the runtime harness are the ones in the monument files", () => {
  for (const [file, lines] of Object.entries(MON_SOURCE_LINES)) {
    const src = text(path.join(SRC, "monuments", file));
    for (const l of lines) assert.ok(src.includes(l), `${file} lacks: ${l}`);
  }
});

test("source: no sound-like or asset loads in animals.js (designs are built from primitives)", () => {
  const s = code(text(ANIM));
  assert.doesNotMatch(s, /\.glb|\.png|\.jpg|\.mp3|TextureLoader|GLTFLoader|fetch\(/);
  assert.match(s, /from "\.\.\/engine\.js"/);
});

test("source: main.js has the two T08 call sites in the right order", () => {
  const m = text(MAIN);
  const iMeadow = m.indexOf("buildMeadowIsle();"), iBuild = m.indexOf("buildAnimals(monuments);");
  assert.ok(iMeadow > 0 && iBuild > iMeadow, "buildAnimals(monuments) after buildMeadowIsle()");
  assert.equal(m.split("buildAnimals(monuments);").length - 1, 1, "one buildAnimals call");
  const iUpd = m.indexOf("updateMeadowIsle(t, dt);"), iAn = m.indexOf("updateAnimals(t, dt, camTarget);");
  assert.ok(iUpd > 0 && iAn > iUpd, "updateAnimals after updateMeadowIsle");
  assert.match(m, /import \{ buildAnimals, updateAnimals \} from "\.\/world\/animals\.js";/);
});

test("source: no top-level await in animals.js or main.js", () => {
  for (const file of [ANIM, MAIN]) {
    const lines = text(file).split("\n");
    let depth = 0, header = "";
    lines.forEach((line, i) => {
      const c = line.replace(/\/\/.*$/, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g, '""');
      if (/\bawait\b/.test(c)) assert.ok(depth > 0 && /\basync\b/.test(header), `${path.basename(file)} line ${i + 1}: await outside an async function`);
      if (depth === 0 && /\{/.test(c)) header = line;
      depth += (c.match(/\{/g) || []).length - (c.match(/\}/g) || []).length;
    });
  }
});

// ---------------------------------------------------------------- runtime checks (real animals.js, Node, no WebGL)
test("runtime: built roster per island matches D6 (12 animals, each species counted by its colours)", async () => {
  const w = await seeded(1, () => makeWorld());
  const byIsl = {};
  for (const g of w.groups) { const k = islandOf(g.position.x, g.position.z); (byIsl[k] = byIsl[k] || []).push(speciesOf(g)); }
  assert.equal(w.groups.length, 12, "animals placed");
  for (const k of Object.keys(D6)) assert.deepEqual(countBy(byIsl[k]), D6[k], `island ${k}`);
});

test("runtime: every animal has at most 300 triangles (seeds 1-3, all placed animals)", async () => {
  const maxBy = {};
  for (const seed of [1, 2, 3]) {
    const w = await seeded(seed, () => makeWorld());
    for (const g of w.groups) {
      const sp = speciesOf(g), n = triCount(g);
      maxBy[sp] = Math.max(maxBy[sp] || 0, n);
      assert.ok(n <= 300, `${sp} has ${n} triangles`);
      assert.ok(n > 0, `${sp} has no triangles`);
    }
  }
  console.log("  max triangles by species:", JSON.stringify(maxBy));
});

test("runtime: start spot of every animal passes every keep-out rule (seeds 1-4)", async () => {
  for (const seed of [1, 2, 3, 4]) {
    const w = await seeded(seed, () => makeWorld());
    const rules = rulesFor(w.layout);
    for (const g of w.groups) {
      const r = check(w.layout, rules, g.position.x, g.position.z, islandOf(g.position.x, g.position.z));
      assert.deepEqual(r.bad, [], `seed ${seed} start (${g.position.x.toFixed(2)}, ${g.position.z.toFixed(2)})`);
    }
  }
});

test("negative control: the keep-out checker flags known bad spots (ring, obstacle, sea, bridge end)", async () => {
  const w = await seeded(1, () => makeWorld());
  const rules = rulesFor(w.layout);
  const ringHit = check(w.layout, rules, MONS[0].ring.x, MONS[0].ring.z, "home").bad;
  const obsHit = check(w.layout, rules, MONS[0].obst.x, MONS[0].obst.z, "home").bad;
  const seaHit = check(w.layout, rules, 0, -40, "home").bad;
  const endHit = check(w.layout, rules, rules.ends[0].x, rules.ends[0].z, "home").bad;
  assert.ok(ringHit.includes("ring"), "ring centre not flagged");
  assert.ok(obsHit.includes("obstacle"), "obstacle centre not flagged");
  assert.ok(seaHit.includes("walk circle") && seaHit.includes("not walkable"), "open sea not flagged");
  assert.ok(endHit.includes("bridge end"), "bridge end not flagged");
});

// Runs the 5 island cameras (60 s each) for each seed. Every animal sample is checked on every frame.
async function sweep(seed, dt, frames) {
  const w = await seeded(seed, () => makeWorld());
  const rules = rulesFor(w.layout);
  const stats = { samples: 0, bad: {}, minRing: Infinity, minEnd: Infinity, minObs: Infinity, minWalk: Infinity, culledMoved: 0, moves: 0, islandMoved: {} };
  await seeded(seed + 100, async () => {
    for (const isl of Object.keys(CENTRES)) {
      const cam = { x: CENTRES[isl][0], y: 0, z: CENTRES[isl][1] };
      const own = w.groups.map(g => islandOf(g.position.x, g.position.z) === isl);
      const moved = w.groups.map(() => false);
      for (let f = 0; f < frames; f++) {
        const before = w.groups.map(g => [g.position.x, g.position.z, g.rotation.y]);
        w.animals.updateAnimals(f * dt, dt, cam);
        w.groups.forEach((g, i) => {
          const [bx, bz, br] = before[i];
          const changed = g.position.x !== bx || g.position.z !== bz || g.rotation.y !== br;
          if (changed) { stats.moves++; moved[i] = true; }
          if (Math.hypot(bx - cam.x, bz - cam.z) > 22 && changed) stats.culledMoved++;
          const r = check(w.layout, rules, g.position.x, g.position.z, islandOf(g.position.x, g.position.z));
          stats.samples++;
          for (const b of r.bad) stats.bad[b] = (stats.bad[b] || 0) + 1;
          stats.minRing = Math.min(stats.minRing, r.ringD);
          stats.minEnd = Math.min(stats.minEnd, r.endD);
          stats.minObs = Math.min(stats.minObs, r.obsClear);
          stats.minWalk = Math.min(stats.minWalk, r.walkMargin);
        });
      }
      w.groups.forEach((g, i) => { if (own[i]) stats.islandMoved[`${seed}:${isl}:${i}`] = moved[i]; });
    }
  });
  return stats;
}

test("runtime: 0 keep-out breaks on every frame, every animal, 5 island cameras (seeds 1-3, dt 1/60, 60 s each)", async () => {
  const totals = { samples: 0, bad: {}, minRing: Infinity, minEnd: Infinity, minObs: Infinity, minWalk: Infinity, moves: 0 };
  for (const seed of [1, 2, 3]) {
    const s = await sweep(seed, 1 / 60, 3600);
    totals.samples += s.samples; totals.moves += s.moves;
    for (const [k, v] of Object.entries(s.bad)) totals.bad[k] = (totals.bad[k] || 0) + v;
    totals.minRing = Math.min(totals.minRing, s.minRing); totals.minEnd = Math.min(totals.minEnd, s.minEnd);
    totals.minObs = Math.min(totals.minObs, s.minObs); totals.minWalk = Math.min(totals.minWalk, s.minWalk);
  }
  console.log(`  samples ${totals.samples}, position changes ${totals.moves}, min ring dist ${totals.minRing.toFixed(2)}, min bridge-end dist ${totals.minEnd.toFixed(2)}, min obstacle clearance ${totals.minObs.toFixed(2)}, min walk-circle margin ${totals.minWalk.toFixed(2)}`);
  assert.deepEqual(totals.bad, {}, "rule breaks");
  assert.ok(totals.moves > 0, "animals do move");
});

test("runtime: dt at the game cap 0.05 (main.js clamps dt) gives 0 keep-out breaks (seed 4)", async () => {
  const s = await sweep(4, 0.05, 1200);
  assert.deepEqual(s.bad, {});
});

test("runtime: with the camera on its island every animal of that island wanders (not frozen)", async () => {
  const s = await sweep(1, 1 / 60, 3600);
  const failed = Object.entries(s.islandMoved).filter(([, v]) => !v).map(([k]) => k);
  assert.deepEqual(failed, [], "animals that never moved while their island was in view");
});

test("runtime: culling. An animal 22.5 units from the camera target stands still; 21.5 units it moves", async () => {
  const w = await seeded(7, () => makeWorld());
  const g = w.groups[0];
  // farther than 22: no movement for 20 s of frames
  let p = [g.position.x, g.position.z, g.rotation.y];
  const far = { x: p[0] + 22.5, y: 0, z: p[1] };
  await seeded(70, async () => { for (let f = 0; f < 1200; f++) w.animals.updateAnimals(f / 60, 1 / 60, far); });
  assert.deepEqual([g.position.x, g.position.z, g.rotation.y], p, "culled animal moved");
  // inside 22: it moves at least once in the same time
  const near = { x: p[0] + 21.5, y: 0, z: p[1] };
  let moved = false;
  await seeded(71, async () => {
    for (let f = 0; f < 1200; f++) {
      const before = g.position.x + "," + g.position.z;
      w.animals.updateAnimals(f / 60 + 100, 1 / 60, near);
      if (g.position.x + "," + g.position.z !== before) moved = true;
    }
  });
  assert.ok(moved, "animal 21.5 away did not move");
});

test("runtime: the culling distance uses the camera target only (y is ignored)", async () => {
  const w = await seeded(8, () => makeWorld());
  const g = w.groups[0];
  const p = [g.position.x, g.position.z];
  const up = { x: p[0] + 22.5, y: 500, z: p[1] };
  await seeded(80, async () => { for (let f = 0; f < 600; f++) w.animals.updateAnimals(f / 60, 1 / 60, up); });
  assert.deepEqual([g.position.x, g.position.z], p);
});

test("runtime: heights and footprints (reported, D6 guide is about 0.35-0.6 tall)", async () => {
  const w = await seeded(1, () => makeWorld());
  const hs = {};
  for (const g of w.groups) {
    const box = new THREE.Box3().setFromObject(g);
    const sp = speciesOf(g), h = box.max.y - box.min.y;
    hs[sp] = hs[sp] || [Infinity, -Infinity];
    hs[sp] = [Math.min(hs[sp][0], h), Math.max(hs[sp][1], h)];
  }
  for (const [k, [lo, hi]] of Object.entries(hs)) console.log(`  height ${k}: ${lo.toFixed(2)}-${hi.toFixed(2)}`);
  for (const [, [lo, hi]] of Object.entries(hs)) { assert.ok(lo > 0 && hi < 1.5, "height outside 0-1.5"); }
});
