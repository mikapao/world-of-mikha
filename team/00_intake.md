# Intake — milestone "upgrade-1"

Details and citations are in `team/00_feature_map.md`. Fact = seen in code, Guess = inferred.

## Answers to the brief's open questions

1. **Geometry and triangles.** Everything is built in code from three.js primitives with low segment counts (e.g. 6-20 radial cylinders, Icosahedron detail 0, Sphere (5,4) to (12,10)); materials are flat-shaded (`src/engine.js:33-34`). Estimated whole scene about 45k triangles: Candy ~12.4k, Meadow ~7.8k, Winter ~4.6k, Home ~3.7k, Crystal ~2.3k, ocean plane 9,800 (70x70 grid, `ocean.js:6`), foam ~1.4k, four bridges ~4.0k. Arithmetic is in the map section 1. All estimates (nothing could be run). Placement uses `Math.random` (`engine.js:43`), so counts vary per launch.
2. **Controls.** No tap/timestamp logic exists. Avatar mode: `pointerdown` within reach of the avatar starts a drag, taps do not move (`controls.js:34-52`, `player.js:29`). Pad mode: `pointerdown` immediately sets a drag from the finger offset (`controls.js:57-81`). A double-tap detector fits in the existing `pointerup` handlers. One design decision: hop on the 2nd `pointerdown` or the 2nd `pointerup`, to keep hold-and-slide unchanged (map 2b).
3. **Bounce/hop.** Walk bounce is a per-frame sine on `av.body.position.y` (`player.js:49`). A one-shot hop already exists (`hop` variable, `player.js:13,20,55`) and only offsets the avatar body, never `player.position`, so it cannot leave the walkable area or change `groundY`. It is not exported; a new exported trigger and a hop sound (none exists in `sound.js`) are needed. Yes, a hop can be layered on this without touching `groundY()`.
4. **Singing Stone.** Scoring is loudness only (`peak >= 55` brave, `singingStone.js:83,93`); word count and duration are not used. Listening ends 900 ms after the last loud frame (after at least 800 ms) or at a hard 5,000 ms cap (`mic.js:77`). Four of 25 current items already have 3 words. 5 s is probably enough for 3-4 words but with less margin (Guess); a slow, pausing child could be cut off by the 900 ms rule, which only shortens the measured part. Only one caller of `listenOnce` (`singingStone.js:78`).
5. **Voice pipeline.** `voice-lines.mjs` -> `voice-lines.json` -> `make_voice.py` (Kokoro-82M, `bf_emma`, speed 0.9) -> `public/voice/*.mp3` + `index.json` -> bundled by Vite/Capacitor and published to Pages -> `speech.js` plays clips per sentence, device TTS if missing. Both workflows run the step with `continue-on-error`, cache `public/voice` and HF/pip caches (`voice-v1-...` key). Voice or speed change = set `VOICE`/`VOICE_SPEED` and the stamp re-records (`make_voice.py:22-28`). A model change needs new code in `make_voice.py` and both workflows, plus a cache/stamp bump. **Rollout trap:** installed APKs prefer their bundled clips (`speech.js:96`), so the new voice needs a new APK. Runner is `ubuntu-latest`, CPU-only; current step time and line count are unknown (need an Actions log and `node scripts/voice-lines.mjs`). No sample-generation tool exists. Details: map section 4.
6. **Game loop.** `loop()` in `src/main.js:106-137`; each module's `updateX(t,dt)` is called by hand at `:111-117`. A new animals update fits after `:117`, built in `boot()` after `buildMeadowIsle()` (`:57`). Walk circles, `walkable`, `obstacles` and ring positions are listed in map 5c; rings are not in `obstacles`, and `monuments` is local to `main.js`.

## Risks

