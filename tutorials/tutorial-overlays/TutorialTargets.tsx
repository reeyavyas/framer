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
// underneath (e.g. SetTravelNoticeTutorial.tsx's actual Save link) would
// never see the click at all: the browser resolves a click by DOM
// hit-testing at that point, and TutorialOverlay's own click-blocking
// (the window-capture listener in TutorialOverlay.tsx) only checks
// coordinates against the hole — it never un-does the browser having
// already handed the event to whichever element is visually on top.
// Don't use this for a target that IS the real tappable element itself
// (e.g. MoreTabTarget below) — that one still needs to receive taps.
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
// thin named export like this one, even though they all share the
// same factory above. Add one more per target the same way.
export function MoreTabTarget(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialTarget("more-tab")(Component)
}

// Marker layers for the card-controls-tutorial travel-notice flow —
// three empty, invisible Framer layers positioned over
// SetTravelNoticeTutorial.tsx's Start Date field, End Date field, and
// Save button respectively (that component's fields aren't separately
// selectable Framer layers, so a marker layer is overlaid instead — see
// tutorials/card-controls-tutorial/NOTES.md, "Wiring a TutorialOverlay
// step to a field inside one of these components"). These three exports
// were added directly in Framer's code editor before this repo's copy
// caught up; pulled in here now so the two stay in sync. Uses
// withTutorialMarker (not withTutorialTarget) since all three sit on
// top of a separate real element rather than being the tappable element
// themselves — travel-save in particular MUST stay click-through, or
// the real Save link underneath it can never be tapped.
export function TravelStart(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-start")(Component)
}
export function TravelEnd(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-end")(Component)
}
export function TravelSave(Component: ComponentType<any>): ComponentType<any> {
    return withTutorialMarker("travel-save")(Component)
}
