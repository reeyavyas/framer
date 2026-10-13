"""Design options and the chosen combination, drawn on top of edit_atm.py's output.
Usage: python3 options.py <base.png from edit_atm.py> <out_dir>
Writes each option (opt-*.png) and the chosen combination (ATM-combo-L1-S2-B2.png = ATM-artwork.png).
See ATM/NOTES.md, "The ATM image", for what each option is and what was chosen."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
SAVED = Image.open(SRC).convert("RGBA")
W, H = SAVED.size
Z = 4  # supersample for anti-aliased shapes
INTER = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
TEAL = (59, 191, 192)  # brand light teal #3bbfc0


# ---------- helpers ----------
def mask(draw_fn, blur=0):
    """Float 0..1 mask (H, W) from shapes drawn at Z x; draw_fn(d, z) draws with z = scale."""
    m = Image.new("L", (W * Z, H * Z), 0)
    draw_fn(ImageDraw.Draw(m), Z)
    m = m.resize((W, H), Image.BOX)
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.array(m) / 255


def add_light(arr, amount, color):
    """Screen-blend light of `color` with per-pixel strength `amount` (0..1)."""
    c = np.array(color, float) / 255
    rgb = arr[..., :3] / 255
    rgb = 1 - (1 - rgb) * (1 - amount[..., None] * c)
    arr[..., :3] = rgb * 255


def darken(arr, amount):
    arr[..., :3] *= (1 - np.clip(amount, 0, 1))[..., None]


def poly(pts):
    return lambda d, z: d.polygon([(x * z, y * z) for x, y in pts], fill=255)


def rrect(x0, y0, x1, y1, r):
    return lambda d, z: d.rounded_rectangle([x0 * z, y0 * z, x1 * z, y1 * z], radius=r * z, fill=255)


def ys_xs():
    return np.mgrid[0:H, 0:W].astype(float)


def save(arr, name):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(f"{OUT}/{name}.png", optimize=True)
    print("saved", name)


def start():
    return np.array(SAVED).astype(float)


Y, X = ys_xs()
HOOD = [(31, 411), (1053, 411), (1020, 626), (64, 626)]  # hood panel under the banner (measured)

# ---------- lighting ----------
# L1: a slim LED bar along the hood rim, just under the banner, washing light down the hood panel
RIM = (385, 410)  # the hood's frame under the banner: from the banner's bottom edge to the hood panel (measured)


def light_bar(a, bar_visible=True):
    if bar_visible:  # 5 px bar centred in the frame: 10 px of frame above it and 10 px below it
        bar = mask(rrect(40, 395, 1040, 400, 2.5))
        rim = (Y >= RIM[0]) & (Y < RIM[1])  # the bar's own glow stays on the frame, so both gaps read clearly
        add_light(a, np.clip(mask(rrect(40, 395, 1040, 400, 2.5), blur=2.5) * 1.2, 0, 1) * rim * 0.55, (255, 252, 244))
        add_light(a, bar * 0.95, (255, 255, 255))
    panel = mask(poly(HOOD), blur=1)
    fall = np.clip(1 - (Y - 411) / 215, 0, 1) ** 1.6
    across = 0.7 + 0.3 * np.cos(np.clip((X - 542) / 560, -1, 1) * np.pi / 2)
    add_light(a, panel * fall * across * 0.75, (255, 252, 244))


a = start(); light_bar(a); save(a, "opt-L1-light-bar")

# L2: light-teal LED strips down the hood's inner side walls, with a glow on the walls
a = start()
strips = lambda d, z: (d.rounded_rectangle([23 * z, 430 * z, 27 * z, 1400 * z], radius=2 * z, fill=255),
                       d.rounded_rectangle([1053 * z, 430 * z, 1057 * z, 1400 * z], radius=2 * z, fill=255))
core = mask(strips)
walls = mask(lambda d, z: (d.rectangle([4 * z, 410 * z, 46 * z, 1410 * z], fill=255),
                           d.rectangle([1034 * z, 410 * z, 1076 * z, 1410 * z], fill=255)), blur=6)
add_light(a, np.clip(mask(strips, blur=14) * 1.4, 0, 1) * 0.75, TEAL)
add_light(a, walls * 0.18, TEAL)
add_light(a, np.clip(mask(strips, blur=3) * 1.5, 0, 1) * 0.6, TEAL)
add_light(a, core, (225, 255, 252))
save(a, "opt-L2-teal-side-strips")

# L3: a keypad task light tucked under the fascia's bottom edge, pooling on the shelf and keys
a = start()
led = mask(rrect(120, 1318, 960, 1321, 1.5))
add_light(a, np.clip(mask(rrect(120, 1318, 960, 1321, 1.5), blur=5) * 1.2, 0, 1) * 0.7, (255, 246, 228))
add_light(a, led * 0.9, (255, 252, 240))
shelf = mask(poly([(45, 1322), (1035, 1322), (1080, 1470), (0, 1470)]), blur=1)
pool = np.exp(-(((X - 520) / 420) ** 2 + ((Y - 1335) / 120) ** 2))
gain = 1 + shelf * pool * 0.32  # a brightness gain, so key labels keep their contrast
a[..., :3] = np.clip(a[..., :3] * gain[..., None] * np.array([1.0, 0.99, 0.96]) ** (shelf * pool)[..., None], 0, 255)
save(a, "opt-L3-keypad-light")

# ---------- receipt + card slot depth ----------
RL_TOP = (780, 990)  # receipt lip, a wedge whose ends slant out: x of its ends along the top edge
RL_BOT = (769, 1001)  # and along the bottom edge
CB_X0, CB_X1, CB_Y0, CB_Y1 = 788, 986, 880, 1012  # card slot surround
CO_Y0, CO_Y1 = 911, 927  # card slot opening (black)


def set_receipt(dy):
    """Where the receipt lip is (measured at y 730-751 in the artwork), moved down by dy."""
    global RL_Y0, RL_Y1, LIP, lx, rx
    RL_Y0, RL_Y1 = 730 + dy, 751 + dy
    LIP = mask(poly([(RL_TOP[0], RL_Y0), (RL_TOP[1], RL_Y0), (RL_BOT[1], RL_Y1), (RL_BOT[0], RL_Y1)]))
    lx = RL_TOP[0] + (RL_BOT[0] - RL_TOP[0]) * (Y - RL_Y0) / (RL_Y1 - RL_Y0)  # slanted end lines
    rx = RL_TOP[1] + (RL_BOT[1] - RL_TOP[1]) * (Y - RL_Y0) / (RL_Y1 - RL_Y0)


def move_rows(a, x0, x1, top, bot, dy):
    """Move whatever sits on the panel between rows top and bot (both plain panel) by dy px (+ is down).
    Only its difference from the panel behind it moves, so the panel's own gradient stays seamless."""
    rows = np.arange(top, bot + 1)[:, None, None]
    panel = a[top, x0:x1, :3] + (a[bot, x0:x1, :3] - a[top, x0:x1, :3]) * (rows - top) / (bot - top)
    dev = a[top:bot + 1, x0:x1, :3] - panel
    moved = np.zeros_like(dev)
    if dy >= 0: moved[dy:] = dev[:len(dev) - dy]
    else: moved[:dy] = dev[-dy:]
    a[top:bot + 1, x0:x1, :3] = panel + moved



