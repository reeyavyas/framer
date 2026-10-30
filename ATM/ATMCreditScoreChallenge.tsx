import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// ATM lesson Credit Score Challenge: Can You Reach 760? The score starts at 700 (Good). One card at a time asks
// about a money choice as a yes/no question; swipe right (or tap Yes) for yes, left (or No) for no. A right choice adds 15,
// a wrong one costs 40 (a missed payment) or 30 (a maxed-out card). The gauge at the top is the heads-up display:
// its needle springs to the score, the band names round its arc light up as the score crosses into a band, and a
// chip by the score says what happened ("Paid on time +15"). A line under the buttons says why. The whole deck
// is played (a perfect run ends at 790); if it ends under 760, the cards they got wrong come back reworded, and so
// on until the score is 760 or more. Then the cards clear, the gauge glides to the middle and the finale line and
// Done show. No background of its own.
//
// The gauge is ATMGauge's art (ATM/artwork/vectors/gauge/build.py, export_anim): five 36° segments, one per band,
// so the needle sits at the score's place within its band. Transforms and opacity only; no blur, filters or CSS
// transitions.

const START = 700
const GOAL = 760
const GAIN = 15
const NAVY = "#002c44"
const MIDNIGHT = "#11232d"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const MINT = "#bce2d7"
const CORAL = "#D04848" // Cancel coral, for the chip of a score drop only (owner asked for red drop chips)

// The bands, one per gauge segment, left to right
const BANDS = [
    { name: "Poor", min: 300, max: 580 },
    { name: "Fair", min: 580, max: 670 },
    { name: "Good", min: 670, max: 740 },
    { name: "Very Good", min: 740, max: 800 },
    { name: "Excellent", min: 800, max: 850 },
]
const bandOf = (s: number) => {
    let i = 0
    BANDS.forEach((b, k) => {
        if (s >= b.min) i = k
    })
    return i
}
// The needle's GSAP rotation for a score (0 = straight up): each band's segment spans 36°
const needleAt = (s: number) => {
    const i = bandOf(s)
    const b = BANDS[i]
    return (
        -90 + 36 * (i + Math.min(1, Math.max(0, (s - b.min) / (b.max - b.min))))
    )
}

// The cards. `go` is the right swipe ("do" = right, "skip" = left). A card answered wrong comes back later as `again`.
type Card = {
    story: string
    ask: string
    again: [string, string]
    go: "do" | "skip"
    right: string
    rightWhy: string
    wrong: string
    wrongWhy: string
    cost: number
}
const CARDS: Card[] = [
    {
        story: "Your phone bill is due tomorrow.",
        ask: "Pay it now?",
        again: ["Your car payment is due on Friday.", "Pay it on time?"],
        go: "do",
        right: "Paid on time",
        rightWhy: "Paying on time is the biggest part of your score.",
        wrong: "Late payment",
        wrongWhy: "A late payment can stay on your credit report for 7 years.",
        cost: 40,
    },
    {
        story: "New headphones cost $900. Your card's limit is $1,000.",
        ask: "Put them on your card?",
        again: [
            "A game console costs $450. Your card's limit is $500.",
            "Put it on your card?",
        ],
        go: "skip",
        right: "Kept your balance low",
        rightWhy: "Using a small part of your limit helps your score.",
        wrong: "Card almost maxed out",
        wrongWhy:
            "Using most of your limit tells lenders you might be stretched.",
        cost: 30,
    },
    {
        story: "You have a busy month coming up.",
        ask: "Set up autopay for your card bill?",
        again: [
            "You keep forgetting due dates.",
            "Set a reminder for your bills?",
        ],
        go: "do",
        right: "Autopay on",
        rightWhy: "With autopay, you never miss a due date.",
        wrong: "Missed a payment",
        wrongWhy: "One forgotten bill can drop your score fast.",
        cost: 40,
    },
    {
        story: "There's a big holiday sale.",
        ask: "Max out your card on gifts?",
        again: [
            "Your favourite store has a sale.",
            "Spend right up to your card's limit?",
        ],
        go: "skip",
        right: "Stayed under your limit",
        rightWhy: "A card that isn't maxed out keeps your score healthy.",
        wrong: "Maxed out your card",
        wrongWhy: "A maxed-out card can pull your score down.",
        cost: 30,
    },
    {
        story: "Your card statement just arrived.",
        ask: "Pay off the whole balance?",
        again: ["You have $200 left on your card.", "Pay it down to zero?"],
        go: "do",
        right: "Paid in full",
        rightWhy: "A low balance shows you use credit wisely.",
        wrong: "Balance stayed high",
        wrongWhy: "Carrying a big balance can lower your score.",
        cost: 30,
    },
    {
        story: "Concert tickets just went on sale.",
        ask: "Skip this month's card payment to buy them?",
        again: [
            "New sneakers just dropped.",
            "Skip your phone bill to buy them?",
        ],
        go: "skip",
        right: "Paid on time",
        rightWhy: "Bills come first. Fun can wait for the next paycheck.",
        wrong: "Missed a payment",
        wrongWhy:
            "Skipping a payment hurts your score more than one good month helps.",
        cost: 40,
    },
]
// A turn in the deck: which card, and whether it's the reworded one
type Turn = { c: number; again: boolean }
const FIRST_DECK: Turn[] = CARDS.map((_, c) => ({ c, again: false }))

