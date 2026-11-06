import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * SetTravelNotice
 *
 * The "Set Travel Notice" form: Start Date + End Date (calendar
 * dropdowns) and Destinations (multi-select dropdown with removable
 * chips), plus Save / Cancel. Built for a touch-only kiosk — nothing
 * here is typed, every value is picked by tapping.
 *
 * Sizing: this component doesn't force its own width. Root style is
 * width: 100%, height: fit-content, and it's annotated to support Fill
 * width — drop it in a Stack/Grid column and set that layer's width to
 * Fill (or a 1fr grid track) from Framer's own sizing UI to get the
 * "fills the container" behavior. The calendar/destinations panels are
 * position: absolute, so opening them never pushes the rest of the
 * page's layout around.
 *
 * Handoff to the rest of the app (out of scope for this component,
 * documented here so it's easy to wire up elsewhere): tapping Save
 * (only enabled once a start date, end date, and at least one
 * destination are all set) writes the chosen values to sessionStorage
 * — sessionStorage so a fresh kiosk session/tab doesn't inherit a
 * previous visitor's saved notice — under:
 *
 *   sessionStorage.getItem("kioskTravelNotice")
 *     -> JSON string: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD",
 *                        destinations: string[], savedAt: number }
 *
 * and also sets a one-shot flag:
 *
 *   sessionStorage.getItem("kioskTravelNoticeToastFlag") -> "1"
 *
 * Read once, cleared, and used by CardControlsToasts.tsx's
 * withTravelNoticeToast override (applied on whatever page the Save link
 * lands on) to trigger the "Your travel notice has been created" toast.
 *
 * The TravelNoticeSection component (dropped in as a single layer on
 * the Card Controls page) reads the kioskTravelNotice record above
 * directly — it doesn't need any flag written here. It tracks its own
 * one-shot visibility (by the record's `savedAt`) entirely on its own,
 * on purpose: an earlier version needed a second flag key from this
 * file, and that cross-file coordination was the actual point of
 * failure in practice.
 *
 * Tutorial copy (the "Tutorial copy" property control, `tutorial`): the
 * card-controls tutorial's Set Travel Notice page uses this same
 * component with `tutorial` on (see
 * `tutorials/card-controls-tutorial/NOTES.md`). Unlike the base form,
 * every field is then pre-populated and frozen — this is a walkthrough
 * step, not something the tutorial user actually fills in:
 *
 *   - Start Date is fixed to two weeks from today.
 *   - End Date is fixed to 7 days after Start Date.
 *   - Destinations is a fixed set of three states — Illinois, Kentucky,
 *     Missouri — that can't be changed.
 *
 * Nothing is tappable except Save/Cancel: no calendar dropdown (on
 * either date field or its icon), no destinations dropdown, no chip
 * removal. The calendar icon (still swappable via the property control,
 * same as the base form) and each chip's × are still drawn even though
 * neither responds to a tap, so the step still visually matches the
 * real page.
 *
 * Date display is "September 11" — month + day only, no year or
 * weekday — unlike the base form's long format
 * ("Friday, September 11, 2026"), since there's no benefit to a year or
 * weekday on a fixed, always-current-relative example date.
 *
 * Save writes the same shape of sessionStorage record the base form
 * does, but under its own tutorial-only key
 * ("kioskTravelNoticeTutorial") so the tutorial's fixed practice notice
 * never shows up in the real Card Controls page's TravelNoticeSection
 * (which reads "kioskTravelNotice" and would otherwise show it once as
 * if the user had set it). TravelNoticeSection.tsx with its own
 * `tutorial` on reads this same tutorial key. The toast flag key stays
 * shared, so CardControlsToasts.tsx (unchanged, shared with the base
 * flow) picks it up exactly the same way — Save doesn't need a disabled
 * state here since the fixed values make it valid from the very first
 * render.
 */

const STORAGE_KEY = "kioskTravelNotice"
const STORAGE_TOAST_FLAG_KEY = "kioskTravelNoticeToastFlag"

// Tutorial copy's fixed values — see "Tutorial copy" above.
const TUTORIAL_STORAGE_KEY = "kioskTravelNoticeTutorial"
const TUTORIAL_DESTINATIONS = ["Illinois", "Kentucky", "Missouri"]
const START_DAYS_FROM_TODAY = 14
const TRIP_LENGTH_DAYS = 7

type FieldKey = "start" | "end" | "destinations"

interface Props {
    tutorial: boolean

    destinationOptions: string[]
    maxDestinations: number
    tripMaxMonths: number

    startDateLabel: string
    endDateLabel: string
    destinationsLabel: string
    destinationsPlaceholder: string
    destinationsHelperTemplate: string
    saveLabel: string
    cancelLabel: string

    saveLink?: string
    cancelLink?: string

    calendarIcon?: string

    labelColor: string
    fieldBackgroundColor: string
    fieldBorderColor: string
    fieldFocusBorderColor: string
    fieldTextColor: string
    placeholderColor: string
    iconColor: string
    iconCellBackgroundColor: string
    iconDividerColor: string

    chipBackgroundColor: string
    chipTextColor: string
    chipRemoveColor: string

    panelBackgroundColor: string
    panelBorderColor: string

    calendarHeaderColor: string
    calendarWeekdayColor: string
    calendarDayColor: string
    calendarDayMutedColor: string
    calendarSelectedBackgroundColor: string
    calendarSelectedTextColor: string
    calendarTodayRingColor: string
    calendarFooterColor: string

    optionTextColor: string
    optionSubTextColor: string
    optionHighlightColor: string

    saveEnabledBackgroundColor: string
    saveEnabledTextColor: string
    saveDisabledBackgroundColor: string
    saveDisabledTextColor: string
    cancelBorderColor: string
    cancelTextColor: string

    labelFont: React.CSSProperties
    fieldValueFont: React.CSSProperties
    chipFont: React.CSSProperties
    helperTextFont: React.CSSProperties
    calendarHeaderFont: React.CSSProperties
    calendarWeekdayFont: React.CSSProperties
    calendarDayFont: React.CSSProperties
    calendarFooterFont: React.CSSProperties
    destinationOptionFont: React.CSSProperties
    buttonFont: React.CSSProperties

    fieldHeight: number
    fieldGap: number
    fieldCornerRadius: number
    chipCornerRadius: number
    panelCornerRadius: number
    calendarDayCornerRadius: number
    calendarPanelWidth: number
    buttonHeight: number
    buttonCornerRadius: number
    buttonPaddingX: number
    buttonGap: number
    iconSize: number

    style?: React.CSSProperties
}

// ---------------------------------------------------------------------
// Date helpers — plain Date math, no dependency, since this is a bare
// Framer code file with no package.json to pull in a date library.
// ---------------------------------------------------------------------
// Two-letter labels — toLocaleDateString's "short" weekday is "Sun".
const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}
// Adds n months, clamping the day-of-month into the target month
// instead of letting it overflow (e.g. Jan 31 + 1 month lands on Feb
// 28/29, not "March 3").
function addMonthsClamped(d: Date, n: number): Date {
    const targetMonthIndex = d.getMonth() + n
    const targetYear = d.getFullYear() + Math.floor(targetMonthIndex / 12)
    const normMonth = ((targetMonthIndex % 12) + 12) % 12
    const daysInTargetMonth = new Date(targetYear, normMonth + 1, 0).getDate()
    const day = Math.min(d.getDate(), daysInTargetMonth)
    return new Date(targetYear, normMonth, day)
}
function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}
function isBeforeDay(a: Date, b: Date): boolean {
    return startOfDay(a).getTime() < startOfDay(b).getTime()
}
function isAfterDay(a: Date, b: Date): boolean {
    return startOfDay(a).getTime() > startOfDay(b).getTime()
}

