// Baseline: public/content/*.json (parse, index version, speaking pool shape and word counts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(here, "..", "public", "content");
const load = name => JSON.parse(readFileSync(join(CONTENT, name), "utf8"));

const files = readdirSync(CONTENT).filter(f => f.endsWith(".json"));

test("every content JSON file parses", () => {
  assert.ok(files.length >= 6, `found ${files.length} files`);
  for (const f of files) {
    assert.doesNotThrow(() => load(f), `${f} should parse`);
  }
});

test("index.json has a numeric version and lists existing files", () => {
  const index = load("index.json");
  assert.equal(typeof index.version, "number");
  assert.equal(Number.isInteger(index.version), true);
  assert.equal(index.version, 6, "baseline version (bump when any content file changes)");
  for (const [monument, file] of Object.entries(index.monuments)) {
    assert.ok(files.includes(file), `${monument} -> ${file} exists`);
  }
});

test("speaking.json: wordsPerVisit is 10", () => {
  assert.equal(load("speaking.json").wordsPerVisit, 10);
});

test("speaking.json: 25 items, unique ids, non-empty say and emoji", () => {
  const { words } = load("speaking.json");
  assert.equal(words.length, 25);
  const ids = new Set(words.map(w => w.id));
  assert.equal(ids.size, 25, "ids are unique");
  for (const w of words) {
    assert.equal(typeof w.id, "string");
    assert.ok(w.say && typeof w.say === "string", `${w.id} has say`);
    assert.ok(w.emoji && typeof w.emoji === "string", `${w.id} has emoji`);
  }
});

test("speaking.json: no phrase has leading/trailing spaces or sentence punctuation (baseline)", () => {
  const { words } = load("speaking.json");
  for (const w of words) {
    assert.equal(w.say, w.say.trim(), `${w.id} trimmed`);
    assert.doesNotMatch(w.say, /[.!?]/, `${w.id} has no . ! ?`);
  }
});

// BASELINE, expected to change in upgrade-1: the brief makes every Singing Stone item a 3-4 word phrase.
// Recorded on 2026-11-22 from the current file. Update this table when the phrases change.
test("speaking.json: word count per item (baseline, expected to change in upgrade-1)", () => {
  const expected = {
    s1: ["apple", 1], s2: ["banana", 1], s3: ["cat", 1], s4: ["dog", 1], s5: ["fish", 1],
    s6: ["bird", 1], s7: ["flower", 1], s8: ["hello", 1], s9: ["goodbye", 1], s10: ["thank you", 2],
    s11: ["please", 1], s12: ["good morning", 2], s13: ["good night", 2], s14: ["I love you", 3],
    s15: ["big red ball", 3], s16: ["little star", 2], s17: ["happy cat", 2], s18: ["blue sky", 2],
    s19: ["yellow sun", 2], s20: ["one two three", 3], s21: ["rainbow", 1], s22: ["ice cream", 2],
    s23: ["teddy bear", 2], s24: ["butterfly", 1], s25: ["I am happy", 3],
  };
  const { words } = load("speaking.json");
  for (const w of words) {
    const [say, count] = expected[w.id];
    assert.equal(w.say, say, `${w.id} phrase`);
    assert.equal(w.say.split(/\s+/).length, count, `${w.id} word count`);
  }
  const tally = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const w of words) tally[w.say.split(/\s+/).length]++;
  assert.deepEqual(tally, { 1: 12, 2: 9, 3: 4, 4: 0 }, "baseline tally: 12 one-word, 9 two-word, 4 three-word, 0 four-word");
});

test("math.json, memory.json, vocab.json, focus.json: parse and have their pool keys", () => {
  assert.ok(Array.isArray(load("math.json").questions), "math questions array");
  assert.ok(Array.isArray(load("memory.json").questions), "memory questions array");
  assert.ok(Array.isArray(load("vocab.json").words), "vocab words array");
  assert.equal(load("vocab.json").words.length, 25, "vocab pool size (baseline)");
  assert.ok(load("focus.json").rounds, "focus rounds present");
});
