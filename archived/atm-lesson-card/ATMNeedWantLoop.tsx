import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { useReducedMotion } from "framer-motion"

// The looping illustration for the "Need or Want?" lesson card on /atm-start's curved carousel.
// It fills the bottom of the teal glass card (where the flip card's image was); the card's copy
// and Get Started button stay still above it. No background of its own, so the glass shows through.
//
// Nine styles (the Style property), each one illustration looping in place:
// Swipe, Balance, Bags, Cart, Coin, Sorter, Claw, Dial, Bubbles.
// Items: needs are Rent (house), Groceries (bag), Water bill (drop); wants are iPhone 18 (phone),
// Netflix (TV), Sneakers (sneaker). Bags has its own 3D items: groceries and a T-shirt (NEED),
// a smartphone and sneakers (WANT).
//
// One clock: every position is a function of the loop time t (0..1), and every track starts and
// ends on the same value, so the last frame equals the first. Each frame only sets SVG attributes
// (transforms, opacities, a few paths); React never re-renders per frame. Reduced motion shows one
// still frame. No blur, filters or CSS transitions (they cause a black rectangle over the carousel
// on Windows).

const TAU = Math.PI * 2
const W = 640 // viewBox
const H = 480

// cubic-bezier(x1, y1, x2, y2) as a function of 0..1
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const at = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
    return (x: number) => {
        let lo = 0
        let hi = 1
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2
            if (at(mid, x1, x2) < x) lo = mid
            else hi = mid
        }
        return at((lo + hi) / 2, y1, y2)
    }
}
const INOUT = bezier(0.77, 0, 0.175, 1) // moving on screen
const OUT = bezier(0.23, 1, 0.32, 1) // arriving
// Overshoots a little and settles: the soft spring of design.md §3.5.
const POP = (x: number) => {
    const u = x - 1
    return 1 + 2.6 * u * u * u + 1.6 * u * u
}
const FALL = (x: number) => x * x // gravity

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
// Progress through the window a..b of the loop, 0 before and 1 after.
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
// Value at time t from [time, value] keys, eased between each pair.
function track(keys: number[][], t: number, ease = INOUT) {
    for (let i = 1; i < keys.length; i++) {
        const [t0, v0] = keys[i - 1]
        const [t1, v1] = keys[i]
        if (t <= t1) return v0 + (v1 - v0) * ease(t1 > t0 ? (t - t0) / (t1 - t0) : 1)
    }
    return keys[keys.length - 1][1]
}
const n = (v: number) => v.toFixed(2)
const tf = (x: number, y: number, r = 0, sx = 1, sy = sx) =>
    `translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`
// A sparkle's size: twinkles k times per loop (whole number, so it stays seamless).
const twinkle = (t: number, k: number, ph: number) => Math.pow(Math.max(0, Math.sin(TAU * (k * t + ph))), 3)

type Look = {
    id: string
    glacier: string
    mint: string
    yolk: string
    white: string
    navy: string
    teal: string
    glow: string
    shine: boolean
    needBag: string
    wantBag: string
    outline: boolean
}
type Frame = Record<string, Record<string, string | number>>
type Scene = { seconds: number; still: number; draw: (c: Look) => React.ReactNode; frame: (t: number) => Frame }

const LABEL: React.CSSProperties = {
    fontFamily: '"Area Normal Black", "Area Normal", sans-serif',
    fontWeight: 900,
    letterSpacing: 2,
}

// ---------- Items (drawn round 0,0, about 100 units across) ----------

type Kind = "house" | "groceries" | "drop" | "phone" | "tv" | "sneaker"
// Alternating need, want, so a loop always shows both.
const ORDER: Kind[] = ["house", "phone", "groceries", "sneaker", "drop", "tv"]
const isNeed = (k: Kind) => k === "house" || k === "groceries" || k === "drop"

// A filled shape with the gloss on top: white light at the top, a little navy at the foot.
function Glossy({ d, fill, c }: { d: string; fill: string; c: Look }) {
    return (
        <>
            <path d={d} style={{ fill }} />
            <path d={d} fill={`url(#${c.id}-gloss)`} />
        </>
    )
}
const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
    `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`
const circle = (cx: number, cy: number, r: number) =>
    `M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`
const STAR = "M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"

function Item({ kind, c }: { kind: Kind; c: Look }) {
    switch (kind) {
        case "house":
            return (
                <g>
                    <Glossy c={c} fill={c.mint} d="M-42,-4 L0,-42 L42,-4 L42,40 Q42,46 36,46 L-36,46 Q-42,46 -42,40 Z" />
                    <path d="M-52,-4 L0,-50 L52,-4" fill="none" style={{ stroke: c.navy }} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M-11,46 V20 Q-11,9 0,9 Q11,9 11,20 V46 Z" style={{ fill: c.yolk }} />
                    <circle cx={0} cy={-14} r={7} style={{ fill: c.white }} />
                </g>
            )
        case "groceries":
            return (
                <g>
                    <circle cx={-14} cy={-24} r={17} style={{ fill: c.yolk }} />
                    <ellipse cx={16} cy={-30} rx={10} ry={22} transform="rotate(18 16 -30)" style={{ fill: c.mint }} />
                    <Glossy c={c} fill={c.white} d="M-40,-16 L40,-16 L46,44 Q46,50 40,50 L-40,50 Q-46,50 -46,44 Z" />
                    <path d="M-20,-4 Q0,10 20,-4" fill="none" style={{ stroke: c.navy }} strokeWidth={5} strokeLinecap="round" />
                </g>
            )
        case "drop":
            return (
                <g>
                    <Glossy c={c} fill={c.glacier} d="M0,-52 C16,-30 38,-8 38,14 C38,36 21,50 0,50 C-21,50 -38,36 -38,14 C-38,-8 -16,-30 0,-52 Z" />
                    <path d="M-20,12 Q-20,30 -4,36" fill="none" style={{ stroke: c.white }} strokeWidth={6} strokeLinecap="round" />
                </g>
            )
        case "phone":
            return (
                <g>
                    <Glossy c={c} fill={c.navy} d={roundRect(-29, -52, 58, 104, 15)} />
                    <Glossy c={c} fill={c.glacier} d={roundRect(-22, -42, 44, 80, 8)} />
                    <rect x={-9} y={-38} width={18} height={6} rx={3} style={{ fill: c.navy }} />
                    <circle cx={0} cy={45} r={3.5} style={{ fill: c.yolk }} />
                </g>
            )
        case "tv":
            return (
                <g>
                    <path d="M-18,44 H18" style={{ stroke: c.glacier }} strokeWidth={7} strokeLinecap="round" />
                    <path d="M0,30 V44" style={{ stroke: c.glacier }} strokeWidth={7} />
                    <Glossy c={c} fill={c.navy} d={roundRect(-52, -40, 104, 72, 13)} />
                    <Glossy c={c} fill={c.teal} d={roundRect(-43, -31, 86, 54, 8)} />
                    <path d="M-9,-16 L15,-4 L-9,8 Z" style={{ fill: c.yolk }} strokeLinejoin="round" />
                </g>
            )
        case "sneaker":
            return (
                <g transform="translate(0 -6)">
                    <Glossy
                        c={c}
                        fill={c.white}
                        d="M-50,22 V-8 Q-50,-16 -42,-16 H-22 Q-14,-16 -10,-8 Q0,10 26,12 Q50,14 52,26 V30 Q52,36 46,36 H-44 Q-50,36 -50,30 Z"
                    />
                    <path d="M-50,26 H52 V30 Q52,38 46,38 H-44 Q-50,38 -50,30 Z" style={{ fill: c.navy }} />
                    <path d="M-34,16 Q-4,24 30,6" fill="none" style={{ stroke: c.yolk }} strokeWidth={6} strokeLinecap="round" />
                    <path d="M-16,-2 L-6,-8 M-10,6 L0,0" style={{ stroke: c.glacier }} strokeWidth={4} strokeLinecap="round" />
                </g>
            )
    }
}

// A light band that slides across a shape (Shine on). The band repeats, so it never restarts.
function Shine({ c, name, d }: { c: Look; name: string; d: string }) {
    if (!c.shine) return null
    return (
        <>
            <clipPath id={`${c.id}-${name}`}>
                <path d={d} />
            </clipPath>
            <rect clipPath={`url(#${c.id}-${name})`} x={-800} y={-800} width={1600} height={1600} fill={`url(#${c.id}-sweep)`} />
        </>
    )
}
const SWEEP = 900

function Sparkle({ k, c, color }: { k: string; c: Look; color?: string }) {
    return <path data-k={k} d={STAR} style={{ fill: color || c.yolk }} transform="scale(0)" />
}
const sparkle = (x: number, y: number, size: number) => ({ transform: tf(x, y, 0, Math.max(0.001, size)) })

function Text({ x, y, size, fill, children }: { x: number; y: number; size: number; fill: string; children: string }) {
    return (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} style={{ ...LABEL, fill }}>
            {children}
        </text>
    )
}

// ---------- A. Swipe: a deck of item cards, each swiped left to NEED or right to WANT ----------

