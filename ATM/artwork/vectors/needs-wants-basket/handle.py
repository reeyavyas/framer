"""Writes the owner's "Basket.ai" as basket.svg for build.py, exactly as
drawn except the right handle's outer edge, which the owner asked to have
smoothed (its traced outline steps in and out).

The three shapes along that edge (`HANDLE`: the handle's navy outline, a
sliver of it on the right, and its mid-blue body) have their points along
it (`EDGE`) thinned to the key ones (Douglas-Peucker, within TOL drawing
units), so a wobbly run becomes straight; each is then redrawn through its
points: a sharp corner gets a small round
(CORNER), and a gentle bend, or any bend in a small curve, becomes part of a
smooth curve through the edges' midpoints. Each gets a hairline edge in its
own colour (SEAL), so neighbours that moved apart a little still meet. Every
other shape is copied exactly.

    python3 handle.py <Basket.ai> <out.svg>     (needs PyMuPDF)
"""
import math
import sys

import fitz

# The shapes to smooth, by their order in the drawing and fill (checked).
HANDLE = {0: "#020826", 1: "#020826", 6: "#0e2b57"}
# Only their points along the handle's right edge are thinned; elsewhere
# (where they meet the basket) the outline keeps every point, so it fits
# its neighbours as drawn.
EDGE = (404, 222, 440, 300)  # x0, y0, x1, y1
TOL = 1.0  # how far a point may move to straighten a run, in drawing units (500 wide)
SHARP = 38  # a bend of more than this many degrees is a corner
CORNER = 1.2  # a corner's round
SMALL = 5  # a bend between two edges shorter than this is part of a small curve
SEAL = 1.4


def hexcol(c):
    return "#%02x%02x%02x" % tuple(round(v * 255) for v in c)


def f(p):
    return f"{p[0]:.2f} {p[1]:.2f}"


def exact(items):
    """The drawing's own outline, unchanged."""
    d, end = "", None
    for it in items:
        kind, pts = it[0], it[1:]
        if kind == "re":
            r = pts[0]
            d += ("Z" if end is not None else "") + "M" + "L".join(f(p) for p in (r.tl, r.tr, r.br, r.bl)) + "Z"
            end = None
            continue
        if kind == "qu":
            q = pts[0]
            d += ("Z" if end is not None else "") + "M" + "L".join(f(p) for p in (q.ul, q.ur, q.lr, q.ll)) + "Z"
            end = None
            continue
        if end is None or abs(end - pts[0]) > 0.01:
            d += ("Z" if end is not None else "") + "M" + f(pts[0])
        d += ("L" + f(pts[1])) if kind == "l" else ("C" + " ".join(f(q) for q in pts[1:]))
        end = pts[-1]
    return d + ("Z" if end is not None else "")


def subpaths(items):
    """Each closed outline of a drawing, as points (curves sampled)."""
    out, cur = [], []
    for it in items:
        kind, pts = it[0], it[1:]
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
    if math.dist(ring[0], ring[-1]) < 0.01:
        ring = ring[:-1]
    on_edge = lambda p: EDGE[0] <= p[0] <= EDGE[2] and EDGE[1] <= p[1] <= EDGE[3]
    k = next((k for k, p in enumerate(ring) if not on_edge(p)), None)
    if k is None:  # all of it is on the edge: split at the farthest point, thin both halves
        j = max(range(len(ring)), key=lambda k: math.dist(ring[k], ring[0]))
        return dp(ring[: j + 1], TOL)[:-1] + dp(ring[j:] + ring[:1], TOL)[:-1]
    # start at a point off the edge, then thin each run of points along it
    ring = ring[k:] + ring[:k]
    out, run = [], []
    for p in ring + ring[:1]:
        if on_edge(p):
            run.append(p)
            continue
        if run:
            out += dp([out[-1]] + run + [p], TOL)[1:-1]
            run = []
        out.append(p)
    return out[:-1]


def turn(p, q, r):
    a1 = math.atan2(q[1] - p[1], q[0] - p[0])
    a2 = math.atan2(r[1] - q[1], r[0] - q[0])
    return abs((math.degrees(a2 - a1) + 180) % 360 - 180)


def toward(p, q, d):
    L = math.dist(p, q) or 1
    return (p[0] + (q[0] - p[0]) * d / L, p[1] + (q[1] - p[1]) * d / L)


def ring_d(pts):
    segs = []
    for k in range(len(pts)):
        p, q, r = pts[k - 1], pts[k], pts[(k + 1) % len(pts)]
        lp, lr = math.dist(p, q), math.dist(q, r)
        if turn(p, q, r) > SHARP and min(lp, lr) >= SMALL:
            segs.append((toward(q, p, min(CORNER, lp / 2)), q, toward(q, r, min(CORNER, lr / 2))))
        else:  # smooth: curve between the edge midpoints
            segs.append((toward(q, p, lp / 2), q, toward(q, r, lr / 2)))
    d = "M" + f(segs[0][2])
    for a, q, b in segs[1:] + segs[:1]:
        d += "L" + f(a) + "Q" + f(q) + " " + f(b)
    return d + "Z"


paths = []
for i, dr in enumerate(fitz.open(sys.argv[1])[0].get_drawings()):
    if not dr.get("fill"):
        continue
    col = hexcol(dr["fill"])
    rule = ' fill-rule="evenodd"' if dr.get("even_odd") else ""
    if i in HANDLE:
        assert col == HANDLE[i], f"shape {i} is {col}, not the handle's {HANDLE[i]}"
        d = "".join(ring_d(simplify(s)) for s in subpaths(dr["items"]))
        paths.append(f'<path fill="{col}" stroke="{col}" stroke-width="{SEAL}" stroke-linejoin="round"{rule} d="{d}"/>')
    else:
        paths.append(f'<path fill="{col}"{rule} d="{exact(dr["items"])}"/>')
open(sys.argv[2], "w").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">\n' + "\n".join(paths) + "\n</svg>\n"
)
print(len(paths), "shapes,", len(HANDLE), "smoothed")
