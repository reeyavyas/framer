# Recolours the designer's Need vs Want vector: every shape gets a role, each option paints the roles.
import re, sys, json
src = open(sys.argv[1]).read()
ROLE = {}
def put(role, *ix):
    for i in ix: ROLE[i] = role
put("line", 0)
put("boardTop", 4, 5); put("boardEdge", 12, 13, 17)
put("standFront", 3); put("standSide", 10); put("standInner", 8); put("pivot", 79); put("pivotRing", 70)
put("cylBody", 11); put("cylCap", 27); put("cylShade", 28)
put("key", 15, 65, 68); put("keyEdge", 49, 59, 62, 66)  # top key: face, then its edge (one colour)
put("key2", 23, 33); put("key2Edge", 51); put("ring", 50)
put("gbag", 1); put("gbagSide", 7); put("gbagFold", 30, 67); put("gbagIn", 54, 58, 60)
put("bread", 14); put("breadMark", 45, 42)
put("milk", 21, 18, 34); put("milkSide", 26, 44)
put("apple", 20); put("leaf", 55, 39, 53)
put("carrot", 22); put("broc", 16, 78); put("stalk", 32, 64)
put("sbag", 2); put("sbagSide", 9, 29); put("sbagFold", 19); put("sbagIn", 24, 25, 43)
put("handle", 36, 37, 38, 40, 47, 48, 61, 63)
put("ctrl", 6); put("ctrlEdge", 35, 41, 46, 57, 31, 52, 56, 69); put("ctrlRing", 71, 72, 73, 74, 75, 76, 77); put("ctrlBtn", 80, 81, 82, 83, 84, 85, 86, 87, 88)
body = src[src.index("</defs>") + 7:]
shapes = list(re.finditer(r'<(path|polygon)\b[^>]*?class="(st\d+)"', body))
assert len(shapes) == 89 and len(ROLE) == 89, (len(shapes), len(ROLE))
out, last = [], 0
for i, m in enumerate(shapes):
    a, b = m.span(2)
    out += [body[last:a], "r-" + ROLE[i]]; last = b
body = "".join(out) + body[last:]
open(sys.argv[2], "w").write(body.replace("</svg>", "").strip())
json.dump(sorted(set(ROLE.values())), open(sys.argv[3], "w"))
