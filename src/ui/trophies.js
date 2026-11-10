// Trophy shelf, bottom-right: one trophy per monument.
// Grey silhouette = not finished yet in this play session; golden with the monument's
// little badge = finished. Resets each time the app is opened.
const TROPHY = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs>
  <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".55" stop-color="#f7c948"/><stop offset="1" stop-color="#d99a1e"/></linearGradient></defs>
  <path class="cup" d="M18 8h28v6h8a2 2 0 0 1 2 2c0 9-6 15-13 16-2 4-5 6-7 7v7h6a2 2 0 0 1 2 2v2H20v-2a2 2 0 0 1 2-2h6v-7c-2-1-5-3-7-7-7-1-13-7-13-16a2 2 0 0 1 2-2h8zm0 10h-5c1 5 4 8 7 9-1-3-2-6-2-9zm28 0c0 3-1 6-2 9 3-1 6-4 7-9z"/>
  <rect class="cup" x="18" y="54" width="28" height="5" rx="2"/>
  <path class="shine" d="M24 12h4v14c-2-2-4-7-4-14z"/></svg>`;

const box = document.createElement("div");
box.id = "trophies";
document.body.appendChild(box);
const slots = {};

export function buildTrophies(monuments) {
  box.innerHTML = "";
  monuments.forEach(m => {
    const s = document.createElement("div");
    s.className = "trophy"; s.title = m.name;
    s.innerHTML = `${TROPHY}<span class="badge">${m.emoji}</span>`;
    box.appendChild(s); slots[m.id] = s;
  });
}

/** light up a monument's trophy (gentle pop the first time) */
export function earnTrophy(id) {
  const s = slots[id];
  if (!s || s.classList.contains("won")) return;
  s.classList.add("won", "pop");
  setTimeout(() => s.classList.remove("pop"), 900);
}

export const trophyCount = () => Object.values(slots).filter(s => s.classList.contains("won")).length;
