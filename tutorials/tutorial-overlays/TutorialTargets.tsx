import * as React from "react"
import type { ComponentType } from "react"

/**
 * TutorialTargets
 *
 * Code Overrides that tag one specific layer instance with a
 * data-tutorial-target attribute for TutorialOverlay.tsx to find and
 * measure. Nothing else about the layer is touched — no style, size,
 * or position changes — this only adds the attribute.
 *
 * Because a Code Override applies to the single instance you assign it
 * to (right panel → Code → Override), not to the Main Component, this
 * can't leak onto other instances of the same component on other
 * pages, and it never requires detaching.
 *
 * Usage: select the "more-tab" layer on the canvas → Code (right
 * panel) → Override → this file → MoreTabTarget.
 */

function withTutorialTarget(id: string) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return React.forwardRef(function TutorialTarget(props: any, ref: any) {
            return <Component {...props} ref={ref} data-tutorial-target={id} />
        })
    }
}

// Same as withTutorialTarget, but also forces pointer-events:none. For a
// marker layer stacked on top of a separate real element purely so
// TutorialOverlay has something to measure — the marker itself must
// never be the thing that receives the tap, or the real element
// underneath (e.g. SetTravelNoticeTutorial.tsx's actual Save link, or
// the base SetTravelNotice.tsx's calendar/destinations dropdowns) would
// never see the click at all: the browser resolves a click by DOM
// hit-testing at that point, and TutorialOverlay's own click-blocking
// (the window-capture listener in TutorialOverlay.tsx) only checks
// coordinates against the hole — it never un-does the browser having
// already handed the event to whichever element is visually on top.
// Don't use this for a target that IS the real tappable/scrollable
// element itself (e.g. MoreTabTarget, TravelScroll below) — those still
// need to receive taps/scroll input.
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
// thin named export like this one, even though they share the same
// factory above. Add one more per target the same way.

//More bottom nav menu
export function MoreTabTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("more-tab")(Component)
}

//Card Controls at the top of More page
export function CardControlsTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-controls")(Component)
}

//Card Controls Page Toggle/Switch
export function CardToggle(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("card-toggle")(Component)
}

//Card Controls Page "Set Travel Notice"
export function TravelNotice(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("travel-notice")(Component)
}

//Travel Notice Page Scrollable Content — the real scroll container
//itself, not a marker, so this stays plain (no pointer-events:none) or
//nothing on the page could be scrolled at all.
export function TravelScroll(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("travel-scroll")(Component)
}

// Card Alerts Tutorial Page Scrollable Content — the real scroll
// container for the toggles list, same non-marker reasoning as
// TravelScroll above. NOT "scrollable-content" — that string is
// VirtualScroll.tsx's own internal registry key for
// VirtualScrollTravelContent (a getVirtualScroll() lookup, unrelated to
// this data-tutorial-target attribute/querySelector system), only ever
// actually present on the Travel Notice page. Reusing it here for a
// scrollContainerTarget on a page that doesn't have
// VirtualScrollTravelContent applied resolves to nothing:
// getVirtualScroll("scrollable-content") returns undefined, the
// document.querySelector('[data-tutorial-target="scrollable-content"]')
// fallback finds nothing either, and TutorialOverlay's
// resolveScrollTarget silently falls back to locking/measuring `window`
// instead — which does nothing if the real scrolling happens inside a
// nested frame rather than the whole page. This target gives the Card
// Alerts page its own real, distinct id instead.
export function CardAlertsScroll(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-scroll")(Component)
}

// Marker layers for SetTravelNoticeTutorial.tsx's (and potentially
// SetTravelNotice.tsx's) individual fields — Start Date, End Date,
// Destinations, and the Save button aren't separately selectable Framer
// layers, they're plain JSX inside one component's render, so each gets
// an empty, invisible marker layer positioned over it instead, tagged
// here (see tutorials/card-controls-tutorial/NOTES.md, "Wiring a
// TutorialOverlay step to a field inside one of these components").
// All four use withTutorialMarker: each sits on top of a real field
// that either is or could be interactive, so all four must stay
// click-through.

//Travel Notice Page "Start Date"
export function TravelStart(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-start")(Component)
}

//Travel Notice Page "End Date"
export function TravelEnd(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-end")(Component)
}

//Travel Notice Page "Destinations"
export function TravelDestinations(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialMarker("travel-destinations")(Component)
}

//Travel Notice Page "Save" Button
export function TravelSave(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-save")(Component)
}

// Card Alerts Tutorial page — one export per toggle layer the tutorial
// spotlights and asks the user to tap. Each toggle IS the real tappable
// element (a native Framer switch), same category as MoreTabTarget/
// CardToggle/TravelScroll above — so this uses plain withTutorialTarget,
// not withTutorialMarker: the toggle must still receive the real tap
// itself (that's what flips its own on/off visual), it's not a marker
// sitting on top of something else.
//
// Don't also apply this toggle's original withCardAlertsToggleReportN
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
// tutorial needs tappable — they don't need to correspond to any
// particular real alert category, the number is just an arbitrary label
// matching whichever toggle layer you apply it to on the canvas.

//Card Alerts Tutorial Page toggle #1
export function CardAlertsToggleTarget1(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-1")(Component)
}

//Card Alerts Tutorial Page toggle #2
export function CardAlertsToggleTarget2(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-2")(Component)
}

//Card Alerts Tutorial Page toggle #3
export function CardAlertsToggleTarget3(
    Component: ComponentType<any>
): ComponentType<any> {
    return withTutorialTarget("card-alerts-toggle-3")(Component)
}
