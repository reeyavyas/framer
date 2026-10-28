import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// ATM lesson Needs vs. Wants: the Needs or the Wants basket, as the owner drew
// it (Needs recoloured teal, the right handle's outer edge smoothed). ATMTumbleWall finds it on the page by its drop area (the
// `data-nw-mouth` rect, the whole drawing) and sends it "nw-catch" when the
// right picture is dropped or thrown in, or "nw-reject" when the wrong one is. A caught picture drops in behind the
// front wall and stays there, peeking over the rim, and the basket squashes
// and bounces. A rejected one makes the basket shake (ATMTumbleWall tosses the
// picture back out). Reduced motion: the picture just appears in the basket
// and nothing moves.
//
// Built by artwork/vectors/needs-wants-basket/handle.py and build.py from the
// owner's Basket.ai; edit the template, not ATM/ATMNeedsWantsBasket.tsx.

type Kind = "need" | "want"

// prettier-ignore
const ART: Record<Kind, string> = {
    want: `__WANTS_ART__`,
    need: `__NEEDS_ART__`,
}

// Both artboards share one shape. Room above the rim for caught pictures.
const VIEWBOX = "50 40 400 350"
// What's drawn again on top, so caught pictures sit inside the basket: the
// front of the basket up to where the rim's top surface meets the dark
// inside, measured from the drawing every half unit
// along the front and down the right side, round the inner corner between
// them; at the back-right corner, the line from the inner corner to the
// rim's outer corner (above it is the back rim, which pictures cover). The
// left side is seen from inside and never covers a picture.
// prettier-ignore
const FRONT = "40,165.5 108.5,177.2 119,178.4 170,186.7 180,188.4 182.5,189.1 184,189 188.5,190.4 195,191.5 211,193.9 213.5,193.9 215,194.4 222,195.2 225,195.9 255,200.2 256.5,200.1 258.5,201.1 260.5,200.9 267,202.3 268,201.7 269.5,202.5 274.5,203.3 278.5,204.3 280.5,204 283.5,204.9 289,205.5 290,206.4 290.5,206.1 303.5,208.2 304.5,207.8 311.5,209.8 312.5,209.8 313.5,209.4 314,209.9 315.5,210.2 323.5,211.5 325.5,212.2 327,211.9 329.5,212.4 333.5,212.7 334.5,212.4 335.5,212.8 338.5,213 342,212.4 345,211.2 356.3,204.5 361.4,202 369.1,197.5 375.1,193.5 390.4,184.5 395.8,181 395.9,180.5 428.5,163.5 450,163.5 450,400 40,400"
// The handles' bolt rings, which stand above the rim's inner edge.
const BOLTS = [
    { cx: 153, cy: 195.5, rx: 13.3, ry: 13.2 },
    { cx: 239.8, cy: 212.9, rx: 10.7, ry: 11.9 },
]
// The drop area: the whole drawing, label and outer shell included.
const MOUTH = { x: 63, y: 124, width: 374, height: 252 }
const BOTTOM = "220 378" // the basket squashes toward its base here
const PIC = 96 // a caught picture's size, in drawing units

// Where the nth caught picture rests: along the front rim, which slopes
// down to the right, with later ones stacking a little higher.
function slot(n: number) {
    const x = 140 + ((n * 83) % 220)
    const rim = 164 + ((x - 64) * 42) / 266
    // Centre a little above the rim: the front wall hides the bottom third.
    return {
        x,
        y: rim - 14 - Math.floor(n / 3) * 18,
        tilt: ((n * 37) % 30) - 15,
    }
}

interface Caught {
    src: string
    alt: string
}

