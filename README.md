# World of Mikha 🏝️

A calm learning game for Android tablets: no ads, no points to chase, just a little world to explore.
Built with web tech (Three.js + Vite) and packed into an Android app by Capacitor.
**No Android Studio needed.** The app is built in the cloud by GitHub.

---

## 1. One-time setup on Windows

Install these three programs (the default options are fine):

| Program | Get it from |
|---|---|
| **Node.js** (the "LTS" version) | https://nodejs.org |
| **Git** | https://git-scm.com/download/win |
| **VS Code** | https://code.visualstudio.com |

Then:

1. Unzip this folder somewhere easy, e.g. `Documents\world-of-mikha`.
2. Open VS Code → **File → Open Folder…** → pick `world-of-mikha`.
3. Open a terminal: **Terminal → New Terminal**, then run:

```
npm install
```

## 2. Try it on your computer and tablet (live preview)

```
npm run dev
```

- It prints two addresses. Open the **Local** one in your computer's browser.
- On the tablet (same Wi-Fi), open the **Network** one (looks like `http://192.168.x.x:5173`) in Chrome.
- If Windows asks about the firewall, allow **Private networks**.
- Every time you save a file, the game reloads by itself. Press `Ctrl + C` in the terminal to stop.

## 3. Put it on GitHub (first time)

1. On github.com, click **New repository**. Name it `world-of-mikha`, choose **Public**, and
   don't tick "Add a README". Click **Create repository**.
   *(Public is needed for free GitHub Pages, which delivers new questions to the tablet.
   Nothing private is in this project.)*
2. In the VS Code terminal (replace `YOUR-NAME` with your GitHub username):

```
git init
git add .
git commit -m "World of Mikha - first version"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/world-of-mikha.git
git push -u origin main
```

   The first push opens a browser window to sign in to GitHub.

3. Turn on GitHub Pages: on your repo page go to **Settings → Pages**, and under
   **Source** choose **GitHub Actions**.
4. Go to the **Actions** tab. Open **Publish web + questions** and click **Re-run all jobs**.
   It may have failed the first time, before Pages was switched on.

## 4. Install on the tablet

1. Wait for **Build Android app** in the **Actions** tab to turn green (about 5–10 minutes).
2. On the tablet, open Chrome and go to
   `https://github.com/YOUR-NAME/world-of-mikha/releases/latest`
3. Tap the file `world-of-mikha-N.apk`.
4. Android asks to allow installs from Chrome. Allow it, then tap **Install**.
   If Play Protect warns about an unknown app, choose **Install anyway**. It's your own app.

**Updates:** each new build appears as a new release. Install it the same way, and it
replaces the old version while keeping Mikha's scores.

**Bonus:** the browser version is also online at `https://YOUR-NAME.github.io/world-of-mikha/`.

## 5. Changing questions (no rebuild needed)

All questions live in `public/content/`:

| File | Monument |
|---|---|
| `math.json` | 💧 Counting Waterfall |
| `speaking.json` | 🎵 Singing Stone |
| `memory.json` | ⛄ Memory Snowman ("What's missing?") |
| `vocab.json` | 🍭 Giant Lollipop ("Find the …!") |
| `focus.json` | ✨ Firefly Pond (follow the firefly, odd one out, breathing) |
| `index.json` | list of files + the **version number** |

Each challenge has a pool of 25 (Firefly Pond: 10 tasks) and picks 10 at random every visit — set by `questionsPerVisit` / `wordsPerVisit` in each file.

To change them, you can even do it right on the GitHub website (open the file, click the ✏️ pencil):

1. Edit the questions. Keep the same shape as the existing ones. Each question needs its own `id`.
2. In `index.json`, **add 1 to `"version"`**. This tells tablets there's something new.
3. Commit.

Next time the app starts with internet, it downloads the new questions quietly.
They appear the next time Mikha enters that monument. Offline, it keeps using the last questions it had.

Math question types:
```json
{ "id": "m9", "type": "count", "prompt": "How many bees?", "emoji": "🐝", "n": 5, "answer": 5, "choices": [4, 5, 6] }
{ "id": "m10", "type": "add", "prompt": "2 frogs and 2 frogs. How many?", "emoji": "🐸", "a": 2, "b": 2, "answer": 4, "choices": [3, 4, 5] }
{ "id": "m11", "type": "sub", "prompt": "6 cookies. 3 are eaten. How many are left?", "emoji": "🍪", "a": 6, "b": 3, "answer": 3, "choices": [2, 3, 4] }
```

