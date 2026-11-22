// Little animals that wander the islands. Calm: they never block the avatar and make no sound.
// Land animals (T08) live in the "land" section; marine/flying ones (T09) get their own section below it.
import * as THREE from "three";
import { scene, mat, mesh, rnd } from "../engine.js";
import { ISLAND_R, I2, I2_WALK, I3, I3_WALK, I4, I4_WALK, I5, I5_WALK, BRIDGES, obstacles, walkable, groundY } from "./layout.js";

const CULL = 22;                                   // animals farther than this from the camera target stand still

// ---------------------------------------------------------------- shared helpers
const mats = {};
const M = c => mats[c] || (mats[c] = mat(c));
const MB = c => { const k = "b" + c; return mats[k] || (mats[k] = mat(c, { side: THREE.DoubleSide })); };
const geos = {};
const sph = (w = 7, h = 5) => { const k = `s${w}x${h}`; return geos[k] || (geos[k] = new THREE.SphereGeometry(1, w, h)); };
const cone = (n = 6) => { const k = "c" + n; return geos[k] || (geos[k] = new THREE.ConeGeometry(1, 1, n)); };
const box = () => geos.box || (geos.box = new THREE.BoxGeometry(1, 1, 1));
const quad = () => geos.quad || (geos.quad = new THREE.PlaneGeometry(1, 1));

