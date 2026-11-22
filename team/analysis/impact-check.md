# Impact check - milestone "upgrade-1" (Step 4)

Method: read the current files and compared them with the feature map's line references (the "before" picture) and the T02/T07/T09/T10 test reports. Nothing was run and git was not available. Fact = seen in current code. Guess = inferred.

## 1. "Keep unchanged" list

| Item | Verdict | Evidence |
|---|---|---|
| Calm design: no flashing, no points to the child, music muted in challenges | Unchanged (Fact) | `main.js:90` still `setDuck(0)` on enter and `setDuck(1)` on leave (`:91`). Animals have no sound (`animals.js` imports no audio). Hop sound peak gain 0.06 (`sound.js:40`). No UI added except the `?debug` overlay, which is off unless the URL contains "debug" (`debug.js:7,25`). |
| Default brightness and `getBrightness()` | Not verifiable by reading (look), code unchanged as far as seen | `lighting.js`/`settings.js` not touched per the T05-T07 source checks. Animals use the same `mat()` (`engine.js:33`). Owner must compare screenshots (Done-when 2). |
| Three 0.128.0, Vite 6, Capacitor 7 | Unchanged | `package.json:14-20` (`three` "0.128.0", `vite` ^6, `@capacitor/*` ^7). |
| Characters and geometry | Unchanged (Fact, partly by reading) | `player.js` changes only add `hop()`; `av.*` code same shape. Avatar files are not in this milestone's task list. Animals are original designs (`animals.js:35-120`). |
| Other monuments, scoring, parent corner, saved scores | Unchanged apart from the speaking content | `mic.js`, `singingStone.js`, `storage.js` are not in any task's file list. Only `speaking.json` changed (`id` s1-s25 kept, so stored `entry.words[].id` still match). |
| `signing/debug.keystore` | Present | Glob finds `signing/debug.keystore`. Content unchanged: not verifiable without git. |
| Android back button, big touch targets | Unchanged | `main.js:100-105` same. Pad and avatar reach are unchanged (`controls.js:46,65-92`). |

## 2. Feature-map rows marked "keep"

- **`player.js`**: intact. `hop()` is new (`:24-27`), guarded by `hopT > 0`, and it plays `hopSound()`. `setAvatar` still sets `hopT = 1` silently (`:20`). The per-frame add is the same (`:61`). Hop changes only `av.body.position.y`, never x/z, so it can't leave the walkable area. Walking while hopping is still routed through `walkable()` (`:45`). Fact.
- **`controls.js`**: both steering modes intact. `registerPress` (`:34-39`) only observes. In avatar mode it runs after the reach check (`:47-48`), so out-of-reach presses are ignored. In pad mode it runs after `blocked()` and `e.preventDefault()` (`:79-81`). Drag, `padMove` and `end/padEnd` code is the same as the map describes. Side effects (Fact): `lastPress` is shared between both modes, with no `pointerId` check, so two fingers can form a "double-tap". Pad quirk from the map still holds: the first pad tap sets a non-zero `drag` (`:74`) and may nudge the avatar about 0.4 units. The Commander measured a 0.000 position change for an avatar double-tap, but the pad nudge is not measured.
- **`main.js`**: boot order intact. Monuments are created first (`:47`), then home, bridges, crystal, winter, candy and meadow, then `buildAnimals(monuments)` (`:61`). So `obstacles` is complete and ring positions exist. `renderer.compile(scene, cam)` (`:72`) runs after the animals are added. Loop: the order is the same as the map, with `updateAnimals(t, dt, camTarget)` after `updateMeadowIsle` (`:122`) and `debugFrame` after render (`:141`). `initDebug()` runs first in `boot()` (`:43`) and is a no-op without `?debug`. Note: `camTarget` is declared at `:108` after `boot()` is called, but it is only used inside `loop`. Fine.
- **`voiceLines.js` vs every `speak(`**: covered. Every literal in `src/` matches a `FIXED_LINES` sentence (T10 report). Dynamic lines are collected by `voice-lines.mjs` (math prompts, `Say: <say>`, vocab, avatar names). T10 failure was "Yes!" (`lollipop.js:95`); the Commander added it back (the current file still has `"Yes!"` at `voiceLines.js:12`). Renamed characters ("Hello, <custom name>!") are not recorded; they fall back to device TTS, as before.
- **`make_voice.py`**: `lang` is derived from the voice prefix (`:19`), the stamp is `kokoro <voice> <speed>` (`:25`), and the default voice is `bf_alice` (`:18`). The stamp format changed from `"<voice> <speed>"`, so the first build re-records every clip once. The `index.json` format is the same (`:57`).
- **Workflows**: both set `VOICE: bf_alice`, `VOICE_SPEED: "0.9"` (`build-apk.yml:25-26`, `publish-web.yml:29-30`) and cache `voice-v2-` for key and restore-keys (`build-apk.yml:53-54`, `publish-web.yml:48-49`). Triggers are unchanged (`main` only, plus `workflow_dispatch`; the APK build still ignores `public/content/**` and `*.md`). New `voice-samples.yml` is path-limited and has `timeout-minutes: 30` (`:19`). Nothing else changed. Not verified: YAML was never parsed (js-yaml missing; four YAML tests are skipped), only text-checked.
- **Ocean**: unchanged, `PlaneGeometry(140,140,70,70)` (`ocean.js:6`), as the plan required.
- **Layout, obstacles, walk circles**: T07 source checks confirm unchanged. `animals.js` only reads them. It does not push into `obstacles`.

