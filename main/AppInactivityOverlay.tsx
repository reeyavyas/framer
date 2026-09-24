import * as React from "react"
import ReactDOM from "react-dom"
import { RenderTarget } from "framer"

// Edit these two values directly — they're shared by every instance of
// this component across every page, with no per-page property to manage.
const INACTIVITY_MINUTES = 3
const COUNTDOWN_SECONDS = 30

// Fade-in timing on the tutorials carousel page, where it's driven
// frame by frame instead of by CSS transitions (see onCarouselPage).
const CAROUSEL_DIM_MS = 700
const CAROUSEL_PANEL_DELAY_MS = 250
const CAROUSEL_PANEL_MS = 600

function fadeProgress(elapsedMs: number, delayMs: number, durationMs: number) {
    return Math.min(1, Math.max(0, (elapsedMs - delayMs) / durationMs))
}
const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
export default function AppInactivityOverlay() {
    const [isVisible, setIsVisible] = React.useState(false)
    const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
    const [animateIn, setAnimateIn] = React.useState(false)
    // Whether this page has the tutorials carousel, which turns off the
    // backdrop blur and changes how the backdrop fades in (see
    // startInactivityTimer). Decided
    // fresh each time the overlay opens rather than once on mount, since
    // the page's content can change underneath this layer.
    const [onCarouselPage, setOnCarouselPage] = React.useState(false)
    // Milliseconds since the overlay opened, advanced every frame while
    // the carousel-page fade-in runs.
    const [carouselFadeMs, setCarouselFadeMs] = React.useState(0)

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
            window.location.href = "/app"
        }
    }, [])

    const startInactivityTimer = React.useCallback(() => {
        if (typeof window === "undefined") return
        clearInactivityTimeout()
        const timeoutMs = INACTIVITY_MINUTES * 60 * 1000
        inactivityTimeoutRef.current = window.setTimeout(() => {
            // On Windows Chrome/Edge, backdrop-filter blur over the
            // CurvedCarouselV2 flip cards paints a stray rectangular
            // shadow on the centered card (not seen on macOS). Confirmed
            // by removing the blur live — the rectangle disappears — while
            // flattening the carousel's own preserve-3d or removing its
            // edge-fade mask did not. With the blur gone the rectangle
            // still flickered during any CSS opacity transition over the
            // carousel (backdrop or panel), which Chrome runs on the GPU
            // compositor, and never when the fade came only from
            // repainting. So there the fade-in has no CSS transitions:
            // it's stepped frame by frame from JS (see carouselFadeMs).
            // Both apply only on pages that actually have the carousel
            // (its cards carry data-carousel-card); every other page
            // keeps the blur and CSS fade unchanged.
            setOnCarouselPage(
                !!document.querySelector("[data-carousel-card]")
            )
            setCarouselFadeMs(0)
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

    // Carousel page only: step the fade-in every frame (see
    // startInactivityTimer for why it avoids CSS transitions there).
    React.useEffect(() => {
        if (isCanvas || !isVisible || !onCarouselPage) return
        const totalMs = Math.max(
            CAROUSEL_DIM_MS,
            CAROUSEL_PANEL_DELAY_MS + CAROUSEL_PANEL_MS
        )
        const start = performance.now()
        let frame = 0
        const tick = (now: number) => {
            const elapsed = now - start
            setCarouselFadeMs(elapsed)
            if (elapsed < totalMs) frame = window.requestAnimationFrame(tick)
        }
        setCarouselFadeMs(0)
        frame = window.requestAnimationFrame(tick)
        return () => window.cancelAnimationFrame(frame)
    }, [isCanvas, isVisible, onCarouselPage])

    // Countdown hit 0 while visible -> go home automatically.
    React.useEffect(() => {
        if (isCanvas) return
        if (isVisible && countdown <= 0) {
            clearCountdownInterval()
            goHome()
        }
    }, [isCanvas, countdown, isVisible, clearCountdownInterval, goHome])

    // Announce open/closed to the rest of the page, so a tutorial step
    // (TutorialOverlay.tsx) can pause underneath while this is up — its
    // timers, scroll hand-off and scroll redirection would otherwise keep
    // running behind the "Are you still there?" box. A window flag (for a
    // step that mounts while this is already open) plus an event (for
    // steps already mounted), not an import: this file and
    // TutorialOverlay.tsx live in different top-level folders, and a
    // cross-folder import doesn't resolve reliably in Framer (see
    // tutorials/NOTES.md). Cleared on unmount too, so a page navigation
    // while open can't leave the flag stuck on.
    React.useEffect(() => {
        if (isCanvas || !isVisible) return
        const w = window as any
        w.__systemOverlayOpen = true
        window.dispatchEvent(new Event("system-overlay-change"))
        return () => {
            w.__systemOverlayOpen = false
            window.dispatchEvent(new Event("system-overlay-change"))
        }
    }, [isCanvas, isVisible])

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
    const carouselDim = easeInOut(
        fadeProgress(carouselFadeMs, 0, CAROUSEL_DIM_MS)
    )
    const carouselPanel = easeOut(
        fadeProgress(carouselFadeMs, CAROUSEL_PANEL_DELAY_MS, CAROUSEL_PANEL_MS)
    )

    const overlayInner = (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    ...(onCarouselPage
                        ? { background: `rgba(0,0,0,${0.25 * carouselDim})` }
                        : {
                              background: "rgba(0,0,0,0.25)",
                              backdropFilter: "blur(3px)",
                              WebkitBackdropFilter: "blur(3px)",
                              opacity: faded ? 1 : 0,
                              transition: "opacity 0.4s ease-out 0.3s",
                          }),
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
                    ...(onCarouselPage
                        ? {
                              opacity: carouselPanel,
                              transform: `scale(${0.97 + 0.03 * carouselPanel})`,
                          }
                        : {
                              opacity: faded ? 1 : 0,
                              transform: faded ? "scale(1)" : "scale(0.97)",
                              transition:
                                  "opacity 0.35s ease 0.2s, transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.2s",
                          }),
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
            // Lets TutorialOverlay's own click-blocker (a capture-phase
            // window listener that stops propagation on anything
            // outside its hole) recognize this as a separate system
            // overlay and let clicks on it through, instead of
            // swallowing them before they ever reach this DOM subtree.
            data-system-overlay="true"
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
