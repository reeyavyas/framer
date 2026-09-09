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

## Planned

- **Set Card Alerts** — not yet built. When work starts, give it its
  own subfolder here (`card-controls/card-alerts/`) alongside
  `travel-notice/`.

## Branch naming

`card-controls/<feature>` — e.g. `card-controls/card-alerts`
