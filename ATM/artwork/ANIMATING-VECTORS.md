# Animating a vector: the playbook

How the ATM lesson card animations were made, written so the next vector the designer sends starts from what
worked. The round-by-round history is in `ATM/NOTES.md` under "Lesson card animation".

**Where things stand**
- **Live:** five Glossy 3D animations, one Framer code component each: `ATM/ATMCartV2.tsx`, `ATMSavingsJar.tsx`,
  `ATMHourglass.tsx`, `ATMGauge.tsx`, `ATMBrowserSearch.tsx` (art and build scripts in `artwork/vectors/<name>/`).
  All pause while the inactivity overlay is open (section 6).
- **Archived** (`archived/atm-lesson-card/`, see `archived/NOTES.md`): cart version 1, `ATMNeedWantCart.tsx` (the
  outlined glacier-basket cart, art scripts still in `artwork/cart/`, which sections 1-5 below describe and which
  the newer carts build on), and `ATMNeedWantLoop.tsx` (the first nine code-drawn ideas).
- **Next (optional):** the designer may make more on-brand vector animations next week; it isn't a requirement.
  If new vectors come in, start from section 0 (the Glossy 3D look and the round-2 feedback) and the checks in
  section 4, and work directly, without sub-agents.

## 0. The look: Glossy 3D (designer's choice, from the Vectors.ai round)

**Use Glossy 3D for every new vector** unless the designer asks otherwise.
No outline. Thick extruded parts, rich saturated brand gradients (tint →
base → shade → deep), bevelled edges (white at top-left, dark at
bottom-right), strong white sheen and crisp specular spots, parts spaced
apart so each reads on its own, and a navy `#002c44` contact shadow
(about 0.7; dark teal is lighter than the card and reads as a glow). No
filters or blur. The shipped cart (option D, outlined) stays as it is.

Picks from `artwork/vectors/` (each folder's `build.py` rebuilds all its
options):

| Vector | Pick |
|---|---|
| Gauge | `gauge-B-gloss.svg`, segments left to right: orange, egg yolk, mint, light teal, sky |
| Browser with magnifier | `browser-search-AB-gloss.svg`: Glossy A window with Glossy B's magnifier |
| Hourglass and coins | `hourglass-B-gloss.svg`: one clock, centred on the left post in front; coin stacks of 3 and 8 |
| Cart version 2 | `cart-v2-B-gloss.svg` (a separate cart; the first cart and its code are untouched) |
| Savings jar | `savings-jar-B-gloss.svg`: full jar of big, wide coins, with Glossy A's sky arrow |

**Animated components** (first drafts, one per pick): `ATM/ATMCartV2.tsx`,
`ATMSavingsJar.tsx`, `ATMHourglass.tsx`, `ATMGauge.tsx`,
`ATMBrowserSearch.tsx`. Each folder's `build.py` has `export_anim()`, which
writes `<slug>-anim.svg` and the component from its `.template.tsx`.

**Designer feedback on the first drafts (round 2), now applied:**
- Glossiness: cart version 2 and the gauge were right; the others went up a notch. Edges crisp like cart version
  2, not painterly: hard-edged sheens and specular spots, no soft white glow blobs. Gloss gradients stay smooth
  (no sharp diagonal lines inside a face), and a white border is the top layer of its shape.
- Shadows softer on all five (contact shadows about 0.45-0.5, cast shadows faint).
- Moving parts must be whole: cart version 2's basket got its back rim, its right side running back to it, and its
  inside; its yellow box is a true box, inside the basket's right side.
