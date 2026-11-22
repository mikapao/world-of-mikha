// T11 checks: performance pass (team/02_design.md D8).
// Animal checks run on the REAL src/world/animals.js in Node. It imports src/engine.js and src/world/layout.js.
// engine.js is replaced by a stub: scene.add records objects, and mat()/mesh() copy the real engine.js definitions.
// layout.js has no imports, so it is loaded as is. Every module is loaded as a data: URL, so the run has fresh state.
// The pixel-ratio checks read the real line inside resize() in src/engine.js and evaluate that expression here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANIM = path.join(ROOT, "src", "world", "animals.js");
const LAYOUT = path.join(ROOT, "src", "world", "layout.js");
const ENGINE = path.join(ROOT, "src", "engine.js");
const THREE_URL = pathToFileURL(path.join(ROOT, "node_modules", "three", "build", "three.module.js")).href;

const text = f => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const code = s => s.replace(/\/\/[^\n]*/g, "");
const enc = s => "data:text/javascript," + encodeURIComponent(s);
const THREE = await import(THREE_URL);

// Triangle counts from the T08 and T09 reports (the designs are fixed, so each species has one count).
const TRI_REF = { bunny: 232, butterfly: 28, bird: 254, penguin: 279, duckling: 203, ladybug: 156, frog: 228, dolphin: 224, gull: 120, turtle: 188 };
// Species of ROSTER rows 0..11 in animals.js (D6 roster, in order).
const LAND_SPECIES = ["bunny", "bunny", "butterfly", "bird", "bird", "penguin", "penguin", "duckling", "ladybug", "ladybug", "frog", "frog"];
// Draw-call limits after baking (D8): one mesh per animal, or the number of separately moving groups.
const MESH_MAX = { bunny: 1, bird: 1, penguin: 1, duckling: 1, ladybug: 1, frog: 1, dolphin: 1, butterfly: 3, gull: 3, turtle: 5 };

// ---------------------------------------------------------------- loader
const ENGINE_STUB = `
import * as THREE from ${JSON.stringify(THREE_URL)};
export const scene = { children: [], add(o) { this.children.push(o); } };
export const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9, metalness: 0 }, o));
export function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
  if (shadow) { o.castShadow = true; o.receiveShadow = true; }
  return o;
}
export const rnd = (a, b) => a + Math.random() * (b - a);
export const farFrom = (x, z, list, d) => list.every(p => Math.hypot(p.x - x, p.z - z) > d);
`;
const ENGINE_URL = enc(ENGINE_STUB);
const LAYOUT_URL = enc(text(LAYOUT));
const animalsSrc = text(ANIM)
  .replace(/from "three";/, `from ${JSON.stringify(THREE_URL)};`)
  .replace(/from "\.\.\/engine\.js";/, `from ${JSON.stringify(ENGINE_URL)};`)
  .replace(/from "\.\/layout\.js";/, `from ${JSON.stringify(LAYOUT_URL)};`)
  + "\nexport { ROSTER, bake, bunny, butterfly, bird, penguin, duckling, ladybug, frog, dolphin, seagull, turtle };\n";
const A = await import(enc(animalsSrc));
const E = await import(ENGINE_URL);

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// every built animal the checks need: 12 land (from ROSTER, in order), then the three marine designs
const KINDS = [
  ...A.ROSTER.map((r, i) => ({ name: LAND_SPECIES[i], make: r.make })),
  { name: "dolphin", make: A.dolphin }, { name: "gull", make: A.seagull }, { name: "turtle", make: A.turtle },
];
const meshesOf = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const triOf = g => meshesOf(g).reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
// a group and each sub-group under it, depth first (same order for raw and baked builds)
const frames = g => { const out = [g]; for (const c of g.children) if (c.isGroup) out.push(...frames(c)); return out; };

// ---------------------------------------------------------------- source checks
test("D8 source: ROSTER has the 12 land animals, and the test's kind list matches it", () => {
  assert.equal(A.ROSTER.length, 12);
  assert.equal(LAND_SPECIES.length, 12);
  assert.equal(KINDS.length, 15);
});

