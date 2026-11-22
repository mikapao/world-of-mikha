// Baseline: src/world/layout.js (walkable / groundY). Pure data, no three.js, no DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { walkable, groundY, BRIDGES, BR, BR4, BR5, I2, I3, I4, I5, ISLAND_R, bridgeS } from "../src/world/layout.js";

// Island centres (from layout.js constants)
const HOME = { x: 0, z: 0 };
const CENTRES = {
  home: HOME,
  crystal: { x: I2.x, z: I2.z },
  winter: { x: I3.x, z: I3.z },
  candy: { x: I4.x, z: I4.z },
  meadow: { x: I5.x, z: I5.z },
};

// Monument ring centres as recorded in team/00_feature_map.md section 5c (Fact from the monument files)
const RING_CENTRES = {
  waterfall: [3.5, -1.5],
  singingStone: [4.2, -25.8],
  snowman: [-19.6, 15.9],
  lollipop: [21.3, 13.1],
  fireflyPond: [3.6, 25.2],
};

test("constants: home island radius and island centres are as recorded", () => {
  assert.equal(ISLAND_R, 11);
  assert.deepEqual([I2.x, I2.z], [4, -27]);
  assert.deepEqual([I3.x, I3.z], [-21, 15]);
  assert.deepEqual([I4.x, I4.z], [20, 12]);
  assert.deepEqual([I5.x, I5.z], [2, 24]);
  assert.equal(BRIDGES.length, 4);
});

test("walkable: every island centre is walkable", () => {
  for (const [name, c] of Object.entries(CENTRES)) {
    assert.equal(walkable(c.x, c.z), true, `${name} centre`);
  }
});

test("groundY: island centres are at ground level 0", () => {
  for (const [name, c] of Object.entries(CENTRES)) {
    assert.equal(groundY(c.x, c.z), 0, `${name} centre`);
  }
});

test("walkable: monument ring centres are on an island", () => {
  for (const [name, [x, z]] of Object.entries(RING_CENTRES)) {
    assert.equal(walkable(x, z), true, `ring ${name} at (${x}, ${z})`);
  }
});

test("walkable: open ocean points are not walkable", () => {
  for (const [x, z] of [[40, 40], [-40, 0], [0, -45], [30, -30], [-30, -10]]) {
    assert.equal(walkable(x, z), false, `ocean (${x}, ${z})`);
    assert.equal(groundY(x, z), 0, `ocean groundY (${x}, ${z})`);
  }
});

test("walkable: just outside the home island edge (away from bridges) is not walkable", () => {
  assert.equal(walkable(0, -10.5), false);
  assert.equal(walkable(-10.5, 0), false);
  assert.equal(walkable(9, -9), false);
});

test("walkable: (0, 10.5) is just outside the home edge but lies on the Meadow bridge deck (BR5)", () => {
  // The bridge home -> Firefly meadow runs almost straight along +z, so this point is on the deck.
  assert.equal(walkable(0, 10.5), true);
  assert.notEqual(bridgeS(BR5, 0, 10.5), null);
});

test("walkable and groundY: the middle of each bridge deck is walkable and arched", () => {
  for (const br of BRIDGES) {
    const s = (br.a + br.b) / 2;
    const x = br.ox + br.ux * s, z = br.oz + br.uz * s;
    assert.equal(walkable(x, z), true, `bridge mid (${x.toFixed(2)}, ${z.toFixed(2)})`);
    const y = groundY(x, z);
    assert.ok(y > 0 && y <= 0.45 + 1e-9, `bridge arch height ${y}`);
  }
});

test("walkable: a point just beside a bridge deck (off its width) is not on that bridge", () => {
  // BR goes home -> Crystal Isle. Step 3 units sideways from its middle: outside the 1.05 half-width.
  const s = (BR.a + BR.b) / 2;
  const x = BR.ox + BR.ux * s + (-BR.uz) * 3, z = BR.oz + BR.uz * s + BR.ux * 3;
  assert.equal(bridgeS(BR, x, z), null);
});

test("walkable: bridge BR4 (home -> Candy) mid deck is walkable", () => {
  const s = (BR4.a + BR4.b) / 2;
  assert.equal(walkable(BR4.ox + BR4.ux * s, BR4.oz + BR4.uz * s), true);
});

test("bridges: deck ends lie on the islands they connect", () => {
  // Just before the deck starts is still the home island; just after it ends is the target island.
  // Both are island points, so ground is 0 there. (Points inside the deck, e.g. a+0.2, are arched.)
  for (const br of BRIDGES) {
    const sx = br.ox + br.ux * (br.a - 1), sz = br.oz + br.uz * (br.a - 1);
    const ex = br.ox + br.ux * (br.b + 0.2), ez = br.oz + br.uz * (br.b + 0.2);
    assert.equal(walkable(sx, sz), true, "before bridge start");
    assert.equal(walkable(ex, ez), true, "after bridge end");
    assert.equal(groundY(sx, sz), 0, "home island ground");
    assert.equal(groundY(ex, ez), 0, "target island ground");
  }
});
