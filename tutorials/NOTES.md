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

  Progress dots (`showProgressDots`/`progressIndex`/`progressTotal`) and
  the card background blur (`blurAmount`) were removed as unused —
  neither was reached for on any real tutorial step. The Exit (X)
  button's `showExitButton` on/off toggle was also removed since it's
  meant to always be visible; the button itself (and `exitLink`) stays.
  In their place: `showProgressBar`/`progressBarColor`/
  `progressBarTrackColor` — a linear bar that fills over
  `nextStepAfterSeconds` (purely visual, driven by a `framer-motion`
  `transition.duration` matching that same number, not a second timer —
  the actual hand-off to the next step is still the existing
  `nextStepAfterSeconds` `setTimeout` effect) — and `showNextButton`/
  `nextButtonLabel`/`nextButtonTextColor`/`nextButtonBackgroundColor`/
  `nextButtonFont` for a real tappable button inside the card. The
  progress bar is gated on `pageGroup` being set (like every other
  step-behavior control), since it visualizes progress toward the next
  step in a group. The Next button isn't: it calls the same
  `advanceStep()` a click/scroll/timer hand-off does when
  `nextButtonLink` is blank, but when `nextButtonLink` is set it
  navigates there instead — same optional-link convention as
  `autoAdvanceLink` below — so the same button works as "advance within
  this page group" on every step but the last, and "go to the next
  page" on the last step of a group or on a single-step page with no
  `pageGroup` at all. The button sits above its own progress bar in a
  shared wrapper. Space above the button is the card's own `gap: 24`
  (between `cardBody` and this wrapper) plus the wrapper's own
  `marginTop: 8` = 32px; space below the button, before the bar, is the
  button's own explicit `marginBottom: 32` — a real margin on the one
  element it's about, not the wrapper's flex `gap` (which would apply
  uniformly to every pair of children in the wrapper, not just this one
  relationship).
  `nextButtonFont` defaults to Inter Bold, baked in as the default
  rather than something to reset on every instance — the Font control
  still lets a given step override the family/weight/style. Getting a
  specific family to actually take as the default fought back hard
  before landing here: `defaultValue.fontFamily` set to Proxima Nova,
  then Area Normal — both custom/uploaded project fonts, not one of
  Framer's built-in Google Fonts — never actually took as the control's
  shown default (some other generic font rendered instead with
  `defaultFontType: "sans-serif"` also set; the field went blank with
  it removed). Inter is the project's own default font AND a Google
  Font, which Framer can resolve directly from a plain `fontFamily`
  string — that's what finally worked for the family itself.

  Font size is a SEPARATE `nextButtonFontSize` (`ControlType.Number`,
  default 34) rather than living inside `nextButtonFont`'s own size
  sub-field — that sub-field didn't reliably hold onto a set value once
  a real font family actually resolved (kept reverting to some other
  size on its own, even after the family itself was fixed). Applied in
  the button's style AFTER the `...nextButtonFont` spread so it always
  wins regardless of whatever that object's own (untrusted) `fontSize`
  might be.

  `cardWrapperStyle()` positions the card two different ways depending
  on whether a target `rect` was actually measured. With one, it's
  target-relative: `cardAnchorX`/`cardAnchorY` anchor to the target's
  edges (with a `CARD_TARGET_GAP` of 24px for top/bottom), and
  `cardOffsetX`/`cardOffsetY` nudge from there. With none (`target` left
  blank, or not found — e.g. a closing "all set" card with no hole),
  it falls back to screen-relative: `cardAnchorY` still anchors to a
  fixed point (100px from the top, 90px from the bottom, or vertically
  centered), but `cardAnchorX` is now ignored — the card is always
  horizontally centered, since there's no target to anchor left/right
  against. `cardOffsetX`/`cardOffsetY` keep meaning the same thing in
  both modes: a plain nudge (positive X right, positive Y down) from
  wherever the anchor would otherwise place the card.

  Both the no-target case and the target-relative `"center"` x-anchor
  share `CARD_MAX_WIDTH` (900, the card's own `maxWidth` — now a shared
  constant instead of a number hardcoded separately in the card's own
  style) and the same underlying fix for the same bug: a fixed-position
  box with only `left` set (no `right`) has its shrink-to-fit
  "available width" computed as (containing block width − `left`), with
  no idea a later `transform: translateX(-50%)` will shift it back — so
  `left:50%` (no target) or `left: <target's center>` (with one, for
  `"center"`) caps the box's width well below `CARD_MAX_WIDTH` whenever
  that point isn't near the left edge, regardless of how much the
  content actually wants or how much room is really on screen. The
  no-target case fixes it by spanning the full viewport
  (`left:0, right:0`) and centering the card within that with
  `display:flex` + `justifyContent:center`. The target-relative
  `"center"` case can't span the full viewport — it has to stay
  anchored to the target's position, not the screen's center — so it
  sets `left`/`right` symmetrically around the target's own center
  point instead (clamped to 0 past either edge, same clamp the
  `"right"` anchor already uses), which gives the browser a real,
  non-ambiguous width to resolve directly with no shrink-to-fit or
  transform involved; `display:flex` + `justifyContent:center` then
  centers the card WITHIN that now-fixed-width span, since the span
  itself no longer shrinks to the card's actual content size. The
  `"right"` anchor above already avoided this same class of bug on
  purpose from the start — see its own comment — it just hadn't been
  applied to either `"center"` case yet.

  There's no Y-axis version of that same bug: `height: auto` for a
  block element doesn't have the shrink-to-fit "available space"
  ambiguity `width: auto` does, and the `"center"` `cardAnchorY`'s
  `translateY(-50%)` is computed against the element's real rendered
  height after layout, not before it — so it isn't vulnerable to the
  same trick. A "card sits farther down than expected even at
  cardOffsetY: 0" report traced to something else instead: `cardAnchorY`
  had two disagreeing defaults — `TutorialOverlay.defaultProps` said
  `"top"`, but the actual property control (the one that governs what a
  freshly-dropped Framer instance actually gets, same lesson as
  `nextButtonFont`'s font-resolution saga above) said `"bottom"`. At the
  real default of `"bottom"`, `cardOffsetY: 0` correctly parked the card
  90px above the screen's bottom edge — exactly the "bottom" anchor's
  job, just not what was expected of a 0 offset. Both now say
  `"center"` (confirmed as the intended no-target default) so they
  agree, and a repo-wide sweep turned up no other Boolean/Enum/Number
  control with this same defaultProps-vs-control mismatch.

  `glowDelaySeconds` (and the `glowShown` state/timer effect that only
  existed to support it) was removed as unused — the glow now just
  shows immediately whenever `showGlow` is on, same as it always did
  once its delay elapsed, just without a delay to configure at all.
- `TutorialTargets.tsx` — Override that tags a layer so
  `TutorialOverlay` can find/measure it. Carries the full live export
  list as of the last sync (`MoreTabTarget`, `CardControlsTarget`,
  `CardToggle`, `TravelNotice`, `TravelScroll`, `SetCardAlerts`,
  `TravelStart`, `TravelEnd`, `TravelDestinations`, `TravelSave`,
  `TravelNoticeShown`, `CardAlertsToggleTarget1`/`2`/`3`,
  `CardAlertsSaveTarget`), added directly in Framer's own code editor
  and pulled back into this repo's copy — verify against the live
  Framer project before trusting this as the source of truth either
  direction. The marker exports (`TravelStart`/`TravelEnd`/
  `TravelDestinations`/`TravelSave`/`TravelNoticeShown`/
  `CardAlertsSaveTarget`) go through a separate `withTutorialMarker`
  helper that forces `pointer-events: none`, since each sits on top of
  a real field/button rather than being a separately tappable layer —
  without it, the marker itself would swallow the tap meant for the
  real element underneath. See `card-controls-tutorial/NOTES.md` for
  how the field markers and Card Alerts toggles/save are used.
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
  JS-owned position, for a step needing a real zero-tolerance freeze
  (native scroll + a JS veto can't give that without jank — see the
  file's own top comment). One export per container, same convention
  as `TutorialTargets.tsx`: `VirtualScrollTravelContent` (id
  `"scrollable-content"`, Travel Notice page) and
  `VirtualScrollCardAlertsContent` (id `"card-alerts-scroll"`, Card
  Alerts tutorial page). **Never apply the same export to a second
  container** — its id keys a single shared registry entry, so two
  containers under the same id race for it and whichever last
  registers "wins," leaving the other with a state change that was
  never really applied to IT. This exact mistake (reusing
  `VirtualScrollTravelContent` on the Card Alerts page instead of
  adding a second export) was reported as a Card Alerts step not
  behaving as configured.

  `TutorialOverlay`'s `freezeScrollWhileActive`/`freezeHere`/
  `unfreeze` stops motion in BOTH directions, scoped strictly to the
  step's own lifetime — undone automatically once the step ends. Reach
  for it when a target needs to hold perfectly still while the user
  decides whether to interact with it (e.g. a toggle inside a
  scrollable list, where even continuing to scroll forward would slide
  it out from under their finger). An earlier one-way ratchet
  (`lockScrollWhileActive`/`releaseScrollLockWhileActive`) that only
  blocked backward motion was removed as unused — freeze was the only
  one of the two actually reached for in practice.

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
