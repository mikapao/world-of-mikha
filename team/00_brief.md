# Brief — Milestone "upgrade-1"

Status: **Confirmed by the owner, 2026-11-22** (as written, including the ≥ 30 fps target and the proposed defaults)
Type: **Modify existing features** (plus two small additions to the existing world)

## The idea (owner's words, summarised)
"It's time to upgrade the game." The first mission has five parts:
1. More detailed islands: about 20–30% more polygons than today's low-poly look. **Environment only; characters stay as they are.**
2. The character can jump when the player quickly double-taps the movement controls.
3. The Singing Stone (speaking challenge) asks for 3–4 words per question instead of 1–2.
4. A more cheerful, expressive voice. Today's Emma sounds flat.
5. Small animals roaming the islands (no interaction) and marine life in the ocean (dolphins, seagulls, …).

## Decisions already made (2026-11-22)
| Topic | Decision |
|---|---|
| Jump | **Just a happy hop.** It's a bouncy hop with a soft sound and lands where it started. It can't cross water or skip obstacles, and the walkable rules don't change. |
| Speaking questions | **Short phrases + 1 picture**, e.g. "I see a cat" 🐱. Scoring stays loudness-based (brave ≥ 55). |
| Voice | **Free model, more expressive.** It is still recorded in the cloud build. The owner picks the voice from samples. No paid service and no API key. |
| Tablet | **Fairly recent, mid-range or better.** |

## Proposed defaults (owner may change)
- **Jump trigger:** two taps within ~300 ms on the joystick pad, or on the avatar when using hold-and-slide steering. Holding to walk must keep working exactly as now.
- **Animals:** each island gets animals that match its theme. Proposal:
  - Home: bunnies and a butterfly
  - Crystal Isle: little birds
  - Winter: a penguin pair
  - Candy: ladybugs or a duckling
  - Meadow: frogs (fireflies already exist)
  - Ocean: 2 dolphins jumping now and then, a few seagulls circling, and maybe a turtle
- Animals are original, simple designs built in code in the same style as the world. They wander slowly, stay out of the monument circles, and the avatar walks through them (no collision, no interaction).
- **Speaking pool:** still 25 items, 10 per visit. All items become 3–4 word phrases using simple words a 5-year-old knows.

## Done when (each is checkable)
1. **Detail:** with no animals counted, the environment's triangle count (Three.js `renderer.info.render.triangles`, avatar hidden) is **20–30% higher** than today, measured from the same camera spot on each island. The avatars' meshes are unchanged.
2. **Look:** the palette, lighting moods and brightness look the same as before, with smoother shapes only. The owner compares before/after screenshots of all 5 islands.
3. **Performance:** the game holds **≥ 30 fps** on Mikha's tablet while walking around each island with animals visible.4. **Jump:** a quick double-tap makes the avatar hop with a soft sound. This works with both steering modes. A single tap or hold-and-slide behaves exactly as before. The avatar can't end a hop outside the walkable area.
5. **Speaking:** every Singing Stone item has 3–4 words. A visit still shows 10 items. Content `version` is bumped and the phrases get recorded voice clips.
6. **Voice:** the owner listens to 3+ sample voices/settings, picks one, and the cloud build records every line with it. The APK and web app play the new clips. Device TTS fallback still works if a clip is missing.
7. **Animals:** at least one kind of animal roams on each of the 5 islands, and at least 2 kinds of marine life move in the ocean. They never stand inside a monument circle and never block the avatar.
8. `npm run build` succeeds and both GitHub workflows succeed after pushing.

## Keep unchanged
- Calm design rules: soft palette, no flashing, no points shown to the child, music muted in challenges.
- Default brightness (don't brighten), `getBrightness()` respected.
- Three.js 0.128.0, Vite 6, Capacitor 7 pinned versions.
- Characters (Kitty, Blibli, Ponchi) and their geometry; original-designs-only rule.
- All other monuments, scoring, parent corner, saved scores, `signing/debug.keystore`.
- Android back button behaviour; big touch targets.

## Open questions for the team (Analyst)
1. How is the island/bridge/ocean geometry built? Which segment/detail parameters exist, and what is today's triangle count per island?
2. How do the controls detect taps and holds in both steering modes? Where would a double-tap fit without breaking hold-and-slide?
3. How does the player's bounce/walk animation work? Can a hop be layered on `groundY()`?
4. Does the Singing Stone's mic scoring depend on word length or duration? Would longer phrases need a longer listening window?
5. How does the voice pipeline work (`voice-lines.mjs` → `make_voice.py` → CI cache → `speech.js`)? What has to change to swap the voice model or voice, and does the CI runner have time and memory for a heavier model?
6. Where does the world `update(t, dt)` loop live, so roaming animals can be added cheaply?
