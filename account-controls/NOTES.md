# Account Controls — Notes

Account-level preferences a user manages from settings. Currently this
means Account Preferences: reordering the internal accounts, and hiding
accounts from the Accounts page.

## Status: pick up here (end of session, 2026-10-01)

### Where to pick up
**Account Controls tutorial, step 2 on the tutorial Account
Preferences page** (tap the name field). The step table and setup are
in `tutorials/account-controls-tutorial/NOTES.md`.

Built in Framer so far:
- All code files pasted, in their Code folders: base files in Phone
  Components > Account Controls, tutorial files in Phone Components >
  Tutorials > Account Controls Tutorial. The imports resolve, with no
  underlines. Tutorial files import from `"../../Account_Controls/…"`:
  Framer writes the folder's space as an underscore.
- The tutorial pages up to the Account Preferences page.
- Account Preferences step 1 (tap Edit): its TutorialOverlay card, and
  the `AccountPrefsEdit` marker over "Edit".

### Next steps, in order
1. **Finish the Account Preferences steps** (same `pageGroup` as step
   1):
   - **Step 2:** tap the name field. `target`
     `account-prefs-name-field`, `Click advances step`.
   - **Step 3:** the name types and saves. Same target, `Advance on
     event` `account-prefs-renamed`. For the optional progress bar,
     set `Event progress` to about 5.75s.
   - **Step 4:** drag Main Checking to the top. `target`
     `account-prefs-row`, `Advance on event` `account-prefs-moved`.
   - **Step 5:** hide Platinum. `target` `account-prefs-eye`,
     `Advance on event` `account-prefs-hidden`.
   - **Step 6:** tap Done. Add the `AccountPrefsDone` marker over
     "Done", where it sits in the Editing variant. `target`
     `account-prefs-done`, `Click advances step`. Check the Edit/Done
     tap frame (`withAccountPrefsEditToggle`) also covers the "Done"
     spot; the tutorial only lets the tap through there.
   - **Step 7:** tap Accounts in the bottom nav. Paste the updated
     `TutorialTargets.tsx` into Framer first, for the new `AccountsTab`
     export. Add the `AccountsTab` marker over "Accounts". `target`
     `accounts-tab`; the button's own native Link advances it. That
     Link must go to `/account-controls-tutorial/accounts-2`, not the
     free-play Accounts page.
   Use native Links only, and no `nextButtonLink` or `autoAdvanceLink`,
   until `accounts-2`. Those reload the page and wipe the tutorial's
   changes.
2. **Build `/account-controls-tutorial/accounts-2`:** put
   `withAccountName8665` on the "Vertical Checking * 8665" text layer
   in the Accounts content component's main component. Then add the
   last step: an `AccountsUpdated` marker over the accounts card, and
   one TutorialOverlay (`target` `accounts-updated`, no `pageGroup`,
   `Auto advance after` about 4s, `Auto advance link` the congrats
   page).
3. **Test the tutorial in Preview:**
   - the name types, and each step advances after Saved fades out;
   - dragging by touch on the kiosk, and the page not scrolling;
   - Skip on every step;
   - Accounts in the bottom nav lands on `accounts-2`, which
     highlights the accounts card and moves on to the congrats page
     after the timer;
   - `accounts-2` shows "Main Checking * 8665" at the top, with
     Platinum gone;
   - running it twice in a row starts the second run from the default
     order.
   Also check whether the save overlay covers the tutorial card on
   steps 3–5. Not yet confirmed in Framer: the name text override.
4. **Merge the PR:** https://github.com/reeyavyas/framer/pull/9 (open).
   Use **Create a merge commit**.

