import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"

// ATM lesson Save or Spend?: the coin race. Four lanes, A to D, one per choice (spend all, save $10, $25, $50 of
// every $100). A week counter runs 1 to 52 while "Earned so far" climbs $100 a week, and each lane's stack grows by
// one of the savings jar's coins every time it passes another $100 saved, so the stacks pull apart week by week.
// The kid's Pick is ringed. Callouts at weeks 4 and 26 keep it talking; at week 52 their reveal line and a
// comparison appear. Pick Again and Done show the whole time: Pick Again fires its interaction (set the lesson's
// variant back to the cards); Done goes to When Done, the lesson's completion page. After the reveal, with no tap
// for Idle (s), an orange strip fills along Done's bottom edge and then it goes for them. It holds still while the inactivity overlay is open. On the Framer canvas it shows the finished
// race; with reduced motion it starts finished. No background of its own.

type Pick = "A" | "B" | "C" | "D"
const PICKS: Pick[] = ["A", "B", "C", "D"]
const SAVE = [0, 10, 25, 50] // dollars saved from every $100
const WHO = [
    "Spent it all",
    "Saved $10\nper Week",
    "Saved $25\nper Week",
    "Saved $50\nper Week",
]
const WEEKS = 52
const HALF = 26
const NAVY = "#002c44"
const MIDNIGHT = "#11232d"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const DEEP = "#003b5c" // the lanes: the same blue glass as the option cards
const MINT = "#bce2d7"
const ORANGE = "#f6a11d" // Done's idle timer
// A lane's coins stand in stacks of 10, filled left to right and centred on the lane's final number of stacks (lane
// D's 26 coins make three), so nothing shifts mid-race; three stacks leave 10 of the lane's 100 free at each edge.
const LANE_H = 52 // a lane's drawing is 100 wide and this tall
const COIN_W = 24
const PER_STACK = 10
const STACK_GAP = 28 // stack centre to centre
const COIN_H = (COIN_W * 254.8) / 490
const COIN_T = (COIN_W * 78.4) / 490
const JIT = [0, 3, -2, 4, 1, -3, 3, -1]

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
const money = (n: number) => "$" + n.toLocaleString("en-US")
// "$1,300" and the like in bold, the rest as written
const bold = (s: string) =>
    s.split(/(\$[\d,]+)/).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

interface Props {
    pick: Pick
    weekMs: number
    watch: string
    every: string
    halfway: string
    revealA: string
    revealB: string
    revealC: string
    revealD: string
    compareA: string
    compareB: string
    compareC: string
    compareD: string
    pickAgain: string
    done: string
    idle: number
    doneLink: string
    onPickAgain?: () => void
}

// One coin on a lane's stack; it drops in when it first appears during the race.
function LaneCoin({
    i,
    stacks,
    uid,
    drop,
}: {
    i: number
    stacks: number
    uid: string
    drop: boolean
}) {
    const ref = React.useRef<SVGGElement>(null)
    React.useLayoutEffect(() => {
        if (drop)
            ref.current?.animate(
                [
                    { transform: "translateY(-30px)", opacity: 0 },
                    {
                        transform: "none",
                        opacity: 1,
                        offset: 0.75,
                        easing: "ease-out",
                    },
                    { transform: "translateY(-4px)", offset: 0.88 },
                    { transform: "none" },
                ],
                { duration: 420, easing: "cubic-bezier(.5,0,.75,0)" }
            )
    }, [])
    const r = i % PER_STACK
    const x =
        50 +
        (Math.floor(i / PER_STACK) - (stacks - 1) / 2) * STACK_GAP +
        (JIT[r % JIT.length] * COIN_W) / 64
    const y = LANE_H - 2 - COIN_H - r * COIN_T + (88.2 * COIN_W) / 490
    return (
        <g ref={ref}>
            <g
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(COIN_W / 490).toFixed(5)})`}
                dangerouslySetInnerHTML={{
                    __html: COIN.replace(/url\(#/g, `url(#${uid}`),
                }}
            />
        </g>
    )
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 960
 * @framerIntrinsicHeight 1180
 */
