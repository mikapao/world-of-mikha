# T04 test report: Voice sample workflow

**Verdict: PASS** (13 of 13 new checks pass; full suite 70 of 70 pass when the YAML parser is supplied; `npm run build` succeeds)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Design: `team/02_design.md` D4. Task: `team/tasks/T04.md`.
Test file added: `tests/voice-samples.test.mjs`. No application code, no content file, no existing workflow and no `make_voice.py` was changed.

Limits: Kokoro was not run and GitHub Actions was not run. Everything below is a static check of the files. The workflow has not run in CI yet.

## Commands run

```
python -m py_compile scripts/voice_samples.py
JS_YAML_PATH="C:/Users/Ihsandi Dwinanto/AppData/Roaming/npm/node_modules/yo/node_modules/js-yaml/index.js" node --test tests/voice-samples.test.mjs
JS_YAML_PATH="C:/Users/Ihsandi Dwinanto/AppData/Roaming/npm/node_modules/yo/node_modules/js-yaml/index.js" node --test tests/
node --test tests/
npm run build
```

Run from `E:\Dev\world-of-mikha` (Node v26.13.0, Python 3.9.12 on this machine; the workflow uses 3.11, which the script's syntax does not depend on).

Note on the YAML parser: `node_modules` has no YAML parser. The only one found is `js-yaml` inside the globally installed `yo` package. I used it read-only through the `JS_YAML_PATH` variable. Nothing was installed. Without that variable, the 4 YAML tests are skipped (shown as skipped below).

Note on `py_compile`: the command above writes a `.pyc` into `scripts/__pycache__/`. That folder is already untracked. The node test checks the same thing in memory and writes nothing.

## Results

### tests/voice-samples.test.mjs

| Check | Result |
|---|---|
| `scripts/voice_samples.py` compiles (in memory) | PASS |
| `py_compile` on `scripts/voice_samples.py` (command above) | PASS (no output, exit 0) |
| SENTENCES are exactly the 6 D4 sentences, in order, same text | PASS |
| CANDIDATES are exactly the 8 D4 (voice, speed, lang_code) tuples | PASS |
| Folder `f"{voice}-{speed}"`, file `<slug>.mp3`, zip to `voice-samples.zip` | PASS |
| ffmpeg args `-ac 1 -ar 24000 -b:a 48k` match `make_voice.py` | PASS |
| Script has no `secrets.` reference | PASS |
| Workflow parses as YAML (js-yaml) | PASS |
| Triggers: `workflow_dispatch`; `push` to `milestone/**`; paths exactly the two files; no pull_request, no schedule | PASS |
| `timeout-minutes: 30`, `runs-on: ubuntu-latest` | PASS |
| Steps: setup-python@v5 with 3.11; CPU torch index URL; `kokoro>=0.9 soundfile numpy`; espeak-ng and ffmpeg; `python scripts/voice_samples.py` | PASS |
| `actions/upload-artifact@v4` with name `voice-samples`, path `voice-samples.zip` | PASS |
| Workflow text has no `secrets.` | PASS |
| Workflow has no tab characters | PASS |
| `make_voice.py`, `build-apk.yml`, `publish-web.yml` unchanged versus HEAD (`git diff --name-only HEAD`, read-only) | PASS |

Protected-file check, detail: the two existing workflows have the same apt, CPU torch and kokoro lines as the new workflow. `build-apk.yml` and `publish-web.yml` both show the same install steps. The only trigger difference is that the new workflow is limited to `milestone/**` and the two files, as D4 says.

### Full suite

| Check | Result |
|---|---|
| `node --test tests/` with `JS_YAML_PATH` set: 70 run, 70 pass, 0 fail, 0 skipped | PASS |
| `node --test tests/` without `JS_YAML_PATH`: 70 run, 66 pass, 0 fail, 4 skipped (the 4 YAML tests) | PASS (4 skipped, see Not run) |
| `npm run build` ("built in 1.33s", `dist/` written) | PASS |

Baseline tests (38) and the T01 to T03 tests are all in the 70 and all pass. No baseline test regressed.

## Failures

None. No check failed.

## Observations (not failures)

1. The script names its files `<n>-<slug>.mp3` (for example `1-welcome.mp3`). D4 says `<n>-<slug>`, so this matches.
2. The script's `shutil.make_archive` writes `voice-samples.zip` into the working directory. The workflow runs from the repo root, so the upload path `voice-samples.zip` is correct.
3. The cache key is `voice-samples-v1` and caches `~/.cache/pip` and `~/.cache/huggingface`. This matches the other workflows' approach.
4. The workflow has a `permissions: contents: read` block. The existing workflows were not compared for this.

## Not run

| Item | Reason |
|---|---|
| Actually recording the 8 voices with Kokoro | No Kokoro, no espeak-ng and no CPU torch on this machine; the task says these cannot run locally. |
| Running the `voice-samples` workflow on GitHub (`workflow_dispatch` or push) | No GitHub Actions run from here. Needs the user or a push to `milestone/**`. |
| Checking the uploaded artifact contents (8 folders x 6 mp3) | Depends on the CI run above. |
| YAML tests without a parser (4 tests) | No YAML parser in `node_modules`. They run and pass when `JS_YAML_PATH` points to a js-yaml copy. Skipped in the plain `node --test tests/` run. |

## For the user's browser checklist

Not applicable to this task (no browser UI). When the owner has the artifact:

- Download `voice-samples.zip` from the workflow run's Artifacts section and listen to each folder (`bf_emma-0.9`, `bf_emma-1.0`, `bf_isabella-1.0`, `bf_alice-1.0`, `bf_lily-1.0`, `af_heart-1.0`, `af_bella-1.0`, `af_nicole-1.0`) to pick a voice. That listening step is for the owner, not a test.

## Commander review (2026-11-22): PASS (local checks)
- Read both files. They have one KPipeline per accent, the same install steps as `publish-web.yml`, no secrets, `contents: read`, and the push trigger is limited to `milestone/**` and the two files.
- The real recording run needs the milestone branch on GitHub, which needs the owner's OK to push. The run result gets recorded here afterwards.
**T04 accepted (pending the first CI run).**

## First CI run (2026-11-22): SUCCESS
- Run 45003981347 on `milestone/upgrade-1` took about 2 min 13 s (08:41:28 to 08:43:41 UTC).
- Artifact `voice-samples` is 733,598 bytes, kept 14 days.
- Waiting for the owner to listen and pick a voice (unblocks T10).
