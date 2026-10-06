import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useReducedMotion } from "framer-motion"

// A hand-free "Tap anywhere to begin" icon for the ATM screen ("Target press"): a light-teal touch
// target squeezes like a button, an egg-yolk dot flashes inside it, and two egg-yolk rings burst
// out. Icon only: no background, no text (put text on top in Framer). The frame fits the target
// circle exactly; the rings spill outside it, so set the frame's overflow to visible in Framer.

// Sizes in view units; the target circle (with its line) fills the frame.
const TARGET_R = 26
const TARGET_STROKE = 2
const PRESS = 0.82 // how far the target squeezes
const DOT_R = 15
const RING_START = 14
const RING_END = 80 // at Ripple Size 1: rings grow to about 3× the target's size
const RING_STROKE = 3
const RING_GAP = 0.07 // second ring trails the first by this share of the loop
const SPRING = [0.32, 0.72, 0, 1] // press and release
const OUT = [0.22, 1, 0.36, 1] // fast start, long soft settle

type Props = {
    rippleSize: number
    loopSeconds: number
    targetColor: string
    rippleColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 120
 * @framerIntrinsicHeight 120
 */
export default function ATMTapTarget(props: Props) {
    const { rippleSize, loopSeconds, targetColor, rippleColor } = props
    const reduceMotion = useReducedMotion()
    const ringEnd = RING_END * rippleSize
    const half = TARGET_R + TARGET_STROKE / 2
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
                    <circle r={TARGET_R} style={{ fill: targetColor, stroke: targetColor }} fillOpacity={0.12} strokeWidth={TARGET_STROKE} />
                    <circle r={DOT_R} style={{ fill: rippleColor }} />
                </>
            ) : (
                <>
                    {ring(0)}
                    {ring(RING_GAP)}
                    <motion.circle
                        r={TARGET_R}
                        style={{ fill: targetColor, stroke: targetColor }}
                        fillOpacity={0.12}
                        strokeWidth={TARGET_STROKE}
                        animate={{ r: [TARGET_R, TARGET_R, TARGET_R * PRESS, TARGET_R, TARGET_R] }}
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

ATMTapTarget.defaultProps = {
    rippleSize: 1,
    loopSeconds: 2.8,
    targetColor: "#3bbfc0",
    rippleColor: "#ffcc40",
}

addPropertyControls(ATMTapTarget, {
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
    targetColor: { type: ControlType.Color, title: "Target", defaultValue: "#3bbfc0" },
    rippleColor: { type: ControlType.Color, title: "Ripple", defaultValue: "#ffcc40" },
})
