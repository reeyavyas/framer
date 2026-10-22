# Credit Score Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the kiosk's Simulator tab: tap-only "what if" rows whose
owner-set points move a simulated score shown next to the current score.

**Architecture:** One module-level store (`SimulatorStore.tsx`) holds each
row's points. Three row components report to it; a header component sums
it and draws two gauges. Cards, titles, icons and the disclaimer are
native Framer layers in Section Tabs → Simulator.

**Tech Stack:** Framer code components (React 19, TypeScript, `framer`
property controls), Framer editor via Claude in Chrome, Node 24 for the
store self-check.

**Spec:** `docs/superpowers/specs/2026-10-22-credit-score-simulator-design.md`

## Global Constraints

- Every `.tsx` follows CLAUDE.md's Framer rules: Font defaults use only
  `fontSize`, `variant`, `letterSpacing`, `lineHeight`, `textAlign`
  (never `fontFamily`/`fontWeight`/`fontStyle`); `hidden: (props:
  Partial<Props>) => …`; `useRef<T>(undefined)`; callback refs with a
  block body; union defaults marked `as`.
- Before every push that changes a `.tsx`: type-check it in
  `/private/tmp/claude-501/-Users-reeyavyas-framer/a1b15ce1-485a-435e-b6e9-0ff49fe45dff/scratchpad/tsc`
  with `npx tsc --noEmit --strict --jsx react-jsx --skipLibCheck
  --moduleResolution bundler --module esnext --target es2020 File.tsx`;
  it must print nothing.
- Imports between code files use the `.tsx` extension, as in
  `card-controls/card-alerts/CardAlertsSave.tsx`.
- No figure from the owner's screenshots. Defaults: current score 742;
  amounts and points exactly as in the spec's component sections.
- Code files are created in Framer under Code → Phone Components →
  Credit Score, and placed instances live in Components → App UI →
  Credit Score; check the folder right after creating (memory: framer
  component folder). Before changing any file that already exists in
  Framer, sync Framer's copy into the repo first (memory: owner edits
  code in Framer).
- Moving code into Framer: paste into Monaco with a synthetic paste
  event, save with cmd+S, then capture the editor text via cmd+A/cmd+C
  (patched `DataTransfer.prototype.setData`) and compare its SHA-256
  with the repo file's.
- Never publish. The owner publishes; live tests run on
  `https://libertyfcu.framer.website/base-pages/credit-score-score` at
  1080×1920 with real taps (memory: test on the live page, test
  everything).
- Commit and push to the `credit-score` branch (PR #19); every commit ends
  with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Two rows given the same Row ID** (e.g. a duplicated instance not
   renamed): the second silently overwrites the first, so the score
   ignores one row. Expected: both count. Store keys entries by
   `id` + a per-instance token; Task 1 tests it.
2. **A row turned on with 0 points**: the header must still switch to the
   filled state showing "0" with ▲. Task 1 tests `anyOn()`; Task 2 checks
   it on canvas.
3. **Totals beyond the range** (current 742, points summing to −600 or
   +300): the score must stop at 300 / 850 and the arrow show the clamped
   difference. Task 1 tests it.
4. **Leaving the tab with rows on, then returning**: rows unmount and must
   drop their points, or the next visit opens with a stale score. Task 1
   tests `remove`; Task 7 live-tests it.
5. **Choice row's Starts On beyond its option count** (e.g. 4 with 3
   options): treat it as none, not a crash. Task 4 handles it, and Task 6
   sets it on canvas to confirm.

---

### Task 1: SimulatorStore

**Files:**
- Create: `credit-score/SimulatorStore.tsx` (no JSX; `.tsx` so Framer
  imports it like every other code file)
- Create: `credit-score/SimulatorStore.check.ts` (assert self-check)

**Interfaces:**
- Produces, all exported from `SimulatorStore.tsx`:
  - `newEntryKey(id: string): string`: returns `id + "#" + n`, unique per
    call.
  - `setPoints(key: string, points: number | null): void`: `null` means
    off; notifies subscribers.
  - `remove(key: string): void`: deletes the entry (row unmount);
    notifies.
  - `totalPoints(): number`.
  - `anyOn(): boolean`: true when any entry is non-null (0 counts).
  - `subscribe(fn: () => void): () => void`.
  - `onReset(fn: () => void): () => void`.
  - `resetAll(): void`: calls every `onReset` listener (rows re-report
    their Starts On state), then notifies subscribers.
  - `simulatedScore(current: number, min: number, max: number): number`:
    `Math.min(max, Math.max(min, current + totalPoints()))`.
  - `_clearForTests(): void`: empties entries and listeners.

