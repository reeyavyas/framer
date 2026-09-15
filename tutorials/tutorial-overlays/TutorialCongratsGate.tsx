import * as React from "react"
import { RenderTarget } from "framer"

/**
 * withCongratsGate
 *
 * Attach this Override DIRECTLY to the same layer/Frame that already IS
 * your congrats animation (confetti + pulse + card) — do not create a
 * separate layer referencing it. An earlier version of this file held
 * that Frame as a `ControlType.ComponentInstance` property on a
 * separate wrapper layer instead; assigning a component that way
 * crashed Framer's canvas the instant it was tied in, before this or
 * any other code even got a chance to run. This project has hit that
 * exact class of bug before — see TutorialOverlay.tsx's own top comment
 * on why its arrow is hand-built SVG rather than an embedded
 * ComponentInstance, and this repo's git history (deleted
 * OverlayPortal.tsx / OverlayOverride.tsx). Framer's lazy-loading /
 * Suspense machinery for a component referenced that way isn't reliably
 * available outside Framer's own normal render tree. An Override
 * sidesteps the whole class of problem: it wraps the SAME real layer
 * Framer already knows how to render normally, rather than creating a
 * second layer that holds a live reference to the first.
 *
 * This also drops the old `active`/mount-gating logic entirely — it was
 * solving a different problem (staying hidden until a same-page
 * pageGroup step counter caught up, back when congrats was an overlay
 * on the same page as the tutorial step) that doesn't exist once
 * congrats moved to its own dedicated page. Arriving at that page IS a
 * fresh mount, which is exactly when a "fires on load/visible" effect
 * like a confetti component needs to see one to trigger correctly —
 * nothing extra to gate here anymore.
 *
 * No property panel here on purpose — Overrides don't get one the way
 * Code Components do. Edit the constants below directly if you need a
 * different redirect delay, link, or button color.
 */

const AUTO_REDIRECT_SECONDS = 5 // 0 = off
const EXIT_LINK = "/tutorials"
const SHOW_CLOSE_BUTTON = true
const ACCENT_COLOR = "rgba(5,147,144,1)"

export function withCongratsGate(Component): React.ComponentType {
    return function CongratsGate(props) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        // Timer-driven redirect — independent of any tap, uncapped delay.
        // isCanvas is checked first for the same reason as every such
        // timer elsewhere in this project: ungated, this would fire
        // window.location.href straight out of Framer's own editor
        // while you're working, not just in a real Preview.
        React.useEffect(() => {
            if (isCanvas || !AUTO_REDIRECT_SECONDS || !EXIT_LINK) return
            const t = setTimeout(() => {
                window.location.href = EXIT_LINK
            }, AUTO_REDIRECT_SECONDS * 1000)
            return () => clearTimeout(t)
        }, [isCanvas])

        if (isCanvas) return <Component {...props} />

        return (
            <>
                <Component {...props} />
                {SHOW_CLOSE_BUTTON && (
                    <a
                        href={EXIT_LINK}
                        aria-label="Skip animation"
                        style={{
                            position: "fixed",
                            top: 60,
                            left: 40,
                            zIndex: 90500,
                            width: 110,
                            height: 110,
                            borderRadius: "50%",
                            background: ACCENT_COLOR,
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
            </>
        )
    }
}
