import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// A lesson card's illustration: the hourglass with a clock and two coin stacks (glossy 3D, scheme B), looping in
// place. Sand drops fall through the neck while the top sand sinks and the bottom pile grows; at the end of the
// loop the hourglass flips end over end and lands with a small squash, full again. The clock's minute hand
// goes round once a loop (the hour hand stays still) and the clock ticks with a small bounce; a
// glint sweeps up each coin stack, and coins drop onto both stacks one by one. No background of its own: place it on the teal glass card.
//
// The artwork is redrawn and recoloured in ATM/artwork/vectors/hourglass/build.py (export_anim), with each moving
// part on its own data-k layer. The hourglass art is in perspective, so it can't match itself turned over: the
// flip layer holds the animated hourglass (hgA) and a still copy of its start state turned upside down (hgB),
// and the two swap halfway through the flip, so the flip lands exactly on the start state. One GSAP timeline
// that repeats forever (transforms and opacity only, nothing random), so every pass is identical and the loop is
// seamless. Reduced motion shows the drawing at rest. No blur, filters or CSS transitions (black rectangle over
// the carousel on Windows).

const VIEWBOX = "__VIEWBOX__" // room for the flip: it turns at 72% size, inside this box
// prettier-ignore
const ART = `__ART__`

const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
const DRAIN = 4 // the sand runs from 0 to here; then the flip
const FLIP = 0.55 // the flip's length; it lands with a squash that settles by the end of the loop
const CENTRE = "2001 1249" // the hourglass's middle (its waist): it flips about here
const GROUND = "2001 2338" // it squashes toward the ground here on landing
const TOP_TIP = "2001 1305" // the top sand sinks toward its tip...
const TOP_DRAIN = 0.5 // ...to half its height
const SURFACE = { origin: "2001 778", dy: 263.5, scale: 0.462 } // the sand's surface drops and narrows with the glass
const FLOOR = "2001 2030" // the bottom pile grows from the glass floor...
const PILE_GROW = 1.4 // ...to 1.4 times its height
const DROPS = [1400, 1475, 1540, 1600, 1600] // each drop's resting height; it falls from the neck to the pile
const NECK = 1300
const LAND = 1560
const DROP_FALL = 0.55 // one fall; 6 falls per loop, staggered, all before the flip
const DROP_FALLS = 6
const CLOCK = "__CLOCK__" // the clock's centre
const BEAT = LOOP / 6 // the clock ticks 6 times a loop
const STACKS = [
    { side: 0, coins: 7, pileOn: 3, at: [0.7, 2.9] },
    { side: 1, coins: 12, pileOn: 5, at: [0.95, 3.15] },
] // a glint sweeps up each stack twice a loop; each starts short and pileOn coins drop onto it, one by one
const PILE = { at: 0.3, every: 0.42, from: -230, fadeAt: 4.45 } // a short drop, so it stays clear of the clock // the drops alternate left and right

