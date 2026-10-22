import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { animate } from "framer-motion"
// The grey Credit Score Simulator icon from the Credit Score Icons vector set.
import SimulatorIcon from "https://framer.com/m/Credit-Score-Simulator-Grey-ndndRc.js"
import {
    anyOn,
    resetAll,
    simulatedScore,
    subscribe,
    totalPoints,
} from "./SimulatorStore.tsx"
import {
    arc,
    CX,
    CY,
    GRADIENT_STOPS,
    H,
    polar,
    R,
    RANGES,
    W,
} from "./MiniScoreGauge.tsx"

// Simulator tab: current and simulated score gauges side by side, drawn
// like MiniScoreGauge. The simulated side sums the points every Simulator
// row reports to SimulatorStore. Until a row is on it shows only the grey
// track and the connected icon; then the score, a ▼/▲ with the change, and
// Reset. Built for the 1080-wide kiosk.

interface Props {
    currentScore: number
    min: number
    max: number
    currentLabel: string
    simulatedLabel: string
    resetText: string
    iconSize: number
    showIconWhenEmpty: boolean
    showArrow: boolean
    downColor: string
    upColor: string
    trackColor: string
    textColor: string
    resetColor: string
    scoreFont: React.CSSProperties
    labelFont: React.CSSProperties
    changeFont: React.CSSProperties
    resetFont: React.CSSProperties
    animateScore: boolean
    duration: number
    previewPoints: number
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 860
 */
export default function SimulatorScoreHeader(props: Props) {
    const { min, max, currentScore } = props
    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const storeTotal = React.useSyncExternalStore(subscribe, totalPoints)
    const storeOn = React.useSyncExternalStore(subscribe, anyOn)

    // Each visit starts from the rows' own Starts On settings.
    React.useEffect(() => {
        resetAll()
    }, [])

    const preview = onCanvas ? props.previewPoints : 0
    const filled = storeOn || preview !== 0
    const target = Math.min(
        max,
        Math.max(min, simulatedScore(currentScore, min, max) + preview)
    )
    void storeTotal // re-render trigger; the sum is read through simulatedScore

    const shown = useTweened(
        filled ? target : currentScore,
        props.animateScore && !onCanvas,
        props.duration
    )
    const score = Math.round(shown)
    const diff = score - currentScore

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 40,
                width: "100%",
                color: props.textColor,
                fontFamily: "Inter, sans-serif",
            }}
        >
            <Gauge
                {...props}
                label={props.currentLabel}
                score={currentScore}
                filled
            >
                <span style={{ ...props.scoreFont, ...SIT_ON_LINE }}>
                    {currentScore}
                </span>
            </Gauge>
            <Gauge
                {...props}
                label={props.simulatedLabel}
                score={score}
                filled={filled}
                reset={filled ? props.resetText : undefined}
            >
                {filled ? (
                    // The number and the change centre together as one group.
                    // The change is an inline-block, so its last line (the
                    // points) sits on the score's baseline: the digits' bottoms
                    // line up whatever the two font sizes are.
                    <span
                        style={{
                            whiteSpace: "nowrap",
                            fontSize: props.scoreFont?.fontSize,
                            ...SIT_ON_LINE,
                        }}
                    >
                        <span style={{ ...props.scoreFont, lineHeight: 1 }}>
                            {score}
                        </span>
                        {props.showArrow && (
                            <span
                                style={{
                                    display: "inline-block",
                                    textAlign: "center",
                                    marginLeft: 8,
                                    ...props.changeFont,
                                    lineHeight: 1,
                                }}
                            >
                                {/* A drawn triangle: the stroke in the fill colour
                                    with round joins softens its corners. */}
                                <svg
                                    aria-hidden
                                    viewBox="0 0 20 16"
                                    style={{
                                        display: "block",
                                        width: "0.8em",
                                        height: "0.64em",
                                        margin: "0 auto 0.15em",
                                    }}
                                >
                                    <path
                                        d={
                                            diff < 0
                                                ? "M3 3 L17 3 L10 13 Z"
                                                : "M10 3 L17 13 L3 13 Z"
                                        }
                                        fill={
                                            diff < 0
                                                ? props.downColor
                                                : props.upColor
                                        }
                                        stroke={
                                            diff < 0
                                                ? props.downColor
                                                : props.upColor
                                        }
                                        strokeWidth={3}
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <span style={{ display: "block" }}>
                                    <span style={visuallyHidden}>
                                        {diff < 0 ? "down " : "up "}
                                    </span>
                                    {Math.abs(diff)}
                                </span>
                            </span>
                        )}
                    </span>
                ) : (
                    props.showIconWhenEmpty && (
                        <SimulatorIcon
                            style={{
                                width: props.iconSize,
                                height: props.iconSize,
                                // The atom ends 3.05px above the bottom of its
                                // 40px vector frame; drop it onto the line.
                                // shortcut: tied to the current drawing; redo if
                                // the vector's frame changes.
                                marginBottom: -props.iconSize * (3.05 / 40),
                            }}
                        />
                    )
                )}
            </Gauge>
        </div>
    )
}

