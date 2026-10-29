import * as React from "react"
import * as Framer from "framer"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useReducedMotion } from "framer-motion"
import { gsap } from "gsap"

// ATM lesson Can Your Money Double?: a Rule of 72 slider. The kid drags the interest rate (2, 4, 6, 8 or 12%) and
// "72 ÷ 8% = 9 years" changes the moment the thumb snaps to a stop. Letting go plays 36 years: the hourglass
// drains once per doubling and flips, and at each flip the $1,000 doubles and a burst of coins drops onto the
// stacks (1 coin = $1,000, so 2 coins at 2% and 64 at 12%). Under each stop the slider shows its years to double. At year 36 the reveal
// for that rate shows and Done appears; it stays from then on. Dragging again stops the run and resets it, so quick
// taps never stack two runs. With no tap for Idle (s) after a run, an orange strip fills along Done's bottom edge
// and then it goes to When Done. Runs and the idle strip hold while the inactivity overlay is open. On the Framer
// canvas it shows a finished run; with reduced motion a run finishes at once. No background of its own.
//
// The hourglass is ATMHourglass's art (ATM/artwork/vectors/hourglass/build.py, export_anim) without its clock and
// coin stacks, with the same flip: hgA drains, then turns over and hands over to hgB, a still copy of its start
// state turned upside down. The coin is ATMCoinRace's. Transforms and opacity only; no blur, filters or CSS
// transitions.

const RATES = [2, 4, 6, 8, 12] // each divides 72 into a number of years that goes into 36 a whole number of times
const SPAN = 36 // years in a run
const START = 1000
const NAVY = "#002c44"
const MIDNIGHT = "#11232d"
const TEAL = "#059390"
const YOLK = "#ffcc40"
const DEEP = "#003b5c"
const MINT = "#bce2d7"
const ORANGE = "#f6a11d" // Done's idle timer
const money = (n: number) => "$" + n.toLocaleString("en-US")
// "$1,300" and the like in bold, the rest as written
const bold = (s: string) =>
    s.split(/(\$[\d,]+)/).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))

// Framer's router, read from the module so a Framer version without it can't break the file.
const useRouter: () => unknown =
    (Framer as { useRouter?: () => unknown }).useRouter ?? (() => undefined)

