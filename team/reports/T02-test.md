# T02 test report: hop on double-tap + soft sound

**Verdict: BLOCKED** (no check failed; the Node-testable logic passes; the pointer and sound behaviour in a real browser was not run)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D2. Task: `team/tasks/T02.md`.
No application code was changed. `package.json` untouched. One test file added: `tests/hop.test.mjs`.

## Commands run

```
node --test tests/
npm run build
git diff src/
```

Run from `E:\Dev\world-of-mikha` (Node v26.13.0, Vite 6.4.6).

## Results

### Automated checks (run)

| Check | Result |
|---|---|
| `node --test tests/`: all 50 checks pass (38 existing baseline + 12 new in `tests/hop.test.mjs`) | PASS |
| `npm run build` exits 0 (built in 1.33 s) | PASS |
| Detector (`controls.js` `registerPress`): two presses 100 ms apart, same spot = one hop | PASS |
| Detector: 299 ms and 39 px apart = one hop (inside both limits) | PASS |
| Detector: exactly 300 ms apart = no hop (limit is < 300 ms) | PASS |
| Detector: exactly 40 px apart = no hop (limit is < 40 px) | PASS |
| Detector: distance is Euclidean (28,28 = 39.6 px hops; 30,30 = 42.4 px does not) | PASS |
| Detector: a single tap = no hop | PASS |
| Detector: triple tap (3 taps within 300 ms) = exactly one hop (criterion 3) | PASS |
| Detector: 4 quick taps = two hops (record cleared after each hop; documents design) | PASS |
| Detector: a 2nd tap 400 ms after the 1st = no hop; 3rd tap 100 ms after it = hop | PASS |
| `player.js` `hop()`: first call plays the sound and sets the hop; a call while a hop runs does nothing (no 2nd sound, timer not restarted) (criterion 3) | PASS |
| `sound.js` `hopSound()` with no AudioContext (plain Node) returns without throwing | PASS |
| `sound.js` `hopSound()`: one sine oscillator, one gain node, 330 to 700 Hz over 0.14 s, peak gain 0.06 (<= 0.07), duration 0.22 s (<= 0.25 s) (criterion 1, "soft sound") | PASS |

### Source reading (checked by reading the diff, not executed)

| Criterion | Result |
|---|---|
| 1. Avatar mode: `registerPress(e)` is after the reach check, so a press out of reach (which calls `pulseHint()` and returns) is not recorded | PASS (by reading) |
| 1. Pad mode: `registerPress(e)` is in the pad `pointerdown` handler | PASS (by reading) |
| 2. `registerPress` only sets `lastPress` and may call `hop()`. The drag, `padMove`, `end` and `padEnd` code is unchanged in the diff. A single tap, hold-and-slide and pad walking have no new side effects | PASS (by reading) |
| 3. `hop()` returns early while `hopT > 0`. `updatePlayer` is called every frame (`main.js:111`), so `hopT` decays and a later hop works | PASS (by reading) |
| 4. In both handlers `if (blocked()) return;` is the first line, so `registerPress` never runs while a UI is open | PASS (by reading) |
| 5. `setAvatar` sets `hopT = 1` directly and does not call `hopSound()`, so it stays silent | PASS (by reading) |

### Runtime behaviour (acceptance criteria 1, 2, 4 in a browser)

Not run. See "Not run".

## Failures

None found. No check failed.

Problems in my own first run, now fixed in the test file (not app code):
1. `src/sound.js` touches `document` at import time (its last line, `document.addEventListener(...)`), so importing it in Node threw `ReferenceError`. The test now sets a stub `globalThis.document` before a dynamic import.
2. My fake AudioContext logged the gain node and the gain parameters under the same tag, so the "one gain node" count was 4. The gain node now has its own tag.

## Observations (no action taken; for the Commander)

1. The detector cannot be imported in Node (`controls.js` looks up DOM elements and imports `engine.js`, which creates a WebGL renderer). The test reads the real `src/controls.js` text, cuts out `let lastPress` and `registerPress`, and runs that text with stubs. If either name changes, the test fails with a clear message. This tests the real code, but it is not an import. The same method is used for `player.js` `hop()`.
2. `setAvatar` is not tested by the Node suite: `player.js` cannot be imported. Criterion 5 is by reading only.
3. Multi-touch: two different fingers pressing within 300 ms and 40 px form a double-tap. The detector does not check `pointerId`. Harmless for a single child's taps, but worth knowing.
4. Four rapid taps give two hops (two pairs). This follows the design text ("a new pair needed"). Not a bug, but a fast tapper may see two hops.
5. An avatar double-tap also starts a drag on each press, so the soft joystick ring appears briefly. This is existing behaviour and was not changed.

## Not run

| Item | Reason |
|---|---|
| Real pointer events in `controls.js` (avatar press within reach, pad press, out-of-reach press, press while a UI is open) | Needs a browser (`npm run dev`). `controls.js` cannot load in Node; only the detector's logic was run, through source extraction. |
| Hop motion on screen (about 0.6 s, body bounce) and that a hop does not restart mid-hop in play | Needs a browser. The timer logic was run; the visual was not. |
| Sound audible and gentle on a tablet, and that Web Audio is unlocked by the first tap | Needs a device with sound. `hopSound()` was run only against a fake AudioContext. |
| `setAvatar` silent hop (criterion 5) | `player.js` cannot be imported in Node. Checked by reading only. |
| Order of `blocked()` and `registerPress` in the handlers (criterion 4) | Checked by reading only. A UI-open case needs a browser. |

## For the user's browser checklist (T02)

- Run `npm run dev` and open `http://localhost:5173/`. Tap on Mikha quickly twice, on the same spot. Mikha should do one little hop, with one soft rising "boing" sound.
- Do the same with the bottom-left pad: tap the pad twice quickly. It should hop. Holding the pad and sliding should still walk Mikha as before.
- Double-tap far from Mikha (out of the reach circle). Nothing should happen except the usual hint.
- Triple-tap quickly on Mikha. Only one hop, not three.
- Single tap, and hold-and-slide on Mikha, should work as before with no hop.
- Open a challenge (for example the Waterfall) and double-tap the background. No hop and no sound.
- Switch character from the picker. It should hop, with no sound (as before).
- Check the sound is soft and not harsh on the tablet. If it is too loud or too high for Mikha, tell the Coder the new peak gain (the test allows up to 0.07).
- Check the hop does not feel jumpy when tapped quickly, and does not cut off the walking.

## Totals

- `node --test tests/`: **50 run, 50 passed, 0 failed** (38 baseline + 12 new).
- `npm run build`: **1 run, 1 passed**.
- Automated rows in the table: 2 commands, plus the 12 new hop checks (all pass). Reading rows: 6 (criteria 1 to 5, with criterion 1 split into avatar and pad), 0 failed.
- Runtime criteria 1, 2, 4 (browser): not run.

## Commander browser check (2026-11-22): PASS
Measured in `npm run dev` (fresh server) by sending touch pointer events, with the top of the avatar sampled over 0.9 s:
- Idle bob 0.039. Pad double-tap (120 ms apart) **0.917**. Pad single tap 0.015. Pad taps 450 ms apart 0.035.
- Double-tap on the avatar **0.885**, with the avatar's position changed by 0.000 (no drift).
- While the splash was open (`blocked()` true), the pad didn't activate and there was no hop.
- Not checked: how the sound feels on a real tablet. That's for the owner at Gate 2.
**T02 accepted.**
