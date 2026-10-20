import * as React from "react"
import ReactDOM from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// The Score tab's credit score gauge: a five-range arc from 300 to 850
// with a pointer at the score, the score with its change since last
// time, today's "Updated" date, and an info button that opens the
// ranges pop-up. Built for the 1080-wide kiosk; app styles (Inter).

const MIN = 300
const MAX = 850

// Lowest score of each range, low to high, its arc colour and the
// slightly darker outline around that block.
const RANGES = [
    { from: 300, color: "#e5483b", outline: "#c0372b" }, // Deficient
    { from: 500, color: "#f0832f", outline: "#c9691f" }, // Unfavorable
    { from: 600, color: "#f2c444", outline: "#c9a02e" }, // Fair
    { from: 660, color: "#4db67a", outline: "#389360" }, // Good
    { from: 780, color: "#2f7f52", outline: "#22603d" }, // Excellent
]

const INFO_TEXT =
    "Your credit score is calculated on a scale of 300-850: Excellent (780-850), Good (660-779), Fair (600-659), Unfavorable (500-599), or Deficient (300-499)."

// Gauge geometry in the 1000-wide layout.
const CX = 500
const CY = 450
const R = 390
const STROKE = 46
const GAP_DEG = 2.4
const SEG_DEG = 180 / RANGES.length

const FONT = "Inter, sans-serif"

interface Props {
    score: number
    trend: "up" | "down"
    change: number
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 690
 */
export default function CreditScoreGauge(props: Props) {
    const { trend, change } = props
    const score = Math.round(Math.min(MAX, Math.max(MIN, props.score)))
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const today = useToday()
    const [infoOpen, setInfoOpen] = React.useState(false)
    const rootRef = React.useRef<HTMLDivElement>(null)

    const range = RANGES[rangeIndex(score)]
    const pointer = polar(angleOf(score))

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                fontFamily: FONT,
                color: "#000",
            }}
        >
            <svg
                width={1000}
                height={520}
                viewBox="0 0 1000 520"
                style={{ position: "absolute", left: 0, top: 0 }}
                aria-hidden
            >
                {RANGES.map((r, i) => {
                    // Gaps only between segments, not at the arc's two ends.
                    const start = 180 - i * SEG_DEG - (i > 0 ? GAP_DEG / 2 : 0)
                    const end =
                        180 -
                        (i + 1) * SEG_DEG +
                        (i < RANGES.length - 1 ? GAP_DEG / 2 : 0)
                    return (
                        <path
                            key={r.from}
                            d={sector(start, end)}
                            fill={r.color}
                            stroke={r.outline}
                            strokeWidth={2.5}
                        />
                    )
                })}
                <circle
                    cx={pointer.x}
                    cy={pointer.y}
                    r={25}
                    fill="#fff"
                    stroke={range.color}
                    strokeWidth={10}
                />
                {/* Thin darker edge around the ring, inside and out. */}
                {[30, 20].map((edge) => (
                    <circle
                        key={edge}
                        cx={pointer.x}
                        cy={pointer.y}
                        r={edge}
                        fill="none"
                        stroke={range.outline}
                        strokeWidth={2.5}
                    />
                ))}
            </svg>

            <Label x={CX - R} text="300" />
            <Label x={CX + R} text="850" />

            <div
                aria-label={`Credit score ${score}, ${trend} ${change}`}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 290,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    gap: 28,
                }}
            >
                {/* Change badge sits right of the score; mirror its width on the left so the score stays centred. */}
                <div style={{ width: 60 }} />
                <div
                    style={{
                        fontSize: 150,
                        fontWeight: 500,
                        lineHeight: "150px",
                        letterSpacing: -2,
                    }}
                >
                    {score}
                </div>
                <div
                    style={{
                        width: 60,
                        paddingTop: 30,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <svg width={34} height={26} viewBox="0 0 34 26" aria-hidden>
                        {/* A same-colour round-joined stroke softens the corners. */}
                        <path
                            d={trend === "up" ? "M17 3 L31 23 L3 23 Z" : "M3 3 L31 3 L17 23 Z"}
                            fill={trend === "up" ? "#4db67a" : "#e5483b"}
                            stroke={trend === "up" ? "#4db67a" : "#e5483b"}
                            strokeWidth={5}
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                        {change}
                    </div>
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 545,
                    textAlign: "center",
                    fontSize: 32,
                    color: "#353535",
                    // Hidden until mounted so the server-rendered date can't flash.
                    visibility: today ? "visible" : "hidden",
                }}
            >
                {/* Fixed placeholder keeps server and first client render identical. */}
                Updated: {today ?? "September 30, 2026"}
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 610,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 14,
                    fontSize: 32,
                    color: "#212121",
                }}
            >
                <span>
                    <b style={{ color: "#0e3a70" }}>VantageScore 3.0</b> from{" "}
                    <b>TransUnion</b>
                </span>
                <button
                    type="button"
                    aria-label="About credit score ranges"
                    onClick={() => setInfoOpen(true)}
                    style={{
                        width: 64,
                        height: 64,
                        margin: -14,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <InfoIcon size={36} />
                </button>
            </div>

            {infoOpen && !isCanvas && rootRef.current && (
                <InfoPopup
                    anchor={rootRef.current}
                    onClose={() => setInfoOpen(false)}
                />
            )}
        </div>
    )
}

