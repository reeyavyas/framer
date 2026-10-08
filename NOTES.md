# Notes — Overview

This repo is organized by product-facing group, not by code type (Code
Component vs. Code Override). Each group below owns its own `NOTES.md`
with the detail on what's in it; this file is just the map.

## Groups

- **`card-controls/`** — Account-level card actions a user manages from
  settings (travel notice and card alerts). See
  `card-controls/NOTES.md`.
- **`reset-pin/`** — "Reset PIN" for the debit card, plus the toast
  with a countdown bar that it shows on Card Controls. **A card-controls
  sub-feature, but deliberately its own top-level folder**, because it
  has a tutorial of its own. Its files never go under `card-controls/`,
  and any tutorial duplicates go in `tutorials/reset-pin-tutorial/`.
  Branches use `card-controls/<feature>`. See `reset-pin/NOTES.md`.
- **`account-controls/`** — Account-level preferences a user manages
  from settings (Account Preferences: drag to reorder accounts, hide
  accounts from the Accounts page). See `account-controls/NOTES.md`.
- **`money-management/`** — Budgeting UI, currently the draggable "Budget
  Circles" spending categories. See `money-management/NOTES.md`.
- **`main/`** — Site-wide, page-agnostic pieces not owned by any one
  feature (the lock screen and splash, the kiosk inactivity redirect). See
  `main/NOTES.md`.
- **`tutorials/`** — The tutorial system, in two independent subgroups:
  - `tutorials-main-page/` — builds the Tutorials landing page itself
    (the arc carousel of flip cards).
  - `tutorial-overlays/` — the guided-walkthrough layer that drops on
    top of any existing page to turn it into a tutorial: the real UI
    underneath is untouched, and these components spotlight one target
    at a time instead of letting the user tap anywhere.
  See `tutorials/NOTES.md`.
- **`ATM/`** — The second kiosk portion: an ATM that teaches Gen Alpha
  users to use an ATM, plus money tips and lessons. Currently holds the
  animated wing background for the ATM screen, its "Tap anywhere
  to begin" icon, and the ATM page itself (lights on the machine, the
  tap transition and its beeps). See `ATM/NOTES.md`.
- **`archived/`** — code that isn't live anywhere but is kept for
  reference (e.g. superseded experiments) rather than only living on a
  branch. See `archived/NOTES.md`.

## Brand colours

The overall branding, given with the ATM brief. The ATM uses these
colours too and keeps its own table in `ATM/NOTES.md`. Colour changes
are asked for specific elements or pages: change only those, and leave
the ATM's colours (and its table) alone unless the change is for the
ATM.

| Name | Hex | Use |
|---|---|---|
| Navy | `#002c44` | Primary, dominant |
| Teal | `#059390` | Primary |
| Light teal | `#3bbfc0` | Glows, shimmer |
| Light blue | `#0079a9` | Glows |
| Midnight | `#11232d` | Dark contrast |
| Egg yolk | `#ffcc40` | Accent only (the ATM tap icon's ripple) |

## Open items across groups

- **Account Controls: test that the Accounts page starts fresh for
  each new session, once the tutorials page gets its free exploration
  button.** Account Controls (`account-controls/`) keeps the Accounts
  page's settings (account order, names and hidden accounts, changed
  from the Account Preferences page) in memory only, so they reset
  whenever the page reloads: on a refresh, and on
  `AppInactivityOverlay`'s redirect to `/app`. The free exploration
  button is a kiosk-wide and Tutorials page feature, not part of
  Account Controls; this item is only about the Accounts page's
  settings not carrying over through it. To test: reorder or hide an
  account, log off, come back in through the free exploration button,
  and open Accounts. It should show the default order. If that route
  is all native Framer Links with no reload, the previous person's
  settings carry over, and the Log Off or free exploration button will
  need an override that resets them. See `account-controls/NOTES.md`.

## Branch naming

Every branch must be `<group>/<feature>` or `<group>`, using one of
these, named after the folder the work lands in:

```
card-controls/<feature>
account-controls/<feature>
money-management/<feature>
main/<feature>
tutorials-main-page/<feature>
tutorial-overlays/<feature>
atm
```

`reset-pin/` work uses `card-controls/<feature>`
(e.g. `card-controls/reset-pin`), because Reset PIN is a card-controls
sub-feature, even though its files live in `reset-pin/`.

Never use any other branch name.
