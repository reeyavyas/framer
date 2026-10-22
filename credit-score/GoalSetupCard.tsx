import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import { setGoal, useGoal } from "./GoalStore.tsx"

// Goals tab: the goal card's contents, in three states. No goal: the
// current score circle, a "?" goal circle, an intro and Set Up Your Goal.
// Form: a goal score slider (current + 1 to 850), a months slider snapping
// to 6 / 12 / 18 / 24, an optional reason and Next, which saves the goal to
// GoalStore. Set: "Your Credit Goal" and the two circles. Opening the tab
// with a goal already set goes straight to Set. No card chrome: it sits in
// a native card frame. Built for the 1080-wide kiosk.

interface Props {
    currentScore: number
    startGoal: number
    introTitle: string
    introText: string
    startButton: string
    formTitle: string
    formText: string
    scoreQuestion: string
    monthsQuestion: string
    reasonQuestion: string
    reasons: string[]
    nextButton: string
    setTitle: string
    poweredBy: string
    poweredBrand: string
    textColor: string
    captionColor: string
    accentColor: string
    circleColor: string
    borderColor: string
    pillColor: string
    buttonColor: string
    buttonTextColor: string
    titleFont: React.CSSProperties
    bodyFont: React.CSSProperties
    captionFont: React.CSSProperties
    numberFont: React.CSSProperties
    ratingFont: React.CSSProperties
    buttonFont: React.CSSProperties
}

type Phase = "empty" | "form"

const MAX_SCORE = 850
const MONTHS = [6, 12, 18, 24]

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 906
 */
export default function GoalSetupCard(props: Props) {
    const goal = useGoal()
    const current = Math.min(MAX_SCORE - 1, Math.round(props.currentScore))
    const minGoal = current + 1
    const [phase, setPhase] = React.useState<Phase>("empty")
    const [score, setScore] = React.useState(() =>
        clamp(Math.round(props.startGoal), minGoal, MAX_SCORE)
    )
    const [months, setMonths] = React.useState(12)
    const [reason, setReason] = React.useState("")
    const [listOpen, setListOpen] = React.useState(false)

    const shownGoal = goal ? goal.score : phase === "form" ? score : null
    const text = { color: props.textColor }

    const button = (label: string, onTap: () => void) => (
        <motion.button
            type="button"
            onClick={onTap}
            whileTap={{ scale: 0.97 }}
            style={{
                alignSelf: "flex-start",
                padding: "30px 64px",
                border: "none",
                borderRadius: 8,
                background: props.buttonColor,
                color: props.buttonTextColor,
                cursor: "pointer",
                ...props.buttonFont,
            }}
        >
            {label}
        </motion.button>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {goal && (
                <div style={{ ...props.titleFont, ...text }}>
                    {props.setTitle}
                </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: `${CIRCLE}px 1fr ${CIRCLE}px`,
                        columnGap: 8,
                        rowGap: 20,
                        alignItems: "center",
                    }}
                >
                    <Caption {...props}>Current Score</Caption>
                    <span />
                    <Caption {...props}>Score Goal</Caption>
                    <Circle color={props.circleColor}>
                        <span style={{ ...props.numberFont, ...text }}>
                            {current}
                        </span>
                        <span style={{ ...props.ratingFont, ...text }}>
                            {ratingOf(current)}
                        </span>
                    </Circle>
                    <Arrow
                        color={props.textColor}
                        points={
                            shownGoal === null
                                ? ""
                                : `${shownGoal - current} points`
                        }
                        font={props.ratingFont}
                    />
                    <Circle color={props.circleColor}>
                        <span
                            style={{
                                ...props.numberFont,
                                color: props.accentColor,
                            }}
                        >
                            {shownGoal ?? "?"}
                        </span>
                        {shownGoal !== null && (
                            <span
                                style={{
                                    ...props.ratingFont,
                                    color: props.accentColor,
                                }}
                            >
                                {ratingOf(shownGoal)}
                            </span>
                        )}
                    </Circle>
                </div>
                {props.poweredBy && (
                    <div
                        style={{
                            ...props.bodyFont,
                            ...text,
                            textAlign: "center",
                        }}
                    >
                        {props.poweredBy} <b>{props.poweredBrand}</b>
                    </div>
                )}
            </div>

            {!goal && phase === "empty" && (
                <>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 32,
                        }}
                    >
                        <div style={{ ...props.titleFont, ...text }}>
                            {props.introTitle}
                        </div>
                        <div
                            style={{
                                ...props.bodyFont,
                                ...text,
                                whiteSpace: "pre-line",
                            }}
                        >
                            {props.introText}
                        </div>
                    </div>
                    {button(props.startButton, () => setPhase("form"))}
                </>
            )}

            {!goal && phase === "form" && (
                <>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 32,
                        }}
                    >
                        <div style={{ ...props.titleFont, ...text }}>
                            {props.formTitle}
                        </div>
                        <div style={{ ...props.bodyFont, ...text }}>
                            {props.formText}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 24,
                        }}
                    >
                        <div style={{ ...props.bodyFont, ...text }}>
                            {props.scoreQuestion}
                        </div>
                        <Slider
                            label={props.scoreQuestion}
                            value={score}
                            min={minGoal}
                            max={MAX_SCORE}
                            step={1}
                            onChange={setScore}
                            color={props.accentColor}
                            pill={{
                                color: props.pillColor,
                                textColor: props.accentColor,
                                font: props.ratingFont,
                            }}
                        />
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                ...props.bodyFont,
                                ...text,
                            }}
                        >
                            <span>{minGoal}</span>
                            <span>{MAX_SCORE}</span>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 24,
                        }}
                    >
                        <div style={{ ...props.bodyFont, ...text }}>
                            {props.monthsQuestion}
                        </div>
                        <Slider
                            label={props.monthsQuestion}
                            value={months}
                            min={MONTHS[0]}
                            max={MONTHS[MONTHS.length - 1]}
                            step={6}
                            onChange={setMonths}
                            color={props.accentColor}
                        />
                        <div style={{ position: "relative", height: LABEL_H }}>
                            {MONTHS.map((m, i) => (
                                <span
                                    key={m}
                                    style={{
                                        position: "absolute",
                                        left: `${(i / (MONTHS.length - 1)) * 100}%`,
                                        transform: `translateX(${
                                            i === 0
                                                ? 0
                                                : i === MONTHS.length - 1
                                                  ? -100
                                                  : -50
                                        }%)`,
                                        ...props.bodyFont,
                                        ...(m === months
                                            ? {
                                                  color: props.accentColor,
                                                  fontWeight: 700,
                                              }
                                            : text),
                                    }}
                                >
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 24,
                        }}
                    >
                        <div style={{ ...props.bodyFont, ...text }}>
                            {props.reasonQuestion}
                        </div>
                        <ReasonPicker
                            {...props}
                            value={reason}
                            open={listOpen}
                            onToggle={() => setListOpen(!listOpen)}
                            onPick={(r) => {
                                setReason(reason === r ? "" : r)
                                setListOpen(false)
                            }}
                        />
                    </div>

                    {button(props.nextButton, () =>
                        setGoal({ score, months, reason })
                    )}
                </>
            )}
        </div>
    )
}

