import * as React from "react"
import * as ReactDOM from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TutorialOverlay
 *
 * ONE component, reused by dropping an instance on every page that
 * needs a tutorial beat — configured entirely from the property panel,
 * no code editing per page. Each instance is exactly one hole, one
 * instruction card, one optional glow ring around the hole.
 *
 * With 7 tutorials and several pages each, a code-authored multi-step
 * sequence living inside a single component doesn't scale — you'd end
 * up duplicating the whole file per page. Instead:
 *
 *  - Moving to a DIFFERENT PAGE is just real Framer navigation:
 *    whatever the real target element already does when tapped (or an
 *    optional timer-driven link for a pure "watch this" beat) is what
 *    moves the user on. Nothing to configure for this.
 *
 *  - A page with SEVERAL steps gets several TutorialOverlay instances
 *    dropped on it — one per step — sharing a `pageGroup` string. Give
 *    each instance a `stepNumber` (1, 2, 3, …); only the current step
 *    shows itself, and one of three triggers hands off to the next
 *    stepNumber in that same group: `clickAdvancesStep` (tap the real
 *    target), `nextStepAfterSeconds` (a timer, no tap needed), or
 *    `scrollAdvancesStep` + `scrollThresholdPercent` (for a beat like
 *    "scroll down to see more" that has no tap target at all — point
 *    `scrollContainerTarget` at the real scrollable element, tagged
 *    the same way as any other target, or leave it blank to watch the
 *    whole page). A page with only one step just leaves `pageGroup`
 *    blank — it behaves exactly as a single always-on overlay, no
 *    coordination needed. Pick a `pageGroup` string that's unique to
 *    that one page (e.g. its page name) so unrelated pages never
 *    cross-talk.
 *
 * This component never manages a cross-PAGE sequence itself — only the
 * optional same-page step handoff described above.
 *
 * For the end of a whole tutorial, use TutorialCongrats.tsx instead —
 * a separate, smaller component built for a full-screen finish, with
 * no hole/target of its own. Drop one per tutorial's last page.
 *
 * Targeting a real element: see TutorialTargets.tsx — one shared file,
 * one thin override export per target, reused across every page.
 *
 * The glow ring is plain CSS (border + box-shadow + a CSS keyframe
 * pulse), drawn directly around the same measured rect and shape used
 * to cut the hole — so it's always perfectly aligned to it with no
 * separate layer to place or keep in sync.
 *
 * The arrow is hand-built inline SVG + framer-motion — plain React,
 * the same category as everything else in this file, not a live
 * Framer component instance. (An earlier version tried embedding a
 * native ComponentInstance slot as the arrow and it crashed — Suspense
 * frames from Framer's own lazy component loading, unavailable to a
 * component instantiated bare outside Framer's normal render tree.
 * This project's own git history — deleted OverlayPortal.tsx /
 * OverlayOverride.tsx — already fought that same class of problem
 * trying to portal live Framer component content.) The line and the
 * arrowhead live inside ONE <g> together, so arrowRotation rotates
 * them as a single rigid unit — there's no way for the two pieces to
 * drift out of alignment with each other.
 */

type HoleShape = "rectangle" | "circle" | "pill"

interface Props {
    active: boolean

    target: string
    holeShape: HoleShape
    cornerRadius: number
    holePaddingTop: number // expands the measured target's box outward before cutting the hole
    holePaddingRight: number
    holePaddingBottom: number
    holePaddingLeft: number

    pageGroup: string // shared by every step on THIS page. Blank = single-step page, no coordination.
    stepNumber: number // 1-based position within pageGroup
    clickAdvancesStep: boolean // tapping the real target hands off to stepNumber + 1
    nextStepAfterSeconds: number // 0 = off. Hands off to stepNumber + 1 with no click needed.
    scrollAdvancesStep: boolean // scrolling past scrollThresholdPercent hands off to stepNumber + 1
    scrollThresholdPercent: number // 0-100, how far down before it counts as "scrolled"
    scrollContainerTarget: string // data-tutorial-target of the real scrollable element. Blank = the whole page.

    cardTitleLine1: string
    cardTitleLine1Color: string
    cardTitleLine2: string
    cardTitleLine2Color: string
    cardBody: string
    cardBackgroundColor: string
    cardBodyColor: string
    cardAnchorX: "left" | "center" | "right"
    cardAnchorY: "top" | "center" | "bottom"
    cardOffsetX: number
    cardOffsetY: number

    showProgressDots: boolean
    progressIndex: number
    progressTotal: number

    showGlow: boolean
    glowVariant: "static" | "breathing" | "ripple"
    glowColor: string
    glowIntensity: number
    glowDelaySeconds: number // 0 = as soon as the hole appears. Uncapped.

    showArrow: boolean
    arrowVariant: "curve" | "bounce"
    arrowColor: string
    arrowStrokeWidth: number
    arrowSize: number
    arrowRotation: number // degrees, rotates the whole grouped line+arrowhead together
    arrowReflect: boolean
    arrowReflectAngle: number // degrees — the axis to mirror across. 0 = horizontal flip, 90 = vertical flip.
    arrowDelaySeconds: number // uncapped
    arrowOffsetX: number
    arrowOffsetY: number

    autoAdvanceAfterSeconds: number // 0 = off. Uncapped otherwise.
    autoAdvanceLink?: string

    dimColor: string
    blurAmount: number
    accentColor: string

    showSkipButton: boolean
    skipLabel: string
    skipLink?: string
    showExitButton: boolean
    exitLink?: string

    style?: React.CSSProperties
}

