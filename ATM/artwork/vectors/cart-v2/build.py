# Cart version 2: cleans and recolours the stock isometric cart (artboard 1, pdftocairo -svg, 87 paths) into
# eight SVGs: schemes A and B, each in four styles: "3D outlined" (navy outline, the shipped cart's look), and three
# styles with no outline, all with the parts spaced apart so each reads as its own form: "clay" (puffy, soft),
# "glass" (crisp faces, thin light rims, translucent basket, to sit on the teal glass card) and "gloss" (deep
# extrusion, bevels, polished-plastic highlights).
#   python3 build.py <src.svg> [out dir]      (out dir defaults to this folder)
# The source draws its outline as one navy shape (index 0): the art's silhouette with a hole for every fill,
# 6-7 units wide everywhere. The outlined versions keep it and stroke it navy on top of the fills, which grows
# every line by the same amount on both sides (so it stays even); the four wheels, traced and wobbly, are
# redrawn as true ellipses with their own outline, masked behind the bars that cover them.
import re, sys, os
import numpy as np

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
SLUG = "cart-v2"
s = open(SRC).read()
els = re.findall(r'<path\b[^>]*?/>', s)
assert len(els) == 87, len(els)

def closed(d):
    """Every subpath ends with Z (the source leaves some open, which a stroke would show as a gap)."""
    parts = [p.strip() for p in re.split(r'(?=M )', d.strip()) if p.strip()]
    return " ".join(p if p.endswith("Z") else p + " Z" for p in parts)
D = [closed(re.search(r'\sd="([^"]+)"', e).group(1)) for e in els]

# ---- roles: every shape index gets one ----
ROLE = {}
def put(r, *ix):
    for i in ix: assert i not in ROLE, i; ROLE[i] = r
put("basket", 1); put("basketSide", 2); put("basketIn", 50); put("rim", 13, 47, 54, 57); put("inShade", 56, 62, 63, 64)
put("slotSeen", 82, 79, 76); put("slotBox", 74); put("slotBack", 73); put("slotWall", 83, 80, 77, 72); put("slotLip", 84, 81, 78, 75)
put("slotRing", 66, 67, 68, 69)
put("frameTop", 7, 27, 16, 51); put("frameLight", 36, 43, 49, 55, 18, 9, 59); put("frameDark", 39, 33, 38, 34); put("frameHi", 58)
put("grip", 8, 25); put("gripEnd", 48)
put("flatTop", 5); put("flatStrip", 37, 44, 61); put("flatFront", 14, 15, 29); put("flatSide", 23, 40, 53)
put("yTop", 6); put("yLidL", 12); put("yLidF", 4); put("ySideBand", 28, 52, 45); put("ySideLight", 35, 46)
put("yFrontBand", 22, 24, 26); put("yFrontLight", 19, 21); put("yBottom", 60)
put("bTop", 42); put("bFront", 3); put("bSide", 17)
LINE, STRAY = 0, 65                      # the outline shape; a stray dot under the basket
# the outline shape's holes 8 (the stray dot's) and 62 (a single point) are dropped with it
LINE_DROP = (8, 62)
WHEEL_SHAPES = {10, 11, 20, 30, 31, 32, 41, 70, 71, 85, 86}   # faces, sides, hub rings, hubs: redrawn
_sub = [p.strip() for p in re.split(r'(?=M )', D[LINE]) if p.strip()]
assert len(_sub) == 63 and len(re.findall(r'-?\d+\.?\d*', _sub[62])) == 2
D[LINE] = " ".join(p for j, p in enumerate(_sub) if j not in LINE_DROP)
assert sorted(set(ROLE) | WHEEL_SHAPES | {LINE, STRAY}) == list(range(87))

# back to front (the source order is not by depth)
ORDER = [50, 54, 56, 62, 63, 64, 33, 51, 38,
         29, 53, 44, 15, 40, 37, 61, 14, 23, 5,                            # flat stack, bottom slab up
         60, 45, 52, 46, 28, 35, 26, 21, 24, 19, 22, 12, 4, 6,              # big box
         17, 3, 42,                                                         # tall box
         73, 74, 75, 72, 76, 77, 78, 79, 80, 81, 82, 83, 84, 66, 67, 68, 69,  # what shows through the slots
         13, 47, 57, 2, 1,                                                  # basket
         43, 36, 39, 49, 18, 27, 9, 16, 55, 7, 34, 59, 58, 48, 8, 25]       # frame, handle, grip
