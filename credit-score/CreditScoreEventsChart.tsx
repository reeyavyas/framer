import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Score tab → Credit Score Events: a 6M / 1Y / 2Y toggle, a legend, and two
// stacked line-and-area charts sharing one month axis: the score on top,
// Payment History and Credit Usage (both 0–100%) below. A marker line with
// callouts sits on the selected month (the latest until a month is tapped).
// The toggle lives here, not in native variants, so the months are entered
// once. Months end on the current month. Built for the 1080-wide kiosk.

const W = 946 // the Credit Score Events card's inner width, so the chart fills it
const H = 1420
const TOGGLE_H = 102
const LEFT = 94 // plot starts here; y-axis labels sit left of it
const LAST_X = W - 50 // the latest month; just room to its right for a callout
const SCORE_TOP = 329
const SCORE_BOTTOM = 617
const PCT_TOP = 749
const PCT_BOTTOM = 1247
const SCRUB_Y = 1307
const LABEL_Y = 1399
const NAVY = "#0E335E"
const FONT = "Inter, sans-serif"

// Dots shown per range and how often a month is labelled. Each range also
// draws one earlier month at the left edge, without a dot, as in the app.
const RANGES = {
    "6M": { points: 6, every: 1 },
    "1Y": { points: 13, every: 3 },
    "2Y": { points: 25, every: 6 },
}
type Range = keyof typeof RANGES