// Kiosk-wide date ceiling: through Dec 31 of this year, except once the
// calendar itself reaches December — from then on the ceiling moves out
// to Dec 31 of *next* year, so December visitors aren't left with a
// shrinking (or already-expired) window.
function getMaxAllowedDate(today: Date): Date {
    const year = today.getFullYear()
    const isDecember = today.getMonth() === 11
    return new Date(isDecember ? year + 1 : year, 11, 31)
}

// "9/11/26"
function formatFieldShort(d: Date): string {
    return d.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
    })
}
// "Friday, September 11, 2026"
function formatFieldLong(d: Date): string {
    return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    })
}
// "September 2026"
function formatMonthYear(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}
// "September 11" — month + day only, no year, no weekday (tutorial copy).
function formatMonthDay(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}
function toISODate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// Built as 42 cells (6 full weeks) so every month lines up on the same
// weekday grid, then trimmed below to drop any trailing week that's
// entirely the next month (e.g. September only needs 5 rows, not 6) —
// a 4-row floor keeps at least a full month's worth of weeks visible.
function getMonthGrid(viewMonth: Date): Date[] {
    const first = startOfMonth(viewMonth)
    const gridStart = addDays(first, -first.getDay())
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
    let end = cells.length
    while (end > 28) {
        const weekIsNextMonth = cells
            .slice(end - 7, end)
            .every((d) => d.getMonth() !== viewMonth.getMonth())
        if (!weekIsNextMonth) break
        end -= 7
    }
    return cells.slice(0, end)
}

// ---------------------------------------------------------------------
// Calendar dropdown panel — shared by Start Date and End Date.
// ---------------------------------------------------------------------
interface CalendarPanelProps {
    viewMonth: Date
    onChangeViewMonth: (d: Date) => void
    selectedDate: Date | null
    minDate: Date
    maxDate: Date
    onSelectDate: (d: Date) => void
    props: Props
}

