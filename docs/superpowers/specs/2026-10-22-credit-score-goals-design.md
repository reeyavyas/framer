# Credit score Goals tab — design

Set one credit score goal on the Goals tab; once set, it shows on the
Goals tab and as a card on the Analysis tab. No editing a goal.

## Session only

`GoalStore.tsx` holds the goal (score, months, reason) in a module-level
variable, like `SimulatorStore`. Nothing goes to localStorage, cookies or
the URL. It survives tab switches and page navigation inside the site,
and a refresh or new tab clears it, so the next user starts with no goal.
Unlike the Simulator, nothing resets it on mount.

## Goals tab

One code component, **GoalSetupCard**, with three states:

1. **No goal:** "Current score" circle (720, rating) → dotted arrow →
   "Score goal" circle with "?". "Improve your credit score", intro
   text, **Set Up Your Goal** button.
2. **Form:** the same circles; the goal circle shows the slider's score
   and rating in navy, the arrow shows "N points". "Set up your goal" +
   text. Score slider from 721 to 850 with a value pill over the handle;
   months slider snapping to 6 / 12 / 18 / 24 (picked number navy);
   optional "Why are you setting up a goal?" dropdown (Other / I plan to
   buy a car / To improve my financial health / I am planning another
   big purchase that requires credit / I plan to buy a house); **Next**.
3. **Set:** "Your Credit Goal" title and the two circles (no Edit Goal).

Opening the tab with a goal already set goes straight to state 3.

Below it, only once a goal is set:

- **GoalProgressChart** (code): "Track progress", "Your goal" legend,
  joined 6M / 1Y / 2Y buttons, dashed gridlines with six score labels
  from 720 to the goal, a navy line for the score so far, a dashed line
  to a ring marker at the goal, a grey vertical line at the goal date,
  month labels per range.
- **Recommendations** (native, owner edits the text): heading,
  subtitle, four "Great Job!" cards, grey disclaimer.

**GoalGate** (code) shows these only once a goal is set: it has one
component slot (`ControlType.ComponentInstance`) and renders it only
when the store has a goal, so the native content stays native.

## Analysis tab

**GoalSummaryCard** (code), after the three promo cards. With no goal it
renders nothing. With a goal: "Your goal: N score", "You are **X
points** away from reaching your goal. Keep it up!", a grey ring with a
navy dot at the top and "0% completed", and **See Your Progress →**.

## See Your Progress

Opens the Goals tab with the set goal showing. The section tabs are
native variants, so a code override **withGoalsTab** on the Section Tabs
instance passes `variant="Goals"` and a new `key` when the store asks for
it (the key remounts the tabs so the jump works every time, even after
the user tapped back to Analysis). The link calls `openGoalsTab()` in the
store and scrolls the tab row into view.

## Values

Current score 720 (Good). The goal and months are whatever the user
picks; points away = goal − 720; completed stays 0% since the score
doesn't move. No figures from the owner's screenshots.
