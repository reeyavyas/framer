"""Adds a vault access door, lock, seams, pinhole camera, keypad depth and small details to the ATM artwork.
Usage: python3 edit_atm.py source/atm-original.webp <base.png>   (then options.py adds the chosen options)
See ATM/NOTES.md, "The ATM image". Needs Pillow, NumPy and the Inter font (INTER below)."""
import math, sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
S = 3  # supersample
base = Image.open(SRC).convert("RGBA")
W, H = base.size

def raise_faces(masks, region, shade=0.07, shadow_k=0.42, edge_line_rows=0):
    """Make flat faces look raised: shadow down-right outside the faces, a top-lit shade across
    each face, a highlight on each face's top row. edge_line_rows extends each face down over the
    artwork's own white bottom edge line so the shadow starts below it."""
    rx0, ry0, rx1, ry1 = region
    faces = np.zeros((ry1 - ry0, rx1 - rx0), bool)
    shadow = Image.new("L", (rx1 - rx0, ry1 - ry0), 0)
    full = []
    for m in masks:
        m = m[ry0:ry1, rx0:rx1].copy()
        rows = np.where(m.any(1))[0]
        for k in range(1, edge_line_rows + 1):  # carry the last row's span down over the edge line
            if rows[-1] + k < m.shape[0]: m[rows[-1] + k] = m[rows[-1]]
        full.append((m, rows[0], rows[-1]))
        faces |= m
        sm = Image.fromarray((m * 255).astype(np.uint8))
        shadow.paste(255, (2, 3), sm.crop((0, 0, sm.width - 2, sm.height - 3)))
    sh = np.array(shadow.filter(ImageFilter.GaussianBlur(2))) / 255 * (1 - faces)
    reg = np.array(base.crop(region)).astype(float)
    reg[..., :3] *= (1 - shadow_k * sh)[..., None]
    for m, top, bot in full:
        g = np.ones(m.shape[0]); g[top:bot + 1] = np.linspace(1 + shade, 1 - shade, bot - top + 1)
        reg[..., :3] = np.where(m[..., None], np.clip(reg[..., :3] * g[:, None, None], 0, 255), reg[..., :3])
        hl = np.zeros_like(m); hl[top] = m[top]
        reg[..., :3] = np.where(hl[..., None], reg[..., :3] * 0.5 + 127.5, reg[..., :3])
    return Image.fromarray(reg.astype(np.uint8), "RGBA")


# keypad depth, in the keypad's own perspective. Measured from the artwork: every key side runs
# toward one vanishing point; each row shares a top (top of the face) and a bottom (bottom of
# the key's white edge line); each key is given by its left and right x on its row's top.
VP = (494.0, 707.7)
ROW_TOP = [1343.5, 1367.5, 1392.5, 1420.5]
ROW_BOT = [1364.5, 1390.5, 1418.5, 1447.5]
KEY_X = [  # (left, right) at the row's top; four keys per row, left to right
    (339.0, 392.6), (405.4, 459.2), (471.8, 525.7), (553.9, 652.9),
    (333.1, 388.7), (402.0, 457.8), (471.0, 526.6), (557.0, 659.2),
    (327.1, 384.9), (398.7, 456.5), (470.2, 528.2), (559.4, 665.5),
    (320.4, 381.7), (394.9, 455.6), (469.4, 529.9), (562.2, 673.2)]
Z = 4  # masks are drawn 4x and scaled down, so every edge is anti-aliased


def along(x, y_from, y_to):
    """Where a key side through (x, y_from) is at y_to, following the vanishing point."""
    return VP[0] + (x - VP[0]) * (y_to - VP[1]) / (y_from - VP[1])


def aa_mask(polys, box):
    bx0, by0, bx1, by1 = box
    m = Image.new("L", ((bx1 - bx0) * Z, (by1 - by0) * Z), 0); md = ImageDraw.Draw(m)
    for poly in polys:
        md.polygon([((x - bx0) * Z, (y - by0) * Z) for x, y in poly], fill=255)
    return np.array(m.resize((bx1 - bx0, by1 - by0), Image.BOX)) / 255


