# Savings jar: cleans and recolours the stock jar (pdftocairo -svg of the .ai, 672 paths) into brand palettes.
#   python3 build.py <src.svg>   ->  savings-jar-{A,B}.svg (3D outlined) and savings-jar-{A,B}-gloss.svg (glossy 3D)
# Every source path gets a role from its colour family and where it sits (stack, jar, lid, falling coin, arrow);
# an assert checks that every path has one. Each role maps the source lightness onto a brand ramp, so the art's
# shading survives but every colour is a brand colour or a tint/shade of one.
import re, sys, os, colorsys
SRC = sys.argv[1] if len(sys.argv) > 1 else "p2.svg"
OUT = os.path.dirname(os.path.abspath(__file__))
SLUG = "savings-jar"
src = open(SRC).read()
PATHS = re.findall(r'<path[^>]*fill="rgb\(([^)]*)\)"[^>]*d="([^"]*)"', src)
assert len(PATHS) == 672, len(PATHS)

NAVY, MID, TEAL, DTEAL, LTEAL, LBLUE, SKY = "#002c44", "#11232d", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#00acdd"
YOLK, ORANGE, AMBER, GLACIER, MINT, WHITE = "#ffcc40", "#f6a11d", "#e08a12", "#d9eeff", "#bce2d7", "#ffffff"
YOLK_T, YOLK_TT = "#ffe07a", "#fff0b8"
SKY_T, SKY_TT, SKY_S = "#5fd0f2", "#9fe3f8", "#0094c6"
MINT_T, MINT_S, MINT_SS = "#d6f0e8", "#8fd3c0", "#5fbfa6"
GLACIER_T, GLACIER_S, GLACIER_SS = "#eef7ff", "#a9d3ef", "#7fb9e3"
LTEAL_T, LTEAL_TT = "#8fe0e0", "#c9f0ef"

# ---------- geometry ----------
def nums(d): n = list(map(float, re.findall(r'-?[\d.]+', d))); return n[0::2], n[1::2]
def bbox(d): xs, ys = nums(d); return min(xs), min(ys), max(xs), max(ys)
def subpaths(d): return [t.strip() for t in re.split(r'(?=M )', d) if t.strip()]
def closed(d): return " ".join(t if t.rstrip().endswith("Z") else t + " Z" for t in subpaths(d))  # every subpath ends in Z
def outer(d):  # the subpath with the biggest box: the object's outside contour
    return max(subpaths(d), key=lambda t: (lambda b: (b[2] - b[0]) * (b[3] - b[1]))(bbox(t)))

# ---------- roles ----------
def hls(c):
    r, g, b = [float(x.strip("% ")) / 100 for x in c.split(",")]
    h, l, s = colorsys.rgb_to_hls(r, g, b); return h * 360, l, s
FALLING = {4, 220, 221, 226, *range(227, 244), 313, 314, 315, *range(346, 353), 600, 601}
ARROW = {3, 216, 217, 218, 311}
def obj_of(i, d):
    x0, y0, x1, y1 = bbox(d)
    if i in ARROW: return "arrow"
    if i in FALLING: return "coin"
    if x0 >= 2370: return "stack"
    h, l, s = hls(PATHS[i][0])
    if y1 < 960 and (s < 0.25 or l > 0.95) and not 40 < h < 130: return "lid"
    return "jar"
def role_of(i):
    c, d = PATHS[i]; h, l, s = hls(c); o = obj_of(i, d)
    if l < 0.30 or (l < 0.40 and o != "arrow" and not (160 <= h <= 185 and s > 0.4)): return o, "line"  # traced outlines
    if o == "arrow": return o, ("white" if l > 0.9 else "arrow")
    if o == "lid": return o, "lid"
    if o == "jar" and 150 <= h <= 190 and s > 0.25: return o, "glass"
    if 12 <= h <= 62: return o, ("goldGlass" if s < 0.55 else "gold")  # coins; low saturation = under a glass highlight
    if 60 < h < 135 and o == "jar": return o, "goldNeck"  # coin seen through the dark glass shoulder
    raise ValueError(i)
ROLES = [role_of(i) for i in range(672)]
assert all(r for r in ROLES)
# object contours (outer subpath of each traced silhouette), back to front
CONTOURS = [("stack", outer(PATHS[0][1])), ("stackTop", outer(PATHS[5][1])), ("jar", outer(PATHS[1][1])),
            ("lid", outer(PATHS[2][1])), ("coin", outer(PATHS[4][1])), ("arrow", outer(PATHS[3][1]))]

# ---------- colour ----------
def rgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]
def hexc(c): return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in c)
def mix(a, b, t): return hexc([x + (y - x) * t for x, y in zip(rgb(a), rgb(b))])
def ramp(stops, l):
    if l <= stops[0][0]: return stops[0][1]
    for (l0, c0), (l1, c1) in zip(stops, stops[1:]):
        if l <= l1: return mix(c0, c1, (l - l0) / (l1 - l0))
    return stops[-1][1]
GOLD = [(0.40, AMBER), (0.52, ORANGE), (0.60, YOLK), (0.67, YOLK_T), (0.77, YOLK_TT)]
SCHEMES = {
    "A": dict(  # glacier glass, light-teal lid, sky arrow
        glass=[(0.26, GLACIER_SS), (0.36, GLACIER_S), (0.52, GLACIER), (0.72, GLACIER_T), (0.9, WHITE)],
        lid=[(0.38, TEAL), (0.50, LTEAL), (0.68, LTEAL_T), (0.86, LTEAL_TT), (0.97, WHITE)],
        arrow=[(0.30, SKY_S), (0.40, SKY), (0.50, SKY_T)],
        edge=dict(gold=AMBER, glass=GLACIER_SS, lid=TEAL, arrow=SKY_S)),
    "B": dict(  # sky glass (cart version 2's basket), teal lid (its handle and wheels), mint arrow
        glass=[(0.26, LBLUE), (0.36, SKY_S), (0.52, SKY), (0.72, SKY_T), (0.9, SKY_TT)],
        lid=[(0.38, DTEAL), (0.50, TEAL), (0.68, LTEAL), (0.86, LTEAL_T), (0.97, LTEAL_TT)],
        arrow=[(0.30, MINT_SS), (0.40, MINT_S), (0.50, MINT)],
        edge=dict(gold=AMBER, glass=SKY_S, lid=DTEAL, arrow=MINT_SS)),
}
def colour(i, sc, dl=0.0):
    """Brand colour for path i; dl shifts the source lightness (tint > 0, shade < 0) inside the same ramp."""
    c, _ = PATHS[i]; h, l, s = hls(c); o, r = ROLES[i]; l += dl
    if r == "gold": return ramp(GOLD, l)
    if r == "goldGlass": return mix(ramp(GOLD, l + 0.04), WHITE, 0.4)  # a pale yolk: the coin seen through a glass highlight
    if r == "goldNeck": return mix(ramp(GOLD, l + 0.22), ramp(sc["glass"], 0.8), 0.3)
    if r == "glass": return ramp(sc["glass"], l)
    if r == "lid": return ramp(sc["lid"], l)
    if r == "arrow": return ramp(sc["arrow"], l)
    if r == "white": return WHITE
    raise ValueError(r)
