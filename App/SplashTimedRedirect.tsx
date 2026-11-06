import { forwardRef, useEffect, useRef } from "react"
import { RenderTarget } from "framer"
import type { ComponentType } from "react"

// Apply directly to whatever layer/component is your own splash screen.
// Doesn't rely on mount timing alone — that only fires correctly if the
// splash frame is its own separately-mounted layer. If instead it's a
// Framer-native Variant switch or a Show/Hide toggle within an
// already-mounted parent, nothing unmounts; Framer just flips
// display/visibility/opacity somewhere in the ancestor chain. So this
// polls actual on-screen visibility (walking up from this layer's own
// DOM node checking display/visibility/opacity at every ancestor) rather
// than assuming mount = visible.
//
// Fires REDIRECT_DELAY_MS after first seen visible. Resets if it goes
// hidden again, so switching away and back re-arms it rather than
// leaving a stale timer running. Skipped on the Framer canvas.
const REDIRECT_DELAY_MS = 2300
const REDIRECT_URL = "/base-pages/login"
const POLL_INTERVAL_MS = 200

function isActuallyVisible(el: HTMLElement | null): boolean {
    if (!el) return false
    let node: HTMLElement | null = el
    while (node && node !== document.body) {
        const style = window.getComputedStyle(node)
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            parseFloat(style.opacity) === 0
        ) {
            return false
        }
        node = node.parentElement
    }
    return true
}

export function SplashTimedRedirect(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, outerRef: any) => {
        const localRef = useRef<HTMLDivElement>(null)

        useEffect(() => {
            if (typeof window === "undefined") return
            if (RenderTarget.current() === RenderTarget.canvas) return

            let timeoutId: number | null = null
            let wasVisible = false

            const check = () => {
                const visible = isActuallyVisible(localRef.current)
                if (visible && !wasVisible) {
                    timeoutId = window.setTimeout(() => {
                        window.location.href = REDIRECT_URL
                    }, REDIRECT_DELAY_MS)
                } else if (!visible && wasVisible && timeoutId !== null) {
                    window.clearTimeout(timeoutId)
                    timeoutId = null
                }
                wasVisible = visible
            }

            check()
            const poll = window.setInterval(check, POLL_INTERVAL_MS)

            return () => {
                window.clearInterval(poll)
                if (timeoutId !== null) window.clearTimeout(timeoutId)
            }
        }, [])

        return (
            <div ref={localRef} style={{ width: "100%", height: "100%" }}>
                <Component {...props} ref={outerRef} />
            </div>
        )
    })
}
