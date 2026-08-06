// CircleOverrides.option3-unified-relaxation.tsx
//
// VARIANT: unified relaxation. Corner/edge pull is no longer resolved as
// one big "ease toward a target" step followed by a separate overlap-fix
// pass — the two are interleaved into the SAME iterative loop, the way a
// circle-packing/force-relaxation solver works. Each of the four
// iterations per frame: every disturbed circle takes a step toward its
// pull target, then a single overlap-correction sweep runs immediately
// after. Because the step is full-sized (see the note on stepEase in
// relaxSettled for why it isn't divided down), a circle boxed in by a
// neighbor reliably creates enough overlap each iteration to actually
// trigger a correction — and the correction sweep's existing 50/50 split
// + home-bounce (unchanged from the shipped file) shares that overlap
// between both circles instead of fully cancelling it. Over a handful of
// iterations/frames, the blocking neighbor visibly gets nudged out of the
// way on its own, with no special "who's blocking whom" bookkeeping
// required — it falls out of doing the two things together instead of one
// after the other. resolveCollisionPass is still the single source of
// truth for overlap, still runs every iteration, so no lasting overlap is
// ever possible.
import React, {
    useEffect,
    useState,
    forwardRef,
    useRef,
    useCallback,
    startTransition,
} from "react"
import { useMotionValue, MotionValue } from "framer-motion"
import type { ComponentType } from "react"

type CircleState = {
    id: string
    radius: number
    homeX: number
    homeY: number
    originX: number
    originY: number
    x: MotionValue<number>
    y: MotionValue<number>
    scale: MotionValue<number>
    isDragging: boolean
    pointerId: number | null
    dragStartPointerX: number
    dragStartPointerY: number
    dragStartX: number
    dragStartY: number
    staggerDelay: number
    anchorHomeX: number
    anchorHomeY: number
    hasSettled: boolean
    settledAt: number
    disturbed: boolean
}

const circles = new Map<string, CircleState>()
let rafId: number | null = null

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 972

// Entrance timing parameters
let entranceStartTime: number | null = null
const ENTRANCE_DURATION = 1200

// How far above the frame the arc apex rises before settling down.
const ARC_APEX_LIFT = 220

// How far right of the origin->home midpoint the apex bows out before
// swinging back left into the final position.
const ARC_RIGHT_BOW = 260

// ------------------------------------------------------------------
// Shared tuning constants
// ------------------------------------------------------------------
const EDGE_INSET = 24
const EDGE_SOFT_ZONE = 30 //Increase to start repulsion further away from the wall
const EDGE_OVERSHOOT_MAX = 5 //Increase to allow the circle to compress deeper past the boundary
const EDGE_BOUNCE_PUSH = 15 //Main bounce: Increase for punchier kickback
const EDGE_PULL_ZONE_SIZE = 46
const EDGE_PULL_STRENGTH = 0.34 //Increase for stronger force pushing back inward
const EDGE_PULL_MAX = 24 //Increase cap to allow higher force limits
const DRAG_EDGE_RESISTANCE = 0.95

// Soft corner avoidance: a gentle, long-range push directly away from
// whichever canvas corner a circle is nearest to. Ramps in smoothly
// (smoothstep) starting CORNER_ZONE px out, so it reads as a slow drift
// rather than a snap, and it's layered additively into getEdgePull so
// every caller (drag, drop, settle) picks it up for free.
const CORNER_ZONE = 160 //Increase to start the corner drift further out
const CORNER_PUSH_MAX = 46 //Increase for a stronger drift away from corners

const CIRCLE_GAP = 10
const COLLISION_ITERATIONS = 4
const COLLISION_SEPARATION_STRENGTH = 0.9
const COLLISION_BOUNCE_MULTIPLIER = 0.55
const COLLISION_DEADZONE = 0.6
const COLLISION_MAX_STEP = 12
const COLLISION_ENTRY_MAX_STEP = 2.8
const HOME_EASE = 0.18
const HOME_ANCHOR_EASE = 0.12
const COLLISION_REBOUND_PUSH = 14
const SETTLE_HANDOFF_MS = 180

