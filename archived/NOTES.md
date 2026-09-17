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

## `tutorials-main-page/`

- `CurvedCarousel.tsx` — the original (V1) curved/arc flip-card
  carousel. Superseded by `CurvedCarouselV2.tsx` (fixes the front-card
  reset firing mid-drag), which is the version still live in
  `tutorials/tutorials-main-page/` — see `tutorials/NOTES.md`. Kept
  here for reference rather than deleted outright.

## `tutorial-overlays/`

Not superseded by anything — archived because neither is currently
wired into any live tutorial page (confirmed: nothing else in the repo
imports either file; `TutorialOverlay.tsx` has one code COMMENT
mentioning `SpotlightOverlay`'s clip-path hole technique, not an
import). Both still work if pulled back out.

- `FocusGuide.tsx` — a reusable "click here" glow, droppable as its own
  layer over any real element. `static`/`breathing`/`ripple` variants,
  configurable appear trigger (immediate / after a delay / on scroll
  into view), optional `pointerEvents: "auto"` + a Link to make the
  glow itself the tap target instead of just a visual cue.
- `SpotlightOverlay.tsx` — dims/blurs the whole screen except a single
  cut-out hole over one target, portaled to `<body>`. Built as
  `FocusGuide`'s pair: same hole shape/corner-radius so the dim edge
  lines up with the glow, forwards scroll/drag gestures through the
  dimmed area so the page underneath stays scrollable, optional
  skip/exit buttons.

**Noted for a planned future need, so it isn't rediscovered from
scratch:** the base (non-tutorial) pages support free exploration —
some elements are clickable, others aren't, and there's no tutorial
walkthrough forcing the user down one path. The plan is to eventually
show the user which is which. `FocusGuide`'s glow is the right visual
primitive for that ("here's a real, clickable thing"), and multiple
instances can already sit on a page simultaneously with no
coordination needed (unlike `TutorialOverlay.tsx`'s steps, nothing
here shares a `pageGroup`). But neither file as written solves the
actual shape of that job:

- `FocusGuide` highlights ONE element per instance with no shared
  on/off switch — showing affordance across a whole page means
  dropping and independently configuring one instance per clickable
  element, with no single control to reveal/hide all of them together
  (e.g. a "show me what I can tap" toggle).
- `SpotlightOverlay` cuts exactly ONE hole and dims everything else —
  the inverse of what this needs. A free-exploration page likely wants
  MANY clickable elements highlighted at once, or the NON-clickable
  ones dimmed/muted instead, not the guided single-target funnel this
  was built for.

So the likely real shape of that future component: something that
takes a LIST of target ids (via `TutorialTargets.tsx`'s existing
tagging convention) and a single master on/off toggle, drawing
`FocusGuide`-style glows on all of them at once — closer to a "legend"
overlay than a guided tutorial step. Worth designing fresh with that
shape in mind rather than trying to stretch either archived file to
fit it, though `FocusGuide`'s glow-variant CSS is directly reusable.
