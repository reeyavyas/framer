import * as React from "react"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
    type PropertyControls,
} from "framer"
import { motion, Reorder, useDragControls } from "framer-motion"
import {
    getAccountState,
    normalizeOrder,
    sameOrder,
    saveAccountState,
    useAccountStateUpdates,
} from "../../Account_Controls/AccountOrder.tsx"
import {
    ACCOUNT_LIST_CONTROLS,
    ACCOUNT_LIST_DEFAULTS,
    cancelSaveOverlay,
    EyeIcon,
    getSavePhase,
    HandleIcon,
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
 *        only counts once the account is at the top. With `Only drag up`
 *        on, it can't move down at all, not even back to a spot it just
 *        passed.
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
 *    ("tutorial-skip" event): the account is renamed, moved to the top,
 *    or hidden at once, and the step advances straight away. Skip never
 *    waits: typing stops, and a save overlay that's showing is dropped.
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
    onlyDragUp: boolean
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
    handleHitPaddingX: number
    handleHitPaddingY: number
    eyeHitPaddingX: number
    eyeHitPaddingY: number
    fieldHeight: number
    fieldRadius: number
    fieldPaddingX: number
    labelGap: number

    style?: React.CSSProperties
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
    const hitY = Math.min(p.handleHitPaddingY, p.editPaddingY)
    const eyeHitY = Math.min(p.eyeHitPaddingY, p.editPaddingY)
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
            // `Only drag up`: no movement below the row's current slot.
            // The limit is measured from wherever the row sits now, so
            // once it swaps up a slot it can't come back down either.
            {...(isRenameRow && p.onlyDragUp
                ? { dragConstraints: { bottom: 0 }, dragElastic: 0 }
                : {})}
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
                            // Invisible tap area, as on the ≡ handle: the
                            // full row height, plus `Eye tap width` on each
                            // side (keep it under `Icon gap`), without
                            // moving the icon. The tutorial's highlight on
                            // "account-prefs-eye" grows with it.
                            alignSelf: "stretch",
                            alignItems: "center",
                            padding: `${eyeHitY}px ${p.eyeHitPaddingX}px`,
                            margin: `${-eyeHitY}px ${-p.eyeHitPaddingX}px`,
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

export default function AccountPreferencesListTutorial(props: Props) {
    const p = { ...defaultProps, ...props }
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEditModeUpdates(!isCanvas)
    useAccountStateUpdates()

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
                applyRename()
                saveThenSignal(RENAMED_EVENT)
            }, at)
        )
        typingTimersRef.current = timers
    }

    // Each step's change to the store, without the overlay or event.
    function applyRename() {
        const state = current()
        saveAccountState(STORE, state.order, state.hidden, {
            ...state.names,
            [p.renameAccountId]: p.newName,
        })
    }

    function applyMove() {
        const state = current()
        const next = [
            p.renameAccountId,
            ...state.order.filter((id) => id !== p.renameAccountId),
        ]
        saveAccountState(STORE, next, state.hidden)
    }

    function applyHide() {
        const state = current()
        saveAccountState(STORE, state.order, [...state.hidden, p.hideAccountId])
    }

    function handleFieldTap() {
        if (stage !== "rename" || isSaving()) return
        startRename()
    }

    function handleEyeTap(id: string) {
        if (id !== p.hideAccountId || stage !== "hide" || isSaving()) return
        applyHide()
        saveThenSignal(HIDDEN_EVENT)
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

    // TutorialOverlay's Skip: do the step's action for the user and move
    // on at once. Any typing stops, and a save overlay that's showing is
    // dropped rather than waited out, so Skip never waits on either. The
    // pending event is cleared so it can't fire a second time. A drag in
    // progress is dropped too, so its drag end can't save the old drag
    // order over Skip's result.
    function handleSkip(eventName: string) {
        typingTimersRef.current.forEach((t) => clearTimeout(t))
        typingTimersRef.current = []
        setTypingText(null)
        dragOrderRef.current = null
        setDragOrder(null)
        const state = current()
        if (eventName === RENAMED_EVENT) {
            if (state.names[p.renameAccountId] === undefined) applyRename()
        } else if (eventName === MOVED_EVENT) {
            if (state.order[0] !== p.renameAccountId) applyMove()
        } else if (eventName === HIDDEN_EVENT) {
            if (!state.hidden.includes(p.hideAccountId)) applyHide()
        }
        pendingEventRef.current = null
        cancelSaveOverlay()
        window.dispatchEvent(new Event(eventName))
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

// The base list's defaults, plus the tutorial's own.
const defaultProps: Omit<Props, "style"> = {
    ...ACCOUNT_LIST_DEFAULTS,
    renameAccountId: "8665",
    onlyDragUp: true,
    newName: "Main Checking",
    hideAccountId: "7500",
    eraseMs: 50,
    typeMs: 110,
    fieldFocusBorderColor: "#7A7A7A",
    eyeHitPaddingX: 16,
    eyeHitPaddingY: 20,
}

AccountPreferencesListTutorial.defaultProps = defaultProps

// The tutorial's own controls, keyed by the base control they follow in
// the Properties panel.
const TUTORIAL_CONTROLS_AFTER: Record<string, PropertyControls> = {
    numberPrefix: {
        renameAccountId: {
            type: ControlType.String,
            title: "Rename account",
            description: "Id of the account renamed, then dragged to the top.",
            defaultValue: defaultProps.renameAccountId,
        },
        onlyDragUp: {
            type: ControlType.Boolean,
            title: "Only drag up",
            description: "The account can't be dragged down, even back to a spot it just left.",
            defaultValue: defaultProps.onlyDragUp,
            enabledTitle: "On",
            disabledTitle: "Off",
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
    },
    fieldBorderColor: {
        fieldFocusBorderColor: { type: ControlType.Color, title: "Field typing border", defaultValue: defaultProps.fieldFocusBorderColor },
    },
    handleHitPaddingY: {
        eyeHitPaddingX: { type: ControlType.Number, title: "Eye tap width", min: 0, max: 40, defaultValue: defaultProps.eyeHitPaddingX },
        eyeHitPaddingY: { type: ControlType.Number, title: "Eye tap height", min: 0, max: 80, defaultValue: defaultProps.eyeHitPaddingY },
    },
}

const controls: PropertyControls = {}
for (const key of Object.keys(ACCOUNT_LIST_CONTROLS)) {
    controls[key] = ACCOUNT_LIST_CONTROLS[key]
    Object.assign(controls, TUTORIAL_CONTROLS_AFTER[key])
}
addPropertyControls(AccountPreferencesListTutorial, controls)
