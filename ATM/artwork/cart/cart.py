# Recolours the cleaned stock cart (background, clouds and receipt card removed) with brand palettes.
# Every kept shape gets a role; each option paints the roles with flat colours or light-to-shade gradients.
import re, sys
S = sys.argv[1]
s = open(f"{S}/src.svg").read()
head, body = s[:s.index("</defs>") + 7], s[s.index("</defs>") + 7:]
els = list(re.finditer(r'<path\b[^>]*?/>', body))
assert len(els) == 105
SILHOUETTE, GAPS = 12, (94, 89, 104)
DROP = {0, 3, 4, 5, 6, 7, 8, 9, 11, *GAPS, 55, 95, 25, 96, 97, 98, 99}
ROLE = {}
def put(r, *ix):
    for i in ix: ROLE[i] = r
put("line", 12, 1, 2, 102); put("ground", 10)
put("grip", 45); put("gripHi", 46, 17); put("gripShade", 30, 37)
put("frame", 77, 70, 42, 22, 34); put("frameHi", 78, 50, 16); put("frameHi2", 13)
put("rim", 100); put("rimHi", 54); put("basket", 71, 72, 93, 103); put("basketShade", 101, 44, 31, 35, 29, 28); put("basketBack", 90)
put("slot", 63, 61, 59); put("slotHi", 64, 62, 60); put("slotShade", 26, 24, 33); put("slotTop", 19, 20, 21)
put("boxTop", 73, 15); put("boxTopHi", 14, 40); put("boxSide", 18, 38, 56); put("label", 74, 75, 76, 68, 69)
put("stripe", 47, 39); put("stripeShade", 41, 27); put("boxFront", 43, 53); put("boxFrontShade", 32)
put("flatTop", 36); put("flat", 52, 58); put("flatShade", 57)
put("gbox", 67); put("gboxDark", 66); put("gboxHi", 23)
put("tyre", 48, 51); put("tyreHi", 79, 84); put("hubRim", 49, 80, 85); put("hub", 82, 87); put("hubShade", 81, 86); put("hubHi", 83, 88)
put("bush", 92); put("bushMid", 91); put("bushDark", 65)
kept = [i for i in range(105) if i not in DROP]
BUSH_SHAPES = (91, 92, 65)
WHEEL_CENTRES = ((778, 1330), (1778, 1330))
WHEEL_SHAPES = (48, 51, 79, 84, 49, 80, 85, 82, 87, 81, 86, 83, 88)  # tyres, tyre highlights, hub rings, hubs
assert sorted(ROLE) == kept, set(kept) ^ set(ROLE)

NAVY, MID, TEAL, DTEAL, LTEAL, LBLUE, YOLK = "#002c44", "#11232d", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#ffcc40"
GLACIER, MINT, ORANGE, SKY = "#d9eeff", "#bce2d7", "#f6a11d", "#00acdd"
YOLK_T, YOLK_TT, AMBER = "#ffe07a", "#fff0b8", "#e08a12"
SKY_T, SKY_TT, SKY_S, SKY_SS = "#5fd0f2", "#9fe3f8", "#0094c6", "#006a96"
MINT_T, MINT_S, MINT_SS = "#d6f0e8", "#8fd3c0", "#5fbfa6"
GLACIER_S, GLACIER_SS = "#a9d3ef", "#7fb9e3"

def yolk_parts(): return dict(slot=[YOLK_T, YOLK], slotHi=YOLK_TT, slotShade=ORANGE, slotTop=AMBER)
def sky_parts(): return dict(slot=[SKY_T, SKY], slotHi=GLACIER, slotShade=LBLUE, slotTop=SKY_S)
WHEELS = dict(tyre=["#1d4f6e", NAVY], tyreHi="#2a6a8f", hubRim=MID, hub=[YOLK_T, YOLK], hubShade=ORANGE, hubHi=YOLK_TT)
BUSH = dict(bush=[MINT_T, MINT], bushMid=[MINT, MINT_S], bushDark=MINT_SS)  # light, so it stands out on the teal card
YOLK_BOX = dict(boxTop=[YOLK, ORANGE], boxTopHi=YOLK_T, boxSide=[ORANGE, AMBER], label=GLACIER, stripe=GLACIER, stripeShade=GLACIER_S,
                boxFront=[YOLK_T, YOLK], boxFrontShade=ORANGE)
