# Tutorials — Notes

The interactive tutorial system, split into two independent subgroups.

## `tutorials-main-page/`

Builds the Tutorials landing page itself.

- `CurvedCarousel.tsx` / `CurvedCarouselV2.tsx` — the curved/arc card
  carousel that holds the flip-card tutorial entries. V2 is current
  (fixes the front-card reset firing mid-drag); V1 is kept alongside it
  since both are still in active use.

## `tutorial-overlays/`

A guided-walkthrough layer droppable on top of any existing page to
turn it into a tutorial. The real, already-interactive UI underneath is
left completely untouched — these components dim/spotlight it and
restrict taps to one target at a time instead of letting the user click
anywhere else on the page.

- `FocusGuide.tsx` — "click here" glow drawn over one specific layer
- `SpotlightOverlay.tsx` — dims/blurs the rest of the screen, cutting
  out the target area
- `TutorialOverlay.tsx` — the per-step instruction card + hole + glow
  (one instance per tutorial beat, configured entirely from the
  Properties panel)
- `TutorialTargets.tsx` — Override that tags a layer so
  `TutorialOverlay` can find/measure it
- `TutorialCongrats.tsx` — full-screen finish screen for the end of a
  tutorial

## Branch naming

```
tutorials-main-page/<feature>
tutorial-overlays/<feature>
```
