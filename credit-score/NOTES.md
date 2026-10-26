# Credit Score — Notes

The phone app's Credit Score pages (tutorials kiosk, app styles from
`design.md` §4). Each top tab is its own page: Score is
`/base-pages/credit-score-score`; Offers, Alerts and Resources get their
own pages. The Score page holds more tab and slider elements of its own.

In Framer, every code component and override for these pages goes in
the existing **Phone Components → App UI → Credit Score** folder, under
both Assets → Components → Project and Assets → Code. Don't create new
folders for them.

## Alerts page — where we stopped (26 Oct 2026)

Spec: `docs/superpowers/specs/2026-10-22-credit-score-alerts-design.md`.
Page `/base-pages/credit-score-alerts` (draft). Component **Alerts Feed**
(Phone Components/App UI/Credit Score, node `LdC9I0EAx`) sits between
the description and the owner's "Welcome to Credit Alerts Feed" block,
95% wide.

Done in Framer:
- 8 variants: All, New, Updates, Monitoring, each with an Open one.
  Cards hidden per variant as the spec's table says; field label per
  variant; chevron flipped and options list shown in the Open ones.
- Current option is Bold in each Open variant.
- Filter Field tap: each closed variant → its Open one and back (all 8
  checked).
- Option taps (All Alerts → All, New Alerts → New, Credit Updates →
  Updates, Credit Monitoring Alerts → Monitoring) set in all 4 Open
  variants. "Click" in Interactions is Framer's own tap trigger, not a
  component event.
- **Open/close tap is on "Header", not "Filter Field".** Options sit
  inside Filter Field, so a tap on Filter Field also fired after every
  option tap and sent it back to the closed variant of the current
  filter (options never worked). Moved the tap to Header in all 8
  variants (closed → its Open one, Open → its closed one); Filter Field
  has no interaction.
