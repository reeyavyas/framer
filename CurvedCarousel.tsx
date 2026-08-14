// CurvedCarousel.tsx
// Standalone Framer Code Component. Drop your Flip Card component instances
// into the "Cards" property (Array of Component Instance) — each instance
// keeps its own text/image/link overrides and native Framer interactions
// untouched. Cards sit in a shallow, non-overlapping fan/arc (2D tilt + a
// bit of vertical droop, no 3D perspective), phone-style swipe/drag, and a
// centered arrow row below the cards.

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
    motion,
    useMotionValue,
    useTransform,
    animate,
    MotionValue,
} from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

// Wraps x into the shortest signed distance around a ring of size N, e.g.
// with N=7, wrapDelta(6) === -1 (one step back beats six steps forward).
function wrapDelta(x: number, count: number) {
    if (count <= 0) return 0
    let d = x % count
    if (d > count / 2) d -= count
    if (d < -count / 2) d += count
    return d
}

function mod(n: number, m: number) {
    if (m <= 0) return 0
    return ((n % m) + m) % m
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

// Piecewise-linear interpolation: 0 at center, 1 at |offset| === 1, held
// flat beyond that (so a 3rd/4th card off to the side doesn't keep scaling).
function falloff(absOffset: number) {
    return clamp(absOffset, 0, 1)
}

// Movement (px) below which a release counts as a tap rather than a drag.
// Touchscreens jitter more than a mouse, so this needs real slack — too
// tight and a plain tap on the centered card gets misread as a micro-drag,
// which both eats the tap's click and plays a pointless snap-back "shift".
const TAP_DISTANCE_PX = 20
const FLICK_VELOCITY_PX_S = 500
// Fraction of one card-to-card spacing you must drag past before a release
// snaps to the next/prev card instead of springing back to the current one.
const SNAP_THRESHOLD = 0.3

const SPRING = { type: "spring" as const, stiffness: 300, damping: 32 }

// ------------------------------------------------------------------
// Single card. Position/scale/rotation/opacity are derived entirely from
// `pos` — the single continuous motion value representing "which index is
// currently centered" — so there's only ever one source of truth for
// layout. Nothing here is reset or reconciled against React state, which
// avoids any one-frame flash when a drag/snap completes.
// ------------------------------------------------------------------

function CarouselCard({
    index,
    count,
    pos,
    cardWidth,
    cardHeight,
    spacing,
    sideScale,
    fanRotationDeg,
    curveDepth,
    sideOpacity,
    onTapSide,
    element,
}: {
    index: number
    count: number
    pos: MotionValue<number>
    cardWidth: number
    cardHeight: number
    spacing: number
    sideScale: number
    fanRotationDeg: number
    curveDepth: number
    sideOpacity: number
    onTapSide: (index: number) => void
    element: React.ReactNode
}) {
    // Continuous, wrapped offset: 0 = centered, -1 = one card left, +1 = one
    // card right.
    const offset = useTransform(pos, (p) => wrapDelta(index - p, count))

    const x = useTransform(offset, (o) => o * spacing)
    const y = useTransform(offset, (o) => curveDepth * falloff(Math.abs(o)))
    const scale = useTransform(offset, (o) => {
        const t = falloff(Math.abs(o))
        return 1 + (sideScale - 1) * t
    })
    // In-plane tilt only (no 3D perspective) — a flat fan, like a spread
    // hand of cards, so there's no foreshortening or backface weirdness.
    const rotateZ = useTransform(offset, (o) => {
        const t = falloff(Math.abs(o))
        return Math.sign(o) * fanRotationDeg * t
    })
    const opacity = useTransform(offset, (o) => {
        const abs = Math.abs(o)
        if (abs >= 1.6) return 0
        const t = falloff(abs)
        const base = 1 + (sideOpacity - 1) * t
        // fade the rest of the way out once a card is more than one slot away
        if (abs <= 1) return base
        return base * clamp(1 - (abs - 1) / 0.6, 0, 1)
    })
    const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10))
    const [isCentered, setIsCentered] = useState(() => Math.abs(offset.get()) < 0.05)

    useEffect(() => {
        const unsub = offset.on("change", (o) => {
            const nowCentered = Math.abs(o) < 0.05
            setIsCentered((prev) => (prev === nowCentered ? prev : nowCentered))
        })
        return unsub
    }, [offset])

    return (
        <motion.div
            data-carousel-card={index}
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                marginLeft: -cardWidth / 2,
                marginTop: -cardHeight / 2,
                width: cardWidth,
                height: cardHeight,
                x,
                y,
                scale,
                rotateZ,
                opacity,
                zIndex,
                pointerEvents: isCentered ? "auto" : "none",
            }}
        >
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
                {element}
                {!isCentered && (
                    <div
                        data-carousel-card={index}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onTapSide(index)
                        }}
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 5,
                            cursor: "pointer",
                            pointerEvents: "auto",
                        }}
                    />
                )}
            </div>
        </motion.div>
    )
}

