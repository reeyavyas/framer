import * as React from "react"
import * as ReactDOM from "react-dom"
import { RenderTarget } from "framer"

/**
 * OverlayOverride
 * A Code Override -- attach it to ANY Frame/Stack directly on canvas
 * via the "Override" dropdown in the right panel (under Code). No
 * property-controls panel, no assigning content into a slot: it wraps
 * the layer's own, already-live component in place, then portals that
 * exact instance to <body> with position: fixed so it can out-rank
 * SpotlightOverlay's own portaled dim layer / buttons (portaled
 * elements only compete on z-index within a shared stacking context --
 * see SpotlightOverlay.tsx for the long version of that explanation).
 *
 * Why this instead of OverlayPortal.tsx: OverlayPortal takes content
 * via a ControlType.ComponentInstance "Content" property, which
 * re-instantiates whatever's assigned to it -- and Framer does not
 * carry a Stack's own layout CSS or live child-positioning logic
 * through that mechanism, only generic per-component-type rules
 * (confirmed via devtools: a portaled Stack had zero Framer-authored
 * layout CSS of its own, and an auto-width text child inside it got
 * `position: absolute` with a `transform: none` that never resolved to
 * anything useful). A Code Override never goes through
 * ControlType.ComponentInstance -- it wraps the SAME component
 * instance Framer already renders for this exact layer on this exact
 * page, so its own live layout, CSS and children render exactly as
 * authored. Only the DOM location and outer position change.
 *
 * Usage:
 *  1. Select any Frame/Stack on canvas (e.g. a "Click here" + arrow
 *     Stack).
 *  2. In the right panel, under Code, set "Override" to one of the
 *     named exports below (or add your own at the bottom of this
 *     file -- copy a line and adjust the numbers).
 *  3. Position/size the layer on canvas exactly where you want it to
 *     appear on the page; that's also where it renders once portaled.
 *
 * On canvas it renders completely normally (no portal, no delay/hide
 * logic), so it's still WYSIWYG to design.
 *
 * One real limitation: if the layer's own width/height is a percentage
 * of its original parent (rather than fixed or fit-content), that
 * percentage resolves against document.body once portaled, not its
 * original parent -- same caveat any body-portaled overlay has.
 */

interface OverlayOverrideConfig {
    // Absolute z-index for the portaled layer. SpotlightOverlay's dim
    // layer / buttons sit at 90000 / 95000 -- keep this above both to
    // render on top of them.
    zIndex: number
    // Added on top of zIndex, so multiple simultaneously-shown
    // overrides can be ordered relative to each other without having
    // to hand-pick non-colliding raw z-index numbers.
    layerOrder: number
    // Seconds to wait, after this layer mounts, before showing it.
    // 0 = show immediately. No upper bound.
    appearDelaySeconds: number
    // Seconds after becoming visible before it auto-hides itself.
    // 0 = never auto-hide. No upper bound.
    autoHideSeconds: number
    // Whether the portaled layer receives clicks/taps once shown.
    interactive: boolean
}

function withOverlayPortal(config: OverlayOverrideConfig) {
    const {
        zIndex,
        layerOrder,
        appearDelaySeconds,
        autoHideSeconds,
        interactive,
    } = config

    return function overlayPortalOverride(
        Component: React.ComponentType<any>
    ): React.ComponentType<any> {
        return function OverlayPortalOverride(props: any) {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const placeholderRef = React.useRef<HTMLDivElement>(null)

            const [mounted, setMounted] = React.useState(false)
            const [rect, setRect] = React.useState<DOMRect | null>(null)
            const [revealed, setRevealed] = React.useState(!appearDelaySeconds)
            const [dismissed, setDismissed] = React.useState(false)

            React.useEffect(() => setMounted(true), [])

            React.useEffect(() => {
                if (!appearDelaySeconds) return
                const t = setTimeout(
                    () => setRevealed(true),
                    appearDelaySeconds * 1000
                )
                return () => clearTimeout(t)
            }, [])

            React.useEffect(() => {
                if (!revealed || !autoHideSeconds) return
                const t = setTimeout(
                    () => setDismissed(true),
                    autoHideSeconds * 1000
                )
                return () => clearTimeout(t)
            }, [revealed])

            // Track this layer's real on-screen position via a plain,
            // invisible placeholder left in its original spot (styled
            // identically via the same `style` Framer already computed
            // for it), rather than measuring the portaled Component
            // itself -- a plain div needs no extra mount and never
            // risks mounting Component twice.
            React.useEffect(() => {
                if (isCanvas) return
                function measure() {
                    if (placeholderRef.current) {
                        setRect(placeholderRef.current.getBoundingClientRect())
                    }
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
            }, [isCanvas])

            if (isCanvas) {
                return <Component {...props} />
            }

            const shown = revealed && !dismissed
            const style: React.CSSProperties = props.style || {}

            return (
                <>
                    <div
                        ref={placeholderRef}
                        aria-hidden="true"
                        style={{ ...style, visibility: "hidden" }}
                    />
                    {mounted &&
                        rect &&
                        ReactDOM.createPortal(
                            <div
                                style={{
                                    position: "fixed",
                                    top: rect.top,
                                    left: rect.left,
                                    zIndex: zIndex + layerOrder,
                                    opacity: shown ? 1 : 0,
                                    pointerEvents:
                                        interactive && shown ? "auto" : "none",
                                    transition: "opacity 0.3s ease",
                                }}
                            >
                                <Component
                                    {...props}
                                    style={{ ...style, position: "relative" }}
                                />
                            </div>,
                            document.body
                        )}
                </>
            )
        }
    }
}

// Ready-to-use overrides -- pick one from the "Override" dropdown on
// any layer, or copy a line below and adjust the numbers for your own.
export const Overlay = withOverlayPortal({
    zIndex: 96000,
    layerOrder: 0,
    appearDelaySeconds: 0,
    autoHideSeconds: 0,
    interactive: false,
})

export const OverlayInteractive = withOverlayPortal({
    zIndex: 96000,
    layerOrder: 0,
    appearDelaySeconds: 0,
    autoHideSeconds: 0,
    interactive: true,
})

export const OverlayDelayed = withOverlayPortal({
    zIndex: 96000,
    layerOrder: 0,
    appearDelaySeconds: 2,
    autoHideSeconds: 0,
    interactive: false,
})

export const OverlayAutoHide = withOverlayPortal({
    zIndex: 96000,
    layerOrder: 0,
    appearDelaySeconds: 0,
    autoHideSeconds: 5,
    interactive: false,
})
