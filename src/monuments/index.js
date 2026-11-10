// The 5 monuments. Each one is its own file with:
//   id, name, emoji, label, scoring, ring {x,z}, center {x,z},
//   start(ctx)  – runs the challenge inside the challenge window
//   onLeave()   – child left (save partial scores)
//   update(t,dt)– little animations
// All 5 monuments are here.
import { createCountingWaterfall } from "./countingWaterfall.js";
import { createSingingStone } from "./singingStone.js";
import { createSnowman } from "./snowman.js";
import { createLollipop } from "./lollipop.js";
import { createFireflyPond } from "./fireflyPond.js";

export function createMonuments() {
  return [createCountingWaterfall(), createSingingStone(), createSnowman(), createLollipop(), createFireflyPond()];
}
