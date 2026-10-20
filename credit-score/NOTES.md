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
  - **Swipe guard (both sliders):** a tap is cancelled if the pointer
    moved more than 10px since it went down. It used to rely on
    `onDragStart`, which Framer Motion runs on the next animation frame,
    so a fast swipe's click could slip through first. On the live site a
    swipe opened card 2's link that way (2026-10-20).
  - **CardSlider with link buttons:** the guard calls `preventDefault`
    as well as `stopPropagation`, since a slide's button can be a link
    whose `href` would still open; and `onDragStartCapture` blocks the
    browser's own link/image drag, which otherwise cancelled any mouse
    swipe that started on a button. Found on the live site 2026-10-20
    (a swipe from "Learn More" opened its link). Taps on "Start a Goal"
    and "Learn More" opened their links live. **Re-tested live after
    publishing the fix:** fast swipes starting on either button change
    slide without opening its link (browser link-drag blocked each
    time); both ends hold from the buttons; dots 1, 2, 1 land on 1, 2,
    1; a plain tap on "Start a Goal" still opens its link.
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
  - **Live-tested 2026-10-20:** "Updated:" showed that day's date; ⓘ
    opened the pop-up dimming exactly Scrollable Content's visible area
    with its scroll locked; ×, a tap outside and Escape each closed it
    and restored scrolling.
- `OfferCardSlider.tsx` — the Score tab's "Recommended for You" offer
  cards. Unlike CardSlider, **whole cards slide**: the current card sits
  in the middle with its neighbours peeking in, clipped 33px in from
  each side as in the app. Not looped (the ends only stretch and spring
  back). Dots below, Navy `#002C44` for the current card (star 45px,
  both set by the owner in Framer); tapping a dot or a
  peeking card brings that card to the middle.
  - **Properties:** a Cards list (add/remove/reorder), each with Title,
    Body, Image and Link. Defaults are the four app offers (auto loan,
    balance transfer, consolidation, home loan) with empty image slots
    (grey placeholder) — images are picked in Framer, never committed.
  - The "Recommended for You" badge and its star are fixed, with no
    property.
  - **Images** all render 190px wide and keep their own proportions
    (height capped at 240px), so different-sized images line up at the
    top right like the app.
  - **Links:** the whole current card is the link (Framer Link control
    → a plain `<a href>`, like SetTravelNotice). A swipe never opens a
    link; a card with no link does nothing.
  - Tested (2026-10-20): swipes, both ends, dots and tapping a peeking
    card in Preview; links on the **live site** — a tap on card 1 opened
    `/base-pages/accounts`; a later fast swipe opened card 2's link
    (fixed by the swipe guard above). **Re-tested live after the fix:**
    fast swipes across cards 1–3 moved one card each without opening a
    link; swiping past the last and before the first card holds;
    dots 4, 2, 3, 1 each brought their card to the middle; taps opened
    `/base-pages/accounts`, `/base-pages/card-alerts`,
    `/pin-reset-tutorial/accounts` and `/`. Test links on the live site only: Framer's Preview
    404s them. The four links are placeholders until the real page and
    section exist.
- `PointsJourneyBar.tsx` — Score Rating → Points Journey. The score's
  range and the next one up (or the one below, for Excellent) as two
  equal bars with a pointer, the boundary numbers (e.g. 659 / 779 / 850),
  a tick and "Your Score: 720". Properties: **Score**, **Label** ("Your
  Score:"). 840×290. The range names above the bars are native text and
  must be changed by hand if the score moves into another range.
- `ScoreHistoryChart.tsx` — Score Rating → Score History. Line and area
  chart with dots, dashed gridlines, a y-axis in 20s that fits the
  scores, and a callout on the latest score. Property: **Scores** (oldest
  first; the last is this month). The month labels are worked out from
  today's date and always end on the current month (in November:
  JUN–NOV), hidden until mounted and re-read just after midnight.
  840×660.
- `MiniScoreGauge.tsx` — Score Rating → Average Score. The small arc
  gauge: red → green gradient from 300 to the score, a dot in the
  score's range colour, the score and 300 / 850. Property: **Score**.
  330×215. Use two side by side (yours and the ZIP average).

## Native build spec: Analysis tab + Score Rating accordion

Built natively in Framer (the owner keeps full control of the text);
only the charts above are code. Sizes are for the 1080-wide kiosk
(1.25× the phone screenshots). Inter throughout, app styles. Icons come
from the **Credit Score Icons** vector set on the canvas; where a vector
isn't made yet, leave a same-sized empty frame for it. Content is for a
**720** score.

- **Section tabs** (Analysis / Report / Simulator / Goals): one row,
  four equal tabs, ~125 tall, on the page's light grey. Labels 36px
  Semibold, active Navy `#0e3a70`, others `#212121`. Active tab gets a
  5px Navy underline as wide as the tab; a 2px `#e3e3e3` line runs under
  the whole row. A component with one variant per active tab, Tap →
  change variant.
- **Score Rating accordion** (a component, Closed / Open variants, Tap
  on the header toggles):
  - Card: white, 2px `#e3e3e3` border, radius 8, an 8px left accent bar
    in the rating colour (Good `#4db67a`; Excellent `#2f7f52`), full
    content width with ~33px page margins, 25px between accordions.
  - Header ~160 tall: "Score Rating" 38px Bold at 60px from the accent
    bar; the rating ("Good") 38px Semibold on the right; chevron vector
    at 52px from the right edge (down when closed, up when open).
  - Open: 2px `#e3e3e3` divider under the header, content padding 60
    left / 52 right. Two intro paragraphs 37px Regular `#5e5e5e`, line
    height 1.65, 44px apart. "Score Rating Analysis" 37px Bold, ~90px
    above it. Four bullets 33px `#212121`, line height 1.45, 10px dots,
    46px text indent, 26px apart.
  - Inner tabs panel: `#f7f7f7`, radius 8, ~900 wide. Three equal tabs
    (Points Journey / Score History / Average Score), two-line labels
    36px Semibold centred; active Navy with a 5px Navy underline, others
    `#212121` with a 4px `#e0e0e0` underline, 12px between underlines. A
    component with one variant per tab. Content padding 32.
    - Points Journey: "Keep it up!" 36px Bold, then "You're 60 points
      away from an Excellent rating." 37px; "GOOD" (left) and
      "EXCELLENT" (right) 26px Semibold, letter spacing 3; then
      PointsJourneyBar (Score 720).
    - Score History: ScoreHistoryChart (scores ending at 720).
    - Average Score: "Congratulations, you're above the average credit
      score in your ZIP code." 37px; two columns, each a 26px Semibold
      heading with letter spacing 3 ("YOUR SCORE", "AVE. SCORE IN ZIP"),
      a MiniScoreGauge (720; 690) and "Rating: Good" 32px.
  - Credit Score Simulator card: white, 2px `#e3e3e3` border, radius 8,
    padding 60, centred: the atom vector (~105px), "Credit Score
    Simulator" 38px Bold, the description 33px `#212121`, and a "Learn
    More" button — reuse the **Slider Button** component.
