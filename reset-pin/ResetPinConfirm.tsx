import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * ResetPinConfirm
 *
 * One Code Override for the Reset PIN page's Confirm button (right
 * panel -> Code -> Override -> this file):
 *
 *  - withResetPinConfirm — apply to the Confirm button's own frame, on
 *    EITHER Reset PIN page (the base page or its tutorial copy). Tapping
 *    it leaves the one-shot toast flag ResetPinToast.tsx reads on Card
 *    Controls. It does NOT navigate: give the Confirm layer a native
 *    Framer Link in the Properties panel instead — the base page's
 *    Confirm to the base Card Controls page, the tutorial copy's
 *    Confirm to the tutorial copy of Card Controls.
 *
 * Why a native Link here, when CardAlertsSave.tsx had to remove its
 * own: that Save button has a disabled state and a "Saving..." delay,
 * and a native Link navigates on tap regardless of either. Confirm has
 * neither — the PIN fields are display-only placeholders ("····"), so
 * it's always enabled and goes straight back to Card Controls. That
 * leaves the flag as this override's only job, and lets the same export
 * serve both pages, each with its own destination set on its Link —
 * no tutorial copy of this file needed.
 *
 * Chains any existing props.onClick rather than replacing it, and never
 * calls preventDefault(), so the native Link is left free to navigate.
 * The flag write is synchronous, so it's stored before the next page
 * renders.
 *
 * On the canvas the override is inert.
 */

// Must match ResetPinToast.tsx's STORAGE_TOAST_FLAG_KEY.
const STORAGE_TOAST_FLAG_KEY = "kioskResetPinToastFlag"

export function withResetPinConfirm(
    Component: ComponentType<any>
): ComponentType<any> {
    return function ResetPinConfirm(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={(e: React.MouseEvent) => {
                    window.sessionStorage.setItem(STORAGE_TOAST_FLAG_KEY, "1")
                    props.onClick?.(e)
                }}
            />
        )
    }
}
