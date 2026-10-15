# Hourglass and coins (artboard 3), redrawn clean and recoloured in brand colours.
# The stock source (pdftocairo -svg, 225 shapes) has a sketchy, uneven hand-inked outline, traced circles and
# shapes that only drew what showed, so nothing of it is copied: every part is redrawn from the measurements
# below (taken from the source at 1:1) as closed paths, true circles and ellipses, painted back to front.
#   python3 build.py <p3.svg> [scratch dir for sheet.png]
# Writes hourglass-{A,B}.svg (3D, even navy outline) and hourglass-{A,B}-clay.svg (claymorphism) next to this
# script, and sheet.png (+ overlay.png, the redraw over the source, to check the fit) in the scratch dir.
import math, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
SCRATCH = sys.argv[2] if len(sys.argv) > 2 else None
src = open(SRC).read()
assert len(re.findall(r"<path\b", src)) == 225 and 'viewBox="0 0 4012.4 2500"' in src, "not artboard 3"

# ---- geometry, in source units (measured on the source) ----
CX = 2001                                   # hourglass axis
CAP = dict(rx=647, ry=64, top=224, bot=369)  # top disc: top face centre line, bottom arc centre line
COLLAR = dict(rx=420, ry=35, top=380, bot=480)
PLINTH = dict(rx=425, ry=38, top=2002, bot=2112)
BASE = dict(rx=647, ry=80, top=2112, bot=2258)
POSTS, POST_W, POST_TOP = (1491, 2511), 86, 330
CLOCKS = ((1492, 1220, "L"), (2510, 1220, "R"))
CLOCK_R, FACE_R = 280, 222
COIN_RX, COIN_RY, COIN_P, GROUND = 298, 56, 86, 2340
STACKS = ((940, 7), (3069, 12))              # centre x, coins
# right half of the glass, outer edge (the outline's centre line): bulb, waist, bulb, then the rim on the plinth
GLASS_R = [((2399, 470), (2418, 540), (2424, 600), (2424, 660)),
           ((2424, 660), (2424, 860), (2140, 1050), (2075, 1170)),
           ((2075, 1170), (2060, 1200), (2056, 1225), (2056, 1250)),
           ((2056, 1250), (2056, 1275), (2060, 1300), (2075, 1330)),
           ((2075, 1330), (2140, 1450), (2424, 1640), (2424, 1830)),
           ((2424, 1830), (2424, 1910), (2400, 1975), (2371, 2021))]
SAND_LEVEL = 778
DROPS = ((2003, 1400, 20), (2030, 1475, 16), (1995, 1540, 17), (2055, 1600, 18), (1945, 1600, 14))

# ---- brand colours ----
NAVY, MID, TEAL, DTEAL, LTEAL, LBLUE, SKY = "#002c44", "#11232d", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#00acdd"
YOLK, ORANGE, AMBER, GLACIER, MINT, WHITE = "#ffcc40", "#f6a11d", "#e08a12", "#d9eeff", "#bce2d7", "#ffffff"
YOLK_T, YOLK_TT = "#ffe07a", "#fff0b8"
SKY_T, SKY_TT, SKY_S = "#5fd0f2", "#9fe3f8", "#0094c6"
MINT_T, MINT_S, MINT_SS = "#d6f0e8", "#8fd3c0", "#5fbfa6"
GLACIER_T, GLACIER_S, GLACIER_SS = "#eef7ff", "#a9d3ef", "#7fb9e3"
LTEAL_T = "#8fe0e0"
AMBER_S, GLACIER_SSS, MINT_SSS, SKY_SS = "#c26f0a", "#5a9fd0", "#3fa58b", "#006a96"  # deeper shades for the clay core shade
GOLD = dict(sand=[YOLK_T, YOLK, ORANGE], sandTop=[YOLK_TT, YOLK_T], drop=ORANGE, sandEdge=AMBER,
            coinTop=[YOLK_T, YOLK], coinRecess=[ORANGE, YOLK, YOLK_T], coinSide=[YOLK_T, YOLK, ORANGE], coinHi=YOLK_TT, coinEdge=AMBER, coinDeep=AMBER_S)
