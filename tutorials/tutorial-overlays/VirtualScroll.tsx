import * as React from "react"
import type { ComponentType } from "react"
import { motion, useMotionValue } from "framer-motion"

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
 * contention; anything less than real-time costs a visible (if
 * brief) backward slip. There's no way to get both from native
 * scroll. Taking over scrolling entirely removes the fight instead
 * of refereeing it: touch/wheel input updates a single owned value,
 * clamped the instant it's set, with nothing else ever touching it.
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

export interface VirtualScrollHandle {
    // 0-100, how far through the scrollable range the content
    // currently is. Used by TutorialOverlay's scrollAdvancesStep.
    getPercent(): number
    // Locks the floor at the CURRENT position — used by
    // TutorialOverlay's lockScrollWhileActive the moment that step
    // engages. Position can then never go below this again while the
    // container stays mounted (until raiseFloor is called again from
    // a later step, if ever).
    lockFloorHere(): void
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
            const dragRef = React.useRef<{
                startY: number
                startPos: number
            } | null>(null)
            const listenersRef = React.useRef(new Set<() => void>())

            const setPos = React.useCallback(
                (v: number) => {
                    const clamped = Math.min(
                        Math.max(v, floorRef.current),
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
                registry.set(id, {
                    getPercent: () =>
                        maxRef.current > 0
                            ? (posRef.current / maxRef.current) * 100
                            : 100,
                    lockFloorHere: () => {
                        floorRef.current = posRef.current
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
                })
                return () => {
                    registry.delete(id)
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
                function onWheel(e: WheelEvent) {
                    e.preventDefault()
                    setPos(posRef.current + e.deltaY)
                }
                function onTouchStart(e: TouchEvent) {
                    dragRef.current = {
                        startY: e.touches[0].clientY,
                        startPos: posRef.current,
                    }
                }
                function onTouchMove(e: TouchEvent) {
                    if (!dragRef.current) return
                    e.preventDefault()
                    const deltaY =
                        dragRef.current.startY - e.touches[0].clientY
                    setPos(dragRef.current.startPos + deltaY)
                }
                function onTouchEnd() {
                    dragRef.current = null
                }
                container.addEventListener("wheel", onWheel, {
                    passive: false,
                })
                container.addEventListener("touchstart", onTouchStart, {
                    passive: true,
                })
                container.addEventListener("touchmove", onTouchMove, {
                    passive: false,
                })
                container.addEventListener("touchend", onTouchEnd, {
                    passive: true,
                })
                return () => {
                    container.removeEventListener("wheel", onWheel)
                    container.removeEventListener(
                        "touchstart",
                        onTouchStart
                    )
                    container.removeEventListener("touchmove", onTouchMove)
                    container.removeEventListener("touchend", onTouchEnd)
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
                        overscrollBehavior: "contain",
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