// The hourglass, centred, with room for the flip (it turns at 72% size, inside this box)
const VIEWBOX = "1150 90 1720 2400"
// prettier-ignore
const ART = `<defs><radialGradient id="hourglass-B-gloss-shadow" ><stop offset="0" stop-color="#002c44" stop-opacity="0.45"/><stop offset="0.45" stop-color="#002c44" stop-opacity="0.4"/><stop offset="0.7" stop-color="#002c44" stop-opacity="0.2"/><stop offset="0.85" stop-color="#002c44" stop-opacity="0.1"/><stop offset="0.95" stop-color="#002c44" stop-opacity="0.0"/><stop offset="1" stop-color="#002c44" stop-opacity="0.0"/></radialGradient><clipPath id="hourglass-B-gloss-posts"><rect x="1393.0" y="330" width="86" height="1782"/><rect x="2523.0" y="330" width="86" height="1782"/></clipPath><clipPath id="hourglass-B-gloss-collar"><path d="M1581,380 L1581,480 A420,35 0 0 0 2421,480 L2421,380 A420,35 0 0 0 1581,380 Z"/></clipPath><linearGradient id="hourglass-B-gloss-band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.12" stop-color="#fff" stop-opacity="0"/><stop offset="0.17" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.23" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.8" stop-color="#fff" stop-opacity="0"/><stop offset="0.86" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.9" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="hourglass-B-gloss-frameSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0.00" stop-color="#9fe3f8"/><stop offset="0.25" stop-color="#5fd0f2"/><stop offset="0.50" stop-color="#00acdd"/><stop offset="0.75" stop-color="#006a96"/><stop offset="1.00" stop-color="#00acdd"/></linearGradient><linearGradient id="hourglass-B-gloss-gloss-006a96" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.16" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#006a96" stop-opacity="0"/><stop offset="0.75" stop-color="#006a96" stop-opacity="0.45"/><stop offset="1" stop-color="#006a96" stop-opacity="0.8"/></linearGradient><linearGradient id="hourglass-B-gloss-frameTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#9fe3f8"/><stop offset="1.00" stop-color="#5fd0f2"/></linearGradient><linearGradient id="hourglass-B-gloss-frameTopIn" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#5fd0f2"/><stop offset="1.00" stop-color="#9fe3f8"/></linearGradient><radialGradient id="hourglass-B-gloss-spec" ><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="hourglass-B-gloss-occ" ><stop offset="0" stop-color="#006a96" stop-opacity="0.55"/><stop offset="0.45" stop-color="#006a96" stop-opacity="0.5"/><stop offset="0.7" stop-color="#006a96" stop-opacity="0.3"/><stop offset="0.85" stop-color="#006a96" stop-opacity="0.1"/><stop offset="0.95" stop-color="#006a96" stop-opacity="0.0"/><stop offset="1" stop-color="#006a96" stop-opacity="0.0"/></radialGradient><linearGradient id="hourglass-B-gloss-post" x1="0" y1="0" x2="1" y2="0"><stop offset="0.00" stop-color="#9fe3f8"/><stop offset="0.25" stop-color="#5fd0f2"/><stop offset="0.50" stop-color="#00acdd"/><stop offset="0.75" stop-color="#006a96"/><stop offset="1.00" stop-color="#00acdd"/></linearGradient><clipPath id="hourglass-B-gloss-glassclip"><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z"/></clipPath><linearGradient id="hourglass-B-gloss-glass" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0.00" stop-color="#ffffff"/><stop offset="0.33" stop-color="#d6f0e8"/><stop offset="0.67" stop-color="#bce2d7"/><stop offset="1.00" stop-color="#8fd3c0"/></linearGradient><linearGradient id="hourglass-B-gloss-gloss-3fa58b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.16" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#3fa58b" stop-opacity="0"/><stop offset="0.75" stop-color="#3fa58b" stop-opacity="0.45"/><stop offset="1" stop-color="#3fa58b" stop-opacity="0.8"/></linearGradient><linearGradient id="hourglass-B-gloss-sand" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#ffe07a"/><stop offset="0.50" stop-color="#ffcc40"/><stop offset="1.00" stop-color="#f6a11d"/></linearGradient><linearGradient id="hourglass-B-gloss-gloss-c26f0a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.16" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#c26f0a" stop-opacity="0"/><stop offset="0.75" stop-color="#c26f0a" stop-opacity="0.45"/><stop offset="1" stop-color="#c26f0a" stop-opacity="0.8"/></linearGradient><linearGradient id="hourglass-B-gloss-sandTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#fff0b8"/><stop offset="1.00" stop-color="#ffe07a"/></linearGradient><linearGradient id="hourglass-B-gloss-pile" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0.00" stop-color="#ffe07a"/><stop offset="0.50" stop-color="#ffcc40"/><stop offset="1.00" stop-color="#f6a11d"/></linearGradient><linearGradient id="hourglass-B-gloss-refl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.77"/><stop offset="0.1" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.72" stop-color="#3fa58b" stop-opacity="0"/><stop offset="0.9" stop-color="#3fa58b" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0.63"/></linearGradient><radialGradient id="hourglass-B-gloss-drop" ><stop offset="0" stop-color="#002c44" stop-opacity="0.6"/><stop offset="0.45" stop-color="#002c44" stop-opacity="0.54"/><stop offset="0.7" stop-color="#002c44" stop-opacity="0.33"/><stop offset="0.85" stop-color="#002c44" stop-opacity="0.1"/><stop offset="0.95" stop-color="#002c44" stop-opacity="0.0"/><stop offset="1" stop-color="#002c44" stop-opacity="0.0"/></radialGradient><linearGradient id="hourglass-B-gloss-bezelL" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#8fe0e0"/><stop offset="0.50" stop-color="#3bbfc0"/><stop offset="1.00" stop-color="#059390"/></linearGradient><linearGradient id="hourglass-B-gloss-gloss-00615e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.16" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#00615e" stop-opacity="0"/><stop offset="0.75" stop-color="#00615e" stop-opacity="0.45"/><stop offset="1" stop-color="#00615e" stop-opacity="0.8"/></linearGradient><linearGradient id="hourglass-B-gloss-faceL" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#ffffff"/><stop offset="0.50" stop-color="#d6f0e8"/><stop offset="1.00" stop-color="#bce2d7"/></linearGradient><linearGradient id="hourglass-B-gloss-jcRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e08a12" stop-opacity="1"/><stop offset="0.1" stop-color="#ffe07a" stop-opacity="1"/><stop offset="0.25" stop-color="#f6a11d" stop-opacity="1"/><stop offset="0.42" stop-color="#fff0b8" stop-opacity="1"/><stop offset="0.55" stop-color="#f6a11d" stop-opacity="1"/><stop offset="0.8" stop-color="#e08a12" stop-opacity="1"/><stop offset="1" stop-color="#cf7a0c" stop-opacity="1"/></linearGradient><linearGradient id="hourglass-B-gloss-jcSheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.15" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient><linearGradient id="hourglass-B-gloss-jcFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8" stop-opacity="1"/><stop offset="0.35" stop-color="#ffcc40" stop-opacity="1"/><stop offset="0.7" stop-color="#f6a11d" stop-opacity="1"/><stop offset="1" stop-color="#e08a12" stop-opacity="1"/></linearGradient><linearGradient id="hourglass-B-gloss-jcBevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e08a12" stop-opacity="1"/><stop offset="0.4" stop-color="#f6a11d" stop-opacity="1"/><stop offset="0.75" stop-color="#ffcc40" stop-opacity="1"/><stop offset="1" stop-color="#fff0b8" stop-opacity="1"/></linearGradient><radialGradient id="hourglass-B-gloss-jcIn" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffe07a" stop-opacity="1"/><stop offset="0.6" stop-color="#ffcc40" stop-opacity="1"/><stop offset="1" stop-color="#f6a11d" stop-opacity="1"/></radialGradient><radialGradient id="hourglass-B-gloss-jcShade" ><stop offset="0" stop-color="#cf7a0c" stop-opacity="0.5"/><stop offset="0.3" stop-color="#cf7a0c" stop-opacity="0.4"/><stop offset="0.55" stop-color="#cf7a0c" stop-opacity="0.22"/><stop offset="0.8" stop-color="#cf7a0c" stop-opacity="0.06"/><stop offset="1" stop-color="#cf7a0c" stop-opacity="0"/></radialGradient><radialGradient id="hourglass-B-gloss-jcSpec" ><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.76"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.4"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.1"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><radialGradient id="hourglass-B-gloss-jcHot" ><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.15"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><ellipse cx="2021" cy="2362" rx="840" ry="112" fill="url(#hourglass-B-gloss-shadow)"/><g data-k="squash"><g data-k="hourglass"><g data-k="hgA"><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1362.4,2116 V2258" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2640.1,2250.1 A639.08,80 0 0 1 2166.4,2327.4" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2640.1,2116 V2250.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="2112" rx="647" ry="80" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="2112" rx="647" ry="80" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="2118.4" rx="601.7" ry="62.4" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1360.3,2109.5 A641.1,74.1 0 0 0 2492.1,2154.6" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1369.7,2104.2 A641.1,74.1 0 0 1 2321.5,2052.9" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1600" cy="2096" rx="78" ry="24" transform="rotate(-4 1600 2096)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1486.4,2137.5 A594.2,50.96 0 0 0 1797.8,2159.9" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1409.5,2209.6 A604.76,80 0 0 0 1537.7,2244.4" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><ellipse cx="1446" cy="2120" rx="78" ry="26" fill="url(#hourglass-B-gloss-occ)"/><ellipse cx="2576" cy="2120" rx="78" ry="26" fill="url(#hourglass-B-gloss-occ)"/><ellipse cx="2016" cy="2122" rx="475" ry="72" fill="url(#hourglass-B-gloss-occ)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-post)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1399.8,330 V2112" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.7" stroke-linecap="round"/><path d="M1471.1,330 V2112" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><path d="M1415.0,450 V2062" fill="none" stroke="#d9eeff" stroke-width="12" stroke-linecap="round" opacity="0.9"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-post)"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M2529.8,330 V2112" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.7" stroke-linecap="round"/><path d="M2601.1,330 V2112" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><path d="M2545.0,450 V2062" fill="none" stroke="#d9eeff" stroke-width="12" stroke-linecap="round" opacity="0.9"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1584.4,2006 V2112" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2418.1,2104.1 A417.08,38 0 0 1 2108.9,2140.8" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2418.1,2006 V2104.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="2002" rx="425" ry="38" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="2002" rx="425" ry="38" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="2005.0" rx="395.2" ry="29.6" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1582.2,1998.1 A419.1,32.1 0 0 0 2322.0,2017.6" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1588.3,2001.5 A419.1,32.1 0 0 1 2210.5,1979.3" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1738" cy="1994" rx="51" ry="12" transform="rotate(-4 1738 1994)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1678.7,2006.5 A372.2,8.96 0 0 0 1873.7,2010.4" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1626.6,2068.7 A382.76,38 0 0 0 1707.8,2085.2" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-glass)"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-gloss-3fa58b)"/><g clip-path="url(#hourglass-B-gloss-glassclip)"><g data-k="sandTop"><path d="M1501,778 H2501 V1150 C2071,1215 2035,1305 2001,1305 C1967,1305 1931,1215 1501,1150 Z" fill="url(#hourglass-B-gloss-sand)"/><path d="M1501,778 H2501 V1150 C2071,1215 2035,1305 2001,1305 C1967,1305 1931,1215 1501,1150 Z" fill="url(#hourglass-B-gloss-gloss-c26f0a)"/></g><g data-k="sandSurf"><ellipse cx="2001" cy="778" rx="399" ry="52" fill="url(#hourglass-B-gloss-sandTop)"/><path d="M1610.7,775.3 A390.5,43.6 0 0 0 2391.3,775.3" fill="none" stroke="#fff0b8" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1702.9,765.3 A328.9,30 0 0 1 1862.0,750.8" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" opacity="0.8"/></g><circle data-k="drop0" cx="2003" cy="1400" r="20" fill="#f6a11d"/><circle data-k="drop1" cx="2030" cy="1475" r="16" fill="#f6a11d"/><circle data-k="drop2" cx="1995" cy="1540" r="17" fill="#f6a11d"/><circle data-k="drop3" cx="2055" cy="1600" r="18" fill="#f6a11d"/><circle data-k="drop4" cx="1945" cy="1600" r="14" fill="#f6a11d"/><g data-k="sandBot"><path d="M1561,1990 C1701,1830 1891,1645 2001,1645 C2111,1645 2301,1830 2441,1990 V2100 H1561 Z" fill="url(#hourglass-B-gloss-pile)"/><path d="M1561,1990 C1701,1830 1891,1645 2001,1645 C2111,1645 2301,1830 2441,1990 V2100 H1561 Z" fill="url(#hourglass-B-gloss-gloss-c26f0a)"/><path d="M1931,1700 C1851,1760 1771,1840 1711,1930" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" opacity="0.7"/></g><g><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><g><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-refl)"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="48"/></g><path d="M1646.5,560 L1644.1,580 L1642.2,600 L1641.0,620 L1640.2,640 L1640.0,660 L1640.9,680 L1643.7,700 L1648.0,720 L1654.3,740 L1661.5,760 L1670.8,780 L1681.3,800 L1693.1,820 L1705.9,840 L1719.7,860 L1735.4,880 L1750.8,900" fill="none" stroke="#ffffff" stroke-width="29" stroke-linecap="round" opacity="0.85"/><path d="M1812.8,1530 L1793.7,1550 L1776.0,1570 L1757.5,1590 L1740.8,1610 L1725.9,1630 L1710.8,1650 L1696.7,1670 L1684.6,1690 L1673.6,1710 L1663.4,1730 L1655.3,1750 L1648.8,1770 L1644.0,1790 L1641.0,1810 L1640.0,1830 L1640.5,1850 L1642.0,1870 L1644.6,1890" fill="none" stroke="#ffffff" stroke-width="29" stroke-linecap="round" opacity="0.85"/><path d="M2363.8,600 L2365.0,620 L2365.8,640 L2366.0,660 L2365.1,680 L2362.3,700" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.7"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="none" stroke="#8fe0e0" stroke-opacity=".9" stroke-width="10.0"/><ellipse cx="1701" cy="600" rx="22" ry="62" transform="rotate(12 1701 600)" fill="url(#hourglass-B-gloss-spec)"/><ellipse cx="1711" cy="1700" rx="19" ry="54" transform="rotate(-24 1711 1700)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1581,380 L1581,480 A420,35 0 0 0 2421,480 L2421,380 A420,35 0 0 0 1581,380 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1581,380 L1581,480 A420,35 0 0 0 2421,480 L2421,380 A420,35 0 0 0 1581,380 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1589.4,384 V480" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2413.1,472.1 A412.08,35 0 0 1 2107.7,505.9" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2413.1,384 V472.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><g clip-path="url(#hourglass-B-gloss-posts)"><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><g clip-path="url(#hourglass-B-gloss-collar)"><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1362.4,228 V369" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2640.1,361.1 A639.08,64 0 0 1 2166.4,422.9" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2640.1,228 V361.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="224" rx="647" ry="64" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="224" rx="647" ry="64" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="229.1" rx="601.7" ry="49.9" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1360.3,221.0 A641.1,58.1 0 0 0 2492.1,256.3" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1369.7,219.0 A641.1,58.1 0 0 1 2321.5,178.8" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1600" cy="211" rx="78" ry="19" transform="rotate(-4 1600 211)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1486.4,241.5 A594.2,34.96 0 0 0 1797.8,256.9" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1409.5,316.2 A604.76,64 0 0 0 1537.7,344.0" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><ellipse cx="1416" cy="520" rx="12" ry="59" transform="rotate(0 1416 520)" fill="url(#hourglass-B-gloss-spec)"/><ellipse cx="2546" cy="520" rx="12" ry="59" transform="rotate(0 2546 520)" fill="url(#hourglass-B-gloss-spec)"/></g><g data-k="hgB" opacity="0" transform="rotate(180 2001 1249)"><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1354,2112 L1354,2258 A647,80 0 0 0 2648,2258 L2648,2112 A647,80 0 0 0 1354,2112 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1362.4,2116 V2258" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2640.1,2250.1 A639.08,80 0 0 1 2166.4,2327.4" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2640.1,2116 V2250.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="2112" rx="647" ry="80" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="2112" rx="647" ry="80" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="2118.4" rx="601.7" ry="62.4" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1360.3,2109.5 A641.1,74.1 0 0 0 2492.1,2154.6" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1369.7,2104.2 A641.1,74.1 0 0 1 2321.5,2052.9" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1600" cy="2096" rx="78" ry="24" transform="rotate(-4 1600 2096)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1486.4,2137.5 A594.2,50.96 0 0 0 1797.8,2159.9" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1409.5,2209.6 A604.76,80 0 0 0 1537.7,2244.4" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><ellipse cx="1446" cy="2120" rx="78" ry="26" fill="url(#hourglass-B-gloss-occ)"/><ellipse cx="2576" cy="2120" rx="78" ry="26" fill="url(#hourglass-B-gloss-occ)"/><ellipse cx="2016" cy="2122" rx="475" ry="72" fill="url(#hourglass-B-gloss-occ)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-post)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1393.0,330 L1393.0,2112 A43.0,12 0 0 0 1479.0,2112 L1479.0,330 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1399.8,330 V2112" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.7" stroke-linecap="round"/><path d="M1471.1,330 V2112" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><path d="M1415.0,450 V2062" fill="none" stroke="#d9eeff" stroke-width="12" stroke-linecap="round" opacity="0.9"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-post)"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M2523.0,330 L2523.0,2112 A43.0,12 0 0 0 2609.0,2112 L2609.0,330 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M2529.8,330 V2112" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.7" stroke-linecap="round"/><path d="M2601.1,330 V2112" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><path d="M2545.0,450 V2062" fill="none" stroke="#d9eeff" stroke-width="12" stroke-linecap="round" opacity="0.9"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1576,2002 L1576,2112 A425,38 0 0 0 2426,2112 L2426,2002 A425,38 0 0 0 1576,2002 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1584.4,2006 V2112" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2418.1,2104.1 A417.08,38 0 0 1 2108.9,2140.8" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2418.1,2006 V2104.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="2002" rx="425" ry="38" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="2002" rx="425" ry="38" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="2005.0" rx="395.2" ry="29.6" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1582.2,1998.1 A419.1,32.1 0 0 0 2322.0,2017.6" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1588.3,2001.5 A419.1,32.1 0 0 1 2210.5,1979.3" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1738" cy="1994" rx="51" ry="12" transform="rotate(-4 1738 1994)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1678.7,2006.5 A372.2,8.96 0 0 0 1873.7,2010.4" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1626.6,2068.7 A382.76,38 0 0 0 1707.8,2085.2" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-glass)"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-gloss-3fa58b)"/><g clip-path="url(#hourglass-B-gloss-glassclip)"><g><path d="M1501,778 H2501 V1150 C2071,1215 2035,1305 2001,1305 C1967,1305 1931,1215 1501,1150 Z" fill="url(#hourglass-B-gloss-sand)"/><path d="M1501,778 H2501 V1150 C2071,1215 2035,1305 2001,1305 C1967,1305 1931,1215 1501,1150 Z" fill="url(#hourglass-B-gloss-gloss-c26f0a)"/></g><g><ellipse cx="2001" cy="778" rx="399" ry="52" fill="url(#hourglass-B-gloss-sandTop)"/><path d="M1610.7,775.3 A390.5,43.6 0 0 0 2391.3,775.3" fill="none" stroke="#fff0b8" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1702.9,765.3 A328.9,30 0 0 1 1862.0,750.8" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" opacity="0.8"/></g><g><path d="M1561,1990 C1701,1830 1891,1645 2001,1645 C2111,1645 2301,1830 2441,1990 V2100 H1561 Z" fill="url(#hourglass-B-gloss-pile)"/><path d="M1561,1990 C1701,1830 1891,1645 2001,1645 C2111,1645 2301,1830 2441,1990 V2100 H1561 Z" fill="url(#hourglass-B-gloss-gloss-c26f0a)"/><path d="M1931,1700 C1851,1760 1771,1840 1711,1930" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" opacity="0.7"/></g><g><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M2371,2021 A425,38 0 0 1 1631,2021" fill="none" stroke="#c26f0a" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><g><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1603,480 A420,35 0 0 0 2399,480" fill="none" stroke="#3fa58b" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="url(#hourglass-B-gloss-refl)"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="48"/></g><path d="M1646.5,560 L1644.1,580 L1642.2,600 L1641.0,620 L1640.2,640 L1640.0,660 L1640.9,680 L1643.7,700 L1648.0,720 L1654.3,740 L1661.5,760 L1670.8,780 L1681.3,800 L1693.1,820 L1705.9,840 L1719.7,860 L1735.4,880 L1750.8,900" fill="none" stroke="#ffffff" stroke-width="29" stroke-linecap="round" opacity="0.85"/><path d="M1812.8,1530 L1793.7,1550 L1776.0,1570 L1757.5,1590 L1740.8,1610 L1725.9,1630 L1710.8,1650 L1696.7,1670 L1684.6,1690 L1673.6,1710 L1663.4,1730 L1655.3,1750 L1648.8,1770 L1644.0,1790 L1641.0,1810 L1640.0,1830 L1640.5,1850 L1642.0,1870 L1644.6,1890" fill="none" stroke="#ffffff" stroke-width="29" stroke-linecap="round" opacity="0.85"/><path d="M2363.8,600 L2365.0,620 L2365.8,640 L2366.0,660 L2365.1,680 L2362.3,700" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.7"/><path d="M2399,470 C2418,540 2424,600 2424,660 C2424,860 2140,1050 2075,1170 C2060,1200 2056,1225 2056,1250 C2056,1275 2060,1300 2075,1330 C2140,1450 2424,1640 2424,1830 C2424,1910 2400,1975 2371,2021 A425,38 0 0 1 1631,2021 C1602,1975 1578,1910 1578,1830 C1578,1640 1862,1450 1927,1330 C1942,1300 1946,1275 1946,1250 C1946,1225 1942,1200 1927,1170 C1862,1050 1578,860 1578,660 C1578,600 1584,540 1603,470 Z" fill="none" stroke="#8fe0e0" stroke-opacity=".9" stroke-width="10.0"/><ellipse cx="1701" cy="600" rx="22" ry="62" transform="rotate(12 1701 600)" fill="url(#hourglass-B-gloss-spec)"/><ellipse cx="1711" cy="1700" rx="19" ry="54" transform="rotate(-24 1711 1700)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1581,380 L1581,480 A420,35 0 0 0 2421,480 L2421,380 A420,35 0 0 0 1581,380 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1581,380 L1581,480 A420,35 0 0 0 2421,480 L2421,380 A420,35 0 0 0 1581,380 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1589.4,384 V480" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2413.1,472.1 A412.08,35 0 0 1 2107.7,505.9" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2413.1,384 V472.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><g clip-path="url(#hourglass-B-gloss-posts)"><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><g clip-path="url(#hourglass-B-gloss-collar)"><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="84.5" stroke-opacity="0.1" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="58.1" stroke-opacity="0.13" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="34.3" stroke-opacity="0.17" stroke-linecap="round"/><path d="M1354,369 A647,64 0 0 0 2648,369" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.22" stroke-linecap="round"/></g><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-frameSide)"/><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-gloss-006a96)"/><path d="M1354,224 L1354,369 A647,64 0 0 0 2648,369 L2648,224 A647,64 0 0 0 1354,224 Z" fill="url(#hourglass-B-gloss-band)"/><path d="M1362.4,228 V369" fill="none" stroke="#ffffff" stroke-width="10.1" stroke-opacity="0.75" stroke-linecap="round"/><path d="M2640.1,361.1 A639.08,64 0 0 1 2166.4,422.9" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.55" stroke-linecap="round"/><path d="M2640.1,228 V361.1" fill="none" stroke="#006a96" stroke-width="15.8" stroke-opacity="0.5" stroke-linecap="round"/><ellipse cx="2001" cy="224" rx="647" ry="64" fill="url(#hourglass-B-gloss-frameTop)"/><ellipse cx="2001" cy="224" rx="647" ry="64" fill="url(#hourglass-B-gloss-gloss-006a96)"/><ellipse cx="2001" cy="229.1" rx="601.7" ry="49.9" fill="url(#hourglass-B-gloss-frameTopIn)" opacity=".55"/><path d="M1360.3,221.0 A641.1,58.1 0 0 0 2492.1,256.3" fill="none" stroke="#ffffff" stroke-width="8.4" stroke-opacity="0.9" stroke-linecap="round"/><path d="M1369.7,219.0 A641.1,58.1 0 0 1 2321.5,178.8" fill="none" stroke="#ffffff" stroke-width="6.8" stroke-opacity="0.6" stroke-linecap="round"/><ellipse cx="1600" cy="211" rx="78" ry="19" transform="rotate(-4 1600 211)" fill="url(#hourglass-B-gloss-spec)"/><path d="M1486.4,241.5 A594.2,34.96 0 0 0 1797.8,256.9" fill="none" stroke="#d9eeff" stroke-width="13" stroke-linecap="round"/><path d="M1409.5,316.2 A604.76,64 0 0 0 1537.7,344.0" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.55"/><ellipse cx="1416" cy="520" rx="12" ry="59" transform="rotate(0 1416 520)" fill="url(#hourglass-B-gloss-spec)"/><ellipse cx="2546" cy="520" rx="12" ry="59" transform="rotate(0 2546 520)" fill="url(#hourglass-B-gloss-spec)"/></g></g></g>`

