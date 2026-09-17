import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

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

function formatDate(d: Date) {
    const day = d.toLocaleDateString(undefined, { weekday: "short" })
    const month = d.toLocaleDateString(undefined, { month: "short" })
    const date = d.getDate()
    return `${day} ${date} ${month}`
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

// Component
/**
 * Fixed to the kiosk's native resolution — same convention as
 * InactivityOverlay.tsx — so dropping either variant onto the canvas
 * defaults to the real screen size instead of an arbitrary frame.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 1920
 */
export default function LockScreen(props) {
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
        // Fake Notification
        notification = {},
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
        homeIndicator = {},
        // Splash variant
        splash = {},
        // NEW Event trigger prop
        onSwipeUp,
    } = props

    const isLockScreen = variant !== "splash"

    // Live-tick whenever either the clock or the date is set to "live" —
    // otherwise a live date paired with a custom time would never update.
    // Disabled entirely on the splash variant, which has no clock at all.
    const now = useTicker(isLockScreen && (useLiveTime || useLiveDate))
    const displayDate = useLiveDate ? formatDate(now) : customDate
    const timeString = useLiveTime ? formatTime(now, use24Hour) : customTime

    // Track motion drag values to handle visual fading while swiping up
    const dragY = useMotionValue(0)
    const opacityTransform = useTransform(dragY, [-150, 0], [0, 1])

    // CSS Glass System Recipes
    const glassBackground = rgba(255, 255, 255, glass.tintOpacity)
    const glassBorderColor = rgba(255, 255, 255, glass.borderOpacity)
    const glassBlurFilter = `blur(${glass.blur}px) saturate(${glass.saturation}%)`
    const glassShadow = `0 ${glass.shadowY}px ${glass.shadowBlur}px rgba(0,0,0,${glass.shadowOpacity}), inset 0 1px 0 rgba(255,255,255,${glass.innerHighlight})`

    const buttonGlassStyle: React.CSSProperties = {
        background: glassBackground,
        backdropFilter: glassBlurFilter,
        WebkitBackdropFilter: glassBlurFilter,
        border: `${glass.borderWidth}px solid ${glassBorderColor}`,
        boxShadow: glassShadow,
        opacity: glass.panelOpacity,
    }

    // Handles the release of the drag gesture
    const handleDragEnd = (event, info) => {
        const swipeDistance = info.offset.y
        const swipeVelocity = info.velocity.y

        // Triggers if they drag up more than 30px OR if they flick upward quickly (negative velocity)
        if ((swipeDistance < -30 || swipeVelocity < -300) && onSwipeUp) {
            onSwipeUp()
        }

        // Always spring back to rest — a lighter damping than critical gives
        // it a small, deliberate "jump" on release instead of a flat snap,
        // whether or not the swipe cleared the trigger threshold.
        animate(dragY, 0, { type: "spring", stiffness: 300, damping: 22 })
    }

    // --- Splash variant: logo entrance, then an optional idle pulse ---
    const [logoEntered, setLogoEntered] = React.useState(false)

    React.useEffect(() => {
        if (variant !== "splash") return
        if (typeof window === "undefined") return
        // Never auto-navigate away while designing on the canvas.
        if (RenderTarget.current() === RenderTarget.canvas) return

        const delayMs = (splash.redirectDelay ?? 2.5) * 1000
        const id = window.setTimeout(() => {
            window.location.href = splash.redirectUrl || "/base-pages/login"
        }, delayMs)
        return () => window.clearTimeout(id)
    }, [variant, splash.redirectDelay, splash.redirectUrl])

    if (variant === "splash") {
        const logoSize = splash.logoSize || 140
        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `linear-gradient(160deg, ${
                        splash.backgroundColorA || "#0B0F1A"
                    } 0%, ${splash.backgroundColorB || "#1B2340"} 100%)`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 28,
                    }}
                >
                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: splash.animation === "fade" ? 1 : 0.85,
                        }}
                        animate={
                            logoEntered && splash.animation === "pulse"
                                ? { opacity: 1, scale: [1, 1.05, 1] }
                                : { opacity: 1, scale: 1 }
                        }
                        transition={
                            logoEntered && splash.animation === "pulse"
                                ? {
                                      duration: 2.2,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                  }
                                : { duration: 0.7, ease: "easeOut" }
                        }
                        onAnimationComplete={() => setLogoEntered(true)}
                        style={{
                            width: logoSize,
                            height: logoSize,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {splash.logo ? (
                            <img
                                src={splash.logo.src}
                                alt="Logo"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "28%",
                                    background: "rgba(255,255,255,0.12)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#FFFFFF",
                                    fontFamily: "-apple-system, sans-serif",
                                    fontWeight: 700,
                                    fontSize: logoSize * 0.22,
                                    textAlign: "center",
                                    padding: "10%",
                                    boxSizing: "border-box",
                                }}
                            >
                                {splash.logoPlaceholderText || "LOGO"}
                            </div>
                        )}
                    </motion.div>
                    {splash.showProgressDots !== false && (
                        <div style={{ display: "flex", gap: 10 }}>
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.25, 1, 0.25] }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.2,
                                    }}
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        background: "#FFFFFF",
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
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
                    opacity: opacityTransform, // Smoothly fades out content while user drags up
                }}
            >
                {/* Date + Time Core Block */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
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
                </div>
                {/* Fake Notification */}
                {notification.enabled !== false && (
                    <motion.div
                        initial={{ opacity: 0, y: -24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay:
                                notification.delaySeconds === undefined
                                    ? 1.1
                                    : notification.delaySeconds,
                            duration: 0.5,
                            ease: "easeOut",
                        }}
                        style={{
                            marginTop: layout.dateTimeGap,
                            width: "100%",
                            maxWidth: 420,
                            boxSizing: "border-box",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: 14,
                            borderRadius:
                                notification.cornerRadius === undefined
                                    ? 20
                                    : notification.cornerRadius,
                            ...buttonGlassStyle,
                        }}
                    >
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,0.25)",
                                overflow: "hidden",
                            }}
                        >
                            {notification.icon ? (
                                <img
                                    src={notification.icon.src}
                                    alt=""
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            ) : (
                                <MessageGlyph size={22} color="#FFFFFF" />
                            )}
                        </div>
                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                fontFamily: "-apple-system, sans-serif",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        letterSpacing: 0.2,
                                        textTransform: "uppercase",
                                        color: "rgba(255,255,255,0.85)",
                                    }}
                                >
                                    {notification.appName || "Messages"}
                                </span>
                                <span
                                    style={{
                                        fontSize: 13,
                                        color: "rgba(255,255,255,0.7)",
                                        flexShrink: 0,
                                    }}
                                >
                                    {notification.timeLabel || "now"}
                                </span>
                            </div>
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    color: "#FFFFFF",
                                }}
                            >
                                {notification.title || "Alex"}
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    color: "rgba(255,255,255,0.85)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                            >
                                {notification.message ||
                                    "Don't forget practice starts at 6!"}
                            </div>
                        </div>
                    </motion.div>
                )}
                {/* Spacer pushes context rows downward */}
                <div style={{ flex: 1 }} />
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
                                    filter: `drop-shadow(0 1px 3px rgba(0,0,0,${glass.shadowOpacity}))`,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    filter: `drop-shadow(0 1px 3px rgba(0,0,0,${glass.shadowOpacity}))`,
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
                                    filter: `drop-shadow(0 1px 3px rgba(0,0,0,${glass.shadowOpacity}))`,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    filter: `drop-shadow(0 1px 3px rgba(0,0,0,${glass.shadowOpacity}))`,
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
                    animate={swipeHintBounce ? { y: [0, -10, 0] } : { y: 0 }}
                    transition={
                        swipeHintBounce
                            ? {
                                  duration: 1.6,
                                  repeat: Infinity,
                                  ease: "easeInOut",
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
                    <ChevronUpGlyph size={24} color={swipeHintColor} />
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

// Default Setup Canvas Configuration
LockScreen.defaultProps = {
    variant: "lockScreen",
    useLiveTime: true,
    use24Hour: false,
    customTime: "9:41",
    timeFont: {
        fontSize: 236,
        lineHeight: "1em",
        letterSpacing: "-2px",
        variant: "Semibold",
    },
    timeColor: "#FFFFFF",
    clockOpacity: 1,
    useLiveDate: true,
    customDate: "Tue 7 Jul",
    dateFont: {
        fontSize: 42,
        lineHeight: "1.2em",
        letterSpacing: "0.3px",
        variant: "Semibold",
    },
    dateColor: "#FFFFFF",
    dateOpacity: 1,
    notification: {
        enabled: true,
        appName: "Messages",
        title: "Alex",
        message: "Don't forget practice starts at 6!",
        timeLabel: "now",
        cornerRadius: 20,
        delaySeconds: 1.1,
    },
    layout: {
        topInset: 110,
        sideInset: 48,
        bottomInset: 140,
        dateTimeGap: 16,
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
        blur: 32,
        saturation: 180,
        shadowY: 14,
        shadowBlur: 36,
        shadowOpacity: 0.25,
        innerHighlight: 0.5,
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
    splash: {
        logoSize: 140,
        logoPlaceholderText: "LOGO",
        animation: "scaleIn",
        backgroundColorA: "#0B0F1A",
        backgroundColorB: "#1B2340",
        showProgressDots: true,
        redirectUrl: "/base-pages/login",
        redirectDelay: 2.5,
    },
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
            letterSpacing: "-2px",
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
        defaultValue: "Tue 7 Jul",
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
    notification: {
        type: ControlType.Object,
        title: "Fake Notification",
        hidden: (p) => p.variant !== "lockScreen",
        controls: {
            enabled: {
                type: ControlType.Boolean,
                title: "Show",
                defaultValue: true,
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
                defaultValue: "Messages",
            },
            title: {
                type: ControlType.String,
                title: "Title",
                defaultValue: "Alex",
            },
            message: {
                type: ControlType.String,
                title: "Message",
                defaultValue: "Don't forget practice starts at 6!",
            },
            timeLabel: {
                type: ControlType.String,
                title: "Time Label",
                defaultValue: "now",
            },
            cornerRadius: {
                type: ControlType.Number,
                title: "Corner Radius",
                defaultValue: 20,
                min: 0,
                max: 40,
                step: 1,
            },
            delaySeconds: {
                type: ControlType.Number,
                title: "Appear Delay (s)",
                defaultValue: 1.1,
                min: 0,
                max: 8,
                step: 0.1,
            },
        },
    },
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
                defaultValue: 32,
                min: 0,
                max: 100,
                step: 1,
            },
            saturation: {
                type: ControlType.Number,
                title: "Saturation",
                defaultValue: 180,
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
    splash: {
        type: ControlType.Object,
        title: "Splash",
        hidden: (p) => p.variant !== "splash",
        controls: {
            logo: {
                type: ControlType.ResponsiveImage,
                title: "Logo",
            },
            logoPlaceholderText: {
                type: ControlType.String,
                title: "Placeholder Text",
                defaultValue: "LOGO",
            },
            logoSize: {
                type: ControlType.Number,
                title: "Logo Size",
                defaultValue: 140,
                min: 40,
                max: 400,
                step: 1,
            },
            animation: {
                type: ControlType.Enum,
                title: "Animation",
                options: ["fade", "scaleIn", "pulse"],
                optionTitles: ["Fade In", "Scale In", "Pulse Loop"],
                defaultValue: "scaleIn",
            },
            backgroundColorA: {
                type: ControlType.Color,
                title: "Background Color A",
                defaultValue: "#0B0F1A",
            },
            backgroundColorB: {
                type: ControlType.Color,
                title: "Background Color B",
                defaultValue: "#1B2340",
            },
            showProgressDots: {
                type: ControlType.Boolean,
                title: "Progress Dots",
                defaultValue: true,
                enabledTitle: "On",
                disabledTitle: "Off",
            },
            redirectUrl: {
                type: ControlType.String,
                title: "Redirect URL",
                defaultValue: "/base-pages/login",
            },
            redirectDelay: {
                type: ControlType.Number,
                title: "Redirect Delay (s)",
                defaultValue: 2.5,
                min: 0.5,
                max: 15,
                step: 0.1,
            },
        },
    },
})
