# Tutorials — Notes

The interactive tutorial system, split into independent subgroups.

## `tutorials-main-page/`

Builds the Tutorials landing page itself.

- `CurvedCarouselV2.tsx` — the curved/arc card carousel that holds the
  flip-card tutorial entries. Current version (fixes the front-card
  reset firing mid-drag). The superseded V1, `CurvedCarousel.tsx`, has
  moved to `archived/tutorials-main-page/` — see `archived/NOTES.md`.

## `tutorial-overlays/`

A guided-walkthrough layer droppable on top of any existing page to
turn it into a tutorial. The real, already-interactive UI underneath is
left completely untouched — these components dim/spotlight it and
restrict taps to one target at a time instead of letting the user click
anywhere else on the page.

- `FocusGuide.tsx` — "click here" glow drawn over one specific layer
- `SpotlightOverlay.tsx` — dims/blurs the rest of the screen, cutting
  out the target area
- `TutorialOverlay.tsx` — the per-step instruction card + hole + glow
  (one instance per tutorial beat, configured entirely from the
  Properties panel)
- `TutorialTargets.tsx` — Override that tags a layer so
  `TutorialOverlay` can find/measure it. **Out of sync with the live
  Framer project as of this writing:** the card-controls travel-notice
  tutorial added `TravelStart`/`TravelEnd`/`TravelSave` exports
  (tagging `travel-start`/`travel-end`/`travel-save`) directly in
  Framer's own code editor, which have not been pulled back into this
  repo's copy of the file. Reconcile before trusting this file as the
  source of truth for what's actually live. See
  `card-controls-tutorial/NOTES.md` for how these three are used.
- `TutorialCongrats.tsx` — full-screen finish screen for the end of a
  tutorial

### Known issue: TutorialOverlay can render null on Published while working in Preview

Seen on the card-controls travel-notice tutorial's "Scroll Down" step
(`pageGroup: "travel-notice"`, `stepNumber: 1`): `TutorialOverlay`
rendered correctly in Preview (`document.querySelector('[data-tutorial-overlay="true"]')`
returned a real, correctly-sized div, card visible) but returned `null`
— not mounted at all — on the Published site, even after an explicit
republish and testing in a fresh incognito window on the identical
page. `[data-tutorial-target]` markers on the same page were present
and correct in both environments.

Ruled out over a long debugging session: blank `pageGroup`, wrong
`stepNumber`, `scrollContainerTarget` pointed at a non-scrollable
marker layer instead of the real scroll container, browser scroll-
position restoration on reload, responsive-breakpoint mismatch (page
has only one breakpoint), stale module-level step-counter state,
CDN/publish caching. The component's own code was confirmed correct
(Preview proves it renders and positions correctly) — whatever's
causing Published to differ from Preview here is Framer-platform
behavior this repo's source can't diagnose alone (e.g. a per-instance
property value, most likely `Active`, desyncing between draft and
published state). Not yet resolved. Next untested step: toggle
`Active` off, then on, then republish, to force Framer to re-commit
that instance's actual saved value.

## `card-controls-tutorial/`

Tutorial-specific duplicates of individual `card-controls/` base-page
components — only the ones that actually need to behave differently
inside the tutorial flow, not a full copy of the folder. See
`card-controls-tutorial/NOTES.md`.

- `SetTravelNoticeTutorial.tsx` — duplicate of
  `card-controls/travel-notice/SetTravelNotice.tsx`, with every field
  pre-populated and frozen (fixed dates/destinations, no dropdowns).
- `TravelNoticeSectionTutorial.tsx` — duplicate of
  `card-controls/travel-notice/TravelNoticeSection.tsx`.
- `TravelNoticeToast.tsx` is deliberately *not* duplicated here — the
  tutorial flow uses `card-controls/travel-notice/TravelNoticeToast.tsx`
  directly. See `card-controls-tutorial/NOTES.md`.

More `<group>-tutorial/` subfolders (e.g. `money-management-tutorial/`)
will show up here the same way, as tutorial work needs them.

## Branch naming

```
tutorials-main-page/<feature>
tutorial-overlays/<feature>
card-controls-tutorial/<feature>
```
