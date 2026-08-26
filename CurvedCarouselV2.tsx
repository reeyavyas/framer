// CurvedCarouselV2.tsx
// Standalone Framer Code Component. Drop your Flip Card component instances
// into the "Cards" property (Array of Component Instance) — each instance
// keeps its own text/image/link overrides and native Framer interactions
// untouched. Cards are identical size with a slight tilt/droop toward the
// edges, sitting immediately adjacent to each other. The whole stack
// (cards, then a gap, then the arrow row) is anchored from the top of the
// frame — not vertically centered — so its position is predictable and the
// frame only needs to be as tall as the stack actually is. Horizontal
// clipping is done with clip-path (not overflow) specifically so it can
// clip left/right while leaving vertical completely unclipped — the two
// overflow-x/overflow-y CSS properties can't do that independently once
// one of them isn't "visible", the other silently downgrades from
// "visible" to "auto" and both clips *and* shows a scrollbar. Plus
// phone-style swipe/drag and optional autoplay that stops the moment the
// carousel is touched.

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

// Below `freeZone` (in card-units), a drag tracks the finger exactly 1:1 —
// same as before. Beyond it, only `resistance` of the extra movement
// actually counts, so a long/fast drag can't carry `pos` far past what a
// release would ever honor (navigation is always capped to one card per
// gesture). Without this, a big drag overshoots and then has to spring
// backward on release to land just one card past the start — which reads
// as the carousel "forcing you back". Flicks are untouched: velocity is
// measured from raw pointer movement, not this resisted position.
function applyDragResistance(delta: number, freeZone: number, resistance: number) {
    const sign = Math.sign(delta)
    const abs = Math.abs(delta)
    if (abs <= freeZone) return delta
    const excess = abs - freeZone
    return sign * (freeZone + excess * resistance)
}

const FLICK_VELOCITY_PX_S = 500
// Fraction of one card-to-card spacing you must drag past before a release
// snaps to the next/prev card instead of springing back to the current one.
const SNAP_THRESHOLD = 0.3

const SPRING = { type: "spring" as const, stiffness: 300, damping: 32 }

// ------------------------------------------------------------------
// Single card. Position/opacity are derived entirely from `pos` — the
// single continuous motion value representing "which index is currently
// centered" — so there's only ever one source of truth for layout.
// Nothing here is reset or reconciled against React state, which avoids
// any one-frame flash when a drag/snap completes. Every card is the same
// size — only a slight in-plane tilt, a small vertical droop, and opacity
// change with distance from center.
// ------------------------------------------------------------------

