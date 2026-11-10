// "Who do you want to be today?" — each avatar spins on its own little 3D card.
import * as THREE from "three";
import { AVATARS } from "../avatars/index.js";

export const pickOverlay = document.getElementById("pick");

export function showPicker(onPick) {
  const row = document.getElementById("pickRow"); row.innerHTML = "";
  const previews = [];
  pickOverlay.classList.add("show");
  AVATARS.forEach(a => {
    const btn = document.createElement("button"); btn.className = "pickc";
    const c = document.createElement("canvas"); c.width = 360; c.height = 378;
    btn.appendChild(c); btn.insertAdjacentHTML("beforeend", `<div class="nm">${a.name}</div>`);
    row.appendChild(btn);
    try {
      const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); r.setSize(360, 378, false);
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0xc8b8d8, 0.85));
      const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(3, 5, 4); sc.add(dl);
      const pc = new THREE.PerspectiveCamera(30, 360 / 378, 0.1, 50); pc.position.set(0, 1.45, 5.6); pc.lookAt(0, 1.05, 0);
      const m = a.build(); sc.add(m.root);
      previews.push({ r, sc, pc, m });
    } catch (e) { /* no preview — the name is still tappable */ }
    btn.onclick = () => {
      previews.forEach(p => { try { p.r.dispose(); } catch (e) {} }); previews.length = 0;
      pickOverlay.classList.remove("show");
      onPick(a);
    };
  });
  (function spin(now) {
    if (!previews.length) return;
    const t = now / 1000;
    previews.forEach((p, i) => {
      p.m.root.rotation.y = Math.sin(t * 0.8 + i) * 0.6;
      p.m.body.position.y = Math.abs(Math.sin(t * 2.4 + i)) * 0.06;
      p.m.idle(t, false); p.r.render(p.sc, p.pc);
    });
    requestAnimationFrame(spin);
  })(0);
}
