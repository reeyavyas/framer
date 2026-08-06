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
    // The raw, instantaneous target from collision pushes -- can be
    // rewritten many times between visible frames (every inner iteration
    // of every resolveCollisions call, including the up-to-40-per-event
    // burst during an active drag). smoothHomeX/Y is what position-easing
    // actually chases, updated (and damped) exactly once per animation
    // frame, so upstream noise in homeX can't reach the screen at full
    // strength every time it's rewritten. See HOME_TARGET_SMOOTHING.
    smoothHomeX: number
    smoothHomeY: number
    // While this circle is being dragged, a damped copy of its own live
    // x/y -- used as the reference point OTHER circles' collision math
    // reacts to, so their responses track a smoothed version of the drag
    // path rather than raw, noisy pointer coordinates. Irrelevant while
    // not dragging. See collisionRefX/Y and DRAG_POSITION_SMOOTHING.
    dragSmoothX: number
    dragSmoothY: number
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
// Corner-specific repulsion. Deliberately NOT applied while a circle is
// actively being dragged, or continuously to circles it pushes along the
// way -- fighting for corner clearance while everything is still fluidly
// moving is exactly what produced visible shaking right at the corners.
// Corners are instead resolved once, cleanly, as a bounce-back when the
// drag ends (see endDrag / bounceOthersOutOfCorners) and as part of the
// one-time entrance layout. This constant now only feeds the soft nudge
// inside resolveConflictFreePosition (used by both of those), where it's
// measured as true radial distance to each of the 4 canvas corners (not
// per-axis wall depth) so there's no spot near a corner where the
// outward force fades to zero.
const CORNER_ZONE = 110 //Increase to push circles away starting further from each corner
const CORNER_PULL_MAX = 58 //Increase for a firmer diagonal push out of corners
// Deterministic (non-force-based) minimum distance every circle must keep
// from EACH of the two walls that form a corner, once it's actually at
// rest -- used only by the one-time placement passes (initial layout and
// drop), not every frame. This is what actually guarantees "never resting
// in a corner", independent of radius: a soft, capped, iterative force
// (like CORNER_PULL_MAX above) converges too slowly to clear a corner for
// a large circle whose designer-specified home sits almost on top of one
// (e.g. a 200px-radius circle at home (52, 55) against a 24px inset -- the
// force-based push alone only ever nudged it a few px past the edge of its
// own near-edge zone). Checking distance from BOTH walls independently
// (rather than one combined diagonal distance from the corner point)
// matters: a solver can satisfy "far enough from the corner point" cheaply
// by retreating along whichever single axis is less obstructed by a
// neighbor, while leaving the circle just as pinned against the other
// wall -- which still reads as "stuck in the corner". Scales with radius
// so bigger circles -- which dominate the corner more -- keep
// proportionally more distance from it.
const CORNER_CLEARANCE_BASE = 50 //Increase to keep every circle further from a corner regardless of size
const CORNER_CLEARANCE_RADIUS_FACTOR = 0.15 //Increase so bigger circles keep proportionally more distance from a corner
const DRAG_EDGE_RESISTANCE = 0.95
const CIRCLE_GAP = 10
const COLLISION_ITERATIONS = 4
// One consistent set of collision gains for every pair, whether or not a
// drag is involved. These used to be split into a snappier "drag" tier and
// a gentler "settle" tier, but a circle can easily be touched by one pair
// of each kind in the same frame (e.g. squeezed between an actively-
// dragged neighbor and a third, uninvolved circle) -- two different
// correction strengths pulling on the same body every iteration is a
// tug-of-war that oscillates regardless of how gentle either tier is on
// its own. Using one gentle-enough-to-never-overshoot strength everywhere
// removes that mismatch. `pairRamp` (below) still keeps drag-involved
// pairs responding immediately and settle-only pairs waiting for the
// post-drop handoff, so responsiveness while actually pushing a circle
// around is unaffected.
const COLLISION_SETTLE_SEPARATION_STRENGTH = 0.5
const COLLISION_SETTLE_BOUNCE_MULTIPLIER = 0.3
const COLLISION_SETTLE_REBOUND_PUSH = 7
const COLLISION_DEADZONE = 0.6
const COLLISION_MAX_STEP = 12
const COLLISION_ENTRY_MAX_STEP = 2.8
const HOME_EASE = 0.18
// How much of the gap between a circle's raw push target (homeX/Y) and
// its followed target (smoothHomeX/Y) closes each ANIMATION FRAME (not
// each collision-resolution call -- see the CircleState comment). A
// circle two or three collision-hops away from an actively-dragged one
// gets its raw target rewritten dozens of times between visible frames;
// without this damping, any tiny per-rewrite discontinuity (sub-pixel
// input noise, a corner-clearance snap, a neighbor also mid-correction)
// reaches the screen at full strength every single time, which reads as
// a persistent high-frequency tremor even though the circle is
// nominally just "being pushed". A single large, sustained push (e.g.
// suddenly overlapping a dragged neighbor by 80px) still fully resolves
// within 2-3 frames at this value -- responsiveness is unaffected;
// only frame-to-frame noise gets absorbed.
const HOME_TARGET_SMOOTHING = 0.5
// How much of the gap between a dragged circle's live position and its
// dragSmoothX/Y closes each animation frame. Complements
// HOME_TARGET_SMOOTHING: that one damps a pushed circle's own target
// updates, this one damps the input those updates are computed FROM in
// the first place (see collisionRefX/Y). The dragged circle itself always
// renders at the raw, live pointer position -- only what OTHER circles
// react to is smoothed.
const DRAG_POSITION_SMOOTHING = 0.35
// Once a settled circle is within this many px of its home target on both
// axes, stop nudging it entirely. Without this, an idle circle keeps making
// imperceptible (but nonzero) position writes forever; with it, a circle
// that nothing is touching goes fully still, matching how the reference
// app behaves between drags.
const HOME_SETTLE_EPSILON = 0.05
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