def move_label(a, x0, x1, top, bot, dy):
    """Move a label sitting between plain columns x0 and x1 by dy px. The face behind it is rebuilt per row
    from those two columns, which follows the panel's curved shading where a top-to-bottom blend would not."""
    cols = np.linspace(0, 1, x1 - x0 + 1)[None, :, None]
    face = a[top:bot + 1, x0, :3][:, None] * (1 - cols) + a[top:bot + 1, x1, :3][:, None] * cols
    dev = a[top:bot + 1, x0:x1 + 1, :3] - face
    moved = np.zeros_like(dev)
    if dy >= 0: moved[dy:] = dev[:len(dev) - dy]
    else: moved[:dy] = dev[-dy:]
    a[top:bot + 1, x0:x1 + 1, :3] = face + moved


set_receipt(0)


def sculpt(a, chrome=False, card=True, card_chrome=None):
    card_chrome = chrome if card_chrome is None else card_chrome
    endfade = np.clip(np.minimum(X - lx, rx - X) / 12, 0, 1)
    # receipt: shadow cast by the lip onto the panel below it, following the wedge's bottom edge
    sh = mask(poly([(RL_BOT[0] + 3, RL_Y1 - 1), (RL_BOT[1] - 3, RL_Y1 - 1), (RL_BOT[1] + 2, RL_Y1 + 14), (RL_BOT[0] - 2, RL_Y1 + 14)]), blur=3)
    darken(a, sh * (1 - LIP) * np.clip(1 - (Y - RL_Y1) / 16, 0, 1) * 0.4)
    # receipt: the lip's ends turn back into the panel, so they fall into shade
    darken(a, LIP * (1 - endfade) ** 1.5 * 0.3)
    # receipt: soft light across the lip's top face
    add_light(a, LIP * np.clip(1 - np.abs(Y - 735) / 4, 0, 1) * endfade * 0.3, (255, 255, 255))
    if card:
        # card: shadow of the surround on the panel (right and below)
        surround = mask(rrect(CB_X0, CB_Y0, CB_X1, CB_Y1, 6))
        sh = mask(rrect(CB_X0 + 4, CB_Y0 + 5, CB_X1 + 5, CB_Y1 + 8, 6), blur=4)
        darken(a, sh * (1 - surround) * 0.45)
        # card: inner walls of the throat below the slot, shaded toward the middle
        throat = (Y > CO_Y1) & (Y < CB_Y1) & (X > CB_X0 + 2) & (X < CB_X1 - 2)
        side = np.clip(1 - np.minimum(X - CB_X0 - 2, CB_X1 - 2 - X) / 16, 0, 1)
        darken(a, throat * side * 0.32)
        # card: the lip over the slot catches light on its edge; the surround's left edge is lit, right edge in shade
        edge = mask(rrect(CB_X0 + 6, CO_Y0 - 1.6, CB_X1 - 6, CO_Y0 - 0.4, 0.6))
        add_light(a, edge * (0.85 if card_chrome else 0.55), (255, 255, 255))
        add_light(a, mask(rrect(CB_X0, CB_Y0 + 4, CB_X0 + 1.4, CB_Y1 - 6, 0.7)) * 0.5, (255, 255, 255))
        darken(a, mask(rrect(CB_X1 - 1.4, CB_Y0 + 4, CB_X1, CB_Y1 - 6, 0.7)) * 0.35)
    if chrome:  # polished rim around the slot opening and along the receipt lip's front edge
        if card and card_chrome:
            rim = mask(lambda d, z: d.rounded_rectangle([(CB_X0 + 4) * z, (CO_Y0 - 3) * z, (CB_X1 - 4) * z, (CO_Y1 + 3) * z],
                                                        radius=4 * z, outline=255, width=round(1.6 * z)))
            add_light(a, rim * 0.6, (255, 255, 255))
        add_light(a, mask(poly([(RL_BOT[0] + 4, RL_Y1 - 3), (RL_BOT[1] - 4, RL_Y1 - 3), (RL_BOT[1] - 4, RL_Y1 - 1.5), (RL_BOT[0] + 4, RL_Y1 - 1.5)])) * 0.7, (255, 255, 255))


