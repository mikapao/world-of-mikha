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
  // T09 added marine groups to the same scene. Split by colour so the T08 checks keep seeing land animals only.
  const all = engine.scene.children.slice(before);
  const groups = all.filter(g => !kindOfMarine(g));
  const marine = all.filter(g => kindOfMarine(g));
  return { layout, animals, groups, marine };
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

// ---------------------------------------------------------------- T09 marine (2 dolphins, 3 seagulls, 1 turtle)
// Marine groups are recognised by one colour each (unique to the kind; land animals do not use these).
const MARINE = { dolphin: 0x7f9fc2, gull: 0xdfe6ee, turtle: 0x5f9a62 };
function kindOfMarine(g) {
  let k = null;
  g.traverse(o => { if (o.isMesh && o.material && o.material.color) for (const [n, c] of Object.entries(MARINE)) if (o.material.color.getHex() === c) k = n; });
  return k;
}
const GULL_C = [{ x: -9, z: 9 }, { x: 12, z: 19 }, { x: 11, z: -12 }];   // gull circle centres, as in animals.js
// island outlines as drawn: top radius and segment count of each island's CylinderGeometry (checked in the island files)
const OUTLINES = [
  { name: "home", x: 0, z: 0, r: ISLAND_R, n: 14, file: "homeIsland.js", src: "CylinderGeometry(ISLAND_R, ISLAND_R - 0.6, 0.8, 14)" },
  { name: "crystal", x: 4, z: -27, r: 8, n: 6, file: "crystalIsle.js", src: "CylinderGeometry(I2.r, I2.r - 0.4, 0.8, 6)" },
  { name: "winter", x: -21, z: 15, r: 9, n: 16, file: "winterIsle.js", src: "CylinderGeometry(I3.r, I3.r - 0.4, 0.8, 16)" },
  { name: "candy", x: 20, z: 12, r: 8.5, n: 24, file: "candyIsle.js", src: "CylinderGeometry(I4.r, I4.r, 0.5, 24)" },
  { name: "meadow", x: 2, z: 24, r: 8.5, n: 20, file: "meadowIsle.js", src: "CylinderGeometry(I5.r, I5.r - 0.4, 0.8, 20)" },
];
/** signed distance to the drawn island outline (polygon); negative inside. Minimum over the five islands. */
function islandGap(x, z) {
  let best = Infinity;
  for (const p of OUTLINES) {
    const V = [];
    for (let i = 0; i < p.n; i++) { const th = i / p.n * 2 * Math.PI; V.push([p.x + p.r * Math.sin(th), p.z + p.r * Math.cos(th)]); }
    let dmin = Infinity, pos = 0, neg = 0;
    for (let i = 0; i < p.n; i++) {
      const [ax, az] = V[i], [bx, bz] = V[(i + 1) % p.n];
      const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
      dmin = Math.min(dmin, Math.hypot(x - (ax + t * ex), z - (az + t * ez)));
      const cr = ex * (z - az) - ez * (x - ax);
      if (cr >= 0) pos++; else neg++;
    }
    const inside = pos === p.n || neg === p.n;
    best = Math.min(best, inside ? -dmin : dmin);
  }
  return best;
}

