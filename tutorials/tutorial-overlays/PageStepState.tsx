/**
 * PageStepState
 *
 * The shared same-page step counter that lets several tutorial pieces on
 * one page take turns and hand off to each other: TutorialOverlay.tsx's
 * own steps, and TutorialCongrats.tsx / TutorialCongratsGate.tsx showing
 * themselves once those steps are done. Pulled out into its own tiny
 * file — a few functions around two module-level Maps, no JSX, no
 * dependencies — specifically so those congrats components (and any
 * other file that only needs to read/subscribe to this counter) don't
 * have to import all of TutorialOverlay.tsx just to reach it. TutorialOverlay.tsx
 * is a large, animation-heavy file; pulling its entire module into
 * Framer's canvas bundle for a component that only needs two small
 * functions was making the canvas noticeably heavy (and, per this
 * project's own history — see NOTES.md's `window.__getVirtualScroll`
 * note on CardAlertsSave.tsx — a cross-file import of a heavy module has
 * already caused real breakage here once before). This file is the fix:
 * everything that needs the shared step counter imports from here
 * instead, including TutorialOverlay.tsx itself.
 *
 * Same module-level-Map coordination technique CircleOverrides.tsx uses
 * to keep its several circle instances in sync.
 */

const pageStepState = new Map<string, number>()
const pageStepListeners = new Map<string, Set<() => void>>()

export function getPageStep(groupId: string): number {
    return pageStepState.get(groupId) ?? 1
}

export function setPageStep(groupId: string, step: number) {
    pageStepState.set(groupId, step)
    pageStepListeners.get(groupId)?.forEach((fn) => fn())
}

export function subscribePageStep(groupId: string, onChange: () => void) {
    if (!pageStepListeners.has(groupId))
        pageStepListeners.set(groupId, new Set())
    const listeners = pageStepListeners.get(groupId)!
    listeners.add(onChange)
    // Block body, not `() => listeners.delete(onChange)` — Set.delete()
    // returns boolean, and a useEffect cleanup must return exactly void.
    // An inline arrow function literal returned directly from an effect
    // gets a TS carve-out that voids a non-void expression automatically;
    // a function value handed back from elsewhere (like this one, used
    // as `return subscribePageStep(...)` in an effect) does not, and
    // fails type-checking wherever it's imported and used that way.
    return () => {
        listeners.delete(onChange)
    }
}
