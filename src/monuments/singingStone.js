// 🎵 Singing Stone — English speaking. Crystal Isle.
// The stone says a word, then listens while Mikha says it out loud.
// The stone glows brighter the braver (louder) her voice is.
// Words come from public/content/speaking.json.
// Score per word: loudest level (0–100), average level while speaking, and whether it
// reached the "brave voice" level. Every word gets warm praise — no wrong answers here.
import * as THREE from "three";
import { mat, mesh } from "../engine.js";
import { I2, obstacles } from "../world/layout.js";
import { isle2, reservedIsle } from "../world/crystalIsle.js";
import { makeRing, pulseRing } from "../world/ring.js";
import { LEAVE_BUTTON } from "../ui/shell.js";
import { shuffle, dots } from "../ui/util.js";
import { openMic, closeMic, listenOnce } from "../mic.js";

const S = { x: 0.6, z: -2.4 };          // local to Crystal Isle
const R = { x: S.x - 0.4, z: S.z + 3.6 };
export const BRAVE = 55;                // level that counts as a "brave voice"

export function createSingingStone() {
  // ---- 3D monument ----
  const terrace = mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.35, 6), mat(0xa77bc8), S.x, 0.17, S.z); isle2.add(terrace);
  obstacles.push({ x: I2.x + S.x, z: I2.z + S.z, r: 2.2 });
  reservedIsle.push({ x: S.x, z: S.z }, { x: R.x, z: R.z });

  const g = new THREE.Group(); g.position.set(S.x, 0.35, S.z); isle2.add(g);
  const stoneMat = mat(0xd9cdea, { emissive: 0x000000 });
  const stone = mesh(new THREE.IcosahedronGeometry(1.25, 1), stoneMat, 0, 1.1, 0); stone.scale.set(1, 1.15, 0.85); g.add(stone);
  const gems = [[-0.45, 1.5, 0.95, 0xff7fd0], [0.4, 1.0, 1.0, 0x6ff0ff], [0.05, 1.9, 0.8, 0xffe36b]].map(([x, y, z, c]) => {
    const m = mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, flatShading: true }), x, y, z, false);
    g.add(m); return m;
  });
  const notes = [];
  for (let i = 0; i < 4; i++) {
    const n = mesh(new THREE.TorusGeometry(0.12, 0.04, 5, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), 0, 2.4, 0, false);
    n.userData.ph = i / 4; g.add(n); notes.push(n);
  }
  const ring = makeRing(1.5); ring.position.set(R.x, 0, R.z); isle2.add(ring);
  let done = false;

  // ---- challenge ----
  let ctx = null, entry = null, list = [], wi = 0, attempts = 0, best = null, run = 0, micOk = false;
  const cancelled = myRun => () => myRun !== run || !ctx.shell.isOpen();

  function stoneUI(lv) {
    const card = ctx.shell.card, v = card.querySelector(".vstone"); if (!v) return;
    v.style.setProperty("--lv", (lv / 100).toFixed(3));
    card.querySelectorAll(".vstars span").forEach((s, i) => s.classList.toggle("on", lv >= (i + 1) * 18));
  }

  function showWord() {
    const w = list[wi]; attempts = 0; best = null;
    ctx.shell.render(`${LEAVE_BUTTON}<button class="say" title="Hear again">🔊</button>
      ${dots(list.length, wi)}
      <div class="vword"><span class="vemoji">${w.emoji || "🎵"}</span><span class="prompt" style="margin:0">${w.say}</span></div>
      <div class="vstone" style="--lv:0"><div class="vface">🙂</div></div>
      <div class="vstars"><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span></div>
      <div class="feedback" style="color:#8a77b8">Listen…</div>
      <div class="vbtns" style="visibility:hidden"><button class="btn sec again">🔁 Again</button><button class="btn next">Next ➡️</button></div>`);
    const card = ctx.shell.card;
    card.querySelector(".say").onclick = () => turn();
    card.querySelector(".again").onclick = () => turn();
    card.querySelector(".next").onclick = () => nextWord();
    turn();
  }

  async function turn() {
    const myRun = ++run, card = ctx.shell.card, w = list[wi];
    const fb = card.querySelector(".feedback"), btns = card.querySelector(".vbtns"), face = card.querySelector(".vface");
    btns.style.visibility = "hidden"; fb.style.color = "#8a77b8"; fb.textContent = "Listen… 👂"; face.textContent = "🙂"; stoneUI(0);
    await ctx.speak(`Say: ${w.say}`);
    if (cancelled(myRun)()) return;
    if (!micOk) {
      fb.textContent = "The stone can't hear yet — ask a grown-up to allow the microphone 🎤";
      btns.style.visibility = "visible"; return;
    }
    fb.style.color = "#6bb57c"; fb.textContent = "Your turn! 🎤"; face.textContent = "😮";
    const r = await listenOnce(stoneUI, cancelled(myRun));   // (music is already off inside challenges)
    if (!r) return;
    attempts++;
    if (!best || r.peak > best.peak) best = r;
    let say;
    if (r.peak >= BRAVE) { fb.style.color = "#6bb57c"; fb.textContent = "What a brave voice! 🌟"; face.textContent = "😄"; say = "What a brave voice!"; ctx.ping(1.5); }
    else if (r.heard && r.peak >= 22) { fb.style.color = "#c99a3c"; fb.textContent = "Nice! Can you say it a little louder? 🙂"; face.textContent = "🙂"; say = "Nice! Can you say it a little louder?"; }
    else { fb.style.color = "#d9879c"; fb.textContent = "I couldn't hear you — let's try again! 👂"; face.textContent = "🤔"; say = "I couldn't hear you. Let's try again!"; }
    stoneUI(r.peak);
    btns.style.visibility = "visible";
    ctx.speak(say);
  }

  function saveWord() {
    if (!best) return;
    entry.words.push({ id: list[wi].id, say: list[wi].say, attempts, peak: best.peak, avg: best.avg, brave: best.peak >= BRAVE });
  }

  function nextWord() {
    run++; saveWord(); wi++;
    if (wi < list.length) showWord(); else finish();
  }

  function finalize() {
    const ws = entry.words;
    entry.end = Date.now();
    entry.answered = ws.length;
    entry.braveCount = ws.filter(w => w.brave).length;
    entry.avgPeak = ws.length ? Math.round(ws.reduce((s, w) => s + w.peak, 0) / ws.length) : 0;
    entry.avgLevel = ws.length ? Math.round(ws.reduce((s, w) => s + w.avg, 0) / ws.length) : 0;
    entry.saved = true;
    return entry;
  }

  function lightUp() {
    done = true;
    stoneMat.emissive.set(0xb48cff); stoneMat.emissiveIntensity = 0.35;
  }

  function finish() {
    closeMic();
    entry.completed = true; ctx.saveEntry(finalize()); lightUp();
    ctx.shell.render(`${dots(list.length, list.length)}<div class="big">🎶</div>
      <div class="prompt" style="margin:8px 10px">Beautiful singing! The stone is glowing!</div>
      <button class="btn back">Back to the island 🏝️</button>`);
    ctx.speak("Beautiful singing! The stone is glowing!");
    ctx.shell.card.querySelector(".back").onclick = () => ctx.shell.leave();
  }

  return {
    id: "singing-stone", name: "Singing Stone", emoji: "🎵", label: "🎵 Enter",
    scoring: "voice", scoringNote: `Voice level 0–100 (loudest per word). ${BRAVE}+ = brave voice. Calibrate in a quiet room if levels look off.`,
    ringMesh: ring,
    ring: { x: I2.x + R.x, z: I2.z + R.z }, center: { x: I2.x + S.x, z: I2.z + S.z },

    async start(c) {
      ctx = c; run++;
      const data = c.content || {};
      const pool = data.words || [];
      if (!pool.length) {
        c.shell.render(`${LEAVE_BUTTON}<div class="big">🎵</div><div class="prompt">The stone is sleeping. Come back soon!</div>`);
        entry = null; return;
      }
      list = shuffle(pool).slice(0, data.wordsPerVisit || 5); wi = 0;
      entry = { monument: "singing-stone", contentVersion: c.contentVersion, start: Date.now(), words: [], completed: false };
      c.shell.render(`${LEAVE_BUTTON}<div class="big">🎵</div><div class="prompt">Waking up the Singing Stone…</div>`);
      micOk = await openMic();
      if (!c.shell.isOpen()) { closeMic(); return; }
      c.speak("Hello! I am the Singing Stone. Say the words with me!").then(() => { if (ctx.shell.isOpen() && wi === 0 && !entry.words.length) showWord(); });
    },

    onLeave() {
      run++; closeMic();
      if (entry && !entry.saved) { if (best && entry.words.length === wi) saveWord(); if (entry.words.length) ctx.saveEntry(finalize()); }
    },

    update(t, dt) {
      pulseRing(ring, t, dt);
      stone.rotation.y = Math.sin(t * 0.5) * 0.08;
      if (done) { stoneMat.emissiveIntensity = 0.25 + Math.sin(t * 2) * 0.12; gems.forEach((m, i) => m.material.emissiveIntensity = 0.8 + Math.sin(t * 3 + i) * 0.4); }
      notes.forEach(n => {
        const p = (t * 0.25 + n.userData.ph) % 1;
        n.position.set(Math.sin(p * 9) * 0.4, 2.4 + p * 1.6, 0.2); n.material.opacity = Math.sin(p * Math.PI) * (done ? 1 : 0.8);
      });
    }
  };
}