// Eased 0..1 falloff (zero slope at both ends) so repulsion forces ramp
// in and out gradually instead of switching on/off abruptly, which is a
// major source of visible jitter when a force's on/off boundary is crossed
// repeatedly frame to frame.
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

// Edge avoidance force: Active ONLY when a circle penetrates the edge zone,
// or (when includeCorner is true) is within CORNER_ZONE of one of the 4
// canvas corners. includeCorner is false for the live, continuous
// drag-time call sites -- corner correction there happens once, as a
// bounce-back on drop, not as an ongoing force while things are still
// moving. It stays true for the one-time placement passes (entrance
// layout, drop resolution), which is exactly where corners should be
// resolved.
function getEdgePull(
    x: number,
    y: number,
    radius: number,
    strengthMultiplier: number = 1,
    includeCorner: boolean = true
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
    const blendX = clamp(depthX / zone, 0, 1)
    const blendY = clamp(depthY / zone, 0, 1)
    const edgeBlend = smoothstep(Math.max(blendX, blendY))
    const wallAmount = zone * edgeBlend * EDGE_PULL_STRENGTH

    // True radial distance to each corner point (independent of the
    // per-axis wall zone above), so a circle sitting diagonally near a
    // corner but just outside the wall zone still gets pushed out.
    let cornerAmount = 0
    if (includeCorner) {
        const corners = [
            { x: bounds.minX, y: bounds.minY },
            { x: bounds.maxX, y: bounds.minY },
            { x: bounds.minX, y: bounds.maxY },
            { x: bounds.maxX, y: bounds.maxY },
        ]
        let cornerCloseness = 0
        for (const corner of corners) {
            const cdist = Math.hypot(x - corner.x, y - corner.y)
            if (cdist >= CORNER_ZONE) continue
            cornerCloseness = Math.max(cornerCloseness, 1 - cdist / CORNER_ZONE)
        }
        cornerAmount =
            cornerCloseness > 0 ? CORNER_PULL_MAX * smoothstep(cornerCloseness) : 0
    }

    const amount =
        Math.max(wallAmount, cornerAmount) * strengthMultiplier

    if (amount <= 0.001) {
        return { isNearEdge: false, pullX: 0, pullY: 0, strength: 0 }
    }

    const towardCenterX = canvasCenterX - centerX
    const towardCenterY = canvasCenterY - centerY
    const len = Math.hypot(towardCenterX, towardCenterY) || 1
    const nx = towardCenterX / len
    const ny = towardCenterY / len

    return {
        isNearEdge: true,
        pullX: nx * amount,
        pullY: ny * amount,
        strength: amount,
    }
}

