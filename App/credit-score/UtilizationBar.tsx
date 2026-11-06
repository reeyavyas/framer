import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Goals tab → utilization tip: one usage bar. A caption ("ALL REVOLVING")
// with "You are at N%" and a status dot on the right, then a 0–100% track
// filled to the value with a ring knob and the value above it, and a
// dashed marker at the limit with "Keep below L%" under it. Green while
// under the limit, red at or over it. The grey panel around it is native.
// Built for the 1080-wide kiosk.

interface Props {
    label: string
    value: number
    limit: number
    goodColor: string
    overColor: string
    trackColor: string
    textColor: string
    labelFont: React.CSSProperties
    textFont: React.CSSProperties
}

const TRACK_H = 24
const KNOB = 44

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 830
 */
export default function UtilizationBar(props: Props) {
    const value = clamp(props.value)
    const limit = clamp(props.limit)
    const color = value < limit ? props.goodColor : props.overColor
    const text = { ...props.textFont, color: props.textColor }

    return (
        <div
            role="img"
            aria-label={`${props.label}: ${value}%, keep below ${limit}%`}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                }}
            >
                <span
                    style={{
                        ...props.labelFont,
                        color: props.textColor,
                        textTransform: "uppercase",
                    }}
                >
                    {props.label}
                </span>
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        ...text,
                    }}
                >
                    <span
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: color,
                        }}
                    />
                    You are at {value}%
                </span>
            </div>

            {/* Value over the knob, track, then the limit's caption. */}
            <div style={{ position: "relative", height: 48 + KNOB + 60 }}>
                <span
                    style={{
                        position: "absolute",
                        top: 0,
                        left: `clamp(0px, calc(${value}% - 20px), calc(100% - 60px))`,
                        ...text,
                    }}
                >
                    {value}%
                </span>
                <div
                    style={{
                        position: "absolute",
                        top: 48 + (KNOB - TRACK_H) / 2,
                        left: 0,
                        right: 0,
                        height: TRACK_H,
                        borderRadius: TRACK_H / 2,
                        background: props.trackColor,
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${value}%`,
                            height: "100%",
                            background: color,
                        }}
                    />
                </div>
                <div
                    style={{
                        position: "absolute",
                        top: 48 - 6,
                        left: `${limit}%`,
                        height: KNOB + 12,
                        borderLeft: `3px dashed ${props.textColor}`,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        top: 48,
                        // Kept inside the track at 0%.
                        left: `max(0px, calc(${value}% - ${KNOB / 2}px))`,
                        width: KNOB,
                        height: KNOB,
                        boxSizing: "border-box",
                        borderRadius: "50%",
                        border: `11px solid ${color}`,
                        background: "#FFFFFF",
                    }}
                />
                <span
                    style={{
                        position: "absolute",
                        top: 48 + KNOB + 16,
                        left: `min(${limit}%, calc(100% - 300px))`,
                        ...props.labelFont,
                        color: props.textColor,
                        whiteSpace: "nowrap",
                    }}
                >
                    Keep below {limit}%
                </span>
            </div>
        </div>
    )
}

function clamp(n: number) {
    return Math.min(100, Math.max(0, Math.round(n)))
}

UtilizationBar.defaultProps = {
    label: "All Revolving",
    value: 6,
    limit: 10,
    goodColor: "#4DB67A",
    overColor: "#E5483B",
    trackColor: "#E3E3E3",
    textColor: "#212121",
}

addPropertyControls(UtilizationBar, {
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: UtilizationBar.defaultProps.label,
    },
    value: {
        type: ControlType.Number,
        title: "Value",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        displayStepper: true,
        defaultValue: UtilizationBar.defaultProps.value,
    },
    limit: {
        type: ControlType.Number,
        title: "Keep Below",
        min: 1,
        max: 100,
        step: 1,
        unit: "%",
        displayStepper: true,
        defaultValue: UtilizationBar.defaultProps.limit,
    },
    goodColor: {
        type: ControlType.Color,
        title: "Under Limit",
        defaultValue: UtilizationBar.defaultProps.goodColor,
    },
    overColor: {
        type: ControlType.Color,
        title: "Over Limit",
        defaultValue: UtilizationBar.defaultProps.overColor,
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: UtilizationBar.defaultProps.trackColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: UtilizationBar.defaultProps.textColor,
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 26, variant: "Semibold", letterSpacing: 3 },
    },
    textFont: {
        type: ControlType.Font,
        title: "Text Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 32, variant: "Medium" },
    },
})
