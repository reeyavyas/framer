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
 * up duplicating the whole file per page. Instead, cross-page
 * progression is just real Framer navigation: whatever the real target
 * element already does when tapped (or an optional timer-driven link
 * for a pure "watch this" beat) is what moves the user to the next
 * page. This component never manages a sequence itself.
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

    cardTitle: string
    cardBody: string
    cardAnchor: "top" | "bottom"

    showProgressDots: boolean
    progressIndex: number
    progressTotal: number

    showArrow: boolean
    arrowDelaySeconds: number
    arrowOffsetX: number
    arrowOffsetY: number
    arrowColor: string

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

export default function TutorialOverlay(props: Props) {
    const {
        active,
        target,
        holeShape,
        cornerRadius,
        cardTitle,
        cardBody,
        cardAnchor,
        showProgressDots,
        progressIndex,
        progressTotal,
        showArrow,
        arrowDelaySeconds,
        arrowOffsetX,
        arrowOffsetY,
        arrowColor,
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
    const arrowMarkerId = React.useRef(
        `tutorial-arrowhead-${Math.random().toString(36).slice(2)}`
    ).current

    React.useEffect(() => setMounted(true), [])
    React.useEffect(() => setArrowShown(false), [target])

    // Measure the target, tracking it continuously (targets can move —
    // e.g. a draggable element like CircleOverrides.tsx's circles).
    React.useEffect(() => {
        if (!active || !target) {
            setRect(null)
            return
        }
        function measure() {
            const el = document.querySelector(`[data-tutorial-target="${target}"]`)
            if (el) setRect(el.getBoundingClientRect())
            setViewport({ w: window.innerWidth, h: window.innerHeight })
        }
        measure()
        window.addEventListener("resize", measure)
        const id = window.setInterval(measure, 150)
        return () => {
            window.removeEventListener("resize", measure)
            window.clearInterval(id)
        }
    }, [active, target])

    // Timer-driven arrow reveal — independent of any click, uncapped delay.
    React.useEffect(() => {
        if (!active || !showArrow) return
        const t = setTimeout(
            () => setArrowShown(true),
            Math.max(arrowDelaySeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, showArrow, arrowDelaySeconds])

    // Optional timer-driven navigation to the next page — for a pure
    // "watch this" beat that needs no tap at all.
    React.useEffect(() => {
        if (!active || !autoAdvanceAfterSeconds || !autoAdvanceLink) return
        const t = setTimeout(() => {
            window.location.href = autoAdvanceLink
        }, Math.max(autoAdvanceAfterSeconds, 0) * 1000)
        return () => clearTimeout(t)
    }, [active, autoAdvanceAfterSeconds, autoAdvanceLink])

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
                Dots only render when showProgressDots is on; the card itself
                shows whenever there's a title/body, dots or not. */}
            <AnimatePresence>
                {(cardTitle || cardBody || (showProgressDots && progressTotal > 0)) && (
                    <motion.div
                        key="progress-card"
                        initial={{ opacity: 0, y: cardAnchor === "top" ? -24 : 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: cardAnchor === "top" ? -24 : 24 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        style={{
                            position: "fixed",
                            left: "50%",
                            ...(cardAnchor === "top" ? { top: 110 } : { bottom: 90 }),
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
                            point — it can't drift out of alignment with the line. */}
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
    cardTitle: "Let's disable your debit card",
    cardBody: "Tap on More",
    cardAnchor: "top",
    showProgressDots: true,
    progressIndex: 1,
    progressTotal: 4,
    showArrow: true,
    arrowDelaySeconds: 1.2,
    arrowOffsetX: 0,
    arrowOffsetY: -20,
    arrowColor: "rgba(5,147,144,1)",
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
    cardAnchor: {
        type: ControlType.Enum,
        title: "Card position",
        options: ["top", "bottom"],
        optionTitles: ["Top", "Bottom"],
        defaultValue: "bottom",
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
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow color",
        defaultValue: "rgba(5,147,144,1)",
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
