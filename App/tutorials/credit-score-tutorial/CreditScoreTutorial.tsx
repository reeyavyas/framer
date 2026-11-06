import * as React from "react"
import type { ComponentType } from "react"
import { isOn, subscribe } from "../../Credit_Score/SimulatorStore.tsx"
import { setGoal } from "../../Credit_Score/GoalStore.tsx"

// Credit Score tutorial (/credit-score-tutorial/score). Overrides that tag
// layers for TutorialOverlay and fire the events its Simulator steps wait
// for. The rows sit in the Section Tabs Tutorial copy, so none of this
// reaches the free-play page. See tutorials/credit-score-tutorial/NOTES.md.

// Must match TutorialOverlay.tsx's SKIP_EVENT.
const SKIP_EVENT = "tutorial-skip"

// The Row ID property of each Simulator row.
const PAY_DOWN_ID = "payDown"
const ON_TIME_ID = "onTime"
const MISSED_ID = "missedPayment"

// GoalSetupCard fires `${target}-done` when a slider is let go.
const SLIDER_EVENTS = ["goal-score-slider-done", "goal-months-slider-done"]

// A tap with a position, for Skip. TutorialOverlay blocks clicks outside
// the step's hole by their coordinates, and el.click() has none.
function tapAt(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
    }
    el.dispatchEvent(new PointerEvent("pointerdown", init))
    el.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }))
    el.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }))
}

// These go on code components (the gauge, the Simulator rows), which don't
// put a data-tutorial-target prop on the page. So a hidden marker tags the
// Framer container it renders in, or `pick` an element inside it (just
// the field of a Simulator row, not its label).
type Pick = (box: Element) => Element | null

function tagged(id: string, Component: ComponentType<any>, pick?: Pick) {
    return React.forwardRef(function Tagged(props: any, ref: any) {
        const marker = React.useRef<HTMLSpanElement>(null)
        React.useLayoutEffect(() => {
            const box = marker.current?.parentElement
            const el = box && (pick ? pick(box) : box)
            el?.setAttribute("data-tutorial-target", id)
            return () => el?.removeAttribute("data-tutorial-target")
        }, [])
        return (
            <>
                <Component {...props} ref={ref} />
                <span ref={marker} hidden />
            </>
        )
    })
}

// An amount row's field: the bordered box with the $0 and its steppers.
const amountField: Pick = (box) =>
    box.querySelector('[role="button"][aria-pressed]')?.parentElement ?? null

// The missed payment row's months (its last radio group).
const monthsField: Pick = (box) => {
    const groups = box.querySelectorAll('[role="radiogroup"]')
    return groups[groups.length - 1] ?? null
}

// The gauge (steps 1–2). Also clears the goal when the tutorial opens (so
// a goal from free play doesn't skip the Goals steps) and when the page is
// left (so the tutorial's goal doesn't show on the free-play page). Skip on
// a slider step just fires that step's event: the slider keeps its value.
export function withCreditScoreTutorialStart(
    Component: ComponentType<any>
): ComponentType<any> {
    const Tagged = tagged("cs-gauge", Component)
    return React.forwardRef(function TutorialStart(props: any, ref: any) {
        React.useEffect(() => {
            setGoal(null)
            function onSkip(e: Event) {
                const event = (e as CustomEvent).detail?.event
                if (!SLIDER_EVENTS.includes(event)) return
                e.preventDefault()
                window.dispatchEvent(new Event(event))
            }
            window.addEventListener(SKIP_EVENT, onSkip)
            return () => {
                window.removeEventListener(SKIP_EVENT, onSkip)
                setGoal(null)
            }
        }, [])
        return <Tagged {...props} ref={ref} />
    })
}

// The Points Journey bar inside Score Rating.
export function PointsJourneyTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return tagged("cs-points-journey", Component)
}

// The Simulator's score header (current and simulated gauges).
export function SimulatedScoreTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return tagged("cs-simulated-score", Component)
}

// The Alerts tab in the Score page's Credit Score Top Nav (on the
// instance, so the free-play nav isn't touched).
export function AlertsTabTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return tagged(
        "cs-alerts-tab",
        Component,
        (box) =>
            Array.from(box.querySelectorAll("a")).find(
                (a) => a.textContent?.trim() === "Alerts"
            ) ?? null
    )
}

