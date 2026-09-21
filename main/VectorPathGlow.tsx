import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// A wrapper component — connect your existing vector/path layer via
// the "Vector Layer" property (a ControlType.ComponentInstance picker:
// click it, then click your vector layer anywhere on canvas — no
// nesting required, arbitrary code components don't support dragging
// other layers inside them the way Frame/Stack do). It then reads the
// real rendered SVG path(s) straight from the DOM (getTotalLength())
// instead of requiring path data to be traced and pasted in. Always
// exact to whatever you actually drew.
//
// Only picks up paths that actually have a stroke (checked via
// getComputedStyle) — a filled decorative shape with no stroke (e.g.
// an invisible fill-opacity:0 silhouette sitting alongside the real
// line art, as in the wing-lines SVG this was built against) is
// skipped rather than glow-swept along its outline.
//
// Glow width is a MULTIPLE of each path's own native stroke-width,
// not one fixed size applied to every path — real artwork often mixes
// weights (e.g. thin guide lines next to one thicker hero stroke), so
// a single fixed glow width either buries the thin lines or looks too
// thin against the thick one. Sweep length is likewise a PERCENTAGE
// of each path's own measured length, not a fixed pixel number —
// WingPulseLines.tsx's fixed-length pulse looked "comically small" on
// paths longer than the one it was tuned against.
//
// Renders only the glow on top of your existing artwork (which is
// still visible underneath, rendered via the vectorLayer prop) — it
// doesn't redraw a duplicate base line, so your real stroke
// colors/widths are untouched.
//
// Two modes:
// - "sweep": a soft glowing highlight travels continuously along the
//   stroke direction, looping.
// - "breathe": the whole stroke's glow intensity pulses in place, no
//   directional motion.

type PathInfo = { d: string; nativeStrokeWidth: number }

function AnimatedPath({
    path,
    mode,
    glowColor,
    glowWidthScale,
    glowBlur,
    sweepPercent,
    speed,
    delay,
}: {
    path: PathInfo
    mode: string
    glowColor: string
    glowWidthScale: number
    glowBlur: number
    sweepPercent: number
    speed: number
    delay: number
}) {
    const { d, nativeStrokeWidth } = path
    const glowWidth = nativeStrokeWidth * glowWidthScale
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
 * Connect your existing vector/path layer via the "Vector Layer"
 * property below — it auto-reads the real path geometry off it rather
 * than needing path data pasted in or the layer nested inside.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function VectorPathGlow(props) {
    const {
        vectorLayer,
        mode,
        glowColor,
        glowWidthScale,
        glowBlur,
        sweepPercent,
        speed,
        delay,
    } = props

    const wrapperRef = React.useRef<HTMLDivElement>(null)
    const [paths, setPaths] = React.useState<PathInfo[]>([])

    React.useEffect(() => {
        if (!wrapperRef.current) return
        const nodes = Array.from(
            wrapperRef.current.querySelectorAll("path")
        ) as SVGPathElement[]
        const found = nodes
            .filter((n) => {
                const stroke = window.getComputedStyle(n).stroke
                return stroke && stroke !== "none"
            })
            .map((n) => {
                const d = n.getAttribute("d")
                const nativeStrokeWidth =
                    parseFloat(window.getComputedStyle(n).strokeWidth) || 2
                return d ? { d, nativeStrokeWidth } : null
            })
            .filter((p): p is PathInfo => !!p)
        setPaths(found)
    }, [vectorLayer])

    return (
        <div
            ref={wrapperRef}
            style={{ position: "relative", width: "100%", height: "100%" }}
        >
            {vectorLayer}
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
                    {paths.map((path, i) => (
                        <AnimatedPath
                            key={i}
                            path={path}
                            mode={mode}
                            glowColor={glowColor}
                            glowWidthScale={glowWidthScale}
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
    glowColor: "#FFFFFF",
    glowWidthScale: 3,
    glowBlur: 10,
    sweepPercent: 40,
    speed: 4,
    delay: 0,
}

addPropertyControls(VectorPathGlow, {
    vectorLayer: {
        type: ControlType.ComponentInstance,
        title: "Vector Layer",
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["sweep", "breathe"],
        optionTitles: ["Flowing Sweep", "Soft Breathe"],
        defaultValue: "sweep",
    },
    glowColor: {
        type: ControlType.Color,
        title: "Glow Color",
        defaultValue: "#FFFFFF",
    },
    glowWidthScale: {
        type: ControlType.Number,
        title: "Glow Width (× stroke)",
        defaultValue: 3,
        min: 1,
        max: 10,
        step: 0.5,
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
