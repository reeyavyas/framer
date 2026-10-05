import * as React from "react"
import type { ComponentType } from "react"

/**
 * TutorialTargets
 *
 * Code Overrides that tag one specific layer instance with a
 * data-tutorial-target attribute for TutorialOverlay.tsx to find and
 * measure. Set a TutorialOverlay step's `target` to the id in quotes
 * below (e.g. "more-tab") to spotlight that layer.
 *
 * Because a Code Override applies to the single instance you assign it
 * to (right panel → Code → Override), not to the Main Component, this
 * can't leak onto other instances of the same component on other
 * pages, and it never requires detaching.
 *
 * Usage: select the "more-tab" layer on the canvas → Code (right
 * panel) → Override → this file → MoreTabTarget.
 *
 * Exports are grouped by tutorial, in step order. Starting steps that
 * many tutorials share (Accounts page → More tab, or Accounts page →
 * Settings) live once in the "Shared starting steps" section; each
 * tutorial's step list points back to them. Each export is either:
 *
 *  - a TARGET (withTutorialTarget) — goes on the real layer the user
 *    taps or scrolls. Only tags it; nothing else about the layer is
 *    touched.
 *  - a MARKER (withTutorialMarker) — goes on an empty frame placed
 *    exactly on top of the real thing. Used when the real thing can't
 *    carry this override itself: it's plain JSX inside a code
 *    component (not a selectable layer), or it already has its own
 *    Code Override (Framer allows only one per layer). A marker frame
 *    gets NO Link and no fill — every tap passes through it to the
 *    real element underneath, which does the actual work.
 *
 * Renaming an export or changing its id breaks every layer it's
 * already applied to in Framer. Rearrange freely, but keep both as-is.
 */

function withTutorialTarget(id: string) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return React.forwardRef(function TutorialTarget(props: any, ref: any) {
            return <Component {...props} ref={ref} data-tutorial-target={id} />
        })
    }
}

// Same as withTutorialTarget, but also forces pointer-events:none, so
// the marker never receives the tap itself. Without that, the real
// element underneath would never see the click at all: the browser
// resolves a click by DOM hit-testing at that point, and
// TutorialOverlay's own click-blocking (the window-capture listener in
// TutorialOverlay.tsx) only checks coordinates against the hole — it
// never un-does the browser having already handed the event to
// whichever element is visually on top. It also keeps TutorialOverlay's
// Skip button working: its simulated tap uses elementFromPoint, which
// skips pointer-events:none and lands on the real element. Don't use
// this for a target that IS the real tappable/scrollable element itself
// (e.g. MoreTabTarget, CardToggle) — those still need to receive
// taps/scroll input.
function withTutorialMarker(id: string) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return React.forwardRef(function TutorialMarker(props: any, ref: any) {
            return (
                <Component
                    {...props}
                    ref={ref}
                    data-tutorial-target={id}
                    style={{ ...props.style, pointerEvents: "none" }}
                />
            )
        })
    }
}

// Framer's Override dropdown only picks up top-level exported function
// declarations matching (Component) => ComponentType — not a const
// assigned from calling another function. So each target gets its own
// thin named export like the ones below, even though they share the
// same two helpers above. Add one more per target the same way, under
// its tutorial's section, in step order.

// ═══ Login Tutorial ═══════════════════════════════════════════════════
//   1. LoginButton
//   2. FingerprintMarker

// Step 1 — TARGET: Login page "Login" button
export function LoginButton(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("login-button")(Component)
}

// Step 2 — MARKER: over the Login page fingerprint
export function FingerprintMarker(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("fingerprint-marker")(Component)
}

// ═══ Shared starting steps ════════════════════════════════════════════
// Many tutorials start on the Accounts page and go either to the More
// tab or to Settings. Those opening steps are defined once here and
// listed by name in each tutorial's step list below.

// TARGET: "More" in the Accounts page's bottom nav menu.
// Used by: Card Controls Tutorial (step 1), Reset PIN Tutorial (step 1).
export function MoreTabTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("more-tab")(Component)
}

// TARGET: "Card Controls" at the top of the More page.
// Used by: Card Controls Tutorial (step 2), Reset PIN Tutorial (step 2).
export function CardControlsTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-controls")(Component)
}

// TARGET: "Settings" button at the top of the Accounts page.
// Used by: Log Off Tutorial (step 1), Account Controls Tutorial (step 1).
export function SettingsButton(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("settings-button")(Component)
}

