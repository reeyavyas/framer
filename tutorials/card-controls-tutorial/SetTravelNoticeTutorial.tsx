import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * SetTravelNoticeTutorial
 *
 * Tutorial-duplicate of `card-controls/travel-notice/SetTravelNotice.tsx`,
 * for the card-controls tutorial flow (see `tutorials/card-controls-tutorial/NOTES.md`).
 *
 * Unlike the base form, every field here is pre-populated and frozen —
 * this is a walkthrough step, not something the tutorial user actually
 * fills in:
 *
 *   - Start Date is fixed to two weeks from today.
 *   - End Date is fixed to 7 days after Start Date.
 *   - Destinations is a fixed set of three states — Illinois, Kentucky,
 *     Missouri — that can't be changed.
 *
 * Nothing here is tappable except Save/Cancel: no calendar dropdown (on
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
 * Save still writes the exact same sessionStorage record
 * SetTravelNotice.tsx does, under the same keys, so
 * TravelNoticeToast.tsx (unchanged, shared with the base flow) and
 * tutorials/card-controls-tutorial/TravelNoticeSectionTutorial.tsx pick it up
 * exactly the same way — Save doesn't need a disabled state here since
 * the fixed values make it valid from the very first render.
 */

const STORAGE_KEY = "kioskTravelNotice"
const STORAGE_TOAST_FLAG_KEY = "kioskTravelNoticeToastFlag"

const TUTORIAL_DESTINATIONS = ["Illinois", "Kentucky", "Missouri"]
const START_DAYS_FROM_TODAY = 14
const TRIP_LENGTH_DAYS = 7

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

interface Props {
    startDateLabel: string
    endDateLabel: string
    destinationsLabel: string
    destinationsHelperTemplate: string
    maxDestinations: number
    saveLabel: string
    cancelLabel: string

    saveLink?: string
    cancelLink?: string

    calendarIcon?: string

    labelColor: string
    fieldBackgroundColor: string
    fieldBorderColor: string
    fieldTextColor: string
    iconColor: string
    iconCellBackgroundColor: string
    iconDividerColor: string

    chipBackgroundColor: string
    chipTextColor: string
    chipRemoveColor: string

    saveEnabledBackgroundColor: string
    saveEnabledTextColor: string
    cancelBorderColor: string
    cancelTextColor: string

    labelFont: React.CSSProperties
    fieldValueFont: React.CSSProperties
    chipFont: React.CSSProperties
    helperTextFont: React.CSSProperties
    buttonFont: React.CSSProperties

    fieldHeight: number
    fieldGap: number
    fieldCornerRadius: number
    chipCornerRadius: number
    buttonHeight: number
    buttonCornerRadius: number
    buttonPaddingX: number
    buttonGap: number
    iconSize: number

    style?: React.CSSProperties
}

// ---------------------------------------------------------------------
// Date helpers — same plain Date math as the base form (no dependency,
// since this is a bare Framer code file with no package.json).
// ---------------------------------------------------------------------
function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
}
// "September 11" — month + day only, no year, no weekday.
function formatMonthDay(d: Date): string {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}
function toISODate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 760
 */
