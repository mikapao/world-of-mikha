# Feature map — milestone "upgrade-1"

Scope: only the areas the brief touches. No `reference/` folder exists; the live code is the reference.
Marking: **Fact** = seen in code. **Guess** = inferred. Triangle numbers are **estimates** (nothing could be run).

Three.js r128 triangle formulas used (Guess, from library knowledge; not verified in node_modules):
Cylinder(radial n, 1 height seg) = 4n; Cone(n) = 2n; Sphere(w,h) = 2w(h-1); hemisphere Sphere(w,h) = w(2h-1);
Torus(r,t) = 2rt; Circle(s) = s; Box = 12; Icosahedron detail d = 20(d+1)^2 (d0=20, d1=80); Octahedron d0 = 8; Dodecahedron d0 = 36; Plane(w,h) = 2wh.

---

## 1. Environment geometry (brief part 1)

Shared helpers: `mat()` = MeshStandardMaterial with `flatShading:true` (`src/engine.js:33-34`); `mesh()` casts+receives shadow unless the last arg is false (`src/engine.js:37-41`). **Fact:** `rnd` is plain `Math.random` (`src/engine.js:43`), so tree/rock/flower placement and counts change on every launch. Before/after triangle comparisons are therefore noisy unless a seed is added or numbers are averaged. Several items are skipped when they land near reserved spots (home rocks `homeIsland.js:33`, meadow tufts `meadowIsle.js:57`, crystal spires `crystalIsle.js:25`, winter rim chunks `winterIsle.js:26`), so those counts are upper bounds.

### 1a. Mesh inventory (geometry type, detail parameters, count)

**Ocean and shore (`src/world/ocean.js`)**
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Sea surface, animated every frame | `PlaneGeometry(140,140,70,70)` (`ocean.js:6`) | 1 | 9,800 (2x70x70) |
| Foam rings (animated scale/opacity), two sets (k=0,1) | `TorusGeometry(R,0.14,4,seg)`; seg: home 40, crystal 6, winter 12, candy 14, meadow 14 (`ocean.js:15-23`) | 10 | 2x(320+48+96+112+112)=1,376 |
| Sea glints | `PlaneGeometry(0.5,0.12)` (`ocean.js:30`) | 24 | 48 |

**Home island (`src/world/homeIsland.js`)**
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Grass top, dirt base | `CylinderGeometry(...,10 radial)` (`:11,13`) | 2 | 80 |
| Tree trunk | `Cylinder(...,6)` (`:21`) | 20 | 480 |
| Tree leaf blob | `IcosahedronGeometry(0.85s,0)` (`:22`) | 20 | 400 |
| Flowers | `SphereGeometry(0.12,5,4)` (`:29`) | 45 | 1,350 |
| Rocks | `DodecahedronGeometry(0.25-0.45,0)` (`:34`) | up to 6 | up to 216 |
| Clouds (3 blobs each, high up, wrap at x=30) | `IcosahedronGeometry(0.7-1.1,0)` (`:38`) | 15 | 300 |
Home island subtotal about 2,830 (estimate).

**Home monument: Counting Waterfall (`src/monuments/countingWaterfall.js`)**: Dodecahedron d0 x2 (`:18-19`), Box (`:20`), `Cylinder(1.3,1.3,0.12,12)` (`:22`), Octahedron d0 (`:23`); 14 sparkle Octahedra d0 appear only after completion (`:34-35`). About 140 (+112 after completion) + ring.

**Monument rings (all 5, `src/world/ring.js:12-14`)**: `TorusGeometry(r,0.11,8,40)` = 640 + `CircleGeometry(r,36)` = 36, about 676 each, ~3,380 for all five. Radius 1.5 (stone, snowman, lollipop, pond) or 1.9 (waterfall, `countingWaterfall.js:25`). The ring counts as environment.
Home total with monument and ring about 3,650 (estimate).

