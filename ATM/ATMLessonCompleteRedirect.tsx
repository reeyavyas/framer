import { Override, RenderTarget } from "framer"
import { useEffect } from "react"

const AUTO_REDIRECT_SECONDS = 5
const EXIT_LINK = "/atm-start"

/**
 * ATMLessonCompleteRedirect
 *
 * The ATM lessons' version of TutorialCongratsAutoRedirect, set up the
 * same way: put it on the ATM Lesson Completion component on a lesson's
 * completion page (e.g. /atm-lessons/need-or-want/complete)
 * and the page goes back to /atm-start AUTO_REDIRECT_SECONDS after it
 * opens. It returns no props, so the layer renders exactly as
 * Framer built it. Skipped on the Framer canvas, and it only redirects if
 * the page is still the one it started on, so a timer that outlives the
 * page (after a Link elsewhere) can't reload wherever the user is now.
 */
export function ATMLessonCompleteRedirect(): Override {
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        const startPath = window.location.pathname
        const t = setTimeout(() => {
            if (window.location.pathname !== startPath) return
            window.location.href = EXIT_LINK
        }, AUTO_REDIRECT_SECONDS * 1000)
        return () => clearTimeout(t)
    }, [])

    return {}
}