const SW = { cx: 320, cy: 250, w: 230, h: 290 }
const SLOTS = ["s2", "s1", "s0", "fly"] // back to front
const swipe: Scene = {
    seconds: 6,
    still: 0.04,
    draw: (c) => (
        <g>
            <g data-k="hintL">
                <path d="M-20,-14 L-36,0 L-20,14" fill="none" style={{ stroke: c.mint }} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                <Text x={52} y={0} size={26} fill={c.mint}>
                    NEED
                </Text>
            </g>
            <g data-k="hintR">
                <path d="M20,-14 L36,0 L20,14" fill="none" style={{ stroke: c.yolk }} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                <Text x={-52} y={0} size={26} fill={c.yolk}>
                    WANT
                </Text>
            </g>
            {SLOTS.map((s) => (
                <g key={s} data-k={s}>
                    <Glossy c={c} fill={c.glacier} d={roundRect(-SW.w / 2, -SW.h / 2, SW.w, SW.h, 34)} />
                    {s === "fly" && <Shine c={c} name="card" d={roundRect(-SW.w / 2, -SW.h / 2, SW.w, SW.h, 34)} />}
                    {ORDER.map((k, j) => (
                        <g key={k} data-k={`${s}v${j}`}>
                            <g transform="translate(0 -6) scale(1.45)">
                                <Item kind={k} c={c} />
                            </g>
                        </g>
                    ))}
                    {s === "fly" && (
                        <>
                            <g data-k="stampN" transform="translate(-50 -108) rotate(-12)">
                                <rect x={-62} y={-24} width={124} height={48} rx={24} style={{ fill: c.mint }} />
                                <Text x={0} y={1} size={24} fill={c.navy}>
                                    NEED
                                </Text>
                            </g>
                            <g data-k="stampW" transform="translate(50 -108) rotate(12)">
                                <rect x={-62} y={-24} width={124} height={48} rx={24} style={{ fill: c.yolk }} />
                                <Text x={0} y={1} size={24} fill={c.navy}>
                                    WANT
                                </Text>
                            </g>
                        </>
                    )}
                </g>
            ))}
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const steps = t * 6
        const I = Math.floor(steps) % 6
        const u = steps - Math.floor(steps)
        const fly = OUT(win(u, 0.5, 0.95))
        const dir = isNeed(ORDER[I]) ? -1 : 1
        const lean = Math.sin(Math.PI * win(u, 0.22, 0.5)) * (1 - fly)
        // the card being swiped
        f.fly = {
            transform: tf(SW.cx + dir * 420 * fly, SW.cy - 40 * fly + 6 * lean, dir * (5 * lean + 26 * fly)),
            opacity: 1 - win(fly, 0.6, 1),
        }
        const stamp = win(u, 0.3, 0.45)
        f.stampN = { opacity: dir < 0 ? stamp : 0 }
        f.stampW = { opacity: dir > 0 ? stamp : 0 }
        // the cards behind move up one place as it goes
        ;["s0", "s1", "s2"].forEach((s, k) => {
            const depth = k + 1 - fly
            f[s] = {
                transform: tf(SW.cx, SW.cy + depth * 22, 0, 1 - depth * 0.06),
                opacity: clamp01(3 - depth),
            }
        })
        SLOTS.forEach((s) => {
            const card = s === "fly" ? I : (I + 1 + Number(s[1])) % 6
            ORDER.forEach((_, j) => (f[`${s}v${j}`] = { opacity: j === card ? 1 : 0 }))
        })
        const glowL = dir < 0 ? fly * (1 - win(u, 0.95, 1)) : 0
        const glowR = dir > 0 ? fly * (1 - win(u, 0.95, 1)) : 0
        f.hintL = { transform: tf(64 - 10 * glowL, SW.cy, 0, 1 + 0.15 * glowL), opacity: 0.55 + 0.45 * glowL }
        f.hintR = { transform: tf(576 + 10 * glowR, SW.cy, 0, 1 + 0.15 * glowR), opacity: 0.55 + 0.45 * glowR }
        return f
    },
}

// ---------- B. Balance: items drop onto a seesaw scale; it tips and springs level again ----------

const BAL = { px: 320, py: 210, arm: 200, hang: 70 }
const balance: Scene = {
    seconds: 7,
    still: 0.8,
    draw: (c) => (
        <g>
            <Glossy c={c} fill={c.glacier} d={`M${BAL.px - 16},${BAL.py} L${BAL.px - 52},400 L${BAL.px + 52},400 L${BAL.px + 16},${BAL.py} Z`} />
            <Glossy c={c} fill={c.mint} d={roundRect(BAL.px - 90, 396, 180, 22, 11)} />
            {[0, 1].map((side) => (
                <g key={side} data-k={`pan${side}`}>
                    <path d={`M0,0 L-62,${BAL.hang} M0,0 L62,${BAL.hang}`} style={{ stroke: c.glacier }} strokeWidth={3} />
                    <Glossy c={c} fill={side ? c.mint : c.glacier} d={`M-80,${BAL.hang} H80 Q72,${BAL.hang + 28} 0,${BAL.hang + 28} Q-72,${BAL.hang + 28} -80,${BAL.hang} Z`} />
                    <Text x={0} y={BAL.hang + 56} size={24} fill={side ? c.yolk : c.white}>
                        {side ? "WANT" : "NEED"}
                    </Text>
                </g>
            ))}
            {ORDER.map((k, i) => (
                <g key={k} data-k={`it${i}`} opacity={0}>
                    <Item kind={k} c={c} />
                </g>
            ))}
            <g data-k="beam">
                <Glossy c={c} fill={c.white} d={roundRect(-BAL.arm - 8, -8, BAL.arm * 2 + 16, 16, 8)} />
                <Shine c={c} name="beam" d={roundRect(-BAL.arm - 8, -8, BAL.arm * 2 + 16, 16, 8)} />
            </g>
            <circle cx={BAL.px} cy={BAL.py} r={15} style={{ fill: c.yolk }} />
            <Sparkle k="spk0" c={c} />
            <Sparkle k="spk1" c={c} color={c.white} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const drop = (i: number) => 0.05 + i * 0.12
        const land = (i: number) => drop(i) + 0.07
        const leave = (i: number) => 0.84 + i * 0.012
        // weight on each pan, springing in as each item lands and out as they leave
        const weight = (i: number) => POP(win(t, land(i), land(i) + 0.1)) * (1 - win(t, leave(i), leave(i) + 0.06))
        let tilt = 0
        ORDER.forEach((k, i) => (tilt += (isNeed(k) ? -1 : 1) * weight(i)))
        const a = tilt * 7
        const rad = (a * Math.PI) / 180
        const pans = [
            [BAL.px - BAL.arm * Math.cos(rad), BAL.py - BAL.arm * Math.sin(rad)],
            [BAL.px + BAL.arm * Math.cos(rad), BAL.py + BAL.arm * Math.sin(rad)],
        ]
        f.beam = { transform: tf(BAL.px, BAL.py, a) }
        f.pan0 = { transform: tf(pans[0][0], pans[0][1]) }
        f.pan1 = { transform: tf(pans[1][0], pans[1][1]) }
        ORDER.forEach((k, i) => {
            const side = isNeed(k) ? 0 : 1
            const slot = [-48, 48, 0][Math.floor(i / 2)]
            const fall = 1 - FALL(win(t, drop(i), land(i)))
            const squash = Math.sin(Math.PI * win(t, land(i), land(i) + 0.05))
            const out = win(t, leave(i), leave(i) + 0.08)
            const s = 0.6 * (1 - 0.3 * out)
            f[`it${i}`] = {
                transform: tf(pans[side][0] + slot, pans[side][1] + BAL.hang - 28 - 200 * fall - 50 * OUT(out), 0, s * (1 + 0.1 * squash), s * (1 - 0.14 * squash)),
                opacity: win(t, drop(i), drop(i) + 0.03) * (1 - out),
            }
        })
        f.spk0 = sparkle(BAL.px + 24, BAL.py - 30, 20 * twinkle(t, 3, 0))
        f.spk1 = sparkle(BAL.px - 140, 120, 14 * twinkle(t, 2, 0.4))
        return f
    },
}

// ---------- C. Bags: two glossy 3D shopping bags hop in turn; each hop flips an item up and back in ----------

