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