function Label({ x, text }: { x: number; text: string }) {
    return (
        <div
            style={{
                position: "absolute",
                left: x - 60,
                width: 120,
                top: CY + 28,
                textAlign: "center",
                fontSize: 34,
                fontWeight: 700,
                color: "#212121",
            }}
        >
            {text}
        </div>
    )
}

function InfoIcon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <circle cx={12} cy={12} r={10.5} fill="none" stroke="#353535" strokeWidth={2} />
            <circle cx={12} cy={7.5} r={1.4} fill="#353535" />
            <rect x={10.9} y={10.3} width={2.2} height={7.2} rx={1.1} fill="#353535" />
        </svg>
    )
}

// The pop-up dims only the page's "Scrollable Content" frame (the area
// between the top nav and the bottom nav), not the whole screen.
const OVERLAY_HOST = '[data-framer-name="Scrollable Content"]'

function InfoPopup({
    anchor,
    onClose,
}: {
    anchor: HTMLElement
    onClose: () => void
}) {
    // shortcut: falls back to the nearest scrolling ancestor if the frame is renamed.
    const host = anchor.closest<HTMLElement>(OVERLAY_HOST) ?? scrollParent(anchor)
    const [visible, setVisible] = React.useState({ top: 0, height: 0 })

    React.useLayoutEffect(() => {
        if (!host) return
        // Cover the part that's on screen and stop it scrolling underneath.
        const { overflow, position } = host.style
        host.style.overflow = "hidden"
        if (getComputedStyle(host).position === "static")
            host.style.position = "relative"
        setVisible({ top: host.scrollTop, height: host.clientHeight })
        return () => {
            host.style.overflow = overflow
            host.style.position = position
        }
    }, [host])

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    return ReactDOM.createPortal(
        <div
            onClick={onClose}
            style={{
                ...(host
                    ? {
                          position: "absolute",
                          left: 0,
                          width: "100%",
                          top: visible.top,
                          height: visible.height,
                      }
                    : { position: "fixed", inset: 0 }),
                // Below AppInactivityOverlay (99999) so the idle redirect still shows over it.
                zIndex: 9999,
                background: "rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Credit score ranges"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "relative",
                    width: "min(920px, 88%)",
                    boxSizing: "border-box",
                    padding: "40px 110px 40px 44px",
                    background: "#fff",
                    borderRadius: 10,
                    boxShadow: "rgba(0, 0, 0, 0.2) 0 8px 24px",
                    fontSize: 30,
                    lineHeight: 1.6,
                    color: "#5e5e5e",
                }}
            >
                {INFO_TEXT}
                <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 24,
                        right: 24,
                        width: 72,
                        height: 72,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden>
                        <circle cx={26} cy={26} r={23.5} fill="none" stroke="#212121" strokeWidth={3} />
                        <path d="M19 19 L33 33 M33 19 L19 33" stroke="#212121" strokeWidth={3.5} strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>,
        host ?? document.body
    )
}

function scrollParent(el: HTMLElement): HTMLElement | null {
    for (let p = el.parentElement; p; p = p.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p
    }
    return null
}

// Today's date, re-read just after each midnight so a page left open
// rolls over on its own. Undefined until mounted (no server-rendered date).
function useToday(): string | undefined {
    const [today, setToday] = React.useState<string>()
    React.useEffect(() => {
        let timer: number
        const tick = () => {
            const now = new Date()
            setToday(formatDate(now))
            const midnight = new Date(now)
            midnight.setHours(24, 0, 1, 0)
            timer = window.setTimeout(tick, midnight.getTime() - now.getTime())
        }
        tick()
        return () => window.clearTimeout(timer)
    }, [])
    return today
}

function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    })
}

// The five ranges get equal slices of the arc (as in the app), so a
// score is placed by how far it sits inside its own range. 300 is at
// 180° (left end), 850 at 0° (right end).
function angleOf(score: number) {
    const i = rangeIndex(score)
    const to = RANGES[i + 1]?.from ?? MAX
    const within = (score - RANGES[i].from) / (to - RANGES[i].from)
    return 180 - (i + within) * SEG_DEG
}

function rangeIndex(score: number) {
    let i = 0
    while (i < RANGES.length - 1 && score >= RANGES[i + 1].from) i++
    return i
}

function polar(deg: number, radius = R) {
    const rad = (deg * Math.PI) / 180
    return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) }
}

// A filled block of the arc between two angles (larger to smaller,
// clockwise on screen), so its outline runs round all four sides.
function sector(fromDeg: number, toDeg: number) {
    const outer = R + STROKE / 2
    const inner = R - STROKE / 2
    const a = polar(fromDeg, outer)
    const b = polar(toDeg, outer)
    const c = polar(toDeg, inner)
    const d = polar(fromDeg, inner)
    return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`
}

CreditScoreGauge.defaultProps = {
    score: 742,
    trend: "up" as "up" | "down",
    change: 1,
}

addPropertyControls(CreditScoreGauge, {
    score: {
        type: ControlType.Number,
        title: "Score",
        min: MIN,
        max: MAX,
        step: 1,
        displayStepper: true,
    },
    trend: {
        type: ControlType.Enum,
        title: "Change",
        options: ["up", "down"],
        optionTitles: ["Up", "Down"],
        displaySegmentedControl: true,
    },
    change: {
        type: ControlType.Number,
        title: "Amount",
        min: 0,
        max: 550,
        step: 1,
        displayStepper: true,
    },
})
