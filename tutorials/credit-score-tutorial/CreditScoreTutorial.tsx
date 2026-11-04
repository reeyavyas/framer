import * as React from "react"
import type { ComponentType } from "react"
import { isOn, subscribe } from "../../Credit_Score/SimulatorStore.tsx"
import {
    getGoal,
    setGoal,
    subscribe as subscribeGoal,
} from "../../Credit_Score/GoalStore.tsx"

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

// Step 18 waits for this, fired once the goal form's Next saves a goal.
const GOAL_SET_EVENT = "cs-tutorial-goal-set"

// These go on code components (the gauge, the Simulator rows), which don't
// put a data-tutorial-target prop on the page. So a hidden marker tags the
// Framer container it renders in, which has the component's size.
function tagged(id: string, Component: ComponentType<any>) {
    return React.forwardRef(function Tagged(props: any, ref: any) {
        const marker = React.useRef<HTMLSpanElement>(null)
        React.useLayoutEffect(() => {
            const box = marker.current?.parentElement
            box?.setAttribute("data-tutorial-target", id)
            return () => box?.removeAttribute("data-tutorial-target")
        }, [])
        return (
            <>
                <Component {...props} ref={ref} />
                <span ref={marker} hidden />
            </>
        )
    })
}

// Steps 1–2 — the gauge. Also clears the goal when the tutorial opens (so
// a goal from free play doesn't skip the Goals steps) and when the page is
// left (so the tutorial's goal doesn't show on the free-play page), and
// fires step 18's event when a goal is set. Skip on step 18 taps Next.
export function withCreditScoreTutorialStart(
    Component: ComponentType<any>
): ComponentType<any> {
    const Tagged = tagged("cs-gauge", Component)
    return React.forwardRef(function TutorialStart(props: any, ref: any) {
        React.useEffect(() => {
            setGoal(null)
            const unsubscribe = subscribeGoal(() => {
                if (getGoal()) window.dispatchEvent(new Event(GOAL_SET_EVENT))
            })
            function onSkip(e: Event) {
                if ((e as CustomEvent).detail?.event !== GOAL_SET_EVENT) return
                const next = document.querySelector<HTMLElement>(
                    '[data-tutorial-target="goal-setup-next"]'
                )
                if (!next) return
                e.preventDefault()
                next.click()
            }
            window.addEventListener(SKIP_EVENT, onSkip)
            return () => {
                unsubscribe()
                window.removeEventListener(SKIP_EVENT, onSkip)
                setGoal(null)
            }
        }, [])
        return <Tagged {...props} ref={ref} />
    })
}

// What Skip taps to put a row in the wanted state: null when it's already
// there.
type Tap = (row: Element, wantOn: boolean) => HTMLElement | null

const tapAmount: Tap = (row, wantOn) => {
    const field = row.querySelector<HTMLElement>(
        '[role="button"][aria-pressed]'
    )
    if (!field) return null
    return (field.getAttribute("aria-pressed") === "true") === wantOn
        ? null
        : field
}

// The months are the row's last radio group; on picks "1 mo", off taps the
// picked month again.
const tapMonth: Tap = (row, wantOn) => {
    const groups = row.querySelectorAll('[role="radiogroup"]')
    const months = groups[groups.length - 1]
    if (!months) return null
    const picked = months.querySelector<HTMLElement>('[aria-checked="true"]')
    if (wantOn) return picked ? null : months.querySelector("[role=radio]")
    return picked
}

// Fires `onEvent` when the row turns on and `offEvent` (if any) when it
// turns off. On Skip for either event, taps the row into that state.
function withRowEvents(
    Component: ComponentType<any>,
    target: string,
    rowId: string,
    onEvent: string,
    offEvent: string,
    tap: Tap
): ComponentType<any> {
    const Tagged = tagged(target, Component)
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
                const row = document.querySelector(
                    `[data-tutorial-target="${target}"]`
                )
                if (!row) return
                e.preventDefault()
                const el = tap(row, event === onEvent)
                // Already in that state: the step only needs its event.
                if (el) el.click()
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

// Step 12 — the "Pay down" row.
export function PayDownRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-pay-down",
        PAY_DOWN_ID,
        "cs-tutorial-paid-down",
        "",
        tapAmount
    )
}

// Step 13 — the on-time payments row.
export function OnTimeRow(Component: ComponentType<any>): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-on-time",
        ON_TIME_ID,
        "cs-tutorial-on-time",
        "",
        tapAmount
    )
}

// Steps 14–15 — the missed payment row: picking a month, then undoing it.
export function MissedPaymentRow(
    Component: ComponentType<any>
): ComponentType<any> {
    return withRowEvents(
        Component,
        "cs-missed-payment",
        MISSED_ID,
        "cs-tutorial-missed",
        "cs-tutorial-missed-undone",
        tapMonth
    )
}
