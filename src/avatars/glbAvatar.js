// Use a .glb model (in public/avatars/) as an avatar.
// The model's own "Idle" and "Walk" animations play, blending smoothly when the avatar starts/stops.
// Returns the same shape as the code-built avatars: { root, body, armL, armR, footL, footR, idle(t, moving) }
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map();
const load = url => {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => loader.load(url, res, undefined, rej)));
  return cache.get(url);
};

export function glbAvatar(url, { scale = 1 } = {}) {
  load(url).catch(() => {});                       // start downloading early
  return function build() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    let mixer = null, idleA = null, walkA = null, lastT = null, blend = 0;
    load(url).then(gltf => {
      const model = gltf.scene.clone(true);
      model.scale.setScalar(scale);
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      body.add(model);
      mixer = new THREE.AnimationMixer(model);
      const clip = n => THREE.AnimationClip.findByName(gltf.animations, n);
      if (clip("Idle")) { idleA = mixer.clipAction(clip("Idle")); idleA.play(); }
      if (clip("Walk")) { walkA = mixer.clipAction(clip("Walk")); walkA.play(); walkA.setEffectiveWeight(0); }
    }).catch(e => console.warn("avatar model could not load:", url, e));

    const dummy = () => new THREE.Object3D();      // limbs are animated inside the model itself
    return {
      root, body, armL: dummy(), armR: dummy(), footL: dummy(), footR: dummy(),
      idle(t, moving) {
        if (!mixer) return;
        const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
        blend += ((moving ? 1 : 0) - blend) * Math.min(1, dt * 8);
        if (walkA) walkA.setEffectiveWeight(blend);
        if (idleA) idleA.setEffectiveWeight(walkA ? 1 - blend : 1);
        mixer.update(dt);
      }
    };
  };
}