function Gauge(
    props: Props & {
        label: string
        score: number
        filled: boolean
        reset?: string
        children?: React.ReactNode
    }
) {
    const { min, max } = props
    const id = "s" + React.useId().replace(/:/g, "")
    const s = Math.min(max, Math.max(min, props.score))
    const end = max > min ? 180 - ((s - min) / (max - min)) * 180 : 180
    const dot = polar(end)
    // Below the first range (Min set under 300) falls back to its colour.
    const color = ([...RANGES].reverse().find((r) => s >= r.from) ?? RANGES[0])
        .color

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
            }}
        >
            {/* Letter spacing also follows the last letter; the same space on
                the left keeps the visible letters centred over the arc. */}
            <div
                style={{
                    ...props.labelFont,
                    textTransform: "uppercase",
                    paddingLeft: props.labelFont?.letterSpacing,
                }}
            >
                {props.label}
            </div>
            <div style={{ position: "relative", width: W, height: H }}>
                <svg
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ display: "block" }}
                    aria-hidden
                >
                    <defs>
                        <linearGradient
                            id={id}
                            gradientUnits="userSpaceOnUse"
                            x1={CX - R}
                            x2={CX + R}
                            y1={0}
                            y2={0}
                        >
                            {GRADIENT_STOPS.map((g) => (
                                <stop
                                    key={g.offset}
                                    offset={g.offset}
                                    stopColor={g.color}
                                />
                            ))}
                        </linearGradient>
                    </defs>
                    <path
                        d={arc(180, 0)}
                        fill="none"
                        stroke={props.trackColor}
                        strokeWidth={6}
                        strokeLinecap="round"
                    />
                    {props.filled && s > min && (
                        <path
                            d={arc(180, end)}
                            fill="none"
                            stroke={`url(#${id})`}
                            strokeWidth={6}
                            strokeLinecap="round"
                        />
                    )}
                    {props.filled && (
                        <circle cx={dot.x} cy={dot.y} r={8} fill={color} />
                    )}
                    {[min, max].map((v, i) => (
                        <text
                            key={i}
                            x={i ? CX + R : CX - R}
                            y={CY + 48}
                            fontSize={28}
                            fontWeight={500}
                            textAnchor="middle"
                            fill={props.textColor}
                        >
                            {v}
                        </text>
                    ))}
                </svg>
                {/* The score (or the icon) sits on the line where the arc ends. */}
                <div
                    role={props.filled ? "status" : undefined}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: H - CY,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "flex-end",
                    }}
                >
                    {props.children}
                </div>
                {props.reset && (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={resetAll}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") resetAll()
                        }}
                        style={{
                            position: "absolute",
                            left: CX - 90,
                            width: 180,
                            top: CY + 10,
                            height: 56,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: props.resetColor,
                            ...props.resetFont,
                        }}
                    >
                        {props.reset}
                    </div>
                )}
            </div>
        </div>
    )
}

// Animates toward target; jumps when animation is off (and on the canvas).
function useTweened(target: number, on: boolean, duration: number): number {
    const [value, setValue] = React.useState(target)
    const latest = React.useRef<number>(target)
    React.useEffect(() => {
        if (!on) {
            latest.current = target
            setValue(target)
            return
        }
        const controls = animate(latest.current, target, {
            duration,
            ease: "easeOut",
            onUpdate: (v) => {
                latest.current = v
                setValue(v)
            },
        })
        return () => controls.stop()
    }, [target, on, duration])
    return value
}

// Puts the digits' baseline on the box's bottom edge: with line-height 1,
// Inter's baseline sits 0.136em above the bottom of the line box.
// shortcut: assumes Inter's metrics; recheck if the score font changes.
const SIT_ON_LINE: React.CSSProperties = {
    lineHeight: 1,
    marginBottom: "-0.136em",
}