a = start(); sculpt(a); save(a, "opt-S1-sculpted-slots")
a = start(); sculpt(a, chrome=True)
# lit throats: an LED inside the card slot and under the receipt lip
def lit_throats(a, color, core, card=True):
    if card:
        inside = mask(rrect(CB_X0 + 10, CO_Y1 - 3, CB_X1 - 10, CO_Y1 - 1, 1))
        add_light(a, inside * 0.95, core)
        glow = ((Y > CO_Y1) & (Y < CO_Y1 + 26) & (X > CB_X0 + 4) & (X < CB_X1 - 4)) * (1 - (Y - CO_Y1) / 26) ** 2
        add_light(a, np.clip(mask(rrect(CB_X0 + 10, CO_Y1 - 3, CB_X1 - 10, CO_Y1 - 1, 1), blur=4) * 2, 0, 1) * 0.6 + glow * 0.35, color)
    under = ((Y >= RL_Y1) & (Y < RL_Y1 + 14) & (X > RL_BOT[0] + 14) & (X < RL_BOT[1] - 14)) * (1 - (Y - RL_Y1) / 14) ** 2
    add_light(a, under * 0.45, color)


lit_throats(a, TEAL, (200, 255, 252))
save(a, "opt-S2-chrome-lit-slots")

# ---------- braille ----------
# Grade 1 (letter-by-letter) braille, lowercase; dots 1-2-3 down the left, 4-5-6 down the right.
DOTS = dict(a="1", b="12", c="14", d="145", e="15", f="124", g="1245", h="125", i="24", j="245",
            k="13", l="123", m="134", n="1345", o="135", p="1234", q="12345", r="1235", s="234",
            t="2345", u="136", v="1236", w="2456", x="1346", y="13456", z="1356")