// ------------------------------------------------------------------
// Arrow button — a plain flex child; the parent row handles positioning.
// ------------------------------------------------------------------

function ArrowButton({
    direction,
    onClick,
    size,
    color,
    background,
}: {
    direction: "left" | "right"
    onClick: () => void
    size: number
    color: string
    background: string
}) {
    return (
        <div
            onClick={onClick}
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                userSelect: "none",
                touchAction: "none",
                flexShrink: 0,
            }}
        >
            <svg
                width={size * 0.4}
                height={size * 0.4}
                viewBox="0 0 24 24"
                fill="none"
                style={{
                    transform: direction === "left" ? "rotate(180deg)" : undefined,
                }}
            >
                <path
                    d="M9 6l6 6-6 6"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    )
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export interface CurvedCarouselProps {
    cards: React.ReactNode[]
    cardWidth: number
    cardHeight: number
    cardGap: number
    sideScale: number
    fanRotationDeg: number
    curveDepth: number
    sideOpacity: number
    dragEnabled: boolean
    showArrows: boolean
    arrowSize: number
    arrowGap: number
    arrowBottomOffset: number
    arrowColor: string
    arrowBackground: string
    style?: React.CSSProperties
}

export default function CurvedCarousel(props: CurvedCarouselProps) {
    const {
        cards = [],
        cardWidth,
        cardHeight,
        cardGap,
        sideScale,
        fanRotationDeg,
        curveDepth,
        sideOpacity,
        dragEnabled,
        showArrows,
        arrowSize,
        arrowGap,
        arrowBottomOffset,
        arrowColor,
        arrowBackground,
        style,
    } = props

    const count = cards.length

    // Center-to-center distance between adjacent cards, derived (not
    // hand-picked) so a side card's near edge can never overlap the center
    // card. A tilted rectangle's bounding box is wider than its unrotated
    // one (its diagonal swings out), so the "half-width" used here has to
    // be the true rotated bounding half-width, not just cardWidth*sideScale
    // — otherwise the fan tilt alone can eat tens of px of the intended gap.
    const fanRad = (fanRotationDeg * Math.PI) / 180
    const sideBoundingHalfWidth =
        (cardWidth * sideScale * Math.abs(Math.cos(fanRad)) +
            cardHeight * sideScale * Math.abs(Math.sin(fanRad))) /
        2
    const spacing = cardWidth / 2 + sideBoundingHalfWidth + cardGap

    // The single source of truth for layout: a continuous "which index is
    // centered" value. Drag moves it directly; snapping/arrows animate it.
    const pos = useMotionValue(0)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Lightweight, debounced-to-integer view of `pos`. Only used so arrow
    // taps know which index they're stepping from — never fed back into
    // card layout, so it can't desync the animation.
    const [centerIndexState, setCenterIndexState] = useState(0)
    useEffect(() => {
        const unsub = pos.on("change", (p) => {
            const rounded = mod(Math.round(p), count)
            setCenterIndexState((prev) => (prev === rounded ? prev : rounded))
        })
        return unsub
    }, [pos, count])

    const goTo = useCallback(
        (targetIndex: number) => {
            if (count <= 1) return
            const target = mod(targetIndex, count)
            const delta = wrapDelta(target - pos.get(), count)
            animate(pos, pos.get() + delta, {
                ...SPRING,
                onComplete: () => {
                    // Fold back into [0, count) — numerically identical for
                    // every card's wrapped offset, so this causes no visual
                    // change. Just keeps the float bounded over long uptime.
                    pos.set(mod(pos.get(), count))
                },
            })
        },
        [count, pos]
    )

    const step = useCallback(
        (dir: 1 | -1) => {
            goTo(centerIndexState + dir)
        },
        [centerIndexState, goTo]
    )

    // ---------------- Drag / swipe (raw pointer events, phone-style) ----------------

    const dragState = useRef({
        pointerId: -1,
        startX: 0,
        startY: 0,
        startPos: 0,
        lastX: 0,
        lastT: 0,
        velocity: 0,
        moved: false,
    })
    const suppressClickRef = useRef(false)

    useEffect(() => {
        // Capture-phase click suppressor: after a real drag, swallow the
        // synthetic click so it doesn't trigger whatever is under the
        // pointer at release (e.g. a button on a card that just slid past).
        const onClickCapture = (e: MouseEvent) => {
            if (suppressClickRef.current) {
                e.preventDefault()
                e.stopPropagation()
                suppressClickRef.current = false
            }
        }
        window.addEventListener("click", onClickCapture, true)
        return () => window.removeEventListener("click", onClickCapture, true)
    }, [])

    const endDrag = useCallback(() => {
        const s = dragState.current
        // pos DECREASES as the finger drags right (revealing the previous
        // card, like flipping back a page), so dragging/flicking left
        // (pos increasing) means "go to next".
        const dragged = pos.get() - s.startPos
        const flick = Math.abs(s.velocity) > FLICK_VELOCITY_PX_S

        let stepDelta = 0
        if (flick) {
            stepDelta = s.velocity > 0 ? -1 : 1
        } else if (Math.abs(dragged) >= SNAP_THRESHOLD) {
            stepDelta = dragged < 0 ? -1 : 1
        }

        goTo(Math.round(s.startPos) + stepDelta)
    }, [goTo, pos])

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!dragEnabled || count <= 1) return
            const s = dragState.current
            s.pointerId = e.pointerId
            s.startX = e.clientX
            s.startY = e.clientY
            s.startPos = pos.get()
            s.lastX = e.clientX
            s.lastT = performance.now()
            s.velocity = 0
            s.moved = false

            const onMove = (moveEvent: PointerEvent) => {
                if (moveEvent.pointerId !== s.pointerId) return
                const dx = moveEvent.clientX - s.startX
                const dy = moveEvent.clientY - s.startY

                if (!s.moved) {
                    if (Math.abs(dx) < TAP_DISTANCE_PX && Math.abs(dy) < TAP_DISTANCE_PX)
                        return
                    // Ignore mostly-vertical gestures so the kiosk can still
                    // scroll/tap normally on a mostly-horizontal carousel.
                    if (Math.abs(dy) > Math.abs(dx) * 1.2) return
                    s.moved = true
                }

                const now = performance.now()
                const dt = Math.max(1, now - s.lastT)
                s.velocity = ((moveEvent.clientX - s.lastX) / dt) * 1000
                s.lastX = moveEvent.clientX
                s.lastT = now

                pos.set(s.startPos - dx / spacing)
            }

            const onUp = (upEvent: PointerEvent) => {
                if (upEvent.pointerId !== s.pointerId) return
                cleanup()
                if (s.moved) {
                    suppressClickRef.current = true
                    endDrag()
                }
            }

            const cleanup = () => {
                window.removeEventListener("pointermove", onMove)
                window.removeEventListener("pointerup", onUp)
                window.removeEventListener("pointercancel", onUp)
            }

            window.addEventListener("pointermove", onMove)
            window.addEventListener("pointerup", onUp)
            window.addEventListener("pointercancel", onUp)
        },
        [count, dragEnabled, endDrag, pos, spacing]
    )

    const onTapSide = useCallback(
        (index: number) => {
            goTo(index)
        },
        [goTo]
    )

    return (
        <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflowX: "hidden",
                overflowY: "visible",
                touchAction: dragEnabled ? "pan-y" : "auto",
                ...style,
            }}
        >
            {cards.map((element, index) => (
                <CarouselCard
                    key={index}
                    index={index}
                    count={count}
                    pos={pos}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    spacing={spacing}
                    sideScale={sideScale}
                    fanRotationDeg={fanRotationDeg}
                    curveDepth={curveDepth}
                    sideOpacity={sideOpacity}
                    onTapSide={onTapSide}
                    element={element}
                />
            ))}

            {showArrows && count > 1 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: arrowBottomOffset,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: arrowGap,
                        zIndex: 200,
                    }}
                >
                    <ArrowButton
                        direction="left"
                        onClick={() => step(-1)}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                    <ArrowButton
                        direction="right"
                        onClick={() => step(1)}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                </div>
            )}
        </div>
    )
}

