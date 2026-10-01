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

Then Done, and ← back to `/account-controls-tutorial/accounts-2`, which
shows the new order, the new name, and Platinum gone.

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
    once it's at the top.
  - **Hide.** Only Platinum's eye works.
  Which step is current comes from the saved state (renamed? at the
  top? hidden?). After each step's overlay has faded out, the list
  fires the event that step's TutorialOverlay waits for
  (`account-prefs-renamed`, `account-prefs-moved`,
  `account-prefs-hidden`). Skip on those steps makes the list do the
  action for the user, so the end Accounts page still shows it.
  The property controls are the base list's, plus `Rename account`
  (8665), `New name` (Main Checking), `Hide account` (7500),
  `Erase speed`, `Type speed` and `Field typing border`.
- `AccountControlsTutorialReset.tsx`: `withAccountControlsTutorialReset`
  clears the tutorial store when the first page opens, so a second run
  in the same session starts from the default order.

Both import `./AccountOrder.tsx` and
`./AccountPreferencesEditMode.tsx`. In Framer every code file sits in
one Code panel, so that works even though this repo keeps them in
`account-controls/`.

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
Add two marker frames (empty, no fill, no Link):
- `AccountPrefsEditDone` over the Edit/Done word.
- `AccountPrefsBack` over the ←. The ←'s own native Link goes to
  `/account-controls-tutorial/accounts-2`.

TutorialOverlay steps, all with the same `pageGroup` (e.g.
`account-prefs-tutorial`):

| Step | Target | Advances on | Card |
|---|---|---|---|
| 1 | `account-prefs-edit-done` | `Click advances step` | Tap Edit |
| 2 | `account-prefs-name-field` | `Click advances step` | Tap the name to change it |
| 3 | `account-prefs-name-field` | `Advance on event`: `account-prefs-renamed` | The name changes; optional progress bar (`Event progress` ≈ 5.75s) |
| 4 | `account-prefs-row` (or `account-prefs-handle`) | `Advance on event`: `account-prefs-moved` | Drag Main Checking to the top |
| 5 | `account-prefs-eye` | `Advance on event`: `account-prefs-hidden` | Hide Platinum Rewards Checking |
| 6 | `account-prefs-edit-done` | `Click advances step` | Tap Done |
| 7 | `account-prefs-back` | the ←'s Link | Go back to Accounts |

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
- The closing card.

## Navigation must be native Links

The tutorial store is kept in module memory, like the base store. A
full page load clears it. So from Account Preferences through
`accounts-2`, every navigation must be a native Framer Link. On those
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