// ═══ Card Controls Tutorial ═══════════════════════════════════════════
// Starts on the Accounts page → More → Card Controls, then walks through
// the card toggle, Travel Notice and Card Alerts.
//   1. MoreTabTarget       (shared starting step, defined above)
//   2. CardControlsTarget  (shared starting step, defined above)
//   3. CardToggle
//   4. TravelNotice
//   5. TravelStart
//   6. TravelEnd
//   7. TravelDestinations
//   8. TravelSave
//   9. TravelNoticeShown
//  10. SetCardAlerts
//  11. CardAlertsToggleTarget1
//  12. CardAlertsToggleTarget2
//  13. CardAlertsToggleTarget3
//  14. CardAlertsSaveTarget
// (The Travel Notice page's scroll container is tagged by
// VirtualScroll.tsx's "scrollable-content", not by an export here.)

// Step 3 — TARGET: Card Controls page card on/off toggle switch
export function CardToggle(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("card-toggle")(Component)
}

// ─── Travel Notice (steps 4–9) ──────────────────────────────────────────

// Step 4 — TARGET: Card Controls page "Set Travel Notice"
export function TravelNotice(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("travel-notice")(Component)
}

// Steps 5–8 are MARKERS over SetTravelNoticeTutorial.tsx's individual
// fields. Start Date, End Date, Destinations and the Save button aren't
// separately selectable Framer layers — they're plain JSX inside one
// component's render — so each gets an empty marker frame positioned
// over it instead (see tutorials/card-controls-tutorial/NOTES.md,
// "Wiring a TutorialOverlay step to a field inside one of these
// components").

// Step 5 — MARKER: Travel Notice page "Start Date"
export function TravelStart(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-start")(Component)
}

// Step 6 — MARKER: Travel Notice page "End Date"
export function TravelEnd(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-end")(Component)
}

// Step 7 — MARKER: Travel Notice page "Destinations"
export function TravelDestinations(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("travel-destinations")(Component)
}

// Step 8 — MARKER: Travel Notice page "Save" button
export function TravelSave(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-save")(Component)
}

// Step 9 — MARKER: Card Controls 2 page, over the
// TravelNoticeSectionTutorial component showing the saved notice
export function TravelNoticeShown(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("travel-notice-shown")(Component)
}

// ─── Card Alerts (steps 10–14) ──────────────────────────────────────────

// Step 10 — TARGET: Card Controls page "Set Card Alerts"
export function SetCardAlerts(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("set-card-alerts")(Component)
}

// Steps 11–13 are TARGETS, one per toggle layer the tutorial spotlights
// and asks the user to tap on the tutorial copy of Set Card Alerts.
// Each toggle IS the real tappable element (a native Framer switch), so
// these are plain targets, not markers: the toggle must still receive
// the real tap itself (that's what flips its own on/off visual).
//
// Don't also apply the toggle's original withCardAlertsToggleReportN
// override (from card-controls/card-alerts/CardAlertsToggleReport.tsx)
// on the tutorial page's copy of that layer — that override's on/off
// flag is a MODULE-LEVEL variable shared by every layer using that same
// numbered export, so a tutorial tap would flip the exact same flag the
// real Set Card Alerts page uses, contaminating a real user's actual
// alert settings. The tutorial doesn't need it anyway: Save on a frozen
// walkthrough page can just be hardcoded enabled (see
// SetTravelNoticeTutorial.tsx's Save for precedent), and the native
// switch already animates its own on/off state on tap with no override
// needed for that part.
//
// Add one more numbered export the same way for each toggle this
// tutorial needs tappable — the number is just an arbitrary label
// matching whichever toggle layer you apply it to, not a particular
// alert category.

// Step 11 — TARGET: toggle #1
export function CardAlertsToggleTarget1(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-1")(Component)
}

// Step 12 — TARGET: toggle #2
export function CardAlertsToggleTarget2(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-2")(Component)
}

// Step 13 — TARGET: toggle #3
export function CardAlertsToggleTarget3(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-3")(Component)
}

// Step 14 — MARKER: over the Set Card Alerts "Save" button. The real
// Save already carries withCardAlertsSaveTutorial
// (card-controls/card-alerts/CardAlertsSave.tsx), and Framer allows
// only one override per layer. As a marker, the tap passes through to
// the real Save, so its onClick (and the Saving overlay) still fires.
export function CardAlertsSaveTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("card-alerts-save")(Component)
}

