# Paints the role-tagged scale vector (from recolor.py) with each option's palette and writes the preview page.
# A role's colour is a hex string (flat), a list of stops (a diagonal light-to-shade gradient across each
# shape), or ("user", x1, y1, x2, y2, stops) for one gradient in the drawing's own coordinates (the board,
# so the cut-out inside the key ring matches the board behind it).
import json, re, sys
S = sys.argv[1]
frag = open(f"{S}/shapes.svgfrag").read()
roles = json.load(open(f"{S}/roles.json"))
MID, NAVY, TEAL, DTEAL, LTEAL, LBLUE, YOLK = "#11232d", "#002c44", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#ffcc40"
GLACIER, MINT, ORANGE, SKY = "#d9eeff", "#bce2d7", "#f6a11d", "#00acdd"
MINT2, MINT3, GLACIER2, GLACIER3 = "#8fd3c0", "#5fbfa6", "#a9d3ef", "#7fb9e3"
BOARD = ("user", 266, 1091, 3748, 1948, ["#d3efe5", MINT, MINT2])
pal_common = dict(
    line=MID,
    boardTop=BOARD, keyHole=BOARD, boardEdge=[MINT2, MINT3],
    standFront=[LTEAL, TEAL], standSide=[TEAL, DTEAL], standInner=[DTEAL, "#004a48"], pivot=["#ffe08a", YOLK, ORANGE], pivotRing=MID,
    cylBody=["#eaf6ff", GLACIER, GLACIER2], cylCap=[MINT, MINT2], cylShade=[MINT2, MINT3],
    bread=["#ffc56a", "#f0a03c", "#d9822a"], breadMark="#ffd27a",
    milk=["#eaf6ff", GLACIER, GLACIER2], milkSide=["#a6e2f6", "#5fc6ea"],
    apple=["#ff7a6b", "#f2453d", "#c92c25"], leaf=["#7ad86f", "#4cc35a"], carrot=["#ffae5a", "#ff8a1f", "#e8650a"],
    broc=["#6fd36a", "#3fb54a", "#2a8f3c"], stalk=["#c2f08a", "#9be15d"],
    key=["#eaf6ff", GLACIER, GLACIER2], keyEdge=[DTEAL, "#004a48"], key2=["#ffe08a", YOLK, "#f6b52a"], key2Edge=[DTEAL, "#004a48"],
    ring=[GLACIER, GLACIER2],
    sbag=["#5fd0f2", SKY, "#008fc0"], sbagSide=["#0094c6", LBLUE], sbagFold=["#0094c6", LBLUE], sbagIn=[LBLUE, "#005f88"],
    handle=["#5fd0f2", SKY],
    ctrl=["#ffe08a", YOLK, "#ffbe2e"], ctrlEdge=[ORANGE, "#e08a12"], ctrlRing=NAVY, ctrlBtn=["#0a4d70", NAVY],
)
OPTIONS = [
 ("G", "Kept: brand colours", "The version you chose: egg-yolk grocery bag, bright blue shopping bag, mint scale. Unchanged.",
  dict(pal_common, gbag=["#ffe596", "#ffd766", "#ffc23a"], gbagSide=[ORANGE, "#e08a12"], gbagFold=["#e08a12", "#c46a0a"], gbagIn=["#c46a0a", "#a85a08"],
       sbag=[GLACIER, "#3cc0ef", SKY, "#0090d0"], sbagSide=[SKY, "#0094c6"], sbagFold=["#0094c6", LBLUE], sbagIn=[SKY, LBLUE], handle=[GLACIER, SKY])),
]

# Round 8: open palettes (no brand limit). Natural food, gold and silver keys, warm colours that stand out on teal.
board = lambda *stops: ("user", 266, 1091, 3748, 1948, list(stops))
KRAFT = dict(gbag=["#ffe2b0", "#f6c177", "#e8a352"], gbagSide=["#d98a3d", "#bf7330"], gbagFold=["#bf7330", "#a35f25"], gbagIn=["#8f521f", "#7a4519"])
GOLD = ["#fff1b8", "#ffd84d", "#f2b705"]; GOLD_EDGE = ["#c98a00", "#a06d00"]
SILVER = ["#f1ecff", "#cfc4f2", "#a99bd9"]; SILVER_EDGE = ["#7a6bb0", "#5f5196"]
food = dict(bread=pal_common["bread"], breadMark=pal_common["breadMark"], milk=["#f7fbff", "#e6f0ff", "#c9dcff"], milkSide=["#8fc2ff", "#5a9cf0"],
            apple=pal_common["apple"], leaf=pal_common["leaf"], carrot=pal_common["carrot"], broc=pal_common["broc"], stalk=pal_common["stalk"])
