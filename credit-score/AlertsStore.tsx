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

// Set by each monitoring alert card, so the date layer inside the shared
// Monitoring Alert component knows how far back its card is.
const CardMonthsAgo = React.createContext(0)

function withMonthsAgo(
    Component: ComponentType<any>,
    fixed?: number
): ComponentType<any> {
    return (props: any) => {
        const fromCard = React.useContext(CardMonthsAgo)
        const monthsAgo = fixed ?? fromCard
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
        }, [monthsAgo])
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

// On the date inside the Monitoring Alert component; the card says how far back.
export function withMonitoringDate(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonthsAgo(Component)
}

// Monitoring alerts: tapping one opens it and closes the other. Kept in
// memory like "read", so a refresh starts with both closed.
let openAlert: number | null = null

const getOpenAlert = () => openAlert

function toggleAlert(id: number): void {
    openAlert = openAlert === id ? null : id
    listeners.forEach((fn) => fn())
}

function withMonitoringAlert(
    Component: ComponentType<any>,
    id: number,
    monthsAgo: number
): ComponentType<any> {
    return (props: any) => {
        const open =
            React.useSyncExternalStore(
                subscribe,
                getOpenAlert,
                getOpenAlert
            ) === id
        return (
            <CardMonthsAgo.Provider value={monthsAgo}>
                <Component
                    {...props}
                    variant={open ? "Open" : "Closed"}
                    onClick={(e: React.MouseEvent) => {
                        props.onClick?.(e)
                        toggleAlert(id)
                    }}
                    style={{ ...props.style, cursor: "pointer" }}
                />
            </CardMonthsAgo.Provider>
        )
    }
}

// On the first Monitoring Alert instance (dated two months back).
export function withMonitoringAlert1(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonitoringAlert(Component, 1, 2)
}

// On the second Monitoring Alert instance (dated 19 months back).
export function withMonitoringAlert2(
    Component: ComponentType<any>
): ComponentType<any> {
    return withMonitoringAlert(Component, 2, 19)
}

// On each filter option: the whole row is tappable, not just the words.
// Options has 40 side padding and a 56 gap, so the hit area grows by 40
// sideways and 28 up and down; the negative margin keeps the text in place.
export function withFullRow(Component: ComponentType<any>): ComponentType<any> {
    return (props: any) => (
        <Component
            {...props}
            style={{
                ...props.style,
                boxSizing: "border-box",
                width: "calc(100% + 80px)",
                padding: "28px 40px",
                margin: "-28px -40px",
                cursor: "pointer",
            }}
        />
    )
}

// "No Results" block, shown only in the New and New Open variants (hidden
// in the rest). Once everything is read it appears and hides the
// "Mark all as read" row and the update cards beside it; the rule only
// matches where this block is rendered, so the other filters keep their
// cards. It also hides the page's rocket "Welcome to Credit Alerts Feed"
// block beside the feed. Code overrides can't differ per variant, hence
// the CSS.
const HIDE_WHEN_NO_RESULTS = `:has(> [data-framer-name="Empty State"]) > :is(
    [data-framer-name="Mark All Read"],
    [data-framer-name="Alert Payment History"],
    [data-framer-name="Alert Credit Score"],
    [data-framer-name="Alert Credit Usage"]
),
:has([data-framer-name="Empty State"])
    > [data-framer-name="Welcome to Credit Alerts Feed"] {
    display: none !important;
}`

export function withNoResultsWhenRead(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props: any) =>
        React.useSyncExternalStore(subscribe, getRead, getRead) ? (
            <>
                <style>{HIDE_WHEN_NO_RESULTS}</style>
                <Component {...props} />
            </>
        ) : null
}