MINT_BOX = dict(boxTop=[MINT, MINT_S], boxTopHi=MINT_T, boxSide=[LTEAL, TEAL], label=GLACIER, stripe=GLACIER, stripeShade=GLACIER_S,
                boxFront=[MINT_T, MINT], boxFrontShade=MINT_S)
def flat(top, mid, shade): return dict(flatTop=top, flat=mid, flatShade=shade)
def gbox(hi, mid, dark): return dict(gboxHi=hi, gbox=mid, gboxDark=dark)
def basket(t, base, s, ss, rimHi): return dict(rim=[t, base], rimHi=rimHi, basket=[t, base, s], basketShade=s, basketBack=ss)
def grip(t, base, s): return dict(grip=[t, base], gripHi=t, gripShade=s)
FRAME_GLACIER = dict(frame=[GLACIER, GLACIER_S], frameHi=GLACIER, frameHi2=GLACIER)
FRAME_TEAL = dict(frame=[LTEAL, TEAL], frameHi=MINT, frameHi2=MINT_T)

OPTIONS = [
 ("A", "Egg-yolk basket", dict(line=NAVY, ground=DTEAL, **basket(YOLK_T, YOLK, ORANGE, AMBER, YOLK_TT), **sky_parts(), **grip(SKY_T, SKY, LBLUE),
   **FRAME_GLACIER, **MINT_BOX, **flat(GLACIER, [GLACIER, GLACIER_S], GLACIER_SS), **gbox(SKY_TT, [SKY_T, SKY], SKY_S), **WHEELS, **BUSH)),
 ("B", "Sky basket", dict(line=NAVY, ground=DTEAL, **basket(SKY_T, SKY, SKY_S, SKY_SS, SKY_TT), **yolk_parts(), **grip(YOLK_T, YOLK, ORANGE),
   **FRAME_GLACIER, **YOLK_BOX, **flat(MINT_T, [MINT, MINT_S], MINT_SS), **gbox(GLACIER, [GLACIER, GLACIER_S], GLACIER_SS), **WHEELS, **BUSH)),
 ("C", "Mint basket", dict(line=MID, ground=DTEAL, **basket(MINT_T, MINT, MINT_S, MINT_SS, MINT_T), **yolk_parts(), **grip(YOLK_T, YOLK, ORANGE),
   **dict(frame=[GLACIER, GLACIER_S, GLACIER_SS], frameHi=GLACIER, frameHi2=GLACIER), **YOLK_BOX,
   **flat(SKY_TT, [SKY_T, SKY], SKY_S), **gbox(GLACIER, [GLACIER, GLACIER_S], GLACIER_SS), **WHEELS, **BUSH)),
 ("D", "Glacier basket", dict(line=NAVY, ground=DTEAL, **basket("#eef7ff", GLACIER, GLACIER_S, GLACIER_SS, "#eef7ff"), **yolk_parts(), **grip(YOLK_T, YOLK, ORANGE),
   frame=["#8fe0e0", LTEAL], frameHi=MINT_T, frameHi2=MINT_T,
   **dict(YOLK_BOX, label="#ffffff", stripe="#ffffff", stripeShade="#fff4d6"),
   **flat(MINT_T, [MINT, MINT_S], MINT_SS), **gbox(SKY_TT, [SKY_T, SKY], SKY_S),
   **dict(WHEELS, tyre=["#5cb8e6", "#2f8fc4"], tyreHi="#8fd3f2", hubRim="#1d6a96"), **BUSH,  # lighter blue wheels, egg-yolk hubs
   _noBush=True, _glow=LTEAL, _sparks=True, _circleWheels=True, _noGround=True)),
 ("E", "Light-blue basket", dict(line=MID, ground=DTEAL, **basket("#1a9bd0", LBLUE, "#005f88", "#004a6b", SKY_T), **yolk_parts(), **grip(YOLK_T, YOLK, ORANGE),
   **FRAME_GLACIER, **MINT_BOX, **flat(YOLK_TT, [YOLK_T, YOLK], ORANGE), **gbox(GLACIER, [GLACIER, GLACIER_S], GLACIER_SS), **WHEELS, **BUSH)),
]
d = lambda i: re.search(r'\sd="([^"]+)"', els[i].group(0)).group(1)
for key, name, pal in OPTIONS:
    missing = set(ROLE.values()) - set(pal); assert not missing, (key, missing)
    defs = []
    def fill(r):
        v = pal[r]
        if isinstance(v, str): return v
        gid = f"{key}-{r}"
        if not any(f'id="{gid}"' in x for x in defs):
            defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="1">' + "".join(
                f'<stop offset="{i / (len(v) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(v)) + "</linearGradient>")
        return f"url(#{gid})"
    out, last = [], 0
    for i, m in enumerate(els):
        out.append(body[last:m.start()]); last = m.end()  # keep the source's groups (some carry clip paths)
        if i in DROP or (pal.get("_noBush") and i in BUSH_SHAPES) or (pal.get("_circleWheels") and i in WHEEL_SHAPES) or (pal.get("_noGround") and ROLE[i] == "ground"): continue
        el = m.group(0)
        el = re.sub(r'\sfill="[^"]*"', f' fill="{fill(ROLE[i])}"', el, count=1)
        el = re.sub(r'\sfill-opacity="[^"]*"', "", el)
        if i == SILHOUETTE: el = el.replace("<path ", '<path mask="url(#cut)" ')
        if ROLE[i] == "ground": el = el.replace("<path ", '<path opacity=".55" ')
        out.append(el)
    out.append(body[last:].replace("</svg>", ""))
    # the see-through gaps (painted in background colour by the artist) and the receipt card become holes
    mask = ('<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="2500" height="1667">'
            '<rect width="2500" height="1667" fill="#fff"/>'
            '<rect x="1812" y="1012" width="380" height="430" fill="#000"/>'
            '<circle cx="1772" cy="1325" r="148" fill="#fff"/>'
            + "".join(f'<path d="{d(i)}" fill="#000" stroke="#000" stroke-width="4"/>' for i in GAPS)
            + ("".join(f'<path d="{d(i)}" fill="#000" stroke="#000" stroke-width="56" stroke-linejoin="round"/>' for i in BUSH_SHAPES)
               + '<ellipse cx="777" cy="1327" rx="152" ry="141.5" fill="#fff"/>' if pal.get("_noBush") else "")
            + ("".join(f'<ellipse cx="{cx}" cy="{cy}" rx="165" ry="150" fill="#000"/>' for cx, cy in WHEEL_CENTRES) if pal.get("_circleWheels") else "")
            + '</mask>')
    # strong core, then a long soft falloff so the edge diffuses instead of reading as an ellipse
    glow = (f'<radialGradient id="{key}-glow"><stop offset="0" stop-color="{pal["_glow"]}" stop-opacity=".75"/>'
            f'<stop offset=".42" stop-color="{pal["_glow"]}" stop-opacity=".48"/>'
            f'<stop offset=".68" stop-color="{GLACIER}" stop-opacity=".2"/><stop offset=".86" stop-color="{GLACIER}" stop-opacity=".06"/>'
            f'<stop offset="1" stop-color="{GLACIER}" stop-opacity="0"/></radialGradient>'
            if pal.get("_glow") else "")
    # inside the viewBox with room to spare, so the pulse never clips it
    behind = f'<ellipse cx="1250" cy="880" rx="1000" ry="640" fill="url(#{key}-glow)"/>' if glow else ""
    star = "M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
    sparks = "".join(f'<path d="{star}" transform="translate({x} {y}) scale({k})" fill="{c}"/>' for x, y, k, c in
                     [(300, 690, 60, YOLK), (900, 320, 42, "#ffffff"), (2050, 330, 80, YOLK), (2230, 720, 50, "#ffffff")]) if pal.get("_sparks") else ""  # every sparkle sits fully inside the viewBox (top is y 200), clear of the handle
    # a smooth rim over each wheel's outline band, so the cuts for the bush and the receipt card never show on it
    if pal.get("_circleWheels"):
        # two clean circle wheels: navy outline, light-blue tyre with a darker crescent, navy-blue hub ring, egg-yolk hub;
        # the ground line under each is redrawn where the cut-out took a bite out of it
        tyre_light, tyre_dark = pal["tyre"]
        rims = "".join(
            f'<rect x="{cx - 95}" y="1462" width="190" height="19" fill="{pal["line"]}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="145" fill="{pal["line"]}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="124" fill="{tyre_dark}"/>'
            f'<circle cx="{cx - 9}" cy="{cy - 9}" r="112" fill="{tyre_light}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="70" fill="{pal["hubRim"]}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="55" fill="{pal["hubShade"]}"/>'
            f'<circle cx="{cx - 5}" cy="{cy - 5}" r="49" fill="{pal["hub"][1]}"/>'
            f'<ellipse cx="{cx - 18}" cy="{cy - 22}" rx="22" ry="12" transform="rotate(-30 {cx - 18} {cy - 22})" fill="{pal["hubHi"]}"/>'
            for cx, cy in WHEEL_CENTRES)
    else:
        rims = ""
    pre = head.split("<defs>", 1)[1].rsplit("</defs>", 1)[0]  # the source's clip paths and the rim's gradient
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 200 2120 1360" width="2120" height="1360">'
           f'<defs>{mask}{pre}{glow}{"".join(defs)}</defs>{behind}{"".join(out)}{rims}{sparks}</svg>')
    assert "<style" not in svg and "<image" not in svg
    open(f"{S}/cart-{key}.svg", "w").write(svg)
