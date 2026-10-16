# Gauge / speedometer, redrawn from scratch (the stock artboard was raster only).
# Five annular-sector segments on a 180 degree arch, swept straight down for a side face, plus a needle and pivot.
# Writes gauge-<A|B>[-clay|-glass|-gloss].svg next to this script: 3D outlined (navy ink) plus three solid 3D styles
# with no outline and the segments spaced apart: claymorphism, 3D glass, glossy 3D.
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
    "clay": dict(D=84, GAP=72, CR=56),
    "glass": dict(D=84, GAP=72, CR=18),
    "gloss": dict(D=84, GAP=110, CR=30),  # designer: more space between the blocks
}
SOLID = ("clay", "glass", "gloss")
NL2, NB2, NT2 = 425, 72, 17     # the solid styles' needle: its tip stops ~55 short of the segments

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
# solid styles: core = the body's deep shade toward the lower right (2-3 steps darker, same hue)
CORE = {"teal": "#00726f", "lteal": "#159e9c", "yolk": "#f4ad22", "orange": "#e3860f", "amber": "#c9780c",
        "sky": "#0088bd", "mint": "#7fc9b4"}
NEEDLE = {  # light half, base, dark half
    "sky":   dict(light="#5fd0f2", base="#00acdd", dark="#0094c6", hi="#9fe3f8"),
    "lblue": dict(light="#00acdd", base="#0079a9", dark="#005f88", hi="#5fd0f2"),
    # designer: a white pointer with a bright blue pivot, no streak inside it
    "white": dict(light="#ffffff", base="#f4faff", dark="#d9eeff", hi="#ffffff", under="#a9d3ef", pivot=["#9fe3f8", "#5fd0f2", "#00acdd", "#0094c6"], pivotUnder="#0079a9"),
}
SCHEMES = {
    "A": dict(segs=["teal", "lteal", "yolk", "orange", "amber"], needle="sky"),
    "B": dict(segs=["orange", "yolk", "mint", "lteal", "sky"], needle="white"),
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

# viewBoxes, ~4% padding: the outlined art, and the solid styles with their wider contact shadow
def viewbox(x0, x1, y0, y1):
    pad = 0.04 * (x1 - x0); return (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
VB = viewbox(-R - T, R + T, -R - T, 150)
SHADOW_RX, SHADOW_RY = R + 150, 100   # solid styles' contact shadow, wider than the arch
VB_SOLID = viewbox(-SHADOW_RX, SHADOW_RX, -R, STYLE["clay"]["D"] + 10 + SHADOW_RY)
BELL = ((0, 1), (.25, .8), (.45, .47), (.6, .25), (.72, .12), (.83, .045), (.92, .012), (1, 0))  # soft fade, no rim

def layered(paths, opacity, widths, extra=""):
    """A soft shadow without blur: the shapes stacked at low opacity with growing round strokes."""
    # fill-opacity/stroke-opacity, not opacity: group opacity makes Chromium composite each copy in its own layer,
    # which shows as a faint rectangle (the layer's bounds) over the card's gradient
    return "".join(f'<path d="{d}" fill-opacity="{f(opacity)}" stroke-opacity="{f(opacity)}" stroke-width="{w}"{extra}/>' for w in widths for d in paths)

def build(key, style, anim=False):
    sc, st = SCHEMES[key], STYLE[style]
    D, GAP, CR = st["D"], st["GAP"], st["CR"]
    pre = f"gauge-{key}" + ("" if style == "3d" else f"-{style}")
    solid = style in SOLID
    defs, hulls, sides, strokes, fronts, overs, blocks = [], [], [], [], [], [], []
    for i, name in enumerate(sc["segs"]):
        c = SEG[name]; pcs = sector(i, GAP, CR); d = path_d(pcs); sw = sweep(pcs, D)
        sid, fid = f"{pre}-side{i}", f"{pre}-front{i}"
        core = CORE[name]
        side = c["side"] if style in ("3d", "clay") else [core, c["side"][1]] if style == "glass" else [c["side"][0], c["side"][1]]
        defs.append(lin(sid, [(0, side[0], None), (1, side[1], None)], 0, -r, 0, D, user=True))
        sides.append("".join(f'<path d="{x}" fill="url(#{sid})" stroke="url(#{sid})" stroke-width="1.5"/>' for x in [d] + sw))
        a1, a2 = 180 - 36 * i, 180 - 36 * (i + 1)
        if solid:  # each block casts its own soft shadow down-right onto the card
            blocks.append(layered([d, path_d([shift(q, D) for q in pcs])], 0.035 if style == "gloss" else 0.07, (64, 48, 32, 16, 0)))
        if style == "3d":
            # outline: the solid filled and stroked navy at 2T under everything (outer half shows: T);
            # the front stroked navy at 2T under its fill draws the seam to the side face and between segments
            hulls.append("".join(f'<path d="{x}"/>' for x in [d] + sw))
            strokes.append(f'<path d="{d}"/>')
            defs.append(rad(fid, [(r / R, c["front"][1], None), (0.72, c["front"][1], None), (1, c["front"][0], None)]))
            fronts.append(f'<path d="{d}" fill="url(#{fid})"/>')
            # highlight along the top edge, over the first two thirds of the segment (light from the upper left)
            hr = R - 30
            s0, s1 = P(hr, a1 - 4 - (36 - 8) * 0.12), P(hr, a1 - 4 - (36 - 8) * 0.66)
            overs.append(f'<path d="M{pt(s0)}A{f(hr)} {f(hr)} 0 0 1 {pt(s1)}" fill="none" stroke="{c["hi"]}" stroke-width="13" stroke-linecap="round"/>')
        elif style == "clay":
            # clay: a puffy body (deep core at the inner edge, base, bright band toward the outer rim, rolling off at
            # the rim), a soft light from the upper left, a core shade to the lower right, a soft highlight blob and a
            # small crisp specular spot; all gradients, per segment
            defs.append(rad(fid, [(r / R, core, None), (0.6, c["front"][1], None), (0.84, c["front"][0], None), (0.94, c["front"][0], None), (1, c["front"][1], None)]))
            fronts.append(f'<path d="{d}" fill="url(#{fid})"/>')
            defs.append(lin(f"{pre}-lit{i}", [(0, "#ffffff", 0.6), (0.2, "#ffffff", 0.32), (0.45, "#ffffff", 0)]))
            defs.append(lin(f"{pre}-shd{i}", [(0.45, core, 0), (0.75, core, 0.55), (1, c["side"][0], 0.85)]))
            ab, asp = a1 - 36 * 0.36, a1 - 36 * 0.27
            (bx, by), (sx, sy) = P(835, ab), P(890, asp)
            defs.append(rad(f"{pre}-blob{i}", [(o, "#ffffff", 0.8 * a) for o, a in BELL], 0.5, 0.5, 0.5, user=False))
            overs.append(f'<path d="{d}" fill="url(#{pre}-lit{i})"/><path d="{d}" fill="url(#{pre}-shd{i})"/>'
                         f'<ellipse cx="{f(bx)}" cy="{f(by)}" rx="150" ry="62" transform="rotate({f(90 - ab)} {f(bx)} {f(by)})" fill="url(#{pre}-blob{i})"/>'
                         f'<ellipse cx="{f(sx)}" cy="{f(sy)}" rx="26" ry="11" transform="rotate({f(90 - asp)} {f(sx)} {f(sy)})" fill="#ffffff" opacity=".92"/>')
        else:
            # glass and gloss: crisp faces by value inside the front (clipped to it): a lit bevel band along the top,
            # a darker facet along the inner edge, a darker same-hue band on the shadow (lower right) edges and a thin
            # bright rim on the lit (upper left) edges; glossy speculars on top
            cid = f"{pre}-clip{i}"
            band = lambda r0, r1: (f"M{pt(P(r1, a1 + 3))}A{f(r1)} {f(r1)} 0 0 1 {pt(P(r1, a2 - 3))}"
                                   f"L{pt(P(r0, a2 - 3))}A{f(r0)} {f(r0)} 0 0 0 {pt(P(r0, a1 + 3))}Z")
            mid = (a1 + a2) / 2
            defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
            defs.append(f'<linearGradient id="{pre}-bev{i}" x1="0" y1="{f(-R)}" x2="0" y2="{f(-R + 80)}" gradientUnits="userSpaceOnUse" '
                        f'gradientTransform="rotate({f(90 - mid)})"><stop offset="0" stop-color="{c["hi"]}"/><stop offset="1" stop-color="{c["front"][0]}"/></linearGradient>')
            defs.append(lin(f"{pre}-edge{i}", [(0.45, core, 0), (0.8, core, 0.75), (1, core, 0.95)]))
            if style == "glass":
                # slightly translucent front (the darker side colour shows through a little, like the card's glass)
                defs.append(rad(fid, [(r / R, c["front"][1], None), (0.8, c["front"][1], None), (0.94, c["front"][0], None), (1, c["front"][0], None)]))
                defs.append(lin(f"{pre}-rim{i}", [(0, "#ffffff", 0.9), (0.3, "#8fe0e0", 0.75), (0.55, "#8fe0e0", 0)]))
                # a glass sheen: a soft diagonal reflection across the upper left of the face
                defs.append(lin(f"{pre}-sheen{i}", [(0, "#ffffff", 0.32), (0.38, "#ffffff", 0.14), (0.4, "#ffffff", 0), (1, "#ffffff", 0)]))
                fronts.append(f'<path d="{d}" fill="url(#{fid})" fill-opacity=".88"/>')
                inner = (f'<path d="{band(R - 70, R + 10)}" fill="url(#{pre}-bev{i})" opacity=".9"/>'
                         f'<path d="{band(r - 10, r + 40)}" fill="{core}" opacity=".5"/>'
                         f'<path d="{d}" fill="url(#{pre}-sheen{i})"/>'
                         f'<path d="{d}" fill="none" stroke="url(#{pre}-edge{i})" stroke-width="24"/>'
                         f'<path d="{d}" fill="none" stroke="url(#{pre}-rim{i})" stroke-width="9"/>')
                spec_w, spec_o = 10, 0.85
            else:
                # gloss: rich saturated body (bright top to deep core), a bevel all round (a wide edge band, lit at the
                # upper left, dark at the lower right), a big hot specular streak and a soft sheen blob
                defs.append(rad(fid, [(r / R, core, None), (0.55, c["front"][1], None), (0.78, c["front"][1], None), (0.9, c["front"][0], None), (1, c["front"][0], None)]))
                defs.append(lin(f"{pre}-chamL{i}", [(0, "#ffffff", 0.75), (0.35, c["hi"], 0.55), (0.55, c["hi"], 0)]))
                defs.append(lin(f"{pre}-chamD{i}", [(0.4, core, 0), (0.7, core, 0.8), (1, c["side"][1], 0.95)]))
                defs.append(rad(f"{pre}-blob{i}", [(o, "#ffffff", 0.55 * a) for o, a in BELL], 0.5, 0.5, 0.5, user=False))
                fronts.append(f'<path d="{d}" fill="url(#{fid})"/>')
                ab = a1 - 36 * 0.4; bx, by = P(800, ab)
                inner = (f'<path d="{d}" fill="none" stroke="url(#{pre}-chamD{i})" stroke-width="60"/>'
                         f'<path d="{d}" fill="none" stroke="url(#{pre}-chamL{i})" stroke-width="48"/>'
                         f'<path d="{band(R - 62, R + 10)}" fill="url(#{pre}-bev{i})" opacity=".55"/>'
                         f'<ellipse cx="{f(bx)}" cy="{f(by)}" rx="170" ry="70" transform="rotate({f(90 - ab)} {f(bx)} {f(by)})" fill="url(#{pre}-blob{i})"/>')
                spec_w, spec_o = 16, 0.95
            sa, sb = a1 - 36 * 0.16, a1 - 36 * 0.5
            px_, py_ = P(R - 46, a1 - 36 * 0.64)
            overs.append(f'<g clip-path="url(#{cid})">{inner}</g>'
                         f'<path d="M{pt(P(R - 42, sa))}A{f(R - 42)} {f(R - 42)} 0 0 1 {pt(P(R - 42, sb))}" fill="none" stroke="#ffffff" stroke-opacity="{f(spec_o)}" stroke-width="{spec_w}" stroke-linecap="round"/>'
                         f'<ellipse cx="{f(px_)}" cy="{f(py_)}" rx="{f(spec_w * 0.9)}" ry="{f(spec_w * 0.55)}" transform="rotate({f(90 - (a1 - 36 * 0.64))} {f(px_)} {f(py_)})" fill="#ffffff" opacity="{f(spec_o)}"/>')
    n = NEEDLE[sc["needle"]]
    nl, nb, nt = (NL2, NB2, NT2) if solid else (NL, NB, NT)
    nd = needle_d(nl, nb, nt)
    if style == "3d":
        defs.append(lin(f"{pre}-needle", [(0, n["light"], None), (0.5, n["light"], None), (0.5, n["base"], None), (1, n["dark"], None)], -NB, 0, NB, 0, user=True))
        defs.append(rad(f"{pre}-pivot", [(0, "#ffffff", None), (0.55, "#eef7ff", None), (1, "#d9eeff", None)], -10, -10, PIV + 10))
        needle = (f'<path d="{nd}" fill="{NAVY}" stroke="{NAVY}" stroke-width="{f(2 * T)}" stroke-linejoin="round"/>'
                  f'<path d="{nd}" fill="url(#{pre}-needle)"/>'
                  f'<path d="M-6,-{NB + 20}L-4,-{NL - 40}" stroke="{n["hi"]}" stroke-width="9" stroke-linecap="round"/>')
        pivot = (f'<circle r="{f(PIV + T)}" fill="{NAVY}"/><circle r="{PIV}" fill="url(#{pre}-pivot)"/>'
                 f'<ellipse cx="-11" cy="-12" rx="10" ry="6" transform="rotate(-35 -11 -12)" fill="#ffffff"/>')
    else:
        under = f'<path d="{nd}" transform="translate(9 10)" fill="{n.get("under", n["dark"])}"/>'  # the needle's thick underside
        if style == "clay":
            defs.append(lin(f"{pre}-needle", [(0, n["hi"], None), (0.35, n["light"], None), (0.7, n["base"], None), (1, n["dark"], None)], -nb, 0, nb, 0, user=True))
            top = f'<path d="M-{f(nb * 0.42)},-{nb + 10}L-{f(nt * 0.4)},-{nl - 30}" stroke="#ffffff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round"/>'
        elif style == "glass":  # crisp two-tone blade with a bright rim on its lit edge
            defs.append(lin(f"{pre}-needle", [(0, n["light"], None), (0.5, n["light"], None), (0.5, n["base"], None), (1, n["dark"], None)], -nb, 0, nb, 0, user=True))
            defs.append(lin(f"{pre}-nrim", [(0, "#ffffff", 0.9), (0.45, "#9fe3f8", 0.6), (0.6, "#9fe3f8", 0)], -nb, 0, nb, 0, user=True))
            top = (f'<path d="{nd}" fill="none" stroke="url(#{pre}-nrim)" stroke-width="7"/>'
                   f'<path d="M-{f(nb * 0.42)},-{nb + 12}L-{f(nt * 0.4)},-{nl - 30}" stroke="#ffffff" stroke-opacity=".8" stroke-width="7" stroke-linecap="round"/>')
        else:  # gloss: smooth rounded blade, a hot white streak and a glint near the tip
            defs.append(lin(f"{pre}-needle", [(0, n["hi"], None), (0.25, n["light"], None), (0.6, n["base"], None), (1, n["dark"], None)], -nb, 0, nb, 0, user=True))
            top = "" if "pivot" in n else (f'<path d="M-{f(nb * 0.4)},-{nb + 6}L-{f(nt * 0.35)},-{nl - 26}" stroke="#ffffff" stroke-opacity=".95" stroke-width="12" stroke-linecap="round"/>'
                   f'<ellipse cx="{f(nb * 0.3)}" cy="-{f(nb * 0.15)}" rx="10" ry="18" fill="#ffffff" opacity=".5"/>')
        needle = under + f'<path d="{nd}" fill="url(#{pre}-needle)"/>' + top
        pc = n.get("pivot", ["#ffffff", "#eef7ff", "#d9eeff", "#a9d3ef"])
        defs.append(rad(f"{pre}-pivot", [(0, pc[0], None), (0.5, pc[1], None), (0.85, pc[2], None), (1, pc[3], None)], -10, -12, PIV + 14))
        pivot = (f'<circle cx="7" cy="9" r="{PIV}" fill="{n.get("pivotUnder", "#a9d3ef")}"/><circle r="{PIV}" fill="url(#{pre}-pivot)"/>'
                 f'<ellipse cx="-12" cy="-13" rx="10" ry="6" transform="rotate(-35 -12 -13)" fill="#ffffff"/>')
        # contact shadows: navy (dark teal is lighter than the card, so it would glow), bell fade, no blur:
        # one wide under the arch, one under each foot
        k = {"clay": 1, "glass": 1.1, "gloss": .7}[style]
        defs.append(rad(f"{pre}-shadow", [(o, NAVY, 0.55 * k * a) for o, a in BELL], 0.5, 0.5, 0.5, user=False))
        defs.append(rad(f"{pre}-foot", [(o, NAVY, min(.8, 0.6 * k) * a) for o, a in BELL], 0.5, 0.5, 0.5, user=False))
    # the needle's soft shadow, offset down-right in page space; it turns with the needle (animate both rotations together)
    nshadow = (f'<g data-k="needle-shadow" transform="translate(40 52) rotate({f(90 - NEEDLE_DEG)})" fill="{NAVY}" stroke="{NAVY}" stroke-linejoin="round">'
               + layered([nd], 0.04 if style == "gloss" else 0.07, (70, 56, 42, 28, 14, 0)) + "</g>") if solid else ""
    if anim:  # the shadow's offset sits on an outer group, so the inner one turns about the same pivot (0,0) as the needle
        nshadow = (f'<g transform="translate(40 52)"><g data-k="needle-shadow" transform="rotate({f(90 - NEEDLE_DEG)})" fill="{NAVY}" stroke="{NAVY}" stroke-linejoin="round">'
                   + layered([nd], 0.04 if style == "gloss" else 0.07, (70, 56, 42, 28, 14, 0)) + "</g></g>")
    shadow = (f'<ellipse cx="0" cy="{f(D + 10)}" rx="{f(SHADOW_RX)}" ry="{f(SHADOW_RY)}" fill="url(#{pre}-shadow)"/>'
              + "".join(f'<ellipse cx="{x}" cy="{f(D + 4)}" rx="360" ry="62" fill="url(#{pre}-foot)"/>' for x in (-750, 750))) if solid else ""
    ink = f'fill="{NAVY}" stroke="{NAVY}" stroke-width="{f(2 * T)}" stroke-linejoin="round" stroke-linecap="round"'
    body = (shadow
            + (f'<g transform="translate(16 26)" fill="{NAVY}" stroke="{NAVY}" stroke-linejoin="round">{"".join(blocks)}</g>' if blocks else "")
            + (f'<g {ink}>{"".join(hulls)}</g>' if hulls else "")
            + (segment_groups(sides, fronts, overs, pre) if anim else
               "".join(sides) + (f'<g {ink}>{"".join(strokes)}</g>' if strokes else "") + "".join(fronts) + "".join(overs))
            + nshadow
            # the needle is drawn pointing up and turned about the pivot (0,0); animate this group's rotation
            + f'<g data-k="needle" data-pivot="0 0" transform="rotate({f(90 - NEEDLE_DEG)})">{needle}</g>'
            + f'<g data-k="pivot">{pivot}</g>')
    vb = VB_SOLID if solid else VB
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f(v) for v in vb)}" width="{f(vb[2])}" height="{f(vb[3])}">'
           f'<defs>{"".join(defs)}</defs>{body}</svg>')
    assert "filter" not in svg and "Blur" not in svg and "<image" not in svg
    ids = [x.split('"')[0] for x in svg.split(' id="')[1:]]
    assert len(ids) == len(set(ids)) and all(i.startswith(pre + "-") for i in ids), ids
    if anim: return svg
    open(f"{OUT}/{pre}.svg", "w").write(svg)
    return pre

