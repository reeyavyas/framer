# Main — Notes

Site-wide, page-agnostic components — not owned by any single feature.

## Current

- `InactivityOverlay.tsx` — kiosk idle-timeout redirect. If the kiosk
  sits untouched for the configured period (currently ~3 minutes), it
  shows a countdown and then automatically redirects back to the
  homepage, so the next person at the kiosk never inherits a stranger's
  left-open session.
- `LockScreen.tsx` — one code component, two `variant`s, for the
  lock → splash → login flow:
  - **Lock Screen** — live/custom clock + date, up to two fake
    notification banners (`notification1`/`notification2`, each a
    full app/title/message/icon/timestamp) that cycle one at a time
    on a loop (pop in, hold, pop out, next) whenever both are
    enabled — with only one enabled it just stays put. A bouncing
    swipe-up hint (a real decaying two-hop bounce, not a smooth
    float), frosted-glass flashlight/camera buttons, and home
    indicator. Has no background fill of its own — drop your own
    wallpaper/gradient layer underneath it in Framer and it shows
    through untouched. Dragging the panel up past a distance/velocity
    threshold fires the `onSwipeUp` event control; every release
    springs back to rest with a little overshoot, whether or not the
    swipe cleared the threshold.
  - **Splash** — full-bleed gradient background, a logo that fades/
    scales/pulses in, optional loading dots, and a timed auto-redirect
    (`window.location.href`) to a configurable URL (defaults to
    `/base-pages/login`). Skips the redirect while on the Framer
    canvas so designing it doesn't navigate you away.
  Wire `onSwipeUp` on the Lock Screen instance to navigate to the page
  holding the Splash instance, which then auto-advances to login.
- `WingPulseLines.tsx` — transparent SVG overlay for the wing-line
  wallpaper behind the lock screen: 3 editable curves (`line1`/`line2`/
  `line3`, each a plain SVG path `d` string), along each of which a
  glowing pulse travels continuously and loops. The 3 default paths
  are a visual approximation of the wallpaper's curves traced from a
  screenshot, not an exact match — paste the real `d` data from the
  wallpaper's source vector art (Figma/Illustrator/AE export) into a
  line's "SVG Path" field for a pixel-perfect trace. Drop it on top of
  the wallpaper layer, behind the LockScreen component.

## Removed

- `backgrounds/` — three animated gradient presets
  (`NeatGradient1.tsx`, `bluemotionbackgeound.tsx`,
  `bluemotionbackground2.tsx`, via
  [`@firecms/neat`](https://www.npmjs.com/package/@firecms/neat)).
  Experimental, never used in the live project — deleted from here.
  Still available on `claude/gradient-firecms-framer-bmpf87`, which is
  being kept around specifically for these.

## Branch naming

`main/<feature>`
