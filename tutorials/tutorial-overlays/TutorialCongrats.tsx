import * as React from "react"
import * as ReactDOM from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TutorialCongrats
 *
 * Full-screen finish screen for the end of one tutorial. Drop one
 * instance on each tutorial's last page. Kept separate from
 * TutorialOverlay.tsx on purpose — a finish screen has no hole and no
 * target, so folding it into the per-step overlay's props would add a
 * pile of unused fields to every other page's property panel.
 */

interface Props {
    active: boolean
    icon: string
    title: string
    message: string
    accentColor: string
    exitLabel: string
    exitLink?: string
    style?: React.CSSProperties
}

export default function TutorialCongrats(props: Props) {
    const { active, icon, title, message, accentColor, exitLabel, exitLink, style } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])

    if (!active) return null

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
                </div>
            )}
        </>
    )
}

TutorialCongrats.defaultProps = {
    active: true,
    icon: "👍",
    title: "Congrats!",
    message: "You finished this tutorial.",
    accentColor: "rgba(5,147,144,1)",
    exitLabel: "Done",
}

addPropertyControls(TutorialCongrats, {
    active: {
        type: ControlType.Boolean,
        title: "Active",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
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
    },
})
