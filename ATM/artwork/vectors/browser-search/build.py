# Browser window with magnifier: redraws the stock art (traced, jagged, purple) as clean brand-coloured geometry.
# Positions come from the source shapes (role map below); every part is drawn as a closed path, true circle or
# ellipse, so outlines are one even stroke. Writes browser-search-{A,B}.svg (3D outlined) and browser-search-{A,B}-{clay,glass,gloss}.svg (no outline) next to this script.
#   python3 build.py <p5.svg from pdftocairo -svg>
import re, sys, math, os
import numpy as np

SRC = sys.argv[1]
OUT = os.path.dirname(os.path.abspath(__file__))
s = open(SRC).read()
body = s[s.index("</defs>"):]
els = list(re.finditer(r'<path\b[^>]*?/>', body))
assert len(els) == 84, len(els)

# ---- role map: the source shapes we take positions from (everything else is dropped and redrawn) ----
ROLE = {}
def put(r, *ix):
    for i in ix: ROLE[i] = r
put("dot0", 22); put("dot1", 17); put("dot2", 18, 26)                # red, yellow, green dots
put("pill0", 56); put("pill1", 33, 53); put("pill2", 34, 52); put("pill3", 28); put("pill4", 55)  # text lines (+ right ends beside the lens)
put("lensOut", 10); put("lensOpen", 71)                              # the rim's outside, the glass opening
put("handle", 1)                                                     # handle outline (dark brown)

def pts(i):
    """Flattened points of shape i's first subpath (beziers sampled)."""
    d = re.search(r'\sd="([^"]+)"', els[i].group(0)).group(1)
    toks = re.findall(r'[MLCZ]|-?\d+\.?\d*', d); out, k, cmd, p = [], 0, None, None
    while k < len(toks):
        if toks[k] in "MLCZ": cmd = toks[k]; k += 1
        if cmd == "Z": break
        if cmd in "ML":
            p = (float(toks[k]), float(toks[k + 1])); out.append(p); k += 2; cmd = "L"
        else:
            c = [float(x) for x in toks[k:k + 6]]; k += 6
            for n in range(1, 9):
                t = n / 8; a, b, cc, dd = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
                out.append((a * p[0] + b * c[0] + cc * c[2] + dd * c[4], a * p[1] + b * c[1] + cc * c[3] + dd * c[5]))
            p = (c[4], c[5])
    return out
def bbox(*ix):
    P = [q for i in ix for q in pts(i)]
    return min(x for x, _ in P), min(y for _, y in P), max(x for x, _ in P), max(y for _, y in P)
def fit_ellipse(i):
    """Least-squares ellipse: centre, (semi-axis along angle, semi-axis across), angle in degrees."""
    P = np.array(pts(i)); x, y = P[:, 0], P[:, 1]
    a, b, c, d, e = np.linalg.lstsq(np.stack([x * x, x * y, y * y, x, y], 1), np.ones_like(x), rcond=None)[0]
    M = np.array([[a, b / 2], [b / 2, c]]); cen = np.linalg.solve(2 * M, [-d, -e])
    k = 1 - d * cen[0] / 2 - e * cen[1] / 2
    w, v = np.linalg.eigh(M); ax = np.sqrt(k / w)
    j = int(np.argmax(ax)); ang = math.degrees(math.atan2(v[1, j], v[0, j])) % 180
    return (round(cen[0]), round(cen[1])), (round(ax[j]), round(ax[1 - j])), round(ang)
assert set(ROLE) <= set(range(84))

# ---- geometry (source units) ----
DOTS = []
for r in ("dot0", "dot1", "dot2"):
    x0, y0, x1, y1 = bbox(*[i for i, v in ROLE.items() if v == r])
    DOTS.append(((x0 + x1) / 2, 375))                                # all three sit on one line
DOT_R = 50
PILLS = []
for n in range(5):
    ix = [i for i, v in ROLE.items() if v == f"pill{n}"]
    x0, y0, x1, y1 = bbox(*ix)
    _, y0, _, y1 = bbox(ix[0])
    PILLS.append((round(x0), round(y0) + 2, round(x1), round(y1) - 2))
(LCX, LCY), (LA, LB), LANG = fit_ellipse(10)                          # rim outside, long axis toward the handle
(OCX, OCY), (OA, OB), OANG = fit_ellipse(71)                          # glass opening (up-left of the rim's centre: the rim's depth shows bottom-right)
LA, LB = LA - 4, LB - 4                                               # outline centred on the traced outline
hx0, hy0, hx1, hy1 = bbox(1)
HANG = math.degrees(math.atan2((hy0 + hy1) / 2 - LCY, (hx0 + hx1) / 2 - LCX))   # handle axis runs through the lens centre
HCX, HCY = 3061, 2145                                                 # handle centre (handle fitted on its axis: 744 long, 312 wide)
HL, HW = 368, 154
# Window: a tilted slab. Front face edges measured off the source outline; the side faces (left and bottom) are
# the front face pushed back by DEPTH.
SKEW = 0.075                                                          # both side edges lean right by 0.075 per unit down
TOP, BOT, BAR = 241, 2268, 540
LEFT = lambda y: 683 + SKEW * (y - 500)
RIGHT = lambda y: 3036 + SKEW * (y - 1000)
DEPTH = (-62, 74)
PILL_DEPTH = (-44, 56)
SHADOW = (-70, 150)                                                   # the magnifier's shadow on the screen
def rim_right(y):  # rightmost x of the rim's outside at height y
    c, s_ = math.cos(math.radians(LANG)), math.sin(math.radians(LANG))
    E = [(LCX + LA * math.cos(t) * c - LB * math.sin(t) * s_, LCY + LA * math.cos(t) * s_ + LB * math.sin(t) * c)
         for t in [k * math.pi / 720 for k in range(1440)]]
    return max(x for x, yy in E if abs(yy - y) < 4)
