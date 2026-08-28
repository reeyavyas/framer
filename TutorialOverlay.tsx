import * as React from "react"
import * as ReactDOM from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TutorialOverlay
 *
 * ONE overlay. ONE portal to <body>. ONE hole at a time.
 * Everything else (progress bullets, "click here" arrow, glow, congrats
 * screen, skip/exit buttons) is plain JSX rendered inside that same
 * portal subtree — never separate Framer layers, never separate
 * portals — so there is nothing left to fight over z-index with.
 *
 * The real app underneath stays mounted and scrollable the whole time.
 * It is never clickable except through the single cut-out hole for the
 * current step, and that hole is native pass-through (clip-path removes
 * both paint AND hit-testing there) — the real element receives the
 * real tap, we just watch for it via a non-blocking capture listener.
 *
 * ---------------------------------------------------------------------
 * HOW TO POINT A STEP AT A REAL ELEMENT
 * Give the real interactive layer a custom attribute:
 *     data-tutorial-target="send-money-button"
 * (Framer: layer's right panel → Custom Attributes. If your Framer
 * version doesn't expose that, wrap the target in a 1-line code
 * override that spreads {"data-tutorial-target": "..."} onto its
 * root element — same trick CircleOverrides.tsx already uses for
 * onPointerDown.)
 * Then reference that same string as a step's `target` below.
 * ---------------------------------------------------------------------
 */

type HoleShape = "rectangle" | "circle" | "pill"

type Step = {
    id: string
    target: string | null // data-tutorial-target value, or null = no hole (full dim)
    holeShape: HoleShape
    cornerRadius: number
    clickAdvances: boolean // true = tapping the real element under the hole advances
    autoAdvanceAfter: number | null // ms, uncapped. null = wait for click only
    cardTitle: string | null
    cardBody: string | null
    progressIndex: number // -1 hides the progress card for this step
    cardAnchor?: "top" | "bottom" // where the card sits — move it off the hole
    showArrow: boolean
    arrowDelaMs: number // ms after entering this step before the arrow draws in
    arrowOffset: { x: number; y: number } // px, relative to hole center
    final?: boolean // renders the full-screen congrats state instead of the hole UI
}

// ---------------------------------------------------------------------
// EDIT THIS ARRAY to author a tutorial. Add/remove/reorder steps freely.
// Delays are plain milliseconds — no cap.
// ---------------------------------------------------------------------
const TOTAL_MICRO_STEPS = 4

const STEPS: Step[] = [
    {
        id: "intro",
        target: null,
        holeShape: "rectangle",
        cornerRadius: 24,
        clickAdvances: false,
        autoAdvanceAfter: 3500,
        cardTitle: "Let's send your first payment",
        cardBody: "We'll walk through it together, one tap at a time.",
        progressIndex: 0,
        showArrow: false,
        arrowDelaMs: 0,
        arrowOffset: { x: 0, y: 0 },
    },
    {
        id: "tap-more-tab",
        target: "more-tab",
        holeShape: "pill",
        cornerRadius: 0,
        clickAdvances: true,
        autoAdvanceAfter: null,
        cardTitle: "Let's disable your debit card",
        cardBody: "Tap on More",
        progressIndex: 1,
        cardAnchor: "top", // the hole sits at the bottom nav — keep the card clear of it
        showArrow: true,
        arrowDelaMs: 1200,
        arrowOffset: { x: 0, y: -20 },
    },
    {
        id: "watch-result",
        target: "confirmation-panel",
        holeShape: "rectangle",
        cornerRadius: 20,
        clickAdvances: false,
        autoAdvanceAfter: 4000,
        cardTitle: "Nice — here's your confirmation",
        cardBody: "This is where you'd double check the details.",
        progressIndex: 2,
        showArrow: false,
        arrowDelaMs: 0,
        arrowOffset: { x: 0, y: 0 },
    },
    {
        id: "congrats",
        target: null,
        holeShape: "rectangle",
        cornerRadius: 0,
        clickAdvances: false,
        autoAdvanceAfter: null,
        cardTitle: null,
        cardBody: null,
        progressIndex: -1,
        showArrow: false,
        arrowDelaMs: 0,
        arrowOffset: { x: 0, y: 0 },
        final: true,
    },
]

