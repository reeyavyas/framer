# Card Controls — Notes

Card-level account actions a user manages from settings.

## Current

- `travel-notice/` — "Set a travel notice" on a card, so it isn't
  flagged for fraud while the user is away from home.
  - `SetTravelNotice.tsx` — the form
  - `TravelNoticeSection.tsx` — where an active notice is displayed
  - `TravelNoticeToast.tsx` — confirmation toast on save

## Planned

- **Set Card Alerts** — not yet built. When work starts, give it its
  own subfolder here (`card-controls/card-alerts/`) alongside
  `travel-notice/`.

## Branch naming

`card-controls/<feature>` — e.g. `card-controls/card-alerts`