**Crystal Isle (`src/world/crystalIsle.js`)**, hexagon, radial 6
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Top and base | `Cylinder(...,6)` (`:16-17`) | 2 | 48 |
| Magenta grass patches | `CircleGeometry(0.5-1.1,6)` (`:20`) | 10 | 60 |
| Rim spires | `Cylinder(...,5)` (`:26`) | up to 9 | up to 180 |
| Crystals (3 per cluster) | `OctahedronGeometry(0.3,0)` scaled (`:37`) | 33 | 264 |
| Motes (opacity 0 by day, still drawn) | `SphereGeometry(0.05,5,4)` (`:48`) | 20 | 600 |
Singing Stone (`singingStone.js`): terrace `Cylinder(...,6)` (`:22`) 24; stone `IcosahedronGeometry(1.25,1)` (`:28`) 80; 3 gems Octahedron d0 (`:30`) 24; 4 note tori `Torus(0.12,0.04,5,10)` (`:35`) 400 (opacity 0 until singing, still drawn); ring 676.
Crystal Isle subtotal about 2,340 (estimate).

**Winter Wonderland (`src/world/winterIsle.js`)**, radial 12
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Top, base | `Cylinder(...,12)` (`:21-22`) | 2 | 96 |
| Ice rim chunks | `Dodecahedron(0.3-0.55,0)` (`:27`) | up to 14 | up to 504 |
| Snow drifts | `Sphere(.,8,5)` scaled (`:32`) | 12 | 768 |
| Frozen pond | `CircleGeometry(1.6,14)` (`:36`) | 1 | 14 |
| Igloo dome, tunnel, door | hemisphere `Sphere(1.2,10,6)`, Box, `Circle(0.3,10)` (`:41-43`) | 1 | 132 |
| Pines: trunk `Cylinder(..,5)`, 3 cones `Cone(.,.,7)`, 3 snow caps `Cone(.,.,7)` (`:53-56`) | | 12 | 1,248 |
| Ice glints | `Octahedron(0.12,0)` (`:64`) | 14 | 112 |
| Falling snow | `THREE.Points`, 420 points (`:69-75`) | 1 | 0 (points) |
Snowman (`snowman.js:20-50`): mound `Cyl(...,12)` 48; 3 body spheres `Sphere(.,12,10)` 648; eyes/mouth/buttons small spheres (6,5)/(5,4) ~340; hat 3 x `Cyl(...,14)` 168; scarf `Torus(0.46,0.13,6,14)` 168; nose, arms, twigs, box bits ~100; ring 676. About 2,150 incl. ring.
Winter subtotal about 4,600 (estimate).

**Candy island (`src/world/candyIsle.js`)**, radial 20
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Cake layers | `Cylinder(...,20)` (`:33-36`) | 4 | 320 |
| Frosting drips | `Sphere(.,7,6)` (`:39`) | 26 | 1,820 |
| Lollipop trees: stick Cyl6, ball `Sphere(0.48,10,8)`, band `Torus(0.48,0.06,6,18)` (`:46-48`) | | 6 | 2,280 |
| Cotton-candy trees: stem Cyl6 + 5x `Icosahedron(.,1)` (`:54-56`) | | 5 | 2,120 |
| Candy canes: `Cyl(...,10)` + `Torus(0.28,0.11,8,12,pi)` (`:65-66`) | | 4 | 928 |
| Cupcakes: Cyl10 + `Sphere(0.46,10,8)` + cherry `Sphere(0.11,8,6)` (`:72-74`) | | 4 | 1,040 |
| Donuts `Torus(0.32,0.15,8,16)` (`:80`) | | 4 | 1,024 |
| Gumdrops hemisphere `Sphere(0.17,7,5)` (`:86`) | | 14 | 882 |
| Sprinkles `Box` (`:92`) | | 70 | 840 |
Giant Lollipop (`lollipop.js:34-50`): base `Cyl(...,16)` 64, stick Cyl10 40, disc `Cyl(1.35,1.35,0.4,36)` 144, shine sphere (8,6) 80, bow 2 cones(4) + sphere ~96; ring 676. About 1,100.
Candy subtotal about 12,400 (estimate). Largest island by far.

