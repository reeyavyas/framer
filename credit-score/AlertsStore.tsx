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
