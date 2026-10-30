import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// ATM lesson Spot the Scam: three scam messages (a bank text, a delivery email, a prize pop-up), one per round.
// Drag the magnifying glass over the message, or tap a spot to send it there. Under the glass the message shows
// magnified, and a disguised link or sender name shows what it really is. A clue the glass rests on glows egg
// yolk, gets a numbered badge and a card on the clue board, and the line under the board says straight away why
// it's a scam (owner). Every round starts on the user's turn (owner: no demo). After the last clue's
// why, Delete shows; on the last round it goes to the completion page. No background of its own; no red and no
// countdowns (owner).
//
// The glass is a single teal ring with ATMBrowserSearch's magnifier shine and handle.
// Transforms and opacity only; no blur, filters or CSS transitions.

const NAVY = "#002c44"
const MIDNIGHT = "#11232d"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const MINT = "#bce2d7"
const GLACIER = "#d9eeff"
const DARK_TEAL = "#046b68" // links on mint (brand teal is too light there)

const R = 10 // cqw: the glass opening's radius on screen
const ZOOM = 1.45 // how much the glass magnifies
const LAST_READ = 2000 // ms the last clue's why stays up before "It's a scam." (Delete already shows; owner: quicker)
const HIT = 1 // cqw a clue's box grows by for the glass to count as over it
const DWELL = 350 // ms the glass rests on a clue before it counts
const NUDGE_IDLE = 3000 // ms with no touch, while it's the user's turn, before the glass wiggles for attention
const NUDGE_EVERY = 3500 // ms between wiggles while it stays untouched

