# Card Controls — Notes

Card-level account actions a user manages from settings.

## Current

- `travel-notice/` — "Set a travel notice" on a card, so it isn't
  flagged for fraud while the user is away from home.
  - `SetTravelNotice.tsx` — the form
  - `TravelNoticeSection.tsx` — where an active notice is displayed.
    Reads the stored notice in a `useEffect` (not the `useState`
    initializer) so the client's first render always matches the
    server-rendered HTML — otherwise React throws a hydration mismatch
    (#418/#422), since `sessionStorage` doesn't exist during SSR.
  - `TravelNoticeToast.tsx` — confirmation toast on save. Subscribes to
    the toast-phase listener *before* arming it from storage, so the
    synchronous "visible" notification arming can fire isn't missed.
  - Pulled from `claude/lucid-ride-48wl0l`, the branch both fixes above
    actually shipped on — not `travel-notice`, which predates them.

- `card-alerts/` — "Set Card Alerts": a native list of per-category
  toggles (Spending alerts, Transportation, Household, ...), with a
  fixed "$100" spending threshold rather than a user-typed amount.
  - `CardAlertsToggleReport.tsx` — 24 near-identical numbered overrides,
    one applied per toggle layer, each with its own private on/off
    closure contributing to a shared on-count. (An earlier version kept
    one shared map keyed by the toggle's own `data-framer-name` instead
    of per-toggle closures — broke in practice, both from two toggles
    colliding on the same key and from a toggle's own on-tap and
    off-tap landing on different keys, so Save's enabled state didn't
    track reliably.)
  - `CardAlertsSave.tsx` — the Save button (enabled once any toggle is
    on) and its "Saving..." overlay. Unlike Travel Notice, this page
    shows a brief spinner before navigating, matching the reference
    app's flow — the overlay needs no fade-out or sessionStorage
    handoff since it never survives past the page it's on. Neither Save
    layer may have a native Framer Link — navigation is entirely
    code-driven so the disabled-tap guard and the delay both actually
    take effect, instead of racing a native Link's own independent
    navigation. There are two Set Card Alerts pages (the base page, and
    a tutorial-overlay duplicate reached from the tutorials flow), each
    landing on its own matching Card Controls variant, so Save comes in
    two exports off one factory: `withCardAlertsSave` ->
    `CARD_CONTROLS_LINK` for the base page's Save button,
    `withCardAlertsSaveTutorial` -> `CARD_CONTROLS_TUTORIAL_LINK` for
    the tutorial duplicate's. Everything else (toggle counting, the
    overlay, the toast) is identical either way and needs no
    duplicating — only the destination differs.
  - `CardAlertsToast.tsx` — confirmation toast on Card Controls once
    Save's delay elapses. Same mechanism as `TravelNoticeToast.tsx`,
    separate storage key.
  - No sessionStorage record of the actual alert selections — this is a
    tap-through walkthrough, not a persisted setting (unlike Travel
    Notice's own record).

## Branch naming

`card-controls/<feature>` — e.g. `card-controls/card-alerts`