interface Props {
    active: boolean
    dimColor: string
    blurAmount: number
    accentColor: string
    arrowColor: string
    showProgressDots: boolean
    showSkipButton: boolean
    skipLabel: string
    skipLink?: string
    showExitButton: boolean
    exitLink?: string
    congratsTitle: string
    congratsMessage: string
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

export default function TutorialOverlay(props: Props) {
    const {
        active,
        dimColor,
        blurAmount,
        accentColor,
        arrowColor,
        showProgressDots,
        showSkipButton,
        skipLabel,
        skipLink,
        showExitButton,
        exitLink,
        congratsTitle,
        congratsMessage,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [mounted, setMounted] = React.useState(false)
    const [stepIndex, setStepIndex] = React.useState(0)
    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [viewport, setViewport] = React.useState({ w: 0, h: 0 })
    const [arrowShown, setArrowShown] = React.useState(false)

    const step = STEPS[stepIndex]
    const overlayRef = React.useRef<HTMLDivElement>(null)
    const rectRef = React.useRef<DOMRect | null>(null)
    const arrowMarkerId = React.useRef(
        `tutorial-arrowhead-${Math.random().toString(36).slice(2)}`
    ).current

    const advance = React.useCallback(() => {
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    }, [])

    React.useEffect(() => setMounted(true), [])

    // Restart the sequence each time the overlay is (re)activated.
    React.useEffect(() => {
        if (active) setStepIndex(0)
    }, [active])

    // Reset per-step visual state on every step change.
    React.useEffect(() => setArrowShown(false), [stepIndex])

    // Measure the current step's real target, tracking it continuously
    // (targets can be moving — e.g. a draggable circle).
    React.useEffect(() => {
        if (!active || step.final) {
            rectRef.current = null
            setRect(null)
            return
        }
        if (!step.target) {
            rectRef.current = null
            setRect(null)
            setViewport({ w: window.innerWidth, h: window.innerHeight })
            return
        }
        function measure() {
            const el = document.querySelector(
                `[data-tutorial-target="${step.target}"]`
            )
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
    }, [active, step.target, step.final, stepIndex])

    // Timer-driven advance — independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || step.autoAdvanceAfter == null) return
        const t = setTimeout(advance, Math.max(step.autoAdvanceAfter, 0))
        return () => clearTimeout(t)
    }, [active, stepIndex, step.autoAdvanceAfter, advance])

    // Timer-driven arrow reveal.
    React.useEffect(() => {
        if (!active || !step.showArrow) return
        const t = setTimeout(() => setArrowShown(true), Math.max(step.arrowDelaMs, 0))
        return () => clearTimeout(t)
    }, [active, stepIndex, step.showArrow, step.arrowDelaMs])

    // Click-driven advance — a non-blocking capture listener that watches
    // for a real tap landing inside the current hole. It never calls
    // preventDefault/stopPropagation, so the real element underneath still
    // gets the real click; we just also notice it happened.
    React.useEffect(() => {
        if (!active || !step.clickAdvances) return
        function onPointerDown(e: PointerEvent) {
            const r = rectRef.current
            if (
                r &&
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            ) {
                advance()
            }
        }
        window.addEventListener("pointerdown", onPointerDown, true)
        return () => window.removeEventListener("pointerdown", onPointerDown, true)
    }, [active, step.clickAdvances, stepIndex, advance])

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

    if (!active) return null

    const clipPath =
        rect && viewport.w
            ? `path(evenodd, "M0,0 H${viewport.w} V${viewport.h} H0 Z ${buildHolePath(
                  rect,
                  step.holeShape,
                  step.cornerRadius
              )}")`
            : undefined

    const arrowAnchor =
        rect != null
            ? {
                  x: rect.left + rect.width / 2 + step.arrowOffset.x,
                  y: rect.top + step.arrowOffset.y,
              }
            : null

    const content = (
        <div data-tutorial-overlay="true" style={{ position: "fixed", inset: 0, zIndex: 90000 }}>
            {/* dim + blur, hole cut for the current step, click-blocking / scroll-passthrough */}
            <div
                ref={overlayRef}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: step.final ? "rgba(8,10,20,0.85)" : dimColor,
                    backdropFilter: `blur(${step.final ? 20 : blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${step.final ? 20 : blurAmount}px)`,
                    clipPath: step.final ? undefined : clipPath,
                    WebkitClipPath: step.final ? undefined : clipPath,
                    pointerEvents: "auto",
                    transition: "background 0.4s ease, backdrop-filter 0.4s ease",
                }}
            />