/** add a scaled part (ellipsoid etc.) to a group */
function part(g, geo, color, x, y, z, sx, sy, sz, opt = {}) {
  const m = mesh(geo, opt.double ? MB(color) : M(color), x, y, z, opt.shadow !== false);
  m.scale.set(sx, sy, sz);
  if (opt.rx) m.rotation.x = opt.rx;
  if (opt.rz) m.rotation.z = opt.rz;
  g.add(m); return m;
}
/** concatenate non-indexed geometries (position, normal, color) into one; own helper because the test harness only rewrites the bare "three" import */
function mergeGeos(list) {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const arr = new Float32Array(list.reduce((n, ge) => n + ge.attributes[name].array.length, 0));
    let o = 0; for (const ge of list) { arr.set(ge.attributes[name].array, o); o += ge.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
// Vertex-colour materials. material.color is the animal's identifying (first part) colour; each vertex stores
// partColor / materialColor, so the rendered colour (material x vertex) is exactly the original part colour.
const vcMats = {};
const VC = (hex, double) => { const k = hex + (double ? "d" : "s"); return vcMats[k] || (vcMats[k] = mat(hex, { vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide })); };
/** merge the static mesh children of a group into 1 mesh per (side, shadow) kind; sub-groups are baked on their own so they stay movable */
function bake(g) {
  const buckets = {};
  for (const c of [...g.children]) {
    if (!c.isMesh) { if (c.isGroup) bake(c); continue; }
    c.updateMatrix();
    const ge = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
    ge.deleteAttribute("uv");
    const dbl = c.material.side === THREE.DoubleSide, k = (dbl ? "d" : "s") + (c.castShadow ? "1" : "0");
    const b = buckets[k] || (buckets[k] = { dbl, shadow: c.castShadow, hex: c.material.color.getHex(), geos: [] });
    const mc = new THREE.Color(b.hex), cc = c.material.color, n = ge.attributes.position.count, col = new Float32Array(n * 3);
    const r = cc.r / Math.max(mc.r, 1 / 255), gg = cc.g / Math.max(mc.g, 1 / 255), bl = cc.b / Math.max(mc.b, 1 / 255);
    for (let i = 0; i < n; i++) { col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = bl; }
    ge.setAttribute("color", new THREE.BufferAttribute(col, 3));
    b.geos.push(ge);
    g.remove(c);
  }
  for (const b of Object.values(buckets)) {
    const m = new THREE.Mesh(mergeGeos(b.geos), VC(b.hex, b.dbl));
    m.castShadow = m.receiveShadow = b.shadow;
    g.add(m);
  }
  return g;
}
/** triangle count of a built animal (for checking the 300 limit) */
export function triCount(g) {
  let n = 0;
  g.traverse(o => { if (o.isMesh) { const ge = o.geometry; n += (ge.index ? ge.index.count : ge.attributes.position.count) / 3; } });
  return n;
}

// ---------------------------------------------------------------- land: designs (face +Z, origin at the feet)
function bunny(fur, ear) {
  const g = new THREE.Group();
  part(g, sph(), fur, 0, 0.2, 0, 0.19, 0.17, 0.24);                    // body
  part(g, sph(), fur, 0, 0.33, 0.2, 0.14, 0.13, 0.14);                 // head
  part(g, sph(5, 3), fur, -0.06, 0.58, 0.18, 0.04, 0.15, 0.04);       // ears
  part(g, sph(5, 3), fur, 0.06, 0.58, 0.18, 0.04, 0.15, 0.04);
  part(g, sph(5, 3), ear, -0.06, 0.57, 0.2, 0.025, 0.11, 0.02);        // inner ears
  part(g, sph(5, 3), ear, 0.06, 0.57, 0.2, 0.025, 0.11, 0.02);
  part(g, sph(5, 3), 0xffffff, 0, 0.22, -0.22, 0.07, 0.07, 0.07);      // tail
  part(g, sph(5, 3), ear, 0, 0.32, 0.33, 0.03, 0.025, 0.02);           // nose
  return g;
}
function butterfly(c1, c2) {
  const g = new THREE.Group();
  part(g, sph(5, 3), 0x6b4f5a, 0, 0, 0, 0.025, 0.025, 0.1);            // body
  const wl = new THREE.Group(), wr = new THREE.Group();
  for (const [w, s, cc] of [[wl, -1, c1], [wr, 1, c1]]) {
    const big = part(w, quad(), cc, s * 0.1, 0, 0, 0.2, 0.2, 1, { double: true, rx: -Math.PI / 2, shadow: false });
    part(w, quad(), c2, s * 0.08, 0.001, -0.07, 0.12, 0.1, 1, { double: true, rx: -Math.PI / 2, shadow: false });
    g.add(w);
  }
  g.userData.wings = [wl, wr];
  return g;
}
function bird(body, belly, beak) {
  const g = new THREE.Group();
  part(g, sph(), body, 0, 0.2, 0, 0.17, 0.16, 0.22);                   // body
  part(g, sph(), belly, 0, 0.17, 0.07, 0.13, 0.12, 0.16);              // belly
  part(g, sph(), body, 0, 0.38, 0.14, 0.12, 0.12, 0.12);               // head
  part(g, cone(5), beak, 0, 0.37, 0.28, 0.04, 0.1, 0.04, { rx: Math.PI / 2 });   // beak
  part(g, cone(5), body, 0, 0.26, -0.28, 0.07, 0.2, 0.03, { rx: -Math.PI / 2 }); // tail
  part(g, sph(5, 3), body, -0.17, 0.22, -0.02, 0.03, 0.1, 0.15);      // wings
  part(g, sph(5, 3), body, 0.17, 0.22, -0.02, 0.03, 0.1, 0.15);
  part(g, sph(4, 2), 0x2f2f3a, -0.05, 0.4, 0.24, 0.02, 0.02, 0.02);    // eyes
  part(g, sph(4, 2), 0x2f2f3a, 0.05, 0.4, 0.24, 0.02, 0.02, 0.02);
  return g;
}
function penguin() {
  const g = new THREE.Group();
  part(g, sph(), 0x4a5a73, 0, 0.3, 0, 0.18, 0.28, 0.17);               // body
  part(g, sph(), 0xf6f3ee, 0, 0.27, 0.05, 0.13, 0.22, 0.13);          // belly
  part(g, sph(), 0x4a5a73, 0, 0.58, 0.02, 0.13, 0.12, 0.13);          // head
  part(g, cone(5), 0xffb347, 0, 0.56, 0.16, 0.04, 0.09, 0.04, { rx: Math.PI / 2 });   // beak
  part(g, sph(5, 3), 0x4a5a73, -0.19, 0.32, 0, 0.03, 0.14, 0.08);     // flippers
  part(g, sph(5, 3), 0x4a5a73, 0.19, 0.32, 0, 0.03, 0.14, 0.08);
  part(g, sph(5, 3), 0xffb347, -0.07, 0.02, 0.07, 0.06, 0.025, 0.09);  // feet
  part(g, sph(5, 3), 0xffb347, 0.07, 0.02, 0.07, 0.06, 0.025, 0.09);
  part(g, sph(4, 2), 0x20232e, -0.05, 0.6, 0.13, 0.02, 0.02, 0.02);
  part(g, sph(4, 2), 0x20232e, 0.05, 0.6, 0.13, 0.02, 0.02, 0.02);
  return g;
}
function duckling() {
  const g = new THREE.Group();
  part(g, sph(), 0xffe27a, 0, 0.17, 0, 0.17, 0.15, 0.2);               // body
  part(g, sph(), 0xffe27a, 0, 0.36, 0.1, 0.13, 0.13, 0.13);           // head
  part(g, sph(5, 3), 0xff9f4a, 0, 0.33, 0.24, 0.06, 0.025, 0.07);     // bill
  part(g, sph(5, 3), 0xffd14d, -0.16, 0.2, -0.02, 0.03, 0.09, 0.13);  // wings
  part(g, sph(5, 3), 0xffd14d, 0.16, 0.2, -0.02, 0.03, 0.09, 0.13);
  part(g, cone(5), 0xffe27a, 0, 0.24, -0.22, 0.05, 0.1, 0.05, { rx: -Math.PI / 2 });  // tail tuft
  part(g, sph(4, 2), 0x2f2f3a, -0.05, 0.38, 0.2, 0.02, 0.02, 0.02);
  part(g, sph(4, 2), 0x2f2f3a, 0.05, 0.38, 0.2, 0.02, 0.02, 0.02);
  return g;
}
function ladybug() {
  const g = new THREE.Group();
  part(g, sph(), 0xe8584f, 0, 0.1, 0, 0.15, 0.1, 0.18);                // shell
  part(g, sph(5, 3), 0x33323a, 0, 0.09, 0.17, 0.08, 0.06, 0.06);      // head
  part(g, sph(5, 3), 0x33323a, -0.06, 0.19, -0.04, 0.03, 0.015, 0.03);   // spots
  part(g, sph(5, 3), 0x33323a, 0.06, 0.19, 0.03, 0.03, 0.015, 0.03);
  part(g, sph(5, 3), 0x33323a, 0.05, 0.17, -0.09, 0.025, 0.015, 0.025);
  part(g, sph(5, 3), 0x33323a, -0.07, 0.17, 0.08, 0.025, 0.015, 0.025);
  return g;
}
function frog() {
  const g = new THREE.Group();
  part(g, sph(), 0x7fcf8a, 0, 0.14, 0, 0.2, 0.14, 0.22);               // body
  part(g, sph(), 0xe7f7d8, 0, 0.1, 0.06, 0.14, 0.09, 0.15);           // belly
  part(g, sph(5, 3), 0xffffff, -0.09, 0.3, 0.12, 0.07, 0.07, 0.07);   // eyes
  part(g, sph(5, 3), 0xffffff, 0.09, 0.3, 0.12, 0.07, 0.07, 0.07);
  part(g, sph(4, 2), 0x2f3a33, -0.09, 0.31, 0.18, 0.035, 0.035, 0.03);
  part(g, sph(4, 2), 0x2f3a33, 0.09, 0.31, 0.18, 0.035, 0.035, 0.03);
  part(g, sph(5, 3), 0x6bbd78, -0.17, 0.07, -0.1, 0.06, 0.07, 0.13);  // back legs
  part(g, sph(5, 3), 0x6bbd78, 0.17, 0.07, -0.1, 0.06, 0.07, 0.13);
  part(g, sph(5, 3), 0xf59aa8, 0, 0.12, 0.23, 0.05, 0.015, 0.03);     // little smile
  return g;
}

// roster: island walk circle, design, gait, speed range, scale
const ISL = {
  home: { x: 0, z: 0, w: ISLAND_R - 0.9 }, crystal: { x: I2.x, z: I2.z, w: I2_WALK }, winter: { x: I3.x, z: I3.z, w: I3_WALK },
  candy: { x: I4.x, z: I4.z, w: I4_WALK }, meadow: { x: I5.x, z: I5.z, w: I5_WALK }
};
const ROSTER = [
  { isl: "home", make: () => bunny(0xfbf3ea, 0xf3b6c4), gait: "hop", sp: [0.4, 0.6] },
  { isl: "home", make: () => bunny(0xd9c2a3, 0xf3b6c4), gait: "hop", sp: [0.4, 0.6] },
  { isl: "home", make: () => butterfly(0xffb3d1, 0xfff1a8), gait: "fly", sp: [0.5, 0.8] },
  { isl: "crystal", make: () => bird(0x9bb8e8, 0xf4f1fb, 0xffb86b), gait: "hop", sp: [0.4, 0.7] },
  { isl: "crystal", make: () => bird(0xc9a8e8, 0xf4f1fb, 0xffb86b), gait: "hop", sp: [0.4, 0.7] },
  { isl: "winter", make: penguin, gait: "waddle", sp: [0.4, 0.6] },
  { isl: "winter", make: penguin, gait: "waddle", sp: [0.4, 0.6] },
  { isl: "candy", make: duckling, gait: "waddle", sp: [0.4, 0.7] },
  { isl: "candy", make: ladybug, gait: "walk", sp: [0.4, 0.8], scale: 1.25 },
  { isl: "candy", make: ladybug, gait: "walk", sp: [0.4, 0.8], scale: 1.25 },
  { isl: "meadow", make: frog, gait: "hop", sp: [0.4, 0.7] },
  { isl: "meadow", make: frog, gait: "hop", sp: [0.4, 0.7] }
];

const land = [];
let rings = [], ends = [];

/** may an animal stand here? inside walk circle - 1.0, clear of obstacles, monument rings and bridge ends */
function spotOk(a, x, z) {
  const i = a.isl;
  if (Math.hypot(x - i.x, z - i.z) > i.w - 1.0) return false;
  if (!walkable(x, z)) return false;
  for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < 0.6 + o.r) return false;
  for (const r of rings) if (Math.hypot(x - r.x, z - r.z) < 2.8) return false;
  for (const e of ends) if (Math.hypot(x - e.x, z - e.z) < 2.0) return false;
  return true;
}
function pickSpot(a, near) {
  const i = a.isl;
  for (let n = 0; n < 40; n++) {
    const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (i.w - 1.0);
    const x = i.x + Math.cos(ang) * d, z = i.z + Math.sin(ang) * d;
    if (near && Math.hypot(x - near.x, z - near.z) > 6) continue;      // short strolls look calmer
    if (spotOk(a, x, z)) return { x, z };
  }
  return null;
}
const turn = (from, to, k) => { let d = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return from + d * k; };

/** Call after every island is built (so `obstacles` is complete). */
export function buildAnimals(monuments) {
  rings = (monuments || []).map(m => m.ring);
  ends = [];
  for (const b of BRIDGES) for (const s of [b.a, b.b]) ends.push({ x: b.ox + b.ux * s, z: b.oz + b.uz * s });
  for (const r of ROSTER) {
    const a = { isl: ISL[r.isl], gait: r.gait, sp: r.sp, g: bake(r.make()), phase: Math.random() * 6, pause: rnd(0, 3), tx: 0, tz: 0, moving: false, hover: rnd(0.8, 1.4), spd: 0.5 };
    const start = pickSpot(a); if (!start) continue;                   // no safe spot: leave this animal out
    a.x = start.x; a.z = start.z; a.g.position.set(a.x, groundY(a.x, a.z), a.z);
    a.g.rotation.y = Math.random() * 6.28;
    if (r.scale) a.g.scale.setScalar(r.scale);
    scene.add(a.g); land.push(a);
  }
  buildMarine();
}

function updateLand(t, dt, cam) {
  for (const a of land) {
    if (Math.hypot(a.x - cam.x, a.z - cam.z) > CULL) continue;         // far away: stay where it is
    const fly = a.gait === "fly";
    if (a.moving) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), step = a.spd * dt;
      if (d <= step) { a.moving = false; a.pause = fly ? rnd(0.2, 1) : rnd(1, 4); }
      else {
        const nx = a.x + dx / d * step, nz = a.z + dz / d * step;
        if (!spotOk(a, nx, nz)) { a.moving = false; a.pause = rnd(0.5, 1.5); }   // something in the way: stop and think
        else { a.x = nx; a.z = nz; a.phase += dt * (fly ? 9 : 7 + a.spd * 4); }
        a.g.rotation.y = turn(a.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 5));
      }
    } else {
      a.pause -= dt;
      if (a.pause <= 0) {
        const s = pickSpot(a, a);
        if (s) { a.tx = s.x; a.tz = s.z; a.spd = rnd(a.sp[0], a.sp[1]); a.moving = true; } else a.pause = 1;
      }
    }
    const k = a.moving ? 1 : 0;
    let y = groundY(a.x, a.z), rz = 0;
    if (a.gait === "hop") y += Math.abs(Math.sin(a.phase)) * 0.12 * k;
    else if (a.gait === "waddle") { rz = Math.sin(a.phase) * 0.16 * k; y += Math.abs(Math.sin(a.phase)) * 0.02 * k; }
    else if (a.gait === "walk") y += Math.abs(Math.sin(a.phase)) * 0.015 * k;
    else if (fly) {
      y += a.hover + Math.sin(t * 1.3 + a.hover * 5) * 0.2;
      const f = Math.sin(a.phase * 1.6 + t * 6) * 0.9;
      a.g.userData.wings[0].rotation.z = f; a.g.userData.wings[1].rotation.z = -f;
      rz = Math.sin(t * 2) * 0.08;
    }
    a.g.position.set(a.x, y, a.z);
    a.g.rotation.z = rz;
  }
}

