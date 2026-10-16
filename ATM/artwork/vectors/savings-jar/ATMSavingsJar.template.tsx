import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// The savings lesson card's illustration: the glass savings jar (glossy 3D, scheme B), looping in place. A gold
// coin drops toward the lid, turning as it falls, and slips into the slot; the jar gives a small squash and the
// coin lands inside the jar on the pile; a new coin then appears at the top for the next pass. The side stack starts
// short and coins drop onto it one by one. The teal arrow in
// front bobs up with a springy bounce twice a loop, its shadow following, and a glint sweeps up the coin stack.
// No background of its own: place it on the teal glass card.
//
// The artwork is the designer's Adobe Stock jar, cleaned and recoloured (ATM/artwork/vectors/savings-jar/build.py,
// export_anim), with each moving part on its own named layer. The motion is one GSAP timeline that repeats forever
// (transforms and opacity only, nothing random), so every pass is identical and the loop is seamless. Reduced
// motion shows the drawing at rest. No blur, filters or CSS transitions (black rectangle over the carousel on
// Windows).

const VIEWBOX = "__VIEWBOX__"
// prettier-ignore
const ART = `__ART__`

const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
const COIN = "1600 150" // the falling coin's centre at rest
const DROP = { at: 0.25, dur: 0.8, x: 27, y: 595, turn: 10 } // to below the slot's lip (the coin is clipped there), lined up with the slot
const LAND = DROP.at + DROP.dur // the coin is fully in the slot
const JAR_FOOT = "1625 2459" // the jar squashes toward the ground here
const REAPPEAR = 3.9 // the next coin fades and grows in at the top
const ARROW_FOOT = "2479.5 2459" // the arrow's base on the ground
const ARROW_UP = 90 // about 6% of the arrow's height (1494, as tall as the jar's body)
const BOBS = [1.45, 3.05] // when each bounce starts
const GLINT = { at: 2.0, dur: 1.5, y: -2052 } // up the whole stack, from its foot to past its top
// the coin that goes into the slot lands inside the jar, on the top of the pile (its rest place in the drawing)
const INSIDE = { at: LAND + 0.05, dur: 0.5, from: -430 }
// the side stack starts short and the top eight coins drop on one by one, then fade together for the next pass
const PILE = { n: 8, at: 0.45, every: 0.42, from: -420, fadeAt: 4.45 }

