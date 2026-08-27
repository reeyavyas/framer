import * as React from "react"
import * as ReactDOM from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * OverlayPortal
 * Lifts any native Framer layer (a Frame/Stack containing your progress
 * bullets, a "Click here" callout + animated arrow, a "Nice work!" card,
 * etc.) into a fixed, viewport-pinned layer portaled straight to <body>.
 *
 * Why this exists: SpotlightOverlay renders its dim/blur layer and its
 * Skip/Exit buttons through a React portal to document.body (with
 * zIndex 90000 / 95000), specifically so it can sit above your real app
 * UI no matter where it's placed in the layer stack. But a portal moves
 * an element to a completely different point in the DOM tree, and
 * z-index only ever resolves *within* a shared stacking context. A
 * normal Framer layer that stays in its natural place in the page can
 * never out-rank a portaled element by raising its z-index in the
 * canvas panel — there's no shared context for that comparison to
 * happen in. That's why nothing added "on top" in Framer shows above
 * SpotlightOverlay: it isn't actually competing on z-index, it's just
 * rendering underneath the entire portaled subtree.
 *
 * The fix is to portal your own tutorial chrome the same way
 * SpotlightOverlay does, so it becomes a sibling of the dim layer and
 * buttons in that same body-level stacking context — where z-index
 * comparisons work normally again.
 *
 * How this maps onto the three tutorial overlays:
 *  - Progress bullets: set "Auto-hide after" to how long they should
 *    stay up, and pick whatever "Hide animation" + "Hide duration"
 *    reads right for a small chip. Leave "Navigate when hidden" off —
 *    they just play the exit animation and disappear.
 *  - "Nice work!" card: set "Auto-hide after" to match your native
 *    animation's length, turn on "Navigate when hidden", set
 *    "Navigate to", and pick its own "Hide animation" + "Hide
 *    duration" (a full-screen card usually wants a slower, more
 *    deliberate exit than a small chip). It plays that exit and then
 *    navigates — no click needed.
 *  - "Click here!" + arrow instructions: leave "Auto-hide after" at 0
 *    so it stays up indefinitely — "Hide animation"/"Hide duration"
 *    don't apply. It's a visual hint only — the actual click-to-
 *    navigate happens on the real element underneath (or on
 *    FocusGuide's own Link, if you're using FocusGuide in its "auto"
 *    pointer-events mode). Just toggle this component's "Visible" prop
 *    off once the step advances.
 *
 * Usage:
 *  1. Build your overlay content as a normal Frame/Stack on the canvas.
 *  2. Drop this component on the canvas, size + position it exactly
 *     where you want that content to sit (same mental model as sizing
 *     FocusGuide to match a target).
 *  3. Assign your Frame to the "Content" property below.
 *
 * On canvas your content renders inline as normal so you can design it
 * WYSIWYG. In Preview/Publish it's portaled to <body> and pinned with
 * position: fixed to match this layer's on-screen rect, tracking
 * scroll/resize the same way SpotlightOverlay tracks its target.
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