// ---------------------------------------------------------------- marine and flying (T09)
const SEA = -0.9;
const ALL_ISL = [{ x: 0, z: 0, r: ISLAND_R }, I2, I3, I4, I5];
/** distance from (x,z) to the nearest island edge (negative = on an island) */
const edgeDist = (x, z) => Math.min(...ALL_ISL.map(i => Math.hypot(x - i.x, z - i.z) - i.r));
/** open water: ≥ margin from every island edge and no bridge deck within ~1.8 units */
function openWater(x, z, margin) {
  if (edgeDist(x, z) < margin) return false;
  for (const [dx, dz] of [[0, 0], [1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8]]) if (walkable(x + dx, z + dz)) return false;
  return true;
}

function dolphin() {
  const g = new THREE.Group();
  const S = 0x7f9fc2, B = 0xe9f0f6;
  part(g, sph(7, 5), S, 0, 0, 0, 0.26, 0.26, 0.8, { shadow: false });                 // body
  part(g, sph(6, 4), B, 0, -0.07, 0.1, 0.22, 0.16, 0.6, { shadow: false });           // pale belly
  part(g, sph(5, 3), S, 0, 0.0, 0.88, 0.14, 0.13, 0.28, { shadow: false });           // snout
  part(g, cone(4), S, 0, 0.33, -0.05, 0.1, 0.3, 0.2, { rx: -0.4, shadow: false });    // dorsal fin
  part(g, sph(5, 3), S, -0.28, -0.12, 0.3, 0.2, 0.04, 0.12, { rz: 0.5, shadow: false }); // flippers
  part(g, sph(5, 3), S, 0.28, -0.12, 0.3, 0.2, 0.04, 0.12, { rz: -0.5, shadow: false });
  part(g, sph(5, 3), S, 0, 0.02, -0.85, 0.12, 0.12, 0.3, { shadow: false });          // tail stock
  part(g, sph(5, 3), S, -0.17, 0.02, -1.15, 0.2, 0.03, 0.1, { shadow: false });       // flukes
  part(g, sph(5, 3), S, 0.17, 0.02, -1.15, 0.2, 0.03, 0.1, { shadow: false });
  g.rotation.order = "YXZ";
  return g;
}
function seagull() {
  const g = new THREE.Group();
  part(g, sph(6, 4), 0xffffff, 0, 0, 0, 0.14, 0.12, 0.34, { shadow: false });         // body
  part(g, sph(5, 3), 0xffffff, 0, 0.06, 0.32, 0.1, 0.1, 0.1, { shadow: false });      // head
  part(g, cone(4), 0xffb347, 0, 0.05, 0.46, 0.03, 0.09, 0.03, { rx: Math.PI / 2, shadow: false }); // beak
  part(g, cone(4), 0xe8edf2, 0, 0.01, -0.4, 0.08, 0.2, 0.02, { rx: -Math.PI / 2, shadow: false }); // tail
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.1, 0.04, 0.02);
    part(w, sph(5, 3), 0xdfe6ee, s * 0.33, 0, 0, 0.36, 0.025, 0.14, { shadow: false });
    g.add(w); wings.push(w);
  }
  g.userData.wings = wings;
  g.rotation.order = "YXZ";
  return g;
}
function turtle() {
  const g = new THREE.Group();
  part(g, sph(7, 5), 0x5f9a62, 0, 0, 0, 0.5, 0.2, 0.62, { shadow: false });            // shell
  part(g, sph(5, 3), 0x8bc48a, 0, -0.04, 0, 0.4, 0.12, 0.52, { shadow: false });       // lighter underside
  part(g, sph(5, 3), 0x9ccf94, 0, 0.0, 0.68, 0.13, 0.11, 0.15, { shadow: false });     // head
  part(g, cone(4), 0x9ccf94, 0, 0.0, -0.7, 0.07, 0.2, 0.07, { rx: -Math.PI / 2, shadow: false }); // tail
  const fl = [];
  for (const [x, z, s] of [[-0.45, 0.35, 1], [0.45, 0.35, 1], [-0.4, -0.35, 0.7], [0.4, -0.35, 0.7]]) {
    const p = new THREE.Group(); p.position.set(x, -0.04, z);
    part(p, sph(5, 3), 0x8bc48a, Math.sign(x) * 0.16 * s, 0, 0, 0.2 * s, 0.035, 0.1 * s, { shadow: false });
    g.add(p); fl.push(p);
  }
  g.userData.flippers = fl;
  g.rotation.order = "YXZ";
  return g;
}

