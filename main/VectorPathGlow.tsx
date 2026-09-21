import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// A wrapper component — drag your existing vector/path layer INSIDE
// this component (nest it as a child on canvas), and it reads the
// real rendered SVG path(s) straight from the DOM (getTotalLength())
// instead of requiring path data to be traced and pasted in. Always
// exact to whatever you actually drew, and works on compound shapes
// (multiple <path> elements) by animating each one.
//
// Sweep/glow size is a PERCENTAGE of each path's own measured length,
// not a fixed pixel number — WingPulseLines.tsx's fixed-length pulse
// looked "comically small" on paths longer than the one it was tuned
// against. A percentage scales correctly regardless of path size.
//
// Two modes:
// - "sweep": a soft glowing highlight travels continuously along the
//   stroke direction, looping.
// - "breathe": the whole stroke's glow intensity pulses in place, no
//   directional motion.

function AnimatedPath({
    d,
    mode,
    color,
    glowColor,
    strokeWidth,
    glowWidth,
    glowBlur,
    sweepPercent,
    speed,
    delay,
}: {
    d: string
    mode: string
    color: string
    glowColor: string
    strokeWidth: number
    glowWidth: number
    glowBlur: number
    sweepPercent: number
    speed: number
    delay: number
}) {
    const measureRef = React.useRef<SVGPathElement>(null)
    const [length, setLength] = React.useState(0)

    React.useEffect(() => {
        if (measureRef.current) setLength(measureRef.current.getTotalLength())
    }, [d])

    if (mode === "breathe") {
        return (
            <>
                <path ref={measureRef} d={d} fill="none" stroke="none" />
                <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                <path
                    d={d}
                    fill="none"
                    stroke={glowColor}
                    strokeWidth={glowWidth}
                    strokeLinecap="round"
                    style={{
                        filter: `blur(${glowBlur}px)`,
                        animation: `vector-path-glow-breathe ${speed}s ease-in-out ${delay}s infinite`,
                    }}
                />
            </>
        )
    }

    const sweepLength = Math.max(length * (sweepPercent / 100), 1)
    const dashArray = `${sweepLength} ${Math.max(length - sweepLength, 0.01)}`
    const keyframeName = `vector-path-glow-sweep-${Math.round(length)}`

    return (
        <>
            <path ref={measureRef} d={d} fill="none" stroke="none" />
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.3}
                strokeLinecap="round"
            />
            {length > 0 && (
                <>
                    <style>{`
                        @keyframes ${keyframeName} {
                            from { stroke-dashoffset: 0; }
                            to { stroke-dashoffset: -${length}; }
                        }
                    `}</style>
                    <path
                        d={d}
                        fill="none"
                        stroke={glowColor}
                        strokeWidth={glowWidth}
                        strokeLinecap="round"
                        strokeDasharray={dashArray}
                        style={{
                            filter: `blur(${glowBlur}px)`,
                            animation: `${keyframeName} ${speed}s linear ${delay}s infinite`,
                        }}
                    />
                </>
            )}
        </>
    )
}

/**
 * Drag your existing vector/path layer inside this component (nest it
 * as a child) — it auto-reads the real path geometry off it rather
 * than needing path data pasted in.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function VectorPathGlow(props) {
    const {
        mode,
        color,
        glowColor,
        strokeWidth,
        glowWidth,
        glowBlur,
        sweepPercent,
        speed,
        delay,
        children,
    } = props

    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const [paths, setPaths] = React.useState<string[]>([])

    React.useEffect(() => {
        if (!wrapperRef.current) return
        const nodes = Array.from(
            wrapperRef.current.querySelectorAll("path")
        ) as SVGPathElement[]
        const found = nodes
            .map((n) => n.getAttribute("d"))
            .filter((d): d is string => !!d)
        setPaths(found)
    }, [children])

    return (
        <div
            ref={wrapperRef}
            style={{ position: "relative", width: "100%", height: "100%" }}
        >
            {children}
            {paths.length > 0 && (
                <svg
                    width="100%"
                    height="100%"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        overflow: "visible",
                    }}
                >
                    {paths.map((d, i) => (
                        <AnimatedPath
                            key={i}
                            d={d}
                            mode={mode}
                            color={color}
                            glowColor={glowColor}
                            strokeWidth={strokeWidth}
                            glowWidth={glowWidth}
                            glowBlur={glowBlur}
                            sweepPercent={sweepPercent}
                            speed={speed}
                            delay={delay}
                        />
                    ))}
                </svg>
            )}
            <style>{`
                @keyframes vector-path-glow-breathe {
                    0%, 100% { opacity: 0.35; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    )
}

VectorPathGlow.defaultProps = {
    mode: "sweep",
    color: "#5EC8FF",
    glowColor: "#5EC8FF",
    strokeWidth: 2,
    glowWidth: 14,
    glowBlur: 10,
    sweepPercent: 40,
    speed: 4,
    delay: 0,
}

addPropertyControls(VectorPathGlow, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["sweep", "breathe"],
        optionTitles: ["Flowing Sweep", "Soft Breathe"],
        defaultValue: "sweep",
    },
    color: {
        type: ControlType.Color,
        title: "Base Color",
        defaultValue: "#5EC8FF",
    },
    glowColor: {
        type: ControlType.Color,
        title: "Glow Color",
        defaultValue: "#5EC8FF",
    },
    strokeWidth: {
        type: ControlType.Number,
        title: "Base Stroke Width",
        defaultValue: 2,
        min: 0,
        max: 20,
        step: 0.5,
    },
    glowWidth: {
        type: ControlType.Number,
        title: "Glow Stroke Width",
        defaultValue: 14,
        min: 2,
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
    sweepPercent: {
        type: ControlType.Number,
        title: "Sweep Length (%)",
        defaultValue: 40,
        min: 5,
        max: 100,
        step: 1,
        hidden: (p) => p.mode !== "sweep",
    },
    speed: {
        type: ControlType.Number,
        title: "Speed (s/loop)",
        defaultValue: 4,
        min: 0.5,
        max: 20,
        step: 0.1,
    },
    delay: {
        type: ControlType.Number,
        title: "Delay (s)",
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 0.1,
    },
})
