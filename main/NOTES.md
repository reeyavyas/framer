# Main — Notes

Site-wide, page-agnostic components — not owned by any single feature.

## Current

- `backgrounds/` — three animated gradient presets (via
  [`@firecms/neat`](https://www.npmjs.com/package/@firecms/neat),
  imported straight from esm.sh so Framer needs no npm install step):
  - `NeatGradient1.tsx`
  - `bluemotionbackgeound.tsx`
  - `bluemotionbackground2.tsx`
- `InactivityOverlay.tsx` — kiosk idle-timeout redirect. If the kiosk
  sits untouched for the configured period (currently ~3 minutes), it
  shows a countdown and then automatically redirects back to the
  homepage, so the next person at the kiosk never inherits a stranger's
  left-open session.

## Branch naming

`main/<feature>`
