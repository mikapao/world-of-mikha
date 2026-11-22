# T12 test report: APK app icon (D9)

**Verdict: PASS** (11 of 11 new T12 checks pass. The full suite passes: 174 of 174 run checks, 4 skipped as before (YAML parser not installed). The one guard that failed on the new step was updated, see Failures. `npm run build` exits 0.)

Date: 2026-11-22. Branch: milestone/upgrade-1. Tester: Logic Tester (Haiku 5.5).
Task: `team/tasks/T12.md`. Design: `team/02_design.md` D9.
Files added or changed by the tester: `tests/T12-icon.test.mjs` (new), `tests/voice-samples.test.mjs` (guard updated). No application code, workflow or script was edited.

## Commands run

```
node --test --test-reporter=tap tests/                                  (before my edits: 167 run, 162 pass, 1 fail, 4 skipped)
node --test --test-reporter=tap tests/T12-icon.test.mjs tests/voice-samples.test.mjs   (after edits: 24 run, 20 pass, 0 fail, 4 skipped)
node --test --test-reporter=tap tests/T12-icon.test.mjs                 (11 run, 11 pass)
node --test --test-reporter=tap tests/                                  (final: 178 run, 174 pass, 0 fail, 4 skipped)
npm run build                                                           (exit 0, "built in 1.38s")
```

Run from `E:\Dev\world-of-mikha`. The Python used by the tests is the `python` on PATH: Python 3.9.12 with Pillow 9.1.0 (Inkscape's Python). The workflow itself uses Python 3.11 on GitHub; that was not tested here.

## How the checks run (no browser, no cloud build)

- `scripts/make_android_icons.py` is run for real with `python -I` into a fresh folder under the OS temp directory (`mkdtempSync` in `os.tmpdir()`), removed afterwards. The folder starts empty, so the script creates the `mipmap-*` folders itself.
- A Python probe (Pillow, `python -I -c`) reads the generated PNGs and the source icons and prints JSON. The Node test asserts on that JSON.
- The M colour is the pink fill (244,154,178), matched within 12 per channel. Checked by eye: the source icon `public/icons/icon-maskable-512.png` shows a pink M with a white outline; the outline is not counted.
- The workflow check reads `build-apk.yml` as text. `js-yaml` is not in `node_modules`, so the YAML-parsed checks in other files stay skipped.

## Results

### tests/T12-icon.test.mjs (11 checks)

| Check | Result |
|---|---|
| Script runs into an empty folder and prints "Android icons written to" | PASS |
| Script runs again over its own output (idempotent, exit 0) | PASS |
| Legacy `ic_launcher.png` and `ic_launcher_round.png` are 48/72/96/144/192 px for mdpi to xxxhdpi | PASS |
| Foreground `ic_launcher_foreground.png` is 108/162/216/324/432 px for mdpi to xxxhdpi | PASS |
| Round icon alpha is 0 at the four corners and at a 10% inset, 255 at the centre (all 5 densities) | PASS |
| `ic_launcher_background` colour is `#27345E` and equals the corner pixel of `public/icons/icon-512.png` (39,52,94); the maskable corner matches too | PASS |
| Foreground canvas corners are opaque background colour (all 5 densities) | PASS |
| `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` exist and reference `@color/ic_launcher_background` and `@mipmap/ic_launcher_foreground` | PASS |
| Foreground: every pink M pixel lies inside the central 66/108 zone, and there are some (all 5 densities) | PASS |
| Foreground: M pixel count is the source M count scaled by (side/512)^2, within +/-20% (all 5 densities) | PASS |
| Workflow: "Make the app icon" is one step, directly after "Create the Android project", before "Build APK", not `continue-on-error`, and runs `pip install -q pillow` and the script with `android/app/src/main/res` | PASS |

Measured values (from the probe, for reference): M pixels at mdpi 433 (bbox x 40-68, y 32-60, zone 21-87); at xxxhdpi 7,653 (bbox x 159-272, y 128-241, zone 84-348). Both sit well inside the zone. Source M: 16,343 pixels in the 512 icon.

### tests/voice-samples.test.mjs (guard, 1 check updated)

| Check | Before | After |
|---|---|---|
| make_voice.py and the two existing workflows differ from HEAD only in the D7 voice settings | FAIL (the new D9 step lines) | PASS |

The check now also accepts the four D9 lines in `build-apk.yml`, only when the whole step appears exactly once. Any other stray line still fails.

### Whole suite

| Run | Run | Pass | Fail | Skipped |
|---|---|---|---|---|
| Before my edits | 167 | 162 | 1 | 4 |
| After my edits | 178 | 174 | 0 | 4 |

The 4 skipped checks are the YAML-parsed checks in `voice-samples.test.mjs` (no `js-yaml` installed). They were skipped in earlier reports too.

## Failures

**Before my edits, one failure, now fixed (the guard, not the app):**
- Test: `tests/voice-samples.test.mjs`, "make_voice.py and the two existing workflows differ from HEAD only in the D7 voice settings".
- What I did: read the diff against HEAD. The only stray lines were the four lines of the D9 step in `.github/workflows/build-apk.yml` (`+      - name: Make the app icon`, `+        run: |`, `+          pip install -q pillow`, `+          python scripts/make_android_icons.py android/app/src/main/res`). The guard was written before T12 and did not allow them.
- Expected: the guard to allow exactly the D9 step and nothing else.
- Happened: the guard failed on those four lines.
- Fix: the guard now excuses those four lines only when the whole step appears once, and only in `build-apk.yml`. Everything else is still guarded.

No other failures. No application code was changed.

## Not run

- **Python 3.11 and the GitHub runner.** Tests ran on the local Python 3.9.12 with Pillow 9.1.0. The workflow's Python 3.11 and `pip install pillow` (latest) were not run.
- **The real cloud APK build and Gradle.** The `android/` folder is not generated locally, so the icon files were not placed into a real Android project and the APK was not built. The check is on the script output and the workflow text only.
- **Adaptive icon rendering on a device.** Whether Android crops the round and adaptive masks as intended cannot be checked here.
- **YAML parsing of `build-apk.yml`.** The step-order check reads the file as text (no `js-yaml` in `node_modules`). A YAML parse was not done.
- **Negative control for the zone check.** The "every M pixel inside 66/108" check was not shown to fail on a deliberately bad zone. The M is well inside the zone by a wide margin (see measured values), so the check is not sensitive to small changes in zone size.

## For the user's browser checklist

- Install the APK from the next cloud build on the tablet. Check the launcher icon is the pink "M" on the dark blue background, not Capacitor's default.
- Check the icon is not clipped in the round or squircle shape your launcher uses (adaptive icon).
- Check the app name and icon look right in the app drawer and on the Home screen.

## Commander review (2026-11-22): PASS
- Viewed the xxxhdpi samples. Legacy and round match the web "M" icon, and the round one is cleanly circular. In the adaptive foreground, the icon square (82.5/108) covers the 72/108 visible viewport, so its edge is hidden in normal display. The owner should check launcher motion effects on the tablet.
- Workflow diff: exactly one new step. Suite: 174 pass, 0 fail.
**T12 accepted.**
