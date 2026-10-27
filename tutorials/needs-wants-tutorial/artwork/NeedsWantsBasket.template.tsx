import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// Needs vs. Wants tutorial: the Needs or the Wants basket, as the owner drew
// it. TumbleWall finds it on the page by its mouth (the `data-nw-mouth`
// rect) and sends it "nw-catch" when the right picture is thrown in, or
// "nw-reject" when the wrong one is. A caught picture drops in behind the
// front wall and stays there, peeking over the rim, and the basket squashes
// and bounces. A rejected one makes the basket shake (TumbleWall tosses the
// picture back out). Reduced motion: the picture just appears in the basket
// and nothing moves.
//
// Built by artwork/build.py from the owner's .ai; edit the template, not
// NeedsWantsBasket.tsx.

type Kind = "need" | "want"

// prettier-ignore
const ART: Record<Kind, string> = {
    want: `__WANTS_ART__`,
    need: `__NEEDS_ART__`,
}

// Both artboards share one shape. Room above the rim for caught pictures.
const VIEWBOX = "50 40 400 350"
// The front wall, the rim's front edge and both sides of the front handle:
// drawn again on top so caught pictures sit inside the basket.
const FRONT = [
    "64,164 330,206 334,225 316,376 116,339 64,187.5",
    "135,185 162.5,192.5 90,272.5 62.5,260",
    "230,205 250,205 360,302.5 420,252.5 437.5,260 432.5,275 367.5,320 340,312.5",
]
const MOUTH = { x: 85, y: 120, width: 330, height: 95 }
const BOTTOM = "220 378" // the basket squashes toward its base here
const PIC = 96 // a caught picture's size, in drawing units

// Where the nth caught picture rests: along the front rim, which slopes
// down to the right, with later ones stacking a little higher.
function slot(n: number) {
    const x = 140 + ((n * 83) % 220)
    const rim = 164 + ((x - 64) * 42) / 266
    // Centre a little above the rim: the front wall hides the bottom third.
    return { x, y: rim - 14 - Math.floor(n / 3) * 18, tilt: ((n * 37) % 30) - 15 }
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
export default function NeedsWantsBasket(props: Props) {
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
                { keyframes: { x: [-12, 12, -9, 9, -4, 0] }, duration: 0.45, ease: "none" }
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
        gsap.fromTo(pic, { y: -150 }, { y: 0, duration: 0.32, ease: "power2.in" })
        gsap.timeline({ delay: 0.32 })
            .to(body, { svgOrigin: BOTTOM, scaleX: 1.05, scaleY: 0.93, duration: 0.08, ease: "power1.out" })
            .to(body, { scaleX: 1, scaleY: 1, duration: 0.42, ease: "back.out(2)" })
    }, [caught.length, reduceMotion])

    return (
        <svg
            viewBox={VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
            role="img"
            aria-label={`${kind === "need" ? "Needs" : "Wants"} basket, ${caught.length} sorted`}
        >
            <defs>
                <clipPath id={`${uid}-front`}>
                    {FRONT.map((p) => (
                        <polygon key={p} points={p} />
                    ))}
                </clipPath>
            </defs>
            <g ref={bodyRef}>
                <g id={`${uid}-art`} dangerouslySetInnerHTML={{ __html: markup }} />
                <g ref={picsRef}>
                    {caught.map((c, n) => {
                        const s = slot(n)
                        return (
                            <g key={n} transform={`translate(${s.x} ${s.y}) rotate(${s.tilt})`}>
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
                            </g>
                        )
                    })}
                </g>
                <use href={`#${uid}-art`} clipPath={`url(#${uid}-front)`} />
                <rect ref={mouthRef} data-nw-mouth={kind} {...MOUTH} fill="none" />
            </g>
        </svg>
    )
}

NeedsWantsBasket.defaultProps = {
    kind: "need" as Kind,
}

addPropertyControls(NeedsWantsBasket, {
    kind: {
        type: ControlType.Enum,
        title: "Basket",
        options: ["need", "want"],
        optionTitles: ["Needs", "Wants"],
        defaultValue: NeedsWantsBasket.defaultProps.kind,
    },
})