def edge_of(i, sc):  # glossy: a traced line becomes a soft darker edge in its own hue
    h, l, s = hls(PATHS[i][0]); o = ROLES[i][0]
    if o == "arrow": return sc["edge"]["arrow"]
    if o == "lid" or (150 <= h <= 190 and s < 0.3): return sc["edge"]["lid"]
    if 150 <= h <= 190: return sc["edge"]["glass"]
    return sc["edge"]["gold"]

# ---------- build ----------
ART = (901, 46, 3112, 2459)
W, H = ART[2] - ART[0], ART[3] - ART[1]
PX, PY = round(W * 0.04), round(H * 0.04)
VB = (ART[0] - PX, ART[1] - PY, W + 2 * PX, H + 2 * PY)
K = W / 2120  # drawing units per playbook unit
T = 19 * K  # visible outline, 19 at 2120 wide
BIG = 2500  # bbox area above which a shape is a face and gets a gradient

def build(key):
    """3D outlined: the source layout, navy outline even at T."""
    sc = SCHEMES[key]; pre = f"{SLUG}-{key}"
    defs, grads = [], {}
    def grad(c, tint, shade):
        k = (c, tint, shade)
        if k not in grads:
            gid = f"{pre}-g{len(grads)}"; grads[k] = gid
            # lit top, base, a touch of shade at the bottom
            defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2=".45" y2="1">'
                        f'<stop offset="0" stop-color="{tint}"/><stop offset=".6" stop-color="{c}"/>'
                        f'<stop offset="1" stop-color="{shade}"/></linearGradient>')
        return f"url(#{grads[k]})"
    body, fills = [], {}
    for i, (c, d) in enumerate(PATHS):
        o, r = ROLES[i]
        if r == "line":
            fill = NAVY
        else:
            x0, y0, x1, y1 = bbox(d); base = colour(i, sc)
            if (x1 - x0) * (y1 - y0) > BIG:
                fill = grad(base, colour(i, sc, 0.07), colour(i, sc, -0.05))
            else:
                fill = base
        if r != "line": fills[i] = fill
        cut = f' mask="url(#{pre}-cut)"' if o == "stack" else ""
        body.append(f'<path d="{closed(d)}" fill="{fill}"{cut}/>')
    # Outline: each object's contour gets one even band on top: an outer ring (half of a 2*OUT stroke) and an inner
    # band (half of a 2*IN stroke clipped to the contour) that covers the traced band, whose width varies.
    # Objects in front mask the bands of those behind.
    top = []
    for n, C in CONTOURS:
        defs.append(f'<clipPath id="{pre}-c-{n}"><path d="{closed(C)}"/></clipPath>')
    # The traced stack stops short of the arrow with ragged line ends. Cut it along one clean line CUT past the arrow's
    # contour, and give that cut its own even edge band [CUT, CUT + T]; the stack's own bands stay out of it.
    A = closed(dict(CONTOURS)["arrow"]); edge = NAVY
    band = T
    def cut_mask(mid, r):
        defs.append(f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}">'
                    f'<rect x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}" fill="#fff"/>'
                    f'<path d="{A}" fill="#000" stroke="#000" stroke-width="{2 * r:.1f}" stroke-linejoin="round"/></mask>')
    cut_mask(f"{pre}-cut", CUT); cut_mask(f"{pre}-cutband", CUT + band)
    # clipped to the stack's outline and paint, so the edge band lies only on the stack
    defs.append(f'<clipPath id="{pre}-stackclip">' + "".join(f'<path d="{closed(d)}"/>' for i, (c, d) in enumerate(PATHS) if ROLES[i][0] == "stack")
                + "".join(f'<path d="{closed(c)}"/>' for n, c in CONTOURS if n.startswith("stack")) + '</clipPath>')
    stack_edge = (f'<g clip-path="url(#{pre}-stackclip)"><g mask="url(#{pre}-cut)"><path d="{A}" fill="none" stroke="{edge}" '
                  f'stroke-width="{2 * (CUT + band):.1f}" stroke-linejoin="round"/></g></g>')
    for k, (n, C) in enumerate(CONTOURS):
        o_w, i_w = WIDTHS.get(n, (OUT_W, IN_W))
        if n == "jar": top.append(stack_edge)
        front = [c for _, c in CONTOURS[k + 1:]]
        mask = ""
        if front:
            defs.append(f'<mask id="{pre}-m-{n}" maskUnits="userSpaceOnUse" x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}">'
                        f'<rect x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}" fill="#fff"/>'
                        + "".join(f'<path d="{closed(c)}" fill="#000"/>' for c in front) + '</mask>')
            mask = f' mask="url(#{pre}-m-{n})"'
        line = NAVY
        if n.startswith("stack"): mask = f' mask="url(#{pre}-cutband)"'
        if n in COVERED:
            # The traced outline here is wider than the inner band, so the faces next to it are grown by GROW (each
            # stroked in its own fill) inside a ring along the contour; the band then reads one even width.
            defs.append(f'<mask id="{pre}-ring-{n}" maskUnits="userSpaceOnUse" x="{VB[0]}" y="{VB[1]}" width="{VB[2]}" height="{VB[3]}">'
                        f'<path d="{closed(C)}" fill="none" stroke="#fff" stroke-width="{2 * RING:.1f}"/></mask>')
            grown = "".join(f'<path d="{closed(PATHS[i][1])}" fill="{f}" stroke="{f}" stroke-width="{2 * GROW:.1f}" stroke-linejoin="round"/>'
                            for i, f in fills.items() if ROLES[i][0] == COVERED[n] and i not in NO_GROW and (lambda b: (b[2] - b[0]) * (b[3] - b[1]))(bbox(PATHS[i][1])) > BIG)
            top.append(f'<g{mask}><g clip-path="url(#{pre}-c-{n})"><g mask="url(#{pre}-ring-{n})">{grown}</g></g></g>')
        top.append(f'<g{mask} fill="none" stroke="{line}" stroke-linejoin="round" stroke-linecap="round">'
                   f'<path d="{closed(C)}" stroke-width="{2 * o_w:.1f}"/>'
                   f'<path d="{closed(C)}" stroke-width="{2 * i_w:.1f}" clip-path="url(#{pre}-c-{n})"/></g>')
    under = ""
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, VB))}" width="{VB[2]}" height="{VB[3]}">'
           f'<defs>{"".join(defs)}</defs>{under}{"".join(body)}{"".join(top)}</svg>')
    assert "<filter" not in svg and "Blur" not in svg and "<image" not in svg
    name = f"{SLUG}-{key}.svg"
    open(os.path.join(OUT, name), "w").write(svg)
    return name

OUT_W, IN_W = 6 * K, 14 * K  # 3D: outer ring + inner band = 20 at 2120 wide
COVERED = dict(jar="jar", lid="lid", arrow="arrow")  # contours whose traced band is wider than the inner band -> their object
NO_GROW = {311}  # the arrow's front face sits inside its white border, away from the outline
WIDTHS = dict(stack=(0, T), stackTop=(0, T))  # the stack's traced band is up to 23 wide: one inner band covers it
CUT = 44 * K  # where the stack is cut along the arrow, just past the ragged ends of the source's gap
RING, GROW = 30 * K, 14 * K  # the ring along the contour where faces are grown, and by how much

