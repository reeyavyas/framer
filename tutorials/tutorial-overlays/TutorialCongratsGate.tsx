import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TutorialCongratsGate
 *
 * For a DEDICATED congrats page whose "you did it" screen is a
 * custom-built Frame (confetti component + keyframe pulse + card,
 * assembled directly on the canvas) rather than TutorialCongrats.tsx's
 * own built-in look. Drop one instance on that page, set your existing
 * congrats Frame as its "Congrats content" property, and this owns two
 * things on top of it: an auto-redirect timer, and an "X" button to
 * skip the animation early.
 *
 * Getting the user TO this page: nothing here — that's the tutorial
 * step's own job. A TutorialOverlay.tsx step already does real page
 * navigation on its own, two ways: a tap on its real target following
 * whatever link that real element already has (nothing to configure),
 * or its own `autoAdvanceAfterSeconds` + `autoAdvanceLink` for a no-tap
 * "watch this, then move on" beat — set `autoAdvanceLink` to this
 * congrats page's path. No pageGroup/step coordination needed here at
 * all: arriving at this page IS the trigger, unlike the old same-page
 * overlay approach this replaces.
 *
 * Auto-redirect: set `autoRedirectAfterSeconds` and `exitLink`, timed
 * from when the page/this component mounts.
 *
 * Skip button: `showCloseButton` draws a small "X" (same visual
 * convention as TutorialOverlay's own exit button) that jumps straight
 * to `exitLink`, for a user who doesn't want to sit through the
 * animation.
 */

interface Props {
    active: boolean
    content: React.ReactNode // your existing congrats Frame (confetti + pulse + card)
    autoRedirectAfterSeconds: number // 0 = off. Uncapped otherwise.
    exitLink?: string
    showCloseButton: boolean
    accentColor: string
    style?: React.CSSProperties
}

export default function TutorialCongratsGate(props: Props) {
    const {
        active,
        content,
        autoRedirectAfterSeconds,
        exitLink,
        showCloseButton,
        accentColor,
        style,
    } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Timer-driven redirect — independent of any tap, uncapped delay.
    React.useEffect(() => {
        if (!active || !autoRedirectAfterSeconds || !exitLink) return
        const t = setTimeout(
            () => {
                window.location.href = exitLink
            },
            Math.max(autoRedirectAfterSeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [active, autoRedirectAfterSeconds, exitLink])

    if (isCanvas) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    outline: "2px dashed rgba(255,90,90,0.7)",
                    outlineOffset: -2,
                }}
            >
                {content}
            </div>
        )
    }

    if (!active) return null

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 90000,
                overflow: "hidden",
            }}
        >
            {/* Forces "Congrats content" to fill this wrapper even if
                that Frame's own Size is set to Fixed on the canvas —
                without this, a fixed-size Frame keeps its own pixel
                dimensions instead of stretching to the viewport and
                spills past this wrapper's edges. Still fix the source
                Frame's Size to Fill in Framer's own properties panel;
                this is a safety net, not a substitute for that. */}
            <div style={{ width: "100%", height: "100%" }}>{content}</div>

            {showCloseButton && (
                <a
                    href={exitLink || undefined}
                    onClick={(e) => !exitLink && e.preventDefault()}
                    aria-label="Skip animation"
                    style={{
                        position: "fixed",
                        top: 60,
                        left: 40,
                        zIndex: 90500,
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        background: accentColor,
                        color: "#fff",
                        fontSize: 44,
                        lineHeight: "110px",
                        textAlign: "center",
                        textDecoration: "none",
                    }}
                >
                    {"✕"}
                </a>
            )}
        </div>
    )
}

TutorialCongratsGate.defaultProps = {
    active: true,
    autoRedirectAfterSeconds: 5,
    exitLink: "/tutorials",
    showCloseButton: true,
    accentColor: "rgba(5,147,144,1)",
}

addPropertyControls(TutorialCongratsGate, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    content: {
        type: ControlType.ComponentInstance,
        title: "Congrats content",
    },
    autoRedirectAfterSeconds: {
        type: ControlType.Number,
        title: "Auto-redirect (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 5,
        description: "0 = off. Timed from when the page loads.",
    },
    exitLink: {
        type: ControlType.Link,
        title: "Redirect link",
        defaultValue: "/tutorials",
    },
    showCloseButton: {
        type: ControlType.Boolean,
        title: "Skip (X) button",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent color",
        defaultValue: "rgba(5,147,144,1)",
        hidden: (props) => !props.showCloseButton,
    },
})