// Deterministically guarantees a circle resting at (x, y) keeps at least
// CORNER_CLEARANCE_BASE + radius * CORNER_CLEARANCE_RADIUS_FACTOR px of
// distance from EACH of the two walls forming a corner (not just combined
// diagonal distance from the corner point -- see the constant comment
// above for why that distinction matters), so it always fully clears the
// corner in one step regardless of radius or how close its starting point
// was. Only ever nudges the axis/axes that are actually short, so a
// circle that's merely near a single wall (not a corner) is left alone.
function clearCorners(x: number, y: number, radius: number) {
    const bounds = getBoundsForRadius(radius)
    const clearance =
        CORNER_CLEARANCE_BASE + radius * CORNER_CLEARANCE_RADIUS_FACTOR

    let nx = x
    let ny = y
    const nearLeft = nx - bounds.minX < clearance
    const nearRight = bounds.maxX - nx < clearance
    const nearTop = ny - bounds.minY < clearance
    const nearBottom = bounds.maxY - ny < clearance

    if (nearLeft && nearTop) {
        nx = Math.max(nx, bounds.minX + clearance)
        ny = Math.max(ny, bounds.minY + clearance)
    }
    if (nearRight && nearTop) {
        nx = Math.min(nx, bounds.maxX - clearance)
        ny = Math.max(ny, bounds.minY + clearance)
    }
    if (nearLeft && nearBottom) {
        nx = Math.max(nx, bounds.minX + clearance)
        ny = Math.min(ny, bounds.maxY - clearance)
    }
    if (nearRight && nearBottom) {
        nx = Math.min(nx, bounds.maxX - clearance)
        ny = Math.min(ny, bounds.maxY - clearance)
    }

    return clampToContainer(nx, ny, radius)
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

// For a circle actively being dragged, use its damped dragSmoothX/Y as the
// reference point for collision math instead of its raw, live position.
// The dragged circle itself still renders 1:1 with the pointer (untouched
// here) -- this only affects how much OTHER circles get pushed by it. Raw
// pointer input has real frame-to-frame noise (no human hand moves in a
// perfectly smooth line), and resolveCollisions runs many times between
// two visible frames (up to 4 inner iterations x 10 calls per pointer-move
// event); without this, every bit of that noise reaches a pushed
// neighbor's actual on-screen position at full strength, every time,
// which is what a persistent tremor looks like on a circle in genuine
// contact with the dragged one.
function collisionRefX(c: CircleState) {
    return c.isDragging ? c.dragSmoothX : c.x.get()
}
function collisionRefY(c: CircleState) {
    return c.isDragging ? c.dragSmoothY : c.y.get()
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

                const ax = collisionRefX(a) + a.radius
                const ay = collisionRefY(a) + a.radius
                const bx = collisionRefX(b) + b.radius
                const by = collisionRefY(b) + b.radius

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
                const dragInvolved = a.isDragging || b.isDragging
                const pairRamp = dragInvolved
                    ? Math.max(rampA, rampB)
                    : Math.min(rampA, rampB)
                if (pairRamp <= 0.001) continue

                // Same gains for every pair -- see the constant comment
                // above for why.
                const correction =
                    overlap * COLLISION_SETTLE_SEPARATION_STRENGTH * pairRamp
                const bounce = Math.min(
                    COLLISION_SETTLE_REBOUND_PUSH,
                    correction *
                        COLLISION_SETTLE_BOUNCE_MULTIPLIER *
                        (0.5 + pairRamp * 0.5)
                )
                const maxStep =
                    COLLISION_ENTRY_MAX_STEP +
                    (COLLISION_MAX_STEP - COLLISION_ENTRY_MAX_STEP) * pairRamp

                // Note: no clearCorners here. Corner clearance while
                // circles are actively being pushed around -- still
                // fluidly moving, overlap amounts still changing every
                // iteration -- is exactly what produced visible shaking
                // right at the corners. Pushed circles are free to end up
                // near a corner during the drag; bounceOthersOutOfCorners
                // gives them a single, clean bounce-back once the drag
                // that pushed them actually ends.
                if (a.isDragging) {
                    moveCircleBy(b, -nx * correction, -ny * correction, maxStep)
                    b.homeX = b.x.get() - nx * bounce
                    b.homeY = b.y.get() - ny * bounce
                } else if (b.isDragging) {
                    moveCircleBy(a, nx * correction, ny * correction, maxStep)
                    a.homeX = a.x.get() + nx * bounce
                    a.homeY = a.y.get() + ny * bounce
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
                }
            }
        }
    }
}