def open_palette(line, boardStops, boardEdge, stand, standSide, standInner, pivot, cyl, cylCap, cylShade, keys, bag, sbag, sbagSide, sbagIn, ctrl, ctrlEdge, ctrlBtn, glow, spark):
    (key, keyEdge), (key2, key2Edge) = keys
    return dict(food, **bag, line=line, boardTop=board(*boardStops), keyHole=board(*boardStops), boardEdge=boardEdge,
                standFront=stand, standSide=standSide, standInner=standInner, pivot=pivot, pivotRing=line,
                cylBody=cyl, cylCap=cylCap, cylShade=cylShade, key=key, keyEdge=keyEdge, key2=key2, key2Edge=key2Edge, ring=key,
                sbag=sbag, sbagSide=sbagSide, sbagFold=sbagSide, sbagIn=sbagIn, handle=sbag[:2],
                ctrl=ctrl, ctrlEdge=ctrlEdge, ctrlRing=line, ctrlBtn=ctrlBtn, _glow=glow, _spark=spark)
OPTIONS += [
 ("H", "Candy shop", "Bubblegum-pink scale on a violet stand, a kraft grocery bag, a purple shopping bag and a coral-red controller. Gold and rose-gold keys, plum outline.",
  open_palette("#2a1440", ("#ffd1e8", "#ff9fcf", "#ff6fb5"), ["#ff6fb5", "#e0468f"], ["#b78cff", "#8b5cf6"], ["#8b5cf6", "#6a3fd6"], ["#5a2fbf", "#45209c"],
               ["#ffe27a", "#ffc53d", "#ff9f1c"], ["#fff0f8", "#ffd1e8", "#ffb0d8"], ["#ff9fcf", "#ff6fb5"], ["#ff6fb5", "#e0468f"],
               ((GOLD, GOLD_EDGE), (["#ffd3c4", "#f4a58a", "#e07f62"], ["#b8563c", "#963f29"])), KRAFT,
               ["#e2ccff", "#b07cff", "#8b4dff"], ["#8b4dff", "#6a2fe0"], ["#6a2fe0", "#4f1fb3"],
               ["#ffb3b0", "#ff6b6b", "#ee4b4b"], ["#d83b3b", "#b82d2d"], GOLD[:2], "#ff9fcf", ("#ffd84d", "#fff1fa"))),
 ("I", "Sunset", "Peach scale on a raspberry stand, a sunny yellow grocery bag, a hot-magenta shopping bag and a violet controller. Gold and lilac-silver keys.",
  open_palette("#2b1631", ("#ffe0c2", "#ffb38a", "#ff8a5c"), ["#ff8a5c", "#e8663c"], ["#ff5c8a", "#e0306a"], ["#e0306a", "#b81f52"], ["#8f1840", "#701234"],
               ["#ffe27a", "#ffc53d", "#ff9f1c"], ["#fff3e6", "#ffe0c2", "#ffc49a"], ["#ffb38a", "#ff8a5c"], ["#ff8a5c", "#e8663c"],
               ((GOLD, GOLD_EDGE), (SILVER, SILVER_EDGE)),
               dict(gbag=["#fff6c9", "#ffe57a", "#ffd23f"], gbagSide=["#ffbf1f", "#f2a200"], gbagFold=["#e09400", "#c27f00"], gbagIn=["#a86c00", "#8c5a00"]),
               ["#ffb3dc", "#ff4fa3", "#e0267f"], ["#e0267f", "#b81866"], ["#a3155a", "#80104a"],
               ["#c9b8ff", "#7b61ff", "#5a3ff0"], ["#5a3ff0", "#4529c9"], ["#ffe57a", "#ffd23f"], "#ffb38a", ("#ffe57a", "#fff3e6"))),
 ("J", "Arcade", "Lemon scale on a red-orange stand, a kraft grocery bag, an electric-purple shopping bag and a hot-pink controller with cyan buttons. Silver-blue and gold keys.",
  open_palette("#1b1530", ("#fffbb0", "#fff07a", "#ffd23f"), ["#ffd23f", "#f2b600"], ["#ff6b4a", "#f04a2a"], ["#f04a2a", "#c9361b"], ["#9e2a14", "#80200f"],
               ["#a6f5ff", "#4cc9f0"], ["#fffde0", "#fff07a", "#ffe14a"], ["#ffd23f", "#f2b600"], ["#f2b600", "#d99a00"],
               ((["#e8f1ff", "#b9ccff", "#8faaf0"], ["#4a5fb8", "#36479a"]), (GOLD, GOLD_EDGE)), KRAFT,
               ["#d4b3ff", "#9b5de5", "#7b3fd1"], ["#7b3fd1", "#5f2bb0"], ["#5f2bb0", "#4a1f8c"],
               ["#ffc2e6", "#f15bb5", "#d93f9a"], ["#d93f9a", "#b52d7f"], ["#a6f5ff", "#4cc9f0"], "#fff07a", ("#fff07a", "#f15bb5"))),
 ("K", "Citrus and berry", "Lavender scale on an indigo stand, a kraft grocery bag, a tangerine shopping bag and a berry-red controller. Gold and lilac-silver keys.",
  open_palette("#1f1a3a", ("#e9e1ff", "#cbb8ff", "#a98cff"), ["#a98cff", "#8a6be6"], ["#6c5ce7", "#5443c9"], ["#5443c9", "#3f30a6"], ["#2f2380", "#251c66"],
               ["#ffe27a", "#ffb703"], ["#f6f2ff", "#e9e1ff", "#cbb8ff"], ["#cbb8ff", "#a98cff"], ["#a98cff", "#8a6be6"],
               ((GOLD, GOLD_EDGE), (SILVER, SILVER_EDGE)), KRAFT,
               ["#ffd0a8", "#ff8c42", "#f26a1b"], ["#f26a1b", "#d4550f"], ["#b8460a", "#963807"],
               ["#ff9fb0", "#ef476f", "#d62c55"], ["#d62c55", "#b01f44"], ["#ffe27a", "#ffb703"], "#cbb8ff", ("#ffb703", "#ffe9d6"))),
 ("L", "Toy box", "Primary colours, like plastic toys: a cream scale on a red stand, a kraft grocery bag, a royal-blue shopping bag and a sunflower controller with red buttons.",
  open_palette("#14213d", ("#fff7e0", "#ffe8b0", "#ffd77a"), ["#ffd77a", "#f2b84a"], ["#ff5d5d", "#e63946"], ["#e63946", "#c22a36"], ["#9b1f2a", "#7d1822"],
               ["#8fd3ff", "#3a86ff"], ["#fffbef", "#fff1c7", "#ffe39a"], ["#ffd77a", "#ffc23d"], ["#ffc23d", "#f2a900"],
               ((GOLD, GOLD_EDGE), (SILVER, SILVER_EDGE)), KRAFT,
               ["#a8c8ff", "#3a86ff", "#2667e0"], ["#2667e0", "#1d50b8"], ["#1d50b8", "#163f91"],
               ["#fff0a8", "#ffbe0b", "#f5a300"], ["#f5a300", "#d98e00"], ["#ff5d5d", "#e63946"], "#ffe8b0", ("#ffbe0b", "#fff7e0"))),
]

