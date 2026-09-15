import * as React from "react"
import type { ComponentType } from "react"
import { animate, motion, useMotionValue } from "framer-motion"

/**
 * VirtualScroll
 *
 * Replaces native browser scrolling on one Frame with a fully
 * JS-owned equivalent, so a one-way scroll lock can be a real,
 * zero-tolerance guarantee (never even a single frame of backward
 * movement) WITHOUT the jank that came from intercepting native
 * scroll with a non-passive wheel/touchmove listener.
 *
 * The jank in that earlier approach wasn't a bug to fix — it was
 * structural: native scrolling and a JS listener trying to veto it
 * are two separate authorities fighting over the same value
 * (scrollTop) at once. Blocking in real time costs main-thread
 * contention; anything less costs a visible (if brief) backward slip.
 * There's no way to get both from native scroll. Taking over
 * scrolling entirely removes the fight instead of refereeing it:
 * touch/wheel input updates a single owned value, clamped the instant
 * it's set, with nothing else ever touching it.
 *
 * First version of this shipped and was reverted: testing found an
 * occasional small backward leak (a few px, not a full escape) rather
 * than the zero-tolerance guarantee this exists for. Root cause was
 * almost certainly the touch handling, not the clamp itself (the
 * clamp is an unconditional Math.max on every write — there was no
 * code path that ever skipped it): a touch gesture interrupted by the
 * OS (an edge-swipe, a second finger, a phone call banner) fires
 * touchcancel instead of touchend, which the old version never
 * listened for. dragRef stayed populated with a stale {startY,
 * startPos} from the aborted gesture, so the NEXT touchmove — even
 * from what looks like a brand new drag — computed its delta against
 * that stale baseline instead of the real one, producing a small
 * garbage jump. Fixed here by (1) handling touchcancel identically to
 * touchend, and (2) tracking the drag by touch `identifier` instead
 * of always trusting `touches[0]`, so a second finger arriving or
 * leaving mid-gesture can't silently swap which contact is driving
 * the position.
 *
 * Also explicitly turns off iOS's native momentum/rubber-band
 * scrolling (-webkit-overflow-scrolling, overscroll-behavior) on this
 * element. overflow:hidden should already make it unscrollable, but
 * these are physics the OS can apply independent of further JS events
 * once a scroll starts, so any left enabled would be a way for
 * position to move without going through setPos/clamp at all — belt
 * and suspenders against the exact class of bug above.
 *
 * The clamp keeps a tiny (EDGE_TOLERANCE_PX) allowance below the
 * floor rather than an exact 0. That's not a concession that
 * zero-tolerance can't be done — the Math.max clamp already gives an
 * exact guarantee — it's cheap insurance against sub-pixel rounding
 * noise between this value and whatever CSS transform actually paints,
 * which isn't visually distinguishable from 0 anyway. Set it to 0 if
 * a stricter guarantee is ever needed for a different container.
 *
 * Usage: select the "Scrollable Content" layer on the canvas ->
 * Code (right panel) -> Override -> this file -> pick the export for
 * that specific container (e.g. VirtualScrollTravelContent). Each
 * container needs its own thin export the same way TutorialTargets.tsx
 * does it, since Framer's Override dropdown only picks up top-level
 * exported function declarations.
 *
 * TutorialOverlay.tsx's scrollAdvancesStep and lockScrollWhileActive
 * both check getVirtualScroll(scrollContainerTarget) first and use
 * this instead of native scrollTop/scroll events when it's present,
 * falling back to native handling for any container that isn't
 * virtualized. So this only needs to be applied to containers that
 * actually need the zero-tolerance lock — everything else keeps
 * working exactly as before, untouched.
 *
 * Known limitation, worth testing for: there's no momentum/inertia
 * here on purpose — position follows the finger 1:1 in real time and
 * stops the instant it's released, rather than gliding. That's a
 * smaller, lower-risk first version than reimplementing native
 * momentum physics; add easing on release later if the lack of glide
 * reads as too abrupt on the real kiosk hardware.
 */

const EDGE_TOLERANCE_PX = 2