## 3. Changes the plan didn't list, and risks for the tablet

1. **Draw calls and shadows (Guess, unmeasured).** The roster has 12 land animals with 6-10 meshes each (about 90 meshes, each `castShadow` true, `animals.js:21`), so they are drawn twice (shadow pass and main pass). Marine and flying animals are 3 dolphins' worth (2 dolphins, hidden except while leaping), 3 gulls and 1 turtle; they have no shadows. No instancing (geometries are cached and materials shared by colour, `animals.js:10-17`, which helps). The "cull" in `updateAnimals` only skips animation; it does not stop rendering, so only frustum culling reduces draw cost. Done-when 3 needs the `?debug` overlay on the tablet.
2. **Debug overlay counts animals.** `countEnvTris` (`debug.js:13-22`) traverses the whole scene except the player and ocean, so after T08/T09 the "env tris" figure includes animals (about 12 x ~150-300 + marine). Don't compare it directly with the 37,186 baseline or the 45,726 result; the +23.0% measurement was made before the animals were added (T07).
3. **Triangle target.** The +23.0% average (45,858 / 45,678 / 45,642) is a pre-animals live measurement by the Commander (T07 report). The later tasks (T08-T10) don't touch environment geometry. The per-area band was missed for Candy+Meadow (+33%), which the Commander accepted. No post-T09 live count exists (Guess: still ~+23%, since animals are a separate group).
4. **Boot/perf.** Animals add start-up work (`buildMarine` runs up to 4,000 random leap-spot tests with 9 samples each, `animals.js:295-298`, plus turtle search `:314`). Negligible on a tablet (Guess). The butterfly uses a `DoubleSide` material (`:12`), a second shader program, which `renderer.compile` handles because the butterfly is visible at compile time.
5. **Random placement.** `rnd` is `Math.random`, so animals and marine spots vary per launch. A tablet test sees a different layout each time. Dolphin visibility is also random (the `leapSpots` list can be empty, in which case there are no dolphins, `:299`); the T09 test found a spot in 200 of 200 builds.
6. **Content `version`.** `index.json` is 7 (`:2`). Content-only changes go out through Pages; but because the milestone also changes `src/`, merging to `main` triggers both workflows. Installed APKs keep old clips for old sentences (`speech.js:96`); only the new APK has the Alice clips for every line. Old-APK + new-content mix: new phrases are spoken from Pages clips, old lines from the old APK's Emma. The owner should install the new APK.
7. **First cloud voice build re-records every clip** (about 189 lines, T10) on the CPU runner, in both workflows. Time was never measured (the voice step is `continue-on-error`, so a failure only means the tablet voice). The cache is per branch; the first run on `main` starts without a cache.
8. **Speaking phrases.** All 25 items have 3 or 4 words (11 have 4), no punctuation, one emoji each (`speaking.json`). Not verified: wrapping next to the emoji on a small screen (feature map section 3), and the 5 s listening cap and the 900 ms pause rule (`mic.js:77`). The cap was left unchanged. A Guess: a 4-word phrase said slowly may be cut early by a pause.
9. **Generated or untracked files** in the working tree: `scripts/__pycache__/` and `.claude/` are untracked. Make sure `scripts/__pycache__/` is not committed (CLAUDE.md lists generated files that must not be).
10. **Hop edge cases (Fact):** four quick taps give two hops (`T02 report`); two fingers count as a double tap; the hop lasts about 0.63 s and can't restart while running.

## 4. "Done when" status

| # | Item | Status |
|---|---|---|
| 1 | Detail +20-30% | Verified by the Commander in the browser (3 launches, average +23.0%, T07). Not re-measured after T08-T10. |
| 2 | Look unchanged | Owner-only (compare the 5 screenshots in `team/baseline/`). The Commander glanced at Candy/Meadow only. |
| 3 | At least 30 fps on the tablet | Owner-only (open the web app with `?debug`). Not measured anywhere. |
| 4 | Jump, both modes | Verified by tests (12 tests in `tests/hop.test.mjs`) and by the Commander in the browser (pad and avatar). The sound feel on the tablet is owner-only. |
| 5 | Speaking: 3-4 words, 10 per visit, version bumped, clips | Content verified by reading (this check) and tests. Clips only exist after the cloud build; owner-only to hear them. Screen wrapping is not verified. |
| 6 | Voice | Voice chosen and applied (`bf_alice`) by tests and reading. Hearing it, the APK/web playback and the TTS fallback are owner-only (needs the cloud build; fallback is unchanged `speech.js`, not retested). |
| 7 | Animals: all 5 islands, 2+ marine kinds, never in rings | Verified by tests (T08 and T09 runtime sweeps in Node, stubbed engine). Not seen in a browser (the pane was hidden); owner-only on the tablet. |
| 8 | `npm run build` and both workflows | Build passes (T10, 2026-11-22). Workflows can only be verified after a push to `main` (owner-only; YAML never parsed). |
