import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"

// Same linear-fill idiom as the progress bar in TutorialOverlay.tsx, pulled
// out as its own layer so it can be dropped onto any frame (e.g. the splash
// variant of LockScreen) and resized/positioned independently, with its own
// duration/delay/loop controls rather than being driven by another
// component's timer.

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 6
 */
export default function ProgressBar(props) {
    const {
        barColor,
        trackColor,
        cornerRadius,
        duration,
        delay,
        easing,
        loop,
        loopPause,
    } = props

    // Remounting restarts the fill at 0% — useful while tuning controls on
    // canvas, and harmless in production since the component itself only
    // ever mounts once per page load.
    const key = `${duration}-${delay}-${easing}-${loop}-${loopPause}`

    return (
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
                key={key}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                    duration,
                    delay,
                    ease: easing,
                    repeat: loop ? Infinity : 0,
                    repeatType: "loop",
                    repeatDelay: loopPause,
                }}
                style={{
                    height: "100%",
                    background: barColor,
                    borderRadius: cornerRadius,
                }}
            />
        </div>
    )
}

ProgressBar.defaultProps = {
    barColor: "#FFFFFF",
    trackColor: "rgba(255,255,255,0.25)",
    cornerRadius: 999,
    duration: 2,
    delay: 0,
    easing: "linear",
    loop: false,
    loopPause: 0,
}

addPropertyControls(ProgressBar, {
    barColor: {
        type: ControlType.Color,
        title: "Bar Color",
        defaultValue: "#FFFFFF",
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track Color",
        defaultValue: "rgba(255,255,255,0.25)",
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
})
