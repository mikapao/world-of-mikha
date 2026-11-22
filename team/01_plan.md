# Plan — Milestone "upgrade-1"

Status: **Approved by the owner, 2026-11-22 ("Approve plan")**
Written: 2026-11-22 by the Commander. Based on `00_brief.md`, `00_feature_map.md`, `00_intake.md`, `baseline/`.
Branch: `milestone/upgrade-1` (never `main`).

## Feature-map rows: keep / change / remove
| Row (feature map) | Decision | Notes |
|---|---|---|
| 1. Environment geometry (islands, bridges, decorations) | **Change** | More segments, same flat shading and colours |
| 1. Ocean plane + per-frame waves | **Keep** | Not made denser, for speed (see Part 1) |
| 2a. Controls: hold-and-slide + pad | **Change (add only)** | Add a double-tap detector; holding and sliding unchanged |
| 2c. Player hop | **Change** | Export the existing hop and add a soft sound |
| 3. Singing Stone flow, mic, scoring | **Keep** | Only the content changes; listening window checked, raised only if needed |
| 3. speaking.json content | **Change** | 25 new 3–4 word phrases |
| 4. Voice pipeline | **Change** | Sample workflow, then switch to the chosen voice |
| 5. Game loop | **Change (add only)** | One new `updateAnimals()` call |
| Characters, other monuments, parent corner, storage | **Keep** | Not touched |

## Part 1 — More detailed islands (+20–30%)
**Options**
- A. Raise segments on every mesh evenly. Simple, but small items (sprinkles, flowers) get the extra triangles where nobody sees them.
- B. **(Recommended)** Spend the extra triangles where the eye sees them: island edges and tops (rounder outlines), tree canopies, rocks (icosahedron detail 0 → 1 on the big ones), igloo, snow drifts, mushroom caps, lollipops and candy, bridge rails. Small scattered items stay as they are. Flat shading stays, so the look is "finer facets, rounder outlines".
- C. Also make the ocean denser. Rejected: the ocean is recalculated every frame and is the most expensive thing in the game.

**Target:** islands + bridges go from ~37,000 to **44,500–48,200 triangles** (ocean excluded, measured the same way as `baseline/README.md`).

