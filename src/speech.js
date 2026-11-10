// Reads text aloud in a friendly female British voice.
// speak() returns a promise that resolves when the voice has finished
// (so the Singing Stone can wait before it starts listening).
//
// 1st choice: the "Emma" voice clips recorded by the cloud build (public/voice/, see scripts/)
//             — same lovely voice on every tablet, works offline. Played sentence by sentence.
// 2nd choice: the tablet's own text-to-speech voice (for any sentence that has no clip yet).
// A grown-up can switch to a tablet voice in the parent corner.
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { audio } from "./sound.js";
import { splitSentences, keyOf } from "./voiceKey.js";
import { CONTENT_URL } from "./config.js";

const native = Capacitor.isNativePlatform();
const PICK_KEY = "wom_voice";
export const CLIP_VOICE = "__clips__";      // special "voice name" meaning: use the recorded Emma clips
let useClips = true;                          // (declared early: loadVoices() below can set it straight away)
const RATE = 0.85, PITCH = 1.1;

// name hints for female voices (Android Google voices, Windows, Mac, Chrome)
const FEMALE = ["gba", "gbc", "gbg", "hazel", "susan", "libby", "sonia", "maisie", "mia", "kate", "serena",
  "stephanie", "martha", "amy", "emma", "fiona", "moira", "karen", "samantha", "zira", "aria", "jenny", "natasha"];
const MALE = ["gbb", "gbd", "rjs", "george", "ryan", "thomas", "daniel", "oliver", "arthur", "david", "mark", "guy", "william"];

let voices = [];          // [{ idx, name, lang, local }]
let chosen = null;        // one of voices, or null = engine default

const norm = l => (l || "").replace("_", "-").toLowerCase();
const has = (name, list) => list.some(k => new RegExp(`(^|[^a-z])${k}`, "i").test(name));

function score(v) {
  const lang = norm(v.lang), n = v.name.toLowerCase();
  let s = 0;
  if (lang === "en-gb") s += 100; else if (lang.startsWith("en-au") || lang.startsWith("en-ie")) s += 40; else if (lang.startsWith("en")) s += 20; else return -1;
  const female = n.includes("female") || has(n, FEMALE);
  const male = !n.includes("female") && (/(^|[^a-z])male/.test(n) || has(n, MALE));
  if (female) s += 50;
  if (male) s -= 60;
  if (v.local) s += 10;                                  // works offline
  if (n.includes("network")) s -= 5;
  return s;
}

async function loadVoices() {
  try {
    if (native) {
      const r = await TextToSpeech.getSupportedVoices();
      voices = (r.voices || []).map((v, idx) => ({ idx, name: v.name || v.voiceURI || `voice ${idx}`, lang: v.lang, local: !!v.localService }));
    } else {
      let list = speechSynthesis.getVoices();
      if (!list.length) await new Promise(res => { speechSynthesis.onvoiceschanged = res; setTimeout(res, 1500); });
      list = speechSynthesis.getVoices();
      voices = list.map((v, idx) => ({ idx, name: v.name, lang: v.lang, local: !!v.localService, web: v }));
    }
  } catch (e) { voices = []; }
  let saved = null; try { saved = localStorage.getItem(PICK_KEY); } catch (e) {}
  useClips = !saved || saved === CLIP_VOICE;
  chosen = voices.find(v => v.name === saved) || bestVoice();
}
function bestVoice() {
  const ranked = voices.map(v => [score(v), v]).filter(p => p[0] >= 0).sort((a, b) => b[0] - a[0]);
  return ranked.length ? ranked[0][1] : null;
}
const ready = loadVoices();
export const voicesReady = ready;

