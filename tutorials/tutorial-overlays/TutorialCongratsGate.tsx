import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { getPageStep, subscribePageStep } from "./TutorialOverlay.tsx"

/**
 * TutorialCongratsGate
 *
 * For a tutorial page whose "you did it" screen is a custom-built Frame
 * (confetti component + keyframe pulse + card, assembled directly on the
 * canvas) rather than TutorialCongrats.tsx's own built-in look. This
 * component owns none of that animation — it only decides WHEN the
 * "Congrats content" layer exists in the DOM.
 *
 * That timing matters here specifically because of how a "fires on load"
 * effect (e.g. framer.university's confetti component, which triggers
 * itself as soon as it's visible/mounted, not on a manual re-trigger
 * prop) behaves: if the congrats Frame sat on the page the whole time
 * and this just toggled its CSS visibility, the confetti would already
 * have fired once during the initial page load, long before the user
 * actually finishes the step — and toggling visibility later wouldn't
 * re-fire it. Gating on whether this component RENDERS its `content`
 * prop at all (full unmount when not active, not display:none) means
 * "Congrats content" mounts for the first time exactly when the step
 * finishes, so anything inside it keyed to mount/visibility — the
 * confetti burst, a pulse animation starting from its first frame —
 * runs fresh at the right moment with zero changes to that content.
 *
 * Wiring: give this the same `pageGroup` string as the page's
 * TutorialOverlay step(s) (reads the same shared step counter — see
 * TutorialOverlay.tsx's pageStepState) and set `showAtStep` to one past
 * the last real step. Drop your existing congrats Frame/component onto
 * the canvas as normal, then set it as this component's "Congrats
 * content" property — do not delete or move it into this file.
 *
 * Auto-redirect works the same as TutorialCongrats.tsx: set
 * `autoRedirectAfterSeconds` and `exitLink`, timed from the moment this
 * becomes active (not from page load).
 */

interface Props {
    active: boolean
    pageGroup: string // shared with the page's TutorialOverlay step(s). Blank = just use `active`.
    showAtStep: number // pageGroup's step counter must reach this before showing
    content: React.ReactNode // your existing congrats Frame (confetti + pulse + card)
    autoRedirectAfterSeconds: number // 0 = off. Uncapped otherwise.
    exitLink?: string
    style?: React.CSSProperties
}

export default function TutorialCongratsGate(props: Props) {
    const {
        active,
        pageGroup,
        showAtStep,
        content,
        autoRedirectAfterSeconds,
        exitLink,
        style,
    } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Re-render whenever this page group's shared step counter changes,
    // so this mounts `content` the moment the real step(s) before it hand off.
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
    React.useEffect(() => {
        if (!pageGroup) return
        return subscribePageStep(pageGroup, forceUpdate)
    }, [pageGroup])

    const isActive =
        active && (!pageGroup || getPageStep(pageGroup) >= showAtStep)

    // Timer-driven redirect — independent of any tap, uncapped delay.
    // Keyed off isActive so the clock starts when content actually
    // mounts, not when the page loads.
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

    // Always show the wired-up content on canvas — there's no real step
    // counter to gate on at design time (see TutorialOverlay.tsx's own
    // canvas-mode note for why every instance stays inspectable there).
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

    if (!isActive) return null

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 90000 }}>
            {content}
        </div>
    )
}

TutorialCongratsGate.defaultProps = {
    active: true,
    pageGroup: "",
    showAtStep: 2,
    autoRedirectAfterSeconds: 0,
}

addPropertyControls(TutorialCongratsGate, {
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
    content: {
        type: ControlType.ComponentInstance,
        title: "Congrats content",
    },
    autoRedirectAfterSeconds: {
        type: ControlType.Number,
        title: "Auto-redirect (sec)",
        min: 0,
        step: 0.5,
        defaultValue: 0,
        description: "0 = off. Timed from when this becomes active, not page load.",
    },
    exitLink: {
        type: ControlType.Link,
        title: "Redirect link",
        hidden: (props) => !props.autoRedirectAfterSeconds,
    },
})