# Each shape's path data, for the gloss and shadow clips.
shapes = re.findall(r'<(?:path|polygon)\b[^>]*?class="r-([^"]+)"[^>]*?(?:d|points)="([^"]+)"', frag)
assert len(shapes) == 89
D = lambda i: shapes[i][1]
GLOSS = (1, 2, 6)  # grocery bag, shopping bag, controller: a soft light band clipped to each
BOARD_TOPS = (4, 5)
SHADOWS = [(1460, 1660, 300, 70), (1620, 1840, 230, 50)]  # on the board: cx, cy, rx, ry

def extras(key, glow):
    defs = [f'<radialGradient id="{key}-glow"><stop offset="0" stop-color="{glow}" stop-opacity=".55"/><stop offset=".5" stop-color="{glow}" stop-opacity=".16"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>',
            f'<linearGradient id="{key}-gloss" x1="0" y1="0" x2="1" y2="0"><stop offset=".08" stop-color="#ffffff" stop-opacity="0"/><stop offset=".2" stop-color="#ffffff" stop-opacity=".38"/><stop offset=".32" stop-color="#ffffff" stop-opacity="0"/></linearGradient>',
            f'<radialGradient id="{key}-shadow"><stop offset="0" stop-color="{NAVY}" stop-opacity=".38"/><stop offset="1" stop-color="{NAVY}" stop-opacity="0"/></radialGradient>',
            f'<clipPath id="{key}-board">' + "".join(f'<path d="{D(i)}"/>' for i in BOARD_TOPS) + "</clipPath>"]
    defs += [f'<clipPath id="{key}-c{i}"><path d="{D(i)}"/></clipPath>' for i in GLOSS]
    return defs

