import { RenderTarget } from "framer"

// The ATM page's soft sounds (ATMAttract.tsx plays them in step with its transition). The tone
// is made by the browser (Web Audio), so there are no sound files and no delay.
//
// Browsers only allow sound after the first tap on a page, so the very first tap starts the
// sound and it plays from then on. Nothing plays on Framer's canvas.

const VOLUME = 0.05 // 0..1; keep it low so the sounds stay in the background
const GAP_MS = 45 // pause between the two beeps of a pair

export const ATM_SOUNDS = {
    key: [{ hz: 1750, ms: 70 }], // the tap: a soft, high piezo-like beep
    cardIn: [{ hz: 520, ms: 140 }], // low, soft: the card being drawn into the slot
    blink: [{ hz: 2200, ms: 35 }], // tiny tick with each flash of the card light
    enter: [
        // card read, moving on: two rising beeps
        { hz: 1500, ms: 60 },
        { hz: 2000, ms: 70 },
    ],
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
export function playATMBeep(tones: { hz: number; ms: number }[]) {
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
