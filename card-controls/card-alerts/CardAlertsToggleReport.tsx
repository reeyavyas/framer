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
 * Each numbered export owns a private on/off flag in its own closure,
 * rather than keying a shared lookup off the layer's own name or any
 * other DOM detail. That earlier, name-keyed approach broke in two
 * ways in practice: two toggle instances that happen to share a
 * `data-framer-name` collide on the same entry (Save re-disabling when
 * a second toggle was switched on), and a toggle whose Off/On visuals
 * are separate named sub-layers can report a different key on the way
 * off than it did on the way on, leaving a stale `true` behind forever
 * (Save never re-disabling after an on-then-off). A private closure
 * per toggle can't collide or go stale that way — it only ever flips
 * on ITS OWN tap.
 *
 * Every tap flips that toggle's own flag and adjusts one shared
 * on-count by ±1; CardAlertsSave.tsx reads `anyToggleOn()` (true
 * whenever that count is above zero) to decide whether Save is
 * enabled, and re-renders via `subscribeToggles()` whenever the count
 * changes.
 *
 * On the canvas this is inert — same convention as the rest of this
 * project's overrides.
 */

let onCount = 0
const toggleListeners = new Set<() => void>()

function notifyToggleListeners() {
    toggleListeners.forEach((fn) => fn())
}

export function anyToggleOn(): boolean {
    return onCount > 0
}

export function subscribeToggles(onChange: () => void): () => void {
    toggleListeners.add(onChange)
    return () => {
        toggleListeners.delete(onChange)
    }
}

// Factory so every numbered export below gets its own private `isOn`
// closure instead of sharing one.
function makeToggleReporter(): (
    Component: ComponentType<any>
) => ComponentType<any> {
    let isOn = false
    return function withToggle(Component: ComponentType<any>) {
        return function CardAlertsToggleReport(props: any) {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            if (isCanvas) return <Component {...props} />

            return (
                <Component
                    {...props}
                    onClick={(e: React.MouseEvent) => {
                        props.onClick?.(e)
                        isOn = !isOn
                        onCount += isOn ? 1 : -1
                        notifyToggleListeners()
                    }}
                />
            )
        }
    }
}

// Apply a different one of these to each toggle layer. 24 is more than
// the reference app's own category list needs — extras just go unused.
export const withCardAlertsToggleReport1 = makeToggleReporter()
export const withCardAlertsToggleReport2 = makeToggleReporter()
export const withCardAlertsToggleReport3 = makeToggleReporter()
export const withCardAlertsToggleReport4 = makeToggleReporter()
export const withCardAlertsToggleReport5 = makeToggleReporter()
export const withCardAlertsToggleReport6 = makeToggleReporter()
export const withCardAlertsToggleReport7 = makeToggleReporter()
export const withCardAlertsToggleReport8 = makeToggleReporter()
export const withCardAlertsToggleReport9 = makeToggleReporter()
export const withCardAlertsToggleReport10 = makeToggleReporter()
export const withCardAlertsToggleReport11 = makeToggleReporter()
export const withCardAlertsToggleReport12 = makeToggleReporter()
export const withCardAlertsToggleReport13 = makeToggleReporter()
export const withCardAlertsToggleReport14 = makeToggleReporter()
export const withCardAlertsToggleReport15 = makeToggleReporter()
export const withCardAlertsToggleReport16 = makeToggleReporter()
export const withCardAlertsToggleReport17 = makeToggleReporter()
export const withCardAlertsToggleReport18 = makeToggleReporter()
export const withCardAlertsToggleReport19 = makeToggleReporter()
export const withCardAlertsToggleReport20 = makeToggleReporter()
export const withCardAlertsToggleReport21 = makeToggleReporter()
export const withCardAlertsToggleReport22 = makeToggleReporter()
export const withCardAlertsToggleReport23 = makeToggleReporter()
export const withCardAlertsToggleReport24 = makeToggleReporter()