// Reads a colour from any form Framer hands a Color property, including a colour style
// ("var(--token-…, <colour>)", whose real colour is the fallback after the comma), so the bags'
// light and shade can be mixed from it.
function toRgb(col: string): number[] {
    const s = col.trim()
    const style = s.match(/^var\([^,]+,\s*(.+)\)$/)
    if (style) return toRgb(style[1])
    const hex = s.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        const h = hex[1].length <= 4 ? [...hex[1]].map((x) => x + x).join("") : hex[1]
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    }
    const rgb = s.match(/rgba?\(([^)]+)\)/i)
    if (rgb) return rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number)
    return [0, 0, 0]
}
const mix = (a: string, b: string, t: number) => {
    const A = toRgb(a)
    const B = toRgb(b)
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`
}
const luminance = (col: string) =>
    toRgb(col)
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
// Shade for a bag colour: warm colours darken toward amber (navy turns yellow olive), cool ones toward navy.
const shade = (col: string, navy: string, t: number) => {
    const [r, , b] = toRgb(col)
    return mix(col, r > b ? "#b54a00" : navy, t)
}
// The label colour with more contrast on the bag: navy or white.
const labelOn = (bag: string, navy: string, white: string) => {
    const L = luminance(bag)
    return (L + 0.05) / (luminance(navy) + 0.05) >= (luminance(white) + 0.05) / (L + 0.05) ? navy : white
}

// Item colours. Brand colours where they work, plus a few warm accents for the groceries
// (straying from the brand a little is allowed for these).
const SKY = "#00acdd"
const LIGHT_BLUE = "#0079a9"
const ORANGE = ["#ffd27a", "#ff9416", "#d9560a"]
const LEAF = ["#a6e86a", "#45b04a"]

type Kind3 = "groceries" | "phone" | "tee" | "sneaker"
// Need, want, need, want: groceries and clothing go in NEED, the phone and sneakers in WANT.
const BAG_ITEMS: Kind3[] = ["groceries", "phone", "tee", "sneaker"]
const BAG3 = { top: 104, bot: 112, h: 228, dx: 46, dy: -20 }
// The pair is centred: from the NEED bag's left edge to the WANT bag's side face is 66..574.
const BAG_AT = [
    { x: 170, y: 458 },
    { x: 416, y: 462 },
]
const OPEN_X = 22 // middle of the bag's opening, from the middle of its front face
const ITEM_REST = -136 // an item waiting inside the bag (hidden behind the front face)

// Top corners are sharp, where the front meets the opening and the side face; only the foot is
// rounded, so no rounded corner runs into a straight edge.
const { top: BT, bot: BB, h: BH, dx: BDX, dy: BDY } = BAG3
const BAG_FRONT = `M${-BT},${-BH} H${BT} L${BB},-6 Q${BB},0 ${BB - 6},0 H${-BB + 16} Q${-BB},0 ${-BB},-16 Z`
const BAG_SIDE = `M${BT},${-BH} L${BT + BDX},${-BH + BDY} L${BB + BDX},${BDY - 12} Q${BB + BDX},${BDY - 2} ${BB + BDX - 9},${BDY + 2} L${BB - 2},0 L${BB},-6 Z`
const BAG_OPEN = `M${-BT},${-BH} L${BT},${-BH} L${BT + BDX},${-BH + BDY} L${-BT + BDX},${-BH + BDY} Z`
const BAG_HEM = `M${-BT},${-BH} H${BT} L${BT + 0.6},${-BH + 18} H${-BT - 0.6} Z`
const HANDLE = `M-50,${-BH + 8} C-50,${-BH - 108} 50,${-BH - 108} 50,${-BH + 8}`

function Tube({ d, c, color, w }: { d: string; c: Look; color: string; w: number }) {
    // A rounded tube: optional white outline, dark underside, the colour, then a thin highlight on top.
    return (
        <>
            {c.outline && <path d={d} fill="none" style={{ stroke: c.white }} strokeWidth={w + 9} strokeLinecap="round" />}
            <path d={d} fill="none" style={{ stroke: shade(color, c.navy, 0.35) }} strokeWidth={w} strokeLinecap="round" />
            <path d={d} fill="none" style={{ stroke: color }} strokeWidth={w * 0.62} strokeLinecap="round" transform="translate(-1 -1.5)" />
            <path d={d} fill="none" style={{ stroke: mix(color, c.white, 0.7) }} strokeWidth={w * 0.18} strokeLinecap="round" transform="translate(-2 -3)" opacity={0.85} />
        </>
    )
}

function Grad({ id, stops, x2 = 1, y2 = 1 }: { id: string; stops: [number, string, number?][]; x2?: number; y2?: number }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
            {stops.map(([o, col, a], i) => (
                <stop key={i} offset={o} style={{ stopColor: col }} stopOpacity={a ?? 1} />
            ))}
        </linearGradient>
    )
}
function Ball({ id, stops }: { id: string; stops: [number, string, number?][] }) {
    return (
        <radialGradient id={id} cx="0.38" cy="0.32" r="0.72" fx="0.32" fy="0.26">
            {stops.map(([o, col, a], i) => (
                <stop key={i} offset={o} style={{ stopColor: col }} stopOpacity={a ?? 1} />
            ))}
        </radialGradient>
    )
}
function Halo({ id, color, a }: { id: string; color: string; a: number }) {
    return (
        <radialGradient id={id}>
            <stop offset="0" style={{ stopColor: color }} stopOpacity={a} />
            <stop offset="0.5" style={{ stopColor: color }} stopOpacity={a * 0.3} />
            <stop offset="1" style={{ stopColor: color }} stopOpacity={0} />
        </radialGradient>
    )
}

function BagDefs({ c }: { c: Look }) {
    const g = (k: string) => `${c.id}-${k}`
    const bags = [c.needBag, c.wantBag]
    return (
        <defs>
            {bags.map((col, s) => (
                <React.Fragment key={s}>
                    <Grad id={g(`bf${s}`)} stops={[[0, mix(col, c.white, 0.45)], [0.32, col], [0.78, shade(col, c.navy, 0.12)], [1, shade(col, c.navy, 0.3)]]} />
                    <Grad id={g(`bs${s}`)} x2={1} y2={0.3} stops={[[0, shade(col, c.navy, 0.26)], [1, shade(col, c.navy, 0.5)]]} />
                    <Grad id={g(`bi${s}`)} x2={0} y2={1} stops={[[0, shade(col, c.navy, 0.62)], [1, shade(col, c.navy, 0.4)]]} />
                    <Halo id={g(`halo${s}`)} color={col} a={0.6} />
                </React.Fragment>
            ))}
            <Halo id={g("iglow")} color={c.white} a={0.5} />
            <Grad id={g("ao")} x2={0} y2={1} stops={[[0, c.navy, 0], [0.8, c.navy, 0], [1, c.navy, 0.28]]} />
            <radialGradient id={g("spec")}>
                <stop offset="0" style={{ stopColor: c.white }} stopOpacity={0.75} />
                <stop offset="1" style={{ stopColor: c.white }} stopOpacity={0} />
            </radialGradient>
            <radialGradient id={g("shadow")}>
                <stop offset="0" style={{ stopColor: c.navy }} stopOpacity={0.55} />
                <stop offset="1" style={{ stopColor: c.navy }} stopOpacity={0} />
            </radialGradient>
            <Grad id={g("phBody")} stops={[[0, mix(c.navy, LIGHT_BLUE, 0.7)], [0.4, c.navy], [1, mix(c.navy, "#000000", 0.5)]]} />
            <Grad id={g("phEdge")} x2={1} y2={0} stops={[[0, mix(c.navy, "#000000", 0.5)], [0.5, mix(LIGHT_BLUE, SKY, 0.4)], [1, mix(c.navy, "#000000", 0.4)]]} />
            <Grad id={g("phScreen")} x2={0.5} stops={[[0, c.glow], [0.45, SKY], [1, LIGHT_BLUE]]} />
            <Grad id={g("tee")} stops={[[0, mix(c.glow, c.white, 0.45)], [0.45, c.glow], [1, c.teal]]} />
            <Grad id={g("white")} stops={[[0, c.white], [0.6, mix(c.white, SKY, 0.12)], [1, mix(c.white, SKY, 0.42)]]} />
            <Grad id={g("whiteV")} x2={0} y2={1} stops={[[0, c.white], [0.7, mix(c.white, SKY, 0.1)], [1, mix(c.white, SKY, 0.38)]]} />
            <Grad id={g("whiteSide")} x2={1} y2={0.2} stops={[[0, mix(c.white, SKY, 0.3)], [1, mix(c.white, SKY, 0.5)]]} />
            <Grad id={g("sky")} x2={0} y2={1} stops={[[0, mix(SKY, c.white, 0.35)], [1, mix(SKY, c.navy, 0.25)]]} />
            <Grad id={g("yolk")} x2={0} y2={1} stops={[[0, mix(c.yolk, c.white, 0.45)], [0.5, c.yolk], [1, mix(c.yolk, "#c0600a", 0.5)]]} />
            <Grad id={g("leaf")} stops={[[0, LEAF[0]], [1, LEAF[1]]]} />
            <Ball id={g("orange")} stops={[[0, ORANGE[0]], [0.5, ORANGE[1]], [1, ORANGE[2]]]} />
        </defs>
    )
}

// A white highlight blob, for the gloss on the items.
const Spec = ({ c, x, y, rx, ry, r = 0, o = 0.7 }: { c: Look; x: number; y: number; rx: number; ry: number; r?: number; o?: number }) => (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${r} ${x} ${y})`} fill={`url(#${c.id}-spec)`} opacity={o} />
)

// Each item's outline shapes, painted white and thick behind it when Outline is on.
const OUTLINE: Record<Kind3, string[]> = {
    phone: [roundRect(-32, -62, 70, 124, 17)],
    tee: ["M-24,-48 L-9,-42 Q0,-36 9,-42 L24,-48 L56,-28 Q58,-26 57,-23 L45,-2 Q43,1 40,0 L31,-6 L31,46 Q31,52 25,52 L-25,52 Q-31,52 -31,46 L-31,-6 L-40,0 Q-43,1 -45,-2 L-57,-23 Q-58,-26 -56,-28 Z"],
    sneaker: [
        "M-62,6 C-64,-16 -56,-36 -40,-38 L-24,-38 C-16,-38 -12,-32 -8,-24 C0,-10 16,-6 34,-3 C52,0 64,6 66,16 Q68,26 66,32 Q64,44 52,44 H-52 Q-66,44 -66,32 Z",
        "M-24,-38 C-20,-50 -8,-50 -4,-40 L-8,-24 Z",
    ],
    groceries: [
        "M-30,-28 L-8,-50 L8,-60 L30,-38 L30,40 L14,48 L-30,48 Z",
        circle(-30, 30, 24),
        "M4,-60 m-8,0 a8,22 -24 1 0 16,0 a8,22 -24 1 0 -16,0",
    ],
}

