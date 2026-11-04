import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"

// ATM lesson Needs vs. Wants: a pile of pictures that rains in from above
// and can be grabbed and thrown around. Each picture is a round body in a
// small hand-rolled physics loop (gravity, walls, floor, bumping, spin),
// so no physics library is needed. On the Framer canvas the pile is drawn
// settled and nothing runs.
//
// Sorting: a picture someone has grabbed that is let go over a basket, or
// falls onto one (ATMNeedsWantsBasket's `data-nw-mouth` rect: the whole
// drawing, label and shell included, anywhere on the page) is sent
// to that basket with "nw-catch" if its kind matches, and leaves the pile.
// If not, the basket gets "nw-reject" and the picture is tossed back out.
// The opening rain is never sorted, so it falls past the baskets. Nor is a
// picture that flew up through a basket from below (it would have gone
// through the basket's bottom): it has to come down from above, after being
// dragged or thrown from up there.
//
// Each sorting answer pops up a card over that basket: right (Correct!,
// then what the picture is) or wrong (what most people would call it). The
// pile draws it so it sits above everything; only one shows at a time.
// Once every picture is in its basket, the last one lands, its card pops
// up, and a moment later the page goes to When Done (the lesson's
// completion page).
//
// Put it at the top of the page's layers, so pictures fall in front of the
// text and baskets. Only the pictures take taps; the rest passes through.

type Kind = "need" | "want"

interface Item {
    image?: { src: string; alt?: string }
    kind?: Kind
}

// ---- sounds ----
// The owner's sound files (ATM/sounds), served from this repo at one commit so they never change under the page.
// Web Audio, so each starts on the frame its animation needs. They're loaded when the lesson opens; one still
// loading is skipped, never played late. Every sound follows a tap, so the browser allows it. Silent on the canvas.
const SOUNDS =
    "https://cdn.jsdelivr.net/gh/reeyavyas/framer@aa7c8631ffeb9d7e2dc3e8d3b0456b222277d2c9/ATM/sounds/"
let audioCtx: AudioContext | null = null
const buffers: Record<string, AudioBuffer | null | undefined> = {} // null: loading or failed
function loadSounds(...names: string[]) {
    if (
        typeof window === "undefined" ||
        RenderTarget.current() === RenderTarget.canvas
    )
        return
    const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
    if (!AC) return
    const ac = (audioCtx ??= new AC())
    for (const name of names)
        if (buffers[name] === undefined) {
            buffers[name] = null
            fetch(SOUNDS + name)
                .then((r) => r.arrayBuffer())
                .then((b) => ac.decodeAudioData(b))
                .then((b) => (buffers[name] = b))
                .catch(() => (buffers[name] = undefined))
        }
}
// Plays `name` `delay` s from now, from `offset` s into the file; returns a stop that fades it out over `fade` s
function playSound(
    name: string,
    volume: number,
    {
        delay = 0,
        offset = 0,
        fadeIn = 0.005,
        loop,
        length,
    }: {
        delay?: number
        offset?: number
        fadeIn?: number
        loop?: [number, number]
        length?: number // play only this many seconds of the file, fading out over its last 0.03 s
    } = {}
) {
    const ac = audioCtx
    const buffer = buffers[name]
    if (!ac || !buffer || volume <= 0) return (_fade?: number) => {}
    if (ac.state === "suspended") void ac.resume()
    const src = ac.createBufferSource()
    src.buffer = buffer
    if (loop) {
        src.loop = true
        src.loopStart = loop[0]
        src.loopEnd = loop[1]
    }
    const gain = ac.createGain()
    const t = ac.currentTime + delay
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + fadeIn)
    if (length) {
        gain.gain.setValueAtTime(volume, t + length - 0.03)
        gain.gain.linearRampToValueAtTime(0, t + length)
    }
    src.connect(gain).connect(ac.destination)
    src.start(t, offset, length)
    let stopped = false // only the first stop counts; a second would bring the volume back
    return (fade = 0.2) => {
        if (stopped) return
        stopped = true
        const now = Math.max(ac.currentTime, t + fadeIn)
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(volume, now)
        gain.gain.linearRampToValueAtTime(0, now + fade)
        src.stop(now + fade + 0.02)
    }
}

interface Props {
    items: Item[]
    itemSize: number
    gravity: number
    bounce: number
    dropDelay: number
    topLimit: number
    correct: string
    rightNeed: string
    rightWant: string
    wantInNeeds: string
    needInWants: string
    doneLink: string
    sounds: boolean
    volume: number
}

