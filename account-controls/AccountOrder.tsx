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
 * page. AccountPreferencesList writes "base";
 * AccountPreferencesListTutorial (tutorials/account-controls-tutorial/)
 * writes "tutorial". The overrides here apply to every variant of the
 * Accounts content component, the tutorial's included, so they pick
 * the store from the page's URL: "tutorial" under
 * TUTORIAL_PATH_PREFIX, "base" everywhere else.
 *
 * NAMES: the tutorial renames an account, and its last Accounts page
 * (/account-controls-tutorial/accounts-2) shows the new name. Put
 * withAccountName7500 etc. on the account's NAME TEXT layer (not the
 * frame — that one already carries withAccountNNNN, and Framer allows
 * one override per layer). That layer holds the name and the number,
 * e.g. "Vertical Checking * 8665", and the override replaces its whole
 * text with the new name plus NAME_NUMBER_SEPARATOR plus the id, e.g.
 * "Main Checking * 8665". Until a name is saved the layer's own text
 * shows. Only the renamed account needs it.
 *
 * resetAccountState() clears a store. The tutorial calls it when its
 * first page opens (see AccountControlsTutorialReset.tsx), so a second
 * run in the same session starts from the default order.
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
    // Account id -> new name. Only the tutorial renames.
    names: Record<string, string>
}

function emptyState(): AccountState {
    return { order: null, hidden: [], names: {} }
}

const stores: Record<AccountStoreName, AccountState> = {
    base: emptyState(),
    tutorial: emptyState(),
}
const listeners = new Set<() => void>()

// Debugging aid. In the browser console, `__accountOrder` lists every
// loaded copy of this file, with its saved state (`stores`) and a `log`
// of its saves and resets. There should be exactly one. Two or more
// means Framer is running different builds of this file side by side,
// so the list saves into one copy while the Accounts page reads
// another: re-save this file and every file that imports it, then
// reload.
const debugLog: string[] = []
function logEvent(what: string) {
    if (typeof window === "undefined") return
    debugLog.push(
        `${new Date().toLocaleTimeString()} ${what} on ${window.location.pathname}`
    )
}
if (typeof window !== "undefined") {
    const w = window as any
    w.__accountOrder = w.__accountOrder || []
    w.__accountOrder.push({
        loadedOn: window.location.pathname,
        stores,
        log: debugLog,
    })
}

function notify() {
    listeners.forEach((fn) => fn())
}

export function getAccountState(store: AccountStoreName): AccountState {
    return stores[store]
}

// Leaving `names` out keeps the names already saved.
export function saveAccountState(
    store: AccountStoreName,
    order: string[],
    hidden: string[],
    names: Record<string, string> = stores[store].names
) {
    stores[store] = { order: [...order], hidden: [...hidden], names: { ...names } }
    logEvent(`saved ${store}`)
    notify()
}

export function resetAccountState(store: AccountStoreName) {
    stores[store] = emptyState()
    logEvent(`reset ${store}`)
    notify()
}

export function subscribeAccountState(onChange: () => void): () => void {
    listeners.add(onChange)
    return () => {
        listeners.delete(onChange)
    }
}

// Pages under this path read and show the "tutorial" store.
const TUTORIAL_PATH_PREFIX = "/account-controls-tutorial/"

function storeForThisPage(): AccountStoreName {
    if (typeof window === "undefined") return "base"
    return window.location.pathname.startsWith(TUTORIAL_PATH_PREFIX)
        ? "tutorial"
        : "base"
}

function useAccountStateUpdates() {
    const [, forceUpdate] = React.useReducer((n: number) => n + 1, 0)
    React.useEffect(() => {
        const unsubscribe = subscribeAccountState(forceUpdate)
        // Catch a save made between this render and subscribing.
        forceUpdate()
        return unsubscribe
    }, [])
}

// Negative so the accounts sort ahead of every un-overridden sibling in
// the same stack (see header comment).
const ORDER_OFFSET = -100

function useAccountFrameStyle(accountId: string): React.CSSProperties | null {
    useAccountStateUpdates()
    const { order, hidden } = getAccountState(storeForThisPage())
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
        const style = useAccountFrameStyle("7500")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount8665(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account8665(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("8665")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount5101(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account5101(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("5101")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

export function withAccount5007(
    Component: ComponentType<any>
): ComponentType<any> {
    return function Account5007(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const style = useAccountFrameStyle("5007")
        return renderAccountFrame(Component, props, isCanvas ? null : style)
    }
}

// Name text overrides: show the saved new name, if any (see NAMES in
// the header comment).

// Between the name and the account number on the Accounts page's name
// text layers. Must match the canvas text exactly.
const NAME_NUMBER_SEPARATOR = " * "

function useAccountName(accountId: string): string | undefined {
    useAccountStateUpdates()
    return getAccountState(storeForThisPage()).names[accountId]
}

function renderAccountName(
    Component: ComponentType<any>,
    props: any,
    accountId: string,
    name: string | undefined
) {
    if (name === undefined) return <Component {...props} />
    return (
        <Component
            {...props}
            text={`${name}${NAME_NUMBER_SEPARATOR}${accountId}`}
        />
    )
}

export function withAccountName7500(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountName7500(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const name = useAccountName("7500")
        return renderAccountName(
            Component,
            props,
            "7500",
            isCanvas ? undefined : name
        )
    }
}

export function withAccountName8665(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountName8665(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const name = useAccountName("8665")
        return renderAccountName(
            Component,
            props,
            "8665",
            isCanvas ? undefined : name
        )
    }
}

export function withAccountName5101(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountName5101(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const name = useAccountName("5101")
        return renderAccountName(
            Component,
            props,
            "5101",
            isCanvas ? undefined : name
        )
    }
}

export function withAccountName5007(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountName5007(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const name = useAccountName("5007")
        return renderAccountName(
            Component,
            props,
            "5007",
            isCanvas ? undefined : name
        )
    }
}
