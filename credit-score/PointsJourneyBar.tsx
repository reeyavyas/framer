import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Score Rating → Points Journey: the score's range and the next one up
// (or the one below, for Excellent) as two equal bars, with a pointer at
// the score and "Your Score" under it. The range names above the bars
// are native text on the canvas. Built for the 1080-wide kiosk.

// Same ranges and colours as CreditScoreGauge.
const RANGES = [
    { from: 300, color: "#e5483b" }, // Deficient
    { from: 500, color: "#f0832f" }, // Unfavorable
    { from: 600, color: "#f2c444" }, // Fair
    { from: 660, color: "#4db67a" }, // Good
    { from: 780, color: "#2f7f52" }, // Excellent
]
const MAX = 850
const BAR = 32
const GAP = 20
const FONT = "Inter, sans-serif"

interface Props {
    score: number
    label: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 840
 * @framerIntrinsicHeight 290
 */
export default function PointsJourneyBar(props: Props) {
    const score = Math.round(Math.min(MAX, Math.max(300, props.score)))
    let i = 0
    while (i < RANGES.length - 1 && score >= RANGES[i + 1].from) i++
    // Show the score's range and the next one; Excellent has no next, so show the one below.
    const first = Math.min(i, RANGES.length - 2)
    const pair = [0, 1].map((k) => {
        const r = RANGES[first + k]
        return { ...r, to: (RANGES[first + k + 1]?.from ?? MAX + 1) - 1 }
    })
    const half = (840 - GAP) / 2
    const k = i - first
    const within = (score - pair[k].from) / (pair[k].to - pair[k].from)
    const pointerX = k * (half + GAP) + within * half

    return (
        <div
            style={{
                position: "relative",
                width: 840,
                height: 290,
                fontFamily: FONT,
                color: "#212121",
            }}
        >
            {pair.map((r, n) => (
                <div
                    key={r.from}
                    style={{
                        position: "absolute",
                        top: 14,
                        left: n * (half + GAP),
                        width: half,
                        height: BAR,
                        background: r.color,
                        // Only the two outer ends are rounded, as in the app.
                        borderRadius:
                            n === 0
                                ? `${BAR}px 0 0 ${BAR}px`
                                : `0 ${BAR}px ${BAR}px 0`,
                    }}
                />
            ))}
            <div
                style={{
                    position: "absolute",
                    top: 14 + BAR / 2 - 24,
                    left: pointerX - 24,
                    width: 48,
                    height: 48,
                    boxSizing: "border-box",
                    borderRadius: "50%",
                    background: "#fff",
                    border: `9px solid ${pair[k].color}`,
                }}
            />

            {[
                { text: pair[0].from - 1, left: 0, align: "left" },
                {
                    text: pair[0].to,
                    left: half + GAP / 2 - 60,
                    align: "center",
                },
                { text: pair[1].to, left: 840 - 120, align: "right" },
            ].map((l) => (
                <div
                    key={l.text}
                    style={{
                        position: "absolute",
                        top: 76,
                        left: l.left,
                        width: 120,
                        textAlign: l.align as "left" | "center" | "right",
                        fontSize: 28,
                        fontWeight: 600,
                    }}
                >
                    {l.text}
                </div>
            ))}

            <div
                style={{
                    position: "absolute",
                    top: 132,
                    left: pointerX - 1,
                    width: 2,
                    height: 82,
                    background: "#555",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    top: 232,
                    left: Math.min(Math.max(pointerX - 200, 0), 840 - 400),
                    width: 400,
                    textAlign: "center",
                    fontSize: 32,
                    fontWeight: 700,
                }}
            >
                {props.label} {score}
            </div>
        </div>
    )
}

PointsJourneyBar.defaultProps = {
    score: 720,
    label: "Your Score:",
}

addPropertyControls(PointsJourneyBar, {
    score: {
        type: ControlType.Number,
        title: "Score",
        min: 300,
        max: MAX,
        step: 1,
        displayStepper: true,
    },
    label: { type: ControlType.String, title: "Label" },
})
