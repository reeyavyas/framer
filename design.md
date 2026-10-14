# Liberty FCU Kiosks — Design System

The look, type, shapes and motion for both kiosks in this Framer project
(https://libertyfcu.framer.website/). Measured from the live site at its
kiosk size, **1080×1920 portrait**, and agreed with the designer. Read
this before building any screen, component or animation.

## 1. Two kiosks, one brand

| | Tutorials kiosk | ATM kiosk |
|---|---|---|
| Looks like | A phone: a lock screen that unlocks into the banking app | An ATM: tap anywhere, the card goes in, then lessons |
| Content | Free exploration of the app, and guided tutorials with overlays | Money lessons, financial tips, scenarios, multiple choice, drag and drop. No tutorial overlays |
| Pages | `/tutorials`, the lock screen and login, completion screens; app pages are `/base-pages/*` and the tutorial copies of them | `/atm`, `/atm-start` and the lesson pages after it |
| Styles it uses | Brand foundation (§2) on its own shell, **App UI (§4)** inside the phone | **Brand foundation (§2) only**, plus the ATM rules (§3) |

**The rule:** the app's UI never bleeds into the ATM. No Inter, no app
blue, no iOS chrome, no app greys, radii or shadows. The checklist is in
§4.4.

## 2. Brand foundation (shared)

### 2.1 Colours

The primary colours are **Navy and Teal, the two colours of the logo**.
Token ids are the project's Framer colour styles; code receives a picked
style as `var(--token-…, <colour>)`.

| Role | Name | Hex | Framer token | Use |
|---|---|---|---|---|
| **Primary (logo)** | **Navy** | `#002c44` | `--token-0cbeb6fe-3499-4f35-a9c5-27326fba3d41` | Backgrounds, the dominant colour of every brand screen |
| **Primary (logo)** | **Teal** | `#059390` | `--token-e38256d6-45f3-4d0d-9a97-f1a6c42b6411` | Primary buttons, tooltip bubbles, correct answers |
| Secondary | Light teal | `#3bbfc0` | `--token-0bf1bdf9-c13e-4dcf-a798-c7339ae6001c` | Glows, shimmer, card edges, close buttons |
| Secondary | Light blue | `#0079a9` | — (typed) | Soft radial glows behind content |
| Secondary | Midnight | `#11232d` | `--token-0ee523a0-5674-469d-954b-27c094d1506e` | Dark contrast, text on egg yolk |
| Accent | Egg yolk | `#ffcc40` | `--token-4752b8ac-f3d7-4eaf-9473-e6c16c0a291a` | Kicker headings, the ripple, highlight pills, arrows. Accent only; never a background |
| Supporting | Deep teal | `#00615e` | `--token-edfc4088-c8f5-4a03-903a-23c7a11b2d39` | The glass-card gradient, deep shadows of teal |
| Supporting | White | `#ffffff` | — | Text on navy and teal |
| Secondary | Glacier blue | `#d9eeff` | — (colour style in the project; id not recorded) | Light surfaces and objects that need to stand out on teal or navy (stronger contrast than light teal); navy or midnight text on it |
| Secondary | Mint | `#bce2d7` | — (colour style in the project; id not recorded) | Light surfaces and objects, a softer partner to glacier blue; navy or midnight text on it |

Glacier blue and Mint are brand colours (Glacier blue is the project's
"Pale blue" colour style). Other colour styles in the project, not part
of the brand set: Sky `#00acdd`, Ink `#121111` (and 75%
`#121111bf`), Greys `#313131` and `#545454`. App colours are in §4.1.

**Contrast on navy:** white, egg yolk, light teal, glacier blue and mint
read well as text; teal is for fills, with white text on it. On teal or
the teal glass card, glacier blue and mint are the light colours with
the most contrast after white.

### 2.2 Typography

| Family | Role | Measured on the brand pages |
|---|---|---|
| **P22 Mackinac** (serif) | Big emotional headlines; warm body copy on cards | Bold 160/144 ("Welcome!"), Bold 80/96 and 64/76.8 ("Nicely done!"), Bold 38/53.2 (card copy), ExtraBold 140/140 |
| **Area Normal** | Kickers, buttons, supporting copy, labels | Black 54/59.4, +2.27px tracking, egg yolk ("LET'S TAKE A QUICK TOUR"); SemiBold 40/52; Bold 28/39.2 (buttons); Regular 34/47.6, +1.02px |
| **Proxima Nova** | High-impact uppercase display | Bold 75/75 uppercase (card titles "CREDIT SCORE"), Bold 60/60 +3.6px, SemiBold 90/90 egg yolk |

Headlines animate in letter by letter on the brand pages (Framer text
effect).

### 2.3 Shapes and surfaces

- **Pill buttons**: radius 50px, padding 14px × 40px, Area Normal Bold
  28px, about 67px tall. Three looks:
  - **Primary**: Teal fill, white text, optional → arrow ("Get Started").
  - **Secondary**: white at 10% fill, thin light edge, white text
    ("Learn More").
  - **Highlight**: Egg yolk fill, Midnight text ("Free Explore App",
    "ATM").
- **Glass card**: `linear-gradient(148deg, rgba(0,97,94,.4) 0%,
  rgba(255,255,255,.2) 98%)`, radius 50px, light-teal edge, padding
  80px 60px 60px 80px.
- **Shadow**: one, `0 2px 3px rgba(0,0,0,.25)`. Depth otherwise comes
  from glows, not shadows.
- **Glows**: `radial-gradient(#0079a9 0%, rgba(0,121,169,.7) 30%,
  rgba(0,34,56,.3) 60%, transparent 65%)`, plus light-teal glows.
- **Shimmer**: conic sweeps, white or teal, e.g. `conic-gradient(transparent
  130deg, #fff 181deg, transparent 239deg)`.
- **Circles**: 50% radius for badges and icon buttons.

### 2.4 Vectors and imagery

- **Wing lines**: flowing curves over a navy-to-teal blend, with soft
  glows. The ATM screen's version is `ATM/ATMWingBackground.tsx`.
- **Check badge**: white check in a teal circle with a light-teal ring
  (completion screens).
- **Hand-tap icon**: white line hand, navy fill, light-teal circle,
  egg-yolk ripple (`ATM/ATMTapIcon.tsx`).
- **Curved arrows**: egg yolk, hand-drawn feel, pointing at a target.
- **Carousel arrows**: plain white chevrons.
- **Confetti**: small specks and dashes in egg yolk, light teal and white
  scattered over navy (the tutorial completion screens).
- Product art: the Vertical Checking debit card (navy/teal, Mastercard),
  phone mockups, the ATM artwork (`ATM/artwork/`).

### 2.5 Spacing

The brand pages use a small set of gaps: **10, 15, 25, 50, 60px** (10 is
by far the most common, then 12, 14, 15, 25). Card padding is 60–80px;
page side margins sit around 60px.

## 3. ATM kiosk

### 3.1 Fonts

- **Default (about 90% of the time): Area Normal and P22 Mackinac.**
  - P22 Mackinac Bold: headlines, question text, celebration lines.
  - Area Normal: kickers (Black, egg yolk, tracked), answers and buttons
    (Bold), body and hints (Regular/SemiBold).
- **Proxima Nova only for extra impact, and only when the designer asks
  or agrees first.** Ask before using it.
- **Never Inter** on the ATM. ("Tap anywhere to begin" is Area Normal
  Black 41px; "Reading your card" is Area Normal Bold 36px.)

Suggested scale on 1080×1920:

| Use | Style |
|---|---|
| Hero / celebration | P22 Mackinac Bold 120–160 |
| Screen headline | P22 Mackinac Bold 64–80 |
| Question | P22 Mackinac Bold 48–56 |
| Kicker | Area Normal Black 40–54, +2px tracking, egg yolk, uppercase |
| Answer / button | Area Normal Bold 32–40 |
| Body / hint | Area Normal Regular 30–34, +1px tracking |
| Small label | Area Normal Bold 24–28 (never below 24 on the kiosk) |

### 3.2 Layout

- Canvas 1080×1920, background Navy (with the wing lines or a quieter
  navy-to-teal blend).
- Side margins 60px; content width 960px.
- Vertical rhythm from the brand gaps: 10 / 15 / 25 / 50 / 60px.
- Touch targets at least 96px tall for answers and draggables; keep the
  bottom 300px for primary actions so they're in reach.

### 3.3 Components

**Question card**: glass card (§2.3), kicker on top, question in P22
Mackinac, answers below.

**Answer button**: full-width pill or 40px-radius card, Area Normal Bold.

| State | Look |
|---|---|
| Rest | Secondary pill: white 10% fill, light edge, white text |
| Pressed | Scale 0.97, fill white 18% |
| Selected | Light-teal edge 3px, light-teal glow |
| Correct | Teal fill, white text, check badge, light-teal glow |
| Wrong (default) | Shake, then dims to navy at 60% with muted text; "Try again" hint in egg yolk |
| Wrong (opt-in) | Cancel coral edge or fill, white text (see §3.4) |
| Disabled | 40% opacity, no glow |

**Draggable item**: glass chip or product art (coin, card, receipt), 96px+
tall.

| State | Look |
|---|---|
| Idle | Glass chip, gentle 3s float (±4px) to hint it moves |
| Lifted | Scale 1.06, shadow `0 12px 30px rgba(0,0,0,.35)`, light-teal edge |
| Over a target | Target's edge glows light teal, target scales 1.03 |
| Dropped right | Snaps into place, teal fill, egg-yolk ripple |
| Dropped wrong | Springs back to its start, small shake on the target |

**Drop zone**: dashed 3px white-40% edge, 40px radius; fills teal at 20%
while hovered.

**Scenario card**: glass card with art on top, P22 Mackinac story line,
choices as answer buttons.

**Progress**: dots or a thin bar; done = teal, current = egg yolk,
upcoming = white 30%.

**Next / Continue**: primary pill (teal) or highlight pill (egg yolk) for
the last step.

**Exit and Skip** (lessons may need both): the same size and placement
as the tutorial overlays' buttons (measured), with the ATM's fonts
(§3.1).
- **Exit**: Teal circle, 110×110, white × at 44px, top left: 40px from
  the left, 60px from the top. Leaves the lesson for `/atm-start`.
- **Skip**: Teal pill, 110px tall (about 166px wide), padding 30px ×
  40px, white "Skip" in **Area Normal Bold 44px** (the tutorial's Skip
  uses a plain sans-serif; the ATM never does). Top right: 40px from the
  right, 60px from the top. Moves past the current step or lesson.
- Both always sit above the lesson content, press like any button (scale
  0.97), and stay quieter than the lesson's main action: no glow, no
  ripple.

### 3.4 Right and wrong

- **Right**: teal, light-teal glow, check badge, a scale-pop and the
  **egg-yolk ripple**.
- **Wrong (default, no red)**: a short shake, the choice dims, and an
  encouraging "Try again" in egg yolk. Never shame the user.
- **Cancel coral `#D04848`** (sampled from the ATM keypad's Cancel key):
  **wrong answers only, only in a lesson where the designer asks for it**
  (expect one or two lessons). The brand avoids red; default to the
  no-red version. Use it as a fill, edge or glow with white text (about
  4.5:1); never as text on navy (too dim).

### 3.5 Motion

**Personality: playful but polished, with a little game feel.** Springs
with a small overshoot; slow ambient loops; quick feedback.

| Moment | Spec |
|---|---|
| Ambient loops (wings, lights, idle float) | 3–6 s, seamless, ease in-out |
| Press | scale 0.97, 100ms |
| Card / screen enters | spring (stiffness 300, damping 24), from 40px below + fade |
| Right answer pop | scale 1 → 1.12 → 1, spring (stiffness 500, damping 14); slight squash (scaleY 0.94) on the way in |
| **Egg-yolk ripple** | rings from the answer's centre, egg yolk `#ffcc40`, spread and fade over 600–800ms, ease `cubic-bezier(.32,.72,0,1)` (the tap icon's press curve) |
| Wrong answer shake | x: 0, −14, 14, −10, 10, −4, 0 over 400ms, then dim over 200ms |
| Drag lift / snap | lift 150ms; snap spring (stiffness 400, damping 25); return spring (stiffness 260, damping 20) |
| Between questions | 300–450ms |
| Screen to screen | the egg-yolk ripple (as in the ATM tap transition), or a 300ms fade |

The **ripple is the signature motion**: the tap icon's rings, the ATM's
tap-to-start transition and every right answer use it, so they read as
one system.

**End of lesson**: confetti burst, in the family of the tutorial
confetti (egg-yolk, light-teal and white specks) but bigger, with a few
ribbons and coin-like circles; plus a P22 Mackinac celebration line and
the check badge. Confetti is for the end of a lesson, not every answer.

**Reduced motion** (OS setting): every loop shows a still frame, the
ripple becomes a 200ms fade, shakes and pops are replaced by a colour
change, no confetti (show the badge and line only).

**Sound**: the keypad beep (800 Hz, 60ms, volume 0.5) as on the ATM
page; keep any new sounds short and quiet.

### 3.6 Existing ATM pieces

- `ATM/ATMAttract.tsx`: the ATM page, machine lights, tap transition
  (card in, "Reading your card", ripple and zoom, about 3.1s) and beeps.
- `ATM/ATMWingBackground.tsx`: the screen's animated wing background.
- `ATM/ATMTapIcon.tsx`: the "Tap anywhere to begin" hand and ripple.
- `ATM/ATMNeedWantLoop.tsx`: the Lesson 1 card's looping illustration
  (nine styles), glossy items in glacier blue, mint, egg yolk and white.
- `ATM/ATMInactivityOverlay.tsx`: "Are you still there?" after 3 minutes
  idle, then back to `/atm`. White card, P22 Mackinac and Area Normal,
  no blur and no CSS transitions (they cause a black rectangle over the
  carousel cards on Windows).

Details and how to set them up in Framer are in `ATM/NOTES.md`.

## 4. App UI (tutorials kiosk only, reference)

For the `/base-pages/*` pages, their tutorial copies, the lock screen and
login. **Never used on the ATM.**

### 4.1 Colours

| Name | Hex | Use |
|---|---|---|
| App blue | `#214f80` (token `--token-9baca6b3-…`) | Header bar, active tab, primary buttons |
| Dark app blue | `#0e3a70` / `#0e335e` | Pressed states, headings on white |
| Link blue | `#0061fd` / `#0d7cfe` | Links, list-row labels |
| Surfaces | `#ffffff`, `#f0f0f0`, `#f1f3f9` | Pages, cards, grouped lists |
| Greys | `#878787`, `#707070`, `#5e5e5e`, `#353535`, `#212121` | Labels, body, headings |
| Success green | `#10885f`, `#1f9d55` | Toggles on, budgets on track |
| Alert red | budget "over" circle | Overspent only |
| Teal | `#059390` | Loan "Pre-Approved" headers, tooltip bubbles |

### 4.2 Typography

**Inter only**, 22–42px, weights 400–800. Header titles 42/600 white;
section titles 36/800; list rows 30–38/500 grey; small labels 24/600.

### 4.3 Shapes and patterns

Radii 10–16px on cards and fields, 999px on toggles and pills, 30px on
sheets. Soft grey shadows `rgba(135,135,135,.35) 0 4px 6px`. iOS status
bar and home indicator, bottom tab bar (Accounts, Transfers, Payment
Center, Loan Offers, More), list rows with chevrons, toggles. Tutorial
overlays: teal bubbles in P22 Mackinac/Area Normal with an egg-yolk
curved arrow, teal circle × and "Skip".

### 4.4 Never in the ATM

- [ ] Inter (any weight)
- [ ] App blue `#214f80`, link blue, app greys, app green or red
- [ ] iOS status bar, tab bar, list rows with chevrons, iOS toggles
- [ ] 10–16px radii and grey drop shadows
- [ ] Tutorial overlays (bubbles, spotlights). Exit and Skip buttons are
  allowed, styled as in §3.3.