- [ ] **Step 1: Write `SimulatorStore.check.ts`** importing from
  `"./SimulatorStore.ts"` (the run command copies the store in as `.ts`),
  with `node:assert/strict` and these cases, each starting with
  `_clearForTests()`:
  - `sums`: three keys at −18, +15, null → `totalPoints() === -3`,
    `anyOn() === true`.
  - `zeroCountsAsOn`: one key at 0 → `anyOn() === true`,
    `simulatedScore(742, 300, 850) === 742`.
  - `clampLow`: −600 → `simulatedScore(742, 300, 850) === 300`;
    `clampHigh`: +300 → `=== 850`.
  - `duplicateIds`: two `newEntryKey("loan")` keys, −18 and −14 →
    keys differ and `totalPoints() === -32`.
  - `remove`: set −22 then `remove(key)` → `totalPoints() === 0`,
    `anyOn() === false`.
  - `reset`: an `onReset` listener that sets its key to +8, a second key
    at −95 also removed by its own listener (sets null) → after
    `resetAll()`, `totalPoints() === 8` and a `subscribe` spy fired at
    least once.
  - Finish with `console.log("SimulatorStore: all checks passed")`.

- [ ] **Step 2: Run it and see it fail**

  ```bash
  S=/private/tmp/claude-501/-Users-reeyavyas-framer/a1b15ce1-485a-435e-b6e9-0ff49fe45dff/scratchpad/sim && mkdir -p $S && cp credit-score/SimulatorStore.check.ts $S/ && node $S/SimulatorStore.check.ts
  ```
  Expected: an `ERR_MODULE_NOT_FOUND` for `SimulatorStore.ts`.

- [ ] **Step 3: Implement `SimulatorStore.tsx`** with the Interfaces
  above: a `Map<string, number | null>`, two `Set`s of listeners, a
  module counter for `newEntryKey`. A comment explains why it's
  module-level (shared across instances; Framer keeps the module alive
  across navigations, hence `resetAll` and `remove`).

- [ ] **Step 4: Run it and see it pass**

  ```bash
  cp credit-score/SimulatorStore.tsx $S/SimulatorStore.ts && cp credit-score/SimulatorStore.check.ts $S/ && node $S/SimulatorStore.check.ts
  ```
  Expected: `SimulatorStore: all checks passed`. Then type-check
  `SimulatorStore.tsx` per Global Constraints: no output.

- [ ] **Step 5: Commit** the two files: "Credit score: SimulatorStore with
  self-check".

### Task 2: SimulatorScoreHeader

**Files:**
- Modify: `credit-score/MiniScoreGauge.tsx`: export its range table and
  arc/colour helpers (sync Framer's copy first).
- Create: `credit-score/SimulatorScoreHeader.tsx`

**Interfaces:**
- Consumes: `subscribe`, `anyOn`, `totalPoints`, `simulatedScore`,
  `resetAll` from Task 1.
- Consumes, newly exported from `MiniScoreGauge.tsx` (behaviour
  unchanged): `RANGES`, `colorFor(score: number): string`, and
  `arcPath(fromScore: number, toScore: number): string` built from its
  existing geometry constants (`W`, `H`, `CX`, `CY`, `R`, also exported).
- Produces: default export `SimulatorScoreHeader(props: Props)` with
  every property in the spec's header table (names verbatim: Current
  Score 742, Min 300, Max 850, Current Label, Simulated Label, Reset Text
  "Reset", Empty Icon (`ControlType.ComponentInstance`), Show Icon When
  Empty, Show Arrow, Down Colour `#E5483B`, Up Colour `#212121`, Track
  `#E3E3E3`, Text `#212121`, Reset Text colour `#0D294B`, Score / Labels
  / Change fonts, Animate, Duration 0.4, Preview Points).

- [ ] **Step 1: Sync and refactor MiniScoreGauge.** Capture Framer's
  `MiniScoreGauge.tsx`, hash-compare with the repo, copy it in if it
  differs. Then export the helpers. Type-check; the canvas instance
  under Score Rating must look identical.
