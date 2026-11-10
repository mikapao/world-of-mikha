// World of Mikha — shows the opening screen, builds the world behind it, then runs the game loop.
import { splash } from "./ui/splash.js";                 // first, so the opening screen starts right away
import { App } from "@capacitor/app";
import { renderer, scene, cam, camOffset, sun } from "./engine.js";
import { ping, audio } from "./sound.js";
import { speak, voicesReady } from "./speech.js";
import { startMusic, setDuck } from "./music.js";
import { setRingActive } from "./world/ring.js";
import { whoosh } from "./sound.js";
import { updateOcean } from "./world/ocean.js";
import { buildHomeIsland, updateHomeIsland } from "./world/homeIsland.js";
import { buildBridge } from "./world/bridge.js";
import { buildCrystalIsle, updateCrystalIsle } from "./world/crystalIsle.js";
import { buildWinterIsle, updateWinterIsle } from "./world/winterIsle.js";
import { buildCandyIsle, updateCandyIsle } from "./world/candyIsle.js";
import { buildMeadowIsle, updateMeadowIsle } from "./world/meadowIsle.js";
import { BR, BR3, BR4, BR5 } from "./world/layout.js";
import { updateLighting, sunHeight } from "./world/lighting.js";
import { createMonuments } from "./monuments/index.js";
import { player, setAvatar, updatePlayer, stepOutOf } from "./player.js";
import { getMove, cancelDrag, setBlocked, pulseHint } from "./controls.js";
import { shell } from "./ui/shell.js";
import { buildTitle } from "./ui/title.js";
import { buildTrophies, earnTrophy } from "./ui/trophies.js";
import { showPicker, pickOverlay } from "./ui/picker.js";
import { setupParentCorner, parentOverlay, closeParent } from "./ui/parent.js";
import { content, loadContent } from "./content.js";
import { addEntry } from "./storage.js";

const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
const upTo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);   // never wait forever

let monuments = [];
const uiOpen = () => splash.isOpen() || shell.isOpen() || parentOverlay.classList.contains("show") || pickOverlay.classList.contains("show");
setBlocked(uiOpen);

// ---- build everything step by step, so the loading bar can move ----
async function boot() {
  await nextFrame();
  splash.progress(8, "Filling the waterfall… 💧");
  const contentP = loadContent();
  monuments = createMonuments();                       // monuments first so trees & crystals keep clear
  splash.progress(25, "Planting the trees… 🌳"); await nextFrame();
  buildHomeIsland();
  buildBridge(BR); buildBridge(BR3);
  buildBridge(BR4, [0xffd6e7, 0xfff6ea]);              // wafer-pink candy bridge
  buildBridge(BR5);
  splash.progress(40, "Polishing the crystals… 💎"); await nextFrame();
  buildCrystalIsle();
  splash.progress(52, "Waking up the snowman… ⛄"); await nextFrame();
  buildWinterIsle();
  splash.progress(64, "Baking the cake island… 🍰"); await nextFrame();
  buildCandyIsle();
  splash.progress(76, "Lighting the fireflies… ✨"); await nextFrame();
  buildMeadowIsle();
  buildTitle("World of Mikha");
  buildTrophies(monuments);
  setupParentCorner(monuments, uiOpen);
  splash.progress(86, "Tuning the Singing Stone… 🎵");
  await Promise.all([upTo(contentP, 6000), upTo(voicesReady, 3000), upTo(document.fonts ? document.fonts.ready : null, 3000)]);
  splash.progress(94, "Almost there… 🌈"); await nextFrame();
  try { renderer.compile(scene, cam); } catch (e) {}
  requestAnimationFrame(loop);                         // start drawing the world behind the opening screen
  await nextFrame(); await nextFrame();
  await splash.waitMin();
  splash.ready(() => {
    audio(); ping(1.2); startMusic();
    speak("Welcome to the World of Mikha!");
    showPicker(a => { setAvatar(a.id); speak(`Hello, ${a.name}!`); pulseHint(); });
  });
}
boot();

// ---- entering a monument ----
const enterBtn = document.getElementById("enter");
let nearMon = null, litMon = null;
enterBtn.addEventListener("click", () => {
  const m = nearMon; if (!m || uiOpen()) return;
  cancelDrag();
  setDuck(0);                                          // music fully off during a challenge…
  shell.open(() => { m.onLeave(); stepOutOf(m); setDuck(1); });   // …back on when the window closes (left or finished)
  m.start({
    shell, speak, ping,
    content: content.data[m.id], contentVersion: content.version,
    saveEntry: e => { addEntry(e); if (e.completed) earnTrophy(m.id); }
  });
});

// ---- Android back button: never quits the game by accident ----
try {
  App.addListener("backButton", () => {
    if (shell.isOpen()) shell.askLeave();
    else if (parentOverlay.classList.contains("show")) closeParent();
  }).catch(() => {});
} catch (e) { /* running in a normal browser */ }

// ---- game loop ----
const camTarget = player.position.clone();
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now; const t = now / 1000;

  updatePlayer(dt, t, uiOpen() ? null : getMove());
  updateLighting(dt, t, player.position);
  for (const m of monuments) m.update(t, dt);
  updateOcean(t);
  updateHomeIsland(t, dt);
  updateCrystalIsle(t);
  updateWinterIsle(t, dt);
  updateCandyIsle(t);
  updateMeadowIsle(t, dt);

  camTarget.lerp(player.position, Math.min(1, dt * 3));
  cam.position.copy(camTarget).add(camOffset); cam.lookAt(camTarget);
  sun.position.set(camTarget.x + 12, sunHeight(), camTarget.z + 6); sun.target.position.copy(camTarget);

  // standing in a monument's circle? (inside a challenge we keep it gold)
  let inCircle = null;
  for (const m of monuments) if (Math.hypot(player.position.x - m.ring.x, player.position.z - m.ring.z) < 2.3) inCircle = m;
  if (inCircle !== litMon && !shell.isOpen()) {
    if (litMon) setRingActive(litMon.ringMesh, false);           // walked away → back to red
    if (inCircle) { setRingActive(inCircle.ringMesh, true); whoosh(); }   // stepped in → gold flash + whoosh
    litMon = inCircle;
  }
  nearMon = uiOpen() ? null : inCircle;
  if (nearMon && enterBtn.textContent !== nearMon.label) enterBtn.textContent = nearMon.label;
  enterBtn.classList.toggle("show", !!nearMon);

  renderer.render(scene, cam);
  requestAnimationFrame(loop);
}
