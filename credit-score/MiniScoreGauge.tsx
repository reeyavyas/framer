import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Score Rating → Average Score: the small single-arc gauge. The arc fills
// from 300 to the score in a red → green gradient, ending in a dot, with
// the score in the middle and 300 / 850 under the ends. Use two side by
// side ("Your score" and the ZIP average); their headings and "Rating:"
// lines are native text. Built for the 1080-wide kiosk.

const W = 330
const H = 215
const CX = W / 2
const CY = 160
const R = 140
const MIN = 300
const MAX = 850
const FONT = "Inter, sans-serif"

// Same ranges and colours as CreditScoreGauge; the dot takes its range's colour.
const RANGES = [
    { from: 300, color: "#e5483b" },
    { from: 500, color: "#f0832f" },
    { from: 600, color: "#f2c444" },
    { from: 660, color: "#4db67a" },
    { from: 780, color: "#2f7f52" },
]

interface Props {
    score: number
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 330
 * @framerIntrinsicHeight 215
 */
export default function MiniScoreGauge(props: Props) {
    const score = Math.round(Math.min(MAX, Math.max(MIN, props.score)))
    const id = "g" + React.useId().replace(/:/g, "")
    const end = 180 - ((score - MIN) / (MAX - MIN)) * 180
    const dot = polar(end)
    const color = [...RANGES].reverse().find((r) => score >= r.from)!.color

    return (
        <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ fontFamily: FONT, display: "block" }}
            role="img"
            aria-label={`Score ${score} on a scale of 300 to 850`}
        >
            <defs>
                {/* Left to right across the arc, so each point's colour matches its place on the scale. */}
                <linearGradient
                    id={id}
                    gradientUnits="userSpaceOnUse"
                    x1={CX - R}
                    x2={CX + R}
                    y1={0}
                    y2={0}
                >
                    <stop offset="0" stopColor="#e5483b" />
                    <stop offset="0.3" stopColor="#f0832f" />
                    <stop offset="0.5" stopColor="#f2c444" />
                    <stop offset="0.75" stopColor="#4db67a" />
                    <stop offset="1" stopColor="#2f7f52" />
                </linearGradient>
            </defs>
            <path
                d={arc(180, 0)}
                fill="none"
                stroke="#e4e4e4"
                strokeWidth={6}
                strokeLinecap="round"
            />
            {score > MIN && (
                <path
                    d={arc(180, end)}
                    fill="none"
                    stroke={`url(#${id})`}
                    strokeWidth={6}
                    strokeLinecap="round"
                />
            )}
            <circle cx={dot.x} cy={dot.y} r={8} fill={color} />
            <text
                x={CX}
                y={CY - 6}
                fontSize={92}
                fontWeight={600}
                textAnchor="middle"
                fill="#000"
            >
                {score}
            </text>
            <text
                x={CX - R}
                y={CY + 48}
                fontSize={28}
                fontWeight={500}
                textAnchor="middle"
                fill="#212121"
            >
                300
            </text>
            <text
                x={CX + R}
                y={CY + 48}
                fontSize={28}
                fontWeight={500}
                textAnchor="middle"
                fill="#212121"
            >
                850
            </text>
        </svg>
    )
}

function polar(deg: number) {
    const rad = (deg * Math.PI) / 180
    return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) }
}

// Clockwise on screen from the larger angle to the smaller one.
function arc(fromDeg: number, toDeg: number) {
    const a = polar(fromDeg)
    const b = polar(toDeg)
    return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`
}

MiniScoreGauge.defaultProps = {
    score: 720,
}

addPropertyControls(MiniScoreGauge, {
    score: {
        type: ControlType.Number,
        title: "Score",
        min: MIN,
        max: MAX,
        step: 1,
        displayStepper: true,
    },
})
