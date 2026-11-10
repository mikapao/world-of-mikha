// ✨ Firefly Pond — mental focus. Firefly meadow (night).
// A calm visit with three little activities (order set in public/content/focus.json):
//   follow  – watch the golden firefly, they all drift around, then tap the one that was golden
//   odd     – which one is different? (🐸🐸🐢🐸🐸)
//   breathe – breathe in and out with a glowing firefly bubble
// No score — the parent corner just logs each visit and whether it was finished.
import * as THREE from "three";
import { mat, mesh, rnd } from "../engine.js";
import { I5, obstacles } from "../world/layout.js";
import { isle5, reservedMeadow } from "../world/meadowIsle.js";
import { nightAmount } from "../world/lighting.js";
import { makeRing, pulseRing } from "../world/ring.js";
import { LEAVE_BUTTON } from "../ui/shell.js";
import { shuffle, dots } from "../ui/util.js";

const P = { x: -1, z: -1.4 };                 // pond centre, local to the meadow
const R = { x: P.x + 2.6, z: P.z + 2.6 };     // its circle, toward the camera
const wait = ms => new Promise(r => setTimeout(r, ms));

export function createFireflyPond() {
  // ---- 3D monument: a little night pond ----
  const g = new THREE.Group(); g.position.set(P.x, 0, P.z); isle5.add(g);
  g.add(mesh(new THREE.CylinderGeometry(2, 2, 0.1, 22), mat(0x24406b, { roughness: 0.15, metalness: 0.2 }), 0, 0.03, 0, false));
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * 6.28;
    g.add(mesh(new THREE.DodecahedronGeometry(rnd(0.22, 0.32), 0), mat(0x8c8f99), Math.cos(a) * 2.1, 0.1, Math.sin(a) * 2.1));
  }
  [[0.6, 0.5], [-0.8, 0.2], [0.1, -0.9], [-0.3, 1.0], [1.1, -0.4]].forEach(([x, z], i) => {
    const pad = mesh(new THREE.CircleGeometry(0.32, 10, 0.3, 5.7), mat(0x4f9a5c), x, 0.1, z, false);
    pad.rotation.x = -Math.PI / 2; pad.rotation.z = i; g.add(pad);
    if (i % 2 === 0) {
      const lotus = mesh(new THREE.ConeGeometry(0.12, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xffa8d0, emissive: 0xff7fb8, emissiveIntensity: 0.25, flatShading: true }), x, 0.2, z, false);
      lotus.rotation.x = Math.PI; g.add(lotus);
    }
  });
  [[1.9, 0.9], [2.0, 0.3], [-1.6, -1.3], [-1.9, -0.6]].forEach(([x, z]) => {
    g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 4), mat(0x5f8a4a), x, 0.65, z, false));
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 6), mat(0x7a5236), x, 1.2, z, false));
  });
  // the pond's own firefly swarm
  const swarm = [];
  for (let i = 0; i < 18; i++) {
    const f = mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xe6ff8a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 1, 0, false);
    f.userData = { r: rnd(0.4, 1.8), h: rnd(0.6, 2.2), sp: rnd(0.3, 0.8) * (i % 2 ? 1 : -1), ph: rnd(0, 6) }; g.add(f); swarm.push(f);
  }
  const glow = new THREE.PointLight(0xd8ff8a, 0, 6); glow.position.set(0, 1.4, 0); g.add(glow);
  obstacles.push({ x: I5.x + P.x, z: I5.z + P.z, r: 2.15 });
  reservedMeadow.push({ x: P.x, z: P.z }, { x: R.x, z: R.z });
  const ring = makeRing(1.5); ring.position.set(R.x, 0, R.z); isle5.add(ring);
  let done = false;

  // ---- challenge ----
  let ctx = null, entry = null, plan = [], ri = 0, run = 0, cfg = {};
  const alive = my => my === run && ctx.shell.isOpen();

  function frame(prompt, inner, extra = "") {
    ctx.shell.render(`${LEAVE_BUTTON}<button class="say" title="Hear again">🔊</button>
      ${dots(plan.length, ri)}
      <div class="prompt">${prompt}</div>
      <div class="fbox">${inner}</div>
      <div class="feedback"></div>${extra}`);
    ctx.shell.card.querySelector(".say").onclick = () => ctx.speak(prompt.replace(/[^\w\s'!?.,…]/g, "").trim());
  }
  const fb = (txt, col = "#6bb57c") => { const f = ctx.shell.card.querySelector(".feedback"); if (f) { f.style.color = col; f.textContent = txt; } };

  // follow the golden firefly
  async function follow(my) {
    const f = cfg.follow || {}, n = Math.max(2, Math.min(6, f.fireflies || 4)), secs = f.seconds || 6;
    const flies = Array.from({ length: n }, (_, i) => ({ x: 15 + (i % 3) * 32 + rnd(-6, 6), y: 25 + Math.floor(i / 3) * 40 + rnd(-6, 6), vx: rnd(-1, 1), vy: rnd(-1, 1) }));
    const target = Math.floor(Math.random() * n);
    frame("Watch the golden firefly! ✨", flies.map((p, i) => `<div class="ffly${i === target ? " gold" : ""}" data-i="${i}" style="left:${p.x}%;top:${p.y}%"><i></i></div>`).join(""));
    const els = [...ctx.shell.card.querySelectorAll(".ffly")];
    await ctx.speak("Watch the golden firefly!");
    if (!alive(my)) return false;
    await wait(1200); if (!alive(my)) return false;
    els.forEach(e => e.classList && e.classList.remove("gold"));
    const pr = ctx.shell.card.querySelector(".prompt"); if (pr) pr.textContent = "Keep watching… 👀";
    ctx.speak("Keep watching!");
    // drift slowly, bouncing gently inside the box
    await new Promise(res => {
      let last = performance.now(); const end = last + secs * 1000;
      (function tick(now) {
        if (!alive(my)) { res(); return; }
        now = now || performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
        flies.forEach((p, i) => {
          p.vx += rnd(-1, 1) * dt * 3; p.vy += rnd(-1, 1) * dt * 3;
          const sp = Math.hypot(p.vx, p.vy) || 1, max = 1; if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
          p.x += p.vx * dt * 14; p.y += p.vy * dt * 14;
          if (p.x < 8 || p.x > 92) p.vx *= -1; if (p.y < 12 || p.y > 88) p.vy *= -1;
          p.x = Math.min(92, Math.max(8, p.x)); p.y = Math.min(88, Math.max(12, p.y));
          if (els[i] && els[i].style) { els[i].style.left = p.x + "%"; els[i].style.top = p.y + "%"; }
        });
        now < end ? requestAnimationFrame(tick) : res();
      })();
    });
    if (!alive(my)) return false;
    if (pr) pr.textContent = "Which one was golden? Tap it! 👆";
    ctx.speak("Which one was golden? Tap it!");
    let wrong = 0;
    await new Promise(res => els.forEach((e, i) => e.onclick = () => {
      if (!alive(my) || e.disabled) return;
      if (i === target) {
        e.classList.add("gold", "found"); els.forEach(x => x.onclick = null);
        fb("You found it! ✨"); ctx.ping(1.5); ctx.speak("You found it!"); res();
      } else {
        wrong++; e.classList.add("dim"); e.disabled = true;
        fb(wrong >= 2 ? "It's this one — look, it's glowing! 💛" : "Not that one — try again 💛", "#d9879c");
        if (wrong >= 2) els[target].classList.add("hint");
      }
    }));
    await wait(1500);
    return alive(my);
  }

  // which one is different?
  async function odd(my) {
    const pool = (cfg.odd || []).filter(o => o.same && o.odd);
    const o = pool.length ? pool[Math.floor(Math.random() * pool.length)] : { same: "🐸", odd: "🐢", count: 5 };
    const n = Math.max(3, Math.min(9, o.count || 5)), at = Math.floor(Math.random() * n);
    frame("Which one is different? 🔍", `<div class="oddrow">${Array.from({ length: n }, (_, i) => `<button class="oddb" data-i="${i}">${i === at ? o.odd : o.same}</button>`).join("")}</div>`);
    ctx.speak("Which one is different?");
    const btns = [...ctx.shell.card.querySelectorAll(".oddb")];
    await new Promise(res => btns.forEach((b, i) => b.onclick = () => {
      if (!alive(my) || b.disabled) return;
      if (i === at) { b.classList.add("ok"); btns.forEach(x => x.onclick = null); fb("Yes! That one is different! 🌟"); ctx.ping(1.5); ctx.speak("Yes! That one is different!"); res(); }
      else { b.classList.add("dim", "shake"); b.disabled = true; fb("Look closely… 💛", "#d9879c"); }
    }));
    await wait(1500);
    return alive(my);
  }

  // breathe with the firefly bubble
  async function breathe(my) {
    const b = cfg.breathe || {}, cycles = b.cycles || 3, inS = b.inSeconds || 4, outS = b.outSeconds || 4;
    frame("Let's breathe with the firefly 🌙", `<div class="bubble"></div><div class="btext"></div>`);
    await ctx.speak("Let's breathe slowly with the firefly.");
    const bub = ctx.shell.card.querySelector(".bubble"), tx = ctx.shell.card.querySelector(".btext");
    for (let c = 0; c < cycles; c++) {
      if (!alive(my)) return false;
      bub.style.transition = `transform ${inS}s ease-in-out`; bub.style.transform = "scale(1.8)"; tx.textContent = "Breathe in… 🌬️"; ctx.speak("Breathe in");
      await wait(inS * 1000); if (!alive(my)) return false;
      bub.style.transition = `transform ${outS}s ease-in-out`; bub.style.transform = "scale(1)"; tx.textContent = "Breathe out…"; ctx.speak("Breathe out");
      await wait(outS * 1000);
    }
    if (!alive(my)) return false;
    tx.textContent = "So calm. Well done 🌙"; ctx.speak("So calm. Well done.");
    await wait(1800);
    return alive(my);
  }

  async function play() {
    const my = ++run;
    for (ri = 0; ri < plan.length; ri++) {
      const step = plan[ri];
      const ok = step === "follow" ? await follow(my) : step === "odd" ? await odd(my) : await breathe(my);
      if (!ok || !alive(my)) return;
      entry.rounds.push(step);
    }
    finish();
  }

  function finish() {
    run++;
    entry.completed = true; entry.end = Date.now(); entry.saved = true; ctx.saveEntry(entry);
    done = true;
    ctx.shell.render(`${dots(plan.length, plan.length)}<div class="big">✨</div>
      <div class="prompt" style="margin:8px 10px">Beautiful focus! The fireflies are dancing for you!</div>
      <button class="btn back">Back to the island 🏝️</button>`);
    ctx.speak("Beautiful focus! The fireflies are dancing for you!");
    ctx.shell.card.querySelector(".back").onclick = () => ctx.shell.leave();
  }

  return {
    id: "firefly-pond", name: "Firefly Pond", emoji: "✨", label: "✨ Enter",
    scoring: "visits", scoringNote: "No score — just a calm focus break. Each visit is listed below.",
    ringMesh: ring,
    ring: { x: I5.x + R.x, z: I5.z + R.z }, center: { x: I5.x + P.x, z: I5.z + P.z },

    start(c) {
      ctx = c; cfg = c.content || {};
      plan = (cfg.rounds && cfg.rounds.length ? cfg.rounds : ["follow", "odd", "breathe"]).filter(r => ["follow", "odd", "breathe"].includes(r));
      entry = { monument: "firefly-pond", contentVersion: c.contentVersion, start: Date.now(), rounds: [], completed: false };
      play();
    },

    onLeave() {
      run++;
      if (entry && !entry.saved) { entry.end = Date.now(); entry.saved = true; ctx.saveEntry(entry); }
    },

    update(t, dt) {
      pulseRing(ring, t, dt);
      const n = nightAmount(), boost = done ? 1 : 0;
      glow.intensity = n * (0.5 + boost * 0.7);
      swarm.forEach(f => {
        const u = f.userData, a = t * u.sp + u.ph;
        const r = done ? 1.2 + Math.sin(t * 2 + u.ph) * 0.2 : u.r;
        f.position.set(Math.cos(a) * r, (done ? 1.6 + Math.sin(a * 2) * 0.4 : u.h + Math.sin(t * 1.3 + u.ph) * 0.25), Math.sin(a) * r);
        f.material.opacity = (0.15 + n * 0.75) * (0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 + u.ph * 3)));
      });
    }
  };
}
