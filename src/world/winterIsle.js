// Island 3 — Winter Wonderland: snowy ground, icy cliffs, snow-capped pines, an igloo,
// a frozen pond, glittering ice crystals and gently falling snow.
// `isle3` exists right away so monuments can be placed on it;
// call buildWinterIsle() AFTER those monuments so trees stay out of their way.
import * as THREE from "three";
import { scene, mat, mesh, rnd, farFrom } from "../engine.js";
import { I3, I3_WALK, BR3, obstacles } from "./layout.js";
import { winterAmount } from "./lighting.js";

export const isle3 = new THREE.Group(); isle3.position.set(I3.x, 0, I3.z); scene.add(isle3);
/** where the bridge arrives, in isle3's local coordinates */
const entry = { x: -BR3.ux * I3.r, z: -BR3.uz * I3.r };
/** spots (local to isle3) to keep free of trees */
export const reservedWinter = [entry, { x: entry.x * 0.55, z: entry.z * 0.55 }, { x: entry.x * 0.2, z: entry.z * 0.2 }];

const pines = [], glints = [];
let snow = null, snowBase = null;
const SNOW_N = 420, SNOW_H = 9;

export function buildWinterIsle() {
  const top = mesh(new THREE.CylinderGeometry(I3.r, I3.r - 0.4, 0.8, 12), mat(0xe6edf4), 0, -0.4, 0); top.castShadow = false; isle3.add(top);
  isle3.add(mesh(new THREE.CylinderGeometry(I3.r - 0.4, I3.r - 2.8, 3, 12), mat(0xa9c8e0), 0, -2.3, 0, false));
  // icy blue rim chunks
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * 6.28 + 0.2, x = Math.cos(a) * (I3.r - 0.15), z = Math.sin(a) * (I3.r - 0.15);
    if (Math.hypot(x - entry.x, z - entry.z) < 2.6) continue;
    const c = mesh(new THREE.DodecahedronGeometry(rnd(0.3, 0.55), 0), mat(0xcfe6f7, { roughness: 0.3 }), x, rnd(-0.1, 0.15), z); isle3.add(c);
  }
  // soft snow drifts
  for (let i = 0; i < 12; i++) {
    const a = rnd(0, 6.28), r = rnd(1.5, I3_WALK);
    const d = mesh(new THREE.SphereGeometry(rnd(0.4, 0.8), 8, 5), mat(0xeef3f8), Math.cos(a) * r, -0.1, Math.sin(a) * r, false);
    d.scale.y = 0.35; d.receiveShadow = true; isle3.add(d);
  }
  // frozen pond (walkable, just pretty)
  const pond = mesh(new THREE.CircleGeometry(1.6, 14), mat(0xbfe3f5, { roughness: 0.15, metalness: 0.1 }), 3.2, 0.02, 2.6, false);
  pond.rotation.x = -Math.PI / 2; pond.receiveShadow = true; isle3.add(pond);
  reservedWinter.push({ x: 3.2, z: 2.6 });
  // igloo
  const igloo = new THREE.Group(); igloo.position.set(-3.6, 0, 3.4); igloo.rotation.y = 0.6; isle3.add(igloo);
  const dome = mesh(new THREE.SphereGeometry(1.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf7fbff), 0, 0, 0); igloo.add(dome);
  igloo.add(mesh(new THREE.BoxGeometry(0.85, 0.7, 0.6), mat(0xeaf3fb), 0, 0.35, 1.05));                  // tunnel
  igloo.add(mesh(new THREE.CircleGeometry(0.3, 10), mat(0x7f9bb5), 0, 0.32, 1.36, false));               // doorway
  obstacles.push({ x: I3.x - 3.6, z: I3.z + 3.4, r: 1.3 });
  reservedWinter.push({ x: -3.6, z: 3.4 });
  // snow-capped pines
  const greens = [0x3f7a5a, 0x4a8a66, 0x366b50];
  for (let i = 0; i < 12; i++) {
    let x, z, t = 0;
    do { const a = rnd(0, 6.28), r = rnd(2.2, I3_WALK - 0.4); x = Math.cos(a) * r; z = Math.sin(a) * r; t++; }
    while (t < 50 && !(farFrom(x, z, reservedWinter, 2.4) && farFrom(x, z, pines.map(p => p.position), 1.7)));
    const s = rnd(0.75, 1.2), g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.5 * s, 5), mat(0x8a6a4f), 0, 0.25 * s, 0));
    [[0.85, 0.75], [0.65, 1.25], [0.42, 1.7]].forEach(([rr, y], k) => {
      g.add(mesh(new THREE.ConeGeometry(rr * s, 0.75 * s, 7), mat(greens[(i + k) % 3]), 0, y * s, 0));
      g.add(mesh(new THREE.ConeGeometry(rr * s * 0.62, 0.32 * s, 7), mat(0xffffff), 0, (y + 0.24) * s, 0, false));
    });
    g.userData.ph = rnd(0, 6); isle3.add(g); pines.push(g);
    obstacles.push({ x: I3.x + x, z: I3.z + z, r: 0.5 * s });
  }
  // glittering ice crystals in the snow
  for (let i = 0; i < 14; i++) {
    const a = rnd(0, 6.28), r = rnd(1, I3_WALK);
    const c = mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: 0x9fdcff, emissiveIntensity: 0.4, flatShading: true }),
      Math.cos(a) * r, 0.1, Math.sin(a) * r, false);
    c.scale.y = 1.8; c.userData.ph = rnd(0, 6); isle3.add(c); glints.push(c);
  }
  // falling snow
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * (I3.r + 3);
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rnd(0, SNOW_H); pos[i * 3 + 2] = Math.sin(a) * r; }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  snowBase = Float32Array.from(pos);
  snow = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.5, depthWrite: false }));
  isle3.add(snow);
}

export function updateWinterIsle(t, dt) {
  const k = winterAmount();
  pines.forEach(p => p.rotation.z = Math.sin(t * 0.7 + p.userData.ph) * 0.015);
  glints.forEach(c => c.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 2 + c.userData.ph)) * 0.9);
  if (!snow) return;
  snow.material.opacity = 0.45 + k * 0.45;
  const p = snow.geometry.attributes.position.array;
  for (let i = 0; i < SNOW_N; i++) {
    let y = p[i * 3 + 1] - dt * (0.6 + (i % 7) * 0.08);
    if (y < 0) y += SNOW_H;
    p[i * 3 + 1] = y;
    p[i * 3] = snowBase[i * 3] + Math.sin(t * 0.8 + i) * 0.3;
  }
  snow.geometry.attributes.position.needsUpdate = true;
}