function CalendarPanel({
    viewMonth,
    onChangeViewMonth,
    selectedDate,
    minDate,
    maxDate,
    onSelectDate,
    props,
}: CalendarPanelProps) {
    const today = startOfDay(new Date())
    const grid = getMonthGrid(viewMonth)
    const canGoPrev = startOfMonth(viewMonth) > startOfMonth(minDate)
    const canGoNext = startOfMonth(viewMonth) < startOfMonth(maxDate)

    // Previous (-1) / next (1) month arrow.
    function monthButton(step: -1 | 1) {
        const canGo = step < 0 ? canGoPrev : canGoNext
        return (
            <button
                type="button"
                aria-label={step < 0 ? "Previous month" : "Next month"}
                disabled={!canGo}
                onClick={() =>
                    canGo &&
                    onChangeViewMonth(
                        new Date(
                            viewMonth.getFullYear(),
                            viewMonth.getMonth() + step,
                            1
                        )
                    )
                }
                style={{
                    background: "transparent",
                    border: "none",
                    padding: 8,
                    cursor: canGo ? "pointer" : "default",
                    opacity: canGo ? 1 : 0.3,
                    ...props.calendarHeaderFont,
                    color: props.calendarHeaderColor,
                }}
            >
                {step < 0 ? "‹" : "›"}
            </button>
        )
    }

    return (
        <div
            style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                width: props.calendarPanelWidth,
                zIndex: 20,
                background: props.panelBackgroundColor,
                border: `1px solid ${props.panelBorderColor}`,
                borderRadius: props.panelCornerRadius,
                boxShadow: "0 12px 32px rgba(20,20,30,0.16)",
                padding: 20,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                {monthButton(-1)}
                <div
                    style={{
                        ...props.calendarHeaderFont,
                        color: props.calendarHeaderColor,
                    }}
                >
                    {formatMonthYear(viewMonth)}
                </div>
                {monthButton(1)}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    marginBottom: 4,
                }}
            >
                {WEEKDAY_SHORT.map((w) => (
                    <div
                        key={w}
                        style={{
                            ...props.calendarWeekdayFont,
                            color: props.calendarWeekdayColor,
                            textAlign: "center",
                            padding: "8px 0",
                        }}
                    >
                        {w}
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                }}
            >
                {grid.map((date, i) => {
                    const inMonth = date.getMonth() === viewMonth.getMonth()
                    const outOfRange =
                        isBeforeDay(date, minDate) || isAfterDay(date, maxDate)
                    const disabled = !inMonth || outOfRange
                    const selected =
                        !!selectedDate && isSameDay(date, selectedDate)
                    const isToday = isSameDay(date, today)
                    return (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px 0",
                            }}
                        >
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => !disabled && onSelectDate(date)}
                                style={{
                                    width: "78%",
                                    aspectRatio: "1 / 1",
                                    maxWidth: 56,
                                    borderRadius: props.calendarDayCornerRadius,
                                    border: isToday
                                        ? `2px solid ${props.calendarTodayRingColor}`
                                        : "2px solid transparent",
                                    background: selected
                                        ? props.calendarSelectedBackgroundColor
                                        : "transparent",
                                    color: selected
                                        ? props.calendarSelectedTextColor
                                        : disabled
                                          ? props.calendarDayMutedColor
                                          : props.calendarDayColor,
                                    cursor: disabled ? "default" : "pointer",
                                    ...props.calendarDayFont,
                                }}
                            >
                                {String(date.getDate()).padStart(2, "0")}
                            </button>
                        </div>
                    )
                })}
            </div>

            <div
                style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: `1px solid ${props.panelBorderColor}`,
                    textAlign: "center",
                    ...props.calendarFooterFont,
                    color: props.calendarFooterColor,
                    minHeight:
                        (props.calendarFooterFont.fontSize as number) || 24,
                }}
            >
                {selectedDate ? formatFieldLong(selectedDate) : ""}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------