## 6. Changing the game itself

Edit files in `src/`, check them with `npm run dev`, then send them to GitHub:

```
git add .
git commit -m "describe what you changed"
git push
```

A new APK appears in Releases a few minutes later.

## 7. The voice (Emma)

The cloud build records every sentence the game says with **Kokoro**, a free open-source
(Apache-2.0) AI voice — British female voice "Emma" — and packs the little MP3s into the app,
so the voice sounds the same, natural and friendly, on every tablet, even offline.
- Lines come from `src/voiceLines.js` plus the question files, so new questions get recorded automatically.
- New questions sent through GitHub Pages (no new APK) get their clips from the Pages build too.
- Anything without a clip uses the tablet's own voice as a backup.
- On your PC (`npm run dev`) there are no clips, so you'll hear the computer's voice — that's normal.
- Want a different voice? In both workflow files, add `VOICE: bf_isabella` (or `bf_alice`, `bf_lily`)
  under `env:`; everything is re-recorded on the next build.

## 8. Parent tips

- **Trophies:** bottom-right shows one trophy per monument. Grey = not finished yet today (this play session), gold = finished. They reset each time the app is opened.

- **Parent corner:** press and hold ⚙︎ (top-right) for about 1.5 seconds. It shows scores per monument visit and per day.
- **Singing Stone microphone:** the first visit asks to allow the microphone; tap *Allow*.
  If voice levels look too high or low, use **Calibrate microphone** in the parent corner (in a quiet room).
- **Background music:** put a calm, looping MP3 at `public/audio/bgm.mp3` (details in `public/audio/PUT-MUSIC-HERE.txt`). Volume slider in the parent corner.
- **Brightness:** the parent corner has a 🔆 slider (50–100%). It starts at a calm 80%.
- **Back button:** Android's back button never closes the game. Inside a monument it asks "Go back to the island?".
- **Keep Mikha in the app:** turn on *App pinning* (usually **Settings → Security → App pinning**,
  the name varies by brand). Then pin World of Mikha from the recent-apps screen.

---

## What's where

```
public/content/        questions (JSON) — edit any time
public/audio/bgm.mp3   background music (you add it — see PUT-MUSIC-HERE.txt)
src/music.js           plays the music on a loop, muted during challenges
src/main.js            starts everything, game loop
src/engine.js          renderer, camera, lights, 3D helpers
src/player.js          walking, bouncing, footstep squeaks
src/controls.js        steering: hold-and-slide on the avatar, or the joystick pad (bottom-left)
src/avatars/           Kitty, Blibli (built in code), Ponchi (public/avatars/ponchi.glb) — add new characters here
scripts/make_ponchi.py builds ponchi.glb (low-poly model + Idle/Walk animations)
src/world/             home island, bridges, Crystal Isle, Winter Wonderland, Candy island, Firefly meadow, ocean, lighting moods, red monument circles
src/monuments/         one file per monument (challenge + its 3D model)
src/ui/                title, trophy shelf, avatar picker, challenge window, parent corner
src/sound.js           squeak + ping (made in code)
src/speech.js          reads words aloud (recorded Emma clips first, tablet voice as backup)
src/voiceLines.js      every fixed sentence the game says (recorded by the cloud build)
scripts/               voice recording: voice-lines.mjs lists sentences, make_voice.py records them
src/mic.js             microphone loudness for the Singing Stone
src/storage.js         scores saved on the tablet
src/settings.js        grown-up settings (brightness)
src/content.js         loads questions + checks for updates
signing/debug.keystore keeps every build signed the same, so updates install over the old one
.github/workflows/     cloud builds (APK + GitHub Pages)
```

**Monuments:** 💧 Counting Waterfall ✅ (home island), 🎵 Singing Stone ✅ (Crystal Isle),
⛄ Memory Snowman ✅ (Winter Wonderland), 🍭 Giant Lollipop ✅ (Candy island), ✨ Firefly Pond ✅ (Firefly meadow, night).