// How many times resolveCollisions is re-run within a SINGLE pointer-move
// event while dragging. resolveCollisions already pushes the other circle
// out of the dragged circle's way (see the a.isDragging branch below) with
// a nice bounce, but it's normally only called once per animation frame,
// which caps how far the pushed circle can react (COLLISION_MAX_STEP px
// per call). A fast drag can move further than that in one frame, letting
// the dragged circle "outrun" the circle it should be pushing. Running the
// same resolution multiple times per pointer event lets the pushed circle
// fully catch up immediately, regardless of drag speed, using the exact
// same push/bounce math — no new mechanics, no feel change.
const DRAG_COLLISION_ITERATIONS = 10

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val))
}

function smoothstep(t: number) {
    const c = clamp(t, 0, 1)
    return c * c * (3 - 2 * c)
}

function getBoundsForRadius(radius: number) {
    const minX = EDGE_INSET
    const minY = EDGE_INSET
    const maxX = Math.max(minX, CANVAS_WIDTH - radius * 2 - EDGE_INSET)
    const maxY = Math.max(minY, CANVAS_HEIGHT - radius * 2 - EDGE_INSET)
    return { minX, minY, maxX, maxY }
}

function clampToContainer(x: number, y: number, radius: number) {
    const bounds = getBoundsForRadius(radius)
    return {
        x: clamp(x, bounds.minX, bounds.maxX),
        y: clamp(y, bounds.minY, bounds.maxY),
    }
}

// Soft push directly away from whichever bounds-corner a circle is
// nearest to. Distance-based and continuous, so it converges to a stable
// resting point instead of oscillating, and stays out of the way entirely
// once a circle drifts CORNER_ZONE px clear of every corner.
function getCornerPush(x: number, y: number, radius: number) {
    const bounds = getBoundsForRadius(radius)
    const corners = [
        { cx: bounds.minX, cy: bounds.minY },
        { cx: bounds.maxX, cy: bounds.minY },
        { cx: bounds.minX, cy: bounds.maxY },
        { cx: bounds.maxX, cy: bounds.maxY },
    ]

    let nearestDist = Infinity
    let nearestCx = corners[0].cx
    let nearestCy = corners[0].cy
    for (const corner of corners) {
        const d = Math.hypot(x - corner.cx, y - corner.cy)
        if (d < nearestDist) {
            nearestDist = d
            nearestCx = corner.cx
            nearestCy = corner.cy
        }
    }

    if (nearestDist >= CORNER_ZONE) {
        return { isNearCorner: false, pushX: 0, pushY: 0 }
    }

    const awayX = x - nearestCx
    const awayY = y - nearestCy
    const len = Math.hypot(awayX, awayY) || 1
    const nx = awayX / len
    const ny = awayY / len
    const amount = smoothstep(1 - nearestDist / CORNER_ZONE) * CORNER_PUSH_MAX

    return { isNearCorner: true, pushX: nx * amount, pushY: ny * amount }
}

