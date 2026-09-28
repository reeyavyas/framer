import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * ResetPinToast
 *
 * Reset PIN's copy of CardAlertsToast.tsx / TravelNoticeToast.tsx —
 * same show/hold/fade toast, its own storage key, plus a countdown
 * progress bar. Applied to a "Your PIN has been reset for this card."
 * toast layer on Card Controls (base page, and the tutorial copy of
 * Card Controls — both read the same flag), which ResetPinConfirm.tsx's
 * Confirm button navigates back to.
 *
 * Three Code Overrides (right panel -> Code -> Override -> this file):
 *
 *  - withResetPinToast — apply to the toast's outer frame. When Card
 *    Controls mounts, checks the one-shot flag ResetPinConfirm.tsx left
 *    behind; if present, shows the frame, holds it for VISIBLE_MS,
 *    fades it out over FADE_MS, then hides it. Edit the two constants
 *    below directly to change timing.
 *
 *  - withResetPinToastDismiss — apply to the toast's own × button
 *    layer. Tapping it fades the toast out immediately.
 *
 *  - withResetPinToastProgress — apply to the progress bar: a plain
 *    rectangle along the toast's bottom edge, drawn at its FULL width
 *    on canvas (style it there — color, height, radius). While the
 *    toast shows, it shrinks from full width to nothing, right edge
 *    moving left, over exactly VISIBLE_MS, so it runs out the moment
 *    the fade starts. It shrinks with transform: scaleX (origin left),
 *    not width, so it never re-lays-out the toast around it. If the ×
 *    is tapped, the bar freezes where it is and fades with the toast.
 *    The bar is purely visual — the timers in armToast() below are what
 *    actually hide the toast.
 *
 * Unlike the other two toasts, this one ARMS ON EVERY MOUNT of the
 * toast frame, not once per module load. Those two are reached by a
 * hard navigation (window.location.href), which reloads the document
 * and resets module state each time. Reset PIN's Confirm uses a native
 * Framer Link instead (see ResetPinConfirm.tsx), and Framer's
 * client-side routing can keep this module alive between pages — a
 * once-per-load guard would then show the toast on the first reset and
 * never again. Reading and clearing the flag on each mount is safe: the
 * flag is only there right after a Confirm tap, so any other visit to
 * Card Controls finds nothing and stays hidden. `toastGeneration`
 * guards the timers the same way: arming or dismissing bumps it, so a
 * leftover timer from an earlier toast (e.g. the user left Card
 * Controls mid-toast) can't hide or fade a newer one.
 *
 * On the canvas all three overrides are inert — the layers render
 * exactly as designed.
 */

// Must match ResetPinConfirm.tsx's STORAGE_TOAST_FLAG_KEY.
const STORAGE_TOAST_FLAG_KEY = "kioskResetPinToastFlag"

// Edit these two values directly.
const VISIBLE_MS = 3000
const FADE_MS = 400

type ToastPhase = "hidden" | "visible" | "fading"
let toastPhase: ToastPhase = "hidden"
let toastShownAt = 0
let toastGeneration = 0
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

// Called on every mount of the toast frame (see header comment).
function armToast() {
    if (typeof window === "undefined") return
    const generation = ++toastGeneration
    const flag = window.sessionStorage.getItem(STORAGE_TOAST_FLAG_KEY)
    if (flag !== "1") {
        // Clears anything left over from a toast interrupted by leaving
        // the page mid-way.
        setToastPhase("hidden")
        return
    }
    window.sessionStorage.removeItem(STORAGE_TOAST_FLAG_KEY)
    toastShownAt = Date.now()
    setToastPhase("visible")
    window.setTimeout(() => {
        if (generation === toastGeneration) setToastPhase("fading")
    }, VISIBLE_MS)
    window.setTimeout(() => {
        if (generation === toastGeneration) setToastPhase("hidden")
    }, VISIBLE_MS + FADE_MS)
}

function dismissToast() {
    if (toastPhase !== "visible") return
    const generation = ++toastGeneration
    setToastPhase("fading")
    window.setTimeout(() => {
        if (generation === toastGeneration) setToastPhase("hidden")
    }, FADE_MS)
}

// Fraction of the bar still showing right now, 1 -> 0 over VISIBLE_MS.
function remainingFraction(): number {
    const elapsed = Date.now() - toastShownAt
    return Math.min(1, Math.max(0, 1 - elapsed / VISIBLE_MS))
}

export function withResetPinToast(
    Component: ComponentType<any>
): ComponentType<any> {
    return function ResetPinToast(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            // Subscribe before arming, so the synchronous "visible"
            // notification arming can fire isn't missed.
            const unsubscribe = subscribeToast(forceUpdate)
            armToast()
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

export function withResetPinToastDismiss(
    Component: ComponentType<any>
): ComponentType<any> {
    return function ResetPinToastDismiss(props: any) {
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
                    dismissToast()
                }}
            />
        )
    }
}

export function withResetPinToastProgress(
    Component: ComponentType<any>
): ComponentType<any> {
    return function ResetPinToastProgress(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        // The bar's current scale, and how long the transition to it
        // takes (0 = jump there instantly).
        const [bar, setBar] = React.useState({ scale: 1, durationMs: 0 })

        React.useEffect(() => {
            if (isCanvas) return
            let frame = 0
            function sync() {
                window.cancelAnimationFrame(frame)
                if (toastPhase === "visible") {
                    // Jump to where the countdown is now, then on the
                    // next frame (once that's painted) transition the
                    // rest of the way to 0 over the time that's left.
                    const fraction = remainingFraction()
                    setBar({ scale: fraction, durationMs: 0 })
                    frame = window.requestAnimationFrame(() => {
                        frame = window.requestAnimationFrame(() => {
                            setBar({
                                scale: 0,
                                durationMs: fraction * VISIBLE_MS,
                            })
                        })
                    })
                } else {
                    // Fading (timed out or dismissed) or hidden: freeze.
                    setBar({ scale: remainingFraction(), durationMs: 0 })
                }
            }
            const unsubscribe = subscribeToast(sync)
            sync()
            return () => {
                unsubscribe()
                window.cancelAnimationFrame(frame)
            }
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    transform: `scaleX(${bar.scale})`,
                    transformOrigin: "left center",
                    transition:
                        bar.durationMs > 0
                            ? `transform ${bar.durationMs}ms linear`
                            : "none",
                }}
            />
        )
    }
}
