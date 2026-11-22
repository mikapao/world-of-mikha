# Handoff — Milestone "upgrade-1"

Status: **Waiting for the owner's test (Gate 2)**. Written 2026-11-22 by the Commander.
Branch: `milestone/upgrade-1` (10 task commits, not merged). Tests: `node --test tests/` → 149 pass, 0 fail, 4 skipped (YAML parser not installed). `npm run build` passes.
Impact check: `team/analysis/impact-check.md`. Nothing on the brief's "Keep unchanged" list was changed.

## What changed
| Brief part | What you get | Task |
|---|---|---|
| 1. More detail | Island environment +23% triangles (37,186 → ~45,700, ocean excluded). Rounder tree tops, rocks, igloo, drifts, lollipops, cupcakes, willows and bridge lanterns. Flat facets, colours and lighting kept. Crystal Isle stays a hexagon. Ocean unchanged (speed). | T05–T07 |
| 2. Hop | Quick double-tap on the character or on the joystick pad = a happy hop with a soft "boing". Walking unchanged. | T02 |
| 3. Speaking | Singing Stone: 25 new 3–4 word phrases ("I see a cat" 🐱), 10 per visit. Content version 7. | T03 |
| 4. Voice | New voice **Alice (British), speed 0.9**, your pick from samples. 9 spoken lines made warmer ("Yes, well done!"). Sample workflow kept for future voice choices. | T04, T10 |
| 5. Animals | 12 land animals (bunnies + butterfly, birds, penguins, duckling + ladybugs, frogs). At sea: 2 dolphins leaping every 8–15 s, 3 seagulls, 1 turtle. They stay out of monument circles and off bridges, never block Mikha, and make no sounds. | T08, T09 |
| Extra | Hidden speed counter: add `?debug` to the address to see fps / triangles. | T01 |

## How to test
### Stage A: before merging (no voice, no mic)
1. In VS Code's terminal: `npm run dev`. It prints a Wi-Fi address (e.g. `http://192.168.x.x:5173`).
2. On the tablet's browser, open that address **with `?debug` at the end**.
3. You'll hear the tablet's own voice and the mic won't work. That's expected over Wi-Fi.

### Stage B: after you merge to `main` (real APK, Alice, mic)
Merging runs both cloud builds. The first one takes longer because every line is recorded in Alice's voice. Then install `world-of-mikha-N.apk` from Releases, as usual. Scores are kept.

## Tablet checklist (from the brief's "Done when")
- [ ] **Speed (A):** with `?debug`, walk around all 5 islands. **fps stays ≥ 30.** Write down the lowest number you see.
- [ ] **Look (A):** islands look like before, just smoother. Same colours, not brighter. (Before pictures: `team/baseline/`.)
- [ ] **Hop (A):** double-tap the character → hop + soft boing. Double-tap the pad → hop. Single tap and hold-and-slide walk exactly as before.
- [ ] **Hop sound (A/B):** is the boing pleasant and quiet enough?
- [ ] **Animals (A):** you can spot animals on every island. Are they **big enough**? (They're small next to the character.) None stand in a red circle or on a bridge.
- [ ] **Sea (A):** wait near an island edge and you'll see a dolphin leap. Seagulls circle, and a turtle paddles in open water.
- [ ] **Singing Stone (A):** phrases show nicely next to the picture.
- [ ] **Singing Stone mic (B):** Mikha can say a 4-word phrase before listening stops (5 s). If it cuts her off, tell me and we'll raise it to 7 s.
- [ ] **Voice (B):** everything is spoken by Alice, cheerful but calm. No robot-voice sentences.
- [ ] **App icon (B):** the tablet shows the "M" icon. If the launcher wiggles icons, no thin navy edge appears.
- [ ] **Everything else (B):** the other 4 monuments, trophies, parent corner, scores, the back button and music muting work as before.

## Known and accepted
- Candy + Meadow detail is +33%, home +49% (per-island bands were guidance only; the whole-world target of +23% is met).
- Bunny/penguin height 0.7 and ladybug 0.26, outside the 0.35–0.6 guide. You judge the size.
- The speed counter's "env tris" now includes the animals (~2.5k), so it reads higher than the +23% figure.
- Animals cast shadows; their cost is only measurable on the tablet (fps check above).
- Pre-existing, not touched: on narrow phones the Singing Stone "allow the microphone" text overlaps the buttons.
- Default names "Kittyping"/"Kuromi" kept by your decision.

## Gate 2
- [ ] Owner accepts (in words), date: ____ / or sends back with notes.

## Owner feedback, round 1 (2026-11-22): speed problem
- Owner: in Edge, full screen on a high-res monitor, **fps never goes above 12**. In the Claude browser pane (smaller window) it holds a steady 60.
- Commander measurement at a 2560×1440 viewport: **36 fps with animals, 56 fps with animals hidden** (one clean sample; later samples were lost because the pane was hidden). Draw calls are 370, up from ~280 before the animals.
- Cause: the 18 animals are built from **141 separate meshes**, and the land ones cast shadows, so each is drawn twice. That adds ~110+ draw calls per frame. Big screens (and tablets with sharp screens) also draw many pixels per frame, at up to 2× sharpness.
- Proposed fix: new task T11 (see `01_plan.md` revision). Waiting for owner approval.
- **Fixed by T11 (2026-11-22):** animals are merged into 1–5 draw calls each, and the frame is capped at about 2.5 M pixels. At 2560×1440 in the Claude pane: 36 → **60 fps** on every island. Waiting for the owner to retest in Edge.
- **Owner retest (2026-11-22):** full-screen Edge on the high-res monitor is **smooth** after T11. Next: tablet Stage A, then merge for Stage B.
- **PR opened (2026-11-22):** https://github.com/mikapao/world-of-mikha/pull/1 (milestone/upgrade-1 → main), opened by the owner from the pre-filled link. Merging is the owner's call (charter Step 5).
- **Merged 2026-11-22** at the owner's request ("merge"). Merge commit dbe8401 on `main`; PR #1 shows merged. On merged main (Windows working copy): 173/174 pass. The one failure is `tests/T10-voice.test.mjs` "job-level env", which only matches LF line endings and fails on the CRLF checkout. The content is identical to the branch that passed 174/174. **Follow-up for the Tester:** make that regex CRLF-tolerant.
- **Cloud builds on main: both succeeded.** Build Android app run 45015802728 (#5): voice step 160 s (Alice recorded), "Make the app icon" ran, APK published as release **build-5** (`world-of-mikha-5.apk`, 11.1 MB). Publish web: success; `voice/index.json` on Pages reports `bf_alice`.
- **Next:** the owner installs build-5 on the tablet and runs the checklist above (Gate 2).