# the two lines that run under the lens stopped just at its edge (a sliver of end cap touching the rim):
# each now pokes out clearly past the rim where there's room, or ends hidden under the rim where there isn't
for n in (1, 2):
    x0, y0, x1, y1 = PILLS[n]; x1 = round(rim_right((y0 + y1) / 2) + 95)
    if x1 + 70 > RIGHT(y0): x1 = round(min(rim_right(y0), rim_right(y1)) - 60)
    PILLS[n] = (x0, y0, x1, y1)

def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy); return dx / l, dy / l
def rpoly(P, R, samples=False):
    """Clockwise polygon with exact circular fillets of radius R[i] at each corner: path d, and sampled outline points."""
    n = len(P); segs = []
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        u1, u2 = unit(b, a), unit(b, c)
        th = math.acos(max(-1, min(1, u1[0] * u2[0] + u1[1] * u2[1])))
        t = R[i] / math.tan(th / 2)
        pin, pout = (b[0] + u1[0] * t, b[1] + u1[1] * t), (b[0] + u2[0] * t, b[1] + u2[1] * t)
        bis = unit((0, 0), (u1[0] + u2[0], u1[1] + u2[1])); h = R[i] / math.sin(th / 2)
        segs.append((pin, pout, (b[0] + bis[0] * h, b[1] + bis[1] * h)))
    f = lambda p: f"{p[0]:.1f},{p[1]:.1f}"
    d = f"M{f(segs[0][1])}"
    for i in list(range(1, n)) + [0]:
        pin, pout, _ = segs[i]; d += f" L{f(pin)} A{R[i]},{R[i]} 0 0 1 {f(pout)}"
    d += " Z"
    sp = []
    for i, (pin, pout, cen) in enumerate(segs):
        a0 = math.atan2(pin[1] - cen[1], pin[0] - cen[0]); a1 = math.atan2(pout[1] - cen[1], pout[0] - cen[0])
        if a1 < a0: a1 += 2 * math.pi
        for k in range(25):
            a = a0 + (a1 - a0) * k / 24; sp.append((cen[0] + R[i] * math.cos(a), cen[1] + R[i] * math.sin(a)))
    return d, sp
def hull(P):
    P = sorted(set((round(x, 1), round(y, 1)) for x, y in P))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    H = lo[:-1] + up[:-1]
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in H) + " Z", H
def extrude(sp, dv):
    return hull(sp + [(x + dv[0], y + dv[1]) for x, y in sp])

def window(r, depth=DEPTH):
    face = [(LEFT(TOP), TOP), (RIGHT(TOP), TOP), (RIGHT(BOT), BOT), (LEFT(BOT), BOT)]
    bar = [(LEFT(TOP), TOP), (RIGHT(TOP), TOP), (RIGHT(BAR), BAR), (LEFT(BAR), BAR)]
    fd, fsp = rpoly(face, [r] * 4)
    bd, _ = rpoly(bar, [r, r, 0.01, 0.01])
    sd, ssp = extrude(fsp, depth)
    return fd, bd, sd, ssp
def pill(p, grow=0):
    x0, y0, x1, y1 = p; h = (y1 - y0) / 2
    return rpoly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], [h] * 4)

