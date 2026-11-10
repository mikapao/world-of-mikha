// Renderer, scene, camera, lights and small 3D helpers shared by every module.
import * as THREE from "three";

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3f9ab6);

const VIEW = 15;
export const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
export const camOffset = new THREE.Vector3(20, 20, 20);   // fixed isometric angle
function resize() {
  const a = innerWidth / innerHeight, v = a < 1 ? VIEW * 1.25 : VIEW;
  cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v / 2; cam.bottom = -v / 2;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener("resize", resize); resize();

export const hemi = new THREE.HemisphereLight(0xffffff, 0x9cc49a, 0.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff4e0, 0.6);
sun.position.set(12, 22, 6); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
scene.add(sun); scene.add(sun.target);

/** Soft, flat-shaded low-poly material */
export const mat = (c, o = {}) =>
  new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9, metalness: 0 }, o));

/** Make a mesh at a position (casts + receives shadow unless shadow=false) */
export function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z);
  if (shadow) { o.castShadow = true; o.receiveShadow = true; }
  return o;
}

export const rnd = (a, b) => a + Math.random() * (b - a);
export const farFrom = (x, z, list, d) => list.every(p => Math.hypot(p.x - x, p.z - z) > d);
