import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * TravelNoticeSection
 *
 * Self-contained "Happening Now" / "Future Plans" summary component for
 * Card Controls. Drop this in as ONE layer between "Card Section" and
 * "Misplaced Card" — there's no hand-built dot/line rail to align.
 *
 * Layout (UI-polish pass, matched against the user's live app
 * screenshots): a 2-column x 3-row CSS Grid — rail column | content
 * column, one row each for header / date+destinations detail / footer.
 * The rail has one dot per row plus a single line spanning all three
 * rows behind them (`gridRow: "1 / 4"`, painted first so the dots and
 * the white detail band composite on top of it). Because the line is a
 * grid item sized by the grid's own row tracks rather than anything
 * measured in JS, it always reaches exactly from the header dot to the
 * footer dot no matter how many lines the destinations list wraps to.
 * Header and footer dots render with a `halo` — a larger, semi-transparent
 * ring behind the solid dot — the middle (detail-row) dot does not: a
 * single solid dot, matching the reference screenshots exactly. The
 * detail row also gets its own white background with a hairline gray
 * border top and bottom, spanning the FULL row width (rail included),
 * rendered first in that row's stacking order so the line/dots sit on
 * top of it rather than being interrupted by it.
 *
 * Data: reads the ONE sessionStorage record SetTravelNotice.tsx writes
 * on Save —
 *
 *   sessionStorage.getItem("kioskTravelNotice")
 *     -> { startDate, endDate, destinations, savedAt }
 *
 * That's the only key this component depends on. An earlier version
 * additionally required SetTravelNotice.tsx to write a SECOND,
 * dedicated one-shot flag key — that cross-file coordination turned out
 * to be the actual point of failure in practice (confirmed live: the
 * kioskTravelNotice record and a separate toast flag were reliably
 * written on Save, but the extra section flag was not, even after
 * re-syncing the file — pointing at something outside this repo's
 * visibility, like a stale bundle or a duplicate component, rather than
 * a code bug). Rewritten so this component needs nothing extra from
 * SetTravelNotice.tsx at all: it derives one-shot visibility purely
 * from the record's own `savedAt` timestamp, which has proven reliable
 * every time.
 *
 * Mechanism: this component tracks the `savedAt` of the last notice it
 * has already shown, in its OWN sessionStorage key
 * ("kioskTravelNoticeSectionShownAt") — read and written only here,
 * never by SetTravelNotice.tsx. Each time it checks, if the current
 * record's `savedAt` doesn't match that marker, it's a save this
 * component hasn't shown yet: show it and update the marker. If it
 * matches, it's already been shown: render nothing. Since the marker
 * lives in sessionStorage (not component/module memory), this is
 * correct regardless of whether this component actually unmounts on
 * Framer's page navigation — a fresh Save always gets a new `savedAt`,
 * so it naturally shows again for a genuinely new notice, but never
 * twice for the same one, on a refresh, after navigating away and
 * back, or for whoever uses the kiosk next in the same session.
 *
 * An earlier version of this file also ran a `setInterval` watching
 * `window.location.href`, force-hiding the section the instant the URL
 * changed, as a defensive guard in case this component's instance
 * somehow survived Framer's page navigation without unmounting. Removed
 * — it was speculative (that navigation behavior was never confirmed)
 * and it caused a real regression: the marker above proved this
 * component WAS computing and about to show a real summary, but nothing
 * ever appeared on screen, consistent with the href watcher firing
 * within its 300ms poll window on some incidental URL change (a hash,
 * a query param) that wasn't an actual page navigation, hiding the
 * summary before it could ever be seen. The sessionStorage marker alone
 * is sufficient: it's checked fresh (not cached in memory) every time
 * this reads, so it's already correct whether or not a real unmount
 * happens.
 *
 * On the canvas this always renders with sample data so it stays
 * stylable via the property controls below; the real read/hide/fill-in
 * behavior only runs in Preview/Published.
 */

const STORAGE_KEY = "kioskTravelNotice"
const SHOWN_MARKER_KEY = "kioskTravelNoticeSectionShownAt"

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
    destinations: string[]
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

