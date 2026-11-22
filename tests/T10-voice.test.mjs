// T10 checks: voice settings in the workflows and make_voice.py, and that every line the code
// speaks has a recorded clip (scripts/voice-lines.mjs output). Read-only: no app files touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences, keyOf } from "../src/voiceKey.js";
import { FIXED_LINES } from "../src/voiceLines.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = rel => readFileSync(join(root, rel), "utf8");
const PY = process.env.PYTHON || "python";
const workflows = [".github/workflows/build-apk.yml", ".github/workflows/publish-web.yml"];

// ---------- 1. workflows ----------
test("T10 workflows: VOICE and VOICE_SPEED are job-level env (bf_alice, 0.9)", () => {
  for (const wf of workflows) {
    const src = text(wf);
    const jobEnv = src.match(/^    env:\n((?:      .*\n)+)/m);
    assert.ok(jobEnv, `${wf}: no job-level env block`);
    assert.match(jobEnv[1], /^      VOICE: bf_alice$/m, `${wf}: VOICE`);
    assert.match(jobEnv[1], /^      VOICE_SPEED: "0\.9"$/m, `${wf}: VOICE_SPEED`);
    assert.doesNotMatch(src, /bf_emma/, `${wf}: old voice still present`);
    assert.doesNotMatch(src, /Emma/, `${wf}: step name still says Emma`);
  }
});

