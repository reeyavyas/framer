import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useReducedMotion } from "framer-motion"

// The "Tap anywhere to begin" icon for the ATM screen. It shows what a touch does, not a place to
// press: the whole screen is tappable. A light-teal circle squeezes like a fingertip pressing, an
// egg-yolk dot flashes inside it, and two egg-yolk rings burst out. Icon only: no background, no
// text (put text on top in Framer). The frame fits the circle exactly; the rings spill outside it,
// so set the frame's overflow to visible in Framer.

// Sizes in view units; the circle (with its line) fills the frame.
const CIRCLE_R = 26
const CIRCLE_STROKE = 2
const PRESS = 0.82 // how far the circle squeezes
const DOT_R = 15
const RING_START = 14
const RING_END = 80 // at Ripple Size 1: rings grow to about 3× the circle's size
const RING_STROKE = 3
const RING_GAP = 0.07 // second ring trails the first by this share of the loop
const SPRING = [0.32, 0.72, 0, 1] // press and release
const OUT = [0.22, 1, 0.36, 1] // fast start, long soft settle

type Props = {
    rippleSize: number
    loopSeconds: number
    circleColor: string
    rippleColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 120
 * @framerIntrinsicHeight 120
 */
export default function ATMTapIcon(props: Props) {
    const { rippleSize, loopSeconds, circleColor, rippleColor } = props
    const reduceMotion = useReducedMotion()
    const ringEnd = RING_END * rippleSize
    const half = CIRCLE_R + CIRCLE_STROKE / 2
    const loop = (delay = 0) => ({ duration: loopSeconds, delay: delay * loopSeconds, repeat: Infinity })

    const ring = (delay: number) => (
        <motion.circle
            r={RING_START}
            fill="none"
            style={{ stroke: rippleColor }}
            strokeWidth={RING_STROKE}
            initial={{ opacity: 0 }}
            animate={{ r: [RING_START, RING_START, ringEnd, ringEnd], opacity: [0, 0, 0.95, 0, 0] }}
            transition={{
                r: { ...loop(delay), times: [0, 0.24, 0.8, 1], ease: OUT },
                opacity: { ...loop(delay), times: [0, 0.24, 0.28, 0.8, 1], ease: OUT },
            }}
        />
    )

    return (
        <svg
            viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
            style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
            aria-hidden="true"
        >
            {reduceMotion ? (
                <>
                    <circle r={ringEnd * 0.6} fill="none" style={{ stroke: rippleColor }} strokeWidth={RING_STROKE} opacity={0.5} />
                    <circle r={CIRCLE_R} style={{ fill: circleColor, stroke: circleColor }} fillOpacity={0.12} strokeWidth={CIRCLE_STROKE} />
                    <circle r={DOT_R} style={{ fill: rippleColor }} />
                </>
            ) : (
                <>
                    {ring(0)}
                    {ring(RING_GAP)}
                    <motion.circle
                        r={CIRCLE_R}
                        style={{ fill: circleColor, stroke: circleColor }}
                        fillOpacity={0.12}
                        strokeWidth={CIRCLE_STROKE}
                        animate={{ r: [CIRCLE_R, CIRCLE_R, CIRCLE_R * PRESS, CIRCLE_R, CIRCLE_R] }}
                        transition={{ ...loop(), times: [0, 0.14, 0.22, 0.34, 1], ease: SPRING }}
                    />
                    <motion.circle
                        r={0}
                        style={{ fill: rippleColor }}
                        initial={{ opacity: 0 }}
                        animate={{ r: [0, 0, DOT_R, DOT_R * 1.1, DOT_R * 1.1], opacity: [0, 0, 1, 0, 0] }}
                        transition={{ ...loop(), times: [0, 0.16, 0.22, 0.6, 1], ease: OUT }}
                    />
                </>
            )}
        </svg>
    )
}

ATMTapIcon.defaultProps = {
    rippleSize: 1,
    loopSeconds: 2.8,
    circleColor: "#3bbfc0",
    rippleColor: "#ffcc40",
}

addPropertyControls(ATMTapIcon, {
    rippleSize: {
        type: ControlType.Number,
        title: "Ripple Size",
        min: 0.4,
        max: 2.5,
        step: 0.05,
        defaultValue: 1,
    },
    loopSeconds: {
        type: ControlType.Number,
        title: "Loop (s)",
        min: 1,
        max: 8,
        step: 0.1,
        unit: "s",
        defaultValue: 2.8,
    },
    circleColor: { type: ControlType.Color, title: "Circle", defaultValue: "#3bbfc0" },
    rippleColor: { type: ControlType.Color, title: "Ripple", defaultValue: "#ffcc40" },
})
