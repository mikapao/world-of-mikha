# CLAUDE.md — World of Mikha

Handover notes for Claude Code. Read this first; the README is the parent-facing guide.

## What this is
A calm learning game for **Mikha (age 5, learning English)**, played on an Android tablet (APK) and
on iPhone/iPad as a Home-Screen web app. Personal family project, MIT-licensed, public repo
**github.com/mikapao/world-of-mikha**. No ads, no points to chase, no overstimulation.

The owner (Mikha's parent) is on **Windows**, edits in VS Code, and does **not** use Android Studio.
They are comfortable with simple terminal commands but appreciate plain-language explanations.

## Commands
```
npm install            # once
npm run dev            # Vite dev server (--host), http://localhost:5173 + Wi-Fi URL for the tablet
npm run build          # production build into dist/ — run this before pushing to catch errors
git add . && git commit -m "…" && git push   # triggers the cloud builds
```
- Pushing to `main` runs two GitHub Actions workflows:
  - `build-apk.yml` → records the voice, builds web, `npx cap add android`, patches the manifest,
    `gradlew assembleDebug`, attaches `world-of-mikha-N.apk` to a new Release (`build-N`).
    Skipped when only `public/content/**` or `*.md` changed.
  - `publish-web.yml` → records the voice, builds, deploys `dist/` to GitHub Pages
    (**mikapao.github.io/world-of-mikha**). Tablets fetch newer questions + voice clips from here.
- Tablet install: `github.com/mikapao/world-of-mikha/releases/latest` → tap the .apk.
- `android/`, `dist/`, `public/voice/`, `voice-lines.json` are generated — never commit them.
- `signing/debug.keystore` IS committed on purpose: every APK has the same signature so updates
  install over the old app and keep Mikha's scores. Don't remove or regenerate it.

## Stack (pinned on purpose)
- Vite 6, **Three.js 0.128.0** — pinned to keep the look/lighting identical to the original
  prototype. Upgrading Three changes light intensities and colour management; don't bump casually.
- Capacitor 7, `@capacitor/app` (Android back button), `@capacitor-community/text-to-speech`
  (backup voice; the Android WebView has no speechSynthesis).
- `vite.config.js` uses `base: "./"` so the same build works in the APK and on the Pages sub-path.
  Reference public files in `index.html` with absolute paths (`/icons/...`) — Vite rewrites them.
- No top-level `await` (Vite build target doesn't allow it).

## Layout
```
index.html                 splash, overlays, web-app/iOS meta tags
src/main.js                splash → step-by-step boot (builds world behind loading bar) → game loop
src/engine.js              renderer, scene, ortho isometric camera, lights, mat()/mesh() helpers
src/player.js              avatar walking/bouncing/squeaks, setAvatar(), currentAvatarId(), stepOutOf(),
                           hop() (double-tap hop, body only — never leaves the walkable area)
src/controls.js            steering: hold-and-slide on the avatar OR fixed joystick pad (bottom-left);
                           double-tap detector (2nd press < 300 ms, < 40 px) → hop(); only observes
src/avatars/               kitty.js, blibli.js (built in code), glbAvatar.js (loads public/avatars/*.glb),
                           index.js (AVATARS list + default names), names.js (parent-set custom names)
src/world/                 layout.js (5 islands, 4 bridges, walkable()/groundY(), obstacles),
                           homeIsland, crystalIsle, winterIsle, candyIsle, meadowIsle, bridge, ocean,
                           lighting.js (moods blend by distance: day/dusk/winter/candy/night + brightness),
                           ring.js (monument circle: red → gold flash + whoosh when standing in it),
                           animals.js (12 land animals + 2 dolphins, 3 gulls, 1 turtle; keep-out rules,
                           culled > 22 units from camera; no sounds)
src/monuments/             one file per challenge (see below) + index.js
src/ui/                    splash, title, trophies (bottom-right), picker, shell (challenge window +
                           "Go back to the island?" confirm), parent.js (parent corner), util.js
src/sound.js               all SFX synthesized in Web Audio: squeak, ping, whoosh, hopSound. Every button pings.
src/debug.js               hidden overlay, only with ?debug in the URL: fps, triangles, draw calls, env tris
src/speech.js              speak(text) → Promise. Plays recorded Alice clips sentence-by-sentence,
                           falls back to device TTS per sentence. stopSpeaking().
src/voiceKey.js            sentence split + key + clip filename hash (shared with scripts/)
src/voiceLines.js          FIXED_LINES: every fixed sentence the game speaks
src/music.js               public/audio/bgm.mp3 loop; setDuck(0) mutes it while a challenge is open
src/mic.js                 mic loudness 0–100 (Singing Stone), calibration baseline
src/storage.js             score entries in IndexedDB (localStorage fallback), finalizeAttempts()
src/content.js             loads public/content/*.json; checks GitHub Pages for a newer version
src/settings.js            brightness, music volume (localStorage)
public/content/            question files (see "Content")
public/audio/bgm.mp3       background music (owner-supplied, ~3.8 MB)
public/avatars/ponchi.glb  GLB avatar with Idle + Walk animations (built by scripts/make_ponchi.py)
public/icons/, manifest.webmanifest   app icon + installable web app (full-screen from Home Screen)
scripts/voice-lines.mjs    collects every sentence → voice-lines.json
scripts/make_voice.py      records them with Kokoro (bf_alice 0.9) → public/voice/*.mp3 + index.json
scripts/voice_samples.py   records 6 test sentences in 8 Kokoro voices (workflow voice-samples.yml)
scripts/make_ponchi.py     generates the Ponchi GLB (pure Python + numpy)
```

## The five monuments
Each monument module returns `{ id, name, emoji, label, scoring, ring, center, ringMesh, start(ctx), onLeave(), update(t, dt) }`.
`ctx` = `{ shell, speak, ping, content, contentVersion, saveEntry }`. Render UI with `ctx.shell.render(html)`;
include `LEAVE_BUTTON`; finish screens call `ctx.shell.leave()`. Use a `run` counter to cancel async flows on leave.

| Island (screen dir) | Monument | Skill | Content file | Scoring |
|---|---|---|---|---|
| Home (centre, day) | 💧 Counting Waterfall | math (count/add/sub ≤10) | math.json | attempts |
| Crystal Isle (up, dusk) | 🎵 Singing Stone | speaking (mic loudness) | speaking.json | voice (0–100, brave ≥55) |
| Winter Wonderland (left) | ⛄ Memory Snowman | memory ("What's missing?") | memory.json | attempts |
| Candy island (down-right) | 🍭 Giant Lollipop | vocabulary ("Find the …!") | vocab.json | attempts |
| Firefly meadow (down, night) | ✨ Firefly Pond | focus (follow, odd one out, breathe) | focus.json | visits only |

- "attempts" score = questions ÷ total tries (100% = all first try); also firstTry count.
- Trophy shelf: one per monument, gold when completed **this play session** (resets on app start).
- Parent corner (hold ⚙︎ 1.5 s): 📊 Summary (today/7 days/all time, overall learning score, per-challenge
  avg/best/trend/last played) → 📋 per-challenge details → ⚙️ Settings (🧸 Characters: rename + "Play as";
  🔆 brightness; 🎶 music volume; 🗣️ voice; mic calibration under Singing Stone).

## Content
- Pools: math/speaking/memory/vocab have **25 items each, 10 random per visit** (`questionsPerVisit` /
  `wordsPerVisit`). Focus has 10 tasks (`rounds`, `shuffle: true`, breathe stays last), 10 odd pairs.
- `public/content/index.json` has a `version` — **bump it whenever any content file changes**, or tablets
  won't download the update.
- Use emoji from Unicode ≤ 11 (older tablets can't show newer ones).

## Voice ("Alice")
- Kokoro-82M (Apache-2.0), voice `bf_alice`, speed 0.9 (chosen by the owner 2026-11-22 from samples),
  set by `VOICE`/`VOICE_SPEED` in both workflows; recorded in CI (cache prefix `voice-v2-`; step is
  `continue-on-error`, so a failure only means the tablet voice is used). `make_voice.py` picks the
  British/American `lang_code` from the voice name. Installed APKs prefer their bundled clips, so a voice
  change reaches the tablet only with a new APK.
- To compare voices: run the "Voice samples" workflow (Actions → Run workflow, or push a milestone branch)
  and download the `voice-samples` artifact.
- Speaking phrases (`speaking.json`) must not contain `. ! ?` mid-phrase — the clip splitter cuts there.
- **If you add a new `speak("…")` line, add it to `src/voiceLines.js`** so it gets recorded. Lines from
  content files and avatar names are collected automatically by `scripts/voice-lines.mjs`.
- 🔊 buttons in Snowman/Firefly repeat `lastSaid` (so they hit recorded clips).
- Locally (`npm run dev`) there are no clips — you hear the computer's voice. That's expected.

## Design rules (keep these)
- Calm: soft palette, no flashing, no streaks/points shown to the child, gentle feedback only.
  Scores appear only in the parent corner.
- Brightness was toned down on request — don't brighten defaults. Respect `getBrightness()`.
- Music is fully muted while a challenge is open; unmuted when the window closes.
- Monument circles: red pulse normally, gold flash + whoosh when the avatar stands in them.
- Android back button never quits the app (asks "Go back to the island?" inside challenges).
- Big touch targets; a 5-year-old is the user.

## Characters — important
- Avatars must be **original designs**. Do **not** create, recreate, recolour or "variant" licensed
  characters (e.g. Sanrio, Catch! Teenieping, or any other brand's characters), even for personal use
  and even if asked repeatedly. Offer an original character instead (or build one from Mikha's drawing).
- Current avatars: Kitty (original chibi kitty girl, code), Blibli (robot, code), Ponchi (original
  cat-sprite with poncho, GLB). Default names live in `src/avatars/index.js`; parent-set names override
  them on the device.
- New GLB avatars: front faces +Z, ~2.3 units tall, animations named `Idle` and `Walk`; register with
  `glbAvatar("./avatars/name.glb")` in `src/avatars/index.js`.

## Gotchas
- Environment detail was raised ~23% in milestone upgrade-1 (flat shading kept; ocean grid unchanged for
  speed). Crystal Isle is a deliberate hexagon — keep 6 radial segments on its top/base.
- Tests: `node --test tests/` (Node built-in runner, no deps). Agent-team notes live in `team/`.
- Verify with `npm run build` before pushing; the owner installs whatever the cloud builds.
- Workflows install CPU-only torch before kokoro (otherwise pip pulls huge CUDA wheels).
- Microphone works only over https or in the APK — not via the Wi-Fi dev URL on the tablet.
- `public/voice/` must never be committed (it's generated and gitignored).
- APK app icon: CI runs scripts/make_android_icons.py after `cap add android` (from public/icons). Since 2026-11-22.
- Ideas not done yet: gentle session timer ("the island is going to sleep")
, offline service worker
  for the web version.
