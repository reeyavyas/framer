import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// ATM lesson Spot the Scam: three scam messages (a bank text, a delivery email, a prize pop-up), one per round.
// Drag the magnifying glass over the message, or tap a spot to send it there. Under the glass the message shows
// magnified, and a disguised link or sender name shows what it really is. Each clue the glass passes over glows
// egg yolk and keeps a small tag naming it. In round 1 the glass first finds a clue on its own, then hands over.
// Once every clue is found, the glass tours them with a line on why each one is a scam, and Delete shows. Delete
// on the last round goes to the completion page. No background of its own; no red and no countdowns (owner).
//
// The glass is ATMBrowserSearch's magnifier (its `mag` group and the defs it uses, copied from that file's ART).
// Transforms and opacity only; no blur, filters or CSS transitions.

const NAVY = "#002c44"
const MIDNIGHT = "#11232d"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const MINT = "#bce2d7"
const GLACIER = "#d9eeff"

const R = 10 // cqw: the glass opening's short radius on screen
const ZOOM = 1.45 // how much the glass magnifies
const TOUR_STOP = 4500 // ms the tour rests on each clue (a tap moves on sooner)
const HIT = 1 // cqw a clue's box grows by for the glass to count as over it
const DWELL = 350 // ms the glass rests on a clue before it counts