OPTIONS = {
    "A": dict(GOLD,  # teal wood, glacier glass, sky and egg-yolk clocks
              frameTop=[LTEAL_T, LTEAL], frameSide=[LTEAL, LTEAL_T, LTEAL, TEAL, TEAL], frameHi=MINT_T, frameEdge=DTEAL, frameDeep=DTEAL,
              post=[LTEAL_T, LTEAL, TEAL], glass=[WHITE, GLACIER_T, GLACIER, GLACIER_S], glassEdge=GLACIER_SS, glassDeep=GLACIER_SSS, glassHi=WHITE,
              L=dict(bezel=[SKY_TT, SKY_T, SKY], hi=GLACIER, face=[WHITE, GLACIER_T, GLACIER], tick=GLACIER_SS, edge=SKY_S, deep=LBLUE, hub=YOLK),
              R=dict(bezel=[YOLK_T, YOLK, ORANGE], hi=YOLK_TT, face=[WHITE, YOLK_TT], tick=ORANGE, edge=AMBER, deep=AMBER_S, hub=WHITE)),
    "B": dict(GOLD,  # sky wood, mint glass, teal and orange clocks
              frameTop=[SKY_TT, SKY_T], frameSide=[SKY_T, SKY_TT, SKY_T, SKY, SKY_S], frameHi=GLACIER, frameEdge=LBLUE, frameDeep=SKY_SS,
              post=[SKY_TT, SKY_T, SKY], glass=[WHITE, MINT_T, MINT, MINT_S], glassEdge=MINT_SS, glassDeep=MINT_SSS, glassHi=WHITE,
              L=dict(bezel=[LTEAL_T, LTEAL, TEAL], hi=MINT_T, face=[WHITE, MINT_T, MINT], tick=MINT_SS, edge=DTEAL, deep=DTEAL, hub=YOLK),
              R=dict(bezel=[YOLK, ORANGE, AMBER], hi=YOLK_T, face=[WHITE, YOLK_TT], tick=ORANGE, edge=AMBER, deep=AMBER_S, hub=WHITE)),
}

# ---- viewBox: the art plus ~4% padding; the outline is 19 units when the art is drawn 2120 wide ----
X0, X1 = STACKS[0][0] - COIN_RX, STACKS[1][0] + COIN_RX
Y0, Y1 = CAP["top"] - CAP["ry"], GROUND + 30
pad = 0.04 * (X1 - X0)
VB = (round(X0 - pad), round(Y0 - pad), round(X1 - X0 + 2 * pad), round(Y1 - Y0 + 2 * pad))
W = round(19 * VB[2] / 2120, 1)  # outline width; the outline is drawn centred on each edge, so all of it shows


def bez(p, t):
    return tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d for a, b, c, d in zip(*p))


def glass_halfwidth(y):  # outer half-width of the glass at height y
    best = None
    for seg in GLASS_R:
        for k in range(401):
            x, yy = bez(seg, k / 400)
            if best is None or abs(yy - y) < abs(best[1] - y): best = (x, yy)
    return best[0] - CX


def mirror(seg): return tuple((2 * CX - x, y) for x, y in seg)


def glass_path():
    right = "".join(f" C{b[0]},{b[1]} {c[0]},{c[1]} {d[0]},{d[1]}" for _, b, c, d in GLASS_R)
    left = "".join(f" C{c[0]},{c[1]} {b[0]},{b[1]} {a[0]},{a[1]}" for a, b, c, _ in map(mirror, reversed(GLASS_R)))
    hw, ry = PLINTH["rx"], PLINTH["ry"]  # the rim follows the plinth top face's front edge, so they draw as one line
    return f"M{GLASS_R[0][0][0]},{GLASS_R[0][0][1]}{right} A{hw},{ry} 0 0 1 {2 * CX - GLASS_R[-1][3][0]},{GLASS_R[-1][3][1]}{left} Z"


def cyl_side(cx, rx, ry, top, bot):  # a cylinder's side, closed over the back of its top (the top face covers that)
    L, R = cx - rx, cx + rx
    return f"M{L},{top} L{L},{bot} A{rx},{ry} 0 0 0 {R},{bot} L{R},{top} A{rx},{ry} 0 0 0 {L},{top} Z"


def arc(cx, cy, rx, ry, a0, a1):  # an open arc (for highlight strokes only), angles in degrees, screen orientation
    p = lambda a: (round(cx + rx * math.cos(math.radians(a)), 1), round(cy + ry * math.sin(math.radians(a)), 1))
    (x0, y0), (x1, y1) = p(a0), p(a1)
    return f"M{x0},{y0} A{rx},{ry} 0 {int(abs(a1 - a0) > 180)} {int(a1 > a0)} {x1},{y1}"