function Item3D({ kind, c }: { kind: Kind3; c: Look }) {
    const u = (k: string) => `url(#${c.id}-${k})`
    const outline = c.outline && (
        <g style={{ fill: c.white, stroke: c.white }} strokeWidth={9} strokeLinejoin="round">
            {OUTLINE[kind].map((d, i) => (
                <path key={i} d={d} transform={kind === "phone" ? "rotate(-8)" : kind === "sneaker" ? "translate(0 -4)" : undefined} />
            ))}
        </g>
    )
    switch (kind) {
        case "phone":
            // A modern phone seen a little from the side: metal edge, thin bezel, wallpaper, widget,
            // app icons and a dock.
            return (
                <g>
                    {outline}
                    <g transform="rotate(-8)">
                        <rect x={-26} y={-62} width={64} height={124} rx={17} fill={u("phEdge")} />
                        <rect x={-34} y={-30} width={4} height={16} rx={2} style={{ fill: LIGHT_BLUE }} />
                        <rect x={-34} y={-8} width={4} height={16} rx={2} style={{ fill: LIGHT_BLUE }} />
                        <rect x={-32} y={-62} width={64} height={124} rx={17} fill={u("phBody")} />
                        <rect x={-28} y={-58} width={56} height={116} rx={14} fill={u("phScreen")} />
                        <rect x={-21} y={-40} width={42} height={26} rx={8} style={{ fill: c.white }} opacity={0.28} />
                        <circle cx={-10} cy={-27} r={7} style={{ fill: c.yolk }} />
                        <rect x={0} y={-31} width={15} height={4} rx={2} style={{ fill: c.white }} opacity={0.9} />
                        <rect x={0} y={-24} width={10} height={4} rx={2} style={{ fill: c.white }} opacity={0.6} />
                        {[0, 1].map((row) =>
                            [0, 1, 2].map((col) => (
                                <g key={`${row}${col}`} transform={`translate(${-20 + col * 15} ${-6 + row * 16})`}>
                                    <rect width={11} height={11} rx={3.5} style={{ fill: [c.white, c.yolk, c.navy, c.yolk, c.glow, c.white][row * 3 + col] }} />
                                    <rect width={11} height={5} rx={2.5} style={{ fill: c.white }} opacity={0.3} />
                                </g>
                            ))
                        )}
                        <rect x={-22} y={38} width={44} height={15} rx={7.5} style={{ fill: c.white }} opacity={0.25} />
                        {[0, 1, 2].map((i) => (
                            <rect key={i} x={-17 + i * 13} y={40.5} width={10} height={10} rx={3} style={{ fill: [c.white, c.yolk, c.white][i] }} />
                        ))}
                        <rect x={-9} y={-53} width={18} height={6} rx={3} style={{ fill: mix(c.navy, "#000000", 0.5) }} />
                        <path d="M-28,-30 Q-28,-58 -10,-58 H6 L-28,8 Z" style={{ fill: c.white }} opacity={0.14} />
                    </g>
                </g>
            )
        case "tee":
            return (
                <g>
                    {outline}
                    <path d={OUTLINE.tee[0]} fill={u("tee")} />
                    <path d="M31,-6 L31,46 Q31,52 25,52 L12,52 Q24,20 22,-30 L24,-48 L32,-43 Z" style={{ fill: c.navy }} opacity={0.14} />
                    <path d="M-12,-44 Q0,-30 12,-44" fill="none" style={{ stroke: mix(c.teal, c.navy, 0.3) }} strokeWidth={5} strokeLinecap="round" />
                    <path d="M-44,-4 L-54,-24 M44,-4 L54,-24" style={{ stroke: c.white }} strokeWidth={3} strokeLinecap="round" opacity={0.45} />
                    <path d={STAR} transform="translate(0 4) scale(15)" style={{ fill: c.yolk }} />
                    <Spec c={c} x={-16} y={-14} rx={10} ry={26} r={8} o={0.55} />
                </g>
            )
        case "sneaker":
            // A chunky modern sneaker in profile, toe to the right.
            return (
                <g>
                    {outline}
                    <g transform="translate(0 -4)">
                        <path d="M-66,30 Q-66,44 -52,44 H52 Q66,44 66,30 Z" style={{ fill: c.navy }} />
                        <path d="M-52,40 H52" style={{ stroke: SKY }} strokeWidth={2} strokeDasharray="6 5" />
                        <path d="M-66,8 Q-68,32 -52,32 H52 Q68,32 66,18 Q64,8 54,6 Z" fill={u("whiteV")} />
                        <path d="M-60,22 Q-40,16 -20,22 T20,22 T56,20" fill="none" style={{ stroke: SKY }} strokeWidth={3} strokeLinecap="round" />
                        <path d="M-24,-38 C-20,-50 -8,-50 -4,-40 L-8,-24 Z" fill={u("whiteSide")} />
                        <path d="M-62,10 C-64,-14 -56,-36 -40,-38 L-24,-38 C-16,-38 -12,-32 -8,-24 C0,-10 16,-6 34,-3 C52,0 64,6 64,14 Z" fill={u("white")} />
                        <path d="M30,-3 C48,-1 62,6 64,14 L34,12 Q30,4 30,-3 Z" fill={u("sky")} opacity={0.9} />
                        <path d="M-62,10 C-64,-12 -58,-30 -48,-35 L-40,10 Z" fill={u("sky")} />
                        <path d="M-63,-26 L-56,-34 L-50,-30 L-56,-20 Z" style={{ fill: c.yolk }} />
                        <ellipse cx={-32} cy={-35} rx={11} ry={4} style={{ fill: mix(c.navy, "#000000", 0.2) }} />
                        <path d="M-36,4 C-12,8 14,-2 36,-12 C22,6 -8,16 -36,4 Z" fill={u("yolk")} />
                        <path d="M-18,-30 L-2,-22 M-12,-34 L4,-26 M-6,-18 L-20,-26 M0,-22 L-14,-30" style={{ stroke: c.navy }} strokeWidth={3} strokeLinecap="round" />
                        {[[-18, -30], [-11, -24], [-4, -18]].map(([x, y], i) => (
                            <circle key={i} cx={x} cy={y} r={2} style={{ fill: c.white }} />
                        ))}
                        <Spec c={c} x={44} y={2} rx={12} ry={5} r={14} o={0.8} />
                        <Spec c={c} x={-36} y={-16} rx={5} ry={12} o={0.55} />
                    </g>
                </g>
            )
        case "groceries":
            return (
                <g>
                    {outline}
                    <ellipse cx={4} cy={-60} rx={8} ry={22} transform="rotate(-24 4 -60)" fill={u("leaf")} />
                    <ellipse cx={20} cy={-58} rx={7} ry={20} transform="rotate(20 20 -58)" fill={u("leaf")} />
                    <path d="M14,-28 L30,-38 L30,40 L14,48 Z" fill={u("whiteSide")} />
                    <path d="M14,-28 L-6,-50 L8,-60 L30,-38 Z" style={{ fill: mix(c.white, SKY, 0.22) }} />
                    <rect x={-30} y={-28} width={44} height={76} rx={3} fill={u("white")} />
                    <path d="M-30,-28 L-8,-50 L14,-28 Z" style={{ fill: c.white }} />
                    <circle cx={20} cy={-46} r={5} style={{ fill: c.yolk }} />
                    <rect x={-30} y={-4} width={44} height={24} style={{ fill: SKY }} />
                    <path d="M14,-4 L30,-14 L30,10 L14,20 Z" style={{ fill: mix(SKY, c.navy, 0.3) }} />
                    <path d="M-24,9 Q-17,2 -10,9 T4,9" fill="none" style={{ stroke: c.white }} strokeWidth={3} strokeLinecap="round" />
                    <circle cx={-30} cy={30} r={24} fill={u("orange")} />
                    <ellipse cx={-26} cy={8} rx={5} ry={9} transform="rotate(35 -26 8)" fill={u("leaf")} />
                    <Spec c={c} x={-38} y={22} rx={6} ry={9} r={-20} o={0.8} />
                </g>
            )
    }
}

