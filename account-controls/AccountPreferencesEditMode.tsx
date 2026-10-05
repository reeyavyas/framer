import * as React from "react"
import type { ComponentType } from "react"
import { ControlType, RenderTarget, type PropertyControls } from "framer"

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
    editing = false
    // Also invalidates any timer from an overlay interrupted mid-save.
    cancelSaveOverlay()
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
    // Each phase starts when the previous one's time is up.
    const phases = [
        ["saved", SAVING_MS],
        ["fading", SAVED_MS],
        ["hidden", FADE_MS],
    ] as const
    let at = 0
    for (const [phase, ms] of phases) {
        at += ms
        window.setTimeout(() => {
            if (generation !== saveGeneration) return
            savePhase = phase
            notify()
        }, at)
    }
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

// ─── Shared by AccountPreferencesList and its tutorial copy ──────────
// They live here because the tutorial copy only imports from this file
// and AccountOrder.tsx (see AccountPreferencesListTutorial.tsx's
// header). Both lists' property controls and defaults; the tutorial
// adds its own on top.

export function EyeIcon({
    size,
    color,
    off,
    image,
}: {
    size: number
    color: string
    off: boolean
    image?: { src: string; srcSet?: string; alt?: string }
}) {
    // A custom icon from the "Eye icon" / "Eye off icon" controls, if set.
    // It's drawn as-is at Eye size, so "Icons" color doesn't apply to it.
    if (image?.src) {
        return (
            <img
                src={image.src}
                srcSet={image.srcSet}
                alt={image.alt ?? ""}
                draggable={false}
                style={{ width: size, height: size, objectFit: "contain", display: "block" }}
            />
        )
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"
                stroke={color}
                strokeWidth={1.8}
                strokeLinejoin="round"
            />
            <circle cx={12} cy={12} r={3.4} fill={color} />
            {off && (
                <line
                    x1={3}
                    y1={3}
                    x2={21}
                    y2={21}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                />
            )}
        </svg>
    )
}

export function HandleIcon({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <rect x={3} y={6} width={18} height={2} rx={1} fill={color} />
            <rect x={3} y={11} width={18} height={2} rx={1} fill={color} />
            <rect x={3} y={16} width={18} height={2} rx={1} fill={color} />
        </svg>
    )
}

export const ACCOUNT_LIST_DEFAULTS = {
    accounts: [
        { accountId: "7500", name: "Platinum Rewards Checking" },
        { accountId: "8665", name: "Vertical Checking" },
        { accountId: "5101", name: "Regular Shares" },
        { accountId: "5007", name: "Freddie Mac" },
    ],
    canvasPreview: "view" as "view" | "edit",
    numberPrefix: "#",

    viewBackground: "#FFFFFF",
    editBackground: "#F4F5F7",
    dividerColor: "#DCDEE2",
    dividerWidth: 2,
    textColor: "#333333",
    labelColor: "#444444",
    fieldBorderColor: "#7A7A7A",
    fieldBackground: "rgba(255,255,255,0)",
    iconColor: "#6B6B6B",
    hiddenOpacity: 0.5,

    nameFont: { fontSize: 30 },
    labelFont: { fontSize: 20 },
    fieldFont: { fontSize: 28 },

    paddingX: 40,
    viewPaddingY: 28,
    editPaddingY: 20,
    gap: 24,
    iconSize: 44,
    handleSize: 40,
    handleHitPaddingX: 16,
    handleHitPaddingY: 20,
    fieldHeight: 64,
    fieldRadius: 2,
    fieldPaddingX: 16,
    labelGap: 8,
}