- **Options float over the cards** (owner's choice, 26 Oct): Options is
  Absolute, pinned top 114 / left 0 / right 0, width 100%, z-index 10,
  with its own white fill, 2px `#E3E3E3` border, radius 8, shadow
  0 1 6 black 20% (same as the field), padding 32 40 32 40. Filter
  Field's overflow is Visible so the list can show outside it. All set
  on the primary; the Open variants inherit it.
- Preview check (26 Oct): every variant opens and closes by its header,
  and all 16 option taps land on the right variant; the list floats over
  the first card.
- The component has no variables or events (toolbar's variables
  button shows none), so there was no stray "Click" event to delete.
- Code overrides from `AlertsStore`: `withMarkAllRead` on "Mark All
  Read", `withAlertBadge` on the three cards' "Grade Pill". Set on the
  primary; layer search shows all 8 variants inherit them (hidden
  layers in the Monitoring ones).
- `AlertsStore.tsx` is in Framer under Code (matches the repo).
- Page: the instance is on the All variant, 95% wide, Fit height, inside
  "Header + Description" (Fit). "Scrollable Content" is fixed 1423 with
  Overflow Scroll, so the canvas cuts it off; in Preview it scrolls to
  the copyright and bottom nav with nothing clipped.
- Left alone: three top-level canvas layers copied from the Score page
  (Slide 1, Slide 2, Section Tabs) and a spare Phone Components
  instance at x 1554. They sit outside Kiosk and don't render.

- **Live test (26 Oct, after the owner's publish), all passed:** header
  opens and closes in all 4 filters (current option bold); all 16
  option taps land on the right filter with the right cards (All: Mark
  all as read + 3 updates + 2 monitoring; New/Updates: Mark all as read
  + 3 updates; Monitoring: 2 monitoring); the open list sits on top of
  the first card. Mark all as read hides the 3 NEW badges in All, New
  and Updates, lists unchanged, a second tap is harmless; still hidden
  after going to Accounts and back; back after a refresh. The three
  "View …" links and both monitoring cards do nothing (no targets yet).
- **Card dates follow today** (owner's ask, 26 Oct): overrides in
  `AlertsStore.tsx` swap each date layer's text, keeping its style.
  `withThisMonth` on the three credit update dates ("October 2026"),
  `withTwoMonthsAgo` on Alert Monitoring 1 ("August 2026"),
  `withNineteenMonthsAgo` on Alert Monitoring 2 ("March 2025", kept at
  the same distance back). Format "Month YYYY", re-read after midnight,
  hidden until mounted. The canvas still shows the typed dates. Set on
  the primary; all 8 variants inherit them. **Live check (26 Oct):**
  real date shows October 2026 ×3, August 2026, March 2025; with the
  page clock faked to 15 Jan 2027 (then Accounts and back to remount)
  every filter, open and closed, showed January 2027 ×3, November 2026,
  June 2025. Back to the real dates after a refresh.
- **Opened monitoring alerts (26 Oct, in progress):** new component
  **Monitoring Alert** (Phone Components/App UI/Credit Score), variants
  Closed / Open. Open shows a "Details" stack (2px `#E3E3E3` top
  border, padding-top 30, rows gap 24): Account Balance, Account
  Number, Address, Creditor Name, Industry Type, label left / bold value
  right in equal columns; the chevron is rotated 180°. Each value is a
  component variable. Made-up values only (owner's rule): card 1 $240 /
  47219300**** / PO BOX 4420, COLUMBUS, OH, 43218 / NORTHWIND CARD
  SERVICES / Credit Card Services; card 2 $1,180 / 83620500**** / PO
  BOX 1875, TAMPA, FL, 33631 / BLUE HARBOR RETAIL CARD / Department
  Stores. Both feed cards are instances with `withMonitoringAlert1` /
  `withMonitoringAlert2` (only one open at a time; tap again closes);
  the date inside uses `withMonitoringDate`, which reads the card's
  months-back from React context. Framer's "Auto rename" ran once by
  mistake inside this component (layer names Month, Title, Chevron,
  Description, Balance Row…); nothing outside it changed.
  **Preview:** taps didn't open either card, and card 2's date showed
  this month instead of 19 months back, so the card overrides weren't
  running there. Needs a live check after publishing.
- Framer editing tips: single-letter keys typed while a layer (not its
  text) is selected trigger shortcuts; enter text with Return on the
  selected text layer instead of double-click. In the context menu,
  type the action, then Down + Return ("rename" picks Auto rename, so
  double-click the layer name instead).
- Live-testing tip: the built-in browser pane resized the kiosk page
  mid-test and its taps didn't register; Chrome with real clicks worked.
  Scroll the target to the viewport centre with JS, then click there.

Still to do:
1. The top tabs (Score, Offers, Alerts, Resources) on the alerts page
   have no link set. The owner will link them (26 Oct); leave them
   alone and don't count this against the alerts page being done.
2. Waiting on the owner: screenshot of an opened monitoring alert, and
   the check icon next to "Mark all as read".
3. PR #19 merges only after the alerts page is done (merge commit).

Framer tip: menu items in the Interactions + menu don't respond to
clicks from the browser tools; open the menu, then press Down and
Return (Down once = New transition = tap → Set variant).

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
- `PaymentHistoryChart.tsx` — Payment History → Performance Chart. The
  ScoreHistoryChart pattern on a fixed 0–100% axis: green line `#4a9a5f`,
  fill `#d3e6db`, a "%" callout on the latest month, and the first month
  label carries its two-digit year (MAY 26). Property: **On Time %**
  (oldest first, 0–100; defaults to six 100s). 840×660. Still at the
  top of Components → Project on 2026-10-22: the owner needs to drag it
  into App UI → Credit Score (code components can't be renamed into a
  folder, and asset drags don't register through Chrome). Has **Line** and **Fill** colour
  properties (green defaults) so Credit Usage → Card Usage History reuses
  it in blue (`#4C6EF5` / `#AFC0F7`); the array control is now titled
  "Percents".
- `CardUsageBars.tsx` — Credit Usage → Primary Cards Usage. One row per
  card: name (ellipsised, underlined, tracked), a track split at the
  marker percents (30 / 50), green fill + ringed knob at the percent used,
  the percent above the knob, dashed marker lines through all rows and
  30% / 50% / 100% labels below. Properties: **Cards** (Name, Used %),
  **Markers**, colours (Fill, Track, Knob Centre, Marker Lines, Text),
  Name / Percent / Axis fonts, tracking, Underline Names, and sizes (Name
  Width, Name Gap, Row Height, Bar Height, Knob Size, Knob Ring, Segment
  Gap, Percent Gap, Axis Space). Width any, height auto. Made-up defaults:
  Vertical Checking 7%, Platinum Rewards Checking 3%.
- `CreditScoreEventsChart.tsx` — the Analysis tab's "Credit Score Events"
  card (after Promo Cards, above the Disclaimer). A 6M / 1Y / 2Y toggle,
  a legend, and two stacked line-and-area charts on one month axis:
  score (fits its axis in 20s) on top, Payment History and Credit Usage
  (0–100%) below. The toggle is in code, not native variants, so the
  months are entered once. Properties: **Scores**, **On Time %**,
  **Usage %** (oldest first, last = this month; 2Y uses the last 26) and
  line/fill colours. Each range shows 6 / 13 / 25 months plus one
  lead-in month at the left edge; dots only in 6M. Labels: every month /
  3rd / 6th, with the two-digit year on the first label and wherever the
  year changes (MAY 26; OCT 25, JAN 26…). The marker and callouts sit on
  the latest month; a tap or drag moves them, switching range resets.
  906×1420. Made-up 720 data; the last six scores and usage values match
  ScoreHistoryChart and Card Usage History. Needs dragging into App UI →
  Credit Score (still at the top of Components → Project).
- `AccountBalanceBars.tsx` — Account Mix → Accounts Breakdown. One row per
  account type: tracked caps label, a rounded bar filled in proportion to
  the largest balance, the balance on the right. Properties: **Rows**
  (Label, Amount), Fill / Track / Text colours. Width any, height auto.
  Defaults: every row $0 (the owner set Credit Cards to $0 in Framer;
  $920 was the owner's own figure and must not be used). Needs dragging
  into App UI → Credit Score.

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
  - **Built 2026-10-21:** component **Section Tabs** (Components →
    Project → Phone Components → App UI → Credit Score), variants
    Analysis (primary) / Report / Simulator / Goals. 1080×125
    horizontal stack, gap 0, no fill, 2px `#E3E3E3` bottom border.
    Each cell ("Tab Analysis"…) is 1fr × 125, centred, with a bottom
    border linked to **Deep Interface** (`#0E335E`): 5px on the active
    cell, 0 on the others. Labels Inter Semibold 36, line 1.2, no text
    style; active linked to Deep Interface, others plain `#212121`
    (no near-black colour style exists). Each cell has Click (onTap) →
    Set variant on the primary, inherited by every variant. Placed by the
    owner in Scrollable Content below the last slider; the original
    instance is still off-page on the Score canvas (x1448, y150).
  - **Live-tested 2026-10-21:** four 270×125 cells. Real clicks on
    Report, Simulator, Goals, then Analysis each moved the 5px underline
    and the `#0E335E` label to the tapped tab and left the others at 0px
    / `#212121`; the page never navigated.
  - Framer files a new component at the top of Components → Project;
    renaming it `Phone Components/App UI/Credit Score/<Name>` moves it
    into the existing folder (the asset menu has no Move item).
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
  - **Built 2026-10-21 (not yet placed or live-tested):**
    - **Score Rating Accordion** component (App UI → Credit Score),
      variants **Closed** (primary, Body hidden) / **Open**. Click on
      Header → Open; overridden to → Closed in Open. 1014 wide, white,
      radius 8, clip; border 2px `#E3E3E3` top/right/bottom, 0 left; the
      8px Good-green accent is an **inside shadow** (x 8, blur 0,
      `#4DB67A`), not a layer. Header: 160 tall, padding 68 left / 52
      right, "Score Rating" Bold 38 and "Good" Semibold 38 (`#212121`),
      plus an empty 36×36 **Chevron** frame (no chevron in Credit Score
      Icons yet). Body: 2px `#E3E3E3` top border, padding 60/52/60/68,
      gap 44: intro (one text layer, two paragraphs, 37 Regular
      `#5E5E5E`, line 1.65, paragraph spacing 44), "Analysis" group
      (46 top padding, gap 30: heading Bold 37, one native bulleted list
      Regular 33 line 1.45 — paragraph spacing didn't visibly apply to
      list items), the Score Rating Tabs instance, the Simulator card.
    - **Score Rating Tabs** component (App UI → Credit Score), variants
      Points Journey (primary) / Score History / Average Score; each
      cell's Click → its variant. Panel `#F7F7F7`, radius 8, padding
      0/27/32/27, gap 32. Tab cells copied from Section Tabs (two-line
      labels), gap 12; active 5px Deep Interface + Deep Interface label,
      others 4px `#E0E0E0` + `#212121`. Each variant shows only its
      content: Points Journey ("Keep it up!" Bold 36, sentence 37
      `#5E5E5E`, GOOD/EXCELLENT 26 Semibold 3px tracking, PointsJourneyBar
      720), ScoreHistoryChart (defaults, ends at 720), Average Score
      (sentence + two columns: heading, MiniScoreGauge 720 / 690,
      "Rating: Good" 32).
    - Simulator card: "Credit Score Icons" instance set to the Credit
      Score Simulator (atom) icon at 105; "Slider Button" is a native
      stack inside Credit Score Slides (not a component), so it was
      copied in and relabelled "Learn More" (no link).
    - The intro, bullets and simulator description are **draft copy**
      written for a 720 score; the owner should replace them.
    - **Placement (owner):** the accordion lives inside **Section Tabs**
      (each variant: "Tabs" row + "Accordions Frame"), so the tab content
      switches with the section tab. The page instance must be height
      **Fit content**: a fixed 125 clipped everything below the tab row
      (only a 125px strip was visible/tappable and the accordion grew
      upward). Setting Fit on that instance didn't take, so it was
      replaced with a fresh Fit copy after OfferCardSlider.
    - **Live-tested 2026-10-21:** header tap opens (header stays put) and
      closes; inner tabs Score History → Average Score → Points Journey
      each move the 5px Deep Interface underline/label and show only their
      content; the Simulator card shows while open; no navigation.
    - **Fuller live test 2026-10-21 (stopped early at owner's request):**
      section tabs Report/Simulator/Goals/Analysis and re-tap all correct;
      under Analysis all six inner-tab transitions + re-taps correct,
      chevron flips 180° when open, Learn More does nothing (no link);
      accordion open state and inner tab carry across section-tab
      switches; under Report all inner tabs, close and re-open correct
      (re-open resets to Points Journey). Goals' underline is 5px while
      the others are 6px. **Not tested:** accordion under Simulator and
      Goals, and the boost card / gauge ⓘ / offer slider after the
      Section Tabs swap.

- **Payment History accordion** (Grade A), built 2026-10-21, not yet
  live-tested:
  - **Payment History Accordion** component (App UI → Credit Score), a
    copy of Score Rating Accordion: Closed (primary, Body hidden) / Open,
    variant transition Spring 0.4 with Bounce 0 (Score Rating's also
    toned down to Bounce 0). Accent shadow `#3D895D`; header pill
    "Grade A" (`#C0F3DE` fill, `#19412D` text).
  - Body order: intro (**40%** and **Payment History,** bold) → Grade
    Section (pill + "Way to go!…", **keeps your grade at an A.** bold) →
    Recommended Actions (`#F2F4F6`, 3px `#0D294B` border, radius 8,
    padding 50) → Pro Tip (`#FAFAFA`, no border, radius 8, padding 50,
    icon + title row gap 30) → Performance Tabs → consolidation card (the
    Simulator card copy: coin-in-hand "Debt Consolidation" icon, $80
    text, Learn More with no link).
  - **Performance Tabs** component (App UI → Credit Score), duplicated
    from Score Rating Tabs: variants Performance History (primary) /
    Performance Chart, panel `#FAFAFA`. History: three `#F6F6F6` rows
    (radius 8, padding 30, gap 30) with a **placeholder "Score" icon**
    (no check icon in Credit Score Icons yet). Chart: "Track the
    percentage of open accounts being paid on time." + PaymentHistoryChart.
  - Placed in Section Tabs → Analysis → Analysis Tab Content →
    Accordions Frame, under Score Rating, width Fill.
  - Fixed: texts coloured while the picker was on its Conic tab rendered
    as a conic gradient (Score Rating's Simulator card title and
    description, and the copies here); all set back to solid `#212121`.
    Always pick the Solid tab before typing a hex.

- **Credit Usage accordion** (Grade A), built 2026-10-21, not yet
  live-tested: **Credit Usage Accordion**, a duplicate of Payment History
  Accordion with its own texts (23% intro, "Nicely Done!…", Recommended
  Actions without the owner's name, Pro Tip), then **Credit Usage Tabs**
  (duplicate of Performance Tabs: Primary Cards Usage / Card Usage
  History), then a "Transfer Balances and Save" card ($79, Learn More, no
  icon). Primary Cards Usage: "You're using $1,215 out of your $6,000 total
  credit limit." (was the owner's $920 / $20,000) + CardUsageBars + "View all accounts" (Bold, `#0D294B`,
  no link) + italic 30px "Charge cards not included in calculation". Card
  Usage History: "1% increase since last month." + blue PaymentHistoryChart
  (2, 6, 18, 3, 4, 5%). $920 turned out to be the owner's (see below). Placed in Accordions
  Frame under Payment History, width Fill.

- **Live test 2026-10-22** (published by the owner, 1080×1920 viewport,
  real clicks):
  - Credit Usage, Payment History and Score Rating each open and close
    with the header fixed and the chevron flipping; Learn More and "View
    all accounts" do nothing.
  - Credit Usage Tabs and Performance Tabs switched content and
    underlines correctly, **but in their second variant the labels kept
    the first variant's colours** (inactive tab Deep Interface, active
    `#212121`). Fixed in Framer the same day: the second variant's first
    label is now plain `#212121`, its second label linked to Deep
    Interface. Score Rating Tabs was already right. Not yet re-tested
    live.
  - CardUsageBars and the blue Card Usage History chart render (MAY 26 →
    OCT); the Simulator card text is solid `#212121`.
  - Section tabs: all four plus re-taps correct. Report, Simulator and
    Goals now hold only the tab row, so the accordions close whenever
    you leave Analysis. Goals' underline is still 5px (others 6px).
  - Boost card: dots, swipes both ways, both ends hold; Start a Goal and
    Learn More now have no link. Gauge ⓘ: today's date; × / outside tap
    / Escape close it and restore scrolling. Offer slider: all dots,
    swipes, both ends, taps on both peeking cards; card taps do nothing
    (links removed).
  - The gauge still shows **742**; the accordions are written for 720.

- **Account Mix accordion** (Grade B), built 2026-10-22, not yet
  live-tested: **Account Mix Accordion**, a duplicate of Credit Usage
  Accordion. Accent shadow `#51B07A` (both variants), header and body
  pills "Grade B". Body: intro (**11% of your score is Account Mix,**
  bold), grade text, Recommended Actions without the owner's name ("You
  currently have **no** open installment accounts…", link sentence bold
  `#0D294B`, no link), Pro Tip (the screenshot cut off its last words;
  "…as a gap in your credit history." is a guess), then **Account Mix
  Tabs**. No promo card.
  - **Account Mix Tabs** (duplicate of Credit Usage Tabs, so its labels
    carry the colour fix): variants Accounts Breakdown (primary) /
    Account Categories. Breakdown: "Your total balance is $920" +
    AccountBalanceBars (Fill). Categories: three rows copied from
    Performance Tabs, each a vertical stack (padding 30, gap 30): a
    header ("**0** INSTALLMENTS", "**4** REVOLVING", "**0** COLLECTIONS";
    Semibold 25, 0.16em, `#212121`) above the icon + message row. Icons
    are the placeholder "Score" vector; the app uses a yellow ! and
    green ticks.
- **Credit Age accordion** (Grade A, `#3D895D` kept from Credit Usage),
  built 2026-10-22, not yet live-tested: **Credit Age Accordion**,
  duplicate of Credit Usage Accordion with its own intro (**21%**), grade
  text (**avoid accidental damage**), Recommended Actions without the
  name (link sentence `#0D294B`), Pro Tip, then **Age Panel** (a Pro Tip
  copy: "Oldest Account vs Average Age of Credit" title and two
  `#F6F6F6` rows, radius 8, padding 30). Row texts are made up, not the
  screenshot's: "**6 Yrs.** is your average age of credit." / "Based on
  4 open accounts." (28) and "**10 Yrs. And 5 Mos.** is the age of your
  oldest open account." / "PLATINUM REWARDS CARD" (25 Semibold, 4px
  tracking, not underlined) / "Open since: May 15, 2016". No card icon
  yet. No tabs, no promo card.
- Both placed in Accordions Frame after Credit Usage, width Fill. The
  owner's screenshots also show an **Inquiries** accordion (Grade A);
  not built yet.
- **Building text in Framer through Chrome:** select a text layer, press
  Return to edit, cmd+A, then dispatch a `paste` ClipboardEvent with
  `text/html` on the focused ProseMirror editor: `<strong>` survives,
  inline colour doesn't. To style part of a text, set a DOM Selection on
  the words while editing and change Color / Size / Letter / Weight in
  the Style panel; only the selection changes. Wrap layers in a stack
  with right-click → type "stack" → Return. Sizing and font-weight
  dropdowns are native selects (set value + change event).
- **Credit Score Events card** (2026-10-22): a copy of the "Set Up your
  Goal" promo card, last child of Promo Cards (so it sits above the
  Disclaimer), with only its title kept ("Credit Score Events", Extra
  Bold 40, left) and a CreditScoreEventsChart instance below.
  - Widened 2026-10-22 at the owner's request: the chart is now 946
    wide (the card's inner width; instance set to 946 Fixed), so the
    6M / 1Y / 2Y toggle and the graphs sit centred with 40 px either
    side, and the latest month moved to 50 px from the right edge (was
    106 px of empty grid after it). The legend stays at the chart's left
    edge, in line with the heading. Checked on the canvas; not live yet.

- **Live test 2026-10-22 (second publish):**
  - Performance Tabs and Credit Usage Tabs: labels now swap with the
    underline both ways; re-taps keep the state. (Tab transitions take
    ~2 s to settle, so reads right after a tap show in-between colours.)
  - Account Mix: opens/closes with the chevron flipping, accent
    `#51B07A`, texts and bold as built, link sentence `#0D294B` with no
    link (tap does nothing). Account Mix Tabs: both tabs, re-taps and
    label colours correct; AccountBalanceBars and the three category
    rows render. Its first open after page load took over 2 s; later
    opens ~1 s.
  - Credit Age: opens/closes in under 1 s, accent `#3D895D`, texts, bold,
    link colour and Age Panel as built.
  - Credit Score Events: renders in 6M with the latest month selected
    (720 / 100% / 5%), labels MAY 26 → OCT. Taps on JUL and MAY and a
    drag to SEP move the marker and all three callouts; taps past either
    end clamp. **Bug:** tapping 1Y crashed the component (the card went
    blank). Right after a range switch `useMonths` still held the old
    range's 6 months, so `label()` read an undefined date. Fixed by
    returning the months only when their count matches; pasted into
    Framer and saved (matches the repo). **Range toggle not yet
    re-tested live** — needs another publish.
- **Live test 2026-10-22 (third publish, range toggle):** no crash.
  6M → 1Y → 2Y → 6M plus a re-tap of each all work; the selected range
  turns Bold Deep Interface. 6M: 6 scrubber circles, dots on the lines,
  labels MAY 26 → OCT. 1Y: 13 circles, no dots, labels OCT 25 / JAN 26 /
  APR / JUL / OCT. 2Y: 25 circles, labels OCT 24 / APR 25 / OCT / APR 26
  / OCT. Score axis 680–720 in every range. Month taps matched the
  default data in every range (6M: MAY 702/2%, AUG 711/3%; 1Y: OCT 25
  705/8%, JAN 707/3%, APR 704/3%, OCT 720/5%; 2Y: OCT 24 690/10%, APR 25
  703/10%, OCT 25 705/8%, APR 26 704/3%), so a month shows the same values
  in each range. Drags land on the month under the pointer (1Y → JUL
  699/18%, 6M back to JUN 708/6%, 2Y across the whole chart → OCT).
  Switching range, **or re-tapping the active one**, puts the marker
  back on the latest month. Not tested: a real touch drag (mouse only),
  so vertical page scrolling over the chart (`touch-action: pan-y`) is
  unconfirmed.

- **Inquiries accordion** (Grade A, `#3D895D`), built 2026-10-22, not
  yet live-tested: **Inquiries Accordion**, a duplicate of Credit Age
  Accordion. Intro (**5%**), grade text (**mindful borrowing.**),
  Recommended Actions without the owner's name ("If you're comparing
  rates… **14-day window.** …", link sentence "Learn more about rate
  shopping." bold `#0D294B`, no link), Pro Tip, then **Inquiries Panel**
  (the Age Panel copy): "Your Recent Inquiries" title, the subtitle
  "Inquiries stay in your credit report for two years." (row 1 with its
  fill and padding removed), and an empty state (row 2: no fill, centred,
  padding 100, gap 60) with the Credit Score Icons **Inquiries** icon at
  125 and "NO INQUIRIES ON CREDIT REPORT" (Semibold 25, 4px tracking,
  centred). Placed last in Accordions Frame, width Fill.
- PaymentHistoryChart, CreditScoreEventsChart and AccountBalanceBars were
  dragged into App UI → Credit Score by the owner (2026-10-22).
- The Credit Score Icons vector set's Icon picker (Style panel →
  Credit Score Icons → Icon) lists all the drawn icons, including
  Inquiries (magnifier).
- **Inquiries live-tested 2026-10-22:** opens under its fixed header
  with the chevron flipping and closes again; accent `#3D895D`; texts,
  bold words and the `#0D294B` link sentence as built (tapping it does
  nothing, no link); the empty state shows the Inquiries icon above "NO
  INQUIRIES ON CREDIT REPORT" (Semibold 25, 4px, centred). Afterwards all
  six accordions still opened and closed, and Report → Analysis brought
  back all six plus the Credit Score Events chart.

- **No owner figures (2026-10-22):** $920 came from the owner's
  screenshots (Credit Usage), so it is gone everywhere it had spread:
  AccountBalanceBars defaults (owner edited in Framer, repo synced),
  Account Mix "Your total balance is $0", Report summary Total Balances
  and Monthly Payments $0, both credit card balances $0. Copied account
  counts changed to 2: Credit Age "Based on 2 open accounts.", Account
  Mix "2 REVOLVING", Payment History "Both open accounts are being paid
  on time." Credit Usage figures (also the owner's) replaced with a
  made-up set the owner approved (not $0, and not as low as 7%/3%):
  "You're using $1,215 out of your $6,000 total credit limit.",
  CardUsageBars 24% / 15% (code defaults too, Framer and repo identical),
  intro "20% of your score…", transfer card "$96", Card Usage History
  chart 18/22/27/24/21/20% with "1% decrease since last month."
- **Report tab** (Section Tabs → Report → Report Tab Content → Report
  Sections: vertical stack, gap 100, padding 40 top and bottom), built
  2026-10-22, not yet live-tested. In order:
  - Summary Section: Download Report Row (right-aligned "Download
    Report", Bold 37 `#0D294B`, placeholder Score icon 40, gap 16, no
    link), Summary Header (icon + "SUMMARY"), Summary Card (two centred
    columns: Open Accounts 2 / Total Balances $0 / Monthly Payments $0
    and Delinquent 0 / Derogatory 0 / Inquiries 0).
  - Credit Cards Section: header, Vertical Checking Row and Platinum
    Rewards Row (dark inside-shadow accent, name with masked number and
    "Last updated …" filling the width, Balance $0, the accordion
    Chevron at 40, gap 20), "Show Closed Accounts" (no link).
  - Auto Loans Section: "You have no open auto loans" card, "Show Closed
    Accounts".
  - Collections, Inquiries, Public Records: label, ⓘ placeholder icon,
    "You have no …" card.
  - Personal Details Section: made-up name, address and birth date.
  - Two Simulator Card copies: "See any errors?" / "Start a Dispute" and
    "Put on a credit freeze" / "Manage Credit Freeze" (atom icon as a
    placeholder; buttons have no link or tap action).
  Some inner layers still carry "Auto Loans …" names from the copy they
  started as. Reorder with cut, select the parent, paste (appends last);
  dragging rows in the Layers panel didn't take.
- **Report tab + new figures live-tested 2026-10-22** (owner published,
  1080×1920, real clicks): Report tab opens from Analysis and back with
  one tap each (also right after a real scroll); every section in order
  with the texts and $0 balances as built; Download Report, both
  chevrons, both "Show Closed Accounts", the three ⓘ icons and both card
  buttons do nothing on tap (no navigation, no scroll jump). Analysis:
  Payment History "Both open accounts…", Credit Usage 20% intro, "$1,215
  out of your $6,000", bars 24% / 15%, Card Usage History chart
  18→20% with "1% decrease since last month." (the chart is static: taps
  don't move the marker, by design), transfer card $96, Account Mix
  "Your total balance is $0" with all bars $0 and "2 REVOLVING", Credit
  Age "Based on 2 open accounts." **Bug found and fixed in Framer (needs
  republish):** the "See any errors?" card's fill was white at 20% (grey
  on the page) while the freeze card was solid; set to 100%. Rechecked live
  after the owner republished: both cards render solid white
  (`rgb(255, 255, 255)`). (The owner's first republish went out before
  the fix saved; Framer's Publish panel showed it as 1 pending change.)
  Testing note: a tap right after a scripted `scrollBy` is sometimes
  ignored; a real wheel scroll doesn't do this.
  Still the owner's figure elsewhere: OfferCardSlider's "$79 Interest
  Savings / 6 months*" offer (same $79 as the old transfer card).

- **Simulator tab** (spec `docs/superpowers/specs/2026-10-22-credit-score-simulator-design.md`,
  plan `docs/superpowers/plans/2026-10-22-credit-score-simulator.md`), built
  2026-10-22. Code: `SimulatorStore.tsx` (shared points store + Node
  self-check `SimulatorStore.check.ts`), `SimulatorScoreHeader.tsx` (two
  gauges drawn with MiniScoreGauge's exported helpers), `SimulatorAmountRow.tsx`
  (also exports `useRowEntry`, the row lifecycle the other rows share),
  `SimulatorChoiceRow.tsx`, `SimulatorToggleRow.tsx`. Visitors only tap;
  every amount and point value is a property. Score = clamp(742 + points
  of every row that's on, 300, 850).
  Layout: Section Tabs → Simulator → Simulator Tab Content (95%, gap 100,
  padding 40/40): Score Header Card (Sticky, top 0), Apply for New Credit
  Card, Manage Your Balances Card, Manage Payment Activity Card,
  Disclaimer. Made-up values: Auto $28,000 −18, Personal $12,000 −14,
  Mortgage $320,000 −35, card limit $2,500 −9, transfer $1,500 +6,
  inquiry −7, increase $2,000 −22, raise limit $4,000 +8, pay down
  $1,200 +15, pay off all +19, missed 1/2/3 mo −45/−70/−95 (One Account −15/−25/−35), on-time 9 +11.
  Still for the owner: connect the Credit Score Icons atom to the header's
  Empty Icon slot (canvas connector drag), and drag the four Simulator
  components from top-level Components into App UI → Credit Score.
  Type-checks need `--allowImportingTsExtensions` because Framer imports
  use `.tsx` paths.
- **Simulator live-tested 2026-10-22** (owner published, 1080×1920, real
  taps): empty state (grey arc, no Reset); Auto 724 ▼18, Mortgage
  replaces it 707 ▼35, re-tap clears, Personal 728 ▼14, loan ⓧ clears;
  card limit 733 ▼9, + transfer 739 ▼3, greyed −/+ do nothing, ⓧ clears
  (748 ▲6), re-tap clears; inquiry YES 735 ▼7 / NO; increase 720 ▼22,
  + raise 728, + pay down 743 ▲1, + pay off all 762 ▲20 (dark ▲); 1 mo
  717 ▼25, 3 mo replaces 667 ▼75, + on-time 678 ▼64, 2 mo 703 ▼39,
  re-tap clears 773 ▲31; Reset empties the gauge and turns every row
  off; header stays pinned while scrolling; leaving for Analysis with 3
  mo on and coming back starts empty; Analysis and Report unaffected.
  Not checked live: clamping (the made-up values can't leave 300–850;
  covered by the self-check and the canvas Preview Points test), and the
  count-up smoothness (the test pane was a hidden background tab, so
  animation frames were throttled).
- **Review fixes live-checked 2026-10-22** (owner republished): header
  starts empty, Mortgage gives 707 ▼35 with the red ▼ and Reset, Reset
  empties it and turns every row off. The Min-below-300 fix was checked on
  the canvas (Min 250 → 250 ▼492 instead of blank); the Empty Icon fix
  can't be seen until the atom is connected.
- **Simulator empty-state icon (2026-10-22):** the ComponentInstance slot
  never appears in the properties panel (Framer shows it only as a canvas
  outlet for top-level frames), so SimulatorScoreHeader now imports the
  Credit Score Simulator vector directly:
  `https://framer.com/m/Credit-Score-Simulator-odYa5A.js` (from the vector
  set → Credit Score Simulator → right-click → Copy → Copy URL). Edits to
  that vector carry through. Properties: Icon When Empty, Icon Size (110).
  For the local type-check, add a scratch `framer-url-modules.d.ts`
  declaring `"https://framer.com/m/*"` as a component module. Also: the
  simulated number and its ▼/▲ change are centred on the arc as one group
  (the owner's call; centring the number alone left the group looking
  off-centre).
- **Live-checked 2026-10-22** (owner republished): the empty simulated
  gauge shows the Credit Score Simulator atom centred in the grey arc;
  Mortgage gives 707 ▼35 with the number centred on its arc (matching 742
  on the current gauge) and the ▼35 to its right; Reset brings the atom
  back.
- **Score change restyled (2026-10-22):** the ▼/▲ points are smaller
  (Change Font default 24, was 32) and sit on 707's baseline (inline-block
  column, so the bottoms of both numbers line up). The triangle is drawn
  in SVG with round stroke joins, so its corners are slightly rounded
  like the app's.
- **Score change live-checked 2026-10-22** (after the owner republished
  twice; the first live check still served the previous build): group
  box 737–939 vs arc 698–978, both centred at 838 (page px at 1080 wide);
  "707" and "35" share a baseline (both at y 822); triangle drawn with
  rounded corners. Measuring tip: a Range over the group also counts the
  screen-reader-only "down/up" text and reads ~17px right; measure the
  group's box instead.
- **Score sits on the arc's end line (2026-10-22):** the current score,
  the simulated group (number + ▼/▲ change) and the empty-state atom now
  rest on the line where the arc's two ends finish (digits' baseline on
  the line via a -0.136em Inter offset; the atom offset by the 3.05px of
  empty space at the bottom of its 40px vector frame). Checked on the
  canvas in both states. The − / + steppers stay (owner decision): greyed
  and inert. Picking a loan never fills the card-limit or transfer
  fields; each row is its own action (Starts On pre-fills one if wanted).
- **Arc end-line alignment live-checked 2026-10-22:** empty state: arc end
  1440.0, 742's baseline 1440.0, atom's drawn bottom 1440.0 (frame bottom
  1448.4 − 8.4px of vector padding). Filled (Mortgage): arc end 840.0,
  707's baseline 840.1, 35's baseline 840.3 (page px at 1080 wide).
  Measuring note: inline spans report the font's content box (baseline at
  0.969em from top for Inter); block/flex spans with line-height 1 report
  the line box (baseline at 0.864em).
- **Gauge labels centred (2026-10-22):** "CURRENT SCORE" / "SIMULATED
  SCORE" read 2px left of their arcs on the live page (text box centred,
  but CSS letter spacing also trails the last letter, so the visible
  letters sat 2px left). The label now has left padding equal to its
  letter spacing; on the canvas both labels' visible text centres within
  1px of their arcs. Goes live with the next publish.
- **Grey empty-state icon (2026-10-22):** the owner added "Credit Score
  Simulator-Grey" to the Credit Score Icons set; SimulatorScoreHeader now
  imports `https://framer.com/m/Credit-Score-Simulator-Grey-ndndRc.js`.
  (Tinting the navy one from code with a CSS mask failed: the vector
  component's ref gives no image src.) Checked on the canvas: grey atom
  on the arc's end line. Goes live with the next publish.
- **All Accounts / One Account (2026-10-22):** the missed-payment row only
  had a fixed "All Accounts" caption, so the score couldn't differ by
  account. SimulatorChoiceRow gained Account Choice (Segmented only): an
  All Accounts / One Account pick (All by default, back to All on Reset)
  above the months, and each option a Points (One) value. The row
  reports the month's Points for All, Points (One) for One; switching
  account with a month picked moves the score at once. Made-up values:
  All −45/−70/−95, One −15/−25/−35. Checked on the canvas; the tap test
  needs the next publish.
- **All / One Account live-tested 2026-10-22** (owner published,
  1080×1920, real taps): starts on All Accounts; All 1/2/3 mo 697 ▼45 /
  672 ▼70 / 647 ▼95; One 1/2/3 mo 727 ▼15 / 717 ▼25 / 707 ▼35;
  switching account with a month picked moves the score at once;
  tapping All again keeps it; re-tapping the month clears; One with no
  month leaves the gauge empty; One 1 mo + on-time 738 ▼4; Reset empties
  the gauge, turns on-time off and goes back to All; leaving for
  Analysis and returning starts empty on All. Group centring live: box
  centre = arc centre (838) for every value; visible ink within 1–1.7px
  (glyph side bearings).
- **Smaller score, green ▲ (2026-10-22):** the owner's reference shows
  the score taking ~46% of the arc's width (ours was ~57%), so Score
  Font default 92 → 72 (both gauges). Up Colour default `#212121` →
  `#4DB67A`, the gauge's green (down stays the gauge red). Checked on
  the canvas with Preview Points +11 and −35: green ▲, red ▼, group ink
  centred on the arc within ~0.5px. Preview Points set back to 0. Goes
  live with the next publish.
- **Option label–amount spacing (2026-10-22):** the owner asked for more
  room between an option's label and its amount ("Auto Loan" /
  "$28,000"). SimulatorChoiceRow's option gap 4 → 12px (also spaces the
  month segments, which have no amount). Checked in the code Preview.
  Goes live with the next publish.
- **Loan row segmented (2026-10-22):** the owner wanted "Get a new loan"
  to look like the All / One Account pick, with no "Loan Type" field.
  No code change: the loan instance (Simulator variant) is now Style
  Segmented with Fixed Caption blank. On the canvas: one joined bar,
  Auto Loan $28,000 / Personal Loan $12,000 / Mortgage $320,000, no
  caption field. Without the field there's no ⓧ; tapping the selected
  loan again clears it. Goes live with the next publish.
- **Loan options trimmed (2026-10-22):** segment top/bottom padding 12 →
  28px (one-line segments keep their 104px minimum, so All / One Account
  and the months are unchanged; this matches their ~28px above and below
  the text). Loan labels "Auto Loan" / "Personal Loan" → "Auto" /
  "Personal" (Mortgage unchanged), set on the loan instance. Both rows
  already use the same Option Font (38 Regular). Checked side by side on
  the canvas. Goes live with the next publish.

- **Goals tab** (spec: `docs/superpowers/specs/2026-10-22-credit-score-goals-design.md`), 2026-10-22:
  - `GoalStore.tsx`: the one goal (score, months, reason), in memory
    only, so a refresh or new tab clears it for the next user.
  - `GoalSetupCard.tsx`: the Goals tab card's contents (no card chrome),
    No goal → form → set. Current score 720; goal slider 721–850; months
    6/12/18/24; optional reason (tap the picked one again to clear).
  - In Framer: both files in Code → Phone Components → Credit Score.
    GoalSetupCard landed at the top of Components → Project; the owner
    must drag it into App UI → Credit Score. An instance sits off-page
    on the Score canvas at x2700 y-13, 906 wide, for checking.
  - Tested in a local harness (real component, stub `framer`): all three
    states, both sliders by drag and keys (ends hold at 721/850, 6/24),
    reason pick and re-tap clear, Next saves, reload clears.
  - Pasting code into Framer: copy with `LANG=en_US.UTF-8 pbcopy`, or
    non-ASCII like ® arrives garbled ("¬Æ").
  - `GoalSummaryCard.tsx`: the Analysis goal card, inside Section Tabs →
    Analysis → Promo Cards, after Set Up your Goal and before Credit
    Score Events (width 100% Rel). Carries its own card look (white,
    radius 8, padding 40, the promo cards' shadow) because with no goal
    it renders nothing at all; on the canvas it shows Canvas Goal (780).
    See Your Progress calls `openGoalsTab()`.
  - `withGoalsTab` (in GoalStore.tsx) is on the page's Section Tabs
    instance: each request remounts it on its Goals variant and scrolls
    the tab row into view. Tested in the harness with stand-in tabs: the
    card appears only after Next, the link opens Goals showing the set
    goal, and works again after tapping back to Analysis. Not live-tested
    yet (needs a publish). The Goals variant has no content yet.
  - **Goals variant content** (built 2026-10-22): Section Tabs → Goals →
    Goals Tab Content (stack, Fill, gap 50, padding 40/0/40/0; added in
    the Goals variant so it is hidden in the other three). Inside:
    Goal Setup Card (copy of the Credit Score Events card look: white,
    radius 8, shadow 0 1 6, 95% wide) holding GoalSetupCard (100% Rel),
    then Track Progress Card (title "Track progress" + GoalProgressChart)
    with the `withGoalSet` override, so it only shows once a goal is set.
    The off-page GoalSetupCard test instance on the Score canvas was
    deleted.
  - `GoalProgressChart.tsx`: Track progress chart, 906×800 fixed like
    CreditScoreEventsChart. Months run forward from this month (6M
    monthly, 1Y every 3, 2Y every 6); six score lines from 720 to the
    goal; grey line on the goal's month when it is in range. Tested in
    the harness: labels OCT 26 … MAR (6M), OCT 26 / JAN 27 / APR / JUL /
    OCT (1Y), OCT 26 / APR 27 / OCT / APR 28 / OCT (2Y); goal line at
    month 12 in 1Y and 2Y, none in 6M.
  - **Recommendations** (built 2026-10-22, canvas-checked, not live yet):
    Goals Tab Content → **Goal Recommendations** stack (95% Rel, gap 30,
    left-aligned, `withGoalSet` override): heading (Extra Bold 40),
    subtitle (Regular 34), four tip components, grey disclaimer (Regular
    34 `#757575`, line 1.5).
  - Four native components in App UI → Credit Score, each duplicated from
    Payment History Accordion (Closed primary / Open, Click → toggle,
    chevron flips): no accent shadow, 2px `#E3E3E3` border all round,
    Header vertical (pill row with "Great Job!" + chevron, then tip text
    Regular 36, line 1.4; gap 40, padding 52), Body padding 52 / gap 40.
    Links are bold `#0D294B` text with no link target yet.
    - **Goal Tip Payments**: rows "0 Late Payment(s)", "0 Unpaid
      Collection(s)" (`#FAFAFA`, centred Medium 36).
    - **Goal Tip Utilization**: Revolving Bar Panel (UtilizationBar All
      Revolving 5% / keep below 10%), Card Bar Panel (Credit Cards 3% /
      5%), "LINES OF CREDIT", "View all accounts in your **credit
      report**", "CREDIT CARDS", three Card Panels (made up: VISA REWARDS
      $410 / $5,500 / **7%** red; PLATINUM CARD $260 / $7,800 / 3%; CASH
      BACK CARD $0 / $6,500 / 0%), the credit report line again.
    - **Goal Tip Balances**: "…keep revolving account balances below
      $2,500. **Learn strategies…**"; panel: Balance Status ▼ (green)
      **$1,339 Below Target**, Revolving Balances **$1,160**, Target
      **$2,499**, **Review Current Balances** (38, navy). $1,160 = the
      three cards' $670 + a $490 line of credit.
    - **Goal Tip New Accounts**: paragraph + "0 New Account(s)" row.
  - `UtilizationBar.tsx` (code): caption, "You are at N%" with a status
    dot, 0–100% track filled to the value with a ring knob, dashed marker
    at the limit with "Keep below L%"; green under the limit, red at or
    over. Tested in the harness at 6/10, 3/5, 8/5 and 0/95.
  - All Goals code components (GoalSetupCard, GoalSummaryCard,
    GoalProgressChart, UtilizationBar) filed in App UI → Credit Score by
    the owner (2026-10-22).
  - Owner decisions (2026-10-22): the tip links stay as styled text with
    no target for now; tip 3 keeps the fixed "Over the next 12 months".
  - **Live test 2026-10-22** (owner published; real clicks, 1440 wide):
    - Before a goal: Analysis has no goal card; Goals shows the empty
      state, no Track progress or tips.
    - Set Up Your Goal → form at 760 / 40 points, ranges 721–850 and
      6–24; dragging the score to 824 gives 104 points and Excellent;
      months dragged to 18; reason list shows all five, picks, closes,
      re-tap clears; Next → "Your Credit Goal" 824 / 104 points, form
      gone, Track progress + four tips + disclaimer appear.
    - Chart: 720…824 labels; 6M OCT 26…MAR, 1Y OCT 26/JAN 27/APR/JUL/OCT,
      2Y OCT 26/APR 27/OCT/APR 28/OCT; goal-month line only in 2Y, at
      month 18.
    - Each tip opens to its panel (rows; both bars, three cards, two
      credit report lines; balance panel; paragraph + row) and closes;
      every chevron flips 180° and back.
    - Analysis: "Your goal: 824 score", "104 points away", 0% completed,
      card between Set Up your Goal and Credit Score Events.
    - See Your Progress opens Goals showing the goal with the tab row at
      the top; again after tapping back to Analysis; Report / Simulator /
      Goals taps still work afterwards.
    - Leaving through Close (More page) and Back keeps the goal (same
      document). Refresh clears it: Analysis default, no card, Goals
      empty state.
    - **Bug found:** after See Your Progress had been used, coming back
      to the page opened Section Tabs on Goals instead of Analysis (the
      override kept forcing Goals on every mount). Fixed in GoalStore:
      only requests made while the tabs are mounted jump. Tested in the
      harness (link, tap back, link, remount → Analysis, link → Goals);
      pasted into Framer. **Re-checked live after the owner republished
      (2026-10-22):** set a goal, See Your Progress → Goals, Close →
      Back → Analysis active, goal card shown, page at the top (no
      jump); See Your Progress → Goals again; a second Close → Back
      also lands on Analysis.
    - Not checked: the Goals underline bar itself (screenshots time out
      on the live site in Chrome; the Goals label turns navy).
  - Renaming layers through Chrome: click the row first, then
    double-click and check the focused element is the rename INPUT
    before typing; typing into the canvas fires tool shortcuts (O oval,
    V pen…). Letter spacing defaults to Em: switch the unit to Px first.
  - Reordering stack children in Framer: right-click the layer → Move →
    Bring to front (moves it to the end) / Send backward (one up).
    Cmd+[ and Cmd+] navigate back/forward instead.
