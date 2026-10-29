import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"

// ATM lesson Save or Spend?: the savings jar's gold coins (the same artwork as ATMSavingsJar's side stack), piled
// in stacks of Per Stack side by side, bottom-aligned and centred in the frame. On the option cards each tray shows
// one side of the $100 (1 coin = $5); with one coin it is a key's coin. The coin size depends only on Per Stack and
// Max Stacks, so trays with different counts line up. When Hop turns on (the card's Selected variant) the coins
// hop once. No background of its own.

const S = 100 / 490 // the coin art is 490 wide: drawn 100 units wide
const H = 254.8 * S // a coin from its top face to the bottom of its side
const T = 78.4 * S // one coin's thickness: the step up a stack
const TOP = 88.2 * S // the coin's centre below its top
const GAP = 105 // stack to stack
const JIT = [0, 3, -2, 4, 1, -3, 3, -1] // a little sideways wobble up a stack, as in the jar's stack

const COIN_DEFS = `<linearGradient id="l19" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e08a12"/><stop offset="0.1" stop-color="#ffe07a"/><stop offset="0.25" stop-color="#f6a11d"/><stop offset="0.42" stop-color="#fff0b8"/><stop offset="0.55" stop-color="#f6a11d"/><stop offset="0.8" stop-color="#e08a12"/><stop offset="1" stop-color="#cf7a0c"/></linearGradient>
<linearGradient id="l20" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.15" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="l21" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset="0.35" stop-color="#ffcc40"/><stop offset="0.7" stop-color="#f6a11d"/><stop offset="1" stop-color="#e08a12"/></linearGradient>
<linearGradient id="l22" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e08a12"/><stop offset="0.4" stop-color="#f6a11d"/><stop offset="0.75" stop-color="#ffcc40"/><stop offset="1" stop-color="#fff0b8"/></linearGradient>
<radialGradient id="r23" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffe07a"/><stop offset="0.6" stop-color="#ffcc40"/><stop offset="1" stop-color="#f6a11d"/></radialGradient>
<radialGradient id="r24" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.76"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.427"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.142"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.038"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r25" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.15"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.04"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r26" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.56"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.315"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.105"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.028"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r54" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#cf7a0c" stop-opacity="0.5"/><stop offset="0.275" stop-color="#cf7a0c" stop-opacity="0.4"/><stop offset="0.55" stop-color="#cf7a0c" stop-opacity="0.225"/><stop offset="0.75" stop-color="#cf7a0c" stop-opacity="0.075"/><stop offset="0.9" stop-color="#cf7a0c" stop-opacity="0.02"/><stop offset="1" stop-color="#cf7a0c" stop-opacity="0"/></radialGradient>`
const COIN = `<path d="M-245,0 -245,78.4 A245,88.2 0 0 0 245,78.4 L245,0 A245,88.2 0 0 1 -245,0 Z" fill="url(#l19)"/><path d="M-245,0 -245,78.4 A245,88.2 0 0 0 245,78.4 L245,0 A245,88.2 0 0 1 -245,0 Z" fill="url(#l20)"/><ellipse rx="245" ry="88.2" fill="url(#l21)"/><ellipse rx="205.8" ry="74.1" fill="url(#l22)"/><ellipse rx="191.1" ry="68.8" fill="url(#r23)"/><g transform="scale(1 0.36) scale(183.8)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#cf7a0c" stroke-width=".13" transform="translate(.035 .045)"/><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#ffe07a" stroke-width=".13"/><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#ffffff" stroke-opacity=".7" stroke-width=".035" transform="translate(-.025 -.03)"/></g><ellipse cx="-102.9" cy="-39.7" rx="73.5" ry="20.1" transform="rotate(-25 -102.9 -39.7)" fill="url(#r24)"/><circle cx="-134.8" cy="-22.1" r="14.7" fill="url(#r25)"/><ellipse cx="122.5" cy="30.9" rx="34.3" ry="10.1" transform="rotate(-25 122.5 30.9)" fill="url(#r26)"/><ellipse cx="0" cy="96" rx="245" ry="92.6" fill="url(#r54)"/>`
interface Props {
    coins: number
    perStack: number
    maxStacks: number
    hop: boolean
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 120
 * @framerIntrinsicHeight 140
 */
export default function ATMCoinStack(props: Props) {
    const { coins, perStack, maxStacks, hop } = props
    const reduceMotion = useReducedMotion()
    const uid = "cs" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const svgRef = React.useRef<SVGSVGElement>(null)
    const n = Math.max(0, Math.round(coins))
    const per = Math.max(1, Math.round(perStack))
    const vw = 100 + (Math.max(1, Math.round(maxStacks)) - 1) * GAP
    const vh = H + (per - 1) * T
    const used = Math.ceil(n / per)
    const x0 = vw / 2 - ((used - 1) * GAP) / 2
    const ids = (s: string) =>
        s.replace(/id="/g, `id="${uid}`).replace(/url\(#/g, `url(#${uid}`)
    let markup = `<defs>${ids(COIN_DEFS)}</defs>`
    for (let c = 0; c < used; c++)
        for (let i = 0; i < Math.min(per, n - c * per); i++) {
            const x = x0 + c * GAP + JIT[i % JIT.length] * 0.25
            const y = vh - H + TOP - i * T
            markup += `<g data-coin><g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${S.toFixed(5)})">${ids(COIN)}</g></g>`
        }

    // Hop once each time Hop turns on (a card's variant switching to Selected).
    const was = React.useRef(false)
    React.useEffect(() => {
        const svg = svgRef.current
        if (
            hop &&
            !was.current &&
            svg &&
            !reduceMotion &&
            RenderTarget.current() !== RenderTarget.canvas
        )
            svg.querySelectorAll("[data-coin]").forEach((g, k) =>
                (g as SVGGElement).animate(
                    [
                        { transform: "none" },
                        { transform: `translateY(${-T * 0.9}px)` },
                        { transform: "none" },
                    ],
                    { duration: 340, delay: k * 30, easing: "ease-out" }
                )
            )
        was.current = hop
    }, [hop, reduceMotion])

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${vw} ${vh.toFixed(1)}`}
            preserveAspectRatio="xMidYMax meet"
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                overflow: "visible",
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    )
}

ATMCoinStack.defaultProps = {
    coins: 5,
    perStack: 10,
    maxStacks: 2,
    hop: false,
}

addPropertyControls(ATMCoinStack, {
    coins: {
        type: ControlType.Number,
        title: "Coins",
        min: 0,
        max: 40,
        step: 1,
        displayStepper: true,
        defaultValue: ATMCoinStack.defaultProps.coins,
    },
    perStack: {
        type: ControlType.Number,
        title: "Per Stack",
        min: 1,
        max: 20,
        step: 1,
        displayStepper: true,
        defaultValue: ATMCoinStack.defaultProps.perStack,
    },
    maxStacks: {
        type: ControlType.Number,
        title: "Max Stacks",
        description:
            "How many stacks fit across. Keep it the same on every tray so the coins match in size.",
        min: 1,
        max: 4,
        step: 1,
        displayStepper: true,
        defaultValue: ATMCoinStack.defaultProps.maxStacks,
    },
    hop: {
        type: ControlType.Boolean,
        title: "Hop",
        description:
            "Turn on in a card's Selected variant: the coins hop once when it's picked.",
        defaultValue: ATMCoinStack.defaultProps.hop,
    },
})
