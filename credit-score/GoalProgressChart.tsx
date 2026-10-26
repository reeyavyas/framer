import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useGoal } from "./GoalStore.tsx"

// Goals tab → Track progress: a "Your goal" legend, a 6M / 1Y / 2Y toggle
// and a chart running from this month forward. Six score lines from the
// current score up to the goal; the score so far is a short navy line
// ending in a dot at this month, the goal a dashed line ending in a target
// at the same month, and a grey line marks the goal's month when it falls
// in the range. Reads the goal from GoalStore; on the canvas, or before a
// goal is set, it uses Canvas Goal and Canvas Months. The card around it
// and its title are native. Built for the 1080-wide kiosk, like
// CreditScoreEventsChart.

const W = 906
const H = 800
const TOGGLE_W = 540
const TOGGLE_H = 102
const LEFT = 94 // plot starts here; score labels sit left of it
const FIRST_X = 190 // this month
const LAST_X = 800
const PLOT_TOP = 290
const PLOT_BOTTOM = 690
const LABEL_Y = 770
const FONT = "Inter, sans-serif"

// Months shown per range (this month included) and how often one is
// labelled, as in CreditScoreEventsChart.
const RANGES = {
    "6M": { points: 6, every: 1 },
    "1Y": { points: 13, every: 3 },
    "2Y": { points: 25, every: 6 },
}
type Range = keyof typeof RANGES

