import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
import { anyToggleOn, subscribeToggles } from "./CardAlertsToggleReport.tsx"

/**
 * CardAlertsSave
 *
 * Code Overrides for the Set Card Alerts page's Save button and its
 * "Saving..." overlay (right panel -> Code -> Override -> this file):
 *
 *  - withCardAlertsSave / withCardAlertsSaveTutorial — apply one of
 *    these to a Save button's own frame, depending on which Set Card
 *    Alerts page it's on: the base page's Save uses withCardAlertsSave
 *    (navigates to CARD_CONTROLS_LINK), the tutorial-overlay duplicate
 *    page's Save uses withCardAlertsSaveTutorial (navigates to
 *    CARD_CONTROLS_TUTORIAL_LINK) — everything else about the two is
 *    identical, so both are thin wrappers around the shared
 *    renderCardAlertsSave below rather than two copies of the same
 *    component. Both are plain top-level `function` exports rather
 *    than a factory-produced `const` — Framer's Code Override picker
 *    only lists exports shaped exactly like
 *    `function name(Component) {...}` at the top level of the file; a
 *    `const` assigned from a factory call's return value (what an
 *    earlier version of this file did) doesn't get recognized and
 *    silently disappears from the dropdown. Each reads
 *    CardAlertsToggleReport's shared on-count (is any toggle on?) to
 *    switch between enabled/disabled visuals, the same isValid-driven
 *    styling SetTravelNotice.tsx uses for its own Save link. Tapping it
 *    while enabled shows the Saving overlay, waits SAVE_DELAY_MS (edit
 *    the constant directly — same convention as TravelNoticeToast.tsx's
 *    VISIBLE_MS/FADE_MS), sets the one-shot toast flag, then navigates
 *    to its own destination. Tapping while disabled does nothing.
 *
 *    IMPORTANT — remove any native Link set on either Save layer in
 *    Framer's Properties panel. A native Link navigates on tap through
 *    Framer's own mechanism, entirely independent of this override's
 *    onClick — it wins the race every time, which is why a disabled
 *    (grayed-out) button was still tappable and the Saving overlay
 *    never got a chance to show before the page unloaded. With no
 *    native Link on the layer, this override is the only thing that
 *    can navigate, so both the disabled-tap guard and SAVE_DELAY_MS
 *    actually take effect.
 *
 *  - withCardAlertsSavingOverlay — apply to the "Saving..." overlay
 *    frame on EITHER page (dimmed background + spinner + text — build
 *    the spin as a native looping rotation animation, no code needed
 *    for that part). One shared override is enough since the overlay's
 *    own behavior never depends on which page it's showing on top of.
 *    It lives on the SAME page as its Save button, so unlike
 *    TravelNoticeToast.tsx's cross-page toast, it needs no
 *    sessionStorage handoff or fade-out timer: the moment SAVE_DELAY_MS
 *    elapses the page navigates away and takes the overlay with it.
 *
 * On the canvas all overrides are inert.
 */

const STORAGE_TOAST_FLAG_KEY = "kioskCardAlertsToastFlag"

// The base Card Controls page's real published path.
const CARD_CONTROLS_LINK = "/card-controls"

// The tutorial-overlay duplicate of Card Controls — update this to its
// real published path too.
const CARD_CONTROLS_TUTORIAL_LINK = "/card-controls-tutorial"

// Edit this value directly to change how long the spinner shows before
// navigating away.
const SAVE_DELAY_MS = 900

const ENABLED_BACKGROUND = "#1f4fa8"
const ENABLED_TEXT = "#ffffff"
const DISABLED_BACKGROUND = "#d7dade"
const DISABLED_TEXT = "#9aa0a6"

let savingOverlayVisible = false
const savingOverlayListeners = new Set<() => void>()

function setSavingOverlayVisible(visible: boolean) {
    savingOverlayVisible = visible
    savingOverlayListeners.forEach((fn) => fn())
}

// Shared body for both Save exports below — takes the destination as a
// plain argument so it isn't a factory whose RETURN VALUE gets assigned
// to a const (see the header comment on why that shape goes missing
// from Framer's Override picker).
function renderCardAlertsSave(
    Component: ComponentType<any>,
    destination: string
): ComponentType<any> {
    return function CardAlertsSave(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            return subscribeToggles(forceUpdate)
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        const enabled = anyToggleOn()

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    background: enabled
                        ? ENABLED_BACKGROUND
                        : DISABLED_BACKGROUND,
                    color: enabled ? ENABLED_TEXT : DISABLED_TEXT,
                    cursor: enabled ? "pointer" : "default",
                }}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    // Fully owns the tap (unlike the additive overrides
                    // elsewhere in this project) since it has to hold
                    // navigation until the delay below elapses — chaining
                    // props.onClick here could let a native Link fire its
                    // own navigation before that delay is up.
                    e.preventDefault()
                    if (!enabled) return
                    setSavingOverlayVisible(true)
                    window.setTimeout(() => {
                        window.sessionStorage.setItem(
                            STORAGE_TOAST_FLAG_KEY,
                            "1"
                        )
                        window.location.href = destination
                    }, SAVE_DELAY_MS)
                }}
            />
        )
    }
}

export function withCardAlertsSave(
    Component: ComponentType<any>
): ComponentType<any> {
    return renderCardAlertsSave(Component, CARD_CONTROLS_LINK)
}

export function withCardAlertsSaveTutorial(
    Component: ComponentType<any>
): ComponentType<any> {
    return renderCardAlertsSave(Component, CARD_CONTROLS_TUTORIAL_LINK)
}

export function withCardAlertsSavingOverlay(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsSavingOverlay(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            savingOverlayListeners.add(forceUpdate)
            return () => {
                savingOverlayListeners.delete(forceUpdate)
            }
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: savingOverlayVisible ? 1 : 0,
                    pointerEvents: savingOverlayVisible ? "auto" : "none",
                    display: savingOverlayVisible
                        ? props.style?.display
                        : "none",
                }}
            />
        )
    }
}
