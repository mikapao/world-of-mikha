// Gently arched wooden bridge with rope rails and lanterns.
import * as THREE from "three";
import { scene, mat, mesh } from "../engine.js";
import { archY } from "./layout.js";

export const lanterns = [];

/** build one bridge from layout.js (BR, BR3 …) */
export function buildBridge(BR, colors = [0xc89a6c, 0x9c7350]) {
  const bridge = new THREE.Group(); bridge.position.set(BR.ox, 0, BR.oz); bridge.rotation.y = Math.atan2(BR.ux, BR.uz); scene.add(bridge);
  const wood = mat(colors[0]), woodDark = mat(colors[1]);
  const s0 = BR.a - 0.6, s1 = BR.b + 0.6, n = Math.round((s1 - s0) / 0.55);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const s = s0 + (s1 - s0) * i / n, y = archY(BR, s);
    bridge.add(mesh(new THREE.BoxGeometry(2.3, 0.14, 0.46), i % 2 ? wood : woodDark, 0, y - 0.04, s));
    if (i % 3 !== 0) continue;
    const posts = [-1.2, 1.2].map(px => { bridge.add(mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), woodDark, px, y + 0.3, s)); return { px, y: y + 0.6, s }; });
    if (prev) posts.forEach((p, k) => {
      const q = prev[k], dz = p.s - q.s, dy = p.y - q.y, len = Math.hypot(dz, dy);
      const rail = mesh(new THREE.BoxGeometry(0.08, 0.08, len), wood, p.px, (p.y + q.y) / 2, (p.s + q.s) / 2);
      rail.rotation.x = -Math.atan2(dy, dz); bridge.add(rail);
    });
    if (i % 6 === 0) posts.forEach(p => {
      const l = mesh(new THREE.SphereGeometry(0.13, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc860, emissiveIntensity: 0.2 }), p.px, p.y + 0.12, p.s, false);
      bridge.add(l); lanterns.push(l);
    });
    prev = posts;
  }
}
