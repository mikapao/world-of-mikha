// 🍭 Giant Lollipop — English vocabulary ("Find the …!"). Candy & Dessert island.
// The voice says a word, Mikha taps the matching picture. Tapping a different picture
// tells her its name ("That's the donut!") so every tap teaches a word.
// Words come from public/content/vocab.json.
// Score: tries needed per question vs total questions.
import * as THREE from "three";
import { mat, mesh, rnd } from "../engine.js";
import { I4, obstacles } from "../world/layout.js";
import { isle4, reservedCandy } from "../world/candyIsle.js";
import { makeRing, pulseRing } from "../world/ring.js";
import { LEAVE_BUTTON } from "../ui/shell.js";
import { shuffle, dots } from "../ui/util.js";
import { finalizeAttempts } from "../storage.js";

const L = { x: -1, z: -1.2 };                 // lollipop, local to the Candy island
const R = { x: L.x + 2.3, z: L.z + 2.3 };     // its circle, toward the camera
const article = w => "the " + w;      // "the" works for every word: the grapes, the milk, the cake

function swirlTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const cols = ["#ff5f8f", "#ffffff", "#ffd23f", "#ffffff", "#5fc8ff", "#ffffff", "#8be37a", "#ffffff", "#c58bff", "#ffffff"];
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256);
  g.lineCap = "round"; g.lineWidth = 15;
  for (let i = 0; i < 900; i++) {
    const a0 = i * 0.05, a1 = a0 + 0.06, r0 = 4 + a0 * 3.9, r1 = 4 + a1 * 3.9;
    g.strokeStyle = cols[Math.floor(i / 22) % cols.length];
    g.beginPath(); g.moveTo(128 + Math.cos(a0) * r0, 128 + Math.sin(a0) * r0); g.lineTo(128 + Math.cos(a1) * r1, 128 + Math.sin(a1) * r1); g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

export function createLollipop() {
  // ---- 3D monument ----
  const base = mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.35, 16), mat(0xfff3f8), L.x, 0.17, L.z); isle4.add(base);
  obstacles.push({ x: I4.x + L.x, z: I4.z + L.z, r: 1.3 });
  reservedCandy.push({ x: L.x, z: L.z }, { x: R.x, z: R.z });

  const g = new THREE.Group(); g.position.set(L.x, 0.35, L.z); g.rotation.y = Math.PI / 4; isle4.add(g);
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.3, 10), mat(0xffffff, { roughness: 0.5 }), 0, 1.65, 0));
  const pop = new THREE.Group(); pop.position.y = 4.35; g.add(pop);
  const swirl = new THREE.MeshStandardMaterial({ map: swirlTexture(), roughness: 0.3 });
  const disc = mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.4, 36), [mat(0xff8fb8, { roughness: 0.3 }), swirl, swirl], 0, 0, 0);
  disc.rotation.x = Math.PI / 2; pop.add(disc);
  // shiny glaze highlight
  const shine = mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), -0.55, 4.9, 0.25, false);
  shine.scale.set(1, 0.5, 0.2); g.add(shine);   // stays still while the candy spins
  // ribbon bow at the neck
  const bowM = mat(0xff5f8f);
  [-1, 1].forEach(s => { const b = mesh(new THREE.ConeGeometry(0.22, 0.45, 4), bowM, s * 0.25, 2.95, 0.05); b.rotation.z = s * Math.PI / 2; g.add(b); });
  g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6), bowM, 0, 2.95, 0.08, false));
  const ring = makeRing(1.5); ring.position.set(R.x, 0, R.z); isle4.add(ring);
  const sparkles = []; let done = false;

  function lightUp() {
    done = true;
    if (sparkles.length) return;
    const cols = [0xff8fb8, 0xffe27a, 0x9ad8ff, 0xb8f2a6, 0xd3a8ff];
    for (let i = 0; i < 18; i++) {
      const s = mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: cols[i % 5], transparent: true, opacity: Math.random() }),
        rnd(-1.5, 1.5), rnd(3, 5.5), rnd(-1.5, 1.5), false);
      g.add(s); sparkles.push(s);
    }
  }

  // ---- challenge ----
  let ctx = null, entry = null, list = [], pool = [], qi = 0, tries = 0, busy = false, run = 0, nChoices = 3;

  function show() {
    const myRun = ++run, q = list[qi]; tries = 0; busy = false;
    const others = q.choices
      ? q.choices.map(e => pool.find(w => w.emoji === e) || { word: "", emoji: e }).filter(w => w.emoji !== q.emoji)
      : shuffle(pool.filter(w => w.emoji !== q.emoji)).slice(0, nChoices - 1);
    const choices = shuffle([q, ...others.slice(0, nChoices - 1)]);
    const prompt = `Find ${article(q.word)}!`;
    ctx.shell.render(`${LEAVE_BUTTON}<button class="say" title="Hear again">🔊</button>
      ${dots(list.length, qi)}
      <div class="prompt">${prompt} 🔎</div>
      <div class="choices vocab">${choices.map(w => `<button class="choice vchoice" data-e="${w.emoji}" data-w="${w.word}"><span class="ve">${w.emoji}</span><span class="vw"></span></button>`).join("")}</div>
      <div class="feedback"></div>`);
    const card = ctx.shell.card;
    card.querySelector(".say").onclick = () => ctx.speak(prompt);
    card.querySelectorAll(".vchoice").forEach(b => b.onclick = () => answer(b, q, prompt, myRun));
    ctx.speak(prompt);
  }

  function answer(btn, q, prompt, myRun) {
    if (busy || btn.disabled || myRun !== run || !ctx.shell.isOpen()) return;
    tries++;
    const card = ctx.shell.card, fb = card.querySelector(".feedback");
    const label = btn.querySelector(".vw");
    if (btn.dataset.e === q.emoji) {
      busy = true; btn.classList.add("ok"); if (label) label.textContent = q.word;
      card.querySelectorAll(".vchoice").forEach(b => { if (b !== btn) b.classList.add("dim"); });
      fb.style.color = "#6bb57c"; fb.textContent = `Yes! ${q.word[0].toUpperCase() + q.word.slice(1)}! 🍭`;
      setTimeout(() => ctx.ping(1.5), 140); ctx.speak(`Yes! ${q.word}!`);
      entry.questions.push({ id: q.id, word: q.word, attempts: tries });
      setTimeout(() => { if (myRun !== run || !ctx.shell.isOpen()) return; qi++; qi < list.length ? show() : finish(); }, 1700);
    } else {
      btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake", "dim"); btn.disabled = true;
      const w = btn.dataset.w;
      if (w && label) label.textContent = w;
      fb.style.color = "#d9879c";
      fb.textContent = w ? `That's ${article(w)}! 💛` : "Try another one 💛";
      ctx.speak(w ? `That's ${article(w)}! ${prompt}` : `Try another one. ${prompt}`);
    }
  }

  function finish() {
    run++;
    entry.completed = true; ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true;
    lightUp();
    ctx.shell.render(`${dots(list.length, list.length)}<div class="big">🍭</div>
      <div class="prompt" style="margin:8px 10px">Sweet! You know so many words! The lollipop is spinning!</div>
      <button class="btn back">Back to the island 🏝️</button>`);
    ctx.speak("Sweet! You know so many words! The lollipop is spinning!");
    ctx.shell.card.querySelector(".back").onclick = () => ctx.shell.leave();
  }

  return {
    id: "word-lollipop", name: "Giant Lollipop", emoji: "🍭", label: "🍭 Enter",
    scoring: "attempts", scoringNote: "Score = questions ÷ total tries (100% = found every word on the first try)",
    ringMesh: ring,
    ring: { x: I4.x + R.x, z: I4.z + R.z }, center: { x: I4.x + L.x, z: I4.z + L.z },

    start(c) {
      ctx = c; run++;
      const data = c.content || {};
      pool = (data.words || []).filter(w => w.word && w.emoji);
      nChoices = Math.max(2, Math.min(4, data.choicesPerQuestion || 3));
      if (pool.length < 2) {
        c.shell.render(`${LEAVE_BUTTON}<div class="big">🍭</div><div class="prompt">The lollipop is resting. Come back soon!</div>`);
        entry = null; return;
      }
      list = shuffle(pool).slice(0, data.questionsPerVisit || 5); qi = 0;
      entry = { monument: "word-lollipop", contentVersion: c.contentVersion, start: Date.now(), questions: [], completed: false };
      show();
    },

    onLeave() {
      run++; busy = false;
      if (entry && !entry.saved && entry.questions.length) { ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true; }
    },

    update(t, dt) {
      pulseRing(ring, t, dt);
      pop.rotation.z += dt * (done ? 1.6 : 0.15);
      pop.position.y = 4.35 + Math.sin(t * 1.4) * 0.06;
      for (const s of sparkles) {
        s.position.y += dt * 0.6; s.material.opacity -= dt * 0.3;
        if (s.material.opacity <= 0) { s.position.set(rnd(-1.5, 1.5), rnd(3, 4.5), rnd(-1.5, 1.5)); s.material.opacity = 1; }
      }
    }
  };
}