const FLIP = 0.55 // the flip's length in seconds, whatever the rate
const SETTLE = 0.25 // the landing squash settles over this long before the next drain
const CENTRE = "2001 1249" // the hourglass's middle (its waist): it flips about here
const GROUND = "2001 2338" // it squashes toward the ground here on landing
const TOP_TIP = "2001 1305" // the top sand sinks toward its tip...
const TOP_DRAIN = 0.5 // ...to half its height
const SURFACE = { origin: "2001 778", dy: 263.5, scale: 0.462 } // the sand's surface drops and narrows with the glass
const FLOOR = "2001 2030" // the bottom pile grows from the glass floor...
const PILE_GROW = 1.4 // ...to 1.4 times its height
const DROPS = [1400, 1475, 1540, 1600, 1600] // each drop's resting height; it falls from the neck to the pile
const NECK = 1300
const LAND = 1560
const DROP_FALL = 0.55

// One run: `doubles` drains of `drain` seconds, each followed by a flip. onYear gets the years gone by as they
// run; onDouble gets the number of doublings at each flip's midpoint; onEnd fires after the last landing.
function buildRun(
    svg: SVGSVGElement,
    drain: number,
    doubles: number,
    onYear: (y: number) => void,
    onDouble: (n: number) => void,
    onEnd: () => void
) {
    const q = (k: string) => svg.querySelector(`[data-k="${k}"]`)
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } })
    const hgA = q("hgA")
    const hgB = q("hgB")
    const hourglass = q("hourglass")
    const squash = q("squash")
    const top = q("sandTop")
    const surf = q("sandSurf")
    const pile = q("sandBot")
    const years = { y: 0 }
    const per = SPAN / doubles
    const cycle = drain + FLIP + SETTLE
    const falls = Math.max(1, Math.floor((drain - 0.6) / DROP_FALL))
    for (let k = 0; k < doubles; k++) {
        const t = k * cycle
        // back to the start state upright (it matches hgB at 180°, so this swap can't be seen)
        if (hgA && hgB && hourglass && squash)
            tl.set(hgA, { opacity: 1 }, t)
                .set(hgB, { opacity: 0 }, t)
                .set(hourglass, { svgOrigin: CENTRE, rotation: 0, scale: 1 }, t)
        if (top)
            tl.fromTo(
                top,
                { svgOrigin: TOP_TIP, scaleY: 1 },
                { scaleY: TOP_DRAIN, duration: drain, ease: "none" },
                t
            )
        if (surf)
            tl.fromTo(
                surf,
                { svgOrigin: SURFACE.origin, y: 0, scale: 1 },
                {
                    y: SURFACE.dy,
                    scale: SURFACE.scale,
                    duration: drain,
                    ease: "none",
                },
                t
            )
        if (pile)
            tl.fromTo(
                pile,
                { svgOrigin: FLOOR, scaleY: 1 },
                { scaleY: PILE_GROW, duration: drain, ease: "none" },
                t
            )
        DROPS.forEach((rest, i) => {
            const d = q(`drop${i}`)
            if (!d) return
            const at = t + 0.1 + i * 0.11
            tl.set(d, { opacity: 0 }, t)
            tl.fromTo(
                d,
                { y: NECK - rest },
                {
                    y: LAND - rest,
                    duration: DROP_FALL,
                    ease: "power1.in",
                    repeat: falls - 1,
                    immediateRender: false,
                },
                at
            )
            tl.fromTo(
                d,
                { opacity: 1 },
                {
                    opacity: 0,
                    duration: DROP_FALL,
                    ease: "power4.in",
                    repeat: falls - 1,
                    immediateRender: false,
                },
                at
            )
        })
        tl.fromTo(
            years,
            { y: k * per },
            {
                y: (k + 1) * per,
                duration: drain,
                ease: "none",
                onUpdate: () => onYear(years.y),
            },
            t
        )
        const f = t + drain
        if (hgA && hgB && hourglass && squash)
            tl.fromTo(
                hourglass,
                { svgOrigin: CENTRE, rotation: 0 },
                { rotation: 180, duration: FLIP, ease: "power2.inOut" },
                f
            )
                .to(
                    hourglass,
                    { scale: 0.72, duration: FLIP / 2, ease: "power2.out" },
                    f
                )
                .to(
                    hourglass,
                    { scale: 1, duration: FLIP / 2, ease: "power2.in" },
                    f + FLIP / 2
                )
                .set(hgA, { opacity: 0 }, f + FLIP / 2)
                .set(hgB, { opacity: 1 }, f + FLIP / 2)
                .fromTo(
                    squash,
                    { svgOrigin: GROUND, scaleX: 1, scaleY: 1 },
                    {
                        scaleX: 1.04,
                        scaleY: 0.95,
                        duration: 0.07,
                        ease: "power1.out",
                    },
                    f + FLIP
                )
                .to(
                    squash,
                    {
                        scaleX: 1,
                        scaleY: 1,
                        duration: SETTLE - 0.07,
                        ease: "back.out(2)",
                    },
                    ">"
                )
        tl.call(onDouble, [k + 1], f + FLIP / 2)
    }
    tl.call(onEnd, [], doubles * cycle)
    return tl
}