- Savings jar: keep the original jar and lid shapes (a redrawn geometric jar was rejected), clean only the lid's
  jagged sides. (Round 3: clipping the lid to a plain cylinder and painting a band round it read as a stroke
  hiding the jagged sides, and cut off the thread bulge. Fixed by redrawing the lid's side faces and grooves from
  curves fitted to the trace, with no band or rim: see `LID_CLEAN` in `savings-jar/build.py`. Round 4: the jar's
  outline went too: its open ends beside the lid read as a stroke with a gap. The neck glass now reaches the
  outline's ends, and the neck bands are sampled evenly in angle so their steep ends have no facets. Clean the
  shape itself; never cover an uneven edge with a stroke or outline.) Colours from cart version 2: glass = the sky basket, lid = the teal handle and wheels, arrow = the
  mint and teal boxes. No yellow beyond the coins. Arrow as tall as the jar's body. The coin that drops in lands
  inside. Coin stacks start short and coins pile on one by one (shown at full strength as they drop: a half-faded
  coin shows its own shading as a dark ghost).
- Hourglass: the savings jar's coins, taller uneven stacks, the hourglass exactly centred between them, the clock
  20% larger.
- Gauge: white pointer, bright blue pivot, no streak in the pointer, wider gaps, pops on the way back too.
- Browser: the magnifier in light teal and mint.

**Working rule (designer):** sub-agents were used only to make the first
drafts in parallel. From here on, make every revision directly, without
sub-agents.

## 1. The order that worked

1. **Convert.** The designer sends an Adobe Stock `.ai`; it's EPS
   inside. Ghostscript to PDF, then `pdftocairo -svg` gives one path
   per shape (the cart had 105). Never commit the stock source or
   `src.svg`; commit only the script that recolours it.
2. **Name every shape.** Map each shape index to a role (`line`,
   `frame`, `basket`, `boxTop`, `hub`, …) in the recolour script
   (`cart/cart.py`, `put(...)`). An assert checks that every kept shape
   has a role. Drop the clouds, background, extra props and the like.
3. **Show options.** Five recolours (A–E), each on a lesson card mock
   on the Claude Design canvas. The designer picks one and edits it
   there. Edits go into the palette (`OPTIONS`) and flags
   (`_noBush`, `_glow`, `_sparks`, `_circleWheels`, `_noGround`), never
   into the SVG by hand.
4. **Export for animation** (`export_anim`). Give each moving part its
   own `<g data-k="name">`. Complete every shape a neighbour used to
   hide (see 4), give every moving part its own closed outline, and
   keep anything that must stay still (the ground line and its end
   dashes) outside the moving group.
5. **Component.** The SVG body is pasted into a template
   (`cart/preview/ATMNeedWantCart.template.tsx`, `__ART__`) and
   animated with one GSAP timeline (see 5).
6. **Check, preview and push.** `cart/preview/build.sh <stock dir> <tool dir>`
   does it all: recolour, write the component, type-check, bundle the
   preview page, capture 12 frames and a 1:1 render for measuring.
   Then publish the preview to the same artifact so the URL stays the
   same, and push.

## 2. Colours (option D, the one we shipped)

Outline everywhere: **navy `#002c44`**. Never grey, never black.

| Part | Colours |
|---|---|
| Basket | `#eef7ff` → glacier `#d9eeff` → `#a9d3ef`; shade `#a9d3ef`, back `#7fb9e3`; rim highlight `#eef7ff` |
| Frame | `#8fe0e0` → light teal `#3bbfc0`; highlights mint tint `#d6f0e8` |
| Slots in the basket | egg yolk: `#ffe07a` → `#ffcc40`, highlight `#fff0b8`, shade `#f6a11d`, top `#e08a12` |
| Grip | `#ffe07a` → `#ffcc40`, shade `#f6a11d` |
| Egg-yolk box | top `#ffcc40` → `#f6a11d`; side `#f6a11d` → `#e08a12`; front `#ffe07a` → `#ffcc40`; label and stripes **white**, stripe shade `#fff4d6` |
| Flat box | mint: top `#d6f0e8`, body `#bce2d7` → `#8fd3c0`, shade `#5fbfa6` |
| Blue box | sky: highlight `#9fe3f8`, body `#5fd0f2` → `#00acdd`, dark `#0094c6` |
| Wheels | tyre `#5cb8e6` → `#2f8fc4`, tyre highlight `#8fd3f2`, hub ring `#1d6a96`, hub egg yolk `#ffe07a` → `#ffcc40` |
| Glow | light teal `#3bbfc0` at the centre fading to glacier `#d9eeff` |
| Sparkles | egg yolk and white |