function CarouselCard({
    index,
    count,
    pos,
    cardWidth,
    cardHeight,
    topOffset,
    spacing,
    tiltDeg,
    curveDepth,
    sideOpacity,
    isSettled,
    frontVariantProp,
    frontVariantValue,
    entranceEnabled,
    entranceDelay,
    entranceDuration,
    entranceStagger,
    entranceDistanceY,
    entranceScale,
    entranceEase,
    onTapSide,
    element,
}: {
    index: number
    count: number
    pos: MotionValue<number>
    cardWidth: number
    cardHeight: number
    topOffset: number
    spacing: number
    tiltDeg: number
    curveDepth: number
    sideOpacity: number
    isSettled: boolean
    frontVariantProp: string
    frontVariantValue: string
    entranceEnabled: boolean
    entranceDelay: number
    entranceDuration: number
    entranceStagger: number
    entranceDistanceY: number
    entranceScale: number
    entranceEase: string
    onTapSide: (index: number) => void
    element: React.ReactNode
}) {
    // Continuous, wrapped offset: 0 = centered, -1 = one card left, +1 = one
    // card right.
    const offset = useTransform(pos, (p) => wrapDelta(index - p, count))

    // Opening animation: 0 = this card's entrance start state, 1 = its
    // normal resting state. Staggered by this card's distance from center
    // in the INITIAL layout (pos starts at 0, so that's just this card's
    // index wrapped) so the center card leads and the fan opens outward.
    // Re-runs whenever the entrance controls themselves change — so tuning
    // delay/duration/etc. in the property panel replays it for instant
    // feedback — but on a real (published) mount those props are stable,
    // so it plays exactly once, on arrival.
    const entranceT = useMotionValue(entranceEnabled ? 0 : 1)
    useEffect(() => {
        if (!entranceEnabled) {
            entranceT.set(1)
            return
        }
        entranceT.set(0)
        const initialAbsOffset = Math.abs(wrapDelta(index, count))
        const delayMs = (entranceDelay + initialAbsOffset * entranceStagger) * 1000
        const timer = setTimeout(() => {
            animate(entranceT, 1, {
                duration: entranceDuration,
                ease: entranceEase as any,
            })
        }, delayMs)
        return () => clearTimeout(timer)
    }, [
        entranceEnabled,
        entranceDelay,
        entranceDuration,
        entranceStagger,
        entranceEase,
        index,
        count,
        entranceT,
    ])

    const x = useTransform(offset, (o) => o * spacing)
    const y = useTransform([offset, entranceT], (latest) => {
        const [o, t] = latest as number[]
        const target = curveDepth * falloff(Math.abs(o))
        const start = target + entranceDistanceY
        return start + (target - start) * t
    })
    // In-plane tilt only (no 3D perspective) — a slight fan, not a size
    // change or a 3D turn. Starts flat and rotates into its tilt as part
    // of the entrance, rather than starting pre-tilted.
    const rotateZ = useTransform([offset, entranceT], (latest) => {
        const [o, t] = latest as number[]
        const target = Math.sign(o) * tiltDeg * falloff(Math.abs(o))
        return target * t
    })
    // Flat dimming once a card is off-center — deliberately NOT fading
    // further to zero past the immediate neighbor. However many cards end
    // up visibly peeking in is left entirely to the container's actual
    // width (clip-path hard edge + the mask-image soft edge fade below);
    // that's what makes a wider frame naturally show more cards with no
    // breakpoint-detection logic needed here at all.
    const opacity = useTransform([offset, entranceT], (latest) => {
        const [o, t] = latest as number[]
        const target = 1 + (sideOpacity - 1) * falloff(Math.abs(o))
        return target * t
    })
    // Only meaningful during the entrance — settles at 1 (no permanent
    // shrink) once entranceT reaches 1, same as every other resting value.
    const scale = useTransform(entranceT, (t) => entranceScale + (1 - entranceScale) * t)
    const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10))
    const [isCentered, setIsCentered] = useState(() => Math.abs(offset.get()) < 0.05)

    useEffect(() => {
        const unsub = offset.on("change", (o) => {
            const nowCentered = Math.abs(o) < 0.05
            setIsCentered((prev) => (prev === nowCentered ? prev : nowCentered))
        })
        return unsub
    }, [offset])

    // Bumped exactly once whenever a card transitions from centered to
    // not-centered — immediately, not gated on the whole carousel having
    // settled. Gating on "settled off-center" (isSettled && !isCentered)
    // sounds more correct but isn't reliable: swipe away from a flipped
    // card and back again fast enough, and isSettled can stay false the
    // entire time that card was off-center — it never gets a single
    // instant where it registers as "settled off-center", so the reset
    // never fires at all, and the card lands back in the center still
    // showing whatever it showed before. Triggering directly off isCentered
    // is driven purely by position, not by whether some animation happened
    // to finish, so it can't be skipped by fast/chained swiping — the
    // tradeoff is the reset can occasionally be visible mid-swipe instead
    // of only once a card is at rest off to the side.
    //
    // Many Framer variant components only read an incoming Variant prop as
    // their INITIAL state on mount, then manage variant changes internally
    // afterward — so simply passing a fresh Front value to an
    // already-mounted, already-flipped instance can be silently ignored.
    // Forcing a remount right at this transition (via `key`) makes the
    // component re-initialize from scratch with Front as its true starting
    // value, instead of trying to talk an existing instance out of
    // whatever it's already decided to show.
    const [resetKey, setResetKey] = useState(0)
    const wasCenteredRef = useRef(isCentered)
    useEffect(() => {
        if (wasCenteredRef.current && !isCentered) {
            setResetKey((k) => k + 1)
        }
        wasCenteredRef.current = isCentered
    }, [isCentered])

    // Non-centered cards can't be reached by a real tap anyway
    // (pointer-events is "none" and the overlay below only calls
    // onTapSide), so continuously forcing Front here is safe: nothing else
    // is trying to control this card's variant while it isn't centered.
    // The moment it becomes centered again, the override drops and its own
    // internal tap-driven variant control resumes untouched. `key` stays
    // the same across the centered/not-centered toggle itself — only the
    // deliberate bump above forces a fresh mount, right when it's needed.
    const child = isValidElement(element)
        ? cloneElement(
              element as React.ReactElement<any>,
              !isCentered
                  ? { key: resetKey, [frontVariantProp]: frontVariantValue }
                  : { key: resetKey }
          )
        : element

    return (
        <motion.div
            data-carousel-card={index}
            style={{
                position: "absolute",
                left: "50%",
                top: topOffset,
                marginLeft: -cardWidth / 2,
                width: cardWidth,
                height: cardHeight,
                x,
                y,
                rotateZ,
                scale,
                opacity,
                zIndex,
                // Only the truly at-rest centered card is interactive.
                // Gating on isCentered alone isn't enough: every normal
                // swipe carries a card transiently through (or near) the
                // center position on its way elsewhere, and a native click
                // synthesized at just the wrong instant during that transit
                // could land on the flip card underneath and trigger its
                // own tap-to-flip — leaving a card stuck flipped off to the
                // side that nobody meant to tap. isSettled is only true
                // when nothing is dragging or animating.
                pointerEvents: isCentered && isSettled ? "auto" : "none",
                // Any transform on an ancestor (the tilt above) makes it a
                // 3D-flattening boundary by default, collapsing descendant
                // 3D transforms into a flat plane. The flip card's own
                // rotateY flip (backface-visibility based) depends on real
                // 3D depth to hit-test its back face correctly — without
                // this, its back-face buttons stop receiving clicks even
                // though the flip still renders.
                transformStyle: "preserve-3d",
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    transformStyle: "preserve-3d",
                }}
            >
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

export interface CurvedCarouselV2Props {
    cards: React.ReactNode[]
    cardWidth: number
    cardHeight: number
    topOffset: number
    cardGap: number
    tiltDeg: number
    curveDepth: number
    sideOpacity: number
    edgeFadeWidth: number
    dragEnabled: boolean
    tapDistancePx: number
    dragFreeZone: number
    dragResistance: number
    frontVariantProp: string
    frontVariantValue: string
    entranceEnabled: boolean
    entranceDelay: number
    entranceDuration: number
    entranceStagger: number
    entranceDistanceY: number
    entranceScale: number
    entranceEase: string
    showArrows: boolean
    arrowSize: number
    arrowGap: number
    cardToArrowGap: number
    arrowColor: string
    arrowBackground: string
    autoplayEnabled: boolean
    autoplayIntervalSeconds: number
    style?: React.CSSProperties
}

export default function CurvedCarouselV2(props: CurvedCarouselV2Props) {
    const {
        cards = [],
        cardWidth,
        cardHeight,
        topOffset,
        cardGap,
        tiltDeg,
        curveDepth,
        sideOpacity,
        edgeFadeWidth,
        dragEnabled,
        tapDistancePx,
        dragFreeZone,
        dragResistance,
        frontVariantProp,
        frontVariantValue,
        entranceEnabled,
        entranceDelay,
        entranceDuration,
        entranceStagger,
        entranceDistanceY,
        entranceScale,
        entranceEase,
        showArrows,
        arrowSize,
        arrowGap,
        cardToArrowGap,
        arrowColor,
        arrowBackground,
        autoplayEnabled,
        autoplayIntervalSeconds,
        style,
    } = props

    const count = cards.length

    // Center-to-center distance between adjacent cards, derived (not
    // hand-picked) so a side card's near edge can never overlap the center
    // card. A tilted rectangle's bounding box is wider than its unrotated
    // one (its diagonal swings out), so the "half-width" used here has to
    // be the true rotated bounding half-width — otherwise the tilt alone
    // can eat into the intended gap.
    const tiltRad = (tiltDeg * Math.PI) / 180
    const sideBoundingHalfWidth =
        (cardWidth * Math.abs(Math.cos(tiltRad)) +
            cardHeight * Math.abs(Math.sin(tiltRad))) /
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

    // Arrows fade in on the same schedule as the center card (no extra
    // stagger — they're not part of the fan), so the controls arrive
    // together with the card that's actually usable first.
    const arrowEntranceT = useMotionValue(entranceEnabled ? 0 : 1)
    useEffect(() => {
        if (!entranceEnabled) {
            arrowEntranceT.set(1)
            return
        }
        arrowEntranceT.set(0)
        const timer = setTimeout(() => {
            animate(arrowEntranceT, 1, {
                duration: entranceDuration,
                ease: entranceEase as any,
            })
        }, entranceDelay * 1000)
        return () => clearTimeout(timer)
    }, [entranceEnabled, entranceDelay, entranceDuration, entranceEase, arrowEntranceT])

    // True only when nothing is dragging or animating — gates which card
    // (if any) is allowed real pointer-events, so a native click can never
    // land on a card while it's mid-transit through the center position.
    const [isSettled, setIsSettled] = useState(true)

    // Tracks whichever animation currently owns `pos`. Swiping faster than
    // a settle spring can finish means a new goTo (or a fresh drag) can
    // start while the PREVIOUS settle animation is technically still
    // running — and if that old animation is never explicitly stopped, its
    // onComplete can still fire later, at an unpredictable moment, since
    // nothing here was capturing/cancelling it. onComplete is exactly what
    // marks a card "settled off-center" and triggers its reset-to-Front —
    // so an orphaned, late-firing onComplete meant a card could pass
    // through its off-center dwell without ever actually getting reset,
    // then still show Back whenever it later cycled back to center.
    // Explicitly stopping the previous animation (stop, not letting it
    // complete) guarantees at most one animation ever drives `pos`, so
    // onComplete only ever fires for a genuinely finished settle.
    const activeAnimRef = useRef<{ stop: () => void } | null>(null)
    const stopActiveAnim = useCallback(() => {
        activeAnimRef.current?.stop()
        activeAnimRef.current = null
    }, [])

    const goTo = useCallback(
        (targetIndex: number) => {
            if (count <= 1) return
            stopActiveAnim()
            const target = mod(targetIndex, count)
            const delta = wrapDelta(target - pos.get(), count)
            setIsSettled(false)
            activeAnimRef.current = animate(pos, pos.get() + delta, {
                ...SPRING,
                onComplete: () => {
                    // Fold back into [0, count) — numerically identical for
                    // every card's wrapped offset, so this causes no visual
                    // change. Just keeps the float bounded over long uptime.
                    pos.set(mod(pos.get(), count))
                    setIsSettled(true)
                    activeAnimRef.current = null
                },
            })
        },
        [count, pos, stopActiveAnim]
    )

    const step = useCallback(
        (dir: 1 | -1) => {
            goTo(centerIndexState + dir)
        },
        [centerIndexState, goTo]
    )

    // ---------------- Autoplay: stops the instant the carousel is
    // touched (any pointerdown, an arrow tap, or a side-card tap), then
    // resumes automatically once that same interval has passed with no
    // further touches — so the kiosk keeps cycling when idle without
    // ever fighting a user who's actively interacting. ----------------

    const lastInteractionRef = useRef<number>(Date.now())
    const markInteraction = useCallback(() => {
        lastInteractionRef.current = Date.now()
    }, [])

    useEffect(() => {
        if (!autoplayEnabled || count <= 1) return
        const intervalMs = Math.max(1, autoplayIntervalSeconds) * 1000
        let timer: ReturnType<typeof setTimeout>

        const tick = () => {
            const elapsed = Date.now() - lastInteractionRef.current
            if (elapsed >= intervalMs) {
                lastInteractionRef.current = Date.now()
                step(1)
                timer = setTimeout(tick, intervalMs)
            } else {
                timer = setTimeout(tick, intervalMs - elapsed)
            }
        }

        timer = setTimeout(tick, intervalMs)
        return () => clearTimeout(timer)
    }, [autoplayEnabled, autoplayIntervalSeconds, count, step])

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
    const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Arms the suppressor for a short window instead of indefinitely. A
    // dangling "eat the next click, whenever that is" flag is dangerous:
    // if no click happens to follow the drag immediately (e.g. the browser
    // doesn't synthesize one right away on some touch stacks), the flag
    // would sit armed and silently swallow a completely unrelated later
    // click — like a deliberate tap on a card's back-face button.
    const armClickSuppression = useCallback(() => {
        suppressClickRef.current = true
        if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current)
        suppressClickTimerRef.current = setTimeout(() => {
            suppressClickRef.current = false
        }, 400)
    }, [])

    useEffect(() => {
        // Capture-phase click suppressor: after a real drag, swallow the
        // synthetic click so it doesn't trigger whatever is under the
        // pointer at release (e.g. a button on a card that just slid past).
        const onClickCapture = (e: MouseEvent) => {
            if (suppressClickRef.current) {
                e.preventDefault()
                e.stopPropagation()
                suppressClickRef.current = false
                if (suppressClickTimerRef.current) {
                    clearTimeout(suppressClickTimerRef.current)
                    suppressClickTimerRef.current = null
                }
            }
        }
        window.addEventListener("click", onClickCapture, true)
        return () => {
            window.removeEventListener("click", onClickCapture, true)
            if (suppressClickTimerRef.current) clearTimeout(suppressClickTimerRef.current)
        }
    }, [])

    // Returns whether a real navigation happened, so the caller knows
    // whether to arm click suppression at all.
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

        if (stepDelta === 0) {
            // Not a real navigation — this was tap jitter that happened to
            // cross the drag deadzone, not an intentional swipe. Snap back
            // instantly (the drift is always tiny here, so this is
            // imperceptible) and restore settled state immediately, with
            // no animation and no click suppression — otherwise a jittery
            // tap on a button would eat its own click via the exact
            // machinery meant to protect against real drags.
            pos.set(Math.round(s.startPos))
            setIsSettled(true)
            return false
        }

        goTo(Math.round(s.startPos) + stepDelta)
        return true
    }, [goTo, pos])

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            markInteraction()
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
                    if (Math.abs(dx) < tapDistancePx && Math.abs(dy) < tapDistancePx)
                        return
                    // Ignore mostly-vertical gestures so the kiosk can still
                    // scroll/tap normally on a mostly-horizontal carousel.
                    if (Math.abs(dy) > Math.abs(dx) * 1.2) return
                    s.moved = true
                    setIsSettled(false)
                    // Cancel any settle animation still finishing from a
                    // previous swipe, so this drag has sole control of
                    // `pos` and that old animation's onComplete can't fire
                    // later at a stale, unpredictable moment.
                    stopActiveAnim()
                }

                const now = performance.now()
                const dt = Math.max(1, now - s.lastT)
                s.velocity = ((moveEvent.clientX - s.lastX) / dt) * 1000
                s.lastX = moveEvent.clientX
                s.lastT = now

                const rawDelta = -dx / spacing
                pos.set(s.startPos + applyDragResistance(rawDelta, dragFreeZone, dragResistance))
            }

            const onUp = (upEvent: PointerEvent) => {
                if (upEvent.pointerId !== s.pointerId) return
                cleanup()
                if (s.moved) {
                    const navigated = endDrag()
                    if (navigated) armClickSuppression()
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
        [
            armClickSuppression,
            count,
            dragEnabled,
            dragFreeZone,
            dragResistance,
            endDrag,
            markInteraction,
            pos,
            spacing,
            stopActiveAnim,
            tapDistancePx,
        ]
    )

    const onTapSide = useCallback(
        (index: number) => {
            markInteraction()
            goTo(index)
        },
        [goTo, markInteraction]
    )

    return (
        <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Clip left/right at this element's own edges while leaving
                // top/bottom effectively unbounded (huge negative inset), so
                // a mid-flip card that grows taller is never cropped. See
                // the file-header comment for why this isn't overflowX/Y.
                clipPath: "inset(-100vh 0px -100vh 0px)",
                WebkitClipPath: "inset(-100vh 0px -100vh 0px)",
                // Soft edge fade layered on top of the hard clip above.
                // This — combined with side cards no longer being forced to
                // zero opacity past the immediate neighbor — is also what
                // makes wider frames show more peeking cards automatically:
                // there's simply more room before hitting this fade zone,
                // with no breakpoint/container-width logic needed.
                //
                // mask-image, unlike the clip-path trick above, sizes
                // itself to the element's own box in BOTH directions by
                // default — so without an explicit oversized mask-size, it
                // would silently clip a mid-flip card that grows taller
                // than the box, the same bug the clip-path was written to
                // avoid. Give it a much taller canvas than the box, centered
                // on it, so it only ever constrains horizontally.
                maskImage: `linear-gradient(to right, transparent 0, black ${edgeFadeWidth}px, black calc(100% - ${edgeFadeWidth}px), transparent 100%)`,
                WebkitMaskImage: `linear-gradient(to right, transparent 0, black ${edgeFadeWidth}px, black calc(100% - ${edgeFadeWidth}px), transparent 100%)`,
                maskSize: "100% 300vh",
                WebkitMaskSize: "100% 300vh",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
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
                    topOffset={topOffset}
                    spacing={spacing}
                    tiltDeg={tiltDeg}
                    curveDepth={curveDepth}
                    sideOpacity={sideOpacity}
                    isSettled={isSettled}
                    frontVariantProp={frontVariantProp}
                    frontVariantValue={frontVariantValue}
                    entranceEnabled={entranceEnabled}
                    entranceDelay={entranceDelay}
                    entranceDuration={entranceDuration}
                    entranceStagger={entranceStagger}
                    entranceDistanceY={entranceDistanceY}
                    entranceScale={entranceScale}
                    entranceEase={entranceEase}
                    onTapSide={onTapSide}
                    element={element}
                />
            ))}

            {showArrows && count > 1 && (
                <motion.div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: topOffset + cardHeight + cardToArrowGap,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: arrowGap,
                        zIndex: 200,
                        opacity: arrowEntranceT,
                    }}
                >
                    <ArrowButton
                        direction="left"
                        onClick={() => {
                            markInteraction()
                            step(-1)
                        }}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                    <ArrowButton
                        direction="right"
                        onClick={() => {
                            markInteraction()
                            step(1)
                        }}
                        size={arrowSize}
                        color={arrowColor}
                        background={arrowBackground}
                    />
                </motion.div>
            )}
        </div>
    )
}

