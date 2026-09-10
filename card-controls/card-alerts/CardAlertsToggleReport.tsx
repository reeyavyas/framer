import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * CardAlertsToggleReport
 *
 * One Code Override — apply it to every alert toggle layer on the Set
 * Card Alerts page (Spending alerts, Transportation, Household,
 * Other merchant, ...). Each tap flips that toggle's own on/off entry
 * in a shared module-level map, keyed by the layer's own name — Framer
 * stamps every named layer's root DOM node with `data-framer-name`, so
 * this one generic override can tell toggles apart without any
 * per-toggle code. Read via `e.currentTarget` (the node this override's
 * own onClick is bound to) rather than `e.target`, so a tap landing on
 * a nested child (the switch's track or knob) still reports the
 * toggle's own name, not a sub-layer's.
 *
 * CardAlertsSave.tsx reads `anyToggleOn()` / `subscribeToggles()` from
 * here to decide whether Save is enabled — same cross-file module-state
 * technique TravelNoticeToast.tsx uses for its own show/hide phase.
 *
 * On the canvas this is inert — same convention as the rest of this
 * project's overrides.
 */

const toggleOnState = new Map<string, boolean>()
const toggleListeners = new Set<() => void>()

function notifyToggleListeners() {
    toggleListeners.forEach((fn) => fn())
}

export function anyToggleOn(): boolean {
    for (const isOn of toggleOnState.values()) {
        if (isOn) return true
    }
    return false
}

export function subscribeToggles(onChange: () => void): () => void {
    toggleListeners.add(onChange)
    return () => {
        toggleListeners.delete(onChange)
    }
}

export function withCardAlertsToggleReport(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                    props.onClick?.(e)
                    const key = e.currentTarget.getAttribute("data-framer-name")
                    if (!key) return
                    toggleOnState.set(key, !toggleOnState.get(key))
                    notifyToggleListeners()
                }}
            />
        )
    }
}