// ---- runtime sweep: 5 islands x seeds, camera at each island centre, 120 s at 1/60 s. Memoised.
const SWEEP_SEEDS = [1, 2], SWEEP_FRAMES = 7200, SWEEP_DT = 1 / 60;
const marineMemo = new Map();
function marineRun(seed, isl) {
  const key = `${seed}:${isl}`;
  if (!marineMemo.has(key)) marineMemo.set(key, marineRunRaw(seed, isl));
  return marineMemo.get(key);
}
async function marineRunRaw(seed, isl) {
  const w = await seeded(seed, () => makeWorld());
  const dols = w.marine.filter(g => kindOfMarine(g) === "dolphin");
  const gulls = w.marine.filter(g => kindOfMarine(g) === "gull");
  const turts = w.marine.filter(g => kindOfMarine(g) === "turtle");
  const cam = { x: CENTRES[isl][0], y: 0, z: CENTRES[isl][1] };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const st = {
    seed, isl, dolphins: dols.length, gulls: gulls.length, turtles: turts.length,
    dol: { samples: 0, visible: 0, bad: {}, minGap: Infinity, maxGap: -Infinity, minHiddenY: Infinity, maxHiddenY: -Infinity, starts: dols.map(() => []), ends: dols.map(() => []) },
    gull: { samples: 0, bad: {}, minR: Infinity, maxR: -Infinity, minY: Infinity, maxY: -Infinity },
    turtle: { samples: 0, bad: {}, minY: Infinity, maxY: -Infinity, minGap: Infinity, atOrigin: 0 },
  };
  let prev = dols.map(() => false);
  await seeded(seed + 100, async () => {
    w.animals.updateAnimals(0, SWEEP_DT, { x: -1, y: 0, z: 2 });   // the game's first frame: camera at the player's start (home island)
    for (let f = 0; f < SWEEP_FRAMES; f++) {
      const t = f * SWEEP_DT;
      w.animals.updateAnimals(t, SWEEP_DT, cam);
      dols.forEach((g, i) => {
        st.dol.samples++;
        const vis = g.visible;
        if (vis !== prev[i]) { (vis ? st.dol.starts[i] : st.dol.ends[i]).push(t); prev[i] = vis; }
        if (!vis) {
          st.dol.minHiddenY = Math.min(st.dol.minHiddenY, g.position.y); st.dol.maxHiddenY = Math.max(st.dol.maxHiddenY, g.position.y);
          if (g.position.y > -1.3) bump(st.dol.bad, "hidden above y -1.3");
          return;
        }
        st.dol.visible++;
        const x = g.position.x, z = g.position.z, gap = islandGap(x, z);
        st.dol.minGap = Math.min(st.dol.minGap, gap); st.dol.maxGap = Math.max(st.dol.maxGap, gap);
        if (gap < 3) bump(st.dol.bad, "less than 3 from an island edge");
        if (gap > 10) bump(st.dol.bad, "more than 10 from an island edge");
        if (w.layout.walkable(x, z)) bump(st.dol.bad, "on walkable ground or bridge");
        if (w.layout.BRIDGES.some(b => w.layout.bridgeS(b, x, z) !== null)) bump(st.dol.bad, "on a bridge deck");
      });
      gulls.forEach((g, i) => {
        st.gull.samples++;
        const r = Math.hypot(g.position.x - GULL_C[i].x, g.position.z - GULL_C[i].z), y = g.position.y;
        st.gull.minR = Math.min(st.gull.minR, r); st.gull.maxR = Math.max(st.gull.maxR, r);
        st.gull.minY = Math.min(st.gull.minY, y); st.gull.maxY = Math.max(st.gull.maxY, y);
        if (r < 4 - 1e-6 || r > 7 + 1e-6) bump(st.gull.bad, "radius outside 4-7");   // 1e-6: float error at the exact r = 4 gull
        if (y < 4 || y > 6) bump(st.gull.bad, "height outside 4-6");
      });
      turts.forEach(g => {
        st.turtle.samples++;
        const x = g.position.x, z = g.position.z, y = g.position.y;
        if (x === 0 && z === 0) { st.turtle.atOrigin++; return; }   // not placed yet: counted in its own test
        st.turtle.minY = Math.min(st.turtle.minY, y); st.turtle.maxY = Math.max(st.turtle.maxY, y);
        if (Math.abs(y + 0.85) > 0.05) bump(st.turtle.bad, "height not -0.85 +/- 0.05");
        const gap = islandGap(x, z); st.turtle.minGap = Math.min(st.turtle.minGap, gap);
        if (gap < 2.5) bump(st.turtle.bad, "within 2.5 of an island edge");
        if (w.layout.walkable(x, z)) bump(st.turtle.bad, "over walkable ground");
      });
    }
  });
  // hidden gap = landing to next take-off (design wait, 8-15 s); start-to-start = that gap + the 1.8 s leap
  st.dol.hiddenGaps = []; st.dol.startGaps = [];
  dols.forEach((_, i) => {
    const s = st.dol.starts[i], e = st.dol.ends[i];
    for (let k = 0; k + 1 < s.length; k++) st.dol.startGaps.push(s[k + 1] - s[k]);
    for (let k = 0; k < e.length && k + 1 < s.length; k++) st.dol.hiddenGaps.push(s[k + 1] - e[k]);
  });
  st.dol.leaps = st.dol.starts.reduce((n, a) => n + a.length, 0);
  return st;
}
async function allMarine() {
  const out = [];
  for (const seed of SWEEP_SEEDS) for (const isl of Object.keys(CENTRES)) out.push(await marineRun(seed, isl));
  return out;
}
const sumBad = list => list.reduce((m, o) => { for (const [k, v] of Object.entries(o)) m[k] = (m[k] || 0) + v; return m; }, {});

