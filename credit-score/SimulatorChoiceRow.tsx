import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import { useRowEntry } from "./SimulatorAmountRow.tsx"

// Simulator tab: a pick-one row ("Get a new loan", "Miss a monthly
// payment"). Each option carries the owner's amount and points; tapping one
// selects it (replacing the last), tapping it again turns the row off, and
// the ⓧ clears it. Dropdown style shows the choice in a field with the
// options as chips below; Segmented shows equal segments under a fixed
// caption. With Account Choice on, the caption becomes an "All Accounts" /
// "One Account" pick and each option has a second points value for One
// Account. Built for the 1080-wide kiosk.

type Style = "dropdown" | "segmented"

interface Option {
    label: string
    amountText: string
    points: number
    pointsOne?: number
}

type Account = "all" | "one"

interface Props {
    rowId: string
    label: string
    style: Style
    fixedCaption: string
    accountChoice: boolean
    allLabel: string
    oneLabel: string
    options: Option[]
    startsOn: number
    fieldColor: string
    borderColor: string
    pressColor: string
    captionColor: string
    textColor: string
    selectedColor: string
    clearColor: string
    labelColor: string
    labelFont: React.CSSProperties
    optionFont: React.CSSProperties
    selectedFont: React.CSSProperties
    amountFont: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 860
 */
export default function SimulatorChoiceRow(props: Props) {
    const options = props.options ?? []
    // Starts On outside 1…options.length means none.
    const start =
        props.startsOn >= 1 && props.startsOn <= options.length
            ? Math.floor(props.startsOn)
            : 0
    const [selected, setSelected] = React.useState(start)
    const [account, setAccount] = React.useState<Account>("all")
    const chosen = selected ? options[selected - 1] : undefined
    const oneAccount = props.accountChoice && account === "one"
    useRowEntry(
        props.rowId,
        chosen ? ((oneAccount ? chosen.pointsOne : chosen.points) ?? 0) : null,
        () => {
            setSelected(start)
            setAccount("all")
        }
    )
    React.useEffect(() => setSelected(start), [start])

    const pick = (i: number) => setSelected(selected === i ? 0 : i)
    const border = `2px solid ${props.borderColor}`

    const field = (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: FIELD_H,
                padding: "0 32px",
                border,
                borderRadius: 6,
                background: props.fieldColor,
                gap: 16,
            }}
        >
            <span
                style={{
                    flex: 1,
                    ...props.optionFont,
                    color:
                        props.style === "dropdown" && !chosen
                            ? props.captionColor
                            : props.textColor,
                }}
            >
                {props.style === "dropdown" && chosen
                    ? chosen.label
                    : props.fixedCaption}
            </span>
            {chosen &&
                renderClearIcon({
                    color: props.clearColor,
                    onClear: () => setSelected(0),
                })}
        </div>
    )

    // One row of equal segments (or chips, Dropdown style); 1-based `current`.
    const segments = (
        items: { label: string; amountText?: string }[],
        current: number,
        onPick: (i: number) => void,
        ariaLabel: string
    ) => (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            style={{
                display: "flex",
                gap: props.style === "dropdown" ? 16 : 0,
                border: props.style === "segmented" ? border : undefined,
                borderRadius: 6,
                overflow: "hidden",
            }}
        >
            {items.map((o, idx) => {
                const i = idx + 1
                const on = current === i
                return (
                    <motion.div
                        key={i}
                        role="radio"
                        aria-checked={on}
                        tabIndex={0}
                        onClick={() => onPick(i)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onPick(i)
                        }}
                        whileTap={{ backgroundColor: props.pressColor }}
                        style={{
                            flex: 1,
                            minHeight: FIELD_H,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 12,
                            padding: "28px 8px",
                            cursor: "pointer",
                            textAlign: "center",
                            backgroundColor: props.fieldColor,
                            ...(props.style === "dropdown"
                                ? {
                                      border: on
                                          ? `3px solid ${props.selectedColor}`
                                          : border,
                                      borderRadius: 6,
                                  }
                                : {
                                      borderLeft: idx ? border : undefined,
                                  }),
                        }}
                    >
                        <span
                            style={{
                                ...(on ? props.selectedFont : props.optionFont),
                                color: on
                                    ? props.selectedColor
                                    : props.textColor,
                            }}
                        >
                            {o.label}
                        </span>
                        {o.amountText && (
                            <span
                                style={{
                                    ...props.amountFont,
                                    color: on
                                        ? props.selectedColor
                                        : props.captionColor,
                                }}
                            >
                                {o.amountText}
                            </span>
                        )}
                    </motion.div>
                )
            })}
        </div>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ ...props.labelFont, color: props.labelColor }}>
                {props.label}
            </div>
            {props.style === "segmented" && props.accountChoice
                ? segments(
                      [{ label: props.allLabel }, { label: props.oneLabel }],
                      account === "all" ? 1 : 2,
                      (i) => setAccount(i === 1 ? "all" : "one"),
                      `${props.label}: account`
                  )
                : (props.style === "dropdown" || props.fixedCaption) && field}
            {segments(options, selected, pick, props.label)}
        </div>
    )
}

const FIELD_H = 104