function buildSummary(stored: StoredNotice): NoticeSummary {
    // Each entry stays a separate array item, rendered later as its own
    // white-space:nowrap span -- that is what actually stops a name like
    // "Michigan - United States" from breaking mid-entry, since a plain
    // "-" character is a valid line-break point under every browser's
    // default line-breaking rules regardless of the spaces around it.
    // (An earlier version swapped the internal spaces for a non-breaking
    // space character instead; that stops a break AT a space but does
    // nothing about the hyphen itself, which is exactly the "Michigan"
    // case reported -- so nowrap-per-entry replaces it rather than
    // layering on top, and also drops this file's one non-ASCII
    // character, which NOTES.md flags as having caused real bugs before.)
    const destinations = stored.destinations.map(
        (state) => `${state} - United States`
    )

    return {
        headerLabel:
            stored.startDate === todayISO() ? "Happening Now" : "Future Plans",
        dateRangeText: `${formatDisplayDate(stored.startDate)} - ${formatDisplayDate(stored.endDate)}`,
        destinations,
    }
}

// No module-level mutable state on purpose — a `let` here would be
// shared for the lifetime of the whole loaded bundle, not reset per
// page visit. The one-shot marker instead lives in sessionStorage
// itself (SHOWN_MARKER_KEY), keyed by the record's own `savedAt`.
//
// Deliberately READ-ONLY — no sessionStorage writes here. An earlier
// version wrote the marker right inside this same function, called
// from a useState lazy initializer. That's a real bug: initializer
// functions are supposed to be pure, and this environment evidently
// calls them more than once per mount — confirmed live, where the
// marker ended up matching the record's savedAt on what should have
// been the very first check, meaning one invocation wrote the marker
// and a second invocation immediately saw its own write and concluded
// "already shown," discarding the real summary the first call had
// computed. Splitting the read (here, safe to call any number of
// times — always the same answer for the same sessionStorage state)
// from the write (in the component, inside a useEffect that only runs
// after commit) fixes that regardless of how many times this gets
// called.
function readNoticeIfUnshown(): NoticeSummary | null {
    if (typeof window === "undefined") return null

    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    let stored: StoredNotice
    try {
        stored = JSON.parse(raw)
    } catch {
        return null
    }
    if (typeof stored.savedAt !== "number") return null

    if (window.sessionStorage.getItem(SHOWN_MARKER_KEY) === String(stored.savedAt)) {
        return null
    }
    return buildSummary(stored)
}

// Records that the CURRENT kioskTravelNotice record has now been shown.
// Called from a useEffect (after commit, not during the speculative
// render), and safe to call more than once: writing the same value to
// sessionStorage twice is a no-op the second time.
function markCurrentNoticeShown(): void {
    if (typeof window === "undefined") return
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
        const stored: StoredNotice = JSON.parse(raw)
        if (typeof stored.savedAt === "number") {
            window.sessionStorage.setItem(SHOWN_MARKER_KEY, String(stored.savedAt))
        }
    } catch {
        // malformed record — nothing to mark
    }
}

// Single solid dot, optionally with a larger semi-transparent ring
// behind it. Used for header/footer rail markers (halo) and the
// detail-row marker (no halo).
function Dot({
    size,
    color,
    halo,
    haloColor,
    haloSize,
}: {
    size: number
    color: string
    halo: boolean
    haloColor: string
    haloSize: number
}) {
    return (
        <div
            style={{
                width: halo ? haloSize : size,
                height: halo ? haloSize : size,
                borderRadius: "50%",
                background: halo ? haloColor : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                }}
            />
        </div>
    )
}