// getOtherCenter lets callers resolve against either other circles' live,
// on-screen positions (dragging/dropping) or their resting home positions
// (the one-time layout pass below, before anything has flown in yet).
function separateFromOthers(
    id: string,
    radius: number,
    centerX: number,
    centerY: number,
    getOtherCenter: (other: CircleState) => { x: number; y: number }
) {
    let hasOverlap = false
    for (const other of circles.values()) {
        if (other.id === id) continue
        const otherCenter = getOtherCenter(other)
        let dx = centerX - otherCenter.x
        let dy = centerY - otherCenter.y
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
    return { centerX, centerY, hasOverlap }
}

const liveCenter = (other: CircleState) => ({
    x: other.x.get() + other.radius,
    y: other.y.get() + other.radius,
})

const homeCenter = (other: CircleState) => ({
    x: other.homeX + other.radius,
    y: other.homeY + other.radius,
})

// Shared by resolveDropPosition (against other circles' live positions) and
// resolveHomePosition (against other circles' resting home positions).
function resolveConflictFreePosition(
    id: string,
    radius: number,
    x: number,
    y: number,
    getOtherCenter: (other: CircleState) => { x: number; y: number }
) {
    let centerX = x + radius
    let centerY = y + radius

    // Resolve overlap, the soft wall pull, and the hard corner-clearance
    // guarantee together in the same loop, re-checking overlap every time
    // any of them moves the circle. Doing these as separate loops let a
    // later step shove the circle into a neighbor (or back near a corner)
    // with no overlap check left to catch it -- that's how dropped circles
    // ended up visibly overlapping, and how circles ended up resting in a
    // corner despite the (too-weak, for large radii) force-based push.
    for (let i = 0; i < 16; i++) {
        const separated = separateFromOthers(
            id,
            radius,
            centerX,
            centerY,
            getOtherCenter
        )
        centerX = separated.centerX
        centerY = separated.centerY

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
            1.15
        )
        if (edgePull.isNearEdge) {
            const withPull = clampToContainer(
                centerX - radius + edgePull.pullX,
                centerY - radius + edgePull.pullY,
                radius
            )
            centerX = withPull.x + radius
            centerY = withPull.y + radius
        }

        const beforeCornerX = centerX - radius
        const beforeCornerY = centerY - radius
        const cleared = clearCorners(beforeCornerX, beforeCornerY, radius)
        centerX = cleared.x + radius
        centerY = cleared.y + radius
        const movedByCorner =
            Math.abs(cleared.x - beforeCornerX) > 0.01 ||
            Math.abs(cleared.y - beforeCornerY) > 0.01

        if (!separated.hasOverlap && !edgePull.isNearEdge && !movedByCorner) {
            break
        }
    }

    // Final guarantee pass: pure separation, no edge/corner pull. This
    // can't undo the corner-avoidance work above (it only pushes circles
    // apart from each other), so it's safe to run last and guarantees the
    // circle never rests on top of another one.
    for (let i = 0; i < 6; i++) {
        const separated = separateFromOthers(
            id,
            radius,
            centerX,
            centerY,
            getOtherCenter
        )
        centerX = separated.centerX
        centerY = separated.centerY
        const clamped = clampToContainer(
            centerX - radius,
            centerY - radius,
            radius
        )
        centerX = clamped.x + radius
        centerY = clamped.y + radius
        if (!separated.hasOverlap) break
    }

    return { x: centerX - radius, y: centerY - radius }
}