// The coins: 1 coin = $1,000, in stacks of 16 standing side by side (64 coins make 4 stacks), filled from the
// hourglass side, so the first stack always stands right beside it.
const COIN_W = 26
const PER_STACK = 16
const STACK_GAP = 30
const MAX_STACKS = 4
const COIN_H = (COIN_W * 254.8) / 490
const COIN_T = (COIN_W * 78.4) / 490
const STACKS_W = MAX_STACKS * STACK_GAP
const STACKS_H = COIN_H + (PER_STACK - 1) * COIN_T + 4
const JIT = [0, 3, -2, 4, 1, -3, 3, -1]

const COIN_DEFS = `<linearGradient id="l19" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e08a12"/><stop offset="0.1" stop-color="#ffe07a"/><stop offset="0.25" stop-color="#f6a11d"/><stop offset="0.42" stop-color="#fff0b8"/><stop offset="0.55" stop-color="#f6a11d"/><stop offset="0.8" stop-color="#e08a12"/><stop offset="1" stop-color="#cf7a0c"/></linearGradient>
<linearGradient id="l20" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.15" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
<linearGradient id="l21" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset="0.35" stop-color="#ffcc40"/><stop offset="0.7" stop-color="#f6a11d"/><stop offset="1" stop-color="#e08a12"/></linearGradient>
<linearGradient id="l22" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e08a12"/><stop offset="0.4" stop-color="#f6a11d"/><stop offset="0.75" stop-color="#ffcc40"/><stop offset="1" stop-color="#fff0b8"/></linearGradient>
<radialGradient id="r23" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffe07a"/><stop offset="0.6" stop-color="#ffcc40"/><stop offset="1" stop-color="#f6a11d"/></radialGradient>
<radialGradient id="r24" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.76"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.427"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.142"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.038"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r25" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.15"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.04"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r26" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="0.3" stop-color="#ffffff" stop-opacity="0.56"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.315"/><stop offset="0.75" stop-color="#ffffff" stop-opacity="0.105"/><stop offset="0.9" stop-color="#ffffff" stop-opacity="0.028"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<radialGradient id="r54" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#cf7a0c" stop-opacity="0.5"/><stop offset="0.275" stop-color="#cf7a0c" stop-opacity="0.4"/><stop offset="0.55" stop-color="#cf7a0c" stop-opacity="0.225"/><stop offset="0.75" stop-color="#cf7a0c" stop-opacity="0.075"/><stop offset="0.9" stop-color="#cf7a0c" stop-opacity="0.02"/><stop offset="1" stop-color="#cf7a0c" stop-opacity="0"/></radialGradient>`
const COIN = `<path d="M-245,0 -245,78.4 A245,88.2 0 0 0 245,78.4 L245,0 A245,88.2 0 0 1 -245,0 Z" fill="url(#l19)"/><path d="M-245,0 -245,78.4 A245,88.2 0 0 0 245,78.4 L245,0 A245,88.2 0 0 1 -245,0 Z" fill="url(#l20)"/><ellipse rx="245" ry="88.2" fill="url(#l21)"/><ellipse rx="205.8" ry="74.1" fill="url(#l22)"/><ellipse rx="191.1" ry="68.8" fill="url(#r23)"/><g transform="scale(1 0.36) scale(183.8)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#cf7a0c" stroke-width=".13" transform="translate(.035 .045)"/><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#ffe07a" stroke-width=".13"/><path d="M.30,-.30 C.22,-.44 -.30,-.44 -.30,-.18 C-.30,.02 .30,-.02 .30,.20 C.30,.44 -.24,.44 -.32,.28 M0,-.54 V-.40 M0,.40 V.54" stroke="#ffffff" stroke-opacity=".7" stroke-width=".035" transform="translate(-.025 -.03)"/></g><ellipse cx="-102.9" cy="-39.7" rx="73.5" ry="20.1" transform="rotate(-25 -102.9 -39.7)" fill="url(#r24)"/><circle cx="-134.8" cy="-22.1" r="14.7" fill="url(#r25)"/><ellipse cx="122.5" cy="30.9" rx="34.3" ry="10.1" transform="rotate(-25 122.5 30.9)" fill="url(#r26)"/><ellipse cx="0" cy="96" rx="245" ry="92.6" fill="url(#r54)"/>`