print("ok", [k for k, _, _ in OPTIONS])

# ---- Animated export of D: the three boxes as separate groups with their own outlines ----
# The silhouette (shape 12) draws every outline, so the box area is cut out of it and each box gets its own
# outline: its shapes stroked in the line colour underneath its fills (the stroke's outer half is the outline,
# and it fills the gaps between faces). Layers carry data-k names the Framer component animates.
ITEMS = {  # back to front, with the point each one squashes from (its foot)
    "flat": ((36, 52, 57, 58), (1050, 565)),
    "yolk": ((14, 15, 18, 27, 32, 38, 39, 40, 41, 43, 47, 53, 56, 73, 74, 75, 76), (1400, 570)),
    "green": ((23, 66, 67, 68, 69), (1745, 595)),
}
# The art only drew what showed: the flat box ends along the egg-yolk box's slanted side, and the egg-yolk
# box's side face stops along the blue box. Once they hop, those cut edges show, so the boxes are completed:
# the flat box's two layers get straight vertical ends, and the egg-yolk box gets a whole side face (bottom
# edge running back, back edge parallel to the front edge, meeting it).
YOLK_SIDE = "M1503,590 L1525,388 L1662,388 L1640,590 Z"  # replaces shape 56
FLAT_ENDS = [  # (points, palette role or colour) per band, top layer then bottom layer
    ("1200,478 1222,478 1222,495 1209,495", "#d6f0e8"), ("1209,495 1222,495 1222,529 1217,529", "#a6dccb"),
    ("1223,546 1235,546 1235,562 1226,562", "#a6dccb"), ("1226,562 1235,562 1235,590 1233,590", "#5fbfa6"),
]
GROUND = "M322,1471.5 H2178"
# Each box's outline: its faces as polygons, filled and stroked in the line colour under the box's own fills,
# so the outline is closed with rounded corners (like the art's) and the lines between faces are solid.
HULLS = {
    "flat": ["877,478 1222,478 1222,529 877,529", "877,546 1235,546 1235,590 877,590"],
    "yolk": ["1274,253 1577,253 1511,367 1206,367", "1591,267 1657,367 1532,367",
             "1201,388 1507,388 1484,590 1251,590", "1525,388 1662,388 1640,590 1503,590"],
    "green": ["1643,415 1919,415 1833,590 1557,590"],
}
RIM_TOP = "M778,597 H1899 Q1914,598 1913,618"  # the basket rim's top outline, redrawn whole and even (the box cut-out shaved it)
RIM_BAND = "M772,556 H1915 V606 H772 Z"  # the original rim top outline, removed so only RIM_TOP draws it  # the ground line, redrawn outside the cart so the cart can roll along it
ITEM_SHAPES = {i for ix, _ in ITEMS.values() for i in ix}
BOX_AREA = "M845,180 H1965 V600 H845 Z"
def export_anim(key="D"):
    _, _, pal = next(o for o in OPTIONS if o[0] == key)
    svg = open(f"{S}/cart-{key}.svg").read()
    line = pal["line"]
    # cut the box area out of the silhouette
    svg = svg.replace("</mask>", f'<path d="{BOX_AREA}" fill="#000"/><rect x="300" y="1452" width="1900" height="60" fill="#000"/><path d="{RIM_BAND}" fill="#000"/></mask>', 1)
    svg = svg.replace('viewBox="190 200 2120 1360" width="2120" height="1360"', 'viewBox="190 80 2120 1480" width="2120" height="1480"')  # headroom for the hop
    body = svg[svg.index("</defs>") + 7:]
    shapes = list(re.finditer(r'<path\b[^>]*?/>', body))
    # match the recoloured shapes back to source indices by their path data
    src_d = {d(i): i for i in range(105)}
    groups = {name: [] for name in ITEMS}
    out, last = [], 0
    first = True
    for m in shapes:
        el = m.group(0)
        dm = re.search(r'\sd="([^"]+)"', el)
        i = src_d.get(dm.group(1)) if dm else None
        out.append(body[last:m.start()]); last = m.end()
        if i in ITEM_SHAPES:
            name = next(n for n, (ix, _) in ITEMS.items() if i in ix)
            if i == 56:  # the egg-yolk box's side, completed
                el = re.sub(r'\sd="[^"]+"', f' d="{YOLK_SIDE}"', el)
            groups[name].append(el)
            if first:
                out.append("<!--RIM--><!--ITEMS-->"); first = False
            continue
        out.append(el)
    out.append(body[last:])
    def item_layer(name):
        els = groups[name] + ([f'<polygon points="{pts}" fill="{c}"/>' for pts, c in FLAT_ENDS] if name == "flat" else [])
        outline = "".join(f'<polygon points="{pts}" fill="{line}" stroke="{line}" stroke-width="40" stroke-linejoin="round"/>' for pts in HULLS[name])
        return f'<g data-k="{name}">{outline}{"".join(els)}</g>'
    body = "".join(out).replace("<!--ITEMS-->", "".join(item_layer(n) for n in ITEMS))
    # everything but the glow, the ground and the sparkles rolls as one cart; the hub glints turn as it rolls
    gi = [0]
    def tag_glint(m):
        gi[0] += 1
        return f'<g data-k="glint{gi[0] - 1}">{m.group(0)}</g>'
    body = re.sub(r'<ellipse cx="[\d.]+" cy="[\d.]+" rx="22" ry="12"[^>]*/>', tag_glint, body)
    assert gi[0] == 2, gi[0]
    # name the glow and each sparkle
    body = body.replace(f'fill="url(#{key}-glow)"/>', f'fill="url(#{key}-glow)" data-k="glow"/>', 1)
    n = [0]
    def tag_star(m):
        n[0] += 1
        return m.group(0).replace("<path ", f'<path data-k="spark{n[0] - 1}" ', 1)
    body = re.sub(r'<path d="M0,-1 C0\.12[^>]*/>', tag_star, body)
    assert n[0] == 4 and all(groups.values()), (n[0], {k: len(v) for k, v in groups.items()})
    # the ground line's end dashes (shapes 1 and 2) stay with the ground, not the rolling cart
    dashes = []
    for i in (1, 2):
        m = re.search(r'<path\b[^>]*?\sd="' + re.escape(d(i)) + r'"[^>]*?/>', body)
        dashes.append(m.group(0)); body = body.replace(m.group(0), "", 1)
    gstart = body.index("/>", body.index('data-k="glow"')) + 2
    sstart = body.index('<path data-k="spark0"')
    body = (body[:gstart] + f'<path d="{GROUND}" stroke="{line}" stroke-width="19" stroke-linecap="round" fill="none"/>' + "".join(dashes)
            + '<g data-k="cart">' + body[gstart:sstart].replace("<!--RIM-->", f'<path d="{RIM_TOP}" stroke="{line}" stroke-width="22" stroke-linecap="round" fill="none"/>') + "</g>" + body[sstart:])
    out_svg = svg[:svg.index("</defs>") + 7] + body
    open(f"{S}/cart-{key}-anim.svg", "w").write(out_svg)
    return ITEMS
export_anim()
print("anim ok")
