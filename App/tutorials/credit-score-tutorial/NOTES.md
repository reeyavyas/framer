# Credit Score Tutorial — Notes

Spec: `docs/superpowers/specs/2026-11-04-credit-score-tutorial-design.md`.
Pages: `/credit-score-tutorial/score` (copy of the free-play Score page)
and the owner's `/credit-score-tutorial/complete`. `/alerts` is also in
the folder (owner's copy) but the tutorial doesn't use it yet.

## What it teaches

Snapshot (gauge, Score Rating), review (Payment History, Credit Usage,
Credit Age), act (Simulator: pay down, on-time, a missed payment and
undoing it), decide (set a goal). The score starts at 720 and ends on
742: 720 + 15 (pay down) + 7 (on-time) = 742, −45 for one missed month
(697), back to 742 when it's undone.

## Framer setup (rebuilt 5 Nov 2026)

Rebuilt to match the owner's other kiosk tutorials (read from all 22
pages: Account Controls, Card Controls, Log Off, PIN Reset). The step
table is in the spec (`docs/superpowers/specs/2026-11-04-credit-score-tutorial-design.md`).

- **33 overlay layers** in Screen Content, named "01 Scroll to score" …
  "33 Goal set", page group `credit-score-tutorial`. Scroll steps are
  copies of Travel Notice's teal "Please scroll down" step; the others
  are the earlier navy layers (Account Controls styling). 33 keeps the
  old step 19's Auto-advance link to `/credit-score-tutorial/complete`.
- **Step types:** scroll (no target, Teal, Scroll advances at a %, not
  frozen); read (7 s + progress bar + Next, frozen); tap or event
  (frozen); final (4 s + progress bar + Next). Every non-scroll step has
  Freeze scroll on with Scroll container ID `cs-scroll`.
- **No auto-scroll.** Scroll % were measured at 1080×1920 on the
  free-play page (same layout); see the spec. Each % is position over
  scrollable range at that point, so it depends on which accordions are
  open: changing an accordion's content means re-measuring the later
  steps.
- **Cards and arrows** (owner, 5 Nov: tie card > arrow > target):
  curved arrow, size 340, beside the card's side and curving onto the
  target; the card is aligned to one side of the target to make room
  (Card position X right with the arrow on its right; left with Reflect
  X on for Set Up and Next). Card offset Y 48; arrow offset Y −24 with
  the card above, target height + 24 with Reflect Y on below. Steps 23
  and 25 keep the straight bounce arrow on its own line under the card
  (offset X −309, Y 122, at "1 mo."). Step 1 snaps at 5% so the gauge
  sits low enough for steps 2–3's cards above it. Scroll and final cards
  are centred in the content area (offset Y 38).
