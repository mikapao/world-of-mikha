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
  assert.equal(index.version, 7, "version 7 (T03: Singing Stone phrases; bump when any content file changes)");
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

// T03 (design D3): Singing Stone items are 3-4 word phrases. Rules, not a snapshot table.
const wordsOf = say => say.trim().split(/\s+/);

test("speaking.json (T03): ids are exactly s1..s25 in order", () => {
  const { words } = load("speaking.json");
  assert.deepEqual(words.map(w => w.id), Array.from({ length: 25 }, (_, i) => `s${i + 1}`));
});

test("speaking.json (T03): every say has 3 or 4 words", () => {
  const { words } = load("speaking.json");
  for (const w of words) {
    const n = wordsOf(w.say).length;
    assert.ok(n === 3 || n === 4, `${w.id} "${w.say}" has ${n} words`);
  }
});

test("speaking.json (T03): at least 10 of the 25 phrases have 4 words", () => {
  const { words } = load("speaking.json");
  const fours = words.filter(w => wordsOf(w.say).length === 4).length;
  assert.ok(fours >= 10, `${fours} four-word phrases`);
});

test("speaking.json (T03): no . ! ? , in any say", () => {
  const { words } = load("speaking.json");
  for (const w of words) assert.doesNotMatch(w.say, /[.!?,]/, `${w.id} "${w.say}"`);
});

test("speaking.json (T03): lower-case everywhere except the word 'I'", () => {
  const { words } = load("speaking.json");
  for (const w of words) {
    for (const word of wordsOf(w.say)) {
      if (word === "I") continue;
      assert.equal(word, word.toLowerCase(), `${w.id} "${w.say}": "${word}" must be lower-case`);
    }
  }
});

test("speaking.json (T03): exactly one emoji per item, Unicode 11 or older", () => {
  const { words } = load("speaking.json");
  for (const w of words) {
    // Drop variation selector U+FE0F (used by e.g. heart and sun); what is left must be ONE code point.
    const cps = Array.from(w.emoji.replace(/️/g, ""));
    assert.equal(cps.length, 1, `${w.id} emoji "${w.emoji}" must be one emoji`);
    const cp = cps[0].codePointAt(0);
    assert.ok(cp <= 0x1faff, `${w.id} U+${cp.toString(16).toUpperCase()} is above the emoji block limit`);
    assert.ok(!(cp >= 0x1f971 && cp <= 0x1f97f), `${w.id} U+${cp.toString(16).toUpperCase()} is a Unicode 12+ face`);
    assert.ok(cp < 0x1fa70, `${w.id} U+${cp.toString(16).toUpperCase()} is Unicode 12+ (symbols/pictographs extended-A)`);
  }
});

test("speaking.json (T03): wordsPerVisit is 10 and the pool has 25 items", () => {
  const data = load("speaking.json");
  assert.equal(data.wordsPerVisit, 10);
  assert.equal(data.words.length, 25);
});

test("math.json, memory.json, vocab.json, focus.json: parse and have their pool keys", () => {
  assert.ok(Array.isArray(load("math.json").questions), "math questions array");
  assert.ok(Array.isArray(load("memory.json").questions), "memory questions array");
  assert.ok(Array.isArray(load("vocab.json").words), "vocab words array");
  assert.equal(load("vocab.json").words.length, 25, "vocab pool size (baseline)");
  assert.ok(load("focus.json").rounds, "focus rounds present");
});
