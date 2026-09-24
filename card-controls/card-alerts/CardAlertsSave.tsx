import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
import {
    anyToggleOn,
    resetToggles,
    subscribeToggles,
} from "./CardAlertsToggleReport.tsx"

/**
 * CardAlertsSave
 *
 * Code Overrides for the Set Card Alerts page's Save button and its
 * "Saving..." overlay (right panel -> Code -> Override -> this file):
 *
 *  - withCardAlertsSave / withCardAlertsSaveTutorial — apply one of
 *    these to a Save button's own frame, depending on which Set Card
 *    Alerts page it's on. withCardAlertsSave (base page, navigates to
 *    CARD_CONTROLS_LINK) reads CardAlertsToggleReport's shared on-count
 *    (is any toggle on?) to switch between enabled/disabled visuals,
 *    the same isValid-driven styling SetTravelNotice.tsx uses for its
 *    own Save link — real validation, since the base page's toggles
 *    really do call into that shared on-count via
 *    withCardAlertsToggleReportN. withCardAlertsSaveTutorial (tutorial
 *    page, navigates to CARD_CONTROLS_TUTORIAL_LINK) is NOT a thin
 *    wrapper around the same body: the tutorial page's 3 tappable
 *    toggles deliberately don't use withCardAlertsToggleReportN (see
 *    tutorials/card-controls-tutorial/NOTES.md, "Card Alerts flow"),
 *    so anyToggleOn() can never go true there — gating on it would
 *    leave Save permanently muted. It renders unconditionally enabled
 *    instead, same reasoning as SetTravelNoticeTutorial.tsx's frozen
 *    Save: nothing real to validate on a walkthrough step. Both are
 *    plain top-level `function` exports rather than a factory-produced
 *    `const` — Framer's Code Override picker only lists exports shaped
 *    exactly like `function name(Component) {...}` at the top level of
 *    the file; a `const` assigned from a factory call's return value
 *    (what an earlier version of this file did) doesn't get recognized
 *    and silently disappears from the dropdown. Tapping either while
 *    enabled shows the Saving overlay, waits SAVE_DELAY_MS (edit the
 *    constant directly — same convention as TravelNoticeToast.tsx's
 *    VISIBLE_MS/FADE_MS), sets the one-shot toast flag, then navigates
 *    to its own destination. Tapping withCardAlertsSave while disabled
 *    does nothing.
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
 *  - withCardAlertsScrollContainer — apply to the BASE page's own
 *    "Scrollable Content" frame (the real native-scrolling container
 *    holding the toggles list — not tagged with any
 *    data-tutorial-target, that system is tutorial-only). Just captures
 *    a ref to it in module-level state so scrollCardAlertsToTop() below
 *    has something to call scrollTo() on. Don't apply this on the
 *    tutorial-duplicate page — its Scrollable Content frame should
 *    instead carry VirtualScroll.tsx's VirtualScrollCardAlertsContent
 *    (it already needs that override for the toggle step's lock/freeze
 *    behavior), which scrollCardAlertsToTop() checks for FIRST via
 *    window.__getVirtualScroll (see that function — NOT a static
 *    import of VirtualScroll.tsx, an earlier version of this file tried
 *    that and it silently broke every override in THIS file's picker,
 *    not just the one that used it): native scrollTo() does nothing on
 *    a VirtualScroll container since it disables real overflow
 *    scrolling entirely and owns position via its own transform
 *    instead.
 *
 * On the canvas all overrides are inert.
 */

const STORAGE_TOAST_FLAG_KEY = "kioskCardAlertsToastFlag"

// The base Card Controls page's real published path.
const CARD_CONTROLS_LINK = "/base-pages/card-controls"

// The tutorial-overlay duplicate of Card Controls' real published path.
const CARD_CONTROLS_TUTORIAL_LINK = "/card-controls-tutorial/card-controls-3"

// Edit this value directly to change how long the spinner shows before
// navigating away.
const SAVE_DELAY_MS = 900

const ENABLED_BACKGROUND = "#1f4fa8"
const ENABLED_TEXT = "#ffffff"
const DISABLED_BACKGROUND = "#d7dade"
const DISABLED_TEXT = "#9aa0a6"

let scrollContainerEl: HTMLElement | null = null

// Matches VirtualScrollCardAlertsContent's own id in VirtualScroll.tsx —
// present only on the tutorial-duplicate page's Scrollable Content frame.
const VIRTUAL_SCROLL_ID = "card-alerts-scroll"

