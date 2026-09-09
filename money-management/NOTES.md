# Money Management — Notes

Budgeting UI: the draggable "Budget Circles" spending categories.

## Current

- `CircleOverrides.tsx` — Code Overrides for two variant sets of budget
  category circles, plus the glue between them:
  - **Set 1** (6 circles): Auto, Dining, Health, Shopping, Personal
    Care, Uncategorized
  - **Set 2** (7 circles, adds Bills & Utilities): the `*V2` circles
    plus `BillsCircle`
  - A `window` `CustomEvent` bridge (avoids needing the paid Framer
    Convert Add-On) swaps Set 1 out and Set 2 in when the Set 1 "Save"
    button fires, and drives the success toast that confirms the save.
  - This is the confirmed-good version, pulled from
    `claude/framer-circle-physics-0jt0rf` (drag-collision-iteration
    fix applied) — see root repo history for how it was selected among
    the other circle-physics experiment branches.

## Branch naming

`money-management/<feature>`
