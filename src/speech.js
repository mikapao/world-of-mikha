// Reads text aloud in a friendly female English (British) voice.
// speak() returns a promise that resolves when the voice has finished
// (so the Singing Stone can wait before it starts listening).
// In the Android app we use the tablet's own voices (the WebView has none built in);
// in a normal browser (Wi-Fi preview / GitHub Pages) we use the browser's voices.
// A grown-up can pick a different voice in the parent corner.
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const native = Capacitor.isNativePlatform();
const PICK_KEY = "wom_voice";
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
export const currentVoiceName = () => (chosen ? chosen.name : "");
export function chooseVoice(name) {
  chosen = voices.find(v => v.name === name) || bestVoice();
  try { localStorage.setItem(PICK_KEY, chosen ? chosen.name : ""); } catch (e) {}
}

export function speak(text) {
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

export function stopSpeaking() {
  if (native) { TextToSpeech.stop().catch(() => {}); return; }
  try { speechSynthesis.cancel(); } catch (e) {}
}