- **Targets:** `cs-scroll` (TutorialTargets `CreditScoreScrollTarget`)
  on the page's Scrollable Content. `cs-points-journey`
  (`PointsJourneyTarget`) on Score Rating Tabs' PointsJourneyBar;
  `cs-payment-history-detail`, `cs-credit-usage-detail`,
  `cs-credit-age-detail` on each accordion's Grade Section;
  `cs-simulated-score` (`SimulatedScoreTarget`) on Section Tabs
  Tutorial's SimulatorScoreHeader. These sit in shared components and
  only add the attribute. Accordion tap steps keep the accordion-instance
  targets (the hole is the header because they're tapped while closed).
  Simulator rows tag only their field (the $0 box, the months buttons).
  GoalSetupCard tags its sliders (`goal-score-slider`,
  `goal-months-slider`) and fires `<target>-done` when one is let go.
- **Code:** TutorialOverlay's Scroll into view is gone. Freeze now holds
  a native page still (the overlay's gesture listener stops passing
  touch/wheel on), and the hole is clipped to the target's visible part
  of its scrolling frame.

## Score ranges info (added and removed 5 Nov)

Steps for the gauge's ⓘ (tap it, read the ranges pop-up, tap its ✕)
were built and passed a live test, then removed at the owner's request
(they don't want visitors tapping the ⓘ). The three layers are deleted,
steps are back to 1–35, and CreditScoreGauge.tsx no longer carries
tutorial ids.
Checked live after the publish: real wheel and Next taps on 1–3, step 3
goes straight to "Let's see what shapes your score."; the gauge has no
`cs-gauge-*` ids; Skip from 4 runs through every step in order to 35
(Tap Alerts).

6 Nov: the tutorial page's gauge keeps its ⓘ, but tapping it does nothing
(CreditScoreGauge **Info Pop-up: Off** on `/credit-score-tutorial/score`).
`/base-pages/credit-score-score` keeps it On; checked live there: ⓘ opens
the pop-up, and ✕, a tap outside and Escape each close it.

6 Nov: Skip on a scroll step now glides (0.5 s, same as VirtualScroll's
scrollToPercent) instead of jumping. With Snap to threshold it lands on the
threshold's own pixel, so it can't overshoot (the 4 Nov reason for the jump).
Checked live 6 Nov on the first two scroll steps: about 30 frames over
0.48 s, landing at 5.01% and 30.01% (thresholds 5 and 30).

6 Nov: TutorialOverlay has **Hole padding X** (px each side, default 0) to
widen a hole past its target; for the Points Journey step (spec step 7).

## VirtualScroll and markers rebuild (6 Nov)

Spec: `docs/superpowers/specs/2026-11-06-credit-score-tutorial-virtual-scroll-design.md`.
Built to match the owner's Card Alerts tutorial (read from Framer first).

- **Scrolling:** both pages' Scrollable Content now has
  `VirtualScrollGeneral` (was `CreditScoreScrollTarget`). Every step's
  Scroll container ID is `scrollable-content`. Snap to threshold is Off on
  every scroll step, as in Card Alerts (on a VirtualScroll page it would
  pull the page back under a dragging finger).
- **Sticky:** VirtualScroll moves content by transform, so CSS sticky
  can't stick. It now pins Sticky layers by hand (the Simulator's Score
  Header Card), within their parent, like native sticky.
- **Markers** (copies of the Card Alerts Save marker: absolute, no fill,
  `withTutorialMarker`), each named "<id> marker", pinned top-left:
  - tutorial Score page, Scrollable Content: `cs-gauge` (40, 1061)
    1000×690; `cs-alerts-tab` (581, 25) 97×123.
  - Section Tabs Tutorial (shared by its variants): Score Header Card
    `cs-simulated-score` (50, 328) 926×264; Manage Your Balances Card
    `cs-pay-down` (50, 665) 926×104; Manage Payment Activity Card
    `cs-missed-payment` (50, 375) 926×108 and `cs-on-time` (50, 590)
    926×104; Goal Setup Card `goal-setup-start` (40, 876) 454×100,
    `goal-score-slider` (40, 850) 946×124, `goal-months-slider`
    (40, 1171) 946×52, `goal-setup-next` (40, 1589) 219×100.
  - Score Rating Tabs (shared with free play; the marker is inert there),
    Points Journey Content: `cs-points-journey` (0, 207) 840×290. Step 7
    keeps Hole padding X 32.
  - tutorial Alerts page, Scrollable Content: `cs-alert-payment-history`
    (46, 811) 988×422; `cs-alert-monitoring` (46, 2146) 988×304.
  Positions were measured on the published pages at 1080×1920.
- **Code:** the old in-code tags are gone (CreditScoreTutorial.tsx keeps
  only behaviour; GoalSetupCard.tsx no longer tags). `PointsJourneyTarget`,
  `SimulatedScoreTarget`, `AlertsTabTarget`, `AlertsFeedTargets` are
  pass-throughs still on their layers; safe to remove from the layers.
- **First live check (6 Nov) found two VirtualScroll bugs, fixed:**
  1. Framer sets a Stack's layout (gap, alignment) with a CSS class on
     the published site, not `props.style`, so VirtualScroll's content
     wrapper lost Scrollable Content's gap 50 and centring: the gauge sat
     40 px left and 100 px up, out of its marker. The wrapper now copies
     the frame's computed layout. Confirmed in-page: gauge 40,1348
     1000×690 = marker.
  2. The scroll range went stale after the Section Tabs switched from a
     long tab (accordions open, ~18,700 px) to Simulator (~7,700 px):
     the page scrolled into blank space and step 19's 70% was never
     reached. VirtualScroll now reads the range fresh on every move.
  Also the Points Journey marker's Top hadn't saved (was 1061); retyped
  to 207 and re-read after reselecting. The other eight Section Tabs
  markers were re-read and are right.
  The layout fix applies to every VirtualScroll page (Card Alerts, Travel
  Notice, Card Controls 1 and 3): their content now gets their frame's
  gap and alignment, as on the canvas. Check those after the publish.

### Owner's second round (6 Nov)

- **Grade A read steps (10, 13, 16):** the Grade Section's text starts at
  its left edge with ~34 px spare on the right, so the hole looked padded
  only on the right. Hole padding X 24 on all three.
- **Step 15's card overlapped the top nav** at 72% (card top 259, nav
  ends 287). Step 14 now scrolls to 71%, about 170 px less.