# ======================================================================================================
# Glossy 3D, no outline. The jar, lid and arrow come from the source (recoloured); every coin is
# redrawn as a clean ellipse coin with a drawn $, laid out so no two parts touch: the falling coin clears the lid,
# the coins in the jar sit apart (two short stacks and three loose coins), the stack stands on its own with
# visible seams, and the arrow stands clear to its right. Each part gets its own shadow. Gradients only.
# ======================================================================================================
DEEP_GOLD = "#cf7a0c"  # an amber shade, the deepest coin tone (still orange, never brown)
CORE = dict(A=dict(glass="#5c9fd4", lid=TEAL, arrow=LBLUE, glassShadow="#5c9fd4"),
            B=dict(glass=SKY_S, lid=DTEAL, arrow="#3fa58c", glassShadow=SKY_S))
GLOSS = dict(shadow=.45, glass=.86,  # designer: softer shadows
             tint=.14, shade=-.12, band=(0, 12), rim=.95)  # contact shadow and glass opacity,
# face tint/shade steps (source lightness), edge band (out, in), rim highlight
GLOSS_ARROW = dict(arrow=[(0.30, SKY_S), (0.40, SKY), (0.50, SKY_T)])  # both schemes take scheme A's sky arrow
COIN_TH = .32  # coin thickness x radius, as flat as the outlined art's coins
STACK = dict(cx=2865,  # moved right with the taller arrow (was 2665)
              bottom=2459, r=245, k=.36, n=19, jitter=(0, 14, -10, 18, 4, -12, 12, -4))  # base on the jar's base line (y 2459), top level with the lid
R_JAR = 190
# The jar's coins, back to front. Stacks: cx, bottom, coins. Loose coins: cx, cy, rotation, tilt (ry / r).
JAR_BACK = [(1230, 2235, 4), (1640, 2235, 5), (2040, 2235, 3)]
JAR_TOP = [(1650, 1215, -8, .62)]  # one whole coin high in the jar, clear of the shoulder
JAR_MID = [(1450, 1500, -18, .62), (1930, 1420, 24, .62)]  # a few loose coins higher up
JAR_REST = [(1235, 1735, -16, .6), (2025, 1830, 20, .6)]  # tilted, resting on the back stacks
JAR_FRONT = [(1410, 2355, 2), (1880, 2355, 3)]
JAR_LEAN = [(1200, 2080, 72, .5), (2085, 2065, -72, .5)]  # leaning on the glass, left and right
FALL = (1600, 150, -16, .8)
SPACED_ART = (901, -45, 3135, 2490)
DOLLAR = ("M .30,-.30 C .22,-.44 -.30,-.44 -.30,-.18 C -.30,.02 .30,-.02 .30,.20 C .30,.44 -.24,.44 -.32,.28 "
          "M 0,-.54 V -.40 M 0,.40 V .54")

def flatten(d, n=8):
    """Points along one subpath of absolute M/L/C/Z commands."""
    toks = re.findall(r'[MLCZ]|-?[\d.]+', d); pts, i, cmd = [], 0, None
    while i < len(toks):
        if toks[i] in "MLCZ": cmd = toks[i]; i += 1; continue
        if cmd in "ML":
            x, y = float(toks[i]), float(toks[i + 1]); i += 2
            if cmd == "L" and pts:  # straight runs get points too, so every column is sampled
                (x0, y0) = pts[-1]; m = max(1, int(max(abs(x - x0), abs(y - y0)) / 4))
                pts += [(x0 + (x - x0) * k / m, y0 + (y - y0) * k / m) for k in range(1, m)]
            pts.append((x, y))
        elif cmd == "C":
            (x0, y0), (x1, y1, x2, y2, x3, y3) = pts[-1], map(float, toks[i:i + 6]); i += 6
            for k in range(1, n + 1):
                t = k / n; u = 1 - t
                pts.append((u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3, u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3))
        else: i += 1
    return pts
def fit_ellipse(pts):  # axis-aligned least squares: A x^2 + B y^2 + C x + D y = 1
    import numpy as np
    P = np.array(pts); x, y = P[:, 0], P[:, 1]
    A, B, C, D = np.linalg.lstsq(np.c_[x * x, y * y, x, y], np.ones(len(x)), rcond=None)[0]
    cx, cy = -C / (2 * A), -D / (2 * B); g = 1 + A * cx * cx + B * cy * cy
    return cx, cy, (g / A) ** .5, (g / B) ** .5
# The falling coin hid part of the lid's top; once the coin moves up, the lid's top is redrawn whole from clean
# ellipses taken from the traced rings' boxes (a traced ring's box is its ellipse's box): the white rim (210), the
# recess floor (219), and the recess's back wall, seen as a crescent whose top edge is the dark groove (224, 225).
def box_ellipse(*ix):
    b = [bbox(outer(PATHS[i][1])) for i in ix]
    x0, y0, x1, y1 = min(v[0] for v in b), min(v[1] for v in b), max(v[2] for v in b), max(v[3] for v in b)
    return (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
RIM_E, TOP_E = box_ellipse(210), box_ellipse(219)
LID_TOP_PIECES = {210, 219, 222, 223, 224, 225, 312}  # the traced top pieces, cut where the coin was: never grown
_wx0, _wy0, _wx1, _ = (lambda b: (min(v[0] for v in b), min(v[1] for v in b), max(v[2] for v in b), 0))([bbox(PATHS[i][1]) for i in (224, 225)])
_wry = TOP_E[3] * (_wx1 - _wx0) / 2 / TOP_E[2]  # the wall's top edge: the floor's ellipse, as wide as the groove
WALL_E = (TOP_E[0], _wy0 + _wry, (_wx1 - _wx0) / 2, _wry)
_lid = flatten(outer(PATHS[2][1]), 48)  # the lid's traced outline is open (a C) where the coin covered its rim
_out = RIM_E[1] - RIM_E[3] - min(y for x, y in _lid)  # the outline's width above the rim
LID_E = (RIM_E[0], RIM_E[1], RIM_E[2] + _out, RIM_E[3] + _out)
# the lid's whole outline: the fitted top arc, then the traced sides and bottom
import math
_cx, _cy, _rx, _ry = LID_E
_up = [(_cx + _rx * math.cos(t), _cy - _ry * math.sin(t)) for t in [math.pi - k * math.pi / 120 for k in range(121)]]
_far = {}  # the farthest traced point per half-degree below the centre line: the outer sides and bottom
for x, y in _lid:
    if y > _cy:
        a_ = int(math.degrees(math.atan2(y - _cy, x - _cx)) * 2); d_ = math.hypot(x - _cx, y - _cy)
        if d_ > _far.get(a_, (0,))[0]: _far[a_] = (d_, x, y)
_f = [v for _, v in sorted(_far.items())]
_low = [(x, y) for k, (d_, x, y) in enumerate(_f)  # a bin that only caught the inner rim is a dent: skip it
        if d_ > .9 * max(_f[max(k - 1, 0)][0], _f[min(k + 1, len(_f) - 1)][0])]
LID_CONTOUR = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in _up + _low) + " Z"
assert 620 < LID_E[2] < 680 and 400 < LID_E[1] - LID_E[3] < 415 and RIM_E[3] > WALL_E[3] > 80, (LID_E, WALL_E)

# The neck and shoulder are redrawn whole: the traced bands were cut around an old coin and broken into pieces.
# Each band is a closed crescent between two arcs of one family (lower arcs of ellipses, symmetric about the jar's
# axis, sagging like the traced dark neck ring 215: lowest mid-jar, rising ~115 by the neck's sides), clipped to the
# jar so the ends tuck under its edge.
NECK_DROP = {191, 192, 195, 197, 199, 201, 214, 215, 252, 253, 278,
             1, 250}  # and the traced outline ring and right-side shade line, which kinked at the shoulders
