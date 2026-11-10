// Bubbly "World of Mikha" letters — used small in the top-left corner and big on the opening screen.
const COLS = [["#f49ab2", "#d9708c"], ["#ffcf6b", "#e0a83c"], ["#8fd39f", "#62ad74"], ["#8fbff0", "#5f95cf"], ["#c6a8f0", "#9a7bd0"]];

export function letterSpans(text) {
  let i = 0;
  return [...text].map(ch => {
    if (ch === " ") return '<span class="sp"></span>';
    const [c, d] = COLS[i % COLS.length];
    return `<span style="--c:${c};--d:${d};--i:${i++}">${ch}</span>`;
  }).join("");
}

export function buildTitle(text = "World of Mikha", el = document.getElementById("title")) {
  el.innerHTML = letterSpans(text);
}
