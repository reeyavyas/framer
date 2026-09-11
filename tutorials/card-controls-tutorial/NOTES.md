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
(e.g. `TravelNoticeSection.tsx` → `TravelNoticeSectionTutorial.tsx`). Keep the
internal function name, `defaultProps` target, and `addPropertyControls`
target renamed to match the file (Framer's Insert/override picker keys
off these), and give any component-owned storage keys their own
tutorial-specific name so a base-page instance and a tutorial instance
never clobber each other's state in the same session.

## Current

Travel notice is the first tutorial-duplicated flow. It's 2 of the base
flow's 3 components — the 3rd, `TravelNoticeToast.tsx`, is deliberately
**not** duplicated (see below).

- `SetTravelNoticeTutorial.tsx` — duplicate of
  `card-controls/travel-notice/SetTravelNotice.tsx`. Every field is
  pre-populated and frozen instead of user-editable, since this is a
  walkthrough step, not a form the tutorial user actually fills in:
  - Start Date = 2 weeks from today; End Date = Start Date + 7 days.
    Displayed as month + day only ("September 11") — no year, no
    weekday, unlike the base form's long format. Neither date field
    (nor its calendar icon) opens a calendar dropdown; the dropdown/
    calendar-panel code path was removed entirely rather than kept
    dead, along with the now-unused props that only existed to
    configure it (`destinationOptions`, `tripMaxMonths`,
    `destinationsPlaceholder`, focus/panel/calendar colors and fonts).
  - Destinations = a fixed set of three chips (Illinois, Kentucky,
    Missouri) that can't be removed or added to — the field doesn't
    open a destinations dropdown either. Each chip still renders its ×
    for visual parity with the real app, but the × isn't clickable
    (rendered as a plain `<span aria-hidden>`, not a `<button>`).
  - Save has no disabled state — the fixed values are always valid, so
    it's just always styled "enabled". It still writes the exact same
    `kioskTravelNotice` / `kioskTravelNoticeToastFlag` sessionStorage
    keys as the base form, so `TravelNoticeToast.tsx` and
    `TravelNoticeSectionTutorial.tsx` (below) both work unmodified. Cancel is
    unchanged from the base form.
- `TravelNoticeSectionTutorial.tsx` — duplicate of
  `card-controls/travel-notice/TravelNoticeSection.tsx`. No functional
  changes needed: it already reads whatever's under the shared
  `kioskTravelNotice` key and already labels it "Future Plans" whenever
  the record's start date isn't today, which is always true for
  `SetTravelNoticeTutorial.tsx`'s fixed 2-weeks-out date — so it shows
  "Future Plans" (never "Happening Now") automatically. Only its
  canvas-only `SAMPLE_SUMMARY` placeholder was refreshed, to preview
  correctly. Its own-shown marker key is
  `kioskTravelNoticeSectionTutorialShownAt`, distinct from the base page's
  `kioskTravelNoticeSectionShownAt`.
- `TravelNoticeToast.tsx` — **not duplicated, on purpose.** The base
  file's toast behavior after Save is exactly what this tutorial step
  needs too (both forms write the same `kioskTravelNoticeToastFlag`),
  so the tutorial flow uses `card-controls/travel-notice/TravelNoticeToast.tsx`
  directly. Don't add a tutorial copy of this file unless its behavior
  actually needs to diverge.

## Branch naming

`card-controls-tutorial/<feature>`