export default function ATMCoinRace(props: Props) {
    const p = Math.max(0, PICKS.indexOf(props.pick))
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const reduceMotion = useReducedMotion()
    const still = isCanvas || !!reduceMotion
    const uid = "cr" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const [week, setWeek] = React.useState(still ? WEEKS : 0)
    const fillRef = React.useRef<HTMLSpanElement>(null)
    const finished = week >= WEEKS

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
            const fallback = ATMCoinRace.defaultProps.doneLink
            const fallbackId = find(fallback)
            if (fallbackId || !path) {
                path = fallback
                id = fallbackId
            }
        }
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }
    const goDoneRef = React.useRef(goDone)
    goDoneRef.current = goDone

    // The race: one week per Week (ms), held while the inactivity overlay is open. A new Pick runs it again.
    React.useEffect(() => {
        if (still) return setWeek(WEEKS)
        setWeek(0)
        const t = setInterval(
            () => {
                if ((window as any).__systemOverlayOpen) return
                setWeek((w) => {
                    if (w + 1 >= WEEKS) clearInterval(t)
                    return Math.min(WEEKS, w + 1)
                })
            },
            Math.max(40, props.weekMs)
        )
        return () => clearInterval(t)
    }, [props.pick, props.weekMs, still])

    // At the end, Done's strip fills over Idle (s) and then goes, unless someone taps first; held while the overlay is open.
    React.useEffect(() => {
        const el = fillRef.current
        if (!finished || isCanvas || !el || props.idle <= 0) return
        const anim = el.animate(
            [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
            {
                duration: props.idle * 1000,
                easing: "linear",
                fill: "forwards",
            }
        )
        anim.onfinish = () => goDoneRef.current()
        const sync = () =>
            (window as any).__systemOverlayOpen ? anim.pause() : anim.play()
        sync()
        window.addEventListener("system-overlay-change", sync)
        return () => {
            window.removeEventListener("system-overlay-change", sync)
            anim.cancel()
        }
    }, [finished, isCanvas, props.idle])

    const reveal = [props.revealA, props.revealB, props.revealC, props.revealD][
        p
    ]
    const compare = [
        props.compareA,
        props.compareB,
        props.compareC,
        props.compareD,
    ][p]
    const callout =
        week >= HALF
            ? `${props.halfway} ` +
              PICKS.map((k, i) => `${k} ${money(HALF * SAVE[i])}`).join(" · ")
            : week >= 4
              ? props.every
              : props.watch
    const display = '"P22 Mackinac ExtraBold", "P22 Mackinac Bold", serif'
    const button: React.CSSProperties = {
        all: "unset",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "10cqw",
        boxSizing: "border-box",
        paddingBottom: "0.22cqw", // 2px: the font sits low, so this centres the label
        borderRadius: 999,
        fontFamily: '"Area Normal Black", sans-serif',
        fontSize: "4.2cqw",
        lineHeight: 1,
        color: NAVY,
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                containerType: "inline-size",
                display: "flex",
                flexDirection: "column",
                gap: "2cqw",
                color: NAVY,
                fontFamily: '"Area Normal Bold", sans-serif',
            }}
        >
            <svg
                width="0"
                height="0"
                style={{ position: "absolute" }}
                aria-hidden="true"
            >
                <defs
                    dangerouslySetInnerHTML={{
                        __html: COIN_DEFS.replace(/id="/g, `id="${uid}`),
                    }}
                />
            </svg>

            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "3cqw",
                }}
            >
                <div
                    style={{
                        fontFamily: display,
                        fontSize: "10cqw",
                        lineHeight: 1,
                        color: MIDNIGHT,
                    }}
                >
                    {week}
                    <span
                        style={{
                            fontFamily: '"Area Normal Bold", sans-serif',
                            fontSize: "3.8cqw",
                            color: TEAL,
                        }}
                    >
                        {" "}
                        / {WEEKS} weeks
                    </span>
                </div>
                <div
                    style={{
                        textAlign: "right",
                        fontSize: "3.4cqw",
                        lineHeight: 1,
                        color: TEAL,
                    }}
                >
                    Earned so far
                    <div
                        style={{
                            fontFamily: display,
                            fontSize: "10cqw",
                            lineHeight: 1,
                            color: MIDNIGHT,
                        }}
                    >
                        {money(week * 100)}
                    </div>
                </div>
            </div>
            <div
                style={{
                    height: "1.4cqw",
                    flex: "none",
                    borderRadius: 999,
                    background: "rgba(0,44,68,.12)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: `${(week / WEEKS) * 100}%`,
                        background: `linear-gradient(90deg, ${TEAL}, #3bbfc0)`,
                        borderRadius: 999,
                    }}
                />
            </div>

            <div
                style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "2.4cqw",
                    marginTop: "4.6cqw", // room for the YOUR PICK tab
                }}
            >
                {PICKS.map((k, i) => {
                    const mine = i === p
                    const coins = Math.floor((week * SAVE[i]) / 100)
                    return (
                        <div
                            key={k}
                            style={{ position: "relative", display: "flex" }}
                        >
                            {mine && (
                                <span
                                    style={{
                                        position: "absolute",
                                        bottom: "calc(100% - 4cqw)", // reaches down behind the lane's rounded top corners
                                        left: 0,
                                        right: 0,
                                        height: "8.6cqw",
                                        paddingBottom: "4cqw", // keeps the text in the part above the lane
                                        boxSizing: "border-box",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        whiteSpace: "nowrap",
                                        background: YOLK,
                                        borderRadius: "2.4cqw 2.4cqw 0 0",
                                        fontFamily:
                                            '"Area Normal Black", sans-serif',
                                        fontSize: "2.6cqw",
                                        lineHeight: 1,
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                        color: MIDNIGHT,
                                    }}
                                >
                                    Your pick
                                </span>
                            )}
                            <div
                                style={{
                                    position: "relative",
                                    zIndex: 1, // in front of the tab
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.6cqw",
                                    borderRadius: "4cqw",
                                    padding: "2.2cqw 1cqw",
                                    background: `linear-gradient(180deg, ${mine ? "#0e5577" : "#0b4a6e"}, ${DEEP})`,
                                    boxShadow: mine
                                        ? `inset 0 0 0 0.5cqw ${YOLK}, 0 0 5cqw rgba(255,204,64,.45)`
                                        : "inset 0 0 0 1px rgba(217,238,255,.22)",
                                    color: "#ffffff",
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily:
                                            '"Area Normal Black", sans-serif',
                                        fontSize: "4cqw",
                                        lineHeight: 1, // no leading above the letter, so the top padding matches the bottom
                                    }}
                                >
                                    {k}
                                </span>
                                <svg
                                    viewBox={`0 0 100 ${LANE_H}`}
                                    preserveAspectRatio="xMidYMax meet"
                                    style={{
                                        width: "100%",
                                        flex: 1,
                                        minHeight: "10cqw", // keeps the coins a good size, so the lane grows instead
                                        overflow: "visible",
                                    }}
                                    aria-hidden="true"
                                >
                                    {Array.from({ length: coins }, (_, c) => (
                                        <LaneCoin
                                            key={c}
                                            i={c}
                                            stacks={Math.ceil(
                                                Math.floor(
                                                    (WEEKS * SAVE[i]) / 100
                                                ) / PER_STACK
                                            )}
                                            uid={uid}
                                            drop={!still}
                                        />
                                    ))}
                                </svg>
                                <span
                                    style={{
                                        fontFamily:
                                            '"Area Normal Black", sans-serif',
                                        fontSize: "4.6cqw",
                                        marginBottom: "1cqw",
                                    }}
                                >
                                    {money(week * SAVE[i])}
                                </span>
                                <span
                                    style={{
                                        fontSize: "3.15cqw", // 29px at the race's 920px width
                                        color: MINT,
                                        textAlign: "center",
                                        lineHeight: 1.2,
                                        minHeight: "2.4em", // two lines, so the lanes' dollar figures line up
                                        whiteSpace: "pre-line", // "per Week" always starts the second line
                                    }}
                                >
                                    {WHO[i]}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1.5cqw",
                    fontFamily: '"Area Normal Black", sans-serif',
                    fontSize: "4.2cqw",
                    lineHeight: 1, // no leading under the text, so the gaps either side of the reveal look even
                    color: MIDNIGHT,
                }}
            >
                <svg
                    viewBox="-250 -90 500 258"
                    style={{
                        width: "8.5cqw",
                        height: "auto",
                        display: "block",
                        flex: "none",
                    }}
                    aria-hidden="true"
                >
                    <g
                        dangerouslySetInnerHTML={{
                            __html: COIN.replace(/url\(#/g, `url(#${uid}`),
                        }}
                    />
                </svg>
                <span>= $100 saved</span>
            </div>

            <div
                aria-live="polite"
                style={
                    {
                        borderRadius: "4cqw",
                        padding: "2.6cqw 3cqw",
                        minHeight: "22cqw", // holds the lanes' size when the reveal replaces the callouts; grows if the text needs it
                        flex: "none",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        background: finished
                            ? "#ffffff"
                            : "rgba(255,255,255,.45)",
                        boxShadow: finished
                            ? `inset 0 0 0 0.5cqw ${TEAL}`
                            : "none",
                        fontSize: "3.87cqw", // 35.6px at the race's 920px width
                        lineHeight: 1.35,
                        textWrap: "pretty",
                    } as React.CSSProperties
                }
            >
                {finished ? (
                    <>
                        <span>{bold(reveal)}</span>
                        <span
                            style={{
                                display: "block",
                                marginTop: "1.6cqw",
                                fontSize: "3.26cqw", // 30px
                                color: TEAL,
                            }}
                        >
                            {compare}
                        </span>
                    </>
                ) : (
                    <span>{bold(callout)}</span>
                )}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "3cqw",
                }}
            >
                <button
                    type="button"
                    style={{
                        ...button,
                        boxShadow: `inset 0 0 0 0.5cqw ${NAVY}`,
                    }}
                    onClick={() => props.onPickAgain?.()}
                >
                    {props.pickAgain}
                </button>
                <button
                    type="button"
                    style={{
                        ...button,
                        background: YOLK,
                    }}
                    onClick={() => goDoneRef.current()}
                >
                    <span
                        ref={fillRef}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: "1.2cqw", // a strip along the bottom, so yolk stays the button's colour
                            background: ORANGE,
                            transformOrigin: "left",
                            transform: "scaleX(0)",
                        }}
                    />
                    <span style={{ position: "relative" }}>{props.done}</span>
                </button>
            </div>
        </div>
    )
}