### Done
- **Base page works in Preview.** This covers Account Preferences
  (list, header variants, Edit/Done, save overlay, "No External
  Accounts" hiding) and the Accounts page reorder/hide. These three
  fixes are confirmed:
  - the rows no longer stretch on Edit or overlap "No External
    Accounts" on Done;
  - Done registers right after a change;
  - the hidden save overlay no longer blocks taps. The overlay must be
    a component instance, not inside a full-screen frame of its own.
- **Resets confirmed:** a refresh, and logging out and back in, both
  return to the default order.
- **Tutorial code written:** the tutorial list, the reset override,
  the `TutorialOverlay` additions (advance on event, Skip doing the
  action, drag passthrough) and the targets.

### Later
- Once the tutorials page has a free exploration button, test that
  logging off and coming back through it starts from the default
  order. If that path is all native Links with no page reload, the
  previous person's order and hidden accounts carry over, and the Log
  Off button (or the free exploration button) will need an override
  that resets the saved state. (Also in the root `NOTES.md`.)

## Account Preferences (base page)

### How it works

- **View mode:** the header shows ← and "Edit". Each row shows only
  "Name #1234", and a hidden account is drawn at lower opacity. The
  "No External Accounts" card shows below the list.
- **Edit mode:** tapping Edit switches the header to "Done" and removes
  the ←. Each row then shows the eye, a small label, a display-only
  name field and the ≡ handle. The External Accounts card hides.
- **Every change saves immediately, as in the reference app.** Dropping
  a row in a new spot, or tapping an eye, plays "Saving Changes…" for
  1s and then "Changes Saved" for 1s, and the overlay fades out. The
  page stays in edit mode afterwards, and Done returns to view mode.
- **The name field is display-only.** The kiosk has no keyboard, so
  nothing can be typed. In the tutorial, tapping it types a new name
  by itself.
- **At least one account always stays visible.** The eye on the last
  visible account does nothing.
- **The page always opens in view mode.**

### Files

- `AccountPreferencesList.tsx` is the Code Component for the list. It
  sits inside the page's Scrollable Content frame, with fill width and
  auto height. Its rows are drawn in code, because native layers can't
  be drag-reordered. It uses framer-motion's `Reorder`, and dragging
  starts from the ≡ handle only, so a swipe on a row still scrolls the
  page. Every color, font and size is a property control. Set
  `Canvas preview` to Edit to style the edit rows.
  `Eye icon` and `Eye off icon` take your own images for the shown and
  hidden states. Leave them blank to use the built-in eye.
  The ≡'s tap area runs the full height of the row's content (label and
  field). `Handle tap width` (default 16) and `Handle tap height`
  (default 20) add invisible space beside and above/below that, so a finger
  doesn't have to land on the icon itself. They don't move anything.
  Keep the width below `Icon gap`, or it starts covering the right
  edge of the name field. The height is capped at `Edit row padding`,
  where the tap area fills the row from top to bottom; any more would
  take taps from the rows above and below. The tutorial list has the
  same controls.
- `AccountPreferencesEditMode.tsx` holds the Overrides for edit mode and
  the save overlay. Timing is controlled by `SAVING_MS`, `SAVED_MS` and
  `FADE_MS`, which you edit directly.
  - `withAccountPrefsHeader` goes on the header component instance. The
    header has two native variants, named exactly **View** and
    **Editing**, and the override only chooses between them.
  - `withAccountPrefsEditToggle` goes on an empty frame (no fill, no
    Link) placed over the "Edit"/"Done" word. It toggles edit mode. It
    is a separate frame so the ← keeps its own native Link.
  - `withAccountPrefsSavingOverlay` goes on the overlay component
    instance: a full-screen dim with the bottom bar, placed above
    everything including the tab bar. It has two variants, named
    exactly **Saving** (native looping spinner plus "Saving Changes…")
    and **Saved** ("Changes Saved"). The overlay catches every tap
    during Saving and Saved, and lets taps through while hidden or
    fading. Framer wraps each instance in a full-screen div, and the
    override makes that div click-through, so the instance must not be
    nested in another full-screen frame, which would still block taps.
  - `withAccountPrefsHideWhileEditing` goes on the "No External
    Accounts" card, or on anything else that should hide in edit mode.
- `AccountOrder.tsx` is the shared saved state, plus the Accounts page
  Overrides `withAccount7500`, `withAccount8665`, `withAccount5101` and
  `withAccount5007`. Each one goes on its account frame inside
  "Accounts Page Scroll Content". Each sets the frame's CSS `order`
  from the saved order, or `display: none` if the account is hidden.
  The frames stay native. For this to work:
  - the four account frames must be direct children of one stack, with
    External Accounts, the footnote and Add External Accounts after
    them. The accounts get negative `order` values, so anything placed
    above them in that stack would end up below;
  - dividers must be each frame's own bottom border, and the rounded
    corners must be on the parent.
  - Account ids are the last four digits, and they must match the ids
    in the list component's `Accounts` control.

  The overrides read the "base" saved order everywhere except pages
  under `/account-controls-tutorial/`, where they read the tutorial's.
  The same file also has `withAccountName7500` etc., for an account's
  "Name * 1234" text layer, which show a saved new name with the
  number, e.g. "Main Checking * 8665" (only the tutorial renames), and `resetAccountState()`, which the tutorial uses to
  start fresh.

### Where the order is kept, and why

The order is kept in module memory, not sessionStorage. Native Framer
Links navigate client-side and keep the module alive, so the order
carries over from Account Preferences to Accounts. A refresh, or
`AppInactivityOverlay`'s hard redirect to `/app`, reloads the document,
so the next student starts from the default order. This means
`AppInactivityOverlay` doesn't need to change.

Every route between these pages must therefore be a native Link. A
`window.location.href` navigation would also reset the order. The
route passes through Settings both ways: Accounts → Settings → Account
Preferences, and ← on Account Preferences goes to Settings, then ← on
Settings goes to Accounts. So the Settings ← must be a native Link
too.

## Tutorial

The Account Controls tutorial (rename Vertical Checking to Main
Checking, drag it to the top, hide Platinum Rewards Checking) lives in
`tutorials/account-controls-tutorial/`. Its `NOTES.md` has the Framer
setup and the step list. The base list has no tutorial settings: the
tutorial uses its own copy, `AccountPreferencesListTutorial.tsx`,
which saves to a separate tutorial store so it never changes the
free-play pages.

## Branch naming

`account-controls/<feature>`, for example `account-controls/account-preferences`.
