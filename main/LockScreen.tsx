import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import {
    motion,
    useMotionValue,
    useTransform,
    animate,
    AnimatePresence,
} from "framer-motion"

// Icons
function CameraGlyph({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M8 6.5L9 4.5H15L16 6.5H19C19.83 6.5 20.5 7.17 20.5 8V17C20.5 17.83 19.83 18.5 19 18.5H5C4.17 18.5 3.5 17.83 3.5 17V8C3.5 7.17 4.17 6.5 5 6.5H8Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12.2"
                r="3.6"
                stroke={color}
                strokeWidth="1.5"
            />
        </svg>
    )
}

function FlashlightGlyph({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M8.2 2.5H15.8L15 8.3H17.3C17.9 8.3 18.2 9.05 17.75 9.47L9.6 21.2C9.2 21.6 8.55 21.25 8.68 20.7L10.3 13.7H7.9C7.4 13.7 7.05 13.2 7.2 12.72L8.2 2.52"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    )
}

function ChevronUpGlyph({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M5 15L12 8L19 15"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function MessageGlyph({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V15.5C20 16.33 19.33 17 18.5 17H9L5 20.5V17H5.5C4.67 17 4 16.33 4 15.5V5.5Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Helpers
function useTicker(enabled: boolean) {
    const [now, setNow] = React.useState(() => new Date())
    React.useEffect(() => {
        if (!enabled) return
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [enabled])
    return now
}

function formatTime(d: Date, use24h: boolean) {
    let h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, "0")
    if (use24h) return `${h.toString().padStart(2, "0")}:${m}`
    h = h % 12
    if (h === 0) h = 12
    return `${h}:${m}`
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = React.useState(false)
    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReduced(query.matches)
        const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
        query.addEventListener("change", listener)
        return () => query.removeEventListener("change", listener)
    }, [])
    return reduced
}

// Detects once we're safely running on the client (post-hydration).
// LockScreen renders live date/time, which differs between Framer's
// server pre-render and the client's first paint — rendering the real
// component before this flips true risks a flash of mismatched text
// (and React error #425). See the hydration guard note in NOTES.md.
function useIsMounted() {
    const [isMounted, setIsMounted] = React.useState(false)
    React.useEffect(() => {
        setIsMounted(true)
    }, [])
    return isMounted
}

function formatDate(d: Date) {
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" })
    const month = d.toLocaleDateString(undefined, { month: "short" })
    const date = d.getDate()
    return `${weekday} ${month} ${date}`
}

function trailingSpacingFix(font: any): number {
    const ls = font?.letterSpacing
    if (ls === undefined || ls === null || ls === "") return 0
    const num = typeof ls === "number" ? ls : parseFloat(ls)
    if (Number.isNaN(num)) return 0
    return -num
}

// Simple RGBA fallback helper string generator
function rgba(r: number, g: number, b: number, a: number) {
    return `rgba(${r}, ${g}, ${b}, ${a})`
}

function LockScreenInner(props) {
    const {
        variant = "lockScreen",
        // Flattened Time controls
        useLiveTime,
        customTime,
        use24Hour,
        timeFont,
        timeColor,
        clockOpacity,
        // Flattened Date controls
        useLiveDate,
        customDate,
        dateFont,
        dateColor,
        dateOpacity,
        // Fake Notifications — stack like real lock-screen notifications:
        // whichever are enabled arrive one at a time (each using its own
        // delaySeconds as the gap since the previous arrival) and stay
        // visible together, newest on top. Once the whole stack has
        // arrived it holds, then clears and the sequence loops.
        notification1 = {},
        notification2 = {},
        notification3 = {},
        notification4 = {},
        notification5 = {},
        // Flattened Swipe Hint controls
        swipeHintText,
        swipeHintFont,
        swipeHintColor,
        swipeHintOpacity,
        swipeHintGap,
        swipeHintBounce,
        // Nested Objects remaining
        layout = {},
        icons = {},
        glass = {},
        swipeGlass = {},
        homeIndicator = {},
        // NEW Event trigger prop
        onSwipeUp,
    } = props

    const isLockScreen = variant !== "splash"
    const prefersReducedMotion = usePrefersReducedMotion()

    // Live-tick whenever either the clock or the date is set to "live" —
    // otherwise a live date paired with a custom time would never update.
    // Disabled entirely on the splash variant, which has no clock at all.
    const now = useTicker(isLockScreen && (useLiveTime || useLiveDate))
    const displayDate = useLiveDate ? formatDate(now) : customDate
    const timeString = useLiveTime ? formatTime(now, use24Hour) : customTime

    // Whichever notifications are enabled, in slot order — the arrival
    // sequence, oldest first. With zero enabled, nothing renders.
    const enabledNotifications = [
        notification1,
        notification2,
        notification3,
        notification4,
        notification5,
    ].filter((n) => n && n.enabled !== false)

    // How many of enabledNotifications have arrived and are on-screen.
    const [visibleCount, setVisibleCount] = React.useState(0)

    // Self-re-arms on every count change (rather than a fixed interval) so
    // each notification's own appear delay is respected. Once the whole
    // stack has arrived it holds for the longest stay duration among them,
    // then clears so the sequence can arrive again from empty.
    React.useEffect(() => {
        if (!isLockScreen || enabledNotifications.length === 0) return
        const total = enabledNotifications.length

        if (visibleCount < total) {
            const next = enabledNotifications[visibleCount]
            const delaySeconds =
                next.delaySeconds === undefined ? 1.1 : next.delaySeconds
            const id = window.setTimeout(() => {
                setVisibleCount((c) => c + 1)
            }, delaySeconds * 1000)
            return () => window.clearTimeout(id)
        }

        const holdSeconds = enabledNotifications.reduce(
            (max, n) =>
                Math.max(max, n.holdSeconds === undefined ? 4.5 : n.holdSeconds),
            0
        )
        const id = window.setTimeout(() => {
            setVisibleCount(0)
        }, holdSeconds * 1000)
        return () => window.clearTimeout(id)
    }, [isLockScreen, enabledNotifications.length, visibleCount])

    // Track motion drag values to handle visual fading while swiping up
    const dragY = useMotionValue(0)
    const opacityTransform = useTransform(dragY, [-150, 0], [0, 1])

    // Swipe-up glass pane — the way the iOS 26 lock screen reads once
    // you start to drag it: the lock screen is a pane of glass that lifts
    // off the wallpaper, carrying the clock/buttons/home indicator with
    // it. Nothing about the pane's colour, contrast or lighting changes
    // with the swipe — the same soft inner glow sits along its edges at
    // rest and while dragging. What the swipe reveals is the glass's
    // edges: its bottom corners round off over the first `formDistance`
    // px of the drag (square at rest, matching the screen) and the
    // glowing bottom edge lifts away from the bottom of the screen.
    const swipeGlassEnabled = swipeGlass.enabled !== false
    const glassProgress = useTransform(
        dragY,
        [-(swipeGlass.formDistance || 80), 0],
        [1, 0]
    )
    const sheetRadius = useTransform(
        glassProgress,
        [0, 1],
        [0, swipeGlass.cornerRadius ?? 150]
    )
    // With the glass pane on, content rides the pane at full opacity
    // (as on iOS) instead of fading out — which also keeps the
    // flashlight/camera buttons' own backdrop blur intact, since an
    // opacity < 1 ancestor would cut them off from the wallpaper. Only
    // the clock/date dim a little as the pane lifts, as they do on iOS.
    const clockGlassOpacity = useTransform(
        glassProgress,
        [0, 1],
        [1, swipeGlass.clockOpacity ?? 0.75]
    )
    // Glow colour at a given strength (0-1). color-mix keeps any colour
    // the Framer picker hands back (hex, rgb, rgba) usable in a shadow.
    const glowIntensity = swipeGlass.glowIntensity ?? 0.3
    const glowSize = swipeGlass.glowSize ?? 96
    const glow = (strength: number) =>
        `color-mix(in srgb, ${swipeGlass.glowColor || "#E6D9FF"} ${Math.round(
            Math.min(strength, 1) * 100
        )}%, transparent)`
    // Bottom glow band as an eased (smoothstep) gradient over many stops
    // rather than a couple of linear ones — a linear ramp has visible
    // kinks where its segments meet and a hard line where it ends,
    // which is what made the feathering look uneven.
    const glowBandStops = Array.from({ length: 13 }, (_, i) => {
        const t = i / 12
        const falloff = 1 - t * t * (3 - 2 * t)
        return `${glow(glowIntensity * 0.9 * falloff)} ${Math.round(
            t * glowSize * 1.5
        )}px`
    }).join(", ")
    // Glow along the bottom edge only, wrapping up into the rounded
    // bottom corners — no vignette around the rest of the frame. An
    // inset shadow pushed up (negative y) lights only the bottom edge;
    // the negative spread pulls it back off the sides so they stay
    // clear. A second, tighter one right at the edge adds a little
    // contrast (brighter, crisper edge) while staying feathered rather
    // than reading as an outline stroke.
    const glowShadow = `inset 0 -${glowSize * 0.6}px ${glowSize * 0.5}px -${glowSize * 0.3}px ${glow(glowIntensity)}, inset 0 -6px 12px -6px ${glow(glowIntensity * 1.8)}`

    // CSS Glass System Recipes — Liquid Glass (iOS 26) inspired: a soft,
    // centered top-lit glow, contained close to the top edge, over a flat
    // tint — rather than the old diagonal sheen washed across the whole
    // surface. Centered (not offset to one side) because real Apple
    // material highlights read as lit from directly above, symmetrically —
    // an off-axis blob reads oddly once the surface gets wide and short,
    // like the notification card. A bright top rim plus a faint dark
    // underside rim reads as physical edge thickness instead of a flat
    // border.
    const glassTint = rgba(255, 255, 255, glass.tintOpacity)
    // Real Liquid Glass on the lock screen reads as a soft, largely
    // uniform frosted surface — barely a hint of brightening right at the
    // top edge, not a visible glowing patch. Kept subtle and tightly
    // contained for that reason.
    const glassGlint = rgba(
        255,
        255,
        255,
        Math.min(glass.tintOpacity + 0.14, 0.5)
    )
    const glassBackground = `radial-gradient(160% 70% at 50% -30%, ${glassGlint} 0%, rgba(255,255,255,0) 30%), linear-gradient(180deg, ${glassTint} 0%, ${glassTint} 100%)`
    const glassBorderColor = rgba(255, 255, 255, glass.borderOpacity)
    const glassBlurFilter = `blur(${glass.blur}px) saturate(${glass.saturation}%)`
    const glassRim = `inset 0 1px 1px ${rgba(255, 255, 255, Math.min(glass.innerHighlight + 0.25, 1))}, inset 0 -1px 1px rgba(0,0,0,0.08)`
    const glassShadow = `0 ${glass.shadowY}px ${glass.shadowBlur}px rgba(0,0,0,${glass.shadowOpacity}), ${glassRim}`
    // A softer drop shadow just for the notification card — the shared
    // glass shadow (tuned for the small, high-contrast flashlight/camera
    // buttons) read as too harsh on a wide, low-contrast card — but the
    // same rim, so the card still reads as the same material.
    const notificationShadow = `0 6px 10px rgba(0,0,0,0.10), ${glassRim}`

    const buttonGlassStyle: React.CSSProperties = {
        background: glassBackground,
        backdropFilter: glassBlurFilter,
        WebkitBackdropFilter: glassBlurFilter,
        border: `${glass.borderWidth}px solid ${glassBorderColor}`,
        boxShadow: glassShadow,
        opacity: glass.panelOpacity,
        // Chromium is slow to promote a freshly-inserted backdrop-filter
        // element onto its own compositing layer, especially while a
        // parent is simultaneously animating opacity/transform (exactly
        // what happens when a notification pops in) — the content paints
        // first and the blur visibly "catches up" a frame or two later.
        // will-change tells the browser to allocate that layer up front.
        willChange: "backdrop-filter",
    }

    // Handles the release of the drag gesture
    const handleDragEnd = (event, info) => {
        const swipeDistance = info.offset.y
        const swipeVelocity = info.velocity.y

        // Triggers if they drag up more than 30px OR if they flick upward quickly (negative velocity)
        const unlocked = (swipeDistance < -30 || swipeVelocity < -300) && !!onSwipeUp

        if (unlocked) {
            // Commit to the unlock instead of springing back to rest first —
            // continue off-screen at the release velocity, so the gesture
            // and the transition it triggers read as one motion rather than
            // visibly resetting to the start before navigating away.
            animate(dragY, -1920, {
                type: "spring",
                stiffness: 260,
                damping: 30,
                velocity: swipeVelocity,
            })
            onSwipeUp()
            return
        }

        // Spring back to rest, handing off the release velocity so an
        // aborted flick continues smoothly into the settle instead of
        // visually resetting to a dead stop — a lighter-than-critical
        // damping still gives it a small, deliberate overshoot on arrival.
        animate(dragY, 0, {
            type: "spring",
            stiffness: 300,
            damping: 22,
            velocity: swipeVelocity,
        })
    }

    return (
        <motion.div
            drag="y"
            dragConstraints={{ top: -400, bottom: 0 }}
            dragElastic={{ top: 0.2, bottom: 0 }}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                y: dragY,
                touchAction: "none",
            }}
            onDragEnd={handleDragEnd}
        >
            {/* Swipe Glass Glow — the same at rest and while swiping: a
                soft glow along the bottom edge, where the swipe starts,
                wrapping up into the rounded corners once the pane lifts —
                light caught in the glass's thickness. No vignette around
                the rest of the frame. An eased bottom band and blurred
                inset shadows keep its feathering smooth. No outline
                stroke and no backdrop filter/tint (the wallpaper looks
                exactly as it does at rest), and all inset: the glow stays
                inside the pane rather than spilling onto the wallpaper. */}
            {swipeGlassEnabled && glowIntensity > 0 && (
                <motion.div
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        borderBottomLeftRadius: sheetRadius,
                        borderBottomRightRadius: sheetRadius,
                        background: `linear-gradient(0deg, ${glowBandStops})`,
                        boxShadow: glowShadow,
                    }}
                />
            )}
            {/* Content Layer */}
            <motion.div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    boxSizing: "border-box",
                    paddingLeft: layout.sideInset,
                    paddingRight: layout.sideInset,
                    paddingTop: layout.topInset,
                    pointerEvents: "none",
                    // Without the glass pane, fade content out while the
                    // user drags up; with it, content rides the pane.
                    opacity: swipeGlassEnabled ? 1 : opacityTransform,
                }}
            >
                {/* Date + Time Core Block */}
                <motion.div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        opacity: swipeGlassEnabled ? clockGlassOpacity : 1,
                    }}
                >
                    {/* Date Block */}
                    <div
                        style={{
                            ...dateFont,
                            color: dateColor,
                            textAlign: "center",
                            textShadow: "0 1px 8px rgba(0,0,0,0.35)",
                            opacity: dateOpacity,
                            marginRight: trailingSpacingFix(dateFont),
                        }}
                    >
                        {displayDate}
                    </div>
                    {/* Time Block */}
                    <div
                        style={{
                            marginTop: layout.dateTimeGap,
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "center",
                            lineHeight: 1,
                        }}
                    >
                        <span
                            style={{
                                ...timeFont,
                                color: timeColor,
                                textShadow: "0 2px 18px rgba(0,0,0,0.4)",
                                opacity: clockOpacity,
                                marginRight: trailingSpacingFix(timeFont),
                            }}
                        >
                            {timeString}
                        </span>
                    </div>
                </motion.div>
                {/* Spacer pushes context rows downward */}
                <div style={{ flex: 1 }} />
                {/* Fake Notifications — stack low, near the icon row:
                    whichever one just arrived sits closest to the
                    icons/swipe hint, and older ones get pushed
                    progressively higher above it as new ones come in,
                    growing the pile upward away from the icons rather
                    than down from the clock. */}
                {enabledNotifications.length > 0 && (
                    <div
                        style={{
                            marginBottom:
                                layout.notificationGap === undefined
                                    ? 72
                                    : layout.notificationGap,
                            // Break out of the content layer's side inset —
                            // notifications should sit closer to the actual
                            // screen edges (20pt each side) than the wider
                            // inset used by the clock/date/icon row, but
                            // with real breathing room, not flush.
                            width: `calc(100% + ${2 * (layout.sideInset - 20)}px)`,
                            marginLeft: -(layout.sideInset - 20),
                            marginRight: -(layout.sideInset - 20),
                            display: "flex",
                            // column-reverse lays items out from the
                            // bottom up: the first DOM child sits at the
                            // bottom, closest to the icon row. The array
                            // below is reversed (newest first), so the
                            // newest arrival is always that bottom-most,
                            // first DOM child, and older notifications
                            // stack progressively higher above it.
                            flexDirection: "column-reverse",
                            gap: 25,
                        }}
                    >
                        <AnimatePresence initial={false}>
                            {enabledNotifications
                                .map((n, slot) => ({ n, slot }))
                                .slice(0, visibleCount)
                                // Newest first in the array. Combined with
                                // the container's column-reverse, index 0
                                // (the newest arrival) lands at the
                                // bottom — closest to the icons — and each
                                // older notification gets pushed
                                // progressively higher as new ones arrive,
                                // instead of staying pinned at the bottom.
                                .reverse()
                                .map(({ n, slot }) => {
                                    const cornerRadius =
                                        n.cornerRadius === undefined
                                            ? 50
                                            : n.cornerRadius
                                    // Nests the icon's rounding to the
                                    // card's rather than a fixed value, so
                                    // they stay visually concentric as the
                                    // card radius changes.
                                    const iconRadius = Math.round(
                                        cornerRadius * 0.8
                                    )
                                    return (
                                        <motion.div
                                            key={slot}
                                            layout
                                            // `layout` is back for smooth
                                            // sibling reflow, but this card
                                            // no longer has its own `y`
                                            // travel on entrance — that
                                            // separate y motion was a much
                                            // shorter trip than the sibling
                                            // below has to make via `layout`
                                            // (roughly this card's own
                                            // height + the stack gap), so
                                            // even with matched springs and
                                            // synced start times the two
                                            // finished at different
                                            // wall-clock moments and briefly
                                            // overlapped. This card now
                                            // appears directly at its
                                            // correct flex position (only
                                            // scaling in from center, which
                                            // is symmetric and doesn't
                                            // drift its edges toward the
                                            // sibling), so the sibling's
                                            // `layout` reflow is the only
                                            // real motion happening — smooth
                                            // again, with nothing left to
                                            // desync against.
                                            // Non-reduced-motion entrance/exit
                                            // deliberately never animates
                                            // opacity on this element (it
                                            // carries the glass chrome one
                                            // level down, but the parent's
                                            // opacity still forces the
                                            // browser to recomposite that
                                            // backdrop-filter child through
                                            // a changing alpha every frame).
                                            // Animating opacity over a
                                            // freshly-mounted backdrop-filter
                                            // subtree is the specific thing
                                            // Chromium struggles to keep up
                                            // with — the card renders sharp
                                            // and the blur visibly catches
                                            // up a beat later. Transform-only
                                            // motion (y/scale) composites as
                                            // a cheap bitmap transform
                                            // instead, so the blur is
                                            // already correct on the first
                                            // frame it's visible. The y is
                                            // positive — the card rises up
                                            // into place from just below its
                                            // resting position, rather than
                                            // dropping down from above.
                                            // Small on purpose (14, not the
                                            // old 32) — big enough to read
                                            // as a settle, small enough
                                            // relative to the sibling's
                                            // ~200px `layout` reflow that it
                                            // doesn't meaningfully
                                            // reintroduce the overlap a
                                            // larger offset caused.
                                            initial={
                                                prefersReducedMotion
                                                    ? { opacity: 0 }
                                                    : { y: 14, scale: 0.9 }
                                            }
                                            animate={
                                                prefersReducedMotion
                                                    ? { opacity: 1 }
                                                    : { y: 0, scale: 1 }
                                            }
                                            // Exit doesn't have the cold-
                                            // layer problem above — by the
                                            // time a card leaves, its
                                            // backdrop-filter layer has been
                                            // live for seconds, so fading it
                                            // out here is safe and reads
                                            // better than an abrupt pop.
                                            // It also doesn't have the
                                            // reflow-distance mismatch: all
                                            // visible cards clear together
                                            // (see the visibleCount reset),
                                            // so there's no sibling making
                                            // room for this one to race
                                            // against.
                                            exit={
                                                prefersReducedMotion
                                                    ? { opacity: 0 }
                                                    : {
                                                          opacity: 0,
                                                          y: -16,
                                                          scale: 0.92,
                                                      }
                                            }
                                            transition={
                                                prefersReducedMotion
                                                    ? {
                                                          layout: {
                                                              duration: 0.2,
                                                              ease: "easeOut",
                                                          },
                                                          default: {
                                                              duration: 0.2,
                                                              ease: "easeOut",
                                                          },
                                                      }
                                                    : {
                                                          layout: {
                                                              type: "spring",
                                                              stiffness: 420,
                                                              // Softened from
                                                              // 32 (damping
                                                              // ratio ~0.78)
                                                              // to 37 (~0.9)
                                                              // — still a
                                                              // little
                                                              // overshoot,
                                                              // much less of
                                                              // it, so the
                                                              // sibling
                                                              // reflow is
                                                              // less likely
                                                              // to swing past
                                                              // its resting
                                                              // spot and
                                                              // briefly
                                                              // overlap the
                                                              // card next to
                                                              // it.
                                                              damping: 37,
                                                          },
                                                          // This card's own
                                                          // y/scale no longer
                                                          // shares vertical
                                                          // space with the
                                                          // `layout` reflow
                                                          // (it's a tiny 14px
                                                          // offset next to a
                                                          // ~200px reflow),
                                                          // so it's free to
                                                          // use a softer,
                                                          // slightly slower
                                                          // spring for a
                                                          // more graceful
                                                          // settle instead
                                                          // of matching
                                                          // layout's snappier
                                                          // one. Also
                                                          // softened (damping
                                                          // ratio ~0.75 ->
                                                          // ~0.9) for the
                                                          // same reason.
                                                          default: {
                                                              type: "spring",
                                                              stiffness: 300,
                                                              damping: 31,
                                                          },
                                                      }
                                            }
                                            style={{ width: "100%" }}
                                        >
                                            {/* Visual chrome (background,
                                                border, box-shadow, radius)
                                                lives on a plain inner div,
                                                not the motion.div carrying
                                                `layout` — box-shadow and
                                                border don't get Framer
                                                Motion's automatic
                                                border-radius scale
                                                correction during layout
                                                projection, so putting them
                                                on the animated element
                                                itself warped/clipped the
                                                shadow (worst on whichever
                                                card was mid-reflow, e.g.
                                                the one just pushed down by
                                                a new arrival). */}
                                            <div
                                                style={{
                                                    width: "100%",
                                                    boxSizing: "border-box",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 22,
                                                    padding: "40px 28px",
                                                    borderRadius: cornerRadius,
                                                    ...buttonGlassStyle,
                                                    boxShadow:
                                                        notificationShadow,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 96,
                                                        height: 96,
                                                        borderRadius: iconRadius,
                                                        flexShrink: 0,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        background:
                                                            "rgba(255,255,255,0.25)",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {n.icon ? (
                                                        <img
                                                            src={n.icon.src}
                                                            alt=""
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit: "cover",
                                                            }}
                                                        />
                                                    ) : (
                                                        <MessageGlyph
                                                            size={48}
                                                            color="#FFFFFF"
                                                        />
                                                    )}
                                                </div>
                                                {/* Grows naturally with its
                                                    content instead of being
                                                    height-locked to the icon —
                                                    the message can wrap to a
                                                    second line, same as a real
                                                    notification. */}
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 8,
                                                        fontFamily:
                                                            "-apple-system, sans-serif",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 12,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontWeight: 600,
                                                                fontSize: 28,
                                                                letterSpacing: 0.4,
                                                                textTransform:
                                                                    "uppercase",
                                                                color: "rgba(255,255,255,0.85)",
                                                                textShadow:
                                                                    "0 1px 8px rgba(0,0,0,0.35)",
                                                            }}
                                                        >
                                                            {n.appName ||
                                                                "Messages"}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 28,
                                                                color: "rgba(255,255,255,0.7)",
                                                                flexShrink: 0,
                                                                textShadow:
                                                                    "0 1px 8px rgba(0,0,0,0.35)",
                                                            }}
                                                        >
                                                            {n.timeLabel || "now"}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            fontSize: 40,
                                                            color: "#FFFFFF",
                                                            overflow: "hidden",
                                                            whiteSpace: "nowrap",
                                                            textOverflow:
                                                                "ellipsis",
                                                            textShadow:
                                                                "0 2px 18px rgba(0,0,0,0.4)",
                                                        }}
                                                    >
                                                        {n.title || "Alex"}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 32,
                                                            lineHeight: 1.25,
                                                            color: "rgba(255,255,255,0.85)",
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient:
                                                                "vertical",
                                                            overflow: "hidden",
                                                            textOverflow:
                                                                "ellipsis",
                                                            textShadow:
                                                                "0 1px 8px rgba(0,0,0,0.35)",
                                                        }}
                                                    >
                                                        {n.message ||
                                                            "Don't forget practice starts at 6!"}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                        </AnimatePresence>
                    </div>
                )}
                {/* Quick Action Icon Row */}
                <div
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: layout.bottomInset,
                        pointerEvents: "auto",
                    }}
                >
                    {/* Flashlight Action */}
                    <div
                        style={{
                            width: icons.buttonSize,
                            height: icons.buttonSize,
                            borderRadius: icons.buttonSize,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            ...buttonGlassStyle,
                        }}
                    >
                        {icons.flashlightImage ? (
                            <img
                                src={icons.flashlightImage.src}
                                alt="Flashlight"
                                style={{
                                    width: icons.iconSize,
                                    height: icons.iconSize,
                                    objectFit: "contain",
                                    filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.08))`,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.08))`,
                                }}
                            >
                                <FlashlightGlyph
                                    size={icons.iconSize}
                                    color={icons.iconColor}
                                />
                            </div>
                        )}
                    </div>
                    {/* Camera Action */}
                    <div
                        style={{
                            width: icons.buttonSize,
                            height: icons.buttonSize,
                            borderRadius: icons.buttonSize,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            ...buttonGlassStyle,
                        }}
                    >
                        {icons.cameraImage ? (
                            <img
                                src={icons.cameraImage.src}
                                alt="Camera"
                                style={{
                                    width: icons.iconSize,
                                    height: icons.iconSize,
                                    objectFit: "contain",
                                    filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.08))`,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.08))`,
                                }}
                            >
                                <CameraGlyph
                                    size={icons.iconSize}
                                    color={icons.iconColor}
                                />
                            </div>
                        )}
                    </div>
                </div>
                {/* Unlock Hint: chevron + text, bouncing gently to invite the swipe */}
                <motion.div
                    animate={
                        swipeHintBounce && !prefersReducedMotion
                            ? { y: [0, -18, 0] }
                            : { y: 0 }
                    }
                    transition={
                        swipeHintBounce && !prefersReducedMotion
                            ? {
                                  duration: 1.5,
                                  repeat: Infinity,
                                  // A gentle "back" easing overshoots the
                                  // target slightly at the top of the rise
                                  // and again on the landing — a light
                                  // springiness on top of the float,
                                  // short of the earlier full double-hop.
                                  ease: [0.34, 1.56, 0.64, 1],
                              }
                            : { duration: 0 }
                    }
                    style={{
                        position: "absolute",
                        bottom:
                            (homeIndicator.bottomOffset || 0) +
                            (homeIndicator.height || 0) +
                            (swipeHintGap || 0),
                        left: "50%",
                        x: "-50%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        pointerEvents: "none",
                    }}
                >
                    <ChevronUpGlyph size={48} color={swipeHintColor} />
                    <div
                        style={{
                            width: "max-content",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            ...swipeHintFont,
                            color: swipeHintColor,
                            opacity: swipeHintOpacity,
                            textShadow: "0 1px 6px rgba(0,0,0,0.3)",
                            marginRight: trailingSpacingFix(swipeHintFont),
                        }}
                    >
                        {swipeHintText}
                    </div>
                </motion.div>
                {/* Home Indicator Interactive Bar */}
                <div
                    style={{
                        position: "absolute",
                        bottom: homeIndicator.bottomOffset,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: homeIndicator.width,
                        height: homeIndicator.height,
                        borderRadius: homeIndicator.cornerRadius,
                        backgroundColor: homeIndicator.color,
                        opacity: homeIndicator.opacity,
                        pointerEvents: "none",
                    }}
                />
            </motion.div>
        </motion.div>
    )
}

