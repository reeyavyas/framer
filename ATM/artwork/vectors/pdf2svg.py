# The stock art's page as a pdftocairo-style SVG, for each vector's build.py, where poppler isn't installed:
#   pip install pymupdf; python3 pdf2svg.py Vectors.ai 1 src.svg   (page index 1, the second page = the savings jar, 672 paths)
# Coordinates come out within half a unit of pdftocairo's, colours within one step.
import fitz, sys
pg = fitz.open(sys.argv[1])[int(sys.argv[2])]
f = lambda p: f"{p.x:.4f} {p.y:.4f}"
out, nofill = [], 0
for dr in pg.get_drawings():
    if dr.get("fill") is None: nofill += 1; continue
    d, last = [], None
    for it in dr["items"]:
        k = it[0]
        if k == "re":
            r = it[1]; d.append(f"M {r.x0:.4f} {r.y0:.4f} L {r.x1:.4f} {r.y0:.4f} L {r.x1:.4f} {r.y1:.4f} L {r.x0:.4f} {r.y1:.4f} Z"); last = None; continue
        if k == "qu":
            q = it[1]; d.append(f"M {f(q.ul)} L {f(q.ur)} L {f(q.lr)} L {f(q.ll)} Z"); last = None; continue
        p0 = it[1]
        if last is None or abs(p0.x - last.x) > 1e-3 or abs(p0.y - last.y) > 1e-3:
            if d and last is not None: d.append("Z")
            d.append(f"M {f(p0)}")
        if k == "l": d.append(f"L {f(it[2])}"); last = it[2]
        elif k == "c": d.append(f"C {f(it[2])} {f(it[3])} {f(it[4])}"); last = it[4]
        else: raise ValueError(k)
    if last is not None: d.append("Z")
    c = ",".join(f"{round(v * 255) / 2.55:.6f}%" for v in dr["fill"])
    out.append(f'<path fill-rule="nonzero" fill="rgb({c})" fill-opacity="1" d="{" ".join(d)}"/>')
print(len(out), "fills", nofill, "no fill", file=sys.stderr)
open(sys.argv[3], "w").write('<svg xmlns="http://www.w3.org/2000/svg">' + "\n".join(out) + "</svg>")