// Renders each destination as its own white-space:nowrap unit inside a
// flex-wrap row, so a name only ever moves to the next line as a whole
// — never splits mid-word or at the internal "-" the way a single text
// blob can.
function DestinationsList({
    destinations,
    font,
    color,
    gap,
}: {
    destinations: string[]
    font: React.CSSProperties
    color: string
    gap: number
}) {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                rowGap: gap,
                columnGap: "0.35em",
                hyphens: "none",
                wordBreak: "keep-all",
                overflowWrap: "normal",
            }}
        >
            {destinations.map((entry, i) => (
                <span
                    key={i}
                    style={{
                        ...font,
                        color,
                        whiteSpace: "nowrap",
                    }}
                >
                    {entry}
                    {i < destinations.length - 1 ? "," : ""}
                </span>
            ))}
        </div>
    )
}

const SAMPLE_SUMMARY: NoticeSummary = {
    headerLabel: "Happening Now",
    dateRangeText: "September 02, 2026 - November 03, 2026",
    destinations: ["Illinois - United States", "Texas - United States"],
}

interface Props {
    destinationsLabel: string
    footerLabel: string

    dotColor: string
    dotHaloColor: string
    dotHaloSize: number
    lineColor: string
    headerTextColor: string
    dateRangeTextColor: string
    destinationsLabelColor: string
    destinationsTextColor: string
    footerTextColor: string
    backgroundColor: string
    detailBackgroundColor: string
    detailBorderColor: string
    detailBorderWidth: number

    headerFont: React.CSSProperties
    dateRangeFont: React.CSSProperties
    destinationsLabelFont: React.CSSProperties
    destinationsTextFont: React.CSSProperties
    footerFont: React.CSSProperties

