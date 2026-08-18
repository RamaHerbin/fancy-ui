# fancy-ui-react

React counterpart of [`fancy-ui-svelte`](https://www.npmjs.com/package/fancy-ui-svelte) —
same components, same visual contract, ported from the Svelte 5 reference
implementation that lives at the root of this repo.

Status: early. This package currently ships the cameleon skin engine
(FancyProvider + 10 primitives + skins) and a first batch of flagship
components. The Svelte package remains the reference; each React component is
a faithful transpose (see `PORTING.md` for the law that governs ports).

## Install

```bash
npm install fancy-ui-react
```

Peer dependencies: `react` / `react-dom` 18 or 19, `tailwindcss` 4.

## Setup

```css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-react/tailwind.css"; /* lets Tailwind scan the shipped sources */
```

```tsx
import "fancy-ui-react/styles.css"; // keyframes + component-scoped CSS
import { RainbowButton, Marquee } from "fancy-ui-react";
```

## Development

Standalone package: its own lockfile, its own install, zero coupling to the
SvelteKit app at the repo root.

```bash
cd react
pnpm install
pnpm test     # vitest + testing-library
pnpm check    # tsc --noEmit
pnpm build    # vite lib build + d.ts via tsc
```

## Divergences from the Svelte API

Deliberate, small, and documented — everything else is a faithful transpose:

- **Two-way binding.** Svelte's `bind:value` / `bind:checked` become the
  standard React split: uncontrolled by default (a bare `<Switch />` flips on
  click), controlled once you pass `value`/`checked` — at which point you must
  also handle the change (`onChange`, or `onClick` for `Switch`). Passing a
  value with no handler is idiomatic-React frozen input, and React warns
  loudly; the Svelte side stays typable in that situation.
- **Bare `<Select>` shows the first option** (native uncontrolled behavior).
  The Svelte one renders blank, because `$bindable("")` matches no option —
  that quirk was not imported.
- **`RainbowButton` accepts no extra DOM props** (`onClick` included) — the
  Svelte source reads only its declared props and spreads nothing, and its own
  README example inherits that bug. Ported as-is per the fidelity law; fix it
  upstream first if it bothers you.
- Compiler-scoped selectors with no root anchor in the source gained one
  (`fancy-marquee`, `ripple-button`) so their CSS does not leak into consumer
  pages — see PORTING.md, styling rule 2.

## Porting a component

Read `PORTING.md` first — folder shape, rune→hook mapping, the styling rules
that break silently, and the hard rules. The Svelte source under
`src/lib/fancy-ui/<slug>/` is always the reference.