NECK_CX, NECK_W, NECK_RY = 1625.5, 640, 173
# The jar's traced outline is open across the neck (the lid hid it), so its glass is that outline plus the neck
# (between the neck's sides, x 1030-2220 at y 860-900, down into the body), as one path wound the same way.
_jc = flatten(outer(PATHS[1][1]), 8)
_cw = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(_jc, _jc[1:] + _jc[:1])) > 0
JAR_GLASS = closed(outer(PATHS[1][1])) + (" M 1030,820 L 2220,820 L 2220,1100 L 1030,1100 Z" if _cw else " M 1030,820 L 1030,1100 L 2220,1100 L 2220,820 Z")
NECK_N = 96  # points per arc (the animated export uses fewer)
def neck_arc(ymid, ry=NECK_RY, n=None):
    n = n or NECK_N
    top = ymid - ry
    return [(NECK_CX - NECK_W + 2 * NECK_W * k / n, top + ry * max(0.0, 1 - ((2 * k / n - 1)) ** 2) ** .5) for k in range(n + 1)]
def neck_band(y0, y1, lens=False):  # between the arcs through y0 and y1 mid-jar; a lens when its ends meet
    upper, lower = neck_arc(y0), neck_arc(y1, NECK_RY + (y1 - y0) if lens else NECK_RY)
    return "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in upper + lower[::-1]) + " Z"
GLASS_DROP = {190, 248, 251}  # the big glass layers were traced around the old coins; one clean base fill replaces them

# The arrow: scaled uniformly to the height the 8-coin stack had (929.6), centred on the gap between the jar (right
# edge 2349) and the stack (left edge 2408), standing on the stack's ground line, in front of everything.
ARROW_BOX = bbox(outer(PATHS[3][1]))
_stack8 = STACK["r"] * COIN_TH + 2 * STACK["r"] * STACK["k"] + 7 * (STACK["r"] * COIN_TH + 18)
ARROW_S = _stack8 / (ARROW_BOX[3] - ARROW_BOX[1])
ARROW_AT = ((2349 + STACK["cx"] - STACK["r"] + min(STACK["jitter"])) / 2, STACK["bottom"])
ARROW_T = (f"translate({ARROW_AT[0]:.1f} {ARROW_AT[1]}) scale({ARROW_S:.4f}) "
           f"translate({-(ARROW_BOX[0] + ARROW_BOX[2]) / 2:.1f} {-ARROW_BOX[3]:.1f})")
assert abs(_stack8 - 929.6) < 1, _stack8

# The arrow, rebuilt as one clean solid: the front face is the traced white border's outer outline simplified to its
# 7 corners; the back face is that polygon moved by the depth vector (taken from the traced side faces 217 and 218);
# each edge's side face is the closed quad between the two. Size and place as before: the solid's height = 929.6.
def _rdp(pts, eps):
    if len(pts) < 3: return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]; L = math.hypot(x1 - x0, y1 - y0) or 1
    d = [abs((x1 - x0) * (y0 - y) - (x0 - x) * (y1 - y0)) / L for x, y in pts]
    i = max(range(len(pts)), key=lambda k: d[k])
    return _rdp(pts[:i + 1], eps)[:-1] + _rdp(pts[i:], eps) if d[i] > eps else [pts[0], pts[-1]]
_fp = flatten(outer(PATHS[216][1]), 16)
_j = max(range(len(_fp)), key=lambda k: math.hypot(_fp[k][0] - _fp[0][0], _fp[k][1] - _fp[0][1]))
FRONT = _rdp(_fp[:_j + 1], 6)[:-1] + _rdp(_fp[_j:] + [_fp[0]], 6)[:-1]
assert len(FRONT) == 7, FRONT
DEPTH = (-60, -33)  # 217 runs (-61, -34) from front to back, 218 (-52, -29)
_solid = FRONT + [(x + DEPTH[0], y + DEPTH[1]) for x, y in FRONT]
SOLID_BOX = (min(x for x, y in _solid), min(y for x, y in _solid), max(x for x, y in _solid), max(y for x, y in _solid))
ARROW_S = _stack8 / (SOLID_BOX[3] - SOLID_BOX[1])
ARROW_T = (f"translate({ARROW_AT[0]:.1f} {ARROW_AT[1]}) scale({ARROW_S:.4f}) "
           f"translate({-(SOLID_BOX[0] + SOLID_BOX[2]) / 2:.1f} {-SOLID_BOX[3]:.1f})")

