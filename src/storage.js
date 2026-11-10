// Score history, saved on the tablet (IndexedDB, with localStorage as a fallback).
// Every monument visit is one "entry" record.
const DB = "world-of-mikha", STORE = "entries", LS_KEY = "wom_entries_v1";
let dbp = null;

function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "key", autoIncrement: true });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
function lsGet() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; } }
function lsSet(v) { try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch (e) {} }

export async function addEntry(entry) {
  const clean = JSON.parse(JSON.stringify(entry));
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).add(clean);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) { const l = lsGet(); l.push(clean); lsSet(l); }
}

export async function allEntries() {
  try {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const r = db.transaction(STORE).objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
    });
  } catch (e) { return lsGet(); }
}

export async function clearEntries() {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).clear();
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) {}
  lsSet([]);
}

/** Score helper for "tries per question" monuments: score = questions ÷ total tries */
export function finalizeAttempts(entry) {
  const total = entry.questions.reduce((s, q) => s + q.attempts, 0);
  entry.end = Date.now();
  entry.answered = entry.questions.length;
  entry.totalAttempts = total;
  entry.firstTry = entry.questions.filter(q => q.attempts === 1).length;
  entry.score = total ? Math.round(entry.answered / total * 100) : 0;
  return entry;
}
