# Account Controls — Notes

Account-level preferences a user manages from settings. Currently this
means Account Preferences: reordering the internal accounts, and hiding
accounts from the Accounts page.

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
- **The name field is display-only.** The kiosk has no keyboard. The
  tutorial will point at it ("Here is where you can change your account
  name.").
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
    while it shows.
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

### Where the order is kept, and why

The order is kept in module memory, not sessionStorage. Native Framer
Links navigate client-side and keep the module alive, so the order
carries over from Account Preferences to Accounts. A refresh, or
`AppInactivityOverlay`'s hard redirect to `/app`, reloads the document,
so the next student starts from the default order. This means
`AppInactivityOverlay` doesn't need to change.

Every route between these pages must therefore be a native Link. A
`window.location.href` navigation would also reset the order.

## Tutorial (not built yet)

The "Account Controls" tutorial will use a copy of Account Preferences
and the tutorial variant of the Accounts content component.

- **List component.** The tutorial copy uses the same component with
  `Saved order` set to **Tutorial**, so it never reshuffles the
  free-play Accounts page.
  - `Tutorial account`: the account id whose row gets
    `data-tutorial-target` tags: `account-prefs-row`,
    `account-prefs-eye`, `account-prefs-name-field` and
    `account-prefs-handle`.
  - `Only it drags`: turn it on so the student can drag only the
    account the step names. The step then says "tap Next when done", so
    `TutorialOverlay` never has to pass a drag gesture through.
- **Still open: the tutorial Accounts page.** It is a variant of the
  same component, so it carries the same four `withAccountNNNN`
  overrides, which read the **base** store. Overrides apply to every
  variant, so they will need to pick the store by page, for example
  from the tutorial page's URL path, once that page exists.
- **Tutorial-only duplicates** go in `tutorials/account-controls-tutorial/`,
  following the `<Component>Tutorial.tsx` convention.

## Branch naming

`account-controls/<feature>`, for example `account-controls/account-preferences`.
