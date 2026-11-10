// Two ways to walk:
//  1. tap & hold the avatar, then slide (a soft joystick ring appears under the finger)
//  2. the fixed joystick pad in the bottom-left corner
import * as THREE from "three";
import { renderer, cam } from "./engine.js";
import { player } from "./player.js";
import { audio } from "./sound.js";

const joy = document.getElementById("joy"), knob = document.getElementById("knob"), hint = document.getElementById("hint");
let drag = null;              // { id, sx, sy, dx, dy }
let blocked = () => false;    // set by main: true while a menu/challenge is open
export const setBlocked = fn => { blocked = fn; };
export const getMove = () => drag;
export function cancelDrag() {
  drag = null; joy.style.display = "none"; padId = null;
  const p = document.getElementById("pad");
  if (p) { p.classList.remove("active"); p.querySelector(".pknob").style.transform = "translate(-50%,-50%)"; }
}

export function pulseHint() {
  hint.style.opacity = 1; clearTimeout(pulseHint.t);
  pulseHint.t = setTimeout(() => hint.style.opacity = 0, 2500);
}
hint.style.opacity = 0;

const tmp = new THREE.Vector3();
function playerOnScreen() {
  tmp.set(player.position.x, player.position.y + 1, player.position.z).project(cam);
  return { x: (tmp.x + 1) / 2 * innerWidth, y: (1 - tmp.y) / 2 * innerHeight };
}

const cv = renderer.domElement;
cv.addEventListener("contextmenu", e => e.preventDefault());
cv.addEventListener("pointerdown", e => {
  if (blocked()) return;
  audio();                                   // unlock sound on first touch
  const p = playerOnScreen(), reach = Math.max(70, innerHeight * 0.09);
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > reach) { pulseHint(); return; }
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  joy.style.left = e.clientX + "px"; joy.style.top = e.clientY + "px"; joy.style.display = "block";
  knob.style.transform = "translate(0,0)";
});
cv.addEventListener("pointermove", e => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.dx = e.clientX - drag.sx; drag.dy = e.clientY - drag.sy;
  const l = Math.hypot(drag.dx, drag.dy), k = l > 60 ? 60 / l : 1;
  knob.style.transform = `translate(${drag.dx * k}px,${drag.dy * k}px)`;
  if (l > 15) hint.style.opacity = 0;
});
const end = e => { if (drag && e.pointerId === drag.id) cancelDrag(); };
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

// ---- fixed joystick pad (bottom-left) ----
const pad = document.getElementById("pad"), pknob = pad.querySelector(".pknob");
let padId = null;
function padMove(e) {
  const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * 0.36;
  let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  pknob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  // scale so a full push = full speed (player uses ~70px for full speed)
  const k = 70 / R;
  drag = { id: e.pointerId, sx: 0, sy: 0, dx: dx * k, dy: dy * k, pad: true };
  if (l > 10) hint.style.opacity = 0;
}
pad.addEventListener("contextmenu", e => e.preventDefault());
pad.addEventListener("pointerdown", e => {
  if (blocked()) return;
  e.preventDefault(); audio();
  padId = e.pointerId; pad.classList.add("active");
  try { pad.setPointerCapture(e.pointerId); } catch (err) {}
  padMove(e);
});
pad.addEventListener("pointermove", e => { if (e.pointerId === padId) padMove(e); });
const padEnd = e => {
  if (e.pointerId !== padId) return;
  padId = null; pad.classList.remove("active"); pknob.style.transform = "translate(-50%,-50%)";
  if (drag && drag.pad) drag = null;
};
pad.addEventListener("pointerup", padEnd); pad.addEventListener("pointercancel", padEnd);
