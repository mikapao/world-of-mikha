// Background music: public/audio/bgm.mp3, looped softly during the game.
// Starts when ▶ Play is tapped, fades in/out, is fully muted while a challenge is open,
// and pauses when the app goes to the background. No file = no music, no errors.
import { getMusicVolume } from "./settings.js";

const SRC = "./audio/bgm.mp3";
let el = null, failed = false, duck = 1, cur = 0;

export function startMusic() {
  if (el || failed) return;
  el = new Audio(SRC);
  el.loop = true; el.preload = "auto"; el.volume = 0;
  el.addEventListener("error", () => { failed = true; el = null; });   // file missing — that's fine
  el.play().catch(() => {});
}

/** 1 = normal, 0 = muted (while a challenge window is open) */
export function setDuck(v) { duck = v; }

// gentle volume glide (also follows the parent-corner slider)
setInterval(() => {
  if (!el) return;
  const want = getMusicVolume() * duck;
  cur += (want - cur) * 0.12;
  if (Math.abs(want - cur) < 0.003) cur = want;
  el.volume = Math.min(1, Math.max(0, cur));
}, 50);

document.addEventListener("visibilitychange", () => {
  if (!el) return;
  if (document.hidden) el.pause(); else el.play().catch(() => {});
});