// ---- source checks
test("T09 source: marine is built at the end of buildAnimals and updated from updateAnimals; gull centres and outlines as the tests assume", () => {
  const raw = text(ANIM);
  assert.ok(raw.indexOf("buildMarine();") > raw.indexOf("export function buildAnimals"), "buildMarine() after the land loop, inside buildAnimals");
  assert.match(code(raw), /updateMarine\(t, dt, camTarget\);/);
  assert.ok(raw.includes("const centres = [{ x: -9, z: 9 }, { x: 12, z: 19 }, { x: 11, z: -12 }];"), "gull centres changed");
  assert.match(code(raw), /Math\.hypot\(b\.x - cam\.x, b\.z - cam\.z\) > CULL \+ 8\) continue;/, "gull culling distance");
  for (const o of OUTLINES) assert.ok(text(path.join(SRC, "world", o.file)).includes(o.src), `${o.name} outline changed: ${o.src}`);
});

// ---- build checks
test("T09 runtime: every build has 2 dolphins, 3 seagulls and 1 turtle (seeds 1-4)", async () => {
  for (const seed of [1, 2, 3, 4]) {
    const w = await seeded(seed, () => makeWorld());
    const c = countBy(w.marine.map(kindOfMarine));
    assert.deepEqual(c, { dolphin: 2, gull: 3, turtle: 1 }, `seed ${seed}`);
  }
});

test("T09 runtime: how often each marine animal is found, over 200 builds (reported, not asserted)", async () => {
  let dol = 0, gull = 0, turtle = 0, noTurtle = 0, noDolphin = 0, turtleAtOriginAfterFirstFrame = 0;
  const N = 200;
  for (let seed = 1000; seed < 1000 + N; seed++) {
    const w = await seeded(seed, () => makeWorld());
    const c = countBy(w.marine.map(kindOfMarine));
    dol += c.dolphin || 0; gull += c.gull || 0; turtle += c.turtle || 0;
    if (!c.turtle) noTurtle++;
    if (!c.dolphin) noDolphin++;
    // one frame with the camera where the game starts (camTarget = player start, -1, 0, 2): is the turtle placed yet?
    const tu = w.marine.find(g => kindOfMarine(g) === "turtle");
    if (tu) {
      await seeded(seed + 5000, async () => w.animals.updateAnimals(0, 1 / 60, { x: -1, y: 0, z: 2 }));
      if (tu.position.x === 0 && tu.position.z === 0) turtleAtOriginAfterFirstFrame++;
    }
  }
  console.log(`  ${N} builds: dolphins ${dol} (of ${2 * N}), gulls ${gull} (of ${3 * N}), turtles ${turtle} (of ${N}); builds with no turtle: ${noTurtle}; builds with no dolphin: ${noDolphin}`);
  console.log(`  turtle still at the world origin after one frame with the camera at the start position: ${turtleAtOriginAfterFirstFrame} of ${N} builds`);
  assert.ok(true);
});

test("T09 runtime: every marine animal has at most 300 triangles (seeds 1-3)", async () => {
  const max = {};
  for (const seed of [1, 2, 3]) {
    const w = await seeded(seed, () => makeWorld());
    for (const g of w.marine) {
      const k = kindOfMarine(g), n = triCount(g);
      max[k] = Math.max(max[k] || 0, n);
      assert.ok(n <= 300, `${k} has ${n} triangles`);
      assert.ok(n > 0, `${k} has no triangles`);
    }
  }
  console.log("  max triangles by marine kind:", JSON.stringify(max));
});

test("T09 runtime: no marine mesh casts a shadow (seeds 1-2)", async () => {
  for (const seed of [1, 2]) {
    const w = await seeded(seed, () => makeWorld());
    let meshes = 0;
    for (const g of w.marine) g.traverse(o => { if (o.isMesh) { meshes++; assert.equal(o.castShadow, false, `${kindOfMarine(g)} mesh casts a shadow`); } });
    assert.ok(meshes > 0);
  }
});

test("T09 runtime: dolphins start hidden under the water (visible=false, y -1.5)", async () => {
  const w = await seeded(1, () => makeWorld());
  for (const g of w.marine.filter(g => kindOfMarine(g) === "dolphin")) {
    assert.equal(g.visible, false, "dolphin visible at build");
    assert.ok(g.position.y <= -1.3, `dolphin y ${g.position.y}`);
  }
});

