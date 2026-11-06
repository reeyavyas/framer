import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion } from "framer-motion"
import { useRowEntry } from "./SimulatorAmountRow.tsx"

// Simulator tab: a YES / NO switch row ("Inquiry on file…", "Pay off all
// credit card balances"). Visitors flip it freely; YES adds the row's
// points to SimulatorStore. Built for the 1080-wide kiosk.

interface Props {
    rowId: string
    label: string
    points: number
    startsOn: boolean
    onText: string
    offText: string
    trackOff: string
    trackOn: string
    knobColor: string
    textColor: string
    onTextColor: string
    labelColor: string
    labelFont: React.CSSProperties
    stateFont: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 860
 */
export default function SimulatorToggleRow(props: Props) {
    const [on, setOn] = React.useState(props.startsOn)
    useRowEntry(props.rowId, on ? props.points : null, () =>
        setOn(props.startsOn)
    )
    // Follow the property when it's changed on the canvas.
    React.useEffect(() => setOn(props.startsOn), [props.startsOn])

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ ...props.labelFont, color: props.labelColor }}>
                {props.label}
            </div>
            <div
                role="switch"
                aria-checked={on}
                aria-label={props.label}
                tabIndex={0}
                onClick={() => setOn(!on)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setOn(!on)
                }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 30,
                    alignSelf: "flex-start",
                    padding: "8px 16px 8px 0",
                    cursor: "pointer",
                }}
            >
                {/* initial={false}: draw the current state at once (the canvas doesn't animate). */}
                <motion.div
                    initial={false}
                    animate={{
                        backgroundColor: on ? props.trackOn : props.trackOff,
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                        width: TRACK_W,
                        height: TRACK_H,
                        borderRadius: TRACK_H / 2,
                        padding: PAD,
                        boxSizing: "border-box",
                        display: "flex",
                    }}
                >
                    <motion.div
                        initial={false}
                        animate={{ x: on ? TRACK_W - TRACK_H : 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 35,
                        }}
                        style={{
                            width: TRACK_H - PAD * 2,
                            height: TRACK_H - PAD * 2,
                            borderRadius: "50%",
                            background: props.knobColor,
                        }}
                    />
                </motion.div>
                <span
                    style={{
                        ...props.stateFont,
                        color: on ? props.onTextColor : props.textColor,
                    }}
                >
                    {on ? props.onText : props.offText}
                </span>
            </div>
        </div>
    )
}

const TRACK_W = 116
const TRACK_H = 62
const PAD = 8

SimulatorToggleRow.defaultProps = {
    rowId: "inquiry",
    label: "Inquiry on file from a credit card application",
    points: -7,
    startsOn: false,
    onText: "YES",
    offText: "NO",
    trackOff: "#3A3A3A",
    trackOn: "#0D294B",
    knobColor: "#FFFFFF",
    textColor: "#212121",
    onTextColor: "#0D294B",
    labelColor: "#212121",
}

addPropertyControls(SimulatorToggleRow, {
    rowId: {
        type: ControlType.String,
        title: "Row ID",
        defaultValue: SimulatorToggleRow.defaultProps.rowId,
    },
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: SimulatorToggleRow.defaultProps.label,
    },
    points: {
        type: ControlType.Number,
        title: "Points",
        min: -200,
        max: 200,
        step: 1,
        displayStepper: true,
        defaultValue: SimulatorToggleRow.defaultProps.points,
    },
    startsOn: {
        type: ControlType.Boolean,
        title: "Starts On",
        defaultValue: SimulatorToggleRow.defaultProps.startsOn,
    },
    onText: {
        type: ControlType.String,
        title: "On Text",
        defaultValue: SimulatorToggleRow.defaultProps.onText,
    },
    offText: {
        type: ControlType.String,
        title: "Off Text",
        defaultValue: SimulatorToggleRow.defaultProps.offText,
    },
    trackOff: {
        type: ControlType.Color,
        title: "Track Off",
        defaultValue: SimulatorToggleRow.defaultProps.trackOff,
    },
    trackOn: {
        type: ControlType.Color,
        title: "Track On",
        defaultValue: SimulatorToggleRow.defaultProps.trackOn,
    },
    knobColor: {
        type: ControlType.Color,
        title: "Knob",
        defaultValue: SimulatorToggleRow.defaultProps.knobColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Off Text Colour",
        defaultValue: SimulatorToggleRow.defaultProps.textColor,
    },
    onTextColor: {
        type: ControlType.Color,
        title: "On Text Colour",
        defaultValue: SimulatorToggleRow.defaultProps.onTextColor,
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label",
        defaultValue: SimulatorToggleRow.defaultProps.labelColor,
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 33, variant: "Regular" },
    },
    stateFont: {
        type: ControlType.Font,
        title: "YES / NO Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 38, variant: "Bold" },
    },
})
