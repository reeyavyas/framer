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

interface Props {
    children?: React.ReactNode
    visible: boolean
    layerOrder: number
    interactive: boolean
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
        autoHideSeconds,
        hideAnimation,
        hideAnimationSeconds,
        navigateOnHide,
        navigateLink,
        style,
    } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const navRef = React.useRef<HTMLAnchorElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [mounted, setMounted] = React.useState(false)
    // dismissed: the auto-hide timer has fired, layer is playing its
    // exit animation. gone: exit animation finished, stop rendering
    // (and measuring) the portal.
    const [dismissed, setDismissed] = React.useState(false)
    const [gone, setGone] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    // Arm/reset whenever this layer is (re)shown, e.g. the tutorial
    // advances to the step that uses it.
    React.useEffect(() => {
        if (!visible) {
            setDismissed(false)
            setGone(false)
            return
        }
        if (!autoHideSeconds) return
        const t = setTimeout(() => setDismissed(true), autoHideSeconds * 1000)
        return () => clearTimeout(t)
    }, [visible, autoHideSeconds])

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

    const shown = visible && !gone

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

    const resolvedNavigateLink = resolveLink(navigateLink)

    const portalContent =
        shown && rect ? (
            <div
                data-focus-overlay="true"
                style={{
                    position: "fixed",
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    zIndex: 96000 + layerOrder,
                    pointerEvents: interactive && !dismissed ? "auto" : "none",
                    opacity: dismissed ? 0 : 1,
                    transform: hideTransform(hideAnimation, dismissed),
                    transition: `opacity ${hideAnimationSeconds}s ease, transform ${hideAnimationSeconds}s ease`,
                }}
            >
                {children}
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
            {isCanvas ? (
                children
            ) : (
                // Off canvas, the visible/interactive copy of `children`
                // lives entirely inside the portal below — but this
                // wrapper div is what we measure for the portal's
                // position + size. If it were left empty, a "Fit"-sized
                // layer would collapse to 0x0 (nothing here to size
                // around), and that zero-size rect would then be handed
                // to the portal too. Keep a real, hidden copy here so
                // sizing stays accurate; it never paints or receives
                // clicks.
                <div style={{ visibility: "hidden" }} aria-hidden="true">
                    {children}
                </div>
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
        max: 60,
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