// The opening in the art: an ellipse turned 70°, centred at LENS_X, LENS_Y (art units, the group's offset added)
const LENS_X = 2399
const LENS_Y = 1213
const OPEN_RX = 402
const OPEN_RY = 343
const K = R / OPEN_RY // cqw per art unit
const VB = [1860, 650, 1620, 1830] // the magnifier with its handle
// prettier-ignore
const LENS_ART = `<defs><linearGradient id="g53" x1="0" y1="0" x2="0" y2="1"><stop offset="0.00" stop-color="#d6f0e8"/><stop offset="0.33" stop-color="#bce2d7"/><stop offset="0.67" stop-color="#8fd3c0"/><stop offset="1.00" stop-color="#5fbfa6"/></linearGradient><linearGradient id="g54" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0.00" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.67" stop-color="#5fbfa6" stop-opacity="0"/><stop offset="1.00" stop-color="#5fbfa6" stop-opacity="0.9"/></linearGradient><linearGradient id="g55" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#5fbfa6" stop-opacity="0.75"/><stop offset="0.33" stop-color="#5fbfa6" stop-opacity="0"/><stop offset="0.67" stop-color="#5fbfa6" stop-opacity="0"/><stop offset="1.00" stop-color="#5fbfa6" stop-opacity="0.75"/></linearGradient><mask id="hole56" maskUnits="userSpaceOnUse" x="0" y="0" width="4200" height="2800"><rect width="4200" height="2800" fill="#fff"/><ellipse cx="2349" cy="1283" rx="402" ry="343" transform="rotate(70 2349 1283)" fill="#000"/></mask><linearGradient id="g57" x1="0.1" y1="0" x2="0.35" y2="1"><stop offset="0.00" stop-color="#8fe0e0"/><stop offset="0.33" stop-color="#3bbfc0"/><stop offset="0.67" stop-color="#1fa9a8"/><stop offset="1.00" stop-color="#059390"/></linearGradient><linearGradient id="g58" x1="1" y1="1" x2="0" y2="0"><stop offset="0.00" stop-color="#5fbfa6"/><stop offset="0.50" stop-color="#3fa58c"/><stop offset="1.00" stop-color="#8fd3c0"/></linearGradient><linearGradient id="g59" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#3fa58c" stop-opacity="0.85"/><stop offset="1.00" stop-color="#3fa58c" stop-opacity="0.15"/></linearGradient><linearGradient id="g60" x1="0" y1="0" x2="0.75" y2="0.75"><stop offset="0.00" stop-color="#8fe0e0" stop-opacity="0.6"/><stop offset="0.50" stop-color="#8fe0e0" stop-opacity="0.15"/><stop offset="1.00" stop-color="#8fe0e0" stop-opacity="0"/></linearGradient><linearGradient id="g61" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0.00" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.67" stop-color="#059390" stop-opacity="0"/><stop offset="1.00" stop-color="#059390" stop-opacity="0.9"/></linearGradient><linearGradient id="g62" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0.00" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.67" stop-color="#059390" stop-opacity="0"/><stop offset="1.00" stop-color="#059390" stop-opacity="0.9"/></linearGradient><radialGradient id="s63"><stop offset="0" stop-color="#5fbfa6" stop-opacity="0.700"/><stop offset="0.25" stop-color="#5fbfa6" stop-opacity="0.560"/><stop offset="0.45" stop-color="#5fbfa6" stop-opacity="0.329"/><stop offset="0.6" stop-color="#5fbfa6" stop-opacity="0.175"/><stop offset="0.72" stop-color="#5fbfa6" stop-opacity="0.084"/><stop offset="0.83" stop-color="#5fbfa6" stop-opacity="0.028"/><stop offset="0.92" stop-color="#5fbfa6" stop-opacity="0.008"/><stop offset="1" stop-color="#5fbfa6" stop-opacity="0.000"/></radialGradient><linearGradient id="g64" x1="0" y1="0" x2="0.12" y2="1"><stop offset="0.00" stop-color="#ffcc40"/><stop offset="0.33" stop-color="#f6a11d"/><stop offset="0.67" stop-color="#e08a12"/><stop offset="1.00" stop-color="#c97a0c"/></linearGradient><linearGradient id="g65" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0.00" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.67" stop-color="#c97a0c" stop-opacity="0"/><stop offset="1.00" stop-color="#c97a0c" stop-opacity="0.9"/></linearGradient><linearGradient id="g66" x1="0" y1="0" x2="1" y2="0"><stop offset="0.00" stop-color="#c97a0c" stop-opacity="0.0"/><stop offset="0.50" stop-color="#c97a0c" stop-opacity="0.0"/><stop offset="1.00" stop-color="#c97a0c" stop-opacity="0.45"/></linearGradient></defs><g pointer-events="visiblePainted"><g transform="translate(50 -70)"><g transform="translate(3061 2145) rotate(50.4)"><rect x="-648" y="-62" width="300" height="124" fill="url(#g53)" stroke="url(#g54)" stroke-width="23.0" stroke-linejoin="round"/><rect x="-648" y="-62" width="300" height="124" fill="url(#g55)" /><path d="M-618,-26 H-388" stroke="#ffffff" stroke-width="26" stroke-linecap="round" opacity=".9"/></g><ellipse cx="2380" cy="1320" rx="604" ry="504" transform="rotate(54 2380 1320)" fill="url(#g57)" mask="url(#hole56)"/><ellipse cx="2376" cy="1312" rx="492" ry="412" transform="rotate(54 2380 1320)" fill="url(#g58)" mask="url(#hole56)"/><ellipse cx="2349" cy="1283" rx="416" ry="357" transform="rotate(70 2349 1283)" fill="none" stroke="url(#g59)" stroke-width="30"/><ellipse cx="2349" cy="1283" rx="402" ry="343" transform="rotate(70 2349 1283)" fill="url(#g60)"/><path d="M2100,1323 A281,268 0 0 1 2289,1057" transform="rotate(-20 2349 1283)" fill="none" stroke="#ffffff" stroke-width="44" stroke-linecap="round" opacity=".75"/><circle cx="2479" cy="1073" r="23" fill="#ffffff" opacity=".75"/><path d="M1831,1320 A549,449 0 0 1 2380,871" transform="rotate(54 2380 1320)" fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" opacity=".8"/><path d="M2934,1320 A554,454 0 0 1 2380,1774" transform="rotate(54 2380 1320)" fill="none" stroke="#ffffff" stroke-width="23" stroke-linecap="round" opacity=".6"/><ellipse cx="2020" cy="1020" rx="22" ry="13" transform="rotate(-40 2020 1020)" fill="#ffffff" opacity=".95"/><ellipse cx="2349" cy="1283" rx="402" ry="343" transform="rotate(70 2349 1283)" fill="none" stroke="url(#g61)" stroke-width="23.0" stroke-linejoin="round"/><ellipse cx="2380" cy="1320" rx="604" ry="504" transform="rotate(54 2380 1320)" fill="none" stroke="url(#g62)" stroke-width="23.0" stroke-linejoin="round"/><g transform="translate(3061 2145) rotate(50.4)"><ellipse cx="-358" cy="10" rx="70" ry="123" fill="url(#s63)"/><rect x="-368" y="-154" width="736" height="308" rx="110" fill="url(#g64)" stroke="url(#g65)" stroke-width="23.0" stroke-linejoin="round"/><rect x="-368" y="-154" width="736" height="308" rx="110" fill="url(#g66)"/><path d="M-248,-84 H218" stroke="#ffffff" stroke-width="46" stroke-linecap="round" opacity="0.9"/><ellipse cx="-228" cy="-92" rx="30" ry="16" fill="#ffffff" opacity=".95"/></g></g></g>`

type Clue = { name: string; why: string }
type ClueFn = (i: number, text: string, truth?: string) => React.ReactNode
type Round = {
    clues: Clue[]
    end: string
    view: (c: ClueFn) => React.ReactNode
}