const visuallyHidden: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
}

SimulatorScoreHeader.defaultProps = {
    currentScore: 742,
    min: 300,
    max: 850,
    currentLabel: "Current Score",
    simulatedLabel: "Simulated Score",
    resetText: "Reset",
    showIconWhenEmpty: true,
    iconSize: 110,
    showArrow: true,
    downColor: "#E5483B",
    upColor: "#4DB67A",
    trackColor: "#E3E3E3",
    textColor: "#212121",
    resetColor: "#0D294B",
    animateScore: true,
    duration: 0.4,
    previewPoints: 0,
}

addPropertyControls(SimulatorScoreHeader, {
    currentScore: {
        type: ControlType.Number,
        title: "Current Score",
        min: 300,
        max: 850,
        step: 1,
        displayStepper: true,
        defaultValue: SimulatorScoreHeader.defaultProps.currentScore,
    },
    min: {
        type: ControlType.Number,
        title: "Min",
        step: 1,
        defaultValue: SimulatorScoreHeader.defaultProps.min,
    },
    max: {
        type: ControlType.Number,
        title: "Max",
        step: 1,
        defaultValue: SimulatorScoreHeader.defaultProps.max,
    },
    currentLabel: {
        type: ControlType.String,
        title: "Current Label",
        defaultValue: SimulatorScoreHeader.defaultProps.currentLabel,
    },
    simulatedLabel: {
        type: ControlType.String,
        title: "Simulated Label",
        defaultValue: SimulatorScoreHeader.defaultProps.simulatedLabel,
    },
    resetText: {
        type: ControlType.String,
        title: "Reset Text",
        defaultValue: SimulatorScoreHeader.defaultProps.resetText,
    },
    showIconWhenEmpty: {
        type: ControlType.Boolean,
        title: "Icon When Empty",
        defaultValue: SimulatorScoreHeader.defaultProps.showIconWhenEmpty,
    },
    iconSize: {
        type: ControlType.Number,
        title: "Icon Size",
        min: 20,
        max: 200,
        step: 1,
        unit: "px",
        defaultValue: SimulatorScoreHeader.defaultProps.iconSize,
        hidden: (props: Partial<Props>) => !props.showIconWhenEmpty,
    },
    showArrow: {
        type: ControlType.Boolean,
        title: "Show Arrow",
        defaultValue: SimulatorScoreHeader.defaultProps.showArrow,
    },
    downColor: {
        type: ControlType.Color,
        title: "Down Colour",
        defaultValue: SimulatorScoreHeader.defaultProps.downColor,
        hidden: (props: Partial<Props>) => !props.showArrow,
    },
    upColor: {
        type: ControlType.Color,
        title: "Up Colour",
        defaultValue: SimulatorScoreHeader.defaultProps.upColor,
        hidden: (props: Partial<Props>) => !props.showArrow,
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: SimulatorScoreHeader.defaultProps.trackColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: SimulatorScoreHeader.defaultProps.textColor,
    },
    resetColor: {
        type: ControlType.Color,
        title: "Reset Colour",
        defaultValue: SimulatorScoreHeader.defaultProps.resetColor,
    },
    scoreFont: {
        type: ControlType.Font,
        title: "Score Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 72, variant: "Semibold" },
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 25,
            variant: "Semibold",
            letterSpacing: "0.16em",
        },
    },
    changeFont: {
        type: ControlType.Font,
        title: "Change Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 24, variant: "Semibold" },
    },
    resetFont: {
        type: ControlType.Font,
        title: "Reset Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Bold" },
    },
    animateScore: {
        type: ControlType.Boolean,
        title: "Animate",
        defaultValue: SimulatorScoreHeader.defaultProps.animateScore,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0,
        max: 2,
        step: 0.1,
        unit: "s",
        defaultValue: SimulatorScoreHeader.defaultProps.duration,
        hidden: (props: Partial<Props>) => !props.animateScore,
    },
    previewPoints: {
        type: ControlType.Number,
        title: "Preview Points",
        min: -550,
        max: 550,
        step: 1,
        displayStepper: true,
        description: "Canvas only: shows the filled state while designing.",
        defaultValue: SimulatorScoreHeader.defaultProps.previewPoints,
    },
})
