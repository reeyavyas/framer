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

## Steps (rebuilt 5 Nov, following the owner's other kiosk tutorials)

Step types, as in Account Controls, Card Controls, Log Off and PIN Reset:
**scroll** (Teal card, no target or arrow, moves on at a scroll % of the
page's Scrollable Content `cs-scroll`, not frozen); **read** (frozen, 7 s
timer + progress bar + yellow Next); **tap** (frozen, moves on when the
target is tapped or its event fires); **final** (no target, 4 s +
progress bar + Next, to `/credit-score-tutorial/complete`). No
auto-scroll. Card centred on its target (or aligned 40 px in from the
edge when centring would push it off screen), kept inside the content
area (287–1710 at 1080×1920). Arrow: curved, 340, beside the card's
side and curving onto the target, with the card aligned to one side of
the target; straight only on 23 and 25 (own line under the card, at
"1 mo."). Highlights are tight:
headers, fields, the months buttons, sliders, buttons.

Scroll % measured at 1080×1920 on the free-play page (same layout); each
is scroll position over scrollable range at that point.

| # | Type | Target | Moves on | Card |
|---|---|---|---|---|
| 1 | scroll ↓ 5% | — | scroll | Let's explore your credit score! / Please scroll down to see your score. |
| 2 | read | `cs-gauge` | 7 s / Next | This is your credit score: / 720, Good. Scores run 300–850. |
| 3 | read | `cs-gauge` | 7 s / Next | Lenders use it to decide / whether to lend and at what rate. |
| 4 | scroll ↓ 30% | — | scroll | Let's see what shapes your score. / Please scroll down to continue. |
| 5 | tap | `cs-score-rating` | tap | Tap Score Rating / to see your next level. |
| 6 | scroll ↓ 35% | — | scroll | Please scroll down / to see your Points Journey. |
| 7 | read | `cs-points-journey` | 7 s / Next | You're 60 points / from Excellent. |
| 8 | scroll ↓ 48% | — | scroll | Please scroll down / to Payment History. |
| 9 | tap | `cs-payment-history` | tap | Payment History is 40% / of your score. Tap to open it. |
| 10 | read | `cs-payment-history-detail` | 7 s / Next | Paying every bill on time / keeps this grade high. |
| 11 | scroll ↓ 62% | — | scroll | Please scroll down / to Credit Usage. |
| 12 | tap | `cs-credit-usage` | tap | Credit Usage is 20% / of your score. Tap to open it. |
| 13 | read | `cs-credit-usage-detail` | 7 s / Next | Keep balances below 30% / of your limits. Under 10% is best. |
| 14 | scroll ↓ 72% | — | scroll | Please scroll down / to Credit Age. |
| 15 | tap | `cs-credit-age` | tap | Credit Age is 21% / of your score. Tap to open it. |
| 16 | read | `cs-credit-age-detail` | 7 s / Next | Older accounts help. / Think twice before closing one. |
| 17 | scroll ↑ 11% | — | scroll | Now try it yourself! / Please scroll up to the tabs. |
| 18 | tap | `cs-simulator-tab` | tap | Tap Simulator / to see what changes your score. |
| 19 | scroll ↓ 71% | — | scroll | Please scroll down / to Manage Your Balances. |
| 20 | tap | `cs-pay-down` (field) | `cs-tutorial-paid-down` | Tap to pay down $1,200 / of your balances. |
| 21 | scroll ↓ 85% | — | scroll | Please scroll down / to Manage Payment Activity. |
| 22 | tap | `cs-on-time` (field) | `cs-tutorial-on-time` | Tap to keep making / payments on time. |
| 23 | tap | `cs-missed-payment` (months) | `cs-tutorial-missed` | Now see what one missed / payment does. Tap 1 mo. |
| 24 | read | `cs-simulated-score` | 7 s / Next | One missed payment wiped out / both good moves. |
| 25 | tap | `cs-missed-payment` (months) | `cs-tutorial-missed-undone` | Tap 1 mo again / to undo it. |
| 26 | scroll ↑ 33% | — | scroll | Let's set a goal. / Please scroll up to the tabs. |
| 27 | tap | `cs-goals-tab` | tap | Tap Goals / to set a score goal. |
| 28 | scroll ↓ 95% | — | scroll | Please scroll down / to set up your goal. |
| 29 | tap | `goal-setup-start` | tap | Tap Set Up Your Goal. |
| 30 | tap | `goal-score-slider` | `goal-score-slider-done` | Drag to pick / your goal score. |
| 31 | tap | `goal-months-slider` | `goal-months-slider-done` | Drag to pick / how many months. |
| 32 | tap | `goal-setup-next` | tap | Tap Next / to save your goal. |
| 33 | read | — | 7 s / Next | Your goal is set! / You're ready to make informed credit decisions. |
| 34 | scroll ↑ 0% | — | scroll | Now let's check your alerts. / Please scroll up to the top. |
| 35 | tap | `cs-alerts-tab` | tap (links to `/credit-score-tutorial/alerts`) | Tap Alerts / to see what has changed. |

**Alerts page** (`/credit-score-tutorial/alerts`, page group
`credit-score-tutorial-alerts`, added 5 Nov at the owner's request: an
overview):

| # | Type | Target | Moves on | Card |
|---|---|---|---|---|
| 1 | scroll ↓ 10% | — | scroll | Here's what has changed. / Please scroll down to your alerts. |
| 2 | read | `cs-alert-payment-history` | 7 s / Next | Each alert explains a change / and how it affects your score. |
| 3 | scroll ↓ 56% | — | scroll | Please scroll down / to Credit monitoring. |
| 4 | read | `cs-alert-monitoring` | 7 s / Next | We watch your credit report daily. / Didn't open an account? Tell your lender right away. |
| 5 | final | — | 4 s / Next → complete | You're all caught up! / Check your alerts often to stay on top of your credit. |

Score path: 720 → 735 (pay down) → 742 (on-time) → 697 (1 mo) → 742.

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

- Account Mix and Inquiries accordions (shown on the page but not taught).
- Any new credit maths: the Simulator keeps adding its set points.
