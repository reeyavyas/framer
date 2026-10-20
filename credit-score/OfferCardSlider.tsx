import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion"

// The Score tab's "Recommended for You" offers: whole cards slide (unlike
// CardSlider, where the card stays put), with the neighbours peeking in
// at the sides and dots below. Not looped. Each card is a link. Built
// for the 1080-wide kiosk; app styles (Inter).

const SIDE = 110 // space either side of the current card; the neighbours peek into it
const GAP = 34
const CLIP = 33 // the slider is clipped this far in from each side, as in the app
const CARD_HEIGHT = 580
const IMAGE_WIDTH = 190
const IMAGE_MAX_HEIGHT = 240
const DOT = 20
const DOT_TAP = 64
const NAVY = "#0e3a70"
const FONT = "Inter, sans-serif"

interface Card {
    title: string
    body: string
    image?: { src: string; srcSet?: string; alt?: string }
    link?: string
}

interface Props {
    cards: Card[]
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 700
 */
export default function OfferCardSlider(props: Props) {
    const { cards } = props
    const count = cards.length
    const reduceMotion = useReducedMotion()
    const containerRef = React.useRef<HTMLDivElement>(null)
    const dragged = React.useRef(false)
    const [width, setWidth] = React.useState(0)
    const [index, setIndex] = React.useState(0)
    const x = useMotionValue(0)
    const current = Math.min(index, Math.max(count - 1, 0))
    const cardWidth = Math.max(width - SIDE * 2, 0)
    const step = cardWidth + GAP

    React.useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return
        const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
        observer.observe(el)
        setWidth(el.offsetWidth)
        return () => observer.disconnect()
    }, [])

    // Resizes jump straight to the card; index changes animate to it.
    React.useLayoutEffect(() => {
        x.set(-current * step)
    }, [step])

    const goTo = (i: number) => {
        setIndex(i)
        if (reduceMotion) x.set(-i * step)
        else animate(x, -i * step, { type: "spring", stiffness: 300, damping: 35 })
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                fontFamily: FONT,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: `0 ${CLIP}px`,
                    overflow: "hidden",
                }}
            >
                <motion.div
                    drag={count > 1 ? "x" : false}
                    // No loop: past either end it only stretches a little and springs back.
                    dragConstraints={{ left: -(count - 1) * step, right: 0 }}
                    dragElastic={0.15}
                    dragMomentum={false}
                    onDragStart={() => {
                        dragged.current = true
                    }}
                    onDragEnd={(_, info) => {
                        // A flick moves one card; a slow drag settles on the nearest.
                        const flick =
                            Math.abs(info.velocity.x) > 300
                                ? -Math.sign(info.velocity.x)
                                : 0
                        const nearest = Math.round(-x.get() / step)
                        const next = flick ? current + flick : nearest
                        goTo(Math.max(0, Math.min(count - 1, next)))
                    }}
                    // A swipe that starts or ends on a card never opens its link.
                    onClickCapture={(e) => {
                        if (dragged.current) {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                    onPointerDownCapture={() => {
                        dragged.current = false
                    }}
                    style={{
                        x,
                        position: "absolute",
                        top: 16,
                        left: SIDE - CLIP,
                        display: "flex",
                        gap: GAP,
                        touchAction: "pan-y",
                    }}
                >
                    {cards.map((card, i) => (
                        <OfferCard
                            key={i}
                            card={card}
                            width={cardWidth}
                            isCurrent={i === current}
                            // Tapping a peeking neighbour brings it to the middle instead of opening it.
                            onPeekTap={() => goTo(i)}
                        />
                    ))}
                </motion.div>
            </div>

            {count > 1 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 16 + CARD_HEIGHT + 62 - (DOT_TAP - DOT) / 2,
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    {cards.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Go to offer ${i + 1} of ${count}`}
                            aria-current={i === current}
                            onClick={() => goTo(i)}
                            style={{
                                width: DOT_TAP,
                                height: DOT_TAP,
                                // Tap areas overlap so the dots sit 22px apart.
                                margin: `0 ${-(DOT_TAP - DOT - 22) / 2}px`,
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            <span
                                style={{
                                    width: DOT,
                                    height: DOT,
                                    borderRadius: "50%",
                                    background: i === current ? NAVY : "#dcdcdc",
                                    transition: "background 0.2s",
                                }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function OfferCard({
    card,
    width,
    isCurrent,
    onPeekTap,
}: {
    card: Card
    width: number
    isCurrent: boolean
    onPeekTap: () => void
}) {
    return (
        <a
            href={card.link || undefined}
            draggable={false}
            aria-hidden={!isCurrent}
            tabIndex={isCurrent ? undefined : -1}
            onClick={(e) => {
                if (!isCurrent || !card.link) e.preventDefault()
                if (!isCurrent) onPeekTap()
            }}
            style={{
                flex: `0 0 ${width}px`,
                height: CARD_HEIGHT,
                boxSizing: "border-box",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                padding: "52px 52px 52px 54px",
                background: "#fff",
                border: "2px solid #e3e3e3",
                borderRadius: 12,
                boxShadow: "rgba(0, 0, 0, 0.06) 0 4px 16px",
                color: "#000",
                textDecoration: "none",
                cursor: card.link || !isCurrent ? "pointer" : "default",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <div
                style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    height: 52,
                    padding: "0 22px 0 18px",
                    borderRadius: 8,
                    background: "#e6eaee",
                    color: NAVY,
                    fontSize: 28,
                    fontWeight: 700,
                }}
            >
                <Star />
                Recommended for You
            </div>

            {card.image?.src ? (
                <img
                    src={card.image.src}
                    srcSet={card.image.srcSet}
                    alt={card.image.alt ?? ""}
                    draggable={false}
                    style={{
                        position: "absolute",
                        top: 78,
                        right: 52,
                        // Same width for every image; each keeps its own height, capped.
                        width: IMAGE_WIDTH,
                        height: "auto",
                        maxHeight: IMAGE_MAX_HEIGHT,
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            ) : (
                <div
                    style={{
                        position: "absolute",
                        top: 78,
                        right: 52,
                        width: IMAGE_WIDTH,
                        height: 140,
                        background: "#e6e6e6",
                    }}
                />
            )}

            {/* Title and body sit centred in the space under the badge. */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 46,
                    maxWidth: width - 54 - 52 - IMAGE_WIDTH - 100,
                }}
            >
                <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.35 }}>
                    {card.title}
                </div>
                <div style={{ fontSize: 37, lineHeight: 1.4 }}>{card.body}</div>
            </div>
        </a>
    )
}

function Star() {
    return (
        <svg width={36} height={36} viewBox="0 0 24 24" aria-hidden>
            <path
                d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
                fill={NAVY}
                stroke={NAVY}
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
        </svg>
    )
}

OfferCardSlider.defaultProps = {
    cards: [
        {
            title: "As low as 5.84% APR*",
            body: "Get your next auto loan from us!",
        },
        {
            title: "$79 Interest Savings / 6 months*",
            body: "Transfer your credit card balances!",
        },
        {
            title: "Pay as low as $42 for 24 months*",
            body: "Consolidate your credit cards into one monthly payment",
        },
        {
            title: "Start your home loan journey",
            body: "Home Purchase Programs",
        },
    ] as Card[],
}

addPropertyControls(OfferCardSlider, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: {
            type: ControlType.Object,
            controls: {
                title: { type: ControlType.String, title: "Title" },
                body: {
                    type: ControlType.String,
                    title: "Body",
                    displayTextArea: true,
                },
                image: { type: ControlType.ResponsiveImage, title: "Image" },
                link: { type: ControlType.Link, title: "Link" },
            },
        },
        defaultValue: OfferCardSlider.defaultProps.cards,
    },
})
