# Hourglass and coins (artboard 3), redrawn clean and recoloured in brand colours.
# The stock source (pdftocairo -svg, 225 shapes) has a sketchy, uneven hand-inked outline, traced circles and
# shapes that only drew what showed, so nothing of it is copied: every part is redrawn from the measurements
# below (taken from the source at 1:1) as closed paths, true circles and ellipses, painted back to front.
#   python3 build.py <p3.svg> [scratch dir for sheet.png]
# Writes hourglass-{A,B}.svg (3D, even navy outline, source layout) and, spaced out with no outline,
# hourglass-{A,B}-clay.svg (claymorphism), -glass.svg (crisp 3D glass) and -gloss.svg (glossy 3D) next to this
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
AMBER_S, GLACIER_SSS, MINT_SSS, SKY_SS = "#c26f0a", "#5a9fd0", "#3fa58b", "#006a96"  # deeper shades for the glass versions' core shade
GOLD = dict(sand=[YOLK_T, YOLK, ORANGE], sandTop=[YOLK_TT, YOLK_T], drop=ORANGE, sandEdge=AMBER,
            coinTop=[YOLK_T, YOLK], coinRecess=[ORANGE, YOLK, YOLK_T], coinSide=[YOLK_T, YOLK, ORANGE], coinHi=YOLK_TT, coinEdge=AMBER, coinDeep=AMBER_S)
OPTIONS = {
    "A": dict(GOLD,  # teal wood, glacier glass, sky and egg-yolk clocks
              frameTop=[LTEAL_T, LTEAL], frameSide=[LTEAL, LTEAL_T, LTEAL, TEAL, TEAL], frameHi=MINT_T, frameEdge=DTEAL, frameDeep=DTEAL,
              post=[LTEAL_T, LTEAL, TEAL], glass=[WHITE, GLACIER_T, GLACIER, GLACIER_S], glassEdge=GLACIER_SS, glassDeep=GLACIER_SSS, glassHi=WHITE, glassTint=[GLACIER_T, LTEAL_T], glassRim=LTEAL_T,
              L=dict(bezel=[SKY_TT, SKY_T, SKY], hi=GLACIER, face=[WHITE, GLACIER_T, GLACIER], tick=GLACIER_SS, edge=SKY_S, deep=LBLUE, hub=YOLK),
              R=dict(bezel=[YOLK_T, YOLK, ORANGE], hi=YOLK_TT, face=[WHITE, YOLK_TT], tick=ORANGE, edge=AMBER, deep=AMBER_S, hub=WHITE)),
    "B": dict(GOLD,  # sky wood, mint glass, teal and orange clocks
              frameTop=[SKY_TT, SKY_T], frameSide=[SKY_T, SKY_TT, SKY_T, SKY, SKY_S], frameHi=GLACIER, frameEdge=LBLUE, frameDeep=SKY_SS,
              post=[SKY_TT, SKY_T, SKY], glass=[WHITE, MINT_T, MINT, MINT_S], glassEdge=MINT_SS, glassDeep=MINT_SSS, glassHi=WHITE, glassTint=[MINT_T, LTEAL_T], glassRim=LTEAL_T,
              L=dict(bezel=[LTEAL_T, LTEAL, TEAL], hi=MINT_T, face=[WHITE, MINT_T, MINT], tick=MINT_SS, edge=DTEAL, deep=DTEAL, hub=YOLK),
              R=dict(bezel=[YOLK, ORANGE, AMBER], hi=YOLK_T, face=[WHITE, YOLK_TT], tick=ORANGE, edge=AMBER, deep=AMBER_S, hub=WHITE)),
}

# ---- layouts and viewBox: the art plus ~4% padding; the outline is 19 units when the outlined art is drawn 2120 wide ----
STYLES = ("line", "clay", "glass", "gloss")
# The outlined art keeps the source's layout. The other styles space every piece out so each reads as its own form:
# one clock centred on the left post, in front of it, the posts stand clear of the glass, the coins sit apart with a sliver of
# the coin below showing, and the two stacks (3 and 8 coins) stand clear of the base.
LAYOUTS = {
    "line": dict(posts=POSTS, clocks=((1492, 1220, "L"), (2510, 1220, "R")), clock_r=CLOCK_R, face_r=FACE_R,
                 stacks=STACKS, coin=(COIN_RX, COIN_RY), apart=False),
    # one clock up on the left over a short stack, a tall stack on the right: balanced about the hourglass
    # designer: the savings jar's glossy coins, taller uneven stacks (7 and 12) placed the same distance either side
    # of the hourglass so it sits exactly between them, and the clock 20% larger (255 -> 306), raised to clear the
    # short stack
    "spaced": dict(posts=(CX - 565, CX + 565), clocks=((CX - 565, 1100, "L"),), clock_r=306, face_r=242,
                   stacks=((CX - 960, 7), (CX + 960, 12)), coin=(245, 88), apart=True),
}
# the savings jar's coin (ATM/artwork/vectors/savings-jar/build.py): radius, tilt (ry / r), thickness (x r), the seam
JAR_COIN = dict(r=245, k=.36, th=.32, seam=18)
PILE_ON = (3, 5)  # coins that drop onto the left and right stacks during the loop (the stacks start that much shorter)
DEEP_GOLD = "#cf7a0c"
DOLLAR = ("M .30,-.30 C .22,-.44 -.30,-.44 -.30,-.18 C -.30,.02 .30,-.02 .30,.20 C .30,.44 -.24,.44 -.32,.28 "
          "M 0,-.54 V -.40 M 0,.40 V .54")
