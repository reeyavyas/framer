import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Credit Usage → Primary Cards Usage: one row per card with its name, a
// track split at the marker percents (30% / 50%), a green fill and knob at
// the card's percent used, and the percent above the knob. Dashed lines run
// down through every row at each marker, labelled underneath along with
// 100%. Built for the 1080-wide kiosk (1.25× the phone app).

interface Card {
    name: string
    percent: number
}

interface Props {
    cards: Card[]
    markers: number[]
    fillColor: string
    trackColor: string
    knobColor: string
    markerColor: string
    textColor: string
    nameFont: React.CSSProperties
    percentFont: React.CSSProperties
    axisFont: React.CSSProperties
    nameTracking: number
    axisTracking: number
    underlineNames: boolean
    labelWidth: number
    labelGap: number
    rowHeight: number
    barHeight: number
    knobSize: number
    knobRing: number
    segmentGap: number
    percentGap: number
    axisGap: number
}

const FONT = "Inter, sans-serif"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 840
 */
export default function CardUsageBars(props: Props) {
    const {
        cards,
        fillColor,
        trackColor,
        knobColor,
        markerColor,
        textColor,
        labelWidth,
        labelGap,
        rowHeight,
        barHeight,
        knobSize,
        knobRing,
        segmentGap,
        percentGap,
        axisGap,
    } = props
    const markers = props.markers
        .filter((m) => Number.isFinite(m) && m > 0 && m < 100)
        .sort((a, b) => a - b)
    const edges = [0, ...markers, 100]
    const clamp = (p: number) =>
        Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0))

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                fontFamily: FONT,
                color: textColor,
            }}
        >
            {cards.map((card, i) => {
                const p = clamp(card.percent)
                // The knob never sits past either end of the bar.
                const knobAt = `clamp(${knobSize / 2}px, ${p}%, calc(100% - ${knobSize / 2}px))`
                return (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "flex-end",
                            height: rowHeight,
                            gap: labelGap,
                        }}
                    >
                        <div
                            style={{
                                width: labelWidth,
                                flexShrink: 0,
                                height: knobSize,
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 25,
                                    fontWeight: 500,
                                    ...props.nameFont,
                                    letterSpacing: props.nameTracking,
                                    textDecoration: props.underlineNames
                                        ? "underline"
                                        : "none",
                                    textUnderlineOffset: "0.3em",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
                                }}
                            >
                                {card.name}
                            </span>
                        </div>
                        <div
                            style={{
                                position: "relative",
                                flex: 1,
                                height: knobSize,
                            }}
                        >
                            {edges.slice(1).map((end, j) => (
                                <div
                                    key={j}
                                    style={{
                                        position: "absolute",
                                        top: (knobSize - barHeight) / 2,
                                        height: barHeight,
                                        left: `calc(${edges[j]}% + ${j ? segmentGap / 2 : 0}px)`,
                                        width: `calc(${end - edges[j]}% - ${
                                            (j ? segmentGap / 2 : 0) +
                                            (end < 100 ? segmentGap / 2 : 0)
                                        }px)`,
                                        borderRadius: barHeight / 2,
                                        background: trackColor,
                                    }}
                                />
                            ))}
                            <div
                                style={{
                                    position: "absolute",
                                    top: (knobSize - barHeight) / 2,
                                    left: 0,
                                    height: barHeight,
                                    width: knobAt,
                                    borderRadius: barHeight / 2,
                                    background: fillColor,
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: knobAt,
                                    width: knobSize,
                                    height: knobSize,
                                    marginLeft: -knobSize / 2,
                                    boxSizing: "border-box",
                                    borderRadius: "50%",
                                    border: `${knobRing}px solid ${fillColor}`,
                                    background: knobColor,
                                }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    bottom: knobSize + percentGap,
                                    left: knobAt,
                                    transform: "translateX(-50%)",
                                    fontSize: 28,
                                    fontWeight: 500,
                                    ...props.percentFont,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {Math.round(p)}%
                            </span>
                        </div>
                    </div>
                )
            })}

            {/* Marker lines through every row, then the axis labels. */}
            <div
                style={{
                    position: "absolute",
                    top: rowHeight - knobSize,
                    bottom: axisGap / 2,
                    left: labelWidth + labelGap,
                    right: 0,
                    pointerEvents: "none",
                }}
            >
                {markers.map((m) => (
                    <div
                        key={m}
                        style={{
                            position: "absolute",
                            top: -knobSize / 2,
                            bottom: 0,
                            left: `${m}%`,
                            borderLeft: `2px dashed ${markerColor}`,
                        }}
                    />
                ))}
            </div>
            <div
                style={{
                    position: "relative",
                    marginLeft: labelWidth + labelGap,
                    height: axisGap,
                    fontSize: 25,
                    fontWeight: 500,
                    ...props.axisFont,
                    letterSpacing: props.axisTracking,
                }}
            >
                {[...markers, 100].map((m) => (
                    <span
                        key={m}
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: `${m}%`,
                            transform:
                                m === 100
                                    ? "translateX(-100%)"
                                    : "translateX(-50%)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {m}%
                    </span>
                ))}
            </div>
        </div>
    )
}