# ---- brand palette ----
NAVY, MID, TEAL, DTEAL, LTEAL, LBLUE, SKY, YOLK, ORANGE, AMBER = (
    "#002c44", "#11232d", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#00acdd", "#ffcc40", "#f6a11d", "#e08a12")
GLACIER, MINT, WHITE = "#d9eeff", "#bce2d7", "#ffffff"
YOLK_T, YOLK_TT = "#ffe07a", "#fff0b8"
SKY_T, SKY_TT, SKY_S = "#5fd0f2", "#9fe3f8", "#0094c6"
MINT_T, MINT_S, MINT_SS = "#d6f0e8", "#8fd3c0", "#5fbfa6"
GLACIER_T, GLACIER_S, GLACIER_SS = "#eef7ff", "#a9d3ef", "#7fb9e3"
LTEAL_T = "#8fe0e0"
# each part: [light, base, (shade)], light at top-left; "edge" is the clay version's soft same-hue rim
SCHEMES = {
    "A": dict(name="Glacier window, teal bar, sky lens",
              side=[GLACIER_S, GLACIER_SS], sideEdge=GLACIER_SS, body=[GLACIER_T, GLACIER, GLACIER_S], bodyHi=WHITE, bodyEdge=GLACIER_SS,
              bar=[LTEAL, TEAL], barHi=LTEAL_T, barEdge=DTEAL,
              dots=[(YOLK_T, YOLK, ORANGE), (WHITE, GLACIER, GLACIER_S), (SKY_TT, SKY_T, SKY)],
              pill=[SKY_T, SKY], pillSide=[SKY, SKY_S], pillHi=SKY_TT, pillEdge=SKY_S,
              hit=[YOLK_T, YOLK], hitSide=[ORANGE, AMBER], hitHi=YOLK_TT, hitEdge=AMBER,
              shadow=(GLACIER_S, 1),
              ring=[SKY_TT, SKY_T, SKY], ringHi=GLACIER_T, ringEdge=SKY_S, wall=[LBLUE, SKY_S], glass=(LTEAL_T, .35),
              neck=[GLACIER_T, GLACIER_S, GLACIER_SS], neckEdge=GLACIER_SS,
              handle=[YOLK_TT, YOLK_T, YOLK, ORANGE], handleHi=YOLK_TT, handleEdge=AMBER),
    "B": dict(name="Light-teal window, sky bar, glacier lens",
              side=[TEAL, DTEAL], sideEdge=DTEAL, body=[LTEAL_T, LTEAL], bodyHi=MINT_T, bodyEdge=TEAL,
              bar=[SKY, LBLUE], barHi=SKY_T, barEdge=LBLUE,
              dots=[(YOLK_T, YOLK, ORANGE), (WHITE, GLACIER, GLACIER_S), (MINT_T, MINT, MINT_S)],
              pill=[WHITE, GLACIER], pillSide=[GLACIER_S, GLACIER_SS], pillHi=WHITE, pillEdge=GLACIER_SS,
              hit=[YOLK_T, YOLK], hitSide=[ORANGE, AMBER], hitHi=YOLK_TT, hitEdge=AMBER,
              shadow=(TEAL, .55),
              ring=[GLACIER_T, GLACIER, GLACIER_S], ringHi=WHITE, ringEdge=GLACIER_SS, wall=[GLACIER_SS, GLACIER_S], glass=(SKY_TT, .3),
              neck=[GLACIER_T, GLACIER_S, GLACIER_SS], neckEdge=GLACIER_SS,
              handle=[YOLK_T, YOLK, ORANGE, AMBER], handleHi=YOLK_TT, handleEdge=AMBER),
}
HIT = 2  # the text line under the lens is the "search hit", in egg yolk

class Defs:
    """Gradients with ids unique per file."""
    def __init__(self, pre): self.pre, self.items, self.n = pre, [], 0
    def new(self, tag): self.n += 1; return f"{self.pre}-{tag}{self.n}"
    def lin(self, cols, ops=None, **at):
        i = self.new("g"); a = dict(x1=0, y1=0, x2=1, y2=1); a.update(at)
        self.items.append(f'<linearGradient id="{i}" ' + " ".join(f'{k}="{v}"' for k, v in a.items()) + f'>{stops(cols, ops)}</linearGradient>')
        return f"url(#{i})"
    def rad(self, cols, ops=None, **at):
        i = self.new("g"); a = dict(cx=.32, cy=.26, r=.9, fx=.28, fy=.2); a.update(at)
        self.items.append(f'<radialGradient id="{i}" ' + " ".join(f'{k}="{v}"' for k, v in a.items()) + f'>{stops(cols, ops)}</radialGradient>')
        return f"url(#{i})"
    def glow(self, color, op):  # soft light spot or shadow: bell-shaped fade, no filters
        i = self.new("s")
        self.items.append(f'<radialGradient id="{i}">' + "".join(
            f'<stop offset="{o}" stop-color="{color}" stop-opacity="{a * op:.3f}"/>'
            for o, a in ((0, 1), (.25, .8), (.45, .47), (.6, .25), (.72, .12), (.83, .04), (.92, .012), (1, 0))) + "</radialGradient>")
        return f"url(#{i})"
def stops(cols, ops=None):
    n = len(cols) - 1
    return "".join(f'<stop offset="{k / n:.2f}" stop-color="{c}"' + (f' stop-opacity="{ops[k]}"' if ops else "") + "/>" for k, c in enumerate(cols))

W0 = 2860                        # art width (stroke centres), for the outline scale; asserted below
SW = round(19 * W0 / 2120, 1)    # navy outline: 19 units when the art is 2120 wide
LENS = lambda: f'<ellipse cx="{LCX}" cy="{LCY}" rx="{LA}" ry="{LB}" transform="rotate({LANG} {LCX} {LCY})"'
OPEN = lambda: f'<ellipse cx="{OCX}" cy="{OCY}" rx="{OA}" ry="{OB}" transform="rotate({OANG} {OCX} {OCY})"'
HAND = lambda: f'transform="translate({HCX} {HCY}) rotate({HANG:.1f})"'

def crop(P, extra=()):
    x0, y0 = min(x for x, _ in P) - SW, min(y for _, y in P) - SW
    x1, y1 = max(x for x, _ in P) + SW, max(y for _, y in P) + SW
    for ex0, ey0, ex1, ey1 in extra: x0, y0, x1, y1 = min(x0, ex0), min(y0, ey0), max(x1, ex1), max(y1, ey1)
    w = x1 - x0; pad = .04 * w
    return (round(x0 - pad), round(y0 - pad), round(w + 2 * pad), round(y1 - y0 + 2 * pad)), x1 - x0 - 2 * SW
def hand_pts():
    hc, hs = math.cos(math.radians(HANG)), math.sin(math.radians(HANG))
    return [(HCX + a * hc - b * hs, HCY + a * hs + b * hc) for a in (-HL, HL) for b in (-HW, HW)]
def write(name, vb, D, o):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, vb))}" width="{vb[2]}" height="{vb[3]}">'
           f'<defs>{"".join(D.items)}</defs>{"".join(o)}</svg>')
    assert "<filter" not in svg and "Blur" not in svg
    ids = re.findall(r'id="([^"]+)"', svg); assert len(ids) == len(set(ids)) and all(i.startswith("bs-") for i in ids)
    open(f"{OUT}/{name}", "w").write(svg)