export default function SetTravelNoticeTutorial(props: Props) {
    const {
        startDateLabel,
        endDateLabel,
        destinationsLabel,
        destinationsHelperTemplate,
        maxDestinations,
        saveLabel,
        cancelLabel,
        saveLink,
        cancelLink,
        calendarIcon,
        labelColor,
        fieldBackgroundColor,
        fieldBorderColor,
        fieldTextColor,
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
        cancelBorderColor,
        cancelTextColor,
        style,
    } = props

    // Computed once per mount, not re-derived every render — a kiosk
    // session that happens to stay open across midnight shouldn't have
    // its "pre-populated" example date silently shift underneath it.
    const startDate = React.useMemo(
        () => addDays(startOfDay(new Date()), START_DAYS_FROM_TODAY),
        []
    )
    const endDate = React.useMemo(
        () => addDays(startDate, TRIP_LENGTH_DAYS),
        [startDate]
    )
    const destinations = TUTORIAL_DESTINATIONS

    function persistAndProceed(e: React.MouseEvent<HTMLAnchorElement>) {
        if (typeof window !== "undefined") {
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
            {/* Start Date — frozen, not clickable. Tagged directly (not
                via a TutorialTargets.tsx Code Override) since this div
                lives inside this component's own render tree, not as a
                separately selectable Framer layer — see
                tutorials/card-controls-tutorial/NOTES.md. */}
            <div data-tutorial-target="start-date">
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {startDateLabel}
                </div>
                <div
                    style={{
                        height: fieldHeight,
                        display: "flex",
                        alignItems: "stretch",
                        boxSizing: "border-box",
                        background: fieldBackgroundColor,
                        border: `2px solid ${fieldBorderColor}`,
                        borderRadius: fieldCornerRadius,
                        overflow: "hidden",
                        cursor: "default",
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
                        {formatMonthDay(startDate)}
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
            </div>

            {/* End Date — frozen, not clickable */}
            <div>
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {endDateLabel}
                </div>
                <div
                    style={{
                        height: fieldHeight,
                        display: "flex",
                        alignItems: "stretch",
                        boxSizing: "border-box",
                        background: fieldBackgroundColor,
                        border: `2px solid ${fieldBorderColor}`,
                        borderRadius: fieldCornerRadius,
                        overflow: "hidden",
                        cursor: "default",
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
                        {formatMonthDay(endDate)}
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
            </div>

            {/* Destinations — frozen, not clickable; chips not removable
                but still show a (non-functional) × for visual parity
                with the real app. */}
            <div>
                <div
                    style={{
                        ...labelFont,
                        color: labelColor,
                        marginBottom: 12,
                    }}
                >
                    {destinationsLabel}
                </div>
                <div
                    style={{
                        minHeight: fieldHeight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 24px",
                        boxSizing: "border-box",
                        background: fieldBackgroundColor,
                        border: `2px solid ${fieldBorderColor}`,
                        borderRadius: fieldCornerRadius,
                        cursor: "default",
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
                        {destinations.map((state) => (
                            <span
                                key={state}
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
                                <span
                                    aria-hidden="true"
                                    style={{
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
                                </span>
                            </span>
                        ))}
                    </div>
                    <ChevronIcon style={iconStyle} color={iconColor} />
                </div>
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
            </div>

            {/* Save / Cancel — Save is always enabled (fixed values are
                always valid); Cancel is unchanged from the base form. */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: buttonGap,
                    marginTop: 8,
                }}
            >
                <a
                    href={saveLink || undefined}
                    onClick={persistAndProceed}
                    style={{
                        height: buttonHeight,
                        padding: `0 ${buttonPaddingX}px`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: buttonCornerRadius,
                        background: saveEnabledBackgroundColor,
                        color: saveEnabledTextColor,
                        textDecoration: "none",
                        cursor: "pointer",
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
// Inline icons — same plain SVG as the base form, no icon-library
// dependency.
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

SetTravelNoticeTutorial.defaultProps = {
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    destinationsLabel: "Destinations",
    destinationsHelperTemplate: "Add up to {n} destinations",
    maxDestinations: 10,
    saveLabel: "Save",
    cancelLabel: "Cancel",
    labelColor: "#3c3f44",
    fieldBackgroundColor: "#ffffff",
    fieldBorderColor: "#d7dade",
    fieldTextColor: "#22262b",
    iconColor: "#6b7076",
    iconCellBackgroundColor: "#f5f6f7",
    iconDividerColor: "#d7dade",
    chipBackgroundColor: "#eef1f4",
    chipTextColor: "#22262b",
    chipRemoveColor: "#6b7076",
    saveEnabledBackgroundColor: "#1f4fa8",
    saveEnabledTextColor: "#ffffff",
    cancelBorderColor: "#1f4fa8",
    cancelTextColor: "#1f4fa8",
    labelFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 500 },
    fieldValueFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 400 },
    chipFont: { fontFamily: "Inter", fontSize: 30, fontWeight: 500 },
    helperTextFont: { fontFamily: "Inter", fontSize: 26, fontWeight: 400 },
    buttonFont: { fontFamily: "Inter", fontSize: 34, fontWeight: 600 },
    fieldHeight: 108,
    fieldGap: 44,
    fieldCornerRadius: 12,
    chipCornerRadius: 999,
    buttonHeight: 100,
    buttonCornerRadius: 12,
    buttonPaddingX: 56,
    buttonGap: 24,
    iconSize: 40,
}

addPropertyControls(SetTravelNoticeTutorial, {
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
    destinationsHelperTemplate: {
        type: ControlType.String,
        title: "Helper text ({n} = max)",
        defaultValue: "Add up to {n} destinations",
    },
    maxDestinations: {
        type: ControlType.Number,
        title: "Max destinations (helper text only)",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 10,
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
    fieldTextColor: {
        type: ControlType.Color,
        title: "Field text",
        defaultValue: "#22262b",
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
    saveEnabledBackgroundColor: {
        type: ControlType.Color,
        title: "Save background",
        defaultValue: "#1f4fa8",
    },
    saveEnabledTextColor: {
        type: ControlType.Color,
        title: "Save text",
        defaultValue: "#ffffff",
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
        defaultValue: { fontSize: 34 },
    },
    fieldValueFont: {
        type: ControlType.Font,
        title: "Field value font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34 },
    },
    chipFont: {
        type: ControlType.Font,
        title: "Chip font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30 },
    },
    helperTextFont: {
        type: ControlType.Font,
        title: "Helper text font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 26 },
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 34 },
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