- [ ] **Step 2: Implement the header.**
  - Two gauges side by side, each `W`×`H` with its label above in
    tracked caps.
  - The simulated gauge:
    - empty when `!anyOn()` and not on canvas, showing the `Empty Icon`
      centred and no Reset;
    - otherwise the arc to the simulated score, the score, ▼/▲ plus
      `Math.abs(simulated − current)` in the Change font, and the Reset
      text (`role="button"`, `onClick={resetAll}`).
  - Calls `resetAll()` once in a mount effect.
  - Re-renders through `subscribe` via `useSyncExternalStore`.
  - The displayed number tweens with framer-motion's `animate` over
    `duration` when Animate is on.
  - On canvas (`RenderTarget.current() === RenderTarget.canvas`), uses
    `current + previewPoints` and shows the filled state whenever Preview
    Points ≠ 0.
- [ ] **Step 3: Type-check** `SimulatorScoreHeader.tsx` and
  `MiniScoreGauge.tsx`: no output.
- [ ] **Step 4: Put both in Framer** (paste, cmd+S, hash-compare) and
  place a header instance on a scratch spot in Section Tabs → Simulator.
  On canvas:
  - Preview Points 0 → empty atom state (connect the Credit Score Icons
    atom instance to Empty Icon);
  - −40 → 702 ▼40;
  - +0 with a 0-point row on (after Task 3) → 742 ▲0;
  - −600 → 300 ▼442;
  - +300 → 850 ▲108;
  - no editor warnings.
- [ ] **Step 5: Commit**: "Credit score: SimulatorScoreHeader; export
  MiniScoreGauge helpers".

### Task 3: SimulatorAmountRow

**Files:** Create `credit-score/SimulatorAmountRow.tsx`

**Interfaces:**
- Consumes: `newEntryKey`, `setPoints`, `remove`, `onReset` (Task 1).
- Produces: default export with the spec's amount-row properties: Row
  ID, Label, Show Label, Amount Text, Placeholder "$0", Points
  (−200…200), Starts On, Align Value (`"left" | "centre"`), Steppers
  (`"right" | "split" | "hidden"`), colours, Label / Value fonts.

- [ ] **Step 1: Implement.**
  - The key comes from `useRef<string>(undefined)` set once with
    `newEntryKey(rowId)`.
  - State `on`, initialised from Starts On.
  - An effect reports `setPoints(key, on ? points : null)`.
  - `onReset` sets `on` back to Starts On.
  - Unmount calls `remove(key)`.
  - The field is one `role="button"` element that toggles `on`, showing
    the Placeholder (grey) when off and the Amount Text (dark) with an ⓧ
    when on. The ⓧ also turns it off (`stopPropagation`).
  - Stepper boxes (− / +) render greyed with `pointerEvents: "none"` and
    `aria-hidden`.
  - Field 104px tall; label 33px; value 38px.
  - Brief press tint via `whileTap`.
- [ ] **Step 2: Type-check**: no output.
- [ ] **Step 3: Put it in Framer** and add one instance under the header
  scratch spot (Row ID "newCardLimit", "$2,500", −9). On canvas, with
  Starts On off: grey "$0" and greyed steppers. With Starts On on: dark
  "$2,500" and ⓧ, and the header shows 733 ▼9. Set Points 0 + Starts On
  → header 742 ▲0 (Review Focus 2). No editor warnings.
- [ ] **Step 4: Commit**: "Credit score: SimulatorAmountRow".

### Task 4: SimulatorChoiceRow

**Files:** Create `credit-score/SimulatorChoiceRow.tsx`

**Interfaces:**
- Consumes: as Task 3.
- Produces: default export with Row ID, Label, Style (`"dropdown" |
  "segmented"`), Fixed Caption, Options
  (`ControlType.Array` of `ControlType.Object { label, amountText,
  points }`, max 6), Starts On (number, 0 = none), colours, fonts.

- [ ] **Step 1: Implement.**
  - State `selected: number` (1-based; 0 = none), initialised from
    Starts On, treating any value outside `1…options.length` as 0
    (Review Focus 5).
  - Reports `setPoints(key, selected ? options[selected-1].points :
    null)`.
  - Tapping option *i* sets `selected = selected === i ? 0 : i`.
  - Reset and unmount behave as in Task 3.
  - Dropdown style: a field showing the Fixed Caption (grey) when none is
    selected, or the selected label plus its Amount Text and ⓧ. The
    options are listed as tappable chips beneath it.
  - Segmented style: the Fixed Caption field above equal-width segments,
    the selected one `#0D294B` bold.