def glass(D, o, gc, gop):
    # tinted toward its top-left edge, clear in the middle, so the lines behind keep their colour
    o.append(f'{OPEN()} fill="{D.lin([gc, gc, gc], [min(1, gop * 2), gop * .5, 0], x2=.75, y2=.75)}"/>')
    o.append(f'<path d="M{OCX - OA * .62:.0f},{OCY + 40:.0f} A{OA * .7:.0f},{OB * .78:.0f} 0 0 1 {OCX - 60:.0f},{OCY - OB * .66:.0f}" '
             f'transform="rotate({OANG - 90} {OCX} {OCY})" fill="none" stroke="{WHITE}" stroke-width="{SW * 1.7:.0f}" stroke-linecap="round" opacity=".75"/>')
    o.append(f'<circle cx="{OCX + 130}" cy="{OCY - 210}" r="{SW * .9:.0f}" fill="{WHITE}" opacity=".75"/>')
def hole(D):
    i = D.new("hole")
    D.items.append(f'<mask id="{i}" maskUnits="userSpaceOnUse" x="0" y="0" width="4200" height="2800"><rect width="4200" height="2800" fill="#fff"/>{OPEN()} fill="#000"/></mask>')
    return f"url(#{i})"

def build(key):
    """3D outlined: faces as tint-to-base gradients, every edge one even navy stroke."""
    pal = SCHEMES[key]; D = Defs(f"bs-{key}")
    ln = lambda: f' stroke="{NAVY}" stroke-width="{SW}" stroke-linejoin="round" stroke-linecap="round"'
    fd, bd, sd, ssp = window(190)
    o = [f'<path d="{sd}" fill="{D.lin(pal["side"], x2=0)}"{ln()}/>', f'<path d="{fd}" fill="{D.lin(pal["body"], x2=.6)}"/>']
    clip = D.new("screen"); D.items.append(f'<clipPath id="{clip}"><path d="{fd}"/></clipPath>')
    sc, sop = pal["shadow"]  # the magnifier's shadow on the screen, under the screen's outline and the lines
    o.append(f'<g clip-path="url(#{clip})" fill="{sc}" opacity="{sop}"><g transform="translate({SHADOW[0]} {SHADOW[1]})">{LENS()}/>'
             f'<g {HAND()}><rect x="{-HL - 280}" y="-62" width="300" height="124"/><rect x="{-HL}" y="{-HW}" width="{2 * HL}" height="{2 * HW}" rx="60"/></g></g></g>')
    hx = lambda y: LEFT(y) + 70
    o.append(f'<path d="M{hx(BAR + 90):.0f},{BAR + 90} L{hx(BOT - 260):.0f},{BOT - 260}" stroke="{pal["bodyHi"]}" stroke-width="{SW * 1.4:.0f}" stroke-linecap="round" opacity=".85"/>')
    o.append(f'<path d="{fd}" fill="none"{ln()}/>')
    o.append(f'<path d="{bd}" fill="{D.lin(pal["bar"], x2=0)}"{ln()}/>')
    o.append(f'<path d="M{LEFT(TOP + 70) + 110:.0f},{TOP + 62} H{RIGHT(TOP) - 260:.0f}" stroke="{pal["barHi"]}" stroke-width="{SW * 1.2:.0f}" stroke-linecap="round" opacity=".8"/>')
    for (cx, cy), (hi, base, sh) in zip(DOTS, pal["dots"]):
        o.append(f'<circle cx="{cx:.0f}" cy="{cy}" r="{DOT_R}" fill="{D.lin([hi, base, sh], x1=.2, y1=.1, x2=.8)}"{ln()}/>')
        o.append(f'<ellipse cx="{cx - 16:.0f}" cy="{cy - 18}" rx="17" ry="11" transform="rotate(-35 {cx - 16:.0f} {cy - 18})" fill="{WHITE}" opacity=".85"/>')
    for n, p in enumerate(PILLS):  # each line a raised pill: top face over its side; the one under the lens in egg yolk
        k = "hit" if n == HIT else "pill"
        d, sp = pill(p); side, _ = extrude(sp, PILL_DEPTH)
        o.append(f'<path d="{side}" fill="{D.lin(pal[k + "Side"], x2=0)}"{ln()}/>')
        o.append(f'<path d="{d}" fill="{D.lin(pal[k], x2=0)}"{ln()}/>')
        x0, y0, x1, y1 = p; h = (y1 - y0) / 2
        o.append(f'<path d="M{x0 + h * .75:.0f},{y0 + 30} H{min(x1 - h, x0 + h + 340):.0f}" stroke="{pal[k + "Hi"]}" stroke-width="{SW * .9:.0f}" stroke-linecap="round"/>')
    # magnifier: neck, rim around the glass, the rim's inside wall, glass, outlines, handle
    o.append(f'<g {HAND()}><rect x="{-HL - 280}" y="-62" width="300" height="124" fill="{D.lin(pal["neck"], x2=0)}"{ln()}/>'
             f'<path d="M{-HL - 270},-24 H{-HL}" stroke="{WHITE}" stroke-width="{SW * .9:.0f}" stroke-linecap="round" opacity=".9"/></g>')
    h = hole(D)
    o.append(f'{LENS()} fill="{D.lin(pal["ring"])}" mask="{h}"/>')
    o.append(f'<ellipse cx="{LCX - 4}" cy="{LCY - 8}" rx="{LA - 112}" ry="{LB - 92}" transform="rotate({LANG} {LCX} {LCY})" fill="{D.lin(pal["wall"], x1=1, y1=1, x2=0, y2=0)}" mask="{h}"/>')
    glass(D, o, *pal["glass"])
    o.append(f'<path d="M{LCX - LA + 50},{LCY} A{LA - 50},{LB - 50} 0 0 1 {LCX},{LCY - LB + 50}" transform="rotate({LANG} {LCX} {LCY})" fill="none" stroke="{pal["ringHi"]}" stroke-width="{SW * 1.3:.0f}" stroke-linecap="round" opacity=".9"/>')
    o.append(f'{OPEN()} fill="none"{ln()}/>'); o.append(f'{LENS()} fill="none"{ln()}/>')
    o.append(f'<g {HAND()}><rect x="{-HL}" y="{-HW}" width="{2 * HL}" height="{2 * HW}" rx="60" fill="{D.lin(pal["handle"], x2=0)}"{ln()}/>'
             f'<path d="M{-HL + 54:.0f},{-HW + 62} H{HL - 100:.0f}" stroke="{pal["handleHi"]}" stroke-width="{SW * 1.6:.0f}" stroke-linecap="round" opacity=".9"/>'
             f'<path d="M{-HL + 50:.0f},{HW - 60} H{HL - 70:.0f}" stroke="{pal["handle"][-1]}" stroke-width="{SW * 1.3:.0f}" stroke-linecap="round" opacity=".55"/></g>')
    vb, artw = crop(ssp + [(x + DEPTH[0], y + DEPTH[1]) for x, y in ssp] + hand_pts())
    assert abs(SW * 2120 / artw - 19) < .3
    name = f"browser-search-{key}.svg"; write(name, vb, D, o)
    return name, vb, artw