CurvedCarousel.defaultProps = {
    cards: [],
    cardWidth: 734,
    cardHeight: 1050,
    cardGap: 20,
    sideScale: 0.82,
    fanRotationDeg: 8,
    curveDepth: 36,
    sideOpacity: 1,
    dragEnabled: true,
    showArrows: true,
    arrowSize: 56,
    arrowGap: 24,
    arrowBottomOffset: 24,
    arrowColor: "#FFFFFF",
    arrowBackground: "rgba(0,0,0,0.35)",
}

addPropertyControls(CurvedCarousel, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: {
            type: ControlType.ComponentInstance,
        },
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        min: 100,
        max: 1080,
        step: 1,
        defaultValue: 734,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        min: 100,
        max: 1920,
        step: 1,
        defaultValue: 1050,
        description: "Resting height. The card can grow taller mid-flip — vertical overflow isn't clipped, only horizontal.",
    },
    cardGap: {
        type: ControlType.Number,
        title: "Card Gap",
        min: -100,
        max: 400,
        step: 1,
        defaultValue: 20,
        description: "Guaranteed empty space between the center card's edge and a side card's near edge. Lower = more peek, but never overlaps.",
    },
    sideScale: {
        type: ControlType.Number,
        title: "Side Scale",
        min: 0.3,
        max: 1,
        step: 0.01,
        defaultValue: 0.82,
    },
    fanRotationDeg: {
        type: ControlType.Number,
        title: "Fan Tilt",
        min: 0,
        max: 45,
        step: 1,
        defaultValue: 8,
        description: "Flat, in-plane tilt for side cards — like a spread hand of cards, not a 3D turn.",
    },
    curveDepth: {
        type: ControlType.Number,
        title: "Arc Depth",
        min: 0,
        max: 200,
        step: 1,
        defaultValue: 36,
        description: "How far side cards drop below center, for the shallow arc.",
    },
    sideOpacity: {
        type: ControlType.Number,
        title: "Side Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    dragEnabled: {
        type: ControlType.Boolean,
        title: "Drag/Swipe",
        defaultValue: true,
    },
    showArrows: {
        type: ControlType.Boolean,
        title: "Arrows",
        defaultValue: true,
    },
    arrowSize: {
        type: ControlType.Number,
        title: "Arrow Size",
        min: 24,
        max: 160,
        step: 1,
        defaultValue: 56,
        hidden: (props) => !props.showArrows,
    },
    arrowGap: {
        type: ControlType.Number,
        title: "Arrow Gap",
        min: 0,
        max: 200,
        step: 1,
        defaultValue: 24,
        hidden: (props) => !props.showArrows,
    },
    arrowBottomOffset: {
        type: ControlType.Number,
        title: "Arrow Bottom",
        min: 0,
        max: 400,
        step: 1,
        defaultValue: 24,
        description: "Distance from the bottom of the frame. Make sure the frame is tall enough to fit the cards plus this row beneath them.",
        hidden: (props) => !props.showArrows,
    },
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow Icon",
        defaultValue: "#FFFFFF",
        hidden: (props) => !props.showArrows,
    },
    arrowBackground: {
        type: ControlType.Color,
        title: "Arrow BG",
        defaultValue: "rgba(0,0,0,0.35)",
        hidden: (props) => !props.showArrows,
    },
})
