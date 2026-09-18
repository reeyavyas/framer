import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useMotionValue, animate } from "framer-motion"

// Traces a single SVG path and animates a bright segment continuously
// along its full length, looping seamlessly. Length is measured from the
// live DOM path (getTotalLength) rather than guessed, so the dash math
// stays correct no matter what curve is pasted into the `path` control.
function PulseLine({
    d,
    baseColor,
    baseWidth,
    baseOpacity,
    showBaseLine,
    color,
    glowColor,
    pulseLength,
    pulseWidth,
    glowWidth,
    glowBlur,
    speed,
    delay,
    reverse,
}: {
    d: string
    baseColor: string
    baseWidth: number
    baseOpacity: number
    showBaseLine: boolean
    color: string
    glowColor: string
    pulseLength: number
    pulseWidth: number
    glowWidth: number
    glowBlur: number
    speed: number
    delay: number
    reverse: boolean
}) {
    const measureRef = React.useRef<SVGPathElement>(null)
    const [length, setLength] = React.useState(0)
    const dashOffset = useMotionValue(0)

    React.useLayoutEffect(() => {
        if (measureRef.current) setLength(measureRef.current.getTotalLength())
    }, [d])

    React.useEffect(() => {
        if (!length) return
        dashOffset.set(reverse ? -length : 0)
        const controls = animate(
            dashOffset,
            reverse ? 0 : -length,
            {
                duration: speed,
                delay,
                repeat: Infinity,
                ease: "linear",
            }
        )
        return () => controls.stop()
    }, [length, speed, delay, reverse, dashOffset])

    const dashArray = `${pulseLength} ${Math.max(length - pulseLength, 0.01)}`

    return (
        <>
            {/* Invisible reference copy — only used to measure path length */}
            <path ref={measureRef} d={d} fill="none" stroke="none" />
            {showBaseLine && (
                <path
                    d={d}
                    fill="none"
                    stroke={baseColor}
                    strokeWidth={baseWidth}
                    strokeOpacity={baseOpacity}
                    strokeLinecap="round"
                />
            )}
            {/* Soft glow trailing the pulse */}
            <motion.path
                d={d}
                fill="none"
                stroke={glowColor}
                strokeWidth={glowWidth}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                style={{ strokeDashoffset: dashOffset, filter: `blur(${glowBlur}px)` }}
            />
            {/* Bright core of the pulse */}
            <motion.path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={pulseWidth}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                style={{ strokeDashoffset: dashOffset }}
            />
        </>
    )
}

