// CircleOverrides.tsx
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
    // Velocity (px/frame), driven by springs/impulses once settled. This is
    // what makes motion actually bounce — a plain "ease toward a target"
    // position can only ever approach monotonically, it can never overshoot
    // and spring back the way a real bounce does.
    vx: number
    vy: number
    // The circle's original, designer-authored resting spot. Never changes.
    // Used to tell "still exactly where it was placed" apart from "has been
    // dragged or bumped at some point" — corner/edge avoidance only ever
    // applies to the latter, so a circle authored to sit near a corner (by
    // design) is left alone until a user actually touches it.
    originalHomeX: number
    originalHomeY: number
    disturbed: boolean
    hasSettled: boolean
    settledAt: number
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
const CIRCLE_GAP = 10
const COLLISION_ITERATIONS = 4
const COLLISION_SEPARATION_STRENGTH = 0.9
const COLLISION_BOUNCE_MULTIPLIER = 0.55
const COLLISION_DEADZONE = 0.6
const COLLISION_MAX_STEP = 12
const COLLISION_ENTRY_MAX_STEP = 2.8
const COLLISION_REBOUND_PUSH = 14
const SETTLE_HANDOFF_MS = 180

// ------------------------------------------------------------------
// Spring/bounce physics for settled (non-dragging) circles
// ------------------------------------------------------------------
// Once a circle is settled, it's driven by an actual velocity + spring
// integration toward its home spot rather than a plain position-ease.
// A plain ease can only ever approach its target — it can't overshoot and
// spring back, so it can never really "bounce." Tuned (and verified by
// simulation) to overshoot visibly once, wobble a couple more times at
// shrinking amplitude, and settle within roughly a second.
const SPRING_STIFFNESS = 0.12
const SPRING_DAMPING = 0.8
// Cap on px/frame so a big impulse (a hard collision, a flung release)
// can't make a circle's motion feel unbounded.
const MAX_VELOCITY = 40
// How much of a wall-contact's velocity bounces back versus getting
// absorbed. Only matters for a disturbed circle whose spring+corner-force
// motion actually reaches the hard boundary.
const WALL_RESTITUTION = 0.4
// Below this incoming speed (px/frame), a wall contact absorbs the
// velocity instead of reflecting it. Without a resting-contact threshold
// like this, a circle held right at a wall (nothing forcing it away, but
// nothing letting it leave either) can end up reflecting a tiny residual
// velocity back and forth forever — each reflection is too small to
// visibly move it, but the buzzing is still visible. This is what a real
// physics engine calls "resting contact."
const WALL_BOUNCE_MIN_VELOCITY = 0.6
// Below this speed (px/frame), a settled circle's velocity is snapped to
// zero outright rather than left to decay asymptotically. Pure damping
// (`v *= SPRING_DAMPING`) never actually reaches zero, just gets
// arbitrarily close — and a circle with nowhere left to go (wedged
// between another circle and a wall) keeps getting tiny re-pushes each
// frame that reawaken that residual instead of letting it die out.
const VELOCITY_REST_THRESHOLD = 0.15
// Scales getCornerPush's output (see below) into an acceleration for the
// spring integration, on top of the pull toward home. Only applied to
// circles that have been disturbed (dragged, or bumped by a collision) —
// see the `disturbed` field on CircleState.
const CORNER_FORCE_SCALE = 0.5
// Fraction of a collision's rebound push that's injected as an actual
// velocity kick (in addition to the immediate positional depenetration),
// so getting shoved by another circle reads as a bounce, not just a slide.
const COLLISION_VELOCITY_KICK = 0.6
// Extra margin (px, beyond the plain contact distance) within which a
// circle counts as "currently being pressed" by a dragging neighbor — see
// isBeingPressedByDrag. Wide enough that the corner-force switches off
// just before contact and back on just after separation, rather than
// flickering right at the boundary.
const PRESS_MARGIN = 40