// The gauge drawing; its pivot (and the arch's centre) is at (0, 0), the arch's outer radius 1000
const VIEWBOX = "-1242 -1092 2484 1378"
const VB = { x: -1242, y: -1092, w: 2484, h: 1378 }
const LABEL_R = 1120 // Good sits this far above the pivot, centred over its block (110 above its top at -1010)
// Every other band name sits beside its block, 100 units out from it (owner: 2 px closer than the first 110), level with the middle of the block's side
// that faces it (measured from the drawing): Poor/Excellent's upright side runs -636 to 84 and reaches 1010 out;
// Fair/Very Good are tilted, so their middle height would line up with the gap below them; their outer side runs
// from the top (-972) to the outer corner (-552), and they sit a little above its middle (owner), where within the
// name's height the block reaches 634 out
const BESIDE = [
    { y: -276, x: 1096 }, // the painted edge is 14 inside the box's 1010, so this matches Fair's gap
    { y: -890, x: 734 },
]
// prettier-ignore
const ART = `<defs><linearGradient id="gauge-B-gloss-side0" x1="0" y1="-500" x2="0" y2="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e08a12"/><stop offset="1" stop-color="#c97a0c"/></linearGradient><clipPath id="gauge-B-gloss-clip0"><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z"/></clipPath><linearGradient id="gauge-B-gloss-bev0" x1="0" y1="-1000" x2="0" y2="-920" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-72)"><stop offset="0" stop-color="#ffe0a0"/><stop offset="1" stop-color="#fbbb4f"/></linearGradient><linearGradient id="gauge-B-gloss-edge0" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#e3860f" stop-opacity="0"/><stop offset="0.8" stop-color="#e3860f" stop-opacity="0.75"/><stop offset="1" stop-color="#e3860f" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-front0" cx="0" cy="0" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#e3860f"/><stop offset="0.55" stop-color="#f6a11d"/><stop offset="0.78" stop-color="#f6a11d"/><stop offset="0.9" stop-color="#fbbb4f"/><stop offset="1" stop-color="#fbbb4f"/></radialGradient><linearGradient id="gauge-B-gloss-chamL0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.35" stop-color="#ffe0a0" stop-opacity="0.55"/><stop offset="0.55" stop-color="#ffe0a0" stop-opacity="0"/></linearGradient><linearGradient id="gauge-B-gloss-chamD0" x1="0" y1="0" x2="1" y2="1"><stop offset="0.4" stop-color="#e3860f" stop-opacity="0"/><stop offset="0.7" stop-color="#e3860f" stop-opacity="0.8"/><stop offset="1" stop-color="#c97a0c" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-blob0" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.44"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.83" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.01"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="gauge-B-gloss-side1" x1="0" y1="-500" x2="0" y2="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6a11d"/><stop offset="1" stop-color="#e08a12"/></linearGradient><clipPath id="gauge-B-gloss-clip1"><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z"/></clipPath><linearGradient id="gauge-B-gloss-bev1" x1="0" y1="-1000" x2="0" y2="-920" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-36)"><stop offset="0" stop-color="#fff0b8"/><stop offset="1" stop-color="#ffe07a"/></linearGradient><linearGradient id="gauge-B-gloss-edge1" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#f4ad22" stop-opacity="0"/><stop offset="0.8" stop-color="#f4ad22" stop-opacity="0.75"/><stop offset="1" stop-color="#f4ad22" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-front1" cx="0" cy="0" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#f4ad22"/><stop offset="0.55" stop-color="#ffcc40"/><stop offset="0.78" stop-color="#ffcc40"/><stop offset="0.9" stop-color="#ffe07a"/><stop offset="1" stop-color="#ffe07a"/></radialGradient><linearGradient id="gauge-B-gloss-chamL1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.35" stop-color="#fff0b8" stop-opacity="0.55"/><stop offset="0.55" stop-color="#fff0b8" stop-opacity="0"/></linearGradient><linearGradient id="gauge-B-gloss-chamD1" x1="0" y1="0" x2="1" y2="1"><stop offset="0.4" stop-color="#f4ad22" stop-opacity="0"/><stop offset="0.7" stop-color="#f4ad22" stop-opacity="0.8"/><stop offset="1" stop-color="#e08a12" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-blob1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.44"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.83" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.01"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="gauge-B-gloss-side2" x1="0" y1="-500" x2="0" y2="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8fd3c0"/><stop offset="1" stop-color="#5fbfa6"/></linearGradient><clipPath id="gauge-B-gloss-clip2"><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z"/></clipPath><linearGradient id="gauge-B-gloss-bev2" x1="0" y1="-1000" x2="0" y2="-920" gradientUnits="userSpaceOnUse" gradientTransform="rotate(0)"><stop offset="0" stop-color="#eefaf6"/><stop offset="1" stop-color="#d6f0e8"/></linearGradient><linearGradient id="gauge-B-gloss-edge2" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#7fc9b4" stop-opacity="0"/><stop offset="0.8" stop-color="#7fc9b4" stop-opacity="0.75"/><stop offset="1" stop-color="#7fc9b4" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-front2" cx="0" cy="0" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#7fc9b4"/><stop offset="0.55" stop-color="#bce2d7"/><stop offset="0.78" stop-color="#bce2d7"/><stop offset="0.9" stop-color="#d6f0e8"/><stop offset="1" stop-color="#d6f0e8"/></radialGradient><linearGradient id="gauge-B-gloss-chamL2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.35" stop-color="#eefaf6" stop-opacity="0.55"/><stop offset="0.55" stop-color="#eefaf6" stop-opacity="0"/></linearGradient><linearGradient id="gauge-B-gloss-chamD2" x1="0" y1="0" x2="1" y2="1"><stop offset="0.4" stop-color="#7fc9b4" stop-opacity="0"/><stop offset="0.7" stop-color="#7fc9b4" stop-opacity="0.8"/><stop offset="1" stop-color="#5fbfa6" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-blob2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.44"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.83" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.01"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="gauge-B-gloss-side3" x1="0" y1="-500" x2="0" y2="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#059390"/><stop offset="1" stop-color="#00615e"/></linearGradient><clipPath id="gauge-B-gloss-clip3"><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z"/></clipPath><linearGradient id="gauge-B-gloss-bev3" x1="0" y1="-1000" x2="0" y2="-920" gradientUnits="userSpaceOnUse" gradientTransform="rotate(36)"><stop offset="0" stop-color="#d6f6f6"/><stop offset="1" stop-color="#8fe0e0"/></linearGradient><linearGradient id="gauge-B-gloss-edge3" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#159e9c" stop-opacity="0"/><stop offset="0.8" stop-color="#159e9c" stop-opacity="0.75"/><stop offset="1" stop-color="#159e9c" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-front3" cx="0" cy="0" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#159e9c"/><stop offset="0.55" stop-color="#3bbfc0"/><stop offset="0.78" stop-color="#3bbfc0"/><stop offset="0.9" stop-color="#8fe0e0"/><stop offset="1" stop-color="#8fe0e0"/></radialGradient><linearGradient id="gauge-B-gloss-chamL3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.35" stop-color="#d6f6f6" stop-opacity="0.55"/><stop offset="0.55" stop-color="#d6f6f6" stop-opacity="0"/></linearGradient><linearGradient id="gauge-B-gloss-chamD3" x1="0" y1="0" x2="1" y2="1"><stop offset="0.4" stop-color="#159e9c" stop-opacity="0"/><stop offset="0.7" stop-color="#159e9c" stop-opacity="0.8"/><stop offset="1" stop-color="#00615e" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-blob3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.44"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.83" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.01"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="gauge-B-gloss-side4" x1="0" y1="-500" x2="0" y2="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0094c6"/><stop offset="1" stop-color="#0079a9"/></linearGradient><clipPath id="gauge-B-gloss-clip4"><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z"/></clipPath><linearGradient id="gauge-B-gloss-bev4" x1="0" y1="-1000" x2="0" y2="-920" gradientUnits="userSpaceOnUse" gradientTransform="rotate(72)"><stop offset="0" stop-color="#9fe3f8"/><stop offset="1" stop-color="#5fd0f2"/></linearGradient><linearGradient id="gauge-B-gloss-edge4" x1="0" y1="0" x2="1" y2="1"><stop offset="0.45" stop-color="#0088bd" stop-opacity="0"/><stop offset="0.8" stop-color="#0088bd" stop-opacity="0.75"/><stop offset="1" stop-color="#0088bd" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-front4" cx="0" cy="0" r="1000" gradientUnits="userSpaceOnUse"><stop offset="0.5" stop-color="#0088bd"/><stop offset="0.55" stop-color="#00acdd"/><stop offset="0.78" stop-color="#00acdd"/><stop offset="0.9" stop-color="#5fd0f2"/><stop offset="1" stop-color="#5fd0f2"/></radialGradient><linearGradient id="gauge-B-gloss-chamL4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.35" stop-color="#9fe3f8" stop-opacity="0.55"/><stop offset="0.55" stop-color="#9fe3f8" stop-opacity="0"/></linearGradient><linearGradient id="gauge-B-gloss-chamD4" x1="0" y1="0" x2="1" y2="1"><stop offset="0.4" stop-color="#0088bd" stop-opacity="0"/><stop offset="0.7" stop-color="#0088bd" stop-opacity="0.8"/><stop offset="1" stop-color="#0079a9" stop-opacity="0.95"/></linearGradient><radialGradient id="gauge-B-gloss-blob4" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.44"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="0.72" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.83" stop-color="#ffffff" stop-opacity="0.02"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.01"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="gauge-B-gloss-needle" x1="-72" y1="0" x2="72" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#ffffff"/><stop offset="0.6" stop-color="#f4faff"/><stop offset="1" stop-color="#d9eeff"/></linearGradient><radialGradient id="gauge-B-gloss-pivot" cx="-10" cy="-12" r="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9fe3f8"/><stop offset="0.5" stop-color="#5fd0f2"/><stop offset="0.85" stop-color="#00acdd"/><stop offset="1" stop-color="#0094c6"/></radialGradient><radialGradient id="gauge-B-gloss-shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#002c44" stop-opacity="0.39"/><stop offset="0.25" stop-color="#002c44" stop-opacity="0.31"/><stop offset="0.45" stop-color="#002c44" stop-opacity="0.18"/><stop offset="0.6" stop-color="#002c44" stop-opacity="0.1"/><stop offset="0.72" stop-color="#002c44" stop-opacity="0.05"/><stop offset="0.83" stop-color="#002c44" stop-opacity="0.02"/><stop offset="0.92" stop-color="#002c44" stop-opacity="0"/><stop offset="1" stop-color="#002c44" stop-opacity="0"/></radialGradient><radialGradient id="gauge-B-gloss-foot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#002c44" stop-opacity="0.42"/><stop offset="0.25" stop-color="#002c44" stop-opacity="0.34"/><stop offset="0.45" stop-color="#002c44" stop-opacity="0.2"/><stop offset="0.6" stop-color="#002c44" stop-opacity="0.1"/><stop offset="0.72" stop-color="#002c44" stop-opacity="0.05"/><stop offset="0.83" stop-color="#002c44" stop-opacity="0.02"/><stop offset="0.92" stop-color="#002c44" stop-opacity="0.01"/><stop offset="1" stop-color="#002c44" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="94" rx="1150" ry="100" fill="url(#gauge-B-gloss-shadow)"/><ellipse cx="-750" cy="88" rx="360" ry="62" fill="url(#gauge-B-gloss-foot)"/><ellipse cx="750" cy="88" rx="360" ry="62" fill="url(#gauge-B-gloss-foot)"/><g transform="translate(16 26)" fill="#002c44" stroke="#002c44" stroke-linejoin="round"><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="64"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="48"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="32"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="16"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/></g><g data-k="seg0"><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-999.5,54A1000 1000 0 0 1 -863.5,-420.3Q-848,-446 -823.7,-428.4L-465.8,-168.3Q-441.5,-150.7 -454.8,-123.8A500 500 0 0 0 -499.1,54Q-500,84 -530,84L-970,84Q-1000,84 -999.5,54Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3L-863.5,-420.3A1000 1000 0 0 0 -999.5,54Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-863.5,-504.3Q-848,-530 -823.7,-512.4L-823.7,-428.4Q-848,-446 -863.5,-420.3Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-823.7,-512.4L-465.8,-252.3L-465.8,-168.3L-823.7,-428.4Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-465.8,-252.3Q-450.1,-240.9 -450.1,-225.6L-450.1,-141.6Q-450.1,-156.9 -465.8,-168.3Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-450.1,-225.6Q-450.1,-217.3 -454.8,-207.8L-454.8,-123.8Q-450.1,-133.3 -450.1,-141.6Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-454.8,-207.8A500 500 0 0 0 -499.1,-30L-499.1,54A500 500 0 0 1 -454.8,-123.8Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-499.1,-30Q-500,-0 -530,-0L-530,84Q-500,84 -499.1,54Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-530,-0L-970,-0L-970,84L-530,84Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-970,-0Q-999.6,-0 -999.6,-29.1L-999.6,54.9Q-999.6,84 -970,84Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-999.6,-29.1Q-999.6,-29.6 -999.5,-30L-999.5,54Q-999.6,54.5 -999.6,54.9Z" fill="url(#gauge-B-gloss-side0)" stroke="url(#gauge-B-gloss-side0)" stroke-width="1.5"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill="url(#gauge-B-gloss-front0)"/><g clip-path="url(#gauge-B-gloss-clip0)"><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill="none" stroke="url(#gauge-B-gloss-chamD0)" stroke-width="60"/><path d="M-999.5,-30A1000 1000 0 0 1 -863.5,-504.3Q-848,-530 -823.7,-512.4L-465.8,-252.3Q-441.5,-234.7 -454.8,-207.8A500 500 0 0 0 -499.1,-30Q-500,-0 -530,-0L-970,-0Q-1000,-0 -999.5,-30Z" fill="none" stroke="url(#gauge-B-gloss-chamL0)" stroke-width="48"/><path d="M-1008.6,52.9A1010 1010 0 0 1 -784.9,-635.6L-729,-590.3A938 938 0 0 0 -936.7,49.1Z" fill="url(#gauge-B-gloss-bev0)" opacity=".55"/><ellipse cx="-774.9" cy="-198.9" rx="170" ry="70" transform="rotate(-75.6 -774.9 -198.9)" fill="url(#gauge-B-gloss-blob0)"/></g><path d="M-953.2,-96.2A958 958 0 0 1 -911.1,-296" fill="none" stroke="#ffffff" stroke-opacity="0.95" stroke-width="16" stroke-linecap="round"/><ellipse cx="-877.9" cy="-373.4" rx="14.4" ry="8.8" transform="rotate(-67 -877.9 -373.4)" fill="#ffffff" opacity="0.95"/><g data-k="glint0" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round"><path d="M-953.2,-96.2A958 958 0 0 1 -911.1,-296" stroke-width="40" stroke-opacity=".3"/><path d="M-953.2,-96.2A958 958 0 0 1 -911.1,-296" stroke-width="18" stroke-opacity=".75"/></g></g><g data-k="seg1"><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-746.5,-581.4A1000 1000 0 0 1 -386.7,-838.2Q-358.9,-849.4 -349.6,-820.9L-213.2,-401.1Q-203.9,-372.5 -230.9,-359.5A500 500 0 0 0 -338.1,-284.3Q-359.6,-263.4 -383.9,-281L-741.8,-541.1Q-766.1,-558.7 -746.5,-581.4Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2L-386.7,-838.2A1000 1000 0 0 0 -746.5,-581.4Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-349.6,-820.9Q-358.9,-849.4 -386.7,-838.2Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-349.6,-904.9L-213.2,-485.1L-213.2,-401.1L-349.6,-820.9Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-213.2,-485.1Q-210.8,-477.8 -210.8,-471.5L-210.8,-387.5Q-210.8,-393.8 -213.2,-401.1Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-210.8,-471.5Q-210.8,-453.2 -230.9,-443.5L-230.9,-359.5Q-210.8,-369.2 -210.8,-387.5Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-230.9,-443.5A500 500 0 0 0 -338.1,-368.3L-338.1,-284.3A500 500 0 0 1 -230.9,-359.5Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-338.1,-368.3Q-359.6,-347.4 -383.9,-365L-383.9,-281Q-359.6,-263.4 -338.1,-284.3Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-383.9,-365L-741.8,-625.1L-741.8,-541.1L-383.9,-281Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-741.8,-625.1Q-755.2,-634.9 -755.2,-646.1L-755.2,-562.1Q-755.2,-550.9 -741.8,-541.1Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-755.2,-646.1Q-755.2,-655.3 -746.5,-665.4L-746.5,-581.4Q-755.2,-571.3 -755.2,-562.1Z" fill="url(#gauge-B-gloss-side1)" stroke="url(#gauge-B-gloss-side1)" stroke-width="1.5"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill="url(#gauge-B-gloss-front1)"/><g clip-path="url(#gauge-B-gloss-clip1)"><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill="none" stroke="url(#gauge-B-gloss-chamD1)" stroke-width="60"/><path d="M-746.5,-665.4A1000 1000 0 0 1 -386.7,-922.2Q-358.9,-933.4 -349.6,-904.9L-213.2,-485.1Q-203.9,-456.5 -230.9,-443.5A500 500 0 0 0 -338.1,-368.3Q-359.6,-347.4 -383.9,-365L-741.8,-625.1Q-766.1,-642.7 -746.5,-665.4Z" fill="none" stroke="url(#gauge-B-gloss-chamL1)" stroke-width="48"/><path d="M-847.1,-550.1A1010 1010 0 0 1 -261.4,-975.6L-242.8,-906A938 938 0 0 0 -786.7,-510.9Z" fill="url(#gauge-B-gloss-bev1)" opacity=".55"/><ellipse cx="-509.9" cy="-616.4" rx="170" ry="70" transform="rotate(-39.6 -509.9 -616.4)" fill="url(#gauge-B-gloss-blob1)"/></g><path d="M-714.6,-638A958 958 0 0 1 -563.1,-775" fill="none" stroke="#ffffff" stroke-opacity="0.95" stroke-width="16" stroke-linecap="round"/><ellipse cx="-490.8" cy="-818.1" rx="14.4" ry="8.8" transform="rotate(-31 -490.8 -818.1)" fill="#ffffff" opacity="0.95"/><g data-k="glint1" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round"><path d="M-714.6,-638A958 958 0 0 1 -563.1,-775" stroke-width="40" stroke-opacity=".3"/><path d="M-714.6,-638A958 958 0 0 1 -563.1,-775" stroke-width="18" stroke-opacity=".75"/></g></g><g data-k="seg2"><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-229.2,-889.4A1000 1000 0 0 1 229.2,-889.4Q258.3,-882.1 249,-853.5L112.6,-433.7Q103.3,-405.2 73.8,-410.5A500 500 0 0 0 -73.8,-410.5Q-103.3,-405.2 -112.6,-433.7L-249,-853.5Q-258.3,-882.1 -229.2,-889.4Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4L229.2,-889.4A1000 1000 0 0 0 -229.2,-889.4Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M229.2,-973.4Q251.3,-967.8 251.3,-950.1L251.3,-866.1Q251.3,-883.8 229.2,-889.4Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M251.3,-950.1Q251.3,-944.4 249,-937.5L249,-853.5Q251.3,-860.4 251.3,-866.1Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M249,-937.5L112.6,-517.7L112.6,-433.7L249,-853.5Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M112.6,-517.7Q103.3,-489.2 73.8,-494.5L73.8,-410.5Q103.3,-405.2 112.6,-433.7Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M73.8,-494.5A500 500 0 0 0 -73.8,-494.5L-73.8,-410.5A500 500 0 0 1 73.8,-410.5Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-112.6,-433.7Q-103.3,-405.2 -73.8,-410.5Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-112.6,-517.7L-249,-937.5L-249,-853.5L-112.6,-433.7Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-249,-937.5Q-251.3,-944.4 -251.3,-950.1L-251.3,-866.1Q-251.3,-860.4 -249,-853.5Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-251.3,-950.1Q-251.3,-967.8 -229.2,-973.4L-229.2,-889.4Q-251.3,-883.8 -251.3,-866.1Z" fill="url(#gauge-B-gloss-side2)" stroke="url(#gauge-B-gloss-side2)" stroke-width="1.5"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill="url(#gauge-B-gloss-front2)"/><g clip-path="url(#gauge-B-gloss-clip2)"><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill="none" stroke="url(#gauge-B-gloss-chamD2)" stroke-width="60"/><path d="M-229.2,-973.4A1000 1000 0 0 1 229.2,-973.4Q258.3,-966.1 249,-937.5L112.6,-517.7Q103.3,-489.2 73.8,-494.5A500 500 0 0 0 -73.8,-494.5Q-103.3,-489.2 -112.6,-517.7L-249,-937.5Q-258.3,-966.1 -229.2,-973.4Z" fill="none" stroke="url(#gauge-B-gloss-chamL2)" stroke-width="48"/><path d="M-361.9,-942.9A1010 1010 0 0 1 361.9,-942.9L336.1,-875.7A938 938 0 0 0 -336.1,-875.7Z" fill="url(#gauge-B-gloss-bev2)" opacity=".55"/><ellipse cx="-50.2" cy="-798.4" rx="170" ry="70" transform="rotate(-3.6 -50.2 -798.4)" fill="url(#gauge-B-gloss-blob2)"/></g><path d="M-203.1,-936.2A958 958 0 0 1 0,-958" fill="none" stroke="#ffffff" stroke-opacity="0.95" stroke-width="16" stroke-linecap="round"/><ellipse cx="83.8" cy="-950.3" rx="14.4" ry="8.8" transform="rotate(5 83.8 -950.3)" fill="#ffffff" opacity="0.95"/><g data-k="glint2" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round"><path d="M-203.1,-936.2A958 958 0 0 1 0,-958" stroke-width="40" stroke-opacity=".3"/><path d="M-203.1,-936.2A958 958 0 0 1 0,-958" stroke-width="18" stroke-opacity=".75"/></g></g><g data-k="seg3"><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M386.7,-838.2A1000 1000 0 0 1 746.5,-581.4Q766.1,-558.7 741.8,-541.1L383.9,-281Q359.6,-263.4 338.1,-284.3A500 500 0 0 0 230.9,-359.5Q203.9,-372.5 213.2,-401.1L349.6,-820.9Q358.9,-849.4 386.7,-838.2Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4L746.5,-581.4A1000 1000 0 0 0 386.7,-838.2Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M746.5,-665.4Q755.2,-655.3 755.2,-646.1L755.2,-562.1Q755.2,-571.3 746.5,-581.4Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M755.2,-646.1Q755.2,-634.9 741.8,-625.1L741.8,-541.1Q755.2,-550.9 755.2,-562.1Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M741.8,-625.1L383.9,-365L383.9,-281L741.8,-541.1Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M383.9,-365Q359.6,-347.4 338.1,-368.3L338.1,-284.3Q359.6,-263.4 383.9,-281Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M338.1,-368.3A500 500 0 0 0 230.9,-443.5L230.9,-359.5A500 500 0 0 1 338.1,-284.3Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M230.9,-443.5Q210.8,-453.2 210.8,-471.5L210.8,-387.5Q210.8,-369.2 230.9,-359.5Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M210.8,-471.5Q210.8,-477.8 213.2,-485.1L213.2,-401.1Q210.8,-393.8 210.8,-387.5Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M213.2,-485.1L349.6,-904.9L349.6,-820.9L213.2,-401.1Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M349.6,-904.9Q358.9,-933.4 386.7,-922.2L386.7,-838.2Q358.9,-849.4 349.6,-820.9Z" fill="url(#gauge-B-gloss-side3)" stroke="url(#gauge-B-gloss-side3)" stroke-width="1.5"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill="url(#gauge-B-gloss-front3)"/><g clip-path="url(#gauge-B-gloss-clip3)"><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill="none" stroke="url(#gauge-B-gloss-chamD3)" stroke-width="60"/><path d="M386.7,-922.2A1000 1000 0 0 1 746.5,-665.4Q766.1,-642.7 741.8,-625.1L383.9,-365Q359.6,-347.4 338.1,-368.3A500 500 0 0 0 230.9,-443.5Q203.9,-456.5 213.2,-485.1L349.6,-904.9Q358.9,-933.4 386.7,-922.2Z" fill="none" stroke="url(#gauge-B-gloss-chamL3)" stroke-width="48"/><path d="M261.4,-975.6A1010 1010 0 0 1 847.1,-550.1L786.7,-510.9A938 938 0 0 0 242.8,-906Z" fill="url(#gauge-B-gloss-bev3)" opacity=".55"/><ellipse cx="428.7" cy="-675.5" rx="170" ry="70" transform="rotate(32.4 428.7 -675.5)" fill="url(#gauge-B-gloss-blob3)"/></g><path d="M386,-876.8A958 958 0 0 1 563.1,-775" fill="none" stroke="#ffffff" stroke-opacity="0.95" stroke-width="16" stroke-linecap="round"/><ellipse cx="626.4" cy="-719.6" rx="14.4" ry="8.8" transform="rotate(41 626.4 -719.6)" fill="#ffffff" opacity="0.95"/><g data-k="glint3" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round"><path d="M386,-876.8A958 958 0 0 1 563.1,-775" stroke-width="40" stroke-opacity=".3"/><path d="M386,-876.8A958 958 0 0 1 563.1,-775" stroke-width="18" stroke-opacity=".75"/></g></g><g data-k="seg4"><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M863.5,-420.3A1000 1000 0 0 1 999.5,54Q1000,84 970,84L530,84Q500,84 499.1,54A500 500 0 0 0 454.8,-123.8Q441.5,-150.7 465.8,-168.3L823.7,-428.4Q848,-446 863.5,-420.3Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30L999.5,54A1000 1000 0 0 0 863.5,-420.3Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M999.5,-30Q999.6,-29.6 999.6,-29.1L999.6,54.9Q999.6,54.5 999.5,54Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M999.6,-29.1Q999.6,0 970,0L970,84Q999.6,84 999.6,54.9Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M970,0L530,0L530,84L970,84Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M530,0Q500,-0 499.1,-30L499.1,54Q500,84 530,84Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M499.1,-30A500 500 0 0 0 454.8,-207.8L454.8,-123.8A500 500 0 0 1 499.1,54Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M454.8,-207.8Q450.1,-217.3 450.1,-225.6L450.1,-141.6Q450.1,-133.3 454.8,-123.8Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M450.1,-225.6Q450.1,-240.9 465.8,-252.3L465.8,-168.3Q450.1,-156.9 450.1,-141.6Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M465.8,-252.3L823.7,-512.4L823.7,-428.4L465.8,-168.3Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M823.7,-512.4Q848,-530 863.5,-504.3L863.5,-420.3Q848,-446 823.7,-428.4Z" fill="url(#gauge-B-gloss-side4)" stroke="url(#gauge-B-gloss-side4)" stroke-width="1.5"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill="url(#gauge-B-gloss-front4)"/><g clip-path="url(#gauge-B-gloss-clip4)"><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill="none" stroke="url(#gauge-B-gloss-chamD4)" stroke-width="60"/><path d="M863.5,-504.3A1000 1000 0 0 1 999.5,-30Q1000,-0 970,0L530,0Q500,-0 499.1,-30A500 500 0 0 0 454.8,-207.8Q441.5,-234.7 465.8,-252.3L823.7,-512.4Q848,-530 863.5,-504.3Z" fill="none" stroke="url(#gauge-B-gloss-chamL4)" stroke-width="48"/><path d="M784.9,-635.6A1010 1010 0 0 1 1008.6,52.9L936.7,49.1A938 938 0 0 0 729,-590.3Z" fill="url(#gauge-B-gloss-bev4)" opacity=".55"/><ellipse cx="743.8" cy="-294.5" rx="170" ry="70" transform="rotate(68.4 743.8 -294.5)" fill="url(#gauge-B-gloss-blob4)"/></g><path d="M827.6,-482.5A958 958 0 0 1 911.1,-296" fill="none" stroke="#ffffff" stroke-opacity="0.95" stroke-width="16" stroke-linecap="round"/><ellipse cx="929.7" cy="-213.9" rx="14.4" ry="8.8" transform="rotate(77 929.7 -213.9)" fill="#ffffff" opacity="0.95"/><g data-k="glint4" opacity="0" fill="none" stroke="#ffffff" stroke-linecap="round"><path d="M827.6,-482.5A958 958 0 0 1 911.1,-296" stroke-width="40" stroke-opacity=".3"/><path d="M827.6,-482.5A958 958 0 0 1 911.1,-296" stroke-width="18" stroke-opacity=".75"/></g></g><g transform="translate(40 52)"><g data-k="needle-shadow" transform="rotate(-29)" fill="#002c44" stroke="#002c44" stroke-linejoin="round"><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="70"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="56"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="42"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="28"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="14"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill-opacity="0.04" stroke-opacity="0.04" stroke-width="0"/></g></g><g data-k="needle" data-pivot="0 0" transform="rotate(-29)"><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" transform="translate(9 10)" fill="#a9d3ef"/><path d="M-71.4,-9.3L-16.9,-427.2A17 17 0 0 1 16.9,-427.2L71.4,-9.3A72 72 0 1 1 -71.4,-9.3Z" fill="url(#gauge-B-gloss-needle)"/></g><g data-k="pivot"><circle cx="7" cy="9" r="38" fill="#0079a9"/><circle r="38" fill="url(#gauge-B-gloss-pivot)"/><ellipse cx="-12" cy="-13" rx="10" ry="6" transform="rotate(-35 -12 -13)" fill="#ffffff"/></g>`