def glint_d(i):
    """The top specular streak of segment i (the same arc the gloss style draws), for the sliding glint."""
    a1 = 180 - 36 * i; sa, sb = a1 - 36 * 0.16, a1 - 36 * 0.5
    return f"M{pt(P(R - 42, sa))}A{f(R - 42)} {f(R - 42)} 0 0 1 {pt(P(R - 42, sb))}"

def segment_groups(sides, fronts, overs, pre):
    # one group per segment (side, front, highlights) so each can pop about its own centre; its glint rides on top
    return "".join(f'<g data-k="seg{i}">{sides[i]}{fronts[i]}{overs[i]}'
                   f'<g data-k="glint{i}" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round">'  # a soft glint: a faint wide glow under a brighter core
                   f'<path d="{glint_d(i)}" stroke-width="40" stroke-opacity=".3"/><path d="{glint_d(i)}" stroke-width="18" stroke-opacity=".75"/></g></g>'
                   for i in range(N))

def export_anim(key="B", style="gloss"):
    """gauge-anim.svg: the picked art (B, glossy 3D) with data-k groups for everything that moves: needle and
    needle-shadow (both turn about (0,0)), seg0..seg4 (each pops about its centre) and glint0..glint4.
    Ids keep their gauge-B-gloss- prefix; the component prefixes them again per instance."""
    import re
    svg = build(key, style, anim=True)
    # lean: one decimal is plenty at this size (paths, positions, transforms, gradient ends)
    svg = re.sub(r'(\s(?:d|points|transform|cx|cy|x1|y1|x2|y2)=")([^"]*)"',
                 lambda m: m.group(1) + re.sub(r"-?\d+\.\d{2,}", lambda n: f(round(float(n.group(0)), 1)), m.group(2)) + '"', svg)
    assert all(f'data-k="{k}"' in svg for k in ["needle", "needle-shadow", "pivot", *[f"seg{i}" for i in range(N)], *[f"glint{i}" for i in range(N)]])
    open(f"{OUT}/gauge-anim.svg", "w").write(svg)
    return svg

if __name__ == "__main__":
    print([build(k, s) for k in SCHEMES for s in ("3d", *SOLID)], "T =", T)
    anim = export_anim()
    # the Framer component: the template with the art (everything inside <svg>) pasted in
    inner = anim[anim.index(">") + 1:anim.rindex("</svg>")]
    assert "`" not in inner and "${" not in inner
    tsx = open(f"{OUT}/ATMGauge.template.tsx").read().replace("__ART__", inner)
    open(os.path.join(OUT, "..", "..", "..", "ATMGauge.tsx"), "w").write(tsx)
    print("anim", len(anim), "bytes; wrote ATM/ATMGauge.tsx")
