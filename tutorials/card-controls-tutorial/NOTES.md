# Card Controls Tutorial — Notes

Notes for the card-controls guided walkthrough. This folder used to
hold tutorial-specific duplicates of individual `card-controls/`
components; it holds none now (see below). Everything in the tutorial
flow uses the real `card-controls/` components, some with a tutorial
flag switched on.

## Duplicates or flags

Base-page components in `card-controls/` and `money-management/` are for
free exploration. The original policy was that when a tutorial needs a
component to behave differently, the base component is left untouched
and a tweaked copy lives here instead, named `<Component>Tutorial.tsx`,
with its internal function name, `defaultProps` target (if any) and
`addPropertyControls` target renamed to match the file (Framer's
Insert/override picker keys off these), and any component-owned storage keys given their own
tutorial-specific name so a base-page instance and a tutorial instance
never clobber each other's state in the same session.

**On 2026-10-05 the user chose flags instead for the two travel-notice
components**: `SetTravelNoticeTutorial.tsx` and
`TravelNoticeSectionTutorial.tsx` were folded back into
`SetTravelNotice.tsx` and `TravelNoticeSection.tsx` as a **Tutorial
copy** (`tutorial`) boolean property control, off by default (off = the
base behavior, unchanged), and the two copies were deleted. The
separate-storage-key rule still holds: the flag switches each component
to its own tutorial-only keys. Other tutorials' duplicates (e.g.
`tutorials/account-controls-tutorial/`) still follow the duplicate
convention.

## Current — Travel notice

Each tutorial-page layer uses the base component with **Tutorial copy**
on. To swap a layer that still uses an old `*Tutorial` component, put
the base component in its place and set:

