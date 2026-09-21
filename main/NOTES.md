# Main — Notes

Site-wide, page-agnostic components — not owned by any single feature.

## Current

- `InactivityOverlay.tsx` — kiosk idle-timeout redirect. If the kiosk
  sits untouched for the configured period (currently ~3 minutes), it
  shows a countdown and then automatically redirects back to the
  homepage, so the next person at the kiosk never inherits a stranger's
  left-open session.
- **Hydration guard** — any code component rendering live date/time
  (or other client-only dynamic values, e.g. weather) needs to hide
  itself until the client has mounted, or the value Framer
  pre-renders on the server can mismatch the client's first paint —
  a visible flash of the wrong value, and can throw React error #425.
  The fix is a `useIsMounted` hook (`useState(false)` flipped to
  `true` in a `useEffect`) that gates the real render behind an
  invisible `opacity:0, visibility:hidden` placeholder (sized to
  `props.width`/`props.height`) until mount:
  ```tsx
  function useIsMounted() {
      const [isMounted, setIsMounted] = useState(false)
      useEffect(() => setIsMounted(true), [])
      return isMounted
  }
  ```
  Two ways to apply it — same hook, same effect:
  1. **As a standalone Framer code override** (`withHydrationGuard`,
     wraps `Component` from outside) — attach it in the layer's Code
     panel. This is the general-purpose version for any component
     that needs it, but it occupies that layer's one available
     code-override slot (Framer allows only one override per layer —
     see the Splash Timed Redirect note below).
  2. **Baked directly into the component's own file** — split the
     component into a thin default-exported wrapper that calls
     `useIsMounted()` and either renders the placeholder or the real
     (renamed, un-exported) implementation component. No override
     needed, and it leaves that layer's override slot free for
     something else. This is how `LockScreen.tsx` does it (see
     below) — prefer this route for any *new* date/time component
     instead of requiring a separately-applied override.
- `LockScreen.tsx` — one code component, two `variant`s, for the
  lock → splash → login flow. Guards its own hydration internally
  (see **Hydration guard** above): the default export is a thin
  wrapper (`useIsMounted` + placeholder-or-render), and all the actual
  variant logic below lives in the un-exported `LockScreenInner`. No
  external `withHydrationGuard` override needed on this layer anymore
  — that slot is free.
  - **Lock Screen** — live/custom clock + date, up to five fake
    notification banners (`notification1`-`notification5`, each a
    full app/title/message/icon/timestamp) that stack like a real
    lock screen instead of cycling: whichever are enabled arrive one
    at a time (each using its own "Appear Delay" as the gap since
    the previous arrival), newest on top pushing the rest down, and
    stay up together. Once the whole stack has arrived it holds for
    the longest "Stay Duration" among them, then clears and the
    sequence arrives again from empty. A bouncing swipe-up hint
    (a single rise/fall with a "back" easing overshoot — a middle
    ground between a plain float and a full double-hop bounce),
    frosted-glass flashlight/camera buttons, and home indicator. The
    glass styling takes a Liquid-Glass-style (iOS 26) pass: a tight
    specular glint near the top-left rather than a flat diagonal
    sheen, plus a bright top rim/faint dark underside rim on every
    glass surface for a sense of physical edge thickness; the
    notification icon's corner radius scales off the card's own
    radius instead of a fixed value, so they stay visually nested as
    it's tuned. Has no background fill of its own — drop your own
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
- `SplashProgressBar.tsx` — standalone layer (not baked into
  LockScreen.tsx) for a gradient-fill loading bar with a shimmer sheen
  and a glowing dot riding the leading edge, all driven off one shared
  progress value so they can't drift apart. Drop it onto the Splash
  (Variant 2) frame and size/position it like any other layer; own
  color/duration/delay/easing/loop controls, independent of the
  Splash variant's built-in redirect timer above.
- `SplashTimedRedirect.tsx` — plain code override (`SplashTimedRedirect`),
  not a component. Currently unused — `LockScreen.tsx`'s own built-in
  Splash redirect (`splash.redirectDelay`/`splash.redirectUrl`, set on
  the Splash instance's properties panel) covers this already, no
  override needed. Kept around as a standalone alternative: if ever
  applied, it goes on the **Splash (Variant 2)** instance of the Lock
  Screen layer specifically — it no-ops unless the layer's `variant`
  prop reads `"splash"`. Waits 2.3s, then `window.location.href`s to
  `/base-pages/login`; skipped on canvas. Would duplicate the built-in
  redirect if both ended up applied to the same instance (both would
  fire) — use one or the other, not both.
  Framer only allows one code override per layer, and a code override
  is applied to the *component*, not to one instance's variant setting
  — applying one to a Lock Screen instance applies it whichever
  `variant` that instance is on (Lock Screen or Splash alike). There's
  no way to apply an override to one variant only, which is exactly
  why this override guards itself internally with
  `props.variant !== "splash"` instead of relying on Framer to scope
  it. (This is also why the hydration guard above is baked directly
  into `LockScreen.tsx` rather than left as an external override —
  otherwise it would eat the one override slot this component has,
  which also can't be scoped to just the Lock Screen variant.)
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
