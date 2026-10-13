import sys
from PIL import Image, ImageDraw, ImageFont
D = sys.argv[1]; BASE = sys.argv[2]
F = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 22)
def sheet(items, box, scale, out, cols=None):
    tiles = []
    for label, path in items:
        im = Image.open(path).convert("RGB").crop(box)
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        t = Image.new("RGB", (im.width, im.height + 40), (24, 26, 30)); t.paste(im, (0, 40))
        ImageDraw.Draw(t).text((10, 8), label, font=F, fill=(235, 238, 242)); tiles.append(t)
    cols = cols or len(tiles); rows = (len(tiles) + cols - 1) // cols
    tw, th = tiles[0].size
    s = Image.new("RGB", (cols * tw + (cols - 1) * 12, rows * th + (rows - 1) * 12), (12, 13, 15))
    for i, t in enumerate(tiles): s.paste(t, ((i % cols) * (tw + 12), (i // cols) * (th + 12)))
    s.save(out); print(out, s.size)
sheet([("Saved (no added light)", BASE), ("L1 Light bar", f"{D}/opt-L1-light-bar.png"),
       ("L2 Teal side strips", f"{D}/opt-L2-teal-side-strips.png"), ("L3 Keypad light", f"{D}/opt-L3-keypad-light.png")],
      (0, 380, 1080, 1520), 0.42, f"{D}/sheet-lighting.png")
sheet([("Saved", BASE), ("S1 Sculpted", f"{D}/opt-S1-sculpted-slots.png"), ("S2 Chrome + lit", f"{D}/opt-S2-chrome-lit-slots.png")],
      (750, 650, 1030, 1030), 1.4, f"{D}/sheet-slots.png")
for name, box, sc in (("receipt-card", (760, 650, 1020, 900), 1.6), ("cash", (230, 1110, 560, 1215), 1.6), ("speech", (520, 1478, 1000, 1528), 1.6)):
    sheet([("B1 Embossed", f"{D}/opt-B1-braille-embossed.png"), ("B2 Plates", f"{D}/opt-B2-braille-plates.png")],
          box, sc, f"{D}/sheet-braille-{name}.png", cols=2 if name == "receipt-card" else 1)
