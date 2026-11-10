// ⛄ Memory Snowman — knowledge memorizing ("What's missing?"). Winter Wonderland.
// The snowman shows a few things, snow covers them, one disappears — Mikha taps the missing one.
// Rounds come from public/content/memory.json.
// Score: tries needed per question vs total questions (same as the Counting Waterfall).
import * as THREE from "three";
import { mat, mesh, rnd } from "../engine.js";
import { I3, obstacles } from "../world/layout.js";
import { isle3, reservedWinter } from "../world/winterIsle.js";
import { makeRing, pulseRing } from "../world/ring.js";
import { LEAVE_BUTTON } from "../ui/shell.js";
import { shuffle, dots } from "../ui/util.js";
import { finalizeAttempts } from "../storage.js";

const S = { x: -1, z: -1.5 };                 // snowman, local to Winter Wonderland
const R = { x: S.x + 2.4, z: S.z + 2.4 };     // its circle, toward the camera
const wait = ms => new Promise(r => setTimeout(r, ms));

export function createSnowman() {
  // ---- 3D monument ----
  const mound = mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.25, 12), mat(0xffffff), S.x, 0.12, S.z); isle3.add(mound);
  obstacles.push({ x: I3.x + S.x, z: I3.z + S.z, r: 1.4 });
  reservedWinter.push({ x: S.x, z: S.z }, { x: R.x, z: R.z });

  const g = new THREE.Group(); g.position.set(S.x, 0.25, S.z); g.rotation.y = Math.PI / 4; isle3.add(g);
  const snowM = mat(0xf0f4f8), coal = mat(0x2f3440, { roughness: 0.5 });
  g.add(mesh(new THREE.SphereGeometry(0.95, 12, 10), snowM, 0, 0.85, 0));
  g.add(mesh(new THREE.SphereGeometry(0.7, 12, 10), snowM, 0, 2.05, 0));
  const head = new THREE.Group(); head.position.y = 2.95; g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.5, 12, 10), snowM, 0, 0, 0));
  [-0.17, 0.17].forEach(x => head.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), coal, x, 0.1, 0.45, false)));
  [-0.18, -0.09, 0, 0.09, 0.18].forEach(x => head.add(mesh(new THREE.SphereGeometry(0.035, 5, 4), coal, x, -0.17 - (0.18 - Math.abs(x)) * 0.35, 0.44, false)));
  const nose = mesh(new THREE.ConeGeometry(0.07, 0.42, 6), mat(0xff8a2b), 0, 0, 0.66, false); nose.rotation.x = Math.PI / 2; head.add(nose);
  // top hat with pink band
  head.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 14), coal, 0, 0.42, 0));
  head.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.5, 14), coal, 0, 0.7, 0));
  head.add(mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.1, 14), mat(0xff8fb1), 0, 0.52, 0, false));
  const star = mesh(new THREE.OctahedronGeometry(0.16, 0), mat(0xd4dbe2, { emissive: 0x000000 }), 0, 1.25, 0, false); head.add(star);
  // cosy striped scarf
  const scarf = mesh(new THREE.TorusGeometry(0.46, 0.13, 6, 14), mat(0xe8475f), 0, 2.58, 0); scarf.rotation.x = Math.PI / 2; g.add(scarf);
  const tail = mesh(new THREE.BoxGeometry(0.22, 0.6, 0.08), mat(0xe8475f), 0.28, 2.25, 0.5); tail.rotation.z = 0.2; g.add(tail);
  [0.2, 0.42].forEach(y => g.add(mesh(new THREE.BoxGeometry(0.24, 0.06, 0.09), mat(0xffffff), 0.28 + (0.45 - y) * 0.2, 2.25 + 0.3 - y, 0.51, false)));
  // coal buttons
  [2.3, 2.05, 1.8].forEach(y => g.add(mesh(new THREE.SphereGeometry(0.065, 6, 5), coal, 0, y - 0.15, 0.66, false)));
  // stick arms (right one waves when finished)
  const stick = mat(0x7a5638);
  const armL = new THREE.Group(); armL.position.set(-0.62, 2.15, 0); armL.rotation.z = 0.7; g.add(armL);
  armL.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.0, 5), stick, 0, 0.5, 0));
  const armR = new THREE.Group(); armR.position.set(0.62, 2.15, 0); armR.rotation.z = -0.7; g.add(armR);
  armR.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.0, 5), stick, 0, 0.5, 0));
  [-0.15, 0.15].forEach(x => armR.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.25, 4), stick, x * 0.6, 0.95, 0, false).rotateZ(x * 3)));
  // icy circle
  const ring = makeRing(1.5); ring.position.set(R.x, 0, R.z); isle3.add(ring);
  const sparkles = []; let done = false;

  function lightUp() {
    done = true;
    star.material.color.set(0xffe28a); star.material.emissive.set(0xffc94d); star.material.emissiveIntensity = 0.9;
    if (sparkles.length) return;
    for (let i = 0; i < 16; i++) {
      const s = mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: Math.random() }),
        rnd(-1.2, 1.2), rnd(1, 4.5), rnd(-1.2, 1.2), false);
      g.add(s); sparkles.push(s);
    }
  }

  // ---- challenge ----
  let ctx = null, entry = null, list = [], qi = 0, tries = 0, run = 0, busy = false, distract = [];
  let phasePrompt = "";
  const alive = myRun => myRun === run && ctx.shell.isOpen();

  function render(q, cards, prompt, extra = "") {
    phasePrompt = prompt;
    ctx.shell.render(`${LEAVE_BUTTON}<button class="say" title="Hear again">🔊</button>
      ${dots(list.length, qi)}
      <div class="prompt">${prompt}</div>
      <div class="mrow">${cards}</div>
      ${extra}`);
    ctx.shell.card.querySelector(".say").onclick = () => ctx.speak(phasePrompt.replace(/<[^>]+>|[^\w\s'!?.,]/g, "").trim());
  }

  async function round() {
    const myRun = ++run, q = list[qi]; tries = 0; busy = false;
    const items = q.items.slice(0, 6);
    const missIdx = q.missing && items.includes(q.missing) ? items.indexOf(q.missing) : Math.floor(Math.random() * items.length);
    const missing = items[missIdx];

    // 1. look
    const showMs = (ctx.content && ctx.content.showSeconds || 5) * 1000;
    render(q, items.map(e => `<div class="mcard">${e}</div>`).join(""), "Look carefully! 👀",
      `<div class="tbar"><div style="animation-duration:${showMs}ms"></div></div>`);
    await ctx.speak("Look carefully! Remember them all.");
    if (!alive(myRun)) return;
    await wait(Math.max(1200, showMs - 2500));
    if (!alive(myRun)) return;

    // 2. snow covers everything
    render(q, items.map(() => `<div class="mcard snow">❄️</div>`).join(""), "Whoosh! Snow is falling… ❄️");
    ctx.speak("Whoosh! Snow is falling!");
    await wait(1800);
    if (!alive(myRun)) return;

    // 3. what's missing?
    const others = shuffle(distract.filter(d => !items.includes(d))).slice(0, 2);
    const choices = shuffle([missing, ...others]);
    render(q, items.map((e, i) => i === missIdx ? `<div class="mcard empty">❓</div>` : `<div class="mcard">${e}</div>`).join(""),
      "What is missing? 🤔",
      `<div class="choices">${choices.map(c => `<button class="choice mchoice" data-v="${c}">${c}</button>`).join("")}</div>
       <div class="feedback"></div>`);
    ctx.speak("What is missing?");
    ctx.shell.card.querySelectorAll(".mchoice").forEach(b => b.onclick = () => answer(b, q, missing, myRun));
  }

  function answer(btn, q, missing, myRun) {
    if (busy || btn.disabled || !alive(myRun)) return;
    tries++;
    const card = ctx.shell.card, fb = card.querySelector(".feedback");
    if (btn.dataset.v === missing) {
      busy = true; btn.classList.add("ok");
      card.querySelectorAll(".mchoice").forEach(b => { if (b !== btn) b.classList.add("dim"); });
      const empty = card.querySelector(".mcard.empty");
      if (empty) { empty.textContent = missing; empty.classList.remove("empty"); empty.classList.add("found"); }
      const cheer = [["You remembered! 🌟", "You remembered!"], ["Super memory! ⛄", "Super memory!"], ["Brilliant! ❄️", "Brilliant!"]][qi % 3];
      fb.style.color = "#6bb57c"; fb.textContent = cheer[0];
      setTimeout(() => ctx.ping(1.5), 140); ctx.speak(cheer[1]);
      entry.questions.push({ id: q.id, attempts: tries });
      setTimeout(() => { if (!alive(myRun)) return; qi++; qi < list.length ? round() : finish(); }, 1600);
    } else {
      btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake", "dim"); btn.disabled = true;
      fb.style.color = "#d9879c"; fb.textContent = ["Try another one 💛", "Hmm, not that one 🌼", "Almost! 🐧"][(tries - 1) % 3];
    }
  }

  function finish() {
    run++;
    entry.completed = true; ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true;
    lightUp();
    ctx.shell.render(`${dots(list.length, list.length)}<div class="big">⛄</div>
      <div class="prompt" style="margin:8px 10px">What a super memory! The snowman is waving at you!</div>
      <button class="btn back">Back to the island 🏝️</button>`);
    ctx.speak("What a super memory! The snowman is waving at you!");
    ctx.shell.card.querySelector(".back").onclick = () => ctx.shell.leave();
  }

  return {
    id: "memory-snowman", name: "Memory Snowman", emoji: "⛄", label: "⛄ Enter",
    scoring: "attempts", scoringNote: "Score = questions ÷ total tries (100% = remembered every one on the first try)",
    ringMesh: ring,
    ring: { x: I3.x + R.x, z: I3.z + R.z }, center: { x: I3.x + S.x, z: I3.z + S.z },

    start(c) {
      ctx = c; run++;
      const data = c.content || {};
      const pool = (data.questions || []).filter(q => q.items && q.items.length >= 2);
      distract = data.distractors || ["🍎", "⭐", "🐟", "🎈", "🌸", "🍪", "🧸", "🔔", "🚗", "🐱"];
      if (!pool.length) {
        c.shell.render(`${LEAVE_BUTTON}<div class="big">⛄</div><div class="prompt">The snowman is napping. Come back soon!</div>`);
        entry = null; return;
      }
      list = shuffle(pool).slice(0, data.questionsPerVisit || 5); qi = 0;
      entry = { monument: "memory-snowman", contentVersion: c.contentVersion, start: Date.now(), questions: [], completed: false };
      round();
    },

    onLeave() {
      run++; busy = false;
      if (entry && !entry.saved && entry.questions.length) { ctx.saveEntry(finalizeAttempts(entry)); entry.saved = true; }
    },

    update(t, dt) {
      pulseRing(ring, t, dt);
      head.rotation.z = Math.sin(t * 1.1) * 0.05;
      armR.rotation.z = done ? -0.35 + Math.sin(t * 6) * 0.4 : -0.7 + Math.sin(t * 1.3) * 0.05;   // waves when finished
      star.rotation.y += dt * (done ? 2 : 0.5);
      for (const s of sparkles) {
        s.position.y += dt * 0.5; s.material.opacity -= dt * 0.3;
        if (s.material.opacity <= 0) { s.position.set(rnd(-1.2, 1.2), rnd(1, 2.5), rnd(-1.2, 1.2)); s.material.opacity = 1; }
      }
    }
  };
}