            {/* instruction card — appears/disappears on its own, never clicked.
                Dots only render when showProgressDots is on AND the step sets
                a progressIndex; the card itself shows whenever there's a
                title/body, dots or not. */}
            <AnimatePresence>
                {(step.cardTitle || step.cardBody || (showProgressDots && step.progressIndex >= 0)) && (
                    <motion.div
                        key="progress-card"
                        initial={{ opacity: 0, y: step.cardAnchor === "top" ? -24 : 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: step.cardAnchor === "top" ? -24 : 24 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            left: "50%",
                            ...(step.cardAnchor === "top" ? { top: 110 } : { bottom: 90 }),
                            transform: "translateX(-50%)",
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
                        {step.cardTitle && (
                            <div style={{ fontSize: 32, fontWeight: 700 }}>{step.cardTitle}</div>
                        )}
                        {step.cardBody && (
                            <div style={{ fontSize: 22, opacity: 0.85 }}>{step.cardBody}</div>
                        )}
                        {showProgressDots && step.progressIndex >= 0 && (
                            <div style={{ display: "flex", gap: 10 }}>
                                {Array.from({ length: TOTAL_MICRO_STEPS }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: i === step.progressIndex ? 28 : 10,
                                            height: 10,
                                            borderRadius: 999,
                                            background:
                                                i <= step.progressIndex ? accentColor : "rgba(255,255,255,0.3)",
                                            transition: "width 0.3s ease, background 0.3s ease",
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* "click here" arrow — draws itself in on a delay, no click needed */}
            <AnimatePresence>
                {arrowShown && arrowAnchor && (
                    <motion.svg
                        key="arrow"
                        width="140"
                        height="120"
                        viewBox="0 0 140 120"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: "fixed",
                            left: arrowAnchor.x - 70,
                            top: arrowAnchor.y - 110,
                            pointerEvents: "none",
                        }}
                    >
                        {/* The arrowhead is an SVG marker with orient="auto", so it
                            always points along the curve's own tangent at its end
                            point — it can't drift out of alignment with the line
                            the way two independently hand-placed paths could. */}
                        <defs>
                            <marker
                                id={arrowMarkerId}
                                viewBox="0 0 10 10"
                                refX="6"
                                refY="5"
                                markerWidth="7"
                                markerHeight="7"
                                orient="auto"
                            >
                                <path d="M0,0 L10,5 L0,10 Z" fill={arrowColor} />
                            </marker>
                        </defs>
                        <motion.path
                            d="M20,15 C10,65 35,95 78,98"
                            fill="none"
                            stroke={arrowColor}
                            strokeWidth={6}
                            strokeLinecap="round"
                            markerEnd={`url(#${arrowMarkerId})`}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                    </motion.svg>
                )}
            </AnimatePresence>

            {/* skip / exit — the only other clickable surfaces in the overlay */}
            {showSkipButton && !step.final && (
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
            {showExitButton && !step.final && (
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

            {/* congrats — full screen, its own state, plain click to leave */}
            <AnimatePresence>
                {step.final && (
                    <motion.div
                        key="congrats"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 20,
                            color: "#fff",
                            pointerEvents: "none",
                        }}
                    >
                        <div style={{ fontSize: 120 }}>{"👍"}</div>
                        <div style={{ fontSize: 56, fontWeight: 800 }}>{congratsTitle}</div>
                        <div style={{ fontSize: 26, opacity: 0.85 }}>{congratsMessage}</div>
                        <a
                            href={exitLink || undefined}
                            onClick={(e) => !exitLink && e.preventDefault()}
                            style={{
                                marginTop: 20,
                                pointerEvents: "auto",
                                padding: "16px 48px",
                                borderRadius: 999,
                                background: accentColor,
                                color: "#fff",
                                fontSize: 32,
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            Done
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>
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
                    ({STEPS.length} steps — renders in Preview)
                </div>
            )}
        </>
    )
}

TutorialOverlay.defaultProps = {
    active: true,
    dimColor: "rgba(10, 10, 20, 0.55)",
    blurAmount: 8,
    accentColor: "rgba(5,147,144,1)",
    arrowColor: "rgba(5,147,144,1)",
    showProgressDots: true,
    showSkipButton: true,
    skipLabel: "Skip",
    showExitButton: true,
    congratsTitle: "Congrats!",
    congratsMessage: "You just sent your first payment.",
}

addPropertyControls(TutorialOverlay, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
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
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow color",
        defaultValue: "rgba(5,147,144,1)",
    },
    showProgressDots: {
        type: ControlType.Boolean,
        title: "Progress dots",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
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
    congratsTitle: {
        type: ControlType.String,
        title: "Congrats title",
        defaultValue: "Congrats!",
    },
    congratsMessage: {
        type: ControlType.String,
        title: "Congrats message",
        defaultValue: "You just sent your first payment.",
    },
})