function resolveDropPosition(id: string, radius: number, x: number, y: number) {
    return resolveConflictFreePosition(id, radius, x, y, liveCenter)
}

// Called once when a drag ends: any OTHER circle that got pushed close
// enough to a corner during the drag (clearCorners would move it) gets a
// fresh corner-safe home right now, so it eases into a clean bounce-back
// away from the corner -- the same "soft glide instead of an instant
// snap" treatment the dropped circle itself already gets (see the comment
// in endDrag). This is the ONLY place non-dragged circles get
// corner-corrected; resolveCollisions deliberately leaves them alone
// while a drag is still moving them around.
//
// Deliberately uses clearCorners directly -- NOT resolveDropPosition /
// resolveConflictFreePosition, which would also try to negotiate overlap
// with every other circle in the same pass. That negotiation is exactly
// what left some circles under-corrected: a corner escape that also has
// to satisfy "don't overlap this other circle" can end up blocked or only
// partially resolved, whether the blocker is another circle stuck in the
// SAME corner (whose real position hasn't caught up yet -- only its home
// target has) or a completely unrelated circle sitting in the way of the
// only available escape route out of a DIFFERENT corner. clearCorners is
// pure geometry against the canvas walls -- it doesn't look at other
// circles at all, so nothing can block it and every cornered circle
// always gets the full, guaranteed escape distance. Any overlap this
// temporarily reintroduces is cleaned up on its own over the next few
// frames by the ordinary continuous collision resolution, which no longer
// touches corners either, so there's nothing left for it to fight over.
function bounceOthersOutOfCorners(exceptId: string, now: number) {
    for (const other of circles.values()) {
        if (other.id === exceptId || other.isDragging) continue
        const currentX = other.x.get()
        const currentY = other.y.get()
        const cleared = clearCorners(currentX, currentY, other.radius)
        const needsBounce =
            Math.abs(cleared.x - currentX) > 0.5 ||
            Math.abs(cleared.y - currentY) > 0.5
        if (!needsBounce) continue

        other.homeX = cleared.x
        other.homeY = cleared.y
        // Synced immediately, same reasoning as endDrag: the bounce-back
        // is one clean ease (position -> smoothHome), not a sluggish
        // double-ease where smoothHome first has to catch up to home too.
        other.smoothHomeX = cleared.x
        other.smoothHomeY = cleared.y
        other.hasSettled = true
        other.settledAt = now
    }
}

// Runs once, before the entrance flight starts: resolves every circle's
// designer-specified home coordinates against each other (several of them
// are only 5-10px apart by design) so each circle already has a conflict-
// and corner-safe landing spot. The entrance then flies each circle
// straight to that final spot, so it lands exactly on target with nothing
// left to correct afterward -- no multi-second "settling" drift once
// nobody is touching the screen.
function resolveAllHomePositions() {
    for (const c of circles.values()) {
        const resolved = resolveConflictFreePosition(
            c.id,
            c.radius,
            c.homeX,
            c.homeY,
            homeCenter
        )
        c.homeX = resolved.x
        c.homeY = resolved.y
        c.smoothHomeX = resolved.x
        c.smoothHomeY = resolved.y
    }
}

