import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"

// The whole ATM page (1080×1920): the designer's ATM artwork, the screen (a frame connected
// from the canvas, holding the wing background, tap icon and "Tap anywhere to begin"), the
// lights on the machine while it waits, and the transition that plays when the page is
// tapped anywhere. The ripple and zoom reveal Next Page Look (a frame connected from the
// canvas that looks like the next page; the Next Page Color when none is connected), and when
// the transition ends Framer switches to Next Page without reloading, so nothing flashes.
//
// Transitions (Transition property; A + B + E is the chosen one, the rest are kept to swap):
//   A      egg-yolk ripple floods the page from the tap point
//   B      the ATM slides so the screen is centred, zooms in, the screen opens out
//   A + B  A's ripple from the middle of the page while the ATM centres and zooms in
//   E      the card goes into the slot, the card light blinks, "Reading your card", fade
//   E + B  E, then B
//   A + B + E  E, then A + B
// Everything is drawn in the 1080×1920 artwork's own pixels and scaled to the frame.

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown = (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

const W = 1080
const H = 1920
const SCREEN = { x: 186, y: 728, w: 441, h: 365 } // the screen in the ATM artwork
const SLOT_Y = 921 // the card disappears above this line (middle of the card slot's opening)
const SLOT_X = 888 // centre of the card slot
const CARD_W = 120 // the card, upright: short edge first
const CARD_H = 190
const CARD_TILT = 60 // degrees tipped back
const PERSPECTIVE = 415 // short, so the card's far edge narrows like the white card on the machine
const CARD_SECONDS = 2.5 // pace of the card's rise, slide-in and light blinks (scales them all)
const READING_SECONDS = 0.5 // how long "Reading your card" shows; the card step ends after it
const ABE_RIPPLE_SECONDS = 1.2 // A + B + E's ripple and zoom (A + B alone takes 1.6 s)
const Z = W / SCREEN.w // zoom at which the screen fills the page width
const STRIPS = [
    { x: 803, y: 700, w: 169, h: 6, delay: 3 }, // RECEIPT
    { x: 804, y: 853, w: 169, h: 5, delay: 0 }, // CARD
    { x: 285, y: 1168, w: 213, h: 7, delay: 1.5 }, // CASH
]
// The hood's lit panel under the banner (a trapezoid, narrower at the bottom) and its lower edge.
const HOOD = { top: 410, bottom: 625, topL: 29, topR: 1053, botL: 62, botR: 1019 }
const KEYPAD = { top: 1331, bottom: 1455, topL: 322, topR: 665, botL: 287, botR: 700 } // the keypad's plate

type Transition = "A" | "B" | "AB" | "E" | "EB" | "ABE"

interface Image {
    src?: string
}

interface Props {
    atmImage?: Image
    cardImage?: Image
    screen?: React.ReactNode
    nextLook?: React.ReactNode
    transition: Transition
    nextPage: string
    nextColor: string
    rippleColor: string
    ringColor: string
    slotLights: boolean
    cardSlotFlash: boolean
    screenGlow: boolean
    glare: boolean
    hoodLight: boolean
    sounds: boolean
    beepVolume: number
    slotColor: string
    glowColor: string
    hoodColor: string
    readingText: string
    readingFont: React.CSSProperties
    readingColor: string
    readingBackground: string
    style?: React.CSSProperties
}

// ---- sounds ----
// One ATM keypad beep, made by the browser (Web Audio): no sound files, no delay. Modelled on
// a reference keypad beep: a clean, pure tone (sine) around 800 Hz, about 60 ms long, switched
// on and off sharply. Browsers only allow sound after the first tap on a page, so the first
// tap also switches sound on. Nothing plays on Framer's canvas.
const BEEP_HZ = 800
const BEEP_MS = 60

let audioCtx: AudioContext | null = null
function playBeep(volume: number) {
    if (typeof window === "undefined" || RenderTarget.current() === RenderTarget.canvas) return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    audioCtx ??= new AC()
    const ac = audioCtx
    if (ac.state === "suspended") void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = "sine"
    osc.frequency.value = BEEP_HZ
    const t = ac.currentTime + 0.005
    const end = t + BEEP_MS / 1000
    // a few milliseconds of fade at each edge: sharp like a beep, but no click
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.004)
    gain.gain.setValueAtTime(volume, end - 0.006)
    gain.gain.linearRampToValueAtTime(0, end)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(end + 0.01)
}