export interface VirtualScrollHandle {
    // 0-100, how far through the scrollable range the content
    // currently is. Used by TutorialOverlay's scrollAdvancesStep.
    getPercent(): number
    // Locks the floor at the CURRENT position — used by
    // TutorialOverlay's lockScrollWhileActive the moment that step
    // engages. Position can then never go below this again while the
    // container stays mounted. Calling this again later only ever
    // raises the floor further (to wherever position is AT THAT
    // point) — it can't lower it, so a step that needs to undo an
    // earlier lock (e.g. to let the user scroll back up to something
    // now pinned above where an earlier step's lock ratcheted to)
    // needs releaseFloor below instead.
    lockFloorHere(): void
    // Resets the floor back to 0 (the true top), undoing whatever an
    // earlier lockFloorHere call set it to. Used by TutorialOverlay's
    // releaseScrollLockWhileActive — the lock is a deliberate one-way
    // ratchet for the step that sets it (e.g. stopping a card from
    // scrolling back down under fixed chrome while filling out a
    // form), not a permanent property of the container; a later step
    // in the same flow with different needs (e.g. "scroll up to see
    // the thing you just saved") should be able to undo it.
    releaseFloor(): void
    // Freezes position completely — neither direction moves, not just
    // "can't go backward" — until unfreeze() is called. Used by
    // TutorialOverlay's freezeScrollWhileActive for a step whose target
    // needs to hold perfectly still while the user decides whether to
    // interact with it (e.g. a toggle inside a scrollable list), rather
    // than merely being unable to go back to where it was. Distinct
    // from lockFloorHere/releaseFloor: those still allow forward
    // motion and are a deliberate ratchet that outlives the step that
    // set it; this blocks all motion and is meant to be undone by the
    // same step's own end.
    freezeHere(): void
    unfreeze(): void
    // Smoothly animates position back to 0 (the true top). Used by
    // CardAlertsSave.tsx's scrollCardAlertsToTop() the instant its
    // Saving overlay appears, so the page is back at the top by the
    // time the save delay elapses and it navigates away. Deliberately
    // ignores both the floor (lockFloorHere's ratchet) and frozen
    // state — by the point Save is tappable, whatever earlier step set
    // either of those is long over, and the container is about to
    // unmount anyway on navigation, so there's nothing left for either
    // one to protect.
    scrollToTop(): void
    // Fires whenever position changes, so TutorialOverlay can
    // re-check its own thresholds without polling.
    subscribe(fn: () => void): () => void
}

const registry = new Map<string, VirtualScrollHandle>()

export function getVirtualScroll(
    id: string
): VirtualScrollHandle | undefined {
    return id ? registry.get(id) : undefined
}

// Also exposed on window, not just as an ES export: card-controls/card-
// alerts/CardAlertsSave.tsx (a different top-level folder from this
// file's own) needs to reach this registry, and a static cross-folder
// import turned out unsafe here — Framer's actual project file tree
// isn't guaranteed to mirror this repo's folder layout the way a
// same-folder import (like TutorialOverlay.tsx's own
// `./VirtualScroll.tsx`) can rely on, and an import that doesn't
// resolve to the exact right path silently breaks EVERY export in the
// importing file's Override picker, not just the one that used it —
// which is exactly what happened the first time this was tried as an
// import. Anything reaching this file from outside tutorial-overlays/
// should go through window instead.
//
// Guarded — Framer server-renders these files too, where `window`
// doesn't exist at all (not just "hasn't been touched yet"), so an
// unconditional assignment here crashes rendering on every page any
// tutorial-overlays file loads on, published or not. Same class of bug
// TravelNoticeSectionTutorial.tsx already documents for
// sessionStorage: this line runs at module-evaluation time, which
// happens during SSR too, not only in the browser.
if (typeof window !== "undefined") {
    ;(window as any).__getVirtualScroll = getVirtualScroll
}

