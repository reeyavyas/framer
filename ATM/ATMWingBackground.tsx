import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"

// The ATM screen's animated wing background. Drop it inside the ATM artwork, sized to the screen
// cutout; the artwork is drawn on a 499×465 canvas and scaled to cover the layer.
//
// Two styles:
// - Flow: the two wings tilt together as solid shapes (they never change shape) over a still
//   layered pattern.
// - Aurora: everything holds still and the light inside each shape slowly rolls across it.
// Both have soft pulsing glows and a light-teal shimmer running left to right along the wing lines.
//
// Everything is a function of one phase θ that runs 0 → 2π per loop, always at whole-number
// frequencies, so the last frame of a loop is identical to the first: no jump, no pause.
// Colours only change when a property changes, so each frame only moves transforms and opacities.

// The 8 curves from the design's SVG, in file order: [P0, C1, C2, P3].
// Lines 5–6 edge wing 1, lines 2–3 edge wing 2; lines 1, 4, 7, 8 are still accent lines.
const C = [
    [[-75, 335.5], [72.975, 381.268], [177, 465.5], [177, 465.5]],
    [[-75, 425.5], [210.012, 591.905], [498.5, 405], [498.5, 405]],
    [[-75, 281], [-75, 281], [224.512, 396.093], [498.5, 201.5]],
    [[-75, 251], [273.278, 148.94], [498.5, 462], [498.5, 462]],
    [[292.5, 0], [317.353, 361.735], [-75, 513.5], [-75, 513.5]],
    [[256, 0], [127.295, 199.823], [-75, 251], [-75, 251]],
    [[132, 0], [116.424, 208.28], [-75, 428.5], [-75, 428.5]],
    [[11.5, 0], [219.658, 222.236], [498.5, 209.5], [498.5, 209.5]],
]
const pt = (p: number[]) => `${p[0]},${p[1]}`
const cub = (c: number[][]) => `C${pt(c[1])} ${pt(c[2])} ${pt(c[3])}`
const rev = (c: number[][]) => [c[3], c[2], c[1], c[0]]

// Wing curves run a little past the frame edge along their own direction, so a tilted wing
// never pulls its edge into view.
const EXT: Record<number, { pre?: number[]; post?: number[] }> = {
    4: { pre: [285.5, -100] },
    5: { pre: [310, -84] },
    2: { post: [600, 130] },
    1: { post: [600, 339] },
}
const lineD = (ci: number) => {
    const e = EXT[ci] || {}
    return (
        (e.pre ? `M${pt(e.pre)} L${pt(C[ci][0])} ` : `M${pt(C[ci][0])} `) +
        cub(C[ci]) +
        (e.post ? ` L${pt(e.post)}` : "")
    )
}

type ColorKey = "navy" | "teal" | "lteal" | "lblue" | "mid"
type Key = [number, ColorKey] | [number, ColorKey, "in"]
type Shape = { grad: Key[]; g: number[]; op: number; d: string; lines?: number[] }

// The still layered pattern. No still shape shares an edge with a wing, so no wing edge shows
// double when the wings move.
const FILLS: Shape[] = [
    {
        grad: [[0, "navy"], [0.5, "navy"], [1, "teal"]],
        g: [60, 0, 470, 200],
        op: 0.55,
        d: `M11.5,-120 L${pt(C[7][0])} ${cub(C[7])} L640,${C[7][3][1]} L640,-120 Z`,
    },
    {
        grad: [[0, "mid"], [1, "navy"]],
        g: [-60, 470, 160, 330],
        op: 0.65,
        d: `M-200,${C[0][0][1]} L${pt(C[0][0])} ${cub(C[0])} L${C[0][3][0]},640 L-200,640 Z`,
    },
]
const WINGS: Shape[] = [
    {
        lines: [4, 5],
        grad: [[0, "lblue"], [0.35, "navy"], [1, "navy"]],
        g: [300, 40, 0, 420],
        op: 0.5,
        d: `M285.5,-100 L${pt(C[4][0])} ${cub(C[4])} L${pt(C[5][3])} ${cub(rev(C[5]))} L310,-84 Z`,
    },
    {
        lines: [1, 2],
        grad: [[0, "navy"], [0.65, "navy"], [1, "teal"]],
        g: [0, 330, 499, 300],
        op: 0.5,
        d: `M${pt(C[2][0])} ${cub(C[2])} L600,130 L600,339 L${pt(C[1][3])} ${cub(rev(C[1]))} Z`,
    },
]
const SHAPES = [...FILLS, ...WINGS] // the order their gradients are indexed in
const ACCENTS = [0, 3, 6, 7]