// ---- timing helpers ----
// cubic-bezier(x1, y1, x2, y2) as a function of 0..1
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const at = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t
    return (x: number) => {
        let lo = 0
        let hi = 1
        for (let i = 0; i < 22; i++) {
            const mid = (lo + hi) / 2
            if (at(mid, x1, x2) < x) lo = mid
            else hi = mid
        }
        return at((lo + hi) / 2, y1, y2)
    }
}
const OUT = bezier(0.22, 1, 0.36, 1)
const INOUT = bezier(0.65, 0, 0.35, 1)
const IN = bezier(0.5, 0, 0.75, 0)
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
// Progress through [a, b] at time t, eased; exactly 0 before and 1 after.
const seg = (t: number, a: number, b: number, ease = (x: number) => x) => {
    const u = clamp((t - a) / (b - a))
    return u === 0 || u === 1 ? u : ease(u)
}

type Rect = { x: number; y: number; w: number; h: number }
const PAGE: Rect = { x: 0, y: 0, w: W, h: H }
const farthest = (x: number, y: number, r: Rect) =>
    Math.max(
        Math.hypot(r.x - x, r.y - y),
        Math.hypot(r.x + r.w - x, r.y - y),
        Math.hypot(r.x - x, r.y + r.h - y),
        Math.hypot(r.x + r.w - x, r.y + r.h - y)
    )
// A rectangle as a clip shape; open = 0 is rect r, 1 the whole page. (A polygon, since
// inset() is dropped once the zoomed screen runs past the page edges.)
const rectClip = (r: Rect, open = 0) => {
    const x0 = lerp(r.x, 0, open)
    const y0 = lerp(r.y, 0, open)
    const x1 = lerp(r.x + r.w, W, open)
    const y1 = lerp(r.y + r.h, H, open)
    return `polygon(${x0}px ${y0}px, ${x1}px ${y0}px, ${x1}px ${y1}px, ${x0}px ${y1}px)`
}
// c = 0..1 slides the ATM so the screen sits in the middle of the page, then
// zp = 0..1 zooms straight in on the middle of the page.
const zoomAt = (c: number, zp: number) => {
    const z = lerp(1, Z, zp)
    const cx = SCREEN.x + SCREEN.w / 2
    const cy = SCREEN.y + SCREEN.h / 2
    return { z, tx: W / 2 + z * (c * (W / 2 - cx) - W / 2), ty: H / 2 + z * (c * (H / 2 - cy) - H / 2) }
}
const screenRect = ({ z, tx, ty }: { z: number; tx: number; ty: number }): Rect => ({
    x: SCREEN.x * z + tx,
    y: SCREEN.y * z + ty,
    w: SCREEN.w * z,
    h: SCREEN.h * z,
})

