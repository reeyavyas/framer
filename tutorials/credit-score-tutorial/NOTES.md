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

## Framer setup (4 Nov 2026)

- **Section Tabs Tutorial**: a copy of Section Tabs (Components → Phone
  Components → App UI → Credit Score, next to the original; Framer's
  rename only renames inside the current folder, so it couldn't be moved
  into Tutorials from Chrome). The tutorial page's instance was swapped
  to it (right-click → Replace with) and kept its `withGoalsTab`
  override. In the copy only: SimulatorScoreHeader Current Score 720,
  on-time row Points 7. The original Section Tabs is untouched (742,
  +11).
- Overrides in the copy (`TutorialTargets`): `ScoreRatingTarget`,
  `PaymentHistoryTarget`, `CreditUsageTarget`, `CreditAgeTarget` on the
  accordion instances; `SimulatorTabTarget`, `GoalsTabTarget` on the
  "Tab Simulator" / "Tab Goals" cells. From `CreditScoreTutorial.tsx`:
  `PayDownRow` (Row ID payDown), `OnTimeRow` (onTime),
  `MissedPaymentRow` (missedPayment).
- On the page: gauge Score 720 and `withCreditScoreTutorialStart` (tags
  `cs-gauge`, clears the goal on open and when the page is left).
- GoalSetupCard tags its own buttons (`goal-setup-start`,
  `goal-setup-next`), so no marker frames are needed.
- `CreditScoreTutorial.tsx` lives in Code → Phone Components → Tutorials
  → Credit Score Tutorial and imports `../../Credit_Score/…`.
- 19 TutorialOverlay layers "Step 1"…"Step 19" in Screen Content, page
  group `credit-score-tutorial`, copied from the Account Controls
  tutorial's first step (same card look, arrow and Exit link
  `/tutorials`). Card text uses title lines 1 and 2.

| Step | Target | Moves on |
|---|---|---|
| 1–2 | `cs-gauge` | Next step after 7 s, progress bar |
| 3 | `cs-score-rating` | Click |
| 4 | `cs-score-rating` | Next button |
| 5 / 6 | `cs-payment-history` | Click / Next |
| 7 / 8 | `cs-credit-usage` | Click / Next |
| 9 / 10 | `cs-credit-age` | Click / Next |
| 11 | `cs-simulator-tab` | Click |
| 12 | `cs-pay-down` | Event `cs-tutorial-paid-down` |
| 13 | `cs-on-time` | Event `cs-tutorial-on-time` |
| 14 | `cs-missed-payment` | Event `cs-tutorial-missed` |
| 15 | `cs-missed-payment` | Event `cs-tutorial-missed-undone` |
| 16 | `cs-goals-tab` | Click |
| 17 | `goal-setup-start` | Click |
| 18 | `goal-setup-next` | Click |
| 19 | none | Auto-advance 4 s → `/credit-score-tutorial/complete` |

Step 19 was added because a click on the last step can't change page
(TutorialOverlay only links from the Next button or auto-advance).

Skip on steps 12–15: the row override taps the row into the wanted
state (pay down / on-time field; "1 mo", then the picked month again),
so the score still reads 735 / 742 / 697 / 742.

## Not tested yet

Nothing is live-tested. Needs a publish. Check first: the hole following
the accordions as they open and push the page down, the arrow and card
placement on each step (copied from Account Controls: right-aligned,
below the target), and that the pinned Simulator header shows the score
from each row.
