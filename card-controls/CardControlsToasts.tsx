import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * CardControlsToasts
 *
 * The confirmation toasts Card Controls' own features show once their
 * save lands, merged into one file (they were TravelNoticeToast.tsx and
 * CardAlertsToast.tsx — Card Alerts' copy of Travel Notice's, same
 * mechanism, new storage key). Each toast keeps its own storage key and
 * its own phase, keyed per toast below, so the two never touch each
 * other's state. Reset PIN's toast is NOT here: it lives in
 * reset-pin/ResetPinToast.tsx (Reset PIN files never go under
 * card-controls/ — see the root NOTES.md), and nothing is shared with it
 * by import, since cross-folder imports have made a whole file's exports
 * vanish from the Override picker before.
 *
 * Four Code Overrides for success toasts you build yourself in Framer
 * (right panel → Code → Override → this file → pick the function):
 *
 *  - withTravelNoticeToast — apply to the travel notice toast's outer
 *    frame, on whatever page SetTravelNotice.tsx's Save button
 *    navigates to (see that file's header comment for the
 *    sessionStorage contract). Once that page loads, this checks the
 *    one-shot flag SetTravelNotice.tsx left behind; if present, it shows
 *    the frame, holds it for VISIBLE_MS, fades it out over FADE_MS, then
 *    hides it. Edit the two constants below directly to change timing —
 *    same "edit the constant" convention AppInactivityOverlay.tsx uses
 *    for its own timings.
 *
 *  - withTravelNoticeToastDismiss — apply to that toast's own × button
 *    layer. Tapping it fades the toast out immediately. Shares state
 *    with the override above via a module-level phase variable + a
 *    listener Set, the same cross-instance coordination technique
 *    TutorialOverlay.tsx's pageStepState uses — so a manual dismiss and
 *    the auto-hide timer can never fight over the same toast.
 *
 *  - withCardAlertsToast — apply to the "Card alerts successfully
 *    updated" toast's outer frame on Card Controls (the page
 *    CardAlertsSave.tsx's Save button navigates to once its Saving
 *    overlay's delay elapses). Once Card Controls loads, checks the
 *    one-shot flag CardAlertsSave.tsx left behind; if present, shows the
 *    frame, holds it for VISIBLE_MS, fades it out over FADE_MS, then
 *    hides it.
 *
 *  - withCardAlertsToastDismiss — apply to that toast's own × button
 *    layer. Tapping it fades the toast out immediately.
 *
 * Each export is its own literal top-level `function` delegating to a
 * shared helper (renderToast / renderToastDismiss), not a `const` from a
 * factory call, so Framer's Override picker lists it (see README.md).
 *
 * On the canvas all four overrides are inert — the layer renders
 * exactly as designed, so it stays freely stylable there. The show/hide
 * behavior only runs in Preview/Published.
 *
 * Each real page navigation is a fresh document load, so the module
 * state below starts clean every time — it only needs to coordinate
 * the auto-hide timer and the dismiss button for ONE toast showing on
 * ONE page load, never across pages. (Both saves get there by a hard
 * navigation: SetTravelNotice.tsx's Save is a plain `<a href>`, and
 * CardAlertsSave.tsx sets `window.location.href`.) That's why these two
 * arm once per page load, unlike ResetPinToast.tsx, which arms on every
 * mount because its Confirm uses a native Framer Link whose client-side
 * routing can keep the module alive. Per-mount arming isn't adopted
 * here: a second mount of the same toast frame within one load (e.g.
 * more than one instance of it hydrating at once) would find the flag
 * already cleared and reset a showing toast to hidden, which the
 * once-per-load guard never does.
 */

type ToastKey = "travelNotice" | "cardAlerts"

const STORAGE_TOAST_FLAG_KEYS: Record<ToastKey, string> = {
    travelNotice: "kioskTravelNoticeToastFlag",
    cardAlerts: "kioskCardAlertsToastFlag",
}

// Edit these two values directly.
const VISIBLE_MS = 3000
const FADE_MS = 400

type ToastPhase = "hidden" | "visible" | "fading"
// One entry per toast. `generation` is bumped by arming and by
// dismissing, so a timer from one can't act after the other (same guard
// as ResetPinToast.tsx).
const toasts: Record<
    ToastKey,
    { phase: ToastPhase; armedForThisLoad: boolean; generation: number }
