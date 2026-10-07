# ATM — Notes

The second portion of the kiosk: an ATM where Gen Alpha users learn to
use an ATM, plus general money tips and slide-style lessons. Separate
from the mobile-app kiosk that every other group in this repo serves.

## Brand colours

| Name | Hex | Use |
|---|---|---|
| Navy | `#002c44` | Primary, dominant |
| Teal | `#059390` | Primary |
| Light teal | `#3bbfc0` | Glows, shimmer |
| Light blue | `#0079a9` | Glows |
| Midnight | `#11232d` | Dark contrast |
| Egg yolk | `#ffcc40` | Accent only (the tap icon's ripple) |

## Current

- `ATMWingBackground.tsx` — the ATM screen's animated wing background
  (the attract/home state). Drop it inside the ATM artwork, sized to
  the screen cutout; the artwork is drawn on a 499×465 canvas and
  scaled to cover the layer. Built from the 8 curves of the design's
  wing SVG:
  - Lines 5–6 edge **wing 1**, lines 2–3 edge **wing 2**. Each wing is
    one solid shape. Lines 1, 4, 7 and 8 are still **accent lines**
    and never animate (a travelling highlight on them was tried and
    dropped).
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
- **In exploration (not built in Framer yet)**: attract-state lights on
  the ATM hardware and the transition after a tap. They are previewed
  on the "ATM Attract Lab" page (https://claude.ai/artifact/3oXYZBoLif9CCkRbDGnKG9),
  which runs the real wing background and tap icon on the screen. The
  designer will choose after seeing them; see the decisions log.

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
| Hide lines | **Wing Lines**, **Accent Lines** properties |
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

## Branch

ATM work goes on the `atm` branch.
