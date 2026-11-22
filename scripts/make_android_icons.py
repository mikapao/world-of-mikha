#!/usr/bin/env python3
"""Writes the Android app icons from the web-app icons (needs Pillow).

Usage: python scripts/make_android_icons.py <android/app/src/main/res>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LEGACY_SRC = ROOT / "public" / "icons" / "icon-512.png"
MASKABLE_SRC = ROOT / "public" / "icons" / "icon-maskable-512.png"

DENSITIES = {  # name: (legacy px, adaptive px)
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}
ICON_FRACTION = 66 / 108  # Android's safe zone
# Design: the maskable icon's own 80% safe zone must fit the 66/108 zone.
FG_SCALE = (66 / 108) / 0.8

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""


def round_mask(img):
    size = img.size[0]
    big = 4
    mask = Image.new("L", (size * big, size * big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * big - 1, size * big - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: make_android_icons.py <res folder>")
    res = Path(sys.argv[1])
    legacy = Image.open(LEGACY_SRC).convert("RGBA")
    maskable = Image.open(MASKABLE_SRC).convert("RGBA")
    bg = maskable.getpixel((0, 0))[:3]
    hexcol = "#%02X%02X%02X" % bg

    for name, (lpx, apx) in DENSITIES.items():
        d = res / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        sq = legacy.resize((lpx, lpx), Image.LANCZOS)
        sq.save(d / "ic_launcher.png")
        round_mask(sq).save(d / "ic_launcher_round.png")

        canvas = Image.new("RGBA", (apx, apx), bg + (255,))
        side = round(apx * FG_SCALE)
        icon = maskable.resize((side, side), Image.LANCZOS)
        off = (apx - side) // 2
        canvas.alpha_composite(icon, (off, off))
        canvas.save(d / "ic_launcher_foreground.png")

    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{hexcol}</color>\n</resources>\n',
        encoding="utf-8",
    )

    any_dir = res / "mipmap-anydpi-v26"
    any_dir.mkdir(parents=True, exist_ok=True)
    for f in ("ic_launcher.xml", "ic_launcher_round.xml"):
        if not (any_dir / f).exists():
            (any_dir / f).write_text(ADAPTIVE_XML, encoding="utf-8")

    print(f"Android icons written to {res} (background {hexcol})")


if __name__ == "__main__":
    main()
