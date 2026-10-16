import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// A lesson card's illustration: a glossy 3D browser window with a magnifier, looping in place. The magnifier
// scans the page: it starts over the upper lines, drifts down and settles over the egg-yolk "hit" line, where
// it pops a little while the line glows, then glides back to the start. Its shadow moves with it. The three
// dots in the top bar twinkle one after another. No background of its own: place it on the teal glass card.
//
// The artwork is the designer's pick (Glossy 3D A with B's magnifier), drawn by
// ATM/artwork/vectors/browser-search/build.py (export_anim), which also writes this file from its template.
// The motion is one GSAP timeline that repeats forever (transforms and opacity only, nothing random), so every
// pass is identical and the loop is seamless. Reduced motion shows the drawing at rest. No blur, filters or
// CSS transitions (black rectangle over the carousel on Windows). The glass is see-through, so the lines
// behind it stay right wherever the lens moves.

const VIEWBOX = "__VIEWBOX__" // room for the magnifier at every pose of the scan
// prettier-ignore
const ART = `__ART__`

const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
// The scan: [time (s), x, y offset from the drawing's rest pose, ground-shadow opacity]. The last pose is the
// first, so the loop is seamless. The ground shadow shows only while the handle is off the window.
const POSES: [number, number, number, number][] = [__POSES__]
const SETTLE = 2.0 // the lens arrives over the hit line...
const ORIGIN = "__ORIGIN__" // ...and pops about its centre
const POP = __POP__
const DOTS = [__DOTS__] // the top-bar dots' centres
const TWINKLE_AT = [0.35, 2.75] // each dot twinkles twice a loop, one after another

function buildLoop(svg: SVGSVGElement) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ repeat: -1 })
    tl.set({}, {}, LOOP) // pins the timeline's length to the loop
    // the magnifier and its shadow on the screen move as one; so does its shadow on the card
    const mag = [q("mag"), q("magShadow")].filter((el): el is Element => !!el)
    const ground = q("magGround")
    const movers = ground ? [...mag, ground] : mag
    const [, x0, y0, g0] = POSES[0]
    tl.set(movers, { x: x0, y: y0 }, 0)
    if (ground) tl.set(ground, { opacity: g0 }, 0)
    for (let i = 1; i < POSES.length; i++) {
        const [t, x, y, g] = POSES[i]
        const t0 = POSES[i - 1][0]
        tl.to(movers, { x, y, duration: t - t0, ease: "sine.inOut" }, t0)
        if (ground) tl.to(ground, { opacity: g, duration: t - t0, ease: "sine.inOut" }, t0)
    }
    // over the hit line: a small pop of the lens (and its shadow), and the yolk line glows once
    tl.fromTo(mag, { svgOrigin: ORIGIN, scale: 1 }, { scale: POP, duration: 0.2, ease: "back.out(3)" }, SETTLE + 0.05)
        .to(mag, { scale: 1, duration: 0.5, ease: "sine.inOut" }, SETTLE + 0.55)
    const glow = q("hitGlow")
    if (glow) tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 1 }, SETTLE + 0.05)
    DOTS.forEach((origin, i) => {
        const dot = q(`dot${i}`)
        if (!dot) return
        for (const at of TWINKLE_AT) {
            tl.fromTo(dot, { svgOrigin: origin, scale: 1, opacity: 1 }, { scale: 1.25, opacity: 0.7, duration: 0.18, ease: "sine.out", yoyo: true, repeat: 1 }, at + i * 0.3)
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
export default function ATMBrowserSearch(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two copies on one page never share gradients, clips or masks
    const uid = "b" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(() => ART.replace(/id="/g, `id="${uid}-`).replace(/url\(#/g, `url(#${uid}-`), [uid])
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing at rest
        const ctx = gsap.context(() => {
            tlRef.current = buildLoop(svg)
        }, svg)
        return () => ctx.revert()
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

ATMBrowserSearch.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMBrowserSearch, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
