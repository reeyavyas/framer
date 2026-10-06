import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

// The ATM's idle "attract" screen. Drop it inside the ATM artwork, sized to
// the screen cutout. It loops slow drifting light streaks, a glass sheen
// sweep, rising sparkles, rotating headlines, and a pulsing "tap" hint.
// Tapping anywhere floods the screen with a ripple from the tap point,
// then navigates to "Tap link" (or fires "On Tap" if no link is set).
// With reduced motion on, the loops stop and the ripple becomes a fade.

type Tap = { x: number; y: number; r: number }

// Fixed per-index positions rather than Math.random(), so the server
// pre-render and the client's first paint place the sparkles identically.
const sparkleX = (i: number) => ((i * 0.618034) % 1) * 100
const sparkleSize = (i: number) => 3 + ((i * 7) % 5)

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 620
 * @framerIntrinsicHeight 520
 */
export default function ATMAttractScreen(props) {
    const {
        messages,
        messageInterval,
        cta,
        fontFamily,
        headlineSize,
        ctaSize,
        textColor,
        backgroundColor,
        backgroundColor2,
        accentColor,
        streaks,
        sheen,
        sheenInterval,
        sparkles,
        sparkleCount,
        transitionColor,
        transitionDuration,
        tapLink,
        onTap,
    } = props

    const reduceMotion = useReducedMotion()
    const animated = !reduceMotion
    const rootRef = React.useRef<HTMLDivElement>(null)
    const [msgIndex, setMsgIndex] = React.useState(0)
    const [tap, setTap] = React.useState<Tap | null>(null)

    const list = messages?.length ? messages : [""]

    React.useEffect(() => {
        if (list.length < 2 || tap) return
        const id = window.setInterval(
            () => setMsgIndex((i) => (i + 1) % list.length),
            messageInterval * 1000
        )
        return () => window.clearInterval(id)
    }, [list.length, messageInterval, tap])

    const start = (clientX?: number, clientY?: number) => {
        if (tap || !rootRef.current) return
        const rect = rootRef.current.getBoundingClientRect()
        const x = clientX === undefined ? rect.width / 2 : clientX - rect.left
        const y = clientY === undefined ? rect.height / 2 : clientY - rect.top
        // Radius to the farthest corner, so the circle covers the screen.
        const r = Math.hypot(
            Math.max(x, rect.width - x),
            Math.max(y, rect.height - y)
        )
        setTap({ x, y, r })

        window.setTimeout(() => {
            onTap?.()
            const onCanvas = RenderTarget.current() === RenderTarget.canvas
            if (tapLink && !onCanvas) window.location.href = tapLink
            // No navigation happened (canvas, or On Tap only): re-arm.
            else window.setTimeout(() => setTap(null), 600)
        }, transitionDuration * 1000)
    }

    const loop = (duration: number, delay = 0, repeatDelay = 0) =>
        animated
            ? {
                  duration,
                  delay,
                  repeatDelay,
                  repeat: Infinity,
                  ease: "easeInOut" as const,
              }
            : { duration: 0 }

    return (
        <div
            ref={rootRef}
            role="button"
            tabIndex={0}
            aria-label={cta}
            onPointerDown={(e) => start(e.clientX, e.clientY)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") start()
            }}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                cursor: "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                background: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor2} 100%)`,
                fontFamily,
                color: textColor,
            }}
        >
            {/* Diagonal light streaks, each drifting at its own pace. */}
            {streaks &&
                [0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        initial={false}
                        animate={animated ? { x: ["-8%", "8%", "-8%"] } : {}}
                        transition={loop(9 + i * 4, i * 1.5)}
                        style={{
                            position: "absolute",
                            top: "-50%",
                            left: `${10 + i * 30}%`,
                            width: `${14 + i * 6}%`,
                            height: "200%",
                            rotate: 25,
                            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                            opacity: 0.12 + i * 0.05,
                            filter: "blur(6px)",
                        }}
                    />
                ))}

            {/* Rising sparkles. */}
            {sparkles &&
                animated &&
                Array.from({ length: sparkleCount }, (_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: "110%", opacity: 0 }}
                        animate={{ y: "-10%", opacity: [0, 1, 1, 0] }}
                        transition={{
                            duration: 5 + (i % 4),
                            delay: (i * 0.7) % 6,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        style={{
                            position: "absolute",
                            left: `${sparkleX(i)}%`,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            style={{
                                width: sparkleSize(i),
                                height: sparkleSize(i),
                                borderRadius: "50%",
                                background: "#fff",
                                boxShadow: `0 0 ${sparkleSize(i) * 3}px ${accentColor}`,
                            }}
                        />
                    </motion.div>
                ))}

            {/* Glass sheen: a soft band sweeping across now and then. */}
            {sheen && animated && (
                <motion.div
                    initial={{ x: "-150%" }}
                    animate={{ x: "300%" }}
                    transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        repeatDelay: sheenInterval,
                        ease: "easeInOut",
                    }}
                    style={{
                        position: "absolute",
                        top: "-25%",
                        left: 0,
                        width: "35%",
                        height: "150%",
                        rotate: 20,
                        background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* Headline + tap hint. */}
            <motion.div
                animate={tap ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: headlineSize * 0.8,
                    padding: "8%",
                    textAlign: "center",
                }}
            >
                <div style={{ position: "relative", width: "100%", minHeight: headlineSize * 2.6 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={msgIndex}
                            initial={{ opacity: 0, y: animated ? 16 : 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: animated ? -16 : 0 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            style={{
                                fontSize: headlineSize,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                textShadow: `0 0 24px ${accentColor}`,
                            }}
                        >
                            {list[msgIndex % list.length]}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Finger dot with expanding rings. */}
                <div style={{ position: "relative", width: ctaSize * 1.6, height: ctaSize * 1.6 }}>
                    {animated &&
                        [0, 1].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0.6, opacity: 0.8 }}
                                animate={{ scale: 2.4, opacity: 0 }}
                                transition={{
                                    duration: 1.8,
                                    delay: i * 0.9,
                                    repeat: Infinity,
                                    ease: "easeOut",
                                }}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: `2px solid ${accentColor}`,
                                }}
                            />
                        ))}
                    <div
                        style={{
                            position: "absolute",
                            inset: "25%",
                            borderRadius: "50%",
                            background: textColor,
                            boxShadow: `0 0 16px ${accentColor}`,
                        }}
                    />
                </div>

                <motion.div
                    animate={animated ? { opacity: [1, 0.55, 1] } : {}}
                    transition={loop(2)}
                    style={{
                        fontSize: ctaSize,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                    }}
                >
                    {cta}
                </motion.div>
            </motion.div>

            {/* Tap transition: a circle flooding out from the tap point. */}
            {tap && (
                <motion.div
                    initial={animated ? { scale: 0 } : { opacity: 0 }}
                    animate={animated ? { scale: 1 } : { opacity: 1 }}
                    transition={{
                        duration: transitionDuration,
                        ease: [0.65, 0, 0.35, 1],
                    }}
                    style={{
                        position: "absolute",
                        left: tap.x - tap.r,
                        top: tap.y - tap.r,
                        width: tap.r * 2,
                        height: tap.r * 2,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${transitionColor} 60%, ${accentColor} 100%)`,
                        boxShadow: `0 0 60px 20px ${accentColor}`,
                        pointerEvents: "none",
                    }}
                />
            )}
        </div>
    )
}

addPropertyControls(ATMAttractScreen, {
    messages: {
        type: ControlType.Array,
        title: "Headlines",
        control: { type: ControlType.String },
        defaultValue: [
            "Ready to learn the ATM?",
            "Grab cash like a pro 💸",
            "Learn smart money moves 🧠",
        ],
    },
    messageInterval: {
        type: ControlType.Number,
        title: "Headline Every (s)",
        defaultValue: 3.5,
        min: 1,
        max: 20,
        step: 0.5,
    },
    cta: {
        type: ControlType.String,
        title: "Tap Text",
        defaultValue: "Tap anywhere to begin",
    },
    fontFamily: {
        type: ControlType.String,
        title: "Font",
        defaultValue: "Inter, sans-serif",
    },
    headlineSize: {
        type: ControlType.Number,
        title: "Headline Size",
        defaultValue: 44,
        min: 12,
        max: 160,
        step: 1,
    },
    ctaSize: {
        type: ControlType.Number,
        title: "Tap Text Size",
        defaultValue: 26,
        min: 10,
        max: 100,
        step: 1,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#FFFFFF",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#0A3A66",
    },
    backgroundColor2: {
        type: ControlType.Color,
        title: "Background 2",
        defaultValue: "#021A33",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Glow",
        defaultValue: "#3FD0FF",
    },
    streaks: {
        type: ControlType.Boolean,
        title: "Light Streaks",
        defaultValue: true,
    },
    sheen: {
        type: ControlType.Boolean,
        title: "Glass Sheen",
        defaultValue: true,
    },
    sheenInterval: {
        type: ControlType.Number,
        title: "Sheen Every (s)",
        defaultValue: 4,
        min: 0.5,
        max: 20,
        step: 0.5,
        hidden: (p) => !p.sheen,
    },
    sparkles: {
        type: ControlType.Boolean,
        title: "Sparkles",
        defaultValue: true,
    },
    sparkleCount: {
        type: ControlType.Number,
        title: "Sparkle Count",
        defaultValue: 14,
        min: 1,
        max: 40,
        step: 1,
        hidden: (p) => !p.sparkles,
    },
    transitionColor: {
        type: ControlType.Color,
        title: "Tap Fill",
        defaultValue: "#FFFFFF",
    },
    transitionDuration: {
        type: ControlType.Number,
        title: "Tap Duration (s)",
        defaultValue: 0.8,
        min: 0.1,
        max: 3,
        step: 0.1,
    },
    tapLink: {
        type: ControlType.Link,
        title: "Tap Link",
    },
    onTap: {
        type: ControlType.EventHandler,
    },
})
