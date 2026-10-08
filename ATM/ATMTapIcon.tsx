import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"

// The "Tap anywhere to begin" icon for the ATM screen (option X: "B + P"). The designer's hand
// (white line, navy fill) presses into a light-teal circle at the index fingertip: the circle
// squeezes, an egg-yolk dot flashes, and two egg-yolk rings spread a short way, hold, then fade
// together. It shows what a touch does, not a target: the whole screen is tappable. Icon only:
// no background, no text. The frame fits the hand exactly and the hand is centred in it; the
// circle and rings draw outside it, so set the frame's overflow to visible in Framer.

// The designer's hand SVG (drawn on a 1788×2500 canvas).
const HAND =
    "M1457.5,1115v453.2c0,221.9-190.7,424.6-441.5,424.6s-319.5-119.2-408.6-242.6c-83.9-116.1-259.7-388.9-259.7-388.9-31.4-46.5-18.4-111.9,27.8-144.7l3.8-2.7c7-4.6,36.4-23.1,76.6-17.5,40.7,5.7,64.1,32.2,69.4,38.6,42.9,51.4,85.9,102.8,128.8,154.3v-781.8c0-55.5,45-100.4,100.4-100.4s100.4,39.3,100.4,100.4v600.4-279c0-67.4,58-89.9,100.4-89.9s100.4,40.8,100.4,100.4v268.3-190.3c0-48.6,28.5-90.5,100.4-90.5s100.4,43.3,100.4,100.4v180.2c0-24.8,0-92.3,0-92.3,0-72.9,36.2-100.4,100.4-100.4s100.4,29.7,100.4,100.4h.2Z"
const HAND_STROKE = 63.8
const HAND_BOX = [298.6, 475.2, 1489.4, 2024.7] // the hand's outline incl. stroke: x0, y0, x1, y1
const [TX, TY] = [754.5, 600] // inside the index fingertip: the circle and rings centre here

// Sizes in hand units (the hand is about 1190 wide).
const PRESS = 0.92 // how far the hand shrinks toward the fingertip as it presses in
const CIRCLE_R = 260
const CIRCLE_SQUEEZE = 213 // circle radius at the moment of the tap
const CIRCLE_STROKE = 30
const DOT_R = 150
// Two rings start at the circle's edge, spread to `end` (at Ripple Size 1), hold, then fade.
const RINGS = [
    { start: 0.3, end: 620, width: 40, peak: 0.95 },
    { start: 0.36, end: 440, width: 30, peak: 0.6 },
]
const FADE = [0.7, 0.92] // both rings fade out together over this share of the loop
const STILL = 0.5 // the moment shown under reduced motion: circle, both rings and the hand at rest

// cubic-bezier(x1, y1, x2, y2) as a function of 0..1
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const at = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
    return (x: number) => {
        let lo = 0
        let hi = 1
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2
            if (at(mid, x1, x2) < x) lo = mid
            else hi = mid
        }
        return at((lo + hi) / 2, y1, y2)
    }
}
const SPRING = bezier(0.32, 0.72, 0, 1) // press and release
const OUT = bezier(0.22, 1, 0.36, 1) // fast start, long soft settle

// Value at time t (0..1 of the loop) from [time, value] keys, eased between each pair.
function track(keys: number[][], t: number, ease = SPRING) {
    for (let i = 1; i < keys.length; i++) {
        const [t0, v0] = keys[i - 1]
        const [t1, v1] = keys[i]
        if (t <= t1) return v0 + (v1 - v0) * ease(t1 > t0 ? (t - t0) / (t1 - t0) : 1)
    }
    return keys[keys.length - 1][1]
}

