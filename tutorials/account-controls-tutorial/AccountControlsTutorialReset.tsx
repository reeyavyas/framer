import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
import { resetAccountState } from "./AccountOrder.tsx"

/**
 * AccountControlsTutorialReset
 *
 * Code Override: withAccountControlsTutorialReset. Apply it to any one
 * layer on the tutorial's first page,
 * /account-controls-tutorial/accounts-1 (e.g. the page's scroll
 * content). When that page opens it clears AccountOrder.tsx's
 * "tutorial" store — order, hidden accounts and the new name — so
 * someone who runs the tutorial twice without a reload starts from the
 * default order again. The free-play "base" store is untouched.
 *
 * A reload already resets everything (module memory), so this only
 * matters for a second run in the same session.
 *
 * In Framer, AccountOrder.tsx sits next to this file in the Code panel,
 * so it's imported as "./AccountOrder.tsx" even though this repo keeps
 * it in account-controls/.
 *
 * Runs in a layout effect, before the page paints, so the Accounts
 * frames never show the previous run's order. On the canvas it's inert.
 */

// useLayoutEffect warns during server rendering; there's nothing to
// reset there anyway.
const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

export function withAccountControlsTutorialReset(
    Component: ComponentType<any>
): ComponentType<any> {
    return function AccountControlsTutorialReset(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        useIsomorphicLayoutEffect(() => {
            if (isCanvas) return
            resetAccountState("tutorial")
        }, [isCanvas])
        return <Component {...props} />
    }
}