1. **Ocean dominates triangle count and CPU.** The 70x70 sea is ~20% of triangles and runs a per-frame vertex loop + `computeVertexNormals` (`ocean.js:35-42`). Raising its detail helps the 20-30% target cheaply but costs the most on a tablet (Done-when 3, >= 30 fps). Rings, motes (opacity 0) and lanterns are also triangle-heavy for what they show.
2. **Measuring is noisy.** Random placement each launch, and `info.render.triangles` may include the shadow pass (Guess). A fixed seed or averaged runs and one agreed method are needed before the baseline is recorded. No tests or runnable setup are visible in this folder (no test files found).
3. **"Same look" vs. "smoother".** Flat shading is part of the look; more segments only shrink facets. Smoother shapes mean touching material settings (Done-when 2).
4. **Voice rollout.** Clip file names depend on text only; installed APKs keep old clips; the cache key and stamp ignore the model. Mixed-voice states are possible after the content-only update path (Pages content updates skip the APK build, `build-apk.yml:12-14`).
5. **Double-tap vs. hold-and-slide** conflict and pad taps nudging the avatar (map 2b). Also Done-when items that need a real tablet (fps, touch feel) cannot be checked by code reading.
6. **Voice CI is untested for heavier models**; unknown runtime on a CPU runner. A failed step is silently ignored (`continue-on-error`), so a broken new voice could ship as "no clips, device voice" without a red build.

## Missing or unknown (only the owner can answer; max 5)

1. Which tablet exactly (model, Android version, screen size)? It sets the real fps target and the triangle budget; "fairly recent" is too loose to cap the ocean grid.
2. Is a new APK install acceptable for the voice change (so all old clips are replaced), or must existing installs get the new voice through Pages only? The code can only do the former cleanly.
3. For the voice samples: which kind of "cheerful and expressive" (e.g. British female like now, American, or a different child-friendly voice), and can samples be made in the cloud build and downloaded (no local Python setup is known)? Is a heavier model allowed if the build takes longer?
4. For the double-tap: should the hop trigger on the second tap's press (feels instant but also hops when tapping then holding to walk), or on release (slight delay, hold-and-slide fully unchanged)?
5. Do you have the "before" screenshots of all 5 islands, or should the team capture them from the current build? Captured screenshots need random placement fixed, otherwise trees move.

## Not in the folder (what is needed to run it)

- **Installed locally:** `node_modules/` is gitignored (`.gitignore:1`); `npm install` is required. Not checked here whether it is present.
- **Environment variables:** `VITE_CONTENT_URL` (`src/config.js:6`), set only in CI to `https://<owner>.github.io/<repo>/content/` (`publish-web.yml:27-28`, `build-apk.yml:23-24`). Empty in local dev, so no Pages content/voice check happens locally. `VOICE`, `VOICE_SPEED` optional for `make_voice.py:18-19`. No `.env*` files found.
- **Generated, not committed:** `public/voice/` and `voice-lines.json` (`.gitignore:7-8`), `android/`, `dist/`. Locally there are no clips, so the device's own voice plays (CLAUDE.md "Voice").
- **Voice tooling (CI only):** Python 3.11, `espeak-ng`, `ffmpeg`, CPU torch, `kokoro>=0.9`, `soundfile`, `numpy`, model `hexgrad/Kokoro-82M` from Hugging Face. Running it on the owner's Windows machine was not verified.
- **Assets present:** `signing/debug.keystore` exists (do not touch), `vite.config.js` exists. `public/audio/bgm.mp3` and `public/avatars/ponchi.glb` were not listed in my search (my Glob only matched `.gitignore`, `vite.config.js`, `signing/*`); presence not verified.
- **Database / external services:** none besides GitHub Actions/Pages, Hugging Face (model download in CI), and the browser's IndexedDB/localStorage for scores (`src/storage.js`). Not a SQL project.
- **Not run or checked:** no code was executed; no past Actions logs were available; `renderer.info` numbers need a browser run.

## Owner and Commander decisions (2026-11-22)
- **Hop trigger:** fires on the 2nd *press* within ~300 ms (Commander's call, because it feels quicker).
- **Before screenshots:** the team captures them from the current build before any geometry change (Commander's call).
- **New voice delivery:** the owner will install a new APK. No change to clip priority in `speech.js`.
- **Voice samples:** a manually run (workflow_dispatch) GitHub workflow records the same sentences in each candidate voice and uploads a zip of MP3s. The owner picks from it.
- **Build time:** keep builds quick. Prefer light options (other Kokoro voices, speed, punctuation). Use a heavy model only if it's clearly better.
- **Look:** keep flat faceted shading, with finer facets and rounder outlines. No material or shading change.
- **Tablet model:** unknown. Target "recent mid-range" at ≥ 30 fps.