// Each segment pops about its own middle (as in ATMGauge)
const SEG_ORIGIN = BANDS.map((_, i) => {
    const a = ((162 - 36 * i) * Math.PI) / 180
    return `${Math.round(750 * Math.cos(a))} ${Math.round(-750 * Math.sin(a) + 42)}`
})

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

type View = "Start" | "Finale"

interface Props {
    canvasView: View
    swipeHint: string
    yes: string
    no: string
    finale: string
    done: string
    doneLink: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 920
 * @framerIntrinsicHeight 1150
 */
export default function ATMCreditScoreChallenge(props: Props) {
    // keyed on the canvas view, so switching it on the canvas starts over in that view
    return <Challenge key={props.canvasView} {...props} />
}

function Challenge(props: Props) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const showFinale = isCanvas && props.canvasView === "Finale"
    const reduceMotion = useReducedMotion()
    const uid = "cs" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(
        () =>
            ART.replace(/id="/g, `id="${uid}-`).replace(
                /url\(#/g,
                `url(#${uid}-`
            ),
        [uid]
    )
    const [score, setScore] = React.useState(showFinale ? 790 : START)
    const [shown, setShown] = React.useState(showFinale ? 790 : START) // the number as it counts
    const [deck, setDeck] = React.useState<Turn[]>(FIRST_DECK)
    const [missed, setMissed] = React.useState<number[]>([])
    const [chip, setChip] = React.useState<{
        id: number
        text: string
        up: boolean
    } | null>(null)
    const [why, setWhy] = React.useState("")
    const [touched, setTouched] = React.useState(isCanvas)
    const [finished, setFinished] = React.useState(showFinale)
    const [finaleTop, setFinaleTop] = React.useState<number | null>(null)
    const rootRef = React.useRef<HTMLDivElement>(null)
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const hudRef = React.useRef<HTMLDivElement>(null)
    const cardRef = React.useRef<HTMLDivElement>(null)
    const doStampRef = React.useRef<HTMLDivElement>(null)
    const skipStampRef = React.useRef<HTMLDivElement>(null)
    const chipRef = React.useRef<HTMLSpanElement>(null)
    const labelRefs = React.useRef<(HTMLSpanElement | null)[]>([])
    const drag = React.useRef<{ x: number; dx: number; id: number } | null>(
        null
    )
    const busy = React.useRef(false) // a card is flying off
    const chips = React.useRef(0)
    const prevScore = React.useRef(score)

    const turn = deck[0]
    const card = turn ? CARDS[turn.c] : undefined
    const band = bandOf(score)

    // Framer's own page switch (no reload); a plain page load if this Framer version has no router to ask.
    const router = useRouter() as
        | {
              navigate?: (id: string, hash?: string) => void
              routes?: Record<string, { path?: string }>
          }
        | undefined
    const goDone = () => {
        const routes = router?.routes ?? {}
        const find = (path: string) =>
            Object.keys(routes).find((k) => routes[k]?.path === path)
        // A When Done saved on the layer outlives page renames, so a link to no page falls back to the default.
        let path = props.doneLink
        let id = path ? find(path) : undefined
        if (!id) {
            const fallback = ATMCreditScoreChallenge.defaultProps.doneLink
            const fallbackId = find(fallback)
            if (fallbackId || !path) {
                path = fallback
                id = fallbackId
            }
        }
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }

    // The needle springs to the score (with a little wobble on a drop), the number counts, and the segment it
    // lands on pops. Crossing into a new band also sweeps the glint across the segments.
    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg) return
        const from = prevScore.current
        prevScore.current = score
        const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
        const needle = [q("needle"), q("needle-shadow")].filter(Boolean)
        const rot = needleAt(score)
        if (from === score || reduceMotion) {
            gsap.set(needle, { svgOrigin: "0 0", rotation: rot })
            setShown(score)
            return
        }
        const up = score > from
        const tl = gsap.timeline()
        const n = { v: from }
        const count = gsap.to(n, {
            v: score,
            duration: 0.7,
            ease: "power2.out",
            onUpdate: () => setShown(Math.round(n.v)),
        })
        {
            tl.to(needle, {
                svgOrigin: "0 0",
                rotation: rot,
                duration: up ? 0.9 : 0.5,
                ease: up ? "back.out(1.8)" : "power3.in",
            })
            if (!up)
                tl.to(needle, {
                    keyframes: [
                        { rotation: rot + 4, duration: 0.08 },
                        { rotation: rot - 3, duration: 0.1 },
                        { rotation: rot, duration: 0.14 },
                    ],
                    ease: "sine.inOut",
                })
            const seg = q(`seg${bandOf(score)}`)
            if (seg)
                tl.fromTo(
                    seg,
                    { svgOrigin: SEG_ORIGIN[bandOf(score)], scale: 1 },
                    {
                        scale: 1.05,
                        duration: 0.12,
                        ease: "power2.out",
                        yoyo: true,
                        repeat: 1,
                    },
                    up ? 0.45 : 0.5
                )
            if (bandOf(score) !== bandOf(from))
                BANDS.forEach((_, i) => {
                    const glint = q(`glint${i}`)
                    if (glint)
                        tl.fromTo(
                            glint,
                            { opacity: 0 },
                            {
                                opacity: 0.85,
                                duration: 0.22,
                                ease: "sine.inOut",
                                yoyo: true,
                                repeat: 1,
                            },
                            0.5 + 0.12 * i
                        )
                })
        }
        // stopped where it is (not reverted), so a quick next choice carries on from there
        return () => {
            tl.kill()
            count.kill()
        }
    }, [score, markup])

    // The band name the needle has just moved into pops.
    React.useLayoutEffect(() => {
        if (reduceMotion || isCanvas) return
        labelRefs.current[band]?.animate(
            [{ transform: "scale(1.25)" }, { transform: "none" }],
            { duration: 500, delay: 450, easing: "cubic-bezier(.3,1.6,.6,1)" }
        )
    }, [band])

    // The chip floats up from the score and fades.
    React.useLayoutEffect(() => {
        if (!chip || reduceMotion) return
        chipRef.current?.animate(
            [
                { transform: "translate(-50%, 1.5cqw) scale(.8)", opacity: 0 },
                {
                    transform: "translate(-50%, 0) scale(1)",
                    opacity: 1,
                    offset: 0.12,
                },
                {
                    transform: "translate(-50%, -1cqw)",
                    opacity: 1,
                    offset: 0.75,
                },
                { transform: "translate(-50%, -3cqw)", opacity: 0 },
            ],
            { duration: 2200, easing: "ease-out", fill: "forwards" }
        )
    }, [chip])

    // Until the first touch the card nudges right and back, so kids know it moves.
    React.useEffect(() => {
        const el = cardRef.current
        if (touched || reduceMotion || !el) return
        const anim = el.animate(
            [
                { transform: "none" },
                { transform: "translateX(4cqw) rotate(3deg)", offset: 0.12 },
                {
                    transform: "translateX(-2cqw) rotate(-1.5deg)",
                    offset: 0.26,
                },
                { transform: "none", offset: 0.38 },
                { transform: "none" },
            ],
            { duration: 2400, iterations: Infinity, easing: "ease-in-out" }
        )
        return () => anim.cancel()
    }, [touched, reduceMotion])

    // Each new top card comes forward from the stack.
    React.useLayoutEffect(() => {
        if (reduceMotion || isCanvas || !card) return
        cardRef.current?.animate(
            [
                { transform: "translateY(3cqw) scale(.94)", opacity: 0.6 },
                { transform: "none", opacity: 1 },
            ],
            { duration: 320, easing: "cubic-bezier(.2,.9,.3,1.15)" }
        )
    }, [deck])

    // The finale: the cards clear and the gauge glides down to the middle, with the finale line and Done under it.
    React.useLayoutEffect(() => {
        const root = rootRef.current
        const hud = hudRef.current
        if (!finished || !root || !hud) return
        const below = root.querySelector<HTMLElement>("[data-finale]")
        const block = hud.offsetHeight + (below?.offsetHeight ?? 0)
        const top = Math.max(0, (root.offsetHeight - block) / 2)
        setFinaleTop(top + hud.offsetHeight)
        if (reduceMotion || showFinale) {
            hud.style.transform = `translateY(${top}px)`
            return
        }
        root.querySelectorAll<HTMLElement>("[data-fade]").forEach((el) =>
            el.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 300,
                easing: "ease-out",
            })
        )
        const anim = hud.animate(
            [{ transform: "none" }, { transform: `translateY(${top}px)` }],
            {
                duration: 700,
                delay: 250,
                easing: "cubic-bezier(.32,.72,0,1)",
                fill: "forwards",
            }
        )
        return () => anim.cancel()
    }, [finished])

    const stamps = (dx: number) => {
        const w = cardRef.current?.offsetWidth || 1
        if (doStampRef.current)
            doStampRef.current.style.opacity = String(
                Math.max(0, Math.min(1, dx / (w * 0.25)))
            )
        if (skipStampRef.current)
            skipStampRef.current.style.opacity = String(
                Math.max(0, Math.min(1, -dx / (w * 0.25)))
            )
    }

    // A choice: the card flies off that way, then the score, chip and why line follow and the next card comes up.
    const choose = (pick: "do" | "skip") => {
        const el = cardRef.current
        if (!card || !turn || busy.current || finished) return
        setTouched(true)
        busy.current = true
        const ok = pick === card.go
        const settle = () => {
            busy.current = false
            const next = score + (ok ? GAIN : -card.cost)
            const nowMissed = ok ? missed : [...missed, turn.c]
            let rest = deck.slice(1)
            // The deck's done: under the goal, the cards they got wrong come back reworded (all of them if none were)
            if (!rest.length && next < GOAL) {
                rest = (
                    nowMissed.length ? nowMissed : CARDS.map((_, c) => c)
                ).map((c) => ({ c, again: true }))
                setMissed([])
            } else setMissed(nowMissed)
            setScore(next)
            setDeck(rest)
            setChip({
                id: ++chips.current,
                text: `${ok ? card.right : card.wrong} ${ok ? "+" : "−"}${ok ? GAIN : card.cost}`,
                up: ok,
            })
            setWhy(ok ? card.rightWhy : card.wrongWhy)
            if (!rest.length) setFinished(true)
        }
        if (!el || reduceMotion) return settle()
        const dir = pick === "do" ? 1 : -1
        const from = el.style.transform || "none"
        el.getAnimations().forEach((a) => a.cancel())
        el.style.transform = from
        // it stays off-screen until the next card replaces it, so it never flashes back
        el.animate(
            [
                { transform: from },
                {
                    transform: `translateX(${dir * 130}%) rotate(${dir * 18}deg)`,
                },
            ],
            {
                duration: 320,
                easing: "cubic-bezier(.4,0,.8,.6)",
                fill: "forwards",
            }
        ).onfinish = settle
    }

    const display = '"P22 Mackinac ExtraBold", "P22 Mackinac Bold", serif'
    const black = '"Area Normal Black", sans-serif'
    const label: React.CSSProperties = {
        fontFamily: black,
        fontSize: "3.2cqw",
        letterSpacing: "0.15cqw",
        paddingLeft: "0.15cqw", // letter spacing also trails the last letter; this evens it so the text is centred
        textTransform: "uppercase",
        lineHeight: 1,
        color: MINT,
        marginBottom: "1.2cqw",
    }
    const big: React.CSSProperties = {
        fontFamily: display,
        fontSize: "7.4cqw",
        lineHeight: 1,
    }
    const pill: React.CSSProperties = {
        all: "unset",
        cursor: "pointer",
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "10.6cqw", // 97px at 920 wide: a full touch target
        boxSizing: "border-box",
        paddingBottom: "0.22cqw", // the font sits low, so this centres the label
        borderRadius: 999,
        fontFamily: black,
        fontSize: "4.2cqw",
        lineHeight: 1,
    }
    const stamp: React.CSSProperties = {
        position: "absolute",
        top: "4cqw",
        padding: "1cqw 2.4cqw",
        borderRadius: "1.6cqw",
        border: "0.6cqw solid",
        fontFamily: black,
        fontSize: "4.6cqw",
        lineHeight: 1,
        letterSpacing: "0.2cqw",
        opacity: 0,
        pointerEvents: "none",
    }
    const fade: React.CSSProperties = {
        opacity: finished ? 0 : 1,
        pointerEvents: finished ? "none" : undefined,
    }

    return (
        <div
            ref={rootRef}
            style={
                {
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    containerType: "inline-size", // Framer's CSS types don't list it yet, hence the cast
                    display: "flex",
                    flexDirection: "column",
                    gap: "2.4cqw",
                    color: NAVY,
                    fontFamily: '"Area Normal Bold", sans-serif',
                    userSelect: "none",
                    WebkitUserSelect: "none",
                } as React.CSSProperties
            }
        >
            {/* The heads-up display: band names round the gauge, then the score and the goal */}
            <div
                ref={hudRef}
                style={{
                    flex: "none",
                    position: "relative",
                    zIndex: 2, // the chip floats over the cards
                    borderRadius: "4cqw",
                    padding: "2.4cqw 5cqw 3.4cqw",
                    background: `linear-gradient(160deg, ${NAVY} 30%, ${MIDNIGHT})`,
                    boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(217,238,255,.22), 0 2cqw 5cqw rgba(0,44,68,.22)",
                    color: "#ffffff",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: "56cqw",
                        margin: "7.75cqw auto 0", // as much space above Good as between the blocks and the line
                    }}
                >
                    <svg
                        ref={svgRef}
                        viewBox={VIEWBOX}
                        preserveAspectRatio="xMidYMid meet"
                        style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                            overflow: "visible",
                        }}
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: markup }}
                    />
                    {BANDS.map((b, i) => {
                        const a = ((162 - 36 * i) * Math.PI) / 180
                        const on = i === band
                        const at = BESIDE[Math.min(i, BANDS.length - 1 - i)]
                        const side = !!at
                        const x = at
                            ? Math.sign(Math.cos(a)) * at.x
                            : LABEL_R * Math.cos(a)
                        const y = at ? at.y : -LABEL_R * Math.sin(a)
                        return (
                            <span
                                key={b.name}
                                style={{
                                    position: "absolute",
                                    left: `${((x - VB.x) / VB.w) * 100}%`,
                                    top: `${((y - VB.y) / VB.h) * 100}%`,
                                    // anchored on the side facing the arch, so each name sits clear of it
                                    transform: side
                                        ? `translate(${x < 0 ? -100 : 0}%, -50%)`
                                        : `translate(${-50 + 50 * Math.cos(a)}%, ${-50 - 50 * Math.sin(a)}%)`,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <span
                                    ref={(el) => {
                                        labelRefs.current[i] = el
                                    }}
                                    style={{
                                        display: "grid", // every name in one cell, so each pill is as wide as the widest
                                        justifyItems: "center",
                                        padding: "0.9cqw 1.8cqw 1.1cqw 1.95cqw", // 0.15cqw more on the left for the trailing letter spacing
                                        borderRadius: 999,
                                        background: on
                                            ? YOLK
                                            : "rgba(255,255,255,.06)",
                                        boxShadow: on
                                            ? "none"
                                            : "inset 0 0 0 0.3cqw rgba(188,226,215,.45)", // a mint frame
                                        fontFamily: black,
                                        fontSize: "2.7cqw",
                                        lineHeight: 1,
                                        letterSpacing: "0.15cqw",
                                        textTransform: "uppercase",
                                        color: on ? MIDNIGHT : MINT,
                                    }}
                                >
                                    {BANDS.map((o) => (
                                        <span
                                            key={o.name}
                                            aria-hidden={o !== b}
                                            style={{
                                                gridArea: "1 / 1",
                                                visibility:
                                                    o === b
                                                        ? "visible"
                                                        : "hidden",
                                            }}
                                        >
                                            {o.name}
                                        </span>
                                    ))}
                                </span>
                            </span>
                        )
                    })}
                </div>
                <div
                    style={{
                        height: 1,
                        margin: "0.25cqw 0 2.4cqw", // the drawing has empty room under the blocks
                        background: "rgba(217,238,255,.22)",
                    }}
                />
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1px 1fr", // two equal halves, so the divider sits in the middle
                        alignItems: "end",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}
                >
                    <div style={{ position: "relative" }}>
                        <div style={label}>Your score</div>
                        <div style={{ ...big, color: YOLK }}>{shown}</div>
                        {chip && (
                            <span
                                key={chip.id}
                                ref={chipRef}
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: "calc(100% + 1.4cqw)",
                                    transform: "translate(-50%, 0)",
                                    opacity: reduceMotion ? 1 : 0,
                                    padding: "1.2cqw 2.4cqw 1.4cqw",
                                    borderRadius: 999,
                                    background: chip.up ? TEAL : CORAL,
                                    color: "#ffffff",
                                    fontFamily: black,
                                    fontSize: "3.4cqw",
                                    lineHeight: 1,
                                    boxShadow: "0 1cqw 2.4cqw rgba(0,0,0,.25)",
                                }}
                            >
                                {chip.text}
                            </span>
                        )}
                    </div>
                    <span
                        style={{
                            alignSelf: "stretch",
                            width: 1,
                            background: "rgba(217,238,255,.22)",
                        }}
                    />
                    <div>
                        <div style={label}>Goal</div>
                        <div style={big}>{GOAL}</div>
                    </div>
                </div>
            </div>

            {/* The card stack: a blank card behind the one to swipe */}
            <div
                data-fade=""
                style={{ ...fade, flex: 1, minHeight: 0, position: "relative" }}
            >
                {deck.length > 1 && (
                    <div
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            inset: "3cqw 4cqw 0",
                            borderRadius: "4cqw",
                            background: "#ffffff",
                            opacity: 0.6,
                            transform: "translateY(3cqw) scale(.94)",
                        }}
                    />
                )}
                {card && turn && (
                    <div
                        key={`${turn.c}-${turn.again}-${deck.length}`}
                        ref={cardRef}
                        role="group"
                        aria-label={`${turn.again ? card.again[0] : card.story} ${turn.again ? card.again[1] : card.ask}`}
                        onPointerDown={(e) => {
                            if (busy.current) return
                            e.currentTarget.setPointerCapture(e.pointerId)
                            e.currentTarget
                                .getAnimations()
                                .forEach((a) => a.cancel())
                            setTouched(true)
                            drag.current = {
                                x: e.clientX,
                                dx: 0,
                                id: e.pointerId,
                            }
                        }}
                        onPointerMove={(e) => {
                            const d = drag.current
                            if (!d || d.id !== e.pointerId) return
                            d.dx = e.clientX - d.x
                            e.currentTarget.style.transform = `translateX(${d.dx}px) rotate(${d.dx * 0.04}deg)`
                            stamps(d.dx)
                        }}
                        onPointerUp={(e) => {
                            const d = drag.current
                            drag.current = null
                            if (!d) return
                            const el = e.currentTarget
                            if (Math.abs(d.dx) > el.offsetWidth * 0.25)
                                return choose(d.dx > 0 ? "do" : "skip")
                            // not far enough: it springs back
                            const from = el.style.transform
                            el.style.transform = ""
                            stamps(0)
                            if (from && !reduceMotion)
                                el.animate(
                                    [
                                        { transform: from },
                                        { transform: "none" },
                                    ],
                                    {
                                        duration: 380,
                                        easing: "cubic-bezier(.3,1.5,.6,1)",
                                    }
                                )
                        }}
                        onPointerCancel={(e) => {
                            drag.current = null
                            e.currentTarget.style.transform = ""
                            stamps(0)
                        }}
                        style={{
                            position: "absolute",
                            inset: "0 0 3cqw",
                            borderRadius: "4cqw",
                            background: "#ffffff",
                            border: `0.5cqw solid ${TEAL}`,
                            boxShadow: "0 1.2cqw 6cqw rgba(0,44,68,.08)", // soft (owner)
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3cqw",
                            padding: "4cqw 6cqw",
                            boxSizing: "border-box",
                            textAlign: "center",
                            cursor: "grab",
                            touchAction: "none",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: black,
                                fontSize: "4.4cqw",
                                lineHeight: 1.3,
                                color: TEAL,
                            }}
                        >
                            {turn.again ? card.again[0] : card.story}
                        </div>
                        <div
                            style={
                                {
                                    fontFamily: display,
                                    fontSize: "6cqw",
                                    lineHeight: 1.15,
                                    color: MIDNIGHT,
                                    textWrap: "balance",
                                } as React.CSSProperties
                            }
                        >
                            {turn.again ? card.again[1] : card.ask}
                        </div>
                        <div
                            ref={doStampRef}
                            style={{
                                ...stamp,
                                left: "4cqw",
                                color: TEAL,
                                transform: "rotate(-12deg)",
                            }}
                        >
                            YES
                        </div>
                        <div
                            ref={skipStampRef}
                            style={{
                                ...stamp,
                                right: "4cqw",
                                color: MIDNIGHT,
                                transform: "rotate(12deg)",
                            }}
                        >
                            NO
                        </div>
                    </div>
                )}
            </div>

            <div
                data-fade=""
                style={{ ...fade, flex: "none", display: "flex", gap: "3cqw" }}
            >
                <button
                    type="button"
                    onClick={() => choose("skip")}
                    style={{
                        ...pill,
                        background: "#ffffff",
                        color: MIDNIGHT,
                        boxShadow: `inset 0 0 0 0.4cqw ${MIDNIGHT}`,
                    }}
                >
                    {props.no}
                </button>
                <button
                    type="button"
                    onClick={() => choose("do")}
                    style={{ ...pill, background: TEAL, color: "#ffffff" }}
                >
                    {props.yes}
                </button>
            </div>

            <div
                data-fade=""
                aria-live="polite"
                style={
                    {
                        ...fade,
                        flex: "none",
                        minHeight: "10cqw", // room for two lines, so the cards keep one size
                        padding: "0 2cqw",
                        textAlign: "center",
                        fontSize: "3.7cqw",
                        lineHeight: 1.35,
                        textWrap: "pretty",
                    } as React.CSSProperties
                }
            >
                {why || props.swipeHint}
            </div>

            {/* The finale, under the gauge once it has moved to the middle */}
            {finished && (
                <div
                    data-finale=""
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: finaleTop ?? "100%",
                        visibility: finaleTop === null ? "hidden" : "visible",
                        paddingTop: "5cqw",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "5cqw",
                        textAlign: "center",
                    }}
                >
                    <FadeIn delay={reduceMotion || showFinale ? 0 : 900}>
                        <div
                            style={
                                {
                                    fontFamily: display,
                                    fontSize: "7cqw",
                                    lineHeight: 1.15,
                                    color: MIDNIGHT,
                                    textWrap: "balance",
                                } as React.CSSProperties
                            }
                        >
                            {props.finale.replace("{score}", String(score))}
                        </div>
                    </FadeIn>
                    <FadeIn delay={reduceMotion || showFinale ? 0 : 1300}>
                        <button
                            type="button"
                            onClick={goDone}
                            style={{
                                ...pill,
                                flex: "none",
                                width: "60cqw",
                                background: TEAL,
                                color: "#ffffff",
                            }}
                        >
                            {props.done}
                        </button>
                    </FadeIn>
                </div>
            )}
        </div>
    )
}

