// T12 checks: APK app icon (team/02_design.md D9).
// The real script scripts/make_android_icons.py is run with python -I into an OS temp folder.
// Pixel checks are done by a small Python probe (Pillow) that prints JSON; assertions are in Node.
// The workflow check reads build-apk.yml as text (js-yaml is not installed in this project).
// If Python or Pillow is missing, the whole file is skipped and the reason is shown.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SCRIPT = join(root, "scripts", "make_android_icons.py");
const PY = process.env.PYTHON || "python";
const read = f => readFileSync(join(root, f), "utf8").replace(/\r\n/g, "\n");

function pyOk(code) {
  try { execFileSync(PY, ["-I", "-c", code], { stdio: "pipe" }); return true; } catch { return false; }
}
const hasPy = pyOk("import sys");
const hasPil = hasPy && pyOk("import PIL.Image");
const SKIP = !hasPy ? "Python not found (set PYTHON or install Python 3)"
  : !hasPil ? "Pillow not installed (pip install pillow)"
  : false;

const DENS = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const LEG = [48, 72, 96, 144, 192];
const FG = [108, 162, 216, 324, 432];

// Python probe: reads the generated folder and the source icons, prints one JSON object.
const PROBE = `
import sys, json
from pathlib import Path
from PIL import Image

out = Path(sys.argv[1])
root = Path(sys.argv[2])
DENS = [("mdpi", 48, 108), ("hdpi", 72, 162), ("xhdpi", 96, 216), ("xxhdpi", 144, 324), ("xxxhdpi", 192, 432)]
TOL = 12  # per-channel tolerance for the pink M fill (244,154,178)

def m_pixels(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    pts = []
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] > 0 and abs(p[0] - 244) <= TOL and abs(p[1] - 154) <= TOL and abs(p[2] - 178) <= TOL:
                pts.append((x, y))
    return pts

def hexof(p):
    return "#%02X%02X%02X" % (p[0], p[1], p[2])

res = {}
src = Image.open(root / "public" / "icons" / "icon-512.png").convert("RGB")
msk = Image.open(root / "public" / "icons" / "icon-maskable-512.png").convert("RGB")
res["src_corner"] = hexof(src.getpixel((0, 0)))
res["maskable_corner"] = hexof(msk.getpixel((0, 0)))
res["src_m_count"] = len(m_pixels(msk))
res["dens"] = {}
for name, lpx, apx in DENS:
    base = out / ("mipmap-" + name)
    e = {}
    for f in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
        p = base / f
        e[f] = list(Image.open(p).size) if p.exists() else None
    rp = base / "ic_launcher_round.png"
    if rp.exists():
        r = Image.open(rp).convert("RGBA")
        w, h = r.size
        px = r.load()
        e["round_alpha"] = {
            "tl": px[0, 0][3], "tr": px[w - 1, 0][3], "bl": px[0, h - 1][3], "br": px[w - 1, h - 1][3],
            "inset10": px[int(w * 0.1), int(h * 0.1)][3], "centre": px[w // 2, h // 2][3],
        }
    fp = base / "ic_launcher_foreground.png"
    if fp.exists():
        fg = Image.open(fp).convert("RGBA")
        px = fg.load()
        lo = apx * 21 / 108.0   # Android safe zone 66/108, centred: from 21/108 to 87/108
        hi = apx * 87 / 108.0
        pts = m_pixels(fg)
        inside = [q for q in pts if q[0] >= lo and q[0] + 1 <= hi and q[1] >= lo and q[1] + 1 <= hi]
        e["fg_corner"] = list(px[0, 0])
        e["m_total"] = len(pts)
        e["m_outside"] = len(pts) - len(inside)
        e["side"] = int(round(apx * ((66 / 108.0) / 0.8)))
    res["dens"][name] = e

any_dir = out / "mipmap-anydpi-v26"
res["anydpi"] = {}
for f in ("ic_launcher.xml", "ic_launcher_round.xml"):
    p = any_dir / f
    res["anydpi"][f] = p.read_text(encoding="utf-8") if p.exists() else None
bgp = out / "values" / "ic_launcher_background.xml"
res["bg_xml"] = bgp.read_text(encoding="utf-8") if bgp.exists() else None
print(json.dumps(res))
`;

