# Baseline test report: milestone "upgrade-1" (Step 0)

**Verdict: PASS** (38 of 38 node tests pass; `npm run build` succeeds)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
No application code was changed. Test files added under `tests/` only. `package.json` untouched. No npm dependencies added.

## Commands run

```
node --test tests/
npm run build
```

Both run from `E:\Dev\world-of-mikha` (Node v26.13.0).

Note: `node --test tests/` ran the four `*.test.mjs` files correctly on this Node version.

## Results

### tests/voiceKey.test.mjs (13 checks) - imports `src/voiceKey.js`

| Check | Result |
|---|---|
| splitSentences: "Say: apple" stays one sentence | PASS |
| splitSentences: 3-4 word phrases ("I love you", "one two three", "big red ball") stay one sentence | PASS |
| splitSentences: phrase with final full stop keeps the stop | PASS |
| splitSentences: "!" and "?" split into separate clips | PASS |
| splitSentences: full stop mid-phrase splits (current behaviour, documented) | PASS |
| splitSentences: empty and punctuation-only input gives []| PASS |
| keyOf: lower-cases, strips punctuation, collapses spaces | PASS |
| keyOf: keeps apostrophes; curly apostrophe becomes straight | PASS |
| keyOf: "Say: I am happy." and "Say: I am happy" give the same key | PASS |
| fileOf: 8 lower-case hex digits + ".mp3" | PASS |
| fileOf: matches an independent BigInt FNV-1a reference for 6 sample keys | PASS |
| fileOf: pinned literal names (say apple = d49d3720.mp3, say i love you = c33375ae.mp3, say one two three = f6609cd2.mp3, say big red ball = 2eadb1ce.mp3, say i am happy = 75441d11.mp3, hello mikha = c1ec5c9f.mp3, "" = 811c9dc5.mp3) | PASS |
| fileOf: different phrases give different names | PASS |

### tests/layout.test.mjs (11 checks) - imports `src/world/layout.js` (pure data, no three.js, no DOM)

| Check | Result |
|---|---|
| Constants as recorded (ISLAND_R 11, island centres, 4 bridges) | PASS |
| walkable() true at all 5 island centres | PASS |
| groundY() = 0 at all 5 island centres | PASS |
| walkable() true at the 5 monument ring centres (feature map 5c) | PASS |
| walkable() false and groundY 0 in open ocean (40,40), (-40,0), (0,-45), (30,-30), (-30,-10) | PASS |
| walkable() false just outside home edge: (0,-10.5), (-10.5,0), (9,-9) | PASS |
| (0,10.5) is walkable because it lies on the Meadow bridge deck BR5 | PASS |
| Middle of each bridge deck is walkable with 0 < groundY <= 0.45 | PASS |
| A point 3 units beside a bridge deck is not on that bridge | PASS |
| BR4 (home -> Candy) mid deck walkable | PASS |
| Points just before each bridge start and just after each end: walkable, groundY 0 | PASS |

### tests/content.test.mjs (7 checks) - reads `public/content/*.json`

| Check | Result |
|---|---|
| Every content JSON file parses (at least 6 files) | PASS |
| index.json: numeric integer version (baseline 6); every monument file it lists exists | PASS |
| speaking.json: wordsPerVisit is 10 | PASS |
| speaking.json: 25 items, unique ids, non-empty say and emoji | PASS |
| speaking.json: no phrase has leading/trailing spaces or . ! ? | PASS |
| **BASELINE, expected to change in upgrade-1:** speaking.json word count per item (table recorded below) | PASS |
| math/memory/vocab/focus parse and have their expected top-level keys; vocab has 25 words | PASS |

Recorded speaking word counts (baseline, 2026-11-22; expected to change in upgrade-1):

| Count | Items |
|---|---|
| 1 word (12) | apple, banana, cat, dog, fish, bird, flower, hello, goodbye, please, rainbow, butterfly |
| 2 words (9) | thank you, good morning, good night, little star, happy cat, blue sky, yellow sun, ice cream, teddy bear |
| 3 words (4) | I love you, big red ball, one two three, I am happy |
| 4 words (0) | none |

The brief requires every item to have 3-4 words, so this test must be rewritten when speaking.json changes.

