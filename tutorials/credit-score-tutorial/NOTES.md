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
- **Cards and arrows:** card centred on the target (Goals, Set Up and
  Next are aligned 40 px in from the screen edge instead), offset 144 px
  from it; bounce arrow, size 300, in that gap with its tip at the
  target (rotation 0, offset Y −14 above; rotation 180, offset Y
  target height + 14 below). Scroll and final cards are centred in the
  content area (offset Y 38).
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