// Component
/**
 * Fixed to the kiosk's native resolution — same convention as
 * AppInactivityOverlay.tsx — so dropping either variant onto the canvas
 * defaults to the real screen size instead of an arbitrary frame.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
// Hydration guard baked directly into the component instead of relying
// on a separately-applied Framer code override — LockScreen has live
// date/time on the lockScreen variant, so it needs this regardless, and
// keeping it in-file leaves the layer's one available code-override
// slot free for something else (e.g. a redirect override on the same
// instance). Renders an invisible placeholder matching the requested
// size until mounted, then swaps in the real component — identical
// behavior to the external `withHydrationGuard` override this replaces.
export default function LockScreen(props) {
    const isMounted = useIsMounted()
    if (!isMounted) {
        return (
            <div
                style={{
                    opacity: 0,
                    visibility: "hidden",
                    width: props.width || "100%",
                    height: props.height || "100%",
                }}
            />
        )
    }
    return <LockScreenInner {...props} />
}

// Default Setup Canvas Configuration
LockScreen.defaultProps = {
    variant: "lockScreen",
    useLiveTime: true,
    use24Hour: false,
    customTime: "9:41",
    timeFont: {
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        fontSize: 236,
        lineHeight: "1em",
        letterSpacing: "-6px",
        variant: "Semibold",
    },
    timeColor: "#FFFFFF",
    clockOpacity: 1,
    useLiveDate: true,
    customDate: "Tue Jul 7",
    dateFont: {
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        fontSize: 42,
        lineHeight: "1.2em",
        letterSpacing: "0.3px",
        variant: "Semibold",
    },
    dateColor: "#FFFFFF",
    dateOpacity: 1,
    notification1: {
        enabled: true,
        appName: "Messages",
        title: "Alex",
        message: "Don't forget practice starts at 6!",
        timeLabel: "now",
        cornerRadius: 25,
        delaySeconds: 1.1,
        holdSeconds: 4.5,
    },
    notification2: {
        enabled: true,
        appName: "Reminders",
        title: "Pack water bottle",
        message: "For today's practice",
        timeLabel: "2m",
        cornerRadius: 25,
        delaySeconds: 1.1,
        holdSeconds: 4.5,
    },
    notification3: {
        enabled: true,
        appName: "Calendar",
        title: "Team Practice",
        message: "Starts in 15 minutes at the gym",
        timeLabel: "5m",
        cornerRadius: 25,
        delaySeconds: 1.1,
        holdSeconds: 4.5,
    },
    notification4: {
        enabled: true,
        appName: "Weather",
        title: "72° and Sunny",
        message: "Great day to be outside",
        timeLabel: "8m",
        cornerRadius: 25,
        delaySeconds: 1.1,
        holdSeconds: 4.5,
    },
    notification5: {
        enabled: true,
        appName: "Mail",
        title: "Coach Lee",
        message: "Check your inbox for the updated schedule",
        timeLabel: "12m",
        cornerRadius: 25,
        delaySeconds: 1.1,
        holdSeconds: 4.5,
    },
    layout: {
        topInset: 110,
        sideInset: 48,
        bottomInset: 140,
        dateTimeGap: 16,
        notificationGap: 72,
    },
    icons: {
        buttonSize: 128,
        iconSize: 60,
        iconColor: "#FFFFFF",
        flashlightImage: null,
        cameraImage: null,
    },
    glass: {
        panelOpacity: 1,
        tintOpacity: 0.14,
        borderOpacity: 0.35,
        borderWidth: 1,
        blur: 40,
        saturation: 200,
        shadowY: 14,
        shadowBlur: 36,
        shadowOpacity: 0.25,
        innerHighlight: 0.5,
    },
    swipeGlass: {
        enabled: true,
        formDistance: 80,
        glowColor: "#E6D9FF",
        glowIntensity: 0.3,
        glowSize: 96,
        cornerRadius: 150,
        clockOpacity: 0.75,
    },
    homeIndicator: {
        width: 404,
        height: 15,
        cornerRadius: 8,
        color: "#FFFFFF",
        opacity: 0.9,
        bottomOffset: 26,
    },
    swipeHintText: "Swipe up to open",
    swipeHintFont: {
        fontSize: 30,
        lineHeight: "1.2em",
        letterSpacing: "0px",
        variant: "Regular",
    },
    swipeHintColor: "#FFFFFF",
    swipeHintOpacity: 0.8,
    swipeHintGap: 28,
    swipeHintBounce: true,
}

// Fixed slots instead of an Array control, matching the convention used
// elsewhere in this codebase — each slot keeps its own defaultValue, so
// "reset to default" on one notification doesn't collapse both onto a
// single shared default.
function notificationControl(title: string, defaults: any) {
    return {
        type: ControlType.Object,
        title,
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: defaults.enabled,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            icon: {
                type: ControlType.ResponsiveImage,
                title: "Icon",
            },
            appName: {
                type: ControlType.String,
                title: "App Name",
                defaultValue: defaults.appName,
            },
            title: {
                type: ControlType.String,
                title: "Title",
                defaultValue: defaults.title,
            },
            message: {
                type: ControlType.String,
                title: "Message",
                defaultValue: defaults.message,
            },
            timeLabel: {
                type: ControlType.String,
                title: "Time Label",
                defaultValue: defaults.timeLabel,
            },
            cornerRadius: {
                type: ControlType.Number,
                title: "Corner Radius",
                defaultValue: defaults.cornerRadius,
                min: 0,
                max: 60,
                step: 1,
            },
            delaySeconds: {
                type: ControlType.Number,
                title: "Appear Delay (s)",
                defaultValue: defaults.delaySeconds,
                min: 0,
                step: 0.1,
            },
            holdSeconds: {
                type: ControlType.Number,
                title: "Stay Duration (s)",
                defaultValue: defaults.holdSeconds,
                min: 1,
                max: 20,
                step: 0.5,
            },
        },
    }
}

// Property Controls Panel Definition
addPropertyControls(LockScreen, {
    variant: {
        type: ControlType.Enum,
        title: "Variant",
        options: ["lockScreen", "splash"],
        optionTitles: ["Lock Screen", "Splash"],
        defaultValue: "lockScreen",
    },
    // NEW Framer Action Link Handler Control
    onSwipeUp: {
        type: ControlType.EventHandler,
        title: "On Swipe Up",
        hidden: (p) => p.variant !== "lockScreen",
    },
    useLiveTime: {
        type: ControlType.Boolean,
        title: "Live Time",
        defaultValue: true,
        enabledTitle: "Live",
        disabledTitle: "Custom",
        hidden: (p) => p.variant !== "lockScreen",
    },
    customTime: {
        type: ControlType.String,
        title: "Custom Time",
        defaultValue: "9:41",
        hidden: (p) => p.variant !== "lockScreen" || p.useLiveTime,
    },
    use24Hour: {
        type: ControlType.Boolean,
        title: "24-Hour",
        defaultValue: false,
        hidden: (p) => p.variant !== "lockScreen",
    },
    timeFont: {
        type: ControlType.Font,
        title: "Time Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 236,
            lineHeight: "1em",
            letterSpacing: "-6px",
            variant: "Semibold",
        },
        hidden: (p) => p.variant !== "lockScreen",
    },
    timeColor: {
        type: ControlType.Color,
        title: "Time Color",
        defaultValue: "#FFFFFF",
        hidden: (p) => p.variant !== "lockScreen",
    },
    clockOpacity: {
        type: ControlType.Number,
        title: "Time Opacity",
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.01,
        hidden: (p) => p.variant !== "lockScreen",
    },
    useLiveDate: {
        type: ControlType.Boolean,
        title: "Live Date",
        defaultValue: true,
        enabledTitle: "Live",
        disabledTitle: "Custom",
        hidden: (p) => p.variant !== "lockScreen",
    },
    customDate: {
        type: ControlType.String,
        title: "Custom Date",
        defaultValue: "Tue Jul 7",
        hidden: (p) => p.variant !== "lockScreen" || p.useLiveDate,
    },
    dateFont: {
        type: ControlType.Font,
        title: "Date Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 42,
            lineHeight: "1.2em",
            letterSpacing: "0.3px",
            variant: "Semibold",
        },
        hidden: (p) => p.variant !== "lockScreen",
    },
    dateColor: {
        type: ControlType.Color,
        title: "Date Color",
        defaultValue: "#FFFFFF",
        hidden: (p) => p.variant !== "lockScreen",
    },
    dateOpacity: {
        type: ControlType.Number,
        title: "Date Opacity",
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.01,
        hidden: (p) => p.variant !== "lockScreen",
    },
    notification1: notificationControl(
        "Fake Notification 1",
        LockScreen.defaultProps.notification1
    ),
    notification2: notificationControl(
        "Fake Notification 2",
        LockScreen.defaultProps.notification2
    ),
    notification3: notificationControl(
        "Fake Notification 3",
        LockScreen.defaultProps.notification3
    ),
    notification4: notificationControl(
        "Fake Notification 4",
        LockScreen.defaultProps.notification4
    ),
    notification5: notificationControl(
        "Fake Notification 5",
        LockScreen.defaultProps.notification5
    ),
    layout: {
        type: ControlType.Object,
        title: "Layout & Insets",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            topInset: {
                type: ControlType.Number,
                title: "Top Inset",
                defaultValue: 110,
                min: 0,
                max: 500,
                step: 1,
            },
            sideInset: {
                type: ControlType.Number,
                title: "Side Inset",
                defaultValue: 48,
                min: 0,
                max: 300,
                step: 1,
            },
            bottomInset: {
                type: ControlType.Number,
                title: "Bottom Inset",
                defaultValue: 140,
                min: 0,
                max: 400,
                step: 1,
            },
            dateTimeGap: {
                type: ControlType.Number,
                title: "Date-Time Gap",
                defaultValue: 16,
                min: 0,
                max: 150,
                step: 1,
            },
            notificationGap: {
                type: ControlType.Number,
                title: "Notification-Icon Gap",
                defaultValue: 72,
                min: 0,
                max: 250,
                step: 1,
            },
        },
    },
    icons: {
        type: ControlType.Object,
        title: "Icons",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            buttonSize: {
                type: ControlType.Number,
                title: "Button Size",
                defaultValue: 128,
                min: 60,
                max: 240,
                step: 1,
            },
            iconSize: {
                type: ControlType.Number,
                title: "Icon Size",
                defaultValue: 60,
                min: 24,
                max: 140,
                step: 1,
            },
            iconColor: {
                type: ControlType.Color,
                title: "Icon Color",
                defaultValue: "#FFFFFF",
            },
            flashlightImage: {
                type: ControlType.ResponsiveImage,
                title: "Flashlight Icon",
            },
            cameraImage: {
                type: ControlType.ResponsiveImage,
                title: "Camera Icon",
            },
        },
    },
    glass: {
        type: ControlType.Object,
        title: "Glass Panel",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            panelOpacity: {
                type: ControlType.Number,
                title: "Panel Opacity",
                defaultValue: 1,
                min: 0,
                max: 1,
                step: 0.01,
            },
            tintOpacity: {
                type: ControlType.Number,
                title: "Tint Opacity",
                defaultValue: 0.14,
                min: 0,
                max: 1,
                step: 0.01,
            },
            borderOpacity: {
                type: ControlType.Number,
                title: "Border Opacity",
                defaultValue: 0.35,
                min: 0,
                max: 1,
                step: 0.01,
            },
            borderWidth: {
                type: ControlType.Number,
                title: "Border Width",
                defaultValue: 1,
                min: 0,
                max: 8,
                step: 0.5,
            },
            blur: {
                type: ControlType.Number,
                title: "Blur",
                defaultValue: 40,
                min: 0,
                max: 100,
                step: 1,
            },
            saturation: {
                type: ControlType.Number,
                title: "Saturation",
                defaultValue: 200,
                min: 100,
                max: 250,
                step: 5,
            },
            shadowY: {
                type: ControlType.Number,
                title: "Shadow Y",
                defaultValue: 14,
                min: 0,
                max: 60,
                step: 1,
            },
            shadowBlur: {
                type: ControlType.Number,
                title: "Shadow Blur",
                defaultValue: 36,
                min: 0,
                max: 120,
                step: 1,
            },
            shadowOpacity: {
                type: ControlType.Number,
                title: "Shadow Opacity",
                defaultValue: 0.25,
                min: 0,
                max: 1,
                step: 0.01,
            },
            innerHighlight: {
                type: ControlType.Number,
                title: "Inner Highlight",
                defaultValue: 0.5,
                min: 0,
                max: 1,
                step: 0.01,
            },
        },
    },
    swipeGlass: {
        type: ControlType.Object,
        title: "Swipe Glass",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Enabled",
                defaultValue: true,
            },
            formDistance: {
                type: ControlType.Number,
                title: "Form Distance",
                defaultValue: 80,
                min: 10,
                max: 300,
                step: 1,
                unit: "px",
                hidden: (p) => p.enabled === false,
            },
            glowColor: {
                type: ControlType.Color,
                title: "Glow Color",
                defaultValue: "#E6D9FF",
                hidden: (p) => p.enabled === false,
            },
            glowIntensity: {
                type: ControlType.Number,
                title: "Glow Intensity",
                defaultValue: 0.3,
                min: 0,
                max: 1,
                step: 0.01,
                hidden: (p) => p.enabled === false,
            },
            glowSize: {
                type: ControlType.Number,
                title: "Glow Size",
                defaultValue: 96,
                min: 0,
                max: 160,
                step: 1,
                unit: "px",
                hidden: (p) => p.enabled === false,
            },
            cornerRadius: {
                type: ControlType.Number,
                title: "Corner Radius",
                defaultValue: 150,
                min: 0,
                max: 300,
                step: 1,
                hidden: (p) => p.enabled === false,
            },
            clockOpacity: {
                type: ControlType.Number,
                title: "Clock Opacity",
                defaultValue: 0.75,
                min: 0,
                max: 1,
                step: 0.01,
                hidden: (p) => p.enabled === false,
            },
        },
    },
    homeIndicator: {
        type: ControlType.Object,
        title: "Home Indicator",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            width: {
                type: ControlType.Number,
                title: "Width",
                defaultValue: 404,
                min: 100,
                max: 700,
                step: 1,
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                defaultValue: 15,
                min: 4,
                max: 40,
                step: 1,
            },
            cornerRadius: {
                type: ControlType.Number,
                title: "Corner Radius",
                defaultValue: 8,
                min: 0,
                max: 20,
                step: 1,
            },
            color: {
                type: ControlType.Color,
                title: "Color",
                defaultValue: "#FFFFFF",
            },
            opacity: {
                type: ControlType.Number,
                title: "Opacity",
                defaultValue: 0.9,
                min: 0,
                max: 1,
                step: 0.01,
            },
            bottomOffset: {
                type: ControlType.Number,
                title: "Bottom Offset",
                defaultValue: 26,
                min: 0,
                max: 150,
                step: 1,
            },
        },
    },
    swipeHintText: {
        type: ControlType.String,
        title: "Swipe Hint Text",
        defaultValue: "Swipe up to open",
        hidden: (p) => p.variant !== "lockScreen",
    },
    swipeHintFont: {
        type: ControlType.Font,
        title: "Swipe Hint Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: 30,
            lineHeight: "1.2em",
            letterSpacing: "0px",
            variant: "Regular",
        },
        hidden: (p) => p.variant !== "lockScreen",
    },
    swipeHintColor: {
        type: ControlType.Color,
        title: "Swipe Hint Color",
        defaultValue: "#FFFFFF",
        hidden: (p) => p.variant !== "lockScreen",
    },
    swipeHintOpacity: {
        type: ControlType.Number,
        title: "Swipe Hint Opacity",
        defaultValue: 0.8,
        min: 0,
        max: 1,
        step: 0.01,
        hidden: (p) => p.variant !== "lockScreen",
    },
    swipeHintGap: {
        type: ControlType.Number,
        title: "Swipe Hint Gap",
        defaultValue: 28,
        min: 0,
        max: 150,
        step: 1,
        hidden: (p) => p.variant !== "lockScreen",
    },
    swipeHintBounce: {
        type: ControlType.Boolean,
        title: "Swipe Hint Bounce",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: (p) => p.variant !== "lockScreen",
    },
})
