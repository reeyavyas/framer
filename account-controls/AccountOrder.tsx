import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * AccountOrder
 *
 * The saved account order + hidden accounts, shared between the
 * Account Preferences page (AccountPreferencesList.tsx writes it) and
 * the Accounts page (the overrides below read it).
 *
 * Four Code Overrides for the Accounts page (right panel -> Code ->
 * Override -> this file), one per account frame inside the "Accounts
 * Page Scroll Content" component:
 *
 *  - withAccount7500 -> "Platinum Rewards Checking * 7500"
 *  - withAccount8665 -> "Vertical Checking * 8665"
 *  - withAccount5101 -> "Regular Shares * 5101"
 *  - withAccount5007 -> "Freddie Mac * 5007"
 *
 * Each sets its frame's CSS `order` from the saved order, and hides the
 * frame (display: none) if the account was hidden with the eye. The
 * frames stay native Framer layers — the parent stack is flexbox, and
 * `order` just changes where the browser draws each child. Requirements
 * on the canvas:
 *  - The four account frames are direct children of one stack, and
 *    everything else in that stack (External Accounts, the "**" footnote,
 *    Add External Accounts) comes AFTER them. The accounts get negative
 *    `order` values (-100, -99, ...), so they always sort ahead of any
 *    un-overridden sibling (order 0) — anything placed ABOVE the
 *    accounts in the same stack would get pushed below them.
 *  - Each divider is the frame's own bottom border, so it moves with
 *    its account. Rounded corners live on the parent, not on a row.
 * Until the user saves a change on Account Preferences, nothing is
 * touched and the frames show in their canvas order.
 *
 * The overrides apply to every variant of the component (both
 * carousel variants), which is fine here: the account frames are
 * identical in both.
 *
 * WHERE IT'S KEPT, AND WHY: module memory, not sessionStorage. Framer's
 * native Links navigate client-side and keep this module alive between
 * pages (the same thing CardAlertsToggleReport.tsx relies on), so the
 * order carries from Account Preferences to Accounts. A refresh, or
 * AppInactivityOverlay's hard redirect to /app, reloads the document
 * and resets this module — so the next student starts from the default
 * order without anything having to clear it. That does mean every way
 * between these pages must be a native Framer Link, not a
 * window.location.href navigation, which would reset the order too.
 * It also means there's no SSR hydration mismatch: on a fresh document
 * load the state is always the default (nothing changed), which is what
 * the server rendered.
 *
 * STORES: "base" and "tutorial" are kept separately, so walking through
 * the Account Controls tutorial never reshuffles the free-play Accounts
 * page. AccountPreferencesList picks its store with a property control.
 * These four overrides read "base". The tutorial's Accounts page (a
 * variant of the same component, so it carries these same overrides)
 * isn't wired yet — see account-controls/NOTES.md.
 *
 * Account ids are the last four digits, and must match the ids in
 * AccountPreferencesList's "Accounts" property control.
 *
 * On the canvas the overrides are inert.
 */

export type AccountStoreName = "base" | "tutorial"

type AccountState = {
    // null until the first save: nothing to reorder yet.
    order: string[] | null
    hidden: string[]
}

const stores: Record<AccountStoreName, AccountState> = {
    base: { order: null, hidden: [] },
    tutorial: { order: null, hidden: [] },
}
const listeners = new Set<() => void>()

export function getAccountState(store: AccountStoreName): AccountState {
    return stores[store]
}

export function saveAccountState(
    store: AccountStoreName,
    order: string[],
    hidden: string[]
) {
    stores[store] = { order: [...order], hidden: [...hidden] }
    listeners.forEach((fn) => fn())
}

export function subscribeAccountState(onChange: () => void): () => void {
    listeners.add(onChange)
    return () => {
        listeners.delete(onChange)
    }
}

// Negative so the accounts sort ahead of every un-overridden sibling in
// the same stack (see header comment).
const ORDER_OFFSET = -100

function useAccountFrameStyle(
    accountId: string,
    store: AccountStoreName
): React.CSSProperties | null {
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)

    React.useEffect(() => {
        const unsubscribe = subscribeAccountState(forceUpdate)
        // Catch a save made between this render and subscribing.
        forceUpdate()
        return unsubscribe
    }, [])

    const { order, hidden } = getAccountState(store)
    if (hidden.includes(accountId)) return { display: "none" }
    const index = order ? order.indexOf(accountId) : -1
    if (index === -1) return null
    return { order: ORDER_OFFSET + index }
}

function renderAccountFrame(
    Component: ComponentType<any>,
    props: any,
    style: React.CSSProperties | null
) {
    if (!style) return <Component {...props} />
    return <Component {...props} style={{ ...props.style, ...style }} />
}

// Each export is a literal top-level function — Framer's Override
// picker only lists exports shaped exactly like this.

export function withAccount7500(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account7500(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("7500", "base")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount8665(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account8665(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("8665", "base")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount5101(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account5101(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("5101", "base")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount5007(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account5007(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("5007", "base")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}