assert sorted(ORDER) == sorted(ROLE), set(ORDER) ^ set(ROLE)

# ---- wheels: all four are the same ellipse (fitted to the traced faces: 161.2 x 128.7 at -62.4 deg), extruded
# by V to the back; sizes here are the outline's centre line (the fill edge plus half the source's line) ----
WA, WB, WANG, V = 164.45, 131.95, -62.4, np.array([-61.0, -32.0])
HUB_A, HUB_B = 77.4, 62.1
WHEELS = [  # name, face centre, has a visible hub, shapes in front of it (those it was cut by)
    ("mid", (2413.0, 1616.0), False, [1, 2, 38, 67, 68, 77, 78, 79, 80, 81]),
    ("left", (1388.3, 1847.1), False, [18, 27, 33, 39, 49, 51]),
    ("front", (1936.4, 2129.0), True, []),
    ("right", (2957.8, 1898.2), True, []),
]
R = np.radians(WANG); ROT = np.array([[np.cos(R), -np.sin(R)], [np.sin(R), np.cos(R)]])
def ept(c, t, a=WA, b=WB): return np.array(c) + ROT @ np.array([a * np.cos(t), b * np.sin(t)])
def f2(p): return f"{p[0]:.1f},{p[1]:.1f}"
def wheel_geom(c):
    c = np.array(c); vl = ROT.T @ V
    t1 = np.arctan2(-WB * vl[0], WA * vl[1]); t2 = t1 + np.pi          # where the face's tangent runs along V
    p1, p2 = ept(c, t1), ept(c, t2)
    far = max((t1 + np.pi / 2, t1 - np.pi / 2), key=lambda t: np.dot(ept(c, t) - c, V))   # back ellipse, far side
    near = min((t1 + np.pi / 2, t1 - np.pi / 2), key=lambda t: np.dot(ept(c, t) - c, V))  # face, side away from V
    def arc(a, m, b, a_=WA, b_=WB):
        z = (m[0] - a[0]) * (b[1] - m[1]) - (m[1] - a[1]) * (b[0] - m[0])
        sw = 1 if z > 0 else 0
        return f"A{a_},{b_} {WANG} 0 {sw} {f2(m)} A{a_},{b_} {WANG} 0 {sw} {f2(b)}"
    hull = (f"M{f2(p1)} L{f2(p1 + V)} {arc(p1 + V, ept(c, far) + V, p2 + V)} L{f2(p2)} "
            f"{arc(p2, ept(c, near), p1)} Z")
    band = f"M{f2(p1)} L{f2(p1 + V)} L{f2(p2 + V)} L{f2(p2)} Z"
    return c, hull, band
def ell(c, a, b, extra=""): return f'<ellipse cx="{c[0]:.1f}" cy="{c[1]:.1f}" rx="{a:.2f}" ry="{b:.2f}" transform="rotate({WANG} {c[0]:.1f} {c[1]:.1f})"{extra}/>'

