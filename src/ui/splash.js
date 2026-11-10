// Opening screen: the big bubbly "World of Mikha" title drops in letter by letter,
// soft bubbles float up, and a candy-striped bar fills while the islands are built
// in the background. When everything is ready a ▶ Play button appears.
// (Tapping Play also lets the tablet start sound and the voice.)
import { letterSpans } from "./title.js";

const el = document.getElementById("splash");
const fill = el.querySelector(".sfill"), msg = el.querySelector(".smsg"), play = el.querySelector(".splay");
el.querySelector(".splash-title").innerHTML = letterSpans("World of Mikha");

// floating bubbles
const bubbles = el.querySelector(".bubbles");
for (let i = 0; i < 16; i++) {
  const b = document.createElement("i"); b.className = "bub";
  const s = 14 + Math.random() * 46;
  b.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 12}s`;
  bubbles.appendChild(b);
}

const START = performance.now(), MIN_MS = 3200;   // long enough for the title to finish its entrance
let shown = 0, target = 0, lastT = performance.now();
(function ease(now) {                               // the bar glides smoothly toward the real progress
  now = now || performance.now(); const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  shown += (target - shown) * Math.min(1, dt * 5);
  if (target - shown < 0.3) shown = target;
  fill.style.width = shown.toFixed(1) + "%";
  if (!el.classList.contains("gone")) requestAnimationFrame(ease);
})();
const barFull = () => new Promise(r => { const t0 = performance.now(); (function chk() { shown >= 99.5 || performance.now() - t0 > 2000 ? r() : setTimeout(chk, 50); })(); });

export const splash = {
  isOpen: () => !el.classList.contains("gone"),
  /** p = 0…100, m = friendly message */
  progress(p, m) { target = Math.max(target, p); if (m) msg.textContent = m; },
  /** resolves once the opening animation has had time to play */
  waitMin() { return new Promise(r => setTimeout(r, Math.max(0, MIN_MS - (performance.now() - START)))); },
  /** everything loaded: show ▶ Play; onPlay runs after the screen fades away */
  ready(onPlay) {
    target = 100; msg.textContent = "Ready! ✨";
    barFull().then(() => new Promise(r => setTimeout(r, 400))).then(() => {
      el.classList.add("loaded");
      play.onclick = () => {
        play.onclick = null;
        el.classList.add("hide");
        setTimeout(() => { el.classList.add("gone"); }, 850);
        onPlay();
      };
    });
  }
};