- [ ] **Step 2: Type-check**: no output.
- [ ] **Step 3: Put it in Framer**; on canvas add the loan instance
  (Dropdown, caption "Loan Type": Auto Loan $28,000 −18, Personal Loan
  $12,000 −14, Mortgage $320,000 −35) and the missed-payment instance
  (Segmented, caption "All Accounts": 1 mo. −45, 2 mo. −70, 3 mo. −95).
  - Starts On 3 shows Mortgage selected.
  - Starts On 4 shows none.
  - No editor warnings.
- [ ] **Step 4: Commit**: "Credit score: SimulatorChoiceRow".

### Task 5: SimulatorToggleRow

**Files:** Create `credit-score/SimulatorToggleRow.tsx`

**Interfaces:**
- Consumes: as Task 3.
- Produces: default export with Row ID, Label, Points, Starts On, On Text
  "YES", Off Text "NO", Track off `#3A3A3A`, Track on `#0D294B`, Knob
  `#FFFFFF`, Text `#212121`, Label / OnOff fonts.

- [ ] **Step 1: Implement**: same lifecycle as Task 3. A
  `role="switch"` with `aria-checked`; tapping the switch or its YES/NO
  text flips it. The knob slides with a spring.
- [ ] **Step 2: Type-check**: no output.
- [ ] **Step 3: Put it in Framer**; instances "Inquiry on file from a
  credit card application" (−7) and "Pay off all credit card balances"
  (+19). On canvas: Starts On on → YES with dark track and the header
  moves. No editor warnings.
- [ ] **Step 4: Commit**: "Credit score: SimulatorToggleRow".

### Task 6: Simulator tab layout in Framer

**Files:** none in the repo (Framer only); NOTES.md in Task 7.

- [ ] **Step 1: Build Simulator Tab Content** in the Simulator variant,
  a vertical stack like Report Sections (gap 100, padding 40 top/bottom,
  width 95%):
  - **Score Header card**, Sticky: title "Simulate Your Credit Score" +
    ⓘ, the description with "TransUnion VantageScore 3.0" bold, and the
    header instance.
  - **Apply for New Credit:** placeholder icon, title, ⓘ, divider, loan
    choice row, new card limit ($2,500, −9), transfer balances ($1,500,
    +6), inquiry toggle.
  - **Manage Your Balances:** increase balance ($2,000, −22), raise limit
    ($4,000, +8), pay down ($1,200, +15), pay-off-all toggle.
  - **Manage Payment Activity:** missed payment (segmented), on-time
    payments ("9", +11, centred, split steppers).
  - **Disclaimer.**
  - Cards: white, 2px `#E3E3E3` border, radius 8. Every Row ID unique.
  - Remove the Task 2–5 scratch instances.
- [ ] **Step 2: Canvas check**:
  - all rows Starts On off;
  - header empty with the atom;
  - every row's text and greyed steppers visible;
  - Analysis / Report variants unchanged;
  - no editor warnings.
- [ ] **Step 3: Ask the owner to publish.**

### Task 7: Live test and notes

**Files:** Modify `credit-score/NOTES.md`

- [ ] **Step 1: Live test** (owner-published page, 1080×1920, real taps;
  scroll with real wheel scrolls, not scripted `scrollBy`, before
  tapping), every element × state from the spec's Testing list:
  - header empty → filled → Reset;
  - each amount row on, off, and ⓧ, with steppers inert;
  - each loan and month option selecting, replacing and clearing;
  - both toggles both ways;
  - a combination: Mortgage + 3 mo. + pay down → 742 − 35 − 95 + 15 =
    627 ▼115;
  - clamping (temporarily set a row to −600 on canvas only if the owner
    agrees to publish that);
  - the sticky header while scrolling;
  - leave to Analysis with rows on, return → empty (Review Focus 4);
  - Analysis and Report still work.
- [ ] **Step 2: Record results** in NOTES.md (components, properties,
  made-up values, test results, any bugs), commit "Credit score notes:
  Simulator tab", push.
