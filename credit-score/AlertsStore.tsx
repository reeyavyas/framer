import * as React from "react"
import type { ComponentType } from "react"

// Alerts page: "Mark all as read". A module-level flag in memory only, so
// it lasts while the visitor moves around the site and a refresh brings
// the NEW badges back for the next user. The filter lists don't change.

let read = false
const listeners = new Set<() => void>()

function subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}

const getRead = () => read

function markAllRead(): void {
    read = true
    listeners.forEach((fn) => fn())
}

// On the "Mark all as read" row.
export function withMarkAllRead(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props: any) => (
        <Component
            {...props}
            onClick={(e: React.MouseEvent) => {
                props.onClick?.(e)
                markAllRead()
            }}
            style={{ ...props.style, cursor: "pointer" }}
        />
    )
}

// On each NEW badge: hidden once everything is marked read. Overrides
// don't run on the canvas, so the badges stay visible there.
export function withAlertBadge(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props: any) =>
        React.useSyncExternalStore(subscribe, getRead, getRead) ? null : (
            <Component {...props} />
        )
}

// Card dates ("October 2026"), counted back from today so the feed never
// goes stale. Re-read just after each midnight so a kiosk left open rolls
// over on its own. Hidden until mounted so the server-rendered date can't
// flash; overrides don't run on the canvas, which keeps the typed dates.
function monthLabel(monthsAgo: number, now: Date): string {
    return new Date(
        now.getFullYear(),
        now.getMonth() - monthsAgo,
        1
    ).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function withMonthsAgo(
    Component: ComponentType<any>,
    monthsAgo: number
): ComponentType<any> {
    return (props: any) => {
        const [label, setLabel] = React.useState<string>()
        React.useEffect(() => {
            let timer: number
            const tick = () => {
                const now = new Date()
                setLabel(monthLabel(monthsAgo, now))
                const midnight = new Date(now)
                midnight.setHours(24, 0, 1, 0)
                timer = window.setTimeout(
                    tick,
                    midnight.getTime() - now.getTime()
                )
            }
            tick()
            return () => window.clearTimeout(timer)
        }, [])
        return (
            <Component
                {...props}
                text={label ?? props.text}
                style={{
                    ...props.style,
                    visibility: label ? props.style?.visibility : "hidden",
                }}
            />
        )
    }
}

// On each credit update card's date.
export function withThisMonth(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonthsAgo(Component, 0)
}

// On "Alert Monitoring 1"'s date.
export function withTwoMonthsAgo(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonthsAgo(Component, 2)
}

// On "Alert Monitoring 2"'s date.
export function withNineteenMonthsAgo(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonthsAgo(Component, 19)
}
