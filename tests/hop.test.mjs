// T02 tests: double-tap hop.
// src/controls.js and src/player.js cannot be imported in Node (they touch the DOM and create a WebGL
// renderer at import time). These tests therefore read the real source text, cut out the function under
// test, and run that exact text with stubbed globals. src/sound.js has no import-time DOM access, so
// hopSound() is imported directly (with a stub document) and given a fake AudioContext.
// If a function is renamed the extraction throws and the test fails loudly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// sound.js registers a document listener at import time (one line at the bottom). Stub it so the module loads in Node.
globalThis.document = { addEventListener() {} };
const { hopSound } = await import("../src/sound.js");

const here = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(here, "..", "src", f), "utf8").replace(/\r\n/g, "\n");

// ---- 1. double-tap detector (controls.js: lastPress + registerPress) ----
function extractDetector() {
  const text = src("controls.js");
  const start = text.indexOf("let lastPress = null;");
  assert.ok(start >= 0, "controls.js: 'let lastPress = null;' not found");
  const fnStart = text.indexOf("function registerPress(e) {", start);
  assert.ok(fnStart >= 0, "controls.js: registerPress not found");
  const fnEnd = text.indexOf("\n}\n", fnStart);
  assert.ok(fnEnd > fnStart, "controls.js: end of registerPress not found");
  return text.slice(start, fnEnd + 3);
}
const detectorCode = extractDetector();

// Each call builds a fresh copy, so lastPress does not leak between tests.
// press(timeMs, x, y) sets the fake clock and registers a pointer press. state.hops counts hop() calls.
function freshDetector() {
  const state = { now: 0, hops: 0 };
  const registerPress = new Function("hop", "performance", detectorCode + "\nreturn registerPress;")(
    () => { state.hops++; },
    { now: () => state.now }
  );
  const press = (t, x = 100, y = 100) => { state.now = t; registerPress({ clientX: x, clientY: y }); };
  return { press, state };
}

test("hop: two presses 100 ms apart on the same spot give one hop", () => {
  const d = freshDetector();
  d.press(0); d.press(100);
  assert.equal(d.state.hops, 1);
});

test("hop: two presses 299 ms apart and 39 px apart give one hop", () => {
  const d = freshDetector();
  d.press(0, 0, 0); d.press(299, 39, 0);
  assert.equal(d.state.hops, 1);
});

test("hop: two presses exactly 300 ms apart give no hop (limit is < 300 ms)", () => {
  const d = freshDetector();
  d.press(0); d.press(300);
  assert.equal(d.state.hops, 0);
});

test("hop: two presses exactly 40 px apart give no hop (limit is < 40 px)", () => {
  const d = freshDetector();
  d.press(0, 0, 0); d.press(100, 40, 0);
  assert.equal(d.state.hops, 0);
});

test("hop: distance is Euclidean (28,28 = 39.6 px hops; 30,30 = 42.4 px does not)", () => {
  const near = freshDetector();
  near.press(0, 0, 0); near.press(100, 28, 28);
  assert.equal(near.state.hops, 1, "39.6 px should hop");
  const far = freshDetector();
  far.press(0, 0, 0); far.press(100, 30, 30);
  assert.equal(far.state.hops, 0, "42.4 px should not hop");
});

test("hop: a single tap gives no hop", () => {
  const d = freshDetector();
  d.press(0);
  assert.equal(d.state.hops, 0);
});

test("hop: a triple tap (3 taps within 300 ms, same spot) gives exactly one hop", () => {
  const d = freshDetector();
  d.press(0); d.press(100); d.press(200);
  assert.equal(d.state.hops, 1);
});

test("hop: after a hop the record is cleared, so 4 quick taps give two hops (two pairs)", () => {
  const d = freshDetector();
  d.press(0); d.press(100); d.press(200); d.press(300);
  assert.equal(d.state.hops, 2);
});

test("hop: a slow 2nd tap (400 ms) gives no hop, but starts a new pair with the 3rd tap", () => {
  const d = freshDetector();
  d.press(0); d.press(400);
  assert.equal(d.state.hops, 0);
  d.press(500);
  assert.equal(d.state.hops, 1);
});

// ---- 2. hop() in player.js and hopSound() in sound.js ----
function extractHop() {
  const text = src("player.js");
  const m = text.match(/export function hop\(\) \{[\s\S]*?\n\}/);
  assert.ok(m, "player.js: export function hop() not found");
  return m[0].replace("export function hop", "function hop");
}

test("player hop(): starts a hop and plays the sound once; ignored while a hop is running", () => {
  let soundCalls = 0;
  const api = new Function("hopSound",
    "let hopT = 0;\n" + extractHop() + "\nreturn { hop, get: () => hopT, set: v => { hopT = v; } };"
  )(() => { soundCalls++; });
  api.hop();
  assert.equal(soundCalls, 1, "first hop plays the sound");
  assert.equal(api.get(), 1, "hopT set to 1");
  api.hop();
  assert.equal(soundCalls, 1, "hop during a running hop: no second sound");
  assert.equal(api.get(), 1, "hop during a running hop: hopT not restarted");
  api.set(0);
  api.hop();
  assert.equal(soundCalls, 2, "after the hop has finished, a new hop plays again");
});

// Fake Web Audio context that records what hopSound() schedules.
function makeFakeAudio(log) {
  const param = name => ({
    setValueAtTime: (v, t) => log.push([name, "set", v, t]),
    linearRampToValueAtTime: (v, t) => log.push([name, "lin", v, t]),
    exponentialRampToValueAtTime: (v, t) => log.push([name, "exp", v, t]),
  });
  class FakeCtx {
    constructor() { this.currentTime = 5; this.state = "running"; this.destination = { name: "dest" }; }
    createOscillator() {
      log.push(["osc"]);
      return { type: "", frequency: param("freq"), connect: x => x,
        start: t => log.push(["start", t]), stop: t => log.push(["stop", t]) };
    }
    createGain() {
      log.push(["gainNode"]);
      return { gain: param("gain"), connect: x => x };
    }
  }
  return FakeCtx;
}

test("hopSound(): with no AudioContext (plain Node) it returns without throwing", () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.doesNotThrow(() => hopSound());
});

test("hopSound(): one soft sine blip, <= 0.25 s, peak gain <= 0.07, rising 330 -> 700 Hz", () => {
  const log = [];
  globalThis.window = { AudioContext: makeFakeAudio(log) };
  try {
    hopSound();
  } finally {
    delete globalThis.window;
  }
  assert.equal(log.filter(e => e[0] === "osc").length, 1, "exactly one oscillator");
  assert.equal(log.filter(e => e[0] === "gainNode").length, 1, "exactly one gain node");
  const freq = log.filter(e => e[0] === "freq");
  assert.deepEqual(freq[0], ["freq", "set", 330, 5], "starts at 330 Hz at ctx time");
  assert.deepEqual(freq[1], ["freq", "exp", 700, 5.14], "rises to 700 Hz over 0.14 s");
  const peak = Math.max(...log.filter(e => e[0] === "gain" && e[1] === "lin").map(e => e[2]));
  assert.ok(peak > 0 && peak <= 0.07, `peak gain ${peak} must be > 0 and <= 0.07`);
  const start = log.find(e => e[0] === "start");
  const stop = log.find(e => e[0] === "stop");
  assert.ok(start && stop, "oscillator started and stopped");
  const dur = stop[1] - start[1];
  assert.ok(Math.abs(dur - 0.22) < 1e-9, `duration ${dur} should be 0.22 s`);
  assert.ok(dur <= 0.25, "duration <= 0.25 s");
});
