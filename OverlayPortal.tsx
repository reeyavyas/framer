import * as React from "react"
import * as ReactDOM from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * OverlayPortal
 * Lifts any native Framer layer into a fixed, viewport-pinned layer
 * portaled straight to <body>, sized to fit its content exactly.
 *
 * Why a portal: SpotlightOverlay renders its dim layer and Skip/Exit
 * buttons via a React portal to document.body (zIndex 90000 / 95000).
 * A portal moves an element to a different point in the DOM tree, and
 * z-index only resolves within a shared stacking context -- a normal
 * Framer layer that stays in its natural place can never out-rank a
 * portaled element just by raising its z-index in the canvas panel.
 * Portaling your own tutorial chrome the same way makes it a sibling of
 * SpotlightOverlay's layer in that same body-level stacking context,
 * where z-index comparisons work again.
 *
 * Why the fit-content measurement is two-pass, not CSS-only: Framer's
 * Stack has no CSS rule of its own governing its children's layout --
 * it computes each child's position/size once, in JS, at mount time,
 * from whatever width its ancestor chain reports at that instant. That
 * pass never repeats, so a wrapper that starts at width:auto/fit-content
 * (which asks the browser to shrink-wrap in the same instant Framer is
 * measuring) bakes in a wrong, tiny, permanent size -- confirmed via
 * devtools, and provably scoped to this portal since the same Stack
 * placed directly on the canvas renders at full size. The only fix is
 * to give the Stack a large, unambiguous width to mount into, then read
 * back the true union of every descendant's bounding box (not just the
 * Stack's own box, since children may render outside it via absolute
 * positioning) once that reading is real and has stopped changing.
 *
 * Usage:
 *  1. Build your overlay content as a normal Frame/Stack on the canvas.
 *  2. Drop this component on the canvas, position it where you want
 *     that content's top-left corner to land (its own size doesn't
 *     matter -- the portal sizes itself to the content).
 *  3. Assign your Frame to the "Content" property below.
 *
 * On canvas your content renders inline as normal so you can design it
 * WYSIWYG. In Preview/Publish it's portaled to <body>, pinned with
 * position: fixed to this layer's top-left, and sized to its content's
 * true rendered extent.
 *
 * z-index stack (top to bottom):
 *   OverlayPortal (this)         96000 + Layer order
 *   SpotlightOverlay buttons     95000
 *   SpotlightOverlay dim layer   90000
 *   FocusGuide / your real UI    normal flow
 */

type HideAnimation = "fade" | "fadeSlideUp" | "fadeSlideDown" | "scaleOut"

// Framer's Link control can hand back a plain string (typed URL) or an
// object (internal page reference), depending on what was picked.
// Normalize either shape into a usable href.
function resolveLink(link: any): string | undefined {
    if (!link) return undefined
    if (typeof link === "string") return link
    return link.href || link.path || link.url || undefined
}

function hideTransform(
    anim: HideAnimation,
    dismissed: boolean
): string | undefined {
    if (!dismissed) return undefined
    switch (anim) {
        case "fadeSlideUp":
            return "translateY(-24px)"
        case "fadeSlideDown":
            return "translateY(24px)"
        case "scaleOut":
            return "scale(0.85)"
        default:
            return undefined
    }
}

// A generous, unambiguous width to give Framer's Stack to mount into
// before we ever measure it -- see the file-level comment above.
const PROBE_WIDTH = 8000

// Upper bound on how many animation frames we'll poll waiting for the
// measurement to stabilize, so a pathological case (content that never
// settles) can never leave the overlay invisible forever -- we fall
// back to the last real reading instead. ~1.5s at 60fps; a normal
// mount stabilizes within a handful of frames.
const MAX_PROBE_FRAMES = 90

// After the initial measurement stabilizes, keep re-checking on this
// interval for as long as the overlay stays shown, so a late layout
// shift (a web font swapping in, an image finishing its own load)
// doesn't get stuck with the first reading forever.
const RECHECK_MS = 500

type ContentSize = { width: number; height: number }

// Union the bounding boxes of every descendant, since Framer's Stack
// may position children outside its own box via absolute positioning
// -- the Stack's own box is not a reliable stand-in for its content's
// true extent. Returns null (not a zero-size box) when nothing
// measurable has rendered yet, so callers never mistake "too early to
// tell" for "the content is 0x0".
function measureContentBounds(container: HTMLElement): ContentSize | null {
    const containerRect = container.getBoundingClientRect()
    let maxRight = containerRect.left
    let maxBottom = containerRect.top
    let sawContent = false
    const nodes = container.querySelectorAll<HTMLElement>("*")
    for (const el of Array.from(nodes)) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        sawContent = true
        if (r.right > maxRight) maxRight = r.right
        if (r.bottom > maxBottom) maxBottom = r.bottom
    }
    if (!sawContent) return null
    const width = Math.ceil(maxRight - containerRect.left)
    const height = Math.ceil(maxBottom - containerRect.top)
    if (width <= 0 || height <= 0) return null
    return { width, height }
}