// The messages. Every name, number and address is made up. `c(i, text, truth)` marks clue i; a truth is what the
// glass shows in its place (the real address behind a link or name). A clue can mark more than one phrase.
const black = '"Area Normal Black", sans-serif'
const display = '"P22 Mackinac ExtraBold", "P22 Mackinac Bold", serif'
const bubble: React.CSSProperties = {
    background: GLACIER,
    color: NAVY,
    borderRadius: "1cqw 4cqw 4cqw 4cqw",
    padding: "2.6cqw 4cqw",
    fontSize: "4.2cqw",
    lineHeight: 2.3, // room between lines for the tags
}
const link: React.CSSProperties = { color: TEAL, textDecoration: "underline" }
const ROUNDS: Round[] = [
    {
        clues: [
            {
                name: "Fake urgency",
                why: "Scammers rush you so you don’t stop to think. A real bank gives you time.",
            },
            {
                name: "Unknown sender",
                why: "The name says Your Bank, but the real sender is a number you don’t know.",
            },
            {
                name: "Unknown link",
                why: "The link looks like your bank’s, but it goes to a different site.",
            },
            {
                name: "Asks for your PIN",
                why: "Your bank will never ask for your PIN or password in a message.",
            },
        ],
        end: "Don’t reply and don’t tap the link. Delete it.",
        view: (c) => (
            <div style={{ padding: "4cqw 5cqw 5cqw" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3cqw",
                        marginBottom: "3cqw",
                    }}
                >
                    <Avatar letter="Y" />
                    <div>
                        <div
                            style={{
                                fontFamily: black,
                                fontSize: "4.4cqw",
                                lineHeight: 1.6,
                            }}
                        >
                            {c(1, "Your Bank", "+1 555-014-2290")}
                        </div>
                        <div style={{ fontSize: "3cqw", color: MINT }}>
                            Text message · now
                        </div>
                    </div>
                </div>
                <div style={bubble}>
                    {c(0, "URGENT!")} Your account has been locked because of
                    unusual activity. Verify your details {c(0, "immediately")}{" "}
                    to get back in:{" "}
                    <span style={link}>
                        {c(2, "yourbank.com/unlock", "yourbank-unlock.xyz")}
                    </span>{" "}
                    {c(3, "Reply with your PIN")} to confirm it’s you.
                </div>
            </div>
        ),
    },
    {
        clues: [
            {
                name: "Fake urgency",
                why: "A deadline pushes you to pay before you check. You can track a real package first.",
            },
            {
                name: "Unknown sender",
                why: "The name looks official, but the real address belongs to a strange website.",
            },
            {
                name: "Small fee as bait",
                why: "A tiny fee feels harmless. They want your card number, not the fee.",
            },
            {
                name: "Fake button link",
                why: "A button hides where it goes. This one leads to a fake payment page.",
            },
        ],
        end: "Track packages on the delivery company’s own app. Delete this email.",
        view: (c) => (
            <div style={{ padding: "4cqw 5cqw 5cqw" }}>
                <div
                    style={{
                        background: GLACIER,
                        color: NAVY,
                        borderRadius: "3cqw",
                        padding: "3cqw 4cqw 4cqw",
                    }}
                >
                    <div style={{ fontSize: "3.6cqw", lineHeight: 2.2 }}>
                        <span style={{ fontFamily: black }}>From: </span>
                        {c(
                            1,
                            "Parcel Delivery Service",
                            "notice@pkg-redeliver.co"
                        )}
                    </div>
                    <div style={{ fontSize: "3.6cqw", lineHeight: 2.2 }}>
                        <span style={{ fontFamily: black }}>Subject: </span>
                        Your package is on hold
                    </div>
                    <div
                        style={{
                            height: "0.3cqw",
                            background: "rgba(0,44,68,.15)",
                            margin: "2cqw 0 1.4cqw",
                        }}
                    />
                    <div style={{ fontSize: "4.2cqw", lineHeight: 2.3 }}>
                        We couldn’t deliver your package. Pay a{" "}
                        {c(2, "$2.49 redelivery fee")} {c(0, "within 24 hours")}{" "}
                        or it will go back to the sender.
                    </div>
                    <div
                        style={{
                            display: "inline-block",
                            marginTop: "2.4cqw",
                            padding: "1.4cqw 4cqw",
                            borderRadius: 999,
                            background: TEAL,
                            color: "#ffffff",
                            fontFamily: black,
                            fontSize: "3.8cqw",
                            lineHeight: 1.4,
                        }}
                    >
                        {c(3, "Pay now", "pkg-redeliver.co/pay")}
                    </div>
                </div>
            </div>
        ),
    },
    {
        clues: [
            {
                name: "Fake urgency",
                why: "“Before it’s gone” is pressure. Slow down and close the pop-up.",
            },
            {
                name: "Pop-up you didn’t ask for",
                why: "A surprise prize box is a trick to grab your attention.",
            },
            {
                name: "Too good to be true",
                why: "You didn’t enter a contest, so you didn’t win one. Free money is bait.",
            },
            {
                name: "Asks for your card number",
                why: "A real prize never needs your card number. They’d use it to take your money.",
            },
        ],
        end: "Never type your card number into a surprise pop-up. Delete it.",
        view: (c) => (
            <div style={{ padding: "4cqw 5cqw 5cqw" }}>
                <div
                    style={{
                        background: "rgba(217,238,255,.14)",
                        borderRadius: "3cqw",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.4cqw",
                            padding: "2cqw 3cqw",
                            background: "#3bbfc0",
                        }}
                    >
                        {[YOLK, MINT, GLACIER].map((col) => (
                            <span
                                key={col}
                                style={{
                                    width: "2cqw",
                                    height: "2cqw",
                                    borderRadius: 999,
                                    background: col,
                                }}
                            />
                        ))}
                        <span
                            style={{
                                marginLeft: "2cqw",
                                flex: 1,
                                background: "rgba(255,255,255,.75)",
                                borderRadius: 999,
                                padding: "0.6cqw 2.4cqw",
                                fontSize: "2.8cqw",
                                color: NAVY,
                            }}
                        >
                            www.daily-recipes.com
                        </span>
                    </div>
                    <div style={{ position: "relative", padding: "3cqw 4cqw" }}>
                        {[70, 90, 55, 80].map((w, k) => (
                            <div
                                key={k}
                                style={{
                                    width: `${w}%`,
                                    height: "2.4cqw",
                                    borderRadius: 999,
                                    background: "rgba(217,238,255,.25)",
                                    margin: "2cqw 0",
                                }}
                            />
                        ))}
                        <div
                            style={{
                                position: "absolute",
                                left: "3cqw",
                                right: "15cqw", // clear of the resting glass
                                top: "2cqw",
                                background: "#ffffff",
                                color: NAVY,
                                borderRadius: "3cqw",
                                padding: "3cqw 3cqw 3.4cqw",
                                boxShadow: "0 1.6cqw 4cqw rgba(0,0,0,.35)",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: display,
                                    fontSize: "4.6cqw",
                                    lineHeight: 2.1,
                                }}
                            >
                                {c(1, "You’ve been selected!")}
                            </div>
                            {/* one clue per line, so their tags never meet */}
                            <div
                                style={{ fontSize: "3.8cqw", lineHeight: 2.3 }}
                            >
                                You won {c(2, "a $500 gift card")}!
                            </div>
                            <div
                                style={{ fontSize: "3.8cqw", lineHeight: 2.3 }}
                            >
                                {c(3, "Enter your card number")} for shipping.
                            </div>
                            <div
                                style={{
                                    margin: "1.4cqw 0 1.6cqw",
                                    padding: "1.2cqw",
                                    borderRadius: "1.6cqw",
                                    boxShadow: `inset 0 0 0 0.3cqw ${MINT}`,
                                    fontSize: "3.6cqw",
                                    letterSpacing: "0.6cqw",
                                    color: "rgba(0,44,68,.45)",
                                }}
                            >
                                •••• •••• •••• ••••
                            </div>
                            <div
                                style={{
                                    fontFamily: black,
                                    fontSize: "3.8cqw",
                                    lineHeight: 1.8,
                                }}
                            >
                                {c(0, "Claim it now before it’s gone!")}
                            </div>
                        </div>
                    </div>
                    {/* room under the pop-up, which floats over the page */}
                    <div style={{ height: "36cqw" }} />
                </div>
            </div>
        ),
    },
]

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