function bezier(t: number, p0: number, p1: number, p2: number) {
    const mt = 1 - t
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

let homesResolved = false

function startLoopIfNeeded() {
    if (rafId !== null) return

    const tick = (timestamp: number) => {
        if (entranceStartTime === null) {
            entranceStartTime = timestamp
        }
        if (!homesResolved) {
            resolveAllHomePositions()
            homesResolved = true
        }

        const totalElapsed = timestamp - entranceStartTime
        const settledIds = new Set<string>()

        circles.forEach((c) => {
            if (!c) return

            if (c.isDragging) {
                settledIds.add(c.id)
                c.dragSmoothX += (c.x.get() - c.dragSmoothX) * DRAG_POSITION_SMOOTHING
                c.dragSmoothY += (c.y.get() - c.dragSmoothY) * DRAG_POSITION_SMOOTHING
                const edgeWhileDragging = getEdgePull(
                    c.x.get(),
                    c.y.get(),
                    c.radius,
                    DRAG_EDGE_RESISTANCE,
                    false
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
                }

                // Home is already conflict- and corner-safe (resolved up
                // front for the entrance, or by resolveDropPosition /
                // resolveCollisions when it changes later), so idle
                // circles just ease straight toward it and then go
                // perfectly still -- no ambient force is re-applied here.
                //
                // homeX/Y itself can be rewritten many times between
                // frames while a nearby drag is pushing this circle
                // (indirectly, through one or more neighbors); smoothHomeX/Y
                // only takes one step toward it per frame, right here, so
                // that per-rewrite noise is damped before it ever reaches
                // the position easing below. See HOME_TARGET_SMOOTHING.
                c.smoothHomeX += (c.homeX - c.smoothHomeX) * HOME_TARGET_SMOOTHING
                c.smoothHomeY += (c.homeY - c.smoothHomeY) * HOME_TARGET_SMOOTHING

                const currentX = c.x.get()
                const currentY = c.y.get()
                const dx = c.smoothHomeX - currentX
                const dy = c.smoothHomeY - currentY
                if (
                    Math.abs(dx) > HOME_SETTLE_EPSILON ||
                    Math.abs(dy) > HOME_SETTLE_EPSILON
                ) {
                    c.x.set(currentX + dx * HOME_EASE)
                    c.y.set(currentY + dy * HOME_EASE)
                }
            }
        })

        resolveCollisions(settledIds)

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
            smoothHomeX: home.x,
            smoothHomeY: home.y,
            dragSmoothX: origin.x,
            dragSmoothY: origin.y,
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
            hasSettled: false,
            settledAt: 0,
        })

        if (wasEmptyBeforeMount) {
            entranceStartTime = null
        }
        // A circle joining after the initial batch already resolved its
        // homes (or one leaving mid-session) means that resolution is
        // stale -- re-run it before the next frame so every circle still
        // gets a conflict-free landing spot.
        homesResolved = false
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
                homesResolved = false
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
        const now =
            typeof performance !== "undefined" ? performance.now() : Date.now()
        c.settledAt = now
        const dropped = clampToContainer(c.x.get(), c.y.get(), radius)
        const resolved = resolveDropPosition(id, radius, dropped.x, dropped.y)
        c.homeX = resolved.x
        c.homeY = resolved.y
        // Sync smoothHomeX/Y immediately (not eased) so the visible
        // bounce-back is driven by a single easing stage (position ->
        // smoothHome) rather than a sluggish double-ease.
        c.smoothHomeX = resolved.x
        c.smoothHomeY = resolved.y
        // Deliberately NOT snapping c.x/c.y to `resolved` here. Leaving
        // them where the drag released and only updating the home target
        // means the settle-easing in the tick loop animates the actual
        // visible correction -- a soft glide/bounce from the drop point
        // back toward the safer resting spot -- instead of silently
        // teleporting straight there, which read as the circle just
        // staying put against the corner/wall with no bounce-back at all.
        //
        // Any OTHER circle this drag pushed close to a corner along the
        // way gets the same treatment now too.
        bounceOthersOutOfCorners(id, now)
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
            c.dragSmoothX = c.x.get()
            c.dragSmoothY = c.y.get()
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
                    DRAG_EDGE_RESISTANCE,
                    false
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