test("T10 workflows: cache key and restore-keys use voice-v2-, no voice-v1- left", () => {
  for (const wf of workflows) {
    const src = text(wf);
    assert.match(src, /key: voice-v2-\$\{\{ hashFiles\(/, `${wf}: cache key`);
    assert.match(src, /restore-keys: voice-v2-\s*$/m, `${wf}: restore-keys`);
    assert.doesNotMatch(src, /voice-v1-/, `${wf}: voice-v1- still present`);
  }
});

// ---------- 2. make_voice.py ----------
test("T10 make_voice.py compiles (py_compile to a temp file)", () => {
  const dir = mkdtempSync(join(tmpdir(), "wom-t10-"));
  try {
    execFileSync(PY, ["-c",
      "import py_compile,sys; py_compile.compile(sys.argv[1], cfile=sys.argv[2], doraise=True)",
      join(root, "scripts", "make_voice.py"), join(dir, "make_voice.pyc")], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("T10 make_voice.py lang_code is taken from the voice prefix (a -> a, b -> b)", () => {
  const code = [
    "import sys",
    "src = open(sys.argv[1], encoding='utf-8').read()",
    "line = [l for l in src.splitlines() if l.startswith('lang = ')][0]",
    "out = []",
    "for v in ['bf_alice', 'bf_emma', 'af_heart', 'am_adam', 'bm_george', 'ef_dora', 'a', '']:",
    "    ns = {'voice': v}",
    "    exec(line, ns)",
    "    out.append(v + '=' + ns['lang'])",
    "print('|'.join(out))",
  ].join("\n");
  const got = execFileSync(PY, ["-c", code, join(root, "scripts", "make_voice.py")], { encoding: "utf8" }).trim();
  assert.equal(got, "bf_alice=b|bf_emma=b|af_heart=a|am_adam=a|bm_george=b|ef_dora=b|a=a|=b");
});

test("T10 make_voice.py: stamp contains kokoro, defaults are bf_alice and 0.9", () => {
  const src = text("scripts/make_voice.py");
  assert.match(src, /setting = f"kokoro \{voice\} \{speed\}"/);
  assert.match(src, /os\.environ\.get\("VOICE", "bf_alice"\)/);
  assert.match(src, /os\.environ\.get\("VOICE_SPEED", "0\.9"\)/);
});

// ---------- 3. speech coverage ----------
// Run the real collector once, as the baseline test does.
const outDir = mkdtempSync(join(tmpdir(), "wom-t10v-"));
const outFile = join(outDir, "voice-lines.json");
execFileSync(process.execPath, [join(root, "scripts", "voice-lines.mjs"), outFile], { encoding: "utf8" });
const collected = JSON.parse(readFileSync(outFile, "utf8"));
const keys = new Set(collected.map(l => l.key));
rmSync(outDir, { recursive: true, force: true });

function srcFiles(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return srcFiles(p);
    return p.endsWith(".js") ? [p] : [];
  });
}
const relOf = p => p.slice(root.length + 1).replace(/\\/g, "/");
const unesc = s => s.replace(/\\(.)/g, "$1");

// literal strings the code speaks: speak("…"), say("…"), say = "…", and the second item of cheer pairs
const spokenLiterals = [];
for (const file of srcFiles(join(root, "src"))) {
  const rel = relOf(file);
  if (rel === "src/speech.js" || rel === "src/voiceLines.js") continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/\b(?:speak|say)\(\s*"((?:[^"\\]|\\.)*)"/g)) spokenLiterals.push({ rel, s: unesc(m[1]) });
  for (const m of src.matchAll(/\bsay = "((?:[^"\\]|\\.)*)"/g)) spokenLiterals.push({ rel, s: unesc(m[1]) });
  for (const line of src.split("\n").filter(l => /cheers? = \[|const cheer = /.test(l)))
    for (const m of line.matchAll(/\["[^"]*", "((?:[^"\\]|\\.)*)"\]/g)) spokenLiterals.push({ rel, s: unesc(m[1]) });
}

test("T10 every literal the code speaks is in FIXED_LINES (sentence by sentence)", () => {
  const fixedKeys = new Set(FIXED_LINES.flatMap(l => splitSentences(l)).map(keyOf));
  assert.ok(spokenLiterals.length >= 20, `only ${spokenLiterals.length} literals found`);
  const missing = [];
  for (const { rel, s } of spokenLiterals) for (const sent of splitSentences(s))
    if (!fixedKeys.has(keyOf(sent))) missing.push(`${rel}: "${sent}"`);
  assert.deepEqual(missing, [], "spoken lines with no entry in FIXED_LINES");
});

test("T10 every FIXED_LINES sentence has a collected clip", () => {
  for (const line of FIXED_LINES) for (const s of splitSentences(line))
    assert.ok(keys.has(keyOf(s)), `not collected: "${s}"`);
});

test("T10 dynamic speech: 'Yes! <word>!' from lollipop.js has a clip for 'Yes!'", () => {
  assert.ok(keys.has(keyOf("Yes!")), `no clip for "Yes!" (lollipop.js line 95 says it with the word)`);
});

test("T10 dynamic speech: 'That's the <word>!' and '<word>!' covered for every vocab word", () => {
  const { words } = JSON.parse(readFileSync(join(root, "public", "content", "vocab.json"), "utf8"));
  for (const w of words) {
    assert.ok(keys.has(keyOf(`That's the ${w.word}!`)), `That's the ${w.word}!`);
    assert.ok(keys.has(keyOf(`${w.word}!`)), `${w.word}!`);
  }
});

test("T10 the nine 'after' wordings from the task table are in FIXED_LINES", () => {
  const after = [
    "Yes, well done!", "You got it, clever you!", "Lovely! Can you say it a little louder?",
    "I couldn't hear you. Let's try again together.", "Whoosh! Soft snow is falling.",
    "Brilliant, well done!", "Try another one, you can do it.", "You found it, well done!",
    "Yes, that one is different!",
  ];
  for (const s of after) assert.ok(FIXED_LINES.includes(s), `missing from FIXED_LINES: "${s}"`);
});

test("T10 the old wordings are gone from FIXED_LINES", () => {
  const before = [
    "You got it!", "Nice! Can you say it a little louder?", "I couldn't hear you. Let's try again!",
    "Whoosh! Snow is falling!", "Brilliant!", "Try another one.", "You found it!",
    "Yes! That one is different!",
  ];
  for (const s of before) assert.ok(!FIXED_LINES.includes(s), `old line still present: "${s}"`);
});

// ---------- 4. wording rules on every fixed line ----------
test("T10 each sentence of each fixed line has at most one '!' and no ALL CAPS word", () => {
  const problems = [];
  for (const line of FIXED_LINES) {
    for (const piece of line.split(/(?<=[.!?])\s+/)) {
      if ((piece.match(/!/g) || []).length > 1) problems.push(`two "!": "${piece}"`);
      if (/\b[A-Z]{2,}\b/.test(piece)) problems.push(`ALL CAPS: "${piece}"`);
    }
  }
  assert.deepEqual(problems, []);
});