// ------------------------------------------------------------------
// Corner avoidance
// ------------------------------------------------------------------
// Distance (px, measured from a bounds corner to the circle's clamped
// top-left position) at which corner avoidance begins nudging the circle
// away. This is deliberately much larger than EDGE_SOFT_ZONE so the push
// ramps in gradually well before the circle reaches the corner, instead
// of a last-instant nudge that only barely clears the wall.
const CORNER_ZONE = 180
// Max additional push (px) directly away from the nearest corner, applied
// smoothly (via smoothstep) as the circle gets closer to that corner.
// Combined with the existing wall pull this keeps circles resting in the
// central area instead of tucked into a corner, without adding any snap
// or jitter since it's a continuous, deterministic function of position.
const CORNER_PUSH_MAX = 70

// How many times resolveCollisions is re-run within a SINGLE pointer-move
// event while dragging. resolveCollisions already pushes the other circle
// out of the dragged circle's way (see the a.isDragging branch below) with
// a nice bounce, but it's normally only called once per animation frame,
// which caps how far the pushed circle can react (COLLISION_MAX_STEP px
// per call). A fast drag can move further than that in one frame, letting
// the dragged circle "outrun" the circle it should be pushing. Running the
// same resolution multiple times per pointer event lets the pushed circle
// fully catch up immediately, regardless of drag speed, using the exact
// same push/bounce math — no new mechanics, no feel change. Bumped up
// alongside softening CLAMP_DRAG_STRENGTH below (a partial correction
// needs a few more passes to converge as tightly as an instant snap did).
const DRAG_COLLISION_ITERATIONS = 14

// Max distance (px) the dragged circle is allowed to advance per sub-step
// within a single pointermove event before collisions are re-checked (see
// onPointerMove). Keeps a fast flick from skipping over a neighbor in one
// jump instead of registering contact with it along the way. Smaller than
// before so drag motion gets resolved against neighbors more often —
// smoother, less steppy contact response.
const DRAG_SUBSTEP_SIZE = 14

// clampDraggedAgainstOthers used to snap the dragged circle instantly and
// fully to the boundary distance from a neighbor it's overlapping. That's
// fine with a single neighbor (converges to essentially exact within a
// couple of calls anyway), but if the dragged circle is squeezed between
// two neighbors (or a neighbor and a wall) with no position that satisfies
// both at once, two hard full snaps fighting each call is a visible
// ping-pong. A partial correction per call still converges to the same
// tight result in the single-constraint case (geometric series over
// DRAG_COLLISION_ITERATIONS calls), but settles into a small, smoothly
// shrinking compromise instead of a hard oscillation in the squeezed case.
const CLAMP_DRAG_STRENGTH = 0.6

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

// Extra push away from whichever of the 4 bounds-corners is nearest.
// Ramps in smoothly starting CORNER_ZONE px away, so it's already gently
// steering the circle out of the corner long before it could arrive there.
function getCornerPush(x: number, y: number, radius: number) {
    const bounds = getBoundsForRadius(radius)
    const corners = [
        { cx: bounds.minX, cy: bounds.minY },
        { cx: bounds.maxX, cy: bounds.minY },
        { cx: bounds.minX, cy: bounds.maxY },
        { cx: bounds.maxX, cy: bounds.maxY },
    ]

    let nearestCx = corners[0].cx
    let nearestCy = corners[0].cy
    let nearestDist = Infinity
    for (const corner of corners) {
        const d = Math.hypot(x - corner.cx, y - corner.cy)
        if (d < nearestDist) {
            nearestDist = d
            nearestCx = corner.cx
            nearestCy = corner.cy
        }
    }

    if (nearestDist >= CORNER_ZONE) {
        return { pushX: 0, pushY: 0 }
    }

    let dirX = x - nearestCx
    let dirY = y - nearestCy
    let len = Math.hypot(dirX, dirY)
    if (len < 0.001) {
        // Sitting exactly on the corner: push toward canvas center instead.
        dirX = CANVAS_WIDTH / 2 - (nearestCx + radius)
        dirY = CANVAS_HEIGHT / 2 - (nearestCy + radius)
        len = Math.hypot(dirX, dirY) || 1
    }
    const nx = dirX / len
    const ny = dirY / len

    const proximity = smoothstep(1 - nearestDist / CORNER_ZONE)
    const amount = CORNER_PUSH_MAX * proximity

    return { pushX: nx * amount, pushY: ny * amount }
}