type Phase = "demo" | "hunt" | "tour" | "end" | "leaving"
type CanvasRound = "Round 1" | "Round 2" | "Round 3"

interface Props {
    canvasRound: CanvasRound
    canvasFound: boolean
    hint: string
    deleteLabel: string
    doneLink: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 920
 * @framerIntrinsicHeight 1174
 */
export default function ATMSpotTheScam(props: Props) {
    // keyed on the canvas settings, so changing them on the canvas starts over
    return <Lesson key={props.canvasRound + props.canvasFound} {...props} />
}

function Lesson(props: Props) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const reduceMotion = useReducedMotion()
    const uid = "ss" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const lensMarkup = React.useMemo(
        () =>
            LENS_ART.replace(/id="/g, `id="${uid}-`).replace(
                /url\(#/g,
                `url(#${uid}-`
            ),
        [uid]
    )
    const startRound = isCanvas ? Number(props.canvasRound.slice(-1)) - 1 : 0
    const [round, setRound] = React.useState(startRound)
    const clues = ROUNDS[round].clues
    const [found, setFound] = React.useState<number[]>(
        isCanvas && props.canvasFound ? clues.map((_, i) => i) : []
    )
    const [tags, setTags] = React.useState<
        { i: number; x: number; y: number; right: boolean }[]
    >([])
    const [phase, setPhaseState] = React.useState<Phase>(
        isCanvas ? (props.canvasFound ? "end" : "hunt") : "demo"
    )
    const [tourAt, setTourAt] = React.useState(-1)
    const [size, setSize] = React.useState<{ w: number; h: number } | null>(
        null
    )
    const wrapRef = React.useRef<HTMLDivElement>(null)
    const cardRef = React.useRef<HTMLDivElement>(null)
    const lensRef = React.useRef<HTMLDivElement>(null)
    const popRef = React.useRef<HTMLDivElement>(null)
    const copyRef = React.useRef<HTMLDivElement>(null)
    const phaseRef = React.useRef(phase)
    const foundRef = React.useRef(found)
    const sizeRef = React.useRef(size)
    sizeRef.current = size
    const pos = React.useRef<{ x: number; y: number } | null>(null)
    const drag = React.useRef<{
        dx: number
        dy: number
        x: number
        y: number
        moved: boolean
    } | null>(null)
    const tween = React.useRef<gsap.core.Tween | null>(null)
    const run = React.useRef(0) // bumped to cancel a running sequence
    const skip = React.useRef(false) // a tap during the tour moves on
    const dwell = React.useRef({ i: -1, t: 0 }) // the clue under the glass and its timer
    const ready = size !== null

    const setPhase = (p: Phase) => {
        phaseRef.current = p
        setPhaseState(p)
    }

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
            const fallback = ATMSpotTheScam.defaultProps.doneLink
            const fallbackId = find(fallback)
            if (fallbackId || !path) {
                path = fallback
                id = fallbackId
            }
        }
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }

    // Page coordinates to the card's own (Framer's canvas may scale the whole thing)
    const toLocal = (cx: number, cy: number) => {
        const wrap = wrapRef.current!
        const r = wrap.getBoundingClientRect()
        const s = r.width / wrap.offsetWidth || 1
        return { x: (cx - r.left) / s, y: (cy - r.top) / s }
    }
    const rectsOf = (i: number) => {
        const out: { l: number; t: number; r: number; b: number }[] = []
        cardRef.current?.querySelectorAll(`[data-clue="${i}"]`).forEach((el) =>
            Array.from(el.getClientRects()).forEach((q) => {
                const a = toLocal(q.left, q.top)
                const b = toLocal(q.right, q.bottom)
                out.push({ l: a.x, t: a.y, r: b.x, b: b.y })
            })
        )
        return out
    }
    const centreOf = (i: number) => {
        const q = rectsOf(i)[0]
        return q ? { x: (q.l + q.r) / 2, y: (q.t + q.b) / 2 } : rest()
    }
    const cqw = (n: number) => ((sizeRef.current?.w ?? 920) / 100) * n
    const rest = () => {
        const s = sizeRef.current ?? { w: 920, h: 600 }
        return { x: s.w - cqw(22), y: cqw(13) } // top right: no clue there, and the handle stays on the page
    }

    const markFound = (i: number) => {
        if (foundRef.current.includes(i)) return
        foundRef.current = [...foundRef.current, i]
        setFound(foundRef.current)
        if (!reduceMotion)
            popRef.current?.animate(
                [
                    { transform: "scale(1)" },
                    { transform: "scale(1.07)" },
                    { transform: "scale(1)" },
                ],
                { duration: 450, easing: "cubic-bezier(.3,1.6,.5,1)" }
            )
        if (
            phaseRef.current === "hunt" &&
            foundRef.current.length === clues.length
        )
            tour(run.current)
    }

    // Moves the glass (its centre, in card pixels) and the magnified copy under it; while hunting, a clue counts
    // as found once the glass rests on it for DWELL ms, so sweeping straight across the message doesn't find all.
    const place = (x: number, y: number) => {
        const s = sizeRef.current
        if (!s) return
        x = Math.min(s.w, Math.max(0, x))
        y = Math.min(s.h, Math.max(0, y))
        pos.current = { x, y }
        if (lensRef.current)
            lensRef.current.style.transform = `translate(${x}px, ${y}px)`
        if (copyRef.current)
            copyRef.current.style.transform = `translate(${-x * ZOOM}px, ${-y * ZOOM}px) scale(${ZOOM})`
        if (phaseRef.current !== "hunt") return
        const g = cqw(HIT)
        const i = clues.findIndex(
            (_, k) =>
                !foundRef.current.includes(k) &&
                rectsOf(k).some(
                    (q) =>
                        x > q.l - g && x < q.r + g && y > q.t - g && y < q.b + g
                )
        )
        if (i === dwell.current.i) return
        window.clearTimeout(dwell.current.t)
        dwell.current = { i, t: 0 }
        if (i >= 0)
            dwell.current.t = window.setTimeout(() => {
                dwell.current.i = -1
                if (phaseRef.current === "hunt") markFound(i)
            }, DWELL)
    }

    const glide = (to: { x: number; y: number }, seconds: number) =>
        new Promise<void>((done) => {
            tween.current?.kill()
            const from = pos.current ?? to
            if (reduceMotion) {
                place(to.x, to.y)
                return done()
            }
            const p = { ...from }
            tween.current = gsap.to(p, {
                x: to.x,
                y: to.y,
                duration: seconds,
                ease: "sine.inOut",
                onUpdate: () => place(p.x, p.y),
                onComplete: () => done(),
            })
        })

    // Waits ms, not counting time the inactivity overlay is open (ATMInactivityOverlay sets
    // window.__systemOverlayOpen); ends early when the sequence is cancelled or, if `skippable`, on a tap.
    const wait = (ms: number, token: number, skippable = false) =>
        new Promise<void>((done) => {
            let last = performance.now()
            const id = window.setInterval(() => {
                const now = performance.now()
                if (!(window as any).__systemOverlayOpen) ms -= now - last
                last = now
                if (
                    ms <= 0 ||
                    run.current !== token ||
                    (skippable && skip.current)
                ) {
                    window.clearInterval(id)
                    done()
                }
            }, 50)
        })

    // Every clue found: the glass visits each with its why, then goes back and Delete shows
    async function tour(token: number) {
        setPhase("tour")
        await wait(700, token)
        for (let i = 0; i < clues.length; i++) {
            if (run.current !== token) return
            setTourAt(i)
            await glide(centreOf(i), 0.9)
            skip.current = false // only a tap after it arrives moves it on
            await wait(TOUR_STOP, token, true)
        }
        if (run.current !== token) return
        setTourAt(-1)
        await glide(rest(), 0.9)
        if (run.current === token) setPhase("end")
    }

    // Measure the card (it sizes with the component and the fonts)
    React.useLayoutEffect(() => {
        const card = cardRef.current
        if (!card) return
        const measure = () =>
            setSize({ w: card.offsetWidth, h: card.offsetHeight })
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(card)
        return () => ro.disconnect()
    }, [round])

    // The tags sit just above each found clue's first line, kept in card percentages so they follow resizes
    React.useLayoutEffect(() => {
        if (!size) return
        setTags(
            found.map((i) => {
                const q = rectsOf(i)[0] ?? { l: 0, t: 0, r: 0, b: 0 }
                const right = q.l > size.w * 0.55 // far right: the tag ends at the clue's right edge instead
                return {
                    i,
                    x: ((right ? q.r : q.l) / size.w) * 100,
                    y: (q.t / size.h) * 100,
                    right,
                }
            })
        )
    }, [found, size])

    // Each round: the glass starts at rest; in round 1 it first finds a clue on its own
    React.useEffect(() => {
        if (!ready) return
        const token = ++run.current
        tween.current?.kill()
        const r = rest()
        place(r.x, r.y)
        if (isCanvas) return
        ;(async () => {
            if (round === 0) {
                setPhase("demo")
                await wait(900, token)
                if (run.current !== token) return
                await glide(centreOf(0), 1.4)
                if (run.current !== token) return
                markFound(0)
                await wait(1600, token)
                if (run.current !== token) return
                await glide(rest(), 1.1)
            }
            if (run.current === token) setPhase("hunt")
        })()
        return () => {
            run.current++
            tween.current?.kill()
            window.clearTimeout(dwell.current.t)
            dwell.current = { i: -1, t: 0 }
        }
    }, [round, ready])

    // A new round slides in
    React.useLayoutEffect(() => {
        const wrap = wrapRef.current
        if (!wrap || round === startRound) return
        wrap.getAnimations().forEach((a) => a.cancel())
        if (!reduceMotion)
            wrap.animate(
                [
                    { transform: "translateY(6cqw)", opacity: 0 },
                    { transform: "none", opacity: 1 },
                ],
                { duration: 500, easing: "cubic-bezier(.2,.9,.3,1.1)" }
            )
    }, [round])

    const onDown = (e: React.PointerEvent) => {
        if (phaseRef.current !== "hunt" || !pos.current) return
        if ((e.target as Element).closest("button")) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = toLocal(e.clientX, e.clientY)
        const onGlass =
            lensRef.current?.contains(e.target as Node) ||
            Math.hypot(p.x - pos.current.x, p.y - pos.current.y) < cqw(R)
        if (onGlass) {
            // picked up: it keeps its place under the finger (a tap without a drag still sends it there, on up)
            drag.current = {
                dx: pos.current.x - p.x,
                dy: pos.current.y - p.y,
                x: p.x,
                y: p.y,
                moved: false,
            }
        } else {
            // a tap elsewhere sends the glass there, and a drag carries on from it
            drag.current = { dx: 0, dy: 0, x: p.x, y: p.y, moved: true }
            glide(p, 0.25)
        }
    }
    const onMove = (e: React.PointerEvent) => {
        const d = drag.current
        if (!d || phaseRef.current !== "hunt") return
        const p = toLocal(e.clientX, e.clientY)
        if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) < cqw(1.5)) return
        d.moved = true
        tween.current?.kill()
        place(p.x + d.dx, p.y + d.dy)
    }
    const onUp = () => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved && phaseRef.current === "hunt") glide(d, 0.25)
    }

    const remove = () => {
        if (phaseRef.current !== "end" || isCanvas) return
        setPhase("leaving")
        const next = () => {
            if (round === ROUNDS.length - 1) return goDone()
            foundRef.current = []
            setFound([])
            setRound(round + 1)
        }
        const wrap = wrapRef.current
        if (!wrap || reduceMotion) return next()
        wrap.animate(
            [
                { transform: "none", opacity: 1 },
                {
                    transform: "translateY(12cqw) scale(.8) rotate(-4deg)",
                    opacity: 0,
                },
            ],
            {
                duration: 450,
                easing: "cubic-bezier(.5,0,.8,.4)",
                fill: "forwards",
            }
        ).onfinish = next
    }

    // The message card; drawn twice: once in place, once magnified under the glass (with the truths showing)
    const card = (zoomed: boolean) => {
        const c: ClueFn = (i, text, truth) => {
            const on = found.includes(i)
            const show = !!truth && (zoomed || on)
            const style: React.CSSProperties = {
                borderRadius: "0.8cqw",
                padding: "0 0.5cqw",
                margin: "0 -0.5cqw",
                background: on ? YOLK : undefined,
                color: on ? MIDNIGHT : undefined,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
            }
            const mark = zoomed ? undefined : i
            if (!truth)
                return (
                    <span data-clue={mark} style={style}>
                        {text}
                    </span>
                )
            // both texts share one cell, so the line keeps its layout whichever shows
            return (
                <span
                    data-clue={mark}
                    style={{
                        ...style,
                        display: "inline-grid",
                        verticalAlign: "baseline",
                        lineHeight: 1.3, // the highlight hugs the text, like the other clues
                    }}
                >
                    <span
                        style={{
                            gridArea: "1 / 1",
                            visibility: show ? "hidden" : "visible",
                        }}
                    >
                        {text}
                    </span>
                    <span
                        style={{
                            gridArea: "1 / 1",
                            visibility: show ? "visible" : "hidden",
                        }}
                    >
                        {truth}
                    </span>
                </span>
            )
        }
        return (
            <div
                style={{
                    position: "relative",
                    borderRadius: "4cqw",
                    background: `linear-gradient(160deg, ${NAVY} 30%, ${MIDNIGHT})`,
                    boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(217,238,255,.22)",
                    color: "#ffffff",
                    width: zoomed && size ? size.w : undefined,
                }}
            >
                {ROUNDS[round].view(c)}
                {tags.map((t) => (
                    <Pop
                        key={t.i}
                        animate={!zoomed && !reduceMotion && !isCanvas}
                        style={{
                            position: "absolute",
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            transform: `translate(${t.right ? "-100%" : "0"}, calc(-100% - 0.4cqw))`,
                            whiteSpace: "nowrap",
                            padding: "0.7cqw 1.6cqw 0.8cqw",
                            borderRadius: 999,
                            background: YOLK,
                            color: MIDNIGHT,
                            fontFamily: black,
                            fontSize: "2.6cqw",
                            letterSpacing: "0.1cqw",
                            textTransform: "uppercase",
                            lineHeight: 1,
                            boxShadow: "0 0.6cqw 1.6cqw rgba(0,0,0,.3)",
                            pointerEvents: "none",
                        }}
                    >
                        {clues[t.i].name}
                    </Pop>
                ))}
            </div>
        )
    }

    let label = `Clues found: ${found.length} of ${clues.length}`
    let line = props.hint
    if (phase === "demo")
        line = "Watch the magnifying glass find the first clue."
    else if (phase === "hunt" && round === 0) line = "Your turn! " + props.hint
    else if (phase === "tour" && tourAt >= 0) {
        label = clues[tourAt].name
        line = clues[tourAt].why
    } else if (phase === "tour") line = "You found them all! Here’s why."
    else if (phase === "end" || phase === "leaving") {
        label = "It’s a scam"
        line = ROUNDS[round].end
    }

    return (
        <div
            onPointerDown={() => {
                if (phaseRef.current === "tour") skip.current = true // a tap anywhere moves the tour on
            }}
            style={
                {
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    containerType: "inline-size", // Framer's CSS types don't list it yet, hence the cast
                    display: "flex",
                    flexDirection: "column",
                    gap: "3cqw",
                    color: NAVY,
                    fontFamily: '"Area Normal Bold", sans-serif',
                    userSelect: "none",
                    WebkitUserSelect: "none",
                } as React.CSSProperties
            }
        >
            {/* progress: done teal, current egg yolk, next faint */}
            <div
                style={{
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1.6cqw",
                }}
                aria-label={`Message ${round + 1} of ${ROUNDS.length}`}
            >
                {ROUNDS.map((_, k) => (
                    <span
                        key={k}
                        style={{
                            width: k === round ? "6cqw" : "2.2cqw",
                            height: "2.2cqw",
                            borderRadius: 999,
                            background:
                                k < round
                                    ? TEAL
                                    : k === round
                                      ? YOLK
                                      : "rgba(0,44,68,.2)",
                        }}
                    />
                ))}
            </div>

            <div
                ref={wrapRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                style={{
                    flex: "none",
                    position: "relative",
                    touchAction: "none",
                    cursor: phase === "hunt" ? "grab" : undefined,
                }}
            >
                <div ref={cardRef}>{card(false)}</div>

                {/* the glass: the magnified copy clipped to its opening, then the magnifier drawn over it */}
                <div
                    ref={lensRef}
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        visibility: ready ? "visible" : "hidden",
                        zIndex: 2,
                        pointerEvents: "none",
                    }}
                >
                    <div ref={popRef}>
                        <div
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                left: `${-OPEN_RX * K}cqw`,
                                top: `${-OPEN_RY * K}cqw`,
                                width: `${2 * OPEN_RX * K}cqw`,
                                height: `${2 * OPEN_RY * K}cqw`,
                                borderRadius: "50%",
                                overflow: "hidden",
                                transform: "rotate(70deg)",
                                background: NAVY,
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform: "rotate(-70deg)",
                                }}
                            >
                                <div
                                    ref={copyRef}
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        transformOrigin: "0 0",
                                    }}
                                >
                                    {card(true)}
                                </div>
                            </div>
                        </div>
                        <svg
                            viewBox={VB.join(" ")}
                            aria-hidden="true"
                            style={{
                                position: "absolute",
                                left: `${(VB[0] - LENS_X) * K}cqw`,
                                top: `${(VB[1] - LENS_Y) * K}cqw`,
                                width: `${VB[2] * K}cqw`,
                                height: `${VB[3] * K}cqw`,
                                overflow: "visible",
                            }}
                            dangerouslySetInnerHTML={{ __html: lensMarkup }}
                        />
                    </div>
                </div>
            </div>

            {/* what to do, or why */}
            <div
                aria-live="polite"
                style={{
                    flex: "none",
                    minHeight: "22cqw",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1.6cqw",
                    marginTop: "6cqw", // room for the handle below the card
                    padding: "0 4cqw",
                    textAlign: "center",
                }}
            >
                <span
                    style={{
                        padding: "0.9cqw 2cqw 1cqw",
                        borderRadius: 999,
                        background:
                            phase === "tour" && tourAt >= 0
                                ? YOLK
                                : "transparent",
                        color:
                            phase === "tour" && tourAt >= 0 ? MIDNIGHT : TEAL,
                        fontFamily: black,
                        fontSize: "3cqw",
                        letterSpacing: "0.15cqw",
                        textTransform: "uppercase",
                        lineHeight: 1,
                    }}
                >
                    {label}
                </span>
                <span
                    style={
                        {
                            fontSize: "4.4cqw",
                            lineHeight: 1.35,
                            color: MIDNIGHT,
                            textWrap: "balance",
                        } as React.CSSProperties
                    }
                >
                    {line}
                </span>
            </div>

            <div
                style={{
                    flex: "none",
                    display: "flex",
                    justifyContent: "center",
                    visibility:
                        phase === "end" || phase === "leaving"
                            ? "visible"
                            : "hidden",
                }}
            >
                <button
                    type="button"
                    onClick={remove}
                    style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "60cqw",
                        height: "10.6cqw", // 97px at 920 wide: a full touch target
                        boxSizing: "border-box",
                        paddingBottom: "0.22cqw", // the font sits low, so this centres the label
                        borderRadius: 999,
                        background: TEAL,
                        color: "#ffffff",
                        fontFamily: black,
                        fontSize: "4.2cqw",
                        lineHeight: 1,
                    }}
                >
                    {props.deleteLabel}
                </button>
            </div>
        </div>
    )
}