How the colours are built: each fill is a short gradient from a tint to
the base (sometimes to a shade). Highlights are the lightest tint, and
shades stay inside the same hue family (yolk shades toward amber, never
toward navy, which turns it olive). Brand colours only, with their
tints and shades. Light parts stand out on the teal glass card, and a
little egg yolk and white go a long way.

## 3. The outline (measured)

Measured on the shipped art at 1:1, with the drawing 2120 units wide
(`cart/preview/outlines.py` on `measure.png`):

| Where | Visible thickness |
|---|---|
| Box outlines (flat, egg-yolk, blue), all edges | **18–20** |
| Lines between box faces and layers | 18–19 |
| Basket rim top (`RIM_TOP`) | 18 |
| Frame lines | 17–18 |
| Wheel tyre outline | 21 |
| Ground line | 19 |

**Target for anything redrawn: 19 ± 2 units, about 0.9% of the drawing's
width.** On the canvas at 400 px tall (viewBox 1480 tall) that's about
5 px.

How each is drawn so it comes out even:

- **Moving parts (the boxes):** fill each face as a polygon in navy and
  stroke it navy at **40**, round join, *under* the part's own fills
  (`HULLS`). Only the outer half shows, so that's 20 visible, with
  rounded corners like the art's. The seams between faces fill solid.
  Stroking the separate pieces instead left notches and gaps.
- **A line that was shaved or cut (the rim top):** mask the original
  out (`RIM_BAND`) and redraw it as one path, stroke **22**, round cap
  (`RIM_TOP`). It had read thick on the left and thin on the right.
- **Ground line:** one path, stroke **19**, round cap, outside the
  moving group. Its two end dashes go with it.
- **Wheels:** replaced with true circles (the traced ones were jagged
  at any size).
- **The navy silhouette** (shape 12) is the art's outline for
  everything that doesn't move. A mask cuts holes in it wherever moving
  parts or see-through gaps sit, so it never shows behind a part that
  moved away.

Reading `outlines.py` output: a long run (334 on the basket) is the
navy bars between the basket slots, and a 72 run is the navy gap
between the flat box and the egg-yolk box. Those aren't outlines.

## 4. Check every animation for these (look closely)

The designer catches all of these. Find them first. For each moving
part, render it at its **most extreme pose** (top of a hop, end of a
roll, biggest pulse), not just at rest, and zoom 2–4× along every edge.

- **Uneven strokes.** An outline that goes thick to thin along its
  length (the rim did), or a part whose outline is thinner or thicker
  than its neighbours. Measure with `outlines.py`: anything outside
  17–21, or more than 2 apart along one line, gets redrawn.
- **Open shapes, lines and edges.** A line that stops short of a
  corner, a corner without its join, or a face with no outline on one
  side. The usual cause: the art only drew what showed, and the
  silhouette behind supplied the rest. Once a part moves, give it its
  own closed outline (hull polygons).
- **Shapes completed wrong.** Stock art leaves out the hidden parts of
  shapes. When a part moves, finish it with the right geometry, not a
  copy of its neighbour's. The flat box needed straight vertical ends.
  The egg-yolk box's side face needed its bottom edge running back and
  its back edge parallel to the front, meeting it.
- **Cut off.** Leave headroom in the viewBox for the highest hop. Keep
  the glow and sparkles inside it with room to spare, scale included,
  or they clip straight. Keep sparkles clear of the handle and frame.
- **Things moving that should be still.** Ground line, end dashes,
  shadows. Group by what moves, not by the art's layer order.
- **Jagged edges.** Traced circles and curves; redraw them as real
  circles or arcs.
- **Hard edges on soft things.** A glow with a straight fade shows a
  rim. Use a bell-shaped fade (see 5).
- **Seams in the loop.** Compare the first and last frame. Every value
  must end where it started.

## 5. The motion (what the designer liked)