const bags: Scene = {
    seconds: 5.6,
    still: 0.4 / 4,
    draw: (c) => (
        <g>
            <BagDefs c={c} />
            {BAG_AT.map((b, s) => (
                <circle key={s} data-k={`halo${s}`} cx={b.x + OPEN_X} cy={b.y - 130} r={210} fill={`url(#${c.id}-halo${s})`} />
            ))}
            {BAG_AT.map((b, s) => (
                <ellipse key={s} data-k={`shadow${s}`} cx={0} cy={0} rx={160} ry={24} fill={`url(#${c.id}-shadow)`} />
            ))}
            {BAG_AT.map((_, s) => {
                const col = s ? c.wantBag : c.needBag
                return (
                    <React.Fragment key={s}>
                        {/* back of the bag: back handle and the dark inside */}
                        <g data-k={`bagB${s}`}>
                            <g transform={`translate(${BDX} ${BDY})`}>
                                <Tube d={HANDLE} c={c} color={shade(col, c.navy, 0.2)} w={19} />
                            </g>
                            {c.outline && <path d={BAG_OPEN} style={{ stroke: c.white }} fill="none" strokeWidth={9} strokeLinejoin="round" />}
                            <path d={BAG_OPEN} fill={`url(#${c.id}-bi${s})`} />
                        </g>
                        {/* the items for this bag sit between its back and its front */}
                        {BAG_ITEMS.map((k, i) =>
                            i % 2 === s ? (
                                <g key={k} data-k={`it${i}`} opacity={0}>
                                    <Item3D kind={k} c={c} />
                                </g>
                            ) : null
                        )}
                        <g data-k={`bagF${s}`}>
                            {c.outline && (
                                <g style={{ stroke: c.white }} fill="none" strokeWidth={9} strokeLinejoin="round">
                                    <path d={BAG_SIDE} />
                                    <path d={BAG_FRONT} />
                                </g>
                            )}
                            <path d={BAG_SIDE} fill={`url(#${c.id}-bs${s})`} />
                            <path d={BAG_FRONT} fill={`url(#${c.id}-bf${s})`} />
                            <path d={BAG_FRONT} fill={`url(#${c.id}-ao)`} />
                            <path d={BAG_HEM} style={{ fill: c.white }} opacity={0.2} />
                            <path d={`M${-BT - 0.4},${-BH + 18} H${BT + 0.4}`} style={{ stroke: shade(col, c.navy, 0.25) }} strokeWidth={2} opacity={0.5} />
                            <Text x={2} y={-96} size={58} fill={shade(col, c.navy, 0.4)}>
                                {s ? "WANT" : "NEED"}
                            </Text>
                            <Text x={0} y={-100} size={58} fill={labelOn(col, c.navy, c.white)}>
                                {s ? "WANT" : "NEED"}
                            </Text>
                            <Tube d={HANDLE} c={c} color={col} w={20} />
                            {[-50, 50].map((x) => (
                                <g key={x}>
                                    <circle cx={x} cy={-BH + 14} r={7} style={{ fill: shade(col, c.navy, 0.45) }} />
                                    <circle cx={x - 1.5} cy={-BH + 12.5} r={3} style={{ fill: mix(col, c.white, 0.6) }} />
                                </g>
                            ))}
                        </g>
                    </React.Fragment>
                )
            })}
            <circle data-k="iglow" r={120} fill={`url(#${c.id}-iglow)`} opacity={0} />
            {BAG_ITEMS.map((k, i) => (
                <g key={k} data-k={`hi${i}`} opacity={0}>
                    <Item3D kind={k} c={c} />
                </g>
            ))}
            <path data-k="star" d={STAR} style={{ fill: c.yolk }} />
            <Sparkle k="spk0" c={c} />
            <Sparkle k="spk1" c={c} color={c.white} />
            <Sparkle k="spk2" c={c} color={c.white} />
            <Sparkle k="spk3" c={c} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const steps = t * 4
        const beat = Math.floor(steps) % 4
        const u = steps - Math.floor(steps)
        BAG_AT.forEach((b, s) => {
            const mine = beat % 2 === s
            const v = mine ? u : 0.999
            const hop = track([[0, 0], [0.1, 0], [0.28, -36], [0.46, 0], [1, 0]], v)
            const sy = track([[0, 1], [0.1, 0.88], [0.2, 1.07], [0.32, 1.02], [0.44, 1], [0.5, 0.9], [0.62, 1.04], [0.74, 1], [1, 1]], v)
            const lean = (s ? 1 : -1) * 4 * Math.sin(Math.PI * win(v, 0.12, 0.5))
            const sway = 1.4 * Math.sin(TAU * (2 * t + s * 0.5))
            const tr = tf(b.x, b.y + hop, sway + lean, 2 - sy, sy)
            f[`bagB${s}`] = { transform: tr }
            f[`bagF${s}`] = { transform: tr }
            f[`shadow${s}`] = { transform: tf(b.x + 14, b.y + 2, 0, 1 + hop / 140, 1 + hop / 200), opacity: 1 + hop / 90 }
            // the glow behind each bag breathes, and swells while that bag hops
            f[`halo${s}`] = { opacity: 0.45 + 0.12 * Math.sin(TAU * (2 * t + s * 0.5)) + 0.4 * Math.sin(Math.PI * win(v, 0.15, 0.7)) }
        })
        let apex = { x: 0, y: 0, k: 0 }
        BAG_ITEMS.forEach((_, i) => {
            const s = i % 2
            const b = BAG_AT[s]
            const active = i === beat
            const v = active ? u : 0
            // up fast and soft, a short float at the top, then back down into the bag
            const rise = v < 0.6 ? track([[0, 0], [0.14, 0], [0.42, 1], [0.6, 0.97]], v, OUT) : track([[0.6, 0.97], [0.9, 0], [1, 0]], v)
            const turn = Math.cos(TAU * win(v, 0.16, 0.66)) // one full turn, seen side on
            const sx = (turn < 0 ? -1 : 1) * Math.max(0.06, Math.abs(turn))
            const x = b.x + OPEN_X
            const y = b.y + ITEM_REST - 236 * rise + 6 * Math.sin(TAU * win(v, 0.42, 0.6))
            const r = (s ? 1 : -1) * 10 * Math.sin(TAU * v)
            const scale = 1.08 + 0.22 * rise
            // once it is clear of the bag, the copy drawn above everything takes over, so it passes
            // in front of the bag's handle instead of behind it
            const out = y + 64 * scale < b.y - BH
            const transform = `translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${(sx * scale).toFixed(4)} ${scale.toFixed(4)})`
            f[`it${i}`] = { transform, opacity: active && !out ? 1 : 0 }
            f[`hi${i}`] = { transform, opacity: active && out ? 1 : 0 }
            if (active) apex = { x, y, k: Math.sin(Math.PI * win(v, 0.34, 0.72)) }
        })
        f.iglow = { transform: `translate(${n(apex.x)} ${n(apex.y)})`, opacity: apex.k }
        f.spk0 = sparkle(apex.x + 78, apex.y - 36, 24 * apex.k)
        f.spk1 = sparkle(apex.x - 74, apex.y + 10, 15 * apex.k)
        f.spk2 = sparkle(320, 92, 12 * twinkle(t, 3, 0.2))
        f.spk3 = sparkle(54, 210, 14 * twinkle(t, 2, 0.6))
        const want = beat % 2 === 1 ? Math.sin(Math.PI * win(u, 0.2, 0.6)) : 0
        f.star = { transform: tf(592, 120 + 8 * Math.sin(TAU * 2 * t), 14 * Math.sin(TAU * t), 34 * (1 + 0.18 * want)) }
        return f
    },
}

// ---------- D. Cart: needs hop into a rolling cart and stay; wants hop in and get bounced out ----------

