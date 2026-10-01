import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, Reorder, useDragControls } from "framer-motion"
import {
    getAccountState,
    saveAccountState,
    subscribeAccountState,
} from "../../Account_Controls/AccountOrder.tsx"
import {
    getSavePhase,
    isEditing,
    isSaving,
    resetEditMode,
    startSaveOverlay,
    subscribeEditMode,
    useEditModeUpdates,
} from "../../Account_Controls/AccountPreferencesEditMode.tsx"

/**
 * AccountPreferencesListTutorial
 *
 * Tutorial copy of account-controls/AccountPreferencesList.tsx, for the
 * Account Controls tutorial's copy of the Account Preferences page.
 * Placed and styled the same way as the base list (same property
 * controls).
 *
 * Framer Code folders: this file lives in Phone Components > Tutorials >
 * Account Controls Tutorial, and imports AccountOrder.tsx and
 * AccountPreferencesEditMode.tsx from the base files' folder, Phone
 * Components > Account Controls ("../../Account_Controls/…"). Moving or
 * renaming either folder in Framer breaks these imports.
 *
 * Differences from the base list:
 *
 *  - Saves to AccountOrder.tsx's "tutorial" store, never "base". The
 *    tutorial's Accounts pages read it (the withAccountNNNN overrides
 *    pick the store from the URL), and AccountControlsTutorialReset.tsx
 *    clears it when the tutorial starts.
 *
 *  - Only the three things the tutorial teaches work, each only in its
 *    turn, in this order:
 *     1. Rename: tapping the `Rename account`'s name field shows a
 *        cursor, erases the old name and types `New name` letter by
 *        letter (the kiosk has no keyboard; nothing is really typed).
 *        Then it saves and plays the Saving -> Saved overlay.
 *     2. Move: the same account's ≡ handle drags. Any drop in a new spot
 *        saves and plays the overlay, as in the real app, but the step
 *        only counts once the account is at the top.
 *     3. Hide: the `Hide account`'s eye hides it and plays the overlay.
 *    Every other eye, handle and field does nothing. Which step is
 *    current comes from the saved state itself (renamed? at the top?
 *    hidden?), so it can't get out of step with what's on screen.
 *
 *  - When each step's overlay has finished (Saved has faded out), it
 *    fires a window event for TutorialOverlay's `Advance on event`:
 *      "account-prefs-renamed", "account-prefs-moved",
 *      "account-prefs-hidden"
 *
 *  - TutorialOverlay's Skip, on a step whose `Advance on event` is one
 *    of those, asks this list to do that step's action instead
 *    ("tutorial-skip" event): the name types itself, the account slides
 *    to the top, or the account hides, then the overlay plays and the
 *    step advances as if the user had done it. If that step is already
 *    done, it advances straight away.
 *
 *  - data-tutorial-target tags for TutorialOverlay's `target`:
 *      "account-prefs-row", "account-prefs-name-field",
 *      "account-prefs-handle" — on the `Rename account`'s row;
 *      "account-prefs-eye" — on the `Hide account`'s eye.
 *    The draggable handle also carries data-tutorial-drag, which tells
 *    TutorialOverlay to let a touch drag that starts on it move the
 *    row instead of scrolling the page.
 *
 * Typing timing: the cursor shows for FOCUS_HOLD_MS, then each old
 * letter erases every `Erase speed` ms, a BETWEEN_MS pause, each new
 * letter types every `Type speed` ms, and an AFTER_TYPING_MS pause
 * before the overlay. With the defaults, "Vertical Checking" ->
 * "Main Checking" takes about 3.5s, plus 2.25s for the overlay.
 *
 * On the canvas nothing is interactive; `Canvas preview` switches
 * between View and Edit so both row styles can be styled.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

// Edit these directly.
const FOCUS_HOLD_MS = 400
const BETWEEN_MS = 300
const AFTER_TYPING_MS = 500

// Must match TutorialOverlay's `Advance on event` on each step.
const RENAMED_EVENT = "account-prefs-renamed"
const MOVED_EVENT = "account-prefs-moved"
const HIDDEN_EVENT = "account-prefs-hidden"
// Fired by TutorialOverlay's Skip (see TutorialOverlay.tsx).
const SKIP_EVENT = "tutorial-skip"

const STORE = "tutorial"

type Account = { accountId: string; name: string }
type Stage = "rename" | "move" | "hide" | "done"

type Props = {
    accounts: Account[]
    canvasPreview: "view" | "edit"
    numberPrefix: string
    renameAccountId: string
    newName: string
    hideAccountId: string
    eraseMs: number
    typeMs: number

    viewBackground: string
    editBackground: string
    dividerColor: string
    dividerWidth: number
    textColor: string
    labelColor: string
    fieldBorderColor: string
    fieldFocusBorderColor: string
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

// A blinking text cursor, the height of the field's text.
function Caret({ color }: { color: string }) {
    return (
        <motion.span
            aria-hidden
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{
                duration: 1,
                times: [0, 0.5, 0.5, 1],
                repeat: Infinity,
            }}
            style={{
                display: "inline-block",
                width: 2,
                height: "1.1em",
                marginLeft: 1,
                background: color,
                flexShrink: 0,
            }}
        />
    )
}

type RowProps = {
    p: Props
    account: Account
    name: string
    // The field's text while the rename types; null otherwise.
    typingText: string | null
    editing: boolean
    hidden: boolean
    isRenameRow: boolean
    isHideRow: boolean
    canDrag: boolean
    isCanvas: boolean
    onFieldTap: () => void
    onEyeTap: () => void
    onDragEnd: () => void
}

function AccountRow({
    p,
    account,
    name,
    typingText,
    editing,
    hidden,
    isRenameRow,
    isHideRow,
    canDrag,
    isCanvas,
    onFieldTap,
    onEyeTap,
    onDragEnd,
}: RowProps) {
    const dragControls = useDragControls()
    const tag = (on: boolean, id: string) =>
        on ? { "data-tutorial-target": id } : {}
    const fullName = `${name} ${p.numberPrefix}${account.accountId}`
    const typing = typingText !== null

    return (
        <Reorder.Item
            as="div"
            value={account.accountId}
            dragListener={false}
            dragControls={dragControls}
            // Reorder.Item animates layout changes by default, and a
            // size change is animated with a scale transform, which
            // squashes and stretches the text and icons. "position"
            // only slides rows into their new spots during a drag, or
            // when Skip moves the account to the top.
            layout="position"
            onDragEnd={onDragEnd}
            whileDrag={{ zIndex: 2, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}
            {...tag(isRenameRow, "account-prefs-row")}
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
                        {...tag(isHideRow, "account-prefs-eye")}
                        role="button"
                        aria-label={hidden ? "Show account" : "Hide account"}
                        onClick={isCanvas ? undefined : onEyeTap}
                        style={{
                            display: "flex",
                            flexShrink: 0,
                            cursor: isHideRow ? "pointer" : "default",
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
                            {...tag(isRenameRow, "account-prefs-name-field")}
                            onClick={
                                isCanvas || !isRenameRow ? undefined : onFieldTap
                            }
                            style={{
                                ...p.fieldFont,
                                color: p.textColor,
                                background: p.fieldBackground,
                                border: `1.5px solid ${
                                    typing ? p.fieldFocusBorderColor : p.fieldBorderColor
                                }`,
                                borderRadius: p.fieldRadius,
                                height: p.fieldHeight,
                                padding: `0 ${p.fieldPaddingX}px`,
                                display: "flex",
                                alignItems: "center",
                                overflow: "hidden",
                                whiteSpace: "pre",
                                cursor: isRenameRow ? "pointer" : "default",
                            }}
                        >
                            {typing ? typingText : name}
                            {typing && <Caret color={p.textColor} />}
                        </div>
                    </div>
                    <div
                        {...tag(isRenameRow, "account-prefs-handle")}
                        {...(isRenameRow ? { "data-tutorial-drag": "" } : {})}
                        onPointerDown={(e) => {
                            if (isCanvas || !canDrag) return
                            e.preventDefault()
                            dragControls.start(e)
                        }}
                        style={{
                            display: "flex",
                            flexShrink: 0,
                            // Stops the browser from scrolling instead of
                            // dragging when a touch starts on the handle.
                            touchAction: isRenameRow ? "none" : undefined,
                            cursor: canDrag ? "grab" : "default",
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

export default function AccountPreferencesListTutorial(props: Props) {
    const p = { ...defaultProps, ...props }
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEditModeUpdates(!isCanvas)
    const [, forceUpdate] = React.useReducer((n: number) => n + 1, 0)
    React.useEffect(() => {
        if (isCanvas) return
        const unsubscribe = subscribeAccountState(forceUpdate)
        forceUpdate()
        return unsubscribe
    }, [isCanvas])

    // The step event waiting for the overlay to finish; fired once
    // Saved has faded out. Subscribed before the reset below, so on
    // unmount it unsubscribes first and the reset can't fire it.
    const pendingEventRef = React.useRef<string | null>(null)
    React.useEffect(() => {
        if (isCanvas) return
        const unsubscribe = subscribeEditMode(() => {
            const pending = pendingEventRef.current
            if (!pending || getSavePhase() !== "hidden") return
            pendingEventRef.current = null
            window.dispatchEvent(new Event(pending))
        })
        return () => {
            unsubscribe()
            pendingEventRef.current = null
        }
    }, [isCanvas])

    // The page always opens in view mode (see AccountPreferencesEditMode.tsx).
    React.useEffect(() => {
        if (isCanvas) return
        resetEditMode()
        return () => resetEditMode()
    }, [isCanvas])

    const accounts = p.accounts ?? []
    const ids = accounts.map((a) => a.accountId)
    const saved = isCanvas
        ? { order: null, hidden: [] as string[], names: {} as Record<string, string> }
        : getAccountState(STORE)
    const savedOrder = normalizeOrder(saved.order, ids)
    const hidden = saved.hidden.filter((id) => ids.includes(id))
    const editing = isCanvas ? p.canvasPreview === "edit" : isEditing()

    const renamed = saved.names[p.renameAccountId] !== undefined
    const moved = savedOrder[0] === p.renameAccountId
    const isHidden = hidden.includes(p.hideAccountId)
    const stage: Stage = !renamed
        ? "rename"
        : !moved
          ? "move"
          : !isHidden
            ? "hide"
            : "done"

    // The live order while a drag is in progress; null otherwise.
    const [dragOrder, setDragOrder] = React.useState<string[] | null>(null)
    const dragOrderRef = React.useRef<string[] | null>(null)
    const order = dragOrder ?? savedOrder

    // The field's text while the rename types; null otherwise.
    const [typingText, setTypingText] = React.useState<string | null>(null)
    const typingTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([])
    React.useEffect(
        () => () => typingTimersRef.current.forEach((t) => clearTimeout(t)),
        []
    )

    const byId = new Map(accounts.map((a) => [a.accountId, a]))
    const nameOf = (id: string) => saved.names[id] ?? byId.get(id)?.name ?? ""

    function saveThenSignal(eventName: string | null) {
        pendingEventRef.current = eventName
        startSaveOverlay()
    }

    // Each step's action reads the store at the moment it runs, not this
    // render's copy, since the rename commits after a delay.
    function current() {
        const state = getAccountState(STORE)
        return {
            order: normalizeOrder(state.order, ids),
            hidden: state.hidden,
            names: state.names,
        }
    }

    function startRename() {
        if (typingTimersRef.current.length > 0) return
        const from = nameOf(p.renameAccountId)
        const to = p.newName
        const frames: [number, string][] = []
        let at = FOCUS_HOLD_MS
        for (let i = from.length - 1; i >= 0; i--) {
            at += p.eraseMs
            frames.push([at, from.slice(0, i)])
        }
        at += BETWEEN_MS
        for (let i = 1; i <= to.length; i++) {
            at += p.typeMs
            frames.push([at, to.slice(0, i)])
        }
        at += AFTER_TYPING_MS

        setTypingText(from)
        const timers = frames.map(([delay, text]) =>
            setTimeout(() => setTypingText(text), delay)
        )
        timers.push(
            setTimeout(() => {
                typingTimersRef.current = []
                setTypingText(null)
                const state = current()
                saveAccountState(STORE, state.order, state.hidden, {
                    ...state.names,
                    [p.renameAccountId]: to,
                })
                saveThenSignal(RENAMED_EVENT)
            }, at)
        )
        typingTimersRef.current = timers
    }

    function moveToTop() {
        const state = current()
        const next = [
            p.renameAccountId,
            ...state.order.filter((id) => id !== p.renameAccountId),
        ]
        saveAccountState(STORE, next, state.hidden)
        saveThenSignal(MOVED_EVENT)
    }

    function hideAccount() {
        const state = current()
        saveAccountState(STORE, state.order, [...state.hidden, p.hideAccountId])
        saveThenSignal(HIDDEN_EVENT)
    }

    function handleFieldTap() {
        if (stage !== "rename" || isSaving()) return
        startRename()
    }

    function handleEyeTap(id: string) {
        if (id !== p.hideAccountId || stage !== "hide" || isSaving()) return
        hideAccount()
    }

    function handleReorder(next: string[]) {
        dragOrderRef.current = next
        setDragOrder(next)
    }

    function handleDragEnd() {
        const final = dragOrderRef.current
        dragOrderRef.current = null
        setDragOrder(null)
        if (!final || sameOrder(final, savedOrder)) return
        // Any new spot saves, as in the real app; only the top counts.
        saveAccountState(STORE, final, hidden)
        saveThenSignal(final[0] === p.renameAccountId ? MOVED_EVENT : null)
    }

    // TutorialOverlay's Skip: do the step's action for the user. A step
    // already done advances straight away; a rename already typing just
    // carries on.
    function handleSkip(eventName: string) {
        if (eventName === RENAMED_EVENT) {
            if (renamed) window.dispatchEvent(new Event(RENAMED_EVENT))
            else startRename()
        } else if (eventName === MOVED_EVENT) {
            if (moved) window.dispatchEvent(new Event(MOVED_EVENT))
            else moveToTop()
        } else if (eventName === HIDDEN_EVENT) {
            if (isHidden) window.dispatchEvent(new Event(HIDDEN_EVENT))
            else hideAccount()
        }
    }
    const handleSkipRef = React.useRef(handleSkip)
    handleSkipRef.current = handleSkip
    React.useEffect(() => {
        if (isCanvas) return
        function onSkip(e: Event) {
            const eventName = (e as CustomEvent).detail?.event
            if (
                eventName !== RENAMED_EVENT &&
                eventName !== MOVED_EVENT &&
                eventName !== HIDDEN_EVENT
            )
                return
            // Tells TutorialOverlay this list handles the skip.
            e.preventDefault()
            handleSkipRef.current(eventName)
        }
        window.addEventListener(SKIP_EVENT, onSkip)
        return () => window.removeEventListener(SKIP_EVENT, onSkip)
    }, [isCanvas])

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
                const isRenameRow = id === p.renameAccountId
                return (
                    <AccountRow
                        key={id}
                        p={p}
                        account={account}
                        name={nameOf(id)}
                        typingText={isRenameRow ? typingText : null}
                        editing={editing}
                        hidden={hidden.includes(id)}
                        isRenameRow={isRenameRow}
                        isHideRow={id === p.hideAccountId}
                        canDrag={isRenameRow && stage === "move"}
                        isCanvas={isCanvas}
                        onFieldTap={handleFieldTap}
                        onEyeTap={() => handleEyeTap(id)}
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
    renameAccountId: "8665",
    newName: "Main Checking",
    hideAccountId: "7500",
    eraseMs: 50,
    typeMs: 110,

    viewBackground: "#FFFFFF",
    editBackground: "#F4F5F7",
    dividerColor: "#DCDEE2",
    dividerWidth: 2,
    textColor: "#333333",
    labelColor: "#444444",
    fieldBorderColor: "#7A7A7A",
    fieldFocusBorderColor: "#7A7A7A",
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
    fieldHeight: 64,
    fieldRadius: 2,
    fieldPaddingX: 16,
    labelGap: 8,
}

AccountPreferencesListTutorial.defaultProps = defaultProps

addPropertyControls(AccountPreferencesListTutorial, {
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
    renameAccountId: {
        type: ControlType.String,
        title: "Rename account",
        description: "Id of the account renamed, then dragged to the top.",
        defaultValue: defaultProps.renameAccountId,
    },
    newName: {
        type: ControlType.String,
        title: "New name",
        defaultValue: defaultProps.newName,
    },
    hideAccountId: {
        type: ControlType.String,
        title: "Hide account",
        description: "Id of the account hidden with the eye.",
        defaultValue: defaultProps.hideAccountId,
    },
    eraseMs: { type: ControlType.Number, title: "Erase speed", unit: "ms", min: 10, max: 500, defaultValue: defaultProps.eraseMs },
    typeMs: { type: ControlType.Number, title: "Type speed", unit: "ms", min: 10, max: 500, defaultValue: defaultProps.typeMs },

    viewBackground: { type: ControlType.Color, title: "View row fill", defaultValue: defaultProps.viewBackground },
    editBackground: { type: ControlType.Color, title: "Edit row fill", defaultValue: defaultProps.editBackground },
    dividerColor: { type: ControlType.Color, title: "Divider", defaultValue: defaultProps.dividerColor },
    dividerWidth: { type: ControlType.Number, title: "Divider width", min: 0, max: 8, defaultValue: defaultProps.dividerWidth },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: defaultProps.textColor },
    labelColor: { type: ControlType.Color, title: "Label", defaultValue: defaultProps.labelColor },
    fieldBorderColor: { type: ControlType.Color, title: "Field border", defaultValue: defaultProps.fieldBorderColor },
    fieldFocusBorderColor: { type: ControlType.Color, title: "Field typing border", defaultValue: defaultProps.fieldFocusBorderColor },
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
    fieldHeight: { type: ControlType.Number, title: "Field height", min: 20, max: 160, defaultValue: defaultProps.fieldHeight },
    fieldRadius: { type: ControlType.Number, title: "Field radius", min: 0, max: 40, defaultValue: defaultProps.fieldRadius },
    fieldPaddingX: { type: ControlType.Number, title: "Field padding", min: 0, max: 60, defaultValue: defaultProps.fieldPaddingX },
    labelGap: { type: ControlType.Number, title: "Label gap", min: 0, max: 40, defaultValue: defaultProps.labelGap },
})
