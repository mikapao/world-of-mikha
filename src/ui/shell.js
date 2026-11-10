// The challenge window every monument uses: open, draw, ✕ Leave (with "are you sure?"), close.
import { stopSpeaking } from "../speech.js";

const overlay = document.getElementById("challenge");
const card = document.getElementById("ccard");
let onLeave = null;

export const LEAVE_BUTTON = `<button class="leave" data-leave title="Leave the monument">✕ <span>Leave</span></button>`;

export const shell = {
  card,
  isOpen: () => overlay.classList.contains("show"),

  /** open the window; leaveFn runs when the child leaves (saving partial scores etc.) */
  open(leaveFn) { onLeave = leaveFn; overlay.classList.add("show"); },

  /** replace the window contents; any [data-leave] button asks before leaving */
  render(html) {
    card.innerHTML = html;
    card.querySelectorAll("[data-leave]").forEach(b => b.onclick = () => shell.askLeave());
  },

  /** gentle "are you sure?" so a stray tap doesn't end the game */
  askLeave(stayLabel = "Keep playing ✨") {
    if (!shell.isOpen()) return;
    const existing = card.querySelector(".confirm");
    if (existing) { existing.remove(); return; }        // back button twice = stay
    const c = document.createElement("div"); c.className = "confirm";
    c.innerHTML = `<div class="big" style="font-size:52px">🏝️</div>
      <div class="prompt" style="margin:0 10px 6px">Go back to the island?</div>
      <div class="row2"><button class="btn stay">${stayLabel}</button><button class="btn go">Yes, leave</button></div>`;
    card.appendChild(c);
    c.querySelector(".stay").onclick = () => c.remove();
    c.querySelector(".go").onclick = () => shell.leave();
  },

  /** close right away (used by "Back to the island" after finishing, and by "Yes, leave") */
  leave() {
    stopSpeaking();
    overlay.classList.remove("show");
    const fn = onLeave; onLeave = null;
    if (fn) fn();
  }
};

addEventListener("keydown", e => { if (e.key === "Escape" && shell.isOpen()) shell.askLeave(); });
