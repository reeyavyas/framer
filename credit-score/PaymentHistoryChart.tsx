import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Payment History → Performance Chart: the share of open accounts paid on
// time each month, as a line and area chart on a fixed 0–100% axis, with a
// callout on the latest month. Months end on the current month; the first
// one carries its two-digit year (MAY 26). Built for the 1080-wide kiosk.
// Also used, in blue, for Credit Usage → Card Usage History.

const W = 840
const H = 660
const AXIS = 90 // y-axis labels
const TOP = 30
const BOTTOM = 560 // bottom of the plot; month labels sit below
const RIGHT_ROOM = 110 // space right of the last point for its callout
const FONT = "Inter, sans-serif"

interface Props {
    percents: number[]
    lineColor: string
    fillColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 840
 * @framerIntrinsicHeight 660
 */
export default function PaymentHistoryChart(props: Props) {
    const values = props.percents
        .filter((p) => Number.isFinite(p))
        .map((p) => Math.min(100, Math.max(0, p)))
    const months = useMonthLabels(values.length)
    if (values.length < 2) {
        return <div style={{ width: W, height: H }} />
    }
    const y = (p: number) => TOP + ((100 - p) / 100) * (BOTTOM - TOP)
    const left = AXIS + 30
    const step = (W - RIGHT_ROOM - left) / (values.length - 1)
    const xy = values.map((p, i) => ({ x: left + i * step, y: y(p) }))
    const line = xy.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ")
    const last = xy[xy.length - 1]
    const ticks: number[] = []
    for (let p = 0; p <= 100; p += 10) ticks.push(p)

    return (
        <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ fontFamily: FONT, display: "block" }}
            role="img"
            aria-label={`Percent by month: ${values.join("%, ")}%`}
        >
            {ticks.map((p) => (
                <g key={p}>
                    <line
                        x1={AXIS + 10}
                        x2={W}
                        y1={y(p)}
                        y2={y(p)}
                        stroke="#d6d6d6"
                        strokeWidth={2}
                        strokeDasharray="10 8"
                    />
                    {p % 20 === 0 && (
                        <text x={0} y={y(p) + 10} fontSize={28} fill="#555">
                            {p}%
                        </text>
                    )}
                </g>
            ))}

            <path
                d={`${line} L ${last.x} ${BOTTOM} L ${xy[0].x} ${BOTTOM} Z`}
                fill={props.fillColor}
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
                stroke={props.lineColor}
                strokeWidth={5}
                strokeLinejoin="round"
            />
            {xy.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={10}
                    fill={props.lineColor}
                />
            ))}

            {/* Callout with the latest value, just below-right of its point. */}
            <g transform={`translate(${last.x - 38} ${last.y + 26})`}>
                <rect
                    width={100}
                    height={52}
                    rx={8}
                    fill="#fff"
                    stroke="#e0e0e0"
                    strokeWidth={2}
                />
                <text
                    x={50}
                    y={36}
                    fontSize={28}
                    fontWeight={600}
                    textAnchor="middle"
                    fill="#212121"
                >
                    {values[values.length - 1]}%
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

// Short names of the last `count` months, ending with this month; the
// first also shows its two-digit year (MAY 26). Undefined until mounted;
// re-read just after each midnight so a page left open rolls over.
function useMonthLabels(count: number): string[] | undefined {
    const [labels, setLabels] = React.useState<string[]>()
    React.useEffect(() => {
        let timer: number
        const tick = () => {
            const now = new Date()
            setLabels(
                Array.from({ length: count }, (_, i) => {
                    const d = new Date(
                        now.getFullYear(),
                        now.getMonth() - (count - 1 - i),
                        1
                    )
                    const m = d
                        .toLocaleDateString("en-US", { month: "short" })
                        .toUpperCase()
                    return i === 0
                        ? `${m} ${String(d.getFullYear()).slice(-2)}`
                        : m
                })
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

PaymentHistoryChart.defaultProps = {
    percents: [100, 100, 100, 100, 100, 100],
    lineColor: "#4A9A5F",
    fillColor: "#D3E6DB",
}

addPropertyControls(PaymentHistoryChart, {
    percents: {
        type: ControlType.Array,
        title: "Percents",
        // Oldest first; the last value is this month's.
        control: {
            type: ControlType.Number,
            min: 0,
            max: 100,
            step: 1,
            unit: "%",
            displayStepper: true,
        },
        defaultValue: PaymentHistoryChart.defaultProps.percents,
    },
    lineColor: {
        type: ControlType.Color,
        title: "Line",
        defaultValue: PaymentHistoryChart.defaultProps.lineColor,
    },
    fillColor: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: PaymentHistoryChart.defaultProps.fillColor,
    },
})
