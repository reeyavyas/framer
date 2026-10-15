import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// The "Need or Want?" lesson card's illustration: the shopping cart, option D (glacier basket), looping in
// place. The cart rolls gently back and forth on the ground; the three boxes in it hop out in turn and land
// with a squash, which the cart answers with a small squash of its own; the light-teal glow behind the cart
// pulses and the sparkles twinkle. The card copy stays still. No background of its own: place it in the
// lower part of the teal glass card.
//
// The artwork is the designer's Adobe Stock cart, recoloured (ATM/artwork/cart/cart.py, export_anim), with
// each box on its own layer and its own outline. The motion is one GSAP timeline that repeats forever
// (transforms and opacity only, nothing random), so every pass is identical and the loop is seamless.
// Reduced motion shows the drawing at rest. No blur, filters or CSS transitions (black rectangle over the carousel on
// Windows).

const VIEWBOX = "190 80 2120 1480" // room above the cart for the hop
// prettier-ignore
const ART = `__ART__`

// Each box: its foot (it squashes from there), when its hop starts (s) and which way it tips.
const ITEMS = [
    { k: "flat", foot: "1050 565", at: 0.35, tip: -1 },
    { k: "yolk", foot: "1400 570", at: 1.45, tip: 1 },
    { k: "green", foot: "1745 595", at: 2.55, tip: -1 },
]
const LAND = 0.16 + 0.42 + 0.34 // from a hop's start to its landing
const ROLL = 48 // how far the cart rolls each way, in drawing units
const WHEEL_R = 124 // the tyre's radius, so the hub glints turn exactly as far as the cart rolls
const HUBS = ["778 1330", "1778 1330"]
const GROUND_POINT = "1278 1475" // the cart squashes toward the ground here, so the wheels never sink
const LOOP = 4.8 // seconds at Loop (s) = 4.8; the whole timeline is this long and repeats
const HEIGHT = 120 // hop height, in drawing units (the drawing is 2120 wide)
// Sparkles: position and size. Each twinkles four times a loop (half of them out of step) and turns a
// quarter turn per loop, alternate ones the other way; a four-point star looks the same after a quarter turn,
// so the loop stays seamless.
const SPARKS = [
    { x: 300, y: 690, k: 60 },
    { x: 900, y: 320, k: 42 },
    { x: 2050, y: 330, k: 80 },
    { x: 2230, y: 720, k: 50 },
]
const TWINKLES = 4

// The whole loop as ONE GSAP timeline (repeat: -1). Every tween is transform or opacity, every value it
// moves ends where it started, and nothing is random, so each pass is identical and the loop is seamless.
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
    // the cart rolls gently back and forth on the ground (twice per loop), its hub glints turning with it,
    // and gives a small squash each time a box lands in it
    const cart = q("cart")
    if (cart) {
        tl.fromTo(cart, { x: -ROLL }, { x: ROLL, duration: LOOP / 4, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0)
        const turn = (ROLL * 2 * 180) / (Math.PI * WHEEL_R)
        HUBS.forEach((hub, i) => {
            const glint = q(`glint${i}`)
            if (glint) tl.fromTo(glint, { svgOrigin: hub, rotation: 0 }, { rotation: turn, duration: LOOP / 4, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0)
        })
        for (const it of ITEMS) {
            tl.to(cart, { svgOrigin: GROUND_POINT, scaleX: 1.012, scaleY: 0.982, duration: 0.07, ease: "power1.out" }, it.at + LAND)
                .to(cart, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "back.out(2)" }, ">")
        }
    }
    const glow = q("glow")
    // the glow pulses twice a loop: swells and brightens, then eases back
    if (glow) tl.fromTo(glow, { svgOrigin: "1250 880", scale: 0.84, opacity: 0.45 }, { scale: 1, opacity: 1, duration: LOOP / 4, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0)
    SPARKS.forEach((sp, i) => {
        const el = q(`spark${i}`)
        if (!el) return
        const [from, to] = i % 2 ? [sp.k * 0.35, sp.k] : [sp.k, sp.k * 0.35]
        const half = LOOP / (TWINKLES * 2)
        tl.fromTo(el, { svgOrigin: `${sp.x} ${sp.y}`, scale: from }, { scale: to, duration: half, ease: "sine.inOut", yoyo: true, repeat: TWINKLES * 2 - 1 }, 0)
        tl.fromTo(el, { rotation: 0 }, { rotation: i % 2 ? -90 : 90, duration: LOOP, ease: "none" }, 0)
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
export default function ATMNeedWantCart(props: Props) {
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two carts on one page never share gradients or masks
    const uid = "c" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(() => ART.replace(/id="/g, `id="${uid}-`).replace(/url\(#/g, `url(#${uid}-`), [uid])
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const tlRef = React.useRef<gsap.core.Timeline | null>(null)

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg || reduceMotion) return // reduced motion: the drawing as it rests, every box in the cart
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

ATMNeedWantCart.defaultProps = {
    loopSeconds: 4.8,
}

addPropertyControls(ATMNeedWantCart, {
    loopSeconds: { type: ControlType.Number, title: "Loop (s)", min: 2, max: 10, step: 0.1, unit: "s", defaultValue: 4.8 },
})
