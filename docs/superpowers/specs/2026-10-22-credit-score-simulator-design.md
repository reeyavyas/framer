# Credit Score Simulator tab: design

Date: 2026-10-22. Status: awaiting the owner's review. Nothing built yet.

## Goal

Rebuild the phone app's Simulator tab for the 1080-wide kiosk (Section
Tabs → Simulator). Visitors explore "what if" actions by tapping only:
they never type a value or use − / + steppers. The owner sets every
amount and every point effect in Framer's component properties, and the
simulated score updates for whatever combination of actions a visitor
turns on.

## Decisions (agreed with the owner)

- **Interaction model: tap actions on and off.** Each action carries the
  owner's amount and points. Simulated score = clamp(current + sum of
  points of every action that is on, 300, 850). No per-combination
  authoring.
- **Rows with choices are pick-one.** "Get a new loan" (Auto / Personal /
  Mortgage) and "Miss a monthly payment" (1 / 2 / 3 mo) show tappable
  options, each with its own amount and points. Tapping an option
  selects it (replacing the previous one); tapping the selected option
  again turns the row off. The loan row is a joined segmented bar like
  the account pick, with no "Loan Type" field. The missed-payment row has a pick between
  "All Accounts" and "One Account" (All by default); each month has a
  points value for each, so the score follows the pair picked.
- **Amount rows keep the app's look.** Off: grey "$0" placeholder. Tap
  anywhere on the field: the owner's amount appears in dark text with a
  small ⓧ, and the score moves. Tap again or tap ⓧ: cleared. The − / +
  buttons stay visible but fully greyed and inert.
- **YES / NO toggles are visitor-switchable and move the score** (YES
  adds the row's points, NO removes them).
- **No owner figures.** Every default is made up; the current score is
  the kiosk's 742, not anything from the owner's screenshots.

## Architecture

Approach: four small code components sharing one store, inside native
Framer cards (the same split as the Report tab: native layout, code only
where it must be).

### `credit-score/simulatorStore.ts`

Module-level state, following the Card Alerts pattern
(`card-controls/card-alerts/CardAlertsToggleReport.tsx`:
`anyToggleOn` / `subscribeToggles` / `resetToggles`).

- `setPoints(id: string, points: number | null)`: `null` means off.
- `totalPoints(): number` and `anyOn(): boolean`.
- `subscribe(onChange): unsubscribe`, for the header.
- `onReset(cb): unsubscribe`, for rows to return to their own Starts On
  setting (off unless the owner set Starts On).
- `resetAll()`: tells every row to return to its starting setting; each
  row re-reports its points, and the header re-renders. The header is in
  its empty state only when, after that, no row is on.
- `simulatedScore(current, min, max)`: the clamp, in one place.

A row with 0 points that is on still counts as on (the header shows the
filled state with "0").

### Fresh start

The header calls `resetAll()` when it mounts. Switching section tabs or
the kiosk's inactivity redirect remounts it, so every visit starts empty
without extra wiring.

### Components

All four are code components in `credit-score/`, placed in Framer's
existing App UI → Credit Score folders (Code and Components). Every file
follows CLAUDE.md's Framer rules (Font control defaults use `variant`
names, `hidden` callbacks take `Partial<Props>`, `useRef` starting
values, block-body callback refs, `as` on union defaults).

#### SimulatorScoreHeader

Both gauges side by side, drawn like MiniScoreGauge (same arc, ranges,
colours, 300 / 850 labels). The current-score gauge is always filled.

- Empty state (no row on): the simulated arc is the grey track only, with
  the owner's icon in the middle and no Reset.
- Filled state: the score, an arrow and the absolute point difference
  (red ▼ when lower, dark ▲ when higher or equal), "Reset" under it
  (`#0D294B`, bold). Tapping Reset calls `resetAll()`.
- Score number and arc animate over the set duration when the total
  changes.

Properties:

