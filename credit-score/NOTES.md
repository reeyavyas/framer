# Credit Score — Notes

The phone app's Credit Score pages (tutorials kiosk, app styles from
`design.md` §4). Each top tab is its own page: Score is
`/base-pages/credit-score-score`; Offers, Alerts and Resources get their
own pages. The Score page holds more tab and slider elements of its own.

In Framer, every code component and override for these pages goes in
the existing **Phone Components → App UI → Credit Score** folder, under
both Assets → Components → Project and Assets → Code. Don't create new
folders for them.

## Current

- `CardSlider.tsx` — swipeable slides with tappable dots, for cards whose
  slides each have their own button (Framer's native carousel can't lift
  its dots above the buttons; its dots inset tops out at 100).
  - **The card stays still; only the content slides.** CardSlider is
    transparent and clips. The card's look (fill, border, radius, clip)
    is on its parent frame on the page, e.g. "Credit Score Card":
    `#9BB3B3` at 10%, 2px `#575757` border, radius 10, 1026×789.
  - **Slides** are connected in the Slides control from top-level canvas
    layers (left of the Kiosk frame): "Slide 1 Boost Score" and
    "Slide 2 High-Yield Checking", instances of the Credit Score Slider
    component on Variant 1 and Variant 2.
  - **Credit Score Slider's variants are content only**: no fill or
    border, Draggable off, Distribute **End** so every slide's button
    and dots row sit at the same height. Each keeps its own dots Stack
    at opacity 0 as a spacer; CardSlider draws the live dots over it.
  - **Dots from Bottom** is measured to the dots' bottom edge: 60
    padding + 86 button + 50 gap = 196. Dots are 22px, 15px apart,
    Navy `#002c44` active, `#CCCCCC` inactive, with a 60px invisible tap
    area each.
  - A drag settles on the nearest slide; a flick moves one slide. No
    looping, autoplay or arrows. A drag that ends over a button doesn't
    press it. Reduced motion jumps instead of animating.
  - **To check once the slide buttons get actions (CardSlider):** a plain tap on
    "Start a Goal" / "Learn More" should still fire it (they had no
    link or interaction when the slider was tested on 2026-10-20).
- `CreditScoreGauge.tsx` — the Score tab's credit score gauge, defaulting
  to the reference design: 742, green ▲ 1.
  - **Arc:** five equal segments, one per range — Deficient 300–499 red,
    Unfavorable 500–599 orange, Fair 600–659 yellow, Good 660–779 light
    green, Excellent 780–850 dark green. Equal slices match the app, so
    the pointer is placed by how far the score sits inside its own range
    (742 lands near the end of Good; 806 a third into Excellent). The
    pointer ring takes its range's colour.
  - **Details from the app screenshot:** each block is a filled shape
    with a 2.5px outline a shade darker than its colour (`outline` in
    `RANGES`); the pointer ring has the same darker edge inside and out;
    the ▲/▼ has softly rounded corners.
  - **Properties:** Score (300–850), Change (Up = green ▲ / Down = red ▼)
    and Amount.
  - **Date:** "Updated:" shows today's date and rolls over just after
    midnight on a page left open. Hidden until mounted (fixed placeholder
    on the server render) so no wrong date flashes.
  - **Info pop-up:** the ⓘ button opens the ranges text over a dim that
    covers only the page's **Scrollable Content** frame (found by its
    layer name, `data-framer-name`), so the header and bottom nav stay
    clear. It's portaled into that frame over its visible part, which
    stops scrolling while open; if the frame is renamed it falls back to
    the nearest scrolling ancestor. z-index 9999, below
    `AppInactivityOverlay`'s 99999. Closes on ×, a tap outside the card,
    or Escape. Never opens on the canvas.
  - Fixed 1000×690 layout in Inter (app styles); "VantageScore 3.0" in
    dark app blue `#0e3a70`, "TransUnion" bold.
