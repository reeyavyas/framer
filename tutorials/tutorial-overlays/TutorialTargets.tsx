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
 * Exports are grouped by page, in the order the tutorials visit them.
 * Each one is either:
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
// (e.g. MoreTabTarget, TravelScroll) — those still need to receive
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
// its page's section.

// ─── Login page ───────────────────────────────────────────────────────

// TARGET: "Login" button
export function LoginButton(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("login-button")(Component)
}

// MARKER: over the fingerprint
export function FingerprintMarker(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("fingerprint-marker")(Component)
}

// ─── More page ────────────────────────────────────────────────────────

// TARGET: "More" in the bottom nav menu
export function MoreTabTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("more-tab")(Component)
}

// TARGET: "Card Controls" at the top of the More page
export function CardControlsTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-controls")(Component)
}

// ─── Card Controls page ───────────────────────────────────────────────
// The hub each card-controls tutorial starts from.

// TARGET: card on/off toggle switch
export function CardToggle(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("card-toggle")(Component)
}

// TARGET: "Set Travel Notice"
export function TravelNotice(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("travel-notice")(Component)
}

// TARGET: "Set Card Alerts"
export function SetCardAlerts(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("set-card-alerts")(Component)
}

// TARGET: "Reset PIN"
export function ResetPin(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("reset-pin")(Component)
}

// ─── Travel Notice page ───────────────────────────────────────────────

// TARGET: the page's Scrollable Content — the real scroll container
// itself, not a marker, so it stays plain (no pointer-events:none) or
// nothing on the page could be scrolled at all.
export function TravelScroll(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("travel-scroll")(Component)
}

// MARKERS over SetTravelNoticeTutorial.tsx's (and potentially
// SetTravelNotice.tsx's) individual fields. Start Date, End Date,
// Destinations and the Save button aren't separately selectable Framer
// layers — they're plain JSX inside one component's render — so each
// gets an empty marker frame positioned over it instead (see
// tutorials/card-controls-tutorial/NOTES.md, "Wiring a TutorialOverlay
// step to a field inside one of these components").

// MARKER: "Start Date"
export function TravelStart(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-start")(Component)
}

// MARKER: "End Date"
export function TravelEnd(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-end")(Component)
}

// MARKER: "Destinations"
export function TravelDestinations(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("travel-destinations")(Component)
}

// MARKER: "Save" button
export function TravelSave(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-save")(Component)
}

// ─── Card Controls 2 page (end of the Travel Notice tutorial) ─────────

// MARKER: over the TravelNoticeSectionTutorial component showing the
// saved notice
export function TravelNoticeShown(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("travel-notice-shown")(Component)
}

// ─── Set Card Alerts page (tutorial copy) ─────────────────────────────

// TARGETS: one per toggle layer the tutorial spotlights and asks the
// user to tap. Each toggle IS the real tappable element (a native
// Framer switch), so these are plain targets, not markers: the toggle
// must still receive the real tap itself (that's what flips its own
// on/off visual).
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

// TARGET: toggle #1
export function CardAlertsToggleTarget1(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-1")(Component)
}

// TARGET: toggle #2
export function CardAlertsToggleTarget2(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-2")(Component)
}

// TARGET: toggle #3
export function CardAlertsToggleTarget3(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-3")(Component)
}

// MARKER: over the "Save" button. The real Save already carries
// withCardAlertsSaveTutorial (card-controls/card-alerts/CardAlertsSave.tsx),
// and Framer allows only one override per layer. As a marker, the tap
// passes through to the real Save, so its onClick (and the Saving
// overlay) still fires.
export function CardAlertsSaveTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("card-alerts-save")(Component)
}

// ─── Reset PIN page (tutorial copy) ───────────────────────────────────
// Reset PIN is a card-controls sub-feature with its own tutorial — see
// reset-pin/NOTES.md.

// TARGET: the "New 4-Digit PIN" and "Confirm New 4-Digit PIN" fields
// (display-only "····", so nothing to tap through to)
export function NewPin(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("new-pin")(Component)
}

// MARKER: over the "Confirm" button. The real Confirm already carries
// withResetPinConfirm (reset-pin/ResetPinConfirm.tsx, which sets the
// toast flag) and its own native Link to the tutorial copy of Card
// Controls. As a marker, the tap passes through to it, so both still
// fire. Not the same thing as withResetPinConfirm, despite the similar
// name: this one only tags the marker frame for TutorialOverlay.
export function ResetPinConfirm(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("reset-pin-confirm")(Component)
}
