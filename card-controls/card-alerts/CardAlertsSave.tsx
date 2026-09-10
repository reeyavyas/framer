import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
import { anyToggleOn, subscribeToggles } from "./CardAlertsToggleReport.tsx"

/**
 * CardAlertsSave
 *
 * Two Code Overrides for the Set Card Alerts page's Save button and its
 * "Saving..." overlay (right panel -> Code -> Override -> this file):
 *
 *  - withCardAlertsSave — apply to the Save button's own frame. Reads
 *    CardAlertsToggleReport's shared map (is any toggle on?) to switch
 *    between enabled/disabled visuals, the same isValid-driven styling
 *    SetTravelNotice.tsx uses for its own Save link. Tapping it while
 *    enabled shows the Saving overlay, waits SAVE_DELAY_MS (edit the
 *    constant directly — same convention as TravelNoticeToast.tsx's
 *    VISIBLE_MS/FADE_MS), sets the one-shot toast flag, then follows
 *    the layer's own Link. Tapping while disabled does nothing.
 *
 *  - withCardAlertsSavingOverlay — apply to the "Saving..." overlay
 *    frame (dimmed background + spinner + text — build the spin as a
 *    native looping rotation animation, no code needed for that part).
 *    It lives on this SAME page as the Save button, so unlike
 *    TravelNoticeToast.tsx's cross-page toast, it needs no
 *    sessionStorage handoff or fade-out timer: the moment SAVE_DELAY_MS
 *    elapses the page navigates away and takes the overlay with it.
 *
 * On the canvas both overrides are inert.
 */

const STORAGE_TOAST_FLAG_KEY = "kioskCardAlertsToastFlag"

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

export function withCardAlertsSave(
    Component: ComponentType<any>
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
                    const href = props.href
                    setSavingOverlayVisible(true)
                    window.setTimeout(() => {
                        window.sessionStorage.setItem(
                            STORAGE_TOAST_FLAG_KEY,
                            "1"
                        )
                        if (href) window.location.href = href
                    }, SAVE_DELAY_MS)
                }}
            />
        )
    }
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
