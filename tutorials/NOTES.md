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
- `PageStepState.tsx` — the shared same-page step counter
  `TutorialOverlay.tsx`'s own steps hand off between themselves, pulled
  out into its own small, dependency-free file so `TutorialCongrats.tsx`
  and `TutorialCongratsGate.tsx` can read/subscribe to it without
  importing all of `TutorialOverlay.tsx` (a large, animation-heavy file)
  just to reach two functions — that was making Framer's canvas
  noticeably heavy. Everything that touches the step counter, including
  `TutorialOverlay.tsx` itself, imports from here now.
- `TutorialTargets.tsx` — Override that tags a layer so
  `TutorialOverlay` can find/measure it. Carries the full live export
  list as of the last sync (`MoreTabTarget`, `CardControlsTarget`,
  `CardToggle`, `TravelNotice`, `TravelScroll`, `TravelStart`,
  `TravelEnd`, `TravelDestinations`, `TravelSave`), added directly in
  Framer's own code editor and pulled back into this repo's copy — plus
  `CardAlertsToggleTarget1`/`2`/`3` and `CardAlertsSaveTarget` (see
  `card-controls-tutorial/NOTES.md`, "Card Alerts flow"), authored here
  first and not yet applied to any layer in the live Framer project —
  verify against the live Framer project before trusting this as the
  source of truth either direction. The four
  field-marker exports (`TravelStart`/`TravelEnd`/`TravelDestinations`/
  `TravelSave`) go through a separate `withTutorialMarker` helper that
  forces `pointer-events: none`, since each sits on top of a real field
  inside `SetTravelNoticeTutorial.tsx`'s own render rather than being a
  separately tappable layer — without it, the marker itself would
  swallow the tap meant for the real field/button underneath. See
  `card-controls-tutorial/NOTES.md`
  for how these three are used.
- `TutorialCongrats.tsx` — full-screen finish screen for the end of a
  tutorial. Can show itself automatically once a page's real step(s)
  are done (share `pageGroup` with the page's `TutorialOverlay`
  instance(s) and set `showAtStep` to one past the last real step) and
  can auto-redirect to `exitLink` after `autoRedirectAfterSeconds`
  instead of waiting for the exit button tap. See the file's own
  top-of-file comment for the exact wiring.
- `TutorialCongratsGate.tsx` — same auto-show/auto-redirect timing as
  `TutorialCongrats.tsx` above, but for a page whose finish screen is a
  custom-built Frame (e.g. a third-party confetti component plus a
  keyframe pulse, assembled on the canvas) instead of that file's own
  built-in look. Takes the custom Frame as a `ControlType.ComponentInstance`
  ("Congrats content") and only mounts it once the shared `pageGroup`
  step counter reaches `showAtStep` — a full mount, not a CSS visibility
  toggle, so anything inside keyed to its own mount/visibility (a
  confetti burst that fires itself on load, e.g.
  https://framer.university/resources/confetti-component-for-framer)
  fires fresh at the right moment. See the file's own top-of-file
  comment for the exact wiring.
- `VirtualScroll.tsx` — replaces native scrolling on one Frame with a
  JS-owned position, for a step needing a real zero-tolerance one-way
  scroll lock (native scroll + a JS veto can't give that without
  jank — see the file's own top comment). One export per container,
  same convention as `TutorialTargets.tsx`: `VirtualScrollTravelContent`
  (id `"scrollable-content"`, Travel Notice page) and
  `VirtualScrollCardAlertsContent` (id `"card-alerts-scroll"`, Card
  Alerts tutorial page). **Never apply the same export to a second
  container** — its id keys a single shared registry entry, so two
  containers under the same id race for it and whichever last
  registers "wins," leaving the other with a lock that was never
  really applied to IT. This exact mistake (reusing
  `VirtualScrollTravelContent` on the Card Alerts page instead of
  adding a second export) was reported as "still able to scroll up"
  on a step that should have been locked.

  `lockScrollWhileActive`/`releaseFloor` (a one-way ratchet — forward
  motion always allowed, and it deliberately outlives the step that
  set it) is a different tool from `TutorialOverlay`'s
  `freezeScrollWhileActive`/`freezeHere`/`unfreeze` (stops motion in
  BOTH directions, scoped strictly to the step's own lifetime — undone
  automatically once the step ends). Reach for freeze when a target
  needs to hold perfectly still while the user decides whether to
  interact with it (e.g. a toggle inside a scrollable list, where even
  continuing to scroll forward would slide it out from under their
  finger) — lock alone still permits that forward motion.

  `scrollToTop()` animates position back to 0 — used by
  `card-controls/card-alerts/CardAlertsSave.tsx`'s Save handler so the
  tutorial page is scrolled to top before navigating away, same as the
  base page's plain `scrollTo()`. That file is outside this
  `tutorials/` tree, so `getVirtualScroll` is also assigned to
  `window.__getVirtualScroll` for it to call — see the comment next to
  that assignment for why a static cross-folder import isn't safe here
  (it silently broke every export in `CardAlertsSave.tsx`'s Override
  picker the first time this was tried as an import, not just the one
  function that used it). Same-folder imports within `tutorial-
  overlays/` (e.g. `TutorialOverlay.tsx`'s own `./VirtualScroll.tsx`)
  remain the normal, safe way to reach this file — `window` is only for
  reaching it from a different top-level folder.

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