| Group | Property | Type / default |
|---|---|---|
| Scores | Current Score | Number, 742 |
| | Min / Max | Number, 300 / 850 |
| Labels | Current Label / Simulated Label | String, "CURRENT SCORE" / "SIMULATED SCORE" |
| | Reset Text | String, "Reset" |
| Empty state | Empty Icon | ComponentInstance (owner connects the Credit Score Icons atom) |
| | Show Icon When Empty | Boolean, on |
| Change | Show Arrow | Boolean, on |
| | Down Colour / Up Colour | Color, `#E5483B` / `#4DB67A` (the gauge's red and green) |
| Colours | Track, Text, Reset Text | Color, `#E3E3E3`, `#212121`, `#0D294B` |
| Fonts | Score, Labels, Change | Font (sans-serif, `fontSize` + `variant`); Score 72 Semibold, Change 24 Semibold |
| Motion | Animate / Duration | Boolean on / Number 0.4 s |
| Canvas | Preview Points | Number, ignored outside the Framer canvas |

#### SimulatorAmountRow

One instance per amount row.

| Group | Property | Type / default |
|---|---|---|
| Identity | Row ID | String, unique per row |
| Label | Label / Show Label | String / Boolean |
| Value | Amount Text | String, e.g. "$2,500" or "9" |
| | Placeholder | String, "$0" |
| | Points | Number, −200…+200 |
| | Starts On | Boolean, off |
| Layout | Align Value | Enum: left / centre |
| | Steppers | Enum: right (both) / split (− left, + right) / hidden |
| Colours | Field fill, border, placeholder, value, greyed stepper, ⓧ | Color |
| Fonts | Label, Value | Font |

Expected instances, with made-up defaults (none taken from the owner's
screenshots): new card credit limit ($2,500, −9), transfer balances
($1,500, +6), increase balance ($2,000, −22), raise limit ($4,000, +8),
pay down ($1,200, +15), on-time payments (9, +11, centred, split
steppers).

#### SimulatorChoiceRow

| Group | Property | Type / default |
|---|---|---|
| Identity | Row ID | String |
| Label | Label | String, e.g. "Get a new loan" |
| Style | Style | Enum: dropdown-look / segmented |
| | Fixed Caption | String, e.g. "Loan Type"; blank hides it |
| | Account Choice | Boolean (Segmented only): All / One Account pick in place of the caption |
| | All Label / One Label | String, "All Accounts" / "One Account" |
| Options | Options (up to 6) | Array of { Label, Amount Text, Points, Points (One) } |
| | Starts On | Number, 0 = none |
| Colours | Field, border, selected (`#0D294B`), text, ⓧ | Color |
| Fonts | Label, Option, Selected | Font |

- **Dropdown-look:** the selected option shows in a field with ⓧ, and
  the options are listed as tappable chips below it. Not used on the
  page (kept as an option).
- **Segmented, no caption:** the loan row (labels "Auto" / "Personal" / "Mortgage": Auto $28,000 −18 / Personal
  $12,000 −14 / Mortgage $320,000 −35) uses the same joined segments as
  the account pick, with Fixed Caption blank so there's no "Loan Type"
  field. Tap the selected loan again to clear it.
- **Segmented:** used for missed payments, with Account Choice on
  (1 / 2 / 3 mo: All Accounts −45 / −70 / −95, One Account −15 / −25 /
  −35).

#### SimulatorToggleRow

| Group | Property | Type / default |
|---|---|---|
| Identity | Row ID | String |
| Label | Label | String |
| Value | Points / Starts On | Number / Boolean |
| Text | On Text / Off Text | String, "YES" / "NO" |
| Colours | Track off, track on, knob, text | Color, `#3A3A3A`, `#0D294B`, `#FFFFFF`, `#212121` |
| Fonts | Label, On/Off | Font |

Used for "Inquiry on file from a credit card application" (−7) and
"Pay off all credit card balances" (+19).

## Layout (native Framer)

Section Tabs → Simulator variant → **Simulator Tab Content**, a vertical
stack like Report Sections (gap 100, padding 40 top and bottom, width
95%):

1. **Score Header card**, Sticky so it stays pinned while the cards
   scroll: "Simulate Your Credit Score" title + ⓘ, the description
   (TransUnion VantageScore 3.0 in bold), SimulatorScoreHeader.
2. **Apply for New Credit** card: placeholder icon, title, ⓘ, divider,
   loan choice row, new card limit, transfer balances, inquiry toggle.
3. **Manage Your Balances** card: increase balance, raise limit, pay down,
   pay-off-all toggle.
4. **Manage Payment Activity** card: missed payment (segmented, All /
   One Account pick), on-time payments.
5. **Disclaimer** (grey text, as in the app).

Cards match the Report cards: white, 2px `#E3E3E3` border, radius 8.
Sizes are 1.25× the phone app: fields about 104px tall, labels 33px,
values 38px. Icons are placeholders until the owner draws them.

## Kiosk safety

- No text inputs, so the on-screen keyboard never appears.
- Steppers have `pointer-events: none`.
- Rows tint briefly on press.

## Testing

- Type-check every new `.tsx` file with the repo's tsc command before
  each push.
- An assert-based self-check for the store: clamping at 300 and 850,
  pick-one replacing the previous choice, reset clearing everything, and
  a 0-point row counting as on.
- Framer: every property set on canvas with no editor warnings; Preview
  Points shows the filled header.
- Live test on the published page, 1080×1920, real taps, every element ×
  state:
  - header empty and filled, ▼ / ▲, clamping, Reset;
  - each amount row on and off (tap and ⓧ), steppers inert;
  - each choice option selecting, replacing and clearing;
  - each toggle both ways;
  - combinations adding up;
  - the sticky header while scrolling;
  - a fresh start after leaving the tab;
  - the other section tabs unaffected.
- Results go in `credit-score/NOTES.md`.

## Out of scope

The Goals tab (later screenshots in the same folder), and any real
credit-model maths: points are the owner's numbers, simply added.
