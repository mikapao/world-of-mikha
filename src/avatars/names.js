// Grown-ups can rename the characters in the parent corner. Names are kept on the tablet.
const KEY = "wom_avatar_names";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } };

/** the name to show / say for an avatar (custom name if one was set) */
export function nameOf(a) { const n = load()[a.id]; return (n && n.trim()) || a.name; }

export function setName(id, name) {
  const all = load();
  const clean = String(name || "").replace(/[<>"]/g, "").trim().slice(0, 16);
  if (clean) all[id] = clean; else delete all[id];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
}