// The card shown for the latest sorting answer, over the basket at (x, y).
interface Card {
    n: number // counts up, so the same answer twice still replays
    ok: boolean
    kind: Kind // the picture's
    x: number
    y: number
}

interface Body {
    x: number
    y: number
    vx: number
    vy: number
    angle: number
    spin: number
    spawnAt: number
    live: boolean
    touching: boolean
    grabbed: boolean // only pictures someone threw get sorted
    below: boolean // under the top limit, so it can't go back above it
    rose: Element | null // a basket it flew up through since it was grabbed
}

interface Mouth {
    el: Element
    kind: string
    left: number
    top: number
    right: number
    bottom: number
}

const STEP = 1 / 120
const SOLVER_PASSES = 4
const FRICTION = 0.9
const CARD_W = 500 // the wrong-answer line fits on two lines, 23 px to spare
const CARD_EDGE = 32 // least room between a card and the screen's edge
const CARD_MS = 3200 // pop in, hold long enough to read, fade
const DONE_MS = 1000 // last picture lands and its card pops up, then on
// A bounce for the hardest hit each frame (floor, wall or another picture), louder the harder it hits. Softer than
// THUMP_MIN px/s is settling, not landing, and stays quiet; thumps are at least THUMP_GAP ms apart, so the rain
// (a picture every 120 ms) gets one each and its bounce a softer one.
const THUMP_MIN = 200
const THUMP_FULL = 1800 // px/s for full volume (the rain lands at about 2,200)
const THUMP_GAP = 60

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)
const TEAL = "#059390"
const YOLK = "#ffcc40"
const YOLK_PALE = "#fff6d6" // so the yolk edge reads against the card

function spawnX(i: number, w: number, r: number) {
    // Golden-ratio spread so drops don't line up in columns.
    return r + ((i * 0.618034 + 0.3) % 1) * Math.max(0, w - 2 * r)
}