const dolphins = [], gulls = [];
let turtleA = null, leapSpots = [];
const LEAP_L = 4.4, LEAP_H = 2.1, LEAP_T = 2.8, LEAP_Y0 = -1.5;

/** a leap arc is allowed when every point on it (and its sides) is open water ≥ 3 from an island edge, and it is seen from an island */
function leapOk(x, z, ang) {
  const dx = Math.sin(ang), dz = Math.cos(ang);
  for (let k = 0; k <= 8; k++) {
    const d = (k / 8 - 0.5) * LEAP_L;
    const px = x + dx * d, pz = z + dz * d;
    if (!openWater(px, pz, 3.2) || edgeDist(px, pz) > 8) return false;   // whole arc 3.2 to 8 from an island edge
  }
  return true;
}
function buildMarine() {
  leapSpots = [];
  for (let n = 0; n < 4000 && leapSpots.length < 24; n++) {
    const x = rnd(-45, 45), z = rnd(-50, 45), ang = Math.random() * 6.28;
    if (leapOk(x, z, ang)) leapSpots.push({ x, z, ang });
  }
  if (leapSpots.length) for (let i = 0; i < 2; i++) {
    const g = bake(dolphin()); g.visible = false; g.position.y = LEAP_Y0; scene.add(g);
    dolphins.push({ g, wait: rnd(2, 6) + i * 5, u: -1, spot: null });
  }
  // gulls: circles between islands
  const centres = [{ x: -9, z: 9 }, { x: 12, z: 19 }, { x: 11, z: -12 }];
  centres.forEach((c, i) => {
    const g = bake(seagull()); scene.add(g);
    gulls.push({ g, c, r: 4.2 + i * 1.3, y: 4.4 + i * 0.5, th: Math.random() * 6.28, w: (0.28 + i * 0.05) * (i % 2 ? -1 : 1), ph: i * 2, x: c.x, z: c.z });
    const b = gulls[gulls.length - 1];
    b.x = c.x + Math.cos(b.th) * b.r; b.z = c.z + Math.sin(b.th) * b.r;      // start on the circle, heading along it
    const sg = Math.sign(b.w);
    g.position.set(b.x, b.y, b.z); g.rotation.y = Math.atan2(-Math.sin(b.th) * sg, Math.cos(b.th) * sg);
  });
  // turtle: slow ellipse in open water, checked all the way round
  for (let n = 0; n < 600 && !turtleA; n++) {
    const c = { x: rnd(-40, 40), z: rnd(-45, 40) }, ra = 3, rb = 1.8, rot = Math.random() * 3.14;
    if (edgeDist(c.x, c.z) < 5.5 || edgeDist(c.x, c.z) > 12) continue;
    let ok = true;
    for (let k = 0; k < 24 && ok; k++) {
      const a = k / 24 * 6.283, ex = Math.cos(a) * ra, ez = Math.sin(a) * rb;
      ok = openWater(c.x + ex * Math.cos(rot) - ez * Math.sin(rot), c.z + ex * Math.sin(rot) + ez * Math.cos(rot), 2.5);
    }
    if (ok) {
      const g = bake(turtle()); scene.add(g);
      const th = Math.random() * 6.28, cr = Math.cos(rot), sr = Math.sin(rot);
      const ex = Math.cos(th) * ra, ez = Math.sin(th) * rb, vx = -Math.sin(th) * ra, vz = Math.cos(th) * rb;
      const x = c.x + ex * cr - ez * sr, z = c.z + ex * sr + ez * cr;
      g.position.set(x, SEA + 0.05, z);
      g.rotation.y = Math.atan2(vx * cr - vz * sr, vx * sr + vz * cr);
      turtleA = { g, c, ra, rb, rot, th, x, z };
    }
  }
}