CELL = {"1": (0, 0), "2": (0, 1), "3": (0, 2), "4": (1, 0), "5": (1, 1), "6": (1, 2)}


def braille_size(word, pitch, cell):
    return (len(word) - 1) * cell + pitch, 2 * pitch


def draw_braille(a, word, cx, cy, r=1.9, pitch=5.5, cell=14.5, dark_plate=False, flat=False):
    """Raised dots centred on (cx, cy): a lit top-left, a shaded bottom-right and a tiny cast shadow."""
    w, h = braille_size(word, pitch, cell)
    x0, y0 = cx - w / 2, cy - h / 2
    centers = [(x0 + i * cell + CELL[d][0] * pitch, y0 + CELL[d][1] * pitch)
               for i, ch in enumerate(word) for d in DOTS.get(ch, "")]  # a space is an empty cell
    if flat:  # light, flat dots, as on the reference ATM's label plates
        dots = mask(lambda d, z: [d.ellipse([(x - r) * z, (y - r) * z, (x + r) * z, (y + r) * z], fill=255) for x, y in centers])
        a[..., :3] = a[..., :3] * (1 - dots[..., None]) + np.array((214, 217, 221), float) * dots[..., None]
        return w, h
    shadow = mask(lambda d, z: [d.ellipse([(x - r + 0.7) * z, (y - r + 0.9) * z, (x + r + 0.7) * z, (y + r + 0.9) * z], fill=255)
                                for x, y in centers], blur=0.6)
    dots = mask(lambda d, z: [d.ellipse([(x - r) * z, (y - r) * z, (x + r) * z, (y + r) * z], fill=255) for x, y in centers])
    lit = mask(lambda d, z: [d.ellipse([(x - r * 0.75) * z, (y - r * 0.85) * z, (x + r * 0.15) * z, (y + r * 0.05) * z], fill=255)
                             for x, y in centers], blur=0.4)
    darken(a, shadow * (1 - dots) * (0.55 if dark_plate else 0.45))
    base_col = np.array((150, 153, 160) if dark_plate else (176, 178, 184), float)
    a[..., :3] = a[..., :3] * (1 - dots[..., None]) + base_col * dots[..., None]
    add_light(a, lit * dots * (0.75 if dark_plate else 0.65), (255, 255, 255))
    return w, h