**Firefly meadow (`src/world/meadowIsle.js`)**, radial 14
| Mesh | Geometry / detail | Count | Est. tris |
|---|---|---|---|
| Top, base | `Cylinder(...,14)` (`:28-29`) | 2 | 112 |
| Willows: trunk Cyl6, crown `Sphere(0.95,9,7)`, 9 strands `Sphere(0.22,6,5)` (`:34-38`) | | 5 | 2,820 |
| Mushrooms: stem Cyl6 + hemisphere cap `Sphere(.,9,6)` (`:49-50`) | | 12 | 1,476 |
| Grass tufts: 3 x `Cone(0.05,.,4)` (`:59`) | | up to 30 | up to 720 |
| Stones `Dodecahedron(.,0)` (`:64`) | | 5 | 180 |
| Fireflies (40 pts), stars (160 pts) | `THREE.Points` (`:67-85`) | 2 | 0 |
Firefly Pond (`fireflyPond.js:23-45`): pond `Cyl(2,2,0.1,22)` 88; 16 stones Dodecahedron d0 576; 5 pads `Circle(0.32,10)` 50; 3 lotus `Cone(.,.,6)` 36; 4 reeds Cyl4 + Cyl6 160; 18 swarm `Sphere(0.07,6,5)` 864; ring 676. About 2,450.
Meadow subtotal about 7,750 (estimate).

**Bridges (`src/world/bridge.js`)**, 4 built at `main.js:47-49`. Per plank `Box` 12 (`:16`), post `Box` 12, rail `Box` 12, lantern `Sphere(0.13,8,6)` = 80 (`:25`). Plank count = round((b-a+1.2)/0.55)+1; my arithmetic from `layout.js:17-24`: BR 23 planks, BR3 18, BR4 14, BR5 16. Estimates: ~1,280 + ~960 + ~860 + ~940 = ~4,040 total. Lanterns (8-12 per bridge... ~30 total) are about half of it.

### 1b. Totals (estimate)
- Whole scene about 45,000 triangles before the avatar: islands ~30,800, ocean 9,800, foam+glints ~1,420, bridges ~4,040.
- **Fact:** everything is drawn each frame (default frustum culling per object); the ortho view is 15 units tall (`engine.js:13,18`). The ocean is a single mesh, always partly visible, so a fixed 9,800 is in every measurement. Candy island measurements will be dominated by its own ~12k; Crystal Isle by ocean + ~2.3k.
- **Guess:** `renderer.info.render.triangles` (r128) includes the shadow-map pass because `info` resets only at the start of `render()`. The Tester should confirm (log with shadows on and off) so before/after use identical methods.
- **Consequence:** a +20-30% target on "environment triangles from one camera spot" depends heavily on whether the 70x70 ocean grid changes (+24% on the ocean alone at 78x78, but see hot spots in 5d).

### 1c. Observations on where detail is low
- Low-segment items: tree trunks 6, igloo dome (10,6), snow drifts (8,5), flowers (5,4), rocks detail 0, mushroom caps (9,6), bridge lantern spheres (8,6), crystals (octahedra).
- Look relies on `flatShading:true` (`engine.js:34`): more segments make facets smaller, not smooth. Truly "smoother" shapes would need `flatShading:false` on some materials, which changes lighting (brief item 2).
- Geometry is never shared: every `mesh(new ...Geometry())` allocates a new one (45 flower spheres, 70 sprinkles, ...); no `InstancedMesh` anywhere in `src/`. **Guess:** several hundred draw calls; not measured.

---

## 2. Controls and player (brief part 2, open questions 2 and 3)

### 2a. Tap/hold detection (`src/controls.js`)
- **Mode 1: hold-and-slide on the avatar.** `pointerdown` on the canvas (`:34-43`): ignored if `blocked()` (`:35`); unlocks audio (`:36`); projects the avatar to the screen and requires the touch within `reach = max(70px, 9% of height)` (`:37-38`), else `pulseHint()` and return. On success sets `drag = {id, sx, sy, dx:0, dy:0}` and shows the joystick ring at the touch (`:39-42`). `pointermove` updates `dx,dy` (`:44-50`). `pointerup`/`pointercancel` call `cancelDrag()` (`:51-52`).
  - **Fact:** no tap concept, timers or timestamps in this file. A quick tap on the avatar makes a `drag` with `dx=dy=0` for a few frames; `updatePlayer` needs length > 15 to move (`player.js:29`), so a tap does not move the avatar.
  - **Fact:** no second-pointer guard; a second finger down within reach overwrites `drag` (`:39`).