const CIRCLE = 280
const HANDLE = 52
const LABEL_H = 48

function clamp(n: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, n))
}

// Same bands as CreditScoreGauge.
function ratingOf(score: number): string {
    if (score >= 780) return "Excellent"
    if (score >= 660) return "Good"
    if (score >= 600) return "Fair"
    if (score >= 500) return "Unfavorable"
    return "Deficient"
}

function Caption(props: Props & { children: React.ReactNode }) {
    return (
        <span
            style={{
                ...props.captionFont,
                color: props.textColor,
                textAlign: "center",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
            }}
        >
            {props.children}
        </span>
    )
}

function Circle(props: { color: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: "50%",
                background: props.color,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
            }}
        >
            {props.children}
        </div>
    )
}

// Dotted arrow between the circles, with the points gap under it.
function Arrow(props: {
    color: string
    points: string
    font: React.CSSProperties
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "0 8px",
                // The points line sits under the arrow, so drop the block by
                // its own height to keep the arrow on the circles' centre.
                marginTop: props.points ? LABEL_H + 16 : 0,
            }}
        >
            <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
                <div
                    style={{
                        flex: 1,
                        borderTop: `3px dashed ${props.color}`,
                    }}
                />
                <svg width={16} height={20} viewBox="0 0 16 20" aria-hidden>
                    <path d="M0 0 L16 10 L0 20 Z" fill={props.color} />
                </svg>
            </div>
            {props.points && (
                <span
                    style={{
                        ...props.font,
                        color: props.color,
                        height: LABEL_H,
                        whiteSpace: "nowrap",
                    }}
                >
                    {props.points}
                </span>
            )}
        </div>
    )
}