/** English voices for the parent corner, best matches first */
export async function englishVoices() {
  await ready;
  return voices.filter(v => norm(v.lang).startsWith("en")).sort((a, b) => score(b) - score(a));
}
export const currentVoiceName = () => (useClips && hasClips() ? CLIP_VOICE : chosen ? chosen.name : "");
export function chooseVoice(name) {
  if (name === CLIP_VOICE) { useClips = true; try { localStorage.setItem(PICK_KEY, CLIP_VOICE); } catch (e) {} return; }
  useClips = false;
  chosen = voices.find(v => v.name === name) || bestVoice();
  try { localStorage.setItem(PICK_KEY, chosen ? chosen.name : ""); } catch (e) {}
}

// ---------------- recorded voice clips ----------------
const pack = new Map();                       // sentence key → clip URL
const LOCAL_VOICE = "./voice/";
const fetchJSON = (url, ms = 5000) => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { signal: c.signal, cache: "no-store" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).finally(() => clearTimeout(t));
};
async function loadPack() {
  try { const idx = await fetchJSON(LOCAL_VOICE + "index.json"); for (const [k, f] of Object.entries(idx.lines || {})) pack.set(k, LOCAL_VOICE + f); }
  catch (e) { /* no clips packed in (e.g. local dev) — the tablet voice is used */ }
  // clips for questions added later via GitHub Pages
  if (CONTENT_URL && navigator.onLine) {
    try {
      const base = CONTENT_URL.replace(/content\/?$/, "voice/");
      const idx = await fetchJSON(base + "index.json");
      for (const [k, f] of Object.entries(idx.lines || {})) if (!pack.has(k)) pack.set(k, base + f);
    } catch (e) {}
  }
}
const packReady = loadPack();
export const hasClips = () => pack.size > 0;

const buffers = new Map();                    // url → Promise<AudioBuffer>
function clip(url) {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => audio().decodeAudioData(b, res, rej))).catch(e => { buffers.delete(url); throw e; }));
  return buffers.get(url);
}
let source = null, token = 0;
function playBuffer(buf) {
  return new Promise(res => {
    const a = audio(); const s = a.createBufferSource(); s.buffer = buf;
    s.connect(a.destination);
    s.onended = () => { if (source === s) source = null; res(); };
    source = s; s.start();
  });
}

/** say one piece of text with the tablet's own voice */
function speakTTS(text) {
  return new Promise(resolve => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    setTimeout(fin, 1500 + text.length * 120);          // safety net if "finished" never arrives
    ready.then(() => {
      if (native) {
        const opts = { text, lang: chosen ? chosen.lang : "en-GB", rate: RATE, pitch: PITCH, volume: 1.0, category: "ambient" };
        if (chosen) opts.voice = chosen.idx;
        TextToSpeech.stop().catch(() => {}).finally(() => TextToSpeech.speak(opts).then(fin, fin));
        return;
      }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = chosen ? chosen.lang : "en-GB"; if (chosen && chosen.web) u.voice = chosen.web;
        u.rate = RATE; u.pitch = PITCH;
        u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
      } catch (e) { fin(); }
    });
  });
}

/** say text: recorded clips sentence by sentence, tablet voice for anything without a clip */
export function speak(text) {
  const my = ++token;
  stopNow();
  return (async () => {
    await Promise.race([packReady, new Promise(r => setTimeout(r, 1500))]);
    for (const part of splitSentences(text)) {
      if (my !== token) return;
      const url = useClips && pack.get(keyOf(part));
      if (url && audio()) {
        try { const buf = await clip(url); if (my !== token) return; await playBuffer(buf); continue; }
        catch (e) { /* fall through to the tablet voice */ }
      } else if (useClips && hasClips()) console.info("[voice] no recorded clip for:", part);
      if (my !== token) return;
      await speakTTS(part);
    }
  })();
}

function stopNow() {
  if (source) { try { source.onended = null; source.stop(); } catch (e) {} source = null; }
  if (native) { TextToSpeech.stop().catch(() => {}); return; }
  try { speechSynthesis.cancel(); } catch (e) {}
}
export function stopSpeaking() { token++; stopNow(); }