    dotSize: number
    lineWidth: number
    railContentGap: number
    detailGap: number
    destinationGap: number
    rowGap: number
    paddingX: number
    paddingTop: number
    paddingBottom: number
    detailPaddingX: number
    detailPaddingY: number

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
        dotHaloColor,
        dotHaloSize,
        lineColor,
        headerTextColor,
        dateRangeTextColor,
        destinationsLabelColor,
        destinationsTextColor,
        footerTextColor,
        backgroundColor,
        detailBackgroundColor,
        detailBorderColor,
        detailBorderWidth,
        headerFont,
        dateRangeFont,
        destinationsLabelFont,
        destinationsTextFont,
        footerFont,
        dotSize,
        lineWidth,
        railContentGap,
        detailGap,
        destinationGap,
        rowGap,
        paddingX,
        paddingTop,
        paddingBottom,
        detailPaddingX,
        detailPaddingY,
        style,
    } = props

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const [summary] = React.useState<NoticeSummary | null>(() =>
        isCanvas ? SAMPLE_SUMMARY : readNoticeIfUnshown()
    )

    // Marking "shown" is a write, so it happens here — after commit —
    // rather than inside the useState initializer above, which must
    // stay pure. See markCurrentNoticeShown()'s comment for why mixing
    // the two caused a real bug.
    React.useEffect(() => {
        if (isCanvas || !summary) return
        markCurrentNoticeShown()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Renders nothing at all (not just hidden) when there's no fresh
    // one-shot flag — the section takes up zero space in the layer
    // stack rather than leaving an empty gap.
    if (!summary) return null

    const railWidth = Math.max(dotHaloSize, dotSize)
    // The halo ring is larger than the opaque dot centered inside it,
    // so the ring's own edge sits this far outside the opaque dot's
    // edge on every side. Used to inset the line so it visually starts
    // and ends at the OPAQUE part of the header/footer dots, not the
    // halo's outer (semi-transparent) edge.
    const haloOverhang = (dotHaloSize - dotSize) / 2

    return (
        <div
            style={{
                ...style,
                width: "100%",
                boxSizing: "border-box",
                display: "grid",
                gridTemplateColumns: `${railWidth}px 1fr`,
                gridTemplateRows: "auto auto auto",
                columnGap: railContentGap,
                rowGap,
                padding: `${paddingTop}px ${paddingX}px ${paddingBottom}px`,
                background: backgroundColor,
                fontFamily: "Inter, sans-serif",
            }}
        >
            {/* White detail band. A plain (non-positioned) grid item,
                rendered FIRST so ordinary DOM-order painting puts it
                behind every sibling declared after it — deliberately
                NOT using position/z-index here: this file's previous
                pass tried an absolutely-positioned version tucked
                inside the content block, which required giving that
                block its own z-index:0 stacking context, which in turn
                made it (and its band) paint ABOVE the plain, unpositioned
                rail line regardless of z-index value — a positioned
                element with any explicit z-index always beats a
                non-positioned one, independent of z-index or DOM order.
                Plain DOM order avoids that trap entirely: nothing here
                has position set, so "declared later paints on top" is
                the only rule in play, and it's simple to verify by eye.
                Spans the full row width (gridColumn 1/3, rail included)
                via negative horizontal margins that bleed past the
                grid's own paddingX out to the section's true left/right
                edges — this only affects width; its height still comes
                from the grid's own row-2 auto-sizing, i.e. matches
                whatever's tallest in that row (in practice always the
                text block below, given realistic dot/padding sizes). */}
            <div
                style={{
                    gridColumn: "1 / 3",
                    gridRow: 2,
                    marginLeft: -paddingX,
                    marginRight: -paddingX,
                    background: detailBackgroundColor,
                    borderTop: `${detailBorderWidth}px solid ${detailBorderColor}`,
                    borderBottom: `${detailBorderWidth}px solid ${detailBorderColor}`,
                    boxSizing: "border-box",
                }}
            />

            {/* Rail line — one grid item spanning all 3 rows, so it
                always reaches exactly from the header dot to the footer
                dot regardless of how tall the detail row grows. Declared
                after the band above, so it paints on top of it.
                marginTop/marginBottom trim it inward by the halo
                overhang so it visually starts/ends at the OPAQUE part
                of the header/footer dots rather than their halo's outer
                edge — this only works because the header dot is
                top-aligned within row 1 (so its top always exactly
                matches the line's own top, whatever row 1's height is)
                and the footer dot is now bottom-aligned within row 3 to
                match the same way at the other end. */}
            <div
                style={{
                    gridColumn: 1,
                    gridRow: "1 / 4",
                    justifySelf: "center",
                    width: lineWidth,
                    background: lineColor,
                    marginTop: haloOverhang,
                    marginBottom: haloOverhang,
                }}
            />

            {/* Header dot — haloed. alignSelf:"start" so its top always
                exactly matches row 1's top, i.e. the line's own top —
                required for the line's marginTop trim above to land
                exactly on the opaque dot's edge regardless of row 1's
                actual height (driven by the header font/text). */}
            <div style={{ gridColumn: 1, gridRow: 1, justifySelf: "center", alignSelf: "start" }}>
                <Dot
                    size={dotSize}
                    color={dotColor}
                    halo
                    haloColor={dotHaloColor}
                    haloSize={dotHaloSize}
                />
            </div>

            {/* Detail-row dot — plain, single circle, no halo */}
            <div
                style={{
                    gridColumn: 1,
                    gridRow: 2,
                    justifySelf: "center",
                    alignSelf: "start",
                    marginTop: detailPaddingY,
                }}
            >
                <Dot
                    size={dotSize}
                    color={dotColor}
                    halo={false}
                    haloColor={dotHaloColor}
                    haloSize={dotHaloSize}
                />
            </div>

            {/* Footer dot — haloed. alignSelf:"end" (not "start" like
                the header dot) so its BOTTOM always exactly matches row
                3's bottom, i.e. the line's own bottom — the mirror of
                the header dot's top-alignment, needed so the line's
                marginBottom trim above lands exactly on the opaque
                dot's edge regardless of row 3's actual height (driven
                by the footer font/text). */}
            <div style={{ gridColumn: 1, gridRow: 3, justifySelf: "center", alignSelf: "end" }}>
                <Dot
                    size={dotSize}
                    color={dotColor}
                    halo
                    haloColor={dotHaloColor}
                    haloSize={dotHaloSize}
                />
            </div>

            {/* Header content */}
            <div style={{ gridColumn: 2, gridRow: 1, ...headerFont, color: headerTextColor }}>
                {summary.headerLabel}
            </div>

            {/* Detail content — sits on top of the white band above,
                since it's declared after it in the DOM. */}
            <div
                style={{
                    gridColumn: 2,
                    gridRow: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: detailGap,
                    padding: `${detailPaddingY}px ${detailPaddingX}px`,
                    boxSizing: "border-box",
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
                <DestinationsList
                    destinations={summary.destinations}
                    font={destinationsTextFont}
                    color={destinationsTextColor}
                    gap={destinationGap}
                />
            </div>

            {/* Footer content */}
            <div style={{ gridColumn: 2, gridRow: 3, ...footerFont, color: footerTextColor }}>
                {footerLabel}
            </div>
        </div>
    )
}

TravelNoticeSection.defaultProps = {
    destinationsLabel: "Destinations:",
    footerLabel: "That's All!",
    dotColor: "#2f8f8b",
    dotHaloColor: "rgba(47, 143, 139, 0.22)",
    dotHaloSize: 34,
    lineColor: "#c7e3e1",
    headerTextColor: "#22262b",
    dateRangeTextColor: "#22262b",
    destinationsLabelColor: "#6b7076",
    destinationsTextColor: "#22262b",
    footerTextColor: "#22262b",
    backgroundColor: "#f2f3f5",
    detailBackgroundColor: "#ffffff",
    detailBorderColor: "#e2e5e8",
    detailBorderWidth: 1,
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
    dotSize: 16,
    lineWidth: 2,
    railContentGap: 20,
    detailGap: 10,
    destinationGap: 4,
    rowGap: 20,
    paddingX: 32,
    paddingTop: 28,
    paddingBottom: 28,
    detailPaddingX: 24,
    detailPaddingY: 20,
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
        defaultValue: "#2f8f8b",
    },
    dotHaloColor: {
        type: ControlType.Color,
        title: "Dot halo color",
        defaultValue: "rgba(47, 143, 139, 0.22)",
    },
    dotHaloSize: {
        type: ControlType.Number,
        title: "Dot halo size",
        min: 8,
        max: 100,
        defaultValue: 34,
    },
    lineColor: {
        type: ControlType.Color,
        title: "Line color",
        defaultValue: "#c7e3e1",
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
    detailBackgroundColor: {
        type: ControlType.Color,
        title: "Detail band background",
        defaultValue: "#ffffff",
    },
    detailBorderColor: {
        type: ControlType.Color,
        title: "Detail band border",
        defaultValue: "#e2e5e8",
    },
    detailBorderWidth: {
        type: ControlType.Number,
        title: "Detail band border width",
        min: 0,
        max: 6,
        defaultValue: 1,
    },
    headerFont: {
        type: ControlType.Font,
        title: "Header font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30 },
    },
    dateRangeFont: {
        type: ControlType.Font,
        title: "Date range font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 26 },
    },
    destinationsLabelFont: {
        type: ControlType.Font,
        title: "Destinations label font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 24 },
    },
    destinationsTextFont: {
        type: ControlType.Font,
        title: "Destinations text font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 24 },
    },
    footerFont: {
        type: ControlType.Font,
        title: "Footer font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 30 },
    },
    dotSize: {
        type: ControlType.Number,
        title: "Dot size",
        min: 8,
        max: 60,
        defaultValue: 16,
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
    destinationGap: {
        type: ControlType.Number,
        title: "Destination wrap row gap",
        min: 0,
        max: 40,
        defaultValue: 4,
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
    paddingTop: {
        type: ControlType.Number,
        title: "Top padding",
        min: 0,
        max: 120,
        defaultValue: 28,
    },
    paddingBottom: {
        type: ControlType.Number,
        title: "Bottom padding",
        min: 0,
        max: 120,
        defaultValue: 28,
    },
    detailPaddingX: {
        type: ControlType.Number,
        title: "Detail band horizontal padding",
        min: 0,
        max: 120,
        defaultValue: 24,
    },
    detailPaddingY: {
        type: ControlType.Number,
        title: "Detail band vertical padding",
        min: 0,
        max: 120,
        defaultValue: 20,
    },
})
