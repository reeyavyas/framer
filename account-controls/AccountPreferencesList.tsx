import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { Reorder, useDragControls } from "framer-motion"
import {
    getAccountState,
    saveAccountState,
    subscribeAccountState,
} from "./AccountOrder.tsx"
import {
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
    handleHitPadding: number
    fieldHeight: number
    fieldRadius: number
    fieldPaddingX: number
    labelGap: number

    style?: React.CSSProperties
}

// The saved order, minus ids no longer in the list, plus new ids at the
// end — so editing the Accounts control never loses a row.
function normalizeOrder(saved: string[] | null, ids: string[]): string[] {
    if (!saved) return ids
    const kept = saved.filter((id) => ids.includes(id))
    return [...kept, ...ids.filter((id) => !kept.includes(id))]
}

function sameOrder(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((id, i) => id === b[i])
}

function EyeIcon({
    size,
    color,
    off,
    image,
}: {
    size: number
    color: string
    off: boolean
    image?: { src: string; srcSet?: string; alt?: string }
}) {
    // A custom icon from the "Eye icon" / "Eye off icon" controls, if set.
    // It's drawn as-is at Eye size, so "Icons" color doesn't apply to it.
    if (image?.src) {
        return (
            <img
                src={image.src}
                srcSet={image.srcSet}
                alt={image.alt ?? ""}
                draggable={false}
                style={{ width: size, height: size, objectFit: "contain", display: "block" }}
            />
        )
    }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"
                stroke={color}
                strokeWidth={1.8}
                strokeLinejoin="round"
            />
            <circle cx={12} cy={12} r={3.4} fill={color} />
            {off && (
                <line
                    x1={3}
                    y1={3}
                    x2={21}
                    y2={21}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                />
            )}
        </svg>
    )
}

