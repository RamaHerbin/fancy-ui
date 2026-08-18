# Porting conventions — Svelte → React

Law for every component ported into `fancy-ui-react`. The Svelte source under
`src/lib/fancy-ui/<slug>/` (and `src/lib/cameleon/`) is the reference
implementation; the port's job is pixel-for-pixel fidelity, not improvement.
When the Svelte side has a bug, port the bug and note it — divergence is a
maintenance tax paid on every future change.

## Folder shape

```
react/src/components/<slug>/
├── <Name>.tsx          # the component
├── <name>.css          # ONLY if the Svelte source has a <style> block
├── <Name>.test.tsx     # transposed from the Svelte <Name>.test.ts
└── index.ts            # export { <Name> } ...; export type { <Name>Props }
```

The cameleon engine lives at `react/src/cameleon/` mirroring the Svelte tree
(`types.ts`, `context.ts`, `FancyProvider.tsx`, `skins/`, `primitives/`).

Every component folder gets a matching export block in `react/src/index.ts`.

## API contract

- Props type is `export interface <Name>Props` — this exact name is a tooling
  contract (docs generation and design-tool sync key on `<Name>Props`).
- `class` becomes `className`. Merge with `cn()` from `../utils.js` exactly
  where the Svelte source uses it — same argument order, same literals.
- `forwardRef` exactly where the Svelte source declares `ref = $bindable`
  (use `forwardRef`, not React-19-only ref-as-prop — the package supports 18).
  A component whose Svelte side exposes no ref gets none here either: the
  Svelte API surface is the contract, per-component.
- Rest props spread onto the root element. Polymorphic components (RainbowButton
  renders `<a>` when `href` is set) keep the same branch logic.
- `Snippet` props become `ReactNode` props; the default `children` snippet is
  React `children`.

## Rune → hook mapping

| Svelte | React |
|---|---|
| `$props()` | props destructure with defaults |
| `$state(x)` | `useState(x)` |
| `$derived(expr)` | plain const per render, or `useMemo` only when measurably expensive |
| `$effect(...)` | `useEffect` with an honest dependency array |
| `$bindable(null)` ref | `forwardRef` |
| `onMount` | `useEffect(..., [])` |
| `onDestroy` | the effect's cleanup return |

## Styling — the part that breaks silently

1. **Tailwind class strings are copied VERBATIM.** They ship as static literals
   and the consumer's Tailwind scans `dist/` for them (`tailwind.css` →
   `@source "./dist"`). Never compute a class name from a variable — the
   scanner cannot see interpolations.
2. **Svelte `<style>` blocks become a colocated `.css` file** imported by the
   component (`import "./<name>.css";`). Vite extracts all of them into one
   `dist/styles.css`. Keep keyframe names and class names IDENTICAL to the
   Svelte source (they are part of the visual contract; some are referenced by
   inline `style` attributes). Svelte's compiler scoped those rules; plain CSS
   is global, so every rule must be anchored on the component's root class
   (e.g. `.rainbow-button`, `.fancy-marquee`) exactly as the source names it.
   `-global-` keyframe name prefixes in Svelte sources drop the prefix — that
   prefix is Svelte-compiler syntax, the emitted name is what you keep.
   When the Svelte source has NO root class to anchor on, ADD one (the
   component's slug, e.g. `fancy-marquee`) as the first token of the root
   `cn()` call and anchor the rules under it. This is the one sanctioned
   class-string addition: a compiler-scoped selector has no public identity in
   the Svelte package, so anchoring costs nothing — leaking a generic name
   like `.ripple-animation` into every consumer's page costs plenty. Leave a
   comment in the `.css` marking the anchor as port-added.
3. **CSS custom properties keep their local fallbacks.** Components must not
   depend on an app-level token existing (the Svelte contract; e.g.
   rainbow-button re-declares its `--rainbow-*` locally). Copy those blocks.
4. **Custom utilities are traps.** A class like `animate-rainbow` is not a
   stock Tailwind utility. Trace it (`grep -rn` in `src/` at repo root) to its
   `@theme`/keyframes definition and re-declare the equivalent in the
   component's own `.css` so consumers need zero app-side theme setup.
5. **`prefers-reduced-motion` blocks are ported as-is.** Never drop one.

## Tests

Vitest + `@testing-library/react`, jsdom, globals on. Transpose the Svelte
test file assertion-for-assertion; drop only what is Svelte-specific
(e.g. rune re-render mechanics), add nothing speculative. Run with
`npx vitest run src/components/<slug>` from `react/`.

## Hard rules for porting agents

- Work ONLY inside your assigned directories under `react/src/`.
- NO installs, no `package.json`/config edits, no new dependencies. The only
  allowed imports are react, the component's own files, `../utils.js` (or the
  cameleon-internal modules for engine work), clsx/tailwind-merge indirectly
  via `cn`.
- Do not spawn sub-agents.
- No third-party product or library brand names in comments or docs — house
  rule; write what the code does, not where an idea came from.
- Every component you port must appear in `react/src/index.ts` and pass
  `npx tsc --noEmit` + its own vitest file before you report done.