function withVirtualScroll(id: string) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return React.forwardRef(function VirtualScrollContainer(
            props: any,
            ref: any
        ) {
            const containerRef = React.useRef<HTMLDivElement | null>(null)
            const contentRef = React.useRef<HTMLDivElement | null>(null)
            const y = useMotionValue(0)

            const posRef = React.useRef(0) // 0 = top, increases downward
            const floorRef = React.useRef(0)
            const maxRef = React.useRef(0)
            const frozenRef = React.useRef(false)
            const dragRef = React.useRef<{
                id: number
                startY: number
                startPos: number
            } | null>(null)
            const listenersRef = React.useRef(new Set<() => void>())

            const setPos = React.useCallback(
                (v: number) => {
                    // Frozen means frozen — not clamped to a range, not
                    // "no further than this," just entirely unresponsive
                    // to input until unfrozen. Checked before floor/max
                    // even apply, so freezing overrides an active
                    // lockFloorHere ratchet for free (there's no motion
                    // left for the floor to constrain).
                    if (frozenRef.current) return
                    const clamped = Math.min(
                        Math.max(v, floorRef.current - EDGE_TOLERANCE_PX),
                        maxRef.current
                    )
                    if (clamped === posRef.current) return
                    posRef.current = clamped
                    y.set(-clamped)
                    listenersRef.current.forEach((fn) => fn())
                },
                [y]
            )

            // Re-measures how far there is to scroll whenever either the
            // container or its content changes size — a genuine
            // ResizeObserver use case (unlike position tracking, size IS
            // exactly what it's built for).
            React.useEffect(() => {
                const container = containerRef.current
                const content = contentRef.current
                if (!container || !content) return
                function measure() {
                    maxRef.current = Math.max(
                        0,
                        content!.scrollHeight - container!.clientHeight
                    )
                    setPos(posRef.current)
                }
                measure()
                const ro = new ResizeObserver(measure)
                ro.observe(container)
                ro.observe(content)
                return () => ro.disconnect()
            }, [setPos])

            React.useEffect(() => {
                const handle: VirtualScrollHandle = {
                    getPercent: () =>
                        maxRef.current > 0
                            ? (posRef.current / maxRef.current) * 100
                            : 100,
                    lockFloorHere: () => {
                        floorRef.current = posRef.current
                    },
                    releaseFloor: () => {
                        floorRef.current = 0
                    },
                    freezeHere: () => {
                        frozenRef.current = true
                    },
                    unfreeze: () => {
                        frozenRef.current = false
                    },
                    scrollToTop: () => {
                        animate(posRef.current, 0, {
                            duration: 0.5,
                            onUpdate: (v) => {
                                posRef.current = v
                                y.set(-v)
                                listenersRef.current.forEach((fn) => fn())
                            },
                        })
                    },
                    subscribe: (fn) => {
                        listenersRef.current.add(fn)
                        // Block body, not an implicit-return arrow — a
                        // plain `() => listenersRef.current.delete(fn)`
                        // type-checks as `() => boolean` (Set.delete's own
                        // return value), which useEffect's cleanup return
                        // type rejects. Same footgun TravelNoticeToast.tsx
                        // already documents.
                        return () => {
                            listenersRef.current.delete(fn)
                        }
                    },
                }
                registry.set(id, handle)
                return () => {
                    // Only remove OWN registration, never someone else's
                    // that may have since taken over this id — the same
                    // id applied to two containers (e.g. by mistake, or
                    // briefly during a page transition where both are
                    // mounted at once) would otherwise let whichever one
                    // unmounts/re-runs LAST silently delete the other's
                    // live entry out from under it, even though that
                    // other container is the one actually on screen.
                    // registry is keyed by a developer-chosen string with
                    // no other uniqueness guarantee, so this equality
                    // check is the only thing enforcing "an id names AT
                    // MOST one live container" instead of just assuming it.
                    if (registry.get(id) === handle) registry.delete(id)
                }
            }, [])

            // Wired up via a real addEventListener with passive:false,
            // not React's onWheel/onTouchMove JSX props — React attaches
            // those as passive listeners by default (since React 17), so
            // preventDefault() inside them can silently no-op. That
            // matters here: overflow:hidden already stops this element
            // from natively scrolling itself, but without preventDefault
            // a wheel/touch gesture over it would still "scroll chain" to
            // a scrollable ancestor instead of doing nothing.
            React.useEffect(() => {
                const container = containerRef.current
                if (!container) return

                function endDrag(e: TouchEvent) {
                    if (!dragRef.current) return
                    const ended = Array.from(e.changedTouches).some(
                        (t) => t.identifier === dragRef.current!.id
                    )
                    // Only clear if the finger that just lifted/cancelled
                    // is the one actually driving the drag — a second,
                    // unrelated finger ending shouldn't reset it.
                    if (ended) dragRef.current = null
                }

                function onWheel(e: WheelEvent) {
                    e.preventDefault()
                    setPos(posRef.current + e.deltaY)
                }
                function onTouchStart(e: TouchEvent) {
                    const touch = e.changedTouches[0]
                    dragRef.current = {
                        id: touch.identifier,
                        startY: touch.clientY,
                        startPos: posRef.current,
                    }
                }
                function onTouchMove(e: TouchEvent) {
                    if (!dragRef.current) return
                    const touch = Array.from(e.touches).find(
                        (t) => t.identifier === dragRef.current!.id
                    )
                    if (!touch) return
                    e.preventDefault()
                    const deltaY = dragRef.current.startY - touch.clientY
                    setPos(dragRef.current.startPos + deltaY)
                }
                // touchend and touchcancel both end a drag — a gesture
                // interrupted by the OS (edge-swipe, second finger,
                // incoming-call banner) fires cancel, not end, and
                // leaving dragRef stale until then is exactly what let
                // the previous version's touchmove compute its delta
                // against a stale baseline. Treat both the same way.
                container.addEventListener("wheel", onWheel, {
                    passive: false,
                })
                container.addEventListener("touchstart", onTouchStart, {
                    passive: true,
                })
                container.addEventListener("touchmove", onTouchMove, {
                    passive: false,
                })
                container.addEventListener("touchend", endDrag, {
                    passive: true,
                })
                container.addEventListener("touchcancel", endDrag, {
                    passive: true,
                })
                return () => {
                    container.removeEventListener("wheel", onWheel)
                    container.removeEventListener(
                        "touchstart",
                        onTouchStart
                    )
                    container.removeEventListener("touchmove", onTouchMove)
                    container.removeEventListener("touchend", endDrag)
                    container.removeEventListener("touchcancel", endDrag)
                }
            }, [setPos])

            return (
                <Component
                    {...props}
                    ref={(node: HTMLDivElement | null) => {
                        containerRef.current = node
                        if (typeof ref === "function") ref(node)
                        else if (ref) ref.current = node
                    }}
                    style={{
                        ...props.style,
                        overflow: "hidden",
                        touchAction: "none",
                        overscrollBehavior: "none",
                        WebkitOverflowScrolling: "auto",
                    }}
                >
                    <motion.div ref={contentRef} style={{ y }}>
                        {props.children}
                    </motion.div>
                </Component>
            )
        })
    }
}

