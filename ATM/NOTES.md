# ATM — Notes

The second portion of the kiosk: an ATM where Gen Alpha users learn to
use an ATM, plus general money tips and slide-style lessons. Separate
from the mobile-app kiosk that every other group in this repo serves.

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
    slowly rolls across it, and the glows drift a little wider.
  - Both: three soft glows (light teal top right at half strength,
    light blue upper left and lower middle) and a light-teal shimmer
    running left to right along the wing lines.
  - Background: a very wide horizontal navy-to-teal blend that runs past
    the right edge, so most of the frame is navy. Gradients are
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
  - Known and accepted: most of wing 2's bottom line (line 2) runs below
    the screen, so its shimmer is only seen near the bottom-right
    corner.
- Next: the "Tap anywhere to begin" layer on top (a finger icon that
  loops into a tap-ripple), as its own component.

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
| One glow brighter/dimmer, moved, recoloured | `ORBS`: `x`/`y` position, `r` size, `color`, `k` strength (top right is `k: 0.5`) |
| Glow softness | `FALLOFF` (fade curve) and the `glowSoft` blur (`stdDeviation={55}`) |
| Wing shimmer brightness / count | **Wing Shimmer**, **Shimmers / Loop** properties; colour is Light Teal |
| More or less navy in the background | `BG`: navy holds to the second key (`0.5`); the blend runs to `x = 680` (larger = more navy at the right edge) |
| Angle of the background blend | `BG_ANGLE` (degrees upward toward the right; `0` is horizontal) |
| Colour mix inside a wing or still shape | `grad` keys on `WINGS` / `FILLS` (`[offset, colour]`); `g` is the gradient direction |
| Brand colours | **Navy / Teal / Light Teal / Light Blue / Midnight** properties |
| Hide lines | **Wing Lines**, **Accent Lines** properties |

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
  bottom); lower middle is light blue; top right is half strength.
- **Colour balance**: navy is the dominant colour, more than teal.
  Teal only toward the right. The background blend runs left to right,
  tilted about 14° upward (navy lower left, teal upper right); the
  shapes' own gradients follow each shape (making every gradient
  horizontal was tried and rejected). No light-blue stripe between navy
  and teal (it read as a harsh band). Every gradient is eased so there
  is no visible line where a colour starts.
- **Accepted as is**: wing 2's bottom line is mostly below the screen,
  so its shimmer only shows in the bottom-right corner.

## Branch

ATM work goes on the `atm` branch.