CurvedCarouselV2.defaultProps = {
    cards: [],
    cardWidth: 734,
    cardHeight: 1050,
    topOffset: 0,
    cardGap: 8,
    tiltDeg: 4,
    curveDepth: 0,
    sideOpacity: 0.5,
    edgeFadeWidth: 120,
    dragEnabled: true,
    tapDistancePx: 28,
    dragFreeZone: 0.6,
    dragResistance: 0.35,
    frontVariantProp: "variant",
    frontVariantValue: "Front",
    entranceEnabled: true,
    entranceDelay: 0.2,
    entranceDuration: 0.6,
    entranceStagger: 0.08,
    entranceDistanceY: 60,
    entranceScale: 0.85,
    entranceEase: "easeOut",
    showArrows: true,
    arrowSize: 56,
    arrowGap: 24,
    cardToArrowGap: 40,
    arrowColor: "#FFFFFF",
    arrowBackground: "rgba(0,0,0,0.35)",
    autoplayEnabled: false,
    autoplayIntervalSeconds: 5,
}

addPropertyControls(CurvedCarouselV2, {
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
        description: "Resting height. The card can grow taller mid-flip — vertical is never clipped, only horizontal.",
    },
    topOffset: {
        type: ControlType.Number,
        title: "Top Offset",
        min: 0,
        max: 800,
        step: 1,
        defaultValue: 0,
        description: "Distance from the top of the frame to the top of the cards. The frame just needs to be at least Top Offset + Card Height + Card-Arrow Gap + Arrow Size tall.",
    },
    cardGap: {
        type: ControlType.Number,
        title: "Card Gap",
        min: -400,
        max: 400,
        step: 1,
        defaultValue: 8,
        description: "Space between adjacent cards (all cards are the same size, side-by-side). Negative values overlap them.",
    },
    tiltDeg: {
        type: ControlType.Number,
        title: "Tilt",
        min: 0,
        max: 30,
        step: 0.5,
        defaultValue: 4,
        description: "Slight in-plane tilt for side cards — flat, not a 3D turn or a size change.",
    },
    curveDepth: {
        type: ControlType.Number,
        title: "Arc Depth",
        min: 0,
        max: 150,
        step: 1,
        defaultValue: 0,
        description: "How far side cards drop below center. Off by default so all cards sit level — raise it if you want a visible arc.",
    },
    sideOpacity: {
        type: ControlType.Number,
        title: "Side Opacity",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        description: "Flat opacity for every off-center card, regardless of how far away it is.",
    },
    edgeFadeWidth: {
        type: ControlType.Number,
        title: "Edge Fade",
        min: 0,
        max: 400,
        step: 1,
        defaultValue: 120,
        description: "Gradient mask width at the left/right edges of the frame. Cards fade to transparent as they approach the edge, instead of a hard cut. Set to 0 to disable.",
    },
    dragEnabled: {
        type: ControlType.Boolean,
        title: "Drag/Swipe",
        defaultValue: true,
    },
    tapDistancePx: {
        type: ControlType.Number,
        title: "Tap Deadzone",
        min: 5,
        max: 80,
        step: 1,
        defaultValue: 28,
        description: "How far a touch must move before it counts as a drag instead of a tap. Raise this if tapping the center card still causes a small shift/wobble on your hardware.",
    },
    dragFreeZone: {
        type: ControlType.Number,
        title: "Drag Free Zone",
        min: 0.1,
        max: 1.5,
        step: 0.05,
        defaultValue: 0.6,
        description: "How far (in card-widths) a drag tracks your finger exactly. Beyond this, Drag Resistance kicks in — keeps this at least a bit above the ~0.3 needed to commit to the next card.",
    },
    dragResistance: {
        type: ControlType.Number,
        title: "Drag Resistance",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.35,
        description: "How much of the extra drag counts once past the Free Zone. Lower = stickier, more resistant to fast/long drags. 1 = no resistance at all. Prevents a long drag from overshooting several cards and then snapping back on release, since navigation is always capped to one card per gesture. Flicks aren't affected — those are based on speed, not distance.",
    },
    frontVariantProp: {
        type: ControlType.String,
        title: "Variant Prop",
        defaultValue: "variant",
        description: "The prop name your Flip Card uses for its Variant control. Any card that isn't centered is forced to this variant, so it can never be left showing flipped off to the side.",
    },
    frontVariantValue: {
        type: ControlType.String,
        title: "Front Variant",
        defaultValue: "Front",
        description: "Exact Variant name for the un-flipped face.",
    },
    entranceEnabled: {
        type: ControlType.Boolean,
        title: "Entrance",
        defaultValue: true,
        description: "Cards rise, fade, and scale into place on load, fanning outward from the center. Turn off for no opening animation.",
    },
    entranceDelay: {
        type: ControlType.Number,
        title: "Entrance Delay",
        min: 0,
        max: 5,
        step: 0.05,
        defaultValue: 0.2,
        description: "Seconds before the entrance starts. The whole carousel stays invisible until this elapses — set it to match (or slightly exceed) another on-screen animation, e.g. a welcome message, so the carousel appears after it finishes. This is a fixed number tuned by eye, not a live link to that other layer.",
        hidden: (props) => !props.entranceEnabled,
    },
    entranceDuration: {
        type: ControlType.Number,
        title: "Entrance Duration",
        min: 0.05,
        max: 3,
        step: 0.05,
        defaultValue: 0.6,
        description: "How long each card's own entrance takes.",
        hidden: (props) => !props.entranceEnabled,
    },
    entranceStagger: {
        type: ControlType.Number,
        title: "Entrance Stagger",
        min: 0,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.08,
        description: "Extra delay per card-distance from center, so the center card leads and the fan opens outward. 0 = every card starts together.",
        hidden: (props) => !props.entranceEnabled,
    },
    entranceDistanceY: {
        type: ControlType.Number,
        title: "Entrance Rise",
        min: 0,
        max: 400,
        step: 1,
        defaultValue: 60,
        description: "How far below their resting spot cards start, sliding up into place.",
        hidden: (props) => !props.entranceEnabled,
    },
    entranceScale: {
        type: ControlType.Number,
        title: "Entrance Scale",
        min: 0.3,
        max: 1,
        step: 0.01,
        defaultValue: 0.85,
        description: "Starting scale cards grow from (1 = no scale change).",
        hidden: (props) => !props.entranceEnabled,
    },
    entranceEase: {
        type: ControlType.Enum,
        title: "Entrance Ease",
        options: ["easeOut", "easeInOut", "backOut", "circOut", "linear"],
        optionTitles: ["Ease Out", "Ease In Out", "Back Out (overshoot)", "Circ Out", "Linear"],
        defaultValue: "easeOut",
        hidden: (props) => !props.entranceEnabled,
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
    cardToArrowGap: {
        type: ControlType.Number,
        title: "Card-Arrow Gap",
        min: -200,
        max: 600,
        step: 1,
        defaultValue: 40,
        description: "Vertical space between the bottom of the (centered) card and the top of the arrow row.",
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
    autoplayEnabled: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: false,
    },
    autoplayIntervalSeconds: {
        type: ControlType.Number,
        title: "Autoplay Secs",
        min: 1,
        max: 60,
        step: 1,
        defaultValue: 5,
        description: "Cycle interval, and also how long the carousel waits after the last touch before autoplay resumes.",
        hidden: (props) => !props.autoplayEnabled,
    },
})