- **Mode 2: fixed pad (bottom-left).** `#pad` in `index.html:30`, styled `style.css:179-199`. `pointerdown` (`:68-74`) sets `padId`, `.active`, captures the pointer and calls `padMove`, which at once sets `drag` with `dx,dy` scaled so a full push = 70 (`:57-66`). `pointerup`/`pointercancel` -> `padEnd` clears `drag` if `drag.pad` (`:76-81`).
  - **Fact:** an off-centre tap on the pad gives a non-zero `drag` from the first frame. **Guess:** a 100 ms tap at full push moves the avatar about 0.4 units (SPEED 4.2 x 0.1 s).
- `getMove()` returns `drag`; `main.js:109` passes it to `updatePlayer` unless a UI is open (`uiOpen()` also drives `blocked`, `main.js:36-37`).
- Pad elements are `div`s, not `button`s, so the "every button pings" listener (`sound.js:45`) does not fire for them.

### 2b. Where a double-tap would hook in
- Both modes already have one `pointerdown`/`pointerup` pair (`controls.js:34,51` and `:68,76`). A timestamp + travel-distance check at `pointerup` (short press, small travel) is the natural place; two such taps within ~300 ms would call a new exported function in `player.js`.
- **Decision needed (Fact about the code, design choice for the Commander):** in hold-and-slide mode the second `pointerdown` of a double-tap looks identical to the start of a hold until it lifts. Firing the hop on the second `pointerdown` also hops when someone taps then holds and slides; firing on the second `pointerup` (short, nearly stationary press) keeps hold-and-slide literally unchanged but delays the hop by one press length.
- On the pad, the first tap may nudge the avatar (see above) unless the detector suppresses it; brief says holding to walk must be unchanged.

### 2c. Player walking, bounce, height (`src/player.js`)
- `updatePlayer(dt,t,move)` (`:25-59`): screen drag -> isometric world direction (`:31`), speed = `SPEED(4.2) * min(l/70,1)` (`:32`), pushed out of `obstacles` circles with margin `o.r + 0.45` (`:34-37`), reverts the axis that leaves `walkable()` (`:39`), smooth turn (`:41-42`).
- **Height:** `player.position.y` eases to `groundY(x,z)` at rate 12/s (`:46`). `groundY` is 0 on islands and the bridge arch (max 0.45) on bridges (`layout.js:33,36-40`).
- **Walk bounce:** body y = `|sin(walkT)|*0.08` moving, `sin(t*2)*0.025` idle (`:49`); feet and arms swing (`:50-53`); `av.idle(t,moving)` (`:54`). One squeak per footstep (`:58`).
- **A hop already exists:** module-local `hop` (`:13`) is set to 1 by `setAvatar` (`:20`); each frame adds `sin((1-hop)*pi)*0.9` to `av.body.position.y` (`:55`), decaying at 1.6/s (about 0.63 s). It changes only the avatar's local body offset, never `player.position`.
  - Consequences (Fact): a hop built this way cannot change x/z or leave the walkable area, and `groundY` is not involved. Nothing exports `hop`; a hop trigger needs a new exported function in `player.js`, plus a guard so a hop in progress is not restarted. Walking during a hop is still allowed and still goes through `walkable()` each frame (`:39`), so "lands where it started" holds only if the player is not steering.
  - Works for all three avatars because they share the shape `{root, body, armL, armR, footL, footR, idle}` (`src/avatars/glbAvatar.js:3,32`); the GLB model sits inside `body` (`glbAvatar.js:17-23`). Not checked: whether `glbAvatar.idle()` writes `body.position` (it runs before the hop add at `player.js:54-55`, so the hop is applied last anyway).
- **Sound:** no hop sound exists. `sound.js` has `squeak`, `ping(pitch)`, `whoosh` (`:13,32,48`), all synthesised with Web Audio; a soft hop sound would be a new function there.

---

## 3. Singing Stone (brief part 3, open question 4)

Files: `src/monuments/singingStone.js`, `src/mic.js`, `public/content/speaking.json`.

