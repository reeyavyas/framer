import * as React from "react"
import * as ReactDOM from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { getPageStep, subscribePageStep } from "./PageStepState.tsx"

/**
 * TutorialCongrats
 *
 * Full-screen finish screen for the end of one tutorial. Drop one
 * instance on each tutorial's last page. Kept separate from
 * TutorialOverlay.tsx on purpose — a finish screen has no hole and no
 * target, so folding it into the per-step overlay's props would add a
 * pile of unused fields to every other page's property panel.
 *
 * Showing itself automatically once the page's real step(s) are done:
 * give this the same `pageGroup` string as the TutorialOverlay step(s)
 * on the page, and set `showAtStep` to one past the last real step
 * (e.g. a single-step page leaves TutorialOverlay's own `stepNumber` at
 * its default of 1, so `showAtStep` here is 2). This reads the same
 * shared step counter TutorialOverlay's instances hand off between
 * themselves (see PageStepState.tsx) rather than owning a separate one,
 * so there's nothing to keep in sync by hand. Leave `pageGroup` blank
 * to fall back to the plain `active` boolean instead (e.g. a page with
 * no card step at all before the congrats screen).
 *
 * Auto-redirecting after it shows: set `autoRedirectAfterSeconds` and
 * `exitLink` — no tap needed, same "uncapped timer" convention as
 * TutorialOverlay's own auto-advance. Leave it at 0 to require the
 * exit button tap instead.
 */

interface Props {
    active: boolean
    pageGroup: string // shared with the page's TutorialOverlay step(s). Blank = just use `active`.
    showAtStep: number // pageGroup's step counter must reach this before showing
    icon: string
    title: string
    message: string
    accentColor: string
    exitLabel: string
    exitLink?: string
    autoRedirectAfterSeconds: number // 0 = off. Uncapped otherwise. Redirects to exitLink with no tap.
    style?: React.CSSProperties
}

export default function TutorialCongrats(props: Props) {
    const {
        active,
        pageGroup,
        showAtStep,
        icon,
        title,
        message,
        accentColor,
        exitLabel,
        exitLink,
        autoRedirectAfterSeconds,
        style,
    } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    // Re-render whenever this page group's shared step counter changes,
    // so this becomes active the moment the real step(s) before it hand off.
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
    React.useEffect(() => {
        if (!pageGroup) return
        return subscribePageStep(pageGroup, forceUpdate)
    }, [pageGroup])

    const isActive =
        active && (!pageGroup || getPageStep(pageGroup) >= showAtStep)

    // Timer-driven redirect — independent of any tap, uncapped delay.
    // Keyed off isActive (not the raw `active` prop) so the clock starts
    // when the screen actually appears, not when the page loads.
    React.useEffect(() => {
        if (!isActive || !autoRedirectAfterSeconds || !exitLink) return
        const t = setTimeout(
            () => {
                window.location.href = exitLink
            },
            Math.max(autoRedirectAfterSeconds, 0) * 1000
        )
        return () => clearTimeout(t)
    }, [isActive, autoRedirectAfterSeconds, exitLink])

    if (!isActive) return null

    const content = (
        <AnimatePresence>
            <motion.div
                key="congrats"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 90000,
                    background: "rgba(8,10,20,0.9)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 20,
                    color: "#fff",
                }}
            >
                <div style={{ fontSize: 120, pointerEvents: "none" }}>{icon}</div>
                <div style={{ fontSize: 56, fontWeight: 800, pointerEvents: "none" }}>{title}</div>
                <div style={{ fontSize: 26, opacity: 0.85, pointerEvents: "none" }}>{message}</div>
                <a
                    href={exitLink || undefined}
                    onClick={(e) => !exitLink && e.preventDefault()}
                    style={{
                        marginTop: 20,
                        padding: "16px 48px",
                        borderRadius: 999,
                        background: accentColor,
                        color: "#fff",
                        fontSize: 32,
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    {exitLabel}
                </a>
            </motion.div>
        </AnimatePresence>
    )

    return (
        <>
            {mounted && !isCanvas && ReactDOM.createPortal(content, document.body)}
            {isCanvas && (
                <div
                    style={{
                        ...style,
                        position: "absolute",
                        inset: 0,
                        border: "2px dashed rgba(255,90,90,0.7)",
                        background: "rgba(255,90,90,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "rgba(200,50,50,0.9)",
                        textAlign: "center",
                        padding: 4,
                    }}
                >
                    Congrats screen
                    <br />
                    (renders full-screen in Preview)
                    {pageGroup && (
                        <>
                            <br />
                            {pageGroup} → step {showAtStep}
                        </>
                    )}
                </div>
            )}
        </>
    )
}

TutorialCongrats.defaultProps = {
    active: true,
    pageGroup: "",
    showAtStep: 2,
    icon: "👍",
    title: "Congrats!",
    message: "You finished this tutorial.",
    accentColor: "rgba(5,147,144,1)",
    exitLabel: "Done",
    exitLink: "/tutorials",
    autoRedirectAfterSeconds: 0,
}

addPropertyControls(TutorialCongrats, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    pageGroup: {
        type: ControlType.String,
        title: "Page group",
        defaultValue: "",
        placeholder: "blank = just use Active",
    },
    showAtStep: {
        type: ControlType.Number,
        title: "Show at step",
        min: 1,
        step: 1,
        defaultValue: 2,
        hidden: (props) => !props.pageGroup,
    },
    icon: {
        type: ControlType.String,
        title: "Icon",
        defaultValue: "👍",
    },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Congrats!",
    },
    message: {
        type: ControlType.String,
        title: "Message",
        defaultValue: "You finished this tutorial.",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent color",
        defaultValue: "rgba(5,147,144,1)",
    },
    exitLabel: {
        type: ControlType.String,
        title: "Button label",
        defaultValue: "Done",
    },
    exitLink: {
        type: ControlType.Link,
        title: "Exit link",
        defaultValue: "/tutorials",
    },
    autoRedirectAfterSeconds: {
        type: ControlType.Number,
        title: "Auto-redirect (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
        description: "0 = off, requires the exit button tap instead. Uses Exit link above.",
    },
})