function HandleIcon({ size, color }: { size: number; color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <rect x={3} y={6} width={18} height={2} rx={1} fill={color} />
            <rect x={3} y={11} width={18} height={2} rx={1} fill={color} />
            <rect x={3} y={16} width={18} height={2} rx={1} fill={color} />
        </svg>
    )
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
                            // layout where they were. Keep it under
                            // `Icon gap` so it doesn't cover the field.
                            padding: p.handleHitPadding,
                            margin: -p.handleHitPadding,
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
    const [, forceUpdate] = React.useReducer((n) => n + 1, 0)
    React.useEffect(() => {
        if (isCanvas) return
        const unsubscribe = subscribeAccountState(forceUpdate)
        forceUpdate()
        return unsubscribe
    }, [isCanvas])

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

const defaultProps: Omit<Props, "style"> = {
    accounts: [
        { accountId: "7500", name: "Platinum Rewards Checking" },
        { accountId: "8665", name: "Vertical Checking" },
        { accountId: "5101", name: "Regular Shares" },
        { accountId: "5007", name: "Freddie Mac" },
    ],
    canvasPreview: "view",
    numberPrefix: "#",

    viewBackground: "#FFFFFF",
    editBackground: "#F4F5F7",
    dividerColor: "#DCDEE2",
    dividerWidth: 2,
    textColor: "#333333",
    labelColor: "#444444",
    fieldBorderColor: "#7A7A7A",
    fieldBackground: "rgba(255,255,255,0)",
    iconColor: "#6B6B6B",
    hiddenOpacity: 0.5,

    nameFont: { fontSize: 30 },
    labelFont: { fontSize: 20 },
    fieldFont: { fontSize: 28 },

    paddingX: 40,
    viewPaddingY: 28,
    editPaddingY: 20,
    gap: 24,
    iconSize: 44,
    handleSize: 40,
    handleHitPadding: 16,
    fieldHeight: 64,
    fieldRadius: 2,
    fieldPaddingX: 16,
    labelGap: 8,
}

AccountPreferencesList.defaultProps = defaultProps

addPropertyControls(AccountPreferencesList, {
    accounts: {
        type: ControlType.Array,
        title: "Accounts",
        control: {
            type: ControlType.Object,
            controls: {
                accountId: { type: ControlType.String, title: "Last 4 (id)" },
                name: { type: ControlType.String, title: "Name" },
            },
        },
        defaultValue: defaultProps.accounts,
    },
    canvasPreview: {
        type: ControlType.Enum,
        title: "Canvas preview",
        options: ["view", "edit"],
        optionTitles: ["View", "Edit"],
        defaultValue: "view",
        displaySegmentedControl: true,
    },
    numberPrefix: {
        type: ControlType.String,
        title: "Number prefix",
        defaultValue: "#",
    },

    viewBackground: { type: ControlType.Color, title: "View row fill", defaultValue: defaultProps.viewBackground },
    editBackground: { type: ControlType.Color, title: "Edit row fill", defaultValue: defaultProps.editBackground },
    dividerColor: { type: ControlType.Color, title: "Divider", defaultValue: defaultProps.dividerColor },
    dividerWidth: { type: ControlType.Number, title: "Divider width", min: 0, max: 8, defaultValue: defaultProps.dividerWidth },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: defaultProps.textColor },
    labelColor: { type: ControlType.Color, title: "Label", defaultValue: defaultProps.labelColor },
    fieldBorderColor: { type: ControlType.Color, title: "Field border", defaultValue: defaultProps.fieldBorderColor },
    fieldBackground: { type: ControlType.Color, title: "Field fill", defaultValue: defaultProps.fieldBackground },
    iconColor: { type: ControlType.Color, title: "Icons", defaultValue: defaultProps.iconColor },
    eyeImage: {
        type: ControlType.ResponsiveImage,
        title: "Eye icon",
        description: "Shown account. Blank = built-in eye.",
    },
    eyeOffImage: {
        type: ControlType.ResponsiveImage,
        title: "Eye off icon",
        description: "Hidden account. Blank = built-in crossed eye.",
    },
    hiddenOpacity: { type: ControlType.Number, title: "Hidden opacity", min: 0, max: 1, step: 0.05, defaultValue: defaultProps.hiddenOpacity },

    nameFont: {
        type: ControlType.Font,
        title: "Name font (view)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30 },
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label font (edit)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 20 },
    },
    fieldFont: {
        type: ControlType.Font,
        title: "Field font (edit)",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28 },
    },

    paddingX: { type: ControlType.Number, title: "Side padding", min: 0, max: 120, defaultValue: defaultProps.paddingX },
    viewPaddingY: { type: ControlType.Number, title: "View row padding", min: 0, max: 80, defaultValue: defaultProps.viewPaddingY },
    editPaddingY: { type: ControlType.Number, title: "Edit row padding", min: 0, max: 80, defaultValue: defaultProps.editPaddingY },
    gap: { type: ControlType.Number, title: "Icon gap", min: 0, max: 80, defaultValue: defaultProps.gap },
    iconSize: { type: ControlType.Number, title: "Eye size", min: 12, max: 100, defaultValue: defaultProps.iconSize },
    handleSize: { type: ControlType.Number, title: "Handle size", min: 12, max: 100, defaultValue: defaultProps.handleSize },
    handleHitPadding: { type: ControlType.Number, title: "Handle tap area", min: 0, max: 40, defaultValue: defaultProps.handleHitPadding },
    fieldHeight: { type: ControlType.Number, title: "Field height", min: 20, max: 160, defaultValue: defaultProps.fieldHeight },
    fieldRadius: { type: ControlType.Number, title: "Field radius", min: 0, max: 40, defaultValue: defaultProps.fieldRadius },
    fieldPaddingX: { type: ControlType.Number, title: "Field padding", min: 0, max: 60, defaultValue: defaultProps.fieldPaddingX },
    labelGap: { type: ControlType.Number, title: "Label gap", min: 0, max: 40, defaultValue: defaultProps.labelGap },
})
