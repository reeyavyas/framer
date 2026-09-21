import { forwardRef, useEffect } from "react"
import { RenderTarget } from "framer"
import type { ComponentType } from "react"

// Apply to the Lock Screen layer. Waits REDIRECT_DELAY_MS after the
// layer's `variant` prop reads "splash" (Variant 2), then navigates to
// the login page. Skipped on the Framer canvas so designing the splash
// frame doesn't keep navigating away from it.
const REDIRECT_DELAY_MS = 2300
const REDIRECT_URL = "/base-pages/login"

export function SplashTimedRedirect(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) => {
        useEffect(() => {
            if (props.variant !== "splash") return
            if (typeof window === "undefined") return
            if (RenderTarget.current() === RenderTarget.canvas) return

            const id = window.setTimeout(() => {
                window.location.href = REDIRECT_URL
            }, REDIRECT_DELAY_MS)
            return () => window.clearTimeout(id)
        }, [props.variant])

        return <Component {...props} ref={ref} />
    })
}