ATMCoinRace.defaultProps = {
    pick: "C" as Pick,
    weekMs: 110,
    watch: "Watch the coins stack up…",
    every: "Every week is the same choice. Watch the stacks.",
    halfway: "Halfway!",
    revealA:
        "Spending all of it is fun every week, but after earning $5,200 there's $0 saved.",
    revealB:
        "Someone saving $10 from every $100 can save $520 after earning $5,200.",
    revealC:
        "Someone saving $25 from every $100 can save $1,300 after earning $5,200.",
    revealD:
        "Someone saving $50 from every $100 can save $2,600 after earning $5,200.",
    compareA: "Saving just $10 from every $100 would have made $520.",
    compareB: "Saving $25 instead would have made $1,300.",
    compareC: "Saving $50 instead would have made $2,600.",
    compareD:
        "That's half of everything you earned, and you still spent $2,600!",
    pickAgain: "Pick Again",
    done: "Done",
    idle: 20,
    doneLink: "/atm-lessons/save-or-spend/complete",
}

const text = (title: string, key: keyof typeof ATMCoinRace.defaultProps) => ({
    type: ControlType.String as const,
    title,
    displayTextArea: true,
    defaultValue: ATMCoinRace.defaultProps[key] as string,
})

addPropertyControls(ATMCoinRace, {
    pick: {
        type: ControlType.Enum,
        title: "Pick",
        options: PICKS,
        optionTitles: [
            "A · Spend it all",
            "B · Save $10",
            "C · Save $25",
            "D · Save $50",
        ],
        defaultValue: ATMCoinRace.defaultProps.pick,
    },
    weekMs: {
        type: ControlType.Number,
        title: "Week (ms)",
        description:
            "How long each week takes; 110 runs the year in about 6 s.",
        min: 40,
        max: 600,
        step: 10,
        defaultValue: ATMCoinRace.defaultProps.weekMs,
    },
    watch: text("Start", "watch"),
    every: text("Week 4", "every"),
    halfway: text("Week 26", "halfway"),
    revealA: text("Reveal A", "revealA"),
    revealB: text("Reveal B", "revealB"),
    revealC: text("Reveal C", "revealC"),
    revealD: text("Reveal D", "revealD"),
    compareA: text("Compare A", "compareA"),
    compareB: text("Compare B", "compareB"),
    compareC: text("Compare C", "compareC"),
    compareD: text("Compare D", "compareD"),
    pickAgain: {
        type: ControlType.String,
        title: "Pick Again",
        defaultValue: ATMCoinRace.defaultProps.pickAgain,
    },
    done: {
        type: ControlType.String,
        title: "Done",
        defaultValue: ATMCoinRace.defaultProps.done,
    },
    idle: {
        type: ControlType.Number,
        title: "Idle (s)",
        description:
            "With no tap after the reveal, Done's orange strip fills over this long and then it goes. 0 turns it off.",
        min: 0,
        max: 120,
        step: 1,
        defaultValue: ATMCoinRace.defaultProps.idle,
    },
    doneLink: {
        type: ControlType.Link,
        title: "When Done",
        description: "The lesson's completion page.",
        defaultValue: ATMCoinRace.defaultProps.doneLink,
    },
    onPickAgain: { type: ControlType.EventHandler, title: "Pick Again" },
})
