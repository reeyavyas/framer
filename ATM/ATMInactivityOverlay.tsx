import * as React from "react"
import ReactDOM from "react-dom"
import { RenderTarget } from "framer"

// The ATM's copy of main/AppInactivityOverlay.tsx: same timer, countdown and
// system-overlay signal, but it returns to the ATM's start (/atm), uses the
// ATM's fonts (never Inter) and a white card on the ATM's blue pages.
//
// Edit these two values directly — they're shared by every instance.
const INACTIVITY_MINUTES = 3
const COUNTDOWN_SECONDS = 30
const HOME_PATH = "/atm"

// The fade-in is stepped frame by frame from JS on every page, with no CSS
// transitions and no backdrop blur. On Windows Chrome/Edge either one over
// the CurvedCarouselV2 flip cards (on /atm-start, as on /tutorials) paints a
// stray black rectangle on the centred card; see main/NOTES.md.
const DIM_MS = 700
const PANEL_DELAY_MS = 250
const PANEL_MS = 600

const NAVY = "#002c44"
const TEAL = "#059390"
const MIDNIGHT = "#11232d"

function fadeProgress(elapsedMs: number, delayMs: number, durationMs: number) {
    return Math.min(1, Math.max(0, (elapsedMs - delayMs) / durationMs))
}
const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

const pillStyle: React.CSSProperties = {
    fontFamily: '"Area Normal Bold", sans-serif',
    fontWeight: 700,
    fontSize: 36,
    lineHeight: 1.2,
    borderRadius: 50,
    padding: "24px 48px",
    cursor: "pointer",
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
export default function ATMInactivityOverlay() {
    const [isVisible, setIsVisible] = React.useState(false)
    const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
    // Milliseconds since the overlay opened, advanced every frame while the
    // fade-in runs.
    const [fadeMs, setFadeMs] = React.useState(0)

    // On the Framer canvas: no timers or listeners, and a static,
    // non-portaled preview so Framer's "Visible" toggle has content to hide.
    const isCanvas =
        typeof window !== "undefined" &&
        RenderTarget.current() === RenderTarget.canvas

    const isVisibleRef = React.useRef(false)
    React.useEffect(() => {
        isVisibleRef.current = isVisible
    }, [isVisible])

    const inactivityTimeoutRef = React.useRef<number | null>(null)

    const clearInactivityTimeout = React.useCallback(() => {
        if (inactivityTimeoutRef.current !== null) {
            window.clearTimeout(inactivityTimeoutRef.current)
            inactivityTimeoutRef.current = null
        }
    }, [])

    const goHome = React.useCallback(() => {
        window.location.href = HOME_PATH
    }, [])

    const startInactivityTimer = React.useCallback(() => {
        clearInactivityTimeout()
        inactivityTimeoutRef.current = window.setTimeout(() => {
            setFadeMs(0)
            setCountdown(COUNTDOWN_SECONDS)
            setIsVisible(true)
        }, INACTIVITY_MINUTES * 60 * 1000)
    }, [clearInactivityTimeout])

    // Only "Yes, I'm Here" closes it; ambient movement while it's open is
    // ignored.
    const closeOverlay = React.useCallback(() => {
        setIsVisible(false)
        setCountdown(COUNTDOWN_SECONDS)
        startInactivityTimer()
    }, [startInactivityTimer])

    // Activity while hidden just delays the next time it appears.
    React.useEffect(() => {
        if (isCanvas) return

        const onActivity = () => {
            if (!isVisibleRef.current) startInactivityTimer()
        }

        const events = ["pointermove", "pointerdown", "touchstart", "keydown"]
        for (const e of events) document.addEventListener(e, onActivity, true)

        startInactivityTimer()

        return () => {
            for (const e of events) {
                document.removeEventListener(e, onActivity, true)
            }
            clearInactivityTimeout()
        }
    }, [isCanvas, startInactivityTimer, clearInactivityTimeout])

    // While visible: run the countdown.
    React.useEffect(() => {
        if (isCanvas || !isVisible) return
        const countdownInterval = window.setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => window.clearInterval(countdownInterval)
    }, [isCanvas, isVisible])

    // While visible: step the fade-in every frame.
    React.useEffect(() => {
        if (isCanvas || !isVisible) return
        const totalMs = Math.max(DIM_MS, PANEL_DELAY_MS + PANEL_MS)
        const start = performance.now()
        let frame = 0
        const tick = (now: number) => {
            const elapsed = now - start
            setFadeMs(elapsed)
            if (elapsed < totalMs) frame = window.requestAnimationFrame(tick)
        }
        frame = window.requestAnimationFrame(tick)
        return () => window.cancelAnimationFrame(frame)
    }, [isCanvas, isVisible])

    // Countdown hit 0 while visible -> go home automatically.
    React.useEffect(() => {
        if (isCanvas) return
        if (isVisible && countdown <= 0) goHome()
    }, [isCanvas, countdown, isVisible, goHome])

    // Announce open/closed to the page (window flag + event, as in
    // AppInactivityOverlay) so CurvedCarouselV2 holds its autoplay while
    // this is up.
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

    // On canvas there's no fade; show it fully.
    const dim = isCanvas ? 1 : easeInOut(fadeProgress(fadeMs, 0, DIM_MS))
    const panel = isCanvas
        ? 1
        : easeOut(fadeProgress(fadeMs, PANEL_DELAY_MS, PANEL_MS))

    const overlayFrame = (
        <div
            // Lets TutorialOverlay's click-blocker let clicks on this through.
            data-system-overlay={isCanvas ? undefined : "true"}
            style={{
                ...(isCanvas
                    ? { position: "relative", width: "100%", height: "100%" }
                    : {
                          position: "fixed",
                          top: 0,
                          left: 0,
                          width: "100vw",
                          height: "100vh",
                          zIndex: 99999,
                      }),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `rgba(0,0,0,${0.35 * dim})`,
                }}
            />

            <div
                style={{
                    position: "relative",
                    background: "#ffffff",
                    boxSizing: "border-box",
                    width: 960,
                    padding: 60,
                    borderRadius: 50,
                    boxShadow: "0 2px 3px rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 80,
                    opacity: panel,
                    transform: `scale(${0.97 + 0.03 * panel})`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 30,
                    }}
                >
                    <div
                        style={{
                            fontFamily: '"P22 Mackinac Bold", serif',
                            fontWeight: 700,
                            fontSize: 72,
                            lineHeight: 1.2,
                            color: NAVY,
                        }}
                    >
                        Are you still there?
                    </div>
                    <div
                        style={{
                            fontFamily: '"Area Normal Regular", sans-serif',
                            fontSize: 38,
                            lineHeight: 1.4,
                            letterSpacing: 1,
                            color: MIDNIGHT,
                        }}
                    >
                        The ATM will return home in {countdown} seconds.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 30,
                    }}
                >
                    <button
                        onClick={isCanvas ? undefined : goHome}
                        style={{
                            ...pillStyle,
                            background: "none",
                            border: `3px solid ${NAVY}`,
                            color: NAVY,
                        }}
                    >
                        Return Home
                    </button>
                    <button
                        onClick={isCanvas ? undefined : closeOverlay}
                        style={{
                            ...pillStyle,
                            background: TEAL,
                            border: `3px solid ${TEAL}`,
                            color: "#ffffff",
                        }}
                    >
                        Yes, I'm Here
                    </button>
                </div>
            </div>
        </div>
    )

    if (isCanvas) return overlayFrame
    if (!isVisible) return null
    return ReactDOM.createPortal(overlayFrame, document.body)
}
