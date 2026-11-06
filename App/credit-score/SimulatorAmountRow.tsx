import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import { newEntryKey, onReset, remove, setPoints } from "./SimulatorStore.tsx"

// Simulator tab: one tap-to-fill amount row. Off, the field shows the grey
// placeholder ("$0"); a tap fills in the owner's amount with an ⓧ and adds
// the row's points to SimulatorStore; a second tap or the ⓧ clears it. The
// − / + steppers are shown greyed and never respond: visitors can't set
// values. Built for the 1080-wide kiosk.

type Align = "left" | "centre"
type Steppers = "right" | "split" | "hidden"

interface Props {
    rowId: string
    label: string
    showLabel: boolean
    amountText: string
    placeholder: string
    points: number
    startsOn: boolean
    align: Align
    steppers: Steppers
    fieldColor: string
    borderColor: string
    pressColor: string
    placeholderColor: string
    valueColor: string
    stepperColor: string
    clearColor: string
    labelColor: string
    labelFont: React.CSSProperties
    valueFont: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 860
 */
export default function SimulatorAmountRow(props: Props) {
    const [on, setOn] = React.useState(props.startsOn)
    useRowEntry(props.rowId, on ? props.points : null, () =>
        setOn(props.startsOn)
    )
    // Follow the property when it's changed on the canvas.
    React.useEffect(() => setOn(props.startsOn), [props.startsOn])

    const stepper = (sign: "−" | "+") => (
        <div
            aria-hidden
            style={{
                width: FIELD_H,
                alignSelf: "stretch",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderLeft:
                    sign === "+" || props.steppers === "right"
                        ? `2px solid ${props.borderColor}`
                        : undefined,
                borderRight:
                    sign === "−" && props.steppers === "split"
                        ? `2px solid ${props.borderColor}`
                        : undefined,
                pointerEvents: "none",
            }}
        >
            <StepGlyph sign={sign} color={props.stepperColor} />
        </div>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {props.showLabel && (
                <div style={{ ...props.labelFont, color: props.labelColor }}>
                    {props.label}
                </div>
            )}
            <div
                style={{
                    display: "flex",
                    height: FIELD_H,
                    border: `2px solid ${props.borderColor}`,
                    borderRadius: 6,
                    background: props.fieldColor,
                    overflow: "hidden",
                }}
            >
                {props.steppers === "split" && stepper("−")}
                <motion.div
                    role="button"
                    aria-pressed={on}
                    aria-label={`${props.label}: ${on ? props.amountText : props.placeholder}`}
                    tabIndex={0}
                    onClick={() => setOn(!on)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setOn(!on)
                    }}
                    whileTap={{ backgroundColor: props.pressColor }}
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            props.align === "centre" ? "center" : "flex-start",
                        gap: 16,
                        padding: "0 32px",
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: props.fieldColor,
                    }}
                >
                    <span
                        style={{
                            ...props.valueFont,
                            color: on
                                ? props.valueColor
                                : props.placeholderColor,
                        }}
                    >
                        {on ? props.amountText : props.placeholder}
                    </span>
                    {on &&
                        renderClearIcon({
                            color: props.clearColor,
                            onClear: () => setOn(false),
                            style: { position: "absolute", right: 32 },
                        })}
                </motion.div>
                {props.steppers === "right" && stepper("−")}
                {props.steppers !== "hidden" && stepper("+")}
            </div>
        </div>
    )
}

const FIELD_H = 104

// Shared by the Simulator rows: one store entry per instance, reporting
// `points` (null = off), answering Reset, and removed on unmount.
export function useRowEntry(
    rowId: string,
    points: number | null,
    onResetRow: () => void
) {
    const key = React.useRef<string>(undefined)
    if (key.current === undefined) key.current = newEntryKey(rowId)
    const resetRef = React.useRef(onResetRow)
    resetRef.current = onResetRow

    React.useEffect(() => {
        setPoints(key.current!, points)
    }, [points])
    React.useEffect(() => onReset(() => resetRef.current()), [])
    React.useEffect(
        () => () => {
            remove(key.current!)
        },
        []
    )
}

