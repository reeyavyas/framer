# Gauge / speedometer, redrawn from scratch (the stock artboard was raster only).
# Five annular-sector segments on a 180 degree arch, swept straight down for a side face, plus a needle and pivot.
# Writes gauge-A.svg, gauge-A-clay.svg, gauge-B.svg, gauge-B-clay.svg next to this script.
#   python3 build.py
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
R, r = 1000.0, 500.0          # outer and inner radius; the arch's centre (and the needle's pivot) is (0, 0)
N = 5                          # segments, 36 degrees each, left to right
W = 2 * R                      # art width the outline is scaled to
T = round(20.5 * (W + 40) / 2120, 1)  # 19 units at 2120 wide once anti-aliasing eats ~1 (measured 18-19)
NEEDLE_DEG = 119               # needle direction, degrees from +x (counter-clockwise): points at segment 2
NL, NB, NT = 640, 84, 20       # needle length, base radius, tip radius
PIV = 38                       # pivot dot radius

STYLE = {  # D: side-face depth, GAP: perpendicular gap between segments, CR: corner rounding
    "3d": dict(D=58, GAP=T, CR=16),
    "clay": dict(D=46, GAP=30, CR=56),
}

NAVY = "#002c44"
SEG = {  # front [tint, base], side [shade, deep shade], hi: lightest tint
    "teal":   dict(front=["#37aca9", "#059390"], side=["#00615e", "#004f4c"], hi="#8fe0e0"),
    "lteal":  dict(front=["#8fe0e0", "#3bbfc0"], side=["#059390", "#00615e"], hi="#d6f6f6"),
    "yolk":   dict(front=["#ffe07a", "#ffcc40"], side=["#f6a11d", "#e08a12"], hi="#fff0b8"),
    "orange": dict(front=["#fbbb4f", "#f6a11d"], side=["#e08a12", "#c97a0c"], hi="#ffe0a0"),
    "amber":  dict(front=["#f19c2c", "#e08a12"], side=["#c97a0c", "#b86c08"], hi="#ffd08a"),
    "sky":    dict(front=["#5fd0f2", "#00acdd"], side=["#0094c6", "#0079a9"], hi="#9fe3f8"),
    "mint":   dict(front=["#d6f0e8", "#bce2d7"], side=["#8fd3c0", "#5fbfa6"], hi="#eefaf6"),
}
NEEDLE = {  # light half, base, dark half
    "sky":   dict(light="#5fd0f2", base="#00acdd", dark="#0094c6", hi="#9fe3f8"),
    "lblue": dict(light="#00acdd", base="#0079a9", dark="#005f88", hi="#5fd0f2"),
}
SCHEMES = {
    "A": dict(segs=["teal", "lteal", "yolk", "orange", "amber"], needle="sky"),
    "B": dict(segs=["sky", "lteal", "mint", "yolk", "orange"], needle="lblue"),
}

f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
P = lambda rad, deg: (rad * math.cos(math.radians(deg)), -rad * math.sin(math.radians(deg)))
pt = lambda p: f"{f(p[0])},{f(p[1])}"
add = lambda a, b: (a[0] + b[0], a[1] + b[1])
def toward(a, b, d):
    L = math.dist(a, b); return (a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L)

def sector(i, gap, cr):
    """Closed outline of segment i as pieces (kind, start, end, extra): straight radial ends offset parallel
    by gap/2 (so the gap is even from inner to outer edge), true arcs, corners rounded by quadratic curves."""
    a1, a2 = 180 - 36 * i, 180 - 36 * (i + 1)          # a1 > a2: drawn left to right over the top
    off = lambda rad, end: 0 if end in (0, 180) else math.degrees(math.asin(gap / 2 / rad))
    o1, o2 = P(R, a1 - off(R, a1)), P(R, a2 + off(R, a2))
    i1, i2 = P(r, a1 - off(r, a1)), P(r, a2 + off(r, a2))
    A1o, A2o = a1 - off(R, a1) - math.degrees(cr / R), a2 + off(R, a2) + math.degrees(cr / R)
    A2i, A1i = a2 + off(r, a2) + math.degrees(cr / r), a1 - off(r, a1) - math.degrees(cr / r)
    O1c, O2c, I2c, I1c = P(R, A1o), P(R, A2o), P(r, A2i), P(r, A1i)
    return [("A", O1c, O2c, (R, 1)), ("Q", O2c, toward(o2, i2, cr), o2), ("L", toward(o2, i2, cr), toward(i2, o2, cr), None),
            ("Q", toward(i2, o2, cr), I2c, i2), ("A", I2c, I1c, (r, 0)), ("Q", I1c, toward(i1, o1, cr), i1),
            ("L", toward(i1, o1, cr), toward(o1, i1, cr), None), ("Q", toward(o1, i1, cr), O1c, o1)]

def seg_d(kind, e, x):
    if kind == "A": return f"A{f(x[0])} {f(x[0])} 0 0 {x[1]} {pt(e)}"
    if kind == "Q": return f"Q{pt(x)} {pt(e)}"
    return f"L{pt(e)}"