> = {
    travelNotice: { phase: "hidden", armedForThisLoad: false, generation: 0 },
    cardAlerts: { phase: "hidden", armedForThisLoad: false, generation: 0 },
}
// Shared by both toasts: a phase change re-renders every subscriber,
// and each one just reads its own toast's phase.
const toastListeners = new Set<() => void>()

function setToastPhase(key: ToastKey, phase: ToastPhase) {
    toasts[key].phase = phase
    toastListeners.forEach((fn) => fn())
}
function subscribeToast(onChange: () => void): () => void {
    toastListeners.add(onChange)
    // Block body (not an implicit-return arrow) so this returns void,
    // not the boolean Set.prototype.delete() itself returns — a plain
    // `() => toastListeners.delete(onChange)` type-checks as
    // `() => boolean`, which useEffect's cleanup return type rejects.
    return () => {
        toastListeners.delete(onChange)
    }
}

// Runs once per page load per toast (guarded by armedForThisLoad)
// regardless of how many instances/overrides mount — reads the one-shot
// flag, clears it immediately so a later refresh of this same page
// can't re-trigger the toast, and starts the show/fade/hide timers.
function armToastFromStorageOnce(key: ToastKey) {
    const toast = toasts[key]
    if (toast.armedForThisLoad) return
    toast.armedForThisLoad = true
    if (typeof window === "undefined") return
    const flag = window.sessionStorage.getItem(STORAGE_TOAST_FLAG_KEYS[key])
    if (flag !== "1") return
    window.sessionStorage.removeItem(STORAGE_TOAST_FLAG_KEYS[key])
    const generation = ++toast.generation
    setToastPhase(key, "visible")
    window.setTimeout(() => {
        if (generation === toast.generation) setToastPhase(key, "fading")
    }, VISIBLE_MS)
    window.setTimeout(() => {
        if (generation === toast.generation) setToastPhase(key, "hidden")
    }, VISIBLE_MS + FADE_MS)
}

function dismissToast(key: ToastKey) {
    const toast = toasts[key]
    if (toast.phase !== "visible") return
    const generation = ++toast.generation
    setToastPhase(key, "fading")
    window.setTimeout(() => {
        if (generation === toast.generation) setToastPhase(key, "hidden")
    }, FADE_MS)
}

// The toast frame's inner component, shared by withTravelNoticeToast and
// withCardAlertsToast.
function renderToast(
    Component: ComponentType<any>,
    key: ToastKey
): ComponentType<any> {
    return function CardControlsToast(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

        React.useEffect(() => {
            if (isCanvas) return
            // Subscribe BEFORE arming. armToastFromStorageOnce() can call
            // setToastPhase(key, "visible") synchronously, which notifies
            // every listener in toastListeners right then — if this
            // component's forceUpdate weren't registered yet, it would
            // miss that one notification and never re-render for the
            // "visible" phase, staying stuck at its initial (opacity 0)
            // render until the later "fading"/"hidden" timers force a
            // re-render, by which point the phase has already moved past
            // "visible" and the toast never actually became opaque at any
            // render this component made.
            const unsubscribe = subscribeToast(forceUpdate)
            armToastFromStorageOnce(key)
            return unsubscribe
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        const phase = toasts[key].phase
        const visible = phase !== "hidden"

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: phase === "visible" ? 1 : 0,
                    pointerEvents: phase === "visible" ? "auto" : "none",
                    transition: `opacity ${FADE_MS}ms ease`,
                    display: visible ? props.style?.display : "none",
                }}
            />
        )
    }
}

// The × button's inner component, shared by both Dismiss exports.
function renderToastDismiss(
    Component: ComponentType<any>,
    key: ToastKey
): ComponentType<any> {
    return function CardControlsToastDismiss(props: any) {
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
                    dismissToast(key)
                }}
            />
        )
    }
}

export function withTravelNoticeToast(Component: ComponentType<any>) {
    return renderToast(Component, "travelNotice")
}

export function withTravelNoticeToastDismiss(Component: ComponentType<any>) {
    return renderToastDismiss(Component, "travelNotice")
}

export function withCardAlertsToast(Component: ComponentType<any>) {
    return renderToast(Component, "cardAlerts")
}

export function withCardAlertsToastDismiss(Component: ComponentType<any>) {
    return renderToastDismiss(Component, "cardAlerts")
}