COIN_T = 50  # a spaced coin's thickness (pitch stays COIN_P, so a 36-unit sliver of the coin below shows)


def viewbox(lay):
    x0, x1 = lay["stacks"][0][0] - lay["coin"][0], lay["stacks"][1][0] + lay["coin"][0]
    y0, y1 = CAP["top"] - CAP["ry"], GROUND + 30
    pad = 0.04 * (x1 - x0)
    return (round(x0 - pad), round(y0 - pad), round(x1 - x0 + 2 * pad), round(y1 - y0 + 2 * pad))


VB = viewbox(LAYOUTS["line"])
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


def n(v):  # a number as the SVG writes it: whole numbers stay whole
    return int(v) if float(v).is_integer() else round(v, 1)


def build(key, style, anim=False):
    """line: 3D with an even navy outline (source layout). clay: soft puffy clay. glass: crisp 3D, edges drawn by light,
    translucent glass. gloss: polished plastic and shiny gold. The last three have no outline and the spaced layout."""
    pal, line_art = OPTIONS[key], style == "line"
    lay = LAYOUTS["line" if line_art else "spaced"]
    vbox = viewbox(lay)
    # anim: wrap each moving part in <g data-k="..."> for the component (export_anim); otherwise nothing changes
    G = lambda k_: out.append(f'<g data-k="{k_}">') if anim else None
    END = lambda: out.append("</g>") if anim else None
    pre = f"hourglass-{key}" + ("" if line_art else f"-{style}")
    defs, out = [], []
    fe, fd, cd, ce, se = pal["frameEdge"], pal["frameDeep"], pal["coinDeep"], pal["coinEdge"], pal["sandEdge"]
    e = W * .32  # width of a lit rim line (glass, gloss)

    def once(gid, body):
        if not any(f'id="{gid}"' in x for x in defs): defs.append(body)
        return f"url(#{gid})"

    def grad(name, stops, x2=1, y2=1, x1=0, y1=0):
        gid = f"{pre}-{name}"
        return once(gid, f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">' + "".join(
            f'<stop offset="{i / (len(stops) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(stops)) + "</linearGradient>")

    def stops(gid, kind, attrs, rows):
        return once(gid, f'<{kind} id="{gid}" {attrs}>' + "".join(
            f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in rows) + f"</{kind}>")

    def light(deep):  # the lit-to-shaded overlay each style lays over a part's own fill
        if style == "clay":  # soft: a bright spot top-left, a deep core bottom-right
            return stops(f"{pre}-puff-{deep[1:]}", "radialGradient", 'cx=".3" cy=".2" r="1.02"',
                         ((0, "#fff", .85), (.12, "#fff", .55), (.28, "#fff", .18), (.4, "#fff", 0),
                          (.55, deep, 0), (.72, deep, .3), (.86, deep, .55), (1, deep, .72)))
        if style == "glass":  # crisp, lighter touch
            return stops(f"{pre}-sheen-{deep[1:]}", "linearGradient", 'x1="0" y1="0" x2="1" y2="1"',
                         ((0, "#fff", .5), (.22, "#fff", .18), (.38, "#fff", 0), (.58, deep, 0), (.8, deep, .28), (1, deep, .55)))
        return stops(f"{pre}-gloss-{deep[1:]}", "linearGradient", 'x1="0" y1="0" x2="1" y2="1"',  # gloss: hard, saturated
                     ((0, "#fff", .75), (.16, "#fff", .45), (.3, "#fff", 0), (.5, deep, 0), (.75, deep, .45), (1, deep, .8)))

    def soft(name, color, peak, cx=None, cy=None, rx=None, ry=None):  # a soft shadow ellipse: a radial gradient with a bell fade
        u = stops(f"{pre}-{name}", "radialGradient", "", [(o, color, round(peak * a, 3))
                  for o, a in ((0, 1), (.45, .9), (.7, .55), (.85, .24), (.95, .06), (1, 0))])
        if cx is not None: out.append(f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{u}"/>')

    def spec(cx, cy, rx, ry, rot=0):  # a small crisp gloss spot
        u = stops(f"{pre}-spec", "radialGradient", "", ((0, "#fff", 1), (.6, "#fff", .95), (1, "#fff", 0)))
        if style == "gloss": rx, ry = round(rx * 1.35), round(ry * 1.35)
        out.append(f'<ellipse cx="{round(cx)}" cy="{round(cy)}" rx="{rx}" ry="{ry}" transform="rotate({rot} {round(cx)} {round(cy)})" fill="{u}"/>')

    def occ(d, deep, clip=None):  # occlusion where one part tucks under another: stacked soft strokes, darkest at the seam
        g = f'<g clip-path="url(#{pre}-{clip})">' if clip else "<g>"
        out.append(g + "".join(f'<path d="{d}" fill="none" stroke="{deep}" stroke-width="{round(W * k, 1)}" stroke-opacity="{a}" stroke-linecap="round"/>'
                               for k, a in ((3.2, .1), (2.2, .13), (1.3, .17), (.6, .22))) + "</g>")

    def line(d, color, w, op):  # an edge drawn by light (bright rim) or by shade (dark band), inset inside the part
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{round(w, 1)}" stroke-opacity="{op}" stroke-linecap="round"/>')

    def shape(tag, geo, fill, edge, lit=True, deep=None):
        if line_art:
            out.append(f'<{tag} {geo} fill="{fill}" stroke="{NAVY}" stroke-width="{W}" stroke-linejoin="round"/>')
            return
        if style == "clay":
            out.append(f'<{tag} {geo} fill="{fill}" stroke="{edge}" stroke-width="{round(W * .55, 1)}" stroke-linejoin="round"/>')
        else:
            out.append(f'<{tag} {geo} fill="{fill}"/>')
        if lit: out.append(f'<{tag} {geo} fill="{light(deep or edge)}"/>')

    def hi(d, color, w, op=1):  # a highlight stroke (never an outline)
        out.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"{"" if op == 1 else f" opacity=\"{op}\""}/>')

    crisp = style in ("glass", "gloss")
    side_stops = pal["frameSide"] if style != "gloss" else [pal["frameTop"][0], pal["frameTop"][1], pal["frameSide"][3], fd, pal["frameSide"][3]]
    coin_side = pal["coinSide"] if style != "gloss" else [YOLK_TT, YOLK, ORANGE, AMBER_S, ORANGE]
    if not line_art:  # contact shadows, pushed down-right so they show past each piece on the card
        peak = {"clay": .5, "glass": .6, "gloss": .45}[style]  # designer: softer shadows
        for cx, rx, ry, dy in ((CX, 840, 112, 22), (lay["stacks"][0][0], lay["coin"][0] + 100, 74, 16), (lay["stacks"][1][0], lay["coin"][0] + 100, 74, 16)):
            soft("shadow", NAVY, peak, cx + 20, GROUND + dy, rx, ry)
        posts_clip = "".join(f'<rect x="{x - POST_W / 2}" y="{POST_TOP}" width="{POST_W}" height="{BASE["top"] - POST_TOP}"/>' for x in lay["posts"])
        defs.append(f'<clipPath id="{pre}-posts">{posts_clip}</clipPath>'
                    f'<clipPath id="{pre}-collar"><path d="{cyl_side(CX, COLLAR["rx"], COLLAR["ry"], COLLAR["top"], COLLAR["bot"])}"/></clipPath>')
        if style == "gloss":  # polished reflections across a cylinder: a hard white band left, a softer one right
            stops(f"{pre}-band", "linearGradient", 'x1="0" y1="0" x2="1" y2="0"',
                  ((0, "#fff", 0), (.12, "#fff", 0), (.17, "#fff", .85), (.23, "#fff", .85), (.3, "#fff", 0),
                   (.8, "#fff", 0), (.86, "#fff", .35), (.9, "#fff", 0), (1, "#fff", 0)))

    def side_edges(cx, rx, ry, top, bot, deep):  # crisp styles: lit left edge, dark right edge and bottom
        line(f"M{n(cx - rx + e)},{top + 4} V{bot}", WHITE, e * 1.2, .75)
        line(arc(cx, bot - W * .3, rx - W * .3, ry, 0, 75), deep, W * .6, .55)
        line(f"M{n(cx + rx - W * .3)},{top + 4} V{n(bot - W * .3)}", deep, W * .6, .5)

    def top_edges(cx, top, rx, ry):  # crisp styles: bright front edge where the top turns into the side, thin back edge
        line(arc(cx, top - e * .6, rx - e * .7, ry - e * .7, 178, 40), WHITE, e, .9)
        line(arc(cx, top + e * .6, rx - e * .7, ry - e * .7, 190, 300), WHITE, e * .8, .6)

    def bevel(cx, top, rx, ry, name, stops_):  # gloss: an inset top so the rim reads as a bevel
        out.append(f'<ellipse cx="{cx}" cy="{n(top + ry * .08)}" rx="{n(rx * .93)}" ry="{n(ry * .78)}" fill="{grad(name + "In", stops_[::-1], 1, 1)}" opacity=".55"/>')

    def cylinder(c):
        sd = f'd="{cyl_side(CX, c["rx"], c["ry"], c["top"], c["bot"])}"'
        shape("path", sd, grad("frameSide", side_stops, 1, 0), fe, deep=fd)
        if style == "gloss": out.append(f'<path {sd} fill="url(#{pre}-band)"/>')
        if crisp: side_edges(CX, c["rx"], c["ry"], c["top"], c["bot"], fd)
        shape("ellipse", f'cx="{CX}" cy="{c["top"]}" rx="{c["rx"]}" ry="{c["ry"]}"', grad("frameTop", pal["frameTop"]), fe, deep=fd)
        if style == "gloss": bevel(CX, c["top"], c["rx"], c["ry"], "frameTop", pal["frameTop"])
        if crisp: top_edges(CX, c["top"], c["rx"], c["ry"])
        if not line_art: spec(CX - c["rx"] * .62, c["top"] - c["ry"] * .2, round(c["rx"] * .09), round(max(c["ry"] * .22, 9)), -4)
        # lit front rim of the top face, and a gloss on the side
        hi(arc(CX, c["top"], c["rx"] - W * 2, c["ry"] - W * 1.1, 150, 110), pal["frameHi"], round(W * .5))
        hi(arc(CX, (c["top"] + c["bot"]) / 2 + c["ry"] * .1, c["rx"] - W * 1.6, c["ry"], 168, 140), WHITE, round(W * .45), .55)

    # clocks, drawn after the hourglass
    def clocks():  # true circles, hands at three o'clock
        cr, fr = lay["clock_r"], lay["face_r"]
        k = cr / CLOCK_R
        for cx, cy, side in lay["clocks"]:
            c = pal[side]
            G("clock")
            if not line_art: soft("drop", NAVY, .5 if style == "clay" else .6, cx + 46 * k, cy + 62 * k, cr + 34 * k, cr + 34 * k)  # its own shadow, cast on the card
            shape("circle", f'cx="{cx}" cy="{cy}" r="{cr}"', grad(f"bezel{side}", c["bezel"]), c["edge"], deep=c["deep"])
            if crisp:
                line(arc(cx, cy, cr - e * .7, cr - e * .7, 150, 300), WHITE, e, .9)
                line(arc(cx, cy, cr - W * .3, cr - W * .3, -20, 115), c["deep"], W * .6, .55)
            hi(arc(cx, cy, (cr + fr) / 2, (cr + fr) / 2, 195, 255), c["hi"], round(W * .65))
            if not line_art: occ(arc(cx, cy, fr + 8, fr + 8, -60, 150), c["deep"])  # the face sits recessed in the bezel
            shape("circle", f'cx="{cx}" cy="{cy}" r="{fr}"', grad(f"face{side}", c["face"]), c["edge"])
            if crisp:  # set in: shaded inside its top-left edge, lit inside its bottom-right
                line(arc(cx, cy, fr - W * .45, fr - W * .45, 140, 310), c["deep"], W * .9, .4)
                line(arc(cx, cy, fr - e * .6, fr - e * .6, -30, 120), WHITE, e, .9)
            for a in range(0, 360, 30):
                r0, r1 = (fr - 62 * k, fr - 34 * k) if a % 90 == 0 else (fr - 48 * k, fr - 34 * k)
                ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
                out.append(f'<path d="M{round(cx + r0 * ca, 1)},{round(cy + r0 * sa, 1)} L{round(cx + r1 * ca, 1)},{round(cy + r1 * sa, 1)}" '
                           f'stroke="{c["tick"]}" stroke-width="{round(W * .7)}" stroke-linecap="round"/>')
            hand = NAVY if line_art else (c["edge"] if style == "clay" else c["deep"])
            hw_ = f'fill="none" stroke="{hand}" stroke-width="{round(W * 1.15)}" stroke-linecap="round" stroke-linejoin="round"'
            if anim:  # the hands apart, so each can turn about the centre
                out.append(f'<path data-k="hour" d="M{cx},{cy} H{n(cx + 112 * k)}" {hw_}/><path data-k="minute" d="M{cx},{n(cy - 150 * k)} V{cy}" {hw_}/>')
            else:
                out.append(f'<path d="M{cx},{n(cy - 150 * k)} V{cy} H{n(cx + 112 * k)}" {hw_}/>')
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{round(W * 1.15)}" fill="{hand}"/><circle cx="{cx}" cy="{cy}" r="{round(W * .45)}" fill="{c["hub"]}"/>')
            if not line_art:
                spec(cx - 168 * k, cy - 168 * k, 30, 15, -45); spec(cx - 105 * k, cy - 120 * k, 22, 11, -40)
            END()

    # base, posts, plinth
    if anim: out.append("<!--HG-->")
    cylinder(BASE)
    if not line_art:
        for x in lay["posts"]: soft("occ", fd, .55, x + 10, BASE["top"] + 8, 78, 26)
        soft("occ", fd, .55, CX + 15, PLINTH["bot"] + 10, PLINTH["rx"] + 50, PLINTH["ry"] + 34)
    for x in lay["posts"]:
        L, R, bot = x - POST_W / 2, x + POST_W / 2, BASE["top"]
        pd = f'd="M{L},{POST_TOP} L{L},{bot} A{POST_W / 2},12 0 0 0 {R},{bot} L{R},{POST_TOP} Z"'
        shape("path", pd, grad("post", pal["post"] if style != "gloss" else side_stops, 1, 0), fe, deep=fd)
        if style == "gloss": out.append(f'<path {pd} fill="url(#{pre}-band)"/>')
        if crisp:
            line(f"M{n(L + e * .8)},{POST_TOP} V{bot}", WHITE, e, .7)
            line(f"M{n(R - W * .3)},{POST_TOP} V{bot}", fd, W * .6, .5)
        hi(f"M{L + 22},{POST_TOP + 120} V{bot - 50}", pal["frameHi"], round(W * .45), .9)
    cylinder(PLINTH)

    # glass with sand inside (sand clipped to the glass)
    gp = glass_path()
    defs.append(f'<clipPath id="{pre}-glassclip"><path d="{gp}"/></clipPath>')
    gdeep = pal["glassDeep"]
    if style == "glass":  # translucent tinted glass: the card shows through, echoing it
        out.append(f'<path d="{gp}" fill="{grad("tint", pal["glassTint"], 1, .3)}" fill-opacity=".42"/>')
    else:
        out.append(f'<path d="{gp}" fill="{grad("glass", pal["glass"], 1, 0.3)}"/>')
        if style in ("clay", "gloss"): out.append(f'<path d="{gp}" fill="{light(gdeep)}"/>')
    out.append(f'<g clip-path="url(#{pre}-glassclip)">')
    sw = glass_halfwidth(SAND_LEVEL) - (W / 2 if line_art else 0) + 6
    G("sandTop")
    shape("path", f'd="M{CX - 500},{SAND_LEVEL} H{CX + 500} V1150 C{CX + 70},1215 {CX + 34},1305 {CX},1305 C{CX - 34},1305 {CX - 70},1215 {CX - 500},1150 Z"',
          grad("sand", pal["sand"]), se, crisp, cd)
    END(); G("sandSurf")
    shape("ellipse", f'cx="{CX}" cy="{SAND_LEVEL}" rx="{round(sw)}" ry="52"', grad("sandTop", pal["sandTop"]), se, False)
    if crisp: line(arc(CX, SAND_LEVEL - e * .5, sw - e, 52 - e, 178, 2), YOLK_TT, e, .9)
    hi(arc(CX, SAND_LEVEL, sw - 70, 30, 205, 245), WHITE, round(W * .5), .8)
    END()
    for i_, (x, y, r) in enumerate(DROPS):
        out.append(f'<circle{f" data-k=\"drop{i_}\"" if anim else ""} cx="{x}" cy="{y}" r="{r}" fill="{pal["drop"]}"/>')
    pile = f"M{CX - 440},1990 C{CX - 300},1830 {CX - 110},1645 {CX},1645 C{CX + 110},1645 {CX + 300},1830 {CX + 440},1990 V2100 H{CX - 440} Z"
    pile_hi = lambda: hi(f"M{CX - 70},1700 C{CX - 150},1760 {CX - 230},1840 {CX - 290},1930", WHITE, round(W * .55), .7)
    G("sandBot")
    shape("path", f'd="{pile}"', grad("pile", pal["sand"], 1, .6), se, not line_art, cd)
    if anim: pile_hi()
    END()
    if not line_art:
        g0, g1 = GLASS_R[-1][3], GLASS_R[0][0]
        occ(f"M{g0[0]},{g0[1]} A{PLINTH['rx']},{PLINTH['ry']} 0 0 1 {2 * CX - g0[0]},{g0[1]}", cd)  # sand and glass into the plinth
        occ(f"M{2 * CX - g1[0]},{COLLAR['bot']} A{COLLAR['rx']},{COLLAR['ry']} 0 0 0 {g1[0]},{COLLAR['bot']}", gdeep)  # glass under the collar
    if crisp:  # the front of the glass over the sand: reflections bright at both walls, clear in the middle, and the walls' thickness
        k = 1.4 if style == "gloss" else 1
        refl = stops(f"{pre}-refl", "linearGradient", 'x1="0" y1="0" x2="1" y2="0"',
                     ((0, "#fff", round(.55 * k, 2)), (.1, "#fff", round(.25 * k, 2)), (.3, "#fff", 0), (.72, gdeep, 0), (.9, gdeep, .22), (1, "#fff", round(.45 * k, 2))))
        out.append(f'<path d="{gp}" fill="{refl}"/>')
        out.append(f'<path d="{gp}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="{round(W * 1.8)}"/>')
    if not anim: pile_hi()
    out.append("</g>")
    # glass highlights: a long gleam down the left of each bulb, a short one on the right
    def wall(y0, y1, inset, side=-1):
        pts = [(round(CX + side * (glass_halfwidth(y) - inset), 1), y) for y in range(y0, y1 + 1, 20)]
        return "M" + " L".join(f"{x},{y}" for x, y in pts)
    hi(wall(560, 900, 62), pal["glassHi"], round(W * 1.1), .85)
    hi(wall(1530, 1900, 62), pal["glassHi"], round(W * 1.1), .85)
    hi(wall(600, 700, 58, 1), pal["glassHi"], round(W * .6), .7)
    if line_art:
        out.append(f'<path d="{gp}" fill="none" stroke="{NAVY}" stroke-width="{W}" stroke-linejoin="round"/>')
    elif style == "clay":
        out.append(f'<path d="{gp}" fill="none" stroke="{pal["glassEdge"]}" stroke-width="{round(W * .55, 1)}" stroke-linejoin="round"/>')
    else:  # a crisp light-teal edge, like the card's border
        out.append(f'<path d="{gp}" fill="none" stroke="{pal["glassRim"]}" stroke-opacity=".9" stroke-width="{round(W * .38, 1)}"/>')
        spec(CX - 300, 600, 16, 46, 12); spec(CX - 290, 1700, 14, 40, -24)

    # collar and top disc
    cd_ = f'd="{cyl_side(CX, COLLAR["rx"], COLLAR["ry"], COLLAR["top"], COLLAR["bot"])}"'
    shape("path", cd_, grad("frameSide", side_stops, 1, 0), fe, deep=fd)
    if crisp: side_edges(CX, COLLAR["rx"], COLLAR["ry"], COLLAR["top"], COLLAR["bot"], fd)
    if not line_art:
        cap_arc = f"M{CX - CAP['rx']},{CAP['bot']} A{CAP['rx']},{CAP['ry']} 0 0 0 {CX + CAP['rx']},{CAP['bot']}"
        occ(cap_arc, fd, "posts"); occ(cap_arc, fd, "collar")  # posts and collar tucked under the top disc
    cylinder(CAP)
    if not line_art:
        for x in lay["posts"]: spec(x - 20, POST_TOP + 190, 9, 44)
    if anim: out.append("<!--/HG-->")

    clocks()  # in front; spaced, the clock overlaps the left post only, and its shadow falls on the post and card

    # coin stacks
    for sx, cnt in lay["stacks"]:
        if line_art:  # each coin's side as a band, front to back so each coin's lower edge is the seam over the one below
            top = GROUND - COIN_RY - cnt * COIN_P
            for i in reversed(range(cnt)):
                cy = top + i * COIN_P
                shape("path", f'd="{cyl_side(sx, COIN_RX, COIN_RY, cy, cy + COIN_P)}"', grad("coinSide", coin_side, 1, 0), ce, i == 0, cd)
                hi(arc(sx, cy + COIN_P * .42, COIN_RX - W * 1.4, COIN_RY, 168, 118), pal["coinHi"], round(W * .5), .95)
            shape("ellipse", f'cx="{sx}" cy="{top}" rx="{COIN_RX}" ry="{COIN_RY}"', grad("coinTop", pal["coinTop"]), ce, deep=cd)
            out.append(f'<ellipse cx="{sx}" cy="{top + 2}" rx="{COIN_RX - 52}" ry="{COIN_RY - 13}" fill="{grad("coinRecess", pal["coinRecess"], 0, 1)}"/>')
            hi(arc(sx, top + 2, COIN_RX - 90, COIN_RY - 24, 200, 245), WHITE, round(W * .5), .9)
            continue
        # spaced: the savings jar's coins (a thick metal edge with reflections, a bevelled face, a raised $), stacked
        # bottom up with a seam; the coin above shades the one below where it sits
        r, k_, th = JAR_COIN["r"], JAR_COIN["k"], JAR_COIN["r"] * JAR_COIN["th"]; ry = r * k_
        lg = lambda name, rows, x2=1, y2=1: stops(f"{pre}-{name}", "linearGradient", f'x1="0" y1="0" x2="{x2}" y2="{y2}"', rows)
        rim_g = lg("jcRim", [(0, AMBER, 1), (.1, YOLK_T, 1), (.25, ORANGE, 1), (.42, YOLK_TT, 1), (.55, ORANGE, 1), (.8, AMBER, 1), (1, DEEP_GOLD, 1)], 1, 0)
        rim_s = lg("jcSheen", [(0, WHITE, 0), (.15, WHITE, .35), (.3, WHITE, 0), (1, WHITE, 0)], 0, 1)
        face_g = lg("jcFace", [(0, YOLK_TT, 1), (.35, YOLK, 1), (.7, ORANGE, 1), (1, AMBER, 1)])
        bev_g = lg("jcBevel", [(0, AMBER, 1), (.4, ORANGE, 1), (.75, YOLK, 1), (1, YOLK_TT, 1)])
        in_g = stops(f"{pre}-jcIn", "radialGradient", 'cx=".4" cy=".35" r=".8"', [(0, YOLK_T, 1), (.6, YOLK, 1), (1, ORANGE, 1)])
        fd_ = lambda name, a, mid=.5: stops(f"{pre}-{name}", "radialGradient", "", [(0, WHITE, a), (mid * .5, WHITE, round(a * .8, 3)), (mid, WHITE, round(a * .45, 3)), (.75, WHITE, round(a * .15, 3)), (1, WHITE, 0)])
        shade = stops(f"{pre}-jcShade", "radialGradient", "", [(0, DEEP_GOLD, .5), (.3, DEEP_GOLD, .4), (.55, DEEP_GOLD, .22), (.8, DEEP_GOLD, .06), (1, DEEP_GOLD, 0)])
        band = f"M {-r},0 L {-r},{th:.1f} A {r},{ry:.1f} 0 0 0 {r},{th:.1f} L {r},0 A {r},{ry:.1f} 0 0 1 {-r},0 Z"
        side_i = 0 if sx < CX else 1
        for j in range(cnt):
            ccy = GROUND - th - ry - j * (th + JAR_COIN["seam"])
            pile = j - (cnt - PILE_ON[side_i])
            if anim and pile >= 0: out.append(f'<g data-k="pile{side_i}_{pile}">')
            if j: out.append(f'<ellipse cx="{n(sx)}" cy="{n(ccy + th + ry * .2)}" rx="{r}" ry="{n(ry * 1.05)}" fill="{shade}"/>')
            out.append(f'<g transform="translate({n(sx)} {n(ccy)})"><path d="{band}" fill="{rim_g}"/><path d="{band}" fill="{rim_s}"/>'
                       f'<ellipse rx="{r}" ry="{n(ry)}" fill="{face_g}"/><ellipse rx="{n(r * .84)}" ry="{n(ry * .84)}" fill="{bev_g}"/>'
                       f'<ellipse rx="{n(r * .78)}" ry="{n(ry * .78)}" fill="{in_g}"/>'
                       f'<g transform="scale(1 {k_}) scale({n(r * .75)})" fill="none" stroke-linecap="round" stroke-linejoin="round">'
                       f'<path d="{DOLLAR}" stroke="{DEEP_GOLD}" stroke-width=".13" transform="translate(.035 .045)"/>'
                       f'<path d="{DOLLAR}" stroke="{YOLK_T}" stroke-width=".13"/>'
                       f'<path d="{DOLLAR}" stroke="{WHITE}" stroke-opacity=".7" stroke-width=".035" transform="translate(-.025 -.03)"/></g>'
                       f'<ellipse cx="{n(-r * .42)}" cy="{n(-ry * .45)}" rx="{n(r * .3)}" ry="{n(ry * .16 + 6)}" transform="rotate(-25 {n(-r * .42)} {n(-ry * .45)})" fill="{fd_("jcSpec", .95, .6)}"/>'
                       f'<circle cx="{n(-r * .55)}" cy="{n(-ry * .25)}" r="{n(r * .06)}" fill="{fd_("jcHot", 1, .7)}"/></g>')
            if anim:  # a glint that sweeps up the stack: off at rest
                out.append(f'<ellipse data-k="glint{side_i}_{j}" cx="{n(sx - r * .45)}" cy="{n(ccy + th * .5 + ry * .55)}" rx="{n(r * .34)}" ry="{n(th * .26)}" fill="url(#{pre}-spec)" opacity="0"/>')
            if anim and pile >= 0: out.append("</g>")

    vb = " ".join(map(str, vbox))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{vbox[2]}" height="{vbox[3]}">'
           f'<defs>{"".join(defs)}</defs>{"".join(out)}</svg>')
    assert "filter" not in svg and "Blur" not in svg and "<image" not in svg
    ids = re.findall(r'id="([^"]+)"', svg)
    assert len(ids) == len(set(ids)) and all(i.startswith(pre + "-") for i in ids), "gradient ids must be unique and prefixed"
    if anim: return svg
    path = f"{HERE}/{pre}.svg"
    open(path, "w").write(svg)
    return path