# The right column (CANCEL, CLEAR, ENTER, blank) is drawn differently: the keys nearly touch, each
# has its own top and bottom, and the artwork already gives them a light top line and a right
# side, so they get no added top highlight. x positions are measured on colour edges, since the
# coloured keys are darker than the panel around them.
KEY_X[3], KEY_X[7], KEY_X[11] = (554.9, 654.9), (558.7, 661.2), (561.4, 667.5)
KEY_TB = {k: (ROW_TOP[k // 4], ROW_BOT[k // 4]) for k in range(16)}
KEY_TB.update({3: (1342.5, 1364.3), 7: (1366.5, 1390.0), 11: (1392.5, 1418.0), 15: (1420.5, 1447.5)})
OWN_TOP_LINE = {3, 7, 11, 15}

KP = (290, 1330, 710, 1466)
faces, fronts, dark_walls, tops = [], [], [], []
for k, (xl, xr) in enumerate(KEY_X):
    t0, b0 = KEY_TB[k]
    xlb, xrb = along(xl, t0, b0), along(xr, t0, b0)
    faces.append([(xl, t0), (xr, t0), (xrb, b0), (xlb, b0)])
    fb = b0 + 2.5  # the key's front, seen below its edge line, where it meets the panel
    fronts.append([(xlb, b0), (xrb, b0), (along(xr, t0, fb), fb), (along(xl, t0, fb), fb)])
    if k not in OWN_TOP_LINE:
        tops.append([(xl, t0), (xr, t0), (along(xr, t0, t0 + 1), t0 + 1), (along(xl, t0, t0 + 1), t0 + 1)])
    # keys left of centre show a sliver of their shaded right side, wider the further out they are
    mid = (xr + xrb) / 2
    w = 0.011 * (VP[0] - mid)
    if w > 0.3:
        dark_walls.append([(xr, t0), (xr + w, t0 + 0.6), (xrb + w, b0 + 2.5), (xrb, b0)])
face_masks = [aa_mask([f], KP) for f in faces]
F = np.clip(sum(face_masks), 0, 1)
front = aa_mask(fronts, KP) * (1 - F)
dwall = aa_mask(dark_walls, KP) * (1 - F)
top_hl = aa_mask(tops, KP)
# soft contact shadow around each key, a little more below it (toward the viewer)
sh = Image.fromarray((F * 255).astype(np.uint8))
sh = np.array(ImageChops.offset(sh, 0, 2).filter(ImageFilter.GaussianBlur(2.2))) / 255 * (1 - F)
reg = np.array(base.crop(KP)).astype(float); rgb = reg[..., :3]
rgb *= (1 - 0.30 * sh)[..., None]
rgb *= (1 - 0.45 * front)[..., None]
rgb *= (1 - 0.35 * dwall)[..., None]
ys = np.arange(KP[1], KP[3])[:, None]
for k, m in enumerate(face_masks):  # top-lit face shade: +6% at the top to -6% at the bottom of each key
    t0, b0 = KEY_TB[k]
    shade = np.clip(1.06 - 0.12 * (ys - t0) / (b0 - t0), 0.94, 1.06)
    rgb[:] = rgb * (1 + (shade - 1) * m)[..., None]
rgb += (255 - rgb) * (0.45 * top_hl)[..., None]
reg[..., :3] = np.clip(rgb, 0, 255)
base.paste(Image.fromarray(reg.astype(np.uint8), "RGBA"), KP[:2])
arr0 = np.array(base)

# chevron buttons beside the screen: plain rectangles (left column, right column)
CH_ROWS = [(908, 949), (953, 995), (1000, 1041), (1046, 1088)]
CH_COLS = [(113, 180), (636, 701)]
CH = (100, 900, 715, 1100)
ch_masks = []
for cx0, cx1 in CH_COLS:
    for cy0, cy1 in CH_ROWS:
        m = np.zeros(arr0.shape[:2], bool); m[cy0:cy1 + 1, cx0:cx1 + 1] = True; ch_masks.append(m)
base.paste(raise_faces(ch_masks, CH, shade=0.06, shadow_k=0.38), CH[:2])

# right panel row: headphone icon, jack, black reader square, evenly spaced and centred on the panel
PANEL_C, GAP, ICON_GAP, JACK_D, SQ_W = 887, 24, 10, 20, 77  # SQ_W: the square's visible width (x 849..926)
IS = 0.75  # icon scale (1 = 28 px wide)
ICON_W = 28 * IS
ROW_X0 = PANEL_C - (ICON_W + ICON_GAP + JACK_D + GAP + SQ_W) / 2
SQ_X0, SQ_Y0, SQ_X1, SQ_Y1 = 847, 1218, 929, 1294  # square incl. its edge highlights
SQ_DX = round(ROW_X0 + ICON_W + ICON_GAP + JACK_D + GAP - 849)  # how far the square moves right
px = np.array(base)
sq = px[SQ_Y0:SQ_Y1, SQ_X0:SQ_X1].copy()
lft, rgt = px[SQ_Y0:SQ_Y1, SQ_X0 - 2].astype(float), px[SQ_Y0:SQ_Y1, SQ_X1 + 6].astype(float)
w = np.linspace(0, 1, SQ_X1 + SQ_DX - SQ_X0)[None, :, None]
px[SQ_Y0:SQ_Y1, SQ_X0:SQ_X1 + SQ_DX] = (lft[:, None] * (1 - w) + rgt[:, None] * w).astype(np.uint8)  # panel background
px[SQ_Y0:SQ_Y1, SQ_X0 + SQ_DX:SQ_X1 + SQ_DX] = sq
base = Image.fromarray(px, "RGBA")

INTER = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"


def layer():
    return Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))


def flat(img):
    return img.resize((W, H), Image.LANCZOS)


def s(*v):
    return [round(x * S) for x in v]


def comp(img, blur=0):
    global base
    img = flat(img)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    base = Image.alpha_composite(base, img)


def radial(size, inner, outer, cx=0.35, cy=0.3):
    """Square RGBA disc with a lit-from-top-left gradient (chrome look)."""
    n = size
    y, x = np.mgrid[0:n, 0:n] / n
    d = np.clip(np.hypot(x - cx, y - cy) / 0.85, 0, 1)[..., None]
    rgb = np.array(inner) * (1 - d) + np.array(outer) * d
    mask = (np.hypot(x - 0.5, y - 0.5) <= 0.5).astype(float)
    a = np.dstack([rgb, mask * 255]).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def paste_disc(img, x0, y0, r, inner, outer, **kw):
    d = radial(round(2 * r * S), inner, outer, **kw)
    img.alpha_composite(d, (round((x0 - r) * S), round((y0 - r) * S)))


# ---------- lower cabinet: brushed texture, side seams, kick plate ----------
TOP, KICK = 1478, 1920  # cabinet runs to the bottom edge
rng = np.random.default_rng(7)
grain = rng.normal(0, 1, (1, W)).repeat(H, 0)  # vertical brushing
grain = Image.fromarray(np.clip(128 + grain * 5, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
gm = np.zeros((H, W), np.uint8)
gm[TOP:KICK] = 26
tex = Image.merge("RGBA", (grain, grain, grain, Image.fromarray(gm)))
base = Image.alpha_composite(base, tex)

L = layer(); d = ImageDraw.Draw(L)
# cabinet side seams (panel joints)
for x in (44, W - 44):
    d.rectangle(s(x - 1, TOP + 2, x + 1, KICK), fill=(88, 88, 90, 255))
    d.rectangle(s(x + 2, TOP + 2, x + 3, KICK), fill=(185, 185, 188, 170))
# bolts at the cabinet corners
for bx, by in ((22, TOP + 30), (W - 22, TOP + 30)):
    paste_disc(L, bx, by, 9, (220, 222, 226), (110, 112, 118))  # 18 px across
    d.line(s(bx - 5, by, bx + 5, by), fill=(70, 72, 76, 255), width=round(S * 2.4))
comp(L)

# ---------- vault access door ----------
DX0, DY0, DX1, DY1 = 92, 1548, 988, 1980  # runs past the bottom edge: no bottom seam shows; top lowered to give the label strip room
# The door is the machine body itself (same metal and grain): only its seam, a faint highlight,
# the hinges and the keyhole mark it. (A painted face in its own lighter grey didn't match the body.)
L = layer(); d = ImageDraw.Draw(L)
d.rounded_rectangle(s(DX0 - 2.5, DY0 - 2.5, DX1 + 2.5, DY1 + 2.5), radius=11 * S, outline=(70, 72, 76, 255), width=round(2.5 * S))  # the seam gap: thin and clearly darker than the body
d.rounded_rectangle(s(DX0, DY0, DX1, DY1), radius=9 * S, outline=(200, 202, 206, 90), width=S)  # faint bevel highlight
d.line(s(DX0 + 8, DY1 - 1, DX1 - 8, DY1 - 1), fill=(96, 98, 102, 255), width=2 * S)  # bottom bevel shade
IX1 = DX1 - 270  # the keyhole is centred between here and the door's right edge
comp(L)


def cylinder(w, h, lo=(62, 64, 70), hi=(238, 240, 244)):
    """Vertical steel cylinder lit from the upper left, as an RGBA image (supersampled size)."""
    u = np.linspace(-1, 1, w)
    n = np.stack([u, np.zeros_like(u), np.sqrt(np.clip(1 - u * u, 0, 1))], 1)
    light = np.array([-0.55, 0, 0.83])
    diff = np.clip(n @ light, 0, 1)
    spec = np.clip(n @ np.array([-0.3, 0, 0.95]), 0, 1) ** 40
    k = np.clip(0.18 + 0.72 * diff + 0.5 * spec, 0, 1)[None, :, None]
    rgb = np.array(lo) * (1 - k) + np.array(hi) * k
    return Image.fromarray(np.dstack([np.repeat(rgb, h, 0), np.full((h, w), 255)]).astype(np.uint8), "RGBA")


# barrel hinges in the door gap: three knuckles on a pin, domed pin caps, soft shadow on the door
HW, HH, CAP = 16, 72, 5
HCX = DX0 - 2  # barrel centre, in the seam
for hy in (DY0 + 40, DY0 + 280):
    sh = layer(); ImageDraw.Draw(sh).rounded_rectangle(s(HCX - HW / 2 + 3, hy + 2, HCX + HW / 2 + 5, hy + HH + 6), radius=8 * S, fill=(0, 0, 0, 120))
    comp(sh, blur=3)
    L = layer(); d = ImageDraw.Draw(L)
    x0 = HCX - HW / 2
    knuckles = [(hy + CAP, hy + CAP + 20), (hy + CAP + 21.5, hy + HH - CAP - 21.5), (hy + HH - CAP - 20, hy + HH - CAP)]
    for k0, k1 in knuckles:
        c = cylinder(round(HW * S), round((k1 - k0) * S), lo=(24, 25, 28), hi=(112, 114, 120))
        m = Image.new("L", c.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, c.size[0] - 1, c.size[1] - 1], radius=2 * S, fill=255)
        L.paste(c, s(x0, k0), m)
        d.line(s(x0 + 2, k0 + 0.5, x0 + HW - 2, k0 + 0.5), fill=(255, 255, 255, 90), width=S)  # top edge catches light
        d.line(s(x0 + 2, k1 - 0.5, x0 + HW - 2, k1 - 0.5), fill=(30, 32, 36, 140), width=S)  # bottom edge in shade
    for cy0, cy1 in ((hy, hy + CAP), (hy + HH - CAP, hy + HH)):  # domed pin caps, a little narrower
        c = cylinder(round((HW - 4) * S), round((cy1 - cy0) * S), lo=(18, 19, 22), hi=(98, 100, 106))
        m = Image.new("L", c.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, c.size[0] - 1, c.size[1] - 1], radius=round(CAP * S / 2), fill=255)
        L.paste(c, s(x0 + 2, cy0), m)
    comp(L)
# ---------- keyhole lock (same chrome ring as the headphone jack) ----------
L = layer(); d = ImageDraw.Draw(L)
KX, KY = (IX1 + DX1) / 2, (DY0 + H) / 2  # centred in the visible part of the door
K = 1.62  # keyhole scale (1 = same size as the headphone jack)
paste_disc(L, KX, KY, 22 * K, (198, 200, 204), (112, 114, 118))  # satin metal close to the body, not bright chrome
paste_disc(L, KX, KY, 15 * K, (118, 120, 124), (160, 162, 166), cx=0.3, cy=0.25)  # recessed face, lit from below
d.ellipse(s(KX - 4.5 * K, KY - 8 * K, KX + 4.5 * K, KY + 1 * K), fill=(16, 16, 18, 255))
d.polygon(s(KX - 2.2 * K, KY - 3 * K, KX + 2.2 * K, KY - 3 * K, KX + 3.4 * K, KY + 9 * K, KX - 3.4 * K, KY + 9 * K), fill=(16, 16, 18, 255))
comp(L)

# ---------- pinhole camera above the screen ----------
CAMX, CAMY = 406, 676
L = layer(); d = ImageDraw.Draw(L)
d.rounded_rectangle(s(CAMX - 24, CAMY - 11, CAMX + 24, CAMY + 11), radius=11 * S, fill=(14, 15, 18, 255))
d.rounded_rectangle(s(CAMX - 24, CAMY - 11, CAMX + 24, CAMY + 11), radius=11 * S, outline=(205, 207, 212, 200), width=S)
paste_disc(L, CAMX, CAMY, 6.5, (60, 80, 110), (6, 8, 14), cx=0.5, cy=0.5)  # lens
d.ellipse(s(CAMX - 1.2, CAMY - 1.2, CAMX + 1.2, CAMY + 1.2), fill=(190, 225, 255, 230))  # catchlight
d.ellipse(s(CAMX - 15.5, CAMY - 1.5, CAMX - 12.5, CAMY + 1.5), fill=(40, 44, 52, 255))  # mic hole
comp(L)
# ---------- audio jack + label on the flat front strip under the shelf ----------
L = layer(); d = ImageDraw.Draw(L)
JY = (TOP + DY0) / 2  # between the shelf lip and the vault door
fl = ImageFont.truetype(INTER, 13 * S)
LABEL = "Insert Headphones to use Speech Mode"
tw = d.textlength(LABEL, font=fl) / S
PW, PH = tw + 52, 26
PX1 = DX1; PX0 = PX1 - PW  # plate right-aligned with the door
d.rounded_rectangle(s(PX0, JY - PH / 2, PX1, JY + PH / 2), radius=6 * S, fill=(44, 46, 50, 255))
d.rounded_rectangle(s(PX0 + 1, JY - PH / 2 + 1, PX1 - 1, JY + PH / 2 - 1), radius=6 * S, outline=(120, 124, 130, 255), width=S)
# headphone icon in the plate
HX = PX0 + 22
d.arc(s(HX - 8, JY - 8, HX + 8, JY + 8), 180, 360, fill=(225, 228, 232, 255), width=2 * S)
d.rounded_rectangle(s(HX - 9, JY - 1, HX - 5, JY + 7), radius=2 * S, fill=(225, 228, 232, 255))
d.rounded_rectangle(s(HX + 5, JY - 1, HX + 9, JY + 7), radius=2 * S, fill=(225, 228, 232, 255))
d.text(s(PX0 + 40, JY), LABEL, font=fl, fill=(225, 228, 232, 255), anchor="lm")
# the jack and its engraved headphone icon, in the row with the black reader square
JX, JY2 = ROW_X0 + ICON_W + ICON_GAP + JACK_D / 2, (SQ_Y0 + SQ_Y1) / 2
IX = ROW_X0  # icon's left edge
d.arc(s(IX + 2 * IS, JY2 - 12 * IS, IX + 26 * IS, JY2 + 12 * IS), 180, 360, fill=(90, 92, 98, 255), width=round(2 * S * IS))
d.rounded_rectangle(s(IX, JY2, IX + 6 * IS, JY2 + 12 * IS), radius=2 * S * IS, fill=(90, 92, 98, 255))
d.rounded_rectangle(s(IX + 22 * IS, JY2, IX + 28 * IS, JY2 + 12 * IS), radius=2 * S * IS, fill=(90, 92, 98, 255))
# the jack is a socket sunk into the panel: light comes from the top left, so inside the opening the
# top-left falls into shadow and the lower-right inner wall catches the light (a raised ring is lit the other way)
JR = JACK_D / 2  # sizes below scale with the jack (20 px across)
paste_disc(L, JX, JY2, JR, (208, 210, 214), (78, 80, 84), cx=0.68, cy=0.72)  # chamfered metal rim, sloping inward
paste_disc(L, JX, JY2, JR * 0.69, (104, 106, 110), (34, 36, 39), cx=0.66, cy=0.7)  # the well, darker as it goes in
d.ellipse(s(JX - JR * 0.42, JY2 - JR * 0.42, JX + JR * 0.42, JY2 + JR * 0.42), fill=(8, 8, 10, 255))  # the hole
# speaker grille, left of the keypad: a straight grid, so every column lines up
GR_COLS, GR_ROWS, GR_STEP, GR_R = 6, 3, 12, 2.5
GR_CX, GR_CY = 192, 1395  # same centre as before
for row in range(GR_ROWS):
    for col in range(GR_COLS):
        x = GR_CX + (col - (GR_COLS - 1) / 2) * GR_STEP
        y = GR_CY + (row - (GR_ROWS - 1) / 2) * GR_STEP
        d.ellipse(s(x - GR_R, y - GR_R, x + GR_R, y + GR_R), fill=(70, 72, 76, 255))
        d.arc(s(x - GR_R, y - GR_R, x + GR_R, y + GR_R), 20, 160, fill=(196, 198, 202, 200), width=S)
comp(L)

base.save(OUT, optimize=True)  # keep the original's alpha (soft right edge)
print("saved", OUT)