const CART = { x: 290, y: 382 }
const BASKET = "M-120,-124 L124,-124 L104,-28 Q102,-20 94,-20 L-92,-20 Q-100,-20 -102,-28 Z"
const CART_HOPS: { kind: Kind; at: number; slot: number; reject?: boolean }[] = [
    { kind: "groceries", at: 0.04, slot: -54 },
    { kind: "drop", at: 0.2, slot: 52 },
    { kind: "sneaker", at: 0.38, slot: 0, reject: true },
    { kind: "house", at: 0.56, slot: 0 },
    { kind: "phone", at: 0.7, slot: 4, reject: true },
]
const cart: Scene = {
    seconds: 8,
    still: 0.66,
    draw: (c) => (
        <g>
            <path data-k="road" d="M30,424 H610" style={{ stroke: c.white }} strokeWidth={5} strokeLinecap="round" strokeDasharray="34 26" opacity={0.45} />
            <g data-k="cart">
                {CART_HOPS.map((h, i) => (
                    <g key={i} data-k={`it${i}`}>
                        <Item kind={h.kind} c={c} />
                    </g>
                ))}
                <Glossy c={c} fill={c.glacier} d={BASKET} />
                <Shine c={c} name="basket" d={BASKET} />
                <path d="M-80,-100 V-40 M-40,-100 V-40 M0,-100 V-40 M40,-100 V-40 M80,-100 V-40" style={{ stroke: c.white }} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
                <path d="M124,-124 L148,-170 H182" fill="none" style={{ stroke: c.white }} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M-96,-20 L-90,6 H96" fill="none" style={{ stroke: c.white }} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
                {[-64, 72].map((x, i) => (
                    <g key={i} transform={`translate(${x} 22)`}>
                        <circle r={21} style={{ fill: c.navy }} />
                        <g data-k={`wheel${i}`}>
                            <path d="M-12,0 H12 M0,-12 V12" style={{ stroke: c.glacier }} strokeWidth={4} strokeLinecap="round" />
                        </g>
                        <circle r={6} style={{ fill: c.yolk }} />
                    </g>
                ))}
            </g>
            <Sparkle k="spk0" c={c} />
            <Sparkle k="spk1" c={c} color={c.white} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const wiggle = (at: number) => Math.sin(TAU * 3 * win(t, at + 0.1, at + 0.16)) * (1 - win(t, at + 0.1, at + 0.16))
        let rot = 0
        CART_HOPS.forEach((h) => h.reject && (rot += 5 * wiggle(h.at)))
        f.cart = { transform: tf(CART.x, CART.y + 3 * Math.sin(TAU * 12 * t), rot) }
        f.road = { "stroke-dashoffset": n(60 * 20 * t) }
        f.wheel0 = { transform: `rotate(${n(-360 * 10 * t)})` }
        f.wheel1 = { transform: `rotate(${n(-360 * 10 * t)})` }
        CART_HOPS.forEach((h, i) => {
            const inn = win(t, h.at, h.at + 0.09)
            const rest = { x: h.slot, y: -128 }
            let x = lerp(380, rest.x, inn)
            let y = lerp(-20, rest.y, inn) - 170 * 4 * inn * (1 - inn)
            let r = -30 * (1 - inn)
            let o = win(t, h.at - 0.01, h.at + 0.02)
            const settle = Math.sin(Math.PI * win(t, h.at + 0.09, h.at + 0.13))
            let sy = 1 - 0.12 * settle
            if (h.reject) {
                const out = win(t, h.at + 0.12, h.at + 0.22)
                x = lerp(x, -330, out)
                y = y - 220 * 4 * out * (1 - out) + 140 * out * out
                r += -200 * out
                o *= 1 - win(out, 0.7, 1)
            } else {
                const gone = win(t, 0.9 + i * 0.015, 0.95 + i * 0.015)
                y -= 60 * OUT(gone)
                o *= 1 - gone
            }
            f[`it${i}`] = { transform: tf(x, y, r, 0.72 * (2 - sy), 0.72 * sy), opacity: o }
        })
        const pings = CART_HOPS.filter((h) => !h.reject)
        f.spk0 = sparkle(CART.x - 40, 200, 20 * Math.max(...pings.map((h) => Math.sin(Math.PI * win(t, h.at + 0.08, h.at + 0.16)))))
        f.spk1 = sparkle(CART.x + 80, 190, 14 * twinkle(t, 4, 0.1))
        return f
    },
}

// ---------- E. Coin: a glossy coin flips between NEED and WANT, landing with a squash ----------

const COIN = { x: 320, y: 250, r: 124 }
const coin: Scene = {
    seconds: 5,
    still: 0.05,
    draw: (c) => (
        <g>
            <ellipse data-k="shadow" cx={COIN.x} cy={420} rx={110} ry={14} style={{ fill: c.navy }} opacity={0.35} />
            <g data-k="coin">
                <circle data-k="rim" r={COIN.r} style={{ fill: c.yolk }} />
                {[0, 1].map((side) => (
                    <g key={side} data-k={`face${side}`}>
                        <Glossy c={c} fill={side ? c.mint : c.glacier} d={circle(0, 0, COIN.r)} />
                        <circle r={COIN.r - 14} fill="none" style={{ stroke: c.white }} strokeWidth={5} opacity={0.8} />
                        <Shine c={c} name={`face${side}`} d={circle(0, 0, COIN.r)} />
                        <g transform="translate(0 -18) scale(1.05)">
                            <Item kind={side ? "sneaker" : "house"} c={c} />
                        </g>
                        <Text x={0} y={70} size={30} fill={c.navy}>
                            {side ? "WANT" : "NEED"}
                        </Text>
                    </g>
                ))}
            </g>
            {[0, 1, 2, 3].map((i) => (
                <Sparkle key={i} k={`spk${i}`} c={c} color={i % 2 ? c.white : c.yolk} />
            ))}
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const flips = [
            [0.12, 0.42],
            [0.6, 0.9],
        ]
        let phi = 0
        let lift = 0
        let squash = 0
        flips.forEach(([a, b]) => {
            const u = win(t, a, b)
            phi += Math.PI * INOUT(u)
            lift += Math.sin(Math.PI * u)
            squash += Math.sin(Math.PI * win(t, b, b + 0.07))
        })
        const sx = Math.cos(phi)
        const y = COIN.y - 80 * lift + 8 * squash
        const sy = 1 - 0.1 * squash
        f.coin = { transform: tf(COIN.x, y, 4 * Math.sin(TAU * t)) }
        f.rim = { transform: `translate(${n(14 * Math.sin(phi))} 4) scale(${Math.max(0.06, Math.abs(sx)).toFixed(4)} ${sy.toFixed(4)})` }
        const face = sx >= 0 ? 0 : 1
        ;[0, 1].forEach((side) => {
            f[`face${side}`] = {
                transform: `scale(${Math.max(0.001, Math.abs(sx)).toFixed(4)} ${sy.toFixed(4)})`,
                opacity: side === face ? 1 : 0,
            }
        })
        f.shadow = { transform: `translate(${COIN.x} 420) scale(${(1 - 0.45 * lift).toFixed(3)} 1) translate(${-COIN.x} -420)`, opacity: 0.35 - 0.2 * lift }
        const burst = Math.max(...flips.map(([, b]) => Math.sin(Math.PI * win(t, b - 0.01, b + 0.1))))
        const spots = [
            [-150, -90],
            [160, -60],
            [-130, 90],
            [150, 100],
        ]
        spots.forEach(([dx, dy], i) => (f[`spk${i}`] = sparkle(COIN.x + dx, COIN.y + dy, (i % 2 ? 14 : 22) * burst)))
        return f
    },
}

// ---------- F. Sorter: items ride a belt and a paddle bats each one into the NEED or WANT bin ----------

const BIN = "M-92,-58 L92,-58 L78,40 Q76,50 66,50 L-66,50 Q-76,50 -78,40 Z"
const BINS = [
    { x: 168, y: 396 },
    { x: 472, y: 396 },
]
const PADDLE = { x: 418, y: 196 }
const sorter: Scene = {
    seconds: 9,
    still: 0.06,
    draw: (c) => (
        <g>
            {BINS.map((b, side) => (
                <ellipse key={side} cx={b.x} cy={b.y - 58} rx={92} ry={14} style={{ fill: c.navy }} opacity={0.55} />
            ))}
            {ORDER.map((k, i) => (
                <g key={k} data-k={`it${i}`} opacity={0}>
                    <Item kind={k} c={c} />
                </g>
            ))}
            <rect x={44} y={196} width={360} height={30} rx={15} style={{ fill: c.navy }} />
            <path data-k="belt" d="M62,211 H386" style={{ stroke: c.glacier }} strokeWidth={6} strokeLinecap="round" strokeDasharray="16 18" />
            <g data-k="paddle">
                <Glossy c={c} fill={c.yolk} d={roundRect(-9, -84, 18, 92, 9)} />
            </g>
            <circle cx={PADDLE.x} cy={PADDLE.y} r={12} style={{ fill: c.white }} />
            {BINS.map((b, side) => (
                <g key={side} data-k={`bin${side}`}>
                    <Glossy c={c} fill={side ? c.mint : c.glacier} d={BIN} />
                    <Shine c={c} name={`bin${side}`} d={BIN} />
                    <Text x={0} y={-4} size={30} fill={c.navy}>
                        {side ? "WANT" : "NEED"}
                    </Text>
                </g>
            ))}
            <Sparkle k="spk0" c={c} />
            <Sparkle k="spk1" c={c} color={c.white} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const steps = t * 6
        const I = Math.floor(steps) % 6
        const u = steps - Math.floor(steps)
        const dir = isNeed(ORDER[I]) ? -1 : 1
        f.belt = { "stroke-dashoffset": n(-34 * 30 * t) }
        f.paddle = { transform: tf(PADDLE.x, PADDLE.y, track([[0, 0], [0.5, 0], [0.56, dir * 48], [0.72, 0], [1, 0]], u, POP)) }
        ORDER.forEach((k, i) => {
            const v = i === I ? u : 0
            const side = isNeed(k) ? 0 : 1
            const b = BINS[side]
            const ride = win(v, 0.05, 0.52)
            const arc = win(v, 0.55, 0.84)
            const sink = win(v, 0.84, 0.94)
            const x = arc > 0 ? lerp(392, b.x, arc) : lerp(80, 392, ride)
            const y = arc > 0 ? lerp(158, b.y - 70, arc) - 150 * 4 * arc * (1 - arc) + 70 * sink : 158 - 6 * Math.abs(Math.sin(TAU * 4 * ride))
            f[`it${i}`] = {
                transform: tf(x, y, arc > 0 ? (side ? 1 : -1) * 300 * OUT(arc) : 0, 0.66 * POP(win(v, 0, 0.06)) * (1 - 0.3 * sink)),
                opacity: i === I ? 1 - win(v, 0.9, 0.95) : 0,
            }
        })
        BINS.forEach((b, side) => {
            const bump = side === (dir < 0 ? 0 : 1) ? Math.sin(Math.PI * win(u, 0.84, 0.96)) : 0
            f[`bin${side}`] = { transform: tf(b.x, b.y + 6 * bump, 0, 1 + 0.06 * bump, 1 - 0.08 * bump) }
        })
        const land = Math.sin(Math.PI * win(u, 0.86, 1))
        f.spk0 = sparkle(BINS[dir < 0 ? 0 : 1].x + 70, 300, 22 * land)
        f.spk1 = sparkle(BINS[dir < 0 ? 0 : 1].x - 76, 318, 14 * land)
        return f
    },
}

