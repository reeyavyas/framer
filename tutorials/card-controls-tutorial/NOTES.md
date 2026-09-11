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

## Wiring a TutorialOverlay step to a field inside one of these components

`TutorialOverlay.tsx` finds its target with
`document.querySelector('[data-tutorial-target="..."]')` — see the
`tutorial-overlays/` section of `tutorials/NOTES.md`. Normally that
attribute is added via a `TutorialTargets.tsx` Code Override applied to
a real Framer layer. That doesn't work for a field *inside* one of
these components (e.g. the Start Date row in
`SetTravelNoticeTutorial.tsx`) — it's plain JSX inside this component's
own render, not a separately selectable layer on the canvas, so there's
nothing to attach a Code Override to directly.

Two approaches ended up in play for the travel-notice tutorial —
**worth reconciling to just one before building the next tutorial**:

1. **Hardcoded in-source attribute** (what this repo's code does): the
   Start Date row in `SetTravelNoticeTutorial.tsx` carries
   `data-tutorial-target="start-date"` directly in its JSX.
2. **Separate marker layers** (what actually ended up wired up live, in
   Framer): three empty, invisible Framer layers —
   `travel-start`, `travel-end`, `travel-save` — positioned on the
   canvas over the Start Date field, End Date field, and Save button
   respectively, each tagged via its own `TutorialTargets.tsx` Code
   Override export (`TravelStart`/`TravelEnd`/`TravelSave`). These
   exports were added directly in Framer's code editor and, as of this
   writing, have **not** been pulled into this repo's copy of
   `TutorialTargets.tsx` — see the flag in `tutorials/NOTES.md`.

Since approach 2 is what's actually live, prefer `target: "travel-start"`
/ `"travel-end"` / `"travel-save"` on real `TutorialOverlay` instances
over `target: "start-date"` for now. Marker-layer positions need to be
kept in sync by hand if the underlying field ever moves; the in-source
attribute (approach 1) doesn't have that problem but can't be
positioned/adjusted from Framer's canvas the way a marker layer can —
that's presumably why the marker-layer approach was chosen. Pick one
and remove the other once the live TutorialOverlay-not-showing bug
(below) is resolved.

To chain a scroll-down beat into a spotlight step (e.g. "Scroll Down" as
step 1, spotlighting Start Date as step 2), drop two `TutorialOverlay`
instances on the page sharing one `pageGroup` string:

1. Step 1 — `target` blank (no hole), `scrollAdvancesStep: true` +
   `scrollThresholdPercent` set, `stepNumber: 1`.
2. Step 2 — `target: "travel-start"` (or `"start-date"`, if you
   reconcile to the in-source approach instead), `stepNumber: 2`.

Scrolling past the threshold on step 1 advances the shared `pageGroup`'s
step counter to 2, at which point step 2 becomes "its turn," measures
the tagged element, and cuts its hole/spotlight there.

**Known live issue, unresolved:** the "Scroll Down" step-1
`TutorialOverlay` instance on this exact page renders correctly in
Preview but not on the Published site (confirmed via
`document.querySelector('[data-tutorial-overlay="true"]')` — a real,
correctly-sized element in Preview; `null` in Published, even after a
republish and fresh incognito test on the identical page). Full
debugging history and ruled-out causes are in the `tutorial-overlays/`
section of `tutorials/NOTES.md`. Next untested step: toggle `Active`
off/on and republish, to rule out a desynced per-instance property
value.

**Fixed:** a separate bug where this same step-1 "Scroll Down" instance
self-advanced instantly on the kiosk's real 1080x1920 viewport, before
the user scrolled at all. Root cause and fix are in the
`tutorial-overlays/` section of `tutorials/NOTES.md` (the `checkScroll`
fallback in `TutorialOverlay.tsx`) — flagged here too since this page's
step-1 instance is the one it was actually observed on.

## Branch naming

`card-controls-tutorial/<feature>`
