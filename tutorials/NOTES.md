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

- `TutorialOverlay.tsx` — the per-step instruction card + hole + glow
  (one instance per tutorial beat, configured entirely from the
  Properties panel). Every effect that starts a timer, a
  `requestAnimationFrame` loop, or a global `window` listener checks
  `RenderTarget.current() === RenderTarget.canvas` FIRST — on an 8-step
  page (this file's own doc mentions pages with several steps) that's
  up to 8 mounted instances at once, and before this check existed all
  of those effects also ran at design time: a rAF loop re-measuring the
  DOM every frame, global click-blocking that ate every click in
  Framer's own editor (no real target exists on canvas, so its
  "clicked inside the hole" check was always false), and a non-passive
  wheel/touchmove hijack on `window` that — being the one listener not
  scoped to whichever step is actually active — was ALSO applying a
  single scroll gesture once per mounted instance in real
  Preview/Published, not just once. Keep any new effect following the
  same `isCanvas ||` first-check convention. Also owns the shared
  same-page step counter (`pageGroup`/`stepNumber` handoff between
  several instances on one page) directly in this file — this briefly
  lived split out in its own `PageStepState.tsx` so `TutorialCongrats.tsx`
  could reach it without importing all of this file, but that component
  was removed as unused (see the note under
  `TutorialCongratsAutoRedirect.tsx` below), leaving `TutorialOverlay.tsx`
  as the step counter's only consumer again — so it moved back to one
  file rather than keep a split that no longer served a purpose.
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
- `TutorialCongratsAutoRedirect.tsx` — a classic-style Override (same
  shape as `FingerprintDelayedNavigation`, a plain function returning a
  props patch — not the wrap-the-whole-component style tried twice
  before for this same job) for a DEDICATED congrats page whose finish
  screen is a custom-built Frame (e.g. a third-party confetti component
  plus a keyframe pulse, assembled on the canvas). Attach it directly
  to that Frame's own Code Override slot. It fires `window.location.href` to
  `EXIT_LINK` after `AUTO_REDIRECT_SECONDS` (plain constants at the top
  of the file — Overrides don't get a property panel), timed via a
  `useEffect` called inside the override function (Framer's classic
  Override runtime supports calling hooks this way) rather than by
  wrapping/re-rendering the layer. Returns `{}` — it never touches the
  layer's own props or children, so there's nothing to reference, wrap,
  or break. No "X"/skip button here: a classic Override can only patch
  props onto the ONE layer it's attached to, it can't add a sibling
  element — draw the skip button as a real layer instead (any shape + a
  native Framer Link to the same exit path), on top of the animation on
  the canvas. Getting the user TO this page is the tutorial step's own
  job, not this override's — a `TutorialOverlay.tsx` step already does
  real page navigation (a tap on its real target, or its own
  `autoAdvanceAfterSeconds` + `autoAdvanceLink` for a no-tap "watch
  this, then move on" beat pointed at this page's path); no
  `pageGroup`/step coordination is needed here, since arriving at the
  page IS the trigger.

  Two earlier, now-abandoned versions of this same job, kept here as a
  record of what NOT to repeat: a Code Component taking the custom
  Frame as a `ControlType.ComponentInstance` property on a separate
  wrapper layer (crashed Framer's canvas the instant the property was
  assigned, before any of that file's own code even ran — this project
  has hit that exact class of bug before, see `TutorialOverlay.tsx`'s
  own top comment on why its arrow is hand-built SVG rather than an
  embedded ComponentInstance, and this repo's git history — deleted
  `OverlayPortal.tsx` / `OverlayOverride.tsx`); then a wrap-the-component
  Override (`withCongratsGate`, attached directly to the real layer,
  avoiding the crash) that fixed that specific bug but still re-rendered
  the whole Frame through `<Component {...props} />`, adding an
  unnecessary layer of indirection this file's plain props-patch
  approach doesn't need at all.
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

### Archived: `FocusGuide.tsx` / `SpotlightOverlay.tsx`

Not currently used on any tutorial page — moved to
`archived/tutorial-overlays/`. See `archived/NOTES.md` for what each
did and, importantly, a noted future need: a "show which elements are
clickable" affordance for the free-exploration base pages, which
neither file solves as-is but which `FocusGuide`'s glow technique is
the likely starting point for.

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