One GSAP timeline, `repeat: -1`, **4.8 s** loop, transforms and opacity
only, nothing random (HyperFrames rules). `tl.set({}, {}, LOOP)` pins
the length. Everything below repeats a whole number of times per loop,
so it's seamless.

- **Box hop**, one box after another at 0.35, 1.45 and 2.55 s, about
  the box's foot (`svgOrigin`):
  1. gather: scale 1.06 / 0.92, 0.16 s
  2. leap: up 120 units, scale 0.97 / 1.05, tip 5°, 0.42 s, `power3.out`
  3. fall: 0.34 s, `power2.in`
  4. squash: 1.08 / 0.9, 0.07 s
  5. settle: back to 1, 0.42 s, `back.out(2)`
- **Cart roll:** x −48 → 48 units, `sine.inOut`, yoyo, twice a loop.
  The hub glints turn by exactly the rolled distance over the
  circumference: `48·2·180 / (π·124)` degrees. The cart squashes
  1.012 / 0.982 about its ground point when each box lands. The
  designer asked for more roll than the first 28.
- **Glow:** a pulse, not still: scale 0.84 → 1 and opacity 0.45 → 1
  about its centre, twice a loop, `sine.inOut`. The fill is a radial
  gradient with a bell-shaped fade: opacity 0.6, 0.48, 0.28, 0.15,
  0.07, 0.025, 0.007, 0 at offsets 0, .25, .45, .6, .72, .83, .92, 1.
  Stronger was "too much", and a straight fade showed an edge.
- **Sparkles:** four-point stars. Each twinkles four times a loop
  between full size and 35% (alternate ones out of step) and turns a
  quarter turn a loop (alternate ones the other way). A quarter turn
  of a four-point star looks the same, so it's seamless.
- **Reduced motion:** no timeline at all, so the drawing rests with
  every box in the cart.
- No blur, filters or CSS transitions (they draw a black rectangle over
  the carousel on Windows).

## 6. Into Framer

- **A code component, not an MP4.** It stays sharp at any size, has a
  transparent background over the glass card (MP4 has no alpha), a
  seamless loop, a file of a few KB, reduced-motion support and a
  Loop (s) control. Render an MP4 only for sharing outside Framer.
- **Sizing:** the designer sets the height and leaves the width on
  Fill. Use `@framerSupportedLayoutWidth any`,
  `@framerSupportedLayoutHeight fixed`, start at **614 × 400**, and
  `preserveAspectRatio="xMidYMid meet"` so the art scales to the height
  and stays centred.
- Make ids unique per instance (`useId` prefixes every `id="` and
  `url(#`), so two copies on one page don't share gradients or masks.
- Build the timeline in `useLayoutEffect` inside `gsap.context(…, svg)`
  and call `ctx.revert()` on cleanup. Loop (s) only sets `timeScale`,
  so changing it never restarts the loop.
- Follow the Framer rules in `CLAUDE.md` and type-check before every
  push (`build.sh` does it).
- Pause while a system overlay is open: `ATMInactivityOverlay` sets
  `window.__systemOverlayOpen` and fires `system-overlay-change`; every
  animation listens and calls `tl.pause()` / `tl.resume()` (designer's
  request). New components copy that effect from any template.

## 7. Tool setup (scratch, not committed)

```sh
mkdir tools && cd tools && npm i framer framer-motion gsap react@19 @types/react@19 typescript esbuild playwright-core
# stock dir: the .ai converted to src.svg
# (no Ghostscript or poppler on the Mac: python3 ATM/artwork/vectors/pdf2svg.py Vectors.ai <page> src.svg, with pymupdf)
cp Art.ai src.eps && gs -q -dSAFER -dNOPAUSE -dBATCH -dEPSCrop -sDEVICE=pdfwrite -o src.pdf src.eps && pdftocairo -svg src.pdf src.svg
sh ATM/artwork/cart/preview/build.sh <stock dir> <tools dir>
python3 ATM/artwork/cart/preview/outlines.py <stock dir>/measure.png
```

On Claude's cloud machine, Chromium is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (the default in
the capture scripts). Elsewhere, set `CHROME` to your Chrome's path.
