import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"

// Soft ATM key beeps as code overrides (right panel -> Code -> Override -> this file).
// The tone is made by the browser (Web Audio), so there are no sound files and no delay:
// it plays the moment the layer is pressed, like a real keypad. Any tap behaviour already on
// the layer (a Link, an interaction, another override's onClick) still works; the beep is
// added on press, before it.
//
//   withATMKeyBeep      one short beep: number keys, side keys, most buttons
//   withATMEnterBeep    two rising beeps: ENTER / confirm
//   withATMCancelBeep   two low beeps: CANCEL / CLEAR
//
// Browsers only allow sound after the first tap on a page, so the very first press starts the
// sound and beeps from then on. Nothing plays on Framer's canvas.

const VOLUME = 0.05 // 0..1; keep it low so the beep stays in the background
const KEY = { hz: 1750, ms: 70 } // a soft, high piezo-like tick
const ENTER = [
    { hz: 1500, ms: 60 },
    { hz: 2000, ms: 70 },
]
const CANCEL = [
    { hz: 700, ms: 80 },
    { hz: 700, ms: 80 },
]
const GAP_MS = 45 // pause between the two beeps of a pair

// Sounds for moments on the ATM page (ATMAttract.tsx plays these itself).
export const ATM_SOUNDS = {
    key: [KEY], // a press
    enter: ENTER, // accepted, moving on
    cancel: CANCEL,
    cardIn: [{ hz: 520, ms: 140 }], // low, soft: the card being drawn into the slot
    blink: [{ hz: 2200, ms: 35 }], // tiny tick with each flash of the card light
}

let ctx: AudioContext | null = null
const audio = () => {
    if (typeof window === "undefined" || RenderTarget.current() === RenderTarget.canvas) return null
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
}

// Plays tones one after another. Each fades in and out over a few milliseconds so it never
// clicks, and uses a sine wave so it is gentle rather than harsh.
export function playATMBeep(tones: { hz: number; ms: number }[] = [KEY]) {
    const ac = audio()
    if (!ac) return
    let t = ac.currentTime + 0.005
    for (const { hz, ms } of tones) {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.type = "sine"
        osc.frequency.value = hz
        const end = t + ms / 1000
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(VOLUME, t + 0.006)
        gain.gain.setValueAtTime(VOLUME, end - 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, end)
        osc.connect(gain).connect(ac.destination)
        osc.start(t)
        osc.stop(end + 0.01)
        t = end + GAP_MS / 1000
    }
}

function withBeep(Component: ComponentType<any>, tones: { hz: number; ms: number }[]): ComponentType<any> {
    return function ATMBeep(props: any) {
        return (
            <Component
                {...props}
                onPointerDown={(e: React.PointerEvent) => {
                    playATMBeep(tones)
                    props.onPointerDown?.(e)
                }}
            />
        )
    }
}

export function withATMKeyBeep(Component: ComponentType<any>): ComponentType<any> {
    return withBeep(Component, [KEY])
}

export function withATMEnterBeep(Component: ComponentType<any>): ComponentType<any> {
    return withBeep(Component, ENTER)
}

export function withATMCancelBeep(Component: ComponentType<any>): ComponentType<any> {
    return withBeep(Component, CANCEL)
}
