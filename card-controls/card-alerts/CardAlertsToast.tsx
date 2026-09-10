import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * CardAlertsToast
 *
 * Card Alerts' own copy of TravelNoticeToast.tsx — same mechanism, new
 * storage key, applied to a "Card alerts successfully updated" toast
 * layer on Card Controls (the page CardAlertsSave.tsx's Save button
 * navigates to once its Saving overlay's delay elapses).
 *
 * Two Code Overrides (right panel -> Code -> Override -> this file):
 *
 *  - withCardAlertsToast — apply to the toast's outer frame. Once Card
 *    Controls loads, checks the one-shot flag CardAlertsSave.tsx left
 *    behind; if present, shows the frame, holds it for VISIBLE_MS,
 *    fades it out over FADE_MS, then hides it. Edit the two constants
 *    below directly to change timing.
 *
 *  - withCardAlertsToastDismiss — apply to the toast's own × button
 *    layer. Tapping it fades the toast out immediately.
 *
 * On the canvas both overrides are inert. See TravelNoticeToast.tsx's
 * header comment for the full rationale behind the subscribe-before-arm
 * ordering and the module-level phase + listener Set technique.
 */

const STORAGE_TOAST_FLAG_KEY = "kioskCardAlertsToastFlag"

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
function subscribeToast(onChange: () => void): () => void {
    toastListeners.add(onChange)
    return () => {
        toastListeners.delete(onChange)
    }
}

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

export function withCardAlertsToast(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToast(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            const unsubscribe = subscribeToast(forceUpdate)
            armToastFromStorageOnce()
            return unsubscribe
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

export function withCardAlertsToastDismiss(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToastDismiss(props: any) {
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
                    window.setTimeout(() => setToastPhase("hidden"), FADE_MS)
                }}
            />
        )
    }
}
