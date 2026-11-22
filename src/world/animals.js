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
    const a = { isl: ISL[r.isl], gait: r.gait, sp: r.sp, g: r.make(), phase: Math.random() * 6, pause: rnd(0, 3), tx: 0, tz: 0, moving: false, hover: rnd(0.8, 1.4), spd: 0.5 };
    const start = pickSpot(a); if (!start) continue;                   // no safe spot: leave this animal out
    a.x = start.x; a.z = start.z; a.g.position.set(a.x, groundY(a.x, a.z), a.z);
    a.g.rotation.y = Math.random() * 6.28;
    if (r.scale) a.g.scale.setScalar(r.scale);
    scene.add(a.g); land.push(a);
  }
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

// ---------------------------------------------------------------- marine and flying (T09) — added here later

export function updateAnimals(t, dt, camTarget) {
  updateLand(t, dt, camTarget);
}