interface Props {
    kind: Kind
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 350
 */
export default function ATMNeedsWantsBasket(props: Props) {
    const kind = props.kind === "want" ? "want" : "need"
    const reduceMotion = useReducedMotion()
    // ids made unique per instance, so two baskets never share clips or glyphs
    const uid = "b" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(
        () =>
            ART[kind]
                .replace(/id="/g, `id="${uid}-`)
                .replace(/url\(#/g, `url(#${uid}-`)
                .replace(/href="#/g, `href="#${uid}-`),
        [uid, kind]
    )
    const bodyRef = React.useRef<SVGGElement>(null)
    const mouthRef = React.useRef<SVGRectElement>(null)
    const picsRef = React.useRef<SVGGElement>(null)
    const [caught, setCaught] = React.useState<Caught[]>([])

    React.useEffect(() => {
        const mouth = mouthRef.current
        const body = bodyRef.current
        if (!mouth || !body) return
        const onCatch = (e: Event) => {
            const d = (e as CustomEvent<Caught>).detail
            setCaught((c) => [...c, d])
        }
        const onReject = () => {
            if (reduceMotion) return
            gsap.killTweensOf(body)
            gsap.fromTo(
                body,
                { x: 0 },
                {
                    keyframes: { x: [-12, 12, -9, 9, -4, 0] },
                    duration: 0.45,
                    ease: "none",
                }
            )
        }
        mouth.addEventListener("nw-catch", onCatch)
        mouth.addEventListener("nw-reject", onReject)
        return () => {
            mouth.removeEventListener("nw-catch", onCatch)
            mouth.removeEventListener("nw-reject", onReject)
            gsap.killTweensOf(body)
        }
    }, [reduceMotion])

    // The newest picture falls in from above the rim, then the basket squashes.
    React.useLayoutEffect(() => {
        const pics = picsRef.current
        const body = bodyRef.current
        const pic = pics?.lastElementChild?.firstElementChild // the image, not its placed group
        if (!pic || !body || reduceMotion) return
        gsap.fromTo(
            pic,
            { y: -150 },
            { y: 0, duration: 0.32, ease: "power2.in" }
        )
        gsap.timeline({ delay: 0.32 })
            .to(body, {
                svgOrigin: BOTTOM,
                scaleX: 1.05,
                scaleY: 0.93,
                duration: 0.08,
                ease: "power1.out",
            })
            .to(body, {
                scaleX: 1,
                scaleY: 1,
                duration: 0.42,
                ease: "back.out(2)",
            })
    }, [caught.length, reduceMotion])

    return (
        <svg
            viewBox={VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                overflow: "visible",
            }}
            role="img"
            aria-label={`${kind === "need" ? "Needs" : "Wants"} basket, ${caught.length} sorted`}
        >
            <defs>
                <clipPath id={`${uid}-front`}>
                    <polygon points={FRONT} />
                    {BOLTS.map((e) => (
                        <ellipse key={e.cx} {...e} />
                    ))}
                </clipPath>
            </defs>
            <g ref={bodyRef}>
                <g
                    id={`${uid}-art`}
                    dangerouslySetInnerHTML={{ __html: markup }}
                />
                <g ref={picsRef}>
                    {caught.map((c, n) => {
                        const s = slot(n)
                        return (
                            <g
                                key={n}
                                transform={`translate(${s.x} ${s.y}) rotate(${s.tilt})`}
                            >
                                {c.src ? (
                                    <image
                                        href={c.src}
                                        x={-PIC / 2}
                                        y={-PIC / 2}
                                        width={PIC}
                                        height={PIC}
                                        preserveAspectRatio="xMidYMid meet"
                                    >
                                        <title>{c.alt}</title>
                                    </image>
                                ) : (
                                    // ATMTumbleWall's grey placeholder, for a picture with no image yet
                                    <circle r={PIC / 2} fill="#D9D9D9" />
                                )}
                            </g>
                        )
                    })}
                </g>
                <use href={`#${uid}-art`} clipPath={`url(#${uid}-front)`} />
                <rect
                    ref={mouthRef}
                    data-nw-mouth={kind}
                    {...MOUTH}
                    fill="none"
                />
            </g>
        </svg>
    )
}

ATMNeedsWantsBasket.defaultProps = {
    kind: "need" as Kind,
}

addPropertyControls(ATMNeedsWantsBasket, {
    kind: {
        type: ControlType.Enum,
        title: "Basket",
        options: ["need", "want"],
        optionTitles: ["Needs", "Wants"],
        defaultValue: ATMNeedsWantsBasket.defaultProps.kind,
    },
})
