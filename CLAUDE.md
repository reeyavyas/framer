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
