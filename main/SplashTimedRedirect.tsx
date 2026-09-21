import { forwardRef, useEffect } from "react"
import { RenderTarget } from "framer"
import type { ComponentType } from "react"

// Apply directly to whatever layer/component is your own splash screen
// (not LockScreen.tsx — that component doesn't render a splash UI of
// its own). This fires purely off mount, with no variant/prop check:
// mounting the layer this is applied to IS the "we're showing splash
// now" signal, since it only exists in the tree while your own splash
// composition is what's on screen. Waits REDIRECT_DELAY_MS, then
// navigates to the login page. Skipped on the Framer canvas so
// designing it doesn't keep navigating away from it.
const REDIRECT_DELAY_MS = 2300
const REDIRECT_URL = "/base-pages/login"

export function SplashTimedRedirect(
    Component: ComponentType<any>
): ComponentType<any> {
    return forwardRef((props: any, ref: any) => {
        useEffect(() => {
            if (typeof window === "undefined") return
            if (RenderTarget.current() === RenderTarget.canvas) return

            const id = window.setTimeout(() => {
                window.location.href = REDIRECT_URL
            }, REDIRECT_DELAY_MS)
            return () => window.clearTimeout(id)
        }, [])

        return <Component {...props} ref={ref} />
    })
}