// Edge avoidance force: Active ONLY when a circle penetrates the edge zone
function getEdgePull(
    x: number,
    y: number,
    radius: number,
    strengthMultiplier: number = 1
) {
    const bounds = getBoundsForRadius(radius)
    const zone = EDGE_SOFT_ZONE
    const centerX = x + radius
    const centerY = y + radius
    const canvasCenterX = CANVAS_WIDTH / 2
    const canvasCenterY = CANVAS_HEIGHT / 2

    // Penetration depth into the outer edge threshold
    const leftDepth = Math.max(0, bounds.minX + zone - x)
    const rightDepth = Math.max(0, x - (bounds.maxX - zone))
    const topDepth = Math.max(0, bounds.minY + zone - y)
    const bottomDepth = Math.max(0, y - (bounds.maxY - zone))

    const depthX = Math.max(leftDepth, rightDepth)
    const depthY = Math.max(topDepth, bottomDepth)
    const edgeDepth = Math.max(depthX, depthY)

    const corner = getCornerPush(x, y, radius)
    const cornerPullX = corner.pushX * strengthMultiplier
    const cornerPullY = corner.pushY * strengthMultiplier

    if (edgeDepth <= 0) {
        if (!corner.isNearCorner) {
            return { isNearEdge: false, pullX: 0, pullY: 0, strength: 0 }
        }
        return {
            isNearEdge: true,
            pullX: cornerPullX,
            pullY: cornerPullY,
            strength: Math.hypot(cornerPullX, cornerPullY),
        }
    }

    const blendX = clamp(depthX / zone, 0, 1)
    const blendY = clamp(depthY / zone, 0, 1)
    const edgeBlend = Math.max(blendX, blendY)
    const cornerBoost = 1 + Math.min(blendX, blendY) * 0.45

    const towardCenterX = canvasCenterX - centerX
    const towardCenterY = canvasCenterY - centerY
    const len = Math.hypot(towardCenterX, towardCenterY) || 1
    const nx = towardCenterX / len
    const ny = towardCenterY / len
    const amount = Math.min(
        EDGE_PULL_MAX,
        zone * edgeBlend * EDGE_PULL_STRENGTH * cornerBoost * strengthMultiplier
    )

    const pullX = nx * amount + cornerPullX
    const pullY = ny * amount + cornerPullY

    return {
        isNearEdge: true,
        pullX,
        pullY,
        strength: Math.hypot(pullX, pullY),
    }
}

function clampWithEdgeBounce(x: number, y: number, radius: number) {
    const bounds = getBoundsForRadius(radius)
    const hardMinX = bounds.minX - EDGE_OVERSHOOT_MAX
    const hardMinY = bounds.minY - EDGE_OVERSHOOT_MAX
    const hardMaxX = bounds.maxX + EDGE_OVERSHOOT_MAX
    const hardMaxY = bounds.maxY + EDGE_OVERSHOOT_MAX

    let nx = clamp(x, hardMinX, hardMaxX)
    let ny = clamp(y, hardMinY, hardMaxY)
    let reboundX = 0
    let reboundY = 0

    if (nx < bounds.minX) {
        const overshoot = bounds.minX - nx
        nx = bounds.minX - Math.min(EDGE_OVERSHOOT_MAX, overshoot * 0.45)
        reboundX = Math.min(EDGE_BOUNCE_PUSH, overshoot * 0.7)
    } else if (nx > bounds.maxX) {
        const overshoot = nx - bounds.maxX
        nx = bounds.maxX + Math.min(EDGE_OVERSHOOT_MAX, overshoot * 0.45)
        reboundX = -Math.min(EDGE_BOUNCE_PUSH, overshoot * 0.7)
    } else {
        const dLeft = nx - bounds.minX
        const dRight = bounds.maxX - nx
        if (dLeft < EDGE_SOFT_ZONE) {
            reboundX =
                ((EDGE_SOFT_ZONE - dLeft) / EDGE_SOFT_ZONE) *
                EDGE_BOUNCE_PUSH *
                0.2
        } else if (dRight < EDGE_SOFT_ZONE) {
            reboundX =
                -((EDGE_SOFT_ZONE - dRight) / EDGE_SOFT_ZONE) *
                EDGE_BOUNCE_PUSH *
                0.2
        }
    }

    if (ny < bounds.minY) {
        const overshoot = bounds.minY - ny
        ny = bounds.minY - Math.min(EDGE_OVERSHOOT_MAX, overshoot * 0.45)
        reboundY = Math.min(EDGE_BOUNCE_PUSH, overshoot * 0.7)
    } else if (ny > bounds.maxY) {
        const overshoot = ny - bounds.maxY
        ny = bounds.maxY + Math.min(EDGE_OVERSHOOT_MAX, overshoot * 0.45)
        reboundY = -Math.min(EDGE_BOUNCE_PUSH, overshoot * 0.7)
    } else {
        const dTop = ny - bounds.minY
        const dBottom = bounds.maxY - ny
        if (dTop < EDGE_SOFT_ZONE) {
            reboundY =
                ((EDGE_SOFT_ZONE - dTop) / EDGE_SOFT_ZONE) *
                EDGE_BOUNCE_PUSH *
                0.2
        } else if (dBottom < EDGE_SOFT_ZONE) {
            reboundY =
                -((EDGE_SOFT_ZONE - dBottom) / EDGE_SOFT_ZONE) *
                EDGE_BOUNCE_PUSH *
                0.2
        }
    }

    return { x: nx, y: ny, reboundX, reboundY }
}