// The whole loop as ONE GSAP timeline (repeat: -1). Every value it moves ends where it started (the flip ends
// on hgB, which is the start state upright), and nothing is random, so each pass is identical.
function buildLoop(svg: SVGSVGElement) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.out" } })
    tl.set({}, {}, LOOP) // pins the timeline's length to the loop
    const hgA = q("hgA")
    const hgB = q("hgB")
    const hourglass = q("hourglass")
    const squash = q("squash")
    if (hgA && hgB && hourglass && squash) {
        tl.set(hgA, { opacity: 1 }, 0).set(hgB, { opacity: 0 }, 0)
        // the sand runs: the top sinks toward its tip, its surface drops and narrows, the pile grows
        const top = q("sandTop")
        const surf = q("sandSurf")
        const pile = q("sandBot")
        if (top) tl.fromTo(top, { svgOrigin: TOP_TIP, scaleY: 1 }, { scaleY: TOP_DRAIN, duration: DRAIN, ease: "none" }, 0)
        if (surf)
            tl.fromTo(surf, { svgOrigin: SURFACE.origin, y: 0, scale: 1 }, { y: SURFACE.dy, scale: SURFACE.scale, duration: DRAIN, ease: "none" }, 0)
        if (pile) tl.fromTo(pile, { svgOrigin: FLOOR, scaleY: 1 }, { scaleY: PILE_GROW, duration: DRAIN, ease: "none" }, 0)
        // drops fall from the neck into the pile (behind it), fading as they land; staggered, finite repeats
        DROPS.forEach((rest, i) => {
            const d = q(`drop${i}`)
            if (!d) return
            const at = 0.1 + i * 0.11
            tl.set(d, { opacity: 0 }, 0)
            tl.fromTo(d, { y: NECK - rest }, { y: LAND - rest, duration: DROP_FALL, ease: "power1.in", repeat: DROP_FALLS - 1, immediateRender: false }, at)
            tl.fromTo(d, { opacity: 1 }, { opacity: 0, duration: DROP_FALL, ease: "power4.in", repeat: DROP_FALLS - 1, immediateRender: false }, at)
        })
        // the flip: end over end about the waist, shrinking a little so it stays in the box; on its side the
        // animated copy hands over to the still one, which lands upright on the start state
        tl.fromTo(hourglass, { svgOrigin: CENTRE, rotation: 0 }, { rotation: 180, duration: FLIP, ease: "power2.inOut" }, DRAIN)
            .to(hourglass, { scale: 0.72, duration: FLIP / 2, ease: "power2.out" }, DRAIN)
            .to(hourglass, { scale: 1, duration: FLIP / 2, ease: "power2.in" }, DRAIN + FLIP / 2)
            .set(hgA, { opacity: 0 }, DRAIN + FLIP / 2)
            .set(hgB, { opacity: 1 }, DRAIN + FLIP / 2)
            .fromTo(squash, { svgOrigin: GROUND, scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.95, duration: 0.07, ease: "power1.out" }, DRAIN + FLIP)
            .to(squash, { scaleX: 1, scaleY: 1, duration: LOOP - DRAIN - FLIP - 0.07, ease: "back.out(2)" }, ">")
    }
    // the clock: the minute hand goes round once (the hour hand stays still), a tick-bounce each beat
    const clock = q("clock")
    const minute = q("minute")
    if (minute) tl.fromTo(minute, { svgOrigin: CLOCK, rotation: 0 }, { rotation: 360, duration: LOOP, ease: "none" }, 0)
    if (clock)
        for (let b = 0; b < 6; b++) {
            tl.fromTo(clock, { svgOrigin: CLOCK, scale: 1 }, { scale: 1.035, duration: 0.08, ease: "power1.out", immediateRender: false }, b * BEAT + 0.05)
                .to(clock, { scale: 1, duration: 0.3, ease: "back.out(3)" }, ">")
        }
    // coins drop onto the stacks one by one, alternating sides, then fade together for the next pass
    let drop = 0
    for (let p = 0; p < Math.max(...STACKS.map((s) => s.pileOn)); p++)
        for (const st of STACKS) {
            const c = p < st.pileOn ? q(`pile${st.side}_${p}`) : null
            if (!c) continue
            const at = PILE.at + drop++ * PILE.every
            // shown at full strength as it starts to drop (a half-faded coin shows its own shading as a dark ghost)
            tl.fromTo(c, { y: PILE.from, opacity: 0 }, { y: 0, duration: 0.32, ease: "power2.in", immediateRender: true }, at)
                .set(c, { opacity: 1 }, at)
                .to(c, { y: -18, duration: 0.1, ease: "power2.out" }, at + 0.32)
                .to(c, { y: 0, duration: 0.16, ease: "power2.in" }, at + 0.42)
                .to(c, { opacity: 0, duration: 0.2, ease: "power1.in" }, PILE.fadeAt)
        }
    // a glint sweeps up each coin stack, coin by coin
    for (const st of STACKS)
        for (const at of st.at)
            for (let j = 0; j < st.coins; j++) {
                const g = q(`glint${st.side}_${j}`)
                if (!g) continue
                tl.fromTo(g, { opacity: 0 }, { opacity: 0.9, duration: 0.16, ease: "sine.out", immediateRender: false }, at + j * 0.07)
                    .to(g, { opacity: 0, duration: 0.28, ease: "sine.in" }, ">")
            }
    return tl
}

type Props = { loopSeconds: number }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 614
 * @framerIntrinsicHeight 400
 */
export default function ATMHourglass(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two copies on one page never share gradients or clip paths
    const uid = "h" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(() => ART.replace(/id="/g, `id="${uid}-`).replace(/url\(#/g, `url(#${uid}-`), [uid])
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing at rest
        const ctx = gsap.context(() => {
            const tl = buildLoop(svg)
            tlRef.current = tl
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

ATMHourglass.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMHourglass, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