**Flow (Fact):**
1. Enter -> `start()` (`singingStone.js:133-147`): `shuffle(pool).slice(0, data.wordsPerVisit || 5)` (`:141`; JSON sets 10, `speaking.json:3`), opens the mic (`:144`), speaks the intro (`:146`), then `showWord()`.
2. `showWord()` (`:51-65`) renders emoji + `w.say` + stone + stars, then `turn()`.
3. `turn()` (`:67-89`): `await ctx.speak("Say: " + w.say)` (`:71`), then "Your turn!" and `listenOnce(stoneUI, cancelled)` (`:77-78`).
4. Feedback tiers (`:83-85`): `peak >= 55` brave; `heard && peak >= 22` "a little louder"; else "couldn't hear you". Again/Next buttons appear after every attempt; unlimited retries; best attempt saved (`:81,93`).

**Mic listening window and scoring (`src/mic.js`):**
- `level()` = smoothed 0-100 from RMS dB: `(dB - (baseline+6)) / 40 * 100` (`:44-49`); baseline default -60 dB or calibrated (`:10-12,52-62`).
- `listenOnce` (`:68-81`): per animation frame; `lv > 8` counts as speech (`:74`), tracking peak and average of speaking frames; ends when `heard && 900 ms since last loud && elapsed > 800 ms`, **or** a hard cap `elapsed > 5000 ms` (`:77`). Returns `{peak, avg, heard}`.
- **Fact: word/phrase length is not used anywhere.** Scoring is loudness only: `brave = peak >= 55` (`singingStone.js:93`); `avg` is stored (`:93`, `finalize` `:107`) but feedback uses `peak` (`:83-84`).
- **Does a longer phrase need a longer window?**
  - The 5 s cap starts when listening starts (includes reaction time) and never extends. A 3-4 word phrase for a 5-year-old is plausibly 1.5-3 s of speech (**Guess**, not measured); 5 s is probably enough but has less margin than for one word.
  - The 900 ms end-of-speech silence rule could end the window early if the child pauses over 0.9 s between words (**Guess**); because scoring is peak-only, the result is still a valid loudness score, just from part of the phrase.
  - `smooth` attack 0.5 / release 0.15 are per frame, not per second (`mic.js:47`), so the feel depends on frame rate.
  - `listenOnce` has one caller, `singingStone.js:78` (Fact, grep of `src/`). `calibrate()` is called only from the parent corner (`ui/parent.js:199`) and uses its own 3 s window, so changing listen timing does not affect calibration.
- UI: the phrase renders in `.prompt` inside `.vword` (`singingStone.js:55`). `.vword` is a centred flex row with the emoji at 44-64 px and `.prompt` at 22-30 px, with inline `margin:0` (`style.css:27,79-80`). **Unknown:** how a 3-4 word phrase wraps beside the emoji on a small tablet; needs a browser check.
- Data saved: `entry.words[]` with `{id, say, attempts, peak, avg, brave}` (`:93`). Grep of `src/ui/` and `src/storage.js` for `.words`/`.say` returned no matches, so I **did not find** UI that depends on `say` text; not fully verified for the parent summary rendering.
- Content today (`speaking.json:4-130`): 12 one-word items, 9 two-word, 4 three-word (`I love you`, `big red ball`, `one two three`, `I am happy`); none has 4 words. All 25 have an emoji.
- Voice lines: each item becomes the clip `Say: <phrase>` (`scripts/voice-lines.mjs:21`); `splitSentences` splits only on `. ! ?` (`voiceKey.js:6`), so a punctuation-free phrase is one clip. A phrase with a period or "!" would split into two clips and the "Say:" prefix applies only to the first.
- `public/content/index.json:2` version is `6`; must be bumped on content change (CLAUDE.md "Content"). Content reaches existing installs via Pages (`content.js:41-51`) without an APK rebuild (`build-apk.yml:12-14` ignores content paths), but new clips would only arrive from Pages (see section 4).

---

## 4. Voice pipeline (brief part 4, open question 5)