function Avatar({ letter }: { letter: string }) {
    return (
        <span
            style={{
                flex: "none",
                width: "9cqw",
                height: "9cqw",
                borderRadius: 999,
                background: TEAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: black,
                fontSize: "4.4cqw",
            }}
        >
            {letter}
        </span>
    )
}

// A tag that pops in when it first shows
function Pop({
    animate,
    style,
    children,
}: {
    animate: boolean
    style: React.CSSProperties
    children: React.ReactNode
}) {
    const ref = React.useRef<HTMLSpanElement>(null)
    React.useLayoutEffect(() => {
        if (animate)
            ref.current?.animate(
                [
                    { opacity: 0, scale: "0.6" },
                    { opacity: 1, scale: "1" },
                ],
                { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" }
            )
    }, [])
    return (
        <span ref={ref} style={style}>
            {children}
        </span>
    )
}

ATMSpotTheScam.defaultProps = {
    canvasRound: "Round 1" as CanvasRound,
    canvasFound: false,
    hint: "Rest the glass on anything that looks suspicious, or tap a spot.",
    deleteLabel: "Delete",
    doneLink: "/atm-lessons/spot-the-scam/complete",
}

addPropertyControls(ATMSpotTheScam, {
    canvasRound: {
        type: ControlType.Enum,
        title: "Canvas",
        description:
            "Which message the canvas shows. The live page always starts at the first.",
        options: ["Round 1", "Round 2", "Round 3"],
        defaultValue: ATMSpotTheScam.defaultProps.canvasRound,
    },
    canvasFound: {
        type: ControlType.Boolean,
        title: "Clues",
        enabledTitle: "Found",
        disabledTitle: "Hidden",
        defaultValue: ATMSpotTheScam.defaultProps.canvasFound,
    },
    hint: {
        type: ControlType.String,
        title: "Hint",
        displayTextArea: true,
        defaultValue: ATMSpotTheScam.defaultProps.hint,
    },
    deleteLabel: {
        type: ControlType.String,
        title: "Delete",
        defaultValue: ATMSpotTheScam.defaultProps.deleteLabel,
    },
    doneLink: {
        type: ControlType.Link,
        title: "When Done",
        defaultValue: ATMSpotTheScam.defaultProps.doneLink,
    },
})
