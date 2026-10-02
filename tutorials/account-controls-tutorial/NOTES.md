# Account Controls Tutorial — Notes

Tutorial-specific pieces for the Account Controls tutorial. As in
`card-controls-tutorial/`, only components that need tutorial behavior
live here (`<Component>Tutorial.tsx`). Everything else on the tutorial
pages uses the base `account-controls/` files directly.

## What the tutorial teaches

Starting on `/account-controls-tutorial/accounts-1`: Settings (gear) →
Account Preferences, then:

1. Rename "Vertical Checking" to "Main Checking".
2. Drag "Main Checking" to the top.
3. Hide "Platinum Rewards Checking".

Then Done, and Accounts in the bottom nav, which goes to
`/account-controls-tutorial/accounts-2`. That page highlights the new
order, the new name, and Platinum gone for a few seconds, then moves on
to the congrats page by itself. The tutorial doesn't use the ←, which
goes back through Settings.

## Files

- `AccountPreferencesListTutorial.tsx`: tutorial copy of
  `account-controls/AccountPreferencesList.tsx`. It saves to the
  "tutorial" store, so it never changes the free-play pages. Only the
  three taught actions work, each in its turn:
  - **Rename.** Tapping the field shows a cursor, erases the old name
    and types the new one. Nothing is really typed, and there's no
    on-screen keyboard. Then it saves and plays Saving → Saved.
  - **Move.** Only Main Checking's ≡ drags. Any new spot saves and
    plays the overlay, as in the real app, but the step only counts
    once it's at the top. With `Only drag up` on (the default), it can't
    be dragged down at all, not even back to a spot it just passed.
  - **Hide.** Only Platinum's eye works. Its tap area (and the step's
    highlight) runs the row's full height, plus `Eye tap width` on each
    side; `Eye tap height` reaches into the row's padding, capped at
    `Edit row padding`.
  Which step is current comes from the saved state (renamed? at the
  top? hidden?). After each step's overlay has faded out, the list
  fires the event that step's TutorialOverlay waits for
  (`account-prefs-renamed`, `account-prefs-moved`,
  `account-prefs-hidden`). Skip on those steps makes the list do the
  action for the user, so the end Accounts page still shows it. Skip
  never waits: it applies the change at once, stops any typing, drops
  a save overlay that's showing (`cancelSaveOverlay` in
  `AccountPreferencesEditMode.tsx`) and advances straight away.
  The property controls are the base list's, plus `Rename account`
  (8665), `Only drag up` (on), `New name` (Main Checking), `Hide account` (7500),
  `Erase speed`, `Type speed` and `Field typing border`.
- `AccountControlsTutorialReset.tsx`: `withAccountControlsTutorialReset`
  clears the tutorial store when the first page opens, so a second run
  in the same session starts from the default order.

**Framer Code folders.** Tutorial and base files are kept apart, as in
this repo:
- these two files go in **Phone Components > Tutorials > Account
  Controls Tutorial**;
- the base files (`AccountOrder.tsx`, `AccountPreferencesEditMode.tsx`,
  `AccountPreferencesList.tsx`) go in **Phone Components > Account
  Controls**.

So the tutorial files import from
`"../../Account_Controls/AccountOrder.tsx"` and
`"../../Account_Controls/AccountPreferencesEditMode.tsx"`. In import
paths Framer writes a space in a folder name as an underscore
("Account Controls" → `Account_Controls`). Renaming or moving either
folder in Framer breaks those imports. The base files import each
other with `"./…"` and must stay together.

Framer rewrites an import when the file it points to moves, but not
when the importing file itself moves. After moving a file, check its
imports: moving `AccountPreferencesList.tsx` into Account Controls
left it importing `"./Account_Controls/AccountOrder.tsx"`, which had
to go back to `"./AccountOrder.tsx"`.

When a base file gains a new export (e.g. `cancelSaveOverlay`), the
preview can keep running the old build and fail with "does not provide
an export named …", even after the new code is pasted. Save the base
file, re-save the file that imports it (type and delete a space), and
refresh the preview. Reload the Framer tab if that isn't enough.

## Framer setup

### `/account-controls-tutorial/accounts-1`
- `withAccountControlsTutorialReset` on any one layer, e.g. the page's
  scroll content.
- The account frames carry `withAccount7500` etc. (on the component,
  so every variant has them). They read the tutorial store on any
  page under `/account-controls-tutorial/`, so this page shows the
  default order.
- `SettingsButton` (TutorialTargets, `"settings-button"`) on the gear.
  TutorialOverlay `target`: `settings-button`.

### Settings (tutorial copy)
- `AccountPreferencesItem` (`"account-preferences"`) on the Account
  Preferences menu item. TutorialOverlay `target`:
  `account-preferences`.

