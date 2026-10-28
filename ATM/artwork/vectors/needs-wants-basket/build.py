"""Builds ATM/ATMNeedsWantsBasket.tsx from the owner's "Needs and Wants Baskets.ai".

The .ai is PDF inside: artboard 1 is Wants, artboard 2 is Needs, 500 x 500.
Convert each to SVG first (PyMuPDF, text as paths), then run:

    python3 build.py <wants.svg> <needs.svg>

The art stays as drawn. Three fixes only: Wants' front handle was filled by
two clipped raster patches of flat navy, swapped here for rects of the same
colour so it stays sharp; WANTS sat 3.5 units left of centre on its label,
so its letters move right along the label (and the label's panel loses the
letter-shaped holes they were set into, which would otherwise show through);
and numbers are rounded to keep the file small.
The source art is never committed, only this script and the template.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

# The WANTS letters (navy) and the light piece inside the A, by position.
# Measured along the label's 10.75° tilt through the middle of the letters:
# 7.75 units clear before the W, 14.75 after the S, so 3.5 right along it.
WANTS_LETTERS = ["163.0994,299.3544", "222.4394,272.95069", "185.3405,289.09083", "254.6417,317.3898", "233.0635,313.2261"]
LETTER_FILLS = {"#082653", "#082652", "#eef5f8"}
WANTS_SHIFT = (3.44, 0.65)


def centre_wants(svg: str) -> str:
    moved = 0
    filled = 0

    def shift(m: re.Match) -> str:
        nonlocal moved, filled
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
        moved += 1
        e, y = float(t.group(1)) + WANTS_SHIFT[0], float(t.group(2)) + WANTS_SHIFT[1]
        return el.replace(t.group(0), f'transform="matrix(1,0,0,-1,{e:.4f},{y:.4f})"')

    svg = re.sub(r"<path [^>]*/>", shift, svg, flags=re.S)
    assert moved == 6, f"expected the 5 WANTS letters and the A's inside, moved {moved}"
    assert filled == 1, "label panel not found"
    return svg


def clean(svg: str, prefix: str) -> str:
    svg = re.sub(r' inkscape:[a-z]+="[^"]*"', "", svg)
    # Wants' handle patches average #0c3668; a flat rect looks the same.
    svg = re.sub(r'<image([^>]*?)xlink:href="[^"]*"([^>]*)/>', r'<rect\1 fill="#0c3668"\2/>', svg, flags=re.S)
    body = svg[svg.index(">", svg.index("<svg")) + 1 : svg.rindex("</svg>")]
    body = re.sub(r"(\d+\.\d{3})\d+", r"\1", body)
    body = re.sub(r"\s*\n\s*", "\n", body).strip()
    # Per-artboard ids; the component adds a per-instance prefix on top.
    body = body.replace('id="', f'id="{prefix}').replace("url(#", f"url(#{prefix}").replace('href="#', f'href="#{prefix}')
    assert "`" not in body and "${" not in body, "art would break the template literal"
    assert "<image" not in body, "raster left in the art"
    return body


wants = clean(centre_wants(Path(sys.argv[1]).read_text()), "w-")
needs = clean(Path(sys.argv[2]).read_text(), "n-")
out = (HERE / "ATMNeedsWantsBasket.template.tsx").read_text()
out = out.replace("__WANTS_ART__", wants).replace("__NEEDS_ART__", needs)
dest = HERE.parents[2] / "ATMNeedsWantsBasket.tsx"
dest.write_text(out)
print(dest, len(out))
