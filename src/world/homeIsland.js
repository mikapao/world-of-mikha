// Island 1 — the sunny home island: grass, pastel trees, flowers, rocks, clouds.
// Call buildHomeIsland() AFTER the monuments on this island are created,
// so trees stay out of their way.
import * as THREE from "three";
import { scene, mat, mesh, rnd, farFrom } from "../engine.js";
import { ISLAND_R, obstacles, reserved } from "./layout.js";

const trees = [], clouds = [];

export function buildHomeIsland() {
  const grass = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.6, 0.8, 10), mat(0xa8dc8c), 0, -0.4, 0);
  grass.castShadow = false; scene.add(grass);
  scene.add(mesh(new THREE.CylinderGeometry(ISLAND_R - 0.6, ISLAND_R - 3, 2.2, 10), mat(0xd9b48c), 0, -1.9, 0, false));

  const leafColors = [0x8fd19e, 0x79c48b, 0xf5b8cf, 0xb9a7ec, 0x9fd8c8];
  for (let i = 0; i < 20; i++) {
    let x, z, t = 0;
    do { const a = rnd(0, Math.PI * 2), r = rnd(3.5, ISLAND_R - 1.3); x = Math.cos(a) * r; z = Math.sin(a) * r; t++; }
    while (t < 40 && !(farFrom(x, z, reserved, 3.6) && farFrom(x, z, obstacles, 1.9)));
    const s = rnd(0.8, 1.25), g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 1 * s, 6), mat(0xb08a68), 0, 0.5 * s, 0));
    const leaf = mesh(new THREE.IcosahedronGeometry(0.85 * s, 0), mat(leafColors[i % leafColors.length]), 0, 1.45 * s, 0);
    g.add(leaf); g.position.set(x, 0, z); g.userData.leaf = leaf; g.userData.ph = rnd(0, 6);
    scene.add(g); trees.push(g); obstacles.push({ x, z, r: 0.55 * s });
  }
  const flowerCols = [0xffffff, 0xf7a8c0, 0xffe08a, 0xc7b5f5];
  for (let i = 0; i < 45; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(1.5, ISLAND_R - 0.6);
    scene.add(mesh(new THREE.SphereGeometry(0.12, 5, 4), mat(flowerCols[i % 4]), Math.cos(a) * r, 0.12, Math.sin(a) * r, false));
  }
  for (let i = 0; i < 6; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(4, ISLAND_R - 1), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!farFrom(x, z, reserved, 3)) continue;
    scene.add(mesh(new THREE.DodecahedronGeometry(rnd(0.25, 0.45), 0), mat(0xc9cfd6), x, 0.15, z));
  }
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) c.add(mesh(new THREE.IcosahedronGeometry(rnd(0.7, 1.1), 0), mat(0xffffff), j - 1, rnd(-0.2, 0.2), rnd(-0.3, 0.3), false));
    c.position.set(rnd(-25, 25), rnd(7, 10), rnd(-25, 25)); clouds.push(c); scene.add(c);
  }
}

export function updateHomeIsland(t, dt) {
  for (const g of trees) g.userData.leaf.rotation.y = Math.sin(t * 0.6 + g.userData.ph) * 0.08;
  for (const c of clouds) { c.position.x += dt * 0.4; if (c.position.x > 30) c.position.x = -30; }
}
