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
- **TravelNoticeSection.tsx** — four Code Overrides for the "Happening
  Now" / "Future Plans" summary row on Card Controls, applied to a
  hand-built layer group between "Card Section" and "Misplaced Card":
  `withTravelNoticeSectionVisibility` (outer frame — hides the whole
  section unless a fresh one-shot flag is present),
  `withTravelNoticeHeaderLabel` ("Happening Now" if the saved Start Date
  is today, "Future Plans" if it's a future date — no count suffix),
  `withTravelNoticeDateRangeText` (e.g. "September 02, 2026 - November
  03, 2026"), and `withTravelNoticeDestinationsText` (comma-separated
  "State - United States" entries, each internally non-breaking so a
  name never splits mid-entry across a wrap). The layer recipe for what
  to build in Framer was handed off in chat, not committed as a file.

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
    flag consumed by TravelNoticeSection.tsx's overrides (read once,
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

TravelNoticeSection.tsx's four overrides are written and committed, but
they only do anything once applied to real layers in Framer — that part
happens in the Framer editor, outside this repo. Still need (user-side):

1. Build the layer group in Framer between "Card Section" and
   "Misplaced Card" — outer frame ("Travel Notice Section"), a rail
   (dot / line / dot) for the timeline look, and content text layers for
   the header, date range, "Destinations:" label (static), destinations
   value, and "That's All!" footer (static). See TravelNoticeSection.tsx's
   header comment for the exact expected shape.
2. Apply the four overrides from TravelNoticeSection.tsx to their
   matching layers (outer frame gets `withTravelNoticeSectionVisibility`;
   the three dynamic text layers each get their matching
   `withTravelNotice*Text`/`withTravelNoticeHeaderLabel` override).
3. On the same Card Controls page, apply the existing
   `withTravelNoticeToast` / `withTravelNoticeToastDismiss` overrides
   (from TravelNoticeToast.tsx — unchanged, already generic to any page)
   to the "Your travel notice has been created" toast layers.
4. Verify in Framer Preview: Save → land on Card Controls → section +
   toast both show; toast auto-hides or dismisses on ×; refresh Card
   Controls → section is gone, toast doesn't reappear, kioskTravelNotice
   itself is still in sessionStorage untouched.
