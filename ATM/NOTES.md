# ATM — Notes

The second portion of the kiosk: an ATM where Gen Alpha users learn to
use an ATM, plus general money tips and slide-style lessons. Separate
from the mobile-app kiosk that every other group in this repo serves.

Fonts, components, right/wrong states and motion for the ATM's screens
and lessons are in the root `design.md` (§3).

## Brand colours

The ATM's own colours. They match the overall brand colours in the
root `NOTES.md`, but a colour change for another element or page
doesn't change them; change them only when it's asked for the ATM.

| Name | Hex | Use |
|---|---|---|
| Navy | `#002c44` | Primary, dominant |
| Teal | `#059390` | Primary |
| Light teal | `#3bbfc0` | Glows, shimmer |
| Light blue | `#0079a9` | Glows |
| Midnight | `#11232d` | Dark contrast |
| Egg yolk | `#ffcc40` | Accent only (the tap icon's ripple) |
| Glacier blue | `#d9eeff` | Light objects and surfaces that need contrast on the teal glass and navy |
| Mint | `#bce2d7` | Light objects and surfaces, a softer partner to glacier blue |

## Current

- `ATMWingBackground.tsx` — the ATM screen's animated wing background
  (the attract/home state). Drop it inside the ATM artwork, sized to
  the screen cutout; the artwork is drawn on a 499×465 canvas and
  scaled to cover the layer. Built from the 8 curves of the design's
  wing SVG:
  - Lines 5–6 edge **wing 1**, lines 2–3 edge **wing 2**. Each wing is
    one solid shape. Lines 1, 4, 7 and 8 are still **accent lines**
    and never animate (a travelling highlight on them was tried and
    dropped). Turning **Accent Lines** off also hides the two still
    shapes whose edges they trace; wings, shimmer and glows stay.
  - **Style → Flow**: both wings tilt and lift together, in sync, as
    rigid shapes (they never change shape). An earlier version bent
    the curves themselves; the brief is no morphing.
  - **Style → Aurora**: nothing moves; the light inside each shape
    slowly rolls across it. The glows drift and pulse exactly as in Flow
    (Aurora used to drift them 1.8× wider; matched to Flow by request).
  - Both: three soft glows at the same strength (light teal top right,
    light blue upper left and lower middle) and a light-teal shimmer
    running left to right along the wing lines.
  - Background: a very wide navy-to-teal blend, tilted 14° upward (navy
    lower left, teal upper right). Navy holds to 60% of the blend and the
    blend runs past the right edge, so most of the frame is navy. Gradients are
    expanded into many eased stops so no colour change has a visible
    starting line. Navy (`#002c44`) is the dominant colour.
  - **Seamless loop**: everything is a function of one phase that runs
    0 → 2π per loop at whole-number frequencies, and the shimmer is a
    repeating band shifted by exactly one period, so the last frame
    equals the first. No still shape shares an edge with a wing, so no
    edge shows double while the wings move.
  - Colours only change when a property changes; each animation frame
    only sets transforms and opacities on a few elements. Honours
    reduced motion (shows a still frame). Unique gradient ids per
    instance via `useId`.
  - Colour properties accept anything Framer passes: hex (short or
    long), `rgb()`/`rgba()`, and project colour styles, which arrive as
    `var(--token-…, <colour>)` (`toRgb` reads the colour after the
    comma). Before this was handled, picking a colour style read digits
    from the token's id and gave wrong, neon colours in the gradients
    and glows. Colour alpha is ignored; each shape has its own opacity.
  - Known and accepted: most of wing 2's bottom line (line 2) runs below
    the screen, so its shimmer is only seen near the bottom-right
    corner.
- `ATMTapIcon.tsx` — the "Tap anywhere to begin" icon, its own
  component (icon only, no background or text; the designer's text
  goes on top in Framer). It shows what a touch does, **not a target
  or button**: the user can tap anywhere on the screen to move on. This
  is **option X ("B + P")**: the designer's hand (white line, navy
  fill) presses into a light-teal circle at the index fingertip; the
  circle squeezes, an egg-yolk dot flashes, and two egg-yolk rings
  spread a short way, hold, then fade together (2.8 s loop). The frame
  fits the hand exactly (200×260 by default) and the hand is **centred**
  in it; the circle and rings draw outside it, so overflow must be
  visible. Like the wing background, one `frameAt(t)` drives all the
  motion (`t` runs 0 → 1 per loop and every track ends where it
  starts), and under the OS "reduce motion" setting it shows one still
  frame (`STILL`, with the circle and both rings showing). Earlier
  versions are in git history: the still hand (commit `2636637`) and
  the hand-free circle (commit `25af7ae`).
- The tap icon and the "Tap anywhere to begin" text are placed in the
  ATM screen in Framer. The ATM page is 1080×1920; the designer's flat
  ATM image and a debit card image are the artwork for the next step.