function hideTransform(anim: HideAnimation, dismissed: boolean): string | undefined {
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
// before we ever measure it -- see the long comment above its use.
const PROBE_WIDTH = 4000

// Framer's Stack doesn't lay its children out with static CSS (there's
// no Framer-authored rule on the Stack root at all -- devtools confirms
// its own display: block comes from the browser's default stylesheet,
// not Framer). It computes each child's position/size in JS at mount
// time instead, which is why the "Click here" text child comes out
// position: absolute with a literal baked-in pixel width rather than
// anything CSS-driven. That measurement isn't repeated later, so
// whatever width its ancestor chain happened to report at that first
// mount is what sticks -- permanently -- no matter what CSS is applied
// to ancestors afterward. Reading the true rendered extent afterward
// also can't just use the Stack's own box: its children may be
// absolutely positioned outside it. Union the bounding boxes of every
// descendant instead, which is correct regardless of how any given
// child is positioned.
function measureContentBounds(container: HTMLElement): {
    width: number
    height: number
} {
    const containerRect = container.getBoundingClientRect()
    let maxRight = containerRect.left
    let maxBottom = containerRect.top
    const nodes = container.querySelectorAll<HTMLElement>("*")
    for (const el of Array.from(nodes)) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (r.right > maxRight) maxRight = r.right
        if (r.bottom > maxBottom) maxBottom = r.bottom
    }
    return {
        width: Math.ceil(maxRight - containerRect.left),
        height: Math.ceil(maxBottom - containerRect.top),
    }
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
    // The true rendered extent of `children`, measured only after it's
    // had PROBE_WIDTH of unambiguous room to mount into -- see
    // measureContentBounds and PROBE_WIDTH above.
    const [contentSize, setContentSize] = React.useState<{
        width: number
        height: number
    } | null>(null)
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
    // advances to the step that uses it.
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
    React.useEffect(() => {
        if (!revealed) return
        if (!autoHideSeconds) return
        const t = setTimeout(() => setDismissed(true), autoHideSeconds * 1000)
        return () => clearTimeout(t)
    }, [revealed, autoHideSeconds])

    // Once the exit animation finishes: stop rendering, and if
    // configured, navigate — with no click required.
    React.useEffect(() => {
        if (!dismissed) return
        const t = setTimeout(() => {
            setGone(true)
            if (navigateOnHide) navRef.current?.click()
        }, Math.max(hideAnimationSeconds, 0) * 1000)
        return () => clearTimeout(t)
    }, [dismissed, navigateOnHide, hideAnimationSeconds])

    const shown = visible && revealed && !gone

    // Reset so each fresh appearance re-probes at PROBE_WIDTH rather
    // than reusing a stale measurement from a previous show/hide cycle.
    React.useEffect(() => {
        if (!shown) setContentSize(null)
    }, [shown])

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

    // `children` renders exactly once, live, inside the portal below —
    // never duplicated. Framer's Stack/layout components share internal
    // layout + animation state; mounting a second copy elsewhere (e.g.
    // a hidden one for sizing purposes) makes the two fight over it,
    // which breaks things like Stack gap/alignment. Instead we give this
    // one real copy PROBE_WIDTH of unambiguous room on the wrapper it
    // actually mounts into, then measure its true rendered extent once
    // Framer's own mount-time layout pass has run -- see the comment on
    // measureContentBounds for why that room has to be there *before*
    // mount, not applied as a fix afterward. The measured size then
    // pins the visible wrapper's own width (replacing PROBE_WIDTH) and
    // sizes a plain, contentless spacer left back in the original layer
    // position -- which matters for "Fit"-sized layers anchored from
    // the bottom/right, where the resolved top/left depends on
    // height/width -- all without ever mounting `children` twice.
    React.useEffect(() => {
        if (isCanvas || !shown || !contentRef.current) return
        const el = contentRef.current
        function measure() {
            if (!contentRef.current) return
            setContentSize(measureContentBounds(contentRef.current))
        }
        const raf = requestAnimationFrame(measure)
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => {
            cancelAnimationFrame(raf)
            observer.disconnect()
        }
    }, [isCanvas, shown])

    const resolvedNavigateLink = resolveLink(navigateLink)

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
                    // to. Never visible during the PROBE_WIDTH phase
                    // (see opacity below) — this is a same-mount
                    // measuring pass, not a flash of an oversized box.
                    width: contentSize ? contentSize.width : PROBE_WIDTH,
                    zIndex: 96000 + layerOrder,
                    pointerEvents:
                        interactive && !dismissed && contentSize
                            ? "auto"
                            : "none",
                    opacity: contentSize && !dismissed ? 1 : 0,
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
            {!isCanvas && contentSize && (
                <div
                    aria-hidden="true"
                    style={{
                        width: contentSize.width,
                        height: contentSize.height,
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