function scrollCardAlertsToTop() {
    // The tutorial page's Scrollable Content frame is a VirtualScroll
    // container: check for it first, since native scrollTo() below does
    // nothing there (VirtualScroll disables real overflow scrolling and
    // owns position via its own transform instead). Reached via
    // window, not a static import of VirtualScroll.tsx — a cross-folder
    // import (this file lives under card-controls/, VirtualScroll.tsx
    // under tutorials/tutorial-overlays/) doesn't reliably resolve
    // against Framer's actual project file tree, and when it fails it
    // silently breaks discovery of EVERY export in this file, not just
    // this function. window.__getVirtualScroll is only defined once
    // VirtualScroll.tsx has actually loaded (i.e. some layer on the
    // current page uses one of its exports) — undefined on the base
    // page, where nothing does, so this falls through to the native ref.
    const virtual = (window as any).__getVirtualScroll?.(VIRTUAL_SCROLL_ID)
    if (virtual) {
        virtual.scrollToTop()
        return
    }
    scrollContainerEl?.scrollTo({ top: 0, behavior: "smooth" })
}

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
            // Fresh visit to the page: every switch has just remounted
            // showing Off, so start the flags there too (see
            // resetToggles in CardAlertsToggleReport.tsx). Subscribe
            // first: this button already rendered with the stale flags,
            // and resetting before subscribing left it enabled.
            const unsubscribe = subscribeToggles(forceUpdate)
            resetToggles()
            return unsubscribe
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
                    // Starts the moment the overlay appears, not after —
                    // SAVE_DELAY_MS below is the only pause before
                    // navigating, so the scroll needs its full length of
                    // that delay to visually finish before the page
                    // unloads out from under it.
                    scrollCardAlertsToTop()
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

// NOT renderCardAlertsSave — that body gates `enabled` on anyToggleOn(),
// which only ever changes inside handleToggleTap, called exclusively by
// the 20 numbered withCardAlertsToggleReportN overrides. The tutorial
// page's 3 tappable toggles deliberately have that override removed and
// replaced with TutorialTargets.tsx's CardAlertsToggleTarget1/2/3 (see
// tutorials/card-controls-tutorial/NOTES.md, "Card Alerts flow") so
// tapping them doesn't contaminate the real page's shared on-count —
// but that also means they never touch onCount at all, so anyToggleOn()
// can never go true here and Save stayed muted forever, regardless of
// how many switches were tapped. This is a frozen walkthrough step, the
// same reasoning SetTravelNoticeTutorial.tsx's Save already used: no
// real "is anything on?" state to validate, so just render enabled.
export function withCardAlertsSaveTutorial(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsSaveTutorial(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    background: ENABLED_BACKGROUND,
                    color: ENABLED_TEXT,
                    cursor: "pointer",
                }}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault()
                    setSavingOverlayVisible(true)
                    scrollCardAlertsToTop()
                    window.setTimeout(() => {
                        window.sessionStorage.setItem(
                            STORAGE_TOAST_FLAG_KEY,
                            "1"
                        )
                        window.location.href = CARD_CONTROLS_TUTORIAL_LINK
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
        // Local state, not a direct read of the module-level
        // savingOverlayVisible flag — that flag only ever flips true
        // from a real Save tap, but nothing ever resets it back to
        // false on a fresh mount of THIS component, so it renders
        // whatever value happens to already be sitting in module state
        // at mount time. That's fine the first time a page's JS
        // evaluates from scratch (a hard navigation always starts it
        // at its `let ... = false` default), but Framer's internal
        // client-side routing between pages can keep this module alive
        // across a soft navigation, so a flag left true by an earlier
        // Save tap (on this page or a shared instance of this same
        // override elsewhere) was showing up as "already visible" the
        // instant this component next mounted, with no tap involved.
        // Starting local state at false unconditionally, then syncing
        // FROM the module flag only in response to real changes below,
        // means a mount can never inherit stale visibility.
        const [visible, setVisible] = React.useState(false)

        React.useEffect(() => {
            if (isCanvas) return
            savingOverlayVisible = false
            setVisible(false)
            function onChange() {
                setVisible(savingOverlayVisible)
            }
            savingOverlayListeners.add(onChange)
            return () => {
                savingOverlayListeners.delete(onChange)
            }
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: visible ? 1 : 0,
                    pointerEvents: visible ? "auto" : "none",
                    display: visible ? props.style?.display : "none",
                }}
            />
        )
    }
}

// Apply to the page's own "Scrollable Content" frame — the real native
// scroll container holding the toggles list. Just captures a ref so
// scrollCardAlertsToTop() above has something to call scrollTo() on;
// this page has no data-tutorial-target of its own to look it up by
// (that tagging system only exists on the tutorial-duplicate page).
export function withCardAlertsScrollContainer(
    Component: ComponentType<any>
): ComponentType<any> {
    return React.forwardRef(function CardAlertsScrollContainer(
        props: any,
        ref: any
    ) {
        return (
            <Component
                {...props}
                ref={(node: HTMLElement | null) => {
                    scrollContainerEl = node
                    if (typeof ref === "function") ref(node)
                    else if (ref) ref.current = node
                }}
            />
        )
    })
}
