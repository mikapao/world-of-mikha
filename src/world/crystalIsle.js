// Island 2 — Crystal Isle: purple/magenta grass, rocky spires, glowing crystals, floating motes.
// `isle2` exists right away so monuments can be placed on it;
// call buildCrystalIsle() AFTER those monuments so crystals stay out of their way.
import * as THREE from "three";
import { scene, mat, mesh, rnd, farFrom } from "../engine.js";
import { I2, I2_WALK, BR, obstacles } from "./layout.js";

export const isle2 = new THREE.Group(); isle2.position.set(I2.x, 0, I2.z); scene.add(isle2);
/** spots (local to isle2) to keep free of crystals */
export const reservedIsle = [{ x: -BR.ux * I2.r, z: -BR.uz * I2.r }, { x: -BR.ux * 3, z: -BR.uz * 3 }];

export const crystals = [], crystalLights = [], motes = [];
const crystalCols = [0x6ff0ff, 0xff7fd0, 0xffe36b, 0xa98bff, 0x7dffb5];

export function buildCrystalIsle() {
  const top = mesh(new THREE.CylinderGeometry(I2.r, I2.r - 0.4, 0.8, 6), mat(0xc565d6), 0, -0.4, 0); top.castShadow = false; isle2.add(top);
  isle2.add(mesh(new THREE.CylinderGeometry(I2.r - 0.4, I2.r - 2.6, 3, 6), mat(0x6e4a8e), 0, -2.3, 0, false));
  for (let i = 0; i < 10; i++) {   // magenta grass patches
    const a = rnd(0, 6.28), r = rnd(1, I2_WALK);
    const p = mesh(new THREE.CircleGeometry(rnd(0.5, 1.1), 6), mat(0xe07ad6), Math.cos(a) * r, 0.01, Math.sin(a) * r, false);
    p.rotation.x = -Math.PI / 2; p.receiveShadow = true; isle2.add(p);
  }
  for (let i = 0; i < 9; i++) {    // rocky rim spires (bridge entry kept open)
    const a = i / 9 * 6.28 + 0.3, r = I2.r - 0.7, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x + BR.ux * I2.r, z + BR.uz * I2.r) < 3) continue;
    const h = rnd(1, 2.4), rk = mesh(new THREE.CylinderGeometry(rnd(0.35, 0.6), rnd(0.7, 1), h, 5), mat(0x8a68b0), x, h / 2 - 0.1, z);
    rk.rotation.y = rnd(0, 3); isle2.add(rk);
  }
  for (let i = 0; i < 11; i++) {   // glowing crystal clusters
    let x, z, t = 0;
    do { const a = rnd(0, 6.28), r = rnd(2, I2_WALK - 0.2); x = Math.cos(a) * r; z = Math.sin(a) * r; t++; }
    while (t < 50 && !(farFrom(x, z, reservedIsle, 2.6) && farFrom(x, z, crystals.map(c => c.p), 1.6)));
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const col = crystalCols[i % crystalCols.length];
    for (let k = 0; k < 3; k++) {
      const h = rnd(0.5, 1.1) * (k ? 0.7 : 1);
      const c = mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35,
        flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 }), (k - 1) * 0.22, h * 0.55, (k % 2) * 0.18 - 0.08);
      c.scale.set(1, h * 3, 1); c.rotation.z = (k - 1) * 0.35; g.add(c);
    }
    g.userData.ph = rnd(0, 6); isle2.add(g); crystals.push({ g, p: { x, z } });
    obstacles.push({ x: I2.x + x, z: I2.z + z, r: 0.55 });
  }
  [[0x6ff0ff, -3, 2], [0xff7fd0, 3, 1], [0xffe36b, -1, -4]].forEach(([c, x, z]) => {
    const l = new THREE.PointLight(c, 0, 9); l.position.set(x, 1.5, z); isle2.add(l); crystalLights.push(l);
  });
  for (let i = 0; i < 20; i++) {
    const m = mesh(new THREE.SphereGeometry(0.05, 5, 4), new THREE.MeshBasicMaterial({ color: crystalCols[i % 5], transparent: true, opacity: 0 }),
      rnd(-5, 5), rnd(0.4, 2.5), rnd(-5, 5), false);
    m.userData.ph = rnd(0, 6); isle2.add(m); motes.push(m);
  }
}

export function updateCrystalIsle(t) {
  crystals.forEach(c => c.g.rotation.y = Math.sin(t * 0.4 + c.g.userData.ph) * 0.15);
}