// Background: a very wide navy-to-teal blend. It runs well past the right edge (to x = 680), so navy
// holds to about half way and the frame's right edge is only about a quarter teal. It is tilted
// BG_ANGLE degrees upward (navy lower left, teal upper right), pivoting on the frame's centre.
const BG: { grad: Key[]; g: number[] } = {
    grad: [[0, "navy"], [0.45, "navy"], [1, "teal", "in"]],
    g: [0, 0, 680, 0],
}
const BG_ANGLE = 14

// Glows: home position, drift, radius, colour, pulse phase, strength.
const ORBS: { x: number; y: number; dx: number; dy: number; r: number; color: ColorKey; ph: number; k: number }[] = [
    { x: 420, y: 70, dx: 40, dy: 26, r: 300, color: "lteal", ph: 0, k: 0.5 },
    { x: 110, y: 150, dx: 34, dy: 30, r: 280, color: "lblue", ph: 2.1, k: 1 },
    { x: 300, y: 370, dx: 46, dy: 22, r: 270, color: "lblue", ph: 4.2, k: 1 },
]
// Long Gaussian fade, then a wide blur on top, so the glows have no edge at all.
const FALLOFF = Array.from({ length: 13 }, (_, j) => {
    const o = j / 12
    return [o, Math.exp(-Math.pow(o * 2.1, 2))]
})

// The wing shimmer: one period of a repeating band (dark, light, dark). It slides by exactly one
// period per shimmer, so there is always a band on screen and never a restart.
const SWEEP_PERIOD = 520
const SWEEP_STOPS = [[0, 0], [0.25, 0], [0.4, 0.35], [0.5, 1], [0.6, 0.35], [0.75, 0], [1, 0]]

const smoothstep = (t: number) => t * t * (3 - 2 * t)
// Expands key colours into many stops, eased, so every colour change starts and ends gently:
// no corner in the ramp for the eye to read as a line.
function expand(keys: Key[], fadeLast: boolean) {
    return Array.from({ length: 41 }, (_, j) => {
        const o = j / 40
        let k = 0
        while (k < keys.length - 2 && o > keys[k + 1][0]) k++
        const [o0, c0] = keys[k]
        const [o1, c1, curve] = keys[k + 1]
        const u = Math.min(1, Math.max(0, (o - o0) / (o1 - o0)))
        const t = curve === "in" ? u * u : smoothstep(u)
        const alpha = fadeLast && k + 1 === keys.length - 1 ? 1 - 0.15 * t : 1
        return { o, c0, c1, t, alpha }
    })
}