def build(key, clay):
    pal = OPTIONS[key]
    pre = f"hourglass-{key}{'-clay' if clay else ''}"
    defs, out = [], []

    def grad(name, stops, x2=1, y2=1, x1=0, y1=0):
        gid = f"{pre}-{name}"
        if not any(f'id="{gid}"' in x for x in defs):
            defs.append(f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">' + "".join(
                f'<stop offset="{i / (len(stops) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(stops)) + "</linearGradient>")
        return f"url(#{gid})"

    def puff(deep):  # clay: a bright soft light top-left and a deep same-hue core shade bottom-right, gradients only
        gid = f"{pre}-puff-{deep[1:]}"
        if not any(f'id="{gid}"' in x for x in defs):
            defs.append(f'<radialGradient id="{gid}" cx=".3" cy=".2" r="1.02">' + "".join(
                f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in (
                    (0, "#fff", .85), (.12, "#fff", .55), (.28, "#fff", .18), (.4, "#fff", 0),
                    (.55, deep, 0), (.72, deep, .3), (.86, deep, .55), (1, deep, .72))) + "</radialGradient>")
        return f"url(#{gid})"

    def soft(name, color, peak, cx=None, cy=None, rx=None, ry=None):  # a soft shadow ellipse: a radial gradient with a bell fade
        gid = f"{pre}-{name}"
        if not any(f'id="{gid}"' in x for x in defs):
            defs.append(f'<radialGradient id="{gid}">' + "".join(
                f'<stop offset="{o}" stop-color="{color}" stop-opacity="{round(peak * a, 3)}"/>'
                for o, a in ((0, 1), (.45, .9), (.7, .55), (.85, .24), (.95, .06), (1, 0))) + "</radialGradient>")
        if cx is not None: out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{gid})"/>')
        return f"url(#{gid})"

    def spec(cx, cy, rx, ry, rot=0):  # a small crisp specular spot
        gid = f"{pre}-spec"
        if not any(f'id="{gid}"' in x for x in defs):
            defs.append(f'<radialGradient id="{gid}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".55" stop-color="#fff" stop-opacity=".9"/>'
                        '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
        out.append(f'<ellipse cx="{round(cx)}" cy="{round(cy)}" rx="{rx}" ry="{ry}" transform="rotate({rot} {round(cx)} {round(cy)})" fill="url(#{gid})"/>')

    def occ(d, deep, clip=None):  # occlusion where one part tucks under another: stacked soft strokes, darkest at the seam
        g = f'<g clip-path="url(#{pre}-{clip})">' if clip else "<g>"
        out.append(g + "".join(f'<path d="{d}" fill="none" stroke="{deep}" stroke-width="{round(W * k, 1)}" stroke-opacity="{a}" stroke-linecap="round"/>'
                               for k, a in ((3.2, .1), (2.2, .13), (1.3, .17), (.6, .22))) + "</g>")

    def shape(tag, geo, fill, edge, puffy=True, deep=None):
        """A closed filled shape with the navy outline (3D) or a soft same-hue edge and a puffy light (clay)."""
        if clay:
            out.append(f'<{tag} {geo} fill="{fill}" stroke="{edge}" stroke-width="{round(W * .55, 1)}" stroke-linejoin="round"/>')
            if puffy: out.append(f'<{tag} {geo} fill="{puff(deep or edge)}"/>')
        else:
            out.append(f'<{tag} {geo} fill="{fill}" stroke="{NAVY}" stroke-width="{W}" stroke-linejoin="round"/>')

    def hi(d, color, w, op=1):  # a highlight stroke (never an outline)
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"{"" if op == 1 else f" opacity=\"{op}\""}/>')

    fe = pal["frameEdge"]
    # clay: soft contact shadows (radial gradients with a bell fade, no blur)
    if clay:
        soft("shadow", NAVY, .5)
        for cx, rx, ry, dy in ((CX, 840, 112, 22), (STACKS[0][0], 400, 78, 16), (STACKS[1][0], 400, 78, 16)):
            soft("shadow", NAVY, .5, cx + 20, GROUND + dy, rx, ry)  # pushed down-right, so it shows past the base on the card
        fd = pal["frameDeep"]
        posts_clip = "".join(f'<rect x="{x - POST_W / 2}" y="{POST_TOP}" width="{POST_W}" height="{BASE["top"] - POST_TOP}"/>' for x in POSTS)
        defs.append(f'<clipPath id="{pre}-posts">{posts_clip}</clipPath>'
                    f'<clipPath id="{pre}-collar"><path d="{cyl_side(CX, COLLAR["rx"], COLLAR["ry"], COLLAR["top"], COLLAR["bot"])}"/></clipPath>')
    fd = pal.get("frameDeep")

    def cylinder(c, side_stops, top_stops):
        shape("path", f'd="{cyl_side(CX, c["rx"], c["ry"], c["top"], c["bot"])}"', grad("frameSide", side_stops, 1, 0), fe, deep=fd)
        shape("ellipse", f'cx="{CX}" cy="{c["top"]}" rx="{c["rx"]}" ry="{c["ry"]}"', grad("frameTop", top_stops), fe, deep=fd)
        if clay: spec(CX - c["rx"] * .62, c["top"] - c["ry"] * .2, round(c["rx"] * .09), round(max(c["ry"] * .22, 9)), -4)
        # lit front rim of the top face, and a gloss on the side
        hi(arc(CX, c["top"], c["rx"] - W * 2, c["ry"] - W * 1.1, 150, 110), pal["frameHi"], round(W * .5))
        hi(arc(CX, (c["top"] + c["bot"]) / 2 + c["ry"] * .1, c["rx"] - W * 1.6, c["ry"], 168, 140), WHITE, round(W * .45), .55)

    # base, posts, plinth
    cylinder(BASE, pal["frameSide"], pal["frameTop"])
    if clay:
        for x in POSTS: soft("occ", fd, .55, x + 10, BASE["top"] + 8, 78, 26)
        soft("occ", fd, .55, CX + 15, PLINTH["bot"] + 10, PLINTH["rx"] + 50, PLINTH["ry"] + 34)
    for x in POSTS:
        L, R, bot = x - POST_W / 2, x + POST_W / 2, BASE["top"]
        shape("path", f'd="M{L},{POST_TOP} L{L},{bot} A{POST_W / 2},12 0 0 0 {R},{bot} L{R},{POST_TOP} Z"', grad("post", pal["post"], 1, 0), fe, deep=fd)
        hi(f"M{L + 22},{POST_TOP + 120} V{bot - 50}", pal["frameHi"], round(W * .45), .9)
    cylinder(PLINTH, pal["frameSide"], pal["frameTop"])

    # glass with sand inside (sand clipped to the glass, the glass's outline drawn over it)
    gp = glass_path()
    defs.append(f'<clipPath id="{pre}-glassclip"><path d="{gp}"/></clipPath>')
    ge = pal["glassEdge"]
    out.append(f'<path d="{gp}" fill="{grad("glass", pal["glass"], 1, 0.3)}"/>')
    if clay: out.append(f'<path d="{gp}" fill="{puff(pal["glassDeep"])}"/>')
    out.append(f'<g clip-path="url(#{pre}-glassclip)">')
    se = pal["sandEdge"]
    sw = glass_halfwidth(SAND_LEVEL) - (W / 2 if not clay else 0) + 6
    shape("path", f'd="M{CX - 500},{SAND_LEVEL} H{CX + 500} V1150 C{CX + 70},1215 {CX + 34},1305 {CX},1305 C{CX - 34},1305 {CX - 70},1215 {CX - 500},1150 Z"', grad("sand", pal["sand"]), se, False)
    shape("ellipse", f'cx="{CX}" cy="{SAND_LEVEL}" rx="{round(sw)}" ry="52"', grad("sandTop", pal["sandTop"]), se, False)
    hi(arc(CX, SAND_LEVEL, sw - 70, 30, 205, 245), WHITE, round(W * .5), .8)
    for x, y, r in DROPS:
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{pal["drop"]}"/>')
    pile = f"M{CX - 440},1990 C{CX - 300},1830 {CX - 110},1645 {CX},1645 C{CX + 110},1645 {CX + 300},1830 {CX + 440},1990 V2100 H{CX - 440} Z"
    shape("path", f'd="{pile}"', grad("pile", pal["sand"], 1, .6), se, clay, pal["coinDeep"])
    if clay:
        g0, g1 = GLASS_R[-1][3], GLASS_R[0][0]
        occ(f"M{g0[0]},{g0[1]} A{PLINTH['rx']},{PLINTH['ry']} 0 0 1 {2 * CX - g0[0]},{g0[1]}", pal["coinDeep"])  # sand/glass into the plinth
        occ(f"M{2 * CX - g1[0]},{COLLAR['bot']} A{COLLAR['rx']},{COLLAR['ry']} 0 0 0 {g1[0]},{COLLAR['bot']}", pal["glassDeep"])  # glass under the collar
    hi(f"M{CX - 70},1700 C{CX - 150},1760 {CX - 230},1840 {CX - 290},1930", WHITE, round(W * .55), .7)
    out.append("</g>")
    # glass highlights: a long gleam down the left of each bulb, a short one on the right
    def wall(y0, y1, inset, side=-1):
        pts = [(round(CX + side * (glass_halfwidth(y) - inset), 1), y) for y in range(y0, y1 + 1, 20)]
        return "M" + " L".join(f"{x},{y}" for x, y in pts)
    hi(wall(560, 900, 62), pal["glassHi"], round(W * 1.1), .85)
    hi(wall(1530, 1900, 62), pal["glassHi"], round(W * 1.1), .85)
    hi(wall(600, 700, 58, 1), pal["glassHi"], round(W * .6), .7)
    out.append(f'<path d="{gp}" fill="none" stroke="{NAVY if not clay else ge}" stroke-width="{W if not clay else round(W * .55, 1)}" stroke-linejoin="round"/>')

    # collar and top disc
    shape("path", f'd="{cyl_side(CX, COLLAR["rx"], COLLAR["ry"], COLLAR["top"], COLLAR["bot"])}"', grad("frameSide", pal["frameSide"], 1, 0), fe, deep=fd)
    if clay:
        cap_arc = f"M{CX - CAP['rx']},{CAP['bot']} A{CAP['rx']},{CAP['ry']} 0 0 0 {CX + CAP['rx']},{CAP['bot']}"
        occ(cap_arc, fd, "posts"); occ(cap_arc, fd, "collar")  # posts and collar tucked under the top disc
    cylinder(CAP, pal["frameSide"], pal["frameTop"])
    if clay:
        for x in POSTS: spec(x - 20, POST_TOP + 190, 9, 44)

    # clocks: true circles, hands at three o'clock
    for cx, cy, side in CLOCKS:
        c = pal[side]
        if clay: soft("drop", NAVY, .5, cx + 46, cy + 58, CLOCK_R + 34, CLOCK_R + 34)  # cast onto the post and glass behind
        shape("circle", f'cx="{cx}" cy="{cy}" r="{CLOCK_R}"', grad(f"bezel{side}", c["bezel"]), c["edge"], deep=c.get("deep"))
        hi(arc(cx, cy, (CLOCK_R + FACE_R) / 2, (CLOCK_R + FACE_R) / 2, 195, 255), c["hi"], round(W * .65))
        if clay: occ(arc(cx, cy, FACE_R + 8, FACE_R + 8, -60, 150), c["deep"])  # the face sits recessed in the bezel
        shape("circle", f'cx="{cx}" cy="{cy}" r="{FACE_R}"', grad(f"face{side}", c["face"]), c["edge"])
        for a in range(0, 360, 30):
            r0, r1 = (FACE_R - 62, FACE_R - 34) if a % 90 == 0 else (FACE_R - 48, FACE_R - 34)
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            out.append(f'<path d="M{round(cx + r0 * ca, 1)},{round(cy + r0 * sa, 1)} L{round(cx + r1 * ca, 1)},{round(cy + r1 * sa, 1)}" '
                       f'stroke="{c["tick"]}" stroke-width="{round(W * .7)}" stroke-linecap="round"/>')
        hand = NAVY if not clay else c["edge"]
        out.append(f'<path d="M{cx},{cy - 150} V{cy} H{cx + 112}" fill="none" stroke="{hand}" stroke-width="{round(W * 1.15)}" stroke-linecap="round" stroke-linejoin="round"/>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{round(W * 1.15)}" fill="{hand}"/><circle cx="{cx}" cy="{cy}" r="{round(W * .45)}" fill="{c["hub"]}"/>')
        if clay:
            spec(cx - 168, cy - 168, 30, 15, -45); spec(cx - 105, cy - 120, 22, 11, -40)

    # coin stacks: each coin's side as a band, front to back so each coin's lower edge is the seam over the one below
    ce = pal["coinEdge"]
    for sx, n in STACKS:
        top = GROUND - COIN_RY - n * COIN_P
        if clay: defs.append(f'<clipPath id="{pre}-stack{sx}"><rect x="{sx - COIN_RX}" y="{top - COIN_RY}" width="{2 * COIN_RX}" height="{GROUND - top + COIN_RY}"/></clipPath>')
        for i in reversed(range(n)):
            cy = top + i * COIN_P
            shape("path", f'd="{cyl_side(sx, COIN_RX, COIN_RY, cy, cy + COIN_P)}"', grad("coinSide", pal["coinSide"], 1, 0), ce, clay or i == 0, pal["coinDeep"])
            hi(arc(sx, cy + COIN_P * .42, COIN_RX - W * 1.4, COIN_RY, 168, 118), pal["coinHi"], round(W * .5), .95)
            if clay:
                spec(sx - 205, cy + COIN_P * .55, 18, 8, 8)
                if i: occ(arc(sx, cy, COIN_RX - 4, COIN_RY, 2, 178), pal["coinDeep"], f"stack{sx}")  # the coin above sits on this one
        shape("ellipse", f'cx="{sx}" cy="{top}" rx="{COIN_RX}" ry="{COIN_RY}"', grad("coinTop", pal["coinTop"]), ce, deep=pal["coinDeep"])
        out.append(f'<ellipse cx="{sx}" cy="{top + 2}" rx="{COIN_RX - 52}" ry="{COIN_RY - 13}" fill="{grad("coinRecess", pal["coinRecess"], 0, 1)}"/>')
        hi(arc(sx, top + 2, COIN_RX - 90, COIN_RY - 24, 200, 245), WHITE, round(W * .5), .9)
        if clay: spec(sx - 170, top - 22, 26, 9, -3)

    vb = " ".join(map(str, VB))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{VB[2]}" height="{VB[3]}">'
           f'<defs>{"".join(defs)}</defs>{"".join(out)}</svg>')
    assert "filter" not in svg and "Blur" not in svg and "<image" not in svg
    ids = re.findall(r'id="([^"]+)"', svg)
    assert len(ids) == len(set(ids)) and all(i.startswith(pre + "-") for i in ids), "gradient ids must be unique and prefixed"
    path = f"{HERE}/{pre}.svg"
    open(path, "w").write(svg)
    return path


