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

## Branch

ATM work goes on the `atm` branch.
