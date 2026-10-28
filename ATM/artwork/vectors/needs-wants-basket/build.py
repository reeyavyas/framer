"""Builds ATM/ATMNeedsWantsBasket.tsx from the owner's "Needs and Wants Baskets.ai".

The .ai is PDF inside: artboard 1 is Wants, artboard 2 is Needs, 500 x 500.
Convert each to SVG first (PyMuPDF, text as paths), then run:

    python3 build.py <wants.svg> <needs.svg>

The art stays as drawn, with these changes: Wants' front handle was filled by
two clipped raster patches of flat navy, swapped here for rects of the same
colour so it stays sharp; the drawn NEEDS / WANTS lettering is replaced by
real text in the brand font (Area Normal Black, as the page's heading),
centred on the label (Wants' label panel had the letters cut out of it as
holes, so it keeps only its outer edge); and numbers are rounded to keep the
file small. The source art is never committed, only this script and the
template.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

# The drawn WANTS letters (navy) and the light piece inside the A, by position.
WANTS_LETTERS = ["163.0994,299.3544", "222.4394,272.95069", "185.3405,289.09083", "254.6417,317.3898", "233.0635,313.2261"]
LETTER_FILLS = {"#082653", "#082652", "#eef5f8"}

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


def strip_wants_letters(svg: str) -> str:
    removed = 0
    filled = 0

    def strip(m: re.Match) -> str:
        nonlocal removed, filled
        el = m.group(0)
        t = re.search(r'transform="matrix\(1,0,0,-1,([\d.]+),([\d.]+)\)"', el)
        f = re.search(r'fill="(#[0-9a-f]{6})"', el)
        if t and f and f.group(1) == "#e4eef4" and f"{t.group(1)},{t.group(2)}" == WANTS_LETTERS[3]:
            # The label's panel: five letter holes, then its outer edge. Keep the edge.
            d = re.search(r' d="([^"]*)"', el).group(1)
            subs = [x for x in re.split(r"(?=M)", d) if x.strip()]
            assert len(subs) == 6, f"label panel has {len(subs)} outlines, expected 6"
            filled += 1
            return el.replace(d, subs[-1])
        if not t or not f or f"{t.group(1)},{t.group(2)}" not in WANTS_LETTERS or f.group(1) not in LETTER_FILLS:
            return el
        removed += 1
        return ""

    svg = re.sub(r"<path [^>]*/>", strip, svg, flags=re.S)
    assert removed == 6, f"expected the 5 WANTS letters and the A's inside, removed {removed}"
    assert filled == 1, "label panel not found"
    return svg


def strip_needs_letters(svg: str) -> str:
    # NEEDS is five glyphs laid on a plain panel; drop them and their outlines.
    svg, n = re.subn(r'<use data-text="[A-Z]"[^>]*/>', "", svg)
    assert n == 5, f"expected the 5 NEEDS glyphs, found {n}"
    svg = re.sub(r'<path id="font_[^"]*" d="[^"]*"/>', "", svg)
    return svg


def clean(svg: str, prefix: str, text: str) -> str:
    svg = re.sub(r' inkscape:[a-z]+="[^"]*"', "", svg)
    # Wants' handle patches average #0c3668; a flat rect looks the same.
    svg = re.sub(r'<image([^>]*?)xlink:href="[^"]*"([^>]*)/>', r'<rect\1 fill="#0c3668"\2/>', svg, flags=re.S)
    body = svg[svg.index(">", svg.index("<svg")) + 1 : svg.rindex("</svg>")]
    body = re.sub(r"(\d+\.\d{3})\d+", r"\1", body)
    body = re.sub(r"\s*\n\s*", "\n", body).strip()
    # Per-artboard ids; the component adds a per-instance prefix on top.
    body = body.replace('id="', f'id="{prefix}').replace("url(#", f"url(#{prefix}").replace('href="#', f'href="#{prefix}')
    body += "\n" + text
    assert "`" not in body and "${" not in body, "art would break the template literal"
    assert "<image" not in body, "raster left in the art"
    return body


wants = clean(strip_wants_letters(Path(sys.argv[1]).read_text()), "w-", label_text("WANTS", "#082653"))
needs = clean(strip_needs_letters(Path(sys.argv[2]).read_text()), "n-", label_text("NEEDS", "#046666"))
out = (HERE / "ATMNeedsWantsBasket.template.tsx").read_text()
out = out.replace("__WANTS_ART__", wants).replace("__NEEDS_ART__", needs)
dest = HERE.parents[2] / "ATMNeedsWantsBasket.tsx"
dest.write_text(out)
print(dest, len(out))