# ---- Animated export of B gloss (the designer's pick) for ATMHourglass.tsx ----
# Every moving part gets its own <g data-k="...">. The hourglass flips end over end at the end of each loop, but
# its art is drawn in perspective (lit tops), so it can't match itself turned over. So the flip group holds two
# copies: hgA, the animated one, and hgB, a still copy of the start state turned 180 degrees and hidden. Halfway
# through the flip (hourglass on its side) the two swap; when the flip lands at 180 degrees, hgB shows the start
# state exactly upright, and the loop starts over seamlessly.
FLIP_CENTRE = (CX, (CAP["top"] - CAP["ry"] + BASE["bot"] + BASE["ry"]) / 2)  # the hourglass's middle, its waist
TOP_DRAIN = .5  # the top sand's height at the end of the drain, about its tip
PILE_GROW = 1.4  # the bottom pile's height at the end of the drain, about the glass floor


def export_anim():
    svg = build("B", "gloss", anim=True)
    a, b = svg.index("<!--HG-->"), svg.index("<!--/HG-->")
    hg = svg[a + 9:b]
    still = re.sub(r'<circle data-k="drop\d+"[^>]*/>', "", hg)  # the start state shows no falling drops
    still = re.sub(r' data-k="[^"]*"', "", still)
    cx, cy = FLIP_CENTRE
    svg = (svg[:a] + '<g data-k="squash"><g data-k="hourglass"><g data-k="hgA">' + hg + "</g>"
           + f'<g data-k="hgB" opacity="0" transform="rotate(180 {n(cx)} {n(cy)})">{still}</g></g></g>' + svg[b + 10:])
    svg = re.sub(r"\d+\.\d{3,}", lambda m: f"{float(m.group()):.1f}", svg)  # lean: long decimals to 1 place
    assert svg.count('data-k="hgA"') == 1 and svg.count('data-k="drop') == len(DROPS)
    open(f"{HERE}/hourglass-anim.svg", "w").write(svg)
    surf_y = 1305 - (1305 - SAND_LEVEL) * TOP_DRAIN  # where the sand's surface ends up
    print("anim: viewBox", re.search(r'viewBox="([^"]*)"', svg).group(1), "flip centre", FLIP_CENTRE,
          "surface dy", round(surf_y - SAND_LEVEL, 1), "surface scale", round(glass_halfwidth(surf_y) / glass_halfwidth(SAND_LEVEL), 3))
    tpl = open(f"{HERE}/ATMHourglass.template.tsx").read()
    inner = svg[svg.index(">") + 1:svg.rindex("</svg>")]
    (ccx, ccy, _), = LAYOUTS["spaced"]["clocks"]
    tpl = tpl.replace("__VIEWBOX__", re.search(r'viewBox="([^"]*)"', svg).group(1)).replace("__CLOCK__", f"{ccx} {ccy}")
    open(f"{HERE}/../../../ATMHourglass.tsx", "w").write(tpl.replace("__ART__", inner))


