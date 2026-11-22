# Design — Milestone "upgrade-1"

Follows `01_plan.md` (approved 2026-11-22). Contracts below are binding for the Coder; anything not covered here is left to the Coder's judgement within the task's file list.

## D1. Debug overlay (T01)
- New module `src/debug.js`. Exports `initDebug()` and `debugFrame(renderer)`.
- Active only when `location.search` contains `debug` (e.g. `?debug`). Otherwise both functions are no-ops (cheap early return; no DOM created).
- Overlay: a small fixed `div` at top-centre, `pointer-events:none`, monospace, 12 px, semi-transparent dark background, z-index above the canvas but below overlays is fine.
- Content, refreshed every 500 ms: `fps` (frames counted over the last 0.5 s), `tris` = `renderer.info.render.triangles`, `calls` = `renderer.info.render.calls`, plus `env tris` = the scene-traversal count used in `team/baseline/README.md` (mesh triangles, skip the `player` subtree, skip the ocean plane), recomputed every 5 s.
- `main.js`: call `initDebug()` once in `boot()`, `debugFrame(renderer)` right after `renderer.render(...)` in `loop`.

## D2. Hop on double-tap (T02)
- `player.js`: `export function hop()`: if `hop > 0` (a hop is running) do nothing; otherwise set `hop = 1` and call `hopSound()`. The existing per-frame body offset (`player.js:55`) is reused unchanged. `setAvatar` keeps its silent hop.
- `sound.js`: `export function hopSound()`: soft, short (≤ 0.25 s), upward sine "boing", peak gain ≤ 0.07 (quieter than the squeak's 0.09). Uses `audio()` like the others.
- `controls.js`: a small detector shared by both modes.
  - On every successful `pointerdown` (avatar mode: only when within reach; pad mode: on the pad), record `{time: performance.now(), x, y}`.
  - If the previous recorded press was < 300 ms ago and within 40 px, call `hop()` and clear the record (so a triple tap = one hop, then a new pair needed).
  - Do not change any existing drag/pad behaviour; the detector only observes.
  - Must not fire while `blocked()` (UI open).

## D3. Singing Stone phrases (T03)
- `public/content/speaking.json`: keep the `_help` text (update "words" wording if needed), `wordsPerVisit: 10`, 25 items `{id, say, emoji}`, ids `s1…s25` kept.
- Every `say`: 3 or 4 words, lower-case except "I", **no** `. ! ? ,` characters, words a 5-year-old English learner knows, at least 10 of the 25 with 4 words. Emoji Unicode ≤ 11, one per item, matching the phrase.
- `public/content/index.json`: version 6 → 7.
- Listening window: unchanged in T03; the Commander checks the 5 s cap in the browser; if raised later it is a one-line change in `mic.js` (separate tiny task).

## D4. Voice samples (T04)
- `scripts/voice_samples.py`: records a fixed list of 6 sentences for each candidate into `samples/<candidate>/<n>.mp3`, and zips `samples/` to `voice-samples.zip`. Candidates (voice, speed, lang_code):
  `bf_emma 0.9 b` (current), `bf_emma 1.0 b`, `bf_isabella 1.0 b`, `bf_alice 1.0 b`, `bf_lily 1.0 b`, `af_heart 1.0 a`, `af_bella 1.0 a`, `af_nicole 1.0 a`.
  File names: `<candidate>/1-welcome.mp3` etc., candidate folder = `<voice>-<speed>`.
- Sentences:
  1. "Welcome to the World of Mikha!"
  2. "Wow, you found it! Great job!"
  3. "How many apples can you count?"
  4. "Say: I see a cat"
  5. "Yay! You did it! You are so brave!"
  6. "Let's go back to the island."
- `.github/workflows/voice-samples.yml`: triggers `workflow_dispatch` and `push` to `milestone/**` with `paths: [scripts/voice_samples.py, .github/workflows/voice-samples.yml]`. Steps: checkout, setup-python 3.11, pip cache, apt `espeak-ng ffmpeg`, CPU torch (same index URL as existing workflows), `kokoro>=0.9 soundfile numpy`, run script, `actions/upload-artifact@v4` with `voice-samples.zip` (retention 14 days). `timeout-minutes: 30`. No secrets.
- Must not change `make_voice.py` or the existing workflows.

## D5. More environment detail (T05–T07)
- Keep every material, colour, position, scale and `flatShading`. Only geometry detail arguments change (segments, `detail` level of polyhedra), plus where an outline is very blocky a cylinder/circle island top may get more radial segments.
- Spend triangles on large, visible shapes: island tops and sides, tree canopies/trunks, big rocks (Icosahedron/Dodecahedron detail 0 → 1 only for rocks with radius ≥ 0.5), igloo, snow drifts, mushroom caps, lollipops, cupcakes, donuts, willows, bridge rails/posts. Do **not** raise: sprinkles, flowers, gumdrops, tufts, stars, snow, fireflies, the ocean plane.
- Each task reports its area's triangle count before/after using the D1 overlay method. Milestone target after T07: islands + bridges (ocean excluded) **44,500–48,200**; each task aims for +20–30% within its own area. **Clarified 2026-11-22 (Commander):** the milestone total is binding (brief "Done when" 1). The per-area band is guidance only. An area may land outside it, which must be recorded in that task's report.
- Obstacles, walk circles, reserved lists: unchanged.

## D6. Animals (T08–T09)
- New `src/world/animals.js`: `export function buildAnimals(monuments)` and `export function updateAnimals(t, dt, camTarget)`.
- Each animal = a `THREE.Group` built in code from `mat()`/`mesh()` primitives, ≤ 300 triangles, ~0.35–0.6 units tall, original design, soft palette matching its island, `castShadow` true for land animals, false for marine/flying ones.
- Land wander: pick a random target inside the island walk circle (radius − 1.0) that is ≥ 0.6 + o.r from every `obstacles` entry, ≥ 2.8 from every monument ring (`m.ring.x/z`), and ≥ 2.0 from every bridge end; walk at 0.4–0.8 u/s with a small bob, face direction of travel, pause 1–4 s at the target, repeat. y = `groundY(x,z)`. No collision with the player.
- Roster: Home 2 bunnies + 1 butterfly (flutters 0.8–1.4 above ground); Crystal 2 birds (hop-walk); Winter 2 penguins (waddle); Candy 1 duckling + 2 ladybugs; Meadow 2 frogs (hop).
- Marine (T09): 2 dolphins — swim below surface (hidden at y ≤ −1.3) and every 8–15 s leap in a ~3 s arc rising to y ≈ 0.6 at a spot ≥ 3 units outside any island edge and ≤ 10 from one; 3 seagulls — circles of radius 4–7 at y 4–6 around points between islands, slow wing flap; 1 turtle — paddles at the surface (y ≈ −0.85) on a slow ellipse in open water.
- Culling: if an animal is > 22 units from `camTarget`, skip its update (keep it where it is). `main.js`: `buildAnimals(monuments)` in `boot()` after `buildMeadowIsle()`; `updateAnimals(t, dt, camTarget)` after `updateMeadowIsle(t, dt)`.
- No sounds from animals (calm).

## D7. Apply chosen voice (T10)
- `make_voice.py`: `lang_code` from the voice prefix (`a…` → "a", `b…` → "b"); stamp text becomes `"kokoro <voice> <speed>"`.
- Both workflows: `env: VOICE`, `VOICE_SPEED` set to the owner's pick; cache key prefix `voice-v1-` → `voice-v2-` (key and restore-keys).
- `src/voiceLines.js`: warmer wording with the same meaning; keep each sentence short; any line that the code calls by exact text must be changed in both places (Coder greps for every `speak(` use).

## Testing approach (all tasks)
- Tester: `node --test tests/` (baseline 38 + task tests) and `npm run build`.
- Commander: browser check for visual/feel tasks (T01, T02, T05–T09), screenshots compared with `team/baseline/`.

## D8. Performance pass (T11), added 2026-11-22 after Gate 2 feedback
- **Merge animal parts.** After building each animal, merge every *static* part into one `BufferGeometry` with a per-vertex `color` attribute (taken from each part's material colour, with the part's local transform applied), rendered with ONE shared material: `mat(0xffffff, { vertexColors: true })`. This keeps flat shading and the same roughness/metalness as `mat()`. Use `mergeBufferGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js` (r128). Convert parts to non-indexed or indexed consistently, and keep only the `position`, `normal` and `color` attributes.
- **Parts that animate on their own stay separate**, but each moving group is merged into itself: butterfly wings (`userData.wings`), gull wings, turtle flippers. Whole-animal motion (group position/rotation/bob) is unchanged.
- Any double-sided part (`MB()`, e.g. wings) uses a merged double-sided vertex-colour material. Count materials as needed, but keep **≤ 4 draw calls per animal**.
- **Shadows:** land animals keep `castShadow` on their merged mesh. With merging, the shadow pass adds only ~1 draw call per animal. *(Blob shadows from the revision note are dropped: merging makes real shadows cheap, and they look better.)*
- **Pixel budget** in `engine.js` `resize()`: pixel ratio = `min(devicePixelRatio, 2, sqrt(2_500_000 / (innerWidth * innerHeight)))`, never below 0.5 (was 0.75; see note above). Recompute on every resize. **Floor changed to 0.5 (2026-11-22, Commander)**: 0.75 contradicted the 2.5 M budget at 4K.
- Must stay the same: colours, sizes, silhouettes, every animation and keep-out behaviour, triangles per animal (±5%), and the T08/T09 tests.
- Target: draw calls with all animals ≤ ~300 (was 370). ≥ 30 fps at a 2560×1440 viewport in the Claude pane with `?debug`.

## D9. APK app icon (T12), added 2026-11-22
- New `scripts/make_android_icons.py` (Pillow). Usage: `python scripts/make_android_icons.py <android/app/src/main/res>`. Sources: `public/icons/icon-512.png` (legacy) and `public/icons/icon-maskable-512.png` (adaptive). Background colour = the icon's corner pixel (≈ #27345E).
- Writes, overwriting Capacitor's defaults:
  - legacy `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` at 48/72/96/144/192 px, plus `ic_launcher_round.png` (the same image masked to a circle, transparent outside);
  - adaptive foreground `mipmap-*/ic_launcher_foreground.png` at 108/162/216/324/432 px. Canvas filled with the background colour, with the maskable icon scaled so its 80% safe zone fits Android's 66/108 safe zone (icon side ≈ 0.764 × canvas, centred);
  - `values/ic_launcher_background.xml`: `<color name="ic_launcher_background">#27345E</color>` (actual value from the pixel);
  - keep `mipmap-anydpi-v26/ic_launcher*.xml` as Capacitor generates them (they already point at these names). If they're missing, write them.
- Workflow `build-apk.yml`: after "Create the Android project", add the step `pip install -q pillow && python scripts/make_android_icons.py android/app/src/main/res`, before the Gradle build. Python is already set up earlier in the job. Not `continue-on-error`: a broken icon should fail loudly.
- Doesn't touch the app id, signing, or `capacitor.config.json`.
