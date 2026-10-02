import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * AccountPreferencesEditMode
 *
 * Edit mode and the "Saving Changes..." / "Changes Saved" overlay for
 * the Account Preferences page. AccountPreferencesList.tsx reads edit
 * mode from here and calls startSaveOverlay() after every drop and
 * every eye tap.
 *
 * Code Overrides (right panel -> Code -> Override -> this file):
 *
 *  - withAccountPrefsHeader — apply to the header COMPONENT instance.
 *    Build the header natively with two variants named exactly
 *    HEADER_VIEW_VARIANT ("View": back arrow + "Edit") and
 *    HEADER_EDIT_VARIANT ("Editing": no arrow, "Done"). This override
 *    only picks which variant shows; it adds no taps. Keep the back
 *    arrow's own native Link.
 *
 *  - withAccountPrefsEditToggle — apply to an empty frame (no fill, no
 *    Link) placed on top of the "Edit"/"Done" word, on the page rather
 *    than inside the header, so the back arrow's Link stays its own.
 *    Tapping it switches edit mode on/off. (It can instead go on the
 *    Edit/Done text layer inside the header component — either works.)
 *
 *  - withAccountPrefsSavingOverlay — apply to the overlay COMPONENT
 *    instance: a full-screen frame (dim fill + the bottom bar) with two
 *    variants named exactly OVERLAY_SAVING_VARIANT ("Saving": spinner +
 *    "Saving Changes...", spin as a native looping rotation) and
 *    OVERLAY_SAVED_VARIANT ("Saved": "Changes Saved"). Hidden until a
 *    save; then Saving for SAVING_MS, Saved for SAVED_MS, then fades out
 *    over FADE_MS. While Saving/Saved show it catches every tap, so
 *    nothing can be dragged or toggled mid-save; while it's hidden or
 *    fading, taps pass through it (and through the instance's
 *    wrapper). Place it above everything on the page (tab bar
 *    included), matching the reference screenshots.
 *
 *  - withAccountPrefsHideWhileEditing — apply to anything that should
 *    disappear in edit mode, e.g. the "No External Accounts" card.
 *
 * Edit mode after a save: stays on. The user keeps reordering, then
 * taps Done to go back to view mode — same as the reference app.
 *
 * Module memory, like AccountOrder.tsx. The page always opens in view
 * mode: AccountPreferencesList resets edit mode and the overlay when it
 * mounts and when it unmounts (e.g. the user tapped a tab mid-edit —
 * every drop already saved, so nothing is lost). Every subscriber
 * re-reads the state right after subscribing, so one that renders
 * before that reset still corrects itself.
 *
 * On the canvas all four overrides are inert.
 */

// Edit these directly.
const SAVING_MS = 1000
const SAVED_MS = 1000
const FADE_MS = 250

// Must match the variant names on the canvas exactly.
const HEADER_VIEW_VARIANT = "View"
const HEADER_EDIT_VARIANT = "Editing"
const OVERLAY_SAVING_VARIANT = "Saving"
const OVERLAY_SAVED_VARIANT = "Saved"

type SavePhase = "hidden" | "saving" | "saved" | "fading"

let editing = false
let savePhase: SavePhase = "hidden"
let saveGeneration = 0
const listeners = new Set<() => void>()

function notify() {
    listeners.forEach((fn) => fn())
}

export function isEditing(): boolean {
    return editing
}

export function getSavePhase(): SavePhase {
    return savePhase
}

export function isSaving(): boolean {
    return savePhase !== "hidden"
}

export function subscribeEditMode(onChange: () => void): () => void {
    listeners.add(onChange)
    return () => {
        listeners.delete(onChange)
    }
}

export function resetEditMode() {
    // Also invalidates any timer from an overlay interrupted mid-save.
    saveGeneration++
    editing = false
    savePhase = "hidden"
    notify()
}

// No isSaving() guard: while the overlay is up it catches the tap
// itself. A guard here silently dropped Done for the whole 2.25s after
// every change, which looked like a missed tap — always, if the
// overlay layer was hidden on the canvas, and during the fade-out when
// it wasn't.
function toggleEditing() {
    editing = !editing
    notify()
}