// Everything that moves, at time t (0..1). Every track starts and ends on the same value, so the
// last frame equals the first and the loop is seamless.
export function frameAt(t: number, rippleSize: number) {
    const s = track([[0, 1], [0.22, 1], [0.3, PRESS], [0.4, 1], [1, 1]], t)
    return {
        hand: `translate(${TX} ${TY}) scale(${s.toFixed(4)}) translate(${-TX} ${-TY})`,
        circleR: track([[0, CIRCLE_R], [0.22, CIRCLE_R], [0.3, CIRCLE_SQUEEZE], [0.42, CIRCLE_R], [1, CIRCLE_R]], t),
        dotR: track([[0, 0], [0.24, 0], [0.3, DOT_R], [0.68, DOT_R * 1.1], [0.7, 0], [1, 0]], t),
        dotOpacity: track([[0, 0], [0.24, 0], [0.3, 1], [0.68, 0], [1, 0]], t),
        rings: RINGS.map((ring) => {
            const end = CIRCLE_R + (ring.end - CIRCLE_R) * rippleSize
            return {
                // back to the circle's edge only once faded out, so the loop ends where it starts
                r: track([[0, CIRCLE_R], [ring.start, CIRCLE_R], [ring.start + 0.25, end], [FADE[1], end], [1, CIRCLE_R]], t, OUT),
                opacity: track([[0, 0], [ring.start, 0], [ring.start + 0.04, ring.peak], [FADE[0], ring.peak], [FADE[1], 0], [1, 0]], t),
            }
        }),
    }
}

type Props = {
    rippleSize: number
    loopSeconds: number
    handColor: string
    handFill: string
    circleColor: string
    rippleColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 260
 */
export default function ATMTapIcon(props: Props) {
    const { rippleSize, loopSeconds, handColor, handFill, circleColor, rippleColor } = props
    const reduceMotion = useReducedMotion()
    const first = frameAt(STILL, rippleSize)

    const handRef = React.useRef<SVGGElement | null>(null)
    const circleRef = React.useRef<SVGCircleElement | null>(null)
    const dotRef = React.useRef<SVGCircleElement | null>(null)
    const ringRefs = React.useRef<(SVGCircleElement | null)[]>([])

    // The loop reads the latest settings each frame, so changing a property never restarts it.
    const live = React.useRef({ rippleSize, loopSeconds })
    live.current = { rippleSize, loopSeconds }

    React.useEffect(() => {
        const apply = (t: number) => {
            const f = frameAt(t, live.current.rippleSize)
            handRef.current?.setAttribute("transform", f.hand)
            circleRef.current?.setAttribute("r", f.circleR.toFixed(2))
            dotRef.current?.setAttribute("r", f.dotR.toFixed(2))
            dotRef.current?.setAttribute("opacity", f.dotOpacity.toFixed(3))
            ringRefs.current.forEach((c, i) => {
                c?.setAttribute("r", f.rings[i].r.toFixed(2))
                c?.setAttribute("opacity", f.rings[i].opacity.toFixed(3))
            })
        }
        if (reduceMotion) {
            apply(STILL)
            return
        }
        let t = 0
        let last = performance.now()
        let raf = 0
        const tick = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000)
            last = now
            t = (t + dt / Math.max(0.5, live.current.loopSeconds)) % 1
            apply(t)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [reduceMotion])

    const [x0, y0, x1, y1] = HAND_BOX
    return (
        <svg
            viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
            aria-hidden="true"
        >
            {RINGS.map((ring, i) => (
                <circle
                    key={i}
                    ref={(el) => {
                        ringRefs.current[i] = el
                    }}
                    cx={TX}
                    cy={TY}
                    r={first.rings[i].r}
                    opacity={first.rings[i].opacity}
                    fill="none"
                    style={{ stroke: rippleColor }}
                    strokeWidth={ring.width}
                />
            ))}
            <circle
                ref={circleRef}
                cx={TX}
                cy={TY}
                r={first.circleR}
                style={{ fill: circleColor, stroke: circleColor }}
                fillOpacity={0.12}
                strokeWidth={CIRCLE_STROKE}
            />
            <circle ref={dotRef} cx={TX} cy={TY} r={first.dotR} opacity={first.dotOpacity} style={{ fill: rippleColor }} />
            <g ref={handRef} transform={first.hand}>
                <path d={HAND} style={{ fill: handFill, stroke: handColor }} strokeWidth={HAND_STROKE} strokeLinejoin="round" />
            </g>
        </svg>
    )
}

ATMTapIcon.defaultProps = {
    rippleSize: 1,
    loopSeconds: 2.8,
    handColor: "#ffffff",
    handFill: "#002c44",
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
    handColor: { type: ControlType.Color, title: "Hand", defaultValue: "#ffffff" },
    handFill: { type: ControlType.Color, title: "Hand Fill", defaultValue: "#002c44" },
    circleColor: { type: ControlType.Color, title: "Circle", defaultValue: "#3bbfc0" },
    rippleColor: { type: ControlType.Color, title: "Ripple", defaultValue: "#ffcc40" },
})
