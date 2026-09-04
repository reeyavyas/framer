import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TravelNoticeSection
 *
 * Self-contained "Happening Now" / "Future Plans" summary component for
 * Card Controls. Drop this in as ONE layer between "Card Section" and
 * "Misplaced Card" — there's no hand-built dot/line rail to align. The
 * connecting line between the two dots is a flex:1 child in a flex
 * column, so it always stretches to exactly match the content column's
 * height, whether the destinations text wraps to 1 line or several —
 * no manual adjustment needed as the destinations list grows.
 *
 * Data: reads the same sessionStorage contract SetTravelNotice.tsx
 * writes on Save —
 *
 *   sessionStorage.getItem("kioskTravelNotice")
 *     -> { startDate, endDate, destinations, savedAt }
 *   sessionStorage.getItem("kioskTravelNoticeSectionFlag") -> "1"
 *
 * The second is a one-shot flag: read and cleared the moment this
 * component first mounts on a page load. That means the section shows
 * on the page load right after Save, and renders nothing at all (zero
 * height, not just visually hidden) on any later refresh of Card
 * Controls within the same kiosk session — kioskTravelNotice itself is
 * untouched and keeps persisting; only this component's own visibility
 * is one-shot.
 *
 * On the canvas this always renders with sample data so it stays
 * stylable via the property controls below; the real read/hide/fill-in
 * behavior only runs in Preview/Published.
 */

const STORAGE_KEY = "kioskTravelNotice"
const STORAGE_SECTION_FLAG_KEY = "kioskTravelNoticeSectionFlag"

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

interface StoredNotice {
    startDate: string
    endDate: string
    destinations: string[]
    savedAt: number
}

interface NoticeSummary {
    headerLabel: string
    dateRangeText: string
    destinationsText: string
}

function parseISODate(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d)
}
function formatDisplayDate(iso: string): string {
    const d = parseISODate(iso)
    const day = String(d.getDate()).padStart(2, "0")
    return `${MONTH_NAMES[d.getMonth()]} ${day}, ${d.getFullYear()}`
}
function todayISO(): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

let noticeSummary: NoticeSummary | null = null
let sectionArmedForThisLoad = false

// Runs once per page load — reads the one-shot flag and clears it
// immediately (so a later refresh of this same page renders nothing),
// and — only if the flag was actually set — reads the persistent
// kioskTravelNotice record to build the summary this component renders.
function armSectionFromStorageOnce() {
    if (sectionArmedForThisLoad) return
    sectionArmedForThisLoad = true
    if (typeof window === "undefined") return

    const flag = window.sessionStorage.getItem(STORAGE_SECTION_FLAG_KEY)
    window.sessionStorage.removeItem(STORAGE_SECTION_FLAG_KEY)
    if (flag !== "1") return

    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
        const stored: StoredNotice = JSON.parse(raw)
        // Each "State - United States" entry has its internal spaces
        // swapped for non-breaking spaces so it can never split across
        // lines; the ", " between entries stays a normal breakable
        // space, so wrapping only ever happens between whole entries.
        const destinationsText = stored.destinations
            .map((state) => `${state} - United States`.replace(/ /g, " "))
            .join(", ")

        noticeSummary = {
            headerLabel:
                stored.startDate === todayISO()
                    ? "Happening Now"
                    : "Future Plans",
            dateRangeText: `${formatDisplayDate(stored.startDate)} - ${formatDisplayDate(stored.endDate)}`,
            destinationsText,
        }
    } catch {
        noticeSummary = null
    }
}

const SAMPLE_SUMMARY: NoticeSummary = {
    headerLabel: "Happening Now",
    dateRangeText: "September 02, 2026 - November 03, 2026",
    destinationsText: "Illinois - United States, Texas - United States",
}

interface Props {
    destinationsLabel: string
    footerLabel: string

    dotColor: string
    lineColor: string
    headerTextColor: string
    dateRangeTextColor: string
    destinationsLabelColor: string
    destinationsTextColor: string
    footerTextColor: string
    backgroundColor: string

    headerFont: React.CSSProperties
    dateRangeFont: React.CSSProperties
    destinationsLabelFont: React.CSSProperties
    destinationsTextFont: React.CSSProperties
    footerFont: React.CSSProperties

    dotSize: number
    lineWidth: number
    railContentGap: number
    detailGap: number
    rowGap: number
    paddingX: number
    paddingY: number