interface Props {
    currentScore: number
    canvasGoal: number
    canvasMonths: number
    legendLabel: string
    lineColor: string
    gridColor: string
    markerColor: string
    textColor: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 906
 * @framerIntrinsicHeight 800
 */
export default function GoalProgressChart(props: Props) {
    const goal = useGoal()
    const [range, setRange] = React.useState<Range>("6M")
    const { points, every } = RANGES[range]
    const months = useMonthsAhead(points)

    const lo = Math.round(props.currentScore)
    const hi = Math.max(lo + 1, goal?.score ?? props.canvasGoal)
    const goalMonths = goal?.months ?? props.canvasMonths
    const y = (s: number) =>
        PLOT_BOTTOM - ((s - lo) / (hi - lo)) * (PLOT_BOTTOM - PLOT_TOP)
    const step = (LAST_X - FIRST_X) / (points - 1)
    const x = (i: number) => FIRST_X + i * step
    const ticks = Array.from({ length: 6 }, (_, i) =>
        Math.round(lo + ((hi - lo) * i) / 5)
    )

    return (
        <div style={{ width: W, height: H, position: "relative" }}>
            <div
                role="tablist"
                aria-label="Time range"
                style={{
                    position: "absolute",
                    left: 0,
                    top: 100,
                    width: TOGGLE_W,
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
                        onClick={() => setRange(r)}
                        style={{
                            flex: 1,
                            border: "none",
                            borderLeft: i ? "2px solid #e3e3e3" : "none",
                            background: "#fff",
                            fontFamily: FONT,
                            fontSize: 40,
                            fontWeight: r === range ? 700 : 400,
                            color: r === range ? props.lineColor : "#333",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        {r}
                    </button>
                ))}
            </div>

            <svg
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
                aria-label={`${range}: score ${lo} now, goal ${hi} in ${goalMonths} months`}
            >
                <line
                    x1={0}
                    x2={30}
                    y1={30}
                    y2={30}
                    stroke={props.lineColor}
                    strokeWidth={5}
                    strokeDasharray="10 8"
                />
                {target(52, 30, props.lineColor)}
                <text x={90} y={41} fontSize={32} fill={props.textColor}>
                    {props.legendLabel}
                </text>

                {ticks.map((t, i) => (
                    <g key={i}>
                        <line
                            x1={LEFT}
                            x2={W}
                            y1={y(t)}
                            y2={y(t)}
                            stroke={props.gridColor}
                            strokeWidth={2}
                            strokeDasharray="10 8"
                        />
                        <text
                            x={0}
                            y={y(t) + 10}
                            fontSize={30}
                            fill={props.textColor}
                        >
                            {t}
                        </text>
                    </g>
                ))}
                <line
                    x1={LEFT}
                    x2={LEFT}
                    y1={PLOT_TOP - 30}
                    y2={PLOT_BOTTOM}
                    stroke={props.gridColor}
                    strokeWidth={2}
                />

                {goalMonths < points && (
                    <line
                        x1={x(goalMonths)}
                        x2={x(goalMonths)}
                        y1={PLOT_TOP - 50}
                        y2={PLOT_BOTTOM}
                        stroke={props.markerColor}
                        strokeWidth={3}
                    />
                )}

                <line
                    x1={LEFT + 4}
                    x2={FIRST_X}
                    y1={y(hi)}
                    y2={y(hi)}
                    stroke={props.lineColor}
                    strokeWidth={6}
                    strokeDasharray="14 10"
                />
                {target(FIRST_X, y(hi), props.lineColor)}
                <line
                    x1={LEFT + 4}
                    x2={FIRST_X}
                    y1={y(lo)}
                    y2={y(lo)}
                    stroke={props.lineColor}
                    strokeWidth={8}
                    strokeLinecap="round"
                />
                <circle cx={FIRST_X} cy={y(lo)} r={12} fill={props.lineColor} />

                {Array.from({ length: points }, (_, i) =>
                    i % every === 0 ? (
                        <text
                            key={i}
                            x={x(i)}
                            y={LABEL_Y}
                            fontSize={30}
                            textAnchor="middle"
                            fill={props.textColor}
                            letterSpacing={1}
                            // Hidden until mounted so a server-rendered month can't flash.
                            visibility={months ? "visible" : "hidden"}
                        >
                            {months ? label(months, i, every) : "MMM"}
                        </text>
                    ) : null
                )}
            </svg>
        </div>
    )
}

// The goal marker: a ring with a dot in it.
function target(cx: number, cy: number, color: string) {
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={18}
                fill="#fff"
                stroke={color}
                strokeWidth={4}
            />
            <circle cx={cx} cy={cy} r={9} fill={color} />
        </g>
    )
}

// A shown month's label: its short name, plus its two-digit year when it is
// the first label or its year differs from the previous label's.
function label(months: Date[], i: number, every: number): string {
    const d = months[i]
    const m = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    const prev = months[i - every]
    return !prev || prev.getFullYear() !== d.getFullYear()
        ? `${m} ${String(d.getFullYear()).slice(-2)}`
        : m
}

// The first day of this month and the next `count - 1`. Undefined until
// mounted, so the server-rendered page never shows a stale month.
function useMonthsAhead(count: number): Date[] | undefined {
    const [now, setNow] = React.useState<Date>()
    React.useEffect(() => setNow(new Date()), [])
    return React.useMemo(
        () =>
            now &&
            Array.from(
                { length: count },
                (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1)
            ),
        [now, count]
    )
}

GoalProgressChart.defaultProps = {
    currentScore: 720,
    canvasGoal: 780,
    canvasMonths: 12,
    legendLabel: "Your goal",
    lineColor: "#0E335E",
    gridColor: "#D6D6D6",
    markerColor: "#9E9E9E",
    textColor: "#212121",
}

addPropertyControls(GoalProgressChart, {
    currentScore: {
        type: ControlType.Number,
        title: "Current Score",
        description: "Keep it the same as GoalSetupCard's.",
        min: 300,
        max: 849,
        step: 1,
        displayStepper: true,
        defaultValue: GoalProgressChart.defaultProps.currentScore,
    },
    canvasGoal: {
        type: ControlType.Number,
        title: "Canvas Goal",
        description: "Used until a goal is set.",
        min: 301,
        max: 850,
        step: 1,
        displayStepper: true,
        defaultValue: GoalProgressChart.defaultProps.canvasGoal,
    },
    canvasMonths: {
        type: ControlType.Number,
        title: "Canvas Months",
        min: 6,
        max: 24,
        step: 6,
        displayStepper: true,
        defaultValue: GoalProgressChart.defaultProps.canvasMonths,
    },
    legendLabel: {
        type: ControlType.String,
        title: "Legend",
        defaultValue: GoalProgressChart.defaultProps.legendLabel,
    },
    lineColor: {
        type: ControlType.Color,
        title: "Line",
        defaultValue: GoalProgressChart.defaultProps.lineColor,
    },
    gridColor: {
        type: ControlType.Color,
        title: "Grid",
        defaultValue: GoalProgressChart.defaultProps.gridColor,
    },
    markerColor: {
        type: ControlType.Color,
        title: "Goal Month",
        defaultValue: GoalProgressChart.defaultProps.markerColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: GoalProgressChart.defaultProps.textColor,
    },
})