// The Alerts page's Alerts Feed instance: tags two of its cards by
// layer name (the feed is shared with the free-play page, so this goes
// on the tutorial page's instance instead of inside the component).
const ALERT_CARDS: [string, string][] = [
    ["Alert Payment History", "cs-alert-payment-history"],
    ["Alert Monitoring 1", "cs-alert-monitoring"],
]

export function AlertsFeedTargets(
    Component: ComponentType<any>
): ComponentType<any> {
    return React.forwardRef(function AlertsFeed(props: any, ref: any) {
        const marker = React.useRef<HTMLSpanElement>(null)
        React.useLayoutEffect(() => {
            const box = marker.current?.parentElement
            const els = ALERT_CARDS.map(([name, id]) => {
                const el = box?.querySelector(`[data-framer-name="${name}"]`)
                el?.setAttribute("data-tutorial-target", id)
                return el
            })
            return () =>
                els.forEach((el) => el?.removeAttribute("data-tutorial-target"))
        }, [])
        return (
            <>
                <Component {...props} ref={ref} />
                <span ref={marker} hidden />
            </>
        )
    })
}

// What Skip taps to put a row in the wanted state (inside its tagged
// field): null when it's already there.
type Tap = (field: Element, wantOn: boolean) => HTMLElement | null

const tapAmount: Tap = (field, wantOn) => {
    const button = field.querySelector<HTMLElement>(
        '[role="button"][aria-pressed]'
    )
    if (!button) return null
    return (button.getAttribute("aria-pressed") === "true") === wantOn
        ? null
        : button
}

// On picks "1 mo", off taps the picked month again.
const tapMonth: Tap = (months, wantOn) => {
    const picked = months.querySelector<HTMLElement>('[aria-checked="true"]')
    if (wantOn) return picked ? null : months.querySelector("[role=radio]")
    return picked
}

// Fires `onEvent` when the row turns on and `offEvent` (if any) when it
// turns off. On Skip for either event, taps the row into that state.
function withRowEvents(
    Component: ComponentType<any>,
    target: string,
    pick: Pick,
    rowId: string,
    onEvent: string,
    offEvent: string,
    tap: Tap
): ComponentType<any> {
    const Tagged = tagged(target, Component, pick)
    return React.forwardRef(function RowEvents(props: any, ref: any) {
        React.useEffect(() => {
            let was = isOn(rowId)
            const unsubscribe = subscribe(() => {
                const now = isOn(rowId)
                if (now === was) return
                was = now
                const name = now ? onEvent : offEvent
                if (name) window.dispatchEvent(new Event(name))
            })
            function onSkip(e: Event) {
                const event = (e as CustomEvent).detail?.event
                if (!event || (event !== onEvent && event !== offEvent)) return
                const field = document.querySelector(
                    `[data-tutorial-target="${target}"]`
                )
                if (!field) return
                e.preventDefault()
                const el = tap(field, event === onEvent)
                // Already in that state: the step only needs its event.
                if (el) tapAt(el)
                else window.dispatchEvent(new Event(event))
            }
            window.addEventListener(SKIP_EVENT, onSkip)
            return () => {
                unsubscribe()
                window.removeEventListener(SKIP_EVENT, onSkip)
            }
        }, [])
        return <Tagged {...props} ref={ref} />
    })
}

// The "Pay down" row: its field.
export function PayDownRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-pay-down",
        amountField,
        PAY_DOWN_ID,
        "cs-tutorial-paid-down",
        "",
        tapAmount
    )
}

// The on-time payments row: its field.
export function OnTimeRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-on-time",
        amountField,
        ON_TIME_ID,
        "cs-tutorial-on-time",
        "",
        tapAmount
    )
}

// The missed payment row: its months, picked and then undone.
export function MissedPaymentRow(
    Component: ComponentType<any>
): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-missed-payment",
        monthsField,
        MISSED_ID,
        "cs-tutorial-missed",
        "cs-tutorial-missed-undone",
        tapMonth
    )
}