# ---- no-outline styles (clay, glass, gloss). Ramps run spec/light -> light -> base -> shade -> deep, all one hue ----
GL5 = ["#ffffff", "#eef7ff", "#d9eeff", "#a9d3ef", "#7fb9e3"]          # glacier
GLD = ["#a9d3ef", "#7fb9e3", "#5ea3d4", "#3f87bd"]                     # glacier, deeper (side faces)
TE5 = ["#8fe0e0", "#3bbfc0", "#059390", "#007a77", "#00615e"]          # teal
SK5 = ["#9fe3f8", "#5fd0f2", "#00acdd", "#0094c6", "#0079a9"]          # sky
SKL = ["#d4f3fc", "#9fe3f8", "#5fd0f2", "#00acdd", "#0094c6"]          # sky, lighter
YO5 = ["#fff0b8", "#ffe07a", "#ffcc40", "#f6a11d", "#e08a12"]          # egg yolk
OR5 = ["#ffe07a", "#ffcc40", "#f6a11d", "#e08a12", "#c97a0c"]          # orange
LT5 = ["#d2f3f3", "#8fe0e0", "#3bbfc0", "#1fa9a8", "#059390"]          # light teal
TED = ["#3bbfc0", "#059390", "#00615e", "#004a48"]                     # teal, deeper (side faces)
MI5 = ["#ffffff", "#d6f0e8", "#bce2d7", "#8fd3c0", "#5fbfa6"]          # mint
CLAY = {
    "A": dict(body=GL5, side=GLD, bar=TE5, dots=(YO5, GL5, SKL), pill=SK5, hit=YO5, ring=SKL, wall=["#0094c6", "#0079a9", "#00acdd"],
              neck=GL5, handle=YO5, occ="#3f87bd", ground=NAVY, glass=(LTEAL_T, .35)),
    "B": dict(body=LT5, side=TED, bar=SK5, dots=(YO5, GL5, MI5), pill=GL5, hit=YO5, ring=GL5, wall=["#7fb9e3", "#5ea3d4", "#a9d3ef"],
              neck=GL5, handle=OR5, occ="#00615e", ground=NAVY, glass=(SKY_TT, .3)),
}
STYLES = {  # no-outline 3D styles: corner radius, slab and line depth, contact-shadow strength
    "clay": dict(R=260, depth=DEPTH, pdepth=PILL_DEPTH, ground=.6),
    "glass": dict(R=190, depth=DEPTH, pdepth=PILL_DEPTH, ground=.6),
    "gloss": dict(R=220, depth=(-96, 112), pdepth=(-58, 72), ground=.8),
}
def build_soft(key, style):
    """No ink outline, three looks sharing one layout:
    clay  - puffy radial fills (lit top-left, core shade bottom-right), soft light + crisp specular spot, thin darker same-hue rims;
    glass - crisp faces separated by value, thin bright rim light on lit edges and a darker same-hue band on shadow edges,
            the lens a translucent teal glass like the lesson card;
    gloss - deeper slab, saturated gradients, bevelled edges (white lip top-left, deep lip bottom-right), strong white
            reflections like polished plastic.
    All: occlusion where parts meet, soft shadows under parts, a navy contact shadow under the object."""
    st = STYLES[style]; clay, glassy, gloss = style == "clay", style == "glass", style == "gloss"
    pal = CLAY[key]; D = Defs(f"bs-{key}{style[:2]}"); EW = round(SW * .5, 1)
    def puff(ramp, **at):
        if clay: return D.rad(ramp[:5], **({"cx": .34, "cy": .28, "r": .95, "fx": .26, "fy": .18} | at))
        if glassy: return D.lin(ramp[:3], x1=.1, y1=0, x2=.35, y2=1)
        return D.lin(ramp[1:5], x1=.1, y1=0, x2=.35, y2=1)
    def rim(r):
        if clay: return f' stroke="{r[-1]}" stroke-width="{EW}" stroke-linejoin="round"'
        light = r[0] if glassy else WHITE  # lit edge top-left, fading out, then a darker same-hue band bottom-right
        g = D.lin([light, light, r[-1], r[-1]], [.85 if glassy else .95, 0, 0, .9], x1=0, y1=0, x2=.6, y2=1)
        return f' stroke="{g}" stroke-width="{EW * (1.1 if glassy else 1.8):.1f}" stroke-linejoin="round"'
    spec = lambda x, y, rx, ry, a=-35: f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx}" ry="{ry}" transform="rotate({a} {x:.0f} {y:.0f})" fill="{WHITE}" opacity=".95"/>'
    soft = lambda x, y, rx, ry, c, op, a=0: f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" transform="rotate({a:.1f} {x:.0f} {y:.0f})" fill="{D.glow(c, op)}"/>'
    def soft_pill(d_grow, dx, dy, c, op, p):  # a pill-shaped soft shadow: four growing pills, each faint (no blur)
        x0, y0, x1, y1 = p
        return "".join(f'<path d="{pill((x0 - g + dx, y0 - g + dy, x1 + g + dx, y1 + g + dy))[0]}" fill="{c}" opacity="{op}"/>' for g in d_grow)
    # spaced out so every piece reads as its own form: dots smaller and further apart, thinner lines with more room
    # between them, and the magnifier lifted up-right off the window (MAG) so it floats over its own shadow
    dots, dot_r = [(DOTS[0][0] + k * 175, DOTS[0][1]) for k in range(3)], 44
    pills = [(x0 + 10, y - 50, x1, y + 50) for (x0, _, x1, _), y in zip(PILLS, [BAR + 230 + k * 320 for k in range(5)])]
    MAG = (50, -70)
    DEP, PDEP = st["depth"], st["pdepth"]
    fd, bd, sd, ssp = window(st["R"], DEP)
    o = []
    # contact shadow under the whole object (and the handle's end), dark navy fading out, so it shows on the teal card
    gy = BOT + DEP[1]
    o.append(soft(1880, gy + 70, 1560, 160, pal["ground"], st["ground"]))
    o.append(soft(1880, gy + 40, 1300, 70, pal["ground"], st["ground"] + .05))
    hx_, hy_ = HCX + HL * math.cos(math.radians(HANG)), HCY + HL * math.sin(math.radians(HANG))
    o.append(soft(hx_ - 10, hy_ + 110, 330, 90, pal["ground"], st["ground"]))
    # slab: deep side faces, then the puffy front face
    o.append(f'<path d="{sd}" fill="{D.lin(pal["side"], x1=.2, y1=0, x2=.5, y2=1)}"{rim(pal["side"])}/>')
    o.append(f'<path d="{fd}" fill="{puff(pal["body"], cx=.3, cy=.22, r=1.05, fx=.2, fy=.12)}"/>')
    clip = D.new("screen"); D.items.append(f'<clipPath id="{clip}"><path d="{fd}"/></clipPath>')
    sh = []  # shadows and occlusion on the screen, clipped to it
    sh.append(f'<rect x="0" y="{BAR}" width="4200" height="110" fill="{D.lin([pal["occ"], pal["occ"]], [.55, 0], x2=0)}"/>')  # under the bar
    sh.append(f'<path d="{fd}" fill="none" stroke="{D.lin([pal["occ"], pal["occ"], pal["occ"]], [0, .25, .6], x1=0, y1=0, x2=1, y2=1)}" stroke-width="90"/>')  # inner rim darkens to the bottom-right
    sh.append(soft(LCX - 130, LCY + 230, LA + 90, LB + 80, pal["occ"], 1, LANG))  # the magnifier's soft shadow, well below it (it floats)
    sh.append(soft(HCX - 130, HCY + 190, HL + 100, HW + 70, pal["occ"], .7, HANG))
    o.append(f'<g clip-path="url(#{clip})">{"".join(sh)}</g>')
    if not glassy: o.append(soft(LEFT(800) + 520, 820, 520, 300, WHITE, .55))  # soft light top-left of the screen
    if gloss:  # a polished reflection across the screen's top-left
        o.append(f'<g clip-path="url(#{clip})"><path d="M{LEFT(BAR)-50:.0f},{BAR} H1500 L{LEFT(1500)-50:.0f},1500 Z" fill="{D.lin([WHITE, WHITE], [.6, 0], x1=0, y1=0, x2=.7, y2=.7)}"/></g>')
    o.append(f'<path d="{fd}" fill="none"{rim(pal["body"])}/>')
    # top bar, its glossy lip, the dots each with a tiny shadow, a highlight and a specular spot
    o.append(f'<path d="{bd}" fill="{puff(pal["bar"], cx=.3, cy=.1, r=1.1, fx=.25, fy=0)}"{rim(pal["bar"])}/>')
    o.append(f'<path d="M{LEFT(TOP + 70) + 140:.0f},{TOP + 58} H{RIGHT(TOP) - 300:.0f}" stroke="{pal["bar"][0]}" stroke-width="{SW * 1.3:.0f}" stroke-linecap="round" opacity=".75"/>')
    if not glassy: o.append(soft(LEFT(TOP) + 420, TOP + 90, 340, 70, WHITE, .5))
    if gloss:  # polished sheen over the bar's upper half
        o.append(f'<g clip-path="url(#{clip})"><rect x="0" y="{TOP}" width="4200" height="{(BAR - TOP) * .5:.0f}" fill="{D.lin([WHITE, WHITE], [.4, .05], x2=0)}"/></g>')
    for (cx, cy), r in zip(dots, pal["dots"]):
        o.append(soft(cx + 12, cy + 26, dot_r * 1.15, dot_r * .7, pal["bar"][4], .7))
        o.append(f'<circle cx="{cx:.0f}" cy="{cy}" r="{dot_r}" fill="{puff(r)}"{rim(r)}/>')
        o.append(spec(cx - 15, cy - 17, 12, 8))
    # text lines: soft shadow on the screen, a thick deep side, a puffy top with a soft and a crisp highlight
    for n, p in enumerate(pills):
        r = pal["hit" if n == HIT else "pill"]
        x0, y0, x1, y1 = p; h = (y1 - y0) / 2
        o.append(f'<g clip-path="url(#{clip})">{soft_pill((34, 22, 10, 0), PDEP[0] + 18, PDEP[1] + 30, pal["occ"], .14, p)}</g>')
        d, sp = pill(p); side, _ = extrude(sp, PDEP)
        o.append(f'<path d="{side}" fill="{D.lin([r[3], r[4]], x1=0, y1=0, x2=0, y2=1)}"{rim(r) if not glassy else ""}/>')
        top = [r[0], r[1], r[2], r[3]] if not gloss else [r[1], r[2], r[3]]
        o.append(f'<path d="{d}" fill="{D.lin(top, x1=0, y1=0, x2=.05, y2=1)}"{rim(r)}/>')
        o.append(f'<path d="M{x0 + h * .8:.0f},{y0 + 30} H{min(x1 - h, x0 + h + 380):.0f}" stroke="{WHITE}" stroke-width="{SW * 1.1:.0f}" stroke-linecap="round" opacity="{.95 if gloss else .7}"/>')
        if gloss:  # polished sheen over the top half of the line
            o.append(f'<path d="{pill((x0 + h * .3, y0 + 6, x1 - h * .3, y0 + h * .95))[0]}" fill="{D.lin([WHITE, WHITE], [.55, .1], x2=0)}"/>')
        o.append(spec(x0 + h * .62, y0 + 30, 11, 7, -20))
    i0 = len(o)
    # magnifier. Neck tucks under the rim and the handle: deep ends (occlusion), lit stripe
    o.append(f'<g {HAND()}><rect x="{-HL - 280}" y="-62" width="300" height="124" fill="{D.lin(pal["neck"][1:], x2=0)}"{rim(pal["neck"])}/>'
             f'<rect x="{-HL - 280}" y="-62" width="300" height="124" fill="{D.lin([pal["neck"][4]] * 4, [.75, 0, 0, .75])}" />'
             f'<path d="M{-HL - 250},-26 H{-HL - 20}" stroke="{WHITE}" stroke-width="{SW:.0f}" stroke-linecap="round" opacity=".9"/></g>')
    h = hole(D)
    o.append(f'{LENS()} fill="{puff(pal["ring"], cx=.28, cy=.22, r=.9, fx=.22, fy=.15)}" mask="{h}"/>')
    o.append(f'<ellipse cx="{LCX - 4}" cy="{LCY - 8}" rx="{LA - 112}" ry="{LB - 92}" transform="rotate({LANG} {LCX} {LCY})" fill="{D.lin(pal["wall"], x1=1, y1=1, x2=0, y2=0)}" mask="{h}"/>')
    # occlusion where the glass tucks into the rim: a dark ring just outside the opening, deepest top-left (in shadow of the rim's lip)
    o.append(f'<ellipse cx="{OCX}" cy="{OCY}" rx="{OA + 14}" ry="{OB + 14}" transform="rotate({OANG} {OCX} {OCY})" fill="none" '
             f'stroke="{D.lin([pal["wall"][1], pal["wall"][1]], [.85, .15])}" stroke-width="30"/>')
    glass(D, o, *pal["glass"])
    if glassy:  # translucent teal glass like the card, with its light-teal rim
        o.insert(len(o) - 2, f'{OPEN()} fill="{D.lin([DTEAL, WHITE], [.4, .2], x1=.2, y1=0, x2=.8, y2=1)}" stroke="{LTEAL}" stroke-opacity=".7" stroke-width="{EW:.0f}"/>')
    o.append(f'<path d="M{LCX - LA + 55},{LCY} A{LA - 55},{LB - 55} 0 0 1 {LCX},{LCY - LB + 55}" transform="rotate({LANG} {LCX} {LCY})" fill="none" stroke="{WHITE}" stroke-width="{SW * 1.4:.0f}" stroke-linecap="round" opacity=".8"/>')
    if not glassy: o.append(soft(LCX - 330, LCY - 280, 160, 95, WHITE, .85, -40))
    if gloss:  # a second reflection along the rim's lower-right, like polished plastic
        o.append(f'<path d="M{LCX + LA - 50},{LCY} A{LA - 50},{LB - 50} 0 0 1 {LCX},{LCY + LB - 50}" transform="rotate({LANG} {LCX} {LCY})" fill="none" stroke="{WHITE}" stroke-width="{SW * .9:.0f}" stroke-linecap="round" opacity=".6"/>')
    o.append(spec(LCX - 360, LCY - 300, 22, 13, -40))
    if not glassy: o.append(f'{OPEN()} fill="none"{rim(pal["ring"])}/>')
    o.append(f'{LENS()} fill="none"{rim(pal["ring"])}/>')
    # handle: puffy capsule with a soft light along its lit side, a crisp spot, its own shadow onto the neck end
    r = pal["handle"]
    o.append(f'<g {HAND()}>'
             f'<ellipse cx="{-HL + 10}" cy="10" rx="70" ry="{HW * .8:.0f}" fill="{D.glow(pal["neck"][4], .7)}"/>'
             f'<rect x="{-HL}" y="{-HW}" width="{2 * HL}" height="{2 * HW}" rx="{140 if clay else 110}" fill="{D.lin(r[:5] if not gloss else r[1:5], x1=0, y1=0, x2=.12, y2=1)}"{rim(r)}/>'
             f'<rect x="{-HL}" y="{-HW}" width="{2 * HL}" height="{2 * HW}" rx="{140 if clay else 110}" fill="{D.lin([r[4], r[4], r[4]], [.0, .0, .45], x1=0, y1=0, x2=1, y2=0)}"/>'
             f'<path d="M{-HL + 120},{-HW + 70} H{HL - 150}" stroke="{WHITE}" stroke-width="{SW * 1.8:.0f}" stroke-linecap="round" opacity="{.9 if gloss else .55}"/>'
             f'<ellipse cx="{-HL + 140}" cy="{-HW + 62}" rx="30" ry="16" fill="{WHITE}" opacity=".95"/></g>')
    o[i0:] = [f'<g transform="translate({MAG[0]} {MAG[1]})">' + "".join(o[i0:]) + "</g>"]
    gx0, gx1 = 1880 - 1560, 1880 + 1560
    vb, artw = crop(ssp + [(x + DEP[0], y + DEP[1]) for x, y in ssp] + [(x + MAG[0], y + MAG[1]) for x, y in hand_pts()],
                    [(gx0 + 300, gy - 130, gx1 - 300, gy + 70 + 110), (hx_ - 300, hy_ + 30, hx_ + 340, hy_ + 200)])
    name = f"browser-search-{key}-{style}.svg"; write(name, vb, D, o)
    return name, vb, artw

if __name__ == "__main__":
    for key in SCHEMES:
        print(*build(key))
        for style in STYLES: print(*build_soft(key, style))