export default function ATMAttract(props: Props) {
    const { transition, nextPage, nextColor, rippleColor, ringColor, slotColor, glowColor, hoodColor } = props
    const reduceMotion = useReducedMotion()
    const uid = "atm" + React.useId().replace(/[^a-zA-Z0-9]/g, "")

    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const atmRef = React.useRef<HTMLDivElement | null>(null)
    const nextRef = React.useRef<HTMLDivElement | null>(null)
    const fxRef = React.useRef<SVGSVGElement | null>(null)
    const cardRef = React.useRef<HTMLDivElement | null>(null)
    const readingRef = React.useRef<HTMLDivElement | null>(null)
    const cardStripRef = React.useRef<HTMLDivElement | null>(null)
    const busy = React.useRef(false)
    // The next page's look is only rendered while a transition runs; hiding it with CSS isn't
    // enough, since a frame connected from the canvas can set its own visibility.
    const [revealing, setRevealing] = React.useState(false)
    const alive = React.useRef(true)

    // Fit the 1080×1920 artwork to the frame.
    const [k, setK] = React.useState(1)
    React.useEffect(() => {
        alive.current = true
        const el = rootRef.current
        if (!el) return
        const fit = () => setK(Math.min(el.clientWidth / W, el.clientHeight / H) || 1)
        fit()
        const ro = new ResizeObserver(fit)
        ro.observe(el)
        return () => {
            alive.current = false
            ro.disconnect()
        }
    }, [])

    // Runs fn(t), t in seconds, every frame until `total`; stops if the page goes away.
    const play = (total: number, fn: (t: number) => void) =>
        new Promise<void>((done) => {
            const start = performance.now()
            const tick = (now: number) => {
                if (!alive.current) return done()
                const t = (now - start) / 1000
                fn(Math.min(t, total))
                if (t < total) requestAnimationFrame(tick)
                else done()
            }
            requestAnimationFrame(tick)
        })

    const NS = "http://www.w3.org/2000/svg"
    const ring = (color: string, width: number) => {
        const c = document.createElementNS(NS, "circle")
        c.style.fill = "none"
        c.style.stroke = color
        c.style.strokeWidth = String(width)
        fxRef.current?.appendChild(c)
        return c
    }
    const place = (c: SVGCircleElement, x: number, y: number, r: number, o: number) => {
        c.setAttribute("cx", String(x))
        c.setAttribute("cy", String(y))
        c.setAttribute("r", String(Math.max(0, r)))
        c.setAttribute("opacity", String(o))
    }
    const setZoom = (zm: { z: number; tx: number; ty: number }) => {
        if (atmRef.current) atmRef.current.style.transform = `translate(${zm.tx}px, ${zm.ty}px) scale(${zm.z})`
    }
    const showNext = () => {
        setRevealing(true)
        if (nextRef.current) nextRef.current.style.display = "block"
    }
    const nextStyle = () => nextRef.current!.style

    // ---- the transitions ----
    const rippleFlood = async (x: number, y: number) => {
        const R = farthest(x, y, PAGE) + 40
        const r1 = ring(rippleColor, 26)
        const r2 = ring(ringColor, 10)
        showNext()
        await play(1.0, (t) => {
            const r = seg(t, 0, 1.0, INOUT) * R
            nextStyle().clipPath = `circle(${r}px at ${x}px ${y}px)`
            place(r1, x, y, r + 10, 1 - seg(t, 0.75, 1.0))
            place(r2, x, y, r * 0.86, 0.8 * (1 - seg(t, 0.6, 0.95)))
        })
    }

    const zoomIn = async () => {
        showNext()
        await play(1.6, (t) => {
            const zm = zoomAt(seg(t, 0, 0.5, INOUT), seg(t, 0.5, 1.2, INOUT))
            setZoom(zm)
            nextStyle().opacity = String(seg(t, 0.85, 1.15))
            nextStyle().clipPath = rectClip(screenRect(zm), seg(t, 1.05, 1.6, INOUT))
        })
    }

    // A's ripple from the middle of the page, slowed so the ATM can be seen centring and
    // zooming in behind it before the ripple covers the page.
    const rippleZoom = async (seconds = 1.6) => {
        const [x, y] = [W / 2, H / 2]
        const R = farthest(x, y, PAGE) + 40
        const r1 = ring(rippleColor, 26)
        const r2 = ring(ringColor, 10)
        const at = (share: number) => share * seconds // times below are shares of the whole ripple
        showNext()
        await play(seconds, (t) => {
            setZoom(zoomAt(seg(t, 0, at(0.375), INOUT), seg(t, at(0.25), at(1), INOUT)))
            const r = seg(t, 0, at(1), INOUT) * R
            nextStyle().clipPath = `circle(${r}px at ${x}px ${y}px)`
            place(r1, x, y, r + 10, 1 - seg(t, at(0.78), at(1)))
            place(r2, x, y, r * 0.86, 0.8 * (1 - seg(t, at(0.625), at(0.94))))
        })
    }

    // The card rises from below the slot, upright and tipped back, slides in along its own
    // plane, the card light blinks three times and the screen reads the card.
    const cardIn = async () => {
        const card = cardRef.current
        const strip = cardStripRef.current
        const reading = readingRef.current
        if (!card) return
        const from = { y: 2400, s: 1.6 }
        const rest = 952 // the card's top edge, resting on the slot's ramp
        // Times below are written for CARD_SECONDS = 3.1 and scaled to it.
        const at = (sec: number) => (sec * CARD_SECONDS) / 3.1
        const readStart = at(1.7)
        let cardBeep = false
        card.style.opacity = "1"
        await play(Math.max(at(2.2), readStart + READING_SECONDS), (t) => {
            const a = seg(t, 0, at(0.9), OUT)
            if (t >= at(1.1) && !cardBeep) {
                cardBeep = true
                beep() // the card goes into the slot
            }
            const push = seg(t, at(1.1), at(1.75), IN) * 265
            const y = lerp(from.y, rest, a)
            const s = lerp(from.s, 1, a)
            card.style.transform = `translate(${SLOT_X - CARD_W / 2}px, ${y}px) scale(${s}) perspective(${PERSPECTIVE}px) rotateX(${CARD_TILT}deg) translateY(${-push}px)`
            card.style.filter = `drop-shadow(0 ${lerp(26, 6, a)}px ${lerp(30, 10, a)}px rgb(0 0 0 / .35)) brightness(${1 - seg(t, at(1.1), at(1.65)) * 0.45})`
            const b = seg(t, at(1.6), at(2.2))
            const blinking = b > 0 && b < 1
            if (strip) {
                strip.style.animation = blinking ? "none" : ""
                strip.style.opacity = blinking ? (Math.floor(b * 6) % 2 === 0 ? "1" : "0.1") : ""
            }
            if (reading) reading.style.opacity = String(seg(t, readStart, readStart + Math.min(0.2, READING_SECONDS / 2)))
        })
        card.style.opacity = "0"
    }

    const fadeIn = async () => {
        showNext()
        nextStyle().opacity = "0"
        await play(0.45, (t) => {
            nextStyle().opacity = String(seg(t, 0, 0.45, INOUT))
        })
    }

    const beep = () => {
        if (props.sounds && props.beepVolume > 0) playBeep(props.beepVolume)
    }

    const run = async (x: number, y: number) => {
        if (busy.current) return
        busy.current = true
        // With the card (E, E + B, A + B + E): one beep as the card goes in, another as the
        // ripple / zoom / fade ends and the next page takes over. Without the card, one beep
        // acknowledges the tap.
        const withCard = !reduceMotion && (transition === "E" || transition === "EB" || transition === "ABE")
        if (!withCard) beep()
        if (reduceMotion) await fadeIn()
        else if (transition === "A") await rippleFlood(x, y)
        else if (transition === "B") await zoomIn()
        else if (transition === "AB") await rippleZoom()
        else if (transition === "E") {
            await cardIn()
            await fadeIn()
            beep()
        } else if (transition === "EB") {
            await cardIn()
            await zoomIn()
            beep()
        } else {
            await cardIn()
            await rippleZoom(ABE_RIPPLE_SECONDS)
            beep()
        }
        if (!alive.current) return
        // The page stays covered in the next page's look until Framer has switched to it.
        nextStyle().clipPath = ""
        nextStyle().opacity = "1"
        fxRef.current?.replaceChildren()
        if (nextPage) go(nextPage)
        else {
            // no Next Page set (e.g. while trying it out in Preview): show the ATM again
            await play(1, () => {})
            reset()
        }
    }

    const reset = () => {
        nextStyle().display = "none"
        setRevealing(false)
        nextStyle().clipPath = ""
        nextStyle().opacity = ""
        if (atmRef.current) atmRef.current.style.transform = ""
        if (readingRef.current) readingRef.current.style.opacity = "0"
        busy.current = false
    }

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return // right/middle clicks aren't taps
        const r =rootRef.current!.getBoundingClientRect()
        // the artwork is centred in the frame at scale k
        const left = r.left + (r.width - W * k) / 2
        const top = r.top + (r.height - H * k) / 2
        run((e.clientX - left) / k, (e.clientY - top) / k)
    }

    // Framer's own page switch (no reload, so no blank flash); a plain page load if this
    // Framer version has no router to ask.
    const router = useRouter() as { navigate?: (id: string, hash?: string) => void; routes?: Record<string, { path?: string }> } | undefined
    const go = (path: string) => {
        const routes = router?.routes ?? {}
        const id = Object.keys(routes).find((key) => routes[key]?.path === path)
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }

    const first = (node: React.ReactNode) => (Array.isArray(node) ? node[0] : node)
    // A frame connected from the canvas, stretched to fill its slot.
    const fill = (node: React.ReactNode) => {
        const el = first(node)
        return React.isValidElement(el)
            ? React.cloneElement(el as React.ReactElement<{ style?: React.CSSProperties }>, {
                  style: { ...(el.props as { style?: React.CSSProperties }).style, position: "absolute", inset: 0, width: "100%", height: "100%" },
              })
            : null
    }
    const screenEl = fill(props.screen)
    const c = (name: string) => `${uid}-${name}`
    const on = (flag: boolean, name: string) => (flag ? ` ${c(name)}` : "")

    return (
        <div
            ref={(el) => {
                rootRef.current = el
            }}
            onPointerDown={onPointerDown}
            className={`${c("root")}${on(props.slotLights, "strips")}${on(props.cardSlotFlash, "chev")}${on(
                props.screenGlow,
                "spill"
            )}${on(props.glare, "glare")}${on(props.hoodLight, "hood")}`}
            style={{ ...props.style, position: "relative", width: "100%", height: "100%", overflow: "hidden", cursor: "pointer", background: "#9d9d9d" }}
        >
            <style>{css(uid, slotColor, glowColor, hoodColor)}</style>
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: W,
                    height: H,
                    transform: `translate(-50%, -50%) scale(${k})`,
                    overflow: "hidden",
                }}
            >
                <div
                    ref={(el) => {
                        atmRef.current = el
                    }}
                    style={{ position: "absolute", inset: 0, transformOrigin: "0 0" }}
                >
                    {props.atmImage?.src && (
                        <img src={props.atmImage.src} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: W, height: H, display: "block" }} />
                    )}
                    <div className={`${c("abs")} ${c("hoodShadeEl")}`} />
                    <div className={`${c("abs")} ${c("hoodEl")}`}>
                        <i />
                    </div>
                    <div className={`${c("abs")} ${c("hoodSpillEl")}`}>
                        <i />
                    </div>
                    <div className={`${c("abs")} ${c("hoodKeysEl")}`}>
                        <i />
                    </div>
                    <div className={`${c("abs")} ${c("screen")} ${c("spillEl")}`} />
                    <div className={`${c("abs")} ${c("screen")}`} style={{ overflow: "hidden" }}>
                        {screenEl ?? (
                            <div style={{ position: "absolute", inset: 0, background: "#002c44", color: "#fff", display: "grid", placeContent: "center", textAlign: "center", font: "500 22px system-ui", padding: 24 }}>
                                Connect the screen frame (Screen property)
                            </div>
                        )}
                    </div>
                    <div className={`${c("abs")} ${c("screen")} ${c("glareEl")}`} />
                    <div
                        ref={(el) => {
                            readingRef.current = el
                        }}
                        className={`${c("abs")} ${c("screen")}`}
                        style={{ opacity: 0, background: props.readingBackground, display: "grid", placeContent: "center", gap: 18, textAlign: "center", color: props.readingColor }}
                    >
                        <span style={props.readingFont}>{props.readingText}</span>
                        <div className={c("dots")}>
                            <i />
                            <i />
                            <i />
                        </div>
                    </div>
                    {STRIPS.map((s, i) => (
                        <div
                            key={i}
                            ref={
                                s.delay === 0
                                    ? (el) => {
                                          cardStripRef.current = el
                                      }
                                    : undefined
                            }
                            className={`${c("abs")} ${c("strip")}`}
                            style={{ left: s.x, top: s.y, width: s.w, height: s.h, animationDelay: `${s.delay}s` }}
                        />
                    ))}
                    <svg className={`${c("abs")} ${c("chevEl")}`} viewBox="790 905 196 120" style={{ left: 790, top: 905, width: 196, height: 120 }}>
                        <rect x={796} y={913} width={184} height={15} rx={2} style={{ fill: slotColor, opacity: 0.35 }} />
                        <polyline points="858,966 884,951 911,966" />
                        <polyline points="858,975 884,960 911,975" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, clipPath: `inset(${SLOT_Y}px 0 0 0)`, pointerEvents: "none" }}>
                        <div
                            ref={(el) => {
                                cardRef.current = el
                            }}
                            style={{ position: "absolute", left: 0, top: 0, width: CARD_W, height: CARD_H, transformOrigin: "50% 0", opacity: 0 }}
                        >
                            {props.cardImage?.src && (
                                // The card art is landscape; a quarter turn stands it upright, logo end first.
                                <img
                                    src={props.cardImage.src}
                                    alt=""
                                    draggable={false}
                                    style={{ position: "absolute", left: "50%", top: "50%", width: CARD_H, height: CARD_W, transform: "translate(-50%, -50%) rotate(90deg)" }}
                                />
                            )}
                        </div>
                    </div>
                </div>
                <div
                    ref={(el) => {
                        nextRef.current = el
                    }}
                    style={{ position: "absolute", inset: 0, background: nextColor, display: "none", overflow: "hidden" }}
                >
                    {revealing && fill(props.nextLook)}
                </div>
                <svg
                    ref={(el) => {
                        fxRef.current = el
                    }}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ position: "absolute", inset: 0, width: W, height: H, pointerEvents: "none", overflow: "visible" }}
                />
            </div>
        </div>
    )
}

