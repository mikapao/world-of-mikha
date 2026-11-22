// Baseline: scripts/voice-lines.mjs. Runs the real script in Node (local files only, no network).
// Output goes to a temp folder; no committed file is touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences, keyOf, fileOf } from "../src/voiceKey.js";
import { FIXED_LINES } from "../src/voiceLines.js";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "scripts", "voice-lines.mjs");
const outDir = mkdtempSync(join(tmpdir(), "wom-voice-"));
const outFile = join(outDir, "voice-lines.json");

let stdout = "";
let exitOk = false;
try {
  stdout = execFileSync(process.execPath, [script, outFile], { encoding: "utf8" });
  exitOk = true;
} catch (e) {
  stdout = String(e.stdout || "") + String(e.stderr || "");
}
const lines = exitOk ? JSON.parse(readFileSync(outFile, "utf8")) : [];
const keys = new Set(lines.map(l => l.key));

test("voice-lines.mjs runs and exits 0", () => {
  assert.equal(exitOk, true, `script failed: ${stdout}`);
  assert.match(stdout, /\d+ voice lines/);
});

test("voice-lines.json entries have key, text and a file name from fileOf()", () => {
  assert.ok(lines.length > 0);
  for (const l of lines) {
    assert.equal(typeof l.key, "string");
    assert.equal(typeof l.text, "string");
    assert.equal(l.file, fileOf(l.key));
    assert.equal(keyOf(l.text), l.key);
  }
  assert.equal(new Set(lines.map(l => l.key)).size, lines.length, "keys are unique");
});

test("every FIXED_LINES sentence is collected", () => {
  assert.ok(FIXED_LINES.length > 0);
  for (const line of FIXED_LINES) {
    for (const s of splitSentences(line)) {
      assert.ok(keys.has(keyOf(s)), `missing fixed sentence: "${s}"`);
    }
  }
});

test("every Singing Stone word becomes a 'Say: <phrase>' line", () => {
  const { words } = JSON.parse(readFileSync(join(here, "..", "public", "content", "speaking.json"), "utf8"));
  assert.equal(words.length, 25);
  for (const w of words) {
    assert.ok(keys.has(keyOf(`Say: ${w.say}`)), `missing speaking line for "${w.say}"`);
  }
});

test("avatar names become 'Hello, <name>!' lines", () => {
  for (const name of ["Kittyping", "Blibli", "Kuromi"]) {
    assert.ok(keys.has(keyOf(`Hello, ${name}!`)), `missing Hello, ${name}`);
  }
});

test("Giant Lollipop words produce Find the / That's the / word lines", () => {
  const { words } = JSON.parse(readFileSync(join(here, "..", "public", "content", "vocab.json"), "utf8"));
  for (const w of words) {
    assert.ok(keys.has(keyOf(`Find the ${w.word}!`)), `Find the ${w.word}`);
    assert.ok(keys.has(keyOf(`That's the ${w.word}!`)), `That's the ${w.word}`);
  }
});

test("cleanup temp output", () => {
  rmSync(outDir, { recursive: true, force: true });
});