// One coin; it drops in when it first appears during a run, `delay` ms after its doubling.
function StackCoin({
    i,
    uid,
    delay,
}: {
    i: number
    uid: string
    delay: number
}) {
    const ref = React.useRef<SVGGElement>(null)
    React.useLayoutEffect(() => {
        if (delay >= 0)
            ref.current?.animate(
                [
                    { transform: "translateY(-30px)", opacity: 0 },
                    {
                        transform: "none",
                        opacity: 1,
                        offset: 0.75,
                        easing: "ease-out",
                    },
                    { transform: "translateY(-4px)", offset: 0.88 },
                    { transform: "none" },
                ],
                {
                    duration: 420,
                    delay,
                    easing: "cubic-bezier(.5,0,.75,0)",
                    fill: "backwards",
                }
            )
    }, [])
    const r = i % PER_STACK
    const x =
        (Math.floor(i / PER_STACK) + 0.5) * STACK_GAP +
        (JIT[r % JIT.length] * COIN_W) / 64
    const y = STACKS_H - 2 - COIN_H - r * COIN_T + (88.2 * COIN_W) / 490
    return (
        <g ref={ref}>
            <g
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(COIN_W / 490).toFixed(5)})`}
                dangerouslySetInnerHTML={{
                    __html: COIN.replace(/url\(#/g, `url(#${uid}`),
                }}
            />
        </g>
    )
}

