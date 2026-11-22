// T04 tests: voice sample workflow (scripts/voice_samples.py + .github/workflows/voice-samples.yml).
// Kokoro and GitHub Actions cannot run here, so these tests check the files statically:
//  - the Python script compiles and its SENTENCES / CANDIDATES lists match design D4 exactly
//  - the workflow is valid YAML (parsed with js-yaml if one can be found) and has the agreed triggers,
//    paths filter, timeout, artifact upload and no secrets
//  - make_voice.py and the two existing workflows are unchanged versus HEAD
// YAML parser lookup: uses "js-yaml" from node_modules if present, else the file named by the
// JS_YAML_PATH environment variable (absolute path to a js-yaml index.js). If neither works the YAML
// tests are skipped and reported as Not run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const abs = f => join(root, f);
const read = f => readFileSync(abs(f), "utf8").replace(/\r\n/g, "\n");

// ---- Python: compile check without writing .pyc files ----
const PY = process.env.PYTHON || "python";
function pyRun(code, args = []) {
  return execFileSync(PY, ["-I", "-c", code, ...args], { encoding: "utf8" });
}

test("voice_samples.py compiles (in-memory, no .pyc written)", () => {
  const out = pyRun(
    "import sys; src=open(sys.argv[1],'rb').read(); compile(src, sys.argv[1], 'exec'); print('OK')",
    [abs("scripts/voice_samples.py")]
  );
  assert.equal(out.trim(), "OK");
});

// Extract the SENTENCES and CANDIDATES literals from the script with the Python AST (no kokoro import).
const script = JSON.parse(pyRun(`
import ast, json, sys
tree = ast.parse(open(sys.argv[1], encoding='utf8').read())
vals = {}
for node in tree.body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in ('SENTENCES', 'CANDIDATES'):
        vals[node.targets[0].id] = ast.literal_eval(node.value)
print(json.dumps(vals))
`, [abs("scripts/voice_samples.py")]));

// Expected values copied from team/02_design.md D4.
const D4_SENTENCES = [
  ["1-welcome", "Welcome to the World of Mikha!"],
  ["2-found-it", "Wow, you found it! Great job!"],
  ["3-count", "How many apples can you count?"],
  ["4-say-cat", "Say: I see a cat"],
  ["5-brave", "Yay! You did it! You are so brave!"],
  ["6-go-back", "Let's go back to the island."],
];
const D4_CANDIDATES = [
  ["bf_emma", 0.9, "b"], ["bf_emma", 1.0, "b"], ["bf_isabella", 1.0, "b"], ["bf_alice", 1.0, "b"],
  ["bf_lily", 1.0, "b"], ["af_heart", 1.0, "a"], ["af_bella", 1.0, "a"], ["af_nicole", 1.0, "a"],
];

test("script has exactly the 6 D4 sentences, in order, with the same text", () => {
  assert.deepEqual(script.SENTENCES, D4_SENTENCES);
});

test("script has exactly the 8 D4 candidates (voice, speed, lang_code)", () => {
  assert.deepEqual(script.CANDIDATES, D4_CANDIDATES);
});

test("script builds folders <voice>-<speed> and files <n>-<slug>.mp3 for each candidate", () => {
  const src = read("scripts/voice_samples.py");
  assert.match(src, /f"\{voice\}-\{speed\}"/, "candidate folder name");
  assert.match(src, /os\.path\.join\(folder, slug \+ "\.mp3"\)/, "file name is slug.mp3 inside the folder");
  assert.match(src, /shutil\.make_archive\("voice-samples", "zip", out\)/, "zips samples to voice-samples.zip");
});

test("script uses the same ffmpeg output settings as make_voice.py (mono, 24 kHz, 48k)", () => {
  const args = '"-ac", "1", "-ar", "24000", "-b:a", "48k"';
  assert.ok(read("scripts/voice_samples.py").includes(args));
  assert.ok(read("scripts/make_voice.py").includes(args));
});

test("script has no secrets. references", () => {
  assert.ok(!/secrets\./.test(read("scripts/voice_samples.py")));
});

// ---- YAML workflow ----
function loadYaml() {
  const candidates = [];
  if (process.env.JS_YAML_PATH) candidates.push(process.env.JS_YAML_PATH);
  try {
    const req = createRequire(join(root, "package.json"));
    candidates.push(req.resolve("js-yaml"));
  } catch { /* not in node_modules */ }
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const req = createRequire(p);
    try { return req(p); } catch { /* try next */ }
  }
  return null;
}
const yaml = loadYaml();
const yamlTest = yaml ? test : test.skip;
const wfText = read(".github/workflows/voice-samples.yml");
const wf = yaml ? yaml.load(wfText) : null;
const trig = wf && (wf.on ?? wf[true]);

yamlTest("workflow parses as YAML", () => {
  assert.equal(typeof wf, "object");
  assert.ok(wf && wf.jobs && wf.jobs.samples, "job named samples exists");
});

yamlTest("workflow triggers: workflow_dispatch, and push to milestone/** limited to the two files", () => {
  assert.ok("workflow_dispatch" in trig, "workflow_dispatch present");
  assert.deepEqual(trig.push.branches, ["milestone/**"]);
  assert.deepEqual(trig.push.paths.slice().sort(),
    [".github/workflows/voice-samples.yml", "scripts/voice_samples.py"]);
  assert.equal(trig.pull_request, undefined, "no pull_request trigger");
  assert.equal(trig.schedule, undefined, "no schedule trigger");
});

yamlTest("job has timeout-minutes: 30 and runs on ubuntu-latest", () => {
  assert.equal(wf.jobs.samples["timeout-minutes"], 30);
  assert.equal(wf.jobs.samples["runs-on"], "ubuntu-latest");
});

yamlTest("steps: Python 3.11, CPU torch index, kokoro install, script run, artifact upload", () => {
  const steps = wf.jobs.samples.steps;
  const runs = steps.map(s => s.run || "").join("\n");
  const uses = steps.map(s => s.uses || "").filter(Boolean);
  assert.ok(uses.includes("actions/setup-python@v5"));
  assert.equal(steps.find(s => s.uses === "actions/setup-python@v5").with["python-version"], "3.11");
  assert.match(runs, /pip install -q torch --index-url https:\/\/download\.pytorch\.org\/whl\/cpu/);
  assert.match(runs, /pip install -q "kokoro>=0\.9" soundfile numpy/);
  assert.match(runs, /apt-get install -y -qq espeak-ng ffmpeg/);
  assert.match(runs, /python scripts\/voice_samples\.py/);
  const up = steps.find(s => s.uses === "actions/upload-artifact@v4");
  assert.ok(up, "upload-artifact@v4 step exists");
  assert.equal(up.with.path, "voice-samples.zip");
  assert.equal(up.with.name, "voice-samples");
});

test("workflow text has no secrets. references", () => {
  assert.ok(!/secrets\./.test(wfText));
});

test("workflow file is ASCII-clean YAML (no tabs)", () => {
  assert.ok(!wfText.includes("\t"));
});

// ---- unchanged files ----
test("make_voice.py and the two existing workflows are unchanged versus HEAD", () => {
  const out = execFileSync("git", [
    "-C", root, "diff", "--name-only", "HEAD", "--",
    "scripts/make_voice.py", ".github/workflows/build-apk.yml", ".github/workflows/publish-web.yml",
  ], { encoding: "utf8" });
  assert.equal(out.trim(), "", "no changes to the protected files");
});