### Account Preferences (tutorial copy)
A copy of the base page, with `AccountPreferencesListTutorial` in place
of the base list. The header, Edit/Done tap frame, save overlay and
"No External Accounts" card keep their base overrides
(`withAccountPrefsHeader`, `withAccountPrefsEditToggle`,
`withAccountPrefsSavingOverlay`, `withAccountPrefsHideWhileEditing`).
Add three marker frames (empty, no fill, no Link) and one target
frame:
- `AccountPrefsEdit` over "Edit", where it sits in the header's View
  variant.
- `AccountPrefsDone` over "Done", where it sits in the Editing variant.
  "Edit" and "Done" are in different spots because the ← takes up
  room in the View variant. Both markers can stay on the page all the
  time; each step only looks for its own.
- `AccountsTab`, a target, on an empty frame (no fill) over
  "Accounts" in the bottom nav, above the nav in the layer order. Give
  the frame its own native Link to
  `/account-controls-tutorial/accounts-2`. The nav's own Accounts
  button links to the free-play Accounts page, so this frame has to
  take the tap instead of passing it through, which is why it's a
  target and not a marker.

TutorialOverlay steps, all with the same `pageGroup` (e.g.
`account-prefs-tutorial`):

| Step | Target | Advances on | Card |
|---|---|---|---|
| 1 | `account-prefs-edit` | `Click advances step` | Tap Edit |
| 2 | `account-prefs-name-field` | `Click advances step` | Tap the name to change it |
| 3 | `account-prefs-name-field` | `Advance on event`: `account-prefs-renamed` | The name changes; optional progress bar (`Event progress` ≈ 5.75s) |
| 4 | `account-prefs-row` (or `account-prefs-handle`) | `Advance on event`: `account-prefs-moved` | Drag Main Checking to the top |
| 5 | `account-prefs-eye` | `Advance on event`: `account-prefs-hidden` | Hide Platinum Rewards Checking |
| 6 | `account-prefs-done` | `Click advances step` | Tap Done |
| 7 | `accounts-tab` | the `AccountsTab` frame's Link | Tap Accounts to see your changes |

- Step 3's progress bar: typing takes about 3.5s with the default
  speeds, and the save overlay 2.25s. The event fires when the overlay
  has faded out, so the bar's `Event progress` is about 5.75s. Change
  it if you change `Erase speed`, `Type speed` or the overlay timing.
- Step 4: targeting the row keeps the whole row lit as it moves. The
  highlight follows it during the drag. A touch drag that starts on
  the ≡ moves the row and doesn't scroll the page.
- The save overlay is "above everything". Check that the tutorial
  card still reads well while Saving/Saved shows on steps 3–5. Put
  the overlay below the TutorialOverlay instances if it covers them.

### `/account-controls-tutorial/accounts-2`
- Same Accounts content component, so the frames reorder and hide
  from the tutorial store.
- `withAccountName8665` (AccountOrder.tsx) on the "Vertical Checking *
  8665" text layer inside Vertical Checking's frame. Once renamed it
  shows "Main Checking * 8665". The field on Account Preferences types
  just "Main Checking". The " * " between the name and the number is
  `NAME_NUMBER_SEPARATOR` in AccountOrder.tsx, and must match the
  canvas text exactly.
- `AccountsUpdated` (`"accounts-updated"`), a target, on the internal
  accounts card itself: the stack holding the four account frames. The
  highlight then follows the card's real height, with Platinum hidden.
  The account frames carry `withAccountNNNN`, but the card has no
  override of its own, so it can take this one. If it ever gets one,
  use an empty frame over the card instead, sized to three accounts.
- One TutorialOverlay, no `pageGroup`: `target` `accounts-updated`,
  card e.g. "Your accounts now show your changes",
  `Auto advance after` about 4s, `Auto advance link` the congrats
  page. `Show progress bar` fills over the same 4s. Skip goes to the
  same link. `Auto advance link` reloads the page, which is fine here:
  the tutorial's changes aren't needed after this step.

## Navigation must be native Links

The tutorial store is kept in module memory, like the base store. A
full page load clears it. So from Account Preferences to `accounts-2`,
every navigation must be a native Framer Link, including the
`AccountsTab` frame's. On those
pages, don't use TutorialOverlay's `nextButtonLink` or
`autoAdvanceLink`, because they navigate with `window.location.href`,
which reloads the page. Skip on a step that uses them does the same.
After `accounts-2` it doesn't matter.

## Not yet tested in Framer

Tested in Chromium with Framer stubbed out: typing, each step's event,
touch drag without page scroll, a drop that isn't at the top not
advancing, Skip on all three steps (including during typing), and the
Accounts frames' order, hiding and new name. Still to check in Framer:
- the name text override (`text` prop) on a native text layer;
- the Saving overlay's stacking against the tutorial card.