export const ACCOUNT_LIST_CONTROLS: PropertyControls = {
    accounts: {
        type: ControlType.Array,
        title: "Accounts",
        control: {
            type: ControlType.Object,
            controls: {
                accountId: { type: ControlType.String, title: "Last 4 (id)" },
                name: { type: ControlType.String, title: "Name" },
            },
        },
        defaultValue: ACCOUNT_LIST_DEFAULTS.accounts,
    },
    canvasPreview: {
        type: ControlType.Enum,
        title: "Canvas preview",
        options: ["view", "edit"],
        optionTitles: ["View", "Edit"],
        defaultValue: "view",
        displaySegmentedControl: true,
    },
    numberPrefix: {
        type: ControlType.String,
        title: "Number prefix",
        defaultValue: "#",
    },

    viewBackground: { type: ControlType.Color, title: "View row fill", defaultValue: ACCOUNT_LIST_DEFAULTS.viewBackground },
    editBackground: { type: ControlType.Color, title: "Edit row fill", defaultValue: ACCOUNT_LIST_DEFAULTS.editBackground },
    dividerColor: { type: ControlType.Color, title: "Divider", defaultValue: ACCOUNT_LIST_DEFAULTS.dividerColor },
    dividerWidth: { type: ControlType.Number, title: "Divider width", min: 0, max: 8, defaultValue: ACCOUNT_LIST_DEFAULTS.dividerWidth },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: ACCOUNT_LIST_DEFAULTS.textColor },
    labelColor: { type: ControlType.Color, title: "Label", defaultValue: ACCOUNT_LIST_DEFAULTS.labelColor },
    fieldBorderColor: { type: ControlType.Color, title: "Field border", defaultValue: ACCOUNT_LIST_DEFAULTS.fieldBorderColor },
    fieldBackground: { type: ControlType.Color, title: "Field fill", defaultValue: ACCOUNT_LIST_DEFAULTS.fieldBackground },
    iconColor: { type: ControlType.Color, title: "Icons", defaultValue: ACCOUNT_LIST_DEFAULTS.iconColor },
    eyeImage: {
        type: ControlType.ResponsiveImage,
        title: "Eye icon",
        description: "Shown account. Blank = built-in eye.",
    },
    eyeOffImage: {
        type: ControlType.ResponsiveImage,
        title: "Eye off icon",
        description: "Hidden account. Blank = built-in crossed eye.",
    },
    hiddenOpacity: { type: ControlType.Number, title: "Hidden opacity", min: 0, max: 1, step: 0.05, defaultValue: ACCOUNT_LIST_DEFAULTS.hiddenOpacity },

    nameFont: {
        type: ControlType.Font,
        title: "Name font (view)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30 },
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label font (edit)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 20 },
    },
    fieldFont: {
        type: ControlType.Font,
        title: "Field font (edit)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28 },
    },

    paddingX: { type: ControlType.Number, title: "Side padding", min: 0, max: 120, defaultValue: ACCOUNT_LIST_DEFAULTS.paddingX },
    viewPaddingY: { type: ControlType.Number, title: "View row padding", min: 0, max: 80, defaultValue: ACCOUNT_LIST_DEFAULTS.viewPaddingY },
    editPaddingY: { type: ControlType.Number, title: "Edit row padding", min: 0, max: 80, defaultValue: ACCOUNT_LIST_DEFAULTS.editPaddingY },
    gap: { type: ControlType.Number, title: "Icon gap", min: 0, max: 80, defaultValue: ACCOUNT_LIST_DEFAULTS.gap },
    iconSize: { type: ControlType.Number, title: "Eye size", min: 12, max: 100, defaultValue: ACCOUNT_LIST_DEFAULTS.iconSize },
    handleSize: { type: ControlType.Number, title: "Handle size", min: 12, max: 100, defaultValue: ACCOUNT_LIST_DEFAULTS.handleSize },
    handleHitPaddingX: { type: ControlType.Number, title: "Handle tap width", min: 0, max: 40, defaultValue: ACCOUNT_LIST_DEFAULTS.handleHitPaddingX },
    handleHitPaddingY: { type: ControlType.Number, title: "Handle tap height", min: 0, max: 80, defaultValue: ACCOUNT_LIST_DEFAULTS.handleHitPaddingY },
    fieldHeight: { type: ControlType.Number, title: "Field height", min: 20, max: 160, defaultValue: ACCOUNT_LIST_DEFAULTS.fieldHeight },
    fieldRadius: { type: ControlType.Number, title: "Field radius", min: 0, max: 40, defaultValue: ACCOUNT_LIST_DEFAULTS.fieldRadius },
    fieldPaddingX: { type: ControlType.Number, title: "Field padding", min: 0, max: 60, defaultValue: ACCOUNT_LIST_DEFAULTS.fieldPaddingX },
    labelGap: { type: ControlType.Number, title: "Label gap", min: 0, max: 40, defaultValue: ACCOUNT_LIST_DEFAULTS.labelGap },
}
