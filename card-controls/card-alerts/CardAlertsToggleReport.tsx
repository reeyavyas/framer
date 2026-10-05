import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * CardAlertsToggleReport
 *
 * A set of near-identical Code Overrides — one per alert toggle layer
 * on the Set Card Alerts page (Spending alerts, Transportation,
 * Household, Other merchant, ...). Apply a DIFFERENT numbered export
 * to each toggle layer — it doesn't matter which number lands on which
 * toggle, just never reuse the same number on two different toggles.
 *
 * Each numbered export owns a private on/off flag (its own slot,
 * indexed by its number, in one module-level array), rather than keying a shared lookup off the
 * layer's own name or any other DOM detail. That earlier, name-keyed
 * approach broke in two ways in practice: two toggle instances that
 * happen to share a `data-framer-name` collide on the same entry (Save
 * re-disabling when a second toggle was switched on), and a toggle
 * whose Off/On visuals are separate named sub-layers can report a
 * different key on the way off than it did on the way on, leaving a
 * stale `true` behind forever (Save never re-disabling after an
 * on-then-off). A private flag per toggle can't collide or go stale
 * that way — it only ever flips on ITS OWN tap.
 *
 * Every numbered export is its own plain top-level `function`, not a
 * `const` assigned from a shared factory's return value — an earlier
 * version generated all of them from one `makeToggleReporter()`
 * factory, and every one silently disappeared from Framer's Code
 * Override picker, which only lists exports shaped exactly like
 * `function name(Component) {...}` at the top level of the file (it
 * doesn't evaluate the file to see what a factory call resolves to).
 * The actual tap-handling logic still lives in one place —
 * handleToggleTap below, wrapped by the shared toggleReporter() — each
 * export's body is one line that just supplies its own number.
 *
 * There are 20 of these, matching this app's own category list exactly
 * (no spares) — add more the same way if a category gets added later.
 *
 * Every tap flips that toggle's own flag; CardAlertsSave.tsx reads
 * `anyToggleOn()` (true whenever any flag is on) to decide whether
 * Save is enabled, and re-renders via `subscribeToggles()` on every
 * tap.
 *
 * On the canvas this is inert — same convention as the rest of this
 * project's overrides.
 */

// Each toggle's own on/off flag, indexed by its export's number.
const isOn: boolean[] = []
const toggleListeners = new Set<() => void>()

function notifyToggleListeners() {
    toggleListeners.forEach((fn) => fn())
}

export function anyToggleOn(): boolean {
    return isOn.some(Boolean)
}

export function subscribeToggles(onChange: () => void): () => void {
    toggleListeners.add(onChange)
    return () => {
        toggleListeners.delete(onChange)
    }
}

// Clears every toggle's flag. CardAlertsSave.tsx's
// base-page Save calls this when the Set Card Alerts page mounts. These
// flags are module-level, and Framer's client-side routing keeps this
// module alive across page navigations, but the native switches
// themselves remount showing Off. Without a reset, leaving the page
// without saving (e.g. Cancel/back) and coming back left the flags from
// the last visit behind: Save enabled with every switch showing Off, and
// the next tap on a switch that had been on moving its flag to false
// while the switch showed On (Save disabled with a toggle visibly on).
export function resetToggles(): void {
    isOn.length = 0
    notifyToggleListeners()
}

// Shared tap handling for every numbered export below.
function handleToggleTap(props: any, e: React.MouseEvent, n: number) {
    props.onClick?.(e)
    isOn[n] = !isOn[n]
    notifyToggleListeners()
}

// Builds the inner component for toggle number `n`. Called from inside
// each literal top-level export below, never assigned to an export
// directly (see header comment for why).
function toggleReporter(
    Component: ComponentType<any>,
    n: number
): ComponentType<any> {
    return function CardAlertsToggleReport(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(props, e, n)
                }
            />
        )
    }
}

// Apply a different one of these to each of the app's 20 toggle layers.

export function withCardAlertsToggleReport1(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 1)
}

export function withCardAlertsToggleReport2(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 2)
}

export function withCardAlertsToggleReport3(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 3)
}

export function withCardAlertsToggleReport4(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 4)
}

export function withCardAlertsToggleReport5(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 5)
}

export function withCardAlertsToggleReport6(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 6)
}

export function withCardAlertsToggleReport7(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 7)
}

export function withCardAlertsToggleReport8(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 8)
}

export function withCardAlertsToggleReport9(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 9)
}

export function withCardAlertsToggleReport10(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 10)
}

export function withCardAlertsToggleReport11(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 11)
}

export function withCardAlertsToggleReport12(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 12)
}

export function withCardAlertsToggleReport13(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 13)
}

export function withCardAlertsToggleReport14(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 14)
}

export function withCardAlertsToggleReport15(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 15)
}

export function withCardAlertsToggleReport16(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 16)
}

export function withCardAlertsToggleReport17(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 17)
}

export function withCardAlertsToggleReport18(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 18)
}

export function withCardAlertsToggleReport19(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 19)
}

export function withCardAlertsToggleReport20(
    Component: ComponentType<any>
): ComponentType<any> {
    return toggleReporter(Component, 20)
}