files = [build(k, st) for k in OPTIONS for st in STYLES]
print("viewBox", VB, "outline", W, "units =", round(W * 2120 / VB[2], 1), "at 2120 wide")
print("\n".join(files))
export_anim()

if SCRATCH:  # contact sheet on the lesson card, plus the redraw over the source to check the fit
    TC = "/tmp/claude-0/-home-user/918dff32-11f3-5700-8f92-8217278814f6/scratchpad/tc"
    names = {"line": "3D outlined", "clay": "Claymorphism", "glass": "3D glass", "gloss": "Glossy 3D"}
    labels = [f"{k}  {names[st]}" for k in OPTIONS for st in STYLES]
    cards = "".join(f'<figure><div class="card">{open(f).read()}</div><figcaption>{l}</figcaption></figure>' for f, l in zip(files, labels))
    css = ("body{margin:0;background:#002c44;font:600 22px/1 Inter,system-ui,sans-serif;color:#d9eeff;display:grid;"
           "grid-template-columns:repeat(4,1fr);gap:28px;padding:32px}figure{margin:0}figcaption{margin-top:14px;text-align:center}"
           ".card{background:linear-gradient(148deg,rgba(0,97,94,.4) 0%,rgba(255,255,255,.2) 98%),#002c44;border:2px solid rgba(59,191,192,.7);border-radius:24px;padding:28px}svg{width:100%;height:auto;display:block}")
    open(f"{SCRATCH}/sheet.html", "w").write(f"<!doctype html><style>{css}</style>{cards}")
    subprocess.run(["node", f"{TC}/hg-shot.mjs", f"{SCRATCH}/sheet.html", f"{SCRATCH}/sheet.png", "2200", "1060"], cwd=TC, check=True)
    over = open(files[0]).read().replace("<svg ", '<svg opacity=".55" ', 1)
    srcb = re.sub(r"<svg[^>]*>", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, VB))}">', src, count=1)
    open(f"{SCRATCH}/overlay.html", "w").write(
        f'<!doctype html><style>body{{margin:0}}div{{position:relative}}svg{{position:absolute;inset:0;width:1600px;height:auto}}</style><div>{srcb}{over}</div>')
    subprocess.run(["node", f"{TC}/hg-shot.mjs", f"{SCRATCH}/overlay.html", f"{SCRATCH}/overlay.png", "1600", str(round(1600 * VB[3] / VB[2]))], cwd=TC, check=True)
    print(f"{SCRATCH}/sheet.png")