def plate(a, cx, cy, w, h, fill=(44, 46, 50), edge=(120, 124, 130), radius=6):
    radius = min(radius, h / 2)
    m = mask(rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, radius))
    a[..., :3] = a[..., :3] * (1 - m[..., None]) + np.array(fill, float) * m[..., None]
    o = mask(lambda d, z: d.rounded_rectangle([(cx - w / 2 + 0.5) * z, (cy - h / 2 + 0.5) * z, (cx + w / 2 - 0.5) * z, (cy + h / 2 - 0.5) * z],
                                              radius=radius * z, outline=255, width=z))
    a[..., :3] = a[..., :3] * (1 - o[..., None]) + np.array(edge, float) * o[..., None]


# where each word goes: centred in the gap under its label (measured), and beside the Speech Mode plate
fl = ImageFont.truetype(INTER, 13 * Z)
SPEECH_W = ImageDraw.Draw(Image.new("L", (1, 1))).textlength("Insert Headphones to use Speech Mode", font=fl) / Z + 52
SPEECH_X0, SPEECH_CY = 988 - SPEECH_W, (1478 + 1528) / 2
SPOTS = [("receipt", 887, 719), ("card", 888, 870), ("cash", 391, 1191.5)]
SPOTS_FINAL = [("receipt", 887, 726), ("card", 888, 882), ("cash", 391, 1186)]  # after the label and slot moves;
# each braille plate sits about 9 px under its label, the same gap for RECEIPT, CARD and CASH

a = start()
for word, cx, cy in SPOTS:
    draw_braille(a, word, cx, cy)
w, _ = braille_size("headphones", 5.5, 14.5)
draw_braille(a, "headphones", SPEECH_X0 - 14 - w / 2, SPEECH_CY)
save(a, "opt-B1-braille-embossed")

a = start()
small = dict(r=1.7, pitch=5.0, cell=13.0, dark_plate=True)
for word, cx, cy in SPOTS:
    w, h = braille_size(word, small["pitch"], small["cell"])
    plate(a, cx, cy, w + 20, 18 if word == "card" else 19)
    draw_braille(a, word, cx, cy, **small)
w, h = braille_size("headphones", small["pitch"], small["cell"])
plate(a, SPEECH_X0 - 12 - (w + 20) / 2, SPEECH_CY, w + 20, 26)
draw_braille(a, "headphones", SPEECH_X0 - 12 - (w + 20) / 2, SPEECH_CY, **small)
save(a, "opt-B2-braille-plates")