interface Props {
    children?: React.ReactNode
    visible: boolean
    layerOrder: number
    interactive: boolean
    appearDelaySeconds: number
    autoHideSeconds: number
    hideAnimation: HideAnimation
    hideAnimationSeconds: number
    navigateOnHide: boolean
    navigateLink?: any
    style?: React.CSSProperties
}

export default function OverlayPortal(props: Props) {
    const {
        children,
        visible,
        layerOrder,
        interactive,
        appearDelaySeconds,
        autoHideSeconds,
        hideAnimation,
        hideAnimationSeconds,
        navigateOnHide,
        navigateLink,
        style,
    } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const navRef = React.useRef<HTMLAnchorElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [contentSize, setContentSize] = React.useState<ContentSize | null>(
        null
    )
    const [mounted, setMounted] = React.useState(false)
    // revealed: the appear delay (if any) has elapsed since `visible`
    // turned on. dismissed: the auto-hide timer has fired, layer is
    // playing its exit animation. gone: exit animation finished, stop
    // rendering (and measuring) the portal.
    const [revealed, setRevealed] = React.useState(false)
    const [dismissed, setDismissed] = React.useState(false)
    const [gone, setGone] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    // Arm/reset whenever this layer is (re)shown, e.g. the tutorial
    // advances to the step that uses it. No cap on the delay -- any
    // non-negative number of seconds is honored as-is.
    React.useEffect(() => {
        if (!visible) {
            setRevealed(false)
            setDismissed(false)
            setGone(false)
            return
        }
        if (!appearDelaySeconds) {
            setRevealed(true)
            return
        }
        setRevealed(false)
        const t = setTimeout(
            () => setRevealed(true),
            appearDelaySeconds * 1000
        )
        return () => clearTimeout(t)
    }, [visible, appearDelaySeconds])

    // Auto-hide counts from when the layer actually becomes visible
    // (i.e. after the appear delay), not from when `visible` was set.
    // No cap here either -- 0 means "never auto-hide".
    React.useEffect(() => {
        if (!revealed) return
        if (!autoHideSeconds) return
        const t = setTimeout(() => setDismissed(true), autoHideSeconds * 1000)
        return () => clearTimeout(t)
    }, [revealed, autoHideSeconds])

    // Once the exit animation finishes: stop rendering, and if
    // configured, navigate -- with no click required.
    React.useEffect(() => {
        if (!dismissed) return
        const t = setTimeout(() => {
            setGone(true)
            if (navigateOnHide) navRef.current?.click()
        }, Math.max(hideAnimationSeconds, 0) * 1000)
        return () => clearTimeout(t)
    }, [dismissed, navigateOnHide, hideAnimationSeconds])

    const shown = visible && revealed && !gone

    // Reset so each fresh appearance re-probes rather than reusing a
    // stale measurement from a previous show/hide cycle.
    React.useEffect(() => {
        if (!shown) setContentSize(null)
    }, [shown])

    // Track this layer's on-screen position -- the portal is pinned to
    // match it.
    React.useEffect(() => {
        if (isCanvas || !shown) return
        function measure() {
            if (ref.current) setRect(ref.current.getBoundingClientRect())
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
    }, [isCanvas, shown])

    // Measure the true rendered extent of `children`, given PROBE_WIDTH
    // of unambiguous room to mount into (see the file-level comment).
    // Poll with requestAnimationFrame rather than trusting a single
    // reading: the first frame or two can legitimately report 0x0
    // before Framer's own mount-time layout pass has run, and treating
    // that as a valid measurement is what made everything invisible
    // before. A reading only counts once it's real (non-zero) AND
    // identical to the previous frame's reading -- i.e. layout has
    // actually settled, not just produced a number.
    React.useEffect(() => {
        if (isCanvas || !shown) return
        let cancelled = false
        let raf = 0
        let frame = 0
        let last: ContentSize | null = null

        function tick() {
            if (cancelled) return
            const el = contentRef.current
            const measured = el ? measureContentBounds(el) : null
            frame++

            const stable =
                measured &&
                last &&
                measured.width === last.width &&
                measured.height === last.height

            if (stable) {
                setContentSize(measured)
                return
            }
            last = measured

            if (frame >= MAX_PROBE_FRAMES) {
                // Never stabilized -- use the last real reading instead
                // of staying invisible forever. If we never got a real
                // reading at all, keep polling is pointless; leave
                // contentSize null and let the recheck loop below pick
                // it up once something finally renders.
                if (measured) setContentSize(measured)
                return
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => {
            cancelled = true
            cancelAnimationFrame(raf)
        }
    }, [isCanvas, shown])

    // Once we have an initial measurement, keep re-checking on an
    // interval (mirrors how SpotlightOverlay already polls its own
    // target rect) so a late layout shift updates the pinned size
    // instead of leaving it stuck at whatever mounted first.
    const hasMeasured = contentSize !== null
    React.useEffect(() => {
        if (isCanvas || !shown || !hasMeasured) return
        const id = window.setInterval(() => {
            const el = contentRef.current
            const measured = el ? measureContentBounds(el) : null
            if (!measured) return
            setContentSize((prev) =>
                prev &&
                prev.width === measured.width &&
                prev.height === measured.height
                    ? prev
                    : measured
            )
        }, RECHECK_MS)
        return () => window.clearInterval(id)
    }, [isCanvas, shown, hasMeasured])

    const resolvedNavigateLink = resolveLink(navigateLink)
    const ready = contentSize !== null

    // `children` renders exactly once, live, inside the portal below --
    // never duplicated. Framer's Stack/layout components share internal
    // layout + animation state; mounting a second copy elsewhere (e.g.
    // a hidden one purely for sizing) makes the two fight over it,
    // which breaks things like Stack gap/alignment.
    const portalContent =
        shown && rect ? (
            <div
                data-overlay-portal="true"
                style={{
                    position: "fixed",
                    top: rect.top,
                    left: rect.left,
                    // Pinned to the true measured width once we have
                    // one; PROBE_WIDTH until then, so Framer's Stack
                    // mounts with generous, unambiguous room instead of
                    // whatever this wrapper would otherwise shrink-wrap
                    // to. visibility (not display) keeps it a real,
                    // measurable layout box while it's not yet ready.
                    width: ready ? contentSize!.width : PROBE_WIDTH,
                    zIndex: 96000 + layerOrder,
                    pointerEvents:
                        interactive && ready && !dismissed ? "auto" : "none",
                    visibility: ready ? "visible" : "hidden",
                    opacity: ready && !dismissed ? 1 : 0,
                    transform: hideTransform(hideAnimation, dismissed),
                    transition: `opacity ${hideAnimationSeconds}s ease, transform ${hideAnimationSeconds}s ease`,
                }}
            >
                <div ref={contentRef} style={{ display: "inline-block" }}>
                    {children}
                </div>
                {navigateOnHide && resolvedNavigateLink && (
                    <a
                        ref={navRef}
                        href={resolvedNavigateLink}
                        style={{ display: "none" }}
                        aria-hidden="true"
                    />
                )}
            </div>
        ) : null

    return (
        <div ref={ref} style={{ ...style, pointerEvents: "none" }}>
            {isCanvas && children}
            {!isCanvas && ready && (
                <div
                    aria-hidden="true"
                    style={{
                        width: contentSize!.width,
                        height: contentSize!.height,
                        visibility: "hidden",
                    }}
                />
            )}
            {mounted &&
                !isCanvas &&
                ReactDOM.createPortal(portalContent, document.body)}
        </div>
    )
}

OverlayPortal.defaultProps = {
    visible: true,
    layerOrder: 0,
    interactive: false,
    appearDelaySeconds: 0,
    autoHideSeconds: 0,
    hideAnimation: "fade",
    hideAnimationSeconds: 0.45,
    navigateOnHide: false,
}

addPropertyControls(OverlayPortal, {
    children: {
        type: ControlType.ComponentInstance,
        title: "Content",
    },
    visible: {
        type: ControlType.Boolean,
        title: "Visible",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    appearDelaySeconds: {
        type: ControlType.Number,
        title: "Show delay (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
    },
    layerOrder: {
        type: ControlType.Number,
        title: "Layer order",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 0,
    },
    interactive: {
        type: ControlType.Boolean,
        title: "Interactive",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    autoHideSeconds: {
        type: ControlType.Number,
        title: "Auto-hide after (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
    },
    hideAnimation: {
        type: ControlType.Enum,
        title: "Hide animation",
        options: ["fade", "fadeSlideUp", "fadeSlideDown", "scaleOut"],
        optionTitles: ["Fade", "Fade + rise", "Fade + sink", "Scale out"],
        defaultValue: "fade",
        hidden: (props) => !props.autoHideSeconds,
    },
    hideAnimationSeconds: {
        type: ControlType.Number,
        title: "Hide duration (sec)",
        min: 0.1,
        max: 3,
        step: 0.05,
        defaultValue: 0.45,
        hidden: (props) => !props.autoHideSeconds,
    },
    navigateOnHide: {
        type: ControlType.Boolean,
        title: "Navigate when hidden",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (props) => !props.autoHideSeconds,
    },
    navigateLink: {
        type: ControlType.Link,
        title: "Navigate to",
        hidden: (props) => !props.autoHideSeconds || !props.navigateOnHide,
    },
})