// Component
/**
 * Fixed to the kiosk's native resolution so the traced curves line up
 * with a full-bleed wallpaper placed behind it at the same size.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
export default function WingPulseLines(props) {
    const {
        line1 = {},
        line2 = {},
        line3 = {},
        showBaseLines,
        baseLineColor,
        baseLineWidth,
        baseLineOpacity,
        pulseWidth,
        glowWidth,
        glowBlur,
    } = props

    const lines = [line1, line2, line3].filter((l) => l.enabled !== false)

    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 1080 1920"
            preserveAspectRatio="xMidYMid slice"
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "visible",
            }}
        >
            {lines.map((line, i) => (
                <PulseLine
                    key={i}
                    d={line.path}
                    showBaseLine={showBaseLines !== false}
                    baseColor={baseLineColor || "#FFFFFF"}
                    baseWidth={baseLineWidth === undefined ? 2 : baseLineWidth}
                    baseOpacity={
                        baseLineOpacity === undefined ? 0.25 : baseLineOpacity
                    }
                    color={line.color || "#FFFFFF"}
                    glowColor={line.glowColor || "#5EC8FF"}
                    pulseLength={
                        line.pulseLength === undefined ? 160 : line.pulseLength
                    }
                    pulseWidth={pulseWidth === undefined ? 4 : pulseWidth}
                    glowWidth={glowWidth === undefined ? 16 : glowWidth}
                    glowBlur={glowBlur === undefined ? 10 : glowBlur}
                    speed={line.speed === undefined ? 5 : line.speed}
                    delay={line.delay === undefined ? 0 : line.delay}
                    reverse={!!line.reverse}
                />
            ))}
        </svg>
    )
}

WingPulseLines.defaultProps = {
    showBaseLines: true,
    baseLineColor: "#FFFFFF",
    baseLineWidth: 2,
    baseLineOpacity: 0.25,
    pulseWidth: 4,
    glowWidth: 16,
    glowBlur: 10,
    line1: {
        enabled: true,
        // Left arm of the wing — sweeps from top-center down to the
        // bottom-left. Approximated from the reference screenshot; paste
        // an exact `d` from the source vector art here for a precise trace.
        path: "M 540,0 C 420,350 260,700 140,1050 C 60,1300 20,1550 40,1920",
        color: "#FFFFFF",
        glowColor: "#5EC8FF",
        speed: 5,
        delay: 0,
        pulseLength: 160,
        reverse: false,
    },
    line2: {
        enabled: true,
        // Right arm of the wing — mirrors line1 down to the bottom-right.
        path: "M 620,0 C 760,320 900,650 980,980 C 1030,1250 1000,1550 900,1920",
        color: "#FFFFFF",
        glowColor: "#5EC8FF",
        speed: 5.5,
        delay: 1.3,
        pulseLength: 160,
        reverse: false,
    },
    line3: {
        enabled: true,
        // The diagonal line crossing through the upper third.
        path: "M -50,500 C 300,560 700,600 1130,680",
        color: "#FFFFFF",
        glowColor: "#5EC8FF",
        speed: 4.5,
        delay: 2.6,
        pulseLength: 160,
        reverse: true,
    },
}

function lineControl(title: string, defaultLine: any) {
    return {
        type: ControlType.Object,
        title,
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            path: {
                type: ControlType.String,
                title: "SVG Path (d)",
                defaultValue: defaultLine.path,
                displayTextArea: true,
            },
            color: {
                type: ControlType.Color,
                title: "Pulse Color",
                defaultValue: defaultLine.color,
            },
            glowColor: {
                type: ControlType.Color,
                title: "Glow Color",
                defaultValue: defaultLine.glowColor,
            },
            pulseLength: {
                type: ControlType.Number,
                title: "Pulse Length",
                defaultValue: defaultLine.pulseLength,
                min: 20,
                max: 800,
                step: 10,
            },
            speed: {
                type: ControlType.Number,
                title: "Speed (s/loop)",
                defaultValue: defaultLine.speed,
                min: 0.5,
                max: 20,
                step: 0.1,
            },
            delay: {
                type: ControlType.Number,
                title: "Delay (s)",
                defaultValue: defaultLine.delay,
                min: 0,
                max: 10,
                step: 0.1,
            },
            reverse: {
                type: ControlType.Boolean,
                title: "Reverse",
                defaultValue: defaultLine.reverse,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
        },
    }
}

addPropertyControls(WingPulseLines, {
    line1: lineControl("Line 1", WingPulseLines.defaultProps.line1),
    line2: lineControl("Line 2", WingPulseLines.defaultProps.line2),
    line3: lineControl("Line 3", WingPulseLines.defaultProps.line3),
    showBaseLines: {
        type: ControlType.Boolean,
        title: "Base Lines",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    baseLineColor: {
        type: ControlType.Color,
        title: "Base Line Color",
        defaultValue: "#FFFFFF",
        hidden: (p) => !p.showBaseLines,
    },
    baseLineWidth: {
        type: ControlType.Number,
        title: "Base Line Width",
        defaultValue: 2,
        min: 0.5,
        max: 10,
        step: 0.5,
        hidden: (p) => !p.showBaseLines,
    },
    baseLineOpacity: {
        type: ControlType.Number,
        title: "Base Line Opacity",
        defaultValue: 0.25,
        min: 0,
        max: 1,
        step: 0.01,
        hidden: (p) => !p.showBaseLines,
    },
    pulseWidth: {
        type: ControlType.Number,
        title: "Pulse Width",
        defaultValue: 4,
        min: 1,
        max: 20,
        step: 0.5,
    },
    glowWidth: {
        type: ControlType.Number,
        title: "Glow Width",
        defaultValue: 16,
        min: 4,
        max: 60,
        step: 1,
    },
    glowBlur: {
        type: ControlType.Number,
        title: "Glow Blur",
        defaultValue: 10,
        min: 0,
        max: 40,
        step: 1,
    },
})
