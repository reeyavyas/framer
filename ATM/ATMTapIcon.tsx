import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useReducedMotion } from "framer-motion"

// The "Tap anywhere to begin" icon for the ATM screen: the designer's outline hand, held still, with
// a soft glow at the index fingertip that breathes and sends out two egg-yolk rings. Icon only: no
// background, no text. The view is cropped tight to the hand and the ripple's largest ring, so the
// icon has no padding around it.

// The designer's hand SVG (drawn on a 1788×2500 canvas).
const HAND =
    "M1457.5,1115v453.2c0,221.9-190.7,424.6-441.5,424.6s-319.5-119.2-408.6-242.6c-83.9-116.1-259.7-388.9-259.7-388.9-31.4-46.5-18.4-111.9,27.8-144.7l3.8-2.7c7-4.6,36.4-23.1,76.6-17.5,40.7,5.7,64.1,32.2,69.4,38.6,42.9,51.4,85.9,102.8,128.8,154.3v-781.8c0-55.5,45-100.4,100.4-100.4s100.4,39.3,100.4,100.4v600.4-279c0-67.4,58-89.9,100.4-89.9s100.4,40.8,100.4,100.4v268.3-190.3c0-48.6,28.5-90.5,100.4-90.5s100.4,43.3,100.4,100.4v180.2c0-24.8,0-92.3,0-92.3,0-72.9,36.2-100.4,100.4-100.4s100.4,29.7,100.4,100.4h.2Z"
const HAND_STROKE = 63.8
const HAND_BOX = [298.6, 475.2, 1489.4, 2024.7] // the hand's outline incl. stroke: x0, y0, x1, y1
const TIP = [754.5, 600] // inside the index fingertip, where the ripple starts
const RING_START = 160 // ring radius when it appears
const RING_STROKE = 45
const RING_GAP = 0.125 // second ring trails the first by this share of the loop
const GLOW_R = 230

type Props = {
    rippleSize: number
    loopSeconds: number
    handColor: string
    rippleColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 332
 */
export default function ATMTapIcon(props: Props) {
    const { rippleSize, loopSeconds, handColor, rippleColor } = props
    const reduceMotion = useReducedMotion()

    // Ring end radius in hand units: 1 = the ring grows to about 1.5× the hand's height across.
    const ringEnd = 1150 * rippleSize
    // Tight box around the hand and the largest ring (outer edge of its stroke): no padding.
    const reach = ringEnd + RING_STROKE / 2
    const x0 = Math.min(HAND_BOX[0], TIP[0] - reach)
    const y0 = Math.min(HAND_BOX[1], TIP[1] - reach)
    const x1 = Math.max(HAND_BOX[2], TIP[0] + reach)
    const y1 = Math.max(HAND_BOX[3], TIP[1] + reach)
    const viewBox = `${x0} ${y0} ${x1 - x0} ${y1 - y0}`

    const ring = (delay: number) => {
        const loop = { duration: loopSeconds, delay: delay * loopSeconds, repeat: Infinity }
        return (
        <motion.circle
            cx={TIP[0]}
            cy={TIP[1]}
            r={RING_START}
            fill="none"
            style={{ stroke: rippleColor }}
            strokeWidth={RING_STROKE}
            initial={{ opacity: 0 }}
            animate={{ r: [RING_START, RING_START, ringEnd], opacity: [0, 0, 0.95, 0] }}
            transition={{
                r: { ...loop, times: [0, 0.35, 1], ease: "easeOut" },
                opacity: { ...loop, times: [0, 0.35, 0.45, 1], ease: "easeOut" },
            }}
        />
        )
    }

    return (
        <svg viewBox={viewBox} style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }} aria-hidden="true">
            {reduceMotion ? (
                <circle cx={TIP[0]} cy={TIP[1]} r={GLOW_R} style={{ fill: rippleColor }} opacity={0.3} />
            ) : (
                <>
                    <motion.circle
                        cx={TIP[0]}
                        cy={TIP[1]}
                        r={GLOW_R * 0.7}
                        style={{ fill: rippleColor }}
                        animate={{ r: [GLOW_R * 0.7, GLOW_R * 1.15, GLOW_R * 0.7], opacity: [0.15, 0.45, 0.15] }}
                        transition={{ duration: loopSeconds, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {ring(0)}
                    {ring(RING_GAP)}
                </>
            )}
            <path d={HAND} fill="none" style={{ stroke: handColor }} strokeWidth={HAND_STROKE} strokeLinejoin="round" />
        </svg>
    )
}

ATMTapIcon.defaultProps = {
    rippleSize: 1,
    loopSeconds: 2.8,
    handColor: "#ffffff",
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
    handColor: { type: ControlType.Color, title: "Hand", defaultValue: "#ffffff" },
    rippleColor: { type: ControlType.Color, title: "Ripple", defaultValue: "#ffcc40" },
})
