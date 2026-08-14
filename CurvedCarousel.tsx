// CurvedCarousel.tsx
// Standalone Framer Code Component. Drop your Flip Card component instances
// into the "Cards" property (Array of Component Instance) — each instance
// keeps its own text/image/link overrides and native Framer interactions
// untouched. Built for a 1080x1920 portrait kiosk: one centered card with
// the neighboring cards peeking in from each edge, phone-style swipe/drag,
// tap-to-center on side cards, and looping left/right arrows.

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    cloneElement,
    isValidElement,
} from "react"
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
const TAP_DISTANCE_PX = 10
const FLICK_VELOCITY_PX_S = 500
// Fraction of one card's spacing you must drag past before a release snaps
// to the next/prev card instead of springing back to the current one.
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
    sideRotationDeg,
    sideOpacity,
    forcedVariant,
    frontVariantProp,
    onTapSide,
    onInteract,
    element,
}: {
    index: number
    count: number
    pos: MotionValue<number>
    cardWidth: number
    cardHeight: number
    spacing: number
    sideScale: number
    sideRotationDeg: number
    sideOpacity: number
    forcedVariant: string | null
    frontVariantProp: string
    onTapSide: (index: number) => void
    onInteract: () => void
    element: React.ReactNode
}) {
    // Continuous, wrapped offset: 0 = centered, -1 = one card left, +1 = one
    // card right.
    const offset = useTransform(pos, (p) => wrapDelta(index - p, count))

    const x = useTransform(offset, (o) => o * spacing)
    const scale = useTransform(offset, (o) => {
        const t = falloff(Math.abs(o))
        return 1 + (sideScale - 1) * t
    })
    const rotateY = useTransform(offset, (o) => {
        const t = falloff(Math.abs(o))
        return -Math.sign(o) * sideRotationDeg * t
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

    const child =
        forcedVariant && isValidElement(element)
            ? cloneElement(element as React.ReactElement<any>, {
                  [frontVariantProp]: forcedVariant,
              })
            : element

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
                scale,
                rotateY,
                opacity,
                zIndex,
                transformStyle: "preserve-3d",
                pointerEvents: isCentered ? "auto" : "none",
            }}
            onPointerDown={onInteract}
        >
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
                {child}
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
// Arrow button
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
                position: "absolute",
                top: "50%",
                [direction === "left" ? "left" : "right"]: 12,
                transform: "translateY(-50%)",
                width: size,
                height: size,
                borderRadius: "50%",
                background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 200,
                userSelect: "none",
                touchAction: "none",
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
    spacing: number
    sideScale: number
    sideRotationDeg: number
    sideOpacity: number
    dragEnabled: boolean
    showArrows: boolean
    arrowSize: number
    arrowColor: string
    arrowBackground: string
    autoRevertEnabled: boolean
    autoRevertSeconds: number
    frontVariantProp: string
    frontVariantValue: string
    style?: React.CSSProperties
}

