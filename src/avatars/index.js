// The avatars Mikha can pick. To add one: make a build function like buildKitty() and list it here.
import { buildKitty } from "./kitty.js";
import { buildBlibli } from "./blibli.js";

export const AVATARS = [
  { id: "kitty",  name: "Kitty",  build: buildKitty },
  { id: "blibli", name: "Blibli", build: buildBlibli }
];
