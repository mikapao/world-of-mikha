// Parent corner — press & hold the ⚙︎ for 1.5 s. Scores per monument entry and per day.
import { allEntries, clearEntries } from "../storage.js";
import { calibrate, baselineDb } from "../mic.js";
import { englishVoices, currentVoiceName, chooseVoice, speak, hasClips, CLIP_VOICE } from "../speech.js";
import { getBrightness, setBrightness, getMusicVolume, setMusicVolume } from "../settings.js";

const gear = document.getElementById("gear");
export const parentOverlay = document.getElementById("parent");
const pcard = document.getElementById("pcard");

let monuments = [];
let blocked = () => false;
export function setupParentCorner(list, isBlocked) { monuments = list; blocked = isBlocked; }

let holdStart = 0, holdRaf = 0;
function tick() {
  const p = Math.min(100, (performance.now() - holdStart) / 15);
  gear.style.setProperty("--p", p);
  if (p >= 100) { stopHold(); openParent(); } else holdRaf = requestAnimationFrame(tick);
}
function stopHold() { cancelAnimationFrame(holdRaf); holdStart = 0; gear.style.setProperty("--p", 0); }
gear.addEventListener("pointerdown", e => { e.preventDefault(); if (blocked()) return; holdStart = performance.now(); tick(); });
["pointerup", "pointerleave", "pointercancel"].forEach(ev => gear.addEventListener(ev, stopHold));
gear.addEventListener("contextmenu", e => e.preventDefault());

const fmtDay = ts => new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtTime = ts => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };

function attemptsSection(list) {
  const byDay = {};
  list.forEach(e => (byDay[dayKey(e.start)] = byDay[dayKey(e.start)] || { ts: e.start, items: [] }).items.push(e));
  const dayRows = Object.values(byDay).map(d => {
    const fin = d.items.filter(e => e.completed).length;
    const q = d.items.reduce((s, e) => s + (e.answered || 0), 0), a = d.items.reduce((s, e) => s + (e.totalAttempts || 0), 0);
    const ft = d.items.reduce((s, e) => s + (e.firstTry || 0), 0);
    return `<tr><td>${fmtDay(d.ts)}</td><td>${d.items.length} (${fin} finished)</td><td><b>${a ? Math.round(q / a * 100) : 0}%</b></td><td>${ft}/${q}</td></tr>`;
  }).join("");
  const entryRows = list.map(e => `<tr><td>${fmtDay(e.start)}<br><span class="muted">${fmtTime(e.start)}</span></td>
    <td><b>${e.score}%</b><br><span class="muted">${e.answered} q / ${e.totalAttempts} tries</span></td>
    <td>${e.firstTry}/${e.answered}</td>
    <td>${(e.questions || []).map(q => q.attempts).join(" · ")}${e.completed ? "" : ' <span class="muted">(left early)</span>'}</td></tr>`).join("");
  return `<h3 style="font-size:16px">Per day</h3>
    <table><tr><th>Day</th><th>Entries</th><th>Score</th><th>First try</th></tr>${dayRows}</table>
    <h3 style="font-size:16px">Per monument entry</h3>
    <table><tr><th>When</th><th>Score</th><th>First try</th><th>Tries per question</th></tr>${entryRows}</table>`;
}

function voiceSection(list) {
  const byDay = {};
  list.forEach(e => (byDay[dayKey(e.start)] = byDay[dayKey(e.start)] || { ts: e.start, items: [] }).items.push(e));
  const dayRows = Object.values(byDay).map(d => {
    const ws = d.items.flatMap(e => e.words || []);
    const avgPeak = ws.length ? Math.round(ws.reduce((s, w) => s + w.peak, 0) / ws.length) : 0;
    return `<tr><td>${fmtDay(d.ts)}</td><td>${d.items.length} (${d.items.filter(e => e.completed).length} finished)</td>
      <td><b>${avgPeak}</b></td><td>${ws.filter(w => w.brave).length}/${ws.length}</td></tr>`;
  }).join("");
  const entryRows = list.map(e => `<tr><td>${fmtDay(e.start)}<br><span class="muted">${fmtTime(e.start)}</span></td>
    <td><b>${e.avgPeak}</b><br><span class="muted">avg while speaking ${e.avgLevel}</span></td>
    <td>${e.braveCount}/${e.answered}</td>
    <td>${(e.words || []).map(w => `${w.say} <b>${w.peak}</b>${w.brave ? "🌟" : ""}`).join(" · ")}${e.completed ? "" : ' <span class="muted">(left early)</span>'}</td></tr>`).join("");
  return `<h3 style="font-size:16px">Per day</h3>
    <table><tr><th>Day</th><th>Entries</th><th>Voice level</th><th>Brave words</th></tr>${dayRows}</table>
    <h3 style="font-size:16px">Per monument entry</h3>
    <table><tr><th>When</th><th>Voice level</th><th>Brave</th><th>Each word (loudest)</th></tr>${entryRows}</table>`;
}