// The lens: one teal ring (the browser-search magnifier's rim gradient, as thick as the neck, which shares it; owner) round a
// circular opening at LENS_X, LENS_Y (art units, the group's offset added), with that magnifier's glass shine
// inside; the neck, handle and gradients are copied from ATMBrowserSearch's ART
const LENS_X = 2399
const LENS_Y = 1213
const OPEN_R = 365 // the opening, inside the ring
const K = R / OPEN_R // cqw per art unit
const VB = [1895, 710, 1585, 1765] // the magnifier with its handle
// prettier-ignore
const LENS_ART = `<defs><linearGradient id="g57" x1="0.1" y1="0" x2="0.35" y2="1"><stop offset="0.00" stop-color="#8fe0e0"/><stop offset="0.33" stop-color="#3bbfc0"/><stop offset="0.67" stop-color="#1fa9a8"/><stop offset="1.00" stop-color="#059390"/></linearGradient><linearGradient id="g60" x1="0" y1="0" x2="0.75" y2="0.75"><stop offset="0.00" stop-color="#8fe0e0" stop-opacity="0.6"/><stop offset="0.50" stop-color="#8fe0e0" stop-opacity="0.15"/><stop offset="1.00" stop-color="#8fe0e0" stop-opacity="0"/></linearGradient><radialGradient id="s63"><stop offset="0" stop-color="#5fbfa6" stop-opacity="0.700"/><stop offset="0.25" stop-color="#5fbfa6" stop-opacity="0.560"/><stop offset="0.45" stop-color="#5fbfa6" stop-opacity="0.329"/><stop offset="0.6" stop-color="#5fbfa6" stop-opacity="0.175"/><stop offset="0.72" stop-color="#5fbfa6" stop-opacity="0.084"/><stop offset="0.83" stop-color="#5fbfa6" stop-opacity="0.028"/><stop offset="0.92" stop-color="#5fbfa6" stop-opacity="0.008"/><stop offset="1" stop-color="#5fbfa6" stop-opacity="0.000"/></radialGradient><linearGradient id="g64" x1="0" y1="0" x2="0.12" y2="1"><stop offset="0.00" stop-color="#ffcc40"/><stop offset="0.33" stop-color="#f6a11d"/><stop offset="0.67" stop-color="#e08a12"/><stop offset="1.00" stop-color="#c97a0c"/></linearGradient><linearGradient id="g65" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0.00" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.67" stop-color="#c97a0c" stop-opacity="0"/><stop offset="1.00" stop-color="#c97a0c" stop-opacity="0.9"/></linearGradient><linearGradient id="g66" x1="0" y1="0" x2="1" y2="0"><stop offset="0.00" stop-color="#c97a0c" stop-opacity="0.0"/><stop offset="0.50" stop-color="#c97a0c" stop-opacity="0.0"/><stop offset="1.00" stop-color="#c97a0c" stop-opacity="0.45"/></linearGradient></defs><g pointer-events="visiblePainted"><g transform="translate(50 -70)"><g transform="translate(3061 2145) rotate(50.4)"><rect x="-648" y="-62" width="300" height="124" fill="url(#g57)"/><path d="M-618,-26 H-388" stroke="#ffffff" stroke-width="26" stroke-linecap="round" opacity=".9"/></g><circle cx="2349" cy="1283" r="365" fill="url(#g60)"/><path d="M2100,1323 A281,268 0 0 1 2289,1057" transform="rotate(-20 2349 1283)" fill="none" stroke="#ffffff" stroke-width="44" stroke-linecap="round" opacity=".75"/><circle cx="2479" cy="1073" r="23" fill="#ffffff" opacity=".75"/><circle cx="2349" cy="1283" r="427" fill="none" stroke="url(#g57)" stroke-width="124"/><g transform="translate(3061 2145) rotate(50.4)"><ellipse cx="-358" cy="10" rx="70" ry="123" fill="url(#s63)"/><rect x="-368" y="-154" width="736" height="308" rx="110" fill="url(#g64)" stroke="url(#g65)" stroke-width="23.0" stroke-linejoin="round"/><rect x="-368" y="-154" width="736" height="308" rx="110" fill="url(#g66)"/><path d="M-248,-84 H218" stroke="#ffffff" stroke-width="46" stroke-linecap="round" opacity="0.9"/><ellipse cx="-228" cy="-92" rx="30" ry="16" fill="#ffffff" opacity=".95"/></g></g></g>`

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
    background: MINT,
    color: NAVY,
    borderRadius: "3cqw",
    padding: "3cqw 4cqw",
    fontSize: "4.1cqw",
    lineHeight: 1.5,
}
// The numbered badge on a found clue in the message (its number matches its card on the clue board)
const badge: React.CSSProperties = {
    width: "5.2cqw",
    height: "5.2cqw",
    borderRadius: 999,
    background: YOLK,
    color: MIDNIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: black,
    fontSize: "3.2cqw",
    lineHeight: 1,
}
// A clue card's number, like the letter on Save or Spend's option cards
const option: React.CSSProperties = {
    flex: "none",
    width: "6.2cqw",
    height: "6.2cqw",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: black,
    fontSize: "3.6cqw",
    lineHeight: 1,
    paddingBottom: "0.2cqw", // the font sits low, so this centres the number
}
const link: React.CSSProperties = {
    color: DARK_TEAL,
    textDecoration: "underline",
}
const ROUNDS: Round[] = [
    {
        clues: [
            {
                name: "Fake urgency",
                why: "Scammers rush you so you don’t stop to think. A real bank gives you time.",
            },
            {
                name: "Unknown sender",
                why: "Your bank’s texts come from a number you know. This one is a random number.",
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
            <div style={{ padding: "3.6cqw 4.4cqw 4.4cqw" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3cqw",
                        marginBottom: "3cqw",
                    }}
                >
                    <Avatar letter="?" />{" "}
                    {/* an unknown number has no name to show */}
                    <div>
                        <div
                            style={{
                                fontFamily: black,
                                fontSize: "4.4cqw",
                                lineHeight: 1.6,
                            }}
                        >
                            {c(1, "+1 555-014-2290")}
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
        end: "Track packages in the delivery company’s own app. Delete it.",
        view: (c) => (
            <div style={{ padding: "3.6cqw 4.4cqw 4.4cqw" }}>
                <div
                    style={{
                        background: MINT,
                        color: NAVY,
                        borderRadius: "3cqw",
                        padding: "3.4cqw 4.4cqw 4cqw",
                    }}
                >
                    <div style={{ fontSize: "3.8cqw", lineHeight: 1.5 }}>
                        <span style={{ fontFamily: black }}>From: </span>
                        {c(
                            1,
                            "Parcel Delivery Service",
                            "notice@pkg-redeliver.co"
                        )}
                    </div>
                    <div style={{ fontSize: "3.8cqw", lineHeight: 1.5 }}>
                        <span style={{ fontFamily: black }}>Subject: </span>
                        Your package is on hold
                    </div>
                    <div
                        style={{
                            height: "0.3cqw",
                            background: "rgba(0,44,68,.15)",
                            margin: "1.6cqw 0 1cqw",
                        }}
                    />
                    <div style={{ fontSize: "4.1cqw", lineHeight: 1.5 }}>
                        We couldn’t deliver your package. Pay a{" "}
                        {c(2, "$2.49 redelivery fee")} {c(0, "within 24 hours")}{" "}
                        or it will go back to the sender.
                    </div>
                    <div
                        style={{
                            display: "inline-block",
                            marginTop: "3cqw",
                            padding: "1.6cqw 4.4cqw",
                            borderRadius: 999,
                            background: TEAL,
                            color: "#ffffff",
                            fontFamily: black,
                            fontSize: "4.2cqw",
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
                name: "Surprise pop\u2011up",
                why: "A surprise prize box is a trick to grab your attention.",
            },
            {
                name: "Too good to be true",
                why: "You didn’t enter a contest, so you didn’t win one. Free money is bait.",
            },
            {
                name: "Asks for your card number",
                why: "A real prize never asks for your card number.",
            },
        ],
        end: "Never give a pop\u2011up your card number. Delete it.", // \u2011: a hyphen that never breaks
        view: (c) => (
            <div>
                {/* the browser is the whole card, no frame inside a frame (owner) */}
                <div
                    style={{
                        background: DARK_TEAL, // the browser page behind the pop-up (owner)
                        borderRadius: "4cqw", // the card's corners
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.4cqw",
                            padding: "2.6cqw 4.4cqw", // lined up with the other messages' insets
                            background: `linear-gradient(160deg, ${NAVY} 30%, ${MIDNIGHT})`, // the navy card's colours, so the teal glass stands out on it (owner)
                        }}
                    >
                        {[YOLK, "#3bbfc0", GLACIER].map((col) => (
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
                    {/* the pop-up fills the page, centred, with room on all four sides as the other messages' frames have */}
                    <div style={{ padding: "3.6cqw 4.4cqw 4.4cqw" }}>
                        <div
                            style={{
                                background: MINT, // like the other messages (owner)
                                color: NAVY,
                                borderRadius: "3cqw",
                                padding: "2cqw 3cqw",
                                boxShadow: "0 1.6cqw 4cqw rgba(0,0,0,.35)",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: display,
                                    fontSize: "4.4cqw",
                                    lineHeight: 1.4,
                                }}
                            >
                                {c(1, "You’ve been selected!")}
                            </div>
                            <div
                                style={{ fontSize: "3.9cqw", lineHeight: 1.5 }}
                            >
                                You won {c(2, "a $500 gift card")}!
                            </div>
                            <div
                                style={{ fontSize: "3.9cqw", lineHeight: 1.5 }}
                            >
                                {c(3, "Enter your card number")} for shipping.
                            </div>
                            <div
                                style={{
                                    margin: "0.8cqw 0",
                                    padding: "1.2cqw",
                                    borderRadius: "1.6cqw",
                                    background: "#ffffff", // a field on the mint card
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
                                    fontSize: "3.9cqw",
                                    lineHeight: 1.5,
                                }}
                            >
                                {c(0, "Claim it now before it’s gone!")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
    },
]

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

type Phase = "hunt" | "last" | "end" | "leaving"
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
 * @framerIntrinsicHeight 1187
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
        { i: number; n: number; x: number; y: number }[]
    >([])
    const [phase, setPhaseState] = React.useState<Phase>(
        props.canvasFound && isCanvas ? "end" : "hunt"
    )
    const [explain, setExplain] = React.useState(-1) // the clue whose why shows: the last one found
    const [size, setSize] = React.useState<{ w: number; h: number } | null>(
        null
    )
    const wrapRef = React.useRef<HTMLDivElement>(null)
    const cardRef = React.useRef<HTMLDivElement>(null)
    const lensRef = React.useRef<HTMLDivElement>(null)
    const popRef = React.useRef<HTMLDivElement>(null)
    const nudgeRef = React.useRef<HTMLDivElement>(null)
    const touched = React.useRef(0) // when the card was last touched (ms)
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
    const skip = React.useRef(false) // a tap while the last clue's why shows moves on
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
    const cqw = (n: number) => ((sizeRef.current?.w ?? 920) / 100) * n
    const rest = () => {
        const s = sizeRef.current ?? { w: 920, h: 600 }
        return { x: s.w - cqw(19), y: cqw(8) } // top right: no clue there, and the handle stays on the page
    }

    const markFound = (i: number) => {
        if (foundRef.current.includes(i)) return
        foundRef.current = [...foundRef.current, i]
        setFound(foundRef.current)
        setExplain(i) // why it's a scam shows straight away
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
            lastClue(run.current)
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

    // Every clue found: Delete shows at once; the last clue's why stays up a moment, then the round's tip
    async function lastClue(token: number) {
        setPhase("last")
        skip.current = false
        await wait(LAST_READ, token, true)
        // not once Delete has been tapped (it's "leaving" then)
        if (run.current === token && phaseRef.current === "last")
            setPhase("end")
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

    // Each found clue gets a numbered badge on its first line's top left (numbered in the order found, matching
    // the clue board), kept in card percentages so it follows resizes
    React.useLayoutEffect(() => {
        if (!size) return
        setTags(
            found.map((i, k) => {
                const q = rectsOf(i)[0] ?? { l: 0, t: 0, r: 0, b: 0 }
                return {
                    i,
                    n: k + 1,
                    x: (q.l / size.w) * 100,
                    y: (q.t / size.h) * 100,
                }
            })
        )
    }, [found, size])

    // Each round: the glass starts at rest and it's the user's turn straight away
    React.useEffect(() => {
        if (!ready) return
        ++run.current
        tween.current?.kill()
        const r = rest()
        place(r.x, r.y)
        if (!isCanvas) setPhase("hunt")
        return () => {
            run.current++
            tween.current?.kill()
            window.clearTimeout(dwell.current.t)
            dwell.current = { i: -1, t: 0 }
        }
    }, [round, ready])

    // While it's the user's turn and nobody touches the card, the glass wiggles now and then to say "pick me up":
    // a tilt to and fro about the lens with a small lift. Not while the inactivity overlay is open, nor with
    // reduced motion.
    React.useEffect(() => {
        if (phase !== "hunt" || isCanvas || reduceMotion) return
        touched.current = performance.now()
        let last = 0
        const id = window.setInterval(() => {
            const now = performance.now()
            if (
                drag.current ||
                (window as any).__systemOverlayOpen ||
                now - touched.current < NUDGE_IDLE ||
                now - last < NUDGE_EVERY
            )
                return
            last = now
            nudgeRef.current?.animate(
                [
                    { transform: "none" },
                    {
                        transform: "translateY(-1.6cqw) rotate(-12deg)",
                        offset: 0.2,
                    },
                    {
                        transform: "translateY(-1.6cqw) rotate(9deg)",
                        offset: 0.4,
                    },
                    {
                        transform: "translateY(-0.8cqw) rotate(-6deg)",
                        offset: 0.6,
                    },
                    { transform: "rotate(3deg)", offset: 0.8 },
                    { transform: "none" },
                ],
                { duration: 900, easing: "ease-in-out" }
            )
        }, 250)
        return () => window.clearInterval(id)
    }, [phase])

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
        if (drag.current) touched.current = performance.now()
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
        if (
            (phaseRef.current !== "end" && phaseRef.current !== "last") ||
            isCanvas
        )
            return
        setPhase("leaving")
        const next = () => {
            if (round === ROUNDS.length - 1) return goDone()
            foundRef.current = []
            setFound([])
            setExplain(-1)
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
                            ...badge,
                            position: "absolute",
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            transform: "translate(-35%, -70%)", // mostly above the clue, clear of the word before it
                            boxShadow:
                                "0 0 0 0.5cqw #ffffff, 0 0.6cqw 1.4cqw rgba(0,44,68,.25)",
                            pointerEvents: "none",
                        }}
                    >
                        {t.n}
                    </Pop>
                ))}
            </div>
        )
    }

    const ended = phase === "end" || phase === "leaving"
    const canDelete = ended || phase === "last"
    let line = props.hint
    let lead = "" // in bold before the line: the clue's name, or "It's a scam."
    if (ended) {
        lead = "It’s a scam."
        line = ROUNDS[round].end
    } else if (explain >= 0) {
        lead = clues[explain].name + "."
        line = clues[explain].why
    }

    return (
        <div
            onPointerDown={() => {
                if (phaseRef.current === "last") skip.current = true // a tap anywhere moves on to Delete
                touched.current = performance.now() // any touch holds off the wiggle...
                nudgeRef.current?.getAnimations().forEach((a) => a.cancel()) // ...and stops one at once
            }}
            style={
                {
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    containerType: "inline-size", // Framer's CSS types don't list it yet, hence the cast
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.8cqw",
                    justifyContent: "space-between", // spare height spread between the parts (owner)
                    paddingBottom: "calc(3cqw + 4px)", // room between Delete and the screen's bottom edge (owner: then 4 px higher)
                    boxSizing: "border-box",
                    color: NAVY,
                    fontFamily: '"Area Normal Bold", sans-serif',
                    userSelect: "none",
                    WebkitUserSelect: "none",
                } as React.CSSProperties
            }
        >
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
                    <div ref={nudgeRef}>
                        <div ref={popRef}>
                            <div
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    left: `${-R}cqw`,
                                    top: `${-R}cqw`,
                                    width: `${2 * R}cqw`,
                                    height: `${2 * R}cqw`,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: NAVY,
                                }}
                            >
                                <div
                                    ref={copyRef}
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "50%",
                                        transformOrigin: "0 0",
                                    }}
                                >
                                    {card(true)}
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
            </div>

            {/* the clue board: the two counts (styled like Money Double's "Your money"), then a card per clue,
                filled in the order found, styled like Save or Spend's A-D options; the one being explained is outlined */}
            <div
                style={{
                    flex: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "calc(1.8cqw - 3px)", // 3 px given to the gaps around the board (owner)
                    marginTop: 6, // 6 px more space under the card than between the other parts (owner)
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                    }}
                >
                    <Count
                        label="Message"
                        value={`${round + 1} / ${ROUNDS.length}`}
                    />
                    <Count
                        label="Clues found"
                        value={`${found.length} / ${clues.length}`}
                    />
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        columnGap: "1.8cqw",
                        rowGap: "calc(1.8cqw + 2px)", // between the card rows (owner: not smaller, a little more)
                    }}
                >
                    {clues.map((_, k) => {
                        const i = found[k]
                        const on = i !== undefined && i === explain && !ended
                        return (
                            <div
                                key={k}
                                style={{
                                    height: "calc(11cqw + 4px)", // fixed (room for a two-line name, with 2 px more padding, owner), so nothing below moves as clues fill in
                                    boxSizing: "border-box",
                                    borderRadius: "4cqw",
                                    padding: "calc(1cqw + 2px) 2.6cqw",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "2.4cqw",
                                    background:
                                        i === undefined
                                            ? "rgba(0,59,92,.06)"
                                            : "linear-gradient(180deg, #0b4a6e, #003b5c)",
                                    boxShadow:
                                        i === undefined
                                            ? "inset 0 0 0 0.3cqw rgba(0,59,92,.18)"
                                            : on
                                              ? `inset 0 0 0 0.6cqw ${YOLK}`
                                              : "inset 0 0 0 1px rgba(217,238,255,.22)",
                                    color: "#ffffff",
                                }}
                            >
                                <span
                                    style={{
                                        ...option,
                                        background:
                                            i === undefined
                                                ? "rgba(0,59,92,.12)"
                                                : GLACIER,
                                        color:
                                            i === undefined
                                                ? "rgba(0,59,92,.45)"
                                                : NAVY,
                                    }}
                                >
                                    {k + 1}
                                </span>
                                {i !== undefined && (
                                    <Pop
                                        key={i}
                                        animate={!reduceMotion && !isCanvas}
                                        style={{
                                            fontFamily: black,
                                            fontSize: "3.8cqw",
                                            lineHeight: 1.15,
                                            paddingBottom: "0.3cqw", // the font sits low, so this centres it
                                        }}
                                    >
                                        {clues[i].name}
                                    </Pop>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* what to do, or why */}
            <div
                aria-live="polite"
                style={
                    {
                        flex: "none",
                        height: "10.8cqw", // fixed (two lines; every text fits in two), so nothing moves as the text changes (owner)
                        margin: "calc(1cqw + 2px) 0", // more room above and below the text (owner)
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "0 3cqw",
                        textAlign: "center",
                        fontSize: "4.1cqw",
                        lineHeight: 1.3,
                        color: MIDNIGHT,
                        textWrap: "balance",
                    } as React.CSSProperties
                }
            >
                <div>
                    {lead && (
                        <span
                            style={{ fontFamily: display, fontSize: "4.4cqw" }}
                        >
                            {lead}{" "}
                        </span>
                    )}
                    {line}
                </div>
            </div>

            <div
                style={{
                    flex: "none",
                    display: "flex",
                    justifyContent: "center",
                    visibility: canDelete ? "visible" : "hidden",
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
                        height: "10cqw", // as Save or Spend's buttons (92px at 920 wide)
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

// A count: a label beside a big figure, in Money Double's "Your money" styles
function Count({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: "2cqw" }}>
            <span
                style={{
                    fontFamily: black,
                    fontSize: "calc(3.8cqw + 2px)",
                    color: TEAL,
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontFamily: display,
                    fontSize: "7cqw",
                    lineHeight: 1,
                    color: MIDNIGHT,
                }}
            >
                {value}
            </span>
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