    style?: React.CSSProperties
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 300
 */
export default function TravelNoticeSection(props: Props) {
    const {
        destinationsLabel,
        footerLabel,
        dotColor,
        lineColor,
        headerTextColor,
        dateRangeTextColor,
        destinationsLabelColor,
        destinationsTextColor,
        footerTextColor,
        backgroundColor,
        headerFont,
        dateRangeFont,
        destinationsLabelFont,
        destinationsTextFont,
        footerFont,
        dotSize,
        lineWidth,
        railContentGap,
        detailGap,
        rowGap,
        paddingX,
        paddingY,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const [summary] = React.useState<NoticeSummary | null>(() => {
        if (isCanvas) return SAMPLE_SUMMARY
        armSectionFromStorageOnce()
        return noticeSummary
    })

    // Renders nothing at all (not just hidden) when there's no fresh
    // one-shot flag — the section takes up zero space in the layer
    // stack rather than leaving an empty gap.
    if (!summary) return null

    return (
        <div
            style={{
                ...style,
                width: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: railContentGap,
                padding: `${paddingY}px ${paddingX}px`,
                background: backgroundColor,
                fontFamily: "Inter, sans-serif",
            }}
        >
            {/* Rail: dot / line / dot. The line is flex:1 so it always
                stretches to exactly match the content column's height,
                no matter how many lines the destinations text wraps to. */}
            <div
                style={{
                    flexShrink: 0,
                    width: dotSize,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        flexShrink: 0,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        background: dotColor,
                    }}
                />
                <div
                    style={{
                        flex: 1,
                        width: lineWidth,
                        background: lineColor,
                    }}
                />
                <div
                    style={{
                        flexShrink: 0,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: "50%",
                        background: dotColor,
                    }}
                />
            </div>

            {/* Content */}
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: rowGap,
                }}
            >
                <div style={{ ...headerFont, color: headerTextColor }}>
                    {summary.headerLabel}
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: detailGap,
                    }}
                >
                    <div style={{ ...dateRangeFont, color: dateRangeTextColor }}>
                        {summary.dateRangeText}
                    </div>
                    <div
                        style={{
                            ...destinationsLabelFont,
                            color: destinationsLabelColor,
                        }}
                    >
                        {destinationsLabel}
                    </div>
                    <div
                        style={{
                            ...destinationsTextFont,
                            color: destinationsTextColor,
                        }}
                    >
                        {summary.destinationsText}
                    </div>
                </div>
                <div style={{ ...footerFont, color: footerTextColor }}>
                    {footerLabel}
                </div>
            </div>
        </div>
    )
}

TravelNoticeSection.defaultProps = {
    destinationsLabel: "Destinations:",
    footerLabel: "That's All!",
    dotColor: "#1f4fa8",
    lineColor: "#c7d3e8",
    headerTextColor: "#22262b",
    dateRangeTextColor: "#22262b",
    destinationsLabelColor: "#6b7076",
    destinationsTextColor: "#22262b",
    footerTextColor: "#22262b",
    backgroundColor: "#f2f3f5",
    headerFont: { fontFamily: "Inter", fontSize: 30, fontWeight: 700 },
    dateRangeFont: {
        fontFamily: "Inter",
        fontSize: 26,
        fontWeight: 700,
        fontStyle: "italic",
    },
    destinationsLabelFont: { fontFamily: "Inter", fontSize: 24, fontWeight: 700 },
    destinationsTextFont: { fontFamily: "Inter", fontSize: 24, fontWeight: 400 },
    footerFont: { fontFamily: "Inter", fontSize: 30, fontWeight: 700 },
    dotSize: 20,
    lineWidth: 2,
    railContentGap: 20,
    detailGap: 10,
    rowGap: 20,
    paddingX: 32,
    paddingY: 28,
}

addPropertyControls(TravelNoticeSection, {
    destinationsLabel: {
        type: ControlType.String,
        title: "Destinations label",
        defaultValue: "Destinations:",
    },
    footerLabel: {
        type: ControlType.String,
        title: "Footer label",
        defaultValue: "That's All!",
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dot color",
        defaultValue: "#1f4fa8",
    },
    lineColor: {
        type: ControlType.Color,
        title: "Line color",
        defaultValue: "#c7d3e8",
    },
    headerTextColor: {
        type: ControlType.Color,
        title: "Header text",
        defaultValue: "#22262b",
    },
    dateRangeTextColor: {
        type: ControlType.Color,
        title: "Date range text",
        defaultValue: "#22262b",
    },
    destinationsLabelColor: {
        type: ControlType.Color,
        title: "Destinations label color",
        defaultValue: "#6b7076",
    },
    destinationsTextColor: {
        type: ControlType.Color,
        title: "Destinations text",
        defaultValue: "#22262b",
    },
    footerTextColor: {
        type: ControlType.Color,
        title: "Footer text",
        defaultValue: "#22262b",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#f2f3f5",
    },
    headerFont: {
        type: ControlType.Font,
        title: "Header font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 30, fontWeight: 700 },
    },
    dateRangeFont: {
        type: ControlType.Font,
        title: "Date range font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontFamily: "Inter",
            fontSize: 26,
            fontWeight: 700,
            fontStyle: "italic",
        },
    },
    destinationsLabelFont: {
        type: ControlType.Font,
        title: "Destinations label font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 24, fontWeight: 700 },
    },
    destinationsTextFont: {
        type: ControlType.Font,
        title: "Destinations text font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 24, fontWeight: 400 },
    },
    footerFont: {
        type: ControlType.Font,
        title: "Footer font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontFamily: "Inter", fontSize: 30, fontWeight: 700 },
    },
    dotSize: {
        type: ControlType.Number,
        title: "Dot size",
        min: 8,
        max: 60,
        defaultValue: 20,
    },
    lineWidth: {
        type: ControlType.Number,
        title: "Line width",
        min: 1,
        max: 12,
        defaultValue: 2,
    },
    railContentGap: {
        type: ControlType.Number,
        title: "Rail-content gap",
        min: 0,
        max: 80,
        defaultValue: 20,
    },
    detailGap: {
        type: ControlType.Number,
        title: "Detail row gap",
        min: 0,
        max: 40,
        defaultValue: 10,
    },
    rowGap: {
        type: ControlType.Number,
        title: "Row gap (header/detail/footer)",
        min: 0,
        max: 80,
        defaultValue: 20,
    },
    paddingX: {
        type: ControlType.Number,
        title: "Horizontal padding",
        min: 0,
        max: 120,
        defaultValue: 32,
    },
    paddingY: {
        type: ControlType.Number,
        title: "Vertical padding",
        min: 0,
        max: 120,
        defaultValue: 28,
    },
})
