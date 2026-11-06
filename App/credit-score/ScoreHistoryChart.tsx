import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Score Rating → Score History: a line and area chart of the score over
// the past months, with dashed gridlines, a y-axis that fits the scores,
// and a callout on the latest point. The months always end on the
// current month (in November: Jun–Nov). Built for the 1080-wide kiosk.

const W = 840
const H = 660
const AXIS = 90 // y-axis labels
const TOP = 30
const BOTTOM = 560 // bottom of the plot; month labels sit below
const RIGHT_ROOM = 110 // space right of the last point for its callout
const LINE = "#4aa3df"
const FONT = "Inter, sans-serif"

interface Props {
    scores: number[]
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 840
 * @framerIntrinsicHeight 660
 */
export default function ScoreHistoryChart(props: Props) {
    const scores = props.scores.filter((s) => Number.isFinite(s))
    const months = useMonthLabels(scores.length)
    if (scores.length < 2) {
        return <div style={{ width: W, height: H }} />
    }
    // Axis runs in 20s, padded so no point sits on the frame.
    const lo = Math.floor((Math.min(...scores) - 5) / 20) * 20
    const hi = Math.ceil((Math.max(...scores) + 5) / 20) * 20
    const y = (s: number) => TOP + ((hi - s) / (hi - lo)) * (BOTTOM - TOP)
    const left = AXIS + 30
    const step = (W - RIGHT_ROOM - left) / (scores.length - 1)
    const xy = scores.map((s, i) => ({ x: left + i * step, y: y(s) }))
    const line = xy.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ")
    const last = xy[xy.length - 1]
    const ticks: number[] = []
    for (let s = lo; s <= hi; s += 10) ticks.push(s)

    return (
        <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ fontFamily: FONT, display: "block" }}
            role="img"
            aria-label={`Score history: ${scores.join(", ")}`}
        >
            {ticks.map((s) => (
                <g key={s}>
                    <line
                        x1={AXIS + 10}
                        x2={W}
                        y1={y(s)}
                        y2={y(s)}
                        stroke="#d6d6d6"
                        strokeWidth={2}
                        strokeDasharray="10 8"
                    />
                    {(s - lo) % 20 === 0 && (
                        <text x={0} y={y(s) + 10} fontSize={28} fill="#555">
                            {s}
                        </text>
                    )}
                </g>
            ))}
            <line
                x1={AXIS + 10}
                x2={AXIS + 10}
                y1={TOP - 10}
                y2={BOTTOM}
                stroke="#bdbdbd"
                strokeWidth={2}
            />

            <path
                d={`${line} L ${last.x} ${BOTTOM} L ${xy[0].x} ${BOTTOM} Z`}
                fill="#cfe6f4"
            />
            <line
                x1={last.x}
                x2={last.x}
                y1={TOP - 26}
                y2={BOTTOM}
                stroke="#8a8a8a"
                strokeWidth={2}
            />
            <path
                d={line}
                fill="none"
                stroke={LINE}
                strokeWidth={5}
                strokeLinejoin="round"
            />
            {xy.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={10} fill={LINE} />
            ))}

            {/* Callout with the latest score, just below-right of its point. */}
            <g transform={`translate(${last.x - 38} ${last.y + 26})`}>
                <rect
                    width={86}
                    height={52}
                    rx={8}
                    fill="#fff"
                    stroke="#e0e0e0"
                    strokeWidth={2}
                />
                <text
                    x={43}
                    y={36}
                    fontSize={28}
                    fontWeight={600}
                    textAnchor="middle"
                    fill="#212121"
                >
                    {scores[scores.length - 1]}
                </text>
            </g>

            {xy.map((p, i) => (
                <text
                    key={i}
                    x={p.x}
                    y={BOTTOM + 72}
                    fontSize={28}
                    textAnchor="middle"
                    fill="#6b6b6b"
                    letterSpacing={1}
                    // Hidden until mounted so a server-rendered month can't flash.
                    visibility={months ? "visible" : "hidden"}
                >
                    {months?.[i] ?? "MMM"}
                </text>
            ))}
        </svg>
    )
}

// Short names of the last `count` months, ending with this month, e.g.
// JUN … NOV in November. Undefined until mounted; re-read just after each
// midnight so a page left open rolls over to the new month.
function useMonthLabels(count: number): string[] | undefined {
    const [labels, setLabels] = React.useState<string[]>()
    React.useEffect(() => {
        let timer: number
        const tick = () => {
            const now = new Date()
            setLabels(
                Array.from({ length: count }, (_, i) =>
                    new Date(
                        now.getFullYear(),
                        now.getMonth() - (count - 1 - i),
                        1
                    )
                        .toLocaleDateString("en-US", { month: "short" })
                        .toUpperCase()
                )
            )
            const midnight = new Date(now)
            midnight.setHours(24, 0, 1, 0)
            timer = window.setTimeout(tick, midnight.getTime() - now.getTime())
        }
        tick()
        return () => window.clearTimeout(timer)
    }, [count])
    return labels
}

ScoreHistoryChart.defaultProps = {
    scores: [702, 708, 699, 711, 716, 720],
}

addPropertyControls(ScoreHistoryChart, {
    scores: {
        type: ControlType.Array,
        title: "Scores",
        // Oldest first; the last score is this month's.
        control: {
            type: ControlType.Number,
            min: 300,
            max: 850,
            step: 1,
            displayStepper: true,
        },
        defaultValue: ScoreHistoryChart.defaultProps.scores,
    },
})