function idAngle(id: string) {
    let sum = 0
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
    return (sum % 360) * (Math.PI / 180)
}

function moveCircleBy(
    c: CircleState,
    dx: number,
    dy: number,
    maxStep = Infinity
) {
    let ndx = dx
    let ndy = dy
    const mag = Math.hypot(dx, dy)
    if (mag > maxStep) {
        const s = maxStep / mag
        ndx = dx * s
        ndy = dy * s
    }

    const next = clampToContainer(c.x.get() + ndx, c.y.get() + ndy, c.radius)
    c.x.set(next.x)
    c.y.set(next.y)
}

function collisionRamp(c: CircleState, now: number) {
    if (c.isDragging) return 1
    if (!c.hasSettled) return 0
    const t = clamp((now - c.settledAt) / SETTLE_HANDOFF_MS, 0, 1)
    return t * t
}

// One full pairwise overlap-correction sweep over every settled circle.
// This is the single source of truth for "no two circles may overlap" —
// it's called both from resolveCollisions (which just loops it
// COLLISION_ITERATIONS times back-to-back, for the drag path that still
// wants a big batch of correction within one pointer-move) and from
// relaxSettled below (which interleaves single sweeps with small pull
// steps instead of running them all at once).
function resolveCollisionPass(settledIds: Set<string>) {
    const list = Array.from(circles.values())
    const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()

    for (let i = 0; i < list.length; i++) {
        const a = list[i]
        if (!settledIds.has(a.id)) continue

        for (let j = i + 1; j < list.length; j++) {
            const b = list[j]
            if (!settledIds.has(b.id)) continue
            if (a.isDragging && b.isDragging) continue

            const ax = a.x.get() + a.radius
            const ay = a.y.get() + a.radius
            const bx = b.x.get() + b.radius
            const by = b.y.get() + b.radius

            let dx = ax - bx
            let dy = ay - by
            let dist = Math.sqrt(dx * dx + dy * dy)
            const minDist = a.radius + b.radius + CIRCLE_GAP
            if (dist >= minDist) continue

            if (dist < 0.001) {
                const angle = idAngle(a.id) - idAngle(b.id)
                dx = Math.cos(angle)
                dy = Math.sin(angle)
                dist = 0.001
            }

            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist
            if (overlap <= COLLISION_DEADZONE) continue
            const rampA = collisionRamp(a, now)
            const rampB = collisionRamp(b, now)
            const pairRamp =
                a.isDragging || b.isDragging
                    ? Math.max(rampA, rampB)
                    : Math.min(rampA, rampB)
            if (pairRamp <= 0.001) continue

            const correction = overlap * COLLISION_SEPARATION_STRENGTH * pairRamp
            const bounce = Math.min(
                COLLISION_REBOUND_PUSH,
                correction * COLLISION_BOUNCE_MULTIPLIER * (0.5 + pairRamp * 0.5)
            )
            const maxStep =
                COLLISION_ENTRY_MAX_STEP +
                (COLLISION_MAX_STEP - COLLISION_ENTRY_MAX_STEP) * pairRamp

            if (a.isDragging) {
                moveCircleBy(b, -nx * correction, -ny * correction, maxStep)
                b.homeX = b.x.get() - nx * bounce
                b.homeY = b.y.get() - ny * bounce
                b.disturbed = true
            } else if (b.isDragging) {
                moveCircleBy(a, nx * correction, ny * correction, maxStep)
                a.homeX = a.x.get() + nx * bounce
                a.homeY = a.y.get() + ny * bounce
                a.disturbed = true
            } else {
                moveCircleBy(
                    a,
                    (nx * correction) / 2,
                    (ny * correction) / 2,
                    maxStep
                )
                moveCircleBy(
                    b,
                    (-nx * correction) / 2,
                    (-ny * correction) / 2,
                    maxStep
                )
                a.homeX = a.x.get() + nx * (bounce * 0.45)
                a.homeY = a.y.get() + ny * (bounce * 0.45)
                b.homeX = b.x.get() - nx * (bounce * 0.45)
                b.homeY = b.y.get() - ny * (bounce * 0.45)
                a.disturbed = true
                b.disturbed = true
            }
        }
    }
}