test("D8 source: colour literals in animals.js have no 0x00 channel (vertex colour divides by the material colour)", () => {
  const lits = [...code(text(ANIM)).matchAll(/0x([0-9a-fA-F]{6})\b/g)].map(m => m[1]);
  assert.ok(lits.length > 20, `found only ${lits.length} colour literals`);
  const bad = lits.filter(h => [0, 2, 4].some(i => h.slice(i, i + 2) === "00"));
  assert.deepEqual(bad, [], "colour literals with a 00 channel");
});

test("D8 source: merged materials are mat(..., { vertexColors: true }) and bake() is used for every animal", () => {
  const s = code(text(ANIM));
  assert.match(s, /function VC\(hex, double\)|const VC = \(hex, double\)/, "VC helper missing");
  assert.match(s, /mat\(hex, \{ vertexColors: true, side: double \? THREE\.DoubleSide : THREE\.FrontSide \}\)/, "vertex colour material");
  assert.match(s, /bake\(r\.make\(\)\)/, "land animals not baked");
  assert.match(s, /bake\(dolphin\(\)\)/, "dolphins not baked");
  assert.match(s, /bake\(seagull\(\)\)/, "gulls not baked");
  assert.match(s, /bake\(turtle\(\)\)/, "turtle not baked");
});

// ---------------------------------------------------------------- draw calls and triangles
test("D8 meshes: after baking, each animal has at most its draw-call limit (1 / 3 / 5)", () => {
  const counts = {};
  for (const k of KINDS) {
    const n = meshesOf(A.bake(k.make())).length;
    counts[k.name] = n;
    assert.ok(n <= MESH_MAX[k.name], `${k.name}: ${n} meshes, limit ${MESH_MAX[k.name]}`);
  }
  // the counts are reported in the test output for the report
  console.log("D8 meshes per animal: " + JSON.stringify(counts));
});

test("D8 triangles: baked triangle count equals the unbaked count, and is within 5% of the T08/T09 numbers", () => {
  for (const k of KINDS) {
    const raw = triOf(k.make()), baked = triOf(A.bake(k.make())), ref = TRI_REF[k.name];
    assert.equal(baked, raw, `${k.name}: baking changed the triangle count`);
    assert.ok(Math.abs(baked - ref) <= ref * 0.05, `${k.name}: ${baked} triangles, reference ${ref} (+/-5%)`);
  }
});

// ---------------------------------------------------------------- colour safety
const q = v => Math.round(v * 255);                          // colour in 1/255 steps
// position as float32 (both sides go through float32 storage), colour as rendered, plus shadow and side flags
const keyOf = (x, y, z, r, g, b, shadow, side) =>
  `${Math.fround(x)},${Math.fround(y)},${Math.fround(z)}|${q(r)},${q(g)},${q(b)}|${shadow ? 1 : 0}|${side}`;
function cornersRaw(m) {                                     // original part: its own colour, transformed like bake() does
  m.updateMatrix();
  const ge = m.geometry, p = ge.attributes.position, n = ge.index ? ge.index.count : p.count, out = [];
  const v = new THREE.Vector3(), c = m.material.color;
  for (let i = 0; i < n; i++) {
    const k = ge.index ? ge.index.getX(i) : i;
    v.set(p.getX(k), p.getY(k), p.getZ(k)).applyMatrix4(m.matrix);
    out.push(keyOf(v.x, v.y, v.z, c.r, c.g, c.b, m.castShadow, m.material.side));
  }
  return out;
}
function cornersBaked(m) {                                   // merged mesh: rendered colour = material colour x vertex colour
  const p = m.geometry.attributes.position, col = m.geometry.attributes.color, mc = m.material.color, out = [];
  if (!col) throw new Error("merged mesh has no vertex colours");
  for (let i = 0; i < p.count; i++) {
    out.push(keyOf(p.getX(i), p.getY(i), p.getZ(i), col.getX(i) * mc.r, col.getY(i) * mc.g, col.getZ(i) * mc.b, m.castShadow, m.material.side));
  }
  return out;
}
// compare two lists as multisets; returns a short description of the first differences
function multisetDiff(a, b) {
  const cnt = new Map();
  for (const k of a) cnt.set(k, (cnt.get(k) || 0) + 1);
  for (const k of b) cnt.set(k, (cnt.get(k) || 0) - 1);
  const bad = [...cnt].filter(([, v]) => v !== 0);
  return bad.length ? `${bad.length} differing keys, e.g. ${bad.slice(0, 3).map(([k, v]) => `${k} (${v > 0 ? "missing from baked" : "extra in baked"})`).join("; ")}` : "";
}