# ---------- chosen combination: L1 + S2 (in the slot lights' green) + braille plates like the reference ATM ----------
SLOT_GREEN = (124, 242, 94)  # #7cf25e, the Slot Light colour in ATMAttract.tsx
a = start()
light_bar(a, bar_visible=False)  # the light on the hood stays; the white bar itself is hidden
RECEIPT_DROP = 16  # the receipt outlet sits a little lower, so the label, braille and outlet aren't bunched up
move_rows(a, 760, 1012, 727, 800, RECEIPT_DROP)  # receipt outlet (measured at y 730-751)
set_receipt(RECEIPT_DROP)
CARD_LABEL_RISE = 12  # the CARD label (y 818-860) moves up; the card slot stays where ATMAttract.tsx expects it
move_rows(a, 784, 992, 790, 879, -CARD_LABEL_RISE)
# card picture (the white card guide, x 822-954, y 1043-1188 with its shadow) gets smaller, so the whole card
# group (label, braille, slot) can move down and open the gap under the receipt group
CARD_DROP, PIC_SCALE = 16, 0.78  # 16: the card group sits centred between the receipt group and the headphone row (56 px each side)
pic = Image.fromarray(a[1043:1189, 822:955].astype(np.uint8), "RGBA")
lft, rgt = a[1040:1195, 813, :3].copy(), a[1040:1195, 963, :3].copy()  # paint the panel back where it was
wgt = np.linspace(0, 1, 963 - 813)[None, :, None]
a[1040:1195, 813:963, :3] = lft[:, None] * (1 - wgt) + rgt[:, None] * wgt
move_rows(a, 784, 992, 790, 1110, CARD_DROP)
CB_Y0, CB_Y1, CO_Y0, CO_Y1 = CB_Y0 + CARD_DROP, CB_Y1 + CARD_DROP, CO_Y0 + CARD_DROP, CO_Y1 + CARD_DROP
INSERT_DROP = 8  # the card slot alone moves a little further down, clear of the CARD braille plate
move_rows(a, 784, 992, 892, 1130, INSERT_DROP)  # rows 892 and 1130 are plain panel (label above, nothing below yet)
CB_Y0, CB_Y1, CO_Y0, CO_Y1 = CB_Y0 + INSERT_DROP, CB_Y1 + INSERT_DROP, CO_Y0 + INSERT_DROP, CO_Y1 + INSERT_DROP
pic = pic.resize((round(pic.width * PIC_SCALE), round(pic.height * PIC_SCALE)), Image.LANCZOS)
px0, py0 = round(888 - pic.width / 2), CB_Y1 + 16  # 16 px under the card slot's visible bottom edge (clear of its shadow): part of the card group
a[py0:py0 + pic.height, px0:px0 + pic.width] = np.array(pic).astype(float)
CASH_LABEL_RISE = 10  # the CASH label (y 1125-1179) moves up; the cash slot is set into a full-width ledge, so it stays
move_label(a, 266, 516, 1100, 1182, -CASH_LABEL_RISE)
sculpt(a, chrome=True, card_chrome=False)  # receipt as S2; the card slot as S1 (sculpted, no rim)
lit_throats(a, SLOT_GREEN, (215, 255, 200), card=False)  # green glow under the receipt lip only
flat = dict(r=1.7, pitch=5.0, cell=13.0, flat=True)
for word, cx, cy in SPOTS_FINAL:  # a braille plate tucked under each label
    w, h = braille_size(word, flat["pitch"], flat["cell"])
    plate(a, cx, cy, w + 20, 18 if word == "card" else 19, fill=(106, 106, 106), edge=(121, 121, 121), radius=1)  # a lighter grey than the labels (63), so the braille sits back
    draw_braille(a, word, cx, cy, **flat)
# Speech Mode: text on top, the sentence in braille underneath, on one plate (covers the old plate)
SENT = "insert headphones to use speech mode"
sm = dict(r=1.35, pitch=4.0, cell=11.0, flat=True)
bw, bh = braille_size(SENT, sm["pitch"], sm["cell"])
PW2, PH2 = bw + 28, 40
P0, PT = 988 - PW2, (1478 + 1548) / 2 - PH2 / 2  # centred in the strip between the keypad shelf and the door
plate(a, P0 + PW2 / 2, PT + PH2 / 2, PW2, PH2)
txt = Image.new("L", (W * Z, H * Z), 0); td = ImageDraw.Draw(txt)
TY = PT + 13  # text line
HX = P0 + 22  # headphone icon
td.arc([(HX - 8) * Z, (TY - 8) * Z, (HX + 8) * Z, (TY + 8) * Z], 180, 360, fill=255, width=2 * Z)
td.rounded_rectangle([(HX - 9) * Z, (TY - 1) * Z, (HX - 5) * Z, (TY + 7) * Z], radius=2 * Z, fill=255)
td.rounded_rectangle([(HX + 5) * Z, (TY - 1) * Z, (HX + 9) * Z, (TY + 7) * Z], radius=2 * Z, fill=255)
td.text(((P0 + 40) * Z, TY * Z), "Insert Headphones to use Speech Mode", font=fl, fill=255, anchor="lm")
tm = np.array(txt.resize((W, H), Image.BOX)) / 255
a[..., :3] = a[..., :3] * (1 - tm[..., None]) + np.array((225, 228, 232), float) * tm[..., None]
draw_braille(a, SENT, P0 + 14 + bw / 2, PT + 29, **sm)
save(a, "ATM-combo-L1-S2-B2")