const toRgb = (c: string) =>
    c[0] === "#"
        ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
        : (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
const mix = (a: string, b: string, t: number) => {
    const A = toRgb(a)
    const B = toRgb(b)
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`
}

const EASE = {
    sine: (u: number) => u,
    gentle: (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
    smooth: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    dramatic: (u: number) => (u < 0.5 ? 16 * Math.pow(u, 5) : 1 - Math.pow(-2 * u + 2, 5) / 2),
}

type Settings = {
    motionStyle: "flow" | "aurora"
    movement: number
    easing: keyof typeof EASE
    pulsesPerLoop: number
    shimmersPerLoop: number
}

// Every moving attribute for one moment of the loop. Used for the first render (θ = 0, which is
// also the still frame under reduced motion) and for each animation frame.
function frameAt(theta: number, s: Settings) {
    const ease = EASE[s.easing] || EASE.sine
    const osc = (k: number, ph: number) => 2 * ease((1 - Math.cos(k * theta + ph)) / 2) - 1 // -1..1
    const amp = s.movement
    const aurora = s.motionStyle === "aurora"

    // Flow: both wings get the same tilt around the wing root (off the left edge) plus a small lift.
    const wing = aurora
        ? ""
        : `translate(0 ${(amp * 6 * osc(1, 1.1)).toFixed(2)}) rotate(${(amp * 3 * osc(1, 0)).toFixed(3)} -75 340)`

    // Aurora: the light inside each shape rolls across it.
    const grads = SHAPES.map((_, i) =>
        aurora
            ? `rotate(${(amp * 35 * osc(1, i * 1.1)).toFixed(2)} 250 232) translate(${(amp * 90 * osc(1, i * 1.1 + 1.6)).toFixed(2)} 0)`
            : ""
    )

    const drift = aurora ? 1.8 : 1
    const orbs = ORBS.map((o) => {
        const p = (1 - Math.cos(s.pulsesPerLoop * theta + o.ph)) / 2 // 0..1 pulse
        return {
            cx: (o.x + drift * amp * o.dx * Math.sin(theta + o.ph)).toFixed(2),
            cy: (o.y + drift * amp * o.dy * Math.sin(2 * theta + o.ph)).toFixed(2),
            r: (o.r * (0.88 + 0.24 * ease(p))).toFixed(2),
            opacity: (0.65 + 0.35 * p).toFixed(3),
        }
    })

    const frac = ((theta / (Math.PI * 2)) * s.shimmersPerLoop) % 1
    const sweep = `translate(${(frac * SWEEP_PERIOD).toFixed(2)} 0)`
    return { wing, grads, orbs, sweep }
}

type Props = Settings & {
    loopSeconds: number
    glow: number
    wingShimmer: number
    wingLines: boolean
    accentLines: boolean
    navy: string
    teal: string
    lightTeal: string
    lightBlue: string
    midnight: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 500
 */
export default function ATMWingBackground(props: Props) {
    const {
        loopSeconds,
        glow,
        wingShimmer,
        wingLines,
        accentLines,
        navy,
        teal,
        lightTeal,
        lightBlue,
        midnight,
    } = props
    const settings: Settings = {
        motionStyle: props.motionStyle === "aurora" ? "aurora" : "flow",
        movement: props.movement,
        easing: props.easing,
        pulsesPerLoop: props.pulsesPerLoop,
        shimmersPerLoop: props.shimmersPerLoop,
    }
    const col: Record<ColorKey, string> = { navy, teal, lteal: lightTeal, lblue: lightBlue, mid: midnight }

    // Unique ids so two instances on one page don't share gradients.
    const uid = "wing" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const id = (name: string) => `${uid}-${name}`

    const reduceMotion = useReducedMotion()
    const first = frameAt(0, settings)

    const wingRefs = React.useRef<(SVGGElement | null)[]>([])
    const gradRefs = React.useRef<(SVGLinearGradientElement | null)[]>([])
    const orbRefs = React.useRef<(SVGCircleElement | null)[]>([])
    const sweepRef = React.useRef<SVGLinearGradientElement | null>(null)

    // The loop reads the latest settings each frame, so changing a property never restarts it.
    const live = React.useRef({ settings, loopSeconds })
    live.current = { settings, loopSeconds }

    React.useEffect(() => {
        const apply = (theta: number) => {
            const f = frameAt(theta, live.current.settings)
            wingRefs.current.forEach((g) => g?.setAttribute("transform", f.wing))
            gradRefs.current.forEach((g, i) => g?.setAttribute("gradientTransform", f.grads[i]))
            orbRefs.current.forEach((c, i) => {
                if (!c) return
                const o = f.orbs[i]
                c.setAttribute("cx", o.cx)
                c.setAttribute("cy", o.cy)
                c.setAttribute("r", o.r)
                c.setAttribute("opacity", o.opacity)
            })
            sweepRef.current?.setAttribute("gradientTransform", f.sweep)
        }
        if (reduceMotion) {
            apply(0)
            return
        }
        let theta = 0
        let last = performance.now()
        let raf = 0
        const tick = (now: number) => {
            const dt = Math.min(0.1, (now - last) / 1000)
            last = now
            theta = (theta + (dt / Math.max(0.5, live.current.loopSeconds)) * Math.PI * 2) % (Math.PI * 2)
            apply(theta)
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [reduceMotion])

    const gradient = (gid: string, spec: { grad: Key[]; g: number[] }, fadeLast: boolean, transform: string, ref?: (el: SVGLinearGradientElement | null) => void) => (
        <linearGradient
            key={gid}
            id={id(gid)}
            ref={ref}
            gradientUnits="userSpaceOnUse"
            x1={spec.g[0]}
            y1={spec.g[1]}
            x2={spec.g[2]}
            y2={spec.g[3]}
            gradientTransform={transform || undefined}
        >
            {expand(spec.grad, fadeLast).map(({ o, c0, c1, t, alpha }) => (
                <stop key={o} offset={o} stopColor={mix(col[c0], col[c1], t)} stopOpacity={alpha} />
            ))}
        </linearGradient>
    )

    const line = (ci: number, on: boolean) => (
        <path
            key={`l${ci}`}
            d={lineD(ci)}
            fill="none"
            stroke={lightTeal}
            strokeOpacity={on ? 0.28 : 0}
            strokeWidth={1.2}
            strokeLinecap="round"
        />
    )
    const shimmer = Math.min(1, wingShimmer)

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: navy }}>
            <svg
                viewBox="0 0 499 465"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            >
                <defs>
                    {gradient("bg", BG, false, `rotate(${-BG_ANGLE} 249.5 232.5)`)}
                    {SHAPES.map((s, i) =>
                        gradient(`shape${i}`, s, true, first.grads[i], (el) => (gradRefs.current[i] = el))
                    )}
                    {ORBS.map((o, i) => {
                        const core = mix(col[o.color], "#ffffff", 0.35)
                        return (
                            <radialGradient key={i} id={id(`orb${i}`)}>
                                {FALLOFF.map(([off, a]) => (
                                    <stop
                                        key={off}
                                        offset={off}
                                        stopColor={off < 0.3 ? core : col[o.color]}
                                        stopOpacity={Math.min(1, glow * o.k * a)}
                                    />
                                ))}
                            </radialGradient>
                        )
                    })}
                    <filter id={id("glowSoft")} filterUnits="userSpaceOnUse" x={-500} y={-500} width={1500} height={1500}>
                        <feGaussianBlur stdDeviation={55} />
                    </filter>
                    <filter id={id("lineSoft")} filterUnits="userSpaceOnUse" x={-300} y={-300} width={1200} height={1200}>
                        <feGaussianBlur stdDeviation={3} />
                    </filter>
                    <linearGradient
                        id={id("sweep")}
                        ref={sweepRef}
                        gradientUnits="userSpaceOnUse"
                        x1={0}
                        y1={0}
                        x2={SWEEP_PERIOD}
                        y2={0}
                        spreadMethod="repeat"
                        gradientTransform={first.sweep}
                    >
                        {SWEEP_STOPS.map(([off, a]) => (
                            <stop key={off} offset={off} stopColor={lightTeal} stopOpacity={a} />
                        ))}
                    </linearGradient>
                </defs>

                <rect x={-200} y={-200} width={900} height={900} fill={`url(#${id("bg")})`} />

                <g style={{ mixBlendMode: "screen" }}>
                    {ORBS.map((_, i) => (
                        <circle
                            key={i}
                            ref={(el) => (orbRefs.current[i] = el)}
                            cx={first.orbs[i].cx}
                            cy={first.orbs[i].cy}
                            r={first.orbs[i].r}
                            opacity={first.orbs[i].opacity}
                            fill={`url(#${id(`orb${i}`)})`}
                            filter={`url(#${id("glowSoft")})`}
                        />
                    ))}
                </g>

                <g>
                    {FILLS.map((f, i) => (
                        <path key={i} d={f.d} fill={`url(#${id(`shape${i}`)})`} opacity={f.op} />
                    ))}
                </g>

                {WINGS.map((w, wi) => (
                    <g
                        key={wi}
                        ref={(el) => (wingRefs.current[wi] = el)}
                        transform={first.wing || undefined}
                    >
                        <path d={w.d} fill={`url(#${id(`shape${FILLS.length + wi}`)})`} opacity={w.op} />
                        {w.lines!.map((ci) => (
                            <React.Fragment key={ci}>
                                {line(ci, wingLines)}
                                <path
                                    d={lineD(ci)}
                                    fill="none"
                                    stroke={`url(#${id("sweep")})`}
                                    strokeWidth={8}
                                    strokeLinecap="round"
                                    filter={`url(#${id("lineSoft")})`}
                                    opacity={wingLines ? shimmer : 0}
                                />
                                <path
                                    d={lineD(ci)}
                                    fill="none"
                                    stroke={`url(#${id("sweep")})`}
                                    strokeWidth={1.8}
                                    strokeLinecap="round"
                                    opacity={wingLines ? shimmer : 0}
                                />
                            </React.Fragment>
                        ))}
                    </g>
                ))}

                <g>{ACCENTS.map((ci) => line(ci, accentLines))}</g>
            </svg>
        </div>
    )
}

addPropertyControls(ATMWingBackground, {
    motionStyle: {
        type: ControlType.Enum,
        title: "Style",
        options: ["flow", "aurora"],
        optionTitles: ["Flow", "Aurora"],
        defaultValue: "flow",
        displaySegmentedControl: true,
    },
    loopSeconds: {
        type: ControlType.Number,
        title: "Loop (s)",
        defaultValue: 12,
        min: 4,
        max: 30,
        step: 0.5,
    },
    movement: {
        type: ControlType.Number,
        title: "Movement",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.05,
    },
    easing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["sine", "gentle", "smooth", "dramatic"],
        optionTitles: ["Sine (even, calm)", "Gentle", "Smooth", "Dramatic"],
        defaultValue: "sine",
    },
    glow: {
        type: ControlType.Number,
        title: "Glow",
        defaultValue: 1,
        min: 0,
        max: 2,
        step: 0.05,
    },
    pulsesPerLoop: {
        type: ControlType.Number,
        title: "Pulses / Loop",
        defaultValue: 2,
        min: 1,
        max: 6,
        step: 1,
    },
    wingShimmer: {
        type: ControlType.Number,
        title: "Wing Shimmer",
        defaultValue: 1.5,
        min: 0,
        max: 2,
        step: 0.05,
    },
    shimmersPerLoop: {
        type: ControlType.Number,
        title: "Shimmers / Loop",
        defaultValue: 1,
        min: 1,
        max: 4,
        step: 1,
    },
    wingLines: {
        type: ControlType.Boolean,
        title: "Wing Lines",
        defaultValue: true,
    },
    accentLines: {
        type: ControlType.Boolean,
        title: "Accent Lines",
        defaultValue: true,
    },
    navy: { type: ControlType.Color, title: "Navy", defaultValue: "#002c44" },
    teal: { type: ControlType.Color, title: "Teal", defaultValue: "#059390" },
    lightTeal: { type: ControlType.Color, title: "Light Teal", defaultValue: "#3bbfc0" },
    lightBlue: { type: ControlType.Color, title: "Light Blue", defaultValue: "#0079a9" },
    midnight: { type: ControlType.Color, title: "Midnight", defaultValue: "#11232d" },
})
