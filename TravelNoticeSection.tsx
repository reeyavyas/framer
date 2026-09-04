import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

/**
 * TravelNoticeSection
 *
 * Four Code Overrides for the "Happening Now" / "Future Plans" summary
 * row on Card Controls (right panel → Code → Override → this file → pick
 * the function), applied to a hand-built layer group sitting between
 * "Card Section" and "Misplaced Card". Expected layer shape — see the
 * layer recipe handed off alongside this file for the full build:
 *
 *   Travel Notice Section (outer frame)      <- withTravelNoticeSectionVisibility
 *     ├─ TN Rail (dot / line / dot)           (static, no override)
 *     └─ TN Content
 *          ├─ TN Header Text                  <- withTravelNoticeHeaderLabel
 *          ├─ TN Detail Block
 *          │    ├─ TN Date Range Text         <- withTravelNoticeDateRangeText
 *          │    ├─ TN Destinations Label      (static text: "Destinations:")
 *          │    └─ TN Destinations Text       <- withTravelNoticeDestinationsText
 *          └─ TN Footer Text                  (static text: "That's All!")
 *
 * withTravelNoticeSectionVisibility goes on the outer frame and hides the
 * whole thing (display: none) unless a fresh one-shot flag is present.
 *
 * One-shot by design: kioskTravelNoticeSectionFlag is read and cleared
 * once per page load, the moment any one of these four overrides first
 * mounts (whichever happens to mount first — the read is idempotent, so
 * it doesn't matter which). That means the section shows on the page
 * load right after Save is clicked, and disappears again on any later
 * refresh of Card Controls within the same session — this section's
 * visibility is intentionally NOT tied to whether kioskTravelNotice still
 * has data (it does, and keeps it — just this section stops showing it).
 *
 * On the canvas all four overrides are inert — layers render exactly as
 * designed, so the section stays freely stylable there. The read/hide/
 * fill-in behavior only runs in Preview/Published.
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
    headerLabel: "Happening Now" | "Future Plans"
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

// Runs once per page load regardless of how many of the four overrides
// below mount — reads the one-shot flag and clears it immediately (so a
// later refresh of this same page can't re-show the section), and — only
// if the flag was actually set — reads the persistent kioskTravelNotice
// record to build the summary these overrides render.
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

function useNoticeSummary(isCanvas: boolean): NoticeSummary | null {
    const [summary] = React.useState<NoticeSummary | null>(() => {
        if (isCanvas) return null
        armSectionFromStorageOnce()
        return noticeSummary
    })
    return summary
}

export function withTravelNoticeSectionVisibility(
    Component: ComponentType<any>
): ComponentType<any> {
    return function TravelNoticeSectionVisibility(props: any) {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas
        const summary = useNoticeSummary(isCanvas)
        if (isCanvas) return <Component {...props} />

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    display: summary ? props.style?.display : "none",
                }}
            />
        )
    }
}

function makeSummaryTextOverride(pick: (summary: NoticeSummary) => string) {
    return function (Component: ComponentType<any>): ComponentType<any> {
        return function TravelNoticeSummaryText(props: any) {
            const isCanvas = RenderTarget.current() === RenderTarget.canvas
            const summary = useNoticeSummary(isCanvas)
            if (isCanvas || !summary) return <Component {...props} />
            return <Component {...props} text={pick(summary)} />
        }
    }
}

export const withTravelNoticeHeaderLabel = makeSummaryTextOverride(
    (summary) => summary.headerLabel
)
export const withTravelNoticeDateRangeText = makeSummaryTextOverride(
    (summary) => summary.dateRangeText
)
export const withTravelNoticeDestinationsText = makeSummaryTextOverride(
    (summary) => summary.destinationsText
)
