# Archived — Notes

Code that was part of active development but isn't the current, live
version of anything. Kept in-repo (rather than only living on a branch)
so it survives branch cleanup and stays discoverable.

## `circle-physics-experiments/`

Three earlier, unmerged attempts at the circle-drag physics/corner-avoidance
behavior now shipped in `money-management/CircleOverrides.tsx` (which came
from `claude/framer-circle-physics-0jt0rf` — see `money-management/NOTES.md`).
None of these is wired into any live page.

- `circles-corner-avoidance-3xsma8.tsx` — the original corner-avoidance
  implementation. This is also the file that ended up copied, unchanged,
  as the shared baseline in several other branches (`tutorials-layers`,
  `claude/gradient-firecms-framer-bmpf87`, `claude/transparent-flip-card-framer-5wqz08`)
  before the physics work continued elsewhere — it's the starting point
  the other two experiments below built on.
- `draggable-circles-physics-egxuib.tsx` — replaced position-easing with
  real velocity/spring bounce physics; last touched making drop-time
  corner bounce-back unconditional.
- `framer-corner-avoidance-yjepo3.tsx` — adopted a "unified-relaxation"
  approach to corner avoidance as a further iteration.

The branches these came from
(`claude/circles-corner-avoidance-3xsma8`, `claude/draggable-circles-physics-egxuib`,
`claude/framer-corner-avoidance-yjepo3`) were deleted after this archive
was created — their full commit history is gone, but the final state of
each experiment is preserved here.