// ---------- G. Claw: a claw machine picks a want and a need and drops each down its chute ----------

const CLAW_REST = 128
const PILE: { kind: Kind; x: number; r: number }[] = [
    { kind: "drop", x: 206, r: -8 },
    { kind: "house", x: 268, r: 6 },
    { kind: "tv", x: 336, r: -4 },
    { kind: "phone", x: 396, r: 10 },
    { kind: "sneaker", x: 452, r: -6 },
]
const PICKS = [
    { item: 3, hole: 548, at: 0 },
    { item: 1, hole: 92, at: 0.5 },
]
const PILE_Y = 368
const claw: Scene = {
    seconds: 9,
    still: 0.28,
    draw: (c) => (
        <g>
            <rect x={40} y={40} width={560} height={390} rx={34} style={{ fill: c.white, stroke: c.glacier }} fillOpacity={0.06} strokeWidth={6} />
            <path d="M70,76 H570" style={{ stroke: c.white }} strokeWidth={8} strokeLinecap="round" opacity={0.6} />
            {[92, 548].map((x, side) => (
                <g key={side}>
                    <ellipse cx={x} cy={410} rx={44} ry={13} style={{ fill: c.navy }} opacity={0.7} />
                    <rect x={x - 54} y={442} width={108} height={36} rx={18} style={{ fill: side ? c.yolk : c.mint }} />
                    <Text x={x} y={461} size={20} fill={c.navy}>
                        {side ? "WANT" : "NEED"}
                    </Text>
                </g>
            ))}
            {PILE.map((p, i) => (
                <g key={i} data-k={`it${i}`}>
                    <Item kind={p.kind} c={c} />
                </g>
            ))}
            <path data-k="cable" d="M320,76 V100" style={{ stroke: c.glacier }} strokeWidth={4} />
            <g data-k="claw">
                <g data-k="fL">
                    <path d="M-12,8 Q-44,34 -22,66" fill="none" style={{ stroke: c.white }} strokeWidth={9} strokeLinecap="round" />
                </g>
                <g data-k="fR">
                    <path d="M12,8 Q44,34 22,66" fill="none" style={{ stroke: c.white }} strokeWidth={9} strokeLinecap="round" />
                </g>
                <Glossy c={c} fill={c.yolk} d={roundRect(-28, -14, 56, 28, 12)} />
            </g>
            <Sparkle k="spk0" c={c} />
            <Sparkle k="spk1" c={c} color={c.white} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        // claw position and grip over each half of the loop
        const half = t < 0.5 ? 0 : 1
        const pick = PICKS[half]
        const u = (t - pick.at) * 2
        const target = PILE[pick.item].x
        const from = PICKS[1 - half].hole
        const x = track([[0, from], [0.04, from], [0.2, target], [0.5, target], [0.68, pick.hole], [1, pick.hole]], u)
        const y = track([[0, CLAW_REST], [0.2, CLAW_REST], [0.32, PILE_Y - 60], [0.4, PILE_Y - 60], [0.52, CLAW_REST], [1, CLAW_REST]], u)
        const open = track([[0, 6], [0.12, 22], [0.32, 22], [0.38, 2], [0.7, 2], [0.75, 24], [0.9, 24], [1, 6]], u, OUT)
        f.claw = { transform: tf(x, y) }
        f.cable = { d: `M${n(x)},76 V${n(y - 14)}` }
        f.fL = { transform: `rotate(${n(open)})` }
        f.fR = { transform: `rotate(${n(-open)})` }
        PILE.forEach((p, i) => {
            let px = p.x
            let py = PILE_Y
            let r = p.r
            let s = 0.62
            let o = 1
            PICKS.forEach((pk) => {
                if (pk.item !== i) return
                if (t < pk.at || t >= pk.at + 0.5) {
                    // gone down the chute, then pops back onto the pile during the other pick
                    const back = (pk.at + 0.6) % 1
                    o = win(t, back, back + 0.06)
                    s = 0.62 * POP(o)
                    return
                }
                const v = (t - pk.at) * 2
                const drop = win(v, 0.74, 0.86)
                if (v >= 0.38 && v < 0.74) {
                    px = track([[0.38, p.x], [0.5, p.x], [0.68, pk.hole], [1, pk.hole]], v)
                    py = track([[0.38, PILE_Y - 60], [0.52, CLAW_REST], [1, CLAW_REST]], v) + 62
                    r = p.r * (1 - win(v, 0.38, 0.5)) + 4 * Math.sin(TAU * 2 * v)
                } else if (v >= 0.74) {
                    px = pk.hole
                    py = CLAW_REST + 62 + (410 - CLAW_REST - 62) * FALL(drop)
                    s = 0.62 * (1 - 0.6 * win(drop, 0.7, 1))
                    o = 1 - win(drop, 0.75, 1)
                }
            })
            f[`it${i}`] = { transform: tf(px, py, r, s), opacity: o }
        })
        const land = Math.sin(Math.PI * win(u, 0.82, 0.96))
        f.spk0 = sparkle(pick.hole, 370, 22 * land)
        f.spk1 = sparkle(320, 110, 14 * twinkle(t, 3, 0.3))
        return f
    },
}

// ---------- H. Dial: a needle springs toward NEED or WANT for each item, leaving a comet tail ----------

const DIAL = { x: 320, y: 360, r: 210 }
const DIAL_ANGLE = { need: -160, want: -20, up: -90 }
const polar = (deg: number, r = DIAL.r) => [DIAL.x + r * Math.cos((deg * Math.PI) / 180), DIAL.y + r * Math.sin((deg * Math.PI) / 180)]
const arcPath = (a0: number, a1: number, r = DIAL.r) => {
    const [x0, y0] = polar(a0, r)
    const [x1, y1] = polar(a1, r)
    return `M${n(x0)},${n(y0)} A${r},${r} 0 0 ${a1 > a0 ? 1 : 0} ${n(x1)},${n(y1)}`
}
const dialAngle = (t: number) => {
    const steps = (((t % 1) + 1) % 1) * 6
    const I = Math.floor(steps) % 6
    const u = steps - Math.floor(steps)
    const target = isNeed(ORDER[I]) ? DIAL_ANGLE.need : DIAL_ANGLE.want
    return track([[0, DIAL_ANGLE.up], [0.16, DIAL_ANGLE.up], [0.42, target], [0.74, target], [0.94, DIAL_ANGLE.up], [1, DIAL_ANGLE.up]], u, (x) => (x < 1 ? POP(x) : 1))
}
const dial: Scene = {
    seconds: 7,
    still: 0.05,
    draw: (c) => (
        <g>
            <path d={arcPath(-180, 0)} fill="none" style={{ stroke: c.white }} strokeWidth={30} strokeLinecap="round" opacity={0.16} />
            <path d={arcPath(-180, -100)} fill="none" style={{ stroke: c.mint }} strokeWidth={12} strokeLinecap="round" />
            <path d={arcPath(-80, 0)} fill="none" style={{ stroke: c.yolk }} strokeWidth={12} strokeLinecap="round" />
            <Text x={DIAL.x - DIAL.r} y={DIAL.y + 50} size={28} fill={c.mint}>
                NEED
            </Text>
            <Text x={DIAL.x + DIAL.r} y={DIAL.y + 50} size={28} fill={c.yolk}>
                WANT
            </Text>
            <path data-k="comet" d={arcPath(-90, -90)} fill="none" style={{ stroke: c.white }} strokeWidth={14} strokeLinecap="round" />
            <circle data-k="head" r={16} style={{ fill: c.white, stroke: c.yolk }} strokeWidth={6} />
            <g data-k="needle">
                <path d={`M0,0 H${DIAL.r - 54}`} style={{ stroke: c.white }} strokeWidth={10} strokeLinecap="round" />
            </g>
            <g transform={`translate(${DIAL.x} ${DIAL.y})`}>
                <Glossy c={c} fill={c.glacier} d={circle(0, 0, 72)} />
                <Shine c={c} name="hub" d={circle(0, 0, 72)} />
                {ORDER.map((k, i) => (
                    <g key={k} data-k={`it${i}`}>
                        <Item kind={k} c={c} />
                    </g>
                ))}
            </g>
            <Sparkle k="spk0" c={c} />
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        const steps = t * 6
        const I = Math.floor(steps) % 6
        const u = steps - Math.floor(steps)
        const a = dialAngle(t)
        const tail = dialAngle(t - 0.012)
        f.needle = { transform: tf(DIAL.x, DIAL.y, a) }
        f.comet = { d: arcPath(tail, a), opacity: clamp01(Math.abs(a - tail) / 18) }
        const [hx, hy] = polar(a)
        f.head = { transform: `translate(${n(hx)} ${n(hy)})` }
        ORDER.forEach((_, i) => {
            const on = i === I
            f[`it${i}`] = { transform: tf(0, 0, 0, on ? 0.82 * POP(win(u, 0, 0.12)) * (1 - 0.4 * win(u, 0.94, 1)) : 0.001), opacity: on ? 1 - win(u, 0.94, 1) : 0 }
        })
        const hit = Math.sin(Math.PI * win(u, 0.4, 0.6))
        const [sx, sy] = polar(a, DIAL.r + 34)
        f.spk0 = sparkle(sx, sy, 20 * hit)
        return f
    },
}

