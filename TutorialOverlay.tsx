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
 * instruction card, one optional arrow.
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
 *    shows itself, and `clickAdvancesStep` / `nextStepAfterSeconds`
 *    hands off to the next stepNumber in that same group. A page with
 *    only one step just leaves `pageGroup` blank — it behaves exactly
 *    as a single always-on overlay, no coordination needed. Pick a
 *    `pageGroup` string that's unique to that one page (e.g. its page
 *    name) so unrelated pages never cross-talk.
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
 */

type HoleShape = "rectangle" | "circle" | "pill"

interface Props {
    active: boolean

    target: string
    holeShape: HoleShape
    cornerRadius: number

    pageGroup: string // shared by every step on THIS page. Blank = single-step page, no coordination.
    stepNumber: number // 1-based position within pageGroup
    clickAdvancesStep: boolean // tapping the real target hands off to stepNumber + 1
    nextStepAfterSeconds: number // 0 = off. Hands off to stepNumber + 1 with no click needed.

    cardTitle: string
    cardBody: string
    cardAnchorX: "left" | "center" | "right"
    cardAnchorY: "top" | "center" | "bottom"
    cardOffsetX: number
    cardOffsetY: number

    showProgressDots: boolean
    progressIndex: number
    progressTotal: number

    showArrow: boolean
    arrowImage?: { src: string } | string
    arrowWidth: number
    arrowRotation: number
    arrowDelaySeconds: number
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

// ---------------------------------------------------------------------
// Geometry helpers (same clip-path evenodd hole trick as SpotlightOverlay)
// ---------------------------------------------------------------------
function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
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
    const r = shape === "pill" ? Math.min(rect.width, rect.height) / 2 : cornerRadius
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
    if (!pageStepListeners.has(groupId)) pageStepListeners.set(groupId, new Set())
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
        pageGroup,
        stepNumber,
        clickAdvancesStep,
        nextStepAfterSeconds,
        cardTitle,
        cardBody,
        cardAnchorX,
        cardAnchorY,
        cardOffsetX,
        cardOffsetY,
        showProgressDots,
        progressIndex,
        progressTotal,
        showArrow,
        arrowImage,
        arrowWidth,
        arrowRotation,
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
            const el = document.querySelector(`[data-tutorial-target="${target}"]`)
            if (el) {
                const next = el.getBoundingClientRect()
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
    }, [active, isMyTurn, target])

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
        if (!active || !isMyTurn || !autoAdvanceAfterSeconds || !autoAdvanceLink) return
        const t = setTimeout(() => {
            window.location.href = autoAdvanceLink
        }, Math.max(autoAdvanceAfterSeconds, 0) * 1000)
        return () => clearTimeout(t)
    }, [active, isMyTurn, autoAdvanceAfterSeconds, autoAdvanceLink])

    // Optional timer-driven hand-off to the next step on THIS page —
    // independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || !isMyTurn || !nextStepAfterSeconds) return
        const t = setTimeout(advanceStep, Math.max(nextStepAfterSeconds, 0) * 1000)
        return () => clearTimeout(t)
    }, [active, isMyTurn, nextStepAfterSeconds, advanceStep])

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
        return () => window.removeEventListener("pointerdown", onPointerDown, true)
    }, [active, isMyTurn, clickAdvancesStep, advanceStep])

    // Let scroll/drag gestures reach the real UI even though we're
    // visually on top and blocking real clicks everywhere but the hole.
    React.useEffect(() => {
        if (!active || !overlayRef.current) return
        const el = overlayRef.current
        let scrollTarget: HTMLElement | Window = window
        let lastY = 0
        function onWheel(e: WheelEvent) {
            scrollTarget = findScrollableAt(e.clientX, e.clientY)
            scrollByOn(scrollTarget, e.deltaY, e.deltaX)
            e.preventDefault()
        }
        function onTouchStart(e: TouchEvent) {
            lastY = e.touches[0].clientY
            scrollTarget = findScrollableAt(e.touches[0].clientX, e.touches[0].clientY)
        }
        function onTouchMove(e: TouchEvent) {
            const y = e.touches[0].clientY
            scrollByOn(scrollTarget, lastY - y)
            lastY = y
            e.preventDefault()
        }
        el.addEventListener("wheel", onWheel, { passive: false })
        el.addEventListener("touchstart", onTouchStart, { passive: true })
        el.addEventListener("touchmove", onTouchMove, { passive: false })
        return () => {
            el.removeEventListener("wheel", onWheel)
            el.removeEventListener("touchstart", onTouchStart)
            el.removeEventListener("touchmove", onTouchMove)
        }
    }, [active])

    if (!active || !isMyTurn) return null

    const clipPath =
        rect && viewport.w
            ? `path(evenodd, "M0,0 H${viewport.w} V${viewport.h} H0 Z ${buildHolePath(
                  rect,
                  holeShape,
                  cornerRadius
              )}")`
            : undefined

    const arrowAnchor =
        rect != null
            ? { x: rect.left + rect.width / 2 + arrowOffsetX, y: rect.top + arrowOffsetY }
            : null

    const content = (
        <div data-tutorial-overlay="true" style={{ position: "fixed", inset: 0, zIndex: 90000 }}>
            {/* dim + blur, hole cut for this page's target, click-blocking / scroll-passthrough */}
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
                    pointerEvents: "auto",
                    transition: "background 0.4s ease, backdrop-filter 0.4s ease",
                }}
            />

            {/* instruction card — appears/disappears on its own, never clicked.
                Positioning lives on this plain wrapper; the motion.div inside
                only ever animates opacity/y, so the two transforms never
                fight. Dots only render when showProgressDots is on; the card
                itself shows whenever there's a title/body, dots or not. */}
            {(cardTitle || cardBody || (showProgressDots && progressTotal > 0)) && (
                <div style={cardWrapperStyle(cardAnchorX, cardAnchorY, cardOffsetX, cardOffsetY)}>
                    <AnimatePresence>
                        <motion.div
                            key="progress-card"
                            initial={{ opacity: 0, y: cardAnchorY === "top" ? -24 : cardAnchorY === "bottom" ? 24 : 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: cardAnchorY === "top" ? -24 : cardAnchorY === "bottom" ? 24 : 0 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 14,
                                padding: "24px 36px",
                                borderRadius: 24,
                                background: "rgba(20,20,28,0.88)",
                                color: "#fff",
                                maxWidth: 760,
                                textAlign: "center",
                                pointerEvents: "none",
                            }}
                        >
                            {cardTitle && (
                                <div style={{ fontSize: 32, fontWeight: 700 }}>{cardTitle}</div>
                            )}
                            {cardBody && (
                                <div style={{ fontSize: 22, opacity: 0.85 }}>{cardBody}</div>
                            )}
                            {showProgressDots && progressTotal > 0 && (
                                <div style={{ display: "flex", gap: 10 }}>
                                    {Array.from({ length: progressTotal }).map((_, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: i === progressIndex ? 28 : 10,
                                                height: 10,
                                                borderRadius: 999,
                                                background:
                                                    i <= progressIndex ? accentColor : "rgba(255,255,255,0.3)",
                                                transition: "width 0.3s ease, background 0.3s ease",
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* "click here" arrow — your own uploaded asset, positioned and
                rotated to point wherever you need. No image set = no arrow. */}
            <AnimatePresence>
                {showArrow && arrowShown && arrowAnchor && arrowImage && (
                    <motion.img
                        key="arrow"
                        src={typeof arrowImage === "string" ? arrowImage : arrowImage.src}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: "fixed",
                            left: arrowAnchor.x - arrowWidth / 2,
                            top: arrowAnchor.y - arrowWidth / 2,
                            width: arrowWidth,
                            height: "auto",
                            transform: `rotate(${arrowRotation}deg)`,
                            pointerEvents: "none",
                        }}
                    />
                )}
            </AnimatePresence>

            {/* skip / exit — the only other clickable surfaces in the overlay */}
            {showSkipButton && (
                <a
                    href={skipLink || undefined}
                    onClick={(e) => !skipLink && e.preventDefault()}
                    style={{
                        position: "fixed",
                        top: 80,
                        right: 40,
                        zIndex: 95000,
                        pointerEvents: "auto",
                        padding: "12px 34px",
                        borderRadius: 999,
                        background: accentColor,
                        color: "#fff",
                        fontSize: 40,
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
                        top: 80,
                        left: 40,
                        zIndex: 95000,
                        pointerEvents: "auto",
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: accentColor,
                        color: "#fff",
                        fontSize: 34,
                        lineHeight: "64px",
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
            {mounted && !isCanvas && ReactDOM.createPortal(content, document.body)}
            {isCanvas && (
                <div
                    style={{
                        ...style,
                        position: "absolute",
                        inset: 0,
                        border: "2px dashed rgba(255,90,90,0.7)",
                        background: "rgba(255,90,90,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "rgba(200,50,50,0.9)",
                        textAlign: "center",
                        padding: 4,
                    }}
                >
                    Tutorial overlay
                    <br />
                    target: {target || "(none set)"}
                    {pageGroup && (
                        <>
                            <br />
                            {pageGroup} · step {stepNumber}
                        </>
                    )}
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
    pageGroup: "",
    stepNumber: 1,
    clickAdvancesStep: false,
    nextStepAfterSeconds: 0,
    cardTitle: "Let's disable your debit card",
    cardBody: "Tap on More",
    cardAnchorX: "center",
    cardAnchorY: "top",
    cardOffsetX: 0,
    cardOffsetY: 0,
    showProgressDots: true,
    progressIndex: 1,
    progressTotal: 4,
    showArrow: true,
    arrowWidth: 80,
    arrowRotation: 0,
    arrowDelaySeconds: 1.2,
    arrowOffsetX: 0,
    arrowOffsetY: -20,
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
    cardTitle: {
        type: ControlType.String,
        title: "Card title",
        defaultValue: "",
    },
    cardBody: {
        type: ControlType.String,
        title: "Card body",
        defaultValue: "",
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
    showArrow: {
        type: ControlType.Boolean,
        title: "Arrow",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    arrowImage: {
        type: ControlType.Image,
        title: "Arrow asset",
        hidden: (props) => !props.showArrow,
    },
    arrowWidth: {
        type: ControlType.Number,
        title: "Arrow width",
        min: 10,
        defaultValue: 80,
        hidden: (props) => !props.showArrow,
    },
    arrowRotation: {
        type: ControlType.Number,
        title: "Arrow rotation",
        step: 1,
        defaultValue: 0,
        hidden: (props) => !props.showArrow,
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
        defaultValue: -20,
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
