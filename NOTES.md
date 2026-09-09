# Notes — Overview

This repo is organized by product-facing group, not by code type (Code
Component vs. Code Override). Each group below owns its own `NOTES.md`
with the detail on what's in it; this file is just the map.

## Groups

- **`card-controls/`** — Account-level card actions a user manages from
  settings (travel notice now; card alerts planned). See
  `card-controls/NOTES.md`.
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
