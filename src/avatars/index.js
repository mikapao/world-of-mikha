// The avatars Mikha can pick.
// Built in code: buildKitty(), buildBlibli().  From a .glb file in public/avatars/: glbAvatar("./avatars/name.glb").
// A .glb avatar needs animations named "Idle" and "Walk", front facing +Z, about 2.3 units tall.
import { buildKitty } from "./kitty.js";
import { buildBlibli } from "./blibli.js";
import { glbAvatar } from "./glbAvatar.js";

export const AVATARS = [
  { id: "kitty",  name: "Kittyping",  build: buildKitty },
  { id: "blibli", name: "Blibli", build: buildBlibli },
  { id: "ponchi", name: "Kuromi", build: glbAvatar("./avatars/ponchi.glb") }
];