// Settled rows along the floor, used on the canvas and for reduced motion.
function restingSpot(i: number, w: number, h: number, r: number) {
    const perRow = Math.max(1, Math.floor(w / (2 * r)))
    const row = Math.floor(i / perRow)
    const col = i % perRow
    const shift = row % 2 ? r : 0
    return {
        x: Math.min(w - r, r + col * 2 * r + shift),
        y: h - r - row * r * 1.75,
    }
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 900
 */
export default function ATMTumbleWall(props: Props) {
    const { items, itemSize, gravity, bounce, dropDelay, topLimit } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const reduceMotion = useReducedMotion()
    const boxRef = React.useRef<HTMLDivElement>(null)
    const elRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const [box, setBox] = React.useState({ w: 0, h: 0 })
    // The live size, read every frame. Resizing (zooming the page, say) must
    // not restart the pile: that rained every picture in again, sorted ones
    // included.
    const sizeRef = React.useRef({ w: 0, h: 0 })
    const ready = box.w > 0 && box.h > 0
    const count = items.length
    const itemsRef = React.useRef(items)
    itemsRef.current = items
    const soundsRef = React.useRef(props)
    soundsRef.current = props
    const play = (name: string, level: number, offset = 0, length?: number) => {
        const p = soundsRef.current
        if (p.sounds) playSound(name, p.volume * level, { offset, length })
    }
    // Framer's own page switch (no reload, so no blank flash); a plain page
    // load if this Framer version has no router to ask.
    const router = useRouter() as
        | {
              navigate?: (id: string, hash?: string) => void
              routes?: Record<string, { path?: string }>
          }
        | undefined
    const goDone = () => {
        const routes = router?.routes ?? {}
        const find = (path: string) =>
            Object.keys(routes).find((k) => routes[k]?.path === path)
        // A When Done saved on the layer outlives page renames (Framer keeps
        // the old address), so a link to no page falls back to the default.
        let path = props.doneLink
        let id = path ? find(path) : undefined
        if (!id) {
            const fallback = ATMTumbleWall.defaultProps.doneLink
            const fallbackId = find(fallback)
            if (fallbackId || !path) {
                path = fallback
                id = fallbackId
            }
        }
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }
    const goDoneRef = React.useRef(goDone)
    goDoneRef.current = goDone
    const [card, setCard] = React.useState<Card | null>(null)
    const cardRef = React.useRef<HTMLDivElement>(null)

    React.useLayoutEffect(() => {
        const el = cardRef.current
        if (!card || !el) return
        const n = card.n
        const anim = el.animate(
            reduceMotion
                ? [
                      { opacity: 0 },
                      { opacity: 1, offset: 0.05 },
                      { opacity: 1, offset: 0.95 },
                      { opacity: 0 },
                  ]
                : [
                      {
                          opacity: 0,
                          transform: "translateY(24px) scale(0.85)",
                          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      },
                      { opacity: 1, transform: "none", offset: 0.13 },
                      {
                          opacity: 1,
                          transform: "none",
                          offset: 0.9,
                          easing: "ease-in",
                      },
                      {
                          opacity: 0,
                          transform: "translateY(-10px) scale(0.97)",
                      },
                  ],
            { duration: CARD_MS, fill: "both" }
        )
        anim.onfinish = () => setCard((c) => (c && c.n === n ? null : c))
        return () => anim.cancel()
    }, [card, reduceMotion])

    React.useEffect(() => {
        const el = boxRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            sizeRef.current = { w: el.clientWidth, h: el.clientHeight }
            setBox(sizeRef.current)
        })
        ro.observe(el)
        // Framer's own wrapper around the component would still catch taps
        // meant for the page underneath, so it lets them through too.
        // shortcut: assumes one wrapper div, check if Framer changes its markup
        const wrapper = el.parentElement
        const before = wrapper?.style.pointerEvents ?? ""
        if (wrapper) wrapper.style.pointerEvents = "none"
        return () => {
            ro.disconnect()
            if (wrapper) wrapper.style.pointerEvents = before
        }
    }, [])

    React.useEffect(() => {
        if (isCanvas || !ready) return
        let { w, h } = sizeRef.current
        const r = itemSize / 2
        // Pictures stay below this line once they've dropped under it or
        // been grabbed: no throwing them off the top, no dragging them over
        // the text. The rain starts above the frame, so it falls through.
        let top = (h * topLimit) / 100
        const bodies: Body[] = Array.from({ length: count }, (_, i) => {
            const rest = restingSpot(i, w, h, r)
            return reduceMotion
                ? {
                      ...rest,
                      vx: 0,
                      vy: 0,
                      angle: 0,
                      spin: 0,
                      spawnAt: 0,
                      live: true,
                      touching: false,
                      grabbed: false,
                      below: true,
                      rose: null,
                  }
                : {
                      x: spawnX(i, w, r),
                      y: -r - (i % 3) * r,
                      vx: 0,
                      vy: 0,
                      angle: 0,
                      spin: 0,
                      spawnAt: i * dropDelay,
                      live: false,
                      touching: false,
                      grabbed: false,
                      below: false,
                      rose: null,
                  }
        })

        // The picture under the finger: it follows the pointer and gets
        // the pointer's velocity, so letting go throws it.
        let held = -1
        // With reduced motion the pile starts settled and holds still
        // until someone grabs a picture.
        let awake = !reduceMotion
        // The opening rain lands right side up: nothing rolls until someone
        // first grabs a picture.
        let stirred = false
        let sorted = 0
        let doneTimer = 0
        let peak = 0 // the hardest hit since the last frame, px/s
        let lastThump = 0
        let grabDX = 0
        let grabDY = 0
        let lastPX = 0
        let lastPY = 0
        let lastPT = 0
        const toLocal = (e: PointerEvent) => {
            const rect = boxRef.current!.getBoundingClientRect()
            // Framer scales frames; map screen pixels back to layout pixels.
            const s = rect.width / w || 1
            return {
                x: (e.clientX - rect.left) / s,
                y: (e.clientY - rect.top) / s,
            }
        }
        const downs = elRefs.current.map((el, i) => {
            const onDown = (e: PointerEvent) => {
                const b = bodies[i]
                if (!b.live) return
                e.preventDefault()
                el!.setPointerCapture(e.pointerId)
                const p = toLocal(e)
                held = i
                awake = true
                stirred = true
                b.grabbed = true
                b.below = true
                b.rose = null
                grabDX = b.x - p.x
                grabDY = b.y - p.y
                lastPX = p.x
                lastPY = p.y
                lastPT = performance.now()
                b.vx = b.vy = 0
            }
            const onMove = (e: PointerEvent) => {
                if (held !== i) return
                const p = toLocal(e)
                const now = performance.now()
                const dt = Math.max(0.008, (now - lastPT) / 1000)
                const b = bodies[i]
                // Smoothed so one jittery sample doesn't fling it.
                b.vx = b.vx * 0.5 + ((p.x - lastPX) / dt) * 0.5
                b.vy = b.vy * 0.5 + ((p.y - lastPY) / dt) * 0.5
                b.x = Math.min(w - r, Math.max(r, p.x + grabDX))
                b.y = Math.min(h - r, Math.max(top + r, p.y + grabDY))
                lastPX = p.x
                lastPY = p.y
                lastPT = now
            }
            const onUp = () => {
                if (held !== i) return
                held = -1
                const b = bodies[i]
                // A finger resting still before release drops, not throws.
                if (performance.now() - lastPT > 80) b.vx = b.vy = 0
                // Let go over a basket: sorted there and then, however it moved.
                sort(b, i, true)
            }
            el?.addEventListener("pointerdown", onDown)
            el?.addEventListener("pointermove", onMove)
            el?.addEventListener("pointerup", onUp)
            el?.addEventListener("pointercancel", onUp)
            return () => {
                el?.removeEventListener("pointerdown", onDown)
                el?.removeEventListener("pointermove", onMove)
                el?.removeEventListener("pointerup", onUp)
                el?.removeEventListener("pointercancel", onUp)
            }
        })

        // Basket mouths in this frame's local pixels, found fresh each frame
        // so baskets can be anywhere and move.
        let mouths: Mouth[] = []
        const findMouths = () => {
            const box = boxRef.current!.getBoundingClientRect()
            const s = box.width / w || 1
            mouths = Array.from(
                document.querySelectorAll("[data-nw-mouth]"),
                (el) => {
                    const m = el.getBoundingClientRect()
                    return {
                        el,
                        kind: el.getAttribute("data-nw-mouth") || "",
                        left: (m.left - box.left) / s,
                        top: (m.top - box.top) / s,
                        right: (m.right - box.left) / s,
                        bottom: (m.bottom - box.top) / s,
                    }
                }
            )
        }
        const sort = (b: Body, i: number, dropped = false) => {
            // Rising past a basket means it went up through the basket, so
            // it can't drop into that one on the same flight: a light toss up
            // from the pile shouldn't land in whichever basket is above it.
            if (!dropped && b.vy < 0) {
                const under = mouths.find(
                    (m) => b.x > m.left && b.x < m.right && b.y > m.top
                )
                if (under) b.rose = under.el
            }
            const m = mouths.find(
                (m) =>
                    b.x > m.left &&
                    b.x < m.right &&
                    b.y > m.top &&
                    b.y < m.bottom
            )
            if (!m || (!dropped && (b.vy <= 0 || m.el === b.rose))) return
            const item = itemsRef.current[i] || {}
            const kind = item.kind || "need"
            const ok = kind === m.kind
            setCard((c) => ({
                n: (c?.n ?? 0) + 1,
                ok,
                kind,
                x: (m.left + m.right) / 2,
                y: m.top,
            }))
            // with the answer card's pop (correct's chime starts 0.05 s into its file)
            if (ok) play("correct.mp3", 1.2, 0.05)
            else play("incorrect.mp3", 0.6)
            if (ok) {
                b.live = false
                b.spawnAt = Infinity // never comes back
                sorted++
                if (sorted === count)
                    doneTimer = window.setTimeout(
                        () => goDoneRef.current(),
                        DONE_MS
                    )
                m.el.dispatchEvent(
                    new CustomEvent("nw-catch", {
                        detail: {
                            src: item.image?.src || "",
                            alt: item.image?.alt || "",
                        },
                    })
                )
            } else {
                // Tossed out, and it has to be grabbed again to be sorted,
                // so it can't land in the other basket by itself.
                b.grabbed = false
                b.vy = -1100
                b.vx = (b.x < (m.left + m.right) / 2 ? -1 : 1) * 320
                b.spin = b.vx
                m.el.dispatchEvent(new CustomEvent("nw-reject"))
            }
        }

        const g = gravity
        const step = (t: number) => {
            if (!awake) return
            for (const b of bodies) {
                if (!b.live && t >= b.spawnAt) b.live = true
            }
            bodies.forEach((b, i) => {
                if (b.live && b.grabbed && i !== held) sort(b, i)
            })
            for (let i = 0; i < bodies.length; i++) {
                const b = bodies[i]
                if (!b.live || i === held) continue
                b.vy += g * STEP
                b.x += b.vx * STEP
                b.y += b.vy * STEP
                b.angle += b.spin * STEP
                b.spin *= 0.995
                b.touching = false
            }
            for (let pass = 0; pass < SOLVER_PASSES; pass++) {
                for (let i = 0; i < bodies.length; i++) {
                    const a = bodies[i]
                    if (!a.live) continue
                    for (let j = i + 1; j < bodies.length; j++) {
                        const c = bodies[j]
                        if (!c.live) continue
                        peak = Math.max(
                            peak,
                            collide(a, c, i === held, j === held, r, bounce)
                        )
                    }
                }
                for (let i = 0; i < bodies.length; i++) {
                    if (bodies[i].live && i !== held)
                        peak = Math.max(
                            peak,
                            walls(bodies[i], w, h, top, r, bounce)
                        )
                }
            }
            // Anything touching the floor or another picture eases toward
            // rolling with its sideways speed, so the pile stops spinning
            // once it stops moving. In the air the spin carries on.
            for (const b of bodies) {
                // Below 20px/s it's contact jitter, not rolling.
                const roll = Math.abs(b.vx) < 20 ? 0 : (b.vx / r) * 57.3
                if (b.touching && stirred) b.spin += (roll - b.spin) * 0.2
            }
        }

        let raf = 0
        let start = 0
        let prev = 0
        let acc = 0
        const frame = (now: number) => {
            if (!start) start = prev = now
            // Capped so a backgrounded tab doesn't come back in one huge jump.
            acc += Math.min(0.05, (now - prev) / 1000)
            prev = now
            ;({ w, h } = sizeRef.current)
            top = (h * topLimit) / 100
            // Holds still while ATMInactivityOverlay's box is open.
            if ((window as any).__systemOverlayOpen) acc = 0
            findMouths()
            while (acc >= STEP) {
                step((now - start) / 1000)
                acc -= STEP
            }
            // the owner's ball bounce bounces six times; the physics makes the bounces, so only its first plays:
            // the hit at 0.065 s, faded out by 0.23 s, before the second at 0.245 (it's quieter than the others,
            // hence the level)
            if (peak >= THUMP_MIN && now - lastThump >= THUMP_GAP) {
                lastThump = now
                play(
                    "ball-bounce.mp3",
                    4.5 * Math.min(1, peak / THUMP_FULL),
                    0.06,
                    0.17
                )
            }
            peak = 0
            bodies.forEach((b, i) => {
                const el = elRefs.current[i]
                if (!el) return
                el.style.transform = `translate(${b.x - r}px, ${b.y - r}px) rotate(${b.angle}deg)`
                el.style.visibility = b.live ? "visible" : "hidden"
                el.style.zIndex = i === held ? "1" : ""
            })
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(doneTimer)
            downs.forEach((off) => off())
        }
        // Keyed on the count, not the array: Framer hands over a fresh array
        // on every render, which would restart the drop.
    }, [
        ready,
        isCanvas,
        reduceMotion,
        count,
        itemSize,
        gravity,
        bounce,
        dropDelay,
        topLimit,
    ])

    const r = itemSize / 2
    const accent = card?.ok ? TEAL : YOLK
    const fill = card?.ok ? "#ffffff" : YOLK_PALE
    // Kept on screen; the tail still points at the basket's middle.
    const cardLeft = card
        ? Math.min(
              Math.max(CARD_EDGE, card.x - CARD_W / 2),
              box.w - CARD_EDGE - CARD_W
          )
        : 0
    return (
        <div
            ref={boxRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                userSelect: "none",
                // Sits above the rest of the page so pictures fall in front
                // of it; taps pass through everywhere but the pictures.
                pointerEvents: "none",
            }}
        >
            {items.map((item, i) => {
                const rest = restingSpot(i, box.w || 1080, box.h || 900, r)
                return (
                    <div
                        key={i}
                        ref={(el) => {
                            elRefs.current[i] = el
                        }}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: itemSize,
                            height: itemSize,
                            cursor: "grab",
                            pointerEvents: "auto",
                            touchAction: "none",
                            // The canvas pose. Running pages place these every
                            // frame, so a re-render (a resize) mustn't move them.
                            transform: isCanvas
                                ? `translate(${rest.x - r}px, ${rest.y - r}px)`
                                : undefined,
                            visibility: isCanvas ? "visible" : "hidden",
                        }}
                    >
                        {item.image?.src ? (
                            <img
                                src={item.image.src}
                                alt={item.image.alt || ""}
                                draggable={false}
                                // cropped to the circle the physics uses, like the placeholder
                                style={{
                                    display: "block",
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                    pointerEvents: "none",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    background: "#D9D9D9",
                                }}
                            />
                        )}
                    </div>
                )
            })}
            {card && (
                <div
                    style={{
                        position: "absolute",
                        left: cardLeft,
                        // bottom edge (tail included) just above the basket
                        top: card.y - 36,
                        width: CARD_W,
                        transform: "translateY(-100%)",
                        pointerEvents: "none",
                    }}
                >
                    <div
                        key={card.n}
                        ref={cardRef}
                        role="status"
                        style={{
                            position: "relative",
                            boxSizing: "border-box",
                            // centres the capitals-to-baseline span, measured live in Area
                            padding: "30px 36px 28px",
                            borderRadius: 32,
                            border: `5px solid ${accent}`,
                            background: fill,
                            boxShadow: "0 8px 20px rgba(0, 44, 68, 0.1)",
                            transformOrigin: `${card.x - cardLeft}px 100%`,
                            textAlign: "center",
                            opacity: 0,
                        }}
                    >
                        {card.ok && (
                            <div
                                style={{
                                    fontFamily: `"Area Normal Black", sans-serif`,
                                    fontWeight: 900,
                                    fontSize: 42,
                                    lineHeight: 1.15,
                                    letterSpacing: "0.02em",
                                    color: "#11232d",
                                    textTransform: "uppercase",
                                    marginBottom: 18,
                                }}
                            >
                                {props.correct}
                            </div>
                        )}
                        <div
                            style={
                                {
                                    fontFamily: `"Area Normal Bold", sans-serif`,
                                    fontWeight: 700,
                                    fontSize: 36,
                                    lineHeight: 1.2,
                                    color: "#002c44",
                                    textWrap: "balance", // Framer's CSS types don't list it yet, hence the cast
                                } as React.CSSProperties
                            }
                        >
                            {card.ok
                                ? card.kind === "need"
                                    ? props.rightNeed
                                    : props.rightWant
                                : card.kind === "want"
                                  ? props.wantInNeeds
                                  : props.needInWants}
                        </div>
                        {/* the tail, pointing down at the basket */}
                        <div
                            style={{
                                position: "absolute",
                                left: card.x - cardLeft - 17,
                                bottom: -19,
                                width: 34,
                                height: 34,
                                background: fill,
                                borderRight: `5px solid ${accent}`,
                                borderBottom: `5px solid ${accent}`,
                                borderBottomRightRadius: 6,
                                transform: "rotate(45deg)",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// Pushes two overlapping pictures apart and trades their velocity along
// the line between them. A held picture acts as immovable.
function collide(
    a: Body,
    c: Body,
    aHeld: boolean,
    cHeld: boolean,
    r: number,
    e: number
): number {
    const dx = c.x - a.x
    const dy = c.y - a.y
    const d2 = dx * dx + dy * dy
    const min = 2 * r
    if (d2 >= min * min || (aHeld && cHeld)) return 0
    a.touching = c.touching = true
    const d = Math.sqrt(d2) || 0.01
    const nx = d2 ? dx / d : 0
    const ny = d2 ? dy / d : 1
    const overlap = min - d
    const wa = aHeld ? 0 : cHeld ? 1 : 0.5
    const wc = 1 - wa
    a.x -= nx * overlap * wa
    a.y -= ny * overlap * wa
    c.x += nx * overlap * wc
    c.y += ny * overlap * wc
    const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny
    if (vn >= 0) return 0
    const j = -(1 + e) * vn
    a.vx -= nx * j * wa
    a.vy -= ny * j * wa
    c.vx += nx * j * wc
    c.vy += ny * j * wc
    return -vn // how hard they hit, px/s
}

function walls(
    b: Body,
    w: number,
    h: number,
    top: number,
    r: number,
    e: number
): number {
    let hit = 0 // how hard it hit a wall, px/s
    if (!b.below) {
        if (b.y >= top + r) b.below = true
    } else if (b.y < top + r) {
        b.y = top + r
        if (b.vy < 0) {
            hit = -b.vy
            b.vy = b.vy * -e
        }
    }
    if (b.y > h - r) {
        b.y = h - r
        if (b.vy > 0) {
            hit = Math.max(hit, b.vy)
            b.vy = b.vy * -e
        }
        b.vx *= FRICTION
        b.touching = true
        if (Math.abs(b.vy) < 20) b.vy = 0
    }
    if (b.x < r) {
        b.x = r
        if (b.vx < 0) {
            hit = Math.max(hit, -b.vx)
            b.vx = b.vx * -e
        }
    } else if (b.x > w - r) {
        b.x = w - r
        if (b.vx > 0) {
            hit = Math.max(hit, b.vx)
            b.vx = b.vx * -e
        }
    }
    return hit
}

ATMTumbleWall.defaultProps = {
    items: Array.from({ length: 12 }, () => ({})),
    itemSize: 160,
    gravity: 2400,
    bounce: 0.3,
    dropDelay: 0.12,
    // The page's text ends at 33.5% of the kiosk screen.
    topLimit: 35,
    correct: "✅ Correct!",
    rightNeed: "This is a necessity.",
    rightWant: "This is a want.",
    wantInNeeds: "🤔 Most people would consider this a WANT.",
    needInWants: "🤔 Most people would consider this a NEED.",
    doneLink: "/atm-lessons/need-or-want/complete",
    sounds: true,
    volume: 0.8,
}

addPropertyControls(ATMTumbleWall, {
    items: {
        type: ControlType.Array,
        title: "Pictures",
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.ResponsiveImage, title: "Image" },
                kind: {
                    type: ControlType.Enum,
                    title: "Is a",
                    options: ["need", "want"],
                    optionTitles: ["Need", "Want"],
                    defaultValue: "need",
                },
            },
        },
        defaultValue: ATMTumbleWall.defaultProps.items,
    },
    itemSize: {
        type: ControlType.Number,
        title: "Size",
        min: 40,
        max: 400,
        step: 1,
        unit: "px",
        defaultValue: ATMTumbleWall.defaultProps.itemSize,
    },
    gravity: {
        type: ControlType.Number,
        title: "Gravity",
        min: 200,
        max: 6000,
        step: 100,
        defaultValue: ATMTumbleWall.defaultProps.gravity,
    },
    bounce: {
        type: ControlType.Number,
        title: "Bounce",
        min: 0,
        max: 0.9,
        step: 0.05,
        defaultValue: ATMTumbleWall.defaultProps.bounce,
    },
    dropDelay: {
        type: ControlType.Number,
        title: "Drop Delay",
        min: 0,
        max: 1,
        step: 0.01,
        unit: "s",
        defaultValue: ATMTumbleWall.defaultProps.dropDelay,
    },
    topLimit: {
        type: ControlType.Number,
        title: "Top Limit",
        min: 0,
        max: 90,
        step: 1,
        unit: "%",
        description:
            "Pictures can't be dragged or thrown above this much of the frame's height.",
        defaultValue: ATMTumbleWall.defaultProps.topLimit,
    },
    correct: {
        type: ControlType.String,
        title: "Correct",
        defaultValue: ATMTumbleWall.defaultProps.correct,
    },
    rightNeed: {
        type: ControlType.String,
        title: "Need Sorted",
        defaultValue: ATMTumbleWall.defaultProps.rightNeed,
    },
    rightWant: {
        type: ControlType.String,
        title: "Want Sorted",
        defaultValue: ATMTumbleWall.defaultProps.rightWant,
    },
    wantInNeeds: {
        type: ControlType.String,
        title: "Want in Needs",
        defaultValue: ATMTumbleWall.defaultProps.wantInNeeds,
    },
    needInWants: {
        type: ControlType.String,
        title: "Need in Wants",
        defaultValue: ATMTumbleWall.defaultProps.needInWants,
    },
    doneLink: {
        type: ControlType.Link,
        title: "When Done",
        description: "The page to go to once every picture is in its basket.",
        defaultValue: ATMTumbleWall.defaultProps.doneLink,
    },
    sounds: { type: ControlType.Boolean, title: "Sounds", defaultValue: true },
    volume: {
        type: ControlType.Number,
        title: "Volume",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: ATMTumbleWall.defaultProps.volume,
        hidden: (props: Partial<Props>) => !props.sounds,
    },
})

// The rain starts as soon as the page opens, so the sounds load with it
loadSounds("ball-bounce.mp3", "correct.mp3", "incorrect.mp3")