def rev(pc):
    k, s, e, x = pc
    return (k, e, s, (x[0], 1 - x[1]) if k == "A" else x)
def shift(pc, dy):
    k, s, e, x = pc; m = lambda p: (p[0], p[1] + dy)
    return (k, m(s), m(e), m(x) if k == "Q" else x)
def path_d(pcs):
    return f"M{pt(pcs[0][1])}" + "".join(seg_d(k, e, x) for k, s, e, x in pcs) + "Z"

def monotone(pc):
    """Split a corner curve where it turns back in x, so each piece's band is exactly its swept area."""
    k, s, e, c = pc
    den = s[0] - 2 * c[0] + e[0] if k == "Q" else 0
    t = (s[0] - c[0]) / den if den else -1
    if not 0 < t < 1: return [pc]
    m = lambda a, b: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    c1, c2 = m(s, c), m(c, e); mid = m(c1, c2)
    assert all(math.dist(q, mid) > 0 for q in (s, e))
    return [("Q", s, mid, c1), ("Q", mid, e, c2)]

def sweep(pcs, D):
    """The front shape swept straight down by D, as the back copy plus one band per edge (each edge is
    x-monotone, so its band is exactly the area it sweeps). Their union is the solid's whole silhouette."""
    out = [path_d([shift(p, D) for p in pcs])]
    for p in (q for pc in pcs for q in monotone(pc)):
        k, s, e, x = p; b = rev(shift(p, D))
        out.append(f"M{pt(s)}{seg_d(k, e, x)}L{pt(b[1])}{seg_d(b[0], b[2], b[3])}Z")
    return out

def needle_d(L, rb, rt):
    """Needle pointing up from the pivot: base circle rb, tip circle rt at (0,-L), joined by outer tangents."""
    phi = math.acos((rb - rt) / L)                      # tangent angle from the needle's axis
    b = lambda s: (s * rb * math.sin(phi), -rb * math.cos(phi))
    t = lambda s: (s * rt * math.sin(phi), -L - rt * math.cos(phi))
    return (f"M{pt(b(-1))}L{pt(t(-1))}A{rt} {rt} 0 0 1 {pt(t(1))}L{pt(b(1))}A{rb} {rb} 0 1 1 {pt(b(-1))}Z")

def lin(id_, stops, x1=0, y1=0, x2=1, y2=1, user=False):
    u = ' gradientUnits="userSpaceOnUse"' if user else ""
    return (f'<linearGradient id="{id_}" x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}"{u}>'
            + "".join(f'<stop offset="{f(o)}" stop-color="{c}"' + (f' stop-opacity="{f(a)}"' if a is not None else "") + "/>" for o, c, a in stops)
            + "</linearGradient>")
def rad(id_, stops, cx=0, cy=0, rr=R, user=True, extra=""):
    u = ' gradientUnits="userSpaceOnUse"' if user else ""
    return (f'<radialGradient id="{id_}" cx="{f(cx)}" cy="{f(cy)}" r="{f(rr)}"{u}{extra}>'
            + "".join(f'<stop offset="{f(o)}" stop-color="{c}"' + (f' stop-opacity="{f(a)}"' if a is not None else "") + "/>" for o, c, a in stops)
            + "</radialGradient>")

# one viewBox for all four: arch top/sides + outline, down to the clay shadow; ~4% padding
X0, X1 = -R - T, R + T
Y0, Y1 = -R - T, 150
PAD = 0.04 * (X1 - X0)
VB = (X0 - PAD, Y0 - PAD, X1 - X0 + 2 * PAD, Y1 - Y0 + 2 * PAD)

