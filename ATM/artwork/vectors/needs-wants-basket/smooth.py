"""Brushes up the owner's "Basket.ai" into basket.svg for build.py.

The drawing is traced, so its edges wobble. Each outline is thinned to its
key points (Douglas-Peucker, within TOL drawing units), so a wobbly straight
run becomes one straight line; then it's redrawn through those points: a
sharp corner gets a small round (CORNER), and a gentle bend (or any bend in a
small curve) becomes part of a smooth curve through the edges' midpoints.
Each shape gets a hairline edge in its own colour (SEAL), so neighbours that
moved apart a little still meet. Specks smaller than SPECK units
are dropped. The bolts were drawn clean and are too small to thin, so they're
kept exactly (`exact`). Shapes, colours and their order stay as drawn.

    python3 smooth.py <Basket.ai> <out.svg>     (needs PyMuPDF)
"""
import colorsys
import math
import sys

import fitz

TOL = 0.8  # how far a point may move to straighten a run, in drawing units (500 wide)
SHARP = 38  # a bend of more than this many degrees is a corner
CORNER = 1.2  # a corner's round
SMALL = 5  # a bend between two edges shorter than this is part of a small curve (bolts, slot ends)
SEAL = 0.8  # each shape's edge, in its own colour, so neighbours that moved apart still meet
SPECK = 2.5


def hexcol(c):
    return "#%02x%02x%02x" % tuple(round(v * 255) for v in c)


def subpaths(items):
    """Each closed outline of a drawing, as points (curves sampled)."""
    out, cur = [], []
    for it in items:
        kind, pts = it[0], it[1:]
        if kind == "re":
            r = pts[0]
            out.append([r.tl, r.tr, r.br, r.bl])
            cur = []
            continue
        if kind == "qu":
            q = pts[0]
            out.append([q.ul, q.ur, q.lr, q.ll])
            cur = []
            continue
        start = pts[0]
        if cur and abs(cur[-1] - start) > 0.01:
            out.append(cur)
            cur = []
        if not cur:
            cur = [start]
        if kind == "l":
            cur.append(pts[1])
        elif kind == "c":
            p0, p1, p2, p3 = pts
            for k in range(1, 9):
                t = k / 8
                cur.append(p0 * (1 - t) ** 3 + p1 * 3 * (1 - t) ** 2 * t + p2 * 3 * (1 - t) * t * t + p3 * t**3)
    if cur:
        out.append(cur)
    return [[(p.x, p.y) for p in s] for s in out if len(s) >= 3]


def exact(items):
    """The drawing's own outline, unchanged."""
    f = lambda p: f"{p.x:.2f} {p.y:.2f}"
    d, end = "", None
    for it in items:
        kind, pts = it[0], it[1:]
        if kind == "re":
            r = pts[0]
            d += f"M{f(r.tl)}L{f(r.tr)}L{f(r.br)}L{f(r.bl)}Z"
            end = None
            continue
        if kind == "qu":
            q = pts[0]
            d += f"M{f(q.ul)}L{f(q.ur)}L{f(q.lr)}L{f(q.ll)}Z"
            end = None
            continue
        if end is None or abs(end - pts[0]) > 0.01:
            d += ("Z" if end is not None else "") + "M" + f(pts[0])
        d += ("L" + f(pts[1])) if kind == "l" else ("C" + " ".join(f(q) for q in pts[1:]))
        end = pts[-1]
    return d + ("Z" if end is not None else "")


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    L = math.hypot(bx - ax, by - ay)
    far, fi = -1, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / L if L else math.hypot(x - ax, y - ay)
        if d > far:
            far, fi = d, i
    if far <= tol:
        return [pts[0], pts[-1]]
    return dp(pts[: fi + 1], tol)[:-1] + dp(pts[fi:], tol)


def simplify(ring):
    if abs(ring[0][0] - ring[-1][0]) < 0.01 and abs(ring[0][1] - ring[-1][1]) < 0.01:
        ring = ring[:-1]
    # split the ring at its two farthest-apart points and thin each half
    i = 0
    j = max(range(len(ring)), key=lambda k: (ring[k][0] - ring[0][0]) ** 2 + (ring[k][1] - ring[0][1]) ** 2)
    a = dp(ring[i : j + 1], TOL)
    b = dp(ring[j:] + ring[:1], TOL)
    return a[:-1] + b[:-1]


def turn(p, q, r):
    a1 = math.atan2(q[1] - p[1], q[0] - p[0])
    a2 = math.atan2(r[1] - q[1], r[0] - q[0])
    return abs((math.degrees(a2 - a1) + 180) % 360 - 180)


def toward(p, q, d):
    L = math.hypot(q[0] - p[0], q[1] - p[1]) or 1
    return (p[0] + (q[0] - p[0]) * d / L, p[1] + (q[1] - p[1]) * d / L)


def ring_d(pts):
    n = len(pts)
    f = lambda p: f"{p[0]:.2f} {p[1]:.2f}"
    segs = []
    for k in range(n):
        p, q, r = pts[k - 1], pts[k], pts[(k + 1) % n]
        lp = math.hypot(q[0] - p[0], q[1] - p[1])
        lr = math.hypot(r[0] - q[0], r[1] - q[1])
        if turn(p, q, r) > SHARP and min(lp, lr) >= SMALL:
            a, b = toward(q, p, min(CORNER, lp / 2)), toward(q, r, min(CORNER, lr / 2))
        else:
            a, b = toward(q, p, lp / 2), toward(q, r, lr / 2)  # smooth: curve between the edge midpoints
        segs.append((a, q, b))
    d = "M" + f(segs[0][2])
    for a, q, b in segs[1:] + segs[:1]:
        d += "L" + f(a) + "Q" + f(q) + " " + f(b)
    return d + "Z"


page = fitz.open(sys.argv[1])[0]
paths, dropped = [], 0
for dr in page.get_drawings():
    r = dr["rect"]
    if not dr.get("fill") or max(r.width, r.height) < SPECK:
        dropped += 1
        continue
    col = hexcol(dr["fill"])
    _, sat, val = colorsys.rgb_to_hsv(*dr["fill"])
    if sat < 0.18 and val < 0.9:  # the bolts' greys
        d = exact(dr["items"])
    else:
        rings = [s for s in (simplify(s) for s in subpaths(dr["items"])) if len(s) >= 3]
        if not rings:
            dropped += 1
            continue
        d = "".join(ring_d(s) for s in rings)
    rule = ' fill-rule="evenodd"' if dr.get("even_odd") else ""
    paths.append(f'<path fill="{col}" stroke="{col}" stroke-width="{SEAL}" stroke-linejoin="round"{rule} d="{d}"/>')
open(sys.argv[2], "w").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">\n' + "\n".join(paths) + "\n</svg>\n"
)
print(f"{len(paths)} shapes kept, {dropped} specks dropped")