type Rate = "2" | "4" | "6" | "8" | "12"

interface Props {
    rate: Rate
    yearMs: number
    label: string
    nudge: string
    hint: string
    watch: string
    doubled: string
    reveal2: string
    reveal4: string
    reveal6: string
    reveal8: string
    reveal12: string
    compare2: string
    compare4: string
    compare6: string
    compare8: string
    compare12: string
    done: string
    idle: number
    doneLink: string
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 920
 * @framerIntrinsicHeight 1300
 */
export default function ATMMoneyDouble(props: Props) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const reduceMotion = useReducedMotion()
    const uid = "md" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
    const markup = React.useMemo(
        () =>
            ART.replace(/id="/g, `id="${uid}-`).replace(
                /url\(#/g,
                `url(#${uid}-`
            ),
        [uid]
    )
    const startAt = Math.max(0, RATES.indexOf(Number(props.rate)))
    const [r, setR] = React.useState(startAt)
    const rRef = React.useRef(r)
    rRef.current = r
    const [touched, setTouched] = React.useState(isCanvas)
    const [dragging, setDragging] = React.useState(false)
    const [run, setRun] = React.useState(0) // 0: no run; each release starts a new one
    const [year, setYear] = React.useState(isCanvas ? SPAN : 0)
    const [doubled, setDoubled] = React.useState(
        isCanvas ? RATES[startAt] / 2 : 0
    )
    const [finished, setFinished] = React.useState(isCanvas)
    const [ranOnce, setRanOnce] = React.useState(isCanvas)
    const svgRef = React.useRef<SVGSVGElement | null>(null)
    const trackRef = React.useRef<HTMLDivElement>(null)
    const thumbRef = React.useRef<HTMLDivElement>(null)
    const shineRef = React.useRef<HTMLSpanElement>(null)
    const fillRef = React.useRef<HTMLSpanElement>(null)
    const totalRef = React.useRef<HTMLDivElement>(null)
    const runs = React.useRef(0)

    const rate = RATES[r]
    const per = 72 / rate

    // Framer's own page switch (no reload); a plain page load if this Framer version has no router to ask.
    const router = useRouter() as
        | {
              navigate?: (id: string, hash?: string) => void
              routes?: Record<string, { path?: string }>
          }
        | undefined
    const goDone = () => {
        const routes = router?.routes ?? {}
        const find = (path: string) =>
            Object.keys(routes).find((k) => routes[k]?.path === path)
        // A When Done saved on the layer outlives page renames, so a link to no page falls back to the default.
        let path = props.doneLink
        let id = path ? find(path) : undefined
        if (!id) {
            const fallback = ATMMoneyDouble.defaultProps.doneLink
            const fallbackId = find(fallback)
            if (fallbackId || !path) {
                path = fallback
                id = fallbackId
            }
        }
        if (id && router?.navigate) router.navigate(id, "")
        else window.location.href = path
    }
    const goDoneRef = React.useRef(goDone)
    goDoneRef.current = goDone

    // A run: the hourglass drains and flips once per doubling, held while the inactivity overlay is open.
    React.useEffect(() => {
        const svg = svgRef.current
        if (isCanvas) return
        setFinished(false)
        setYear(0)
        setDoubled(0)
        if (!run || !svg) return
        const n = RATES[rRef.current] / 2
        const end = () => {
            setYear(SPAN)
            setDoubled(n)
            setFinished(true)
            setRanOnce(true)
        }
        if (reduceMotion) return end()
        let tl: gsap.core.Timeline | undefined
        const ctx = gsap.context(() => {
            tl = buildRun(
                svg,
                ((SPAN / n) * Math.max(40, props.yearMs)) / 1000,
                n,
                (y) => setYear(Math.min(SPAN, Math.floor(y + 1e-6))),
                setDoubled,
                end
            )
        }, svg)
        const sync = () =>
            (window as any).__systemOverlayOpen ? tl?.pause() : tl?.resume()
        sync()
        window.addEventListener("system-overlay-change", sync)
        return () => {
            window.removeEventListener("system-overlay-change", sync)
            ctx.revert()
        }
    }, [run, markup])

    // After a run, Done's strip fills over Idle (s) and then goes, unless someone taps first; held while the overlay is open.
    React.useEffect(() => {
        const el = fillRef.current
        if (!finished || isCanvas || !el || props.idle <= 0) return
        const anim = el.animate(
            [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
            {
                duration: props.idle * 1000,
                easing: "linear",
                fill: "forwards",
            }
        )
        anim.onfinish = () => goDoneRef.current()
        const sync = () =>
            (window as any).__systemOverlayOpen ? anim.pause() : anim.play()
        sync()
        window.addEventListener("system-overlay-change", sync)
        return () => {
            window.removeEventListener("system-overlay-change", sync)
            anim.cancel()
        }
    }, [finished, isCanvas, props.idle])

    // Until the first touch the thumb nudges side to side, so kids know to drag it.
    React.useEffect(() => {
        const el = thumbRef.current
        if (touched || reduceMotion || !el) return
        const anim = el.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(2.4cqw)", offset: 0.15 },
                { transform: "translateX(0)", offset: 0.3 },
                { transform: "translateX(0)" },
            ],
            { duration: 1600, iterations: Infinity, easing: "ease-in-out" }
        )
        return () => anim.cancel()
    }, [touched, reduceMotion])

    // A sheen sweeps along the track every couple of seconds, like slide to unlock.
    React.useEffect(() => {
        const el = shineRef.current
        if (reduceMotion || isCanvas || !el) return
        const anim = el.animate(
            [
                { transform: "translateX(-100%)" },
                { transform: "translateX(400%)" },
            ],
            { duration: 2400, iterations: Infinity, easing: "ease-in-out" }
        )
        return () => anim.cancel()
    }, [reduceMotion, isCanvas])

    const at = (i: number) => i / (RATES.length - 1) // stops evenly spaced along the track
    const snap = (clientX: number) => {
        const box = trackRef.current?.getBoundingClientRect()
        if (!box || !box.width) return
        const f = (clientX - box.left) / box.width
        let best = 0
        RATES.forEach((_, i) => {
            if (Math.abs(at(i) - f) < Math.abs(at(best) - f)) best = i
        })
        rRef.current = best
        setR(best)
    }
    const stop = () => {
        setTouched(true)
        setRun(0)
    }
    const go = () => setRun(++runs.current)

    // Each doubling pops the total.
    React.useLayoutEffect(() => {
        if (doubled && run)
            totalRef.current?.animate(
                [{ transform: "scale(1.2)" }, { transform: "none" }],
                { duration: 450, easing: "cubic-bezier(.3,1.6,.6,1)" }
            )
    }, [doubled])

    const coins = 2 ** doubled
    const prevCoins = React.useRef(1)
    const fresh = prevCoins.current // coins from here on drop in now
    prevCoins.current = coins
    const reveal = (props as unknown as Record<string, string>)[`reveal${rate}`]
    const compare = (props as unknown as Record<string, string>)[
        `compare${rate}`
    ]
    const display = '"P22 Mackinac ExtraBold", "P22 Mackinac Bold", serif'
    const black = '"Area Normal Black", sans-serif'
    const big: React.CSSProperties = {
        fontFamily: display,
        fontSize: "10cqw",
        lineHeight: 1,
        color: MIDNIGHT,
    }