test("T09 runtime: gulls and turtle are in place before the first frame", async () => {
  const w = await seeded(1, () => makeWorld());
  const gulls = w.marine.filter(g => kindOfMarine(g) === "gull");
  gulls.forEach((g, i) => {
    const r = Math.hypot(g.position.x - GULL_C[i].x, g.position.z - GULL_C[i].z);
    assert.ok(r >= 4 && r <= 7, `gull ${i} starts ${r.toFixed(2)} from its circle centre, at (${g.position.x}, ${g.position.y}, ${g.position.z})`);
    assert.ok(g.position.y >= 4 && g.position.y <= 6, `gull ${i} starts at y ${g.position.y}`);
  });
  for (const g of w.marine.filter(g => kindOfMarine(g) === "turtle")) {
    assert.ok(Math.abs(g.position.y + 0.85) <= 0.05, `turtle starts at y ${g.position.y}, position (${g.position.x}, ${g.position.z})`);
  }
});

// ---- sweep checks
test("T09 runtime: dolphin visible samples are at least 3 units outside every island edge (5 islands, seeds 1-2, 120 s)", async () => {
  const runs = await allMarine();
  const minGap = Math.min(...runs.map(r => r.dol.minGap));
  console.log(`  min dolphin gap to outline ${minGap.toFixed(2)}; visible samples ${runs.reduce((a, r) => a + r.dol.visible, 0)}`);
  assert.equal(sumBad(runs.map(r => r.dol.bad))["less than 3 from an island edge"] || 0, 0, "samples closer than 3");
});

test("T09 runtime: dolphin visible samples are never on walkable ground or a bridge", async () => {
  const runs = await allMarine();
  const b = sumBad(runs.map(r => r.dol.bad));
  assert.equal(b["on walkable ground or bridge"] || 0, 0);
  assert.equal(b["on a bridge deck"] || 0, 0);
});

test("T09 runtime: every dolphin visible sample is within 10 units of an island edge (5 islands, seeds 1-2)", async () => {
  const runs = await allMarine();
  const maxGap = Math.max(...runs.map(r => r.dol.maxGap));
  console.log(`  max dolphin gap to outline over visible samples ${maxGap.toFixed(2)}`);
  assert.equal(sumBad(runs.map(r => r.dol.bad))["more than 10 from an island edge"] || 0, 0, "samples farther than 10");
});

test("T09 runtime: hidden dolphins stay at y <= -1.3 between leaps", async () => {
  const runs = await allMarine();
  const b = sumBad(runs.map(r => r.dol.bad));
  assert.equal(b["hidden above y -1.3"] || 0, 0);
  console.log(`  hidden dolphin y range ${Math.min(...runs.map(r => r.dol.minHiddenY)).toFixed(2)} to ${Math.max(...runs.map(r => r.dol.maxHiddenY)).toFixed(2)}`);
});

test("T09 runtime: dolphins leap in the sweep (positive control)", async () => {
  const runs = await allMarine();
  console.log(`  leaps per run: ${runs.map(r => `${r.seed}:${r.isl}=${r.dol.leaps}`).join(" ")}`);
  assert.ok(runs.reduce((a, r) => a + r.dol.leaps, 0) > 0, "no leap in any run");
});

test("T09 runtime: hidden time between dolphin leaps is 8-15 s (one-frame tolerance)", async () => {
  const runs = await allMarine();
  const gaps = runs.flatMap(r => r.dol.hiddenGaps);
  const eps = 2 / 60;
  assert.ok(gaps.length > 0, "no gaps measured");
  console.log(`  hidden gaps: n ${gaps.length}, min ${Math.min(...gaps).toFixed(2)}, max ${Math.max(...gaps).toFixed(2)}`);
  assert.ok(gaps.every(g => g >= 8 - eps && g <= 15 + eps), `gaps outside 8-15 s: ${gaps.filter(g => g < 8 - eps || g > 15 + eps).map(g => g.toFixed(2)).join(", ")}`);
});

test("T09 runtime: start-to-start leap interval (reported only; hidden 8-15 s plus 1.8 s leap gives 9.8-16.8 s)", async () => {
  const runs = await allMarine();
  const gaps = runs.flatMap(r => r.dol.startGaps);
  if (gaps.length) console.log(`  start-to-start: n ${gaps.length}, min ${Math.min(...gaps).toFixed(2)}, max ${Math.max(...gaps).toFixed(2)}`);
  assert.ok(true);
});

test("T09 runtime: seagull circles have radius 4-7 and height 4-6 in every sample (seeds 1-2)", async () => {
  const runs = await allMarine();
  const b = sumBad(runs.map(r => r.gull.bad));
  console.log(`  gull y range ${Math.min(...runs.map(r => r.gull.minY)).toFixed(2)} to ${Math.max(...runs.map(r => r.gull.maxY)).toFixed(2)}`);
  assert.equal(b["radius outside 4-7"] || 0, 0, "radius");
  assert.equal(b["height outside 4-6"] || 0, 0, "height");
});

