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

## Score: starts at 720, ends at 742

The accordions, Points Journey ("60 points away from Excellent") and
Goals are written for **720**, and the free-play page's gauge shows
**742**. The tutorial starts at 720, goes up and down in the Simulator,
and ends at **742**, the free-play page's score (owner, 4 Nov). On the
tutorial copy only, set:

- the gauge's **Score** property to 720;
- SimulatorScoreHeader's **Current Score** property to 720;
- the on-time payments row's **Points** to **+7** (free play keeps +11),
  so pay down (+15) plus on-time (+7) lands on 742.

These are all properties, so no code change is needed. The free-play page
stays as it is (owner, 4 Nov).

## Steps

Every step is one `TutorialOverlay` in one page group. "Tap" steps move
on when the target is tapped. "Event" steps move on when a component
fires its event. "Timed" steps move on by themselves after the set time
(`nextStepAfterSeconds`, with the progress bar showing). "Next" steps move on with the card's Next button. Skip
does the step's action for the visitor so later numbers still add up.

The figures are the Simulator's existing made-up values. None come from
the owner's screenshots.

| # | Target | Visitor does | Card text (draft) | Moves on |
|---|---|---|---|---|
| 1 | Gauge | reads | "This is your credit score: **720, Good**. Scores run from 300 to 850." | Timed, 7 s |
| 2 | Gauge | reads | "Lenders use it to decide whether to lend to you and at what rate." | Timed, 7 s |
| 3 | Score Rating header | opens it | "Open **Score Rating** to see how close you are to the next level." | Tap |
| 4 | Points Journey panel | reads | "You're **60 points** from Excellent. Let's see what moves your score." | Next |
| 5 | Payment History header | opens it | "**Payment History** is the biggest part of your score (40%). Open it to see your grade." | Tap |
| 6 | Payment History body | reads | "Paying every bill on time keeps this grade high. Even one late payment can stay on your report for years." | Next |
| 7 | Credit Usage header | opens it | "**Credit Usage** is how much of your limits you're using (20%)." | Tap |
| 8 | Credit Usage body | reads | "Try to keep your balances below 30% of your limits. Under 10% is best." | Next |
| 9 | Credit Age header | opens it | "**Credit Age** is how long you've had credit (21%)." | Tap |
| 10 | Credit Age body | reads | "Older accounts help. Think twice before closing your oldest card." | Next |
| 11 | Simulator tab | taps it | "Now try it. Tap **Simulator** to see what changes your score." | Tap |
| 12 | Pay down row ($1,200) | taps it | "Pay down $1,200 of your balances." Score → **735 ▲15** | Event |
| 13 | On-time payments row | taps it | "Keep making payments on time." Score → **742 ▲22** | Event |
| 14 | Missed payment, 1 mo | taps it | "Now see what one missed payment does." Score → **697 ▼23** | Event |
| 15 | Missed payment, 1 mo | taps it again to undo | "One missed payment wiped out both good moves. Tap it again to undo it." Score → **742 ▲22** | Event |
| 16 | Goals tab | taps it | "Set yourself a goal so you can track your progress." | Tap |
| 17 | Set Up Your Goal | taps it | "Tap **Set Up Your Goal**." | Tap |
| 18 | Goal form's Next | taps it (can drag the sliders first) | "Pick a score and a time frame, then tap **Next**." | Tap |
| 19 | none | reads | "Your goal is set! You're ready to make informed credit decisions." | Timed, 4 s → `/credit-score-tutorial/complete` |

That's 19 steps (step 19 added in the build: a tap on the last step can't change page), about 3–4 minutes (owner kept all of them, 4 Nov; step 1
split into two timed cards).

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
    row is on, and `cs-tutorial-missed-undone` when the missed row is
    off again after that. On `tutorial-skip` for their event, they turn the row on
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
- **Sticky Simulator header.** Steps 12–15 change the pinned simulated
  gauge while the hole is on a row. Check that the visitor can see the
  gauge from each row.
- **Simulator rows inside the overlay hole.** The overlay blocks taps
  outside the hole, so a row's ⓧ or a neighbouring segment can't be
  tapped by mistake. Check that the row's own tap still lands.
- **Accordions under the Simulator and Goals tabs** were never
  live-tested on the free-play page. Test them there first.

## Testing

On the live published site at 1080×1920, with real taps:

- every step in order;
- Skip on every step, including the event steps (the score still reads
  735 / 742 / 697 / 742 afterwards);
- Exit (X) from several steps;
- a second run in the same session (starts on step 1, no goal set,
  Simulator empty);
- the free-play Score page afterwards (no goal left over, still 742);
- inactivity timeout part-way through.

Results go in `tutorials/credit-score-tutorial/NOTES.md`.

## Decided (owner, 4 Nov)

1. The score starts at 720, moves up and down, and ends at 742.
2. All the steps stay, with the first card split into two timed ones (18 steps).
3. The free-play page stays at 742.
4. The card text in the steps table is a draft for the owner to edit.

## Out of scope

- An Alerts page step (opening a monitoring alert to spot an account you
  don't recognise). It can be added later as a short second page.
- Account Mix and Inquiries accordions (shown on the page but not taught).
- Any new credit maths: the Simulator keeps adding its set points.