def build_gloss(key, anim=False):
    sc, st, core = dict(SCHEMES[key], **GLOSS_ARROW), GLOSS, dict(CORE[key], arrow=LBLUE)
    sc["edge"] = dict(sc["edge"], arrow=SKY_S)
    pre = f"{SLUG}-{key}-gloss"
    defs, n_id = [], [0]
    def nid(tag): n_id[0] += 1; return f"{pre}-{tag}{n_id[0]}"
    def lin(stops, x1=0, y1=0, x2=1, y2=1, units=""):
        gid = nid("l"); u = f' gradientUnits="userSpaceOnUse"' if units else ""
        defs.append(f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{u}>' + "".join(
            f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else "") + "/>" for o, c, a in stops) + "</linearGradient>")
        return f"url(#{gid})"
    def rad(stops, cx=.5, cy=.5, r=.5, fx=None, fy=None):
        gid = nid("r"); f = f' fx="{fx}" fy="{fy}"' if fx is not None else ""
        defs.append(f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="{r}"{f}>' + "".join(
            f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a != 1 else "") + "/>" for o, c, a in stops) + "</radialGradient>")
        return f"url(#{gid})"
    def fade(c, a, mid=.5):  # bell-shaped fall-off, no visible rim
        return rad([(0, c, a), (mid * .5, c, round(a * .8, 3)), (mid, c, round(a * .45, 3)), (.75, c, round(a * .15, 3)), (.9, c, round(a * .04, 3)), (1, c, 0)])
    VBs = (SPACED_ART[0] - round((SPACED_ART[2] - SPACED_ART[0]) * .04), SPACED_ART[1] - round((SPACED_ART[3] - SPACED_ART[1]) * .04))
    VBs = VBs + (SPACED_ART[2] - VBs[0] + round((SPACED_ART[2] - SPACED_ART[0]) * .04), SPACED_ART[3] - VBs[1] + round((SPACED_ART[3] - SPACED_ART[1]) * .04))
    def full_mask(inner):
        mid = nid("m")
        defs.append(f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="{VBs[0] - 500}" y="{VBs[1] - 500}" width="{VBs[2] + 1000}" height="{VBs[3] + 1000}">{inner}</mask>')
        return f'url(#{mid})'

    # ---- face fills for source paths ----
    face_cache = {}
    def face(base, tint, shade):
        k = (base, tint, shade)
        if k not in face_cache:
            # a lit top, a reflection band, a deep base
            face_cache[k] = lin([(0, mix(tint, WHITE, .3), 1), (.3, base, 1), (.45, tint, 1), (.7, base, 1), (1, shade, 1)], 0, 0, .35, 1)
        return face_cache[k]
    def paint(i):
        o, r = ROLES[i]
        if r == "line": return edge_of(i, sc)
        x0, y0, x1, y1 = bbox(PATHS[i][1]); base = colour(i, sc)
        if (x1 - x0) * (y1 - y0) > BIG: return face(base, colour(i, sc, st["tint"]), colour(i, sc, st["shade"]))
        return base

    def jar_coin_path(i):  # the source's coins in the jar (redrawn below)
        o, r = ROLES[i]; h, l, s_ = hls(PATHS[i][0])
        small = (lambda b: (b[2] - b[0]) * (b[3] - b[1]))(bbox(PATHS[i][1])) < 30000
        return o == "jar" and (r in ("gold", "goldGlass", "goldNeck") or (r == "line" and (small or not 150 <= h <= 190)))

    # ---- one coin, drawn in its own frame: face ellipse at 0,0, thickness down the local y axis ----
    def coin(cx, cy, r, k, rot, shadow=None):
        ry, th = r * k, r * COIN_TH
        band = f"M {-r},0 L {-r},{th:.1f} A {r},{ry:.1f} 0 0 0 {r},{th:.1f} L {r},0 A {r},{ry:.1f} 0 0 1 {-r},0 Z"
        out = [f'<g transform="translate({cx:.1f} {cy:.1f}) rotate({rot})">']
        if shadow:  # a soft shadow behind the coin, down and to the right
            out.append(f'<ellipse cx="{r * .08:.1f}" cy="{th * .5 + ry * .35 + 16:.1f}" rx="{r * 1.12:.1f}" ry="{(ry + th) * .85:.1f}" fill="{fade(shadow, .38)}"/>')
        # a thick metal edge with reflections, a bevelled face, a raised $
        out += [f'<path d="{band}" fill="{lin([(0, AMBER, 1), (.1, YOLK_T, 1), (.25, ORANGE, 1), (.42, YOLK_TT, 1), (.55, ORANGE, 1), (.8, AMBER, 1), (1, DEEP_GOLD, 1)], 0, 0, 1, 0)}"/>',
                f'<path d="{band}" fill="{lin([(0, WHITE, 0), (.15, WHITE, .35), (.3, WHITE, 0), (1, WHITE, 0)], 0, 0, 0, 1)}"/>',
                f'<ellipse rx="{r}" ry="{ry:.1f}" fill="{lin([(0, YOLK_TT, 1), (.35, YOLK, 1), (.7, ORANGE, 1), (1, AMBER, 1)])}"/>',
                f'<ellipse rx="{r * .84:.1f}" ry="{ry * .84:.1f}" fill="{lin([(0, AMBER, 1), (.4, ORANGE, 1), (.75, YOLK, 1), (1, YOLK_TT, 1)])}"/>',
                f'<ellipse rx="{r * .78:.1f}" ry="{ry * .78:.1f}" fill="{rad([(0, YOLK_T, 1), (.6, YOLK, 1), (1, ORANGE, 1)], cx=.4, cy=.35, r=.8)}"/>']
        # the $: one clean drawn path, squashed with the face; raised (a deep copy down-right, the light glyph, a white lip)
        out.append(f'<g transform="scale(1 {k}) scale({r * .75:.1f})" fill="none" stroke-linecap="round" stroke-linejoin="round">'
                   f'<path d="{DOLLAR}" stroke="{DEEP_GOLD}" stroke-width=".13" transform="translate(.035 .045)"/>'
                   f'<path d="{DOLLAR}" stroke="{YOLK_T}" stroke-width=".13"/>'
                   f'<path d="{DOLLAR}" stroke="{WHITE}" stroke-opacity=".7" stroke-width=".035" transform="translate(-.025 -.03)"/></g>')
        # specular: a streak, a hot spot and a small reflection
        out.append(f'<ellipse cx="{-r * .42:.1f}" cy="{-ry * .45:.1f}" rx="{r * .3:.1f}" ry="{ry * .16 + 6:.1f}" transform="rotate(-25 {-r * .42:.1f} {-ry * .45:.1f})" fill="{fade(WHITE, .95, .6)}"/>')
        out.append(f'<circle cx="{-r * .55:.1f}" cy="{-ry * .25:.1f}" r="{r * .06:.1f}" fill="{fade(WHITE, 1, .7)}"/>')
        out.append(f'<ellipse cx="{r * .5:.1f}" cy="{ry * .35:.1f}" rx="{r * .14:.1f}" ry="{ry * .08 + 3:.1f}" transform="rotate(-25 {r * .5:.1f} {ry * .35:.1f})" fill="{fade(WHITE, .7, .6)}"/>')
        out.append("</g>")
        return "".join(out), th, ry
    def coin_stack(cx, bottom, n, r, k, jit, shadow, top=None, pile=None):
        parts = []
        th, ry = r * COIN_TH, r * k
        step = th + 18 if top is None else (bottom - th - 2 * ry - top) / (n - 1)  # a visible seam; or spread so the top coin lands on `top`
        for j in range(n):
            ccy = bottom - th - ry - j * step
            x = cx + jit[j % len(jit)]
            one = ""
            if j:  # the coin above shades the face below it where it sits
                one += f'<ellipse cx="{x:.1f}" cy="{ccy + th + ry * .2:.1f}" rx="{r * 1.0:.1f}" ry="{ry * 1.05:.1f}" fill="{fade(DEEP_GOLD, .5, .55)}"/>'
            one += coin(x, ccy, r, k, 0, shadow if j == 0 else None)[0]
            parts.append(f'<g data-k="pile{j - pile}">{one}</g>' if pile is not None and j >= pile else one)
        return "".join(parts)

    # ---- contours, bands and lighting overlays for the source parts (jar, lid, arrow) ----
    contour = dict(CONTOURS); contour["lid"] = LID_CLEAN
    o_w, i_w = (v * K for v in st["band"])
    def clip(n):
        cid = nid("c"); defs.append(f'<clipPath id="{cid}"><path d="{closed(contour[n])}"/></clipPath>'); return f"url(#{cid})"
    def part_layers(n, obj, fills, front=()):
        C = closed(contour[n]); x0, y0, x1, y1 = bbox(contour[n]); w, h = x1 - x0, y1 - y0
        cp = clip(n); out = []
        msk = ""
        if front:
            msk = f' mask="{full_mask(f"<rect x=\"{VBs[0] - 500}\" y=\"{VBs[1] - 500}\" width=\"{VBs[2] + 1000}\" height=\"{VBs[3] + 1000}\" fill=\"#fff\"/>" + "".join(f"<path d=\"{closed(contour[f])}\" fill=\"#000\"/>" for f in front))}"'
        # grow the faces over the traced line along the contour, so the edge reads even
        ring = full_mask(f'<path d="{C}" fill="none" stroke="#fff" stroke-width="{2 * RING:.1f}"/>')
        grown = "".join(f'<path d="{closed(PATHS[i][1])}" fill="{f}" stroke="{f}" stroke-width="{2 * GROW:.1f}" stroke-linejoin="round"/>'
                        for i, f in fills.items() if ROLES[i][0] == obj and i not in NO_GROW | LID_TOP_PIECES and (lambda b: (b[2] - b[0]) * (b[3] - b[1]))(bbox(PATHS[i][1])) > BIG)
        op = f' opacity="{st["glass"]}"' if obj == "jar" else ""
        out.append(f'<g{msk}{op}><g clip-path="{cp}"><g mask="{ring}">{grown}</g></g></g>')
        # light: a soft highlight top-left and a deeper core shade bottom-right, inside the part
        hl, cs = .6, .55
        out.append(f'<g clip-path="{cp}"{msk}>'
                   f'<ellipse cx="{x0 + w * .3:.0f}" cy="{y0 + h * .25:.0f}" rx="{w * .45:.0f}" ry="{h * .4:.0f}" fill="{fade(WHITE, hl, .5)}"/>'
                   f'<ellipse cx="{x0 + w * .85:.0f}" cy="{y0 + h * .9:.0f}" rx="{w * .6:.0f}" ry="{h * .55:.0f}" fill="{fade(core["glass" if obj == "jar" else obj], cs, .55)}"/></g>')
        if obj == "jar":  # glass reflections: two tall streaks on the left, one thin on the right
            out.append(f'<g clip-path="{cp}"><path d="M {x0 + w * .12:.0f},{y0 + h * .28:.0f} C {x0 + w * .08:.0f},{y0 + h * .5:.0f} {x0 + w * .09:.0f},{y0 + h * .75:.0f} {x0 + w * .14:.0f},{y0 + h * .88:.0f}" '
                       f'fill="none" stroke="{WHITE}" stroke-opacity=".75" stroke-width="{w * .035:.0f}" stroke-linecap="round"/>'
                       f'<path d="M {x0 + w * .2:.0f},{y0 + h * .3:.0f} C {x0 + w * .17:.0f},{y0 + h * .45:.0f} {x0 + w * .17:.0f},{y0 + h * .55:.0f} {x0 + w * .19:.0f},{y0 + h * .62:.0f}" '
                       f'fill="none" stroke="{WHITE}" stroke-opacity=".45" stroke-width="{w * .012:.0f}" stroke-linecap="round"/>'
                       f'<path d="M {x0 + w * .9:.0f},{y0 + h * .35:.0f} C {x0 + w * .93:.0f},{y0 + h * .5:.0f} {x0 + w * .93:.0f},{y0 + h * .65:.0f} {x0 + w * .9:.0f},{y0 + h * .8:.0f}" '
                       f'fill="none" stroke="{WHITE}" stroke-opacity=".4" stroke-width="{w * .012:.0f}" stroke-linecap="round"/></g>')
        # the edge, no outline: a band lit top-left and deep bottom-right, plus a bright rim
        lit = dict(jar=ramp(sc["glass"], .6), lid=ramp(sc["lid"], .8), arrow=ramp(sc["arrow"], .5))[obj]
        stroke = lin([(0, lit, 1), (.45, lit, 1), (1, core["glass" if obj == "jar" else obj], 1)], x0, y0, x1, y1, units=True)
        out.append(f'<g{msk} fill="none" stroke="{stroke}" stroke-linejoin="round">'
                   + (f'<path d="{C}" stroke-width="{2 * o_w:.1f}"/>' if o_w else "")
                   + f'<path d="{C}" stroke-width="{2 * i_w:.1f}" clip-path="{cp}"/></g>')
        rim = lin([(0, WHITE, st["rim"]), (.35, LTEAL_T, st["rim"] * .8), (.6, LTEAL_T, 0), (1, LTEAL_T, 0)], x0, y0, x1, y1, units=True)
        out.append(f'<path d="{C}" fill="none" stroke="{rim}" stroke-width="{7 * 2 * K:.1f}" clip-path="{cp}"{msk}/>')
        return "".join(out)

    # ---- assemble ----
    body, lid, arrow, fills, body_ix = [], [], [], {}, []
    for i, (c, d) in enumerate(PATHS):
        o, r = ROLES[i]
        if o in ("stack", "coin") or jar_coin_path(i) or i in GLASS_DROP | NECK_DROP: continue
        f = paint(i)
        if r != "line": fills[i] = f
        el = f'<path d="{closed(d)}" fill="{f}"/>'
        (arrow if o == "arrow" else lid if o == "lid" else body).append(el)
        if o not in ("arrow", "lid"): body_ix.append(i)
    gs = NAVY
    shadows = "".join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fade(gs, st["shadow"], .55)}"/>' for x, y, rx, ry in
                      [(1915, 2457, 1090, 78)])  # one ground under the jar, the arrow and the stack
    glass_op = f' opacity="{st["glass"]}"' if st["glass"] < 1 else ""
    gsh = core["glassShadow"]
    loose = lambda L: "".join(coin(x, y, R_JAR, k, rot, gsh)[0] for x, y, rot, k in L)
    stacks = lambda L: "".join(coin_stack(cx, b, n, R_JAR, .38, (0, 12, -8, 10, -4), gsh) for cx, b, n in L)
    jar_coins = loose(JAR_TOP + JAR_MID) + stacks(JAR_BACK) + loose(JAR_REST) + stacks(JAR_FRONT) + loose(JAR_LEAN)
    # the source's glass was cut around its coins: one base glass fill under it closes those holes
    # the neck: clean bands and highlights (see neck_arc), lit from the left
    gl = lambda *ls: lin([(k / (len(ls) - 1), ramp(sc["glass"], l), 1) for k, l in enumerate(ls)], NECK_CX - NECK_W, 0, NECK_CX + NECK_W, 0, units=True)
    hi = lambda a, b: lin([(0, WHITE, a), (.5, WHITE, (a + b) / 2), (1, WHITE, b)], NECK_CX - NECK_W, 0, NECK_CX + NECK_W, 0, units=True)
    ncid = nid("c"); defs.append(f'<clipPath id="{ncid}"><path d="{JAR_GLASS}"/></clipPath>')
    neck_bands = (f'<g clip-path="url(#{ncid})">'
                  f'<path d="{neck_band(895, 940)}" fill="{gl(.58, .5, .42)}"/>'
                  f'<path d="{neck_band(940, 951)}" fill="{sc["edge"]["glass"]}"/>'
                  f'<path d="{neck_band(951, 976)}" fill="{gl(.8, .7, .6)}"/>'
                  f'<path d="{neck_band(992, 1036)}" fill="{gl(.46, .38, .32)}"/>'
                  f'<path d="{neck_band(905, 917, True)}" fill="{hi(.5, .15)}"/>'
                  f'<path d="{neck_band(1046, 1064, True)}" fill="{hi(.7, .25)}"/></g>')
    base_glass = f'<path d="{JAR_GLASS}" fill="{face(ramp(sc["glass"], .5), ramp(sc["glass"], .5 + st["tint"]), ramp(sc["glass"], .5 + st["shade"]))}"/>'
    lid_shadow = f'<ellipse cx="1600" cy="955" rx="640" ry="48" fill="{fade(core["glass"], .35, .55)}"/>'  # the lid's shade on the neck
    fall_shadow = (f'<g clip-path="{clip("lid")}"><ellipse cx="1610" cy="530" rx="200" ry="40" '
                   f'fill="{fade(core["lid"], .4, .55)}"/></g>')  # the falling coin's shadow, on the lid only
    ell = lambda e, **kw: f'<ellipse cx="{e[0]:.1f}" cy="{e[1]:.1f}" rx="{e[2]:.1f}" ry="{e[3]:.1f}"' + "".join(f' {k.replace("_", "-")}="{v}"' for k, v in kw.items()) + "/>"
    assert lid[-1].startswith(f'<path d="{closed(PATHS[312][1])[:20]}')  # the slot, the last lid shape, stays on top
    # the rim runs out to the outline (as the grown faces do elsewhere), then the recess wall and floor
    lid_top = (ell(LID_E, fill=fills[210]) + ell(RIM_E, fill=fills[210]) + ell(WALL_E, fill=fills[222], stroke=edge_of(224, sc), stroke_width=f"{10 * K:.1f}")
               + ell(TOP_E, fill=fills[219]))
    # ---- the arrow: one solid (back face, side quads, front face), then its white border and gloss ----
    pts = lambda P: "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in P) + " Z"
    back = [(x + DEPTH[0], y + DEPTH[1]) for x, y in FRONT]
    n = len(FRONT)
    quads = [[FRONT[i], FRONT[(i + 1) % n], back[(i + 1) % n], back[i]] for i in range(n)]
    solid = [pts(back)] + [pts(q) for q in quads] + [pts(FRONT)]  # together: the whole silhouette, closed
    def facing(q):  # > 0: the side face shows (the back pokes out past this front edge)
        (x0, y0), (x1, y1) = q[0], q[1]; return (y1 - y0) * DEPTH[0] - (x1 - x0) * DEPTH[1]
    def side_fill(q):  # lit by the face's outward normal against light from the top-left
        (x0, y0), (x1, y1) = q[0], q[1]; L = math.hypot(x1 - x0, y1 - y0)
        nx, ny = (y1 - y0) / L, -(x1 - x0) / L  # outward for a clockwise polygon (screen coordinates)
        lit = -.25 * nx - .97 * ny  # light mostly from above: the head's top-left face bright, the shaft's side darker
        return (lin([(0, MINT_T, 1), (1, MINT, 1)], 0, 0, 1, 1) if lit > .5 else
                lin([(0, LTEAL, 1), (1, TEAL, 1)], 0, 0, 1, 1) if lit > -.2 else lin([(0, TEAL, 1), (1, DTEAL, 1)], 0, 0, 0, 1))
    fid = nid("c"); defs.append(f'<clipPath id="{fid}"><path d="{pts(FRONT)}"/></clipPath>')
    fx0, fy0 = min(x for x, y in FRONT), min(y for x, y in FRONT); fx1, fy1 = max(x for x, y in FRONT), max(y for x, y in FRONT)
    arrow_solid = (f'<path d="{pts(back)}" fill="{DTEAL}" stroke="{DTEAL}" stroke-width="6" stroke-linejoin="round"/>'
                   # faces turned away from the viewer first, so they never paint over a visible face near a corner
                   + "".join(f'<path d="{pts(q)}" fill="{f}" stroke="{f}" stroke-width="6" stroke-linejoin="round"/>'
                             for q, f in ((q, side_fill(q)) for q in sorted(quads, key=facing)))
                   + f'<path d="{pts([back[-1], back[0]])}" fill="none" stroke="{WHITE}" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>'  # rim light on the lit back edge
                   + (lambda g: f'<path d="{pts(FRONT)}" fill="{g}" stroke="{g}" stroke-width="8" stroke-linejoin="round"/>')(
                       lin([(0, LTEAL_T, 1), (.45, LTEAL, 1), (1, TEAL, 1)], fx0, fy0, fx1, fy1, units=True))
                   + f'<path d="{pts(FRONT)}" fill="none" stroke="{WHITE}" stroke-width="44" stroke-linejoin="round" clip-path="url(#{fid})"/>'  # border: 22 inset, even
                   # crisp gloss: a hard-edged sheen across the upper left and a deeper band along the lower right
                   + f'<g clip-path="url(#{fid})"><path d="M {fx0 - 50:.0f},{fy0 - 50:.0f} L {fx1 + 50:.0f},{fy0 - 50:.0f} L {fx0 - 50:.0f},{fy0 + (fy1 - fy0) * .62:.0f} Z" fill="{WHITE}" fill-opacity=".28"/>'
                   f'<path d="M {fx1 + 50:.0f},{fy0 + (fy1 - fy0) * .55:.0f} L {fx1 + 50:.0f},{fy1 + 50:.0f} L {fx0 + (fx1 - fx0) * .35:.0f},{fy1 + 50:.0f} Z" fill="{TEAL}" fill-opacity=".3"/></g>')
    # its shadow (it stands on the shared ground shadow): the whole solid, offset down-right, in widening faint layers (each layer one opaque union, then faded)
    arrow_shadow = (f'<g transform="translate(26 30) {ARROW_T2}">'
                    + "".join(f'<g opacity=".018" fill="{NAVY}" stroke="{NAVY}" stroke-width="{w}" stroke-linejoin="round">'
                              + "".join(f'<path d="{d_}"/>' for d_ in solid) + "</g>" for w in range(72, -1, -6))
                    + "</g>")
    stack = coin_stack(STACK["cx"], STACK["bottom"], STACK["n"], STACK["r"], STACK["k"], STACK["jitter"], None, top=LID_E[1] - LID_E[3], pile=PILE_FROM if anim else None)  # 19 coins, top level with the lid
    # In the animated export each moving part is its own named layer (data-k), see export_anim.
    g = (lambda k, inner, extra="": f'<g data-k="{k}"{extra}>{inner}</g>') if anim else (lambda k, inner, extra="": inner)
    def fallen():  # built in drawing order, so the static file's ids stay as they were
        fc = coin(*FALL[:2], 205, FALL[3], FALL[2])[0]
        if not anim: return fc
        # the coin drops into the slot: everything below the slot's front lip is clipped away
        (lx0, ly0), (lx1, ly1) = SLOT_LIP
        yl = lambda x: ly0 + (x - lx0) * (ly1 - ly0) / (lx1 - lx0)
        scid = nid("c"); x0_, x1_ = VBs[0] - 200, VBs[0] + VBs[2] + 200
        defs.append(f'<clipPath id="{scid}"><path d="M {x0_},{VBs[1] - 400} L {x1_},{VBs[1] - 400} L {x1_},{yl(x1_):.1f} L {x0_},{yl(x0_):.1f} Z"/></clipPath>')
        return f'<g clip-path="url(#{scid})">' + g("coin", g("spin", fc)) + "</g>"
    if anim:
        # the glint that sweeps up the stack: a soft white band, clipped to the stack's coins
        gcid = nid("c"); defs.append(f'<clipPath id="{gcid}"><rect x="{STACK["cx"] - STACK["r"] - 20}" y="{LID_E[1] - LID_E[3]}" width="{2 * STACK["r"] + 40}" height="{STACK["bottom"] - LID_E[1] + LID_E[3]}" rx="{STACK["r"]}" ry="{STACK["r"] * STACK["k"]}"/></clipPath>')
        glint = (f'<g clip-path="url(#{gcid})"><rect data-k="glint" x="{STACK["cx"] - STACK["r"] - 20}" y="{STACK["bottom"] - 260}" width="{2 * STACK["r"] + 40}" height="260" '
                 f'fill="{lin([(0, WHITE, 0), (.5, WHITE, .55), (1, WHITE, 0)], 0, STACK["bottom"] - 260, 0, STACK["bottom"], units=True)}" opacity="0"/></g>')
    else:
        glint = ""
    # the coin that drops in lands here (its own layer in the animated export); the coins inside are clipped to the
    # glass so the landing coin never shows above the jar (the lid is drawn over it)
    landed = "".join(coin(x, y, R_JAR, k, rot, gsh)[0] for x, y, rot, k in JAR_TOP)
    jar_coins = (g("landed", landed) + "".join(coin(x, y, R_JAR, k, rot, gsh)[0] for x, y, rot, k in JAR_MID) + stacks(JAR_BACK) + loose(JAR_REST) + stacks(JAR_FRONT) + loose(JAR_LEAN))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, VBs))}" width="{VBs[2]}" height="{VBs[3]}">'
           f'<defs>{{DEFS}}</defs>{shadows}'
           + g("jar", f'<g{glass_op}>{base_glass}{"".join(body)}{neck_bands}</g>{lid_shadow}'
               + part_layers("jar", "jar", fills, front=("lid",)) + g("inner", f'<g clip-path="{clip("jar")}">{jar_coins}</g>')  # coins over the glass's lighting, so it never tints them
               + f'<g clip-path="{clip("lid")}">{"".join(lid[:-1])}{lid_top}{lid[-1]}</g>' + part_layers("lid", "lid", fills)
               + g("coinShadow", fall_shadow))
           + fallen()
           + stack + glint
           + g("arrowShadow", arrow_shadow)
           + g("arrow", f'<g transform="{ARROW_T2}">{arrow_solid}</g>') + '</svg>')
    svg = svg.replace("{DEFS}", "".join(defs))
    assert "<filter" not in svg and "Blur" not in svg and "<image" not in svg
    ids = re.findall(r'id="([^"]+)"', svg); assert len(ids) == len(set(ids)) and all(i.startswith(pre) for i in ids)
    if anim: return svg
    name = f"{SLUG}-{key}-gloss.svg"
    open(os.path.join(OUT, name), "w").write(svg)
    return name