test("D8 colour: every baked vertex colour x material colour equals the original part colour (1/255), with shadow and side kept", () => {
  for (const k of KINDS) {
    const raw = k.make(), baked = A.bake(k.make());
    const rf = frames(raw), bf = frames(baked);
    assert.equal(bf.length, rf.length, `${k.name}: frame count changed`);
    const rawKeys = [], bakedKeys = [];
    rf.forEach((f, i) => { for (const c of f.children) if (c.isMesh) for (const key of cornersRaw(c)) rawKeys.push(i + "#" + key); });
    bf.forEach((f, i) => {
      for (const c of f.children) {
        if (!c.isMesh) continue;
        assert.equal(c.material.vertexColors, true, `${k.name}: merged mesh is not vertex-coloured`);
        assert.equal(c.material.flatShading, true, `${k.name}: flat shading lost`);
        assert.equal(c.material.roughness, 0.9); assert.equal(c.material.metalness, 0);
        for (const key of cornersBaked(c)) bakedKeys.push(i + "#" + key);
      }
    });
    const d = multisetDiff(rawKeys, bakedKeys);
    assert.equal(d, "", `${k.name}: colour/position/shadow/side differ from the original parts: ${d}`);
  }
});

test("D8 colour: negative control, the comparison flags a bunny's baked mesh checked against a frog's parts", () => {
  const rawFrog = frames(A.ROSTER[10].make()), bakedBunny = A.bake(A.ROSTER[0].make());
  const rawKeys = [], bakedKeys = [];
  for (const f of rawFrog) for (const c of f.children) if (c.isMesh) rawKeys.push(...cornersRaw(c));
  for (const c of meshesOf(bakedBunny)) bakedKeys.push(...cornersBaked(c));
  assert.notEqual(multisetDiff(rawKeys, bakedKeys), "", "the comparison did not flag a clearly different animal");
});

// ---------------------------------------------------------------- wings and flippers
test("D8 motion: wings and flippers are separate groups under the animal root, and updateAnimals() still moves them", () => {
  const real = Math.random; Math.random = mulberry32(7);
  try { A.buildAnimals([]); } finally { Math.random = real; }
  const roots = E.scene.children.filter(o => o.userData && (o.userData.wings || o.userData.flippers));
  const wingRoots = roots.filter(o => o.userData.wings), finRoots = roots.filter(o => o.userData.flippers);
  assert.equal(wingRoots.length, 4, "expected 1 butterfly and 3 seagulls with wings");
  assert.equal(finRoots.length, 1, "expected 1 turtle with flippers");
  assert.equal(finRoots[0].userData.flippers.length, 4, "turtle needs 4 independent flippers");
  for (const r of [...wingRoots, ...finRoots]) {
    const subs = r.userData.wings || r.userData.flippers;
    for (const s of subs) {
      assert.ok(s.isGroup && s.parent === r, "wing/flipper must be a group directly under the animal root");
      assert.ok(meshesOf(s).length >= 1, "wing/flipper group has no mesh");
    }
  }
  const snap = r => (r.userData.wings || r.userData.flippers).map(w => w.rotation.z);
  for (const r of roots) {
    const cam = { x: r.position.x, z: r.position.z };
    A.updateAnimals(1.0, 1 / 60, cam);
    const a = snap(r);
    A.updateAnimals(1.3, 1 / 60, cam);
    const b = snap(r);
    assert.ok(b.every((v, i) => v !== a[i]), `a wing or flipper did not move (${JSON.stringify(a)} -> ${JSON.stringify(b)})`);
  }
});