// Kept as its own entry point (same signature/behavior as the shipped
// file) because the drag path wants a whole batch of correction resolved
// within a single pointer-move event, not interleaved with pull steps.
function resolveCollisions(settledIds: Set<string>) {
    for (let step = 0; step < COLLISION_ITERATIONS; step++) {
        resolveCollisionPass(settledIds)
    }
}

function resolveDropPosition(id: string, radius: number, x: number, y: number) {
    let centerX = x + radius
    let centerY = y + radius
    for (let i = 0; i < 12; i++) {
        let hasOverlap = false
        for (const other of circles.values()) {
            if (other.id === id) continue
            const otherCenterX = other.x.get() + other.radius
            const otherCenterY = other.y.get() + other.radius
            let dx = centerX - otherCenterX
            let dy = centerY - otherCenterY
            let dist = Math.sqrt(dx * dx + dy * dy)
            const minDist = radius + other.radius + CIRCLE_GAP
            if (dist >= minDist) continue
            if (dist < 0.001) {
                const angle = idAngle(id) - idAngle(other.id)
                dx = Math.cos(angle)
                dy = Math.sin(angle)
                dist = 0.001
            }
            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist
            centerX += nx * overlap
            centerY += ny * overlap
            hasOverlap = true
        }
        const clamped = clampToContainer(
            centerX - radius,
            centerY - radius,
            radius
        )
        centerX = clamped.x + radius
        centerY = clamped.y + radius

        const edgePull = getEdgePull(
            centerX - radius,
            centerY - radius,
            radius,
            1.1
        )
        if (edgePull.isNearEdge) {
            const withCorner = clampToContainer(
                centerX - radius + edgePull.pullX,
                centerY - radius + edgePull.pullY,
                radius
            )
            centerX = withCorner.x + radius
            centerY = withCorner.y + radius
        }

        if (!hasOverlap) break
    }

    for (let i = 0; i < 4; i++) {
        const edgePull = getEdgePull(
            centerX - radius,
            centerY - radius,
            radius,
            1.15
        )
        if (!edgePull.isNearEdge) break
        const withCorner = clampToContainer(
            centerX - radius + edgePull.pullX,
            centerY - radius + edgePull.pullY,
            radius
        )
        centerX = withCorner.x + radius
        centerY = withCorner.y + radius
    }

    return { x: centerX - radius, y: centerY - radius }
}