//Travel Notice Page "Scrollable Content"
export function VirtualScrollTravelContent(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("scrollable-content")(Component)
}

// Card Alerts Tutorial Page "Scrollable Content" — its OWN id, not a
// reuse of VirtualScrollTravelContent's "scrollable-content". Applying
// the same export/id to a second page's container was the actual bug
// behind a report of still being able to scroll up on the Card Alerts
// toggle step despite lockScrollWhileActive: the registry above is one
// shared Map keyed only by this string, so two different containers
// registered under the same id race for that one slot — whichever
// mounts/re-registers last "wins" the lookup, and the OTHER container
// (quite possibly the one actually on screen) is left with a floor
// lock that was never really applied to IT. Matches this file's own
// documented convention (see the top-of-file comment): every container
// gets its own thin export, exactly like TutorialTargets.tsx does per
// target — this was simply the second one ever needed.
export function VirtualScrollCardAlertsContent(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("card-alerts-scroll")(Component)
}

// Card Controls Tutorial Page 1 ("/card-controls-tutorial/card-controls-1")
// "Scrollable Content" — its own id, same reasoning as
// VirtualScrollCardAlertsContent above: never reuse another page's id
// for this, or the two containers race for one registry slot and
// whichever mounts last silently steals the lock from the other.
export function VirtualScrollCardControls1Content(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("card-controls-1-scroll")(Component)
}
