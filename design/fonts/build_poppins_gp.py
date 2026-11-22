"""Build "Poppins GP" from Poppins (SIL OFL 1.1).

Changes vs Poppins: Latin + French subset; the ten digits get one common
advance width (tabular figures, glyphs centred); U+202F NARROW NO-BREAK
SPACE added (thousands separator); family renamed "Poppins GP" (OFL §3).

Usage:  python3 build_poppins_gp.py SRC_DIR OUT_DIR
SRC_DIR holds the original full TTFs Poppins-Regular.ttf, Poppins-Medium.ttf,
Poppins-SemiBold.ttf (Google Fonts, "Poppins" v4.004). Needs fonttools.
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.ttLib.tables._g_l_y_f import Glyph

WEIGHTS = {"Regular": 400, "Medium": 500, "SemiBold": 600}
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) +
            [0x131, 0x152, 0x153, 0x178, 0x2C6, 0x2DA, 0x2DC, 0x2013, 0x2014,
             0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026,
             0x2030, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2212])
NNBSP_RATIO = 0.6  # narrow no-break space = 60 % of the normal space


def build(src: Path, out: Path, style: str) -> Path:
    f = TTFont(src / f"Poppins-{style}.ttf")
    opts = Options()
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(f)

    cmap, glyf, hmtx = f.getBestCmap(), f["glyf"], f["hmtx"]
    digits = [cmap[ord(c)] for c in "0123456789"]
    adv = max(hmtx[g][0] for g in digits)
    for g in digits:
        dx = (adv - hmtx[g][0]) // 2
        gl = glyf[g]
        if gl.isComposite():
            for comp in gl.components:
                comp.x += dx
        elif gl.numberOfContours > 0:
            gl.coordinates.translate((dx, 0))
        gl.recalcBounds(glyf)
        hmtx[g] = (adv, getattr(gl, "xMin", 0))

    name = "uni202F"
    order = f.getGlyphOrder() + [name]
    f.setGlyphOrder(order)
    glyf[name] = Glyph()
    glyf[name].numberOfContours = 0
    hmtx[name] = (round(hmtx["space"][0] * NNBSP_RATIO), 0)
    for t in f["cmap"].tables:
        if t.isUnicode():
            t.cmap[0x202F] = name
    f["maxp"].numGlyphs = len(order)

    ps = f"PoppinsGP-{style}"
    for r in f["name"].names:
        if r.nameID in (1, 16):
            r.string = "Poppins GP"
        elif r.nameID == 4:
            r.string = f"Poppins GP {style}"
        elif r.nameID == 6:
            r.string = ps
        elif r.nameID == 3:
            r.string = f"GOLDENPIECE; {ps}; based on Poppins 4.004"
    path = out / f"{ps}.ttf"
    f.save(path)
    return path


if __name__ == "__main__":
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for style in WEIGHTS:
        print(build(src, out, style))