- **Stops varied run to run:** with Snap off, where a manual scroll stops
  depends on the overshoot, so rows landed under the pinned Simulator
  header (1 mo. hidden, highlight looking off). Snap to threshold is back
  On for every scroll step on both pages. Here the next step freezes as
  soon as Snap settles the page, so it doesn't fight the finger (the
  reason I'd turned it off, which was wrong for this tutorial).
- **Field-only markers:** `cs-pay-down` (52, 667) 714×100 and
  `cs-on-time` (156, 592) 714×100, the $ box without the −/+ buttons.
- Measured at the exact stops: step 23's 1 mo. row at 970 (header ends
  929); step 24's marker = the two gauges (77, 615) 926×264.

### Live test (6 Nov, after the second round), 1080×1920

Real wheel scrolls (10-tick overshoots) and real taps:
- Score page steps 1–23 all pass; 24–35 are hidden by the owner, so the
  run ends after the 1 mo. tap (simulated 697 shown).
- Every scroll step snapped to exactly its threshold (5, 30, 35, 48, 62,
  71, 11 up, 71, 85). Frozen steps ignored further scrolling.
- Holes matched targets: gauge 40,971 1000×690; Points Journey bar with
  32 px each side; Grade sections with 24 px each side; Pay down and
  On-time on the $ box only (714×100); 1 mo. row at 1033, below the
  pinned header (ends 929).
