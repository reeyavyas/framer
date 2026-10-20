import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import {
    motion,
    useMotionValue,
    animate,
    useReducedMotion,
} from "framer-motion"

// Swipeable slides with tappable dots, for cards whose slides each carry
// their own button (Framer's native carousel can't lift its dots above
// them). The card itself is the parent frame on the canvas and never
// moves: this component is transparent and clips, so only the content
// slides inside the card.

interface Props {
    slides: React.ReactElement[]
    dotSize: number
    dotGap: number
    dotTapArea: number
    activeColor: string
    inactiveColor: string
    dotsBottom: number
    transition: any
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 760
 */
export default function CardSlider(props: Props) {
    const {
        slides,
        dotSize,
        dotGap,
        dotTapArea,
        activeColor,
        inactiveColor,
        dotsBottom,
        transition,
    } = props
    const count = slides.length
    const reduceMotion = useReducedMotion()
    const containerRef = React.useRef<HTMLDivElement>(null)
    // Where the press started, so a swipe can't also press a button.
    const downX = React.useRef(0)
    const [width, setWidth] = React.useState(0)
    const [index, setIndex] = React.useState(0)
    const x = useMotionValue(0)
    const current = Math.min(index, Math.max(count - 1, 0))

    React.useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return
        const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
        observer.observe(el)
        setWidth(el.offsetWidth)
        return () => observer.disconnect()
    }, [])

    // Resizes jump straight to the slide; index changes animate to it.
    React.useLayoutEffect(() => {
        x.set(-current * width)
    }, [width])

    const goTo = (i: number) => {
        setIndex(i)
        if (reduceMotion) x.set(-i * width)
        else animate(x, -i * width, transition)
    }

    if (count === 0) {
        return (
            <div style={placeholderStyle}>
                Connect slides in the Slides control
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
            }}
        >
            <motion.div
                drag={count > 1 ? "x" : false}
                dragConstraints={{ left: -(count - 1) * width, right: 0 }}
                dragElastic={0.15}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                    // A flick moves one slide; a slow drag settles on the nearest.
                    const flick =
                        Math.abs(info.velocity.x) > 300
                            ? -Math.sign(info.velocity.x)
                            : 0
                    const nearest = Math.round(-x.get() / width)
                    const next = flick ? current + flick : nearest
                    goTo(Math.max(0, Math.min(count - 1, next)))
                }}
                // Keeps a drag that ends over a button from also pressing it.
                onClickCapture={(e) => {
                    // Checked by distance, not onDragStart, which can land a frame after a fast swipe's click.
                    if (Math.abs(e.clientX - downX.current) > 10)
                        e.stopPropagation()
                }}
                onPointerDownCapture={(e) => {
                    downX.current = e.clientX
                }}
                style={{
                    x,
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    touchAction: "pan-y",
                }}
            >
                {slides.map((slide, i) => (
                    <div
                        key={i}
                        aria-hidden={i !== current}
                        style={{
                            flex: "0 0 100%",
                            height: "100%",
                        }}
                    >
                        {React.cloneElement(slide, {
                            style: {
                                ...(slide.props as any).style,
                                width: "100%",
                                height: "100%",
                            },
                        } as any)}
                    </div>
                ))}
            </motion.div>
            {count > 1 && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        // Measured to the dots' bottom edge, not their larger tap areas.
                        bottom:
                            dotsBottom -
                            (Math.max(dotTapArea, dotSize) - dotSize) / 2,
                        display: "flex",
                        justifyContent: "center",
                        // Negative margins below let tap areas overlap, so gap is dot to dot.
                        gap: dotGap,
                        pointerEvents: "none",
                    }}
                >
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Go to slide ${i + 1} of ${count}`}
                            aria-current={i === current}
                            onClick={() => goTo(i)}
                            style={{
                                width: Math.max(dotTapArea, dotSize),
                                height: Math.max(dotTapArea, dotSize),
                                margin: `0 ${-(Math.max(dotTapArea, dotSize) - dotSize) / 2}px`,
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                pointerEvents: "auto",
                            }}
                        >
                            <span
                                style={{
                                    width: dotSize,
                                    height: dotSize,
                                    borderRadius: "50%",
                                    background:
                                        i === current
                                            ? activeColor
                                            : inactiveColor,
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

const placeholderStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 20,
    boxSizing: "border-box",
    fontFamily: "Inter, sans-serif",
    fontSize: 28,
    color: "#878787",
    border: "2px dashed #c4c4c4",
    borderRadius: 16,
}

CardSlider.defaultProps = {
    slides: [],
    dotSize: 22,
    dotGap: 15,
    dotTapArea: 60,
    activeColor: "#002c44",
    inactiveColor: "#cccccc",
    dotsBottom: 196,
    transition: { type: "spring", stiffness: 300, damping: 35 },
}

addPropertyControls(CardSlider, {
    slides: {
        type: ControlType.Array,
        title: "Slides",
        control: { type: ControlType.ComponentInstance },
    },
    dotsBottom: {
        type: ControlType.Number,
        title: "Dots from Bottom",
        min: 0,
        max: 1000,
        step: 1,
        unit: "px",
    },
    dotSize: {
        type: ControlType.Number,
        title: "Dot Size",
        min: 4,
        max: 60,
        step: 1,
        unit: "px",
    },
    dotGap: {
        type: ControlType.Number,
        title: "Dot Gap",
        min: 0,
        max: 100,
        step: 1,
        unit: "px",
    },
    dotTapArea: {
        type: ControlType.Number,
        title: "Dot Tap Area",
        min: 20,
        max: 120,
        step: 1,
        unit: "px",
    },
    activeColor: { type: ControlType.Color, title: "Active Dot" },
    inactiveColor: { type: ControlType.Color, title: "Inactive Dot" },
    transition: { type: ControlType.Transition, title: "Transition" },
})