export default function CurvedCarousel(props: CurvedCarouselProps) {
    const {
        cards = [],
        cardWidth,
        cardHeight,
        spacing,
        sideScale,
        sideRotationDeg,
        sideOpacity,
        dragEnabled,
        showArrows,
        arrowSize,
        arrowColor,
        arrowBackground,
        autoRevertEnabled,
        autoRevertSeconds,
        frontVariantProp,
        frontVariantValue,
        style,
    } = props

    const count = cards.length
    // The single source of truth for layout: a continuous "which index is
    // centered" value. Drag moves it directly; snapping/arrows animate it.
    const pos = useMotionValue(0)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Lightweight, debounced-to-integer view of `pos`, used only for side
    // effects (idle timer bookkeeping) — never fed back into card layout.
    const [centerIndexState, setCenterIndexState] = useState(0)
    useEffect(() => {
        const unsub = pos.on("change", (p) => {
            const rounded = mod(Math.round(p), count)
            setCenterIndexState((prev) => (prev === rounded ? prev : rounded))
        })
        return unsub
    }, [pos, count])

    // index -> forced variant value (only set for one render pulse)
    const [forcedVariants, setForcedVariants] = useState<Record<number, string>>({})

    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const revertClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastCenterRef = useRef(centerIndexState)

    const revertCard = useCallback(
        (index: number) => {
            if (!autoRevertEnabled || index < 0 || index >= count) return
            setForcedVariants((prev) => ({ ...prev, [index]: frontVariantValue }))
            if (revertClearTimer.current) clearTimeout(revertClearTimer.current)
            // Release the override on the next tick so the card's own
            // internal tap-driven variant control resumes normally.
            revertClearTimer.current = setTimeout(() => {
                setForcedVariants((prev) => {
                    const next = { ...prev }
                    delete next[index]
                    return next
                })
            }, 50)
        },
        [autoRevertEnabled, count, frontVariantValue]
    )

    const scheduleIdleRevert = useCallback(
        (index: number) => {
            if (!autoRevertEnabled) return
            if (idleTimer.current) clearTimeout(idleTimer.current)
            idleTimer.current = setTimeout(() => {
                revertCard(index)
            }, Math.max(1, autoRevertSeconds) * 1000)
        },
        [autoRevertEnabled, autoRevertSeconds, revertCard]
    )

    // Reset the idle timer whenever the centered card changes, and force
    // whichever card just lost focus back to its front face immediately.
    useEffect(() => {
        if (lastCenterRef.current !== centerIndexState) {
            revertCard(lastCenterRef.current)
            lastCenterRef.current = centerIndexState
        }
        scheduleIdleRevert(centerIndexState)
        return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current)
        }
    }, [centerIndexState, scheduleIdleRevert, revertCard])

    const onInteract = useCallback(() => {
        scheduleIdleRevert(centerIndexState)
    }, [centerIndexState, scheduleIdleRevert])

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
                    onInteract()
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
        [count, dragEnabled, endDrag, onInteract, pos, spacing]
    )

    const onTapSide = useCallback(
        (index: number) => {
            onInteract()
            goTo(index)
        },
        [goTo, onInteract]
    )

    return (
        <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                touchAction: dragEnabled ? "pan-y" : "auto",
                perspective: 1400,
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
                    sideRotationDeg={sideRotationDeg}
                    sideOpacity={sideOpacity}
                    forcedVariant={forcedVariants[index] ?? null}
                    frontVariantProp={frontVariantProp}
                    onTapSide={onTapSide}
                    onInteract={onInteract}
                    element={element}
                />
            ))}

            {showArrows && count > 1 && (
                <>
                    <ArrowButton
                        direction="left"
                        onClick={() => {
                            onInteract()
                            step(-1)
                        }}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                    <ArrowButton
                        direction="right"
                        onClick={() => {
                            onInteract()
                            step(1)
                        }}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                </>
            )}
        </div>
    )
}

CurvedCarousel.defaultProps = {
    cards: [],
    cardWidth: 640,
    cardHeight: 900,
    spacing: 560,
    sideScale: 0.82,
    sideRotationDeg: 20,
    sideOpacity: 0.55,
    dragEnabled: true,
    showArrows: true,
    arrowSize: 56,
    arrowColor: "#FFFFFF",
    arrowBackground: "rgba(0,0,0,0.35)",
    autoRevertEnabled: true,
    autoRevertSeconds: 6,
    frontVariantProp: "variant",
    frontVariantValue: "Front",
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
        defaultValue: 640,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        min: 100,
        max: 1920,
        step: 1,
        defaultValue: 900,
    },
    spacing: {
        type: ControlType.Number,
        title: "Side Spacing",
        min: 0,
        max: 1080,
        step: 1,
        defaultValue: 560,
        description: "Distance from center to a side card. Lower = more peek.",
    },
    sideScale: {
        type: ControlType.Number,
        title: "Side Scale",
        min: 0.3,
        max: 1,
        step: 0.01,
        defaultValue: 0.82,
    },
    sideRotationDeg: {
        type: ControlType.Number,
        title: "Side Rotation",
        min: 0,
        max: 60,
        step: 1,
        defaultValue: 20,
    },
    sideOpacity: {
        type: ControlType.Number,
        title: "Side Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.55,
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
    autoRevertEnabled: {
        type: ControlType.Boolean,
        title: "Auto Flip-Back",
        defaultValue: true,
    },
    autoRevertSeconds: {
        type: ControlType.Number,
        title: "Idle Seconds",
        min: 1,
        max: 120,
        step: 1,
        defaultValue: 6,
        hidden: (props) => !props.autoRevertEnabled,
    },
    frontVariantProp: {
        type: ControlType.String,
        title: "Variant Prop",
        defaultValue: "variant",
        description: "The prop name your Flip Card uses for its Variant control.",
        hidden: (props) => !props.autoRevertEnabled,
    },
    frontVariantValue: {
        type: ControlType.String,
        title: "Front Variant",
        defaultValue: "Front",
        description: "Exact Variant name for the un-flipped face.",
        hidden: (props) => !props.autoRevertEnabled,
    },
})
