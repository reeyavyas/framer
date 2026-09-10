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
 * Each numbered export owns a private on/off flag in its own
 * module-level `let`, rather than keying a shared lookup off the
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
 * version generated all 24 from one `makeToggleReporter()` factory,
 * and every one of them silently disappeared from Framer's Code
 * Override picker, which only lists exports shaped exactly like
 * `function name(Component) {...}` at the top level of the file (it
 * doesn't evaluate the file to see what a factory call resolves to).
 * The actual tap-handling logic still lives in one place —
 * handleToggleTap below — each export just supplies its own flag.
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

// Shared tap handling for every numbered export below.
function handleToggleTap(
    props: any,
    e: React.MouseEvent,
    getIsOn: () => boolean,
    setIsOn: (value: boolean) => void
) {
    props.onClick?.(e)
    const next = !getIsOn()
    setIsOn(next)
    onCount += next ? 1 : -1
    notifyToggleListeners()
}

// Apply a different one of these to each toggle layer. 24 is more than
// the reference app's own category list needs — extras just go unused.

let isOn1 = false
export function withCardAlertsToggleReport1(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport1(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn1,
                        (v) => (isOn1 = v)
                    )
                }
            />
        )
    }
}

let isOn2 = false
export function withCardAlertsToggleReport2(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport2(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn2,
                        (v) => (isOn2 = v)
                    )
                }
            />
        )
    }
}

let isOn3 = false
export function withCardAlertsToggleReport3(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport3(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn3,
                        (v) => (isOn3 = v)
                    )
                }
            />
        )
    }
}

let isOn4 = false
export function withCardAlertsToggleReport4(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport4(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn4,
                        (v) => (isOn4 = v)
                    )
                }
            />
        )
    }
}

let isOn5 = false
export function withCardAlertsToggleReport5(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport5(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn5,
                        (v) => (isOn5 = v)
                    )
                }
            />
        )
    }
}

let isOn6 = false
export function withCardAlertsToggleReport6(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport6(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn6,
                        (v) => (isOn6 = v)
                    )
                }
            />
        )
    }
}

let isOn7 = false
export function withCardAlertsToggleReport7(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport7(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn7,
                        (v) => (isOn7 = v)
                    )
                }
            />
        )
    }
}

let isOn8 = false
export function withCardAlertsToggleReport8(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport8(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn8,
                        (v) => (isOn8 = v)
                    )
                }
            />
        )
    }
}

let isOn9 = false
export function withCardAlertsToggleReport9(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport9(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn9,
                        (v) => (isOn9 = v)
                    )
                }
            />
        )
    }
}

let isOn10 = false
export function withCardAlertsToggleReport10(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport10(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn10,
                        (v) => (isOn10 = v)
                    )
                }
            />
        )
    }
}

let isOn11 = false
export function withCardAlertsToggleReport11(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport11(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn11,
                        (v) => (isOn11 = v)
                    )
                }
            />
        )
    }
}

let isOn12 = false
export function withCardAlertsToggleReport12(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport12(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn12,
                        (v) => (isOn12 = v)
                    )
                }
            />
        )
    }
}

let isOn13 = false
export function withCardAlertsToggleReport13(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport13(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn13,
                        (v) => (isOn13 = v)
                    )
                }
            />
        )
    }
}

let isOn14 = false
export function withCardAlertsToggleReport14(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport14(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn14,
                        (v) => (isOn14 = v)
                    )
                }
            />
        )
    }
}

let isOn15 = false
export function withCardAlertsToggleReport15(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport15(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn15,
                        (v) => (isOn15 = v)
                    )
                }
            />
        )
    }
}

let isOn16 = false
export function withCardAlertsToggleReport16(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport16(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn16,
                        (v) => (isOn16 = v)
                    )
                }
            />
        )
    }
}

let isOn17 = false
export function withCardAlertsToggleReport17(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport17(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn17,
                        (v) => (isOn17 = v)
                    )
                }
            />
        )
    }
}

let isOn18 = false
export function withCardAlertsToggleReport18(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport18(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn18,
                        (v) => (isOn18 = v)
                    )
                }
            />
        )
    }
}

let isOn19 = false
export function withCardAlertsToggleReport19(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport19(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn19,
                        (v) => (isOn19 = v)
                    )
                }
            />
        )
    }
}

let isOn20 = false
export function withCardAlertsToggleReport20(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport20(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn20,
                        (v) => (isOn20 = v)
                    )
                }
            />
        )
    }
}

let isOn21 = false
export function withCardAlertsToggleReport21(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport21(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn21,
                        (v) => (isOn21 = v)
                    )
                }
            />
        )
    }
}

let isOn22 = false
export function withCardAlertsToggleReport22(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport22(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn22,
                        (v) => (isOn22 = v)
                    )
                }
            />
        )
    }
}

let isOn23 = false
export function withCardAlertsToggleReport23(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport23(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn23,
                        (v) => (isOn23 = v)
                    )
                }
            />
        )
    }
}

let isOn24 = false
export function withCardAlertsToggleReport24(
    Component: ComponentType<any>
): ComponentType<any> {
    return function CardAlertsToggleReport24(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                onClick={(e: React.MouseEvent) =>
                    handleToggleTap(
                        props,
                        e,
                        () => isOn24,
                        (v) => (isOn24 = v)
                    )
                }
            />
        )
    }
}