// The waiting lights. Each runs on its own CSS loop and is switched on by a class on the root.
function css(uid: string, slot: string, glow: string, hood: string) {
    const c = (name: string) => `.${uid}-${name}`
    const k = (name: string) => `${uid}-${name}`
    const mix = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
    // The band of the hood panel from y0 to y1 (px below its top edge), pulled in by d px on every
    // side, as a clip shape for an element whose top is at y0. Past the bottom edge the band
    // carries on along the panel's slanted sides, so the light below keeps its perspective.
    const hh = HOOD.bottom - HOOD.top
    const spillFade = `linear-gradient(90deg, transparent ${HOOD.botL}px, #000 ${HOOD.botL + 90}px, #000 ${HOOD.botR - 90}px, transparent ${HOOD.botR}px)`
    const KEYS_PAD = 60 // room around the keypad for its glow's blur
    const hoodShape = (d: number, y0: number, y1: number) => {
        const l = (y: number) => HOOD.topL + ((HOOD.botL - HOOD.topL) * y) / hh + d
        const r = (y: number) => HOOD.topR + ((HOOD.botR - HOOD.topR) * y) / hh - d
        const [a, b] = [y0 + d, y1 - d]
        return `polygon(${l(a)}px ${a - y0}px, ${r(a)}px ${a - y0}px, ${r(b)}px ${b - y0}px, ${l(b)}px ${b - y0}px)`
    }
    return `
${c("abs")} { position: absolute; pointer-events: none }
${c("screen")} { left: ${SCREEN.x}px; top: ${SCREEN.y}px; width: ${SCREEN.w}px; height: ${SCREEN.h}px }

${c("spillEl")} { opacity: 0; mix-blend-mode: screen;
  box-shadow: 0 0 20px 10px ${glow}, 0 0 70px 34px ${mix(glow, 95)}, 0 0 160px 80px ${mix(glow, 75)}, 0 0 300px 130px ${mix(glow, 45)} }
${c("spill")} ${c("spillEl")} { animation: ${k("spill")} 6s ease-in-out infinite }
@keyframes ${k("spill")} { 0%, 100% { opacity: .08 } 50% { opacity: 1 } }

${c("glareEl")} { overflow: hidden; opacity: 0 }
${c("glareEl")}::before { content: ""; position: absolute; top: -40%; bottom: -40%; width: 46%; left: 0;
  background: linear-gradient(100deg, transparent, rgb(255 255 255 / .05) 30%, rgb(255 255 255 / .17) 50%, rgb(255 255 255 / .05) 70%, transparent);
  transform: translateX(-130%) rotate(14deg) }
${c("glare")} ${c("glareEl")} { opacity: 1 }
${c("glare")} ${c("glareEl")}::before { animation: ${k("glare")} 6s cubic-bezier(.45,0,.25,1) infinite 1s }
@keyframes ${k("glare")} { 0% { transform: translateX(-130%) rotate(14deg) } 33%, 100% { transform: translateX(260%) rotate(14deg) } }

${c("hoodEl")} { left: 0; top: ${HOOD.top}px; width: ${W}px; height: ${hh}px; opacity: 0; mix-blend-mode: screen;
  clip-path: ${hoodShape(0, 0, hh)}; background: linear-gradient(${mix(hood, 45)}, ${mix(hood, 85)}) }
/* darkens the panel below the artwork's own grey as the light dims, so the dip reads clearly */
${c("hoodShadeEl")} { left: 0; top: ${HOOD.top}px; width: ${W}px; height: ${hh}px; opacity: 0; clip-path: ${hoodShape(0, 0, hh)}; background: rgb(0 0 0 / .38) }
${c("hood")} ${c("hoodShadeEl")} { animation: ${k("hoodShade")} 6s ease-in-out infinite }
@keyframes ${k("hoodShade")} { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
${c("hoodEl")} > i { position: absolute; inset: 0; filter: blur(22px) }
${c("hoodEl")} > i::before { content: ""; position: absolute; inset: 0; clip-path: ${hoodShape(36, 0, hh)}; background: ${mix(hood, 70)} }
${c("hoodSpillEl")} { left: 0; top: ${HOOD.bottom - 3}px; width: ${W}px; height: 110px; opacity: 0; mix-blend-mode: screen }
${c("hoodSpillEl")}::before { content: ""; position: absolute; top: 0; height: 3px; left: ${HOOD.botL}px; width: ${HOOD.botR - HOOD.botL}px; background: ${hood} }
${c("hoodSpillEl")} > i { position: absolute; inset: 0; filter: blur(28px); clip-path: inset(3px -200px -200px -200px);
  -webkit-mask-image: ${spillFade}; mask-image: ${spillFade} } /* none of it reaches the side walls past the hood's corners */
${c("hoodSpillEl")} > i::before { content: ""; position: absolute; inset: 0; clip-path: ${hoodShape(0, hh - 3, hh + 107)};
  background: linear-gradient(${mix(hood, 60)}, transparent) }
${c("hoodKeysEl")} { left: 0; top: ${KEYPAD.top - KEYS_PAD}px; width: ${W}px; height: ${KEYPAD.bottom - KEYPAD.top + 2 * KEYS_PAD}px; opacity: 0; mix-blend-mode: screen }
${c("hoodKeysEl")} > i { position: absolute; inset: 0; filter: blur(40px); clip-path: inset(${KEYS_PAD - 9}px -200px -200px -200px) } /* stops at the shelf's back edge */
${c("hoodKeysEl")} > i::before { content: ""; position: absolute; inset: 0; background: linear-gradient(${mix(hood, 55)}, ${mix(hood, 12)});
  clip-path: polygon(${KEYPAD.topL - 120}px ${KEYS_PAD - 20}px, ${KEYPAD.topR + 120}px ${KEYS_PAD - 20}px, ${KEYPAD.botR + 140}px ${KEYPAD.bottom - KEYPAD.top + KEYS_PAD + 10}px, ${KEYPAD.botL - 140}px ${KEYPAD.bottom - KEYPAD.top + KEYS_PAD + 10}px) }
${c("hood")} ${c("hoodEl")}, ${c("hood")} ${c("hoodSpillEl")}, ${c("hood")} ${c("hoodKeysEl")} { opacity: .85; animation: ${k("hood")} 6s ease-in-out infinite }
@keyframes ${k("hood")} { 0%, 100% { opacity: 0 } 50% { opacity: 1 } }

${c("strip")} { opacity: 0; background: ${slot}; border-radius: 3px; box-shadow: 0 0 8px 2px ${mix(slot, 80)}, 0 0 22px 6px ${mix(slot, 35)} }
${c("strips")} ${c("strip")} { animation: ${k("strip")} 4.5s ease-in-out infinite }
@keyframes ${k("strip")} { 0%, 100% { opacity: 0 } 18% { opacity: 1 } 40% { opacity: 0 } }

${c("chevEl")} { opacity: 0 }
${c("chevEl")} polyline { fill: none; stroke: ${slot}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round }
${c("chev")} ${c("chevEl")} { animation: ${k("chev")} 3s steps(1, end) infinite; filter: drop-shadow(0 0 6px ${mix(slot, 90)}) }
@keyframes ${k("chev")} { 0% { opacity: 1 } 15% { opacity: .15 } 30% { opacity: 1 } 45%, 100% { opacity: .15 } }

${c("dots")} { display: flex; gap: 12px; justify-content: center }
${c("dots")} i { width: 12px; height: 12px; border-radius: 50%; background: #3bbfc0; animation: ${k("dot")} 1s ease-in-out infinite }
${c("dots")} i:nth-child(2) { animation-delay: .15s }
${c("dots")} i:nth-child(3) { animation-delay: .3s }
@keyframes ${k("dot")} { 0%, 100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-6px) } }

@media (prefers-reduced-motion: reduce) {
  ${c("root")} *, ${c("root")} *::before { animation: none !important }
}
`
}

