# Travel Notice — status / handoff notes

Kiosk mobile-banking prototype (touch-only, 1080×1920) built as Framer
code files. This branch is intentionally separate from `tutorials-layers`
(the TutorialOverlay work) — unrelated feature.

## What exists

- **SetTravelNotice.tsx** — the "Set Travel Notice" form: Start Date /
  End Date calendar-dropdown pickers, a multi-select Destinations
  dropdown (10 US states, alphabetical, removable chips), Save/Cancel.
  Full Framer Font/Color/Number property controls, defaulting to Inter.
- **TravelNoticeToast.tsx** — two Code Overrides for a success toast the
  user builds visually in Framer: `withTravelNoticeToast` (auto show →
  hold `VISIBLE_MS` → fade `FADE_MS` → hide; edit those two constants
  directly) and `withTravelNoticeToastDismiss` (manual × button).

## Key decisions made this session

- **Date rules**: Start Date can't be before today or past Dec 31 of
  the current year — except once the kiosk's real-world clock reaches
  December, the ceiling moves to Dec 31 of *next* year. End Date can't
  be before Start Date or more than `tripMaxMonths` (prop, default 3)
  past it, capped by that same ceiling.
- **Destinations UX**: already-selected states are excluded from the
  dropdown list; removing a chip (×) puts the state back in the list.
  No hover/checkmark state needed since the excluded-list IS the
  selection indicator.
- **Toast timing**: default 3000ms visible / 400ms fade — user said
  they'll tune this themselves by editing the constants at the top of
  TravelNoticeToast.tsx.
- **Data handoff between pages**: sessionStorage, not localStorage —
  deliberately picked so a fresh kiosk tab/session doesn't inherit a
  previous visitor's saved notice.
  - `sessionStorage["kioskTravelNotice"]` → JSON:
    `{ startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", destinations: string[], savedAt: number }`
    written by Save, meant to be read by whatever page shows the
    "Travel Notice" row under Happening Now.
  - `sessionStorage["kioskTravelNoticeToastFlag"]` → `"1"`, one-shot
    flag consumed by `withTravelNoticeToast` (read once, cleared,
    drives the toast).
- **Branch structure**: `travel-notice` branch created as a clean split
  from `tutorials-layers` — same repo, but this branch's tree contains
  ONLY these two files (all TutorialOverlay-family files were removed
  from it). `tutorials-layers` had these two files removed in return.
  Note: git couldn't create a literal history-free orphan branch here
  (the `--orphan` git operation was blocked by this environment's
  permission classifier), so `travel-notice` still carries the repo's
  full prior commit history in its ancestry even though its current
  file tree is scoped to just these two files.

## Not done yet — next step

The Card Controls page does **not** currently read `kioskTravelNotice`
or populate anything. That page/component belongs to the user (built
outside this session). To finish the loop, still need:

1. The user's Card Controls layer structure (layer names, how the
   "Happening Now" section is built — a list of frames? one frame with
   text layers?) so a Code Override can be written to match it.
2. Decide the display date format for the range (Sept 02, 2026 -
   Nov 03, 2026, per the reference screenshots) and whether the whole
   "Happening Now" section hides entirely when nothing is saved yet.
3. Write `withTravelNoticeSummary` (or similarly named) override that
   reads `kioskTravelNotice` from sessionStorage on mount and fills in
   that section — sketch of the approach is in the last assistant
   message of this session, not yet committed as real code.

Pick up by asking the user for their Card Controls layer structure and
writing that override.

## Session 2 — visual polish pass on SetTravelNotice.tsx

Card Controls integration above is still outstanding (untouched this
session). This session was entirely visual fixes/polish on the form
itself, driven by screenshot comparisons against the user's reference
app. In commit order:

- **Custom calendar icon**: added a `calendarIcon` Image property
  control so the built-in SVG calendar icon can be swapped for an
  uploaded PNG. First pass was broken — Framer's `ControlType.Image`
  passes the picked image as a plain URL **string**, not an
  `{src, srcSet}` object; the prop type/usage was fixed to `string`.
- **Date field icon cell**: the calendar icon on Start/End Date fields
  now sits in its own right-side cell with a dedicated background
  color (`iconCellBackgroundColor`) and a vertical divider border
  (`iconDividerColor`), instead of floating in the same flat pill as
  the date text — matches the reference app's field styling.
- **Destination chips**: chip text now reads "State - United States"
  (was just the state name) in one consistent chip font/color.
  `chipCornerRadius` (already a property control, default 999/pill)
  is the knob for chip roundness if the user wants it more rectangular.
- **Destinations dropdown gap**: fixed a visible gap/flash of the
  "Add up to N destinations" helper text between the field and the
  dropdown list — the dropdown's `position: absolute` was resolving
  against the whole label+field+helper block instead of just the
  field. Fixed by wrapping the field + its dropdown in their own
  nested `position: relative` container, and hiding the helper text
  while the dropdown is open.
- **Calendar dropdown sizing** (went through a few iterations, final
  state below):
  - Selected-date corner radius was hardcoded `borderRadius: "50%"` on
    the day-cell button — now a `calendarDayCornerRadius` Number
    control (default 999 = circle) so the user can make it more
    rectangular without touching code.
  - The calendar dropdown's own width is **not** 100%/relative to the
    field. User's reference app has the calendar dropdown narrower
    than the field and left-aligned under it. Landed on a **fixed
    pixel width** (`calendarPanelWidth`, default 700px, `left: 0`) —
    explicitly NOT a percentage, because the field itself is set to
    Fill (1fr) in Framer and a %-based width would stretch/shrink the
    dropdown along with the parent instead of staying constant.
  - Grid trimming: `getMonthGrid` always built a fixed 6 rows (42
    cells) so panel height wouldn't jump between months; now trims any
    trailing week that's entirely next month (down to a 4-row floor),
    so e.g. September 2026 only renders 5 rows instead of showing a
    dead row of Oct 4-10. Note: this means dropdown height now varies
    slightly month to month (5 vs 6 rows) — flagged to the user as a
    tradeoff, not yet asked to change it.
  - Single-digit day numbers now zero-pad ("01"-"09" instead of "1"-"9").
- **Calendar header arrows** (`‹ ›` prev/next month buttons): talked
  through in chat but **not yet committed as code** — user asked how
  to make them bigger and how to add left/right padding; answered with
  exact line references (around line 307/341 for font size via
  `...props.calendarHeaderFont` + explicit `fontSize` override, and
  line ~304/338 `padding: 8` → `padding: "8px 20px"` for horizontal
  padding) and left it for the user to edit directly, rather than
  adding new property controls. If picking this back up, check
  whether the user actually made those edits or still wants them done
  in code with real property controls.

## Not done yet — next step (as of this note)

User is starting a **new chat specifically for "Save" button
functionality** — i.e. wiring up what happens when Save is tapped,
beyond the sessionStorage write that already exists in
`persistAndProceed()` (writes `kioskTravelNotice` +
`kioskTravelNoticeToastFlag`, then follows `saveLink`). Whatever that
next session covers, the Card Controls "Happening Now" wiring
described above is still a separate, still-open thread — don't assume
one supersedes the other.
