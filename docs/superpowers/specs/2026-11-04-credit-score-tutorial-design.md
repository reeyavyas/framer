# Credit Score tutorial — design

Date: 2026-11-04. Status: awaiting the owner's review. Nothing built yet.

## Goal

A guided, hands-on kiosk tutorial on the Credit Score pages that:

1. gives a snapshot of overall financial health through the credit score;
2. teaches ways to improve it, by reviewing payment history, credit usage
   and account age;
3. helps the visitor understand the score well enough to make informed
   decisions later.

Chosen approach: **Option B, "Raise your score"** (owner, 4 Nov). A short
snapshot, a review of three factors, then real taps on the Simulator and
Goals tabs. Option C (decision questions) was dropped because it repeats
the ATM Credit Score Challenge's questions. Option A (read-only tour) is
covered by B's first half.

## Approach

Same pattern as the Account Controls tutorial: a tutorial copy of the
Score page with `TutorialOverlay` steps on top. The real components run
underneath; the overlay only lets the visitor tap the current target.

- **Page:** `/credit-score-tutorial/score`, a copy of
  `/base-pages/credit-score-score`. No Alerts page step (kept the run
  short; see Out of scope).
- **Ending:** the existing congrats page pattern with
  `TutorialCongratsAutoRedirect`, then the tutorials main page.
- **Entry:** a Credit Score card on the tutorials main page carousel.

## One score throughout: 720

The free-play page mixes numbers: the gauge and Simulator say **742**,
while the accordions, Points Journey ("60 points away from Excellent")
and Goals are written for **720**. On the tutorial copy only, set:

- the gauge's **Score** property to 720;
- SimulatorScoreHeader's **Current Score** property to 720.

Both are properties, so this needs no code change. The free-play page is
left as it is. (Fixing it there too is a separate decision for the
owner.)

## Steps

Every step is one `TutorialOverlay` in one page group. "Tap" steps move
on when the target is tapped. "Event" steps move on when a component
fires its event. "Next" steps move on with the card's Next button. Skip
does the step's action for the visitor so later numbers still add up.

The figures are the Simulator's existing made-up values. None come from
the owner's screenshots.

| # | Target | Visitor does | Card text (draft) | Moves on |
|---|---|---|---|---|
| 1 | Gauge | reads | "This is your credit score: **720, Good**. Scores run from 300 to 850. Lenders use it to decide whether to lend to you and at what rate." | Next |
| 2 | Score Rating header | opens it | "Open **Score Rating** to see how close you are to the next level." | Tap |
| 3 | Points Journey panel | reads | "You're **60 points** from Excellent. Let's see what moves your score." | Next |
| 4 | Payment History header | opens it | "**Payment History** is the biggest part of your score (40%). Open it to see your grade." | Tap |
| 5 | Payment History body | reads | "Paying every bill on time keeps this grade high. Even one late payment can stay on your report for years." | Next |
| 6 | Credit Usage header | opens it | "**Credit Usage** is how much of your limits you're using (20%)." | Tap |
| 7 | Credit Usage body | reads | "Try to keep your balances below 30% of your limits. Lower is better." | Next |
| 8 | Credit Age header | opens it | "**Credit Age** is how long you've had credit (21%)." | Tap |
| 9 | Credit Age body | reads | "Older accounts help. Think twice before closing your oldest card." | Next |
| 10 | Simulator tab | taps it | "Now try it. Tap **Simulator** to see what changes your score." | Tap |
| 11 | Pay down row ($1,200) | taps it | "Pay down $1,200 of your balances." Score → **735 ▲15** | Event |
| 12 | On-time payments row | taps it | "Keep making payments on time." Score → **746 ▲26** | Event |
| 13 | Missed payment, 1 mo | taps it | "Now see what one missed payment does." Score → **701 ▼19** | Event |
| 14 | Simulated gauge | reads | "One missed payment undid both good moves. Paying on time matters most." | Next |
| 15 | Goals tab | taps it | "Set yourself a goal so you can track your progress." | Tap |
| 16 | Set Up Your Goal | taps it | "Tap **Set Up Your Goal**." | Tap |
| 17 | Goal form's Next | taps it (can drag the sliders first) | "Pick a score and a time frame, then tap **Next**." | Tap → congrats page |

That's 17 steps, about 3–4 minutes. Steps 3, 5, 7 and 9 can be merged
into the step before them (one card that says "open it" and then
explains) if the run feels long. That would bring it to 13.

## New code (smallest set)

Everything else is native Framer or the existing components.

- **`tutorials/tutorial-overlays/TutorialTargets.tsx`:** new target
  overrides in the existing pattern, one per row of the table that needs
  a target: gauge, the three accordion headers and bodies, Score Rating,
  Points Journey, the Simulator and Goals tab cells, the three Simulator
  rows, the simulated gauge, Set Up Your Goal and the form's Next.
- **`credit-score/SimulatorStore.tsx`:** one small read helper,
  `isOn(rowId)`, true when any entry for that Row ID is on. Base
  behaviour is unchanged.
- **`tutorials/credit-score-tutorial/CreditScoreTutorial.tsx`** (new
  folder, as `tutorials/NOTES.md` expects for `<group>-tutorial/`):
  - `withRowOnEvent` overrides for the three Simulator rows. They
    subscribe to the store and fire `cs-tutorial-paid-down`,
    `cs-tutorial-on-time` and `cs-tutorial-missed` the first time their
    row is on. On `tutorial-skip` for their event, they turn the row on
    by tapping it for the visitor.
  - `withCreditScoreTutorialReset` on the page. Clears the goal
    (`setGoal(null)`) when the tutorial opens, so a goal from free play
    doesn't skip the Goals steps. Also clears it on the congrats page, so
    the tutorial's goal doesn't show up on the free-play page in the same
    session. The Simulator already starts empty each time its tab mounts.

Every `.tsx` change follows CLAUDE.md's Framer rules and passes the
repo's type-check before a push.

## Risks to check early

- **Scrolling to targets.** The accordions sit well below the gauge, and
  opening one pushes the next one down. Each step's hole has to follow
  its target (`VirtualScroll` / the overlay's own scroll handling).
  Check this on the first live build before writing the rest.
- **Sticky Simulator header.** Step 14 points at the simulated gauge
  while it is pinned. Check that the hole lines up.
- **Simulator rows inside the overlay hole.** The overlay blocks taps
  outside the hole, so a row's ⓧ or a neighbouring segment can't be
  tapped by mistake. Check that the row's own tap still lands.
- **Accordions under the Simulator and Goals tabs** were never
  live-tested on the free-play page. Test them there first.

## Testing

On the live published site at 1080×1920, with real taps:

- every step in order;
- Skip on every step, including the event steps (the score still reads
  735 / 746 / 701 afterwards);
- Exit (X) from several steps;
- a second run in the same session (starts on step 1, no goal set,
  Simulator empty);
- the free-play Score page afterwards (no goal left over, still 742);
- inactivity timeout part-way through.

Results go in `tutorials/credit-score-tutorial/NOTES.md`.

## Open questions for the owner

1. Use 720 for the tutorial? (Recommended: it matches all the written
   text.)
2. Keep 17 steps, or merge the read steps down to 13?
3. Should the free-play page's 742 / 720 mismatch be fixed too, as a
   separate change?
4. Card copy: the table's text is a draft for the owner to edit.

## Out of scope

- An Alerts page step (opening a monitoring alert to spot an account you
  don't recognise). It can be added later as a short second page.
- Account Mix and Inquiries accordions (shown on the page but not taught).
- Any new credit maths: the Simulator keeps adding its set points.
