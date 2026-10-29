import * as React from "react"
import type { ComponentType } from "react"

// ATM lesson Save or Spend?: switches the Save or Spend Lesson component between its variants. Tapping a card picks
// it (its card lights up and Fast-forward a year wakes up), Fast-forward runs that pick's coin race, and the race's
// Pick Again goes back to the cards with the pick kept. The pick is shared between the layers through a tiny store,
// and every visit to the page starts with nothing picked.
//
// Put withLesson on the lesson component's instance on the page, withCardA to withCardD on the four cards and
// withFastForward on the button (inside the component, on the primary variant), and withPickAgain on the Coin Race.

// The component's variant names; rename them here too if they change in Framer.
const CHOOSE = "Variant 1"
const PICKED = {
    A: "Variant 2",
    B: "Variant 3",
    C: "Variant 4",
    D: "Variant 5",
}
const RACE = { A: "Variant 6", B: "Variant 7", C: "Variant 8", D: "Variant 9" }
type Pick = keyof typeof PICKED
type State = { pick: Pick | null; racing: boolean }

let state: State = { pick: null, racing: false }
const listeners = new Set<() => void>()
const set = (next: Partial<State>) => {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => {
        listeners.delete(l)
    }
}
const useLesson = () => React.useSyncExternalStore(subscribe, () => state)

export function withLesson(Component: ComponentType<any>): ComponentType<any> {
    return (props) => {
        const s = useLesson()
        React.useEffect(() => set({ pick: null, racing: false }), [])
        const variant = !s.pick
            ? CHOOSE
            : s.racing
              ? RACE[s.pick]
              : PICKED[s.pick]
        return <Component {...props} variant={variant} />
    }
}

const card =
    (pick: Pick) =>
    (Component: ComponentType<any>): ComponentType<any> =>
    (props) => (
        <Component
            {...props}
            onTap={() => set({ pick, racing: false })}
            style={{ ...props.style, cursor: "pointer" }}
        />
    )

export function withCardA(Component: ComponentType<any>): ComponentType<any> {
    return card("A")(Component)
}
export function withCardB(Component: ComponentType<any>): ComponentType<any> {
    return card("B")(Component)
}
export function withCardC(Component: ComponentType<any>): ComponentType<any> {
    return card("C")(Component)
}
export function withCardD(Component: ComponentType<any>): ComponentType<any> {
    return card("D")(Component)
}

// Does nothing until a card is picked (the button is dimmed then).
export function withFastForward(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props) => {
        const s = useLesson()
        return (
            <Component
                {...props}
                onTap={() => s.pick && set({ racing: true })}
                style={{
                    ...props.style,
                    cursor: s.pick ? "pointer" : "default",
                }}
            />
        )
    }
}

export function withPickAgain(
    Component: ComponentType<any>
): ComponentType<any> {
    return (props) => (
        <Component {...props} onPickAgain={() => set({ racing: false })} />
    )
}