**Chain (Fact):**
1. `scripts/voice-lines.mjs` imports `FIXED_LINES` (`src/voiceLines.js:7-34`), builds "Hello, <name>!" from `name: "..."` entries in `src/avatars/index.js` (`:13`), math prompts (`:19`), `Say: <say>` for speaking (`:21`), `Find the / That's the / <word>!` for vocab (`:22`). Splits into sentences, dedupes by `keyOf` (`:26-30`), writes `voice-lines.json` of `{key, text, file}`.
2. `scripts/make_voice.py`: `KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")` (`:30-33`), env `VOICE` (default `bf_emma`) and `VOICE_SPEED` (default 0.9) (`:18-19`), 0.12 s silence pad at 24 kHz (`:34`), synthesis per line, `ffmpeg` to mono 24 kHz 48 kbps mp3 (`:47`), writes `public/voice/*.mp3` and `index.json` `{voice, lines:{key:file}}` (`:56`). Skips existing mp3s (`:38`), deletes unused ones (`:52-54`). A `voice.txt` stamp holds `"<voice> <speed>"`; a change deletes all mp3s and re-records (`:22-28`).
3. Workflows `publish-web.yml:35-56` and `build-apk.yml:40-61`: Python 3.11, `actions/cache@v4` on `~/.cache/pip`, `~/.cache/huggingface`, `public/voice`, key `voice-v1-<hash of src/voiceLines.js, src/voiceKey.js, src/avatars/index.js, public/content/**, scripts/**>`, `restore-keys: voice-v1-` (a changed key restores the previous cache). The step has `continue-on-error: true`; installs `espeak-ng ffmpeg`, CPU torch from the pytorch CPU index, `kokoro>=0.9 soundfile numpy`, then the two scripts. No `timeout-minutes` (GitHub default 360).
4. `npm run build` bundles `public/voice/` into `dist/` (**Guess**, standard Vite public-dir behaviour); the APK gets it via `cap sync`; Pages publishes it.
5. Playback `src/speech.js`: `loadPack()` reads `./voice/index.json` (bundled) then `<Pages>/voice/index.json`, local entries winning (`:88-98`, `if (!pack.has(k))` at `:96`). `speak()` splits into sentences, looks up `keyOf(part)` (`:150-152`), decodes via WebAudio (`:104-108`), else falls back to device TTS per sentence (`:156-158`). The parent can switch to a device voice (`:74-79`). The clip file name is a hash of the text only (`voiceKey.js:13`), not of the voice.

**What must change to swap voice / model:**
- Same model, other voice or speed: set `VOICE`/`VOICE_SPEED` in the workflow `env` (both workflows). The stamp (`make_voice.py:22-28`) re-records everything. The file comment lists British options `bf_emma, bf_isabella, bf_alice, bf_lily` (`make_voice.py:9`). `lang_code="b"` is hard-coded (`:31`), so American voices would need `lang_code="a"` (**Guess**, from Kokoro docs, not in repo).
- Different TTS model: replace the `kokoro` code in `make_voice.py` and the `pip install` lines in both workflows. The stamp has voice and speed but **not** the model name, and `restore-keys: voice-v1-` can hand back old mp3s, so the stamp or cache prefix would need a bump (**Guess**). `index.json`'s `voice` field is written but not read by the app (no reference in `speech.js`).
- **Fact, rollout risk:** an installed APK keeps its bundled clips for every existing sentence (`speech.js:96`); Pages clips are used only for sentences not in the APK. So a new voice reaches a tablet only through a new APK (or a fresh web load), and an old APK would play the old voice for old lines and the new voice for new phrases. **Guess:** the web app's browser HTTP cache may serve an old mp3 under the same file name (`speech.js:105` uses default cache).
- Voice samples for the owner: **not found**; no script or workflow produces samples. One would be needed (e.g. a `workflow_dispatch` job or a local run).
- Runner constraints: `runs-on: ubuntu-latest` (`publish-web.yml:23`, `build-apk.yml:22`) and CPU-only torch are facts. **Guess** (GitHub documentation, not in repo): a public-repo standard runner has 4 vCPU, 16 GB RAM, ~14 GB disk. Kokoro-82M is small; a model of a few hundred million to ~1B parameters would likely fit in memory on CPU but be many times slower. **Not measured:** current voice step duration and number of lines. Run `node scripts/voice-lines.mjs` for the count and read a past Actions log for timing. Both workflows run the voice step, so the cost doubles per push unless the shared cache hits (**Guess** that it does).

---

## 5. Game loop, world animation, walkable and obstacle data (brief part 5, open question 6)

