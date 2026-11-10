// Question content for every monument.
// 1. Uses the copy packed inside the app (public/content/) — works offline.
// 2. Uses a newer copy saved from an earlier update, if there is one.
// 3. In the background, checks GitHub Pages for an even newer version and saves it.
//    New questions show up the next time a monument is entered.
import { CONTENT_URL } from "./config.js";

const LOCAL = "./content/";
const CACHE_KEY = "wom_content_cache_v1";

export const content = { version: 0, data: {} };   // data[monumentId] = that monument's JSON

async function getJSON(url, ms = 5000) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(tm); }
}

async function loadAll(base) {
  const index = await getJSON(base + "index.json");          // { version, monuments: { id: "file.json" } }
  const data = {};
  for (const [id, file] of Object.entries(index.monuments)) data[id] = await getJSON(base + file);
  return { version: index.version, data };
}

function apply(pack) { content.version = pack.version; content.data = pack.data; }

export async function loadContent() {
  try { apply(await loadAll(LOCAL)); } catch (e) { console.warn("bundled content missing", e); }
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.version > content.version) apply(cached);
  } catch (e) {}
  checkForUpdate();   // don't wait for the internet
  return content;
}

async function checkForUpdate() {
  if (!CONTENT_URL || !navigator.onLine) return;
  try {
    const base = CONTENT_URL.endsWith("/") ? CONTENT_URL : CONTENT_URL + "/";
    const idx = await getJSON(base + "index.json");
    if (!(idx.version > content.version)) return;
    const pack = await loadAll(base);
    apply(pack);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(pack)); } catch (e) {}
    console.info("content updated to version", pack.version);
  } catch (e) { /* offline or not published yet — fine */ }
}