def paint(key, spark):
    # walk the shapes, inserting the gloss after each glossy shape and the shadows after the board tops
    parts = re.split(r'(<(?:path|polygon)\b[^>]*?/>)', frag)
    out, n = [], -1
    for part in parts:
        out.append(part)
        if re.match(r'<(path|polygon)\b', part):
            n += 1
            if n in GLOSS:
                out.append(f'<rect clip-path="url(#{key}-c{n})" x="0" y="0" width="4012" height="2500" fill="url(#{key}-gloss)"/>')
            if n == max(BOARD_TOPS):
                out.append(f'<g clip-path="url(#{key}-board)">' + "".join(
                    f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" transform="rotate(-14 {x} {y})" fill="url(#{key}-shadow)"/>' for x, y, rx, ry in SHADOWS) + "</g>")
    assert n == 88, n
    # flat four-point sparkles round the shopping bag and controller only: x, y, size, colour
    star = "M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
    a, b = spark
    sparkles = [(2300, 300, 80, a), (3440, 130, 100, a), (3720, 560, 60, b), (3800, 1000, 70, a), (2250, 640, 45, b), (3020, 60, 45, b)]
    out.append("".join(f'<path d="{star}" transform="translate({x} {y}) scale({k})" fill="{col}"/>' for x, y, k, col in sparkles))
    glow = f'<ellipse cx="2000" cy="1250" rx="2050" ry="1250" fill="url(#{key}-glow)"/>'
    return glow + "".join(out)

css, figs = [], []
for key, name, text, pal in OPTIONS:
    missing = set(roles) - set(pal); assert not missing, missing
    assert "#ffffff" not in [v for v in pal.values() if isinstance(v, str)], "no stark white objects"
    defs = extras(key, pal.get("_glow", LTEAL))
    for r in roles:
        v = pal[r]
        if isinstance(v, (list, tuple)):
            gid = f"g{key}-{r}"
            if v[0] == "user":
                _, x1, y1, x2, y2, stops = v
                attrs = f'gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"'
            else:
                stops, attrs = v, 'x1="0" y1="0" x2="1" y2="1"'
            defs.append(f'<linearGradient id="{gid}" {attrs}>' + "".join(
                f'<stop offset="{i / (len(stops) - 1):.2f}" stop-color="{c}"/>' for i, c in enumerate(stops)) + "</linearGradient>")
            v = f"url(#{gid})"
        css.append(f"#opt{key} .r-{r}{{fill:{v}}}")
    figs.append(f'''<figure id="opt{key}"><div class="card"><div class="copy"><span class="kicker">LESSON 1</span><span class="title">Need or Want?</span></div>
<svg viewBox="0 0 4012.4 2500" role="img" aria-label="Option {key}: {name}"><defs>{"".join(defs)}</defs>{paint(key, pal.get('_spark', (YOLK, GLACIER)))}</svg></div>
<figcaption><span class="letter">{key}</span><div><strong>{name}</strong><p>{text}</p></div></figcaption></figure>''')
head = open(f"{S}/head.html").read()
open(f"{S}/need-want-scale.html", "w").write(head.replace("/*OPTION_CSS*/", "\n".join(css)).replace("<!--FIGS-->", "\n".join(figs)))
print("ok", len(css))