// Edge avoidance force: Active ONLY when a circle penetrates the edge zone,
// or is within CORNER_ZONE of one of the 4 corners.
function getEdgePull(
    x: number,
    y: number,
    radius: number,
    strengthMultiplier: number = 1
) {
    const bounds = getBoundsForRadius(radius)
    const zone = EDGE_SOFT_ZONE
    // Clamp before doing any direction math. Callers occasionally pass a
    // position that's briefly past the boundary (e.g. the small drag
    // rubber-band overshoot in clampWithEdgeBounce). Without this, the
    // "push away from the nearest corner" direction below can flip and
    // point further outward instead of back in, which is what let circles
    // drift past the frame and shake near corners while being pushed.
    const x0 = clamp(x, bounds.minX, bounds.maxX)
    const y0 = clamp(y, bounds.minY, bounds.maxY)
    const centerX = x0 + radius
    const centerY = y0 + radius
    const canvasCenterX = CANVAS_WIDTH / 2
    const canvasCenterY = CANVAS_HEIGHT / 2

    // Penetration depth into the outer edge threshold
    const leftDepth = Math.max(0, bounds.minX + zone - x0)
    const rightDepth = Math.max(0, x0 - (bounds.maxX - zone))
    const topDepth = Math.max(0, bounds.minY + zone - y0)
    const bottomDepth = Math.max(0, y0 - (bounds.maxY - zone))

    const depthX = Math.max(leftDepth, rightDepth)
    const depthY = Math.max(topDepth, bottomDepth)
    const edgeDepth = Math.max(depthX, depthY)

    const corner = getCornerPush(x0, y0, radius)
    const hasCornerPush = corner.pushX !== 0 || corner.pushY !== 0

    if (edgeDepth <= 0 && !hasCornerPush) {
        return { isNearEdge: false, pullX: 0, pullY: 0, strength: 0 }
    }

    let pullX = 0
    let pullY = 0
    let strength = 0

    if (edgeDepth > 0) {
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
            zone *
                edgeBlend *
                EDGE_PULL_STRENGTH *
                cornerBoost *
                strengthMultiplier
        )
        pullX += nx * amount
        pullY += ny * amount
        strength = amount
    }

    if (hasCornerPush) {
        pullX += corner.pushX * strengthMultiplier
        pullY += corner.pushY * strengthMultiplier
        strength = Math.max(
            strength,
            Math.hypot(corner.pushX, corner.pushY) * strengthMultiplier
        )
    }

    return {
        isNearEdge: true,
        pullX,
        pullY,
        strength,
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

// Same as moveCircleBy, but returns how much of the intended displacement
// actually happened (0-1). Used to scale down the velocity kick on a push:
// if a circle is jammed against a wall with nowhere to go, the container
// clamp inside moveCircleBy silently absorbs most of the intended
// movement, and injecting a full-strength kick anyway just hands it
// energy that has nowhere to express itself as motion — which is exactly
// what shows up as jitter instead of a bounce.
function moveCircleByTracked(
    c: CircleState,
    dx: number,
    dy: number,
    maxStep = Infinity
): number {
    const beforeX = c.x.get()
    const beforeY = c.y.get()
    moveCircleBy(c, dx, dy, maxStep)
    const intended = Math.min(Math.hypot(dx, dy), maxStep)
    if (intended < 0.001) return 1
    const achieved = Math.hypot(c.x.get() - beforeX, c.y.get() - beforeY)
    return clamp(achieved / intended, 0, 1)
}

function collisionRamp(c: CircleState, now: number) {
    if (c.isDragging) return 1
    if (!c.hasSettled) return 0
    const t = clamp((now - c.settledAt) / SETTLE_HANDOFF_MS, 0, 1)
    return t * t
}

function resolveCollisions(settledIds: Set<string>) {
    const list = Array.from(circles.values())
    const now =
        typeof performance !== "undefined" ? performance.now() : Date.now()

    for (let step = 0; step < COLLISION_ITERATIONS; step++) {
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

                const correction =
                    overlap * COLLISION_SEPARATION_STRENGTH * pairRamp
                const bounce = Math.min(
                    COLLISION_REBOUND_PUSH,
                    correction *
                        COLLISION_BOUNCE_MULTIPLIER *
                        (0.5 + pairRamp * 0.5)
                )
                const maxStep =
                    COLLISION_ENTRY_MAX_STEP +
                    (COLLISION_MAX_STEP - COLLISION_ENTRY_MAX_STEP) * pairRamp

                if (a.isDragging) {
                    const achieved = moveCircleByTracked(
                        b,
                        -nx * correction,
                        -ny * correction,
                        maxStep
                    )
                    const bHome = clampToContainer(
                        b.x.get() - nx * bounce,
                        b.y.get() - ny * bounce,
                        b.radius
                    )
                    b.homeX = bHome.x
                    b.homeY = bHome.y
                    b.disturbed = true
                    b.vx = clamp(
                        b.vx - nx * bounce * COLLISION_VELOCITY_KICK * achieved,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                    b.vy = clamp(
                        b.vy - ny * bounce * COLLISION_VELOCITY_KICK * achieved,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                } else if (b.isDragging) {
                    const achieved = moveCircleByTracked(
                        a,
                        nx * correction,
                        ny * correction,
                        maxStep
                    )
                    const aHome = clampToContainer(
                        a.x.get() + nx * bounce,
                        a.y.get() + ny * bounce,
                        a.radius
                    )
                    a.homeX = aHome.x
                    a.homeY = aHome.y
                    a.disturbed = true
                    a.vx = clamp(
                        a.vx + nx * bounce * COLLISION_VELOCITY_KICK * achieved,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                    a.vy = clamp(
                        a.vy + ny * bounce * COLLISION_VELOCITY_KICK * achieved,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                } else {
                    const achievedA = moveCircleByTracked(
                        a,
                        (nx * correction) / 2,
                        (ny * correction) / 2,
                        maxStep
                    )
                    const achievedB = moveCircleByTracked(
                        b,
                        (-nx * correction) / 2,
                        (-ny * correction) / 2,
                        maxStep
                    )
                    const aHome = clampToContainer(
                        a.x.get() + nx * (bounce * 0.45),
                        a.y.get() + ny * (bounce * 0.45),
                        a.radius
                    )
                    const bHome = clampToContainer(
                        b.x.get() - nx * (bounce * 0.45),
                        b.y.get() - ny * (bounce * 0.45),
                        b.radius
                    )
                    a.homeX = aHome.x
                    a.homeY = aHome.y
                    b.homeX = bHome.x
                    b.homeY = bHome.y
                    a.disturbed = true
                    b.disturbed = true
                    a.vx = clamp(
                        a.vx + nx * bounce * 0.45 * COLLISION_VELOCITY_KICK * achievedA,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                    a.vy = clamp(
                        a.vy + ny * bounce * 0.45 * COLLISION_VELOCITY_KICK * achievedA,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                    b.vx = clamp(
                        b.vx - nx * bounce * 0.45 * COLLISION_VELOCITY_KICK * achievedB,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                    b.vy = clamp(
                        b.vy - ny * bounce * 0.45 * COLLISION_VELOCITY_KICK * achievedB,
                        -MAX_VELOCITY,
                        MAX_VELOCITY
                    )
                }
            }
        }
    }
}

// resolveCollisions pushes the OTHER circle out of a dragged circle's way,
// but that push is rate-limited (COLLISION_MAX_STEP etc.) for a soft, fluid
// feel — it doesn't, by itself, stop the dragged circle from advancing
// into/through a neighbor faster than the neighbor can clear out. This is a
// hard backstop: it never lets a currently-dragged circle's own position
// end up overlapping any other circle beyond the allowed gap, so it can
// only ever push a neighbor aside, never slide past or through it. The
// neighbor itself is left to move at its own soft, eased pace — this only
// clamps the dragged circle's forward progress to match.
function clampDraggedAgainstOthers() {
    circles.forEach((active) => {
        if (!active.isDragging) return
        circles.forEach((other) => {
            if (other.id === active.id) return
            const minDist = active.radius + other.radius + CIRCLE_GAP
            const ocx = other.x.get() + other.radius
            const ocy = other.y.get() + other.radius
            const acx = active.x.get() + active.radius
            const acy = active.y.get() + active.radius
            let dx = acx - ocx
            let dy = acy - ocy
            let dist = Math.hypot(dx, dy)
            if (dist >= minDist) return
            if (dist < 0.001) {
                const angle = idAngle(active.id) - idAngle(other.id)
                dx = Math.cos(angle)
                dy = Math.sin(angle)
                dist = 0.001
            }
            const nx = dx / dist
            const ny = dy / dist
            // Partial step toward the boundary distance rather than an
            // instant full snap — see CLAMP_DRAG_STRENGTH. Converges to the
            // same tight result within a couple of calls when there's only
            // one neighbor to satisfy; settles into a small, smooth
            // compromise instead of a hard back-and-forth when squeezed
            // between two constraints with no position that satisfies both.
            const targetX = ocx + nx * minDist - active.radius
            const targetY = ocy + ny * minDist - active.radius
            const corrected = clampToContainer(
                active.x.get() + (targetX - active.x.get()) * CLAMP_DRAG_STRENGTH,
                active.y.get() + (targetY - active.y.get()) * CLAMP_DRAG_STRENGTH,
                active.radius
            )
            active.x.set(corrected.x)
            active.y.set(corrected.y)
        })
    })
}

function bezier(t: number, p0: number, p1: number, p2: number) {
    const mt = 1 - t
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

// True if some other, currently-dragged circle is close enough to c to be
// actively pushing on it right now. Used to suppress c's corner-force for
// the duration of that contact — otherwise the corner-force (pulling c
// away from a corner) and resolveCollisions' direct positional push
// (shoving c toward wherever the dragged circle forces it, which can be
// straight into that same corner) fight for control of c's position every
// single frame, which is what reads as trembling. The collision push gets
// uncontested control while contact lasts; the corner-force picks back up
// the instant it doesn't.
function isBeingPressedByDrag(c: CircleState): boolean {
    const cx = c.x.get() + c.radius
    const cy = c.y.get() + c.radius
    for (const other of circles.values()) {
        if (other.id === c.id || !other.isDragging) continue
        const minDist = c.radius + other.radius + CIRCLE_GAP
        const dx = cx - (other.x.get() + other.radius)
        const dy = cy - (other.y.get() + other.radius)
        if (Math.hypot(dx, dy) < minDist + PRESS_MARGIN) return true
    }
    return false
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
                    c.vx = 0
                    c.vy = 0
                }

                // Real velocity + spring integration, not a position-ease.
                // A plain ease can only approach its target — this can
                // overshoot and spring back, which is what actually reads
                // as a bounce. The pull toward home and (for a disturbed
                // circle) the push away from a corner are both just
                // accelerations that sum into one velocity update, so they
                // never fight each other positionally the way two separate
                // "set the position to X" systems did before.
                const x = c.x.get()
                const y = c.y.get()

                let ax = (c.homeX - x) * SPRING_STIFFNESS
                let ay = (c.homeY - y) * SPRING_STIFFNESS

                if (c.disturbed && !isBeingPressedByDrag(c)) {
                    const corner = getCornerPush(x, y, c.radius)
                    ax += corner.pushX * CORNER_FORCE_SCALE
                    ay += corner.pushY * CORNER_FORCE_SCALE
                }

                c.vx = clamp(
                    (c.vx + ax) * SPRING_DAMPING,
                    -MAX_VELOCITY,
                    MAX_VELOCITY
                )
                c.vy = clamp(
                    (c.vy + ay) * SPRING_DAMPING,
                    -MAX_VELOCITY,
                    MAX_VELOCITY
                )
                // Resting-contact deadzone: once velocity decays to a
                // near-nothing residual, kill it outright instead of
                // leaving it to asymptotically approach zero forever. Pure
                // damping never actually reaches zero, and a circle with
                // nowhere left to go (jammed between a neighbor and a
                // wall) keeps getting re-pushed by that residual every
                // frame — this is what stops it settling completely still.
                if (Math.abs(c.vx) < VELOCITY_REST_THRESHOLD) c.vx = 0
                if (Math.abs(c.vy) < VELOCITY_REST_THRESHOLD) c.vy = 0

                let nextX = x + c.vx
                let nextY = y + c.vy

                // Hard wall: reflect velocity so contact reads as an actual
                // bounce off the edge, not just a stop — but only above a
                // minimum incoming speed. Without that floor, a circle held
                // at the wall with no real momentum (nothing forcing it
                // away, nothing letting it leave) reflects a tiny residual
                // back and forth forever: each bounce is too small to
                // visibly move it, but the buzzing is still visible. Below
                // the floor, the wall just absorbs it — resting contact.
                const bounds = getBoundsForRadius(c.radius)
                if (nextX < bounds.minX) {
                    nextX = bounds.minX
                    c.vx =
                        Math.abs(c.vx) > WALL_BOUNCE_MIN_VELOCITY
                            ? Math.abs(c.vx) * WALL_RESTITUTION
                            : 0
                } else if (nextX > bounds.maxX) {
                    nextX = bounds.maxX
                    c.vx =
                        Math.abs(c.vx) > WALL_BOUNCE_MIN_VELOCITY
                            ? -Math.abs(c.vx) * WALL_RESTITUTION
                            : 0
                }
                if (nextY < bounds.minY) {
                    nextY = bounds.minY
                    c.vy =
                        Math.abs(c.vy) > WALL_BOUNCE_MIN_VELOCITY
                            ? Math.abs(c.vy) * WALL_RESTITUTION
                            : 0
                } else if (nextY > bounds.maxY) {
                    nextY = bounds.maxY
                    c.vy =
                        Math.abs(c.vy) > WALL_BOUNCE_MIN_VELOCITY
                            ? -Math.abs(c.vy) * WALL_RESTITUTION
                            : 0
                }

                c.x.set(nextX)
                c.y.set(nextY)
            }
        })

        resolveCollisions(settledIds)
        clampDraggedAgainstOthers()

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
            vx: 0,
            vy: 0,
            originalHomeX: home.x,
            originalHomeY: home.y,
            disturbed: false,
            hasSettled: false,
            settledAt: 0,
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
        c.disturbed = true
        // Anchor home to the exact release point and hand off to the
        // spring/corner-force physics in tick() — no pre-resolved "safe"
        // position, no teleport. The anti-tunneling clamp during drag
        // already guarantees this position doesn't overlap anything, and
        // if it's near a corner the corner-force will carry it out from
        // here with a real bounce. c.vx/vy are left as whatever the last
        // pointer move computed, so a release mid-swipe carries that
        // motion into the bounce instead of dropping dead.
        const dropped = clampToContainer(c.x.get(), c.y.get(), radius)
        c.homeX = dropped.x
        c.homeY = dropped.y
        c.x.set(dropped.x)
        c.y.set(dropped.y)
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
            c.pointerId = event.pointerId
            c.dragStartPointerX = event.clientX
            c.dragStartPointerY = event.clientY
            c.dragStartX = c.x.get()
            c.dragStartY = c.y.get()
            c.hasSettled = false
            c.vx = 0
            c.vy = 0
            startTransition(() => setZIndex(DRAG_Z_INDEX))

            const onPointerMove = (moveEvent: PointerEvent) => {
                const active = circles.get(id)
                if (!active || !active.isDragging) return
                if (active.pointerId !== moveEvent.pointerId) return

                const rawTargetX =
                    active.dragStartX +
                    (moveEvent.clientX - active.dragStartPointerX)
                const rawTargetY =
                    active.dragStartY +
                    (moveEvent.clientY - active.dragStartPointerY)

                // Walk the pointer's move in short sub-steps instead of
                // jumping straight to rawTarget. A single pointermove event
                // can carry a large delta (a fast flick, or a dropped
                // frame), and checking collisions only at the final point
                // would let the dragged circle skip clean over a neighbor
                // in one step, landing past it. Each sub-step advances a
                // small fixed increment from the circle's ACTUAL current
                // (possibly already-blocked) position — not from a fixed
                // interpolation along the original start->target line. That
                // distinction matters: once a neighbor holds the circle
                // back, an interpolation based on the original line keeps
                // advancing past where the circle actually is, and can
                // cross the neighbor's center and get corrected out the
                // wrong (far) side. Stepping from the live position instead
                // means a blocked circle keeps re-attempting the same small
                // increment and keeps getting held at the same boundary.
                const fromX = active.x.get()
                const fromY = active.y.get()
                const totalDx = rawTargetX - fromX
                const totalDy = rawTargetY - fromY
                const travel = Math.hypot(totalDx, totalDy)
                const steps = Math.max(1, Math.ceil(travel / DRAG_SUBSTEP_SIZE))
                const stepDx = totalDx / steps
                const stepDy = totalDy / steps

                for (let s = 0; s < steps; s++) {
                    const stepX = active.x.get() + stepDx
                    const stepY = active.y.get() + stepDy

                    const bounced = clampWithEdgeBounce(stepX, stepY, radius)
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

                    // Move the dragged circle to this step's position.
                    active.x.set(draggedWithCorner.x)
                    active.y.set(draggedWithCorner.y)

                    // Resolve pushes against every other circle, repeatedly,
                    // at this step. This reuses the exact same push/bounce
                    // logic that already lives in resolveCollisions (the
                    // a.isDragging branch moves only the OTHER circle, with
                    // a bounce fed into its homeX/homeY). clampDraggedAgainstOthers
                    // then hard-stops this circle's own position from ending
                    // up overlapping (or sliding past, to the other side of)
                    // any neighbor that couldn't get out of the way fast
                    // enough — the neighbor keeps easing away at its own
                    // soft pace, this just won't let the dragged circle
                    // outrun it.
                    const allIds = new Set(circles.keys())
                    for (let i = 0; i < DRAG_COLLISION_ITERATIONS; i++) {
                        resolveCollisions(allIds)
                        clampDraggedAgainstOthers()
                    }
                }

                // Track this event's net movement as a velocity estimate.
                // If the pointer is released mid-swipe, endDrag hands off
                // to the spring/bounce physics without resetting it, so a
                // fast release carries its motion into a natural fling
                // instead of the circle just going dead on release.
                active.vx = clamp(
                    active.x.get() - fromX,
                    -MAX_VELOCITY,
                    MAX_VELOCITY
                )
                active.vy = clamp(
                    active.y.get() - fromY,
                    -MAX_VELOCITY,
                    MAX_VELOCITY
                )
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