ATMAttract.defaultProps = {
    transition: "ABE" as Transition,
    nextPage: "",
    nextColor: "#ffffff",
    rippleColor: "#ffcc40",
    ringColor: "#3bbfc0",
    slotLights: true,
    cardSlotFlash: true,
    screenGlow: true,
    glare: true,
    hoodLight: true,
    sounds: true,
    beepVolume: 0.5,
    slotColor: "#7cf25e",
    glowColor: "#0079a9",
    hoodColor: "#ffffff",
    readingText: "Reading your card",
    readingFont: { fontFamily: "Inter", fontSize: 32, fontWeight: 600 },
    readingColor: "#ffffff",
    readingBackground: "#002c44",
}

addPropertyControls(ATMAttract, {
    atmImage: { type: ControlType.ResponsiveImage, title: "ATM Image" },
    screen: { type: ControlType.ComponentInstance, title: "Screen" },
    cardImage: { type: ControlType.ResponsiveImage, title: "Card Image" },
    transition: {
        type: ControlType.Enum,
        title: "Transition",
        options: ["ABE", "AB", "A", "B", "E", "EB"],
        optionTitles: ["A + B + E: card, ripple, zoom", "A + B: ripple and zoom", "A: ripple", "B: zoom", "E: card, fade", "E + B: card, zoom"],
        defaultValue: "ABE",
    },
    nextPage: { type: ControlType.String, title: "Next Page", placeholder: "/atm/start", defaultValue: "" },
    nextLook: { type: ControlType.ComponentInstance, title: "Next Page Look" },
    nextColor: { type: ControlType.Color, title: "Next Page Color", defaultValue: "#ffffff" },
    rippleColor: { type: ControlType.Color, title: "Ripple", defaultValue: "#ffcc40" },
    ringColor: { type: ControlType.Color, title: "Inner Ring", defaultValue: "#3bbfc0" },
    slotLights: { type: ControlType.Boolean, title: "Slot Lights", defaultValue: true },
    cardSlotFlash: { type: ControlType.Boolean, title: "Card Slot Flash", defaultValue: true },
    screenGlow: { type: ControlType.Boolean, title: "Screen Glow", defaultValue: true },
    glare: { type: ControlType.Boolean, title: "Glass Glare", defaultValue: true },
    hoodLight: { type: ControlType.Boolean, title: "Hood Light", defaultValue: true },
    sounds: { type: ControlType.Boolean, title: "Sounds", defaultValue: true },
    beepVolume: {
        type: ControlType.Number,
        title: "Beep Volume",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5, // as loud as the reference's loudest beep; 1 is the browser's maximum
        hidden: (props: Partial<Props>) => !props.sounds,
    },
    slotColor: { type: ControlType.Color, title: "Slot Light", defaultValue: "#7cf25e" },
    glowColor: { type: ControlType.Color, title: "Glow", defaultValue: "#0079a9" },
    hoodColor: { type: ControlType.Color, title: "Hood Light Color", defaultValue: "#ffffff", hidden: (props: Partial<Props>) => !props.hoodLight },
    readingText: { type: ControlType.String, title: "Reading Text", defaultValue: "Reading your card" },
    readingFont: {
        type: ControlType.Font,
        title: "Reading Font",
        controls: "extended",
        defaultFontType: "sans-serif", // Inter; the control's default only takes size and variant
        defaultValue: { fontSize: 32, variant: "Semibold" },
    },
    readingColor: { type: ControlType.Color, title: "Reading Color", defaultValue: "#ffffff" },
    readingBackground: { type: ControlType.Color, title: "Reading Fill", defaultValue: "#002c44" },
})
