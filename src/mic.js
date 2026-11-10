// Microphone loudness meter for the Singing Stone.
// level() gives 0–100: 0 = room quiet, ~55+ = a nice brave voice, 100 = very loud.
// Tablets' mics differ, so the parent corner can "calibrate" the quiet-room baseline.
import { audio } from "./sound.js";

const BASE_KEY = "wom_mic_baseline_db";
const RANGE_DB = 40;                 // from just-above-quiet to "very loud"
let stream = null, analyser = null, buf = null, smooth = 0;

export function baselineDb() {
  try { const v = parseFloat(localStorage.getItem(BASE_KEY)); return isFinite(v) ? v : -60; } catch (e) { return -60; }
}

/** ask for the mic (Android shows its permission prompt the first time). Returns true if listening. */
export async function openMic() {
  if (stream) return true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }   // keep real loudness
    });
    const a = audio();
    const src = a.createMediaStreamSource(stream);
    analyser = a.createAnalyser(); analyser.fftSize = 1024;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);                       // not connected to speakers — no echo
    return true;
  } catch (e) { console.warn("mic unavailable", e); stream = null; return false; }
}

export function closeMic() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; analyser = null; smooth = 0;
}

/** raw loudness in dB (about -100 silent … 0 max) */
export function readDb() {
  if (!analyser) return -100;
  analyser.getFloatTimeDomainData(buf);
  let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9);
}

/** smoothed 0–100 loudness level */
export function level() {
  const floor = baselineDb() + 6;
  const raw = Math.max(0, Math.min(100, (readDb() - floor) / RANGE_DB * 100));
  smooth += (raw - smooth) * (raw > smooth ? 0.5 : 0.15);   // quick up, gentle down
  return smooth;
}

/** listen to the room for `ms` while it's quiet and save it as the new baseline */
export async function calibrate(ms = 3000) {
  const opened = !stream;
  if (!(await openMic())) return null;
  const vals = []; const end = performance.now() + ms;
  await new Promise(res => { (function tick() { vals.push(readDb()); performance.now() < end ? requestAnimationFrame(tick) : res(); })(); });
  if (opened) closeMic();
  vals.sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  try { localStorage.setItem(BASE_KEY, String(median)); } catch (e) {}
  return median;
}

/**
 * Listen for one spoken word. Stops ~0.9 s after the child goes quiet, or after 5 s.
 * onLevel(lv) is called every frame for the glowing stone. Returns { peak, avg, heard } or null if cancelled.
 */
export function listenOnce(onLevel, isCancelled = () => false) {
  return new Promise(res => {
    const start = performance.now(); let peak = 0, sum = 0, n = 0, lastLoud = 0, heard = false;
    (function tick() {
      if (isCancelled()) { res(null); return; }
      const lv = level(), now = performance.now(); onLevel(lv);
      if (lv > 8) { sum += lv; n++; heard = true; lastLoud = now; }
      peak = Math.max(peak, lv);
      const el = now - start;
      if ((heard && now - lastLoud > 900 && el > 800) || el > 5000) { res({ peak: Math.round(peak), avg: n ? Math.round(sum / n) : 0, heard }); return; }
      requestAnimationFrame(tick);
    })();
  });
}