- `ATMAttract.tsx` — the whole ATM page (1080×1920): the ATM artwork,
  the screen, the lights on the machine while it waits, and the
  transition when the page is tapped anywhere. The screen is the
  designer's own frame (wing background, tap icon and "Tap anywhere to
  begin"), connected through the **Screen** property, so it zooms with
  the machine. Lights: slot lights breathing in turn, card slot flash,
  light-blue screen glow on the metal, glare on the glass, and the
  **Hood Light** (each one a switch). The hood light is the slanted
  panel under the banner:
  - It fades in and out, 0% to 100% and back, on a 6 s loop, in step
    with the screen glow. At 0% the panel is exactly the artwork; the
    light only ever brightens, never darkens the art.
  - The glow follows the panel's perspective: its bright core is the
    panel's own trapezoid, pulled in and blurred.
  - The panel's lower edge glows, and a little light falls onto the
    machine below it, along the panel's slanted sides, blurred so it
    has no hard edge, and faded out before the hood's corners so none
    of it lands on the side walls.
  - A soft pool of the same light falls on the keypad and the shelf
    around it, brightest at the back, fading in and out with the hood.
  - **Hood Light Color** sets its colour (white by default). No glare
    runs across it. Under "reduce motion" it shows lit and still.

  **Transition** is **A + B + E** (chosen), about 3.1 s from
  tap to next page:
  - 0 to 1.9 s, the card step: the card (120×190) rises from below the
    slot, upright and tipped back in perspective, slides into the slot,
    the CARD light blinks three times, and the screen shows "Reading
    your card" for 0.5 s.
  - 1.9 to 3.1 s: the egg-yolk ripple spreads from the middle of the
    page (540, 960) while the ATM centres and zooms in.
  - Beeps (800 Hz pure tone, 60 ms, volume 0.5, matched to a reference
    keypad beep): one as the card goes in (0.9 s), one as the ripple
    ends (3.1 s).

  Every other option is kept in the same property to swap to: A, B,
  A + B, E, E + B. The ripple and zoom reveal **Next Page Look** (a
  frame showing the next page's first frame, e.g. a screenshot taken
  before its own animations play; a flat **Next Page Color** when none
  is connected), then Framer switches to **Next Page** without
  reloading. Under "reduce motion" every transition is a short fade.
  The exploration page for these options is the "ATM Attract Lab"
  (https://claude.ai/artifact/3oXYZBoLif9CCkRbDGnKG9); it predates the
  Framer build, so its timings, card size and sounds are older than the
  component's.
- `artwork/` — the ATM image itself (`ATM-artwork.png`, the **ATM
  Image** for `ATMAttract.tsx`) and everything needed to change it: the
  designer's original, the scripts that draw every addition, all the
  options that were shown, and the designer's original artwork. See
  "The ATM image" below; it records every decision on the image.
- `ATMInactivityOverlay.tsx` — the ATM's copy of
  `main/AppInactivityOverlay.tsx`. After 3 minutes untouched it shows
  "Are you still there?" with a 30 s countdown, then returns to `/atm`
  (the "Tap anywhere to begin" screen), so the next person starts
  fresh. **Return Home** goes there at once; **Yes, I'm Here** closes
  it and restarts the clock. White card (the ATM pages are all blues),
  25px corners, P22 Mackinac Bold heading, Area Normal text and pills
  (outlined navy, teal); no Inter. To keep the stray black rectangle
  from coming back over the `CurvedCarouselV2` cards on `/atm-start`
  (see `main/NOTES.md`), it never uses a backdrop blur or a CSS
  transition: the fade-in is stepped from JS on every page. It sends
  the same `system-overlay-change` signal as the app's, so the
  carousel holds its autoplay while it's up. Timings and the path are
  constants at the top of the file.
- `ATMNeedWantLoop.tsx` — the looping illustration for the Lesson 1
  ("Need or Want?") card on `/atm-start`. It fills the bottom of the
  teal glass card; the card's copy and Get Started button stay still
  above it. Nine options in its **Style** property (A Swipe, B Balance,
  C Bags, D Cart, E Coin, F Sorter, G Claw, H Dial, I Bubbles), all
  using the same six glossy items (house, groceries, water drop; phone,
  TV, sneaker). No background of its own, so the glass shows through.
  Drawn on a 640×480 canvas, scaled to fit the frame and clipped to it,
  so nothing ever moves over the card's copy. One loop clock per style
  (5–9 s; **Speed** scales it), and a still frame under reduced motion.
  **Glow** (two soft glows breathing in turn) and **Shine** (a light
  band sliding across the glossy shapes) switch on and off. Colours
  (**Glacier**, **Mint**, **Egg Yolk**, **White**, **Navy**, **Teal**,
  **Light Teal**) accept colour styles. Labels use Area Normal Black.
  Preview of all nine: "Need or Want Card Loops"
  (https://claude.ai/artifact/KN8Fc3XPuo3WFNGtNdKJ2S), which runs the
  real component in stand-in cards.

## Using it in Framer

- Paste `ATMWingBackground.tsx` into a code file in the Framer project
  and drop the component into the ATM's screen cutout. To pick up a
  change from this repo, paste the latest version of the file over the
  old one; placed instances keep their property values.
- Colours can be typed in or picked from the project's colour styles;
  both work (see the colour note above).
- The **Style** property is named `motionStyle` in code, not `style`:
  Framer passes its own `style` prop to every code component, and a
  property with that name would clash with it.
- Under the OS "reduce motion" setting it shows one still frame.
- Framer's editor should show no warnings on these files. Callback
  `ref`s are written with a block body (`(el) => { ref.current = el }`)
  because newer React treats a value returned from a ref function as a
  cleanup function, and Framer flags the short `(el) => (x = el)` form
  with a yellow underline.
- `ATMTapIcon.tsx` works the same way: paste it over the existing
  `ATMTapIcon` code file (same file name, so placed instances keep
  their Ripple Size, Loop, Circle and Ripple values; **Hand** and
  **Hand Fill** come back with their defaults) and place it over the
  background. Set the frame's **overflow to visible** so the circle and
  rings can draw outside the hand. The hand stays centred whatever the
  frame's shape; keep it about 200×260 so the hand fills it. Its
  colours (**Hand**, **Hand Fill**, **Circle**, **Ripple**) also accept
  colour styles.

- `ATMAttract.tsx` (the ATM page):
  1. Paste it into a new code file named `ATMAttract` and place the
     component on the ATM page at 1080×1920 (fill the page).
  2. **ATM Image**: `artwork/ATM-artwork.png` (1080×1920, the
     Vertical Checking banner on top). The screen, slot lights, card
     slot and hood light are placed by pixel position on that image. A
     new artwork that moves anything means those positions (`SCREEN`,
     `SLOT_Y`, `STRIPS`, `HOOD`, `KEYPAD`, the card slot arrows and the
     card's `rest`) need updating; "The ATM image" below lists the ones
     the current image moved. **Card Image**: the debit card PNG. Remove
     the old ATM image layer from the page; the component draws it.
  3. **Screen**: move the existing screen frame (wing background, tap
     icon, "Tap anywhere to begin") off the page onto the canvas, keep
     it 441×365, and connect it here. It is drawn inside the ATM's
     screen and zooms with the machine.
  4. **Next Page**: the path of the page after the ATM, e.g.
     `/atm/start` (as in the browser's address bar). **Next Page
     Look**: connect a 1080×1920 frame that looks exactly like that
     page; the ripple reveals it, so the switch to the real page is
     seamless. Easiest: select the next page's content, make it a
     component, use that component on the next page, and connect an
     instance of it here (one design, used twice). **Next Page Color**
     is only used when no look is connected. With Next Page empty, the
     transition plays and then returns to the ATM, which is handy for
     trying it in Preview.
  5. Don't add a Link or tap interaction to the component; it handles
     the tap and the navigation itself (same reason as in
     `card-controls/card-alerts/CardAlertsSave.tsx`).
  6. **Transition** swaps between A + B + E (default), A + B, A, B, E
     and E + B.

- `ATMNeedWantLoop.tsx`: paste it into a new code file named
  `ATMNeedWantLoop` and place it in the lesson card, filling the area
  under the Get Started button (about 694×500 on the 734×1050 card;
  any size works, the drawing keeps its 4:3 shape and centres). Pick
  the option with **Style**. Like the overlay, it uses no blur and no
  CSS transitions, so it is safe over the carousel.
- `ATMInactivityOverlay.tsx`: paste it into a new code file named
  `ATMInactivityOverlay` and place one instance on `/atm-start` and on
  every ATM lesson page (not on `/atm` itself, which it returns to),
  placed the same way `AppInactivityOverlay` is on the app pages: it
  covers the whole screen when it opens, wherever the layer sits. On
  the canvas it shows the box, so you can see the design. Don't use
  `AppInactivityOverlay` on ATM pages; it returns to the app.


## Checking a change before handing it over

- The loop must stay seamless: any new motion has to be a function of
  the loop phase θ at a whole-number frequency (`cos(k·θ)`,
  `sin(k·θ)`), or repeat exactly once per loop like the shimmer. A
  quick check is to compare `frameAt(θ, settings)` with
  `frameAt(θ + 2π, settings)`: every value must match. For the tap
  icon, `frameAt(0, rippleSize)` must equal `frameAt(1, rippleSize)`.
- Try the colour properties with a colour style as well as a typed hex
  value; the gradients and glows should look the same either way.
- Type-check the file with React 19's types (`@types/react@19`), as
  Framer's editor does: there should be no warnings. This catches
  callback `ref`s that return a value (see "Using it in Framer").
- For `ATMAttract.tsx`, run the real component in a browser with the
  ATM and card images, a stand-in screen frame, a stand-in Next Page
  Look (one that forces itself visible, as Framer frames do) and a fake
  Framer router. Check: the ATM shows at rest, each transition reveals
  the look and then asks the router for Next Page, and the beeps fire
  at their moments (log the oscillator start times and gain).
- Review in the tuning page (the "ATM Wing Motion Lab" preview). It
  runs the actual component, and every control on it is one of the
  component's Framer properties, so it always matches what Framer
  shows. Rebuild it from the component whenever the file changes.

## Where to change things (`ATMWingBackground.tsx`)

Most tuning is a property in Framer's panel; the rest is a constant
near the top of the file.

| Feedback | Where |
|---|---|
| Flow or Aurora | **Style** property |
| Speed of the loop | **Loop (s)** property (default 12 s) |
| How far the wings tilt / how far the light rolls | **Movement** property; tilt is `amp * 3` degrees and lift `amp * 6` in `frameAt` |
| Easing | **Easing** property |
| Glow brightness, all glows | **Glow** property |
| One glow brighter/dimmer, moved, recoloured | `ORBS`: `x`/`y` position, `r` size, `color`, `k` strength (all three are `k: 1`) |
| Glow softness | `FALLOFF` (fade curve) and the `glowSoft` blur (`stdDeviation={55}`) |
| Wing shimmer brightness / count / colour | **Wing Shimmer**, **Shimmers / Loop**, **Shimmer Color** properties (Shimmer Color is separate from Light Teal; default light teal `#3bbfc0`) |
| More or less navy in the background | `BG`: navy holds to the second key (`0.6`); the blend runs to `x = 680` (larger = more navy at the right edge) |
| Angle of the background blend | `BG_ANGLE` (degrees upward toward the right; `0` is horizontal) |
| Colour mix inside a wing or still shape | `grad` keys on `WINGS` / `FILLS` (`[offset, colour]`); `g` is the gradient direction |
| Brand colours | **Navy / Teal / Light Teal / Light Blue / Midnight** properties |
| Hide lines | **Wing Lines**, **Accent Lines** properties (Accent Lines off also hides the two still shapes) |
| A picked colour shows up wrong | `toRgb` (how a Framer colour value is read) |

## Where to change things (`ATMTapIcon.tsx`)

| Feedback | Where |
|---|---|
| How far the rings spread | **Ripple Size** property (scales how far past the circle they go); the sizes at 1 are `end` on each of `RINGS` (620 and 440, circle is 260) |
| Speed of the loop | **Loop (s)** property (default 2.8 s) |
| Colours | **Hand** (line), **Hand Fill**, **Circle**, **Ripple** properties (white, navy, light teal, egg yolk) |
| How far the hand presses in | `PRESS` (scale toward the fingertip at the tap) |
| Circle size / how far it squeezes | `CIRCLE_R`, `CIRCLE_SQUEEZE` |
| When each ring starts, how bright it gets, line thickness | `start`, `peak`, `width` on each of `RINGS` |
| How long the rings hold before fading | `FADE` (share of the loop) |
| Line thickness, dot size | `HAND_STROKE`, `CIRCLE_STROKE`, `DOT_R` |
| Timing of the press, squeeze and dot | the `[time, value]` keys in `frameAt` (times are shares of the loop; the tap lands at `0.3`) |
| Feel of the press / the spread | `SPRING`, `OUT` (cubic-bezier curves) |
| Still frame under reduce motion | `STILL` |

## Where to change things (`ATMAttract.tsx`)

| Feedback | Where |
|---|---|
| Swap the transition | **Transition** property |
| Turn a light off | **Slot Lights**, **Card Slot Flash**, **Screen Glow**, **Glass Glare**, **Hood Light** properties |
| Light colours | **Slot Light** (green), **Glow** (light blue), **Hood Light Color** (white) properties |
| Hood light low / high / speed | the `hood` keyframes in `css()` (6 s loop, opacity 0 to 1) |
| Hood light brightness | `hoodEl` (the panel's gradient) and its `> i::before` (the bright core) in `css()` |
| Light below the hood | `hoodSpillEl` in `css()`: the 3 px edge line, the 110 px fall-off, its blur, and `spillFade` (keeps it off the side walls) |
| Light on the keypad | `hoodKeysEl` in `css()`: its gradient (strength), the polygon around `KEYPAD` (size of the pool) and its blur |
| Glare timing | the `glare` animation in `css()`: every 6 s, the sweep is the first 33% (about 2 s) |
| Glow strength / speed | the `spill` box-shadow and keyframes in `css()` (6 s loop, 8% to 100%) |
| Ripple colours | **Ripple**, **Inner Ring** properties |
| Ripple start point | `rippleZoom` (middle of the page) and `rippleFlood` (the tap point, A only) |
| Ripple / zoom speed | A + B + E: `ABE_RIPPLE_SECONDS` (1.2 s). A + B: `rippleZoom`'s default (1.6 s). Others: the `play(…)` lengths and `seg` times in `zoomIn`, `rippleFlood` |
| Card size, tilt, perspective | `CARD_W`, `CARD_H`, `CARD_TILT`, `PERSPECTIVE`; how big it is when it first shows up: `from.s` in `cardIn` (1.3) |
| Card speed | `CARD_SECONDS` (2.5; scales the rise, slide-in and light blinks together) |
| How long "Reading your card" shows | `READING_SECONDS` (0.5 s); the card step ends after it |
| Sounds on / off | **Sounds** property |
| When it beeps | `beep()` calls: with the card (E, E + B, A + B + E) once as the card goes in (in `cardIn`) and once as the ripple / zoom / fade ends and the next page takes over (in `run`); without it (A, B, A + B) once on the tap |
| Beep loudness | **Beep Volume** property (0 to 1; default 0.5, the reference's loudest beep) |
| What the beep is | `BEEP_HZ` (800), `BEEP_MS` (60); a pure tone made by the browser, no sound files |
| Card timing within the step / how far it slides in | `cardIn` (`seg` times, written for 3.1 s; `push` distance) |
| "Reading your card" | **Reading Text**, **Reading Font**, **Reading Color**, **Reading Fill** properties |
| What is revealed | **Next Page Look** (or the flat **Next Page Color**), then **Next Page** |
| How the page switches | `go()`: Framer's router (no reload); a plain page load if the router can't be found |
| Positions on the artwork | `SCREEN`, `STRIPS`, `SLOT_X`, `SLOT_Y`, `HOOD`, `KEYPAD`, the chevron `<svg>`, the card's `rest` in `cardIn` (all in the 1080×1920 banner artwork's pixels) |

## The ATM image (`artwork/`)

The designer's ATM artwork with additions drawn in code (no image
generator): a vault door, a pinhole camera, a headphone jack, braille,
keypad and button depth, a light on the hood and sculpted slots. Every
step is a script, so any of it can be changed and redrawn exactly.

### Files

| File | What it is |
|---|---|
| `ATM-artwork.png` | The finished image, the one to use as **ATM Image** in Framer |
| `ATM-artwork-base.png` | The image before the chosen options (light, slots, braille, spacing): `edit_atm.py`'s output |
| `edit_atm.py` | Draws the base: door, keyhole, hinges, camera, headphone row, keypad and chevron button depth, speaker grille, Speech Mode label |
| `options.py` | Draws every option (`options/opt-*.png`) and the chosen combination (`ATM-combo-L1-S2-B2.png`, which is `ATM-artwork.png`) |
| `sheets.py` | The side-by-side comparison sheets in `options/` |
| `options/` | Every option shown, full size, and the comparison sheets |
| `source/atm-original.webp` | The designer's ATM artwork, the same image first loaded into Framer as **ATM Image**. `edit_atm.py` starts from it. It is the only original the rebuild needs. |

**Not in the repo**: the designer's two photos of real ATMs
(`reference-atm-braille.jpg`, how braille looks and sits on a real ATM;
`reference-card-reader.png`, a round glowing card reader, tried and
reverted). They were **only for reference** and nothing needs them; git
ignores them in `source/`.

### Rebuilding it

```
cd ATM/artwork
python3 edit_atm.py source/atm-original.webp ATM-artwork-base.png
python3 options.py ATM-artwork-base.png /tmp/atm-options
cp /tmp/atm-options/ATM-combo-L1-S2-B2.png ATM-artwork.png
cp /tmp/atm-options/opt-*.png options/   # only if an option changed
python3 sheets.py options ATM-artwork-base.png   # only if an option changed
```

Needs Python 3 with Pillow and NumPy, and the Inter font (`INTER` near
the top of both scripts points to it). The scripts write the same image
every time: the copies in this folder rebuilt `ATM-artwork.png`
pixel for pixel. Send the designer a close-up of what changed (crop and
enlarge) next to the full image.

Then, if anything the code places by pixel moved, update
`ATMAttract.tsx` (`SLOT_Y`, `rest`, the card slot arrows `<svg>`,
`STRIPS`, `HOOD`, `KEYPAD`, `SCREEN`) and type-check it as `CLAUDE.md`
says.

### Positions in `ATMAttract.tsx` that follow this image

The current image moved the card group, the card slot and the CASH
label, so these were updated to match (measured on the image):

| Constant | Was | Now | Why |
|---|---|---|---|
| `SLOT_Y` | 921 | 945 | the card slot is 24 px lower (16 with its group, then 8 more) |
| `rest` (in `cardIn`) | 952 | 976 | the card rests 24 px lower, on the slot's ramp |
| card slot arrows `<svg>` (`top`, `viewBox`, the rect and both chevrons) | y 905 | y 929 | they flash on the slot, 24 px lower |
| `STRIPS` CARD `y` | 853 | 857 | the CARD label is 4 px lower (up 12, then the group down 16) |
| `STRIPS` CASH `y` | 1168 | 1158 | the CASH label is 10 px higher |

`SCREEN`, `HOOD`, `KEYPAD`, `SLOT_X` and the RECEIPT strip did not move.

### Where to change things (the image)

| Feedback | Where |
|---|---|
| Door position, seam, hinges | `edit_atm.py`: `DX0, DY0, DX1, DY1` (door top at y 1548; runs past the bottom edge; the door has no face of its own, it is the body), the seam gap and bevel lines after it, the hinge loop (`HW`, `HH`, `CAP`, colours `lo`/`hi`) |
| Keyhole size / brightness / position | `edit_atm.py`: `K` (1.62), the two `paste_disc` colours (satin, close to the body), `KX, KY` (centred in the visible door, right of `IX1`) |
| Camera (a pinhole) | `edit_atm.py`: `CAMX, CAMY`, and `CR` for its size (ring 20 px across; the hole and glint scale with it) |
| Bolts beside the cabinet (under the keypad shelf) | `edit_atm.py`: the loop after "bolts at the cabinet corners" (radius 9, 18 px across) |
| Headphone icon, jack, black square row | `edit_atm.py`: `PANEL_C, GAP, ICON_GAP, JACK_D, SQ_W`, `IS` (icon scale); the jack's recessed look: the three lines after "the jack is a socket sunk into the panel" |
| Keypad depth | `edit_atm.py`: `VP`, `ROW_TOP`, `ROW_BOT`, `KEY_X`, `KEY_TB` (right column), the strengths after `KP` |
| Chevron buttons by the screen | `edit_atm.py`: `CH_ROWS`, `CH_COLS`, `raise_faces(..., shade, shadow_k)` |
| Speaker grille | `edit_atm.py`: `GR_COLS, GR_ROWS, GR_STEP, GR_R` |
| Light on the hood | `options.py`: `light_bar` (`bar_visible=False` hides the white bar; the wash strength is the `0.75`) |
| Receipt / card slot styling | `options.py`: `sculpt` (`chrome`, `card_chrome`) and `lit_throats` (`card=False` keeps the green glow off the card slot) |
| Green on the slots | `options.py`: `SLOT_GREEN` (the **Slot Light** colour, `#7cf25e`) |
| Braille words, size, plates | `options.py`: `DOTS` (letters), `SPOTS_FINAL` (where), `flat`/`sm` (dot size and spacing), `plate(...)` colours |
| Speech Mode label | `options.py`: `SENT`, `PW2, PH2, P0, PT` (`PT` centres it between the shelf's bottom edge, y 1474.5, and the door seam, y 1544.5) |
| Brightness, contrast, highlights, shadows, colour | `options.py`: `GRADE` (the last step; no sharpening). The banner gets only the first four; never sharpen, outline or recolour it (`BANNER_BOTTOM`) |
| Spacing of the right panel and cash | `options.py`: `RECEIPT_DROP` (16), `CARD_LABEL_RISE` (12), `CARD_DROP` (16, the whole card group, centred between its neighbours), `INSERT_DROP` (8, the card slot alone), `PIC_SCALE` (0.78) and the picture's `py0` (follows the slot), `CASH_LABEL_RISE` (10) |

### Decisions log (the image)

In the order they were made with the designer:

- **First take**: vault door with seams and a lock, a pinhole camera,
  and extras (contactless symbol, headphone jack, speaker grille, kick
  plate with vents). Nothing may move what `ATMAttract.tsx` places by
  pixel unless the code is updated with it.
- **Lock**: a combination dial with a key lock and a pull handle was
  replaced by a **single keyhole** matching the body (the same chrome
  ring as the headphone jack). Handle removed. Keyhole made 2× bigger
  ("comically small"), then 10% smaller, brighter, and 10% smaller
  again (`K` 1.62). It is **centred in the visible part of the door**;
  a request to centre it again was a mistake and it stays.
- **Vents**: the kick plate slots and the door's vent louvres were both
  removed (modern look). The kick plate itself went when the door was
  extended.
- **Camera**: the red recording light was removed; the lens and its
  highlight are **centred** in the pill (both ways); a tiny mic hole
  sits left of the lens.
- **Contactless symbol** on the black square: removed (disliked). The
  square stays plain black.
- **Door**: extended past the bottom edge, so only its top seam, sides
  and keyhole show (it looked too small). The "AUTHORIZED SERVICE ONLY"
  plate and the outlined panel around it were removed. Moved down 20 px
  (top at y 1548) to give the Speech Mode label room. Edges softened:
  a thin seam only a little darker than the body, a faint highlight and
  a soft shadow ("less drawn on").
- **Hinges**: steel barrel hinges (three knuckles, pin caps, a shadow),
  then darker, then **dark grey** for contrast with the body.
- **Banner corners**: the top-left and top-right corners stay
  **rounded, as in the designer's artwork**. Squaring them was tried and
  reverted. The artwork's soft (semi-transparent) right edge is kept.
- **Headphone jack**: on the slanted keypad shelf it fought the
  perspective; the flat strip under the keypad and the panel left of
  the screen were tried. **Chosen**: on the right panel, in one row with
  a small engraved headphone icon (75% size, 10 px from the jack) and
  the black square (moved right to make room), 24 px between jack and
  square, the whole row centred on the panel (x 887).
- **"Insert Headphones to use Speech Mode" label**: a dark plate in the
  strip between the keypad shelf and the door (kept there when the jack
  moved). It now carries the whole sentence in braille under the text,
  like the reference ATM.
- **Keypad**: made less flat while every label reads the same (the
  label pixels are untouched). The keys are traced in the keypad's own
  perspective (all key sides run to one vanishing point,
  `VP` = (494, 707.7)); edges are anti-aliased. Each key: a top
  highlight, a top-lit face shade, a dark front band at its base, a
  sliver of shaded side on keys left of centre, a soft shadow. A first
  version with jagged, wrongly traced edges was rejected. The right
  column (CANCEL, CLEAR, ENTER, blank) is measured on colour edges (the
  coloured keys are darker than the panel) and keeps the artwork's own
  top highlights and right sides (no added highlight, no lit left side).
- **Chevron buttons** beside the screen: the same raised treatment.
- **Speaker grille**: smaller, a straight 6 × 3 grid so every column
  lines up (it was staggered).
- **Lighting (no hood light in the image)**: three options were shown:
  L1 a light bar under the banner washing the hood, L2 light-teal strips
  on the side walls, L3 a keypad task light. **L1 chosen.** The bar was
  re-centred in the frame under the banner (y 385-410) after it looked
  too close to the lower edge, then **the white bar was hidden** and only
  the light on the hood panel kept. The light that spilled onto the band
  under the hood was removed: its cut-off sides made a hard edge against
  the hood's slanted walls. The thin bright band right under the banner
  (y 385-390) is the designer's original artwork (the top edge of the
  hood's frame), not an addition.
  The code's animated **Hood Light** in `ATMAttract.tsx` was kept and
  plays on top of this lit hood.
- **Receipt and card slots**: S1 (sculpted: shadows, rounded ends,
  shaded inner walls) and S2 (S1 plus a chrome rim and a lit throat)
  were shown. S2 chosen, with the glow in the **slot lights' green**
  (`#7cf25e`) instead of teal. Later the **card slot went back to S1**;
  the receipt outlet keeps S2's rim and green glow under its lip.
- **Round card reader** (a glowing ring like `reference-card-reader.png`,
  glow only around the card slot, not tap to pay): tried and
  **reverted**. If revisited, the slot must stay at `SLOT_X`/`SLOT_Y`
  for the card animation.
- **Braille**: B1 (raised metal dots on the panel) and B2 (small dark
  plates) were shown; **B2 chosen**, styled after the reference photo:
  flat light dots. The plates under RECEIPT, CARD and CASH first used
  the labels' own grey (`(63, 63, 63)`) so they did not stand out, then
  a **lighter grey**, then 10% lighter again (`(106, 106, 106)`, edge
  `(121, 121, 121)`, nearly square corners). The Speech Mode label
  keeps its dark plate. Words: "receipt", "card", "cash",
  and the full Speech Mode sentence. **Uncontracted (letter by letter)
  braille**: the reference ATM likely uses contracted braille, which the
  photo is too blurry to read. Have a braille transcriber check it
  before treating it as accurate; ADA calls for contracted braille at a
  set size, and these dots are a little smaller than real scale.
- **Spacing** (labels, braille and slots were "bunched up"): the receipt
  outlet moved down 16 px; the CARD label up 12 px; then the whole card
  group (label, braille, slot) down 40 px from the original, with the
  white card picture at 78% size, 16 px under the card slot's visible
  edge (part of the card group) and about 40 px above the headphone
  row. The CASH label moved up 10 px. The cash slot itself stays: it is
  set into a ledge that runs the full width of the screen surround, and
  moving it broke the ledge.
- **Braille plate gaps**: every braille plate sits **9 px under its
  label**, matching CASH (RECEIPT and CARD were 1-2 px, so they read
  as stuck to their labels). `SPOTS_FINAL` in `options.py`.
- **Card slot clear of its braille**: the card slot (and the card
  picture under it) moved 8 px further down (`INSERT_DROP`), so the slot
  no longer sits right under the CARD braille plate (about 13 px now).
  The picture keeps its 16 px under the slot and sits about 30 px above
  the headphone row. `ATMAttract.tsx` follows (`SLOT_Y` 969, `rest`
  1000, the card slot arrows at y 953).
- **Card group centred**: the whole card group (label, braille, slot,
  picture) moved up 24 px (`CARD_DROP` 40 → 16) so it sits centred
  between the receipt group (bottom of the receipt lip, y 766) and the
  headphone row (top of the black square, y 1220): 56-57 px each side.
  `ATMAttract.tsx` follows (`SLOT_Y` 945, `rest` 976, the card slot
  arrows at y 929, the CARD strip at y 857).
- **Door colour matches the body**: the door no longer has a painted
  face in its own lighter, slightly blue grey; it shows the machine
  body's own metal and grain. Only its thin seam, a faint highlight,
  the hinges and the keyhole mark it (its drop shadow went with the
  painted face).
- **Seam and keyhole after the door change**: the seam was darkened
  (`(70, 72, 76)`) so the door still stands out. The bright chrome
  keyhole then looked like the odd one out on the matte body, so it is
  now **satin metal close to the body's grey** (ring `(198, 200, 204)`
  to `(112, 114, 118)`, face `(118, 120, 124)` to `(160, 162, 166)`).
  It no longer matches the chrome headphone jack, by choice.
- **Headphone jack recessed**: it looked raised (a domed chrome ring lit
  from the top left). It is now a socket sunk into the panel: a rim that
  slopes inward, a dark well and the hole, lit so the top-left inside
  edge is in shadow and the lower-right inner wall catches the light.
  Then made smaller: 20 px across (was 26), its rim, well and hole
  scaling with `JACK_D`. The row (icon, jack, black square) stays
  centred on the panel; the icon and square each moved 3 px inward.
- **Bolts**: the two screw heads either side of the cabinet, just under
  the keypad shelf, were made a little bigger (18 px across, was 14).
- **Finishing (more vibrant)**: a last step over the whole image: +3%
  brightness, a gentle S-curve for contrast, brighter highlights and
  deeper shadows, and a vibrance boost that lifts muted colours most.
  `GRADE` in `options.py`; set every value to 0 to see the image
  without it. A sharpening step (unsharp mask) was added too, then
  **removed**: the designer doesn't like the sharpening.
- **Camera is a pinhole**: the black pill with a visible lens, catchlight
  and mic hole was replaced by a real pinhole camera: a tiny dark hole
  (about 4 px) in a small recessed ring (9 px), flush with the bezel
  above the screen, lit like a socket so it reads as set in. Then made
  bigger, twice, so it isn't too discreet: the ring **20 px across** (was 9,
  then 14), the hole about 10 px (`CR`).
- **Speech Mode label centred**: it was centred on the wrong edges (18
  px above, 11 below). It now sits centred between the keypad shelf's
  bottom edge (y 1474.5) and the door seam (y 1544.5): 14.5 px each side.
- **Braille plate colours checked**: RECEIPT, CARD and CASH plates are
  the same colour (`(112, 112, 112)` in the finished image). The only
  differences were the sharpening's halos at their edges, gone with it.
- **The banner is not edited (designer's rule)**: the banner (rows
  0-384, the Vertical Checking ad) gets **only brightness, contrast,
  highlights and shadows**. No outlines, sharpening, colour or anything
  else. The sharpening first drew thin dark outlines around its text,
  and the vibrance shifted its colours; both now stop at the banner
  (`BANNER_BOTTOM` in `options.py`). Checked: every banner pixel equals
  the original plus those four tone steps (within 1 level of rounding).

## How it was made

Claude Code skills used along the way (they shaped the previews and the
approach more than the component's code):

- **design-taste-frontend**: invoked by the designer at the start. It
  guided the early calls: asking about colours instead of guessing,
  avoiding generic defaults, honouring reduced motion, and only
  animating position and opacity so it runs smoothly. (`gpt-taste`
  was named in the same request but never loaded.)
- **artifact-design**: came with the Artifact tool when building the
  two preview pages (the tuning page and the side-by-side component
  page): their layout, typography and publishing rules. The tuning page
  first had its own copy of the animation; it was later rebuilt to run
  the real component so the two can't drift apart.
- **high-end-visual-design** and **design-taste-frontend**: invoked by
  the designer on the tap icon options page (the 25-option comparison).
  The first restyled it; the second then trimmed it back (fewer labels,
  shorter copy, no decoration that didn't help the comparison). Neither
  changed the icon's own design.
- **ponytail**: a mode that was on for the session, not called on
  purpose. It pushes toward the simplest code that works, which is why
  the component is one self-contained file with no new libraries.

No skill wrote the component itself. It is SVG shapes and gradients
built from the wing SVG's curves, in a React code component following
this repo's conventions (Framer property controls, `useReducedMotion`
from framer-motion, which Framer already provides). One loop phase
drives all the motion, which is what makes the loop seamless. Checks
used esbuild to compile it and Playwright with Chromium to render it,
screenshot it and compare frames pixel by pixel (seamless loop, the
14° tilt, the colour-style fix).

`ATMAttract.tsx` (the ATM page) was made the same way: the options were
explored on the "ATM Attract Lab" page, then built as one code component
and checked by running it in Chromium with Playwright (frames of every
transition, the page switch, beep timings) and type-checked with React
19's types. The beep was matched to the designer's reference MP3 by
measuring it (ffmpeg to decode, numpy for pitch, length and loudness)
rather than by ear; audio previews were rendered to WAV files for the
designer to listen to. Skills: **design-taste-frontend** was invoked by
the designer when choosing the attract and transition options;
**artifact-design** came with the lab page; **ponytail** was on all
session (it is why the sounds live inside `ATMAttract.tsx` rather than a
second file, and why the unused beep overrides were removed).

## Status

The ATM page is built and working in Framer: wing background, tap
icon, lights, the A + B + E transition and the beeps.

**Banner artwork, hood light and the edited ATM image** (branch
`atm-additions`, PR https://github.com/reeyavyas/framer/pull/15, merged
into `main` with a merge commit so every step stays in its history):
`artwork/ATM-artwork.png` is the ATM image, `ATMAttract.tsx`'s positions
follow it, and "The ATM image" above records every decision on it.
Open points:

- The designer to put `artwork/ATM-artwork.png` in Framer as **ATM
  Image** and paste the updated `ATMAttract.tsx`, then check the card
  goes into the slot (it now starts at 1.3× its size) and the CARD and
  CASH slot lights sit on their labels.
- How the code's hood light looks on top of the image's lit hood.
- Having the braille checked by a braille transcriber.
The lock and the door seams from the first brainstorm are drawn into
the ATM image (`artwork/`), so they need no code. The decisions logs record
what was tried and chosen, so feedback can be applied without undoing
earlier decisions.

**Inactivity overlay** (PR https://github.com/reeyavyas/framer/pull/16,
merged): `ATMInactivityOverlay.tsx`, font sizes as the designer set them
in Framer (heading 65, text and pills 34).

**Next up** (the designer's plan for the next session):

1. ~~The designer shares UI inspiration for the ATM's financial
   lessons.~~ Done; see "Lesson inspiration" below.
2. The lesson card on `/atm-start`'s curved carousel: the designer
   duplicates the flip card component and makes it **not flip**. The
   teal glass card keeps the lesson name, maybe a sub header, and the
   **Get Started** button, with an **animation in place of the image**.
   No image, no Learn More button, no back side with text. Keep the
   carousel's no-blur / no-CSS-transition rule (black rectangle on
   Windows, see `main/NOTES.md`) in anything layered over it.
3. Brainstorm and build the first financial lesson, following
   `design.md` §3 (fonts, right/wrong states, the egg-yolk ripple,
   end-of-lesson confetti, Exit to `/atm-start`).

## Lesson inspiration

What the designer shared for the lessons and the lesson card (videos
were sent in chat and are not stored here). **The brief: fun, never a
classroom.** No flashcards, folders or school-lesson UI; it has to hold
a Gen Alpha user's attention.

| Reference | What the designer likes |
|---|---|
| "Cool Cards Animation" (video) | **Loved most.** A row of pastel cards, each with an illustration that loops seamlessly in place (a figure flying, a boxer punching a bag, a bill unrolling with coins popping out). Eye-catching, never stops, the card copy stays still. Fits the lesson card's "animation in place of the image" |
| Bioluminescence card glow (video; https://freefrontend.com/css-glow-effects/, "CodePenChallenge: Card Glow – Bioluminescence") | Soft glowing shapes (light-teal jellyfish) drift and glow **behind** a dark glass card. The glow never competes with the text |
| "Subtle Bounce Finance Bills" (video) | A calculator, bill, coin, pencil and leaves on a soft blob, each with a slow, soft bounce and twinkling sparkles. The model for anything that needs a soft, slow animation |
| React Bits Bounce Cards (https://reactbits.dev/components/bounce-cards) | Cards fanned out with small tilts that pop in one by one with a springy overshoot; touching one lifts and straightens it and pushes its neighbours aside |
| React Bits Comet Dial (https://reactbits.dev/micro/comet-dial) | A round dial you drag or tap: the value springs to place with a bounce, and the lit arc's head leaves a comet tail when it moves fast |
| "Financial UI" (video) | **Not** its geometric shapes, but how **3D and glossy** they are, how the UI flows, how numbers count up and charts draw in, and how vibrant and smooth it all is |
| "Tradex Card" (video) | A dark card with a glowing green / yellow edge light that travels round it; the amount counts up, the button lights up, and a confetti burst ends it. Vibrant, smooth, cool |

Common threads: seamless loops, soft springs with a little overshoot,
glows behind content rather than on it, numbers that count, glossy 3D
objects, confetti as the payoff.

These are a starting point, not a limit: the designer is open to other
ideas. **Shimmer**: use the wing background's (`ATMWingBackground.tsx`:
a light-teal band sweeping left to right along a line, repeating
seamlessly), not a new kind.

## Lesson 1: Need or Want? (brainstorming)

The designer's brief: drag each item into one of two buckets, **Need**
or **Want**. Items: Rent, Groceries, iPhone 18, Netflix, Sneakers,
Water bill. After each drop: "Correct!" or "Most people would consider
this a WANT." (or NEED). Keep score: "4 out of 5 financial experts
agree!"

Decided so far:

- **Expert poll per item** (option A of three): after each drop, a row
  of five expert faces lights up, counting up with a bounce, to show
  how many agree with the kid's choice ("4 out of 5 financial experts
  agree!", "0 out of 5 …"). Suits the grey areas (sneakers, a phone).
  The end screen shows the score separately ("5 of 6 sorted!"). Not
  chosen: the line as a fixed joke on the end screen only, or as the
  running score.
- Assumed, not yet confirmed: a wrong drop moves the item to the
  bucket most people would pick and play moves on (no retry); Needs
  are Rent, Groceries, Water bill; Wants are iPhone 18, Netflix,
  Sneakers.

### Lesson card animation

The designer asked for the lesson card animation first: it fills the
bottom of the lesson card (the copy of the flip card that no longer
flips, 734×1050 by default), where the image used to be. Colours must
pop on the see-through teal glass card over the navy page: a little
white, a little egg yolk, not overdone. They sent two more references:
a flat illustration of a person pushing a cart of groceries (items
hop up and settle) and three glossy 3D shopping bags bouncing with
ribbons and a star.

**Colour scope** (answered): "It doesn't always have to be teal" means
the whole lesson palette can change, but only within the ATM brand
colours (now including Glacier blue and Mint), and no colours from
outside the brand.

The card loops built so far were deleted at the designer's request.
Start fresh from the references above (above all Cool Cards: one
illustration looping in place, eye-catching, with the card copy still),
and don't ask for references again. Use the **design-taste-frontend**
skill (the designer asked for it), with the ATM rules winning where it
clashes (brand fonts and colours).

**Round 1 (built, waiting on the designer's pick)**: nine options in
`ATMNeedWantLoop.tsx`, shown on the preview page. The designer said the
card animation does not need to match the wing background, so the
shine is its own light band, not the wing's shimmer. Brand colours
only: glacier blue and mint for the big light objects, a little egg
yolk and white for accents, navy for dark objects and the dark
labels. The person pushing the cart from the reference is left out of
D (the cart alone carries it); ask if the designer wants the person.

**Round 2: Bags in 3D** (the designer's pick to edit). Feedback: the
movement was fine; the vector art was not 3D, vibrant or polished
enough. References: the glossy 3D shopping bags (clay look, star,
curly ribbons), plus the cart, Tradex, Financial UI and bouncing-bills
videos for vibrancy. Changes, art only (the hop and pop timing is
unchanged):

- **Bags**: real 3D boxes (front, darker side face, dark open top, tube
  handles front and back with rivets), a lit rim on the edges, a soft
  gloss highlight, shade at the foot, a soft contact shadow, and bigger
  NEED/WANT lettering with an embossed shadow. Colours are the **Need
  Bag** and **Want Bag** properties (egg yolk and sky `#00acdd` by
  default); light and shade are mixed from them, warm colours shading
  toward amber (navy made the yellow look olive) and cool ones toward
  navy. The lettering picks navy or white, whichever reads better.
- **Items**: groceries (milk carton and an orange) and a T-shirt go in
  NEED, a smartphone and sneakers in WANT. No house or water drop, and
  no glacier or mint on the small items: whites, teals, blues, egg yolk,
  plus orange and leaf green on the groceries. The other styles keep
  their round-1 items.
- **Headroom**: the bags are a little shorter and each item rises
  clear of them. Once clear, a copy of the item drawn above everything
  takes over, so it passes in front of the handle instead of behind it.
- Bigger curly ribbons and a puffy 3D star, as in the reference.

Preview with three colourways: "Need or Want 3D Bags"
(https://claude.ai/artifact/FChwCiB7YGmrihTbw7zUpY).

**Round 3: option 1 (egg yolk and sky) refined.** The designer picked
colourway 1. Changes:

- **No squiggles** (the curly ribbons are gone). Sparkles stay, all
  flat; the big star is flat egg yolk too (no 3D back or gloss).
- **Sharp top corners.** A rounded corner running into the side face's
  straight diagonal looked unnatural, so the front's top corners are
  sharp where they meet the opening and the side; only the foot is
  rounded.
- **No sheen or sweep on the bags** (the light band and the gloss
  highlight are gone; Shine does nothing on this style). Instead a
  radial glow behind each bag breathes and swells while that bag hops,
  and a soft white glow follows each item at the top of its hop.
- **Smartphone redrawn**: metal edge seen a little from the side, side
  buttons, thin bezel, a teal-to-blue wallpaper with a widget, app
  icons and a dock. **Sneaker redrawn**: a chunky modern trainer with a
  wavy-lined midsole, stitched navy outsole, sky heel counter and toe,
  egg-yolk stripe and heel tab, laces and eyelets.
- **No grey anywhere.** White objects shade toward sky blue, never
  toward navy or grey; the phone's metal is light blue.
- **White outline** to try: the **Outline** property draws a white
  sticker outline round the bags, handles and items. Off by default;
  the preview shows both.
- **Centred**: the pair runs 66..574 on the 640 canvas.

**Round 4: starting over from the designer's scale vector.** The
designer dialled back and supplied their own vector,
`artwork/need-want/Need_Vs_Want.svg` (a seesaw: a grocery bag with
bread, milk, carrot, broccoli and an apple, plus keys, on one side; a
shopping bag and a game controller on the other). Brief: recolour it
toward the brand, vibrant, no natural vegetable colours, merging and
simplifying a little for the card, and **show still vector options
before animating anything**. The bags component above is on hold.

- `recolor.py` gives each of the vector's 89 shapes a colour role (one
  outline path, then bread, bag front, controller button and so on);
  each object is cut to one or two tones. `build.py` paints five
  palettes onto those roles and writes the preview page (`head.html`
  is its top half). Run `python3 recolor.py Need_Vs_Want.svg
  shapes.svgfrag roles.json`, then `python3 build.py <folder>`.
- Options: **A** egg yolk and sky with a navy line; **B** coral and egg
  yolk, navy line; **C** a white line with deeper fills; **D** only
  brand colours with a midnight line; **E** A's bags with C's white
  line (anything white turns teal, sky or egg yolk so the line shows).
  No grey in any of them. Preview: "Need or Want Scale Colours"
  (https://claude.ai/artifact/HchWTu5B9VGnbah5NauyC9).
- The shapes and lines are still the designer's own; simplifying
  further (dropping small outline details) waits for their pick.

**Round 5: the scale, colours narrowed** (same preview link). The
designer's direction:

- **Food in natural colours**, made vibrant for the teal card: golden
  bread (never white or teal), orange carrot, green broccoli, red apple.
- **The whole shopping bag bright blue** (sky `#00acdd`, darker sky on
  its side, light blue inside, sky handles).
- **Controller from option E** with the darker yellow replaced by
  orange `#f6a11d`: egg-yolk body, orange edges, navy buttons.
- **Keys from option D**, with each key's edge in one colour. The top
  key's edge was four shapes, and its tip was coloured as the key's
  face, so it showed two colours; `recolor.py` now has separate face
  and edge roles for each key. Top key glacier with a light-teal edge,
  back key light teal with a teal edge.
- **Mint scale**, the only part with gradients: a mint board top and
  edge, a light-teal-to-teal stand, a glacier cylinder. Every other
  object is flat colour.
- **Midnight outline** is fine, but no object is midnight all over.
  **No stark white objects**, and no grey. Use mint and glacier, and
  shades and tints of the brand colours.
- Two options, differing only in the grocery bag: **F** glacier, **G**
  light egg yolk with orange sides.

**Round 6: depth, keys and the key-ring cut-out** (same preview link).

- **Not flat**: the designer wants tints, shades and gradients close to
  the brand colours on every object (this replaces round 5's "gradients
  on the scale only"), plus highlights and shadows. Each object now
  runs light to shade across its shape. A soft white gloss band sits on
  both bags and the controller, soft navy contact shadows on the board
  (clipped to the board top), and a light-teal radial glow behind the
  whole drawing.
- **Shopping bag less flat**: a sky gradient front with the gloss, a
  darker side and inside.
- **Keys**: no teal keys against the scale. The top key is glacier, the
  back key egg yolk, and both edges dark teal, so each key's face and
  edge differ.
- **Cut-out in the key ring**: the bit of the back key seen through the
  ring (shape 33, role `keyHole`) is painted with the board's own
  gradient. That gradient is in the drawing's coordinates, so it
  matches the board around it exactly.

**Round 7: option G chosen** (same preview link, now G only; F is
dropped).

- **No contact shadow on the right**: the one under the shopping bag
  and controller is gone. The two under the grocery bag and keys stay.
- **Shopping bag more vibrant**: the front runs glacier (the lit corner)
  into bright blue (sky `#00acdd`) and a deeper bright blue, with the
  same gloss band as the grocery bag. Darker bright-blue side and
  inside, and glacier-to-sky handles. A first try with glacier over
  half the front looked washed out.
- **Sparkles** like the earlier bags' (flat four-point stars, egg yolk
  and glacier, no white), only round the shopping bag and controller.

**Round 8: G kept; open-palette options H to L** (same preview link).
The designer kept G as the brand version and asked how the vector would
look with no brand limit: at least four options, natural colours for
the food, and colours that stand out on the teal card. All five keep
natural food (golden bread, red apple, orange carrot, green broccoli, a
white-and-blue milk carton) and gold or silver keys, and lean warm,
which stands out most against teal. Each has its own outline, glow and
sparkle colours.

- **H Candy shop**: bubblegum-pink scale, violet stand, kraft grocery
  bag, purple shopping bag, coral-red controller, plum outline.
- **I Sunset**: peach scale, raspberry stand, sunny yellow grocery bag,
  hot-magenta shopping bag, violet controller.
- **J Arcade**: lemon scale, red-orange stand, kraft grocery bag,
  electric-purple shopping bag, hot-pink controller with cyan buttons.
- **K Citrus and berry**: lavender scale, indigo stand, kraft grocery
  bag, tangerine shopping bag, berry-red controller.
- **L Toy box**: primary colours, a cream scale, red stand, kraft
  grocery bag, royal-blue shopping bag, sunflower controller.

**Round 9: H to L tightened.** Rules from the designer, applied to H
to L (G unchanged):

- **Red only on the apple.** The red stands, H's coral-red and K's
  berry-red controllers, L's red buttons and H's rose-gold key are
  gone. `build.py` asserts that no red is used anywhere but the apple.
- **Each scale in one colour family**: the board, stand, cylinder and
  pivot are tints and shades of one colour (the egg-yolk pivot is
  gone). Pink (H), peach (I), lemon (J), lavender (K), butter yellow
  (L).
- **The whole drawing stands out on the teal card**: warm, light
  scales, a dark outline and a glow behind each drawing.
- Controllers now: H sunny yellow with purple buttons, I violet, J hot
  pink, K berry magenta, L purple with yellow buttons.

**Round 10: a shopping cart from Adobe Stock** (`AdobeStock_1317578309.ai`,
from the designer). Brief: make it vector, recolour it with brand
colours, tints, shades and gradients, and remove the background, the
clouds and the green receipt card at the bottom right. Present a
handful of options in Claude Design.

- The .ai is an EPS-style Illustrator file with no PDF inside. It is
  already vector: Ghostscript turns it into a PDF (`gs -dEPSCrop
  -sDEVICE=pdfwrite`), then `pdftocairo -svg` gives `src.svg` (105
  shapes). Neither file is committed (the stock licence is the
  designer's); `artwork/cart/cart.py` rebuilds the options from
  `src.svg`.
- The outline is one navy silhouette of the whole drawing with the
  colours laid on top, and the see-through gaps (behind the boxes,
  under the basket, between the wheels) were painted in the background
  colour. `cart.py` drops the background, clouds and receipt card and
  masks the gaps and the receipt card out of the silhouette, keeping
  the right wheel in front.
- Five colourways, each a role-per-shape recolour with gradients:
  **A** egg-yolk basket, sky grip, mint boxes; **B** sky basket,
  egg-yolk grip and box; **C** mint basket; **D** glacier basket on a
  teal frame; **E** deep light-blue basket. Every option has navy
  wheels with egg-yolk hubs and a light mint bush (darker greens
  disappeared on the teal card).
- Claude Design canvas "Need or Want Cart Options"
  (https://claude.ai/artifact/3cwuWFG2nAkUzwUbiaDnCx): one artboard
  per option, the cart on a teal glass card, with the Liberty FCU
  Kiosks design system installed.

**Round 11: D (glacier basket) chosen and refined** (same canvas, D
artboard updated):

- The egg-yolk box's stripes and label are white (they were glacier).
- The bush at the bottom left is removed, and so is its outline in the
  silhouette (masked out, with the left wheel kept).
- The frame is light teal instead of teal.
- The wheels are a lighter blue, with the egg-yolk hubs unchanged.
  Mint wheels were tried at the designer's suggestion and then
  reverted.
- A light-teal radial glow sits behind the cart, with five flat
  sparkles in egg yolk and white.
- **Smooth wheel rims**: the masks that remove the bush and the receipt
  card nicked the wheels' outlines (the designer saw jagged edges). A
  smooth navy ellipse rim is now drawn over each wheel's outline band
  (`WHEEL_CENTRES` in `cart.py`). Still jagged: the source's wheels and
  hubs are lumpy ovals, so no rim or mask lined up.
- **Circle wheels (current)**: the designer suggested plain circles. D
  now drops the original wheel shapes (`WHEEL_SHAPES`), cuts their
  outline out of the silhouette, and draws each wheel as circles: navy
  outline, light-blue tyre with a darker crescent, a blue hub ring and
  the egg-yolk hub with a small highlight. The short stretch of ground
  line under each wheel is redrawn where the cut-out bit into it.
- **No ground shadow** in D (the dark teal band under the ground line).
- **Sparkles fully inside the drawing**: two sat partly above the top of
  the viewBox (y 200) and were cut off, and one was too close to the
  handle. Four now: egg yolk at the left and top right, white above the
  boxes and at the right.

**Round 12: option D animated** (`ATMNeedWantCart.tsx`; preview
"Need or Want Cart Loop", https://claude.ai/artifact/VCJmQeAiLwedG8XvJX7SFo).
The designer chose D and asked for it to be animated on the card using
GSAP, HyperFrames and Impeccable (the repo enables all three as plugins
in `.claude/settings.json`; their skills were read from GitHub because
the session had not loaded them).

- **Motion**: the three boxes hop out of the cart in turn (flat box,
  egg-yolk box, blue box). Each one gathers, leaps on a fast ease-out,
  falls under gravity, squashes on landing and settles with a small
  overshoot, tipping a few degrees in the air. The light-teal glow does
  one slow breath per loop and the sparkles twinkle out of phase. The
  cart, wheels and copy stay still.
- **GSAP**: one `gsap.timeline({ repeat: -1 })` with a label per hop,
  position parameters and `defaults`, transforms only (`svgOrigin` at
  each box's foot), built inside `gsap.context()` and reverted on
  unmount (the GSAP React skill's pattern without `@gsap/react`).
  **Loop (s)** sets `timeScale`, so changing it never restarts the loop.
- **HyperFrames' rules**: a single seekable timeline, nothing random,
  finite repeats inside it, transform and opacity only.
- **Impeccable's animate playbook**: one authored moment (the hop), no
  scattered effects; reduced motion shows the drawing at rest.
- **The boxes move with their own outlines**: the art's single navy
  silhouette is cut away over the box area, and each box draws its own
  outline (its shapes stroked in navy under its fills).
  `cart.py`'s `export_anim()` writes `cart-D-anim.svg` with the boxes,
  glow and sparkles as named layers; the component embeds it, with ids
  made unique per instance.
- Waiting on the designer's edits to the box shapes.

## Decisions log (so feedback doesn't undo them by accident)

In the order they were made with the designer:

- **Brief**: replace the old diagonal blue lines with an animated wing;
  filled, layered shapes with no harsh lines; seamless loop with no
  stops; vibrant light and pulsing glows. Brand colours: navy `#002c44`
  and teal `#059390` (primary), light teal `#3bbfc0` and light blue
  `#0079a9` (glows), midnight `#11232d` (dark contrast).
- **No "Tap anywhere to begin" in this component.** That is a separate
  layer to build later (finger icon looping into a tap-ripple).
- **Four styles were explored**: Breathe (layers sway), Flow, Light
  trails (comets along the lines), Aurora. **Flow** was chosen;
  **Aurora** kept as the second option.
- **No morphing.** The first Flow bent the curves; the shapes must keep
  their exact form. A very subtle "tilt only" version was rejected as
  too subtle, so Flow keeps a clear wingbeat, done as rigid motion.
- **The two wings move in sync** (same transform at the same moment).
- **Accent lines (1, 4, 7, 8) never move** and have **no animation at
  all**: a shimmer and then a travelling highlight along them were both
  tried and rejected.
- **Double-wing fix**: still shapes that shared an edge with a moving
  wing made each wing edge show twice; they were removed.
- **Wing shimmer**: left to right along the wing lines, light teal.
  Mint `#bce2d7` was tried and rejected. It must be continuous (a
  single sweep left a visible gap/restart each loop).
- **Glows**: very diffused, spread over the frame (not only the
  bottom); lower middle is light blue. The top-right glow was light teal at
  half strength, then changed to light blue at full strength like the
  other two (it was barely visible on the teal corner), and then to
  **light teal at full strength** (current). All three glows now have
  the same strength: light teal top right, light blue upper left and
  lower middle. It is no longer toned down.
- **Glows stay behind the wings, but in front of the still shapes.**
  Layer order, back to front: background, still shapes, accent lines,
  glows, wings (with their lines and shimmer). The wings are about 50%
  opacity, so the glows show through them softened; this layered look
  was chosen over putting the glows in front of the wings. The glows
  were first behind the still shapes too, which cut the upper-left glow
  off sharply along accent line 8 (the top-right shape's edge); they
  were moved above the still shapes and accent lines to fix that.
- **Shimmer colour is its own property** (**Shimmer Color**), separate
  from Light Teal, so the shimmer can change without changing the lines
  and the top-right glow. Default is light teal.
- **Colour balance**: navy is the dominant colour, more than teal.
  Teal only toward the right. The background blend runs left to right,
  tilted about 14° upward (navy lower left, teal upper right); the
  shapes' own gradients follow each shape (making every gradient
  horizontal was tried and rejected). No light-blue stripe between navy
  and teal (it read as a harsh band). Every gradient is eased so there
  is no visible line where a colour starts.
- **How far navy holds in the background** was pushed out step by step:
  the blend first started around 40%, then navy held to 45%, 50%, and
  finally **60%** of the gradient (current). The background is also
  stretched past the right edge (`x = 680`) so the right edge stays
  mostly navy, and tilted **14°** upward (`BG_ANGLE`).
- **Accepted as is**: wing 2's bottom line is mostly below the screen,
  so its shimmer only shows in the bottom-right corner.
- **Tap icon**: three motions were shown (Press, Finger to ripple, Soft
  pulse); **Soft pulse** was chosen. The designer supplied the hand SVG.
  Ripple colour is **egg yolk** `#ffcc40`, added to the brand colours
  as an accent only. No background or "Tap anywhere to begin" text in
  the component. The ripple was made much bigger (three sizes shown,
  **A** chosen), then given **two rings**. Centring the ripple on the
  hand was tried; it comes from the **index fingertip** instead. The
  hand was first centred in a square frame; that left empty space
  below it, so the frame is now **cropped tight** to the hand and the
  largest ring (no padding), and anchored to the frame's bottom edge.
  Finally the frame was fitted to the **hand alone**, with the ripple
  drawn outside it (overflow visible in Framer).
- **Tap icon hand fill**: outline, white fill, navy fill and teal fill
  were shown; **navy fill** with the white line was chosen (white fill
  lost the finger lines; the outline let the ripple show through the
  hand).
- **Tap icon without a hand**: five hand-free ideas were shown (touch
  point, water drop, sonar, spark, target press). **Target press** was
  chosen and **replaced the hand version in `ATMTapIcon.tsx`** (same
  file name). It is not a target or button: the whole screen is
  tappable, so code and properties call it a circle, not a target.
- **Tap icon, hand plus ripple (current)**: the designer wasn't sure
  about the hand-free circle versus the hand, so more hand-plus-ripple
  options were shown on one comparison page: 7, then 23 in all,
  grouped by hand motion, ripple style and accent (letters A–W). The
  designer liked **B** (hand pressing into the light-teal circle) and
  **P** (rings that spread a short way, hold and fade together), and
  chose their mix, **X**: B's circle and dot with P's settling rings.
  The hand is now **centred** in its frame (no longer anchored to the
  bottom edge). The previews showed the icon with no text, background
  or padding, as it sits in Framer.
- **Colour-style bug (fixed)**: changing a colour property to one of the
  project's colour styles produced unrelated neon colours, because the
  colour reader took digits from the style's token id. It now reads the
  style's real colour, and short hex too.
- **Aurora's glows move like Flow's.** Aurora used to drift the glows
  1.8× wider than Flow; the designer asked for the same glow movement,
  so both styles now drift, resize and pulse the glows identically. The
  only difference between the styles is the wings (Flow tilts them;
  Aurora holds them still and rolls the light through the shapes).
- **Ref warnings (fixed)**: Framer showed yellow underlines on three
  `ref`s (glows, wings, gradients). They were warnings, not errors; the
  short `(el) => (x = el)` form returns a value, which newer React
  treats as a cleanup function. They now use block bodies that return
  nothing; behaviour is unchanged.
- **Attract state and tap transition (exploring)**: after a
  brainstorm, the designer ruled out a breathing "Tap anywhere" text, a
  rotating line under it, the wings flying off as the transition, and a
  monitor-style power-up. Still open: hardware lights (slot lights
  breathing in turn, card slot flashing, screen light on the metal,
  keypad glint, glare on the screen glass) and the transitions A
  (egg-yolk ripple floods from the tap point), B (zoom into the
  screen), A + B together, and E (card slides into the card slot)
  pending how the card looks. A tap anywhere on the page counts. The
  page after the tap is a new full-screen page with no ATM on it.
- **Attract and transition, first review**: keypad glint removed. The
  screen light on the metal was made much stronger (it now fades from
  nearly off to full every 6 s). The zoom (B) first slides the ATM so
  the screen is centred on the page, then zooms straight in, instead of
  moving and zooming at once. The page after the tap is the designer's
  own design; the preview shows only a plain stand-in.
- **Card goes in upright** (E): the card first went into the slot
  sideways (long edge first); real cards go in short edge first, so it
  now goes in upright, with the logo end leading.
- **Second review**: the card tips back in real perspective as it goes
  in (its far edge narrows to about 60% of the near edge, like the
  white card drawn on the machine) instead of a flat squash. The screen
  light on the metal is now light blue and stronger. In A + B the
  ripple is no longer cut to the screen: it is A's full-page ripple,
  slowed so the ATM is seen centring and zooming in behind it, and it
  stays on the spot of the ATM it started from. New combination
  **A + B + E**: the card goes in, then the ripple spreads while the
  ATM zooms in. It first started at the card slot; it now starts at the
  centre of the 1080×1920 page (540, 960) and stays there while the ATM
  moves behind it.
  A + B now starts its ripple at the same page centre too, wherever the
  tap lands (it first followed the tapped spot on the ATM).
- **Card held upright from the start**: the card used to come in at an
  angle (turned 10°, from lower left) and straighten on the way. It now
  rises straight up from directly below the slot, upright the whole
  way, the same way it goes in. It is also tipped back in perspective
  from the moment it appears (it used to tip back only at the slot).
- **Shortlist**: the designer is leaning toward **A + B + E** or
  **A + B** for the tap transition.

- **A + B + E chosen, built in Framer** as `ATMAttract.tsx`. The
  other transitions stay in the component's **Transition** property
  (the designer may swap to A + B or another). The keypad glint is not
  in it (removed in review).
- **First Framer review**: the card was too big; it is now 120×190
  (was 150×238) and starts smaller as it rises (1.6× instead of 2.4×).
  The ripple showed white before the next page appeared: it revealed a
  flat colour (white by default), and the page change reloaded the
  site, which flashes blank. The ripple now reveals **Next Page Look**
  (a frame that looks like the next page), and the page change goes
  through Framer's router, so there is no reload.
- **Next Page Look covered the ATM on the canvas**: the look was
  hidden with CSS, which a connected frame can override. It is now only
  rendered while a transition runs. A screenshot of the next page in a
  1080×1920 frame (image set to Fill) works as the look. If the next
  page animates in, the screenshot must show its first frame (before
  the animations), or the switch shows a jump.
- **A + B + E's ripple is faster**: 1.2 s instead of 1.6 s (zoom and
  rings scale with it). A + B keeps 1.6 s.
- **Card step shortened to 2.5 s** (was 3.1 s: 2.2 s of motion plus a
  0.9 s hold on "Reading your card"); every part of it scales evenly.
  It is shared, so E and E + B are shorter too. A + B + E now hands
  over to the next page about 3.7 s after the tap.
- **"Reading your card" shortened to 0.5 s** (it showed for about
  1.1 s). The card's movement is unchanged; the card step now ends
  about 1.9 s after the tap, and A + B + E hands over to the next page
  about 3.1 s after the tap.
- **Sounds, in step with the transition** (A + B + E): a soft key beep
  on the tap, a low soft tone as the card starts into the slot (0.9 s),
  a tiny tick with each of the CARD light's three flashes (1.3, 1.5,
  1.7 s), and two rising beeps when the card has been read and the
  ripple starts (1.9 s). Quiet on purpose. Switch off with **Sounds**.
- **Beep overrides removed**: `ATMBeep.tsx` briefly had key / enter /
  cancel beep overrides for button layers. The ATM page has no button
  layers and there will be no ATM on another page, so they were
  deleted along with the unused cancel sound. The sounds then moved
  into `ATMAttract.tsx` itself, so there is one file to paste.
- **Traditional beeps**: the sounds were smooth sine tones at different
  pitches (rising for "accepted", low for the card). They are now
  traditional ATM beeps: one flat pitch (1200 Hz), a square wave (the
  buzzy tone of a keypad buzzer), switched on and off almost instantly.
  Tap = beep, card in = beep, card light = three short blips, card read
  = beep-beep. Volume lowered to 0.03, since a square wave sounds
  louder.
- **Accent Lines off hides the still shapes too**: the two still
  shapes (top right, bottom left) have edges that follow accent lines 8
  and 1. With only the lines hidden, the bare shape edge still showed
  as a line of its own. Now Accent Lines off hides the shapes as well;
  the wings, their shimmer, the glows and the background blend stay.
- **Two beeps, matched to a reference**: the designer sent a Pixabay
  ATM keypad beep (alex_jauk, "atm keypad beep"). Measured: a clean,
  pure tone at 800 Hz, about 60 ms, flat, switched on and off sharply
  (not buzzy). The beep now matches it (800 Hz sine, 60 ms). The three
  card-light blips, the tap beep and the closing beep-beep were
  dropped: with the card, it beeps once as the card goes in and once as
  "Reading your card" appears. A, B and A + B (no card) beep once on
  the tap. The reference file itself is not used or stored.
- **Louder beep**: volume raised from 0.05 to 0.2 (four times louder;
  the reference plays at about 0.7). It is now the **Beep Volume**
  property, so it can be tuned in Framer. Then raised to **0.5**: kiosk
  users hear it through the speakers, not headphones, so it must not be
  quieter than the reference. Measured by average loudness, the
  reference's four beeps match volumes 0.37 to 0.49; 0.5 matches the
  loudest. (Its 0.7 peak is a single spike, and 0.7 would be louder
  than any beep in it.)
- **Beeps spread apart**: the second beep played as "Reading your
  card" appeared, only 0.46 s after the first, so the two blurred into
  one double beep. It now plays as the ripple starts, after the reading
  message, about 1 s after the card-in beep. Then moved again, at the
  designer's choice, to when the ripple ends (A + B + E: about 3.1 s,
  as the next page takes over; E and E + B: as the fade / zoom ends).
- **Right-click is not a tap**: a right-click (or middle-click) in
  Framer or Preview started the transition, because the tap is read on
  `pointerdown`, which fires for every mouse button. Only the main
  button counts now; touch and pen presses are unaffected.
- **Glass glare every 6 s** (was every 9 s). The sweep itself still
  takes about 2 s; only the pause between sweeps is shorter.
- **Type warnings on `addPropertyControls` (fixed)**: Framer's types
  reject `fontFamily`/`fontWeight` in a sans-serif Font control's
  default (it takes `fontSize` and a `variant` such as `"Semibold"`;
  the family comes from `defaultFontType`, Inter), want a `hidden`
  callback to take `Partial<Props>`, and read a bare `"ABE"` in
  `defaultProps` as a string, not a `Transition`. Behaviour unchanged.
- **Banner artwork**: the designer redrew the ATM image in Photoshop
  with the Vertical Checking banner on top, a camera above the screen
  and an access door with a lock at the bottom. Everything under the
  banner sits exactly 400px lower than before; every position in the
  code moved by 400px to match (measured from the PNG).
- **Hood light**: the designer marked the slanted panel under the
  banner as the light to animate. Built in code (not painted into the
  PNG) so it can fade.
- **No glare on the hood light**: a sweep across it was tried and
  dropped. The designer wants the light only fading in and out.
- **Hood light range**: tried 45%, 20% ("don't let it go completely
  off"), 55%, 90% (a misreading of "10%": too little change to see)
  and 10% as the low point; settled on **0% to 100%**.
- **Never darker than the art**: a dark shade at the low point was
  tried, to make the dimming stronger, and dropped. The light may only
  add brightness to the artwork.
- **Perspective**: the glow first was a round glow centred at the
  bottom and the light below the hood a straight-sided rectangle; both
  now follow the panel's slanted sides.
- **No harsh lines from the light**: the light below the hood was first
  cut off along a hard slanted line (fixed with a blur), then its blur
  reached the side walls past the hood's corners, leaving a hard edge
  there (fixed by fading it out before the corners). When the designer
  reports a line after a fix, check they have pasted the latest file.
- **Light on the keypad**: first too strong (washed out the keys), then
  too faint to see; now a wider pool on the keypad and shelf.
- **Card starts smaller**: the card looked too big when it first
  showed up, so it now enters at 1.3× its size at the slot (was 1.6×,
  and 2.4× before that) and still shrinks to 1× as it reaches the slot.

## Branch

ATM work goes straight on `main`. If the owner asks for a branch, use
`atm`, or `atm-lessons` for lesson work (the lesson card and the
lessons). The lesson card animation is on `atm-card-animations`, the
name the owner asked for. The banner and hood light work was done on `atm-additions`,
the name the designer asked for.