// ---- overall summary across all challenges ----
const DAY = 864e5;
const avgOf = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null;
const mainNum = (m, e) => m.scoring === "attempts" ? e.score : m.scoring === "voice" ? e.avgPeak : null;
function trend(nums) {                       // last 3 vs the 3 before
  if (nums.length < 4) return "—";
  const a = avgOf(nums.slice(0, 3)), b = avgOf(nums.slice(3, 6));
  return a > b + 3 ? "↗️ up" : a < b - 3 ? "↘️ down" : "➡️ steady";
}
function ago(ts) {
  const d = Math.floor((Date.now() - ts) / DAY);
  return d <= 0 ? "today " + fmtTime(ts) : d === 1 ? "yesterday" : d + " days ago";
}
function summarySection(all) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const periods = [["Today", e => e.start >= today.getTime()], ["Last 7 days", e => e.start >= Date.now() - 7 * DAY], ["All time", () => true]];
  const cards = periods.map(([label, f]) => {
    const l = all.filter(f), done = l.filter(e => e.completed);
    const kinds = new Set(done.map(e => e.monument)).size;
    const mins = Math.round(l.reduce((s, e) => s + Math.max(0, (e.end || e.start) - e.start), 0) / 60000);
    return `<div class="scard"><div class="sl">${label}</div><div class="sv">${done.length}</div>
      <div class="muted">challenges finished<br>${kinds}/${monuments.length} different · ${l.length} visits · ${mins} min</div></div>`;
  }).join("");
  const scored = monuments.filter(m => m.scoring === "attempts");
  const learnAvgs = scored.map(m => avgOf(all.filter(e => e.monument === m.id && e.completed).map(e => e.score))).filter(v => v !== null);
  const learn = avgOf(learnAvgs);
  const voiceAll = all.filter(e => e.monument === "singing-stone" && e.completed).map(e => e.avgPeak);
  const voice = avgOf(voiceAll);
  const rows = monuments.map(m => {
    const l = all.filter(e => e.monument === m.id), done = l.filter(e => e.completed);
    const nums = done.map(e => mainNum(m, e)).filter(v => v !== null && v !== undefined);   // newest first
    const unit = m.scoring === "attempts" ? "%" : "";
    const avg = m.scoring === "visits" ? "—" : (avgOf(nums) === null ? "—" : avgOf(nums) + unit);
    const best = m.scoring === "visits" || !nums.length ? "—" : Math.max(...nums) + unit;
    return `<tr><td>${m.emoji} ${m.name}</td><td>${l.length}</td><td>${done.length}</td>
      <td><b>${avg}</b></td><td>${best}</td><td>${m.scoring === "visits" ? "—" : trend(nums)}</td><td class="muted">${l.length ? ago(l[0].start) : "never"}</td></tr>`;
  }).join("");
  return `<div class="pmon psum"><h3>📊 Summary</h3>
    <div class="scards">${cards}</div>
    <div class="scards">
      <div class="scard big"><div class="sl">Overall learning score</div><div class="sv">${learn === null ? "—" : learn + "%"}</div>
        <div class="muted">average of Memory, Vocabulary &amp; Math scores<br>(100% = everything right on the first try)</div></div>
      <div class="scard big"><div class="sl">Average voice level</div><div class="sv">${voice === null ? "—" : voice}</div>
        <div class="muted">Singing Stone, 0–100<br>55+ = brave voice</div></div>
    </div>
    <table><tr><th>Challenge</th><th>Visits</th><th>Finished</th><th>Average</th><th>Best</th><th>Trend</th><th>Last played</th></tr>${rows}</table>
    <div class="muted" style="margin-top:6px">Averages use finished visits. Trend compares the last 3 finished visits with the 3 before. Details for each challenge are below.</div></div>`;
}

function calibrateBox() {
  return `<div class="row" style="justify-content:flex-start;align-items:center">
    <button class="btn sec" id="calib">🎤 Calibrate microphone</button>
    <span class="muted" id="calibInfo">Quiet-room level: ${Math.round(baselineDb())} dB</span></div>`;
}

function visitsSection(list) {
  return `<table><tr><th>When</th><th>Finished</th></tr>${list.map(e =>
    `<tr><td>${fmtDay(e.start)} <span class="muted">${fmtTime(e.start)}</span></td><td>${e.completed ? "yes" : "left early"}</td></tr>`).join("")}</table>`;
}