# The slot's front lip, from the traced slot (312): the falling coin is clipped below this line, so it slips in.
SLOT_LIP = ((1415, 577), (1860, 524))

# The lid's sides were jagged where the traced thread ridges stuck out past the top ellipse: the glossy lid is
# clipped to, and edged along, a clean cylinder silhouette: the top ellipse (LID_E), straight sides, and a bottom arc
# through the traced lid's lowest point (921.5).
_lcx, _lcy, _lrx, _lry = LID_E
LID_CLEAN = (f"M {_lcx - _lrx:.1f},{_lcy:.1f} A {_lrx:.1f},{_lry:.1f} 0 0 1 {_lcx + _lrx:.1f},{_lcy:.1f} L {_lcx + _lrx:.1f},800 "
             f"A {_lrx:.1f},121.5 0 0 1 {_lcx - _lrx:.1f},800 Z")
# designer: the arrow as tall as the jar's body (neck 965 to the base 2459), scaled evenly, still centred on the
# jar-stack gap and standing on the ground line
ARROW_S2 = (2459 - 965) / (SOLID_BOX[3] - SOLID_BOX[1])
ARROW_T2 = (f"translate({ARROW_AT[0]:.1f} {ARROW_AT[1]}) scale({ARROW_S2:.4f}) "
            f"translate({-(SOLID_BOX[0] + SOLID_BOX[2]) / 2:.1f} {-SOLID_BOX[3]:.1f})")
