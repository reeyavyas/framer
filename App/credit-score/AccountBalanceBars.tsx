import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

// Account Mix → Accounts Breakdown: one row per account type, its name
// above a rounded bar filled in proportion to the largest balance, and the
// balance to the right. All-zero rows show only the grey track. Built for
// the 1080-wide kiosk.

interface Row {
    label: string
    amount: number
}

interface Props {
    rows: Row[]
    fillColor: string
    trackColor: string
    textColor: string
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 836
 */
export default function AccountBalanceBars(props: Props) {
    const max = Math.max(0, ...props.rows.map((r) => r.amount || 0))
    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 64,
                fontFamily: "Inter, sans-serif",
                color: props.textColor,
            }}
        >
            {props.rows.map((r, i) => {
                const amount = Math.max(0, r.amount || 0)
                return (
                    <div key={i}>
                        <div
                            style={{
                                fontSize: 25,
                                fontWeight: 600,
                                letterSpacing: 4,
                                textTransform: "uppercase",
                                marginBottom: 26,
                            }}
                        >
                            {r.label}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 34,
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    height: 30,
                                    borderRadius: 15,
                                    background: props.trackColor,
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: max
                                            ? `${(amount / max) * 100}%`
                                            : 0,
                                        height: "100%",
                                        borderRadius: 15,
                                        background: props.fillColor,
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    width: 150,
                                    fontSize: 30,
                                    fontWeight: 500,
                                }}
                            >
                                ${amount.toLocaleString("en-US")}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

AccountBalanceBars.defaultProps = {
    rows: [
        { label: "Credit Cards", amount: 0 },
        { label: "Auto Loans", amount: 0 },
        { label: "Student Loans", amount: 0 },
        { label: "Real Estate", amount: 0 },
        { label: "Other", amount: 0 },
        { label: "Collections", amount: 0 },
    ],
    fillColor: "#4AA3DF",
    trackColor: "#E3E3E3",
    textColor: "#212121",
}

addPropertyControls(AccountBalanceBars, {
    rows: {
        type: ControlType.Array,
        title: "Rows",
        control: {
            type: ControlType.Object,
            controls: {
                label: { type: ControlType.String, title: "Label" },
                amount: {
                    type: ControlType.Number,
                    title: "Amount",
                    min: 0,
                    step: 1,
                    unit: "$",
                    displayStepper: true,
                },
            },
        },
        defaultValue: AccountBalanceBars.defaultProps.rows,
    },
    fillColor: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: AccountBalanceBars.defaultProps.fillColor,
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: AccountBalanceBars.defaultProps.trackColor,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: AccountBalanceBars.defaultProps.textColor,
    },
})