// The small ⓧ that clears the choice. Not exported: Framer lists every
// exported function that returns JSX as a component in Assets.
function renderClearIcon(props: { color: string; onClear: () => void }) {
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

SimulatorChoiceRow.defaultProps = {
    rowId: "newLoan",
    label: "Get a new loan",
    style: "dropdown" as Style,
    fixedCaption: "Loan Type",
    accountChoice: false,
    allLabel: "All Accounts",
    oneLabel: "One Account",
    options: [
        { label: "Auto Loan", amountText: "$28,000", points: -18 },
        { label: "Personal Loan", amountText: "$12,000", points: -14 },
        { label: "Mortgage", amountText: "$320,000", points: -35 },
    ] as Option[],
    startsOn: 0,
    fieldColor: "#FFFFFF",
    borderColor: "#E3E3E3",
    pressColor: "#F2F2F2",
    captionColor: "#9E9E9E",
    textColor: "#212121",
    selectedColor: "#0D294B",
    clearColor: "#212121",
    labelColor: "#212121",
}

addPropertyControls(SimulatorChoiceRow, {
    rowId: {
        type: ControlType.String,
        title: "Row ID",
        defaultValue: SimulatorChoiceRow.defaultProps.rowId,
    },
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: SimulatorChoiceRow.defaultProps.label,
    },
    style: {
        type: ControlType.Enum,
        title: "Style",
        options: ["dropdown", "segmented"],
        optionTitles: ["Dropdown", "Segmented"],
        displaySegmentedControl: true,
        defaultValue: SimulatorChoiceRow.defaultProps.style,
    },
    fixedCaption: {
        type: ControlType.String,
        title: "Fixed Caption",
        description: "Shown in the field; blank hides it (Segmented).",
        defaultValue: SimulatorChoiceRow.defaultProps.fixedCaption,
        hidden: (props: Partial<Props>) =>
            props.style === "segmented" && !!props.accountChoice,
    },
    accountChoice: {
        type: ControlType.Boolean,
        title: "Account Choice",
        description: "All / One Account pick; each option gets Points (One).",
        defaultValue: SimulatorChoiceRow.defaultProps.accountChoice,
        hidden: (props: Partial<Props>) => props.style !== "segmented",
    },
    allLabel: {
        type: ControlType.String,
        title: "All Label",
        defaultValue: SimulatorChoiceRow.defaultProps.allLabel,
        hidden: (props: Partial<Props>) =>
            props.style !== "segmented" || !props.accountChoice,
    },
    oneLabel: {
        type: ControlType.String,
        title: "One Label",
        defaultValue: SimulatorChoiceRow.defaultProps.oneLabel,
        hidden: (props: Partial<Props>) =>
            props.style !== "segmented" || !props.accountChoice,
    },
    options: {
        type: ControlType.Array,
        title: "Options",
        maxCount: 6,
        control: {
            type: ControlType.Object,
            controls: {
                label: { type: ControlType.String, title: "Label" },
                amountText: {
                    type: ControlType.String,
                    title: "Amount Text",
                },
                points: {
                    type: ControlType.Number,
                    title: "Points",
                    min: -200,
                    max: 200,
                    step: 1,
                    displayStepper: true,
                },
                pointsOne: {
                    type: ControlType.Number,
                    title: "Points (One)",
                    description: "Used when One Account is picked.",
                    min: -200,
                    max: 200,
                    step: 1,
                    displayStepper: true,
                },
            },
        },
        defaultValue: SimulatorChoiceRow.defaultProps.options,
    },
    startsOn: {
        type: ControlType.Number,
        title: "Starts On",
        description: "Option number; 0 = none.",
        min: 0,
        max: 6,
        step: 1,
        displayStepper: true,
        defaultValue: SimulatorChoiceRow.defaultProps.startsOn,
    },
    fieldColor: {
        type: ControlType.Color,
        title: "Field",
        defaultValue: SimulatorChoiceRow.defaultProps.fieldColor,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: SimulatorChoiceRow.defaultProps.borderColor,
    },
    pressColor: {
        type: ControlType.Color,
        title: "Press Tint",
        defaultValue: SimulatorChoiceRow.defaultProps.pressColor,
    },
    captionColor: {
        type: ControlType.Color,
        title: "Caption",
        defaultValue: SimulatorChoiceRow.defaultProps.captionColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: SimulatorChoiceRow.defaultProps.textColor,
    },
    selectedColor: {
        type: ControlType.Color,
        title: "Selected",
        defaultValue: SimulatorChoiceRow.defaultProps.selectedColor,
    },
    clearColor: {
        type: ControlType.Color,
        title: "Clear Icon",
        defaultValue: SimulatorChoiceRow.defaultProps.clearColor,
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label",
        defaultValue: SimulatorChoiceRow.defaultProps.labelColor,
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 33, variant: "Regular" },
    },
    optionFont: {
        type: ControlType.Font,
        title: "Option Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 38, variant: "Regular" },
    },
    selectedFont: {
        type: ControlType.Font,
        title: "Selected Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 38, variant: "Bold" },
    },
    amountFont: {
        type: ControlType.Font,
        title: "Amount Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28, variant: "Regular" },
    },
})