// The whole loop as ONE GSAP timeline (repeat: -1). Every tween is transform or opacity, every value it moves
// ends where it started, and nothing is random, so each pass is identical and the loop is seamless.
function buildLoop(svg: SVGSVGElement) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.out" } })
    tl.set({}, {}, LOOP) // pins the timeline's length to the loop, rest included
    const coin = q("coin")
    const spin = q("spin")
    const shadow = q("coinShadow")
    if (coin && spin) {
        tl.set(coin, { svgOrigin: COIN, x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, 0)
            // the drop: falling faster and faster, lining up with the slot
            .to(coin, { x: DROP.x, y: DROP.y, rotation: DROP.turn, duration: DROP.dur, ease: "power2.in" }, DROP.at)
            // one turn on the way down, like a coin flipping (it ends face-on, as it started)
            .fromTo(spin, { svgOrigin: COIN, scaleX: 1 }, { scaleX: -1, duration: DROP.dur / 2, ease: "sine.inOut" }, DROP.at)
            .to(spin, { scaleX: 1, duration: DROP.dur / 2, ease: "sine.inOut" }, DROP.at + DROP.dur / 2)
            // gone into the slot: hidden, and back at the top, small, ready to appear
            .set(coin, { opacity: 0 }, LAND + 0.02)
            .set(coin, { x: 0, y: 0, rotation: 0, scale: 0.6 }, LAND + 0.05)
            .to(coin, { opacity: 1, duration: 0.35, ease: "power1.out" }, REAPPEAR)
            .to(coin, { scale: 1, duration: 0.6, ease: "back.out(1.7)" }, REAPPEAR)
    }
    // the coin's shadow on the lid fades as it goes in and comes back with the next coin
    if (shadow) tl.fromTo(shadow, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in" }, LAND - 0.3).to(shadow, { opacity: 1, duration: 0.6 }, REAPPEAR)
    // the jar answers the coin with a small squash, and the coins inside settle with a tiny bump
    const jar = q("jar")
    if (jar)
        tl.to(jar, { svgOrigin: JAR_FOOT, scaleX: 1.012, scaleY: 0.985, duration: 0.08, ease: "power1.out" }, LAND)
            .to(jar, { scaleX: 1, scaleY: 1, duration: 0.45, ease: "back.out(2)" }, ">")
    // the coin lands inside, on the pile, and the coins inside settle with a tiny bump; it fades as the next appears
    const landed = q("landed")
    if (landed)
        tl.fromTo(landed, { y: INSIDE.from, opacity: 0 }, { y: 0, duration: INSIDE.dur, ease: "bounce.out", immediateRender: true }, INSIDE.at)
            .to(landed, { opacity: 1, duration: 0.08, ease: "none" }, INSIDE.at)
            .to(landed, { opacity: 0, duration: 0.4, ease: "power1.in" }, REAPPEAR)
    const inner = q("inner")
    if (inner)
        tl.to(inner, { y: -14, duration: 0.12, ease: "power2.out" }, INSIDE.at + INSIDE.dur * 0.45)
            .to(inner, { y: 0, duration: 0.5, ease: "bounce.out" }, ">")
    for (let k = 0; k < PILE.n; k++) {
        const c = q(`pile${k}`)
        if (!c) continue
        const at = PILE.at + k * PILE.every
        // shown at full strength as it starts to drop (a half-faded coin shows its own shading as a dark ghost)
        tl.fromTo(c, { y: PILE.from, opacity: 0 }, { y: 0, duration: 0.32, ease: "power2.in", immediateRender: true }, at)
            .set(c, { opacity: 1 }, at)
            .to(c, { y: -18, duration: 0.1, ease: "power2.out" }, at + 0.3)
            .to(c, { y: 0, duration: 0.16, ease: "power2.in" }, at + 0.4)
            .to(c, { opacity: 0, duration: 0.2, ease: "power1.in" }, PILE.fadeAt)
    }
    // the arrow bobs up with a spring and lands with a small squash; its shadow thins as it rises
    const arrow = q("arrow")
    const arrowShadow = q("arrowShadow")
    for (const at of BOBS) {
        if (arrow)
            tl.to(arrow, { svgOrigin: ARROW_FOOT, y: -ARROW_UP, duration: 0.4, ease: "back.out(2.2)" }, at)
                .to(arrow, { y: 0, duration: 0.3, ease: "power2.in" }, ">")
                .to(arrow, { scaleX: 1.04, scaleY: 0.95, duration: 0.07, ease: "power1.out" }, ">")
                .to(arrow, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "back.out(2)" }, ">")
        if (arrowShadow)
            tl.to(arrowShadow, { y: -ARROW_UP * 0.35, opacity: 0.5, duration: 0.4, ease: "back.out(2.2)" }, at)
                .to(arrowShadow, { y: 0, opacity: 1, duration: 0.3, ease: "power2.in" }, ">")
    }
    // a glint sweeps up the coin stack once a loop
    const glint = q("glint")
    if (glint)
        tl.fromTo(glint, { y: 0 }, { y: GLINT.y, duration: GLINT.dur, ease: "power1.inOut" }, GLINT.at)
            .fromTo(glint, { opacity: 0 }, { opacity: 0.9, duration: 0.35, ease: "power1.out" }, GLINT.at)
            .to(glint, { opacity: 0, duration: 0.45, ease: "power1.in" }, GLINT.at + GLINT.dur - 0.45)
            .set(glint, { y: 0 }, GLINT.at + GLINT.dur + 0.01)
    return tl
}

type Props = { loopSeconds: number }

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 614
 * @framerIntrinsicHeight 400
 */
export default function ATMSavingsJar(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two jars on one page never share gradients, clips or shapes
    const uid = "s" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(
        () => ART.replace(/id="/g, `id="${uid}-`).replace(/url\(#/g, `url(#${uid}-`).replace(/href="#/g, `href="#${uid}-`),
        [uid]
    )
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing at rest, the coin above the lid
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

    // Pause while a system overlay is open (ATMInactivityOverlay sets window.__systemOverlayOpen and fires
    // "system-overlay-change", as CurvedCarouselV2 and TutorialOverlay listen for); resume where it left off.
    React.useEffect(() => {
        const sync = () => {
            const tl = tlRef.current
            if (!tl) return
            if ((window as any).__systemOverlayOpen) tl.pause()
            else tl.resume()
        }
        sync()
        window.addEventListener("system-overlay-change", sync)
        return () => window.removeEventListener("system-overlay-change", sync)
    }, [reduceMotion, markup])

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

ATMSavingsJar.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMSavingsJar, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
