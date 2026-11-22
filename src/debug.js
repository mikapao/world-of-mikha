// Debug overlay, only on when the URL has ?debug (e.g. http://localhost:5173/?debug).
// Shows fps, draw triangles, draw calls and the scene's triangle count (env tris).
import { scene } from "./engine.js";
import { player } from "./player.js";
import { ocean } from "./world/ocean.js";

const ON = typeof location !== "undefined" && location.search.includes("debug");
let el = null;
let frames = 0, windowStart = 0, lastText = 0, fps = 0;
let envTris = 0, lastEnv = -Infinity;

// Count triangles of every mesh under `obj`, skipping the player and the ocean plane.
function countEnvTris(obj) {
  let n = 0;
  if (obj === player || obj === ocean) return 0;
  if (obj.isMesh && obj.geometry) {
    const g = obj.geometry;
    n += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
  }
  for (const c of obj.children) n += countEnvTris(c);
  return n;
}

export function initDebug() {
  if (!ON || el) return;
  el = document.createElement("div");
  el.id = "debug-overlay";
  el.style.cssText = "position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:50;" +
    "pointer-events:none;font:12px/1.4 monospace;color:#fff;background:rgba(0,0,0,.45);" +
    "padding:4px 8px;border-radius:6px;white-space:pre;";
  el.textContent = "debug…";
  document.body.appendChild(el);
  windowStart = performance.now();
}

export function debugFrame(renderer) {
  if (!ON || !el) return;
  frames++;
  const now = performance.now();
  if (now - lastEnv >= 5000) { envTris = Math.round(countEnvTris(scene)); lastEnv = now; }
  if (now - lastText >= 500) {
    const elapsed = now - windowStart;
    if (elapsed > 0) { fps = Math.round(frames * 1000 / elapsed); }
    if (elapsed >= 500) { frames = 0; windowStart = now; }
    const info = renderer.info.render;
    el.textContent = `fps ${fps}\ntris ${info.triangles.toLocaleString("en-US")}\n` +
      `calls ${info.calls}\nenv tris ${envTris.toLocaleString("en-US")}`;
    lastText = now;
  }
}
