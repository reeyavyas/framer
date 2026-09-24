# Test plan — `overlay-bug-fixes` (PR #3)

Written at the end of the first working session on this branch, for the
next session to walk through with the user **before** deciding whether
anything needs more work or the PR is ready to merge.

**For Claude, at the start of the next session:** read this file, then
ask the user to run these tests section by section (A → G), one section
at a time, and record each result (pass / fail + what they saw) in the
Results column. Don't start new work until the tests are done. After
that, decide with the user whether anything needs a follow-up fix or the
PR is ready to merge (recommend **Create a merge commit**). Delete this
file in the last commit before merging.

**State at handoff:** the user has pasted every changed file into Framer
and swapped the old `InactivityOverlay` instances for
`AppInactivityOverlay`. Nothing below has been tested in Framer yet
except the simulated-tap Console snippet that the Skip fix is based on.

**Where to test:** use the Windows work laptop (Chrome or Edge) for
everything. The kiosk runs Windows, and the rectangle bug in A5 only
shows up there. Use the published or staging site in its own tab, not
Framer's built-in Preview.

**Tip for A, B:** the inactivity overlay waits 3 minutes. To test faster,
temporarily set `INACTIVITY_MINUTES = 0.1` (about 6 seconds) in the
`AppInactivityOverlay` code file in Framer, then **set it back to 3**
when done.

---

## A. "Are you still there?" overlay (`AppInactivityOverlay`)

| # | Test | Expected | Result |
|---|------|----------|--------|
| A1 | Check every page that used to have `InactivityOverlay` | Each now has `AppInactivityOverlay`, and the old `InactivityOverlay` code file is deleted in Framer | Pass |
| A2 | Leave any page idle until the overlay appears, then let the 30-second countdown run out | Overlay appears after the idle time; countdown reaches 0 and goes to `/app` | Pass |
| A3 | Open the overlay again and tap **RETURN HOME** | Goes to `/app` | Pass |
| A4 | Open the overlay again and tap **YES, I'M HERE** | Overlay closes; after another idle period it appears again | Pass |
| A5 | Tutorials landing page (flip-card carousel): let the overlay appear | **No rectangle/shadow on the center flip card.** Background is dimmed but not blurred | **Fail (partial):** rectangle flickers briefly as the overlay first opens, then goes away. Needs a follow-up fix. User also saw the carousel keep auto-cycling under the overlay; CurvedCarouselV2 autoplay now holds while the overlay is open (retest: carousel pauses, flicker remains). AppInactivityOverlay now also skips its fade-in on the carousel page. **Retest** |
| A6 | Any other page: let the overlay appear | Background is dimmed **and** blurred, same as before | Pass |

## B. Tutorial pauses while "Are you still there?" is open

| # | Test | Expected | Result |
|---|------|----------|--------|
| B1 | On a tutorial step with a spotlighted target (e.g. the card toggle step), let the overlay appear, then tap **YES, I'M HERE** | Tutorial stays on the **same** step; the target was not tapped | Pass |
| B2 | On a "Scroll down" step, let the overlay appear, then try to scroll | Page doesn't move, step doesn't advance | Pass |
| B3 | On a step that advances by itself on a timer (progress bar showing), if any exists: let the overlay appear and wait longer than the timer | Step doesn't advance while the overlay is open. After **YES, I'M HERE**, the progress bar starts over from empty and the step advances after its full time | Pass |

## C. Tutorial Skip button (Skip link fields cleared)

| # | Test | Expected | Result |
|---|------|----------|--------|
| C1 | Card Controls tutorial: **Skip** on the card on/off step | Card toggle turns off; next step appears | Pass |
| C2 | Card Alerts tutorial: **Skip** on "Scroll down" | Page scrolls; toggle 3 is **fully** visible for the next step (note if only partly visible) | Pass |
| C3 | Card Alerts tutorial: **Skip** on each of the 3 toggle steps | Each toggle flips on; next step appears each time | Pass |
| C4 | Card Alerts tutorial: **Skip** on the Save step | "Saving…" shows, then goes to the Card Controls tutorial page with the Card Alerts toast | Pass. Follow-up: the top-nav Close can still be tapped while "Saving…" shows; user will add a reveal delay to the tutorial step there |
| C5 | Travel Notice tutorial: **Skip** through every step (scroll, date/destination fields, Save) | Each Skip moves to the next step; Save goes on to the next page | Pass |
| C6 | **Skip** on any step whose next step is on a **different page** | Goes to that page and its first step | Pass |
| C7 | Double-tap **Skip** quickly on a toggle step | Toggle flips only once (ends up on, not back off) | Pass |
| C8 | A step that still has a **Skip link** set (if you kept any) | Skip goes to that link | Pass (tested with a temporary Skip link on Travel Notice tutorial step 3, since removed) |

## D. Card Alerts base page (real, non-tutorial)

| # | Test | Expected | Result |
|---|------|----------|--------|
| D1 | Turn one toggle on | Save becomes enabled (blue) | Pass |
| D2 | Leave the page **without saving** (Cancel/back), then come back | All toggles off **and** Save disabled (gray) | **Fail:** toggles off but Save still blue. Fixed in CardAlertsSave.tsx (subscribe before resetToggles). Retest: Pass |
| D3 | Now turn a toggle on, then off | Save enables, then disables again | Pass |
| D4 | Turn a toggle on and tap **Save** | "Saving…", then Card Controls with the Card Alerts toast | Pass |

## E. Travel Notice

| # | Test | Expected | Result |
|---|------|----------|--------|
| E1 | Complete the Travel Notice tutorial through Save | Tutorial Card Controls page shows the "Future Plans" section (Illinois, Kentucky, Missouri) and the toast | Pass |
| E2 | Then open the **real** Card Controls page | **No** travel notice section appears | Pass |
| E3 | Set a real travel notice on the real form and Save | Real Card Controls page shows your notice and the toast | Pass |

## F. Budget Circles Save (money management)

| # | Test | Expected | Result |
|---|------|----------|--------|
| F1 | Tap **Save** normally | Circles swap to the second set (with Bills & Utilities) and the success toast shows | Pass |
| F2 | Same, with DevTools Console open | No `[budgets-bridge]` lines | Pass (none seen; the code no longer logs them). Can confirm with the Console filter box |
| F3 | Press **Save**, slide your finger/mouse off the button, then lift | Nothing happens (no swap, no toast) | Pass |
| F4 | If F1 fails (Save does nothing) | Report it: Save used to also fire on finger-down, and that may have been covering for Framer's tap/click not firing | N/A (F1 passed) |

## G. Congrats page

| # | Test | Expected | Result |
|---|------|----------|--------|
| G1 | Finish a tutorial to reach the congrats page | Returns to `/tutorials` after about 5 seconds | Pass |
