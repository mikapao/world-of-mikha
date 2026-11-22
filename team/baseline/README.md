# Baseline "before" — captured 2026-11-22 by the Commander

Captured from `npm run dev` on `milestone/upgrade-1` before any change, with an 800×600 browser pane and the Blibli avatar. Screenshots: `1-home.jpg` … `5-meadow.jpg`, taken with the avatar at each island centre.

## Triangle counts (measured in the running scene, avatar excluded)
Method: traverse `scene`, sum each mesh's triangles (index count / 3), skip anything under `player`, and assign each mesh to the nearest island within radius + 2.

| Area | Triangles |
|---|---|
| Ocean plane (140×140, 70×70 segments) | 9,800 |
| Home island (incl. nearby bridge parts, minus ocean) | ~6,018 |
| Crystal Isle | 2,816 |
| Winter Wonderland | 6,262 |
| Candy island | 12,944 |
| Firefly meadow | 8,416 |
| Other (bridge middles, etc.) | 622 |
| **Total** | **46,878** |

Placement is random (`engine.js:43`), so counts vary a little each launch. The +20–30% target applies to the total excluding the ocean (~37,078), i.e. **about 44,500–48,200**.
