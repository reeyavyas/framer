import * as React from "react"
import { addPropertyControls, RenderTarget } from "framer"
import { Reorder, useDragControls } from "framer-motion"
import {
    getAccountState,
    normalizeOrder,
    sameOrder,
    saveAccountState,
    useAccountStateUpdates,
} from "./AccountOrder.tsx"
import {
    ACCOUNT_LIST_CONTROLS,
    ACCOUNT_LIST_DEFAULTS,
    EyeIcon,
    HandleIcon,
    isEditing,
    resetEditMode,
    startSaveOverlay,
    useEditModeUpdates,
} from "./AccountPreferencesEditMode.tsx"

/**
 * AccountPreferencesList
 *
 * Code Component: the "Internal Accounts" list on the Account
 * Preferences page. Drop it inside the page's Scrollable Content frame,
 * under the "Internal Accounts" heading, set to fill the width with
 * auto height.
 *
 * View mode: one row per account, "Name #1234" only. A hidden account
 * shows at `Hidden opacity`.
 *
 * Edit mode (header shows "Done" — see AccountPreferencesEditMode.tsx):
 * each row gets the eye, a small "Name #1234" label, a display-only
 * name field (the kiosk has no keyboard; nothing is typed), and the ≡
 * drag handle.
 *  - Drag a row by its ≡ handle only, so a swipe anywhere else still
 *    scrolls the page. Letting go in a new spot saves the order and
 *    plays the Saving -> Saved overlay. Letting go where it started
 *    saves nothing.
 *  - Tapping the eye hides/shows that account on the Accounts page (it
 *    turns into an eye with a slash) and also plays the overlay. The
 *    last visible account can't be hidden — its eye does nothing.
 *
 * The saved order and hidden accounts go to AccountOrder.tsx's "base"
 * store (module memory — see that file for why, and for how the
 * Accounts page reads them). The Account Controls tutorial uses its own
 * copy of this component, AccountPreferencesListTutorial.tsx in
 * tutorials/account-controls-tutorial/, which writes the "tutorial"
 * store, so the tutorial never reshuffles the free-play Accounts page.
 *
 * `Accounts`: each entry's id is the account's last four digits, and
 * must match the Accounts page override for that account
 * (withAccount7500 etc. in AccountOrder.tsx). The order here is the
 * default order, before anyone drags.
 *
 * Eye icons: `Eye icon` / `Eye off icon` take your own images (SVG or
 * PNG, e.g. exported from your design) for the shown and hidden states.
 * Leave either blank to use the built-in drawn eye, which follows
 * `Icons` color. Custom images are drawn as-is at `Eye size`.
 *
 * On the canvas nothing is interactive; `Canvas preview` switches
 * between View and Edit so both row styles can be styled.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

type Account = { accountId: string; name: string }

type Props = {
    accounts: Account[]
    canvasPreview: "view" | "edit"
    numberPrefix: string

    viewBackground: string
    editBackground: string
    dividerColor: string
    dividerWidth: number
    textColor: string
    labelColor: string
    fieldBorderColor: string
    fieldBackground: string
    iconColor: string
    eyeImage?: { src: string; srcSet?: string; alt?: string }
    eyeOffImage?: { src: string; srcSet?: string; alt?: string }
    hiddenOpacity: number

    nameFont: React.CSSProperties
    labelFont: React.CSSProperties
    fieldFont: React.CSSProperties

    paddingX: number
    viewPaddingY: number
    editPaddingY: number
    gap: number
    iconSize: number
    handleSize: number
    handleHitPaddingX: number
    handleHitPaddingY: number
    fieldHeight: number
    fieldRadius: number
    fieldPaddingX: number
    labelGap: number

    style?: React.CSSProperties
}

type RowProps = {
    p: Props
    account: Account
    editing: boolean
    hidden: boolean
    isCanvas: boolean
    onToggleHidden: () => void
    onDragEnd: () => void
}

function AccountRow({
    p,
    account,
    editing,
    hidden,
    isCanvas,
    onToggleHidden,
    onDragEnd,
}: RowProps) {
    const dragControls = useDragControls()
    const hitY = Math.min(p.handleHitPaddingY, p.editPaddingY)
    const fullName = `${account.name} ${p.numberPrefix}${account.accountId}`

    return (
        <Reorder.Item
            as="div"
            value={account.accountId}
            dragListener={false}
            dragControls={dragControls}
            // Reorder.Item animates layout changes by default, and a
            // size change is animated with a scale transform, which
            // squashes and stretches the text and icons. "position"
            // only slides rows into their new spots during a drag.
            layout="position"
            onDragEnd={onDragEnd}
            whileDrag={{ zIndex: 2, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}
            style={{
                position: "relative",
                background: editing ? p.editBackground : p.viewBackground,
                borderBottom: `${p.dividerWidth}px solid ${p.dividerColor}`,
            }}
        >
            {editing ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: p.gap,
                        padding: `${p.editPaddingY}px ${p.paddingX}px`,
                    }}
                >
                    <div
                        role="button"
                        aria-label={hidden ? "Show account" : "Hide account"}
                        onClick={isCanvas ? undefined : onToggleHidden}
                        style={{
                            display: "flex",
                            flexShrink: 0,
                            cursor: "pointer",
                        }}
                    >
                        <EyeIcon
                            size={p.iconSize}
                            color={p.iconColor}
                            off={hidden}
                            image={hidden ? p.eyeOffImage : p.eyeImage}
                        />
                    </div>
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: p.labelGap,
                        }}
                    >
                        <div style={{ ...p.labelFont, color: p.labelColor }}>
                            {fullName}
                        </div>
                        <div
                            style={{
                                ...p.fieldFont,
                                color: p.textColor,
                                background: p.fieldBackground,
                                border: `1.5px solid ${p.fieldBorderColor}`,
                                borderRadius: p.fieldRadius,
                                height: p.fieldHeight,
                                padding: `0 ${p.fieldPaddingX}px`,
                                display: "flex",
                                alignItems: "center",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {account.name}
                        </div>
                    </div>
                    <div
                        onPointerDown={(e) => {
                            if (isCanvas) return
                            e.preventDefault()
                            dragControls.start(e)
                        }}
                        style={{
                            display: "flex",
                            flexShrink: 0,
                            // Stops the browser from scrolling instead of
                            // dragging when a touch starts on the handle.
                            touchAction: "none",
                            cursor: "grab",
                            // Invisible tap area around the icon; the
                            // negative margin keeps the icon and the row
                            // layout where they were. Keep the width under
                            // `Icon gap` so it doesn't cover the field. The
                            // height extends into the row's own padding and
                            // stops there, so at most it fills the row top
                            // to bottom and never takes taps from the rows
                            // above or below.
                            // Stretch to the row's full content height (the
                            // label and field are taller than the icon),
                            // with the icon still centered.
                            alignSelf: "stretch",
                            alignItems: "center",
                            padding: `${hitY}px ${p.handleHitPaddingX}px`,
                            margin: `${-hitY}px ${-p.handleHitPaddingX}px`,
                        }}
                    >
                        <HandleIcon size={p.handleSize} color={p.iconColor} />
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        ...p.nameFont,
                        color: p.textColor,
                        padding: `${p.viewPaddingY}px ${p.paddingX}px`,
                        opacity: hidden ? p.hiddenOpacity : 1,
                    }}
                >
                    {fullName}
                </div>
            )}
        </Reorder.Item>
    )
}

export default function AccountPreferencesList(props: Props) {
    const p = { ...defaultProps, ...props }
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEditModeUpdates(!isCanvas)
    useAccountStateUpdates()

    // The page always opens in view mode (see AccountPreferencesEditMode.tsx).
    React.useEffect(() => {
        if (isCanvas) return
        resetEditMode()
        return () => resetEditMode()
    }, [isCanvas])

    const accounts = p.accounts ?? []
    const ids = accounts.map((a) => a.accountId)
    const saved = isCanvas ? { order: null, hidden: [] } : getAccountState("base")
    const savedOrder = normalizeOrder(saved.order, ids)
    const hidden = saved.hidden.filter((id) => ids.includes(id))
    const editing = isCanvas ? p.canvasPreview === "edit" : isEditing()

    // The live order while a drag is in progress; null otherwise.
    const [dragOrder, setDragOrder] = React.useState<string[] | null>(null)
    const dragOrderRef = React.useRef<string[] | null>(null)
    const order = dragOrder ?? savedOrder

    function handleReorder(next: string[]) {
        dragOrderRef.current = next
        setDragOrder(next)
    }

    function handleDragEnd() {
        const final = dragOrderRef.current
        dragOrderRef.current = null
        setDragOrder(null)
        if (!final || sameOrder(final, savedOrder)) return
        saveAccountState("base", final, hidden)
        startSaveOverlay()
    }

    function handleToggleHidden(id: string) {
        const isHidden = hidden.includes(id)
        // At least one account always stays visible.
        if (!isHidden && ids.length - hidden.length <= 1) return
        const nextHidden = isHidden
            ? hidden.filter((h) => h !== id)
            : [...hidden, id]
        saveAccountState("base", savedOrder, nextHidden)
        startSaveOverlay()
    }

    const byId = new Map(accounts.map((a) => [a.accountId, a]))

    return (
        <Reorder.Group
            // A new key on every View/Edit switch mounts fresh rows, so
            // they snap to their new height instead of sliding from the
            // old one over whatever sits below the list (e.g. the
            // "No External Accounts" card when Done is tapped).
            key={editing ? "edit" : "view"}
            as="div"
            axis="y"
            values={order}
            onReorder={handleReorder}
            style={{
                ...p.style,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                margin: 0,
                padding: 0,
            }}
        >
            {order.map((id) => {
                const account = byId.get(id)
                if (!account) return null
                return (
                    <AccountRow
                        key={id}
                        p={p}
                        account={account}
                        editing={editing}
                        hidden={hidden.includes(id)}
                        isCanvas={isCanvas}
                        onToggleHidden={() => handleToggleHidden(id)}
                        onDragEnd={handleDragEnd}
                    />
                )
            })}
        </Reorder.Group>
    )
}

const defaultProps: Omit<Props, "style"> = ACCOUNT_LIST_DEFAULTS

AccountPreferencesList.defaultProps = defaultProps

addPropertyControls(AccountPreferencesList, ACCOUNT_LIST_CONTROLS)
