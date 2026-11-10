// Island 4 — Candy & Dessert island: a giant layer cake floating in a strawberry-milk sea,
// with lollipop trees, cotton-candy trees, candy canes, cupcakes, donuts, gumdrops and sprinkles.
// `isle4` exists right away so the monument can be placed on it;
// call buildCandyIsle() AFTER it so decorations stay out of the way.
import * as THREE from "three";
import { scene, mat, mesh, rnd, farFrom } from "../engine.js";
import { I4, I4_WALK, BR4, obstacles } from "./layout.js";

export const isle4 = new THREE.Group(); isle4.position.set(I4.x, 0, I4.z); scene.add(isle4);
const entry = { x: -BR4.ux * I4.r, z: -BR4.uz * I4.r };
/** spots (local to isle4) to keep free of decorations */
export const reservedCandy = [entry, { x: entry.x * 0.55, z: entry.z * 0.55 }, { x: entry.x * 0.2, z: entry.z * 0.2 }];

const PASTELS = [0xff8fb8, 0x9ad8ff, 0xffe27a, 0xb8f2a6, 0xd3a8ff, 0xffb27a];
const bobbers = [];

export function stripeTexture(c1 = "#ffffff", c2 = "#ff4f6a", n = 4) {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  g.fillStyle = c1; g.fillRect(0, 0, 64, 64); g.fillStyle = c2;
  for (let i = -n; i < n * 2; i++) { g.beginPath(); const x = i * 64 / n; g.moveTo(x, 0); g.lineTo(x + 32 / n, 0); g.lineTo(x + 32 / n - 64, 64); g.lineTo(x - 64, 64); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function spot(minR, gap, list) {
  let x, z, t = 0;
  do { const a = rnd(0, 6.28), r = rnd(minR, I4_WALK - 0.3); x = Math.cos(a) * r; z = Math.sin(a) * r; t++; }
  while (t < 60 && !(farFrom(x, z, reservedCandy, 2.3) && farFrom(x, z, list, gap)));
  list.push({ x, z }); return { x, z };
}

export function buildCandyIsle() {
  // the cake: pink frosting top, sponge layer, cream line, chocolate base
  const top = mesh(new THREE.CylinderGeometry(I4.r, I4.r, 0.5, 20), mat(0xffc4dd), 0, -0.25, 0); top.castShadow = false; isle4.add(top);
  isle4.add(mesh(new THREE.CylinderGeometry(I4.r - 0.15, I4.r - 0.15, 0.9, 20), mat(0xf6d3a1), 0, -0.95, 0, false));
  isle4.add(mesh(new THREE.CylinderGeometry(I4.r - 0.1, I4.r - 0.1, 0.18, 20), mat(0xfff6ea), 0, -1.45, 0, false));
  isle4.add(mesh(new THREE.CylinderGeometry(I4.r - 0.2, I4.r - 2.2, 1.6, 20), mat(0x8a5a44), 0, -2.3, 0, false));
  // frosting drips around the edge
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * 6.28, d = mesh(new THREE.SphereGeometry(rnd(0.22, 0.34), 7, 6), mat(0xffc4dd), Math.cos(a) * (I4.r - 0.02), -0.55, Math.sin(a) * (I4.r - 0.02), false);
    d.scale.set(1, rnd(1.4, 2.4), 1); isle4.add(d);
  }
  const used = [];
  // lollipop trees
  for (let i = 0; i < 6; i++) {
    const p = spot(2.3, 1.8, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), mat(0xffffff), 0, 0.75, 0));
    const ball = mesh(new THREE.SphereGeometry(0.48, 10, 8), mat(PASTELS[i % 6], { roughness: 0.35 }), 0, 1.75, 0); g.add(ball);
    const band = mesh(new THREE.TorusGeometry(0.48, 0.06, 6, 18), mat(0xffffff), 0, 1.75, 0, false); band.rotation.y = i; g.add(band);
    isle4.add(g); obstacles.push({ x: I4.x + p.x, z: I4.z + p.z, r: 0.45 });
  }
  // cotton-candy trees (fluffy, gently bobbing)
  for (let i = 0; i < 5; i++) {
    const p = spot(2.3, 1.8, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.2, 6), mat(0xf3e6d6), 0, 0.6, 0));
    const col = [0xffb3d9, 0xa8dcff, 0xd9c2ff][i % 3], puff = new THREE.Group(); puff.position.y = 1.6; g.add(puff);
    for (let k = 0; k < 5; k++) puff.add(mesh(new THREE.IcosahedronGeometry(rnd(0.32, 0.5), 1), mat(col), rnd(-0.35, 0.35), rnd(-0.15, 0.35), rnd(-0.35, 0.35)));
    puff.userData.ph = rnd(0, 6); bobbers.push(puff);
    isle4.add(g); obstacles.push({ x: I4.x + p.x, z: I4.z + p.z, r: 0.5 });
  }
  // candy canes
  const caneMat = new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const p = spot(2.5, 1.6, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = rnd(0, 6.28);
    const tex = caneMat; tex.map.repeat.set(1, 3);
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.6, 10), tex, 0, 0.8, 0));
    const hook = mesh(new THREE.TorusGeometry(0.28, 0.11, 8, 12, Math.PI), tex, 0.28, 1.6, 0); g.add(hook);
    isle4.add(g); obstacles.push({ x: I4.x + p.x, z: I4.z + p.z, r: 0.35 });
  }
  // cupcakes
  for (let i = 0; i < 4; i++) {
    const p = spot(2, 1.5, used), g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.45, 10), mat(PASTELS[(i + 2) % 6]), 0, 0.22, 0));
    const fr = mesh(new THREE.SphereGeometry(0.46, 10, 8), mat(0xfff3f8), 0, 0.55, 0); fr.scale.y = 0.75; g.add(fr);
    g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(0xe8384f, { roughness: 0.3 }), 0, 0.95, 0, false));
    isle4.add(g); obstacles.push({ x: I4.x + p.x, z: I4.z + p.z, r: 0.45 });
  }
  // donuts lying in the frosting
  for (let i = 0; i < 4; i++) {
    const p = spot(1.5, 1.3, used);
    const d = mesh(new THREE.TorusGeometry(0.32, 0.15, 8, 16), mat([0xf2b38a, 0xffa0c8, 0x8a5a44, 0xffe27a][i]), p.x, 0.15, p.z);
    d.rotation.x = Math.PI / 2; isle4.add(d);
  }
  // gumdrops
  for (let i = 0; i < 14; i++) {
    const a = rnd(0, 6.28), r = rnd(1, I4_WALK);
    const gd = mesh(new THREE.SphereGeometry(0.17, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(PASTELS[i % 6], { roughness: 0.3 }), Math.cos(a) * r, 0, Math.sin(a) * r, false);
    gd.scale.y = 1.3; isle4.add(gd);
  }
  // sprinkles
  for (let i = 0; i < 70; i++) {
    const a = rnd(0, 6.28), r = rnd(0.5, I4.r - 0.4);
    const s = mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), mat(PASTELS[i % 6]), Math.cos(a) * r, 0.02, Math.sin(a) * r, false);
    s.rotation.y = rnd(0, 6.28); isle4.add(s);
  }
}

export function updateCandyIsle(t) {
  bobbers.forEach(b => { b.position.y = 1.6 + Math.sin(t * 1.2 + b.userData.ph) * 0.06; b.rotation.y = Math.sin(t * 0.5 + b.userData.ph) * 0.2; });
}
