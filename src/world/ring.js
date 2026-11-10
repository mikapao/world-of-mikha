// The glowing circle in front of every monument — stand in it to see the Enter button.
// Red & softly pulsing normally; when the avatar steps in it flashes gold (with a whoosh)
// and keeps pulsing gold until the avatar walks away.
import * as THREE from "three";
import { mat, mesh } from "../engine.js";

const RED = { ring: 0xff3b4f, glow: 0xff1e3c, fill: 0xff4d5e };
const GOLD = { ring: 0xffc83d, glow: 0xffa800, fill: 0xffd34d };

export function makeRing(r = 1.5) {
  const g = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(r, 0.11, 8, 40), mat(RED.ring, { emissive: RED.glow, emissiveIntensity: 0.7, roughness: 0.4 }), 0, 0.07, 0, false);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const fill = mesh(new THREE.CircleGeometry(r, 36), new THREE.MeshBasicMaterial({ color: RED.fill, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0.04, 0, false);
  fill.rotation.x = -Math.PI / 2; g.add(fill);
  g.userData = { ring, fill, active: false, flash: 0 };
  return g;
}

/** switch between red (false) and gold (true); turning gold starts a quick flash */
export function setRingActive(g, on) {
  const u = g.userData; if (u.active === on) return;
  u.active = on;
  const c = on ? GOLD : RED;
  u.ring.material.color.setHex(c.ring); u.ring.material.emissive.setHex(c.glow); u.fill.material.color.setHex(c.fill);
  if (on) u.flash = 1;
}

/** gentle glow pulse — call every frame (dt needed for the flash to fade) */
export function pulseRing(g, t, dt = 0.016) {
  const u = g.userData;
  u.flash = Math.max(0, u.flash - dt * 1.8);
  const f = u.flash * u.flash;
  const p = Math.sin(t * (u.active ? 5 : 3));
  u.ring.material.emissiveIntensity = (u.active ? 0.9 + p * 0.4 : 0.6 + p * 0.35) + f * 2.5;
  u.fill.material.opacity = (u.active ? 0.3 + p * 0.1 : 0.16 + p * 0.07) + f * 0.5;
  g.scale.setScalar(1 + f * 0.22 + (u.active ? 0.03 + p * 0.02 : 0));
}
