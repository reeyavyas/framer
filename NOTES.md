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
- **TravelNoticeSection.tsx** — a self-contained code component (same
  pattern as SetTravelNotice.tsx, not a Code Override) for the
  "Happening Now" / "Future Plans" summary row on Card Controls. Drop it
  in as one layer between "Card Section" and "Misplaced Card" — no
  hand-built dot/line rail required. Renders "Happening Now" if the
  saved Start Date is today, "Future Plans" if it's a future date (no
  count suffix), the date range (e.g. "September 02, 2026 - November
  03, 2026"), and comma-separated "State - United States" destinations
  (each internally non-breaking so a name never splits mid-entry across
  a wrap). The connecting line between the header/footer dots is a
  flex:1 child, so it always stretches to match the content column's
  actual height instead of needing manual alignment as the destinations
  list grows — see "Session 4" below for why this isn't hand-built
  layers + overrides like the Toast.

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
  - `sessionStorage["kioskTravelNoticeSectionFlag"]` → `"1"`, one-shot
    flag consumed by the TravelNoticeSection.tsx component (read once,
    cleared, drives the "Happening Now"/"Future Plans" section). Kept
    deliberately separate from the toast flag and from the
    kioskTravelNotice record: the record persists so the section has
    data to read when it *is* allowed to show, but the section itself
    must disappear on any refresh of Card Controls, not just for a new
    kiosk session — so its visibility, unlike the record, is one-shot.
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

TravelNoticeSection.tsx is written and committed as a full component,
but it only shows up once dropped into the Card Controls page in
Framer — that part happens in the Framer editor, outside this repo.
Still need (user-side):

1. Drag the TravelNoticeSection component in as one layer between
   "Card Section" and "Misplaced Card". No hand-built rail/dot/text
   layers needed — it renders its own dots, line, and text, sized by
   its own property controls (colors, fonts, dot size, line width,
   gaps, padding) in Framer's right panel.
2. On the same Card Controls page, apply the existing
   `withTravelNoticeToast` / `withTravelNoticeToastDismiss` overrides
   (from TravelNoticeToast.tsx — unchanged, already generic to any page)
   to the "Your travel notice has been created" toast layers.
3. Verify in Framer Preview: Save → land on Card Controls → section +
   toast both show; toast auto-hides or dismisses on ×; refresh Card
   Controls → section is gone, toast doesn't reappear, kioskTravelNotice
   itself is still in sessionStorage untouched. Also verify with a long
   destinations list (several states) that the rail's line still
   reaches exactly from the top dot to the bottom dot.

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

## Session 3 — Card Controls "Save" wiring (this session)

This was that "new chat specifically for Save button functionality"
flagged at the end of Session 2. Scope ended up being the Card Controls
"Happening Now" wiring itself (the two threads noted above turned out to
be the same thread), plus one behavior refinement decided with the user
along the way:

- `persistAndProceed()` now also writes `kioskTravelNoticeSectionFlag`
  (see "Key decisions" above) alongside the existing
  `kioskTravelNotice` record and `kioskTravelNoticeToastFlag`.
- New `TravelNoticeSection.tsx` (see "What exists" above) — the header
  label is dynamic ("Happening Now" if the saved trip starts today,
  "Future Plans" if it starts later; no "(N)" count, per user feedback),
  and the whole section is one-shot: it shows right after Save, then
  disappears on any later refresh of Card Controls in the same session
  — deliberately different from `kioskTravelNotice` itself, which the
  user wants to keep persisting normally.
- Destinations render as comma-separated "State - United States"
  entries; each entry's internal spaces are non-breaking so a name can't
  split mid-entry when the line wraps, but the comma between entries can
  still break — confirmed with the user, no cap on how many can wrap.
- Still open: the actual Framer-side layer build + override wiring (see
  "Not done yet" above) — that part is on the user, this session only
  had code-file access, not the Framer canvas itself.

## Session 4 — TravelNoticeSection rebuilt as a component, not overrides

While the user was wiring up the hand-built-layers plan from Session 3,
they raised a real problem: the rail's connecting line has to span from
the header dot to the footer dot, but the detail block between them
(date range + destinations) changes height depending on how many
destinations wrap to how many lines. A hand-built rail (fixed dot
positions/line length) has no way to know that height, so it's prone to
exactly the gap/misalignment the user was trying to avoid — and it's
not something committed code here can verify, since it depends on the
actual Framer canvas.

Fix: rewrote TravelNoticeSection.tsx from four Code Overrides into one
self-contained component (same shape as SetTravelNotice.tsx). The rail
is now `display:flex, flexDirection:column` with the two dots
`flexShrink:0` and the line `flex:1` — the browser stretches the line to
fill whatever space is left after the dots, and because the rail and
content columns sit in the same flex row (default stretch cross-axis),
the rail's total height always equals the content column's actual
rendered height. No coordinate math, no manual sync — it's correct by
construction regardless of how many lines the destinations text wraps
to. This replaces the "hand-build layers + 4 overrides" plan entirely;
see "What exists" and "Not done yet" above for the current shape.
