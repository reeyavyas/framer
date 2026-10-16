"""Measure outline thickness on measure.png (the 1:1 render, 1 px = 1 drawing unit; viewBox origin 190,80).
Prints each run of outline-coloured pixels along the scan lines below, as (start, length). Every outline on the
cart and boxes measured 17-21; anything outside that, or a line whose runs differ by more than 2 along its
length, is an uneven stroke to fix.
    python3 outlines.py measure.png
"""
import sys
from PIL import Image

LINE = (0x00, 0x2C, 0x44)  # navy outline
OX, OY = 190, 80
SCANS = [  # (label, "col"/"row", fixed, from, to) in drawing units
    ("flat box, rim, frame, ground", "col", 1000, 400, 1560),
    ("egg-yolk box", "col", 1350, 200, 640),
    ("blue box", "col", 1750, 380, 640),
    ("egg-yolk box sides", "row", 470, 1150, 1720),
    ("wheel", "row", 1330, 600, 960),
]
im = Image.open(sys.argv[1]).convert("RGB")
near = lambda c: sum(abs(a - b) for a, b in zip(c, LINE)) < 60
for label, kind, k, a, b in SCANS:
    pts = [((k, t) if kind == "col" else (t, k)) for t in range(a, b)]
    runs, start = [], None
    for i in range(len(pts) + 1):  # one step past the end closes a run that reaches it
        hit = i < len(pts) and near(im.getpixel((pts[i][0] - OX, pts[i][1] - OY)))
        if hit and start is None: start = i
        if not hit and start is not None: runs.append((a + start, i - start)); start = None
    print(f"{label:30} {runs}")
