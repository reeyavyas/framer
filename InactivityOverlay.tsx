import * as React from "react"
import ReactDOM from "react-dom"
import { RenderTarget } from "framer"

// Edit these two values directly — they're shared by every instance of
// this component across every page, with no per-page property to manage.
const INACTIVITY_MINUTES = 3 // ~6 seconds — TEMP for testing, set back to 5 after
const COUNTDOWN_SECONDS = 30

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
export default function InactivityOverlay() {
    const [isVisible, setIsVisible] = React.useState(false)
    const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
    const [animateIn, setAnimateIn] = React.useState(false)

    // True while designing on the Framer canvas. We skip all timers and
    // listeners in this context, and render a static (non-portaled) preview
    // instead — that way Framer's own "Visible" toggle in the Style tab
    // (which hides/shows this layer's own DOM subtree) actually has real
    // content to act on, rather than content that's portaled elsewhere.
    const isCanvas =
        typeof window !== "undefined" &&
        RenderTarget.current() === RenderTarget.canvas

    // Tracks current visibility inside the activity listener without
    // forcing that effect to re-run (and re-attach listeners) every
    // time the overlay opens/closes.
    const isVisibleRef = React.useRef(false)
    React.useEffect(() => {
        isVisibleRef.current = isVisible
    }, [isVisible])

    const inactivityTimeoutRef = React.useRef<number | null>(null)
    const countdownIntervalRef = React.useRef<number | null>(null)

    const clearInactivityTimeout = React.useCallback(() => {
        if (
            typeof window !== "undefined" &&
            inactivityTimeoutRef.current !== null
        ) {
            window.clearTimeout(inactivityTimeoutRef.current)
            inactivityTimeoutRef.current = null
        }
    }, [])

    const clearCountdownInterval = React.useCallback(() => {
        if (
            typeof window !== "undefined" &&
            countdownIntervalRef.current !== null
        ) {
            window.clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
        }
    }, [])

    const goHome = React.useCallback(() => {
        if (typeof window !== "undefined") {
            window.location.href = "/"
        }
    }, [])

    const startInactivityTimer = React.useCallback(() => {
        if (typeof window === "undefined") return
        clearInactivityTimeout()
        const timeoutMs = INACTIVITY_MINUTES * 60 * 1000
        inactivityTimeoutRef.current = window.setTimeout(() => {
            setCountdown(COUNTDOWN_SECONDS)
            setIsVisible(true)
        }, timeoutMs)
    }, [clearInactivityTimeout])

    // Called ONLY by the "YES, I'M HERE" button. Closes the overlay,
    // resets the countdown, and restarts the inactivity clock.
    const closeOverlay = React.useCallback(() => {
        clearCountdownInterval()
        setAnimateIn(false)
        setIsVisible(false)
        setCountdown(COUNTDOWN_SECONDS)
        startInactivityTimer()
    }, [clearCountdownInterval, startInactivityTimer])

    // Attach activity listeners once. Activity only matters while the
    // overlay is HIDDEN — it just delays the next time it appears.
    // While the overlay IS visible, ambient mouse/touch movement is
    // ignored entirely; only an explicit tap on "YES, I'M HERE" closes it.
    React.useEffect(() => {
        if (isCanvas) return
        if (typeof document === "undefined") return

        const onActivity = () => {
            if (!isVisibleRef.current) {
                startInactivityTimer()
            }
        }

        document.addEventListener("pointermove", onActivity, true)
        document.addEventListener("pointerdown", onActivity, true)
        document.addEventListener("touchstart", onActivity, true)
        document.addEventListener("keydown", onActivity, true)

        startInactivityTimer()

        return () => {
            document.removeEventListener("pointermove", onActivity, true)
            document.removeEventListener("pointerdown", onActivity, true)
            document.removeEventListener("touchstart", onActivity, true)
            document.removeEventListener("keydown", onActivity, true)
            clearInactivityTimeout()
        }
    }, [isCanvas, startInactivityTimer, clearInactivityTimeout])

    // While visible: fade in and run the countdown.
    React.useEffect(() => {
        if (isCanvas) return
        if (!isVisible || typeof window === "undefined") {
            clearCountdownInterval()
            return
        }

        setAnimateIn(false)
        const animationFrame = window.requestAnimationFrame(() => {
            setAnimateIn(true)
        })

        clearCountdownInterval()
        countdownIntervalRef.current = window.setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1))
        }, 1000)

        return () => {
            window.cancelAnimationFrame(animationFrame)
            clearCountdownInterval()
        }
    }, [isCanvas, isVisible, clearCountdownInterval])

    // Countdown hit 0 while visible -> go home automatically.
    React.useEffect(() => {
        if (isCanvas) return
        if (isVisible && countdown <= 0) {
            clearCountdownInterval()
            goHome()
        }
    }, [isCanvas, countdown, isVisible, clearCountdownInterval, goHome])

    // Cleanup on unmount.
    React.useEffect(() => {
        return () => {
            clearInactivityTimeout()
            clearCountdownInterval()
        }
    }, [clearInactivityTimeout, clearCountdownInterval])

    // On canvas we never run the fade-in effect (no timers there at all),
    // so drive the visual state directly to "fully shown" instead of
    // relying on animateIn, which would otherwise stay stuck at false.
    const faded = isCanvas ? true : animateIn

    const overlayInner = (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",
                    opacity: faded ? 1 : 0,
                    transition: "opacity 0.4s ease-out 0.3s",
                }}
            />

            <div
                style={{
                    position: "relative",
                    background: "rgba(255,255,255,1)",
                    width: 972,
                    padding: 60,
                    borderRadius: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 100,
                    alignItems: "flex-start",
                    opacity: faded ? 1 : 0,
                    transform: faded ? "scale(1)" : "scale(0.97)",
                    transition:
                        "opacity 0.35s ease 0.2s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.2s",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 40,
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                            fontSize: 60,
                            lineHeight: 1.2,
                            color: "rgb(20, 20, 20)",
                        }}
                    >
                        Are you still there?
                    </div>
                    <div
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 500,
                            fontSize: 38,
                            lineHeight: 1.2,
                            color: "rgb(84, 84, 84)",
                        }}
                    >
                        Kiosk will return home in {countdown} seconds.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 100,
                        width: "100%",
                    }}
                >
                    <button
                        onClick={isCanvas ? undefined : goHome}
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                            fontSize: 36,
                            lineHeight: 1.2,
                            textTransform: "uppercase",
                            color: "rgb(5, 147, 144)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            letterSpacing: 0,
                            textDecoration: "none",
                        }}
                    >
                        RETURN HOME
                    </button>
                    <button
                        onClick={isCanvas ? undefined : closeOverlay}
                        style={{
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 600,
                            fontSize: 36,
                            lineHeight: 1.2,
                            textTransform: "uppercase",
                            color: "rgb(5, 147, 144)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            letterSpacing: 0,
                            textDecoration: "none",
                        }}
                    >
                        YES, I'M HERE
                    </button>
                </div>
            </div>
        </>
    )

    const overlayFrame = (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 99999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {overlayInner}
        </div>
    )

    // CANVAS: same backdrop + card, but sized to 100% of this layer's own
    // box instead of position:fixed/100vw/100vh. Fixed positioning doesn't
    // reliably fill space inside Framer's canvas (it's broken by the
    // canvas's own zoom/pan transform), which is what left blank space
    // showing through before. This version just fills the local frame.
    if (isCanvas) {
        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {overlayInner}
            </div>
        )
    }

    // PREVIEW / LIVE SITE: the real thing, driven by the inactivity timer,
    // portaled to <body> so it covers the whole viewport regardless of
    // where this layer sits in the page.
    if (!isVisible) return null
    if (typeof document === "undefined") return null

    return ReactDOM.createPortal(overlayFrame, document.body)
}
