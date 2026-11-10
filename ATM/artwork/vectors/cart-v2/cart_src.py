# Rebuilds cart v2's stock source (pdftocairo -svg of artboard 1) from cart-v2-A.svg, which keeps every shape the
# build reads (ids cart-v2-A-p<i>) and the outline (shape 0, less its dropped holes 8 and 62); the wheels and the
# stray dot are redrawn or dropped, so placeholders stand in for them.
#   python3 cart_src.py cart-v2-A.svg src.svg
import re, sys
a = open(sys.argv[1]).read()
paths = {int(i): d for i, d in re.findall(r'<path id="cart-v2-A-p(\d+)" d="([^"]+)"', a)}
line = re.search(r'<path d="([^"]+)" fill="#002c44" stroke="#002c44" stroke-width="14.5"', a).group(1)
subs = [p.strip() for p in re.split(r'(?=M )', line) if p.strip()]
assert len(subs) == 61, len(subs)
subs = subs[:8] + ["M 0 0 L 1 0 L 1 1 Z"] + subs[8:] + ["M 0 0"]
paths[0] = " ".join(subs)
out = [f'<path d="{paths.get(i, "M 0 0 L 1 0 L 1 1 Z")}"/>' for i in range(87)]
open(sys.argv[2], "w").write('<svg xmlns="http://www.w3.org/2000/svg">' + "".join(out) + "</svg>")
