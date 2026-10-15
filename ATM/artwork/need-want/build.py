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
 ("F", "Glacier grocery bag", "The grocery bag in glacier blue, so the bread, carrot, broccoli and apple sit on a cool, light ground.",
  dict(pal_common, gbag=["#eaf6ff", GLACIER, GLACIER2], gbagSide=[GLACIER2, GLACIER3], gbagFold=[GLACIER3, "#5f9fd0"], gbagIn=["#6aa9d8", "#4f8fc2"])),
 ("G", "Egg-yolk grocery bag", "The grocery bag in a light egg yolk with orange sides: warmer, and a stronger match for the controller.",
  dict(pal_common, gbag=["#ffe596", "#ffd766", "#ffc23a"], gbagSide=[ORANGE, "#e08a12"], gbagFold=["#e08a12", "#c46a0a"], gbagIn=["#c46a0a", "#a85a08"])),
]

# Each shape's path data, for the gloss and shadow clips.
shapes = re.findall(r'<(?:path|polygon)\b[^>]*?class="r-([^"]+)"[^>]*?(?:d|points)="([^"]+)"', frag)
assert len(shapes) == 89
D = lambda i: shapes[i][1]
GLOSS = (1, 2, 6)  # grocery bag, shopping bag, controller: a soft light band clipped to each
BOARD_TOPS = (4, 5)
SHADOWS = [(1460, 1660, 300, 70), (2980, 1390, 560, 95), (1620, 1840, 230, 50)]  # on the board: cx, cy, rx, ry

def extras(key):
    defs = [f'<radialGradient id="{key}-glow"><stop offset="0" stop-color="{LTEAL}" stop-opacity=".55"/><stop offset=".5" stop-color="{GLACIER}" stop-opacity=".16"/><stop offset="1" stop-color="{GLACIER}" stop-opacity="0"/></radialGradient>',
            f'<linearGradient id="{key}-gloss" x1="0" y1="0" x2="1" y2="0"><stop offset=".08" stop-color="#ffffff" stop-opacity="0"/><stop offset=".2" stop-color="#ffffff" stop-opacity=".38"/><stop offset=".32" stop-color="#ffffff" stop-opacity="0"/></linearGradient>',
            f'<radialGradient id="{key}-shadow"><stop offset="0" stop-color="{NAVY}" stop-opacity=".38"/><stop offset="1" stop-color="{NAVY}" stop-opacity="0"/></radialGradient>',
            f'<clipPath id="{key}-board">' + "".join(f'<path d="{D(i)}"/>' for i in BOARD_TOPS) + "</clipPath>"]
    defs += [f'<clipPath id="{key}-c{i}"><path d="{D(i)}"/></clipPath>' for i in GLOSS]
    return defs

def paint(key):
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
    glow = f'<ellipse cx="2000" cy="1250" rx="2050" ry="1250" fill="url(#{key}-glow)"/>'
    return glow + "".join(out)

css, figs = [], []
for key, name, text, pal in OPTIONS:
    missing = set(roles) - set(pal); assert not missing, missing
    assert "#ffffff" not in [v for v in pal.values() if isinstance(v, str)], "no stark white objects"
    defs = extras(key)
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
<svg viewBox="0 0 4012.4 2500" role="img" aria-label="Option {key}: {name}"><defs>{"".join(defs)}</defs>{paint(key)}</svg></div>
<figcaption><span class="letter">{key}</span><div><strong>{name}</strong><p>{text}</p></div></figcaption></figure>''')
head = open(f"{S}/head.html").read()
open(f"{S}/need-want-scale.html", "w").write(head.replace("/*OPTION_CSS*/", "\n".join(css)).replace("<!--FIGS-->", "\n".join(figs)))
print("ok", len(css))