function bezier(t: number, p0: number, p1: number, p2: number) {
    const mt = 1 - t
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

// Interleaves the corner/edge "desire" with collision correction inside
// the SAME iterative pass, instead of computing one big desired move and
// only afterward, separately, forcing overlaps back out. Each of the
// COLLISION_ITERATIONS sub-steps: every disturbed, non-dragging settled
// circle takes a step toward its pull target, then a single
// resolveCollisionPass runs immediately, so a circle boxed in by a
// neighbor gets its overlap shared with that neighbor (via the existing
// 50/50 split + home-bounce) on every sub-step instead of accumulating
// it all up and fighting a single correction pass once per frame.
//
// The step uses the FULL HOME_EASE fraction each sub-step, not
// HOME_EASE/COLLISION_ITERATIONS. That's deliberate: COLLISION_DEADZONE
// (0.6px) is tuned for the original one-macro-step-per-frame scale, and a
// quartered step routinely produced *less* than 0.6px of overlap per
// sub-step — invisible to resolveCollisionPass, which just ignores
// anything at or under the deadzone (`overlap <= COLLISION_DEADZONE`).
// The blocked circle would creep forward by an imperceptible amount, the
// neighbor would never be notified, and the whole relaxation went numb —
// which is what read as "no fluidity, corner avoidance absent." Keeping
// the step full-size means every sub-step reliably clears the deadzone
// and produces a real, visible correction. This does mean the circle can
// converge noticeably faster than before (up to 4 meaningful steps per
// frame instead of 1) — if that reads as too snappy, dial stepEase down
// gradually (e.g. HOME_EASE * 0.6) rather than dividing by
// COLLISION_ITERATIONS again, which reintroduces the same numbness.
function relaxSettled(settledIds: Set<string>, timestamp: number) {
    for (let step = 0; step < COLLISION_ITERATIONS; step++) {
        settledIds.forEach((id) => {
            const c = circles.get(id)
            if (!c || c.isDragging || !c.disturbed) return

            const pull = getEdgePull(c.x.get(), c.y.get(), c.radius)
            const handoffProgress = clamp(
                (timestamp - c.settledAt) / SETTLE_HANDOFF_MS,
                0,
                1
            )
            const pullFadeIn = handoffProgress * handoffProgress
            const targetX = c.anchorHomeX + pull.pullX * pullFadeIn
            const targetY = c.anchorHomeY + pull.pullY * pullFadeIn

            const stepEase = HOME_EASE
            const nextX = c.x.get() + (targetX - c.x.get()) * stepEase
            const nextY = c.y.get() + (targetY - c.y.get()) * stepEase
            const clamped = clampToContainer(nextX, nextY, c.radius)
            c.x.set(clamped.x)
            c.y.set(clamped.y)
        })

        resolveCollisionPass(settledIds)
    }

    // Undisturbed circles never chase a pull target of their own, but a
    // correction sweep above may just have bumped their home — settle
    // onto that.
    settledIds.forEach((id) => {
        const c = circles.get(id)
        if (!c || c.isDragging || c.disturbed) return
        const x = c.x.get()
        const y = c.y.get()
        c.x.set(x + (c.anchorHomeX - x) * HOME_EASE)
        c.y.set(y + (c.anchorHomeY - y) * HOME_EASE)
    })
}

function startLoopIfNeeded() {
    if (rafId !== null) return

    const tick = (timestamp: number) => {
        if (entranceStartTime === null) {
            entranceStartTime = timestamp
        }

        const totalElapsed = timestamp - entranceStartTime
        const settledIds = new Set<string>()

        circles.forEach((c) => {
            if (!c) return

            if (c.isDragging) {
                settledIds.add(c.id)
                const edgeWhileDragging = getEdgePull(
                    c.x.get(),
                    c.y.get(),
                    c.radius,
                    DRAG_EDGE_RESISTANCE
                )
                if (edgeWhileDragging.isNearEdge) {
                    const nudged = clampToContainer(
                        c.x.get() + edgeWhileDragging.pullX,
                        c.y.get() + edgeWhileDragging.pullY,
                        c.radius
                    )
                    c.homeX = nudged.x
                    c.homeY = nudged.y
                }
                return
            }

            const circleElapsed = Math.max(0, totalElapsed - c.staggerDelay)
            const rawProgress = Math.min(circleElapsed / ENTRANCE_DURATION, 1)

            if (rawProgress < 1) {
                const progress = 1 - Math.pow(1 - rawProgress, 3)
                c.scale.set(progress)

                const controlX = (c.originX + c.homeX) / 2 + ARC_RIGHT_BOW
                const controlY = Math.min(c.originY, c.homeY) - ARC_APEX_LIFT

                const targetX = bezier(progress, c.originX, controlX, c.homeX)
                const targetY = bezier(progress, c.originY, controlY, c.homeY)

                c.x.set(targetX)
                c.y.set(targetY)
            } else {
                c.scale.set(1)
                settledIds.add(c.id)
                if (!c.hasSettled) {
                    c.hasSettled = true
                    c.settledAt = timestamp
                    c.anchorHomeX = c.homeX
                    c.anchorHomeY = c.homeY
                }

                c.anchorHomeX += (c.homeX - c.anchorHomeX) * HOME_ANCHOR_EASE
                c.anchorHomeY += (c.homeY - c.anchorHomeY) * HOME_ANCHOR_EASE
                // Position itself is resolved below, in relaxSettled,
                // where the pull toward this target and neighbor-overlap
                // correction are worked out together instead of one
                // macro-step followed by a separate fix-up pass.
            }
        })

        relaxSettled(settledIds, timestamp)

        if (typeof window !== "undefined") {
            rafId = window.requestAnimationFrame(tick)
        }
    }

    if (typeof window !== "undefined") {
        rafId = window.requestAnimationFrame(tick)
    }
}

const DRAG_Z_INDEX = 999
const BASE_Z_INDEX_REFERENCE = 500
function baseZIndex(radius: number) {
    return Math.round(BASE_Z_INDEX_REFERENCE - radius)
}

function useDraggableCircle(
    id: string,
    radius: number,
    home: { x: number; y: number },
    origin: { x: number; y: number },
    staggerDelay: number,
    Component: ComponentType<any>,
    props: any,
    ref: any
) {
    const x = useMotionValue(origin.x)
    const y = useMotionValue(origin.y)
    const scale = useMotionValue(0)
    const [zIndex, setZIndex] = useState(baseZIndex(radius))
    const removeListenersRef = useRef<null | (() => void)>(null)

    useEffect(() => {
        const wasEmptyBeforeMount = circles.size === 0

        circles.set(id, {
            id,
            radius,
            homeX: home.x,
            homeY: home.y,
            originX: origin.x,
            originY: origin.y,
            x,
            y,
            scale,
            isDragging: false,
            pointerId: null,
            dragStartPointerX: 0,
            dragStartPointerY: 0,
            dragStartX: origin.x,
            dragStartY: origin.y,
            staggerDelay,
            anchorHomeX: home.x,
            anchorHomeY: home.y,
            hasSettled: false,
            settledAt: 0,
            disturbed: false,
        })

        if (wasEmptyBeforeMount) {
            entranceStartTime = null
        }
        startLoopIfNeeded()

        return () => {
            if (removeListenersRef.current) {
                removeListenersRef.current()
                removeListenersRef.current = null
            }
            const existing = circles.get(id)
            if (existing) {
                existing.isDragging = false
                existing.pointerId = null
            }
            circles.delete(id)
            if (circles.size === 0 && rafId !== null) {
                if (typeof window !== "undefined") {
                    window.cancelAnimationFrame(rafId)
                }
                rafId = null
                entranceStartTime = null
            }
        }
    }, [
        id,
        radius,
        home.x,
        home.y,
        origin.x,
        origin.y,
        staggerDelay,
        x,
        y,
        scale,
    ])

    const endDrag = useCallback(() => {
        const c = circles.get(id)
        if (!c) return
        c.isDragging = false
        c.pointerId = null
        c.hasSettled = true
        c.settledAt =
            typeof performance !== "undefined" ? performance.now() : Date.now()
        const dropped = clampToContainer(c.x.get(), c.y.get(), radius)
        const resolved = resolveDropPosition(id, radius, dropped.x, dropped.y)
        c.homeX = resolved.x
        c.homeY = resolved.y
        c.anchorHomeX = resolved.x
        c.anchorHomeY = resolved.y
        c.x.set(resolved.x)
        c.y.set(resolved.y)
        startTransition(() => setZIndex(baseZIndex(radius)))
    }, [id, radius, x, y])

    const onPointerDown = useCallback(
        (event: React.PointerEvent) => {
            const c = circles.get(id)
            if (!c) return
            if (removeListenersRef.current) {
                removeListenersRef.current()
                removeListenersRef.current = null
            }
            event.preventDefault()
            c.isDragging = true
            c.disturbed = true
            c.pointerId = event.pointerId
            c.dragStartPointerX = event.clientX
            c.dragStartPointerY = event.clientY
            c.dragStartX = c.x.get()
            c.dragStartY = c.y.get()
            c.hasSettled = false
            startTransition(() => setZIndex(DRAG_Z_INDEX))

            const onPointerMove = (moveEvent: PointerEvent) => {
                const active = circles.get(id)
                if (!active || !active.isDragging) return
                if (active.pointerId !== moveEvent.pointerId) return

                const nextX =
                    active.dragStartX +
                    (moveEvent.clientX - active.dragStartPointerX)
                const nextY =
                    active.dragStartY +
                    (moveEvent.clientY - active.dragStartPointerY)

                const bounced = clampWithEdgeBounce(nextX, nextY, radius)
                const edgeDuringDrag = getEdgePull(
                    bounced.x,
                    bounced.y,
                    radius,
                    DRAG_EDGE_RESISTANCE
                )
                const draggedWithCorner = clampToContainer(
                    bounced.x + edgeDuringDrag.pullX,
                    bounced.y + edgeDuringDrag.pullY,
                    radius
                )

                // Move the dragged circle to where the pointer wants it.
                active.x.set(draggedWithCorner.x)
                active.y.set(draggedWithCorner.y)

                // Immediately resolve pushes against every other circle,
                // repeatedly, within this single pointer event. This reuses
                // the exact same push/bounce logic that already lives in
                // resolveCollisions (the a.isDragging branch moves only the
                // OTHER circle, with a bounce fed into its homeX/homeY) —
                // it's just no longer limited to once per animation frame,
                // so a fast drag can't move further in one step than the
                // pushed circle is allowed to react.
                const allIds = new Set(circles.keys())
                for (let i = 0; i < DRAG_COLLISION_ITERATIONS; i++) {
                    resolveCollisions(allIds)
                }

                const reboundedHome = clampToContainer(
                    active.x.get() + bounced.reboundX + edgeDuringDrag.pullX,
                    active.y.get() + bounced.reboundY + edgeDuringDrag.pullY,
                    radius
                )
                active.homeX = reboundedHome.x
                active.homeY = reboundedHome.y
            }

            const onPointerUp = (upEvent: PointerEvent) => {
                const active = circles.get(id)
                if (
                    active &&
                    active.pointerId !== null &&
                    active.pointerId !== upEvent.pointerId
                ) {
                    return
                }
                cleanup()
                endDrag()
            }

            const cleanup = () => {
                if (typeof window === "undefined") return
                window.removeEventListener("pointermove", onPointerMove)
                window.removeEventListener("pointerup", onPointerUp)
                window.removeEventListener("pointercancel", onPointerUp)
                if (removeListenersRef.current === cleanup) {
                    removeListenersRef.current = null
                }
            }

            if (typeof window !== "undefined") {
                window.addEventListener("pointermove", onPointerMove)
                window.addEventListener("pointerup", onPointerUp)
                window.addEventListener("pointercancel", onPointerUp)
                removeListenersRef.current = cleanup
            }

            props.onPointerDown?.(event)
        },
        [id, radius, endDrag, props]
    )

    return (
        <Component
            {...props}
            ref={ref}
            onPointerDown={onPointerDown}
            style={{
                ...props.style,
                x,
                y,
                scale,
                position: "absolute",
                touchAction: "none",
                zIndex: zIndex,
            }}
        />
    )
}

// ============================================
// FRAMER EXPORTS
// ============================================

export function AutoCircle(Component: ComponentType<any>): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "auto",
            200,
            { x: 52, y: 55 },
            { x: -260, y: CANVAS_HEIGHT + 260 },
            0,
            Component,
            props,
            ref
        )
    )
}

export function DiningCircle(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "dining",
            131,
            { x: 764, y: 129 },
            { x: -320, y: CANVAS_HEIGHT + 180 },
            80,
            Component,
            props,
            ref
        )
    )
}

export function HealthCircle(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "health",
            175,
            { x: 437, y: 239 },
            { x: -200, y: CANVAS_HEIGHT + 320 },
            160,
            Component,
            props,
            ref
        )
    )
}

export function ShoppingCircle(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "shopping",
            210,
            { x: 116, y: 488 },
            { x: -350, y: CANVAS_HEIGHT + 260 },
            240,
            Component,
            props,
            ref
        )
    )
}

export function PersonalCareCircle(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "personal care",
            125,
            { x: 552, y: 598 },
            { x: -220, y: CANVAS_HEIGHT + 200 },
            320,
            Component,
            props,
            ref
        )
    )
}

export function UncategorizedCircle(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) =>
        useDraggableCircle(
            "uncategorized",
            125,
            { x: 770, y: 437 },
            { x: -300, y: CANVAS_HEIGHT + 300 },
            400,
            Component,
            props,
            ref
        )
    )
}
