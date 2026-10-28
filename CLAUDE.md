# Working in this repo

## Branches and pull requests

- Commit and push straight to `main` by default, for code and notes
  alike. Create a branch only when the repo owner asks for one, even if
  the session started on a feature branch.
- When the owner does ask for a branch: after pushing, open a pull
  request into `main` without waiting to be asked (if the branch already
  has an open PR, push to it instead). Leave the merge to the owner, and
  recommend **Create a merge commit** so each individual commit lands in
  `main`'s history.
- Never force-push `main` or rewrite its history (the "Protect Main"
  ruleset also blocks this).

## Framer code

**Mandatory for every `.tsx` file in this repo.** Every code file must
show no warnings in Framer's editor (it type-checks against the
`framer` package's types and React 19's). Follow every rule below
whenever you write or edit a file, and fix any break of them you find
in a file you touch.

- **Font control defaults** (`ControlType.Font` with
  `defaultFontType: "sans-serif"`): `defaultValue` takes only
  `fontSize`, `variant`, `letterSpacing`, `lineHeight` and `textAlign`.
  Never `fontFamily`, `fontWeight` or `fontStyle`. The family comes from
  `defaultFontType` (sans-serif is Inter); weight and italic are one
  `variant` name: `"Regular"` (400), `"Medium"` (500), `"Semibold"`
  (600), `"Bold"` (700), `"Extra Bold"` (800), `"Black"` (900), or the
  same with `" Italic"` (e.g. `"Bold Italic"`). Serif and monospace
  defaults take no `variant`.
  `{ fontSize: 32, variant: "Semibold" }`, not
  `{ fontFamily: "Inter", fontSize: 32, fontWeight: 600 }`.
  A component's own fallback style (in `defaultProps` or the code) is
  plain CSS and can keep `fontFamily`/`fontWeight`.
- **`hidden` callbacks** take `Partial<Props>`:
  `hidden: (props: Partial<Props>) => !props.sounds`.
- **`useRef` needs a starting value** in React 19:
  `useRef<number>(undefined)`, not `useRef<number>()`.
- **Callback refs** use a block body that returns nothing:
  `ref={(el) => { ref.current = el }}`, not `(el) => (ref.current = el)`.
- **`defaultProps` with a union type**: mark the literal,
  `transition: "ABE" as Transition`, or it reads as a plain string.

Before every push that changes a `.tsx` file, type-check each changed
file in a scratch folder with
`framer`, `framer-motion`, `gsap`, `react@19` and `@types/react@19` installed
(`npx tsc --noEmit --strict --jsx react-jsx --skipLibCheck
--moduleResolution bundler --module esnext --target es2020 File.tsx`);
it must print nothing for the file. Don't push until it does.

## Animating vector art

Before animating any illustration the owner sends, read
`ATM/artwork/ANIMATING-VECTORS.md` and follow it: the colours and
measured outline that worked, and the checks for uneven strokes and
open shapes, lines and edges on every moving part.

## Working with the owner

These are the owner's standing preferences, kept here so they carry
over to any account or computer that opens this repo.

### Screenshots and data

- **Never commit the owner's screenshots or reference images.** Use them
  only to guide the build, and describe what matters in a `NOTES.md` in
  words. Before committing, check `git status` has no new image files
  from a reference.
- **Never reuse a number from the owner's screenshots**, or derive one
  from them (such as splitting a total). Every figure in them is real
  data. Use clearly different made-up values that still look realistic
  (not $0 or very low percentages unless asked). Before building, list
  every figure in the screenshot and replace each; afterwards, search
  Framer and the repo for those figures. When unsure, ask.

### Framer project

- **Edit Framer through Claude in Chrome**, where the owner is signed in.
  The built-in browser is logged out of Framer but fine for testing the
  public live site. If a new Chrome tab group opens in a tiny window that
  won't resize, open another tab and work there.
- **Never edit, rename or add colour styles without asking.** When
  setting a colour, type the hex only once the picker's hex field has
  focus, commit with Tab, and never click a style in the list unless
  linking it is intended.
- **Sync Framer's copy into the repo before changing a file.** The owner
  sometimes edits code in Framer's editor, and their edits win. Copy
  Framer's text out, compare it with the repo, and only then edit or
  re-paste. Framer formats with Prettier (`--tab-width 4 --no-semi
  --trailing-comma es5`), so the repo keeps that formatting.
- **Pasting code into Framer:** copy with `LANG=en_US.UTF-8 pbcopy`
  (plain `pbcopy` garbles emoji and other non-ASCII text). After cmd+s,
  check the file tab's "Edited" tag is gone, then copy Framer's text
  back out and confirm it matches the repo before asking for a publish.
- **Code components go in the existing folder for their feature**, never
  a new folder. Check right after creating a file that it landed there.
- **Property values are saved on the layer.** When a property control is
  added to a component already on the canvas, Framer stores its default
  on that layer, and later code defaults don't reach it. Don't rely on a
  code default changing a placed layer; for links, fall back in code when
  the saved path matches no page.
- **Native Framer first, code second.** Build tabs, accordions and text
  as native Framer elements the owner can edit directly; use code
  components for charts, gauges, physics and animation.

### Testing

- **Test on the live published site**, never Framer's Preview (Preview
  reports some working links as broken).
- **Test every element and state**, not a sample: every tab and variant,
  open and close, each nested component, every button and link, and that
  nearby components still work. Say plainly anything that couldn't be
  tested.
- **Ask for a republish only when the check needs the live site**:
  interactions, navigation, timing, or a batch ready for a full live
  test. Check visual changes (alignment, sizes, colours) on the Framer
  canvas instead, and say they go live with the next publish.