export async function openParent() {
  const all = (await allEntries()).sort((a, b) => b.start - a.start);
  const sections = monuments.map(m => {
    const list = all.filter(e => e.monument === m.id);
    const body = !list.length ? `<div class="muted">No visits yet.</div>`
      : m.scoring === "attempts" ? attemptsSection(list) : m.scoring === "voice" ? voiceSection(list) : visitsSection(list);
    return `<div class="pmon"><h3>${m.emoji} ${m.name}</h3><div class="muted">${m.scoringNote || ""}</div>${body}${m.scoring === "voice" ? calibrateBox() : ""}</div>`;
  }).join("");
  pcard.innerHTML = `<h2>Parent corner</h2>
    <div class="muted">Scores are only shown here — Mikha just sees gentle feedback.</div>
    ${summarySection(all)}
    <h3 style="margin-top:22px;font-size:20px">📋 Challenge details</h3>
    ${sections}
    <h3 style="margin-top:26px;font-size:20px">⚙️ Settings</h3>
    <div class="pmon"><h3>🔆 Brightness</h3>
      <div class="row" style="justify-content:flex-start;align-items:center;gap:14px">
        <span>🌙</span><input type="range" id="bright" min="50" max="100" step="5" value="${Math.round(getBrightness() * 100)}" style="flex:1;max-width:320px;accent-color:#7cc6e8">
        <span>☀️</span><b id="brightVal" style="min-width:48px">${Math.round(getBrightness() * 100)}%</b></div>
      <div class="muted">Lower = softer on the eyes. Changes the game world straight away.</div></div>
    <div class="pmon"><h3>🎶 Music volume</h3>
      <div class="row" style="justify-content:flex-start;align-items:center;gap:14px">
        <span>🔇</span><input type="range" id="music" min="0" max="100" step="5" value="${Math.round(getMusicVolume() * 100)}" style="flex:1;max-width:320px;accent-color:#7cc6e8">
        <span>🔊</span><b id="musicVal" style="min-width:48px">${Math.round(getMusicVolume() * 100)}%</b></div>
      <div class="muted">Plays public/audio/bgm.mp3 on a loop (if the file is there). 0% = music off.</div></div>
    <div class="pmon"><h3>🗣️ Voice</h3>
      <div class="row" style="justify-content:flex-start;align-items:center;flex-wrap:wrap">
        <select id="voiceSel" style="font-size:16px;padding:8px;border-radius:12px;border:1px solid #dde6ec;max-width:100%"></select>
        <button class="btn sec" id="voiceTest">▶ Test</button></div>
      <div class="muted">🌟 Emma is the recorded voice built into the app (best quality). The tablet's own voices are listed below it —
        best matches (female, British English) first.</div></div>
    <div class="row"><button class="btn warn" id="clr">Clear data</button><button class="btn sec" id="pclose">Close</button></div>`;
  parentOverlay.classList.add("show");
  document.getElementById("pclose").onclick = closeParent;
  const br = document.getElementById("bright");
  br.oninput = () => { setBrightness(br.value / 100); document.getElementById("brightVal").textContent = br.value + "%"; };
  const mu = document.getElementById("music");
  mu.oninput = () => { setMusicVolume(mu.value / 100); document.getElementById("musicVal").textContent = mu.value + "%"; };
  const sel = document.getElementById("voiceSel");
  englishVoices().then(vs => {
    const cur = currentVoiceName();
    const emma = hasClips() ? `<option value="${CLIP_VOICE}" ${cur === CLIP_VOICE ? "selected" : ""}>🌟 Emma — World of Mikha voice (recorded, works offline)</option>` : "";
    sel.innerHTML = emma + (vs.length ? vs.map(v => `<option value="${v.name.replace(/"/g, "&quot;")}" ${v.name === cur ? "selected" : ""}>Tablet voice: ${v.name} (${v.lang})</option>`).join("")
                              : `<option>Tablet default voice</option>`);
  });
  sel.onchange = () => { chooseVoice(sel.value); speak("Hello Mikha! Let's play!"); };
  document.getElementById("voiceTest").onclick = () => speak("Hello Mikha! Let's play!");
  const cb = document.getElementById("calib");
  if (cb) cb.onclick = async () => {
    const info = document.getElementById("calibInfo");
    cb.disabled = true; info.textContent = "Stay quiet for 3 seconds… 🤫";
    const db = await calibrate(3000);
    info.textContent = db === null ? "Couldn't use the microphone — check the app's permission." : `Done! Quiet-room level: ${Math.round(db)} dB`;
    cb.disabled = false;
  };
  const clr = document.getElementById("clr");
  clr.onclick = async () => {
    if (clr.dataset.sure) { await clearEntries(); openParent(); }
    else { clr.dataset.sure = 1; clr.textContent = "Tap again to clear"; }
  };
}
export function closeParent() { parentOverlay.classList.remove("show"); }
