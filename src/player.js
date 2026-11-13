// The player: holds whichever avatar was picked, walks, bounces and squeaks.
import * as THREE from "three";
import { scene } from "./engine.js";
import { AVATARS } from "./avatars/index.js";
import { obstacles, walkable, groundY } from "./world/layout.js";
import { squeak } from "./sound.js";

export const player = new THREE.Group();
player.position.set(-1, 0, 2);
scene.add(player);

let av = AVATARS[0].build(); player.add(av.root);
let hop = 0, walkT = 0, lastStep = 0, currentId = AVATARS[0].id;
export const currentAvatarId = () => currentId;

export function setAvatar(id) {
  const a = AVATARS.find(x => x.id === id) || AVATARS[0];
  player.remove(av.root); av = a.build(); player.add(av.root);
  currentId = a.id;
  hop = 1;
}

const SPEED = 4.2;
/** move = { dx, dy } screen drag vector, or null when not steering */
export function updatePlayer(dt, t, move) {
  let moving = false;
  if (move) {
    const l = Math.hypot(move.dx, move.dy);
    if (l > 15) {
      // screen → isometric world: right = (1,0,-1), down = (1,0,1)
      let wx = move.dx + move.dy, wz = move.dy - move.dx; const wl = Math.hypot(wx, wz); wx /= wl; wz /= wl;
      const speed = SPEED * Math.min(l / 70, 1);
      let nx = player.position.x + wx * speed * dt, nz = player.position.z + wz * speed * dt;
      for (const o of obstacles) {
        const d = Math.hypot(nx - o.x, nz - o.z), m = o.r + 0.45;
        if (d < m && d > 0) { nx = o.x + (nx - o.x) / d * m; nz = o.z + (nz - o.z) / d * m; }
      }
      const px = player.position.x, pz = player.position.z;
      if (!walkable(nx, nz)) { if (walkable(nx, pz)) nz = pz; else if (walkable(px, nz)) nx = px; else { nx = px; nz = pz; } }
      player.position.x = nx; player.position.z = nz;
      let diff = Math.atan2(wx, wz) - player.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.rotation.y += diff * Math.min(1, dt * 12);
      moving = true;
    }
  }
  player.position.y += (groundY(player.position.x, player.position.z) - player.position.y) * Math.min(1, dt * 12);

  walkT += moving ? dt * 11 : 0;
  av.body.position.y = moving ? Math.abs(Math.sin(walkT)) * 0.08 : Math.sin(t * 2) * 0.025;
  av.footL.position.z = moving ? Math.sin(walkT) * 0.15 : 0;
  av.footR.position.z = moving ? -Math.sin(walkT) * 0.15 : 0;
  av.armL.rotation.x = moving ? -Math.sin(walkT) * 0.6 : 0;
  av.armR.rotation.x = moving ? Math.sin(walkT) * 0.6 : 0;
  av.idle(t, moving);
  if (hop > 0) { hop = Math.max(0, hop - dt * 1.6); av.body.position.y += Math.sin((1 - hop) * Math.PI) * 0.9; }

  // one squeak per footstep, alternating feet
  if (moving) { const step = Math.floor(walkT / Math.PI); if (step !== lastStep) { lastStep = step; squeak(step % 2); } }
}

/** Put the player just outside a monument's circle, facing away from it */
export function stepOutOf(m) {
  let dx = m.ring.x - m.center.x, dz = m.ring.z - m.center.z; const l = Math.hypot(dx, dz) || 1;
  player.position.set(m.ring.x + dx / l * 2.8, 0, m.ring.z + dz / l * 2.8);
  player.rotation.y = Math.atan2(dx, dz);
}