## Part 2 — Hop on double-tap
- Export `hop()` from `player.js`, reusing the existing hop (body only, can't leave the walkable area). A hop can't restart while one is running.
- A detector in `controls.js` fires on the **2nd press within 300 ms**, near the same spot, in both modes (on the avatar, and on the pad).
- New soft "boing" in `sound.js` (synthesised like the others, quiet).
- Accepted side effect: tap then hold-and-slide = a hop while starting to walk. That's harmless and still uses the walkable rules.

## Part 3 — Singing Stone phrases
- Rewrite all 25 items as 3–4 word phrases with one emoji (e.g. "I see a cat" 🐱). Use simple words, no punctuation, and emoji ≤ Unicode 11. Bump `index.json` version 6 → 7.
- Check that a phrase wraps nicely beside the emoji on a small screen. If the 5 s listening cap is too tight in testing, raise it to 7 s (one number in `mic.js`).

## Part 4 — Cheerful voice (free, quick builds)
1. **Samples first:** a new workflow `voice-samples.yml` records the same 6 cheerful game sentences in each candidate and uploads a zip of MP3s. The candidates are all Kokoro (same model, so builds stay fast):
   - current Emma (0.9), Emma (1.0)
   - British: Isabella, Alice, Lily
   - American: Heart, Bella, Nicole
   It runs when you press "Run workflow", or when the milestone branch is pushed. **This needs your OK to push the milestone branch**, which doesn't touch `main` or build an APK.
2. **Livelier wording (my call, light touch):** the fixed lines in `voiceLines.js` get warmer punctuation and words ("Great job!", "Yay, you did it!"). Same meaning and still calm, no shouting.
3. **Switch:** after you pick, set the voice and speed in both workflows. `make_voice.py` chooses the British/American setting from the voice name, and the stamp and cache key change so every line is re-recorded once. You install the new APK.
- If no Kokoro voice is cheerful enough, we come back to you before trying a heavier model.

## Part 5 — Animals and marine life
- New `src/world/animals.js` holds all animals: small original low-poly creatures built in code (a few boxes/spheres each), in the same style as the world.
- Land animals wander slowly inside their island's walk circle. They avoid obstacles, stay ≥ 2.8 units from monument rings and bridge entries, and pause now and then. The avatar walks through them.
  - Home: 2 bunnies + 1 butterfly
  - Crystal Isle: 2 little birds hopping
  - Winter: 2 penguins
  - Candy: 1 duckling + 2 ladybugs
  - Meadow: 2 frogs
- Marine life:
  - 2 dolphins that jump in an arc every 8–15 s near the islands
  - 3 seagulls gliding in slow circles above the water
  - 1 sea turtle paddling at the surface
- Animals that are off screen skip their animation work (cheap culling), so the cost stays small.

## Part 6 — Speed check (supports "Done when" 3)
- Add a hidden **debug overlay**, shown only when the URL ends with `?debug`. It shows fps, triangles and draw calls. You can open the web app with `?debug` on the tablet to read the fps. Children never see it.

## Tasks (one at a time, in this order)
| # | Task | Files (main) | Model |
|---|---|---|---|
| T01 | Debug overlay (`?debug`: fps, triangles, draw calls) | `src/debug.js` (new), `src/main.js` | Haiku |
| T02 | Hop on double-tap + soft sound | `src/controls.js`, `src/player.js`, `src/sound.js` | Sonnet |
| T03 | New speaking phrases + version bump (+ tests updated by Tester) | `public/content/speaking.json`, `index.json` | Sonnet |
| T04 | Voice sample workflow + script | `.github/workflows/voice-samples.yml`, `scripts/voice_samples.py` (new) | Sonnet |
| — | *Owner pushes OK → samples → owner picks a voice* | | |
| T05 | More detail: home island + bridges | `homeIsland.js`, `bridge.js`, `ocean.js` (foam only, if needed) | Sonnet |
| T06 | More detail: Crystal + Winter | `crystalIsle.js`, `winterIsle.js` | Sonnet |
| T07 | More detail: Candy + Meadow + monument decor | `candyIsle.js`, `meadowIsle.js` | Sonnet |
| T08 | Land animals (system + 5 islands) | `src/world/animals.js` (new), `src/main.js` | Sonnet (Opus if it fails once) |
| T09 | Marine life (dolphins, seagulls, turtle) | `src/world/animals.js` | Sonnet |
| T10 | Apply chosen voice + livelier fixed lines | `make_voice.py`, both workflows, `src/voiceLines.js` | Sonnet |

Each task: Coder builds → Tester runs task tests + all 38 baseline tests + `npm run build` → Commander reviews (and checks in the browser for visual tasks) → local commit "Txx …".

## Risks
1. **Speed on the tablet:** extra triangles plus ~20 animals. Mitigations: ocean unchanged, culling, the debug overlay, and a check after T07 and T09. If fps < 30, trim detail first.
2. **Voice:** Kokoro may still sound "flat" to you. In that case we stop and discuss a heavier model, which means longer builds.
3. **Old voice + new voice mix** on an old APK: solved by installing the new APK after T10.
4. **Random placement** makes triangle counts vary ±2–3%, so we measure 3 launches and average.
5. **Pushing:** samples need the milestone branch on GitHub. Existing workflows only run on `main`, so pushing the branch builds no APK.

## Gate 1
- [x] Owner approves this plan (in words), date: 2026-11-22

## Revision 1 — 2026-11-22 (after owner feedback at Gate 2): speed
Task **T11: performance pass**, **approved by the owner 2026-11-22**. Design D8 (blob shadows dropped: merged meshes make real shadows cheap):
1. **Merge each animal into one mesh** (one draw call per animal instead of ~8, using vertex colours). The look stays identical.
2. **Lighter animal shadows:** small animals get a soft round "blob" shadow on the ground instead of a real cast shadow, so they aren't drawn twice.
3. **Pixel budget:** cap the render sharpness so a frame never draws more than about 2.5 million pixels (the cap only applies on big or very sharp screens). On a normal tablet the difference is hard to see.
Target: ≥ 30 fps at 2560×1440 in the Claude pane, measured with `?debug`, and better than today on the owner's Edge.

## Revision 2: 2026-11-22, APK app icon (T12)
The owner asked whether the APK has the "M" icon from the web app. It doesn't: CI runs `npx cap add android` fresh, so every APK has had Capacitor's default icon. **Approved by the owner 2026-11-22** ("Yes, add T12 now"). T12 goes in this milestone before merging. Design D9.