### 5a. The loop (`src/main.js:104-137`)
- `loop(now)` via `requestAnimationFrame`; `dt = min(frameDelta, 0.05)`, `t = now/1000` (`:107`). Order: `updatePlayer` (`:109`), `updateLighting` (`:110`), each `m.update(t,dt)` (`:111`), `updateOcean` (`:112`), `updateHomeIsland`, `updateCrystalIsle`, `updateWinterIsle`, `updateCandyIsle`, `updateMeadowIsle` (`:113-117`), camera follow and sun (`:119-121`), ring-proximity check (`:123-133`), `renderer.render` (`:135`).
- A new animal update call would slot in after `main.js:117`; creation would go in `boot()` (`:45-57`) after all islands (so `obstacles` is complete). Monuments are created first so trees avoid them (`:44`).
- `monuments` is a module-local array in `main.js:35`; an animal system would need it (or the ring list) passed in.

### 5b. How things animate today (Fact)
- Ocean: CPU vertex displacement of 71x71 vertices (three sin/cos per vertex) plus `geo.computeVertexNormals()` every frame (`ocean.js:35-42`); foam torus scale/opacity (`:43`), glint opacity (`:44`).
- Home: leaf `rotation.y` wobble; clouds drift +x and wrap at 30 (`homeIsland.js:43-46`).
- Crystal: cluster sway (`crystalIsle.js:54-56`); glow/lights/motes in `lighting.js:42-45`.
- Winter: pine sway, glint pulses, 420 snow points rewritten per frame (`winterIsle.js:78-92`).
- Candy: cotton-candy puffs bob (`candyIsle.js:97-99`).
- Meadow: willow strands, mushroom glow, 40 fireflies as a `Points` cloud with per-point position and colour recomputed each frame, 160 stars (`meadowIsle.js:88-108`). Fireflies are `Points`, not meshes, so they are no pattern for animals.
- There is no shared animation system or update list; each module exports its own `updateX`. The only mixer is inside the GLB avatar.

### 5c. Walkable, obstacles, rings
- Walk circles: home centre (0,0) radius `ISLAND_R-0.9 = 10.1`; Crystal (4,-27) 6.5; Winter (-21,15) 7.7; Candy (20,12) 7.2; Meadow (2,24) 7.2 (`layout.js:2-13`). Crystal Isle is tested as a circle although it is a hexagon (`layout.js:14`).
- `walkable(x,z)` = on any island circle or bridge strip (`:35`); `groundY` 0 on islands, arch up to 0.45 on bridges (`:36-40`).
- `obstacles`: global array of `{x,z,r}` in **world** coordinates, filled during build by trees, crystals, igloo, willows, candy items, monuments (e.g. `homeIsland.js:24`, `crystalIsle.js:42`, `winterIsle.js:44,59`, `candyIsle.js:49,58,67,75`, `meadowIsle.js:42`, `singingStone.js:23`). Not obstacles: flowers, home rocks, snow drifts, gumdrops, donuts, mushrooms, tufts, stones.
- Monument rings are **not** in `obstacles`. World ring centres (from the files; ring trigger radius 2.3 at `main.js:125`, visible radius 1.5 or 1.9): waterfall (3.5, -1.5) (`countingWaterfall.js:12-13`); stone (4.2, -25.8) (`singingStone.js:16-17,131`); snowman (-19.6, 15.9) (`snowman.js:14-15,150`); lollipop (21.3, 13.1) (`lollipop.js:15-16,123`); pond (3.6, 25.2) (`fireflyPond.js:16-17,183`). Each monument also exposes `.ring` at runtime.
- Bridge-entry keep-out lists exist per island (`reservedIsle`, `reservedWinter`, `reservedCandy`, `reservedMeadow`, home `reserved`).
- Sea surface y = -0.9 with waves of roughly +-0.29 (`ocean.js:9,39`); foam at y -0.78; island tops at y 0.
- The ortho view shows only about 15-19 world units tall (`engine.js:13,18`), so most of the 140x140 ocean is off screen at any time. **Guess:** distance culling for marine animals is cheap.

