import { Override, RenderTarget } from "framer"
import { useEffect } from "react"

const AUTO_REDIRECT_SECONDS = 5
const EXIT_LINK = "/tutorials"
// The same victory sound as the ATM lesson completion pages, pinned to one commit
const VICTORY_SOUND =
    "https://cdn.jsdelivr.net/gh/reeyavyas/framer@fdac2b59a5b5fc1554e8961e52527001de84edc1/ATM/sounds/victory.mp3"
const VICTORY_VOLUME = 0.8
const VICTORY_OFFSET = 0.07 // s; the file is silent until 0.077 s
const NO_CONFETTI_SECONDS = 2.5 // plays anyway if no confetti has fired by then

/**
 * TutorialCongratsAutoRedirect
 *
 * Attach directly to the same layer that IS your congrats animation
 * (confetti + pulse + card) on its dedicated page. Same classic-Override
 * shape as FingerprintDelayedNavigation elsewhere in this project — a
 * plain function returning a props patch — rather than the
 * wrap-the-whole-component style tried earlier for this same job. That
 * earlier version needed a live reference to the layer's own component
 * to re-render it, which is what crashed Framer's canvas when assigned;
 * this one never touches the layer's props or children at all (returns
 * `{}`), so there's nothing to reference, wrap, or break — the layer
 * renders exactly as Framer already built it.
 *
 * FingerprintDelayedNavigation's timer starts from a click, so it can
 * never fire on its own — nothing to guard there. This one has no click
 * to wait for; the delay starts the moment the layer mounts, which
 * happens on the canvas too. Unguarded, that means window.location.href
 * firing inside Framer's own editor a few seconds after you drop this
 * on the layer — the RenderTarget check below is what this project's
 * other auto-timers (TutorialOverlay.tsx's autoAdvanceAfterSeconds,
 * etc.) all use to skip that.
 *
 * No skip/"X" button here — a classic Override can only patch props
 * onto the ONE layer it's attached to, it can't add a sibling element.
 * Draw that as a real layer instead: any shape + a native Framer Link
 * pointed at EXIT_LINK, placed on top of the animation on the canvas.
 *
 * Use it on ONE layer per Congrats page. A second redirect override on a
 * layer inside the congrats component caused a double redirect: tapping
 * "X" reached /tutorials, then the page reloaded again. As a safeguard,
 * the timer also only redirects if the page is still the one it started
 * on, so a timer that outlives the Congrats page (e.g. after the "X"
 * Link navigates client-side) can't reload wherever the user is now.
 *
 * It also plays the victory sound (as ATMLessonCompleteRedirect does)
 * the moment the confetti adds its canvas to the page, or after
 * NO_CONFETTI_SECONDS if none does. If the browser blocks it (no tap
 * since the page last loaded), the page stays silent.
 */
export function TutorialCongratsAutoRedirect(): Override {
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        const startPath = window.location.pathname
        const sound = new Audio(VICTORY_SOUND) // loads now, so it's ready when the confetti fires
        sound.volume = VICTORY_VOLUME
        let played = false
        const play = () => {
            if (played) return
            played = true
            confetti.disconnect()
            clearTimeout(fallback)
            sound.currentTime = VICTORY_OFFSET
            sound.play().catch(() => {})
        }
        const confetti = new MutationObserver((changes) => {
            if (
                changes.some((c) =>
                    [...c.addedNodes].some((n) => n.nodeName === "CANVAS")
                )
            )
                play()
        })
        confetti.observe(document.body, { childList: true })
        const fallback = setTimeout(play, NO_CONFETTI_SECONDS * 1000)
        const t = setTimeout(() => {
            // Left already (e.g. by the "X"): don't reload wherever the
            // user is now.
            if (window.location.pathname !== startPath) return
            window.location.href = EXIT_LINK
        }, AUTO_REDIRECT_SECONDS * 1000)
        return () => {
            clearTimeout(t)
            clearTimeout(fallback)
            confetti.disconnect()
            sound.pause()
        }
    }, [])

    return {}
}
