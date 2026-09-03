import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * TravelNoticeToast
 *
 * Two Code Overrides for a success toast you build yourself in Framer
 * (right panel → Code → Override → this file → pick the function):
 *
 *  - withTravelNoticeToast — apply to the toast's outer frame, on
 *    whatever page SetTravelNotice.tsx's Save button navigates to (see
 *    that file's header comment for the sessionStorage contract). Once
 *    that page loads, this checks the one-shot flag SetTravelNotice.tsx
 *    left behind; if present, it shows the frame, holds it for
 *    VISIBLE_MS, fades it out over FADE_MS, then hides it. Edit the two
 *    constants below directly to change timing — same "edit the
 *    constant" convention InactivityOverlay.tsx uses for its own
 *    timings.
 *
 *  - withTravelNoticeToastDismiss — apply to the toast's own × button
 *    layer. Tapping it fades the toast out immediately. Shares state
 *    with the override above via a module-level phase variable + a
 *    listener Set, the same cross-instance coordination technique
 *    TutorialOverlay.tsx's pageStepState uses — so a manual dismiss and
 *    the auto-hide timer can never fight over the same toast.
 *
 * On the canvas both overrides are inert — the layer renders exactly as
 * designed, so it stays freely stylable there. The show/hide behavior
 * only runs in Preview/Published.
 *
 * Each real page navigation is a fresh document load, so the module
 * state below starts clean every time — it only needs to coordinate
 * the auto-hide timer and the dismiss button for ONE toast showing on
 * ONE page load, never across pages.
 */

const STORAGE_TOAST_FLAG_KEY = "kioskTravelNoticeToastFlag"

// Edit these two values directly.
const VISIBLE_MS = 3000
const FADE_MS = 400

type ToastPhase = "hidden" | "visible" | "fading"
let toastPhase: ToastPhase = "hidden"
let toastArmedForThisLoad = false
const toastListeners = new Set<() => void>()

function setToastPhase(phase: ToastPhase) {
    toastPhase = phase
    toastListeners.forEach((fn) => fn())
}
function subscribeToast(onChange: () => void) {
    toastListeners.add(onChange)
    return () => toastListeners.delete(onChange)
}

// Runs once per page load (guarded by toastArmedForThisLoad) regardless
// of how many instances/overrides mount — reads the one-shot flag,
// clears it immediately so a later refresh of this same page can't
// re-trigger the toast, and starts the show/fade/hide timers.
function armToastFromStorageOnce() {
    if (toastArmedForThisLoad) return
    toastArmedForThisLoad = true
    if (typeof window === "undefined") return
    const flag = window.sessionStorage.getItem(STORAGE_TOAST_FLAG_KEY)
    if (flag !== "1") return
    window.sessionStorage.removeItem(STORAGE_TOAST_FLAG_KEY)
    setToastPhase("visible")
    window.setTimeout(() => setToastPhase("fading"), VISIBLE_MS)
    window.setTimeout(() => setToastPhase("hidden"), VISIBLE_MS + FADE_MS)
}

export function withTravelNoticeToast(
    Component: ComponentType<any>
): ComponentType<any> {
    return function TravelNoticeToast(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            armToastFromStorageOnce()
            return subscribeToast(forceUpdate)
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        const visible = toastPhase !== "hidden"

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: toastPhase === "visible" ? 1 : 0,
                    pointerEvents: toastPhase === "visible" ? "auto" : "none",
                    transition: `opacity ${FADE_MS}ms ease`,
                    display: visible ? props.style?.display : "none",
                }}
            />
        )
    }
}

export function withTravelNoticeToastDismiss(
    Component: ComponentType<any>
): ComponentType<any> {
    return function TravelNoticeToastDismiss(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    pointerEvents: "auto",
                    cursor: "pointer",
                }}
                onClick={(e: React.MouseEvent) => {
                    props.onClick?.(e)
                    setToastPhase("fading")
                    window.setTimeout(
                        () => setToastPhase("hidden"),
                        FADE_MS
                    )
                }}
            />
        )
    }
}
