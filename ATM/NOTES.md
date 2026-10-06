# ATM — Notes

The second portion of the kiosk: an ATM where Gen Alpha users learn to
use an ATM, plus general money tips and slide-style lessons. Separate
from the mobile-app kiosk that every other group in this repo serves.

## Current

- `ATMAttractScreen.tsx` — the ATM's idle "attract" screen (home
  state). Drop it inside the ATM artwork, sized to the screen cutout.
  It loops diagonal light streaks, a periodic glass-sheen sweep, rising
  sparkles, a rotating list of headlines ("Headlines" property), and a
  pulsing "Tap anywhere to begin" hint with expanding rings. Tapping
  anywhere (or Enter/Space) floods the screen with a circle from the
  tap point. Once "Tap Duration" ends, it fires "On Tap" and navigates
  to "Tap Link" (not on the Framer canvas, where it resets instead so
  it can be tapped again). End on the same "Tap Fill" colour as the
  next page's background so the hand-off reads as one animation.
  Sparkle positions are fixed per index, not random, so the server
  pre-render matches the client. With the OS "reduce motion" setting
  on, the loops stop and the ripple becomes a plain fade.

## Ideas not built yet

- Zoom into the screen on tap (scale the whole ATM layer around the
  screen's centre) before navigating.
- Chaser lights on the hardware: the RECEIPT / CARD / CASH strips and
  card-reader light blinking in sequence while idle.

## Branch

ATM work goes on the `atm` branch.