// A drag slider: navy track, white handle; snaps to `step`. Arrow keys,
// Home and End work once it has focus.
function Slider(props: {
    label: string
    value: number
    min: number
    max: number
    step: number
    onChange: (v: number) => void
    color: string
    pill?: { color: string; textColor: string; font: React.CSSProperties }
}) {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const { min, max, step } = props
    const pct = ((props.value - min) / (max - min)) * 100

    const set = (v: number) =>
        props.onChange(
            clamp(min + Math.round((v - min) / step) * step, min, max)
        )

    const fromPointer = (e: React.PointerEvent) => {
        const r = trackRef.current!.getBoundingClientRect()
        set(min + clamp((e.clientX - r.left) / r.width, 0, 1) * (max - min))
    }

    return (
        <div style={{ paddingTop: props.pill ? 72 : 0 }}>
            <div
                ref={trackRef}
                role="slider"
                aria-label={props.label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={props.value}
                tabIndex={0}
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    fromPointer(e)
                }}
                onPointerMove={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                        fromPointer(e)
                }}
                onKeyDown={(e) => {
                    const v = props.value
                    const next =
                        e.key === "ArrowLeft" || e.key === "ArrowDown"
                            ? v - step
                            : e.key === "ArrowRight" || e.key === "ArrowUp"
                              ? v + step
                              : e.key === "Home"
                                ? min
                                : e.key === "End"
                                  ? max
                                  : null
                    if (next === null) return
                    e.preventDefault()
                    set(next)
                }}
                style={{
                    position: "relative",
                    height: HANDLE,
                    cursor: "pointer",
                    touchAction: "none",
                    outlineOffset: 8,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: HANDLE / 2 - 2,
                        height: 4,
                        background: props.color,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: `calc(${pct}% - ${HANDLE / 2}px)`,
                        width: HANDLE,
                        height: HANDLE,
                        boxSizing: "border-box",
                        borderRadius: "50%",
                        border: `5px solid ${props.color}`,
                        background: "#FFFFFF",
                    }}
                />
                {props.pill && (
                    <span
                        style={{
                            position: "absolute",
                            bottom: HANDLE + 16,
                            // Kept inside the card at both ends.
                            left: `clamp(70px, ${pct}%, calc(100% - 70px))`,
                            transform: "translateX(-50%)",
                            padding: "6px 30px",
                            borderRadius: 999,
                            background: props.pill.color,
                            ...props.pill.font,
                            color: props.pill.textColor,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {props.value}
                    </span>
                )}
            </div>
        </div>
    )
}