// ---------------------------------------------------------------- pixel budget (engine.js resize)
const engineSrc = text(ENGINE);
const resizeBody = engineSrc.slice(engineSrc.indexOf("function resize() {"), engineSrc.indexOf('addEventListener("resize", resize)'));
const pixLines = resizeBody.match(/renderer\.setPixelRatio\(.*\);/g) || [];
const D8_EXPR = "Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2500000 / (innerWidth * innerHeight))))";
// the real expression from resize(), evaluated with a given viewport and devicePixelRatio
const ratioFor = (w, h, dpr) => {
  const expr = pixLines[0].replace(/^renderer\.setPixelRatio\(/, "").replace(/\);$/, "");
  return new Function("innerWidth", "innerHeight", "window", "Math", `return (${expr});`)(w, h, { devicePixelRatio: dpr }, Math);
};
// pixels in the WebGL buffer: CSS size x ratio (three.js floors the canvas size)
const bufferPixels = (w, h, dpr) => { const r = ratioFor(w, h, dpr); return Math.floor(w * r) * Math.floor(h * r); };

test("D8 pixel budget: resize() has one setPixelRatio call with the D8 formula, set before setSize and run on every resize", () => {
  assert.equal(pixLines.length, 1, `expected one setPixelRatio call in resize(), found ${pixLines.length}`);
  assert.equal(pixLines[0].replace(/^renderer\.setPixelRatio\(/, "").replace(/\);$/, ""), D8_EXPR);
  assert.ok(resizeBody.indexOf("renderer.setPixelRatio") < resizeBody.indexOf("renderer.setSize"), "ratio must be set before setSize");
  assert.match(engineSrc, /addEventListener\("resize", resize\)/);
});

test("D8 pixel budget: 1280x800 at dpr 2 gives ratio 1.5625 (the formula's value; not dpr) and exactly 2.5 M buffer pixels", () => {
  assert.equal(ratioFor(1280, 800, 2), 1.5625);
  assert.equal(bufferPixels(1280, 800, 2), 2500000);
});

test("D8 pixel budget: 2560x1440 at dpr 2 stays within 2.5 M buffer pixels", () => {
  const px = bufferPixels(2560, 1440, 2);
  assert.ok(px <= 2500000, `${px} pixels`);
  assert.ok(px > 2400000, `${px} pixels; ratio is not using the budget`);
});

test("D8 pixel budget: 3840x2160 at dpr 2 gives ratio sqrt(2.5M / 8,294,400) = 0.549 and at most 2.5 M buffer pixels", () => {
  const r = ratioFor(3840, 2160, 2);
  assert.ok(Math.abs(r - Math.sqrt(2500000 / 8294400)) < 1e-12, `ratio ${r}`);
  assert.ok(Math.abs(r - 0.549) < 0.001, `ratio ${r}`);
  const px = bufferPixels(3840, 2160, 2);
  assert.ok(px <= 2500000, `${px} pixels at ratio ${r}`);
});

test("D8 pixel budget: the 0.5 floor holds on a huge window (7680x4320 at dpr 2 gives ratio exactly 0.5)", () => {
  assert.equal(ratioFor(7680, 4320, 2), 0.5);
  assert.equal(ratioFor(7680, 4320, 0.25), 0.5);
});

test("D8 pixel budget: the ratio is never below 0.5, and never above 2, over a grid of screens and dpr values", () => {
  const sizes = [[320, 568], [800, 1280], [1280, 800], [1920, 1080], [2560, 1440], [3840, 2160], [7680, 4320]];
  for (const [w, h] of sizes) for (const dpr of [0.5, 1, 1.5, 2, 3, undefined]) {
    const r = ratioFor(w, h, dpr);
    assert.ok(r >= 0.5, `${w}x${h} dpr ${dpr}: ratio ${r} below 0.5`);
    assert.ok(r <= 2, `${w}x${h} dpr ${dpr}: ratio ${r} above 2`);
  }
  assert.equal(ratioFor(360, 640, undefined), 1, "missing devicePixelRatio should count as 1");
});
