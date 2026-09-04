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
 * which TravelNoticeToast.tsx's withTravelNoticeToast override (applied
 * on whatever page the Save link lands on) reads once, clears, and uses
 * to trigger the "Your travel notice has been created" toast. A "Card
 * Controls" page can read the first key directly to populate a
 * "Travel Notice" row under Happening Now.
 */

const STORAGE_KEY = "kioskTravelNotice"
const STORAGE_TOAST_FLAG_KEY = "kioskTravelNoticeToastFlag"

type FieldKey = "start" | "end" | "destinations"

interface Props {
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
    calendarPanelWidthPercent: number
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
const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const WEEKDAY_FULL = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

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

function formatFieldShort(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
}
function formatFieldLong(d: Date): string {
    return `${WEEKDAY_FULL[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
function formatMonthYear(d: Date): string {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}
function toISODate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// Always 42 cells (6 full weeks) so the panel's height never jumps
// between months — matches the reference screenshot's grid exactly.
function getMonthGrid(viewMonth: Date): Date[] {
    const first = startOfMonth(viewMonth)
    const gridStart = addDays(first, -first.getDay())
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
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

    return (
        <div
            style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                width: `${props.calendarPanelWidthPercent}%`,
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
                <button
                    type="button"
                    aria-label="Previous month"
                    disabled={!canGoPrev}
                    onClick={() =>
                        canGoPrev &&
                        onChangeViewMonth(
                            new Date(
                                viewMonth.getFullYear(),
                                viewMonth.getMonth() - 1,
                                1
                            )
                        )
                    }
                    style={{
                        background: "transparent",
                        border: "none",
                        padding: 8,
                        cursor: canGoPrev ? "pointer" : "default",
                        opacity: canGoPrev ? 1 : 0.3,
                        ...props.calendarHeaderFont,
                        color: props.calendarHeaderColor,
                    }}
                >
                    {"‹"}
                </button>
                <div
                    style={{
                        ...props.calendarHeaderFont,
                        color: props.calendarHeaderColor,
                    }}
                >
                    {formatMonthYear(viewMonth)}
                </div>
                <button
                    type="button"
                    aria-label="Next month"
                    disabled={!canGoNext}
                    onClick={() =>
                        canGoNext &&
                        onChangeViewMonth(
                            new Date(
                                viewMonth.getFullYear(),
                                viewMonth.getMonth() + 1,
                                1
                            )
                        )
                    }
                    style={{
                        background: "transparent",
                        border: "none",
                        padding: 8,
                        cursor: canGoNext ? "pointer" : "default",
                        opacity: canGoNext ? 1 : 0.3,
                        ...props.calendarHeaderFont,
                        color: props.calendarHeaderColor,
                    }}
                >
                    {"›"}
                </button>
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
                                {date.getDate()}
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

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 760
 */
export default function SetTravelNotice(props: Props) {
    const {
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
        calendarIcon,
        labelColor,
        fieldBackgroundColor,
        fieldBorderColor,
        fieldFocusBorderColor,
        fieldTextColor,
        placeholderColor,
        iconColor,
        iconCellBackgroundColor,
        iconDividerColor,
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
    const [endDate, setEndDate] = React.useState<Date | null>(null)
    const [destinations, setDestinations] = React.useState<string[]>([])
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
    const endMax = startDate
        ? new Date(
              Math.min(
                  addMonthsClamped(startDate, tripMaxMonths).getTime(),
                  maxAllowedDate.getTime()
              )
          )
        : maxAllowedDate

    // Changing the start date can invalidate an already-chosen end date
    // (now before it, or now past the tripMaxMonths/ceiling window) —
    // clear it rather than leave a stale, now-invalid value selected.
    React.useEffect(() => {
        if (!startDate) return
        setEndDate((prev) => {
            if (!prev) return prev
            if (isBeforeDay(prev, startDate)) return null
            const cap = new Date(
                Math.min(
                    addMonthsClamped(startDate, tripMaxMonths).getTime(),
                    maxAllowedDate.getTime()
                )
            )
            if (isAfterDay(prev, cap)) return null
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

    const isValid = !!startDate && !!endDate && destinations.length > 0

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
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
            window.sessionStorage.setItem(STORAGE_TOAST_FLAG_KEY, "1")
        }
        if (!saveLink) e.preventDefault()
    }

    const iconStyle: React.CSSProperties = {
        width: iconSize,
        height: iconSize,
        flexShrink: 0,
    }

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
            {/* Start Date */}
            <div style={{ position: "relative" }}>
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {startDateLabel}
                </div>
                <div style={{ position: "relative" }}>
                    <div
                        onClick={() =>
                            setOpenField((f) =>
                                f === "start" ? null : "start"
                            )
                        }
                        style={{
                            height: fieldHeight,
                            display: "flex",
                            alignItems: "stretch",
                            boxSizing: "border-box",
                            background: fieldBackgroundColor,
                            border: `2px solid ${
                                openField === "start"
                                    ? fieldFocusBorderColor
                                    : fieldBorderColor
                            }`,
                            borderRadius: fieldCornerRadius,
                            overflow: "hidden",
                            cursor: "pointer",
                        }}
                    >
                        <span
                            style={{
                                ...fieldValueFont,
                                color: fieldTextColor,
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                padding: "0 24px",
                                minWidth: 0,
                            }}
                        >
                            {startDate
                                ? openField === "start"
                                    ? formatFieldShort(startDate)
                                    : formatFieldLong(startDate)
                                : ""}
                        </span>
                        <div
                            style={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 20px",
                                background: iconCellBackgroundColor,
                                borderLeft: `2px solid ${iconDividerColor}`,
                            }}
                        >
                            <CalendarIconOrCustom
                                style={iconStyle}
                                color={iconColor}
                                icon={calendarIcon}
                            />
                        </div>
                    </div>
                    {openField === "start" && (
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
                    )}
                </div>
            </div>

            {/* End Date */}
            <div style={{ position: "relative" }}>
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {endDateLabel}
                </div>
                <div style={{ position: "relative" }}>
                    <div
                        onClick={() =>
                            startDate &&
                            setOpenField((f) => (f === "end" ? null : "end"))
                        }
                        style={{
                            height: fieldHeight,
                            display: "flex",
                            alignItems: "stretch",
                            boxSizing: "border-box",
                            background: fieldBackgroundColor,
                            border: `2px solid ${
                                openField === "end"
                                    ? fieldFocusBorderColor
                                    : fieldBorderColor
                            }`,
                            borderRadius: fieldCornerRadius,
                            overflow: "hidden",
                            cursor: startDate ? "pointer" : "default",
                            opacity: startDate ? 1 : 0.45,
                        }}
                    >
                        <span
                            style={{
                                ...fieldValueFont,
                                color: fieldTextColor,
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                padding: "0 24px",
                                minWidth: 0,
                            }}
                        >
                            {endDate
                                ? openField === "end"
                                    ? formatFieldShort(endDate)
                                    : formatFieldLong(endDate)
                                : ""}
                        </span>
                        <div
                            style={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 20px",
                                background: iconCellBackgroundColor,
                                borderLeft: `2px solid ${iconDividerColor}`,
                            }}
                        >
                            <CalendarIconOrCustom
                                style={iconStyle}
                                color={iconColor}
                                icon={calendarIcon}
                            />
                        </div>
                    </div>
                    {openField === "end" && startDate && (
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
                    )}
                </div>
            </div>

            {/* Destinations */}
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
                            cursor: atMaxDestinations ? "default" : "pointer",
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
                                    <button
                                        type="button"
                                        aria-label={`Remove ${state}`}
                                        onClick={() => removeDestination(state)}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 4,
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <XIcon
                                            style={{
                                                width: iconSize * 0.5,
                                                height: iconSize * 0.5,
                                            }}
                                            color={chipRemoveColor}
                                        />
                                    </button>
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

            {/* Save / Cancel */}
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

SetTravelNotice.defaultProps = {
    destinationOptions: [
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
    maxDestinations: 10,
    tripMaxMonths: 3,
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    destinationsLabel: "Destinations",
    destinationsPlaceholder: "Enter your destination",
    destinationsHelperTemplate: "Add up to {n} destinations",
    saveLabel: "Save",
    cancelLabel: "Cancel",
    labelColor: "#3c3f44",
    fieldBackgroundColor: "#ffffff",
    fieldBorderColor: "#d7dade",
    fieldFocusBorderColor: "#2f6fed",
    fieldTextColor: "#22262b",
    placeholderColor: "#9aa0a6",
    iconColor: "#6b7076",
    iconCellBackgroundColor: "#f5f6f7",
    iconDividerColor: "#d7dade",
    chipBackgroundColor: "#eef1f4",
    chipTextColor: "#22262b",
    chipRemoveColor: "#6b7076",
    panelBackgroundColor: "#ffffff",
    panelBorderColor: "#e2e5e8",
    calendarHeaderColor: "#22262b",
    calendarWeekdayColor: "#8a8f95",
    calendarDayColor: "#22262b",
    calendarDayMutedColor: "#c3c7cb",
    calendarSelectedBackgroundColor: "#1f4fa8",
    calendarSelectedTextColor: "#ffffff",
    calendarTodayRingColor: "#1f4fa8",
    calendarFooterColor: "#22262b",
    optionTextColor: "#22262b",
    optionSubTextColor: "#8a8f95",
    optionHighlightColor: "#eaf1ff",
    saveEnabledBackgroundColor: "#1f4fa8",
    saveEnabledTextColor: "#ffffff",
    saveDisabledBackgroundColor: "#d7dade",
    saveDisabledTextColor: "#9aa0a6",
    cancelBorderColor: "#1f4fa8",
    cancelTextColor: "#1f4fa8",
    labelFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 500 },
    fieldValueFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 400 },
    chipFont: { fontFamily: "Inter", fontSize: 30, fontWeight: 500 },
    helperTextFont: { fontFamily: "Inter", fontSize: 26, fontWeight: 400 },
    calendarHeaderFont: { fontFamily: "Inter", fontSize: 32, fontWeight: 600 },
    calendarWeekdayFont: { fontFamily: "Inter", fontSize: 24, fontWeight: 700 },
    calendarDayFont: { fontFamily: "Inter", fontSize: 28, fontWeight: 400 },
    calendarFooterFont: { fontFamily: "Inter", fontSize: 28, fontWeight: 600 },
    destinationOptionFont: { fontFamily: "Inter", fontSize: 32, fontWeight: 400 },
    buttonFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 600 },
    fieldHeight: 108,
    fieldGap: 44,
    fieldCornerRadius: 12,
    chipCornerRadius: 999,
    panelCornerRadius: 16,
    calendarDayCornerRadius: 999,
    calendarPanelWidthPercent: 68,
    buttonHeight: 100,
    buttonCornerRadius: 12,
    buttonPaddingX: 56,
    buttonGap: 24,
    iconSize: 40,
}

addPropertyControls(SetTravelNotice, {
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
        defaultValue: { fontFamily: "Inter", fontSize: 34, fontWeight: 500 },
    },
    fieldValueFont: {
        type: ControlType.Font,
        title: "Field value font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 34, fontWeight: 400 },
    },
    chipFont: {
        type: ControlType.Font,
        title: "Chip font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 30, fontWeight: 500 },
    },
    helperTextFont: {
        type: ControlType.Font,
        title: "Helper text font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 26, fontWeight: 400 },
    },
    calendarHeaderFont: {
        type: ControlType.Font,
        title: "Calendar header font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 32, fontWeight: 600 },
    },
    calendarWeekdayFont: {
        type: ControlType.Font,
        title: "Calendar weekday font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 24, fontWeight: 700 },
    },
    calendarDayFont: {
        type: ControlType.Font,
        title: "Calendar day font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 28, fontWeight: 400 },
    },
    calendarFooterFont: {
        type: ControlType.Font,
        title: "Calendar footer font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 28, fontWeight: 600 },
    },
    destinationOptionFont: {
        type: ControlType.Font,
        title: "Dropdown option font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 32, fontWeight: 400 },
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 34, fontWeight: 600 },
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
    calendarPanelWidthPercent: {
        type: ControlType.Number,
        title: "Calendar dropdown width (%)",
        min: 30,
        max: 100,
        step: 1,
        defaultValue: 68,
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