def build(key, clay):
    sc, st = SCHEMES[key], STYLE["clay" if clay else "3d"]
    D, GAP, CR = st["D"], st["GAP"], st["CR"]
    pre = f"gauge-{key}{'-clay' if clay else ''}"
    defs, hulls, sides, strokes, fronts, overs = [], [], [], [], [], []
    for i, name in enumerate(sc["segs"]):
        c = SEG[name]; pcs = sector(i, GAP, CR); d = path_d(pcs); sw = sweep(pcs, D)
        sid, fid = f"{pre}-side{i}", f"{pre}-front{i}"
        defs.append(lin(sid, [(0, c["side"][0], None), (1, c["side"][1], None)], 0, -r, 0, D, user=True))
        sides.append("".join(f'<path d="{x}" fill="url(#{sid})" stroke="url(#{sid})" stroke-width="1.5"/>' for x in [d] + sw))
        if not clay:
            # outline: the solid filled and stroked navy at 2T under everything (outer half shows: T);
            # the front stroked navy at 2T under its fill draws the seam to the side face and between segments
            hulls.append("".join(f'<path d="{x}"/>' for x in [d] + sw))
            strokes.append(f'<path d="{d}"/>')
            defs.append(rad(fid, [(r / R, c["front"][1], None), (0.72, c["front"][1], None), (1, c["front"][0], None)]))
            fronts.append(f'<path d="{d}" fill="url(#{fid})"/>')
            # highlight along the top edge, over the first two thirds of the segment (light from the upper left)
            a1, a2 = 180 - 36 * i, 180 - 36 * (i + 1); hr = R - 30
            s0, s1 = P(hr, a1 - 4 - (36 - 8) * 0.12), P(hr, a1 - 4 - (36 - 8) * 0.66)
            overs.append(f'<path d="M{pt(s0)}A{f(hr)} {f(hr)} 0 0 1 {pt(s1)}" fill="none" stroke="{c["hi"]}" stroke-width="13" stroke-linecap="round"/>')
        else:
            # clay: puffy body (light near the outer rim, deeper toward the inner edge), then a soft light
            # from the upper left and a soft shade to the lower right, per segment, all gradients
            defs.append(rad(fid, [(r / R, c["side"][0], None), (0.62, c["front"][1], None), (0.86, c["front"][0], None), (0.95, c["front"][0], None), (1, c["front"][1], None)]))
            fronts.append(f'<path d="{d}" fill="url(#{fid})"/>')
            defs.append(lin(f"{pre}-lit{i}", [(0, "#ffffff", 0.55), (0.42, "#ffffff", 0)]))
            defs.append(lin(f"{pre}-shd{i}", [(0.55, c["side"][1], 0), (1, c["side"][1], 0.45)]))
            overs.append(f'<path d="{d}" fill="url(#{pre}-lit{i})"/><path d="{d}" fill="url(#{pre}-shd{i})"/>')
    n = NEEDLE[sc["needle"]]; nd = needle_d(NL, NB, NT)
    if not clay:
        defs.append(lin(f"{pre}-needle", [(0, n["light"], None), (0.5, n["light"], None), (0.5, n["base"], None), (1, n["dark"], None)], -NB, 0, NB, 0, user=True))
        defs.append(rad(f"{pre}-pivot", [(0, "#ffffff", None), (0.55, "#eef7ff", None), (1, "#d9eeff", None)], -10, -10, PIV + 10))
        needle = (f'<path d="{nd}" fill="{NAVY}" stroke="{NAVY}" stroke-width="{f(2 * T)}" stroke-linejoin="round"/>'
                  f'<path d="{nd}" fill="url(#{pre}-needle)"/>'
                  f'<path d="M-6,-{NB + 20}L-4,-{NL - 40}" stroke="{n["hi"]}" stroke-width="9" stroke-linecap="round"/>')
        pivot = (f'<circle r="{f(PIV + T)}" fill="{NAVY}"/><circle r="{PIV}" fill="url(#{pre}-pivot)"/>'
                 f'<ellipse cx="-11" cy="-12" rx="10" ry="6" transform="rotate(-35 -11 -12)" fill="#ffffff"/>')
    else:
        defs.append(lin(f"{pre}-needle", [(0, n["hi"], None), (0.35, n["light"], None), (0.7, n["base"], None), (1, n["dark"], None)], -NB, 0, NB, 0, user=True))
        defs.append(rad(f"{pre}-pivot", [(0, "#ffffff", None), (0.5, "#eef7ff", None), (0.85, "#d9eeff", None), (1, "#a9d3ef", None)], -10, -12, PIV + 14))
        needle = (f'<path d="{nd}" fill="url(#{pre}-needle)"/>')
        pivot = f'<circle r="{PIV}" fill="url(#{pre}-pivot)"/>'
        # contact shadow: a radial ellipse with a bell-shaped fade (no blur)
        defs.append(rad(f"{pre}-shadow", [(o, NAVY, a) for o, a in ((0, .55), (.3, .42), (.5, .25), (.65, .13), (.78, .06), (.88, .02), (1, 0))],
                        0, 0, 1, user=False))
    shadow = f'<ellipse cx="0" cy="{f(D + 18)}" rx="{f(R + 40)}" ry="70" fill="url(#{pre}-shadow)"/>' if clay else ""
    ink = f'fill="{NAVY}" stroke="{NAVY}" stroke-width="{f(2 * T)}" stroke-linejoin="round" stroke-linecap="round"'
    body = (shadow
            + (f'<g {ink}>{"".join(hulls)}</g>' if hulls else "")
            + "".join(sides)
            + (f'<g {ink}>{"".join(strokes)}</g>' if strokes else "")
            + "".join(fronts) + "".join(overs)
            # the needle is drawn pointing up and turned about the pivot (0,0); animate this group's rotation
            + f'<g data-k="needle" data-pivot="0 0" transform="rotate({f(90 - NEEDLE_DEG)})">{needle}</g>'
            + f'<g data-k="pivot">{pivot}</g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f(v) for v in VB)}" width="{f(VB[2])}" height="{f(VB[3])}">'
           f'<defs>{"".join(defs)}</defs>{body}</svg>')
    assert "filter" not in svg and "Blur" not in svg and "<image" not in svg
    ids = [x.split('"')[0] for x in svg.split(' id="')[1:]]
    assert len(ids) == len(set(ids)) and all(i.startswith(pre + "-") for i in ids), ids
    open(f"{OUT}/{pre}.svg", "w").write(svg)
    return pre

if __name__ == "__main__":
    print([build(k, c) for k in SCHEMES for c in (False, True)], "T =", T)
