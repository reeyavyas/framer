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
  light-blue screen glow on the metal, glare on the glass (each one a
  switch). **Transition** is **A + B + E** (chosen), about 3.1 s from
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
  2. **ATM Image**: the ATM artwork (the 1080×1920 PNG). **Card
     Image**: the debit card PNG. Remove the old ATM image layer from
     the page; the component draws it.
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
| Turn a light off | **Slot Lights**, **Card Slot Flash**, **Screen Glow**, **Glass Glare** properties |
| Light colours | **Slot Light** (green), **Glow** (light blue) properties |
| Glare timing | the `glare` animation in `css()`: every 6 s, the sweep is the first 33% (about 2 s) |
| Glow strength / speed | the `spill` box-shadow and keyframes in `css()` (6 s loop, 8% to 100%) |
| Ripple colours | **Ripple**, **Inner Ring** properties |
| Ripple start point | `rippleZoom` (middle of the page) and `rippleFlood` (the tap point, A only) |
| Ripple / zoom speed | A + B + E: `ABE_RIPPLE_SECONDS` (1.2 s). A + B: `rippleZoom`'s default (1.6 s). Others: the `play(…)` lengths and `seg` times in `zoomIn`, `rippleFlood` |
| Card size, tilt, perspective | `CARD_W`, `CARD_H`, `CARD_TILT`, `PERSPECTIVE` |
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
| Positions on the artwork | `SCREEN`, `STRIPS`, `SLOT_X`, `SLOT_Y`, the chevron `<svg>` (all in the 1080×1920 artwork's pixels) |

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
icon, lights, the A + B + E transition and the beeps. There are no
open tasks. Further changes depend on feedback the designer receives;
the decisions log below records what was tried and chosen, so that
feedback can be applied without undoing earlier decisions.

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

## Branch

ATM work goes on the `atm` branch.
