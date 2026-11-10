// Lighting moods: sunny day on the home island, dusk on Crystal Isle, cool snow-light on
// Winter Wonderland, warm pastel pink on the Candy island, moonlit night on the Firefly meadow.
// Blends smoothly as the avatar crosses a bridge. Everything is scaled by the parent-corner
// Brightness setting so the game stays easy on the eyes.
import * as THREE from "three";
import { scene, hemi, sun } from "../engine.js";
import { I2, I3, I4, I5 } from "./layout.js";
import { ocean, seaGlints } from "./ocean.js";
import { lanterns } from "./bridge.js";
import { crystals, crystalLights, motes } from "./crystalIsle.js";
import { getBrightness } from "../settings.js";

const C = h => new THREE.Color(h);
const DAY    = { bg: C(0x3f9ab6), sea: C(0x3f9ab6), sky: C(0xf4f1ea), gnd: C(0x8db38a), sun: C(0xfff0dc), hemiI: 0.6,  sunI: 0.62, sunY: 22 };
const DUSK   = { bg: C(0x2c2b5c), sea: C(0x3b3b75), sky: C(0xb08ed6), gnd: C(0x47356a), sun: C(0xf58c62), hemiI: 0.45, sunI: 0.48, sunY: 8 };
const WINTER = { bg: C(0x7fa6c2), sea: C(0x5c92b3), sky: C(0xe6eef6), gnd: C(0xc3d2df), sun: C(0xe4ecf8), hemiI: 0.6,  sunI: 0.48, sunY: 18 };
const CANDY  = { bg: C(0xd894b3), sea: C(0xd88cad), sky: C(0xf6e6ee), gnd: C(0xf0c3d6), sun: C(0xfbe9da), hemiI: 0.62, sunI: 0.55, sunY: 20 };
const NIGHT  = { bg: C(0x0e1530), sea: C(0x16224a), sky: C(0x5d6fb0), gnd: C(0x1c2240), sun: C(0xa9bcff), hemiI: 0.42, sunI: 0.32, sunY: 14 };
const MOODS = [DUSK, WINTER, CANDY, NIGHT];
const amt = [0, 0, 0, 0];                        // how much of each mood (0…1)
const ISL = [I2, I3, I4, I5];

export const duskAmount = () => amt[0];
export const winterAmount = () => amt[1];
export const nightAmount = () => amt[3];

const mixNum = key => MOODS.reduce((v, m, i) => v + (m[key] - DAY[key]) * amt[i], DAY[key]);
const mixCol = (target, key) => { target.copy(DAY[key]); MOODS.forEach((m, i) => { if (amt[i] > 0.001) target.lerp(m[key], amt[i]); }); return target; };
export const sunHeight = () => mixNum("sunY");
const near = (pos, I) => Math.min(1, Math.max(0, (I.r + 3 - Math.hypot(pos.x - I.x, pos.z - I.z)) / 4));

export function updateLighting(dt, t, pos) {
  // each mood starts on the bridge and is full on its island
  ISL.forEach((I, i) => { amt[i] += (near(pos, I) - amt[i]) * Math.min(1, dt * 1.2); });
  const b = getBrightness();
  mixCol(scene.background, "bg").multiplyScalar(0.55 + 0.45 * b);
  mixCol(ocean.material.color, "sea");
  mixCol(hemi.color, "sky"); mixCol(hemi.groundColor, "gnd"); hemi.intensity = mixNum("hemiI") * b * 1.15;
  mixCol(sun.color, "sun"); sun.intensity = mixNum("sunI") * b * 1.15;

  const k = amt[0], glow = Math.max(k, amt[3]);
  crystals.forEach(c => c.g.children.forEach(m => m.material.emissiveIntensity = 0.3 + k * 0.9 + Math.sin(t * 1.5 + c.g.userData.ph) * 0.15 * (0.4 + k)));
  crystalLights.forEach((l, i) => l.intensity = k * (1.1 + Math.sin(t * 1.2 + i) * 0.2));
  lanterns.forEach(l => l.material.emissiveIntensity = 0.2 + glow * 1.1);
  motes.forEach(m => { m.material.opacity = k * (0.5 + Math.sin(t * 2 + m.userData.ph) * 0.4); m.position.y += Math.sin(t + m.userData.ph) * 0.002; });
  seaGlints.forEach(g => { g.material.color.setHSL(0.6, k * 0.6, 1 - k * 0.15); });
}