// The small ⓧ that clears a filled field. Not exported: Framer lists every
// exported function that returns JSX as a component in Assets.
function renderClearIcon(props: {
    color: string
    onClear: () => void
    style?: React.CSSProperties
}) {
    return (
        <span
            role="button"
            aria-label="Clear"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation()
                props.onClear()
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    props.onClear()
                }
            }}
            style={{
                display: "flex",
                padding: 12,
                margin: -12,
                cursor: "pointer",
                ...props.style,
            }}
        >
            <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden>
                <circle
                    cx={16}
                    cy={16}
                    r={14}
                    fill="none"
                    stroke={props.color}
                    strokeWidth={2}
                />
                <path
                    d="M11 11 L21 21 M21 11 L11 21"
                    stroke={props.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                />
            </svg>
        </span>
    )
}

function StepGlyph(props: { sign: "−" | "+"; color: string }) {
    return (
        <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden>
            <path
                d={props.sign === "+" ? "M4 18 H32 M18 4 V32" : "M4 18 H32"}
                stroke={props.color}
                strokeWidth={4}
                strokeLinecap="round"
            />
        </svg>
    )
}

SimulatorAmountRow.defaultProps = {
    rowId: "newCardLimit",
    label: "Get a new credit card with a credit limit of",
    showLabel: true,
    amountText: "$2,500",
    placeholder: "$0",
    points: -9,
    startsOn: false,
    align: "left" as Align,
    steppers: "right" as Steppers,
    fieldColor: "#FFFFFF",
    borderColor: "#E3E3E3",
    pressColor: "#F2F2F2",
    placeholderColor: "#9E9E9E",
    valueColor: "#212121",
    stepperColor: "#D0D0D0",
    clearColor: "#9E9E9E",
    labelColor: "#212121",
}

addPropertyControls(SimulatorAmountRow, {
    rowId: {
        type: ControlType.String,
        title: "Row ID",
        defaultValue: SimulatorAmountRow.defaultProps.rowId,
    },
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: SimulatorAmountRow.defaultProps.label,
    },
    showLabel: {
        type: ControlType.Boolean,
        title: "Show Label",
        defaultValue: SimulatorAmountRow.defaultProps.showLabel,
    },
    amountText: {
        type: ControlType.String,
        title: "Amount Text",
        defaultValue: SimulatorAmountRow.defaultProps.amountText,
    },
    placeholder: {
        type: ControlType.String,
        title: "Placeholder",
        defaultValue: SimulatorAmountRow.defaultProps.placeholder,
    },
    points: {
        type: ControlType.Number,
        title: "Points",
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        defaultValue: SimulatorAmountRow.defaultProps.points,
    },
    startsOn: {
        type: ControlType.Boolean,
        title: "Starts On",
        defaultValue: SimulatorAmountRow.defaultProps.startsOn,
    },
    align: {
        type: ControlType.Enum,
        title: "Align Value",
        options: ["left", "centre"],
        optionTitles: ["Left", "Centre"],
        displaySegmentedControl: true,
        defaultValue: SimulatorAmountRow.defaultProps.align,
    },
    steppers: {
        type: ControlType.Enum,
        title: "Steppers",
        options: ["right", "split", "hidden"],
        optionTitles: ["Right", "Split", "Hidden"],
        defaultValue: SimulatorAmountRow.defaultProps.steppers,
    },
    fieldColor: {
        type: ControlType.Color,
        title: "Field",
        defaultValue: SimulatorAmountRow.defaultProps.fieldColor,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: SimulatorAmountRow.defaultProps.borderColor,
    },
    pressColor: {
        type: ControlType.Color,
        title: "Press Tint",
        defaultValue: SimulatorAmountRow.defaultProps.pressColor,
    },
    placeholderColor: {
        type: ControlType.Color,
        title: "Placeholder",
        defaultValue: SimulatorAmountRow.defaultProps.placeholderColor,
    },
    valueColor: {
        type: ControlType.Color,
        title: "Value",
        defaultValue: SimulatorAmountRow.defaultProps.valueColor,
    },
    stepperColor: {
        type: ControlType.Color,
        title: "Steppers",
        defaultValue: SimulatorAmountRow.defaultProps.stepperColor,
        hidden: (props: Partial<Props>) => props.steppers === "hidden",
    },
    clearColor: {
        type: ControlType.Color,
        title: "Clear Icon",
        defaultValue: SimulatorAmountRow.defaultProps.clearColor,
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label",
        defaultValue: SimulatorAmountRow.defaultProps.labelColor,
        hidden: (props: Partial<Props>) => !props.showLabel,
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 33, variant: "Regular" },
        hidden: (props: Partial<Props>) => !props.showLabel,
    },
    valueFont: {
        type: ControlType.Font,
        title: "Value Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 38, variant: "Regular" },
    },
})