- No card under either nav; step 15's card top at 576.
- Alerts page: 10% and 56% exact; both cards' markers equal the cards;
  ends on /complete. Skip on step 4 went straight to /complete (step 5's
  card didn't pause) — not looked into.
- Other VirtualScroll pages (card-controls-1, travel-notice,
  card-alerts-1) have frame gap 0 and full-width children, so the layout
  fix changes nothing there; card-controls-3 has no VirtualScroll.

- 6 Nov: SimulatorScoreHeader has **Reset Tap** (On / Off, default On);
  Section Tabs Tutorial's header is Off, so Reset shows but does nothing
  in the tutorial. Free play keeps On.
- 6 Nov: `cs-alerts-tab` marker enlarged 20 px each side: (561, 5)
  137×163.

- 6 Nov: step 14 back to **72%**. At 71% step 16's Credit Age Grade
  section ended at 1709, against the bottom nav (1710), and the freeze
  stopped the visitor scrolling to it. The earlier step-15 overlap at 72%
  was measured at 73% (Skip +1%, Snap off); at exactly 72% the card top
  should be ~418 and the Grade section end ~1551 (to check live).

## Alerts overview (added 5 Nov)

- **Score page:** step 33 is now a 7 s read; 34 scrolls up to the top
  (the Credit Score Top Nav scrolls with the page); 35 taps Alerts. The
  page's Top Nav instance has Alerts Link `/credit-score-tutorial/alerts`
  (instance property, free play keeps its own) and `AlertsTabTarget`
  (CreditScoreTutorial.tsx), which tags just the Alerts tab.
- **Alerts page:** five layers in Screen Content ("01 Scroll to alerts"
  … "05 All caught up"), page group `credit-score-tutorial-alerts` (its
  own group: the Score page's group would still be on step 35 after the
  in-app navigation). Scrollable Content has `CreditScoreScrollTarget`;
  the shared Alerts Feed instance has `AlertsFeedTargets`, which tags
  "Alert Payment History" and "Alert Monitoring 1" by layer name. Scroll %
  measured at 1080×1920 (range 2910 px): 10% puts the Payment History card
  at 807, 56% puts the first monitoring card at 802. Read cards above
  their card, right-aligned 202 px in, arrow at their right side. Step 5
  has Next and Auto-advance (4 s) links to `/credit-score-tutorial/complete`.
- While renaming, a select-all ran on the canvas and typed characters
  acted as shortcuts on the Alerts page's top layers; undone (opacity and
  size checked against the Score page: 100%, 1080×1920). Worth a look by
  eye on the canvas.

Live test 8 (after the publish, 1080×1920): Score page skipped to 33,
then real input: Next on 33 → 34; wheel up to the top → 35 (curved arrow
on the Alerts tab); real tap on Alerts → `/credit-score-tutorial/alerts`
step 1; wheel down snaps at 10% → step 2 (card 348–735, arrow tail at its
right side, tip 7 px above the Payment History alert); Next → 3; wheel
down snaps at 56% → 4 (card 296–731, tip above the first monitoring
alert); Next → 5; the 4 s timer and, in a second run, Next (left in
under 0.8 s) both reach `/complete`. Free play unchanged: its Alerts tab
still links to `./credit-score-alerts`, and its Alerts page has no
targets or overlays. Step 35's card wraps "to see what has changed." onto
two lines.

## Live test 7 (5 Nov, side arrows)

Built-in browser, 1080×1920, all 33 steps by Skip, measured from the
DOM: on every curved-arrow step the arrow's tail sits 15 px off the
card's side within its height and the tip lands 5–7 px from the target's
edge; every card stays 40 px from the screen edges and inside 287–1710
(step 1's 5% snap puts the gauge at 971–1661). Checked by eye on 2, 20
and 29 (mirrored). Wrapping splits "300–850" over two lines on step 2's
card (copy is the owner's to edit).

Owner found: **Next on step 33 ("Your goal is set!") went nowhere**, just
closed the overlay. Only Auto-advance had the link; Next on the last
step of a group needs its own **Next button link**, now
`/credit-score-tutorial/complete`. Checked live after the publish: Next
tapped 0.6 s after the card showed, page on `/complete` ("Well done!")
well before the 4 s timer.

## Live test 6 (5 Nov, rebuild's first publish)

Built-in browser, 1080×1920, pane showing; real taps and drags, scroll
steps set by script to their exact % (as the snap below now does).
All 33 steps ran: gauge 720, Score Rating / Payment History / Credit
Usage / Credit Age open on tap, read cards above their targets with the
arrow in the gap; Simulator 735 → 742 → 697 → 742 with field-only
holes below the pinned header; Goals tab, Set Up, score slider (818,
moved on when let go), months slider (18), Next saves; final card →
`/complete`. Cards stayed inside 287–1710 except as noted.

Found and fixed (needs the next publish):
- **Overshoot:** three wheel ticks scrolled 360 px past step 1's 7%, so
  the gauge rose and step 2's card went over the top nav. New
  TutorialOverlay setting **Snap to threshold** (native containers,
  off by default so Card Alerts is unchanged) settles the page exactly
  at the threshold when it's crossed; on for all 11 scroll steps.
- **Step 18's card touched the right edge** (centred on a tab right of
  centre). Centred cards now keep 40 px (`CARD_EDGE`) from both edges.
- **Steps 23 and 25's arrow pointed at "2 mo."**: Arrow offset X −309,
  over "1 mo."
- **Step 24's arrow sat on its card** (the header is 264 px tall, not
  600): Arrow offset Y 278, offset X 280 (at the simulated score).
