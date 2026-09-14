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
