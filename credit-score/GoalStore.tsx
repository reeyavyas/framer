import * as React from "react"

// Goals tab: the one credit score goal, shared by GoalSetupCard and the
// cards that show it once set. Module-level and in memory only, so it
// lasts while the visitor moves between tabs and pages, and a refresh or a
// new tab clears it for the next user. Nothing is saved to the browser.

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