- TutorialOverlay's `hidden` callbacks now take `Partial<Props>`
  (CLAUDE.md rule; 36 of them).
- **Skip on a scroll step overshot** (its smooth scroll carried on past
  the snap). With Snap to threshold on, Skip now jumps straight there.
- **Arrows switched to curved** (owner, 5 Nov: use the curved arrow,
  the straight one only a little); straight kept on 23 and 25. Then
  moved beside the cards (above). Left- and right-aligned cards now keep
  `CARD_EDGE` from the far screen edge and wrap, like centred ones.

## Live test 1 (4 Nov, first publish)

Chrome, real clicks (the window here is 823×380 and can't be made
kiosk-sized, so targets were scrolled on screen by script first;
screenshots time out on the live site, so checks read the DOM).

- Passed: steps 1–2 time out after 7 s each with the right text; taps on
  the Score Rating, Payment History, Credit Usage and Credit Age headers
  open each accordion and move on; Skip on the read steps moves on;
  Simulator tab tap opens it on 720; Goals tab tap; Set Up Your Goal
  opens the form; Next saves, step 19 shows and the page goes to
  `/complete` ("Well done! … CREDIT SCORE").
- Found and fixed (needs the next publish):
  1. **Gauge and Simulator rows had no hole.** Code components don't put
     a `data-tutorial-target` prop on the page, so the overlay blocked
     every tap on steps 12–15 (Skip was the only way on).
     `CreditScoreTutorial.tsx` now tags the Framer container the
     component renders in (a hidden marker's parent).
  2. **Targets below the fold.** TutorialOverlay never scrolled to its
     target, and the accordions start well below the gauge. New
     TutorialOverlay setting **Scroll into view** (off by default, so
     other tutorials are unchanged): a target that fits is centred, a
     tall one (an open accordion) gets its top a third of the way down.
     On for steps 1–18.
  3. **Read-step cards off screen.** Steps 4, 6, 8 and 10 highlight the
     whole open accordion (2,600–3,700 px tall here), so a card below it
     was off the page. Those steps now put the card **above** the target,
     with the arrow hidden.
  4. **Step 18 blocked the sliders.** It highlighted only Next. Now it
     highlights the whole goal card (`goal-setup-card`, tagged in
     GoalSetupCard) and waits for `cs-tutorial-goal-set`, which
     `withCreditScoreTutorialStart` fires once a goal is saved; Skip
     there taps Next. Card above, arrow hidden.
- Framer's TutorialOverlay.tsx had newer edits than the repo (the card
  only renders when it has content, plus Prettier wrapping); the repo now
  holds Framer's text plus the Scroll into view setting.

## Live test 2 (4 Nov, second publish)