PILE_FROM = 11                       # the side stack starts with 11 coins; the other 8 drop on one by one

def lean(svg):
    """Smaller markup for the component: path data to 1 decimal, identical gradients and clip paths merged."""
    def tidy(d):  # 1 decimal, no ".0", no space after a command, implicit line-tos
        d = re.sub(r'-?\d+\.\d+', lambda m: f"{float(m.group(0)):.1f}".rstrip("0").rstrip("."), d)
        out, last = [], None  # an L may be dropped only right after M or L (after C the pairs would be read as curves)
        for cmd, args in re.findall(r'([A-Za-z])([^A-Za-z]*)', d):
            out.append((" " if cmd == "L" and last in "ML" else cmd) + args.strip() + (" " if args.strip() else ""))
            last = cmd if cmd != "Z" else "Z"
        return "".join(out).strip().replace("  ", " ")
    svg = re.sub(r'(\sd=")([^"]+)"', lambda m: m.group(1) + tidy(m.group(2)) + '"', svg)
    # a long outline used more than once (clip, stroke, rim) is written once and reused
    long = [d for d, n in __import__("collections").Counter(re.findall(r'<path d="([^"]{600,})"', svg)).items() if n > 1]
    shared = "".join(f'<path id="P{k}" d="{d}"/>' for k, d in enumerate(long))
    for k, d in enumerate(long):
        svg = svg.replace(f'<path d="{d}"', f'<use href="#P{k}"')
    svg = svg.replace("<defs>", "<defs>" + shared, 1)
    svg = re.sub(r'(\s(?:cx|cy|rx|ry|r|x|y|width|height|x1|y1|x2|y2)=")(-?\d+\.\d)\d+"', r'\1\2"', svg)
    defs = re.findall(r'<(linearGradient|radialGradient|clipPath) id="([^"]+)"(.*?)</\1>', svg)
    seen, alias = {}, {}
    for tag, gid, body in defs:
        k = (tag, body)
        if k in seen:
            alias[gid] = seen[k]
            svg = svg.replace(f'<{tag} id="{gid}"{body}</{tag}>', "", 1)
        else:
            seen[k] = gid
    if alias:
        svg = re.sub(r'url\(#([^)]+)\)', lambda m: f"url(#{alias.get(m.group(1), m.group(1))})", svg)
    return svg.replace(f"{SLUG}-B-gloss-", "")  # short ids; the component prefixes every id per instance