function updateMarine(t, dt, cam) {
  for (const d of dolphins) {
    if (d.u < 0) {                                                       // under water, waiting
      d.wait -= dt;
      if (d.wait <= 0) {
        const near = leapSpots.filter(p => Math.hypot(p.x - cam.x, p.z - cam.z) <= CULL);
        if (!near.length) { d.wait = 1; continue; }                      // nobody to see it: stay hidden
        d.spot = near[Math.floor(Math.random() * near.length)]; d.u = 0; d.g.visible = true;
      }
      if (d.u < 0) continue;
    }
    d.u += dt / LEAP_T;
    const s = d.spot;
    if (d.u >= 1) { d.u = -1; d.wait = rnd(8, 15); d.g.visible = false; d.g.position.set(s.x, LEAP_Y0, s.z); continue; }
    const off = (d.u - 0.5) * LEAP_L, sn = Math.sin(Math.PI * d.u);
    d.g.position.set(s.x + Math.sin(s.ang) * off, LEAP_Y0 + LEAP_H * sn, s.z + Math.cos(s.ang) * off);
    d.g.rotation.y = s.ang;
    d.g.rotation.x = -Math.atan(LEAP_H * Math.PI * Math.cos(Math.PI * d.u) / LEAP_L);
  }
  for (const b of gulls) {
    if (Math.hypot(b.x - cam.x, b.z - cam.z) > CULL + 8) continue;       // far away: freeze (they fly high, so see a bit further)
    b.th += b.w * dt;
    b.x = b.c.x + Math.cos(b.th) * b.r; b.z = b.c.z + Math.sin(b.th) * b.r;
    const sgn = Math.sign(b.w);
    b.g.position.set(b.x, b.y + Math.sin(t * 0.6 + b.ph) * 0.3, b.z);
    b.g.rotation.y = Math.atan2(-Math.sin(b.th) * sgn, Math.cos(b.th) * sgn);
    b.g.rotation.z = -0.25 * sgn;                                        // gentle bank into the turn
    const f = Math.sin(t * 3.2 + b.ph) * 0.45;
    b.g.userData.wings[0].rotation.z = -f; b.g.userData.wings[1].rotation.z = f;
  }
  const tu = turtleA;
  if (tu && Math.hypot(tu.x - cam.x, tu.z - cam.z) <= CULL) {
    tu.th += 0.22 * dt;
    const ex = Math.cos(tu.th) * tu.ra, ez = Math.sin(tu.th) * tu.rb, cr = Math.cos(tu.rot), sr = Math.sin(tu.rot);
    tu.x = tu.c.x + ex * cr - ez * sr; tu.z = tu.c.z + ex * sr + ez * cr;
    const vx = -Math.sin(tu.th) * tu.ra, vz = Math.cos(tu.th) * tu.rb;
    tu.g.position.set(tu.x, SEA + 0.05 + Math.sin(t * 1.1) * 0.03, tu.z);
    tu.g.rotation.y = Math.atan2(vx * cr - vz * sr, vx * sr + vz * cr);
    const f = Math.sin(t * 1.6) * 0.35;
    const fl = tu.g.userData.flippers;
    fl[0].rotation.z = f; fl[1].rotation.z = -f; fl[2].rotation.z = -f * 0.6; fl[3].rotation.z = f * 0.6;
  }
}

export function updateAnimals(t, dt, camTarget) {
  updateLand(t, dt, camTarget);
  updateMarine(t, dt, camTarget);
}