### tests/voice-lines.test.mjs (7 checks) - runs `scripts/voice-lines.mjs` with Node

The script ran with output to a temp folder under the OS temp dir (`wom-voice-*`), which the test deletes afterwards. No committed file was written.

| Check | Result |
|---|---|
| `node scripts/voice-lines.mjs <tmp>` exits 0 and prints "N voice lines" | PASS |
| Every entry has key, text and file = fileOf(key); keys unique; keyOf(text) = key | PASS |
| Every FIXED_LINES sentence is collected | PASS |
| Each of the 25 speaking phrases becomes "Say: <phrase>" | PASS |
| Avatar names become "Hello, <name>!" (Kittyping, Blibli, Kuromi) | PASS |
| Each Giant Lollipop word gives "Find the X!" and "That's the X!" | PASS |
| Temp output removed | PASS |

### npm run build

```
npm run build
```

Result: PASS. Vite 6.4.6 built 54 modules in 1.97 s; exit code 0. This writes `dist/`, which is gitignored and generated.

## Totals

- node --test: **38 run, 38 passed, 0 failed, 0 skipped**.
- npm run build: **1 run, 1 passed**.

## First-run failures (test-side, all fixed)

The first run had 4 failures. All were mistakes in the tests I wrote, not in the app:

1. `voiceKey.test.mjs` FNV reference used the constant `0x811c9dcn` (missing a hex digit). Fixed to `0x811c9dc5n`. The app's `fileOf` was already correct.
2. `layout.test.mjs` assumed (0,10.5) was off the island and off every bridge. It lies on the Meadow bridge deck (BR5), so `walkable` true is correct. Test changed to assert the bridge, and (9,-9) used as the off-island point.
3. `layout.test.mjs` bridge-end check expected groundY 0 at a+0.2, but the arch is 0.026 there. Test now checks points on the islands just before each start and just after each end.
4. The pinned `fileOf` test compared against the reference, which is circular. Now uses literal values, which match the independent reference.

## Bugs and oddities noticed (report only; no app code changed)

1. **Possible rule breach, `src/avatars/index.js:11`:** the Ponchi avatar's default name is `"Kuromi"`. Kuromi is a Sanrio character. CLAUDE.md says avatars must be original designs and not variants of licensed characters. The geometry is original (Ponchi is a GLB cat with a poncho), but the name points at a licensed character. The voice lines also say "Hello, Kuromi!". The Commander and owner should decide on a new name. This is a naming issue only, not a code fault.
2. **Known limitation, `src/voiceKey.js:6`:** a full stop inside a phrase splits it into two clips, and the "Say:" prefix applies only to the first. The current speaking.json has no such phrase, but upgrade-1 phrases must avoid . ! ? mid-phrase (or the splitter must change).
3. `scripts/voice-lines.mjs` has no test for the `Say:` prefix on a split phrase. Covered by item 2.

## Not run

| Item | Reason |
|---|---|
| `src/controls.js`, `src/player.js` (taps, hold-and-slide, hop, walk) | Need DOM (`window`, `document`, pointer events) and the Three.js scene. Not importable in plain Node without a browser. |
| `src/world/*.js` builders, triangle counts, `renderer.info` | Need Three.js 0.128.0 and a WebGL context. Not run. |
| `src/speech.js`, `src/mic.js`, `src/monuments/singingStone.js` (listen window, scoring) | Need `window`/`document`, Web Audio, and the microphone. |
| `src/storage.js`, `src/content.js` (network check of GitHub Pages) | Touch IndexedDB/fetch; no network test per task rules. |
| `scripts/make_voice.py` (Kokoro recording) | Needs Python, Kokoro model and ffmpeg. Out of scope for a Node-only baseline. |
| GitHub workflows (`build-apk.yml`, `publish-web.yml`) | Cloud-only. Not run. |
| Browser look, colours, brightness, fps, the owner's tablet | Only a person in a browser or on the tablet can check these. See below. |

## For the user's browser checklist (baseline)

- Open the app with `npm run dev`, walk to each island, and check the monument circles still show and respond (current behaviour, before any change).
- Singing Stone: check how the current 1-2 word phrases look on the screen (baseline screenshot for later comparison).
- Parent corner: check the Characters section shows "Kuromi" for the Ponchi avatar (see bug 1).
