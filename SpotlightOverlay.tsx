import * as React from "react"
import * as ReactDOM from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * SpotlightOverlay
 * Place this directly over the same area as your FocusGuide / target
 * element (same position + size). On load, the full app UI stays
 * fully visible. After the configured delay, the rest of the screen
 * blurs + dims and becomes unclickable, while the target area stays
 * sharp and clickable.
 *
 * Shape: set "Hole shape" + "Corner radius" to match your FocusGuide's
 * own Shape + Corner radius settings, so the dim edge matches the glow.
 * This uses a single clip-path'd overlay (not separate blocker
 * rectangles) so the hole can be a rounded rect, circle, or pill —
 * and clicks inside it pass through natively, since there's nothing
 * there to hit-test.
 *
 * Scrolling: the overlay is pinned to the viewport and portaled to
 * <body> so it always renders above everything. Wheel + touch-drag
 * gestures over the dimmed area are manually forwarded to the page,
 * so the UI underneath stays scrollable even while dimmed.
 *
 * Skip: set "Skip link" to send the user forward.
 * Exit: set "Exit link" to send the user back to tutorial selection.
 */

type AppearTrigger = "immediate" | "delay"
type ButtonPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left"
type HoleShape = "rectangle" | "circle" | "pill"

interface Props {
    color: string
    blurAmount: number
    active: boolean
    appearTrigger: AppearTrigger
    delaySeconds: number
    allowScroll: boolean
    scrollToTarget: boolean
    holeShape: HoleShape
    holeCornerRadius: number
    showSkipButton: boolean
    skipLabel: string
    skipPosition: ButtonPosition
    skipLink?: string
    showExitButton: boolean
    exitPosition: ButtonPosition
    exitLink?: string
    style?: React.CSSProperties
}

function cornerStyle(pos: ButtonPosition): React.CSSProperties {
    return {
        top: pos.startsWith("top") ? 80 : undefined,
        bottom: pos.startsWith("bottom") ? 40 : undefined,
        left: pos.endsWith("left") ? 40 : undefined,
        right: pos.endsWith("right") ? 40 : undefined,
    }
}

// rounded-rect subpath (clockwise)
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

// ellipse subpath (clockwise, two arcs)
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