// Destinations dropdown panel — multi-select, already-selected states
// excluded from the list (they reappear only once removed via their
// chip's × button).
// ---------------------------------------------------------------------
function DestinationsPanel({
    options,
    onSelect,
    props,
}: {
    options: string[]
    onSelect: (state: string) => void
    props: Props
}) {
    return (
        <div
            style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                background: props.panelBackgroundColor,
                border: `1px solid ${props.panelBorderColor}`,
                borderRadius: props.panelCornerRadius,
                boxShadow: "0 12px 32px rgba(20,20,30,0.16)",
                maxHeight: 420,
                overflowY: "auto",
                boxSizing: "border-box",
            }}
        >
            {options.length === 0 ? (
                <div
                    style={{
                        padding: 20,
                        ...props.destinationOptionFont,
                        color: props.optionSubTextColor,
                        textAlign: "center",
                    }}
                >
                    All destinations selected
                </div>
            ) : (
                options.map((state) => (
                    <button
                        key={state}
                        type="button"
                        onClick={() => onSelect(state)}
                        style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${props.panelBorderColor}`,
                            padding: "18px 20px",
                            cursor: "pointer",
                        }}
                        onPointerDown={(e) =>
                            (e.currentTarget.style.background =
                                props.optionHighlightColor)
                        }
                        onPointerUp={(e) =>
                            (e.currentTarget.style.background = "transparent")
                        }
                        onPointerLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                        }
                    >
                        <span
                            style={{
                                ...props.destinationOptionFont,
                                fontWeight: 700,
                                color: props.optionTextColor,
                            }}
                        >
                            {state}
                        </span>
                        <span
                            style={{
                                ...props.destinationOptionFont,
                                color: props.optionSubTextColor,
                            }}
                        >
                            {" - United States"}
                        </span>
                    </button>
                ))
            )}
        </div>
    )
}

// ---------------------------------------------------------------------
// Start Date / End Date field: label, tappable value box with the
// calendar icon cell, and its CalendarPanel (children) while open.
// A disabled field (End Date before a start is picked) is dimmed.
// In the tutorial copy it's frozen, not clickable, and shows
// "September 11" (see "Tutorial copy" above); empty until the date is
// filled in after mount (see startDate in SetTravelNotice).
// ---------------------------------------------------------------------
function DateField({
    label,
    date,
    open,
    enabled,
    onTap,
    props,
    children,
}: {
    label: string
    date: Date | null
    open: boolean
    enabled: boolean
    onTap: () => void
    props: Props
    children: React.ReactNode
}) {
    const frozen = props.tutorial
    return (
        <div style={{ position: "relative" }}>
            <div
                style={{
                    ...props.labelFont,
                    color: props.labelColor,
                    marginBottom: 12,
                }}
            >
                {label}
            </div>
            <div style={{ position: "relative" }}>
                <div
                    onClick={onTap}
                    style={{
                        height: props.fieldHeight,
                        display: "flex",
                        alignItems: "stretch",
                        boxSizing: "border-box",
                        background: props.fieldBackgroundColor,
                        border: `2px solid ${
                            open
                                ? props.fieldFocusBorderColor
                                : props.fieldBorderColor
                        }`,
                        borderRadius: props.fieldCornerRadius,
                        overflow: "hidden",
                        cursor: enabled && !frozen ? "pointer" : "default",
                        opacity: enabled ? 1 : 0.45,
                    }}
                >
                    <span
                        style={{
                            ...props.fieldValueFont,
                            color: props.fieldTextColor,
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 24px",
                            minWidth: 0,
                        }}
                    >
                        {date
                            ? frozen
                                ? formatMonthDay(date)
                                : open
                                  ? formatFieldShort(date)
                                  : formatFieldLong(date)
                            : ""}
                    </span>
                    <div
                        style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 20px",
                            background: props.iconCellBackgroundColor,
                            borderLeft: `2px solid ${props.iconDividerColor}`,
                        }}
                    >
                        <CalendarIconOrCustom
                            style={{
                                width: props.iconSize,
                                height: props.iconSize,
                                flexShrink: 0,
                            }}
                            color={props.iconColor}
                            icon={props.calendarIcon}
                        />
                    </div>
                </div>
                {open && children}
            </div>
        </div>
    )
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 760
 */
export default function SetTravelNotice(props: Props) {
    const {
        tutorial,
        destinationOptions,
        maxDestinations,
        tripMaxMonths,
        startDateLabel,
        endDateLabel,
        destinationsLabel,
        destinationsPlaceholder,
        destinationsHelperTemplate,
        saveLabel,
        cancelLabel,
        saveLink,
        cancelLink,
        labelColor,
        fieldBackgroundColor,
        fieldBorderColor,
        fieldFocusBorderColor,
        placeholderColor,
        iconColor,
        chipBackgroundColor,
        chipTextColor,
        chipRemoveColor,
        helperTextFont,
        labelFont,
        fieldValueFont,
        chipFont,
        buttonFont,
        fieldHeight,
        fieldGap,
        fieldCornerRadius,
        chipCornerRadius,
        buttonHeight,
        buttonCornerRadius,
        buttonPaddingX,
        buttonGap,
        iconSize,
        saveEnabledBackgroundColor,
        saveEnabledTextColor,
        saveDisabledBackgroundColor,
        saveDisabledTextColor,
        cancelBorderColor,
        cancelTextColor,
        style,
    } = props

    const [startDate, setStartDate] = React.useState<Date | null>(null)
    const [pickedEndDate, setEndDate] = React.useState<Date | null>(null)
    const [pickedDestinations, setDestinations] = React.useState<string[]>(
        []
    )

    // Tutorial copy: Start Date starts at null and is filled in after
    // mount, not computed during render. The published site is
    // server-rendered, so on any day after publishing, a render-time
    // "today" would differ between the server's HTML and the client's
    // hydration render — a hydration mismatch (React error #418/#422;
    // see TravelNoticeSection.tsx's summary state). The first render
    // (server and hydration) shows empty dates, like the base form's
    // empty fields. Set once per mount, so a kiosk session that stays
    // open across midnight doesn't see it shift. End Date and
    // Destinations follow from it and never change.
    React.useEffect(() => {
        if (tutorial) {
            setStartDate(addDays(startOfDay(new Date()), START_DAYS_FROM_TODAY))
        }
    }, [tutorial])
    const endDate = tutorial
        ? startDate && addDays(startDate, TRIP_LENGTH_DAYS)
        : pickedEndDate
    const destinations = tutorial ? TUTORIAL_DESTINATIONS : pickedDestinations
    const [openField, setOpenField] = React.useState<FieldKey | null>(null)
    const [startViewMonth, setStartViewMonth] = React.useState(() =>
        startOfMonth(new Date())
    )
    const [endViewMonth, setEndViewMonth] = React.useState(() =>
        startOfMonth(new Date())
    )

    const containerRef = React.useRef<HTMLDivElement>(null)

    const today = startOfDay(new Date())
    const maxAllowedDate = getMaxAllowedDate(today)
    const startMin = today
    const startMax = maxAllowedDate
    const endMin = startDate || today
    // Latest end date a given start allows: tripMaxMonths out, but never
    // past the kiosk-wide ceiling.
    const endCapFor = (start: Date) =>
        new Date(
            Math.min(
                addMonthsClamped(start, tripMaxMonths).getTime(),
                maxAllowedDate.getTime()
            )
        )
    const endMax = startDate ? endCapFor(startDate) : maxAllowedDate

    // Changing the start date can invalidate an already-chosen end date
    // (now before it, or now past the tripMaxMonths/ceiling window) —
    // clear it rather than leave a stale, now-invalid value selected.
    React.useEffect(() => {
        if (!startDate) return
        setEndDate((prev) => {
            if (!prev) return prev
            if (isBeforeDay(prev, startDate)) return null
            if (isAfterDay(prev, endCapFor(startDate))) return null
            return prev
        })
        setEndViewMonth(startOfMonth(startDate))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate])

    // Tap-outside closes whatever panel is open.
    React.useEffect(() => {
        if (!openField) return
        function onPointerDown(e: PointerEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpenField(null)
            }
        }
        window.addEventListener("pointerdown", onPointerDown, true)
        return () =>
            window.removeEventListener("pointerdown", onPointerDown, true)
    }, [openField])

    const sortedOptions = React.useMemo(
        () => [...destinationOptions].sort((a, b) => a.localeCompare(b)),
        [destinationOptions]
    )
    const availableOptions = sortedOptions.filter(
        (s) => !destinations.includes(s)
    )
    const atMaxDestinations = destinations.length >= maxDestinations

    function addDestination(state: string) {
        if (atMaxDestinations) return
        setDestinations((prev) => {
            const next = [...prev, state]
            if (next.length >= maxDestinations) setOpenField(null)
            return next
        })
    }
    function removeDestination(state: string) {
        setDestinations((prev) => prev.filter((s) => s !== state))
    }

    // The tutorial copy's Save has no disabled state — its fixed values
    // are always valid, so it's always styled "enabled".
    const isValid =
        tutorial || (!!startDate && !!endDate && destinations.length > 0)

    function persistAndProceed(e: React.MouseEvent<HTMLAnchorElement>) {
        if (!isValid) {
            e.preventDefault()
            return
        }
        if (typeof window !== "undefined" && startDate && endDate) {
            const payload = {
                startDate: toISODate(startDate),
                endDate: toISODate(endDate),
                destinations,
                savedAt: Date.now(),
            }
            window.sessionStorage.setItem(
                tutorial ? TUTORIAL_STORAGE_KEY : STORAGE_KEY,
                JSON.stringify(payload)
            )
            window.sessionStorage.setItem(STORAGE_TOAST_FLAG_KEY, "1")
        }
        if (!saveLink) e.preventDefault()
    }

    const iconStyle: React.CSSProperties = {
        width: iconSize,
        height: iconSize,
        flexShrink: 0,
    }
    const xIcon = (
        <XIcon
            style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
            color={chipRemoveColor}
        />
    )

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: fieldGap,
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
            }}
        >
            {/* Start Date. Not tagged with data-tutorial-target: this row
                lives inside this component's own render tree, not as a
                separately selectable Framer layer, so the tutorial
                spotlights it with a separate marker layer (TravelStart)
                instead — see tutorials/card-controls-tutorial/NOTES.md. */}
            <DateField
                label={startDateLabel}
                date={startDate}
                open={openField === "start"}
                enabled
                onTap={() =>
                    !tutorial &&
                    setOpenField((f) => (f === "start" ? null : "start"))
                }
                props={props}
            >
                <CalendarPanel
                    viewMonth={startViewMonth}
                    onChangeViewMonth={setStartViewMonth}
                    selectedDate={startDate}
                    minDate={startMin}
                    maxDate={startMax}
                    onSelectDate={(d) => {
                        setStartDate(d)
                        setOpenField(null)
                    }}
                    props={props}
                />
            </DateField>

            {/* End Date */}
            <DateField
                label={endDateLabel}
                date={endDate}
                open={openField === "end" && !!startDate}
                enabled={tutorial || !!startDate}
                onTap={() =>
                    !tutorial &&
                    startDate &&
                    setOpenField((f) => (f === "end" ? null : "end"))
                }
                props={props}
            >
                <CalendarPanel
                    viewMonth={endViewMonth}
                    onChangeViewMonth={setEndViewMonth}
                    selectedDate={endDate}
                    minDate={endMin}
                    maxDate={endMax}
                    onSelectDate={(d) => {
                        setEndDate(d)
                        setOpenField(null)
                    }}
                    props={props}
                />
            </DateField>

            {/* Destinations — in the tutorial copy, frozen, not
                clickable; chips not removable but still show a
                (non-functional) × for visual parity with the real app. */}
            <div style={{ position: "relative" }}>
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {destinationsLabel}
                </div>
                <div style={{ position: "relative" }}>
                    <div
                        onClick={() =>
                            !tutorial &&
                            !atMaxDestinations &&
                            setOpenField((f) =>
                                f === "destinations" ? null : "destinations"
                            )
                        }
                        style={{
                            minHeight: fieldHeight,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "12px 24px",
                            boxSizing: "border-box",
                            background: fieldBackgroundColor,
                            border: `2px solid ${
                                openField === "destinations"
                                    ? fieldFocusBorderColor
                                    : fieldBorderColor
                            }`,
                            borderRadius: fieldCornerRadius,
                            cursor:
                                tutorial || atMaxDestinations
                                    ? "default"
                                    : "pointer",
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                                alignItems: "center",
                            }}
                        >
                            {destinations.length === 0 && (
                                <span
                                    style={{
                                        ...fieldValueFont,
                                        color: placeholderColor,
                                        fontStyle: "italic",
                                    }}
                                >
                                    {destinationsPlaceholder}
                                </span>
                            )}
                            {destinations.map((state) => (
                                <span
                                    key={state}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 10,
                                        background: chipBackgroundColor,
                                        borderRadius: chipCornerRadius,
                                        padding: "8px 12px 8px 18px",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...chipFont,
                                            color: chipTextColor,
                                        }}
                                    >
                                        {state} - United States
                                    </span>
                                    {tutorial ? (
                                        // Tutorial copy: drawn but not
                                        // clickable — a plain span, not a
                                        // <button>.
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                padding: 4,
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            {xIcon}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            aria-label={`Remove ${state}`}
                                            onClick={() =>
                                                removeDestination(state)
                                            }
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                padding: 4,
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            {xIcon}
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                        <ChevronIcon style={iconStyle} color={iconColor} />
                    </div>
                    {openField === "destinations" && (
                        <DestinationsPanel
                            options={availableOptions}
                            onSelect={addDestination}
                            props={props}
                        />
                    )}
                </div>
                {openField !== "destinations" && (
                    <div
                        style={{
                            ...helperTextFont,
                            color: labelColor,
                            textAlign: "right",
                            marginTop: 10,
                        }}
                    >
                        {(() => {
                            const [prefix, suffix] =
                                destinationsHelperTemplate.split("{n}")
                            return (
                                <>
                                    {prefix}
                                    <b>{maxDestinations}</b>
                                    {suffix}
                                </>
                            )
                        })()}
                    </div>
                )}
            </div>

            {/* Save / Cancel — in the tutorial copy Save is always
                enabled (fixed values are always valid); Cancel is
                unchanged from the base form. */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: buttonGap,
                    marginTop: 8,
                }}
            >
                <a
                    href={isValid ? saveLink || undefined : undefined}
                    onClick={persistAndProceed}
                    style={{
                        height: buttonHeight,
                        padding: `0 ${buttonPaddingX}px`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: buttonCornerRadius,
                        background: isValid
                            ? saveEnabledBackgroundColor
                            : saveDisabledBackgroundColor,
                        color: isValid
                            ? saveEnabledTextColor
                            : saveDisabledTextColor,
                        textDecoration: "none",
                        cursor: isValid ? "pointer" : "default",
                        boxSizing: "border-box",
                        ...buttonFont,
                    }}
                >
                    {saveLabel}
                </a>
                <a
                    href={cancelLink || undefined}
                    onClick={(e) => !cancelLink && e.preventDefault()}
                    style={{
                        height: buttonHeight,
                        padding: `0 ${buttonPaddingX}px`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: buttonCornerRadius,
                        background: "transparent",
                        border: `2px solid ${cancelBorderColor}`,
                        color: cancelTextColor,
                        textDecoration: "none",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        ...buttonFont,
                    }}
                >
                    {cancelLabel}
                </a>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------
// Inline icons — kept as plain SVG (no icon-library dependency) to match
// the thin-line style in the reference screenshots.
// ---------------------------------------------------------------------
// Renders the caller's own uploaded image (Icon property control) if one
// is set, falling back to the built-in line-art CalendarIcon otherwise.
function CalendarIconOrCustom({
    style,
    color,
    icon,
}: {
    style: React.CSSProperties
    color: string
    icon?: string
}) {
    if (icon) {
        return (
            <img
                src={icon}
                alt=""
                style={{ ...style, objectFit: "contain" }}
            />
        )
    }
    return <CalendarIcon style={style} color={color} />
}
function CalendarIcon({
    style,
    color,
}: {
    style: React.CSSProperties
    color: string
}) {
    return (
        <svg style={style} viewBox="0 0 24 24" fill="none">
            <rect
                x="3"
                y="5"
                width="18"
                height="16"
                rx="2"
                stroke={color}
                strokeWidth="1.6"
            />
            <path d="M3 9H21" stroke={color} strokeWidth="1.6" />
            <path d="M8 3V6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M16 3V6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}
function ChevronIcon({
    style,
    color,
}: {
    style: React.CSSProperties
    color: string
}) {
    return (
        <svg style={style} viewBox="0 0 24 24" fill="none">
            <path
                d="M6 9L12 15L18 9"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
function XIcon({
    style,
    color,
}: {
    style: React.CSSProperties
    color: string
}) {
    return (
        <svg style={style} viewBox="0 0 24 24" fill="none">
            <path
                d="M6 6L18 18"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M18 6L6 18"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

addPropertyControls(SetTravelNotice, {
    tutorial: {
        type: ControlType.Boolean,
        title: "Tutorial copy",
        defaultValue: false,
    },
    destinationOptions: {
        type: ControlType.Array,
        title: "Destinations list",
        control: { type: ControlType.String },
        defaultValue: [
            "California",
            "Florida",
            "Georgia",
            "Illinois",
            "Kentucky",
            "Michigan",
            "Missouri",
            "Ohio",
            "Tennessee",
            "Texas",
        ],
    },
    maxDestinations: {
        type: ControlType.Number,
        title: "Max destinations",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 10,
    },
    tripMaxMonths: {
        type: ControlType.Number,
        title: "Max trip length (months)",
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 3,
    },
    saveLink: {
        type: ControlType.Link,
        title: "Save link",
    },
    cancelLink: {
        type: ControlType.Link,
        title: "Cancel link",
    },
    calendarIcon: {
        type: ControlType.Image,
        title: "Calendar icon",
    },
    startDateLabel: {
        type: ControlType.String,
        title: "Start Date label",
        defaultValue: "Start Date",
    },
    endDateLabel: {
        type: ControlType.String,
        title: "End Date label",
        defaultValue: "End Date",
    },
    destinationsLabel: {
        type: ControlType.String,
        title: "Destinations label",
        defaultValue: "Destinations",
    },
    destinationsPlaceholder: {
        type: ControlType.String,
        title: "Destinations placeholder",
        defaultValue: "Enter your destination",
    },
    destinationsHelperTemplate: {
        type: ControlType.String,
        title: "Helper text ({n} = max)",
        defaultValue: "Add up to {n} destinations",
    },
    saveLabel: {
        type: ControlType.String,
        title: "Save label",
        defaultValue: "Save",
    },
    cancelLabel: {
        type: ControlType.String,
        title: "Cancel label",
        defaultValue: "Cancel",
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label color",
        defaultValue: "#3c3f44",
    },
    fieldBackgroundColor: {
        type: ControlType.Color,
        title: "Field background",
        defaultValue: "#ffffff",
    },
    fieldBorderColor: {
        type: ControlType.Color,
        title: "Field border",
        defaultValue: "#d7dade",
    },
    fieldFocusBorderColor: {
        type: ControlType.Color,
        title: "Field focus border",
        defaultValue: "#2f6fed",
    },
    fieldTextColor: {
        type: ControlType.Color,
        title: "Field text",
        defaultValue: "#22262b",
    },
    placeholderColor: {
        type: ControlType.Color,
        title: "Placeholder text",
        defaultValue: "#9aa0a6",
    },
    iconColor: {
        type: ControlType.Color,
        title: "Icon color",
        defaultValue: "#6b7076",
    },
    iconCellBackgroundColor: {
        type: ControlType.Color,
        title: "Icon cell background",
        defaultValue: "#f5f6f7",
    },
    iconDividerColor: {
        type: ControlType.Color,
        title: "Icon divider line",
        defaultValue: "#d7dade",
    },
    chipBackgroundColor: {
        type: ControlType.Color,
        title: "Chip background",
        defaultValue: "#eef1f4",
    },
    chipTextColor: {
        type: ControlType.Color,
        title: "Chip text",
        defaultValue: "#22262b",
    },
    chipRemoveColor: {
        type: ControlType.Color,
        title: "Chip × color",
        defaultValue: "#6b7076",
    },
    panelBackgroundColor: {
        type: ControlType.Color,
        title: "Dropdown background",
        defaultValue: "#ffffff",
    },
    panelBorderColor: {
        type: ControlType.Color,
        title: "Dropdown border",
        defaultValue: "#e2e5e8",
    },
    calendarHeaderColor: {
        type: ControlType.Color,
        title: "Calendar header",
        defaultValue: "#22262b",
    },
    calendarWeekdayColor: {
        type: ControlType.Color,
        title: "Calendar weekday",
        defaultValue: "#8a8f95",
    },
    calendarDayColor: {
        type: ControlType.Color,
        title: "Calendar day",
        defaultValue: "#22262b",
    },
    calendarDayMutedColor: {
        type: ControlType.Color,
        title: "Calendar day (muted)",
        defaultValue: "#c3c7cb",
    },
    calendarSelectedBackgroundColor: {
        type: ControlType.Color,
        title: "Selected day background",
        defaultValue: "#1f4fa8",
    },
    calendarSelectedTextColor: {
        type: ControlType.Color,
        title: "Selected day text",
        defaultValue: "#ffffff",
    },
    calendarTodayRingColor: {
        type: ControlType.Color,
        title: "Today ring",
        defaultValue: "#1f4fa8",
    },
    calendarFooterColor: {
        type: ControlType.Color,
        title: "Calendar footer text",
        defaultValue: "#22262b",
    },
    optionTextColor: {
        type: ControlType.Color,
        title: "Dropdown option text",
        defaultValue: "#22262b",
    },
    optionSubTextColor: {
        type: ControlType.Color,
        title: "Dropdown option subtext",
        defaultValue: "#8a8f95",
    },
    optionHighlightColor: {
        type: ControlType.Color,
        title: "Dropdown option press color",
        defaultValue: "#eaf1ff",
    },
    saveEnabledBackgroundColor: {
        type: ControlType.Color,
        title: "Save background (on)",
        defaultValue: "#1f4fa8",
    },
    saveEnabledTextColor: {
        type: ControlType.Color,
        title: "Save text (on)",
        defaultValue: "#ffffff",
    },
    saveDisabledBackgroundColor: {
        type: ControlType.Color,
        title: "Save background (off)",
        defaultValue: "#d7dade",
    },
    saveDisabledTextColor: {
        type: ControlType.Color,
        title: "Save text (off)",
        defaultValue: "#9aa0a6",
    },
    cancelBorderColor: {
        type: ControlType.Color,
        title: "Cancel border",
        defaultValue: "#1f4fa8",
    },
    cancelTextColor: {
        type: ControlType.Color,
        title: "Cancel text",
        defaultValue: "#1f4fa8",
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Medium" },
    },
    fieldValueFont: {
        type: ControlType.Font,
        title: "Field value font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Regular" },
    },
    chipFont: {
        type: ControlType.Font,
        title: "Chip font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30, variant: "Medium" },
    },
    helperTextFont: {
        type: ControlType.Font,
        title: "Helper text font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 26, variant: "Regular" },
    },
    calendarHeaderFont: {
        type: ControlType.Font,
        title: "Calendar header font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 32, variant: "Semibold" },
    },
    calendarWeekdayFont: {
        type: ControlType.Font,
        title: "Calendar weekday font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 24, variant: "Bold" },
    },
    calendarDayFont: {
        type: ControlType.Font,
        title: "Calendar day font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28, variant: "Regular" },
    },
    calendarFooterFont: {
        type: ControlType.Font,
        title: "Calendar footer font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 28, variant: "Semibold" },
    },
    destinationOptionFont: {
        type: ControlType.Font,
        title: "Dropdown option font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 32, variant: "Regular" },
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34, variant: "Semibold" },
    },
    fieldHeight: {
        type: ControlType.Number,
        title: "Field height",
        min: 40,
        max: 240,
        defaultValue: 108,
    },
    fieldGap: {
        type: ControlType.Number,
        title: "Gap between fields",
        min: 0,
        max: 160,
        defaultValue: 44,
    },
    fieldCornerRadius: {
        type: ControlType.Number,
        title: "Field corner radius",
        min: 0,
        max: 60,
        defaultValue: 12,
    },
    chipCornerRadius: {
        type: ControlType.Number,
        title: "Chip corner radius",
        min: 0,
        max: 999,
        defaultValue: 999,
    },
    panelCornerRadius: {
        type: ControlType.Number,
        title: "Dropdown corner radius",
        min: 0,
        max: 60,
        defaultValue: 16,
    },
    calendarDayCornerRadius: {
        type: ControlType.Number,
        title: "Chosen date corner radius",
        min: 0,
        max: 999,
        defaultValue: 999,
    },
    calendarPanelWidth: {
        type: ControlType.Number,
        title: "Calendar dropdown width",
        min: 200,
        max: 1080,
        step: 10,
        defaultValue: 700,
        unit: "px",
    },
    buttonHeight: {
        type: ControlType.Number,
        title: "Button height",
        min: 40,
        max: 200,
        defaultValue: 100,
    },
    buttonCornerRadius: {
        type: ControlType.Number,
        title: "Button corner radius",
        min: 0,
        max: 60,
        defaultValue: 12,
    },
    buttonPaddingX: {
        type: ControlType.Number,
        title: "Button horizontal padding",
        min: 0,
        max: 160,
        defaultValue: 56,
    },
    buttonGap: {
        type: ControlType.Number,
        title: "Gap between buttons",
        min: 0,
        max: 120,
        defaultValue: 24,
    },
    iconSize: {
        type: ControlType.Number,
        title: "Icon size",
        min: 12,
        max: 80,
        defaultValue: 40,
    },
})
