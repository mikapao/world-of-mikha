// Island 5 — the Firefly meadow: a quiet night meadow with willow trees, glowing mushrooms,
// tall grass, fireflies drifting everywhere and stars twinkling on the sea around it.
// It turns to night as the avatar crosses the bridge (see lighting.js).
// `isle5` exists right away so the Firefly Pond can be placed on it;
// call buildMeadowIsle() AFTER it so decorations stay out of the way.
import * as THREE from "three";
import { scene, mat, mesh, rnd, farFrom } from "../engine.js";
import { I5, I5_WALK, BR5, obstacles } from "./layout.js";
import { nightAmount } from "./lighting.js";

export const isle5 = new THREE.Group(); isle5.position.set(I5.x, 0, I5.z); scene.add(isle5);
const entry = { x: -BR5.ux * I5.r, z: -BR5.uz * I5.r };
/** spots (local to isle5) to keep free of decorations */
export const reservedMeadow = [entry, { x: entry.x * 0.55, z: entry.z * 0.55 }, { x: entry.x * 0.2, z: entry.z * 0.2 }];

const mushrooms = [], willows = [];
let flies = null, flyData = [], stars = null, starPh = [];
const FLY_N = 40, STAR_N = 160;

function spot(minR, gap, list) {
  let x, z, t = 0;
  do { const a = rnd(0, 6.28), r = rnd(minR, I5_WALK - 0.3); x = Math.cos(a) * r; z = Math.sin(a) * r; t++; }
  while (t < 60 && !(farFrom(x, z, reservedMeadow, 2.4) && farFrom(x, z, list, gap)));
  list.push({ x, z }); return { x, z };
}

export function buildMeadowIsle() {
  const top = mesh(new THREE.CylinderGeometry(I5.r, I5.r - 0.4, 0.8, 14), mat(0x5f9a68), 0, -0.4, 0); top.castShadow = false; isle5.add(top);
  isle5.add(mesh(new THREE.CylinderGeometry(I5.r - 0.4, I5.r - 2.6, 3, 14), mat(0x6b5a48), 0, -2.3, 0, false));
  const used = [];
  // willow trees with drooping branches
  for (let i = 0; i < 5; i++) {
    const p = spot(3, 2.6, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.8, 6), mat(0x6e5640), 0, 0.9, 0));
    const crown = mesh(new THREE.SphereGeometry(0.95, 9, 7), mat(0x4f8a5c), 0, 2.05, 0); crown.scale.y = 0.7; g.add(crown);
    const strands = new THREE.Group(); strands.position.y = 1.9; g.add(strands);
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * 6.28, s = mesh(new THREE.SphereGeometry(0.22, 6, 5), mat(k % 2 ? 0x5b9a68 : 0x477d55), Math.cos(a) * 0.85, -0.55, Math.sin(a) * 0.85);
      s.scale.set(0.8, 3, 0.8); strands.add(s);
    }
    g.userData = { strands, ph: rnd(0, 6) }; isle5.add(g); willows.push(g);
    obstacles.push({ x: I5.x + p.x, z: I5.z + p.z, r: 0.9 });
  }
  // glowing mushrooms
  const capCols = [0x5ff0ff, 0xc28bff, 0xff8fd0, 0x9dff9a];
  for (let i = 0; i < 12; i++) {
    const p = spot(1.6, 1.0, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const s = rnd(0.6, 1.1), col = capCols[i % 4];
    g.add(mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.45 * s, 6), mat(0xf1ece0), 0, 0.22 * s, 0, false));
    const cap = mesh(new THREE.SphereGeometry(0.26 * s, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.2, flatShading: true }), 0, 0.42 * s, 0, false);
    g.add(cap); g.userData = { cap, ph: rnd(0, 6) }; isle5.add(g); mushrooms.push(g);
  }
  // tall grass tufts and a few stones
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, 6.28), r = rnd(1, I5_WALK), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!farFrom(x, z, reservedMeadow.slice(3), 1.8)) continue;
    const tuft = new THREE.Group(); tuft.position.set(x, 0, z);
    for (let k = 0; k < 3; k++) { const b = mesh(new THREE.ConeGeometry(0.05, rnd(0.4, 0.7), 4), mat(0x72ad6f), (k - 1) * 0.07, 0.25, rnd(-0.05, 0.05), false); b.rotation.z = (k - 1) * 0.25; tuft.add(b); }
    isle5.add(tuft);
  }
  for (let i = 0; i < 5; i++) {
    const p = spot(2, 1.2, used);
    isle5.add(mesh(new THREE.DodecahedronGeometry(rnd(0.22, 0.4), 0), mat(0x8c8f99), p.x, 0.1, p.z));
  }
  // fireflies drifting over the whole meadow (glow more at night)
  const fg = new THREE.BufferGeometry(), fp = new Float32Array(FLY_N * 3), fc = new Float32Array(FLY_N * 3);
  for (let i = 0; i < FLY_N; i++) {
    const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * (I5.r - 0.5);
    flyData.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: rnd(0.4, 2.4), ph: rnd(0, 6), sp: rnd(0.3, 0.7) });
  }
  fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  fg.setAttribute("color", new THREE.BufferAttribute(fc, 3));
  flies = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  isle5.add(flies);
  // stars twinkling on the sea around the island
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(STAR_N * 3), sc = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const a = rnd(0, 6.28), r = rnd(I5.r + 1.5, 32);
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = -0.55; sp[i * 3 + 2] = Math.sin(a) * r; starPh.push(rnd(0, 6));
  }
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  isle5.add(stars);
}

export function updateMeadowIsle(t, dt) {
  const n = nightAmount();
  willows.forEach(w => { w.userData.strands.rotation.y = Math.sin(t * 0.4 + w.userData.ph) * 0.12; });
  mushrooms.forEach(m => { m.userData.cap.material.emissiveIntensity = 0.15 + n * (0.8 + Math.sin(t * 1.3 + m.userData.ph) * 0.3); });
  if (flies) {
    const p = flies.geometry.attributes.position.array, c = flies.geometry.attributes.color.array;
    flyData.forEach((f, i) => {
      p[i * 3] = f.x + Math.sin(t * f.sp + f.ph) * 0.9;
      p[i * 3 + 1] = f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.35;
      p[i * 3 + 2] = f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.9;
      const glow = (0.15 + n * 0.85) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 1.8 + f.ph * 3)));
      c[i * 3] = 0.85 * glow; c[i * 3 + 1] = 1.0 * glow; c[i * 3 + 2] = 0.45 * glow;
    });
    flies.geometry.attributes.position.needsUpdate = true; flies.geometry.attributes.color.needsUpdate = true;
  }
  if (stars) {
    const c = stars.geometry.attributes.color.array;
    for (let i = 0; i < STAR_N; i++) { const v = n * (0.4 + 0.6 * Math.max(0, Math.sin(t * 1.1 + starPh[i]))); c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v * 1.1; }
    stars.geometry.attributes.color.needsUpdate = true;
  }
}
