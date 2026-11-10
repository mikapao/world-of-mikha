// Where everything is in the world, and where the avatar is allowed to walk.
export const ISLAND_R = 11;                       // home island (round), centre 0,0
export const I2 = { x: 4, z: -27, r: 8 };         // Crystal Isle (hexagon)
export const I2_WALK = I2.r - 1.5;
export const I3 = { x: -21, z: 15, r: 9 };        // Winter Wonderland (round)
export const I3_WALK = I3.r - 1.3;
export const I4 = { x: 20, z: 12, r: 8.5 };       // Candy & Dessert island (round)
export const I4_WALK = I4.r - 1.3;
export const I5 = { x: 2, z: 24, r: 8.5 };        // Firefly meadow (round, night)
export const I5_WALK = I5.r - 1.3;

// islands you can walk on: centre + walkable radius
const ISLANDS = [{ x: 0, z: 0, w: ISLAND_R - 0.9 }, { x: I2.x, z: I2.z, w: I2_WALK }, { x: I3.x, z: I3.z, w: I3_WALK }, { x: I4.x, z: I4.z, w: I4_WALK }, { x: I5.x, z: I5.z, w: I5_WALK }];
const onIsland = (x, z) => ISLANDS.some(i => Math.hypot(x - i.x, z - i.z) < i.w);

// bridges: start at `o`, run along (ux,uz); deck from distance a to b
function makeBridge(o, oWalk, to, toWalk) {
  const dx = to.x - o.x, dz = to.z - o.z, L = Math.hypot(dx, dz);
  return { ox: o.x, oz: o.z, L, ux: dx / L, uz: dz / L, a: oWalk, b: L - toWalk, half: 1.05 };
}
export const BR = makeBridge({ x: 0, z: 0 }, ISLAND_R - 0.9, I2, I2_WALK);    // home → Crystal Isle
export const BR3 = makeBridge({ x: 0, z: 0 }, ISLAND_R - 0.9, I3, I3_WALK);   // home → Winter Wonderland
export const BR4 = makeBridge({ x: 0, z: 0 }, ISLAND_R - 0.9, I4, I4_WALK);   // home → Candy island
export const BR5 = makeBridge({ x: 0, z: 0 }, ISLAND_R - 0.9, I5, I5_WALK);   // home → Firefly meadow
export const BRIDGES = [BR, BR3, BR4, BR5];

/** distance along a bridge deck, or null when not on it */
export function bridgeS(br, x, z) {
  const px = x - br.ox, pz = z - br.oz;
  const s = px * br.ux + pz * br.uz, w = -px * br.uz + pz * br.ux;
  return (s > br.a - 0.5 && s < br.b + 0.5 && Math.abs(w) < br.half) ? s : null;
}
export const archY = (br, s) => Math.sin(Math.PI * Math.min(1, Math.max(0, (s - br.a) / (br.b - br.a)))) * 0.45;

export const walkable = (x, z) => onIsland(x, z) || BRIDGES.some(b => bridgeS(b, x, z) !== null);
export function groundY(x, z) {
  if (onIsland(x, z)) return 0;
  for (const b of BRIDGES) { const s = bridgeS(b, x, z); if (s !== null) return archY(b, s); }
  return 0;
}

// Round things the avatar bumps into: { x, z, r }
export const obstacles = [];

// Spots on the home island to keep free of trees (start point, paths to bridges; monuments add theirs)
export const reserved = [{ x: 0, z: 0 }];
for (const b of BRIDGES) for (let r = 3; r < ISLAND_R; r += 1.5) reserved.push({ x: b.ux * r, z: b.uz * r });
