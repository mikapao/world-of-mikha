export const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
export const repeat = (html, n, cls = "") => Array.from({ length: n }, () => `<span class="${cls}">${html}</span>`).join("");
export const dots = (n, i) => `<div class="dots">${Array.from({ length: n }, (_, k) =>
  `<div class="dot ${k < i ? "done" : k === i ? "now" : ""}"></div>`).join("")}</div>`;
