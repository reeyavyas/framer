import * as React from "react"
import type { ComponentType } from "react"
import { isOn, subscribe } from "../../Credit_Score/SimulatorStore.tsx"
import { setGoal } from "../../Credit_Score/GoalStore.tsx"

// Credit Score tutorial (/credit-score-tutorial/score). Overrides that fire
// the events its Simulator steps wait for, do Skip's taps, and clear the
// goal. Highlights come from TutorialTargets.tsx (marker frames over these
// code components), not from here. The rows sit in the Section Tabs
// Tutorial copy, so none of this reaches the free-play page. See
// tutorials/credit-score-tutorial/NOTES.md.

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

// Finds a part inside a Simulator row (just its field, not its label).
type Pick = (box: Element) => Element | null

// An amount row's field: the bordered box with the $0 and its steppers.
const amountField: Pick = (box) =>
    box.querySelector('[role="button"][aria-pressed]')?.parentElement ?? null

// The missed payment row's months (its last radio group).
const monthsField: Pick = (box) => {
    const groups = box.querySelectorAll('[role="radiogroup"]')
    return groups[groups.length - 1] ?? null
}

// On the gauge layer (CreditScoreGaugeMarker highlights it). Clears the goal when the tutorial opens (so
// a goal from free play doesn't skip the Goals steps) and when the page is
// left (so the tutorial's goal doesn't show on the free-play page). Skip on
// a slider step just fires that step's event: the slider keeps its value.
export function withCreditScoreTutorialStart(
    Component: ComponentType<any>
): ComponentType<any> {
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
        return <Component {...props} ref={ref} />
    })
}

// No longer used: these tagged code components, which marker frames in
// TutorialTargets.tsx now do. Kept as pass-throughs so a layer still
// carrying one doesn't break; switch its override off when convenient.
export function PointsJourneyTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return Component
}

export function SimulatedScoreTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return Component
}

export function AlertsTabTarget(
    Component: ComponentType<any>
): ComponentType<any> {
    return Component
}

export function AlertsFeedTargets(
    Component: ComponentType<any>
): ComponentType<any> {
    return Component
}

// What Skip taps to put a row in the wanted state (inside its field): null
// when it's already there.
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
    pick: Pick,
    rowId: string,
    onEvent: string,
    offEvent: string,
    tap: Tap
): ComponentType<any> {
    return React.forwardRef(function RowEvents(props: any, ref: any) {
        // A hidden span beside the row, to find the Framer frame it's in.
        const spot = React.useRef<HTMLSpanElement>(null)
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
                const box = spot.current?.parentElement
                const field = box && pick(box)
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
        return (
            <>
                <Component {...props} ref={ref} />
                <span ref={spot} hidden />
            </>
        )
    })
}

// The "Pay down" row (PayDownMarker highlights its field).
export function PayDownRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        amountField,
        PAY_DOWN_ID,
        "cs-tutorial-paid-down",
        "",
        tapAmount
    )
}

// The on-time payments row (OnTimeMarker highlights its field).
export function OnTimeRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        amountField,
        ON_TIME_ID,
        "cs-tutorial-on-time",
        "",
        tapAmount
    )
}

// The missed payment row: its months, picked and then undone
// (MissedPaymentMarker highlights them).
export function MissedPaymentRow(
    Component: ComponentType<any>
): ComponentType<any> {
    return withRowEvents(
        Component,
        monthsField,
        MISSED_ID,
        "cs-tutorial-missed",
        "cs-tutorial-missed-undone",
        tapMonth
    )
}