    return (
        <div
            style={
                {
                    width: "100%",
                    height: "100%",
                    containerType: "inline-size", // Framer's CSS types don't list it yet, hence the cast
                    display: "flex",
                    flexDirection: "column",
                    gap: "2cqw",
                    color: NAVY,
                    fontFamily: '"Area Normal Bold", sans-serif',
                    userSelect: "none",
                    WebkitUserSelect: "none",
                } as React.CSSProperties
            }
        >
            <svg
                width="0"
                height="0"
                style={{ position: "absolute" }}
                aria-hidden="true"
            >
                <defs
                    dangerouslySetInnerHTML={{
                        __html: COIN_DEFS.replace(/id="/g, `id="${uid}`),
                    }}
                />
            </svg>

            <div
                style={{
                    flex: "none",
                    borderRadius: "4cqw",
                    padding: "2.4cqw 3cqw 2.8cqw",
                    background: `linear-gradient(160deg, #0e5577, ${DEEP} 70%)`, // Save or Spend's blue lane glass
                    boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.14), inset 0 0 0 1px rgba(217,238,255,.22), 0 2cqw 5cqw rgba(0,44,68,.22)",
                    color: "#ffffff",
                }}
            >
                <div style={{ flex: "none" }}>
                    <div
                        role="slider"
                        tabIndex={0}
                        aria-label={props.label}
                        aria-valuemin={RATES[0]}
                        aria-valuemax={RATES[RATES.length - 1]}
                        aria-valuenow={rate}
                        aria-valuetext={`${rate}%`}
                        onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId)
                            setDragging(true)
                            stop()
                            snap(e.clientX)
                        }}
                        onPointerMove={(e) => {
                            if (dragging) snap(e.clientX)
                        }}
                        onPointerUp={() => {
                            if (!dragging) return
                            setDragging(false)
                            go()
                        }}
                        onPointerCancel={() => {
                            if (!dragging) return
                            setDragging(false)
                            go()
                        }}
                        onKeyDown={(e) => {
                            const d =
                                e.key === "ArrowRight" || e.key === "ArrowUp"
                                    ? 1
                                    : e.key === "ArrowLeft" ||
                                        e.key === "ArrowDown"
                                      ? -1
                                      : 0
                            const next = Math.min(
                                RATES.length - 1,
                                Math.max(0, r + d)
                            )
                            if (!d || next === r) return
                            e.preventDefault()
                            stop()
                            rRef.current = next
                            setR(next)
                            go()
                        }}
                        style={{
                            position: "relative",
                            padding: "0 7cqw",
                            height: "14cqw",
                            cursor: "pointer",
                            touchAction: "none",
                            outline: "none",
                        }}
                    >
                        <div
                            ref={trackRef}
                            style={{
                                position: "absolute",
                                left: "7cqw",
                                right: "7cqw",
                                top: "50%",
                                height: "2.4cqw",
                                marginTop: "-1.2cqw",
                                borderRadius: 999,
                                background: "rgba(255,255,255,.16)",
                            }}
                        >
                            <span
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                }}
                            >
                                <span
                                    ref={shineRef}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        bottom: 0,
                                        width: "25%",
                                        background:
                                            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0))",
                                        transform: "translateX(-100%)",
                                    }}
                                />
                            </span>
                            <div
                                style={{
                                    position: "relative",
                                    height: "100%",
                                    width: `${at(r) * 100}%`,
                                    borderRadius: 999,
                                    background: `linear-gradient(90deg, #3bbfc0, ${MINT})`,
                                }}
                            />
                            {RATES.map((_, i) => (
                                <span
                                    key={i}
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: `${at(i) * 100}%`,
                                        width: "1.6cqw",
                                        height: "1.6cqw",
                                        margin: "-0.8cqw 0 0 -0.8cqw",
                                        borderRadius: 999,
                                        background:
                                            i <= r
                                                ? "rgba(0,59,92,.55)"
                                                : "rgba(255,255,255,.4)",
                                    }}
                                />
                            ))}
                            <div
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: `${at(r) * 100}%`,
                                    width: 0,
                                    height: 0,
                                }}
                            >
                                <div
                                    ref={thumbRef}
                                    style={{
                                        position: "absolute",
                                        left: "-7cqw",
                                        top: "-7cqw",
                                        width: "14cqw",
                                        height: "14cqw",
                                        borderRadius: 999,
                                        background: YOLK,
                                        boxShadow:
                                            "inset 0 -0.5cqw 0 rgba(246,161,29,.35), 0 1cqw 2.4cqw rgba(0,44,68,.25)", // a touch of the coins' orange underneath
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontFamily: black,
                                        fontSize: "5cqw",
                                        lineHeight: 1,
                                        color: MIDNIGHT,
                                    }}
                                >
                                    {rate}%
                                    {!touched && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                left: "calc(100% + 2cqw)", // beside the thumb, clear of the label above
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                whiteSpace: "nowrap",
                                                padding: "1.2cqw 2.4cqw",
                                                borderRadius: 999,
                                                background: "#ffffff",
                                                color: MIDNIGHT,
                                                fontSize: "3.6cqw",
                                            }}
                                        >
                                            {props.nudge}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            position: "relative",
                            height: "8.4cqw",
                            margin: "0 7cqw",
                        }}
                    >
                        {RATES.map((v, i) => (
                            <span
                                key={v}
                                style={{
                                    position: "absolute",
                                    left: `${at(i) * 100}%`,
                                    transform: "translateX(-50%)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "0.8cqw",
                                    whiteSpace: "nowrap",
                                    fontFamily: i === r ? black : undefined,
                                    fontSize: "4.4cqw",
                                    lineHeight: 1,
                                    color: i === r ? "#ffffff" : MINT,
                                }}
                            >
                                {v}%
                                <span style={{ fontSize: "3.4cqw" }}>
                                    {72 / v} yrs
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
                <div
                    style={{
                        height: 1,
                        margin: "2.2cqw 0 2.4cqw",
                        background: "rgba(217,238,255,.22)",
                    }}
                />
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        alignItems: "end",
                        columnGap: "3cqw",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: "3.2cqw",
                                lineHeight: 1,
                                color: MINT,
                                marginBottom: "1.2cqw",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Rule of 72: years to double
                        </div>
                        <div
                            style={{
                                ...big,
                                fontSize: "4.6cqw",
                                color: "#ffffff",
                            }}
                        >
                            72 ÷ {rate}% =
                        </div>
                        <div
                            style={{
                                ...big,
                                fontSize: "6.6cqw",
                                color: YOLK,
                                marginTop: "0.8cqw",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {per} years
                        </div>
                    </div>
                    <div
                        style={{
                            paddingLeft: "3cqw",
                            borderLeft: "1px solid rgba(217,238,255,.22)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "3.2cqw",
                                lineHeight: 1,
                                color: MINT,
                                marginBottom: "1.2cqw",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Year
                        </div>
                        <div
                            style={{
                                ...big,
                                fontSize: "6.6cqw",
                                color: "#ffffff",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {year}
                            <span
                                style={{
                                    fontFamily:
                                        '"Area Normal Bold", sans-serif',
                                    fontSize: "3.4cqw",
                                    color: MINT,
                                }}
                            >
                                {" "}
                                / {SPAN}
                            </span>
                        </div>
                    </div>
                    <div
                        style={{
                            paddingLeft: "3cqw",
                            borderLeft: "1px solid rgba(217,238,255,.22)",
                            textAlign: "right",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "3.2cqw",
                                lineHeight: 1,
                                color: MINT,
                                marginBottom: "1.2cqw",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Your money
                        </div>
                        <div
                            ref={totalRef}
                            style={{
                                ...big,
                                fontSize: "6.6cqw",
                                color: YOLK,
                                whiteSpace: "nowrap",
                                transformOrigin: "right bottom",
                            }}
                        >
                            {money(START * coins)}
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: "grid",
                    gridTemplateColumns: "34% 1fr",
                    gap: "3cqw",
                    alignItems: "end",
                }}
            >
                <svg
                    ref={svgRef}
                    viewBox={VIEWBOX}
                    preserveAspectRatio="xMaxYMax meet" // against the coins
                    style={{ width: "100%", height: "100%", display: "block" }}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: markup }}
                />
                <div
                    style={{
                        height: "100%",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.6cqw",
                    }}
                >
                    <div
                        style={{
                            flex: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "1.2cqw",
                            fontFamily: black,
                            fontSize: "3.6cqw",
                            lineHeight: 1,
                            color: MIDNIGHT,
                        }}
                    >
                        <svg
                            viewBox="-250 -90 500 258"
                            style={{
                                width: "5cqw",
                                height: "auto",
                                display: "block",
                            }}
                            aria-hidden="true"
                        >
                            <g
                                dangerouslySetInnerHTML={{
                                    __html: COIN.replace(
                                        /url\(#/g,
                                        `url(#${uid}`
                                    ),
                                }}
                            />
                        </svg>
                        = {money(START)}
                    </div>
                    <svg
                        viewBox={`0 0 ${STACKS_W} ${STACKS_H}`}
                        preserveAspectRatio="xMinYMax meet" // hugs the hourglass
                        style={{
                            flex: 1,
                            minHeight: 0,
                            width: "100%",
                            display: "block",
                            overflow: "visible",
                        }}
                        aria-hidden="true"
                    >
                        {Array.from({ length: coins }, (_, c) => (
                            <StackCoin
                                key={c}
                                i={c}
                                uid={uid}
                                delay={
                                    c >= fresh && run && !reduceMotion
                                        ? ((c - fresh) * 700) /
                                          Math.max(1, coins - fresh)
                                        : -1
                                }
                            />
                        ))}
                    </svg>
                </div>
            </div>

            <div
                aria-live="polite"
                style={
                    {
                        padding: "0 1cqw",
                        minHeight: "15cqw",
                        flex: "none",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        fontSize: "3.7cqw",
                        lineHeight: 1.35,
                        textWrap: "pretty",
                    } as React.CSSProperties
                }
            >
                {finished ? (
                    <>
                        <span>{bold(reveal)}</span>
                        <span
                            style={{
                                display: "block",
                                marginTop: "1.6cqw",
                                fontSize: "3.1cqw",
                                color: TEAL,
                            }}
                        >
                            {compare}
                        </span>
                    </>
                ) : (
                    <span>
                        {bold(
                            run && doubled
                                ? `${props.doubled} ${money(START * coins)}`
                                : run || dragging
                                  ? props.watch
                                  : props.hint
                        )}
                    </span>
                )}
            </div>

            <button
                type="button"
                onClick={() => goDoneRef.current()}
                style={{
                    all: "unset",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "10cqw",
                    boxSizing: "border-box",
                    paddingBottom: "0.22cqw", // the font sits low, so this centres the label
                    borderRadius: 999,
                    background: YOLK,
                    fontFamily: black,
                    fontSize: "4.2cqw",
                    lineHeight: 1,
                    color: NAVY,
                    visibility: ranOnce ? "visible" : "hidden", // keeps its room, so nothing moves when it appears
                }}
            >
                <span
                    ref={fillRef}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "1.2cqw", // a strip along the bottom, so yolk stays the button's colour
                        background: ORANGE,
                        transformOrigin: "left",
                        transform: "scaleX(0)",
                    }}
                />
                <span style={{ position: "relative" }}>{props.done}</span>
            </button>
        </div>
    )
}

ATMMoneyDouble.defaultProps = {
    rate: "2" as Rate,
    yearMs: 160,
    label: "Interest rate",
    nudge: "Drag me!",
    hint: "Slide to pick an interest rate. Let go to watch your $1,000 grow!",
    watch: "Watch your $1,000 grow…",
    doubled: "Doubled!",
    reveal2:
        "At 2%, your $1,000 doubles every 36 years. In 36 years, that's about $2,000.",
    reveal4:
        "At 4%, your $1,000 doubles every 18 years. In 36 years, that's about $4,000!",
    reveal6:
        "At 6%, your $1,000 doubles every 12 years. In 36 years, that's about $8,000!",
    reveal8:
        "At 8%, your $1,000 doubles every 9 years. In 36 years, that's about $16,000!",
    reveal12:
        "At 12%, your $1,000 doubles every 6 years. In 36 years, that's about $64,000!",
    compare2: "Just one double. Slide higher and see what happens!",
    compare4: "Twice the rate of 2%, and it doubled twice.",
    compare6: "Three doubles: $2,000, then $4,000, then $8,000.",
    compare8: "Four doubles in 36 years. Can you go higher?",
    compare12: "That's 64 times what you started with!",
    done: "Done",
    idle: 10,
    doneLink: "/atm-lessons/can-your-money-double/complete",
}

const text = (
    title: string,
    key: keyof typeof ATMMoneyDouble.defaultProps
) => ({
    type: ControlType.String as const,
    title,
    displayTextArea: true,
    defaultValue: ATMMoneyDouble.defaultProps[key] as string,
})

addPropertyControls(ATMMoneyDouble, {
    rate: {
        type: ControlType.Enum,
        title: "Start rate",
        options: ["2", "4", "6", "8", "12"],
        optionTitles: ["2%", "4%", "6%", "8%", "12%"],
        defaultValue: ATMMoneyDouble.defaultProps.rate,
    },
    yearMs: {
        type: ControlType.Number,
        title: "Year (ms)",
        description:
            "How long each year takes; 160 runs 36 years in about 6 s, plus a flip for each doubling.",
        min: 40,
        max: 600,
        step: 10,
        defaultValue: ATMMoneyDouble.defaultProps.yearMs,
    },
    label: {
        type: ControlType.String,
        title: "Label",
        description: "The slider's name for screen readers.",
        defaultValue: ATMMoneyDouble.defaultProps.label,
    },
    nudge: {
        type: ControlType.String,
        title: "Nudge",
        defaultValue: ATMMoneyDouble.defaultProps.nudge,
    },
    hint: text("Start", "hint"),
    watch: text("Running", "watch"),
    doubled: {
        type: ControlType.String,
        title: "Doubled",
        defaultValue: ATMMoneyDouble.defaultProps.doubled,
    },
    reveal2: text("Reveal 2%", "reveal2"),
    reveal4: text("Reveal 4%", "reveal4"),
    reveal6: text("Reveal 6%", "reveal6"),
    reveal8: text("Reveal 8%", "reveal8"),
    reveal12: text("Reveal 12%", "reveal12"),
    compare2: text("Compare 2%", "compare2"),
    compare4: text("Compare 4%", "compare4"),
    compare6: text("Compare 6%", "compare6"),
    compare8: text("Compare 8%", "compare8"),
    compare12: text("Compare 12%", "compare12"),
    done: {
        type: ControlType.String,
        title: "Done",
        defaultValue: ATMMoneyDouble.defaultProps.done,
    },
    idle: {
        type: ControlType.Number,
        title: "Idle (s)",
        description:
            "With no tap after a run, Done's orange strip fills over this long and then it goes. 0 turns it off.",
        min: 0,
        max: 120,
        step: 1,
        defaultValue: ATMMoneyDouble.defaultProps.idle,
    },
    doneLink: {
        type: ControlType.Link,
        title: "When Done",
        description: "The lesson's completion page.",
        defaultValue: ATMMoneyDouble.defaultProps.doneLink,
    },
})