// Find the real scrollable element sitting at a given screen point,
// ignoring our own overlay/buttons. This hit-tests the same way a
// real touch would, so it works regardless of where the scrollable
// content actually lives in the component tree relative to us.
function findScrollableAt(x: number, y: number): HTMLElement | Window {
    const stack = (document.elementsFromPoint(x, y) || []) as HTMLElement[]
    for (const hit of stack) {
        if (hit.closest("[data-focus-overlay]")) continue
        let node: HTMLElement | null = hit
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node)
            if (
                (style.overflowY === "auto" || style.overflowY === "scroll") &&
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
    if (target === window) {
        window.scrollBy({ top, left })
    } else {
        ;(target as HTMLElement).scrollBy({ top, left })
    }
}

export default function SpotlightOverlay(props: Props) {
    const {
        color,
        blurAmount,
        active,
        appearTrigger,
        delaySeconds,
        allowScroll,
        scrollToTarget,
        holeShape,
        holeCornerRadius,
        showSkipButton,
        skipLabel,
        skipPosition,
        skipLink,
        showExitButton,
        exitPosition,
        exitLink,
        style,
    } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const overlayRef = React.useRef<HTMLDivElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [viewport, setViewport] = React.useState({ w: 0, h: 0 })
    const [mounted, setMounted] = React.useState(false)
    const [revealed, setRevealed] = React.useState(
        appearTrigger === "immediate"
    )

    React.useEffect(() => setMounted(true), [])

    React.useEffect(() => {
        if (appearTrigger !== "delay") return
        setRevealed(false)
        const t = setTimeout(
            () => setRevealed(true),
            Math.max(delaySeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [appearTrigger, delaySeconds])

    React.useEffect(() => {
        if (revealed && scrollToTarget && ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [revealed, scrollToTarget])

    React.useEffect(() => {
        if (!active) return
        function measure() {
            if (ref.current) setRect(ref.current.getBoundingClientRect())
            setViewport({ w: window.innerWidth, h: window.innerHeight })
        }
        measure()
        window.addEventListener("resize", measure)
        window.addEventListener("scroll", measure, true)
        const id = window.setInterval(measure, 300)
        return () => {
            window.removeEventListener("resize", measure)
            window.removeEventListener("scroll", measure, true)
            window.clearInterval(id)
        }
    }, [active])

    React.useEffect(() => {
        if (!allowScroll || !revealed || !overlayRef.current) return
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
            scrollTarget = findScrollableAt(
                e.touches[0].clientX,
                e.touches[0].clientY
            )
        }
        function onTouchMove(e: TouchEvent) {
            const currentY = e.touches[0].clientY
            scrollByOn(scrollTarget, lastY - currentY)
            lastY = currentY
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
    }, [allowScroll, revealed, rect])

    const clipPath =
        rect && viewport.w
            ? `path(evenodd, "M0,0 H${viewport.w} V${viewport.h} H0 Z ${buildHolePath(
                  rect,
                  holeShape,
                  holeCornerRadius
              )}")`
            : undefined

    const overlay =
        active && rect ? (
            <div
                ref={overlayRef}
                data-focus-overlay="true"
                style={{
                    position: "fixed",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    background: color,
                    backdropFilter: `blur(${blurAmount}px)`,
                    WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    clipPath,
                    WebkitClipPath: clipPath,
                    zIndex: 90000,
                    opacity: revealed ? 1 : 0,
                    pointerEvents: revealed ? "auto" : "none",
                    touchAction: allowScroll ? "none" : undefined,
                    transition: "opacity 0.6s ease, backdrop-filter 0.6s ease",
                }}
            />
        ) : null

    const skipButton =
        showSkipButton && revealed ? (
            <a
                href={skipLink || undefined}
                data-focus-overlay="true"
                onClick={(e) => {
                    if (!skipLink) e.preventDefault()
                }}
                style={{
                    position: "fixed",
                    ...cornerStyle(skipPosition),
                    zIndex: 95000,
                    pointerEvents: "auto",
                    padding: "12px 34px",
                    borderRadius: 999,
                    border: "none",
                    background: "rgba(5,147,144,1)",
                    color: "#FFFFFF",
                    fontSize: 50,
                    fontWeight: 500,
                    textDecoration: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                    opacity: revealed ? 1 : 0,
                    transition: "opacity 0.6s ease",
                }}
            >
                {skipLabel}
            </a>
        ) : null

    const exitButton =
        showExitButton && revealed ? (
            <a
                href={exitLink || undefined}
                data-focus-overlay="true"
                onClick={(e) => {
                    if (!exitLink) e.preventDefault()
                }}
                aria-label="Exit tutorial"
                style={{
                    position: "fixed",
                    ...cornerStyle(exitPosition),
                    zIndex: 95000,
                    pointerEvents: "auto",
                    padding: "12px 20px",
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(5,147,144,1)",
                    color: "#FFFFFF",
                    fontSize: 50,
                    lineHeight: "54px",
                    textAlign: "center",
                    textDecoration: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                    opacity: revealed ? 1 : 0,
                    transition: "opacity 0.6s ease",
                }}
            >
                {"\u2715"}
            </a>
        ) : null

    return (
        <>
            <div ref={ref} style={{ ...style, pointerEvents: "none" }} />
            {mounted &&
                overlay &&
                !isCanvas &&
                ReactDOM.createPortal(
                    <>
                        {overlay}
                        {skipButton}
                        {exitButton}
                    </>,
                    document.body
                )}
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
                        pointerEvents: "auto",
                    }}
                >
                    Spotlight target
                    <br />
                    (full dim renders in Preview)
                </div>
            )}
        </>
    )
}

SpotlightOverlay.defaultProps = {
    color: "rgba(10, 10, 20, 0.35)",
    blurAmount: 8,
    active: true,
    appearTrigger: "delay",
    delaySeconds: 2,
    allowScroll: true,
    scrollToTarget: true,
    holeShape: "rectangle",
    holeCornerRadius: 12,
    showSkipButton: true,
    skipLabel: "Skip",
    skipPosition: "top-right",
    showExitButton: true,
    exitPosition: "top-left",
}

addPropertyControls(SpotlightOverlay, {
    color: {
        type: ControlType.Color,
        title: "Dim color",
        defaultValue: "rgba(10, 10, 20, 0.35)",
    },
    blurAmount: {
        type: ControlType.Number,
        title: "Blur (px)",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 8,
    },
    holeShape: {
        type: ControlType.Enum,
        title: "Hole shape",
        options: ["rectangle", "circle", "pill"],
        optionTitles: ["Rectangle", "Circle", "Pill"],
        defaultValue: "rectangle",
    },
    holeCornerRadius: {
        type: ControlType.Number,
        title: "Corner radius",
        min: 0,
        max: 999,
        defaultValue: 12,
        hidden: (props) => props.holeShape !== "rectangle",
    },
    appearTrigger: {
        type: ControlType.Enum,
        title: "Appear",
        options: ["immediate", "delay"],
        optionTitles: ["Immediately", "After delay"],
        defaultValue: "delay",
    },
    delaySeconds: {
        type: ControlType.Number,
        title: "Delay (sec)",
        min: 0,
        max: 30,
        step: 0.5,
        defaultValue: 2,
        hidden: (props) => props.appearTrigger !== "delay",
    },
    scrollToTarget: {
        type: ControlType.Boolean,
        title: "Scroll to target",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    allowScroll: {
        type: ControlType.Boolean,
        title: "Allow scroll thru",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
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
    skipPosition: {
        type: ControlType.Enum,
        title: "Skip position",
        options: ["top-right", "top-left", "bottom-right", "bottom-left"],
        optionTitles: ["Top right", "Top left", "Bottom right", "Bottom left"],
        defaultValue: "top-right",
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
        hidden: (props) => !props.showExitButton,
    },
    exitPosition: {
        type: ControlType.Enum,
        title: "Exit position",
        options: ["top-right", "top-left", "bottom-right", "bottom-left"],
        optionTitles: ["Top right", "Top left", "Bottom right", "Bottom left"],
        defaultValue: "top-left",
        hidden: (props) => !props.showExitButton,
    },
})
