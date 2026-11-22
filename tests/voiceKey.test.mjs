// Baseline: src/voiceKey.js (sentence split, lookup key, clip file name).
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences, keyOf, fileOf } from "../src/voiceKey.js";

// Independent FNV-1a 32-bit (BigInt) to cross-check fileOf() without reusing its code.
function fnv1aRef(str) {
  let h = 0x811c9dc5n;
  for (const ch of str) {
    h ^= BigInt(ch.charCodeAt(0));
    h = (h * 0x01000193n) & 0xffffffffn;
  }
  return h.toString(16).padStart(8, "0") + ".mp3";
}

test("splitSentences: a single 'Say:' phrase stays one sentence", () => {
  assert.deepEqual(splitSentences("Say: apple"), ["Say: apple"]);
});

test("splitSentences: a 3-4 word phrase stays one sentence", () => {
  assert.deepEqual(splitSentences("Say: I love you"), ["Say: I love you"]);
  assert.deepEqual(splitSentences("Say: one two three"), ["Say: one two three"]);
  assert.deepEqual(splitSentences("Say: big red ball"), ["Say: big red ball"]);
});

test("splitSentences: a phrase ending with a full stop keeps the stop", () => {
  assert.deepEqual(splitSentences("Say: I am happy."), ["Say: I am happy."]);
});

test("splitSentences: splits on ! and ? into separate clips", () => {
  assert.deepEqual(
    splitSentences("That's the donut! Find the cupcake!"),
    ["That's the donut!", "Find the cupcake!"]
  );
  assert.deepEqual(splitSentences("Are you ready? Let's go!"), ["Are you ready?", "Let's go!"]);
});

test("splitSentences: a phrase with a mid-text full stop splits (documents current behaviour)", () => {
  // Known limitation noted in the feature map: a '.' inside a phrase makes two clips.
  assert.deepEqual(splitSentences("Say: I am. happy"), ["Say: I am.", "happy"]);
});

test("splitSentences: empty and punctuation-only input gives no sentences", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("!!! ..."), []);
});

test("keyOf: lower-cases, strips punctuation, collapses spaces", () => {
  assert.equal(keyOf("Say: I love you!"), "say i love you");
  assert.equal(keyOf("  Say:   apple  "), "say apple");
  assert.equal(keyOf("Hello, Kittyping!"), "hello kittyping");
});

test("keyOf: keeps apostrophes and turns curly apostrophes into straight ones", () => {
  assert.equal(keyOf("That’s the cat"), "that's the cat");
  assert.equal(keyOf("Let's breathe"), "let's breathe");
});

test("keyOf: a phrase and its punctuated form give the same key", () => {
  assert.equal(keyOf("Say: I am happy."), keyOf("Say: I am happy"));
});

test("fileOf: 8 lower-case hex digits plus .mp3", () => {
  assert.match(fileOf("say i love you"), /^[0-9a-f]{8}\.mp3$/);
});

test("fileOf: matches an independent FNV-1a reference for sample keys", () => {
  for (const key of ["say apple", "say i love you", "say one two three", "say big red ball", "hello mikha", ""]) {
    assert.equal(fileOf(key), fnv1aRef(key), `key "${key}"`);
  }
});

test("fileOf: pinned literal values for sample keys (baseline)", () => {
  // Literal names recorded from the current code. The cloud voice step writes these names and the app reads them.
  assert.equal(fileOf("say apple"), "d49d3720.mp3");
  assert.equal(fileOf("say i love you"), "c33375ae.mp3");
  assert.equal(fileOf("say one two three"), "f6609cd2.mp3");
  assert.equal(fileOf("say big red ball"), "2eadb1ce.mp3");
  assert.equal(fileOf("say i am happy"), "75441d11.mp3");
  assert.equal(fileOf("hello mikha"), "c1ec5c9f.mp3");
  assert.equal(fileOf(""), "811c9dc5.mp3"); // empty key = FNV offset basis
});

test("fileOf: different phrases give different file names", () => {
  assert.notEqual(fileOf("say i love you"), fileOf("say i am happy"));
});

// T03 (design D3): every Singing Stone "Say: <phrase>" line must stay ONE sentence (one clip).
test("splitSentences (T03): each 'Say: <phrase>' from speaking.json stays one sentence", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { join, dirname } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const { words } = JSON.parse(readFileSync(join(here, "..", "public", "content", "speaking.json"), "utf8"));
  assert.equal(words.length, 25);
  for (const w of words) {
    const line = `Say: ${w.say}`;
    assert.deepEqual(splitSentences(line), [line], `${w.id} "${line}"`);
  }
});
