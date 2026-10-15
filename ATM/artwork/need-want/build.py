import json, sys
S = sys.argv[1]
frag = open(f"{S}/shapes.svgfrag").read()
roles = json.load(open(f"{S}/roles.json"))
NAVY, MID, TEAL, DTEAL, LTEAL, LBLUE, YOLK, WHITE = "#002c44", "#11232d", "#059390", "#00615e", "#3bbfc0", "#0079a9", "#ffcc40", "#ffffff"
SKY, AMBER, AMBER2, AMBER3, CORAL, CORAL2, CORAL3 = "#00acdd", "#f5a524", "#e08a12", "#b85f00", "#ff7a59", "#e85d3f", "#a83a22"
base = dict(boardTop=WHITE, boardEdge=SKY, standFront=LTEAL, standSide=TEAL, standInner=DTEAL, pivot=YOLK, pivotRing=NAVY,
            cylBody=WHITE, cylCap=LTEAL, cylShade=SKY)
OPTIONS = [
 ("A", "Yolk and sky", "Navy line. NEED is an egg-yolk grocery bag; WANT is a sky-blue shopping bag with a white controller. White and teal hold the scale together.",
  dict(base, line=NAVY, key=YOLK, keyShade=AMBER, ring=YOLK, gbag=YOLK, gbagSide=AMBER, gbagFold=AMBER2, gbagIn=AMBER3,
       bread=WHITE, breadMark=SKY, milk=WHITE, milkSide=SKY, apple=CORAL, leaf=LTEAL, carrot=LTEAL, broc=TEAL, stalk=LTEAL,
       sbag=SKY, sbagSide=LBLUE, sbagFold=LBLUE, sbagIn=NAVY, handle=WHITE, ctrl=WHITE, ctrlEdge=LTEAL, ctrlRing=NAVY, ctrlBtn=YOLK)),
 ("B", "Coral and yolk", "Navy line, warmer. A coral grocery bag against an egg-yolk shopping bag; the controller is sky blue. Coral strays from the brand a little for punch.",
  dict(base, line=NAVY, boardEdge=LTEAL, key=WHITE, keyShade=LTEAL, ring=WHITE, gbag=CORAL, gbagSide=CORAL2, gbagFold=CORAL2, gbagIn=CORAL3,
       bread=YOLK, breadMark=WHITE, milk=WHITE, milkSide=LTEAL, apple=YOLK, leaf=YOLK, carrot=WHITE, broc=LTEAL, stalk=WHITE,
       sbag=YOLK, sbagSide=AMBER, sbagFold=AMBER2, sbagIn=AMBER3, handle=CORAL, ctrl=SKY, ctrlEdge=LBLUE, ctrlRing=NAVY, ctrlBtn=WHITE)),
 ("C", "White line", "A white outline instead of navy, like a sticker, with deeper fills: egg-yolk grocery bag, coral shopping bag, navy controller, sky-blue board.",
  dict(base, line=WHITE, boardTop=SKY, boardEdge=LBLUE, standFront=LTEAL, standSide=TEAL, standInner=DTEAL, pivot=YOLK, pivotRing=WHITE,
       cylBody=YOLK, cylCap=AMBER, cylShade=AMBER2, key=YOLK, keyShade=AMBER, ring=YOLK, gbag=YOLK, gbagSide=AMBER, gbagFold=AMBER2, gbagIn=AMBER3,
       bread=CORAL, breadMark=WHITE, milk=SKY, milkSide=LBLUE, apple=CORAL, leaf=YOLK, carrot=WHITE, broc=TEAL, stalk=LTEAL,
       sbag=CORAL, sbagSide=CORAL2, sbagFold=CORAL2, sbagIn=CORAL3, handle=YOLK, ctrl=NAVY, ctrlEdge=MID, ctrlRing=WHITE, ctrlBtn=YOLK)),
 ("D", "Most on brand", "Midnight line and only brand colours: a light-teal grocery bag, an egg-yolk scale stand, a white shopping bag and a navy controller.",
  dict(base, line=MID, boardTop=WHITE, boardEdge=LTEAL, standFront=YOLK, standSide=AMBER, standInner=AMBER3, pivot=WHITE, pivotRing=MID,
       cylBody=WHITE, cylCap=LTEAL, cylShade=LTEAL, key=WHITE, keyShade=LTEAL, ring=WHITE, gbag=LTEAL, gbagSide=TEAL, gbagFold=DTEAL, gbagIn=DTEAL,
       bread=YOLK, breadMark=WHITE, milk=WHITE, milkSide=LTEAL, apple=YOLK, leaf=WHITE, carrot=WHITE, broc=YOLK, stalk=WHITE,
       sbag=WHITE, sbagSide=LBLUE, sbagFold=LBLUE, sbagIn=LBLUE, handle=YOLK, ctrl=NAVY, ctrlEdge=MID, ctrlRing=WHITE, ctrlBtn=YOLK)),
]
A = OPTIONS[0][3]
OPTIONS.append(("E", "Yolk and sky, white line", "Option A's bags with the white outline from C, so the art separates from the dark card more clearly. Anything that was white turns teal, sky or egg yolk so the outline still shows.",
  dict(A, line=WHITE, pivotRing=WHITE, sbagIn=LBLUE, boardTop=LTEAL, boardEdge=TEAL, cylBody=SKY, cylCap=LTEAL, cylShade=LBLUE,
       bread=SKY, breadMark=WHITE, milk=LTEAL, milkSide=TEAL, handle=YOLK, ctrl=YOLK, ctrlEdge=AMBER, ctrlRing=NAVY, ctrlBtn=NAVY)))
assert "#00acdd" not in OPTIONS[3][3].values()
for _, _, _, pal in OPTIONS:
    missing = set(roles) - set(pal); assert not missing, missing
    assert "#808080" not in pal.values()
css, figs = [], []
for key, name, text, pal in OPTIONS:
    css += [f"#opt{key} .r-{r}{{fill:{pal[r]}}}" for r in roles]
    figs.append(f'''<figure id="opt{key}"><div class="card"><div class="copy"><span class="kicker">LESSON 1</span><span class="title">Need or Want?</span></div>
<svg viewBox="0 0 4012.4 2500" role="img" aria-label="Option {key}: {name}">{frag}</svg></div>
<figcaption><span class="letter">{key}</span><div><strong>{name}</strong><p>{text}</p></div></figcaption></figure>''')
head = open(f"{S}/head.html").read()
open(f"{S}/need-want-scale.html", "w").write(head.replace("/*OPTION_CSS*/", "\n".join(css)).replace("<!--FIGS-->", "\n".join(figs)))
print("ok", len(css))
