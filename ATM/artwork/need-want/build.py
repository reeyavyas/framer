# Paints the role-tagged scale vector (from recolor.py) with each option's palette and writes the preview page.
# A role's colour is a hex string (flat), or (x2, y2, [stops]) for a linear gradient: used on the scale only.
import json, sys
S = sys.argv[1]
frag = open(f"{S}/shapes.svgfrag").read()
roles = json.load(open(f"{S}/roles.json"))
MID, NAVY, TEAL, DTEAL, LTEAL, LBLUE, YOLK = "#11232d", "#002c44", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#ffcc40"
GLACIER, MINT, ORANGE, SKY = "#d9eeff", "#bce2d7", "#f6a11d", "#00acdd"
MINT2, MINT3, GLACIER2, GLACIER3 = "#8fd3c0", "#5fbfa6", "#a9d3ef", "#7fb9e3"
scale = dict(
    boardTop=(1, 1, [MINT, MINT2]), boardEdge=(1, 0, [MINT2, MINT3]),
    standFront=(0, 1, [LTEAL, TEAL]), standSide=(0, 1, [TEAL, DTEAL]), standInner=DTEAL, pivot=YOLK, pivotRing=MID,
    cylBody=(0, 1, [GLACIER, GLACIER2]), cylCap=MINT, cylShade=MINT2)
# natural, punchy produce; no stark white anywhere
produce = dict(bread="#f0a03c", breadMark="#ffd27a", milk=GLACIER, milkSide="#7fd3f0", apple="#f2453d", leaf="#4cc35a",
               carrot="#ff8a1f", broc="#3fb54a", stalk="#9be15d")
keys = dict(key=GLACIER, keyEdge=LTEAL, key2=LTEAL, key2Edge=TEAL, ring=GLACIER)
want = dict(sbag=SKY, sbagSide="#0094c6", sbagFold="#0094c6", sbagIn=LBLUE, handle=SKY,
            ctrl=YOLK, ctrlEdge=ORANGE, ctrlRing=NAVY, ctrlBtn=NAVY)
common = dict(line=MID, **scale, **produce, **keys, **want)
OPTIONS = [
 ("F", "Glacier grocery bag", "The grocery bag in glacier blue, so the bread, carrot, broccoli and apple sit on a cool, light ground.",
  dict(common, gbag=GLACIER, gbagSide=GLACIER2, gbagFold=GLACIER3, gbagIn="#6aa9d8")),
 ("G", "Egg-yolk grocery bag", "The grocery bag in a light egg yolk with orange sides: warmer, and a stronger match for the controller.",
  dict(common, gbag="#ffd766", gbagSide=ORANGE, gbagFold="#e08a12", gbagIn="#c46a0a")),
]
for _, _, _, pal in OPTIONS:
    missing = set(roles) - set(pal); assert not missing, missing
    flat = [v for v in pal.values() if isinstance(v, str)]
    assert "#ffffff" not in flat, "no stark white objects"
css, figs = [], []
for key, name, text, pal in OPTIONS:
    defs = []
    for r in roles:
        v = pal[r]
        if isinstance(v, tuple):
            x2, y2, stops = v
            gid = f"g{key}-{r}"
            defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">' + "".join(
                f'<stop offset="{i / (len(stops) - 1)}" stop-color="{c}"/>' for i, c in enumerate(stops)) + "</linearGradient>")
            v = f"url(#{gid})"
        css.append(f"#opt{key} .r-{r}{{fill:{v}}}")
    figs.append(f'''<figure id="opt{key}"><div class="card"><div class="copy"><span class="kicker">LESSON 1</span><span class="title">Need or Want?</span></div>
<svg viewBox="0 0 4012.4 2500" role="img" aria-label="Option {key}: {name}"><defs>{"".join(defs)}</defs>{frag}</svg></div>
<figcaption><span class="letter">{key}</span><div><strong>{name}</strong><p>{text}</p></div></figcaption></figure>''')
head = open(f"{S}/head.html").read()
open(f"{S}/need-want-scale.html", "w").write(head.replace("/*OPTION_CSS*/", "\n".join(css)).replace("<!--FIGS-->", "\n".join(figs)))
print("ok", len(css))