// Angle (degrees, atan2 convention: 0° = pointing +X/right, 90° =
// pointing +Y/down) of a Bezier curve's tangent at its endpoint. For a
// quadratic or cubic curve the end tangent is always (endpoint - the
// LAST control point before it) — this is what the arrowhead below is
// rotated to, computed directly from the same coordinates the path
// itself uses, rather than trusted to the SVG engine's own marker
// orient="auto" calculation (which repeatedly rendered visibly
// mismatched in Framer's Preview despite being mathematically correct
// for a plain browser).
function bezierEndAngleDeg(
    endX: number,
    endY: number,
    lastControlX: number,
    lastControlY: number
): number {
    return (
        (Math.atan2(endY - lastControlY, endX - lastControlX) * 180) / Math.PI
    )
}

// ---------------------------------------------------------------------
// Geometry helpers (same clip-path evenodd hole trick as SpotlightOverlay)
// ---------------------------------------------------------------------
function roundedRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2))
    return `M${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x + rr} A${rr},${rr} 0 0 1 ${x},${y + h - rr} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
    return `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`
}

function buildHolePath(rect: DOMRect, shape: HoleShape, cornerRadius: number) {
    if (shape === "circle") {
        return ellipsePath(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            rect.width / 2,
            rect.height / 2
        )
    }
    const r =
        shape === "pill" ? Math.min(rect.width, rect.height) / 2 : cornerRadius
    return roundedRectPath(rect.left, rect.top, rect.width, rect.height, r)
}

// Locate the real scrollable container under a point, ignoring our own
// overlay nodes — lets wheel/touch pass through to the right element
// even though the overlay sits visually on top of everything.
function findScrollableAt(x: number, y: number): HTMLElement | Window {
    const stack = (document.elementsFromPoint(x, y) || []) as HTMLElement[]
    for (const hit of stack) {
        if (hit.closest("[data-tutorial-overlay]")) continue
        let node: HTMLElement | null = hit
        while (node && node !== document.body) {
            const s = window.getComputedStyle(node)
            if (
                (s.overflowY === "auto" || s.overflowY === "scroll") &&
                node.scrollHeight > node.clientHeight
            ) {
                return node
            }
            node = node.parentElement
        }
    }
    return window
}

function scrollByOn(target: HTMLElement | Window, top: number, left = 0) {
    if (target === window) window.scrollBy({ top, left })
    else (target as HTMLElement).scrollBy({ top, left })
}

// Card positioning lives on a plain (non-motion) wrapper, never on the
// motion.div itself — framer-motion takes full ownership of the
// `transform` CSS property on any element it animates, so a static
// centering transform set alongside an animated one gets silently
// discarded. Keeping the two on separate elements avoids that clash.
function cardWrapperStyle(
    anchorX: "left" | "center" | "right",
    anchorY: "top" | "center" | "bottom",
    offsetX: number,
    offsetY: number
): React.CSSProperties {
    const style: React.CSSProperties = { position: "fixed" }
    let translateX = "0"
    let translateY = "0"

    if (anchorX === "left") style.left = 40 + offsetX
    else if (anchorX === "right") style.right = 40 - offsetX
    else {
        style.left = `calc(50% + ${offsetX}px)`
        translateX = "-50%"
    }

    if (anchorY === "top") style.top = 100 + offsetY
    else if (anchorY === "bottom") style.bottom = 90 - offsetY
    else {
        style.top = `calc(50% + ${offsetY}px)`
        translateY = "-50%"
    }

    style.transform = `translate(${translateX}, ${translateY})`
    return style
}

// ---------------------------------------------------------------------
// Shared same-page step coordination. Multiple TutorialOverlay
// instances sharing one `pageGroup` take turns — only the instance
// whose stepNumber matches the group's current step renders itself.
// Same module-level-Map coordination technique CircleOverrides.tsx
// already uses to keep its several circle instances in sync.
// ---------------------------------------------------------------------
const pageStepState = new Map<string, number>()
const pageStepListeners = new Map<string, Set<() => void>>()

function getPageStep(groupId: string): number {
    return pageStepState.get(groupId) ?? 1
}

function setPageStep(groupId: string, step: number) {
    pageStepState.set(groupId, step)
    pageStepListeners.get(groupId)?.forEach((fn) => fn())
}

function subscribePageStep(groupId: string, onChange: () => void) {
    if (!pageStepListeners.has(groupId))
        pageStepListeners.set(groupId, new Set())
    const listeners = pageStepListeners.get(groupId)!
    listeners.add(onChange)
    return () => listeners.delete(onChange)
}

export default function TutorialOverlay(props: Props) {
    const {
        active,
        target,
        holeShape,
        cornerRadius,
        holePaddingTop,
        holePaddingRight,
        holePaddingBottom,
        holePaddingLeft,
        pageGroup,
        stepNumber,
        clickAdvancesStep,
        nextStepAfterSeconds,
        scrollAdvancesStep,
        scrollThresholdPercent,
        scrollContainerTarget,
        cardTitleLine1,
        cardTitleLine1Color,
        cardTitleLine2,
        cardTitleLine2Color,
        cardBody,
        cardBackgroundColor,
        cardBodyColor,
        cardAnchorX,
        cardAnchorY,
        cardOffsetX,
        cardOffsetY,
        showProgressDots,
        progressIndex,
        progressTotal,
        showGlow,
        glowVariant,
        glowColor,
        glowIntensity,
        glowDelaySeconds,
        showArrow,
        arrowVariant,
        arrowColor,
        arrowStrokeWidth,
        arrowSize,
        arrowRotation,
        arrowReflect,
        arrowReflectAngle,
        arrowDelaySeconds,
        arrowOffsetX,
        arrowOffsetY,
        autoAdvanceAfterSeconds,
        autoAdvanceLink,
        dimColor,
        blurAmount,
        accentColor,
        showSkipButton,
        skipLabel,
        skipLink,
        showExitButton,
        exitLink,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [mounted, setMounted] = React.useState(false)
    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [viewport, setViewport] = React.useState({ w: 0, h: 0 })
    const [glowShown, setGlowShown] = React.useState(false)
    const [arrowShown, setArrowShown] = React.useState(false)

    const overlayRef = React.useRef<HTMLDivElement>(null)
    const rectRef = React.useRef<DOMRect | null>(null)

    // Re-render whenever this page group's current step changes, so the
    // instance whose stepNumber now matches can pick up rendering.
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
    React.useEffect(() => {
        if (!pageGroup) return
        return subscribePageStep(pageGroup, forceUpdate)
    }, [pageGroup])

    // A fresh page load resets its group to step 1, so a stale counter
    // left over from a previous visit can't skip straight to step 3.
    React.useEffect(() => {
        if (pageGroup && stepNumber === 1) setPageStep(pageGroup, 1)
    }, [pageGroup, stepNumber])

    const isMyTurn = !pageGroup || getPageStep(pageGroup) === stepNumber
    const advanceStep = React.useCallback(() => {
        if (pageGroup) setPageStep(pageGroup, stepNumber + 1)
    }, [pageGroup, stepNumber])

    React.useEffect(() => setMounted(true), [])
    React.useEffect(() => setGlowShown(false), [target])
    React.useEffect(() => setArrowShown(false), [target])

    // Measure the target, tracking it continuously (targets can move —
    // e.g. a draggable element like CircleOverrides.tsx's circles).
    React.useEffect(() => {
        if (!active || !isMyTurn || !target) {
            rectRef.current = null
            setRect(null)
            return
        }
        function measure() {
            const el = document.querySelector(
                `[data-tutorial-target="${target}"]`
            )
            if (el) {
                const raw = el.getBoundingClientRect()
                // Pad outward per-side here, once, so every downstream
                // consumer of this rect — the hole cutout, the click-block
                // and click-advance hit tests, the glow ring, the arrow
                // anchor — automatically uses the padded box instead of
                // needing its own special case.
                const top = Math.max(0, holePaddingTop)
                const right = Math.max(0, holePaddingRight)
                const bottom = Math.max(0, holePaddingBottom)
                const left = Math.max(0, holePaddingLeft)
                const next =
                    top || right || bottom || left
                        ? new DOMRect(
                              raw.left - left,
                              raw.top - top,
                              raw.width + left + right,
                              raw.height + top + bottom
                          )
                        : raw
                rectRef.current = next
                setRect(next)
            }
            setViewport({ w: window.innerWidth, h: window.innerHeight })
        }
        measure()
        window.addEventListener("resize", measure)
        const id = window.setInterval(measure, 150)
        return () => {
            window.removeEventListener("resize", measure)
            window.clearInterval(id)
        }
    }, [
        active,
        isMyTurn,
        target,
        holePaddingTop,
        holePaddingRight,
        holePaddingBottom,
        holePaddingLeft,
    ])

    // Timer-driven glow reveal — independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || !isMyTurn || !showGlow) return
        const t = setTimeout(
            () => setGlowShown(true),
            Math.max(glowDelaySeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, isMyTurn, showGlow, glowDelaySeconds])

    // Timer-driven arrow reveal — independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || !isMyTurn || !showArrow) return
        const t = setTimeout(
            () => setArrowShown(true),
            Math.max(arrowDelaySeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, isMyTurn, showArrow, arrowDelaySeconds])

    // Optional timer-driven navigation to the next page — for a pure
    // "watch this" beat that needs no tap at all.
    React.useEffect(() => {
        if (
            !active ||
            !isMyTurn ||
            !autoAdvanceAfterSeconds ||
            !autoAdvanceLink
        )
            return
        const t = setTimeout(
            () => {
                window.location.href = autoAdvanceLink
            },
            Math.max(autoAdvanceAfterSeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, isMyTurn, autoAdvanceAfterSeconds, autoAdvanceLink])

    // Optional timer-driven hand-off to the next step on THIS page —
    // independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || !isMyTurn || !nextStepAfterSeconds) return
        const t = setTimeout(
            advanceStep,
            Math.max(nextStepAfterSeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, isMyTurn, nextStepAfterSeconds, advanceStep])

    // Explicit click-blocking. Replaces relying on clip-path to exclude
    // the hole from hit-testing — clip-path reliably PAINTS the hole, but
    // whether it reliably excludes that same region from real pointer
    // hit-testing turned out not to be dependable: a correctly-linked
    // real element under the hole wasn't receiving taps. This does the
    // same job explicitly instead: any click landing outside the current
    // hole is blocked (preventDefault + stopPropagation) so the user
    // can't wander into the real UI; a click inside the hole is left
    // completely alone, so it reaches whatever's really there exactly as
    // if this overlay weren't in the DOM at all. Clicks on this overlay's
    // own UI (skip/exit buttons) are always excluded from blocking.
    React.useEffect(() => {
        if (!active || !isMyTurn) return
        function blockOutsideHole(e: PointerEvent | MouseEvent) {
            const eventTarget = e.target as HTMLElement | null
            // Also exempt any other full-screen "system" overlay (e.g.
            // an inactivity/idle-timeout modal) that marks its own
            // portaled root with data-system-overlay. Without this, a
            // capture-phase stopPropagation() here runs before the
            // click ever reaches that overlay's own DOM/React handlers
            // — silently swallowing taps on it even though it's
            // visually on top, since this listener is on window and
            // fires first regardless of z-index.
            if (
                eventTarget?.closest(
                    "[data-tutorial-overlay], [data-system-overlay]"
                )
            )
                return
            const r = rectRef.current
            const insideHole =
                !!r &&
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            if (!insideHole) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        window.addEventListener("pointerdown", blockOutsideHole, true)
        window.addEventListener("click", blockOutsideHole, true)
        return () => {
            window.removeEventListener("pointerdown", blockOutsideHole, true)
            window.removeEventListener("click", blockOutsideHole, true)
        }
    }, [active, isMyTurn])

    // Click-driven hand-off — a non-blocking capture listener that
    // watches for a real tap landing inside this step's hole. It never
    // calls preventDefault/stopPropagation, so the real element
    // underneath still gets the real click; we just also notice it.
    React.useEffect(() => {
        if (!active || !isMyTurn || !clickAdvancesStep) return
        function onPointerDown(e: PointerEvent) {
            const r = rectRef.current
            if (
                r &&
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            ) {
                advanceStep()
            }
        }
        window.addEventListener("pointerdown", onPointerDown, true)
        return () =>
            window.removeEventListener("pointerdown", onPointerDown, true)
    }, [active, isMyTurn, clickAdvancesStep, advanceStep])

    // Scroll-driven hand-off — for a beat like "scroll down to see your
    // other accounts" that has no tap target at all. Listens on the real
    // scrollable container (tag it the same way as any other target, via
    // TutorialTargets.tsx) or the whole page if scrollContainerTarget is
    // blank, and hands off once the user has scrolled past the threshold.
    React.useEffect(() => {
        if (!active || !isMyTurn || !scrollAdvancesStep) return
        const container = scrollContainerTarget
            ? document.querySelector(
                  `[data-tutorial-target="${scrollContainerTarget}"]`
              )
            : null
        const el: HTMLElement | Window =
            container instanceof HTMLElement ? container : window
        function checkScroll() {
            let percent: number
            if (el === window) {
                const doc = document.documentElement
                const max = doc.scrollHeight - doc.clientHeight
                percent = max > 0 ? (window.scrollY / max) * 100 : 100
            } else {
                const node = el as HTMLElement
                const max = node.scrollHeight - node.clientHeight
                percent = max > 0 ? (node.scrollTop / max) * 100 : 100
            }
            if (percent >= scrollThresholdPercent) advanceStep()
        }
        checkScroll()
        el.addEventListener("scroll", checkScroll, { passive: true })
        return () => el.removeEventListener("scroll", checkScroll)
    }, [
        active,
        isMyTurn,
        scrollAdvancesStep,
        scrollContainerTarget,
        scrollThresholdPercent,
        advanceStep,
    ])

    // Let scroll/drag gestures reach the real UI even though we're
    // visually on top and blocking real clicks everywhere but the hole.
    // Attached to window (capture), not the dim div — that div is now
    // pointerEvents:"none" (see above), so it never receives wheel/touch
    // events itself; window-level listeners don't depend on that at all.
    React.useEffect(() => {
        if (!active) return
        let scrollTarget: HTMLElement | Window = window
        let lastY = 0
        function onWheel(e: WheelEvent) {
            scrollTarget = findScrollableAt(e.clientX, e.clientY)
            scrollByOn(scrollTarget, e.deltaY, e.deltaX)
            e.preventDefault()
        }
        function onTouchStart(e: TouchEvent) {
            lastY = e.touches[0].clientY
            scrollTarget = findScrollableAt(
                e.touches[0].clientX,
                e.touches[0].clientY
            )
        }
        function onTouchMove(e: TouchEvent) {
            const y = e.touches[0].clientY
            scrollByOn(scrollTarget, lastY - y)
            lastY = y
            e.preventDefault()
        }
        window.addEventListener("wheel", onWheel, {
            passive: false,
            capture: true,
        })
        window.addEventListener("touchstart", onTouchStart, {
            passive: true,
            capture: true,
        })
        window.addEventListener("touchmove", onTouchMove, {
            passive: false,
            capture: true,
        })
        return () => {
            window.removeEventListener("wheel", onWheel, true)
            window.removeEventListener("touchstart", onTouchStart, true)
            window.removeEventListener("touchmove", onTouchMove, true)
        }
    }, [active])

    // isMyTurn only matters for the real runtime handoff between steps —
    // on the canvas nothing is actually advancing the shared pageGroup
    // counter (that only happens from real clicks/timers in Preview), so
    // gating on it there would make every step but #1 invisible even
    // though active is true. Every instance stays inspectable on canvas
    // regardless of pageGroup/stepNumber.
    if (!active) return null
    if (!isCanvas && !isMyTurn) return null

    const clipPath =
        rect && viewport.w
            ? `path(evenodd, "M0,0 H${viewport.w} V${viewport.h} H0 Z ${buildHolePath(
                  rect,
                  holeShape,
                  cornerRadius
              )}")`
            : undefined

    // Same shape/radius logic as the hole cut, so the glow always traces
    // it exactly — nothing to keep in sync manually.
    const glowRadius: React.CSSProperties["borderRadius"] =
        holeShape === "circle"
            ? "50%"
            : holeShape === "pill"
              ? 999
              : cornerRadius
    const glowBlur = 10 + glowIntensity * 3
    const glowSpread = 1 + glowIntensity

    // These must match the actual path coordinates rendered below — see
    // the comment on bezierEndAngleDeg for why this is computed rather
    // than hand-set.
    const curveArrowAngle = bezierEndAngleDeg(48.89, 54.67, 58, 20.44)
    const bounceArrowAngle = bezierEndAngleDeg(50, 50, 50, 12)
    // Manual aesthetic nudge on top of the true tangent angle — the head
    // reads better turned a couple degrees further left than the exact
    // geometric tangent. Increasing this swings the head further toward
    // pointing left; decreasing (or going negative) swings it back
    // toward/past straight down. Tweak freely without touching the path.
    const curveArrowheadAdjustDeg = 2
    // Manual position nudge, in the same 0-100 viewBox units as the path
    // coordinates — negative X moves the head left, positive moves it
    // right (Y works the same, negative = up). At the default Arrow size
    // (90px), 1 unit ≈ 0.9px on screen, so ±1 to ±2 here is roughly a
    // "pixel or two." If Arrow size is set differently, scale this
    // number by (arrowSize / 100) to keep the same real-pixel shift.
    const curveArrowheadOffsetX = -0.6
    const curveArrowheadOffsetY = 1

    const arrowAnchor =
        rect != null
            ? {
                  x: rect.left + rect.width / 2 + arrowOffsetX,
                  y: rect.top + arrowOffsetY,
              }
            : null

    const arrowKeyframes = (
        <style>{`
            @keyframes tutorial-arrow-curve-pulse {
                0%, 100% { transform: translate(0px, 0px); }
                50% { transform: translate(4px, 4px); }
            }
            @keyframes tutorial-arrow-bounce {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(12px); }
            }
        `}</style>
    )

    // Shared between the real portaled arrow and the canvas-mode preview
    // below, so there is only ever one copy of this markup to keep
    // correct — see the note at the render site for why a canvas preview
    // is possible for the arrow specifically (it needs no real DOM
    // measurement) when the rest of the overlay does not.
    const arrowSvg = (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
            {arrowVariant === "bounce" ? (
                <g
                    style={{
                        animation:
                            "tutorial-arrow-bounce 1.2s ease-in-out infinite",
                    }}
                >
                    <path
                        d="M50,12 L50,50"
                        stroke={arrowColor}
                        strokeWidth={arrowStrokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />
                    <g
                        transform={`translate(50,50) rotate(${bounceArrowAngle})`}
                    >
                        <path
                            d="M-11,-8 L0,0 L-11,8"
                            fill="none"
                            stroke={arrowColor}
                            strokeWidth={arrowStrokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </g>
                </g>
            ) : (
                <g
                    style={{
                        animation:
                            "tutorial-arrow-curve-pulse 1.6s ease-in-out infinite",
                    }}
                >
                    {/* User-specified path, scaled from the original 0-450
                        viewBox into this component's 0-100 one (uniform
                        scale, so the shape and every tangent angle are
                        preserved exactly): (146,42) (261,92) (220,246) ×
                        100/450. */}
                    <path
                        d="M32.44,9.33 Q58,20.44 48.89,54.67"
                        stroke={arrowColor}
                        strokeWidth={arrowStrokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />
                    <g
                        transform={`translate(${48.89 + curveArrowheadOffsetX},${54.67 + curveArrowheadOffsetY}) rotate(${curveArrowAngle + curveArrowheadAdjustDeg})`}
                    >
                        <path
                            d="M-11,-8 L0,0 L-11,8"
                            fill="none"
                            stroke={arrowColor}
                            strokeWidth={arrowStrokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </g>
                </g>
            )}
        </svg>
    )

    const arrowTransform = arrowReflect
        ? `rotate(${arrowRotation}deg) rotate(${arrowReflectAngle}deg) scaleY(-1) rotate(${-arrowReflectAngle}deg)`
        : `rotate(${arrowRotation}deg)`

    const content = (
        // pointerEvents:"none" here is the actual fix for clicks not
        // reaching real elements under the hole — this outermost wrapper
        // spans the full viewport and, despite being visually empty
        // itself, defaults to pointer-events:auto and was silently
        // catching every click across the whole screen before any child
        // (all of which already correctly had pointer-events:none/auto
        // set individually), any window-level JS listener, or the real
        // page underneath ever got a chance. Children that need to be
        // clickable (skip/exit buttons) already set their own explicit
        // pointerEvents:"auto", which overrides this at that element —
        // pointer-events is decided per-element, a "none" ancestor does
        // not disable an "auto" descendant.
        // zIndex 8000 (8500 for skip/exit below) is deliberately well
        // under any full-screen "system" overlay — e.g. an inactivity/
        // idle-timeout screen — which should sit above this and use a
        // higher value. If a system overlay like that ever appears to
        // not be receiving clicks despite a higher z-index, check
        // whether it's also portaled to document.body the same way
        // this component is: two elements only stack by z-index
        // predictably when they're both in the same stacking context.
        // A z-index set from inside Framer's normal (non-portaled)
        // layer tree can be trapped inside an ancestor's own stacking
        // context and lose to this one regardless of its number — the
        // same issue this whole component exists to sidestep.
        <div
            data-tutorial-overlay="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 8000,
                pointerEvents: "none",
            }}
        >
            {/* dim + blur — visual only now. pointerEvents is "none": clicking
                is blocked/passed-through by an explicit JS check below, not
                by clip-path hit-test exclusion, which reliably PAINTS the
                hole but wasn't reliably excluding it from real clicks — a
                correctly-linked real element under the hole wasn't
                receiving taps. This div still shows the dim/blur/hole
                visually; it just no longer decides what's clickable. */}
            <div
                ref={overlayRef}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: dimColor,
                    backdropFilter: `blur(${blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    clipPath,
                    WebkitClipPath: clipPath,
                    pointerEvents: "none",
                    transition:
                        "background 0.4s ease, backdrop-filter 0.4s ease",
                }}
            />

            {/* instruction card — appears/disappears on its own, never clicked.
                Positioning lives on this plain wrapper; the motion.div inside
                only ever animates opacity/y, so the two transforms never
                fight. Dots only render when showProgressDots is on; the card
                itself shows whenever there's a title/body, dots or not. */}
            {(cardTitleLine1 ||
                cardTitleLine2 ||
                cardBody ||
                (showProgressDots && progressTotal > 0)) && (
                <div
                    style={{
                        ...cardWrapperStyle(
                            cardAnchorX,
                            cardAnchorY,
                            cardOffsetX,
                            cardOffsetY
                        ),
                        pointerEvents: "none",
                    }}
                >
                    <AnimatePresence>
                        <motion.div
                            key="progress-card"
                            initial={{
                                opacity: 0,
                                y:
                                    cardAnchorY === "top"
                                        ? -24
                                        : cardAnchorY === "bottom"
                                          ? 24
                                          : 0,
                            }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{
                                opacity: 0,
                                y:
                                    cardAnchorY === "top"
                                        ? -24
                                        : cardAnchorY === "bottom"
                                          ? 24
                                          : 0,
                            }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 24,
                                padding: "40px 60px",
                                borderRadius: 24,
                                background: cardBackgroundColor,
                                maxWidth: 760,
                                textAlign: "center",
                                pointerEvents: "none",
                            }}
                        >
                            {(cardTitleLine1 || cardTitleLine2) && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 4,
                                    }}
                                >
                                    {cardTitleLine1 && (
                                        <div
                                            style={{
                                                fontSize: 42,
                                                fontWeight: 700,
                                                color: cardTitleLine1Color,
                                                whiteSpace: "pre-line",
                                            }}
                                        >
                                            {cardTitleLine1}
                                        </div>
                                    )}
                                    {cardTitleLine2 && (
                                        <div
                                            style={{
                                                fontSize: 42,
                                                fontWeight: 700,
                                                color: cardTitleLine2Color,
                                                whiteSpace: "pre-line",
                                            }}
                                        >
                                            {cardTitleLine2}
                                        </div>
                                    )}
                                </div>
                            )}
                            {cardBody && (
                                <div
                                    style={{
                                        fontSize: 30,
                                        color: cardBodyColor,
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    {cardBody}
                                </div>
                            )}
                            {showProgressDots && progressTotal > 0 && (
                                <div style={{ display: "flex", gap: 10 }}>
                                    {Array.from({ length: progressTotal }).map(
                                        (_, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width:
                                                        i === progressIndex
                                                            ? 28
                                                            : 10,
                                                    height: 10,
                                                    borderRadius: 999,
                                                    background:
                                                        i <= progressIndex
                                                            ? accentColor
                                                            : "rgba(255,255,255,0.3)",
                                                    transition:
                                                        "width 0.3s ease, background 0.3s ease",
                                                }}
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* glow ring — appears/disappears on its own, traces the hole
                exactly since it shares the same rect/shape/radius. Plain
                CSS + a keyframe pulse, no separate layer, no crash risk.
                The static/breathing box-shadow is `inset`, so it radiates
                inward from the hole's edge (over the real content showing
                through the cutout) rather than bleeding outward into the
                dimmed area around it. Ripple's expanding rings are left
                outward-growing on purpose — that's a different "ping"
                idiom, not the glow being asked about here. */}
            {showGlow && glowShown && rect && (
                <>
                    <style>{`
                        @keyframes tutorial-glow-breathe {
                            0%, 100% { opacity: 0.5; transform: scale(0.97); }
                            50% { opacity: 1; transform: scale(1.03); }
                        }
                        @keyframes tutorial-glow-ripple {
                            0% { transform: scale(1); opacity: 0.55; }
                            100% { transform: scale(1.4); opacity: 0; }
                        }
                    `}</style>
                    <div
                        style={{
                            position: "fixed",
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height,
                            pointerEvents: "none",
                        }}
                    >
                        {glowVariant === "ripple" ? (
                            [0, 0.6, 1.2].map((delay) => (
                                <div
                                    key={delay}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        borderRadius: glowRadius,
                                        border: `2px solid ${glowColor}`,
                                        animation:
                                            "tutorial-glow-ripple 1.8s ease-out infinite",
                                        animationDelay: `${delay}s`,
                                    }}
                                />
                            ))
                        ) : (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: glowRadius,
                                    border: `2px solid ${glowColor}`,
                                    boxShadow: `inset 0 0 ${glowBlur}px ${glowSpread}px ${glowColor}`,
                                    animation:
                                        glowVariant === "breathing"
                                            ? "tutorial-glow-breathe 1.8s ease-in-out infinite"
                                            : "none",
                                }}
                            />
                        )}
                    </div>
                </>
            )}

            {/* click-here arrow — the arrowhead's angle is computed in JS
                (bezierEndAngleDeg, above) from the line path's own
                coordinates and applied as an explicit rotate() on its own
                <g>, rather than relying on the SVG engine's built-in marker
                orient="auto" (mathematically equivalent, but rendered
                visibly misaligned in Framer's Preview across repeated
                attempts, so this gives us an explicit, checkable number
                instead). arrowRotation and the optional reflect both live
                on this one plain outer wrapper, so line + arrowhead always
                move as a single rigid unit. Loop animation is plain CSS
                keyframes on the <g>, not framer-motion — keeps that fully
                independent of this wrapper's own static transform, the
                same separation that fixed the card's positioning bug
                earlier in this file. */}
            {showArrow && arrowShown && arrowAnchor && (
                <div
                    style={{
                        position: "fixed",
                        left: arrowAnchor.x - arrowSize / 2,
                        top: arrowAnchor.y - arrowSize / 2,
                        width: arrowSize,
                        height: arrowSize,
                        transform: arrowTransform,
                        pointerEvents: "none",
                    }}
                >
                    {arrowKeyframes}
                    {arrowSvg}
                </div>
            )}

            {/* skip / exit — the only other clickable surfaces in the overlay */}
            {showSkipButton && (
                <a
                    href={skipLink || undefined}
                    onClick={(e) => !skipLink && e.preventDefault()}
                    style={{
                        position: "fixed",
                        top: 60,
                        right: 40,
                        zIndex: 8500,
                        pointerEvents: "auto",
                        padding: "30px 40px",
                        borderRadius: 999,
                        background: accentColor,
                        color: "#fff",
                        fontSize: 44,
                        fontWeight: 500,
                        textDecoration: "none",
                    }}
                >
                    {skipLabel}
                </a>
            )}
            {showExitButton && (
                <a
                    href={exitLink || undefined}
                    onClick={(e) => !exitLink && e.preventDefault()}
                    aria-label="Exit tutorial"
                    style={{
                        position: "fixed",
                        top: 60,
                        left: 40,
                        zIndex: 8500,
                        pointerEvents: "auto",
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        background: accentColor,
                        color: "#fff",
                        fontSize: 44,
                        lineHeight: "110px",
                        textAlign: "center",
                        textDecoration: "none",
                    }}
                >
                    {"✕"}
                </a>
            )}
        </div>
    )

    return (
        <>
            {mounted &&
                !isCanvas &&
                ReactDOM.createPortal(content, document.body)}
            {isCanvas && (
                <div
                    style={{
                        ...style,
                        position: "absolute",
                        inset: 0,
                        border: "2px dashed rgba(255,90,90,0.7)",
                        background: "rgba(255,90,90,0.08)",
                        overflow: "hidden",
                    }}
                >
                    {/* Everything else in this overlay (the hole, the glow,
                        the card's anchor) depends on measuring a REAL target
                        element on the real page — that doesn't exist on
                        Framer's design-time canvas, only in Preview, so it
                        can't be shown here. The arrow is different: its
                        shape, color, curve, and every offset/rotation
                        control is a plain prop value with no dependency on
                        any real DOM element, so it can render live right on
                        the canvas — tune color/curve/rotation/offsets here
                        and see them immediately, no Preview round-trip
                        needed for THIS piece specifically. */}
                    {showArrow && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 10,
                            }}
                        >
                            {arrowKeyframes}
                            <div
                                style={{
                                    width: "70%",
                                    maxWidth: 160,
                                    aspectRatio: "1 / 1",
                                    transform: arrowTransform,
                                }}
                            >
                                {arrowSvg}
                            </div>
                        </div>
                    )}
                    <div
                        style={{
                            position: "absolute",
                            left: 4,
                            right: 4,
                            bottom: 4,
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: "rgba(200,50,50,0.9)",
                            textAlign: "center",
                            pointerEvents: "none",
                        }}
                    >
                        target: {target || "(none set)"}
                        {pageGroup && (
                            <>
                                {" · "}
                                {pageGroup} step {stepNumber}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

TutorialOverlay.defaultProps = {
    active: true,
    target: "more-tab",
    holeShape: "pill",
    cornerRadius: 0,
    holePaddingTop: 0,
    holePaddingRight: 0,
    holePaddingBottom: 0,
    holePaddingLeft: 0,
    pageGroup: "",
    stepNumber: 1,
    clickAdvancesStep: false,
    nextStepAfterSeconds: 0,
    scrollAdvancesStep: false,
    scrollThresholdPercent: 50,
    scrollContainerTarget: "",
    cardTitleLine1: "Let's disable your debit card",
    cardTitleLine1Color: "#ffffff",
    cardTitleLine2: "",
    cardTitleLine2Color: "#ffffff",
    cardBody: "Tap on More",
    cardBackgroundColor: "rgba(20,20,28,0.88)",
    cardBodyColor: "rgba(255,255,255,0.8)",
    cardAnchorX: "center",
    cardAnchorY: "top",
    cardOffsetX: 0,
    cardOffsetY: 0,
    showProgressDots: true,
    progressIndex: 1,
    progressTotal: 4,
    showGlow: true,
    glowVariant: "breathing",
    glowColor: "rgba(5,147,144,1)",
    glowIntensity: 2,
    glowDelaySeconds: 0,
    showArrow: false,
    arrowVariant: "curve",
    arrowColor: "rgba(5,147,144,1)",
    arrowStrokeWidth: 8,
    arrowSize: 90,
    arrowRotation: 0,
    arrowReflect: false,
    arrowReflectAngle: 0,
    arrowDelaySeconds: 1.2,
    arrowOffsetX: 0,
    arrowOffsetY: -100,
    autoAdvanceAfterSeconds: 0,
    dimColor: "rgba(10, 10, 20, 0.55)",
    blurAmount: 8,
    accentColor: "rgba(5,147,144,1)",
    showSkipButton: true,
    skipLabel: "Skip",
    showExitButton: true,
}

addPropertyControls(TutorialOverlay, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    target: {
        type: ControlType.String,
        title: "Target ID",
        defaultValue: "more-tab",
        placeholder: "data-tutorial-target value",
    },
    holeShape: {
        type: ControlType.Enum,
        title: "Hole shape",
        options: ["rectangle", "circle", "pill"],
        optionTitles: ["Rectangle", "Circle", "Pill"],
        defaultValue: "pill",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Corner radius",
        min: 0,
        max: 999,
        defaultValue: 0,
        hidden: (props) => props.holeShape !== "rectangle",
    },
    holePaddingTop: {
        type: ControlType.Number,
        title: "Padding top",
        min: 0,
        max: 200,
        defaultValue: 0,
    },
    holePaddingRight: {
        type: ControlType.Number,
        title: "Padding right",
        min: 0,
        max: 200,
        defaultValue: 0,
    },
    holePaddingBottom: {
        type: ControlType.Number,
        title: "Padding bottom",
        min: 0,
        max: 200,
        defaultValue: 0,
    },
    holePaddingLeft: {
        type: ControlType.Number,
        title: "Padding left",
        min: 0,
        max: 200,
        defaultValue: 0,
    },
    pageGroup: {
        type: ControlType.String,
        title: "Page group",
        defaultValue: "",
        placeholder: "blank = single-step page",
    },
    stepNumber: {
        type: ControlType.Number,
        title: "Step number",
        min: 1,
        step: 1,
        defaultValue: 1,
        hidden: (props) => !props.pageGroup,
    },
    clickAdvancesStep: {
        type: ControlType.Boolean,
        title: "Click advances step",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => !props.pageGroup,
    },
    nextStepAfterSeconds: {
        type: ControlType.Number,
        title: "Next step after (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
        hidden: (props) => !props.pageGroup,
    },
    scrollAdvancesStep: {
        type: ControlType.Boolean,
        title: "Scroll advances step",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => !props.pageGroup,
    },
    scrollThresholdPercent: {
        type: ControlType.Number,
        title: "Scroll threshold %",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 50,
        hidden: (props) => !props.pageGroup || !props.scrollAdvancesStep,
    },
    scrollContainerTarget: {
        type: ControlType.String,
        title: "Scroll container ID",
        defaultValue: "",
        placeholder: "blank = whole page",
        hidden: (props) => !props.pageGroup || !props.scrollAdvancesStep,
    },
    cardTitleLine1: {
        type: ControlType.String,
        title: "Card title line 1",
        defaultValue: "",
        displayTextArea: true,
    },
    cardTitleLine1Color: {
        type: ControlType.Color,
        title: "Line 1 color",
        defaultValue: "#ffffff",
    },
    cardTitleLine2: {
        type: ControlType.String,
        title: "Card title line 2",
        defaultValue: "",
        displayTextArea: true,
    },
    cardTitleLine2Color: {
        type: ControlType.Color,
        title: "Line 2 color",
        defaultValue: "#ffffff",
    },
    cardBody: {
        type: ControlType.String,
        title: "Card body",
        displayTextArea: true,
        defaultValue: "",
    },
    cardBackgroundColor: {
        type: ControlType.Color,
        title: "Card color",
        defaultValue: "rgba(20,20,28,0.88)",
    },
    cardBodyColor: {
        type: ControlType.Color,
        title: "Card body color",
        defaultValue: "rgba(255,255,255,0.8)",
    },
    cardAnchorX: {
        type: ControlType.Enum,
        title: "Card position X",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "center",
    },
    cardAnchorY: {
        type: ControlType.Enum,
        title: "Card position Y",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        defaultValue: "bottom",
    },
    cardOffsetX: {
        type: ControlType.Number,
        title: "Card offset X",
        defaultValue: 0,
    },
    cardOffsetY: {
        type: ControlType.Number,
        title: "Card offset Y",
        defaultValue: 0,
    },
    showProgressDots: {
        type: ControlType.Boolean,
        title: "Progress dots",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    progressIndex: {
        type: ControlType.Number,
        title: "Dot index",
        min: 0,
        step: 1,
        defaultValue: 0,
        hidden: (props) => !props.showProgressDots,
    },
    progressTotal: {
        type: ControlType.Number,
        title: "Dot total",
        min: 0,
        step: 1,
        defaultValue: 4,
        hidden: (props) => !props.showProgressDots,
    },
    showGlow: {
        type: ControlType.Boolean,
        title: "Glow",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    glowVariant: {
        type: ControlType.Enum,
        title: "Glow style",
        options: ["static", "breathing", "ripple"],
        optionTitles: ["Soft glow", "Breathing pulse", "Ripple ping"],
        defaultValue: "breathing",
        hidden: (props) => !props.showGlow,
    },
    glowColor: {
        type: ControlType.Color,
        title: "Glow color",
        defaultValue: "rgba(5,147,144,1)",
        hidden: (props) => !props.showGlow,
    },
    glowIntensity: {
        type: ControlType.Number,
        title: "Glow intensity",
        min: 0,
        max: 5,
        step: 1,
        defaultValue: 2,
        hidden: (props) => !props.showGlow,
    },
    glowDelaySeconds: {
        type: ControlType.Number,
        title: "Glow delay (sec)",
        min: 0,
        step: 0.1,
        defaultValue: 0,
        hidden: (props) => !props.showGlow,
    },
    showArrow: {
        type: ControlType.Boolean,
        title: "Arrow",
        defaultValue: false,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    arrowVariant: {
        type: ControlType.Enum,
        title: "Arrow style",
        options: ["curve", "bounce"],
        optionTitles: ["Curved", "Bounce"],
        defaultValue: "curve",
        hidden: (props) => !props.showArrow,
    },
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow color",
        defaultValue: "rgba(5,147,144,1)",
        hidden: (props) => !props.showArrow,
    },
    arrowStrokeWidth: {
        type: ControlType.Number,
        title: "Arrow stroke width",
        min: 1,
        defaultValue: 8,
        hidden: (props) => !props.showArrow,
    },
    arrowSize: {
        type: ControlType.Number,
        title: "Arrow size",
        min: 10,
        defaultValue: 90,
        hidden: (props) => !props.showArrow,
    },
    arrowRotation: {
        type: ControlType.Number,
        title: "Arrow rotation",
        step: 1,
        defaultValue: 0,
        hidden: (props) => !props.showArrow,
    },
    arrowReflect: {
        type: ControlType.Boolean,
        title: "Arrow reflect",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => !props.showArrow,
    },
    arrowReflectAngle: {
        type: ControlType.Number,
        title: "Reflect axis (°)",
        step: 1,
        defaultValue: 0,
        hidden: (props) => !props.showArrow || !props.arrowReflect,
    },
    arrowDelaySeconds: {
        type: ControlType.Number,
        title: "Arrow delay (sec)",
        min: 0,
        step: 0.1,
        defaultValue: 1.2,
        hidden: (props) => !props.showArrow,
    },
    arrowOffsetX: {
        type: ControlType.Number,
        title: "Arrow offset X",
        defaultValue: 0,
        hidden: (props) => !props.showArrow,
    },
    arrowOffsetY: {
        type: ControlType.Number,
        title: "Arrow offset Y",
        defaultValue: -100,
        hidden: (props) => !props.showArrow,
    },
    autoAdvanceAfterSeconds: {
        type: ControlType.Number,
        title: "Auto-advance (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
    },
    autoAdvanceLink: {
        type: ControlType.Link,
        title: "Auto-advance link",
        hidden: (props) => !props.autoAdvanceAfterSeconds,
    },
    dimColor: {
        type: ControlType.Color,
        title: "Dim color",
        defaultValue: "rgba(10, 10, 20, 0.55)",
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur (px)",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 8,
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent color",
        defaultValue: "rgba(5,147,144,1)",
    },
    showSkipButton: {
        type: ControlType.Boolean,
        title: "Skip button",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    skipLabel: {
        type: ControlType.String,
        title: "Skip label",
        defaultValue: "Skip",
        hidden: (props) => !props.showSkipButton,
    },
    skipLink: {
        type: ControlType.Link,
        title: "Skip link",
        hidden: (props) => !props.showSkipButton,
    },
    showExitButton: {
        type: ControlType.Boolean,
        title: "Exit (X) button",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    exitLink: {
        type: ControlType.Link,
        title: "Exit link",
    },
})
