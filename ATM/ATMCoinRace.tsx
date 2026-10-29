import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"

// ATM lesson Save or Spend?: the coin race. Four lanes, A to D, one per choice (spend all, save $10, $25, $50 of
// every $100). A week counter runs 1 to 52 while "Earned so far" climbs $100 a week, and each lane's stack grows by
// one of the savings jar's coins every time it passes another $100 saved, so the stacks pull apart week by week.
// The kid's Pick is ringed. Callouts at weeks 4 and 26 keep it talking; at week 52 their reveal line and a
// comparison appear with Pick Again and Done. Pick Again fires its interaction (set the lesson's variant back to
// the cards); Done goes to When Done, the lesson's completion page. With no tap for Idle (s), Done fills up and
// goes for them. It holds still while the inactivity overlay is open. On the Framer canvas it shows the finished
// race; with reduced motion it starts finished. No background of its own.

type Pick = "A" | "B" | "C" | "D"
const PICKS: Pick[] = ["A", "B", "C", "D"]
const SAVE = [0, 10, 25, 50] // dollars saved from every $100
const WHO = ["Spends it all", "Saves $10", "Saves $25", "Saves $50"]
const WEEKS = 52
const HALF = 26
const NAVY = "#002c44"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const DEEP = "#003b5c" // the lanes: the same blue glass as the option cards
const MINT = "#bce2d7"
const AMBER = "#c98612" // the yolk button's edge
const LANE_H = 300 // a lane's drawing is 100 wide and this tall
const COIN_W = 52 // 26 coins (lane D) reach 240 of 300, clear of the lane's letter
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
function LaneCoin({ i, uid, drop }: { i: number; uid: string; drop: boolean }) {
    const ref = React.useRef<SVGGElement>(null)
    React.useLayoutEffect(() => {
        if (drop)
            ref.current?.animate(
                [
                    { transform: "translateY(-90px)", opacity: 0 },
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
    const x = 50 - COIN_W / 2 + (JIT[i % JIT.length] * COIN_W) / 64 + COIN_W / 2
    const y = LANE_H - 6 - COIN_H - i * COIN_T + (88.2 * COIN_W) / 490
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

    // At the end, Done fills up over Idle (s) and then goes, unless someone taps first; held while the overlay is open.
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
    const display = '"P22 Mackinac Bold", serif'
    const button: React.CSSProperties = {
        all: "unset",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        borderRadius: 999,
        padding: "3.4cqw 0",
        fontFamily: '"Area Normal Black", sans-serif',
        fontSize: "4.2cqw",
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
                gap: "3cqw",
                color: NAVY,
                fontFamily: '"Area Normal Bold", sans-serif',
                fontVariantNumeric: "tabular-nums",
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
                        color: TEAL,
                    }}
                >
                    Earned so far
                    <div
                        style={{
                            fontFamily: '"Area Normal Black", sans-serif',
                            fontSize: "5.6cqw",
                            color: NAVY,
                        }}
                    >
                        {money(week * 100)}
                    </div>
                </div>
            </div>
            <div
                style={{
                    height: "1.4cqw",
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
                    minHeight: 0,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "2.4cqw",
                    marginTop: "2cqw",
                }}
            >
                {PICKS.map((k, i) => {
                    const mine = i === p
                    const coins = Math.floor((week * SAVE[i]) / 100)
                    return (
                        <div
                            key={k}
                            style={{
                                position: "relative",
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "1cqw",
                                borderRadius: "4cqw",
                                padding: "2.6cqw 1cqw 2.4cqw",
                                background: `linear-gradient(180deg, ${mine ? "#0e5577" : "#0b4a6e"}, ${DEEP})`,
                                boxShadow: mine
                                    ? `inset 0 0 0 0.5cqw ${YOLK}, 0 0 5cqw rgba(255,204,64,.45)`
                                    : "inset 0 0 0 1px rgba(217,238,255,.22)",
                                color: "#ffffff",
                            }}
                        >
                            {mine && (
                                <span
                                    style={{
                                        position: "absolute",
                                        top: "-2.8cqw",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        whiteSpace: "nowrap",
                                        background: YOLK,
                                        borderRadius: 999,
                                        padding: "0.6cqw 2.2cqw",
                                        fontFamily:
                                            '"Area Normal Black", sans-serif',
                                        fontSize: "2.8cqw",
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Your pick
                                </span>
                            )}
                            <span
                                style={{
                                    fontFamily:
                                        '"Area Normal Black", sans-serif',
                                    fontSize: "4cqw",
                                }}
                            >
                                {k}
                            </span>
                            <svg
                                viewBox={`0 0 100 ${LANE_H}`}
                                style={{
                                    width: "100%",
                                    flex: 1,
                                    minHeight: 0,
                                    overflow: "visible",
                                }}
                                aria-hidden="true"
                            >
                                {Array.from({ length: coins }, (_, c) => (
                                    <LaneCoin
                                        key={c}
                                        i={c}
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
                                }}
                            >
                                {money(week * SAVE[i])}
                            </span>
                            <span
                                style={{
                                    fontSize: "2.9cqw",
                                    color: MINT,
                                    textAlign: "center",
                                    lineHeight: 1.2,
                                }}
                            >
                                {WHO[i]}
                            </span>
                        </div>
                    )
                })}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1.8cqw",
                    fontSize: "3.4cqw",
                    lineHeight: 1,
                    color: TEAL,
                }}
            >
                <svg
                    viewBox="-250 -90 500 258"
                    style={{
                        width: "6.6cqw",
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
                        padding: "3.6cqw 4cqw",
                        height: "24cqw", // fixed, so the lanes keep their size when the reveal replaces the callouts
                        boxSizing: "border-box",
                        background: finished
                            ? "#ffffff"
                            : "rgba(255,255,255,.45)",
                        boxShadow: finished
                            ? `inset 0 0 0 0.5cqw ${TEAL}`
                            : "none",
                        fontSize: "4.3cqw",
                        lineHeight: 1.35,
                        textWrap: "balance",
                    } as React.CSSProperties
                }
            >
                {finished ? (
                    <>
                        {bold(reveal)}
                        <span
                            style={{
                                display: "block",
                                marginTop: "1.6cqw",
                                fontSize: "3.7cqw",
                                color: TEAL,
                            }}
                        >
                            {compare}
                        </span>
                    </>
                ) : (
                    bold(callout)
                )}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "3cqw",
                    visibility: finished ? "visible" : "hidden",
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
                        boxShadow: `0 1.2cqw 0 ${AMBER}`,
                    }}
                    onClick={() => goDoneRef.current()}
                >
                    <span
                        ref={fillRef}
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(255,255,255,.5)",
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
    weekMs: 150,
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
    pickAgain: "Pick again",
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
            "How long each week takes; 150 runs the year in about 8 s.",
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
            "With no tap after the reveal, Done fills up over this long and then goes. 0 turns it off.",
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