// Fades its child in (from a little below) after `delay` ms
function FadeIn({
    delay,
    children,
}: {
    delay: number
    children: React.ReactNode
}) {
    const ref = React.useRef<HTMLDivElement>(null)
    React.useLayoutEffect(() => {
        if (delay)
            ref.current?.animate(
                [
                    { transform: "translateY(3cqw)", opacity: 0 },
                    { transform: "none", opacity: 1 },
                ],
                {
                    duration: 450,
                    delay,
                    easing: "cubic-bezier(.2,.9,.3,1.15)",
                    fill: "backwards",
                }
            )
    }, [])
    return <div ref={ref}>{children}</div>
}

ATMCreditScoreChallenge.defaultProps = {
    canvasView: "Start" as View,
    swipeHint: "Swipe right for yes. Swipe left for no.",
    yes: "Yes",
    no: "No",
    finale: "Congratulations, your score is now {score}!",
    done: "Done",
    doneLink: "/atm-lessons/credit-score-challenge/complete",
}

addPropertyControls(ATMCreditScoreChallenge, {
    canvasView: {
        type: ControlType.Enum,
        title: "Canvas",
        description:
            "What the canvas shows. The live page always starts at the first card.",
        options: ["Start", "Finale"],
        defaultValue: ATMCreditScoreChallenge.defaultProps.canvasView,
    },
    swipeHint: {
        type: ControlType.String,
        title: "Hint",
        displayTextArea: true,
        defaultValue: ATMCreditScoreChallenge.defaultProps.swipeHint,
    },
    no: {
        type: ControlType.String,
        title: "No",
        defaultValue: ATMCreditScoreChallenge.defaultProps.no,
    },
    yes: {
        type: ControlType.String,
        title: "Yes",
        defaultValue: ATMCreditScoreChallenge.defaultProps.yes,
    },
    finale: {
        type: ControlType.String,
        title: "Finale",
        description: "{score} becomes the final score.",
        displayTextArea: true,
        defaultValue: ATMCreditScoreChallenge.defaultProps.finale,
    },
    done: {
        type: ControlType.String,
        title: "Done",
        defaultValue: ATMCreditScoreChallenge.defaultProps.done,
    },
    doneLink: {
        type: ControlType.Link,
        title: "When Done",
        description: "The lesson's completion page.",
        defaultValue: ATMCreditScoreChallenge.defaultProps.doneLink,
    },
})
