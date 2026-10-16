import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// Cart version 2 (scheme B, glossy 3D): the second shopping cart, looping in place. The cart rolls gently back
// and forth on the ground with its hub glints turning; the flat stack, the big box and the tall box hop out in
// turn and land back in the basket with a squash, which the cart answers with a small squash of its own. The
// contact shadow stays on the ground. No background of its own: place it on the teal glass card.
//
// The artwork is the designer's Adobe Stock cart (artboard 1), cleaned and recoloured by
// ATM/artwork/vectors/cart-v2/build.py (export_anim), with each item on its own layer and drawn whole. The
// motion is one GSAP timeline that repeats forever (transforms only, nothing random), so every pass is
// identical and the loop is seamless. Reduced motion shows the drawing at rest. No blur, filters or CSS
// transitions (black rectangle over the carousel on Windows).

const VIEWBOX = "__VIEWBOX__" // room above the cart for the hop
// prettier-ignore
const ART = `__ART__`

// Each item: its foot (it squashes from there), when its hop starts (s) and which way it tips.
const ITEMS = [
    { k: "flat", foot: "1940 1050", at: 0.35, tip: -1 },
    { k: "box", foot: "2450 900", at: 1.45, tip: 1 },
    { k: "tall", foot: "2940 795", at: 2.55, tip: -1 },
]
const LAND = 0.16 + 0.42 + 0.34 // from a hop's start to its landing
const ROLL = 56 // how far the cart rolls each way, in drawing units (this drawing is 2713 wide)
const WHEEL_R = 148 // the tyre's radius, so the hub glints turn exactly as far as the cart rolls
const GROUND_POINT = "2180 2300" // the cart squashes toward the ground here, so the wheels never sink
const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
const HEIGHT = 150 // hop height, in drawing units

// The whole loop as ONE GSAP timeline (repeat: -1). Every tween is a transform, every value it moves ends
// where it started, and nothing is random, so each pass is identical and the loop is seamless.
function buildLoop(svg: SVGSVGElement) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.out" } })
    tl.set({}, {}, LOOP) // pins the timeline's length to the loop, rest included
    for (const it of ITEMS) {
        const el = q(it.k)
        if (!el) continue
        tl.addLabel(it.k, it.at)
            // gather, leap, fall, squash, settle
            .to(el, { svgOrigin: it.foot, scaleX: 1.06, scaleY: 0.92, duration: 0.16 }, it.k)
            .to(el, { y: -HEIGHT, scaleX: 0.97, scaleY: 1.05, rotation: 5 * it.tip, duration: 0.42, ease: "power3.out" }, ">")
            .to(el, { y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.34, ease: "power2.in" }, ">")
            .to(el, { scaleX: 1.08, scaleY: 0.9, duration: 0.07, ease: "power1.out" }, ">")
            .to(el, { scaleX: 1, scaleY: 1, duration: 0.42, ease: "back.out(2)" }, ">")
    }
    // the cart rolls gently back and forth on the ground (twice per loop) with its shadow under it, the hub
    // glints turning with it (each drawn in its hub's round frame, so it turns about 0,0), and gives a small
    // squash each time an item lands in it
    const roll = { duration: LOOP / 4, ease: "sine.inOut", yoyo: true, repeat: 3 }
    const cart = q("cart")
    const shadow = q("shadow")
    if (shadow) tl.fromTo(shadow, { x: -ROLL }, { x: ROLL, ...roll }, 0)
    if (cart) {
        tl.fromTo(cart, { x: -ROLL }, { x: ROLL, ...roll }, 0)
        const turn = (ROLL * 2 * 180) / (Math.PI * WHEEL_R)
        for (const k of ["glint0", "glint1"]) {
            const glint = q(k)
            if (glint) tl.fromTo(glint, { svgOrigin: "0 0", rotation: 0 }, { rotation: turn, ...roll }, 0)
        }
        for (const it of ITEMS) {
            tl.to(cart, { svgOrigin: GROUND_POINT, scaleX: 1.012, scaleY: 0.982, duration: 0.07, ease: "power1.out" }, it.at + LAND)
                .to(cart, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "back.out(2)" }, ">")
        }
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
export default function ATMCartV2(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two carts on one page never share gradients, clips or shapes
    const uid = "c" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(
        () =>
            ART.replace(/id="/g, `id="${uid}-`)
                .replace(/url\(#/g, `url(#${uid}-`)
                .replace(/href="#/g, `href="#${uid}-`),
        [uid]
    )
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing as it rests, every item in the cart
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

ATMCartV2.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMCartV2, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