test("T09 runtime: once placed, the turtle is at y -0.85 (+/-0.05), never over walkable ground, never within 2.5 of an island edge (seeds 1-2)", async () => {
  const runs = await allMarine();
  const withTurtle = runs.filter(r => r.turtles > 0);
  assert.ok(withTurtle.length > 0, "no turtle in any run");
  assert.deepEqual(sumBad(withTurtle.map(r => r.turtle.bad)), {}, "turtle rule breaks");
});

test("T09 runtime: the turtle is placed (not at the world origin) in every sweep run, from the first frame of the game", async () => {
  const runs = await allMarine();
  const per = runs.map(r => `${r.seed}:${r.isl}=${r.turtle.atOrigin}`).join(" ");
  console.log(`  turtle samples at world origin per run (of 7200): ${per}`);
  assert.equal(runs.reduce((a, r) => a + r.turtle.atOrigin, 0), 0, "turtle sat at the world origin (over the home island) for some frames");
});

// ---- culling
test("T09 runtime: no dolphin leaps while the camera is 200 units away (culling)", async () => {
  const w = await seeded(11, () => makeWorld());
  const dols = w.marine.filter(g => kindOfMarine(g) === "dolphin");
  let seen = 0;
  await seeded(111, async () => {
    for (let f = 0; f < 3600; f++) { w.animals.updateAnimals(f / 60, 1 / 60, { x: 0, y: 0, z: -200 }); for (const d of dols) if (d.visible) seen++; }
  });
  assert.equal(seen, 0, "a dolphin was visible with the camera far away");
});

test("T09 runtime: a gull freezes 30.5 units from the camera and moves at 29.5 (gulls use 30 by design)", async () => {
  const w = await seeded(12, () => makeWorld());
  const gull = w.marine.filter(g => kindOfMarine(g) === "gull")[0];
  await seeded(120, async () => { w.animals.updateAnimals(0, 1 / 60, { x: GULL_C[0].x, y: 0, z: GULL_C[0].z }); });   // place it
  const p = [gull.position.x, gull.position.y, gull.position.z];
  await seeded(121, async () => { for (let f = 0; f < 1200; f++) w.animals.updateAnimals(f / 60, 1 / 60, { x: p[0] + 30.5, y: 0, z: p[2] }); });
  assert.deepEqual([gull.position.x, gull.position.y, gull.position.z], p, "gull moved at 30.5");
  let moved = false;
  await seeded(122, async () => {
    for (let f = 0; f < 1200; f++) { const b = gull.position.x + "," + gull.position.z; w.animals.updateAnimals(f / 60 + 50, 1 / 60, { x: p[0] + 29.5, y: 0, z: p[2] }); if (gull.position.x + "," + gull.position.z !== b) moved = true; }
  });
  assert.ok(moved, "gull did not move at 29.5");
});

test("T09 runtime: the turtle freezes 22.5 units from the camera and moves at 21.5", async () => {
  const w = await seeded(13, () => makeWorld());
  const tu = w.marine.filter(g => kindOfMarine(g) === "turtle")[0];
  assert.ok(tu, "no turtle in seed 13");
  let found = false;   // the turtle only moves once the camera is within 22 of its spot: sweep the camera until it does
  await seeded(130, async () => {
    for (let gx = -45; gx <= 45 && !found; gx += 2) for (let gz = -50; gz <= 45 && !found; gz += 2) {
      w.animals.updateAnimals(0, 1 / 60, { x: gx, y: 0, z: gz });
      if (tu.position.x !== 0 || tu.position.z !== 0) found = true;
    }
  });
  assert.ok(found, "turtle never placed by the camera sweep");
  const p = [tu.position.x, tu.position.y, tu.position.z];
  await seeded(131, async () => { for (let f = 0; f < 1200; f++) w.animals.updateAnimals(f / 60, 1 / 60, { x: p[0] + 22.5, y: 0, z: p[2] }); });
  assert.deepEqual([tu.position.x, tu.position.y, tu.position.z], p, "turtle moved at 22.5");
  let moved = false;
  await seeded(132, async () => {
    for (let f = 0; f < 1200; f++) { const b = tu.position.x + "," + tu.position.z; w.animals.updateAnimals(f / 60 + 50, 1 / 60, { x: p[0] + 21.5, y: 0, z: p[2] }); if (tu.position.x + "," + tu.position.z !== b) moved = true; }
  });
  assert.ok(moved, "turtle did not move at 21.5");
});