// Hides the overlay at once, wherever it is in Saving → Saved → fade,
// and stops its remaining timers. Used by the tutorial list's Skip.
export function cancelSaveOverlay() {
    saveGeneration++
    savePhase = "hidden"
    notify()
}

export function startSaveOverlay() {
    const generation = ++saveGeneration
    savePhase = "saving"
    notify()
    window.setTimeout(() => {
        if (generation !== saveGeneration) return
        savePhase = "saved"
        notify()
    }, SAVING_MS)
    window.setTimeout(() => {
        if (generation !== saveGeneration) return
        savePhase = "fading"
        notify()
    }, SAVING_MS + SAVED_MS)
    window.setTimeout(() => {
        if (generation !== saveGeneration) return
        savePhase = "hidden"
        notify()
    }, SAVING_MS + SAVED_MS + FADE_MS)
}

// Re-renders the caller on every edit-mode/overlay change.
export function useEditModeUpdates(enabled: boolean = true) {
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
    React.useEffect(() => {
        if (!enabled) return
        const unsubscribe = subscribeEditMode(forceUpdate)
        forceUpdate()
        return unsubscribe
    }, [enabled])
}

export function withAccountPrefsHeader(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountPrefsHeader(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        useEditModeUpdates(!isCanvas)
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                variant={editing ? HEADER_EDIT_VARIANT : HEADER_VIEW_VARIANT}
            />
        )
    }
}

export function withAccountPrefsEditToggle(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountPrefsEditToggle(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={(e: React.MouseEvent) => {
                    props.onClick?.(e)
                    toggleEditing()
                }}
            />
        )
    }
}

export function withAccountPrefsSavingOverlay(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountPrefsSavingOverlay(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        useEditModeUpdates(!isCanvas)

        // Framer draws a component instance inside its own wrapper div,
        // sized like the instance (here, full screen), and the override
        // only reaches the component inside it. Hiding the component
        // leaves that empty wrapper over the page, and it still catches
        // every tap. So the wrapper is made click-through, and the
        // component turns taps back on only while it's blocking.
        // The marker span finds the wrapper: it renders next to the
        // component, so its parent is the wrapper.
        const markerRef = React.useRef<HTMLSpanElement>(null)
        React.useEffect(() => {
            if (isCanvas) return
            const marker = markerRef.current
            const wrapper = marker?.parentElement
            if (!marker || !wrapper) return
            // Only a wrapper that holds just this overlay. If the
            // override sits on a plain frame instead, the parent is a
            // real layer with other children, and those must keep
            // their taps (pointer-events is inherited).
            const others = Array.from(wrapper.children).filter(
                (el) => el !== marker
            )
            if (others.length !== 1) return
            const previous = wrapper.style.pointerEvents
            wrapper.style.pointerEvents = "none"
            return () => {
                wrapper.style.pointerEvents = previous
            }
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        // Taps go through while fading out, so a quick tap on Done
        // right after "Changes Saved" isn't swallowed.
        const blocking = savePhase === "saving" || savePhase === "saved"

        return (
            <>
                <span ref={markerRef} style={{ display: "none" }} />
                <Component
                    {...props}
                    variant={
                        savePhase === "saving"
                            ? OVERLAY_SAVING_VARIANT
                            : OVERLAY_SAVED_VARIANT
                    }
                    style={{
                        ...props.style,
                        opacity: savePhase === "fading" ? 0 : 1,
                        transition: `opacity ${FADE_MS}ms ease`,
                        pointerEvents: blocking ? "auto" : "none",
                        display:
                            savePhase === "hidden" ? "none" : props.style?.display,
                    }}
                />
            </>
        )
    }
}

export function withAccountPrefsHideWhileEditing(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountPrefsHideWhileEditing(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        useEditModeUpdates(!isCanvas)
        if (isCanvas || !editing) return <Component {...props} />

        return <Component {...props} style={{ ...props.style, display: "none" }} />
    }
}
