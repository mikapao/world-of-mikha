// All sounds are generated in code (Web Audio) — no sound files needed.
let actx = null;

export function audio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  } catch (e) { actx = null; }
  return actx;
}

/** Cute springy squeak for each footstep (foot = 0 or 1 for slightly different pitch) */
export function squeak(foot) {
  const a = audio(); if (!a) return;
  const t = a.currentTime, base = foot ? 720 : 860;
  const o = a.createOscillator(), g = a.createGain();
  const lfo = a.createOscillator(), lg = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(base * 0.75, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.06);
  o.frequency.exponentialRampToValueAtTime(base * 1.15, t + 0.14);
  lfo.frequency.value = 38; lg.gain.value = 45;          // springy wobble
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
  o.connect(g).connect(a.destination);
  o.start(t); lfo.start(t); o.stop(t + 0.18); lfo.stop(t + 0.18);
}

/** Cute bell-like ping (pitch 1 = normal, 1.5 = happy higher ping) */
export function ping(pitch = 1) {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  [[1318 * pitch, 0.12], [2637 * pitch, 0.035]].forEach(([f, v]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.5);
  });
}

// every button tap pings
document.addEventListener("pointerdown", e => { if (e.target.closest && e.target.closest("button")) ping(); }, true);

/** soft magical "whoosh" (rising airy swish + a tiny sparkle) — stepping into a monument circle */
export function whoosh() {
  const a = audio(); if (!a) return;
  const t = a.currentTime, len = 0.7;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.18); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(bp).connect(g).connect(a.destination); src.start(t); src.stop(t + len);
  [[1760, 0.38], [2349, 0.46]].forEach(([f, dl]) => {          // little twinkle at the end
    const o = a.createOscillator(), og = a.createGain();
    o.type = "sine"; o.frequency.value = f;
    og.gain.setValueAtTime(0, t + dl); og.gain.linearRampToValueAtTime(0.05, t + dl + 0.01); og.gain.exponentialRampToValueAtTime(0.0005, t + dl + 0.4);
    o.connect(og).connect(a.destination); o.start(t + dl); o.stop(t + dl + 0.45);
  });
}
