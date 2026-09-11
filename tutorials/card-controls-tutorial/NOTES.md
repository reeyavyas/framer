# Card Controls Tutorial — Notes

Tutorial-specific duplicates of individual `card-controls/` components,
for the card-controls guided walkthrough. This is **not** a full copy of
`card-controls/` — only components that actually need tutorial-specific
behavior live here. Everything else in the tutorial flow uses the real
`card-controls/` component directly.

## Why duplicates instead of props/flags on the base component

Base-page components in `card-controls/` and `money-management/` are for
free exploration — no tutorial concerns baked in. When a tutorial needs
a component to behave differently, the base component is left untouched
and a tweaked copy lives here instead, named `<Component>Tutorial.tsx`
(e.g. `TravelNoticeSection.tsx` → `TravelNoticeTutorial.tsx`). Keep the
internal function name, `defaultProps` target, and `addPropertyControls`
target renamed to match the file (Framer's Insert/override picker keys
off these), and give any component-owned storage keys their own
tutorial-specific name so a base-page instance and a tutorial instance
never clobber each other's state in the same session.

## Current

- `TravelNoticeTutorial.tsx` — duplicate of
  `card-controls/travel-notice/TravelNoticeSection.tsx`, for the
  card-controls tutorial. Cloned as-is (function/props/addPropertyControls
  renamed to match, and its own-shown marker key changed to
  `kioskTravelNoticeTutorialShownAt` so it doesn't collide with the base
  page's `kioskTravelNoticeSectionShownAt`); no behavioral changes yet
  beyond that — pending tutorial-specific tweaks.

## Branch naming

`card-controls-tutorial/<feature>`
