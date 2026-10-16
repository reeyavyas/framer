#!/bin/sh
# Rebuild the cart: recolour the stock art, write archived/atm-lesson-card/ATMNeedWantCart.tsx, type-check it, bundle the preview page,
# grab 12 frames and the 1:1 render for measuring outlines.
#   build.sh <stock dir> <tool dir>
# <stock dir>: holds src.svg (the Adobe Stock .ai, converted; never committed). Outputs land here too.
# <tool dir>:  npm i framer framer-motion gsap react@19 @types/react@19 typescript esbuild playwright-core
set -e
HERE=$(cd "$(dirname "$0")" && pwd); S=$(cd "$1" && pwd); T=$(cd "$2" && pwd); ATM=$HERE/../../..
python3 "$HERE/../cart.py" "$S"
python3 - "$S" "$HERE" "$ATM" <<'PY'
import sys
S, HERE, ATM = sys.argv[1:]
svg = open(f"{S}/cart-D-anim.svg").read()
inner = svg[svg.index(">") + 1:svg.rindex("</svg>")]
open(f"{ATM}/../archived/atm-lesson-card/ATMNeedWantCart.tsx", "w").write(open(f"{HERE}/ATMNeedWantCart.template.tsx").read().replace("__ART__", inner))
PY
cp "$ATM/../archived/atm-lesson-card/ATMNeedWantCart.tsx" "$T/" && (cd "$T" && npx tsc --noEmit --strict --jsx react-jsx --skipLibCheck --moduleResolution bundler --module esnext --target es2020 ATMNeedWantCart.tsx)
echo "tsc clean"
(cd "$T" && npx esbuild "$HERE/cart-preview.tsx" --bundle --format=iife --alias:react="$HERE/stub/react.cjs" --alias:framer="$HERE/stub/framer.js" \
  --alias:framer-motion="$HERE/stub/framer-motion.js" --alias:gsap="$T/node_modules/gsap/index.js" --jsx=transform --jsx-factory=React.createElement \
  --jsx-fragment=React.Fragment --minify --outfile="$S/cart-preview.js" --log-level=warning)
{ cat "$HERE/cart-head.html"; echo '<script>'; cat "$S/cart-preview.js"; echo '</script>'; } > "$S/need-want-cart.html"
# the capture scripts run from the tool dir so they find playwright-core; they write into the stock dir
cp "$HERE/cartseq.mjs" "$HERE/measure.mjs" "$T/" && (cd "$S" && node "$T/cartseq.mjs" "$S/need-want-cart.html" && node "$T/measure.mjs" "$S/cart-D-anim.svg")
echo "preview: $S/need-want-cart.html  frames: $S/cq*.png  1:1 render: $S/measure.png"