// ---------- I. Bubbles: items rise in glowing bubbles and drift to the NEED or WANT side ----------

const bubbles: Scene = {
    seconds: 9,
    still: 0.5,
    draw: (c) => (
        <g>
            <Text x={150} y={452} size={26} fill={c.mint}>
                NEED
            </Text>
            <Text x={490} y={452} size={26} fill={c.yolk}>
                WANT
            </Text>
            {ORDER.map((k, i) => (
                <g key={k} data-k={`b${i}`}>
                    <circle r={110} fill={`url(#${c.id}-glowA)`} opacity={0.5} />
                    <circle r={64} style={{ fill: c.white, stroke: c.glacier }} fillOpacity={0.12} strokeWidth={3} />
                    <path d="M-40,-30 A50,50 0 0 1 -6,-50" fill="none" style={{ stroke: c.white }} strokeWidth={6} strokeLinecap="round" opacity={0.8} />
                    <g transform="scale(0.6)">
                        <Item kind={k} c={c} />
                    </g>
                </g>
            ))}
            {ORDER.map((_, i) => (
                <Sparkle key={i} k={`spk${i}`} c={c} color={i % 2 ? c.yolk : c.white} />
            ))}
        </g>
    ),
    frame: (t) => {
        const f: Frame = {}
        ORDER.forEach((k, i) => {
            const u = (t + i / 6) % 1
            const lane = isNeed(k) ? 150 : 490
            const x = lerp(320, lane, INOUT(win(u, 0.05, 0.6))) + 18 * Math.sin(TAU * 2 * u)
            const y = lerp(470, 70, u)
            const popped = win(u, 0.84, 0.92)
            f[`b${i}`] = {
                transform: tf(x, y, 0, 0.85 * POP(win(u, 0, 0.12)) * (1 + 0.3 * popped)),
                opacity: win(u, 0, 0.06) * (1 - popped),
            }
            f[`spk${i}`] = sparkle(x + 30, y - 40, 22 * Math.sin(Math.PI * win(u, 0.84, 0.98)))
        })
        return f
    },
}

export const SCENES = { swipe, balance, bags, cart, coin, sorter, claw, dial, bubbles }
type StyleName = keyof typeof SCENES
const STYLE_NAMES = Object.keys(SCENES) as StyleName[]
const STYLE_TITLES = ["A Swipe", "B Balance", "C Bags", "D Cart", "E Coin", "F Sorter", "G Claw", "H Dial", "I Bubbles"]

// Behind every style: two soft glows breathing in turn (on the glass, never over the copy).
function commonFrame(t: number): Frame {
    return {
        glowA: { opacity: 0.4 + 0.2 * Math.cos(TAU * t) },
        glowB: { opacity: 0.35 + 0.2 * Math.cos(TAU * t + Math.PI) },
        sweep: { gradientTransform: `rotate(24) translate(${n(SWEEP * ((t * 2) % 1))} 0)` },
    }
}

type Props = {
    motionStyle: StyleName
    speed: number
    glow: boolean
    shine: boolean
    needBag: string
    wantBag: string
    outline: boolean
    glacier: string
    mint: string
    eggYolk: string
    white: string
    navy: string
    teal: string
    lightTeal: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 640
 * @framerIntrinsicHeight 480
 */
export default function ATMNeedWantLoop(props: Props) {
    const reduceMotion = useReducedMotion()
    const id = "nw" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const scene = SCENES[props.motionStyle] || swipe
    const c: Look = {
        id,
        glacier: props.glacier,
        mint: props.mint,
        yolk: props.eggYolk,
        white: props.white,
        navy: props.navy,
        teal: props.teal,
        glow: props.lightTeal,
        shine: props.shine,
        needBag: props.needBag,
        outline: props.outline,
        wantBag: props.wantBag,
    }

    const svgRef = React.useRef<SVGSVGElement | null>(null)
    // The loop reads the latest speed each frame, so changing it never restarts the loop.
    const live = React.useRef({ speed: props.speed })
    live.current = { speed: props.speed }

    React.useLayoutEffect(() => {
        const svg = svgRef.current
        if (!svg) return
        const nodes = new Map<string, Element>()
        svg.querySelectorAll("[data-k]").forEach((el) => nodes.set(el.getAttribute("data-k") || "", el))
        const apply = (t: number) => {
            const f = { ...commonFrame(t), ...scene.frame(t) }
            for (const k in f) {
                const el = nodes.get(k)
                if (!el) continue
                for (const a in f[k]) {
                    const v = f[k][a]
                    el.setAttribute(a, typeof v === "number" ? v.toFixed(3) : v)
                }
            }
        }
        if (reduceMotion) {
            apply(scene.still)
            return
        }
        let t = 0
        let last = performance.now()
        let raf = 0
        const tick = (now: number) => {
            const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)) // a frame stamp can precede the start
            last = now
            t = (t + (dt * Math.max(0.1, live.current.speed)) / scene.seconds) % 1
            apply(t)
            raf = requestAnimationFrame(tick)
        }
        apply(0)
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [reduceMotion, scene, props.shine])

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", overflow: "hidden" }}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: c.white }} stopOpacity={0.6} />
                    <stop offset="0.42" style={{ stopColor: c.white }} stopOpacity={0} />
                    <stop offset="0.6" style={{ stopColor: c.navy }} stopOpacity={0} />
                    <stop offset="1" style={{ stopColor: c.navy }} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id={`${id}-sweep`} data-k="sweep" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={SWEEP} y2={0} spreadMethod="repeat">
                    <stop offset="0" style={{ stopColor: c.white }} stopOpacity={0} />
                    <stop offset="0.44" style={{ stopColor: c.white }} stopOpacity={0} />
                    <stop offset="0.5" style={{ stopColor: c.white }} stopOpacity={0.55} />
                    <stop offset="0.56" style={{ stopColor: c.white }} stopOpacity={0} />
                    <stop offset="1" style={{ stopColor: c.white }} stopOpacity={0} />
                </linearGradient>
                {[
                    ["glowA", c.glow],
                    ["glowB", c.glacier],
                ].map(([k, col]) => (
                    <radialGradient key={k} id={`${id}-${k}`}>
                        <stop offset="0" style={{ stopColor: col }} stopOpacity={0.55} />
                        <stop offset="0.45" style={{ stopColor: col }} stopOpacity={0.18} />
                        <stop offset="1" style={{ stopColor: col }} stopOpacity={0} />
                    </radialGradient>
                ))}
            </defs>
            {props.glow && (
                <>
                    <circle data-k="glowA" cx={230} cy={260} r={260} fill={`url(#${id}-glowA)`} />
                    <circle data-k="glowB" cx={430} cy={250} r={240} fill={`url(#${id}-glowB)`} />
                </>
            )}
            {scene.draw(c)}
        </svg>
    )
}

ATMNeedWantLoop.defaultProps = {
    motionStyle: "swipe" as StyleName,
    speed: 1,
    glow: true,
    shine: true,
    outline: false,
    needBag: "#ffcc40",
    wantBag: "#00acdd",
    glacier: "#d9eeff",
    mint: "#bce2d7",
    eggYolk: "#ffcc40",
    white: "#ffffff",
    navy: "#002c44",
    teal: "#059390",
    lightTeal: "#3bbfc0",
}

addPropertyControls(ATMNeedWantLoop, {
    motionStyle: {
        type: ControlType.Enum,
        title: "Style",
        options: STYLE_NAMES,
        optionTitles: STYLE_TITLES,
        defaultValue: "swipe",
    },
    speed: { type: ControlType.Number, title: "Speed", min: 0.25, max: 2, step: 0.05, defaultValue: 1 },
    glow: { type: ControlType.Boolean, title: "Glow", defaultValue: true },
    shine: { type: ControlType.Boolean, title: "Shine", defaultValue: true },
    outline: { type: ControlType.Boolean, title: "Outline", defaultValue: false, hidden: (p: Partial<Props>) => p.motionStyle !== "bags" },
    needBag: { type: ControlType.Color, title: "Need Bag", defaultValue: "#ffcc40", hidden: (p: Partial<Props>) => p.motionStyle !== "bags" },
    wantBag: { type: ControlType.Color, title: "Want Bag", defaultValue: "#00acdd", hidden: (p: Partial<Props>) => p.motionStyle !== "bags" },
    glacier: { type: ControlType.Color, title: "Glacier", defaultValue: "#d9eeff" },
    mint: { type: ControlType.Color, title: "Mint", defaultValue: "#bce2d7" },
    eggYolk: { type: ControlType.Color, title: "Egg Yolk", defaultValue: "#ffcc40" },
    white: { type: ControlType.Color, title: "White", defaultValue: "#ffffff" },
    navy: { type: ControlType.Color, title: "Navy", defaultValue: "#002c44" },
    teal: { type: ControlType.Color, title: "Teal", defaultValue: "#059390" },
    lightTeal: { type: ControlType.Color, title: "Light Teal", defaultValue: "#3bbfc0" },
})
