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
- `LockScreen.tsx` — renders the phone lock screen only (clock,
  notifications, swipe-up hint). It does **not** render a splash
  screen of its own — an earlier `variant: "splash"` branch (gradient
  background, animated logo, progress dots, and a redirect timer) was
  removed once it turned out to be dead code: the actual project nests
  this component inside a separately-built "Phone Lock & Splash"
  composition, where the splash screen is its own hand-built frame
  (native Framer animations, `SplashProgressBar.tsx`, custom glow
  pulses) — this component was never being switched to a "splash"
  state to show it. The `variant` prop/enum (`lockScreen`/`splash`)
  still exists on this component for now but has no splash content
  behind it; treat `lockScreen` as the only meaningful value. Guards
  its own hydration internally (see **Hydration guard** above): the
  default export is a thin wrapper (`useIsMounted` +
  placeholder-or-render), and all the actual rendering logic lives in
  the un-exported `LockScreenInner`. No external `withHydrationGuard`
  override needed on this layer — that slot is free.
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
  Wire `onSwipeUp` on the Lock Screen instance to navigate to whatever
  page/frame holds your own splash composition.
- **The Splash screen is hand-built in Framer, not code.** It lives
  inside the project's own "Phone Lock & Splash" component as its own
  frame — not as a `LockScreen.tsx` variant, which has no knowledge of
  it. Confirmed structure (Base Pages / Lock Screen page): "Phone Lock
  & Splash" has two Framer-native Variants — "LockScreen" (Primary)
  and "splash". Each Variant has its own "BG Elements" > "Splash
  Elements" frame; the one inside the **"splash" Variant** is the real
  one — it holds `Logo`, `SplashProgressBar` (`SplashProgre...` in the
  layers list), two `GlowPulseSplash` layers, and the `Splash Stroke
  Paths` vector group. `SplashTimedRedirect` (see below) is applied to
  that "Splash Elements" frame specifically, inside the "splash"
  Variant — not the LockScreen Variant's copy of the same frame name.
- `SplashProgressBar.tsx` — standalone layer for a gradient-fill
  loading bar with a shimmer sheen and a glowing dot riding the
  leading edge, all driven off one shared progress value so they
  can't drift apart. Drop it onto the splash frame and size/position
  it like any other layer; own color/duration/delay/easing/loop
  controls.
- `SplashTimedRedirect.tsx` — plain code override (`SplashTimedRedirect`),
  not a component — exported as `(Component) => Component`, which is
  what makes Framer list it under a layer's **Code** section rather
  than as a draggable layer. **Confirmed working**, applied to the
  "Splash Elements" frame inside the "splash" Variant of "Phone Lock &
  Splash" (see above) — nothing about the override cares what the
  layer is named; it only matters that it's attached to the layer
  that's actually the splash content.
  Doesn't rely on mount timing (that only fires correctly if the
  splash frame is its own separately-mounted layer — it wouldn't
  catch a Framer-native Variant switch or a Show/Hide toggle inside
  an already-mounted parent, since nothing unmounts there). Instead
  it polls actual on-screen visibility every 200ms — walking up from
  its own DOM node checking `display`/`visibility`/`opacity` at every
  ancestor — and fires 2.3s after first seen visible, resetting (and
  re-arming) if it goes hidden again. `window.location.href`s to
  `/base-pages/login`; skipped on the Framer canvas.
  Framer only allows one code override per layer (this is why the
  hydration guard above is baked directly into `LockScreen.tsx`
  instead of left as an external override — it would otherwise eat
  this component's one override slot).
## Removed

- `WingPulseLines.tsx` / `VectorPathGlow.tsx` — both were attempts at
  a glowing-pulse-along-a-vector-path effect (first via traced/pasted
  path data, then via a `ControlType.ComponentInstance` picker reading
  the real path off an existing layer). Not being used at all — the
  glow pulses on the splash screen are instead hand-built in Framer
  itself (`GlowPulseSplash` layers, per the Splash screen note above).
  Deleted from this branch; the git history still has both if this
  direction ever comes back up.
- `backgrounds/` — three animated gradient presets
  (`NeatGradient1.tsx`, `bluemotionbackgeound.tsx`,
  `bluemotionbackground2.tsx`, via
  [`@firecms/neat`](https://www.npmjs.com/package/@firecms/neat)).
  Experimental, never used in the live project — deleted from here.
  Still available on `claude/gradient-firecms-framer-bmpf87`, which is
  being kept around specifically for these.

## Branch naming

`main/<feature>`