def export_anim():
    """savings-jar-anim.svg: the picked art (B, glossy) with named layers for ATMSavingsJar.tsx:
    jar (squashes on the drop) > inner (the coins inside, settle), coinShadow (on the lid), coin > spin (the falling
    coin, clipped at the slot's lip), glint (sweeps up the stack), arrowShadow, arrow."""
    global NECK_N, LID_CONTOUR
    keep = NECK_N, LID_CONTOUR
    pts = [tuple(map(float, p.split(","))) for p in LID_CONTOUR[2:-2].split(" L ")]
    j = max(range(len(pts)), key=lambda k: math.hypot(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]))  # a ring: simplify both halves
    ring = _rdp(pts[:j + 1], .4)[:-1] + _rdp(pts[j:] + [pts[0]], .4)[:-1]
    NECK_N, LID_CONTOUR = 32, "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in ring) + " Z"
    try:
        svg = lean(build_gloss("B", anim=True))
    finally:
        NECK_N, LID_CONTOUR = keep
    for k in ("jar", "inner", "coinShadow", "coin", "spin", "glint", "arrowShadow", "arrow"):
        assert f'data-k="{k}"' in svg, k
    ids = re.findall(r'id="([^"]+)"', svg); assert len(ids) == len(set(ids))
    assert all(f"#{u}" in svg or u in ids for u in re.findall(r'url\(#([^)]+)\)', svg))
    open(os.path.join(OUT, f"{SLUG}-anim.svg"), "w").write(svg)
    # the component: the template with the art pasted in (ATM/ATMSavingsJar.tsx)
    inner = svg[svg.index(">") + 1:svg.rindex("</svg>")]
    assert "`" not in inner and "${" not in inner and "\\" not in inner  # safe inside a template literal
    tsx = (open(os.path.join(OUT, "ATMSavingsJar.template.tsx")).read()
           .replace("__VIEWBOX__", re.search(r'viewBox="([^"]+)"', svg).group(1)).replace("__ART__", inner))
    open(os.path.join(OUT, "..", "..", "..", "ATMSavingsJar.tsx"), "w").write(tsx)
    return f"{SLUG}-anim.svg", len(svg)

if __name__ == "__main__":
    print([build(k) for k in SCHEMES] + [build_gloss(k) for k in SCHEMES], export_anim())