def shape_geom(d):
    subs = [np.array(re.findall(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', p), float) for p in re.split(r'(?=M )', d) if p.strip()]
    P = max(subs, key=lambda q: np.ptp(q[:, 0]) * np.ptp(q[:, 1]))
    x, y = P[:, 0], P[:, 1]
    return P.mean(0), P[np.argmin(x + y)], abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2
GEOM = {i: shape_geom(D[i]) for i in ROLE}

# ---- grip highlight: a streak along the grip bar's upper side ----
def grip_streak():
    pts = np.array([[float(x), float(y)] for x, y in re.findall(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', D[8])])
    m = pts.mean(0); u, sv, vt = np.linalg.svd(pts - m); ax, nr = vt[0], vt[1]
    proj = (pts - m) @ ax; half = np.abs((pts - m) @ nr).max()
    if nr[1] > 0: nr = -nr                                                    # toward the top
    a = m + ax * (proj.min() + 0.2 * (proj.max() - proj.min())) + nr * half * 0.42
    b = m + ax * (proj.max() - 0.25 * (proj.max() - proj.min())) + nr * half * 0.42
    return a, b, half
GA, GB, GHALF = grip_streak()

# ---- palettes ----
NAVY, MID = "#002c44", "#11232d"
YOLK, YOLK_T, YOLK_TT, ORANGE, AMBER = "#ffcc40", "#ffe07a", "#fff0b8", "#f6a11d", "#e08a12"
SKY, SKY_T, SKY_TT, SKY_S, LBLUE = "#00acdd", "#5fd0f2", "#9fe3f8", "#0094c6", "#0079a9"
MINT, MINT_T, MINT_S, MINT_SS = "#bce2d7", "#d6f0e8", "#8fd3c0", "#5fbfa6"
GL, GL_T, GL_S, GL_SS = "#d9eeff", "#eef7ff", "#a9d3ef", "#7fb9e3"
TEAL, DTEAL, LTEAL, LTEAL_T, WHITE = "#059390", "#00615e", "#3bbfc0", "#8fe0e0", "#ffffff"
# each role: a colour, or a gradient [light .. dark] laid top-left to bottom-right
SCHEMES = {
 "A": dict(  # the shipped cart's look (option D): glacier basket, light-teal frame, egg-yolk slots/grip/hubs,
             # mint flat stack, egg-yolk box, sky box, light-blue wheels
    basket=[GL_T, GL, GL_S], basketSide=[GL, GL_S], basketIn=GL_S, rim=[WHITE, GL_T], inShade=GL_SS,
    slotSeen=[YOLK_T, YOLK], slotBox=[SKY_T, SKY], slotBack=GL_S, slotWall=[GL_SS, GL_S], slotLip=GL_T, slotRing=NAVY,
    frameTop=[LTEAL_T, LTEAL], frameLight=[MINT_T, MINT], frameDark=[LTEAL, TEAL], frameHi=MINT_T,
    grip=[YOLK_T, YOLK], gripEnd=[ORANGE, AMBER], gripHi=YOLK_TT,
    flatTop=[MINT_T, MINT], flatStrip=MINT_T, flatFront=[MINT, MINT_S], flatSide=[MINT_S, MINT_SS],
    yTop=[YOLK_TT, YOLK_T], yLidF=[YOLK_T, YOLK], yLidL=[YOLK, ORANGE], ySideBand=[ORANGE, AMBER], ySideLight="#fff4d6",
    yFrontBand=[YOLK_T, YOLK], yFrontLight=WHITE, yBottom=ORANGE,
    bTop=SKY_TT, bFront=[SKY_T, SKY], bSide=[SKY, SKY_S],
    tyre=["#5cb8e6", "#2f8fc4"], tyreHi="#8fd3f2", tyreSide=[GL, "#8fd3f2"], hub=[YOLK_T, YOLK], hubHi=YOLK_TT,
    edge=None),
 "B": dict(  # sky basket, egg-yolk frame, light-teal grip and wheels, glacier stack, mint box, orange box
    basket=[SKY_TT, SKY_T, SKY], basketSide=[SKY, SKY_S], basketIn=SKY_S, rim=[GL_T, SKY_TT], inShade=LBLUE,
    slotSeen=[YOLK_T, YOLK], slotBox=[YOLK, ORANGE], slotBack=SKY_S, slotWall=[SKY_S, LBLUE], slotLip=SKY_TT, slotRing=NAVY,
    frameTop=[YOLK_T, YOLK], frameLight=[YOLK_TT, YOLK_T], frameDark=[ORANGE, AMBER], frameHi=YOLK_TT,
    grip=[LTEAL_T, LTEAL], gripEnd=[LTEAL, TEAL], gripHi=MINT_T,
    flatTop=[WHITE, GL_T], flatStrip=GL_T, flatFront=[GL, GL_S], flatSide=[GL_S, GL_SS],
    yTop=[MINT_T, MINT], yLidF=[MINT, MINT_S], yLidL=[MINT_S, MINT_SS], ySideBand=[LTEAL, TEAL], ySideLight=MINT_T,
    yFrontBand=[LTEAL_T, LTEAL], yFrontLight=WHITE, yBottom=LTEAL,
    bTop=YOLK_T, bFront=[YOLK, ORANGE], bSide=[ORANGE, AMBER],
    tyre=[LTEAL, TEAL], tyreHi=LTEAL_T, tyreSide=[MINT_T, LTEAL_T], hub=[YOLK_T, YOLK], hubHi=YOLK_TT,
    edge=None),
}
# one step darker / lighter within the same hue family
DARKER = {GL_T: GL_S, GL: GL_SS, GL_S: GL_SS, GL_SS: LBLUE, WHITE: GL_S, YOLK_TT: YOLK, YOLK_T: ORANGE, YOLK: ORANGE,
          ORANGE: AMBER, AMBER: AMBER, SKY_TT: SKY, SKY_T: SKY_S, SKY: SKY_S, SKY_S: LBLUE, LBLUE: LBLUE,
          MINT_T: MINT_S, MINT: MINT_S, MINT_S: MINT_SS, MINT_SS: TEAL, LTEAL_T: LTEAL, LTEAL: TEAL, TEAL: DTEAL,
          "#fff4d6": YOLK, DTEAL: DTEAL, "#1d6a96": "#1d6a96", "#5cb8e6": "#2f8fc4", "#2f8fc4": "#1d6a96", "#8fd3f2": "#5cb8e6", NAVY: NAVY}
LIGHTER = {GL: GL_T, GL_T: WHITE, GL_S: GL, GL_SS: GL_S, WHITE: WHITE, YOLK: YOLK_T, YOLK_T: YOLK_TT, YOLK_TT: WHITE,
           ORANGE: YOLK, AMBER: ORANGE, SKY: SKY_T, SKY_T: SKY_TT, SKY_TT: GL_T, SKY_S: SKY, LBLUE: SKY_S,
           MINT: MINT_T, MINT_T: WHITE, MINT_S: MINT, MINT_SS: MINT_S, LTEAL: LTEAL_T, LTEAL_T: MINT_T, TEAL: LTEAL,
           DTEAL: TEAL, "#fff4d6": WHITE, "#5cb8e6": "#8fd3f2", "#2f8fc4": "#5cb8e6", "#8fd3f2": GL, "#1d6a96": "#2f8fc4"}
TOPS = {"flatTop", "flatStrip", "yTop", "bTop", "rim", "frameHi", "frameTop"}      # lit faces, a step lighter (glass, gloss)
SIDES = {"flatSide", "yLidL", "ySideBand", "ySideLight", "bSide", "basketSide", "frameDark", "slotWall"}  # a step darker

T_LINE = 14.5          # added to the source's 6.5-unit lines -> 21 (target 19 +- 2 at 2120 wide = 21 +- 2 here)
T_WHEEL = 22           # wheel outlines, centred on the line, so they also cover the traced ones underneath

# the no-outline styles space the parts apart (back to front): name, shapes (None for a wheel), offset
PIECES = [
    ("mid", None, (0, 34)), ("left", None, (-30, 26)),
    ("basketBack", (50, 54, 56, 62, 63, 64), (0, 0)), ("frameBack", (33, 51, 38), (0, 0)),
    ("tallBox", (17, 3, 42), (95, -55)),
    ("bigBox", (45, 52, 46, 28, 35, 26, 21, 24, 19, 22, 12, 4, 6), (40, -62)),
    # the three slabs are one slab (the top one, the only one the art draws whole) repeated 122.5 apart, plus spacing
    ("slab3", (14, 23, 5), (-40, 245 - 40)), ("slab2", (14, 23, 5), (-40, 122.5 - 100)), ("slab1", (14, 23, 5), (-40, -160)),
    ("slots", (73, 74, 75, 72, 76, 77, 78, 79, 80, 81, 82, 83, 84), (0, 0)),
    ("basket", (13, 47, 57, 2, 1), (0, 0)),
    ("frame", (43, 36, 39, 49, 18, 27, 9, 16, 55, 7, 34, 59, 58), (0, 0)),
    ("grip", (48, 8, 25), (-36, -36)),
    ("front", None, (0, 36)), ("right", None, (34, 30)),
]
SPACED_DROP = {29, 53, 44, 15, 40, 37, 61, 60}   # the lower slabs and the big box's underside, hidden once complete
assert {i for _, ix, _ in PIECES if ix for i in ix} | SPACED_DROP == {i for i in ROLE if ROLE[i] != "slotRing"}
# The big box's left face was cut where the stack hid it; spaced apart, it needs to be whole: five bands parallel
# to its top edge (slope 0.526), from x 1961 to its corner at x 2298.5, boundaries read off the source at the corner.
def _band(y0, y1, xa=1961.4, xb=2298.5, k=0.526):
    return f"M {xa} {y0 + k * (xa - xb):.1f} L {xb} {y0} L {xb} {y1} L {xa} {y1 + k * (xa - xb):.1f} Z"
SPACED_D = {i: _band(a, b) for i, a, b in ((28, 669.5, 725.5), (35, 725.5, 796.2), (52, 796.2, 851.1), (46, 851.1, 922.0), (45, 922.0, 977.9))}
GEOM.update({i: shape_geom(d) for i, d in SPACED_D.items()})
BBOX = {i: (lambda n: (n[0::2].min(), n[1::2].min(), n[0::2].max(), n[1::2].max()))(np.array(re.findall(r'-?\d+\.?\d*', D[i]), float))
        for i in ROLE}
BBOX.update({i: (1961.4, 492, 2298.5, 977.9) for i in SPACED_D})
STYLE = {  # growth: same-paint stroke that closes the source's gaps and rounds corners; cast: (width, opacity) layers
    "clay": dict(grow=28, edge=6, cast=((44, .12), (24, .14), (6, .18)), ground=.55),
    "glass": dict(grow=7, cast=((18, .16), (4, .22)), ground=.6, see=.72, rim=(5, 7), band=(6, 8), rimOp=.8),
    "gloss": dict(grow=7, cast=((26, .18), (8, .24)), ground=.7, rim=(7, 9), band=(7, 9), rimOp=.9, depth=8),
}

def build(key, style):
    pal = SCHEMES[key]; pre = f"{SLUG}-{key}" + ("" if style == "outlined" else f"-{style}")
    defs, grads, n = [], {}, [0]
    def nid(t): n[0] += 1; return f"{pre}-{t}{n[0]}"
    def paint(v):
        if isinstance(v, str): return v
        k = tuple(v)
        if k not in grads:
            grads[k] = gid = nid("g")
            defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1">' + "".join(
                f'<stop offset="{i / (len(v) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(v)) + "</linearGradient>")
        return f"url(#{grads[k]})"
    def last(v): return v if isinstance(v, str) else v[-1]
    def dark(v): return DARKER[last(v)]
    body = []
    DD = D if style == "outlined" else {**dict(enumerate(D)), **SPACED_D}
    shapes_defs = "".join(f'<path id="{pre}-p{i}" d="{DD[i]}"/>' for i in ORDER if style == "outlined" or i not in SPACED_DROP)

    if style == "outlined":
        use = lambda i, attrs: f'<use href="#{pre}-p{i}" {attrs}/>'
        def wheel_svg(c, hub):
            c, hull, band = wheel_geom(c)
            side, face = paint(pal["tyreSide"]), paint(pal["tyre"])
            out = [ell(c + V, WA, WB, f' fill="{side}"'), f'<path d="{band}" fill="{side}"/>', ell(c, WA, WB, f' fill="{face}"'),
                   ell(c + np.array([-9, -9]), WA * 0.86, WB * 0.86, f' fill="{pal["tyreHi"]}" opacity="0.45"')]
            if hub:
                out.append(ell(c, HUB_A, HUB_B, f' fill="{paint(pal["hub"])}" stroke="{NAVY}" stroke-width="{T_WHEEL}"'))
                g = c + ROT @ np.array([-HUB_A * 0.15, -HUB_B * 0.45])
                out.append(ell(g, HUB_A * 0.32, HUB_B * 0.18, f' fill="{pal["hubHi"]}"'))
            out.append(f'<path d="{hull}" fill="none" stroke="{NAVY}" stroke-width="{T_WHEEL}" stroke-linejoin="round"/>')
            out.append(ell(c, WA, WB, f' fill="none" stroke="{NAVY}" stroke-width="{T_WHEEL}"'))
            return "".join(out)
        # fills (each face a light-to-shade gradient), then the outline on top, then the wheels, each masked
        # behind the shapes that cover it (those shapes' own outline comes from the outline shape)
        for i in ORDER: body.append(use(i, f'fill="{paint(pal[ROLE[i]])}"'))
        body.append(f'<line x1="{GA[0]:.1f}" y1="{GA[1]:.1f}" x2="{GB[0]:.1f}" y2="{GB[1]:.1f}" stroke="{pal["gripHi"]}" stroke-width="{GHALF * 0.3:.1f}" stroke-linecap="round"/>')
        body.append(f'<path d="{D[LINE]}" fill="{NAVY}" stroke="{NAVY}" stroke-width="{T_LINE}" stroke-linejoin="round"/>')
        for i in (66, 67, 68, 69): body.append(use(i, f'fill="{NAVY}" stroke="{NAVY}" stroke-width="{T_LINE}" stroke-linejoin="round"'))
        for name, c, hub, occ in WHEELS:
            parts = wheel_svg(c, hub)
            if occ:
                mid = f"{pre}-m-{name}"
                defs.append(f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="4100" height="2600">'
                            '<rect width="4100" height="2600" fill="#fff"/>'
                            + "".join(use(i, f'fill="#000" stroke="#000" stroke-width="{2 * (6.5 + T_LINE / 2)}" stroke-linejoin="round"') for i in occ)
                            + "</mask>")
                body.append(f'<g mask="url(#{mid})">{parts}</g>')
            else:
                body.append(parts)
        x0, y0, x1, y1 = 847 - 12, 209 - 12, 3162 + 12, 2297 + 12
        shadow = ""
    else:
        S = STYLE[style]
        # every shape is an element function: el(dx, dy, attrs) draws it moved by its piece's offset plus (dx, dy)
        def use_el(i, T):
            return lambda dx, dy, a: f'<use href="#{pre}-p{i}" transform="translate({T[0] + dx} {T[1] + dy})" {a}/>'
        def ell_el(c, a_, b_):
            return lambda dx, dy, a: (f'<ellipse cx="{c[0]:.1f}" cy="{c[1]:.1f}" rx="{a_:.2f}" ry="{b_:.2f}" '
                                      f'transform="translate({dx} {dy}) rotate({WANG} {c[0]:.1f} {c[1]:.1f})" {a}/>')
        def path_el(d):
            return lambda dx, dy, a: f'<path d="{d}" transform="translate({dx} {dy})" {a}/>'
        def clip(els_, dx=0, dy=0):
            cid = nid("c"); defs.append(f'<clipPath id="{cid}">' + "".join(e(dx, dy, "") for e in els_) + "</clipPath>"); return cid
        def white_radial(cx, cy, r, stops, col="#fff"):
            gid = nid("r")
            defs.append(f'<radialGradient id="{gid}" gradientUnits="userSpaceOnUse" cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}">'
                        + "".join(f'<stop offset="{o}" stop-color="{col}" stop-opacity="{a}"/>' for o, a in stops) + "</radialGradient>")
            return f"url(#{gid})"
        shade_ids = {}
        def core(col, op):  # deep shade toward the bottom-right of a face
            if (col, op) not in shade_ids:
                gid = shade_ids[(col, op)] = nid("sh")
                defs.append(f'<radialGradient id="{gid}" cx=".9" cy=".95" r=".85"><stop offset="0" stop-color="{col}" stop-opacity="{op}"/>'
                            f'<stop offset=".45" stop-color="{col}" stop-opacity="{op * .45:.2f}"/><stop offset="1" stop-color="{col}" stop-opacity="0"/></radialGradient>')
            return f"url(#{shade_ids[(col, op)]})"
        def colours(role):
            v = pal[role]; vs = [v] if isinstance(v, str) else list(v)
            if style != "clay":
                if role in TOPS: vs = [LIGHTER[c] for c in vs]
                if role in SIDES: vs = [DARKER[c] for c in vs]
            if style == "gloss": vs = vs + [DARKER[vs[-1]]]      # richer, deeper gradient
            elif style == "clay" or len(vs) == 1: vs = vs + [DARKER[vs[-1]]]
            return vs
        def spot(el, c, tl, size, op=.95):   # small crisp specular spot near the lit corner, clipped to the face
            sp = c + 0.68 * (tl - c); r = min(max(size * 0.08, 6), 24)
            return (f'<g clip-path="url(#{clip([el])})"><ellipse cx="{sp[0]:.1f}" cy="{sp[1]:.1f}" rx="{r * 1.6:.1f}" ry="{r:.1f}" '
                    f'transform="rotate(-25 {sp[0]:.1f} {sp[1]:.1f})" fill="{white_radial(*sp, r * 1.6, ((0, op), (.5, op * .85), (1, 0)))}"/></g>')
        def bevel(el, body_paint, rim_col):
            """Crisp edges from light: a bright rim along the top-left edges and a darker band along the bottom-right."""
            (rx, ry), (bx, by) = S["rim"], S["band"]
            return (f'<g clip-path="url(#{clip([el])})">{el(0, 0, f"fill={chr(34)}{rim_col}{chr(34)}")}'
                    f'<g clip-path="url(#{clip([el], rx, ry)})">{el(0, 0, f"fill={chr(34)}{band_col}{chr(34)}")}'
                    f'{el(-bx, -by, f"fill={chr(34)}{body_paint}{chr(34)}")}</g></g>')
        drawn = []        # element functions already painted (they receive the next pieces' cast shadows)
        bb = []
        def cast(els_, dx=16, dy=20):
            if not drawn: return ""
            cid = clip(drawn)
            return (f'<g clip-path="url(#{cid})">' + "".join(
                f'<g opacity="{a}">' + "".join(e(dx, dy, f'fill="{NAVY}" stroke="{NAVY}" stroke-width="{w}" stroke-linejoin="round"') for e in els_) + "</g>"
                for w, a in S["cast"]) + "</g>")
        for name, ix, T in PIECES:
            T = np.array(T, float)
            if ix is None:   # a wheel: side (extruded back ellipse + band), face, hub
                c0, hub = next((c, h) for nm, c, h, _ in WHEELS if nm == name)
                c, hull, band = wheel_geom(np.array(c0) + T)
                faces = [(path_el(hull), pal["tyreSide"], True), (ell_el(c, WA, WB), pal["tyre"], False)]
                if hub: faces.append((ell_el(c, HUB_A, HUB_B), pal["hub"], False))
                els_ = [f[0] for f in faces]
                bb.append((c[0] + V[0] - WA, c[1] + V[1] - WA, c[0] + WA, c[1] + WA))
                geo = [(c + V / 2, ept(c + V / 2, np.radians(-150)), WA * WB * 3), (c, ept(c, np.radians(-150)), WA * WB * 3),
                       (c, ept(c, np.radians(-150), HUB_A, HUB_B), HUB_A * HUB_B * 3)]
                roles = [None] * len(faces)
            else:
                els_ = [use_el(i, T) for i in ix]
                faces = [(e, pal[ROLE[i]], False) for e, i in zip(els_, ix)]
                for i in ix: x_, y_, X_, Y_ = BBOX[i]; bb.append((x_ + T[0], y_ + T[1], X_ + T[0], Y_ + T[1]))
                geo = [(GEOM[i][0] + T, GEOM[i][1] + T, GEOM[i][2]) for i in ix]
                roles = [ROLE[i] for i in ix]
            body.append(cast(els_))
            if style == "gloss":  # extrusion: the piece's silhouette stacked toward the bottom-right in its deep shades
                for k in range(S["depth"], 0, -1):
                    for (e, v, _), r in zip(faces, roles):
                        col = DARKER[DARKER[last(v)]] if k > 2 else DARKER[last(v)]
                        body.append(e(3 * k, 4 * k, f'fill="{col}" stroke="{col}" stroke-width="{S["grow"]}" stroke-linejoin="round"'))
            if style == "clay":  # soft darker edge of each part's own hue, under the whole piece
                for (e, v, _), r in zip(faces, roles):
                    col = dark(colours(r) if r else v)
                    body.append(e(0, 0, f'fill="{col}" stroke="{col}" stroke-width="{S["grow"] + 2 * S["edge"]}" stroke-linejoin="round"'))
            else:                # close the source's gaps between faces with each face's own shadow tone (a soft crease)
                for (e, v, _), r in zip(faces, roles):
                    col = dark(colours(r) if r else v)
                    body.append(e(0, 0, f'fill="{col}" stroke="{col}" stroke-width="{S["grow"]}" stroke-linejoin="round"'))
            for (e, v, _), r, (c, tl, area) in zip(faces, roles, geo):
                vs = colours(r) if r else (list(v) if not isinstance(v, str) else [v]) + [DARKER[last(v)]]
                p = paint(vs); size = np.sqrt(area)
                band_col = DARKER[vs[-1]]
                glassy = style == "glass" and r in ("basket", "basketSide")
                parts = []
                if style == "clay":
                    parts.append(e(0, 0, f'fill="{p}" stroke="{p}" stroke-width="{S["grow"]}" stroke-linejoin="round"'))
                    parts.append(e(0, 0, f'fill="{core(DARKER[vs[-1]], .7)}"'))
                    parts.append(e(0, 0, f'fill="{white_radial(*(c + 0.55 * (tl - c)), max(size * 0.9, 30), ((0, .6), (.4, .25), (1, 0)))}"'))
                    if area > 2500: parts.append(spot(e, c, tl, size, .6))   # matte clay: a gentle spot
                else:
                    rim = WHITE if style == "gloss" else (LTEAL_T if last(vs) in (TEAL, LTEAL, DTEAL, MINT_SS, MINT_S) else WHITE)
                    parts.append(bevel(e, p, rim).replace(f'fill="{rim}"', f'fill="{rim}" fill-opacity="{S["rimOp"]}"', 1))
                    parts.append(e(0, 0, f'fill="{core(band_col, .55 if style == "gloss" else .35)}"'))
                    if style == "gloss":   # polished plastic: a broad glossy sheen top-left and a crisp specular spot
                        parts.append(e(0, 0, f'fill="{white_radial(*(c + 0.6 * (tl - c)), max(size * 0.75, 30), ((0, .75), (.35, .4), (.6, .08), (1, 0)))}"'))
                        if area > 1500: parts.append(spot(e, c, tl, size * 1.3, 1))
                    else:                  # glass: a soft sheen, a small spot on the larger faces
                        parts.append(e(0, 0, f'fill="{white_radial(*(c + 0.6 * (tl - c)), max(size * 0.8, 30), ((0, .35), (.5, .1), (1, 0)))}"'))
                        if area > 6000: parts.append(spot(e, c, tl, size, .85))
                body.append(f'<g opacity="{S["see"]}">{"".join(parts)}</g>' if glassy else "".join(parts))
            if name == "grip":
                body.append(f'<line x1="{GA[0] + T[0]:.1f}" y1="{GA[1] + T[1]:.1f}" x2="{GB[0] + T[0]:.1f}" y2="{GB[1] + T[1]:.1f}" stroke="{pal["gripHi"]}" '
                            f'stroke-width="{GHALF * 0.3:.1f}" stroke-linecap="round" opacity=".85"/>')
            if ix is None and len(faces) == 3:   # hub glint
                g = c + ROT @ np.array([-HUB_A * 0.15, -HUB_B * 0.45])
                body.append(ell(g, HUB_A * 0.32, HUB_B * 0.18, f' fill="{pal["hubHi"]}"'))
            drawn.extend(els_)
        # contact shadow under the whole cart and a darker one under each wheel (radial gradients, no blur)
        g0 = S["ground"]
        def rg(gid, stops):
            defs.append(f'<radialGradient id="{gid}">' + "".join(f'<stop offset="{o}" stop-color="{NAVY}" stop-opacity="{a:.2f}"/>' for o, a in stops) + "</radialGradient>")
        rg(f"{pre}-shadow", ((0, g0), (.35, g0 * .75), (.6, g0 * .4), (.8, g0 * .14), (1, 0)))
        rg(f"{pre}-contact", ((0, min(g0 + .1, .85)), (.5, g0 * .55), (1, 0)))
        cx, cy, rx, ry = 2180, 2080, 960, 290
        shadow = f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate(8 {cx} {cy})" fill="url(#{pre}-shadow)"/>'
        for nm, wc, _, _ in WHEELS:
            T = next(t for n_, _, t in PIECES if n_ == nm)
            lo = max((ept(np.array(wc) + T, t) for t in np.linspace(0, 2 * np.pi, 360)), key=lambda q: q[1])
            shadow += f'<ellipse cx="{lo[0] - 25:.1f}" cy="{lo[1] + 4:.1f}" rx="200" ry="55" fill="url(#{pre}-contact)"/>'
        g = S["grow"] / 2 + S.get("edge", 0) + 3 * S.get("depth", 0) + 4
        bb = np.array(bb); x0, y0 = bb[:, :2].min(0) - g; x1, y1 = bb[:, 2:].max(0) + g + 3 * S.get("depth", 0)
        x0, x1, y1 = min(x0, cx - rx), max(x1, cx + rx), max(y1, cy + ry + 150)

    pad = 0.04 * (x1 - x0)
    vb = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" '
           f'width="{vb[2]:.0f}" height="{vb[3]:.0f}"><defs>{shapes_defs}{"".join(defs)}</defs>{shadow}{"".join(body)}</svg>')
    assert "filter" not in svg and "Blur" not in svg and "<style" not in svg and "<image" not in svg
    ids = re.findall(r'\sid="([^"]+)"', svg)
    assert len(ids) == len(set(ids)) and all(x.startswith(pre + "-") for x in ids)
    for ref in re.findall(r'(?:url\(#|href="#)([^)"]+)', svg): assert ref in ids, ref
    for c in set(re.findall(r'#[0-9a-fA-F]{6}\b', svg)):   # brand colours, their tints and shades only
        assert c.lower() in ALLOWED, (pre, c)
    name = f"{pre}.svg"
    open(os.path.join(OUT, name), "w").write(svg)
    return name

ALLOWED = {NAVY, MID, YOLK, YOLK_T, YOLK_TT, ORANGE, AMBER, SKY, SKY_T, SKY_TT, SKY_S, LBLUE, MINT, MINT_T, MINT_S, MINT_SS,
           GL, GL_T, GL_S, GL_SS, TEAL, DTEAL, LTEAL, LTEAL_T, WHITE, "#fff4d6", "#5cb8e6", "#2f8fc4", "#8fd3f2", "#1d6a96"}
print([build(k, st) for k in "AB" for st in ("outlined", "clay", "glass", "gloss")])
