# Framer — Touch-Screen Banking Tutorial

A touch-screen kiosk app that teaches Gen Alpha middle schoolers the basics
of banking. The app is built in [Framer](https://www.framer.com), and this
repo holds the custom React code — **Code Components** (standalone widgets
dropped onto the canvas) and **Code Overrides** (functions that attach
behavior to an existing layer) — that Framer's own editor can't do out of
the box. There's no build step here: each `.tsx` file is pasted directly
into a layer's Code panel inside Framer.

## Project structure

```
tutorials/           Kiosk onboarding/walkthrough system
  FocusGuide.tsx        "Click here" glow overlay for a specific layer
  SpotlightOverlay.tsx  Dims/blurs the screen except a cut-out target area
  TutorialOverlay.tsx   Per-step instruction card + hole + glow (one instance per tutorial beat)
  TutorialTargets.tsx   Override that tags a layer so TutorialOverlay can find/measure it
  TutorialCongrats.tsx  Full-screen "you did it" finish screen for a tutorial
  InactivityOverlay.tsx Idle/kiosk-reset screen after a few minutes of no input

banking-features/
  travel-notice/       "Set a travel notice on your card" banking feature
    SetTravelNotice.tsx      The form
    TravelNoticeSection.tsx  Where an active notice is displayed
    TravelNoticeToast.tsx    Confirmation toast on save

visuals/
  backgrounds/          Animated gradient background presets (via @firecms/neat)
    NeatGradient1.tsx
    bluemotionbackgeound.tsx
    bluemotionbackground2.tsx
  circles/
    CircleOverrides.tsx   Floating draggable circles with physics/corner-avoidance
  carousel/
    CurvedCarousel.tsx    Curved card carousel (flip-card stack)
    CurvedCarouselV2.tsx  Newer carousel revision (fixes front-card reset mid-drag)
```

## Using a component in Framer

1. Open the file and copy its contents.
2. In Framer, select the layer (for an Override) or drop a fresh layer
   (for a Code Component), open the right-panel **Code** tab, and paste.
3. Configure the exposed fields in the **Properties** panel — everything
   tunable (colors, fonts, timing, targets) is a property control, not a
   value you need to hand-edit in code.

## Notes on this snapshot

- `main` is a fresh consolidation of the most current version of every
  component, pulled from the feature branches where it was actively
  developed. Full iteration history (bug fixes, dead ends, session
  handoff notes) lives on those branches, not in `main`'s history.
- `tutorials/TutorialOverlay.tsx` is the merged/current tutorial-card
  component (previously iterated on as `TutorialsOverlay090126.tsx`);
  it supersedes the earlier `TutorialOverlay.tsx` draft.
- `visuals/circles/CircleOverrides.tsx` is the confirmed-good version from
  `claude/framer-circle-physics-0jt0rf` (drag-collision iteration fix, the
  Budget Circles 1/2 variant split, and the success-toast bridge). The
  other physics-related branches (`claude/circles-corner-avoidance-*`,
  `claude/draggable-circles-physics-*`, `claude/framer-corner-avoidance-*`)
  hold earlier, superseded experiments of this same file and can be
  disregarded for new work.
