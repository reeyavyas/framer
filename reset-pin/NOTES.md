# Reset PIN — Notes

"Reset PIN" for the user's debit card: two PIN fields, Confirm and
Cancel. Confirm goes back to Card Controls, which shows a "Your PIN has
been reset for this card." toast with a countdown progress bar.

## Where this lives, and why (read first)

**Reset PIN is a card-controls sub-feature**: it's reached from, and
returns to, the Card Controls page. **But it deliberately does NOT live
in `card-controls/`**, and nothing Reset PIN-related should be placed
there. It has a top-level folder of its own because it has a tutorial of
its own, separate from the card-controls walkthrough.

- Base-page code → `reset-pin/` (this folder).
- Tutorial-only duplicates, **only if one is ever needed** →
  `tutorials/reset-pin-tutorial/`, following the same
  `<Component>Tutorial.tsx` convention as
  `tutorials/card-controls-tutorial/`. **Not** in
  `tutorials/card-controls-tutorial/`. That folder doesn't exist yet,
  because nothing needs a duplicate so far (see "Tutorial version"
  below).
- Branches: `card-controls/<feature>` (e.g. `card-controls/reset-pin`),
  because it's a card-controls sub-feature. The branch prefix is the
  one exception to "prefix matches folder"; the files still go here.

## Current

The page itself is native Framer, with no code:
- The two PIN fields ("New 4-Digit PIN", "Confirm New 4-Digit PIN") are
  display-only, with a fixed "····" in each. The kiosk has no keyboard,
  so nothing is typed.
- Cancel is a native Framer Link back to Card Controls.

Code:
- `ResetPinConfirm.tsx` — `withResetPinConfirm`, on the Confirm button.
  It's always enabled (the fields are always "filled"), and there's no
  "Saving..." overlay. So unlike `CardAlertsSave.tsx`, Confirm **keeps a
  native Framer Link** for its navigation. The override only writes the
  one-shot `kioskResetPinToastFlag` to sessionStorage on tap, adding to
  the tap rather than taking it over (no `preventDefault()`).
- `ResetPinToast.tsx` — on the toast layers on Card Controls:
  - `withResetPinToast` → the toast's outer frame. Shows it for 3s
    (`VISIBLE_MS`), then fades it out over `FADE_MS`. Same approach as
    `CardAlertsToast.tsx`/`TravelNoticeToast.tsx`, with its own key.
  - `withResetPinToastDismiss` → the toast's × button, which closes it
    early.
  - `withResetPinToastProgress` → a plain rectangle along the toast's
    bottom edge, drawn full-width on canvas. It shrinks right-to-left
    to nothing over `VISIBLE_MS`, so it runs out just as the fade
    starts. On ×, it freezes and fades with the toast. It's visual
    only; the toast's own timers do the hiding.
  - **Arms on every mount of the toast frame**, not once per page load
    like the other two toasts. Those are reached by a hard
    `window.location.href` navigation, which resets module state. A
    native Link uses Framer's client-side routing, which can keep the
    module alive between pages, so a once-per-load guard would show the
    toast only the first time. A generation counter stops a leftover
    timer from an earlier, interrupted toast from hiding a newer one.

## Tutorial version

The tutorial is a copy of the Reset PIN page with `TutorialOverlay`
steps on top, landing on a copy of the base Card Controls page made for
this tutorial. No code component or override needs a tutorial
duplicate yet:
- Both Confirm buttons use the same `withResetPinConfirm`. Only each
  one's native Link destination differs: the base page goes to the base
  Card Controls, the tutorial copy goes to its Card Controls copy.
- Both Card Controls pages use the same three `ResetPinToast.tsx`
  overrides, reading the same flag. That works the same way
  `TravelNoticeToast.tsx` is used undivided in its tutorial.

If a tutorial-specific tweak is ever needed, it goes in
`tutorials/reset-pin-tutorial/` (see above), not here and not in any
`card-controls` folder.
