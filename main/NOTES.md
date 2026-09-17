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
  - **Lock Screen** — live/custom clock + date, a fake notification
    banner (slides in a beat after mount), a bouncing swipe-up hint,
    frosted-glass flashlight/camera buttons, and home indicator.
    Dragging the panel up past a distance/velocity threshold fires the
    `onSwipeUp` event control; every release springs back to rest with
    a little overshoot, whether or not the swipe cleared the threshold.
  - **Splash** — full-bleed gradient background, a logo that fades/
    scales/pulses in, optional loading dots, and a timed auto-redirect
    (`window.location.href`) to a configurable URL (defaults to
    `/base-pages/login`). Skips the redirect while on the Framer
    canvas so designing it doesn't navigate you away.
  Wire `onSwipeUp` on the Lock Screen instance to navigate to the page
  holding the Splash instance, which then auto-advances to login.

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