// ═══ Reset PIN Tutorial ═══════════════════════════════════════════════
// Reset PIN is a card-controls sub-feature with its own tutorial — see
// reset-pin/NOTES.md. Starts on the Accounts page → More → Card
// Controls, the same as the Card Controls Tutorial.
//   1. MoreTabTarget       (shared starting step, defined above)
//   2. CardControlsTarget  (shared starting step, defined above)
//   3. ResetPin
//   4. NewPin
//   5. ResetPinConfirm

// Step 3 — TARGET: Card Controls page "Reset PIN"
export function ResetPin(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("reset-pin")(Component)
}

// Step 4 — TARGET: Reset PIN page "New 4-Digit PIN" and "Confirm New
// 4-Digit PIN" fields (display-only "····", so nothing to tap through to)
export function NewPin(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("new-pin")(Component)
}

// Step 5 — MARKER: over the Reset PIN page "Confirm" button. The real
// Confirm already carries withResetPinConfirm
// (reset-pin/ResetPinConfirm.tsx, which sets the toast flag) and its
// own native Link to the tutorial copy of Card Controls. As a marker,
// the tap passes through to it, so both still fire. Not the same thing
// as withResetPinConfirm, despite the similar name: this one only tags
// the marker frame for TutorialOverlay.
export function ResetPinConfirm(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("reset-pin-confirm")(Component)
}

// ═══ Log Off Tutorial ═════════════════════════════════════════════════
// Starts on the Accounts page → Settings → Logout, then confirms on the
// logout confirmation overlay.
//   1. SettingsButton  (shared starting step, defined above)
//   2. Logout
//   3. YesButton

// Step 2 — MARKER: over the Settings page "Logout" menu item
export function Logout(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("logout")(Component)
}

// Step 3 — TARGET: "Yes" button on the logout confirmation overlay
export function YesButton(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("yes-button")(Component)
}

// ═══ Account Controls Tutorial ════════════════════════════════════════
// Starts on /account-controls-tutorial/accounts-1 → Settings → Account
// Preferences, renames, moves and hides accounts, taps Done, then taps
// Accounts in the bottom nav to reach /account-controls-tutorial/accounts-2,
// which shows the result for a few seconds before the congrats page.
//   1. SettingsButton          (shared starting step, defined above)
//   2. AccountPreferencesItem
//   3. AccountPrefsEdit
//   4. "account-prefs-name-field"  — tap the name field
//   5. "account-prefs-name-field"  — the name types and saves
//   6. "account-prefs-row"         — drag Main Checking to the top
//   7. "account-prefs-eye"         — hide Platinum Rewards Checking
//   8. AccountPrefsDone
//   9. AccountsTab
//  10. AccountsUpdated
// (Steps 4–7's targets are tagged by AccountPreferencesListTutorial.tsx
// in tutorials/account-controls-tutorial/, not by an export here.)

// Step 2 — TARGET: Settings page "Account Preferences" menu item
export function AccountPreferencesItem(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("account-preferences")(Component)
}

// Steps 3 and 8 are separate markers because "Edit" and "Done" sit in
// different spots: the View header's ← pushes "Edit" over. Markers
// because the Edit/Done tap frame already carries
// withAccountPrefsEditToggle. Both can stay on the page all the time;
// each step only looks for its own.

// Step 3 — MARKER: over "Edit" in the header's View variant
export function AccountPrefsEdit(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("account-prefs-edit")(Component)
}

// Step 8 — MARKER: over "Done" in the header's Editing variant
export function AccountPrefsDone(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("account-prefs-done")(Component)
}

// Step 9 — TARGET: an empty frame (no fill) over "Accounts" in the
// Account Preferences page's bottom nav, with its own native Link to
// /account-controls-tutorial/accounts-2. A target, not a marker: the nav
// button underneath links to the free-play Accounts page, so this frame
// has to take the tap itself rather than pass it through.
export function AccountsTab(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("accounts-tab")(Component)
}

// Step 10 — TARGET: accounts-2, the internal accounts card itself (the
// stack holding the four account frames), showing the new order, the
// new name and Platinum gone. On the card rather than a marker frame,
// so the highlight follows its real height with Platinum hidden. The
// account frames inside carry withAccountNNNN; the card itself is free.
// A timed step: its TutorialOverlay redirects to the congrats page.
export function AccountsUpdated(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("accounts-updated")(Component)
}