files = [build(k, c) for k in OPTIONS for c in (False, True)]
print("viewBox", VB, "outline", W, "units =", round(W * 2120 / VB[2], 1), "at 2120 wide")
print("\n".join(files))

if SCRATCH:  # contact sheet on the lesson card, plus the redraw over the source to check the fit
    TC = "/tmp/claude-0/-home-user/918dff32-11f3-5700-8f92-8217278814f6/scratchpad/tc"
    labels = ["A  3D outlined", "A  claymorphism", "B  3D outlined", "B  claymorphism"]
    cards = "".join(f'<figure><div class="card">{open(f).read()}</div><figcaption>{l}</figcaption></figure>' for f, l in zip(files, labels))
    css = ("body{margin:0;background:#002c44;font:600 22px/1 Inter,system-ui,sans-serif;color:#d9eeff;display:grid;"
           "grid-template-columns:repeat(4,1fr);gap:28px;padding:32px}figure{margin:0}figcaption{margin-top:14px;text-align:center}"
           ".card{background:#0b4a5a;border:1px solid #3bbfc055;border-radius:24px;padding:28px}svg{width:100%;height:auto;display:block}")
    open(f"{SCRATCH}/sheet.html", "w").write(f"<!doctype html><style>{css}</style>{cards}")
    subprocess.run(["node", f"{TC}/hg-shot.mjs", f"{SCRATCH}/sheet.html", f"{SCRATCH}/sheet.png", "2200", "560"], cwd=TC, check=True)
    over = open(files[0]).read().replace("<svg ", '<svg opacity=".55" ', 1)
    srcb = re.sub(r"<svg[^>]*>", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, VB))}">', src, count=1)
    open(f"{SCRATCH}/overlay.html", "w").write(
        f'<!doctype html><style>body{{margin:0}}div{{position:relative}}svg{{position:absolute;inset:0;width:1600px;height:auto}}</style><div>{srcb}{over}</div>')
    subprocess.run(["node", f"{TC}/hg-shot.mjs", f"{SCRATCH}/overlay.html", f"{SCRATCH}/overlay.png", "1600", str(round(1600 * VB[3] / VB[2]))], cwd=TC, check=True)
    print(f"{SCRATCH}/sheet.png")
