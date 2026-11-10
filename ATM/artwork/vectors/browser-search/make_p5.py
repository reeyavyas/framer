# scratch only: an 84-path stand-in for pdftocairo's p5.svg, built from pymupdf's page 4 (different order, ~0.5 unit drift)
import re, sys, math
p4, out = sys.argv[1], sys.argv[2]
els = re.findall(r'<path\b[^>]*?/>', open(p4).read())
d = lambda i: re.search(r'\sd="([^"]+)"', els[i]).group(1)
def shift(path, dx, dy=0): return re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)', lambda m: f"{float(m.group(1)) + dx:.4f} {float(m.group(2)) + dy:.4f}", path)
def ellipse(cx, cy, a, b, ang, n=360):
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    P = [(cx + a * math.cos(t) * c - b * math.sin(t) * s, cy + a * math.cos(t) * s + b * math.sin(t) * c) for t in (2 * math.pi * k / n for k in range(n))]
    return "M " + " L ".join(f"{x:.4f} {y:.4f}" for x, y in P) + " Z"
paths = ["M 0 0 L 1 0 L 1 1 Z"] * 84
for orig, new in {22: 21, 17: 16, 18: 17, 26: 25, 56: 55, 33: 32, 53: 52, 34: 33, 52: 51, 28: 27, 10: 9, 1: 1}.items(): paths[orig] = d(new)
HX, HY = map(float, sys.argv[3:5]) if len(sys.argv) > 4 else (-0.5, 1)  # these reproduce the committed art byte for byte
paths[1] = shift(d(1), HX, HY); paths[22] = shift(d(21), -0.1)
paths[55] = shift(d(54), -0.6, -0.6)                # pdftocairo had pill4's left end at 985
paths[71] = ellipse(2349, 1283, 402, 343, 70)  # the glass opening as pdftocairo's shape fitted
open(out, "w").write('<svg viewBox="0 0 1 1"><defs></defs>' + "".join(f'<path d="{p}"/>' for p in paths) + "</svg>")