describe("T12 app icon (D9)", { skip: SKIP }, () => {
  let OUT, gen, probe;

  before(() => {
    OUT = mkdtempSync(join(tmpdir(), "t12-icon-"));
    gen = execFileSync(PY, ["-I", SCRIPT, OUT], { encoding: "utf8" });
    probe = JSON.parse(execFileSync(PY, ["-I", "-c", PROBE, OUT, root], { encoding: "utf8" }));
  });

  after(() => {
    if (OUT) rmSync(OUT, { recursive: true, force: true });
  });

  test("script runs into an empty folder and reports the write", () => {
    assert.match(gen, /Android icons written to/);
  });

  test("script can run again over its own output (idempotent)", () => {
    const again = execFileSync(PY, ["-I", SCRIPT, OUT], { encoding: "utf8" });
    assert.match(again, /Android icons written to/);
  });

  test("legacy and round PNGs are 48/72/96/144/192 px for mdpi to xxxhdpi", () => {
    DENS.forEach((d, i) => {
      for (const f of ["ic_launcher.png", "ic_launcher_round.png"]) {
        assert.deepEqual(probe.dens[d][f], [LEG[i], LEG[i]], `${d}/${f} size`);
      }
    });
  });

  test("adaptive foreground PNGs are 108/162/216/324/432 px for mdpi to xxxhdpi", () => {
    DENS.forEach((d, i) => {
      assert.deepEqual(probe.dens[d]["ic_launcher_foreground.png"], [FG[i], FG[i]], `${d} foreground size`);
    });
  });

  test("round icon is fully transparent at the corners and at a 10% inset, opaque at the centre", () => {
    for (const d of DENS) {
      const a = probe.dens[d].round_alpha;
      assert.deepEqual([a.tl, a.tr, a.bl, a.br, a.inset10], [0, 0, 0, 0, 0], `${d} outside the circle`);
      assert.equal(a.centre, 255, `${d} centre`);
    }
  });

  test("ic_launcher_background colour equals the corner pixel of public/icons/icon-512.png", () => {
    const m = /<color name="ic_launcher_background">(#[0-9A-Fa-f]{6})<\/color>/.exec(probe.bg_xml || "");
    assert.ok(m, "colour line present in values/ic_launcher_background.xml");
    assert.equal(m[1].toUpperCase(), probe.src_corner);
    assert.equal(probe.maskable_corner, probe.src_corner, "maskable corner matches legacy corner");
  });

  test("foreground canvas is filled with the background colour at its corners", () => {
    const bg = probe.src_corner;
    const rgb = [0, 1, 2].map(i => parseInt(bg.slice(1 + 2 * i, 3 + 2 * i), 16));
    for (const d of DENS) {
      assert.deepEqual(probe.dens[d].fg_corner, [...rgb, 255], `${d} foreground corner`);
    }
  });

  test("adaptive XMLs exist and point at the new background and foreground names", () => {
    for (const f of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
      const t = probe.anydpi[f];
      assert.ok(t, `mipmap-anydpi-v26/${f} exists`);
      assert.match(t, /@color\/ic_launcher_background/);
      assert.match(t, /@mipmap\/ic_launcher_foreground/);
    }
  });

  test("foreground: every pink M pixel lies inside the central 66/108 zone, and there are some", () => {
    for (const d of DENS) {
      const e = probe.dens[d]["m_total"] !== undefined ? probe.dens[d] : null;
      assert.ok(e, `${d} has foreground data`);
      assert.ok(e.m_total > 0, `${d} has M pixels`);
      assert.equal(e.m_outside, 0, `${d} M pixels outside the 66/108 zone`);
    }
  });

  test("foreground: M pixel count matches the source M scaled to the icon side (+/-20%)", () => {
    for (const d of DENS) {
      const e = probe.dens[d];
      const expected = probe.src_m_count * (e.side / 512) ** 2;
      const ratio = e.m_total / expected;
      assert.ok(ratio > 0.8 && ratio < 1.2, `${d}: got ${e.m_total}, expected about ${expected.toFixed(0)}`);
    }
  });

  test("workflow: 'Make the app icon' is one step, right after 'Create the Android project', before 'Build APK', not continue-on-error", () => {
    const lines = read(".github/workflows/build-apk.yml").split("\n");
    const starts = [];
    lines.forEach((l, i) => { if (/^      - /.test(l)) starts.push(i); });
    const names = starts.map(i => {
      const m = /^      - name: (.*)$/.exec(lines[i]);
      return m ? m[1].trim() : null;
    });
    const iCreate = names.indexOf("Create the Android project");
    const iIcon = names.indexOf("Make the app icon");
    const iBuild = names.indexOf("Build APK");
    assert.ok(iCreate >= 0, "Create the Android project step exists");
    assert.ok(iIcon >= 0, "Make the app icon step exists");
    assert.ok(iBuild >= 0, "Build APK step exists");
    assert.equal(names.filter(n => n === "Make the app icon").length, 1, "exactly one icon step");
    assert.equal(iIcon, iCreate + 1, "icon step directly follows Create the Android project");
    assert.ok(iIcon < iBuild, "icon step comes before Build APK");
    const block = lines.slice(starts[iIcon], starts[iIcon + 1] ?? lines.length).join("\n");
    assert.ok(!/continue-on-error/.test(block), "icon step is not continue-on-error");
    assert.match(block, /pip install -q pillow/);
    assert.match(block, /python scripts\/make_android_icons\.py android\/app\/src\/main\/res/);
  });
});

if (SKIP) {
  test("T12 icon checks", { skip: SKIP }, () => {});
}
