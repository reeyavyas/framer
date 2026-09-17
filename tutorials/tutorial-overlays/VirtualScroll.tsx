import * as React from "react"
import type { ComponentType } from "react"
import { animate, motion, useMotionValue } from "framer-motion"

/**
 * VirtualScroll
 *
 * Replaces native browser scrolling on one Frame with a fully
 * JS-owned equivalent, so a step's freeze can be a real, zero-tolerance
 * guarantee (position holds exactly still, not just "resists" native
 * momentum) WITHOUT the jank that came from intercepting native scroll
 * with a non-passive wheel/touchmove listener.
 *
 * The jank in that earlier approach wasn't a bug to fix — it was
 * structural: native scrolling and a JS listener trying to veto it
 * are two separate authorities fighting over the same value
 * (scrollTop) at once. Blocking in real time costs main-thread
 * contention; anything less costs a visible (if brief) slip. There's
 * no way to get both from native scroll. Taking over scrolling
 * entirely removes the fight instead of refereeing it: touch/wheel
 * input updates a single owned value, clamped the instant it's set,
 * with nothing else ever touching it.
 *
 * First version of this shipped and was reverted: testing found an
 * occasional small drift (a few px) rather than the zero-tolerance
 * guarantee this exists for. Root cause was almost certainly the
 * touch handling, not the clamp itself (the clamp is an unconditional
 * Math.max/Math.min on every write — there was no code path that ever
 * skipped it): a touch gesture interrupted by the OS (an edge-swipe, a
 * second finger, a phone call banner) fires touchcancel instead of
 * touchend, which the old version never listened for. dragRef stayed
 * populated with a stale {startY, startPos} from the aborted gesture,
 * so the NEXT touchmove — even from what looks like a brand new drag —
 * computed its delta against that stale baseline instead of the real
 * one, producing a small garbage jump. Fixed here by (1) handling
 * touchcancel identically to touchend, and (2) tracking the drag by
 * touch `identifier` instead of always trusting `touches[0]`, so a
 * second finger arriving or leaving mid-gesture can't silently swap
 * which contact is driving the position.
 *
 * Also explicitly turns off iOS's native momentum/rubber-band
 * scrolling (-webkit-overflow-scrolling, overscroll-behavior) on this
 * element. overflow:hidden should already make it unscrollable, but
 * these are physics the OS can apply independent of further JS events
 * once a scroll starts, so any left enabled would be a way for
 * position to move without going through setPos/clamp at all — belt
 * and suspenders against the exact class of bug above.
 *
 * The clamp keeps a tiny (EDGE_TOLERANCE_PX) allowance above 0 rather
 * than an exact bound. That's not a concession that zero-tolerance
 * can't be done — the Math.max clamp already gives an exact guarantee
 * — it's cheap insurance against sub-pixel rounding noise between this
 * value and whatever CSS transform actually paints, which isn't
 * visually distinguishable from 0 anyway. Set it to 0 if a stricter
 * guarantee is ever needed for a different container.
 *
 * Usage: select the "Scrollable Content" layer on the canvas ->
 * Code (right panel) -> Override -> this file -> pick the export for
 * that specific container (e.g. VirtualScrollTravelContent). The
 * existing exports below each still carry their own id purely by
 * convention now (see the registry scoping comment above the registry
 * itself) — nothing stops a brand new page from reusing any one of
 * them as-is, with no new export needed, since the registry no longer
 * relies on the id alone to tell containers apart.
 *
 * TutorialOverlay.tsx's scrollAdvancesStep and freezeScrollWhileActive
 * both check getVirtualScroll(scrollContainerTarget) first and use
 * this instead of native scrollTop/scroll events when it's present,
 * falling back to native handling for any container that isn't
 * virtualized. So this only needs to be applied to containers that
 * actually need it — everything else keeps working exactly as before,
 * untouched.
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
    // Freezes position completely — neither direction moves — until
    // unfreeze() is called. Used by TutorialOverlay's
    // freezeScrollWhileActive for a step whose target needs to hold
    // perfectly still while the user decides whether to interact with
    // it (e.g. a toggle inside a scrollable list), scoped to that
    // step's own lifetime.
    freezeHere(): void
    unfreeze(): void
    // Smoothly animates position back to 0 (the true top). Used by
    // CardAlertsSave.tsx's scrollCardAlertsToTop() the instant its
    // Saving overlay appears, so the page is back at the top by the
    // time the save delay elapses and it navigates away. Deliberately
    // ignores frozen state — by the point Save is tappable, whatever
    // earlier step froze it is long over, and the container is about
    // to unmount anyway on navigation.
    scrollToTop(): void
    // Fires whenever position changes, so TutorialOverlay can
    // re-check its own thresholds without polling.
    subscribe(fn: () => void): () => void
}

const registry = new Map<string, VirtualScrollHandle>()

// Registry keys are scoped by page, not just by id: `${pathname}::${id}`
// instead of the bare id. This project publishes as a client-routed SPA
// (Framer's own page transitions, not full reloads), and the registry
// above lives for the whole visitor session — so a bare id was really
// naming "at most one container across the ENTIRE site," not "at most
// one container per page" the way it reads. That's exactly what already
// caused a real bug (Card Alerts vs Travel Notice both using
// "scrollable-content"): duplicating a page in Framer carries its
// VirtualScroll override, and its id, forward unchanged, so forgetting
// to give the duplicate a new id let it silently steal the original's
// registry slot.
//
// Scoping by the current path removes the failure mode instead of just
// relying on every export always remembering a unique id: two
// containers using the identical id string on two different pages now
// land in two different slots automatically, because the path is part
// of the key. This is a real guarantee for any page that isn't ALSO
// mounted at the same path as another VirtualScroll container — the
// per-export ids below stay as they are (kept explicit rather than
// collapsed to one shared export) mainly for Card Alerts, whose id is
// also hand-typed as a constant in card-controls/card-alerts/
// CardAlertsSave.tsx and needs to keep matching that exactly.
//
// One assumption this leans on, not independently verified against
// Framer's own transitions specifically (flagged as open in this
// project's tutorials/NOTES.md): that the browser's URL updates
// before or together with the incoming page's components mounting
// during a transition, not after. That's standard client-side-routing
// behavior, but if it ever turns out to lag behind mounting on this
// specific host, a container could briefly register under the
// OUTGOING page's still-current path during the overlap window.
function scopedKey(id: string): string {
    // Defensive, not load-bearing today — every real caller of this
    // reaches it from inside a useEffect, which never runs during SSR
    // — but cheap insurance against a future caller that isn't.
    if (typeof window === "undefined") return id
    return `${window.location.pathname}::${id}`
}

export function getVirtualScroll(
    id: string
): VirtualScrollHandle | undefined {
    return id ? registry.get(scopedKey(id)) : undefined
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
                    // to input until unfrozen. Checked before the range
                    // clamp even applies.
                    if (frozenRef.current) return
                    const clamped = Math.min(
                        Math.max(v, -EDGE_TOLERANCE_PX),
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
                // Computed once per mount and reused for both the set
                // below and the cleanup's lookup — NOT recomputed inside
                // the cleanup itself. If it were recomputed there, a
                // pathname that changed between this mount and its
                // eventual unmount (e.g. a transition that doesn't tear
                // this component down immediately) could make the
                // cleanup compute a different key than the one this
                // effect actually registered under, leaving a stale
                // entry behind instead of removing it.
                const key = scopedKey(id)
                const handle: VirtualScrollHandle = {
                    getPercent: () =>
                        maxRef.current > 0
                            ? (posRef.current / maxRef.current) * 100
                            : 100,
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
                registry.set(key, handle)
                return () => {
                    // Only remove OWN registration, never someone else's
                    // that may have since taken over this key — two
                    // containers landing on the same key (e.g. a
                    // same-page id typo, or briefly during a page
                    // transition where both are mounted at once — see
                    // the scoping comment above the registry) would
                    // otherwise let whichever one unmounts/re-runs LAST
                    // silently delete the other's live entry out from
                    // under it, even though that other container is the
                    // one actually on screen. This equality check is the
                    // only thing enforcing "a key names AT MOST one live
                    // container" instead of just assuming it.
                    if (registry.get(key) === handle) registry.delete(key)
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
                    <motion.div
                        ref={contentRef}
                        style={{
                            // Mirrors the container's own layout props
                            // (Framer Stacks set display/flexDirection/
                            // gap/alignItems directly on the frame) onto
                            // this wrapper. Flex context only reaches a
                            // container's DIRECT children — once this
                            // div sits between the Stack and its rows,
                            // the rows are no longer direct children of
                            // the flex frame, so any child relying on
                            // Framer's "Fill" sizing (itself implemented
                            // via flex) has nothing to size against and
                            // can collapse to zero. Re-declaring the
                            // same flex properties here keeps the rows'
                            // sizing context intact instead of just
                            // adding an invisible non-flex layer between
                            // them and their real parent.
                            display: props.style?.display,
                            flexDirection: props.style?.flexDirection,
                            alignItems: props.style?.alignItems,
                            justifyContent: props.style?.justifyContent,
                            gap: props.style?.gap,
                            width: "100%",
                            y,
                        }}
                    >
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

// Card Alerts Tutorial Page "Scrollable Content" — kept as its own
// dedicated export/id rather than folded into a shared one, even though
// the registry's page-scoping (see the comment above it) would no
// longer let this collide with another page's container regardless of
// id. Left distinct on purpose: card-controls/card-alerts/
// CardAlertsSave.tsx reaches into this id by hand as its own
// VIRTUAL_SCROLL_ID constant (via window.__getVirtualScroll, since it
// can't statically import across this project's top-level folders — see
// that file), to scroll the Card Alerts tutorial page back to top the
// instant its Saving overlay appears. Renaming or reusing this id for
// another page's container would silently break that lookup unless
// CardAlertsSave.tsx's constant were updated to match.
export function VirtualScrollCardAlertsContent(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("card-alerts-scroll")(Component)
}

// Card Controls Tutorial Page 1 ("/card-controls-tutorial/card-controls-1")
// "Scrollable Content". Its id no longer has to be unique across pages
// for correctness (see the registry-scoping comment above) — kept as
// its own export mainly so the existing canvas Override selection on
// this page doesn't need to change. A future page can just as safely
// reuse this exact export instead of getting a new one of its own.
export function VirtualScrollCardControls1Content(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("card-controls-1-scroll")(Component)
}

// Card Controls Tutorial Page 3 ("/card-controls-tutorial/card-controls-3")
// "Scrollable Content" — same situation as VirtualScrollCardControls1Content
// above.
export function VirtualScrollCardControls3Content(
    Component: ComponentType<any>
): ComponentType<any> {
    return withVirtualScroll("card-controls-3-scroll")(Component)
}
