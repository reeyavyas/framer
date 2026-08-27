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
 * happen in. That's why nothing you add "on top" in Framer shows above
 * SpotlightOverlay: it isn't actually competing on z-index, it's just
 * rendering underneath the entire portaled subtree.
 *
 * The fix is to portal your own tutorial chrome the same way
 * SpotlightOverlay does, so it becomes a sibling of the dim layer and
 * buttons in that same body-level stacking context — where z-index
 * comparisons work normally again.
 *
 * How to use it:
 *  1. Build your overlay content as a normal Frame/Stack on the canvas
 *     (bullets row, arrow + "Click here" text, success card — whatever
 *     you like, fully native).
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

interface Props {
    children?: React.ReactNode
    visible: boolean
    layerOrder: number
    interactive: boolean
    style?: React.CSSProperties
}

export default function OverlayPortal(props: Props) {
    const { children, visible, layerOrder, interactive, style } = props

    const ref = React.useRef<HTMLDivElement>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [rect, setRect] = React.useState<DOMRect | null>(null)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    React.useEffect(() => {
        if (isCanvas || !visible) return
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
    }, [isCanvas, visible])

    const portalContent =
        visible && rect ? (
            <div
                data-focus-overlay="true"
                style={{
                    position: "fixed",
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    zIndex: 96000 + layerOrder,
                    pointerEvents: interactive ? "auto" : "none",
                }}
            >
                {children}
            </div>
        ) : null

    return (
        <div ref={ref} style={{ ...style, pointerEvents: "none" }}>
            {isCanvas && children}
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
})