- **Set Travel Notice page** (was `SetTravelNoticeTutorial`): insert
  `card-controls/travel-notice/SetTravelNotice.tsx`, set **Tutorial
  copy** = on, and set **Save link** and **Cancel link** to the same
  pages the old layer had (Save → the tutorial's Card Controls page).
  Copy over any label/color/font/size values that were changed from
  their defaults; the defaults are the same as the old copy's. The
  base-only controls (Destinations list, Max trip length, Destinations
  placeholder, focus/dropdown/calendar colors and fonts, Save (off)
  colors) have no effect with Tutorial copy on — leave them. **Max
  destinations** only feeds the helper text there, as it did in the
  copy. The four marker layers (`TravelStart`/`TravelEnd`/
  `TravelDestinations`/`TravelSave`) stay where they are: the layout is
  the same.
- **Card Controls page in the tutorial** (was
  `TravelNoticeSectionTutorial`): insert
  `card-controls/travel-notice/TravelNoticeSection.tsx`, set **Tutorial
  copy** = on, and copy over any changed style values. The
  `TravelNoticeShown` marker layer over it stays as is.

What Tutorial copy does:

- `SetTravelNotice.tsx` — every field is pre-populated and frozen
  instead of user-editable, since this is a walkthrough step, not a
  form the tutorial user actually fills in:
  - Start Date = 2 weeks from today; End Date = Start Date + 7 days,
    filled in after mount (empty on the first render, so the
    server-rendered HTML and the client's hydration render match).
    Displayed as month + day only ("September 11") — no year, no
    weekday, unlike the base form's long format. Neither date field
    (nor its calendar icon) opens a calendar dropdown.
  - Destinations = a fixed set of three chips (Illinois, Kentucky,
    Missouri) that can't be removed or added to — the field doesn't
    open a destinations dropdown either. Each chip still renders its ×
    for visual parity with the real app, but the × isn't clickable
    (rendered as a plain `<span aria-hidden>`, not a `<button>`).
  - Save has no disabled state — the fixed values are always valid, so
    it's just always styled "enabled". It writes its record under its
    own `kioskTravelNoticeTutorial` key, not the base form's
    `kioskTravelNotice`: sharing that key made the tutorial's practice
    notice show up once on the real Card Controls page, whose
    `TravelNoticeSection.tsx` has never seen that save. The toast flag
    (`kioskTravelNoticeToastFlag`) stays shared, so `CardControlsToasts.tsx`
    works unmodified. Cancel is unchanged from the base form.
- `TravelNoticeSection.tsx` — reads the tutorial-only
  `kioskTravelNoticeTutorial` key (see above) instead of
  `kioskTravelNotice`; otherwise unchanged. It labels it "Future Plans"
  whenever the record's start date isn't today, which is always true
  for the tutorial form's fixed 2-weeks-out date — so it shows "Future
  Plans" (never "Happening Now") automatically. Only its canvas-only
  sample placeholder differs, to preview correctly. Its own-shown
  marker key is `kioskTravelNoticeSectionTutorialShownAt`, distinct
  from the base page's `kioskTravelNoticeSectionShownAt`.
- `CardControlsToasts.tsx` (travel notice toast) — **no tutorial flag, on purpose.** The base
  file's toast behavior after Save is exactly what this tutorial step
  needs too (both modes write the same `kioskTravelNoticeToastFlag`),
  so the tutorial flow uses `card-controls/CardControlsToasts.tsx`
  directly. Don't add a tutorial mode to this file unless its behavior
  actually needs to diverge.

## Card Alerts flow — tapping specific toggles on

Card Alerts is different from travel notice: there's no single custom
code component to duplicate (`<Component>Tutorial.tsx`) — the real Set
Card Alerts page is built from ~20 native Framer toggle switch layers on
canvas, each with its own instance of a numbered
`withCardAlertsToggleReportN` override from
`card-controls/card-alerts/CardAlertsToggleReport.tsx`. "Duplicating the
page" here means duplicating the canvas frame itself in Framer, which
carries each layer's existing Code Override along with it.

That's the trap: `withCardAlertsToggleReportN`'s on/off flag
(`isOn1`, `isOn2`, ...) is a MODULE-LEVEL variable per number, shared by
every layer using that same numbered export — it exists to let
`CardAlertsSave.tsx` know whether *any* toggle on the real page is on.
If the tutorial-duplicate page's toggles keep that same override after
duplication, tapping one in the tutorial flips the exact same flag the
real page uses, contaminating a real user's actual alert settings.

The tutorial doesn't need that override at all: the native Framer
switch already animates its own on/off visual on tap with no override
involved, and — same call `SetTravelNotice.tsx`'s tutorial-mode Save
already made — a frozen walkthrough's Save button can just be hardcoded enabled
rather than replicating real "is anything on?" validation.
`withCardAlertsSaveTutorial` in `CardAlertsSave.tsx` implements this —
it's its own render body, not a thin wrapper sharing the base page's
`anyToggleOn()`-gated one. It wasn't always: an earlier version had it
sharing that body, which left the tutorial Save permanently muted since
none of these three toggles ever touch `onCount` — see the header
comment on `withCardAlertsSaveTutorial` for the full failure chain if
this regresses again.

So, per toggle the tutorial wants the user to tap:

1. On the tutorial-duplicate page, remove that toggle's copied-over
   `withCardAlertsToggleReportN` override entirely.
2. Apply one of `TutorialTargets.tsx`'s `CardAlertsToggleTarget1` /
   `CardAlertsToggleTarget2` / `CardAlertsToggleTarget3` (add more the
   same way if needed) instead — plain `withTutorialTarget`, not the
   marker variant, since the toggle itself is the real tappable element
   here (same category as `CardToggle`), not something
   sitting on top of a separate real element.
3. Drop a `TutorialOverlay` instance targeting that id, `stepNumber` in
   sequence with the rest of the flow, `clickAdvancesStep: true`, one
   toggle spotlighted per step — matches how `TravelSave` etc. already
   work, just without the click-through concern those needed (this
   marker doesn't sit over anything else).

## Wiring a TutorialOverlay step to a field inside one of these components

`TutorialOverlay.tsx` finds its target with
`document.querySelector('[data-tutorial-target="..."]')` — see the
`tutorial-overlays/` section of `tutorials/NOTES.md`. Normally that
attribute is added via a `TutorialTargets.tsx` Code Override applied to
a real Framer layer. That doesn't work for a field *inside* one of
these components (e.g. the Start Date row in
`SetTravelNotice.tsx`) — it's plain JSX inside this component's
own render, not a separately selectable layer on the canvas, so there's
nothing to attach a Code Override to directly.

The travel-notice tutorial uses **separate marker layers**: four
empty, invisible Framer layers — `travel-start`, `travel-end`,
`travel-destinations`, `travel-save` — positioned on the canvas over
the Start Date field, End Date field, Destinations field, and Save
button respectively, each tagged via its own `TutorialTargets.tsx` Code
Override export (`TravelStart`/`TravelEnd`/`TravelDestinations`/
`TravelSave`). Each goes through the `withTutorialMarker` helper there,
which forces `pointer-events: none` on the marker so it can't swallow
the tap meant for the real field/button it sits on top of.

An earlier in-source `data-tutorial-target="start-date"` on the Start
Date row in the old `SetTravelNoticeTutorial.tsx` copy was never used
live and has been removed; use `target: "travel-start"` / `"travel-end"` /
`"travel-save"`. Marker-layer positions need to be kept in sync by
hand if the underlying field ever moves, but unlike an in-source
attribute they can be positioned/adjusted from Framer's canvas.

To chain a scroll-down beat into a spotlight step (e.g. "Scroll Down" as
step 1, spotlighting Start Date as step 2), drop two `TutorialOverlay`
instances on the page sharing one `pageGroup` string:

1. Step 1 — `target` blank (no hole), `scrollAdvancesStep: true` +
   `scrollThresholdPercent` set, `stepNumber: 1`.
2. Step 2 — `target: "travel-start"`, `stepNumber: 2`.

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

## Branch naming

`card-controls-tutorial/<feature>`
