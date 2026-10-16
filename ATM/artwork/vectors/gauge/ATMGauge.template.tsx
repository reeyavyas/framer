import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// The lesson card's gauge: five chunky glossy segments (orange, egg yolk, mint, light teal, sky, left to
// right) with a light-blue needle, looping in place. The needle swings from the left end across to the right
// with a springy overshoot and settle, holds, then eases back to the left; its soft shadow turns with it.
// Each segment gives a small pop as the needle passes it, and a white glint slides across the segments'
// highlights once per loop. The pivot stays still. No background of its own: place it on the teal glass card.
//
// The artwork is redrawn as clean vector (ATM/artwork/vectors/gauge/build.py, export_anim): each moving part
// sits in its own data-k group. The motion is one GSAP timeline that repeats forever (transforms and opacity
// only, nothing random), so every pass is identical and the loop is seamless. Reduced motion shows the drawing
// at rest, the needle on egg yolk. No blur, filters or CSS transitions (black rectangle over the carousel on
// Windows).

const VIEWBOX = "-1242 -1092 2484 1378" // the arch's centre and the needle's pivot are at (0, 0)
// prettier-ignore
const ART = `__ART__`

const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
// Needle angles, as GSAP rotation (0 = straight up, negative = left). The art rests at -29 (on egg yolk).
const LEFT = -76
const RIGHT = 74
const SWEEP_AT = 0.3 // the needle leaves the left end here (s)...
const SWEEP = 1.7 // ...and swings across in this long, springing past the end and settling
const SWEEP_EASE = "back.out(1.5)"
const RETURN_AT = 3.1 // then it holds until here and eases back to the left
const RETURN = 1.4
// Segments: centre angles 162, 126, 90, 54, 18 degrees (from +x); each pops about its own centre (mid radius
// 750, half its side face's depth of 84 below the front) as the needle passes it.
const SEGMENTS = [0, 1, 2, 3, 4].map((i) => {
    const deg = 162 - 36 * i
    const a = (deg * Math.PI) / 180
    return { k: `seg${i}`, glint: `glint${i}`, rotation: 90 - deg, origin: `${Math.round(750 * Math.cos(a))} ${Math.round(-750 * Math.sin(a) + 42)}` }
})
const GLINT_AT = 2.1 // the glint starts on the left segment and slides right, one segment every 0.12 s

// When the swing (with its ease) first reaches a rotation, so each pop lands as the needle passes.
function passTime(rotation: number) {
    const ease = gsap.parseEase(SWEEP_EASE)
    const target = (rotation - LEFT) / (RIGHT - LEFT)
    for (let i = 1; i <= 400; i++) if (ease(i / 400) >= target) return SWEEP_AT + (SWEEP * i) / 400
    return SWEEP_AT + SWEEP
}

// The whole loop as ONE GSAP timeline (repeat: -1). Every tween is transform or opacity, every value it
// moves ends where it started, and nothing is random, so each pass is identical and the loop is seamless.
function buildLoop(svg: SVGSVGElement) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.out" } })
    tl.set({}, {}, LOOP) // pins the timeline's length to the loop, rest included
    // the needle and its shadow turn together about the pivot (both groups have the pivot at their own 0,0)
    for (const k of ["needle", "needle-shadow"]) {
        const el = q(k)
        if (!el) continue
        tl.fromTo(el, { svgOrigin: "0 0", rotation: LEFT }, { rotation: RIGHT, duration: SWEEP, ease: SWEEP_EASE, immediateRender: true }, SWEEP_AT)
            .to(el, { rotation: LEFT, duration: RETURN, ease: "power2.inOut" }, RETURN_AT)
    }
    SEGMENTS.forEach((seg, i) => {
        const el = q(seg.k)
        if (el) {
            const at = passTime(seg.rotation)
            tl.fromTo(el, { svgOrigin: seg.origin, scale: 1 }, { scale: 1.04, duration: 0.12, ease: "power2.out", immediateRender: false }, at)
                .to(el, { scale: 1, duration: 0.34, ease: "sine.inOut" }, at + 0.12)
        }
        const glint = q(seg.glint)
        if (glint) {
            const at = GLINT_AT + 0.12 * i
            tl.fromTo(glint, { opacity: 0 }, { opacity: 0.85, duration: 0.22, ease: "sine.inOut", immediateRender: false }, at)
                .to(glint, { opacity: 0, duration: 0.32, ease: "sine.inOut" }, at + 0.22)
        }
    })
    return tl
}

type Props = { loopSeconds: number }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 614
 * @framerIntrinsicHeight 400
 */
export default function ATMGauge(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two gauges on one page never share gradients or clip paths
    const uid = "g" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(() => ART.replace(/id="/g, `id="${uid}-`).replace(/url\(#/g, `url(#${uid}-`), [uid])
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing as it rests, the needle on egg yolk
        const ctx = gsap.context(() => {
            const tl = buildLoop(svg)
            tlRef.current = tl
        }, svg)
        return () => {
            ctx.revert()
            tlRef.current = null
        }
    }, [reduceMotion, markup])

    // Loop (s) only changes the speed, so changing it never restarts the loop.
    React.useEffect(() => {
        tlRef.current?.timeScale(LOOP / Math.max(1, props.loopSeconds))
    }, [props.loopSeconds, reduceMotion, markup])

    return (
        <svg
            ref={svgRef}
            viewBox={VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", overflow: "hidden" }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    )
}

ATMGauge.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMGauge, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
