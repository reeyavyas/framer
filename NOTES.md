# Notes — Overview

This repo is organized by product-facing group, not by code type (Code
Component vs. Code Override). Each group below owns its own `NOTES.md`
with the detail on what's in it; this file is just the map.

## Groups

- **`card-controls/`** — Account-level card actions a user manages from
  settings (travel notice now; card alerts planned). See
  `card-controls/NOTES.md`.
- **`reset-pin/`** — "Reset PIN" for the debit card, plus the toast
  with a countdown bar that it shows on Card Controls. **A card-controls
  sub-feature, but deliberately its own top-level folder**, because it
  has a tutorial of its own. Its files never go under `card-controls/`,
  and any tutorial duplicates go in `tutorials/reset-pin-tutorial/`.
  Branches use `card-controls/<feature>`. See `reset-pin/NOTES.md`.
- **`money-management/`** — Budgeting UI, currently the draggable "Budget
  Circles" spending categories. See `money-management/NOTES.md`.
- **`main/`** — Site-wide, page-agnostic pieces not owned by any one
  feature (backgrounds, the kiosk inactivity redirect). See
  `main/NOTES.md`.
- **`tutorials/`** — The tutorial system, in two independent subgroups:
  - `tutorials-main-page/` — builds the Tutorials landing page itself
    (the arc carousel of flip cards).
  - `tutorial-overlays/` — the guided-walkthrough layer that drops on
    top of any existing page to turn it into a tutorial: the real UI
    underneath is untouched, and these components spotlight one target
    at a time instead of letting the user tap anywhere.
  See `tutorials/NOTES.md`.
- **`archived/`** — code that isn't live anywhere but is kept for
  reference (e.g. superseded experiments) rather than only living on a
  branch. See `archived/NOTES.md`.

## Branch naming

New feature branches are prefixed by group, matching the folder they'll
land in:

```
card-controls/<feature>
money-management/<feature>
main/<feature>
tutorials-main-page/<feature>
tutorial-overlays/<feature>
```

One exception: `reset-pin/` work uses `card-controls/<feature>`
(e.g. `card-controls/reset-pin`), because Reset PIN is a card-controls
sub-feature, even though its files live in `reset-pin/`.

Never use any other branch name. Every branch follows the
`<group>/<feature>` pattern above.
