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
WHEEL_CENTRES = ((777, 1327), (1777.5, 1328))
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
   _noBush=True, _glow=LTEAL, _sparks=True)),
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
        if i in DROP or (pal.get("_noBush") and i in BUSH_SHAPES): continue
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
               + '<ellipse cx="777" cy="1327" rx="152" ry="141.5" fill="#fff"/>' if pal.get("_noBush") else "") + '</mask>')
    glow = (f'<radialGradient id="{key}-glow"><stop offset="0" stop-color="{pal["_glow"]}" stop-opacity=".6"/>'
            f'<stop offset=".55" stop-color="{GLACIER}" stop-opacity=".14"/><stop offset="1" stop-color="{GLACIER}" stop-opacity="0"/></radialGradient>'
            if pal.get("_glow") else "")
    behind = f'<ellipse cx="1250" cy="880" rx="1060" ry="680" fill="url(#{key}-glow)"/>' if glow else ""
    star = "M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
    sparks = "".join(f'<path d="{star}" transform="translate({x} {y}) scale({k})" fill="{c}"/>' for x, y, k, c in
                     [(560, 330, 70, YOLK), (1080, 230, 45, "#ffffff"), (2020, 230, 85, YOLK), (2200, 640, 50, "#ffffff"), (330, 820, 45, YOLK)]) if pal.get("_sparks") else ""
    # a smooth rim over each wheel's outline band, so the cuts for the bush and the receipt card never show on it
    rims = "".join(f'<ellipse cx="{cx}" cy="{cy}" rx="143" ry="131" fill="none" stroke="{pal["line"]}" stroke-width="22"/>' for cx, cy in WHEEL_CENTRES)
    pre = head.split("<defs>", 1)[1].rsplit("</defs>", 1)[0]  # the source's clip paths and the rim's gradient
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 200 2120 1360" width="2120" height="1360">'
           f'<defs>{mask}{pre}{glow}{"".join(defs)}</defs>{behind}{"".join(out)}{rims}{sparks}</svg>')
    assert "<style" not in svg and "<image" not in svg
    open(f"{S}/cart-{key}.svg", "w").write(svg)
print("ok", [k for k, _, _ in OPTIONS])