// The optional reason: a field with a chevron that opens the list below it
// (it pushes the content down rather than floating over it).
function ReasonPicker(
    props: Props & {
        value: string
        open: boolean
        onToggle: () => void
        onPick: (r: string) => void
    }
) {
    const border = `2px solid ${props.borderColor}`
    return (
        <div style={{ border, borderRadius: 6, background: "#FFFFFF" }}>
            <div
                role="button"
                aria-expanded={props.open}
                tabIndex={0}
                onClick={props.onToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        props.onToggle()
                    }
                }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    minHeight: 120,
                    padding: "0 40px",
                    cursor: "pointer",
                }}
            >
                <span
                    style={{
                        flex: 1,
                        ...props.bodyFont,
                        color: props.value
                            ? props.textColor
                            : props.captionColor,
                    }}
                >
                    {props.value || "Select"}
                </span>
                <svg
                    width={28}
                    height={28}
                    viewBox="0 0 28 28"
                    aria-hidden
                    style={{
                        transform: props.open ? "rotate(180deg)" : undefined,
                    }}
                >
                    <path
                        d="M5 10 L14 19 L23 10"
                        fill="none"
                        stroke={props.textColor}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            {props.open && (
                <div role="listbox" aria-label={props.reasonQuestion}>
                    {props.reasons.map((r) => (
                        <motion.div
                            key={r}
                            role="option"
                            aria-selected={r === props.value}
                            tabIndex={0}
                            onClick={() => props.onPick(r)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    props.onPick(r)
                                }
                            }}
                            whileTap={{ backgroundColor: "#F2F2F2" }}
                            style={{
                                padding: "32px 40px",
                                cursor: "pointer",
                                backgroundColor: "#FFFFFF",
                                ...props.bodyFont,
                                fontWeight: r === props.value ? 700 : 500,
                                color:
                                    r === props.value
                                        ? props.accentColor
                                        : props.textColor,
                            }}
                        >
                            {r}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}

GoalSetupCard.defaultProps = {
    currentScore: 720,
    startGoal: 760,
    introTitle: "Improve your credit score",
    introText:
        "Begin your journey toward better financial health by improving your credit score. Simply select a desired credit score goal, follow personalized recommendations, and track your progress over time.\nGet started today!",
    startButton: "Set Up Your Goal",
    formTitle: "Set up your goal",
    formText:
        "Discover what others like you have done to reach their credit goals. Simply drag the sliders to select your goal score and timeframe and click on Next.",
    scoreQuestion: "Select your credit score goal",
    monthsQuestion: "In how many months do you want to achieve your goal?",
    reasonQuestion: "Why are you setting up a goal? (optional)",
    reasons: [
        "Other",
        "I plan to buy a car",
        "To improve my financial health",
        "I am planning another big purchase that requires credit",
        "I plan to buy a house",
    ],
    nextButton: "Next",
    setTitle: "Your Credit Goal",
    poweredBy: "Powered by",
    poweredBrand: "VantageScore®",
    textColor: "#212121",
    captionColor: "#757575",
    accentColor: "#0E335E",
    circleColor: "#EEF0F3",
    borderColor: "#E3E3E3",
    pillColor: "#E3E8EF",
    buttonColor: "#0D294B",
    buttonTextColor: "#FFFFFF",
}

addPropertyControls(GoalSetupCard, {
    currentScore: {
        type: ControlType.Number,
        title: "Current Score",
        min: 300,
        max: 849,
        step: 1,
        displayStepper: true,
        defaultValue: GoalSetupCard.defaultProps.currentScore,
    },
    startGoal: {
        type: ControlType.Number,
        title: "Start Goal",
        description: "Where the score slider starts.",
        min: 301,
        max: 850,
        step: 1,
        displayStepper: true,
        defaultValue: GoalSetupCard.defaultProps.startGoal,
    },
    introTitle: {
        type: ControlType.String,
        title: "Intro Title",
        defaultValue: GoalSetupCard.defaultProps.introTitle,
    },
    introText: {
        type: ControlType.String,
        title: "Intro Text",
        displayTextArea: true,
        defaultValue: GoalSetupCard.defaultProps.introText,
    },
    startButton: {
        type: ControlType.String,
        title: "Start Button",
        defaultValue: GoalSetupCard.defaultProps.startButton,
    },
    formTitle: {
        type: ControlType.String,
        title: "Form Title",
        defaultValue: GoalSetupCard.defaultProps.formTitle,
    },
    formText: {
        type: ControlType.String,
        title: "Form Text",
        displayTextArea: true,
        defaultValue: GoalSetupCard.defaultProps.formText,
    },
    scoreQuestion: {
        type: ControlType.String,
        title: "Score Question",
        defaultValue: GoalSetupCard.defaultProps.scoreQuestion,
    },
    monthsQuestion: {
        type: ControlType.String,
        title: "Months Question",
        defaultValue: GoalSetupCard.defaultProps.monthsQuestion,
    },
    reasonQuestion: {
        type: ControlType.String,
        title: "Reason Question",
        defaultValue: GoalSetupCard.defaultProps.reasonQuestion,
    },
    reasons: {
        type: ControlType.Array,
        title: "Reasons",
        maxCount: 8,
        control: { type: ControlType.String },
        defaultValue: GoalSetupCard.defaultProps.reasons,
    },
    nextButton: {
        type: ControlType.String,
        title: "Next Button",
        defaultValue: GoalSetupCard.defaultProps.nextButton,
    },
    setTitle: {
        type: ControlType.String,
        title: "Set Title",
        defaultValue: GoalSetupCard.defaultProps.setTitle,
    },
    poweredBy: {
        type: ControlType.String,
        title: "Powered By",
        description: "Blank hides the line.",
        defaultValue: GoalSetupCard.defaultProps.poweredBy,
    },
    poweredBrand: {
        type: ControlType.String,
        title: "Powered Brand",
        defaultValue: GoalSetupCard.defaultProps.poweredBrand,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: GoalSetupCard.defaultProps.textColor,
    },
    captionColor: {
        type: ControlType.Color,
        title: "Placeholder",
        defaultValue: GoalSetupCard.defaultProps.captionColor,
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: GoalSetupCard.defaultProps.accentColor,
    },
    circleColor: {
        type: ControlType.Color,
        title: "Circle",
        defaultValue: GoalSetupCard.defaultProps.circleColor,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: GoalSetupCard.defaultProps.borderColor,
    },
    pillColor: {
        type: ControlType.Color,
        title: "Pill",
        defaultValue: GoalSetupCard.defaultProps.pillColor,
    },
    buttonColor: {
        type: ControlType.Color,
        title: "Button",
        defaultValue: GoalSetupCard.defaultProps.buttonColor,
    },
    buttonTextColor: {
        type: ControlType.Color,
        title: "Button Text",
        defaultValue: GoalSetupCard.defaultProps.buttonTextColor,
    },
    titleFont: {
        type: ControlType.Font,
        title: "Title Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 44, variant: "Bold" },
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 36, variant: "Regular", lineHeight: 1.4 },
    },
    captionFont: {
        type: ControlType.Font,
        title: "Caption Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30, variant: "Medium" },
    },
    numberFont: {
        type: ControlType.Font,
        title: "Number Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 84, variant: "Bold" },
    },
    ratingFont: {
        type: ControlType.Font,
        title: "Rating Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Medium" },
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 40, variant: "Semibold" },
    },
})
