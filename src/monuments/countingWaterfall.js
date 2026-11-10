// 💧 Counting Waterfall — simple math (count, add, take away). Home island.
// Questions come from public/content/math.json.
// Score: tries needed per question vs total questions.
import * as THREE from "three";
import { scene, mat, mesh, rnd } from "../engine.js";
import { obstacles, reserved } from "../world/layout.js";
import { makeRing, pulseRing } from "../world/ring.js";
import { LEAVE_BUTTON } from "../ui/shell.js";
import { shuffle, repeat, dots } from "../ui/util.js";
import { finalizeAttempts } from "../storage.js";

const POS = { x: 5, z: -4 };
const RING = { x: POS.x - 1.5, z: POS.z + 2.5 };

export function createCountingWaterfall() {
  // ---- 3D monument ----
  const g = new THREE.Group(); g.position.set(POS.x, 0, POS.z); scene.add(g);
  const rock1 = mesh(new THREE.DodecahedronGeometry(1.5, 0), mat(0xb8c4cf), 0, 1.1, 0); rock1.scale.set(1, 1.3, 0.9); g.add(rock1);
  g.add(mesh(new THREE.DodecahedronGeometry(1, 0), mat(0xa9b6c2), 0.3, 2.9, -0.1));
  const fall = mesh(new THREE.BoxGeometry(0.9, 2.6, 0.15), mat(0x8fd3f0, { transparent: true, opacity: 0.85, roughness: 0.3 }), 0.1, 1.6, 1.25, false);
  fall.rotation.x = -0.18; g.add(fall);
  g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 12), mat(0x8fd3f0, { roughness: 0.3 }), 0.1, 0.06, 2, false));
  const crystal = mesh(new THREE.OctahedronGeometry(0.45, 0), mat(0xd4dbe2, { emissive: 0x000000 }), 0.3, 4.3, -0.1); g.add(crystal);
  const glow = new THREE.PointLight(0xffe28a, 0, 8); glow.position.set(0.3, 4.3, -0.1); g.add(glow);
  const ring = makeRing(1.9); ring.position.set(RING.x - POS.x, 0, RING.z - POS.z); g.add(ring);
  obstacles.push({ x: POS.x, z: POS.z, r: 1.7 });
  reserved.push({ x: POS.x, z: POS.z }, { x: RING.x, z: RING.z });
  const sparkles = []; let done = false;

  function lightUp() {
    done = true;
    crystal.material.color.set(0xffe28a); crystal.material.emissive.set(0xffc94d); crystal.material.emissiveIntensity = 0.8; glow.intensity = 1.2;
    if (sparkles.length) return;
    for (let i = 0; i < 14; i++) {
      const s = mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: Math.random() }),
        rnd(-1, 1) + 0.3, rnd(3, 4.6), rnd(-1, 1), false);
      g.add(s); sparkles.push(s);
    }
  }

  // ---- challenge ----
  let entry = null, qList = [], qi = 0, tries = 0, busy = false, ctx = null;
  const itemsHTML = q =>
    q.type === "count" ? `<div class="group">${repeat(q.emoji, q.n)}</div>` :
    q.type === "add" ? `<div class="group">${repeat(q.emoji, q.a)}</div><span class="op">+</span><div class="group">${repeat(q.emoji, q.b)}</div>` :
    q.type === "sub" ? `<div class="group">${repeat(q.emoji, q.a - q.b)}${repeat(q.emoji, q.b, "gone")}</div>` : "";
  const gentle = ["Try again 💛", "Almost! Count once more 🌼", "Let's look again 🐢"];
  const cheers = [["Yes! 🌸", "Yes!"], ["Wonderful! 🌈", "Wonderful!"], ["You got it! ⭐", "You got it!"]];

  function show() {
    const q = qList[qi]; tries = 0;
    ctx.shell.render(`${LEAVE_BUTTON}<button class="say" title="Hear again">🔊</button>
      ${dots(qList.length, qi)}
      <div class="prompt">${q.prompt}</div>
      <div class="items">${itemsHTML(q)}</div>
      <div class="choices">${shuffle(q.choices).map(c => `<button class="choice" data-v="${c}">${c}</button>`).join("")}</div>
      <div class="feedback"></div>`);
    const card = ctx.shell.card;
    card.querySelector(".say").onclick = () => ctx.speak(q.prompt);
    card.querySelectorAll(".choice").forEach(b => b.onclick = () => answer(b, q));
    ctx.speak(q.prompt);
  }

  function answer(btn, q) {
    if (busy || btn.disabled) return;
    tries++;
    const card = ctx.shell.card, fb = card.querySelector(".feedback");
    if (Number(btn.dataset.v) === q.answer) {
      busy = true; btn.classList.add("ok");
      card.querySelectorAll(".choice").forEach(b => { if (b !== btn) b.classList.add("dim"); });
      const [txt, say] = cheers[qi % 3];
      fb.style.color = "#6bb57c"; fb.textContent = txt;
      setTimeout(() => ctx.ping(1.5), 140); ctx.speak(say);
      entry.questions.push({ id: q.id, attempts: tries });
      setTimeout(() => { busy = false; if (!ctx.shell.isOpen()) return; qi++; qi < qList.length ? show() : finish(); }, 1300);
    } else {
      btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake", "dim"); btn.disabled = true;
      fb.style.color = "#d9879c"; fb.textContent = gentle[(tries - 1) % gentle.length];
    }
  }

  function finish() {
    entry.completed = true; ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true;
    lightUp();
    ctx.shell.render(`${dots(qList.length, qList.length)}<div class="big">🌈</div>
      <div class="prompt" style="margin:8px 10px">You did it! The waterfall is sparkling!</div>
      <button class="btn back">Back to the island 🏝️</button>`);
    ctx.speak("You did it! The waterfall is sparkling!");
    ctx.shell.card.querySelector(".back").onclick = () => ctx.shell.leave();
  }

  return {
    id: "counting-waterfall", name: "Counting Waterfall", emoji: "💧", label: "💧 Enter",
    scoring: "attempts", scoringNote: "Score = questions ÷ total tries (100% = all right on the first try)",
    ringMesh: ring,
    ring: RING, center: POS,

    start(c) {
      ctx = c; busy = false;
      const data = c.content || {};
      const pool = data.questions || [];
      if (!pool.length) {
        c.shell.render(`${LEAVE_BUTTON}<div class="big">💧</div><div class="prompt">The waterfall is resting. Come back soon!</div>`);
        entry = null; return;
      }
      qList = shuffle(pool).slice(0, data.questionsPerVisit || 5); qi = 0;
      entry = { monument: "counting-waterfall", contentVersion: c.contentVersion, start: Date.now(), questions: [], completed: false };
      show();
    },

    /** child left (finished or early) — keep partial scores */
    onLeave() {
      busy = false;
      if (entry && !entry.saved && entry.questions.length) { ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true; }
    },

    update(t, dt) {
      fall.material.opacity = 0.75 + Math.sin(t * 4) * 0.1;
      pulseRing(ring, t, dt);
      crystal.rotation.y += dt * (done ? 1.5 : 0.4); crystal.position.y = 4.3 + Math.sin(t * 1.5) * 0.12;
      for (const s of sparkles) {
        s.position.y += dt * 0.8; s.material.opacity -= dt * 0.25;
        if (s.material.opacity <= 0) { s.position.set(rnd(-1, 1) + 0.3, rnd(3, 4), rnd(-1, 1)); s.material.opacity = 1; }
      }
    }
  };
}