### 5d. Performance hot spots and cost drivers (observations)
- `updateOcean`: 5,041 vertex updates + `computeVertexNormals` per frame (`ocean.js:36-42`); grows with the grid.
- 5 `PointLight`s (intensity 0 outside their islands) always in the scene (`countingWaterfall.js:24`, `fireflyPond.js:46`, `crystalIsle.js:45`) add per-fragment cost to every `MeshStandardMaterial` (**Guess** on size).
- Shadows: PCFSoft, 1024 map (`engine.js:6-7,28`); almost all meshes cast/receive.
- Pixel ratio capped at 2, antialias on (`engine.js:4-5`).
- No instancing or pooling (Fact); draw calls high (**Guess**).

### 5e. Bugs / oddities noted (report only)
- `stepOutOf` sets position with `y=0` and does not check `walkable` (`player.js:62-66`).
- `controls.js:14-18` `cancelDrag` does not release pad pointer capture; harmless.
- `speech.js:156` logs every missing clip to the console; useful for spotting new unrecorded phrases.
- `ocean.js:1` says "low-poly"; materials use `flatShading` (`engine.js:34`).
- `singingStone.js:141` falls back to 5 words per visit when `wordsPerVisit` is missing; the JSON sets 10.

---

## Summary table: feature-map row | brief part | files

| Feature-map row | Brief part | Files |
|---|---|---|
| 1. Environment geometry (islands, bridges, ocean, rings, monument meshes) | 1 (and 5 for animal placement) | `src/world/homeIsland.js`, `crystalIsle.js`, `winterIsle.js`, `candyIsle.js`, `meadowIsle.js`, `bridge.js`, `ocean.js`, `ring.js`, `layout.js`, `src/monuments/*.js` (world meshes), `src/engine.js` |
| 2a-2b. Tap/hold detection, double-tap hook | 2 | `src/controls.js`, `index.html` (`#pad`, `#joy`, `#hint`), `src/style.css:179-199`, `src/main.js:35-37,109` |
| 2c. Walk/bounce/height, hop, hop sound | 2 | `src/player.js`, `src/world/layout.js`, `src/sound.js`, `src/avatars/*.js` (shape only) |
| 3. Singing Stone flow, mic window, scoring, phrases | 3 | `src/monuments/singingStone.js`, `src/mic.js`, `public/content/speaking.json`, `public/content/index.json`, `scripts/voice-lines.mjs`, `src/voiceKey.js`, `src/style.css:27,79-80` |
| 4. Voice pipeline and rollout | 4 (and 3 for new phrase clips) | `scripts/voice-lines.mjs`, `scripts/make_voice.py`, `.github/workflows/build-apk.yml`, `.github/workflows/publish-web.yml`, `src/speech.js`, `src/voiceKey.js`, `src/voiceLines.js` |
| 5a-5b. Game loop, existing animation | 5 (and Done-when 3 performance) | `src/main.js:104-137`, `src/world/*.js` update functions, `src/world/lighting.js` |
| 5c. Walkable, obstacles, rings, ocean surface | 5 | `src/world/layout.js`, `src/monuments/*.js` ring/obstacle constants, `src/world/ocean.js`, `src/world/ring.js` |
| 5d. Performance hot spots | 1 and 5 | `src/world/ocean.js`, `src/engine.js`, `src/world/lighting.js` |

## Blast radius (shared functions and who else uses them)
- `mesh()`, `mat()`, `rnd()`, `farFrom()` (`engine.js:33-44`): used by every world and monument file; changing `mat` defaults changes every look.
- `obstacles` / `reserved*` arrays: written at build by islands and monuments; read by `player.js:34` and tree/decoration placement loops. Registering animals as obstacles would change walking.
- `walkable` / `groundY` (`layout.js:35-40`): used by `player.js`; animals would reuse them. Do not change.
- `speak()` and the voice clips: used by every monument and `main.js`; a new voice affects all challenges, not just the stone.
- `speaking.json` shape (`words[].id/say/emoji`, `wordsPerVisit`): read by `singingStone.js:135-141` and `scripts/voice-lines.mjs:20-21`.
- `player.js` `hop` variable: also fired by avatar switch (`:20`); a new hop must not alter that.
- `listenOnce`: single caller (`singingStone.js:78`); `calibrate`: parent corner only (`ui/parent.js:199`).