CardUsageBars.defaultProps = {
    cards: [
        { name: "VERTICAL CHECKING", percent: 24 },
        { name: "PLATINUM REWARDS CHECKING", percent: 15 },
    ],
    markers: [30, 50],
    fillColor: "#4DB67A",
    trackColor: "#E3E3E3",
    knobColor: "#FFFFFF",
    markerColor: "#555555",
    textColor: "#212121",
    nameTracking: 2.5,
    axisTracking: 2.5,
    underlineNames: true,
    labelWidth: 244,
    labelGap: 44,
    rowHeight: 144,
    barHeight: 30,
    knobSize: 50,
    knobRing: 14,
    segmentGap: 8,
    percentGap: 10,
    axisGap: 88,
}

addPropertyControls(CardUsageBars, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: {
            type: ControlType.Object,
            controls: {
                name: { type: ControlType.String, title: "Name" },
                percent: {
                    type: ControlType.Number,
                    title: "Used",
                    min: 0,
                    max: 100,
                    step: 1,
                    unit: "%",
                    displayStepper: true,
                },
            },
        },
        defaultValue: CardUsageBars.defaultProps.cards,
    },
    markers: {
        type: ControlType.Array,
        title: "Markers",
        control: {
            type: ControlType.Number,
            min: 1,
            max: 99,
            step: 1,
            unit: "%",
        },
        defaultValue: CardUsageBars.defaultProps.markers,
    },
    fillColor: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: CardUsageBars.defaultProps.fillColor,
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: CardUsageBars.defaultProps.trackColor,
    },
    knobColor: {
        type: ControlType.Color,
        title: "Knob Centre",
        defaultValue: CardUsageBars.defaultProps.knobColor,
    },
    markerColor: {
        type: ControlType.Color,
        title: "Marker Lines",
        defaultValue: CardUsageBars.defaultProps.markerColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: CardUsageBars.defaultProps.textColor,
    },
    nameFont: {
        type: ControlType.Font,
        title: "Name Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 25, variant: "Medium" },
    },
    nameTracking: {
        type: ControlType.Number,
        title: "Name Tracking",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: CardUsageBars.defaultProps.nameTracking,
    },
    underlineNames: {
        type: ControlType.Boolean,
        title: "Underline Names",
        defaultValue: CardUsageBars.defaultProps.underlineNames,
    },
    percentFont: {
        type: ControlType.Font,
        title: "Percent Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28, variant: "Medium" },
    },
    axisFont: {
        type: ControlType.Font,
        title: "Axis Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 25, variant: "Medium" },
    },
    axisTracking: {
        type: ControlType.Number,
        title: "Axis Tracking",
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: CardUsageBars.defaultProps.axisTracking,
    },
    labelWidth: {
        type: ControlType.Number,
        title: "Name Width",
        min: 80,
        max: 500,
        defaultValue: CardUsageBars.defaultProps.labelWidth,
    },
    labelGap: {
        type: ControlType.Number,
        title: "Name Gap",
        min: 0,
        max: 200,
        defaultValue: CardUsageBars.defaultProps.labelGap,
    },
    rowHeight: {
        type: ControlType.Number,
        title: "Row Height",
        min: 60,
        max: 300,
        defaultValue: CardUsageBars.defaultProps.rowHeight,
    },
    barHeight: {
        type: ControlType.Number,
        title: "Bar Height",
        min: 4,
        max: 80,
        defaultValue: CardUsageBars.defaultProps.barHeight,
    },
    knobSize: {
        type: ControlType.Number,
        title: "Knob Size",
        min: 10,
        max: 120,
        defaultValue: CardUsageBars.defaultProps.knobSize,
    },
    knobRing: {
        type: ControlType.Number,
        title: "Knob Ring",
        min: 0,
        max: 40,
        defaultValue: CardUsageBars.defaultProps.knobRing,
    },
    segmentGap: {
        type: ControlType.Number,
        title: "Segment Gap",
        min: 0,
        max: 40,
        defaultValue: CardUsageBars.defaultProps.segmentGap,
    },
    percentGap: {
        type: ControlType.Number,
        title: "Percent Gap",
        min: 0,
        max: 60,
        defaultValue: CardUsageBars.defaultProps.percentGap,
    },
    axisGap: {
        type: ControlType.Number,
        title: "Axis Space",
        min: 30,
        max: 200,
        defaultValue: CardUsageBars.defaultProps.axisGap,
    },
})
