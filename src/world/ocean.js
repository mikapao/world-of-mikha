// Low-poly rolling ocean with shore foam and little sea sparkles.
import * as THREE from "three";
import { scene, mat, mesh, rnd } from "../engine.js";
import { ISLAND_R, I2, I3, I4, I5 } from "./layout.js";

const geo = new THREE.PlaneGeometry(140, 140, 70, 70);
geo.rotateX(-Math.PI / 2);
const base = Float32Array.from(geo.attributes.position.array);
export const ocean = mesh(geo, mat(0x3f9ab6, { roughness: 0.45, metalness: 0.05 }), 0, -0.9, 0, false);
ocean.receiveShadow = true; scene.add(ocean);

const foamMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
const foams = [];
[0, 1].forEach(k => {
  const f = mesh(new THREE.TorusGeometry(ISLAND_R + 0.15, 0.14, 4, 40), foamMat(), 0, -0.78, 0, false);
  f.rotation.x = Math.PI / 2; f.userData.k = k; scene.add(f); foams.push(f);
  const h = mesh(new THREE.TorusGeometry(I2.r + 0.1, 0.14, 4, 6), foamMat(), I2.x, -0.78, I2.z, false);
  h.rotation.x = Math.PI / 2; h.rotation.z = Math.PI / 2; h.userData.k = k; scene.add(h); foams.push(h);
  const w = mesh(new THREE.TorusGeometry(I3.r + 0.15, 0.14, 4, 12), foamMat(), I3.x, -0.78, I3.z, false);
  w.rotation.x = Math.PI / 2; w.rotation.z = Math.PI / 2; w.userData.k = k; scene.add(w); foams.push(w);
  const c = mesh(new THREE.TorusGeometry(I4.r + 0.15, 0.14, 4, 14), foamMat(), I4.x, -0.78, I4.z, false);
  c.rotation.x = Math.PI / 2; c.rotation.z = Math.PI / 2; c.userData.k = k; scene.add(c); foams.push(c);
  const n = mesh(new THREE.TorusGeometry(I5.r + 0.15, 0.14, 4, 14), foamMat(), I5.x, -0.78, I5.z, false);
  n.rotation.x = Math.PI / 2; n.rotation.z = Math.PI / 2; n.userData.k = k; scene.add(n); foams.push(n);
});

export const seaGlints = [];
for (let i = 0; i < 24; i++) {
  const a = rnd(0, Math.PI * 2), r = rnd(ISLAND_R + 2, 30);
  const g = mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    Math.cos(a) * r, -0.6, Math.sin(a) * r, false);
  g.rotation.x = -Math.PI / 2; g.userData.ph = rnd(0, 6); seaGlints.push(g); scene.add(g);
}

export function updateOcean(t) {
  const p = geo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = base[i], z = base[i + 2];
    p[i + 1] = Math.sin(x * 0.35 + t * 1.1) * 0.12 + Math.cos(z * 0.3 + t * 0.8) * 0.12 + Math.sin((x + z) * 0.6 + t * 1.7) * 0.05;
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  for (const f of foams) { const ph = (t * 0.35 + f.userData.k * 0.5) % 1; f.scale.setScalar(1 + ph * 0.09); f.material.opacity = 0.65 * (1 - ph); }
  for (const g of seaGlints) g.material.opacity = Math.max(0, Math.sin(t * 1.3 + g.userData.ph)) * 0.55;
}
