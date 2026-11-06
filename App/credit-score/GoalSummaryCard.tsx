import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion } from "framer-motion"
import { openGoalsTab, useGoal } from "./GoalStore.tsx"

// Analysis tab: the goal card that follows the promo cards once a goal is
// set on the Goals tab. "Your goal: N score", how many points away, a
// progress ring (always 0%: the score doesn't move in this demo) and See
// Your Progress, which opens the Goals tab through withGoalsTab. With no
// goal it renders nothing, card and all, so the stack closes up; on the
// canvas it shows Canvas Goal so it can be styled. Built for the
// 1080-wide kiosk; the card look matches the promo cards.

interface Props {
    currentScore: number
    canvasGoal: number
    title: string
    body: string
    completedLabel: string
    linkLabel: string
    textColor: string
    bodyColor: string
    linkColor: string
    ringColor: string
    dotColor: string
    titleFont: React.CSSProperties
    bodyFont: React.CSSProperties
    percentFont: React.CSSProperties
    linkFont: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1014
 */
export default function GoalSummaryCard(props: Props) {
    const goal = useGoal()
    const score =
        goal?.score ??
        (RenderTarget.current() === RenderTarget.canvas
            ? props.canvasGoal
            : null)
    if (score === null) return null

    const points = score - props.currentScore
    // "{points}" in Body becomes the bold "N points".
    const [before, after = ""] = props.body.split("{points}")

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 30,
                padding: 40,
                borderRadius: 8,
                background: "#FFFFFF",
                boxShadow: "0px 1px 6px 0px rgba(0, 0, 0, 0.2)",
                textAlign: "center",
            }}
        >
            <div style={{ ...props.titleFont, color: props.textColor }}>
                {props.title.replace("{score}", String(score))}
            </div>
            <div style={{ ...props.bodyFont, color: props.bodyColor }}>
                {before}
                {props.body.includes("{points}") && (
                    <b style={{ color: props.textColor }}>
                        {points} {points === 1 ? "point" : "points"}
                    </b>
                )}
                {after}
            </div>
            <Ring {...props} />
            <motion.div
                role="link"
                tabIndex={0}
                onClick={openGoalsTab}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        openGoalsTab()
                    }
                }}
                whileTap={{ opacity: 0.6 }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "8px 0",
                    cursor: "pointer",
                    ...props.linkFont,
                    color: props.linkColor,
                }}
            >
                {props.linkLabel}
                <svg width={49} height={24} viewBox="0 0 49 24" aria-hidden>
                    <path
                        d="M2 12 H46 M35 2 L46 12 L35 22"
                        fill="none"
                        stroke={props.linkColor}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </motion.div>
        </div>
    )
}

const RING = 340
const RING_STROKE = 8
const DOT = 18

// The progress ring at 0%: a grey circle with the start dot at the top.
function Ring(props: Props) {
    const size = props.percentFont?.fontSize
    return (
        <div style={{ position: "relative", width: RING, height: RING }}>
            <svg
                width={RING}
                height={RING}
                viewBox={`0 0 ${RING} ${RING}`}
                aria-hidden
                style={{ position: "absolute", inset: 0 }}
            >
                <circle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={(RING - DOT) / 2}
                    fill="none"
                    stroke={props.ringColor}
                    strokeWidth={RING_STROKE}
                />
                <circle
                    cx={RING / 2}
                    cy={DOT / 2}
                    r={DOT / 2}
                    fill={props.dotColor}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    color: props.textColor,
                }}
            >
                <span style={props.percentFont}>
                    0
                    <span
                        style={{
                            fontSize:
                                typeof size === "number" ? size * 0.6 : "0.6em",
                        }}
                    >
                        %
                    </span>
                </span>
                <span style={props.linkFont}>{props.completedLabel}</span>
            </div>
        </div>
    )
}

GoalSummaryCard.defaultProps = {
    currentScore: 720,
    canvasGoal: 780,
    title: "Your goal: {score} score",
    body: "You are {points} away from reaching your goal. Keep it up!",
    completedLabel: "completed",
    linkLabel: "See Your Progress",
    textColor: "#212121",
    bodyColor: "#5E5E5E",
    linkColor: "#214F80",
    ringColor: "#CFCFCF",
    dotColor: "#0E335E",
}

addPropertyControls(GoalSummaryCard, {
    currentScore: {
        type: ControlType.Number,
        title: "Current Score",
        description: "Keep it the same as GoalSetupCard's.",
        min: 300,
        max: 849,
        step: 1,
        displayStepper: true,
        defaultValue: GoalSummaryCard.defaultProps.currentScore,
    },
    canvasGoal: {
        type: ControlType.Number,
        title: "Canvas Goal",
        description:
            "Shown on the canvas only; live, the card waits for a goal.",
        min: 301,
        max: 850,
        step: 1,
        displayStepper: true,
        defaultValue: GoalSummaryCard.defaultProps.canvasGoal,
    },
    title: {
        type: ControlType.String,
        title: "Title",
        description: "{score} is the goal.",
        defaultValue: GoalSummaryCard.defaultProps.title,
    },
    body: {
        type: ControlType.String,
        title: "Body",
        description: "{points} becomes the bold points away.",
        displayTextArea: true,
        defaultValue: GoalSummaryCard.defaultProps.body,
    },
    completedLabel: {
        type: ControlType.String,
        title: "Completed",
        defaultValue: GoalSummaryCard.defaultProps.completedLabel,
    },
    linkLabel: {
        type: ControlType.String,
        title: "Link",
        defaultValue: GoalSummaryCard.defaultProps.linkLabel,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: GoalSummaryCard.defaultProps.textColor,
    },
    bodyColor: {
        type: ControlType.Color,
        title: "Body Text",
        defaultValue: GoalSummaryCard.defaultProps.bodyColor,
    },
    linkColor: {
        type: ControlType.Color,
        title: "Link",
        defaultValue: GoalSummaryCard.defaultProps.linkColor,
    },
    ringColor: {
        type: ControlType.Color,
        title: "Ring",
        defaultValue: GoalSummaryCard.defaultProps.ringColor,
    },
    dotColor: {
        type: ControlType.Color,
        title: "Ring Dot",
        defaultValue: GoalSummaryCard.defaultProps.dotColor,
    },
    titleFont: {
        type: ControlType.Font,
        title: "Title Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 40, variant: "Extra Bold", lineHeight: 1.2 },
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Medium", lineHeight: 1.4 },
    },
    percentFont: {
        type: ControlType.Font,
        title: "Percent Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 64, variant: "Extra Bold", lineHeight: 1 },
    },
    linkFont: {
        type: ControlType.Font,
        title: "Link Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 36, variant: "Extra Bold", lineHeight: 1.4 },
    },
})
