# Credit Score tutorial — VirtualScroll and markers rebuild

Date: 2026-11-06. Status: awaiting the owner's review. Nothing built yet.

## Goal

Rebuild how every step of the Credit Score tutorial finds its target and
how the pages scroll, so it works like the owner's other tutorials:

- the scroll lock holds (frozen steps don't move at all);
- every highlight comes from a TutorialTargets target or marker;
- Skip glides on scroll steps, as in Card Alerts.

Covers both pages: `/credit-score-tutorial/score` and
`/credit-score-tutorial/alerts`.

**Keep the owner's changes.** The owner is revising the steps (text, new
step 3, hidden steps, renumbering, card and arrow styling). The rebuild
rewires the existing step layers; it never recreates, renumbers or
restyles them. Before changing anything in Framer, read its current state.

## Why

Both pages scroll natively today. Freeze scroll on a native page works by
swallowing touch and wheel gestures, which the owner finds hit or miss.
VirtualScroll owns the page position outright, so a freeze is exact.

## Terms (the owner's)

- **Target:** a TutorialTargets override on the real Framer layer
  (`withTutorialTarget`). Used for native layers: accordions, tabs, cards.
- **Marker:** an extra, empty, absolute-positioned frame placed on top of
  a code component, carrying a TutorialTargets marker override
  (`withTutorialMarker`: no fill, no link, `pointer-events: none`, so taps
  reach the component underneath). Used only for code components. The
  owner can move and resize a marker on the canvas, which is also how a
  step gets more room around its highlight.

## Part 1: scrolling

- On both pages, Scrollable Content's override changes from
  `CreditScoreScrollTarget` to `VirtualScrollGeneral`. Every step's
  **Scroll container ID** changes from `cs-scroll` to
  `scrollable-content`.
- Frozen steps use VirtualScroll's freeze (position ignores all input).
- **Snap to threshold** is extended to VirtualScroll pages: when a scroll
  step's threshold is crossed, the position is set exactly to the
  threshold, so a fast swipe can't overshoot (the 4 Nov problem). Snap is
  off in Card Alerts, so it is unchanged.
- Skip on a scroll step uses VirtualScroll's `scrollToPercent` (0.5 s
  glide). With Snap on, it lands on the threshold itself, not 1% past.
- Opening an accordion makes the page longer; VirtualScroll re-measures
  (ResizeObserver), and percentages keep meaning "how far down the page".
  The scroll % are re-measured live under VirtualScroll and changed only
  where a step's spot moved.
- Touch drags inside the page (sliders, chart) aren't a problem during
  the tutorial: the drag steps are frozen, and on scroll steps the dim
  blocks them.
- Free-play pages keep native scrolling: nothing there changes.

## Part 2: targets and markers

Target IDs stay the same, so the step layers keep their Target ID. The
tag moves from code to a target or marker; each old in-code tag is
removed as its replacement goes in, so no ID exists twice.

| ID | Thing | Kind | Today |
|---|---|---|---|
| `cs-gauge` | credit score gauge | marker | `withCreditScoreTutorialStart` |
| `cs-score-rating` | Score Rating accordion | target | `ScoreRatingTarget` (keep) |
| `cs-points-journey` | Points Journey bar | marker | `PointsJourneyTarget` |
| `cs-payment-history`, `cs-credit-usage`, `cs-credit-age` | the three accordions (tapped closed) | target | keep |
| `cs-payment-history-detail`, `cs-credit-usage-detail`, `cs-credit-age-detail` | each open accordion's Grade Section | target | keep |
| `cs-simulator-tab`, `cs-goals-tab` | section tab cells | target | keep |
| `cs-pay-down` | Pay down row's field | marker | `PayDownRow` |
| `cs-on-time` | on-time row's field | marker | `OnTimeRow` |
| `cs-missed-payment` | missed payment row's months | marker | `MissedPaymentRow` |
| `cs-simulated-score` | Simulator score header | marker | `SimulatedScoreTarget` |
| `goal-setup-start`, `goal-score-slider`, `goal-months-slider`, `goal-setup-next` | GoalSetupCard's button, sliders, Next | marker | tagged inside GoalSetupCard.tsx |
| `cs-alerts-tab` | top nav's Alerts tab | target | `AlertsTabTarget` (picks the tab in code) |
| `cs-alert-payment-history`, `cs-alert-monitoring` | Alerts page cards | target | `AlertsFeedTargets` (by layer name) |

The last step on each page has no target (a timed card).

**Placement.** Each marker sits in the same frame as the component it
covers, pinned to its edges, so it moves with it when an accordion above
opens or the page scrolls. Markers go only into tutorial copies (Section
Tabs Tutorial and the tutorial pages), never into components shared with
free play. Where a code part sits inside a shared component instance, the
marker goes in a frame wrapping that instance on the tutorial page. Each
placement, and whether the Alerts tab and alert cards are selectable
layers in the tutorial copy, is confirmed in Framer before building; if a
target's layer is inside a shared component, it gets a marker instead,
and the owner is told.

## Part 3: code changes

- **TutorialTargets.tsx**, Credit Score section: one marker export per
  marker above and one target export each for `cs-alerts-tab` and the two
  alert cards, in step order, with the section's comment updated.
  `CreditScoreScrollTarget` stays (removing an export breaks any layer
  still using it) but goes unused.
- **CreditScoreTutorial.tsx**: the `tagged()` target code comes out.
  Behaviour stays: clearing the goal when the tutorial opens and leaves,
  the Simulator rows' events, Skip's taps on the rows and sliders.
  Exports keep their names (they're on layers); ones left with nothing to
  do (`PointsJourneyTarget`, `SimulatedScoreTarget`, `AlertsTabTarget`,
  `AlertsFeedTargets`) become pass-throughs, and their layers' overrides
  are switched to the new ones.
- **GoalSetupCard.tsx** stops setting `data-tutorial-target`; its
  `<target>-done` events keep their names.
- **VirtualScroll.tsx**: the handle gets an instant `setPercent(percent)`
  for Snap. **TutorialOverlay.tsx**: Snap and Skip use it on a
  VirtualScroll container.
- Skip's simulated taps already use `elementFromPoint`, which passes
  through a `pointer-events: none` marker to the component underneath.
- Every changed `.tsx` follows CLAUDE.md: sync Framer's copy first,
  type-check, paste with `LANG=en_US.UTF-8 pbcopy`, copy back and compare.

## Framer work

1. Swap Scrollable Content's override to `VirtualScrollGeneral` (both
   pages).
2. Set every step's Scroll container ID to `scrollable-content`.
3. Add the marker frames, apply the target overrides, remove the old
   ones.
4. Re-measure scroll % live; change only the steps that moved.

## Testing (live site, 1080×1920, pane shown)

Both pages, every step:

- each scroll step with a real wheel scroll and with Skip: glides, lands
  on its threshold, the next step's highlight matches its target;
- each frozen step: a wheel and a drag leave the position unchanged;
- each tap step with a real tap; the Simulator and Goals steps including
  the slider drags;
- Skip from step 1 runs through to `/credit-score-tutorial/complete`;
- each marker's highlight lines up with its part, including after
  accordions open;
- free play: `/base-pages/credit-score-score` scrolls normally and the
  gauge's ⓘ opens its pop-up.

Known gap at the time of writing: the live run stops after the Points
Journey step (a step-number gap from the owner's in-progress
renumbering). Testing reports the exact number if it's still there.

## Out of scope

- Changing step text, order, timing or styling (the owner's).
- The free-play pages and the other tutorials.
