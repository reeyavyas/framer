# Framer — Touch-Screen Banking Tutorial

A touch-screen kiosk app that teaches Gen Alpha middle schoolers the basics
of banking. The app is built in [Framer](https://www.framer.com), and this
repo holds the custom React code — **Code Components** (standalone widgets
dropped onto the canvas) and **Code Overrides** (functions that attach
behavior to an existing layer) — that Framer's own editor can't do out of
the box. There's no build step here: each `.tsx` file is pasted directly
into a layer's Code panel inside Framer.

## Project structure

The repo is organized by product-facing group rather than by code type.
Each group has its own `NOTES.md` with detail; `NOTES.md` at the repo
root is the map across all of them.

```
card-controls/          Card-level account actions (settings)
  travel-notice/           "Set a travel notice on your card"
    SetTravelNotice.tsx      The form
    TravelNoticeSection.tsx  Where an active notice is displayed
    TravelNoticeToast.tsx    Confirmation toast on save
  NOTES.md

money-management/       Budgeting UI
  CircleOverrides.tsx      Draggable "Budget Circles" spending categories
  NOTES.md

main/                    Site-wide, page-agnostic pieces
  backgrounds/              Animated gradient presets (via @firecms/neat)
    NeatGradient1.tsx
    bluemotionbackgeound.tsx
    bluemotionbackground2.tsx
  InactivityOverlay.tsx     Idle-timeout kiosk redirect to homepage
  NOTES.md

tutorials/               The tutorial system
  tutorials-main-page/      Builds the Tutorials landing page
    CurvedCarousel.tsx        Curved card carousel (flip-card stack)
    CurvedCarouselV2.tsx      Newer carousel revision (fixes front-card reset mid-drag)
  tutorial-overlays/        Droppable on top of any page to turn it into a tutorial
    FocusGuide.tsx             "Click here" glow overlay for a specific layer
    SpotlightOverlay.tsx       Dims/blurs the screen except a cut-out target area
    TutorialOverlay.tsx        Per-step instruction card + hole + glow
    TutorialTargets.tsx        Override that tags a layer so TutorialOverlay can find/measure it
    TutorialCongrats.tsx       Full-screen "you did it" finish screen for a tutorial
  NOTES.md
```

## Using a component in Framer

1. Open the file and copy its contents.
2. In Framer, select the layer (for an Override) or drop a fresh layer
   (for a Code Component), open the right-panel **Code** tab, and paste.
3. Configure the exposed fields in the **Properties** panel — everything
   tunable (colors, fonts, timing, targets) is a property control, not a
   value you need to hand-edit in code.

If a file imports from another local file (e.g. `CardAlertsSave.tsx`
importing from `CardAlertsToggleReport.tsx`), both need to exist as
their own separate files in Framer's Code panel — not pasted into a
single layer's override slot — and the import needs the explicit
`.tsx` extension (`"./CardAlertsToggleReport.tsx"`, not
`"./CardAlertsToggleReport"`). Framer's code editor doesn't resolve
extensionless local imports the way a typical TS/webpack setup does.

## Notes on this snapshot

- `main` is a fresh consolidation of the most current version of every
  component, pulled from the feature branches where it was actively
  developed, then reorganized into the group structure above. Full
  iteration history (bug fixes, dead ends, session handoff notes) lives
  on those original branches, not in `main`'s history.
- `tutorials/tutorial-overlays/TutorialOverlay.tsx` is the merged/current
  tutorial-card component (previously iterated on as
  `TutorialsOverlay090126.tsx`); it supersedes an earlier
  `TutorialOverlay.tsx` draft.
- `money-management/CircleOverrides.tsx` is the confirmed-good version
  from `claude/framer-circle-physics-0jt0rf` (drag-collision iteration
  fix, the Budget Circles 1/2 variant split, and the success-toast
  bridge). Other physics-related branches
  (`claude/circles-corner-avoidance-*`, `claude/draggable-circles-physics-*`,
  `claude/framer-corner-avoidance-*`) hold earlier, superseded
  experiments of this same file and can be disregarded for new work.

See `NOTES.md` for the group map, and each group's own `NOTES.md` for
per-group detail and branch-naming convention.
