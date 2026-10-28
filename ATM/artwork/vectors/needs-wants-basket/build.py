"""Builds ATM/ATMNeedsWantsBasket.tsx from the owner's "Basket.ai".

The .ai is PDF inside: one navy basket with a blank label, 500 x 500, the
same shape as the first "Needs and Wants Baskets.ai" with cleaner edges.
Brush it up into an SVG first with smooth.py, then run:

    python3 build.py <basket.svg>

The navy drawing is the Wants basket. The Needs basket is the same drawing
recoloured teal to match the first Needs basket (`teal`). Each gets its word
in real text in the brand font (Area Normal Black, as the page's heading),
centred on the label, and numbers are rounded to keep the file small. The
source art is never committed, only this script and the template.
"""
import colorsys
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

# The label's light panel: its tilt, the point the text turns about, and the
# panel's true middle from there, measured along and across the tilt (its
# bounding-box centre is a little off, as the panel is lopsided). The same on
# both artboards.
LABEL_CENTRE = (203.65, 289.05)
LABEL_TILT = 10.75
PANEL_MID = (1.67, -0.81)
# Area Normal Black, measured at 100px: WANTS inks 0..397, NEEDS 7..352 of
# advances 400.7 and 355.5; the capitals' middle sits 0.392 of the size above
# the baseline. At 33, WANTS (the wider word) fills the panel with about 6
# to spare each side (its corners come closest to the leaning label edges);
# NEEDS uses the same size so the labels match.
FONT = "Area Normal Black, sans-serif"
SIZE = 33
INK = {"WANTS": (0, 397, 400.7), "NEEDS": (7, 352, 355.5)}
CAP_MID = 0.392


def label_text(word: str, fill: str) -> str:
    left, right, advance = INK[word]
    # text-anchor middle centres the advance; nudge so the ink is centred.
    dx = (advance / 2 - (left + right) / 2) * SIZE / 100
    cx, cy = LABEL_CENTRE
    x = cx + PANEL_MID[0] + dx
    y = cy + PANEL_MID[1] + CAP_MID * SIZE
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="middle" '
        f'font-family="{FONT}" font-weight="900" font-size="{SIZE}" fill="{fill}" '
        f'transform="rotate({LABEL_TILT} {cx} {cy})">{word}</text>'
    )


# Navy to teal: the same light and dark, on the first Needs basket's teal.
# The teal's value for each navy value, sampled from the first two baskets
# (the same drawing in both colours) where each navy shade showed.
TEAL_V = [(0, 0.29), (0.15, 0.34), (0.27, 0.40), (0.33, 0.52), (0.45, 0.57), (0.6, 0.64), (0.7, 0.70), (0.8, 0.76), (0.9, 0.85), (1, 0.93)]


def teal(hex_: str) -> str:
    h, s, v = colorsys.rgb_to_hsv(*(int(hex_[k : k + 2], 16) / 255 for k in (1, 3, 5)))
    if s < 0.18:
        return hex_  # the label's white and the bolts' greys stay
    for (v0, t0), (v1, t1) in zip(TEAL_V, TEAL_V[1:]):
        if v <= v1:
            tv = t0 + (t1 - t0) * (v - v0) / (v1 - v0)
            break
    th = (181 + max(0, tv - 0.8) / 0.12 * 9) / 360  # the lightest lean a little blue, as drawn
    return "#%02x%02x%02x" % tuple(round(c * 255) for c in colorsys.hsv_to_rgb(th, min(0.95, s * 1.1), tv))


def clean(svg: str, prefix: str, text: str) -> str:
    svg = re.sub(r' inkscape:[a-z]+="[^"]*"', "", svg)
    body = svg[svg.index(">", svg.index("<svg")) + 1 : svg.rindex("</svg>")]
    body = re.sub(r"(\d+\.\d{3})\d+", r"\1", body)
    body = re.sub(r"\s*\n\s*", "\n", body).strip()
    # Per-artboard ids; the component adds a per-instance prefix on top.
    body = body.replace('id="', f'id="{prefix}').replace("url(#", f"url(#{prefix}").replace('href="#', f'href="#{prefix}')
    body += "\n" + text
    assert "`" not in body and "${" not in body, "art would break the template literal"
    assert "<image" not in body, "raster left in the art"
    return body


src = Path(sys.argv[1]).read_text()
wants = clean(src, "w-", label_text("WANTS", "#082653"))
needs = clean(re.sub(r'(fill|stroke)="(#[0-9a-f]{6})"', lambda m: f'{m.group(1)}="{teal(m.group(2))}"', src), "n-", label_text("NEEDS", "#046666"))
out = (HERE / "ATMNeedsWantsBasket.template.tsx").read_text()
out = out.replace("__WANTS_ART__", wants).replace("__NEEDS_ART__", needs)
dest = HERE.parents[2] / "ATMNeedsWantsBasket.tsx"
dest.write_text(out)
print(dest, len(out))