interface Props {
    scores: number[]
    onTime: number[]
    usage: number[]
    scoreColor: string
    scoreFill: string
    paymentColor: string
    paymentFill: string
    usageColor: string
    usageFill: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 946
 * @framerIntrinsicHeight 1420
 */
export default function CreditScoreEventsChart(props: Props) {
    const [range, setRange] = React.useState<Range>("6M")
    const [picked, setPicked] = React.useState<number>()
    const svgRef = React.useRef<SVGSVGElement>(null)
    const { points, every } = RANGES[range]
    const months = useMonths(points)

    // The last points + 1 values of each series (fewer if not entered).
    const take = (a: number[], lo: number, hi: number) =>
        a
            .filter((v) => Number.isFinite(v))
            .slice(-(points + 1))
            .map((v) => Math.min(hi, Math.max(lo, v)))
    const scores = take(props.scores, 300, 850)
    const onTime = take(props.onTime, 0, 100)
    const usage = take(props.usage, 0, 100)

    const step = (LAST_X - LEFT) / points
    // Index 0 of a series is `len - 1` steps left of the latest month.
    const x = (i: number, len: number) => LAST_X - (len - 1 - i) * step
    const sel = Math.min(picked ?? points - 1, points - 1)
    const selX = LAST_X - (points - 1 - sel) * step

    const lo = Math.floor(Math.min(...scores) / 20) * 20
    let hi = Math.ceil(Math.max(...scores) / 20) * 20
    if (hi === lo) hi += 20
    const yScore = (s: number) =>
        SCORE_TOP + ((hi - s) / (hi - lo)) * (SCORE_BOTTOM - SCORE_TOP)
    const yPct = (p: number) =>
        PCT_TOP + ((100 - p) / 100) * (PCT_BOTTOM - PCT_TOP)

    // The value of a series on the selected month, if it reaches back that far.
    const at = (a: number[]) => a[a.length - points + sel]

    const pick = (e: React.PointerEvent) => {
        const box = svgRef.current?.getBoundingClientRect()
        if (!box) return
        const px = ((e.clientX - box.left) / box.width) * W
        const i = Math.round((px - (LAST_X - (points - 1) * step)) / step)
        setPicked(Math.min(points - 1, Math.max(0, i)))
    }

    const series = (
        a: number[],
        y: (v: number) => number,
        bottom: number,
        color: string,
        fill: string
    ) => {
        if (a.length < 2) return null
        const xy = a.map((v, i) => ({ x: x(i, a.length), y: y(v) }))
        const line = xy
            .map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`)
            .join(" ")
        const first = xy[0]
        const last = xy[xy.length - 1]
        return (
            <g>
                <path
                    d={`${line} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`}
                    fill={fill}
                />
                <path
                    d={line}
                    fill="none"
                    stroke={color}
                    strokeWidth={5}
                    strokeLinejoin="round"
                />
                {/* Dots only in 6M, as in the app; the lead-in point never has one. */}
                {points <= 6 &&
                    xy.map(
                        (p, i) =>
                            i >= xy.length - points && (
                                <circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r={10}
                                    fill={color}
                                />
                            )
                    )}
            </g>
        )
    }

    const grid = (top: number, bottom: number, n: number) =>
        Array.from({ length: n + 1 }, (_, i) => {
            const y = top + ((bottom - top) * i) / n
            return (
                <line
                    key={i}
                    x1={LEFT}
                    x2={W}
                    y1={y}
                    y2={y}
                    stroke="#d6d6d6"
                    strokeWidth={2}
                    strokeDasharray="10 8"
                />
            )
        })

    const callout = (cx: number, top: number, text: string) => (
        <g transform={`translate(${cx - 46} ${top})`}>
            <rect
                width={92}
                height={52}
                rx={8}
                fill="#fff"
                stroke="#e0e0e0"
                strokeWidth={2}
            />
            <text
                x={46}
                y={36}
                fontSize={28}
                fontWeight={600}
                textAnchor="middle"
                fill="#212121"
            >
                {text}
            </text>
        </g>
    )

    const legend = [
        { label: "SCORE HISTORY", color: props.scoreColor, x: 0, y: 162 },
        { label: "PAYMENT HISTORY", color: props.paymentColor, x: 394, y: 162 },
        { label: "CREDIT USAGE", color: props.usageColor, x: 0, y: 230 },
    ]

    const sScore = at(scores)
    const sOnTime = at(onTime)
    const sUsage = at(usage)

    return (
        <div style={{ width: W, height: H, position: "relative" }}>
            <div
                role="tablist"
                aria-label="Time range"
                style={{
                    position: "absolute",
                    inset: "0 0 auto 0",
                    height: TOGGLE_H,
                    display: "flex",
                    border: "2px solid #e3e3e3",
                    borderRadius: 8,
                    boxSizing: "border-box",
                    overflow: "hidden",
                }}
            >
                {(Object.keys(RANGES) as Range[]).map((r, i) => (
                    <button
                        key={r}
                        role="tab"
                        aria-selected={r === range}
                        onClick={() => {
                            setRange(r)
                            setPicked(undefined)
                        }}
                        style={{
                            flex: 1,
                            border: "none",
                            borderLeft: i ? "2px solid #e3e3e3" : "none",
                            background: "#fff",
                            fontFamily: FONT,
                            fontSize: 40,
                            fontWeight: r === range ? 700 : 400,
                            color: r === range ? NAVY : "#333",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            <svg
                ref={svgRef}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                style={{
                    fontFamily: FONT,
                    display: "block",
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                }}
                role="img"
                aria-label={`${range}: score ${sScore ?? "–"}, payments on time ${sOnTime ?? "–"}%, credit usage ${sUsage ?? "–"}%`}
            >
                {legend.map((l) => (
                    <g key={l.label}>
                        <circle cx={l.x + 12} cy={l.y} r={12} fill={l.color} />
                        <text
                            x={l.x + 46}
                            y={l.y + 9}
                            fontSize={25}
                            fontWeight={600}
                            letterSpacing={4}
                            fill="#212121"
                        >
                            {l.label}
                        </text>
                    </g>
                ))}

                {grid(SCORE_TOP, SCORE_BOTTOM, (hi - lo) / 10)}
                {Array.from({ length: (hi - lo) / 20 + 1 }, (_, i) => (
                    <text
                        key={i}
                        x={0}
                        y={yScore(hi - i * 20) + 10}
                        fontSize={30}
                        fill="#555"
                    >
                        {hi - i * 20}
                    </text>
                ))}
                {grid(PCT_TOP, PCT_BOTTOM, 10)}
                {[100, 80, 60, 40, 20, 0].map((p) => (
                    <text
                        key={p}
                        x={0}
                        y={yPct(p) + 10}
                        fontSize={30}
                        fill="#555"
                    >
                        {p}%
                    </text>
                ))}

                {series(
                    scores,
                    yScore,
                    SCORE_BOTTOM,
                    props.scoreColor,
                    props.scoreFill
                )}
                {series(
                    onTime,
                    yPct,
                    PCT_BOTTOM,
                    props.paymentColor,
                    props.paymentFill
                )}
                {series(
                    usage,
                    yPct,
                    PCT_BOTTOM,
                    props.usageColor,
                    props.usageFill
                )}

                <line
                    x1={LEFT}
                    x2={W}
                    y1={SCRUB_Y}
                    y2={SCRUB_Y}
                    stroke="#d5dcf5"
                    strokeWidth={3}
                />
                <line
                    x1={selX}
                    x2={selX}
                    y1={SCORE_TOP - 26}
                    y2={SCRUB_Y - 30}
                    stroke="#8a8a8a"
                    strokeWidth={2}
                />
                {Array.from({ length: points }, (_, i) => (
                    <circle
                        key={i}
                        cx={LAST_X - (points - 1 - i) * step}
                        cy={SCRUB_Y}
                        r={15}
                        fill="#fff"
                        stroke="#c9d3f0"
                        strokeWidth={3}
                    />
                ))}

                {sScore !== undefined &&
                    callout(selX, yScore(sScore) + 26, String(sScore))}
                {sOnTime !== undefined &&
                    callout(selX, yPct(sOnTime) + 26, `${sOnTime}%`)}
                {sUsage !== undefined &&
                    callout(selX, yPct(sUsage) - 78, `${sUsage}%`)}

                {Array.from({ length: points }, (_, i) =>
                    i % every === 0 ? (
                        <text
                            key={i}
                            x={LAST_X - (points - 1 - i) * step}
                            y={LABEL_Y}
                            fontSize={30}
                            textAnchor="middle"
                            fill="#6b6b6b"
                            letterSpacing={1}
                            // Hidden until mounted so a server-rendered month can't flash.
                            visibility={months ? "visible" : "hidden"}
                        >
                            {months ? label(months, i, every) : "MMM"}
                        </text>
                    ) : null
                )}
            </svg>

            {/* Tap or drag over the charts to move the marker to a month. */}
            <div
                onPointerDown={pick}
                onPointerMove={(e) => e.buttons && pick(e)}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: SCORE_TOP - 30,
                    height: SCRUB_Y + 30 - (SCORE_TOP - 30),
                    touchAction: "pan-y",
                    cursor: "pointer",
                }}
            />
        </div>
    )
}

// A shown month's label: its short name, plus its two-digit year when it is
// the first label or its year differs from the previous label's (OCT 25,
// JAN 26, APR …).
function label(months: Date[], i: number, every: number): string {
    const d = months[i]
    const m = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    const prev = months[i - every]
    return !prev || prev.getFullYear() !== d.getFullYear()
        ? `${m} ${String(d.getFullYear()).slice(-2)}`
        : m
}

// The first day of each of the last `count` months, ending with this month.
// Undefined until mounted; re-read just after each midnight so a page left
// open rolls over.
function useMonths(count: number): Date[] | undefined {
    const [months, setMonths] = React.useState<Date[]>()
    React.useEffect(() => {
        let timer: number
        const tick = () => {
            const now = new Date()
            setMonths(
                Array.from(
                    { length: count },
                    (_, i) =>
                        new Date(
                            now.getFullYear(),
                            now.getMonth() - (count - 1 - i),
                            1
                        )
                )
            )
            const midnight = new Date(now)
            midnight.setHours(24, 0, 1, 0)
            timer = window.setTimeout(tick, midnight.getTime() - now.getTime())
        }
        tick()
        return () => window.clearTimeout(timer)
    }, [count])
    // Right after a range switch the state still holds the old range's months.
    return months?.length === count ? months : undefined
}

// Made-up history for a 720 score: 26 months, oldest first. The last six
// scores match ScoreHistoryChart and the last six usage values match the
// Card Usage History chart.
CreditScoreEventsChart.defaultProps = {
    scores: [
        688, 690, 694, 692, 697, 701, 699, 703, 706, 704, 700, 696, 701, 705,
        708, 704, 707, 703, 701, 704, 702, 708, 699, 711, 716, 720,
    ],
    onTime: Array(26).fill(100),
    usage: [
        9, 10, 11, 10, 12, 9, 11, 10, 14, 23, 13, 20, 9, 8, 6, 4, 3, 3, 5, 3, 2,
        6, 18, 3, 4, 5,
    ],
    scoreColor: "#4AA3DF",
    scoreFill: "#D3E9F8",
    paymentColor: "#4A9A5F",
    paymentFill: "#D3E6DB",
    usageColor: "#4C6EF5",
    usageFill: "#9FB2EE",
}

const monthList = (title: string, min: number, max: number, unit?: string) => ({
    type: ControlType.Array as const,
    title,
    // Oldest first; the last value is this month's. 2Y uses the last 26.
    control: {
        type: ControlType.Number as const,
        min,
        max,
        step: 1,
        unit,
        displayStepper: true,
    },
})

addPropertyControls(CreditScoreEventsChart, {
    scores: {
        ...monthList("Scores", 300, 850),
        defaultValue: CreditScoreEventsChart.defaultProps.scores,
    },
    onTime: {
        ...monthList("On Time %", 0, 100, "%"),
        defaultValue: CreditScoreEventsChart.defaultProps.onTime,
    },
    usage: {
        ...monthList("Usage %", 0, 100, "%"),
        defaultValue: CreditScoreEventsChart.defaultProps.usage,
    },
    scoreColor: {
        type: ControlType.Color,
        title: "Score Line",
        defaultValue: CreditScoreEventsChart.defaultProps.scoreColor,
    },
    scoreFill: {
        type: ControlType.Color,
        title: "Score Fill",
        defaultValue: CreditScoreEventsChart.defaultProps.scoreFill,
    },
    paymentColor: {
        type: ControlType.Color,
        title: "Payment Line",
        defaultValue: CreditScoreEventsChart.defaultProps.paymentColor,
    },
    paymentFill: {
        type: ControlType.Color,
        title: "Payment Fill",
        defaultValue: CreditScoreEventsChart.defaultProps.paymentFill,
    },
    usageColor: {
        type: ControlType.Color,
        title: "Usage Line",
        defaultValue: CreditScoreEventsChart.defaultProps.usageColor,
    },
    usageFill: {
        type: ControlType.Color,
        title: "Usage Fill",
        defaultValue: CreditScoreEventsChart.defaultProps.usageFill,
    },
})
