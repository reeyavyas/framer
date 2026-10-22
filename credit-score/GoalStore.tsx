import * as React from "react"
import type { ComponentType } from "react"

// Goals tab: the one credit score goal, shared by GoalSetupCard and the
// cards that show it once set. Module-level and in memory only, so it
// lasts while the visitor moves between tabs and pages, and a refresh or a
// new tab clears it for the next user. Nothing is saved to the browser.
// Also holds the "open the Goals tab" request that withGoalsTab answers.

export interface Goal {
    score: number
    months: number
    reason: string
}

let goal: Goal | null = null
const listeners = new Set<() => void>()

export function getGoal(): Goal | null {
    return goal
}

export function setGoal(next: Goal | null): void {
    goal = next
    listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}

export function useGoal(): Goal | null {
    return React.useSyncExternalStore(subscribe, getGoal, getGoal)
}

// Counts the requests, so every See Your Progress tap is a new one.
let tabRequest = 0
const tabListeners = new Set<() => void>()

export function openGoalsTab(): void {
    tabRequest++
    tabListeners.forEach((fn) => fn())
}

function subscribeTab(fn: () => void): () => void {
    tabListeners.add(fn)
    return () => {
        tabListeners.delete(fn)
    }
}

const getTabRequest = () => tabRequest

// Override for the Section Tabs instance: on each request, remount it on
// its Goals variant (the key makes the jump work even after the visitor
// tapped back to Analysis) and scroll the tab row into view. Until the
// first request it passes through untouched.
export function withGoalsTab(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props: any) => {
        const request = React.useSyncExternalStore(
            subscribeTab,
            getTabRequest,
            getTabRequest
        )
        const ref = React.useRef<HTMLDivElement>(null)
        React.useEffect(() => {
            if (!request) return
            const tabs = ref.current?.firstElementChild
            if (tabs instanceof HTMLElement)
                tabs.scrollIntoView({ behavior: "smooth", block: "start" })
        }, [request])
        return (
            <div ref={ref} style={{ display: "contents" }}>
                {request ? (
                    <Component key={request} {...props} variant="Goals" />
                ) : (
                    <Component {...props} />
                )}
            </div>
        )
    }
}
