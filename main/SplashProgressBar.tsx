import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

// A dressier take on the plain linear-fill bar in TutorialOverlay.tsx: a
// two-color gradient fill, a shimmer sheen sweeping across it, and a
// glowing dot riding the leading edge. All three are driven off one
// shared `progress` motion value (0→1) so the fill and the glow dot never
// drift apart, however the duration/delay/easing/loop controls are set.

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 220
 * @framerIntrinsicHeight 10
 */
export default function SplashProgressBar(props) {
    const {
        barColor,
        barColor2,
        trackColor,
        cornerRadius,
        duration,
        delay,
        easing,
        loop,
        loopPause,
        shimmer,
        glow,
        glowColor,
        glowSize,
        glowBlur,
    } = props

    const progress = useMotionValue(0)
    const fillWidth = useTransform(progress, [0, 1], ["0%", "100%"])
    const glowLeft = useTransform(progress, [0, 1], ["0%", "100%"])

    React.useEffect(() => {
        progress.set(0)
        const controls = animate(progress, 1, {
            duration,
            delay,
            ease: easing,
            repeat: loop ? Infinity : 0,
            repeatType: "loop",
            repeatDelay: loopPause,
        })
        return () => controls.stop()
    }, [progress, duration, delay, easing, loop, loopPause])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
            }}
        >
            {shimmer && (
                <style>{`
                    @keyframes splash-progress-bar-shimmer {
                        0% { transform: translateX(-120%); }
                        100% { transform: translateX(220%); }
                    }
                `}</style>
            )}
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: cornerRadius,
                    background: trackColor,
                    overflow: "hidden",
                }}
            >
                <motion.div
                    style={{
                        position: "relative",
                        height: "100%",
                        width: fillWidth,
                        background: `linear-gradient(90deg, ${barColor}, ${barColor2})`,
                        borderRadius: cornerRadius,
                        overflow: "hidden",
                    }}
                >
                    {shimmer && (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "40%",
                                background:
                                    "linear-gradient(75deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)",
                                animation:
                                    "splash-progress-bar-shimmer 1.6s linear infinite",
                            }}
                        />
                    )}
                </motion.div>
            </div>
            {/* Glowing dot riding the leading edge of the fill — sits outside
                the track's clipped wrapper above so its blur can bleed
                beyond the bar's own thin height. */}
            {glow && (
                <motion.div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: glowLeft,
                        width: glowSize,
                        height: glowSize,
                        borderRadius: "50%",
                        background: glowColor,
                        boxShadow: `0 0 ${glowBlur}px ${glowBlur / 2}px ${glowColor}`,
                        translateX: "-50%",
                        translateY: "-50%",
                    }}
                />
            )}
        </div>
    )
}

SplashProgressBar.defaultProps = {
    barColor: "#6C5CE7",
    barColor2: "#00E5FF",
    trackColor: "rgba(255,255,255,0.12)",
    cornerRadius: 999,
    duration: 2,
    delay: 0,
    easing: "linear",
    loop: false,
    loopPause: 0,
    shimmer: true,
    glow: true,
    glowColor: "#00E5FF",
    glowSize: 14,
    glowBlur: 18,
}

addPropertyControls(SplashProgressBar, {
    barColor: {
        type: ControlType.Color,
        title: "Bar Color",
        defaultValue: "#6C5CE7",
    },
    barColor2: {
        type: ControlType.Color,
        title: "Bar Color 2",
        defaultValue: "#00E5FF",
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track Color",
        defaultValue: "rgba(255,255,255,0.12)",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Corner Radius",
        defaultValue: 999,
        min: 0,
        max: 999,
        step: 1,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration (s)",
        defaultValue: 2,
        min: 0.1,
        max: 30,
        step: 0.1,
    },
    delay: {
        type: ControlType.Number,
        title: "Delay (s)",
        defaultValue: 0,
        min: 0,
        max: 30,
        step: 0.1,
    },
    easing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["linear", "easeIn", "easeOut", "easeInOut"],
        optionTitles: ["Linear", "Ease In", "Ease Out", "Ease In Out"],
        defaultValue: "linear",
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    loopPause: {
        type: ControlType.Number,
        title: "Loop Pause (s)",
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 0.1,
        hidden: (p) => !p.loop,
    },
    shimmer: {
        type: ControlType.Boolean,
        title: "Shimmer",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    glow: {
        type: ControlType.Boolean,
        title: "Glow Dot",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    glowColor: {
        type: ControlType.Color,
        title: "Glow Color",
        defaultValue: "#00E5FF",
        hidden: (p) => !p.glow,
    },
    glowSize: {
        type: ControlType.Number,
        title: "Glow Size",
        defaultValue: 14,
        min: 4,
        max: 60,
        step: 1,
        hidden: (p) => !p.glow,
    },
    glowBlur: {
        type: ControlType.Number,
        title: "Glow Blur",
        defaultValue: 18,
        min: 0,
        max: 80,
        step: 1,
        hidden: (p) => !p.glow,
    },
})