Built-in browser emulating 1080×1920 with the pane showing (a hidden
pane runs no animation frames, so the hole and smooth scroll freeze
there; Chrome's window here is only 823×380). A pointermove every 4 s
kept the kiosk's inactivity timer from sending the page to `/app`.

- Passed with real taps: steps 1–2 (gauge scrolled into view); 3, 5, 7, 9
  (each accordion scrolled to the middle, opens on tap, moves on); 11
  (Simulator opens on 720); 12 (pay down → 735 ▲15); 13 (on-time →
  742 ▲22); 14–15 by positioned taps (1 mo → 697, undo → 742); 16
  (Goals); 17 (Set Up Your Goal); 18 (slider dragged to 781 without
  moving on, page scrolls during the step, Next saves) → 19 → `/complete`
  → `/tutorials`.
- Found and fixed (needs the next publish):
  1. **Skip on 12–15 and 18 did nothing.** The overrides used
     `el.click()`, which has no position, so the overlay blocked it as a
     tap outside the hole. They now send a positioned tap (`tapAt`), like
     the overlay's own Skip.
  2. **Rows under the pinned Simulator header.** Step 14's row was
     already "on screen" but behind the sticky Score Header Card, and
     rows' labels hid under it on 12–13. Scroll into view now treats a
     sticky header at the top of the scrolling frame as covering it, and
     measures the visible area from the frame (below the app header and
     tabs) instead of the window. Checked on the live page: the header's
     bottom is found (929) and the missed-payment row lands at 1171–1468.
  3. **Read-step cards still below.** The "Above target" change hadn't
     saved: Card position Y is a select, not a segmented control. Now set
     (`_string_top`) on 4, 6, 8, 10 and 18 and confirmed after reselecting.
  4. **Step 17's card squeezed** into a narrow column (right-aligned to a
     narrow button near the left edge). Now Align left edge, offset X 0.
- A hand-eased scroll was tried and dropped: smooth scrollBy works in a
  visible browser; it only stalled in the hidden pane.
- Owner (4 Nov): no Credit Score card on the tutorials page yet.

## Live test 3 (4 Nov, third publish)

Same setup as test 2 (built-in browser, 1080×1920, pane showing).

- Passed, real taps unless noted: steps 1–2 (gauge highlighted with its
  card and progress bar); 3, 5, 7, 9 (each accordion centred in the
  visible frame, opens on tap); 4, 6, 8, 10 (card **above** the open
  accordion, its Next button tapped); 11 Simulator on 720; Skip on 12
  (735) and 13 (742); 14 row below the pinned header, real tap on "1 mo"
  (697); Skip on 15 (742); 16 Goals; 17 card full width beside its
  button; 18 card above the goal card, Skip taps Next and saves; 19 →
  `/complete`. Exit (✕) on step 1 → `/tutorials`.
- Found and fixed (goes live with the next publish): the pay-down row on
  step 12 sat 11 px under the pinned Simulator header (label top clipped),
  because the header only pins once the frame has scrolled. Scroll into
  view now places the target again 700 ms later, when the header counts.
- Framer reformats one line of TutorialOverlay.tsx differently from the
  local Prettier (a `HTMLElement | undefined` cast); the repo keeps
  Framer's text.

## Live check 4 (5 Nov, fourth publish)

- The 700 ms second pass didn't fix step 12: the pay-down row still sat
  at 918 under the header's bottom (929). At 700 ms the first smooth
  scroll hadn't finished, so the header wasn't pinned yet. Run on the
  live page afterwards, the same check finds the pinned Score Header
  Card. The second pass now runs on the frame's `scrollend` event
  instead of a timer (it fired 184 ms after a short smooth scroll in the
  test browser). Saved in Framer; needs the next publish.

## Live check 5 (5 Nov, fifth publish), passed

`scrollend` version live. Step 12: pay-down row and its label at 1239,
fully below the pinned header (bottom 929). Real taps on 12–15: 735 ▲15,
742 ▲22 (on-time row at 1239), 1 mo → 697 (missed row at 1171), undo →
742, then step 16. Steps 1–11 reached with Skip.

## Not tested

- A second run straight after the first in the same session, and the
  free-play Score page afterwards via in-app navigation (742, no goal
  left over). There's no in-app link from the tutorials page to this
  tutorial yet (owner, 4 Nov: no tutorials card for now), so each run
  here started with a fresh page load, which clears the goal anyway.
- Inactivity part-way through (the kiosk timer sends the page to `/app`
  after about a minute without touches).
