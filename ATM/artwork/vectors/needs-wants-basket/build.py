"""Builds ATM/ATMNeedsWantsBasket.tsx from the owner's "Needs and Wants Baskets.ai".

The .ai is PDF inside: artboard 1 is Wants, artboard 2 is Needs, 500 x 500.
Convert each to SVG first (PyMuPDF, text as paths), then run:

    python3 build.py <wants.svg> <needs.svg>

The art stays as drawn. Two fixes only: Wants' front handle was filled by two
clipped raster patches of flat navy, swapped here for rects of the same
colour so it stays sharp; and numbers are rounded to keep the file small.
The source art is never committed, only this script and the template.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent


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


wants = clean(Path(sys.argv[1]).read_text(), "w-")
needs = clean(Path(sys.argv[2]).read_text(), "n-")
out = (HERE / "ATMNeedsWantsBasket.template.tsx").read_text()
out = out.replace("__WANTS_ART__", wants).replace("__NEEDS_ART__", needs)
dest = HERE.parents[2] / "ATMNeedsWantsBasket.tsx"
dest.write_text(out)
print(dest, len(out))
