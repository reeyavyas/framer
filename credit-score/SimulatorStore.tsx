// Simulator tab: the shared score store. Every Simulator row reports its
// points here (null = off) and SimulatorScoreHeader sums them. It's
// module-level so separate instances share it; Framer keeps the module
// alive across page navigations, so rows remove their entry on unmount and
// the header calls resetAll() on mount to start each visit fresh.

const entries = new Map<string, number | null>()
const listeners = new Set<() => void>()
const resetListeners = new Set<() => void>()
let nextKey = 0

function notify() {
    listeners.forEach((fn) => fn())
}

// One key per row instance, so two rows given the same Row ID both count.
export function newEntryKey(id: string): string {
    nextKey++
    return `${id}#${nextKey}`
}

export function setPoints(key: string, points: number | null): void {
    entries.set(key, points)
    notify()
}

export function remove(key: string): void {
    entries.delete(key)
    notify()
}

export function totalPoints(): number {
    let sum = 0
    entries.forEach((p) => {
        if (p !== null) sum += p
    })
    return sum
}

// A row worth 0 points still counts as on.
export function anyOn(): boolean {
    for (const p of entries.values()) if (p !== null) return true
    return false
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}

export function onReset(fn: () => void): () => void {
    resetListeners.add(fn)
    return () => {
        resetListeners.delete(fn)
    }
}

// Rows answer by returning to their own Starts On setting.
export function resetAll(): void {
    resetListeners.forEach((fn) => fn())
    notify()
}

export function simulatedScore(
    current: number,
    min: number,
    max: number
): number {
    return Math.min(max, Math.max(min, current + totalPoints()))
}

export function _clearForTests(): void {
    entries.clear()
    listeners.clear()
    resetListeners.clear()
}
