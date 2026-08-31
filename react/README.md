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

Those two imports are the whole setup. `tailwind.css` also declares the
semantic colours the components spend — `--background`, `--primary`,
`--primary-foreground`, `--ring` — because none of them exist in Tailwind's
default palette, and without them `bg-primary` and friends compile to nothing.
They are wired with `@theme inline`, so the utilities resolve the variables at
use time: an app that already defines the shadcn token set keeps its own
colours automatically. The defaults ship in `@layer base`, which an unlayered
`:root` in your app overrides whatever the import order.

Every export is a client module — the built entries carry `"use client"`, so
`fancy-ui-react` can be imported directly from a React Server Component file
without a wrapper of your own.

## Development

Workspace member of the repo's pnpm workspace — one `pnpm install` at the
repo root covers it.

```bash
pnpm install                              # at the repo root
pnpm --filter fancy-ui-react test         # vitest + testing-library
pnpm --filter fancy-ui-react check        # tsc --noEmit
pnpm --filter fancy-ui-react build        # vite lib build + d.ts via tsc
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
- **`Meteors` takes a `seed`** the Svelte side has no equivalent for. Svelte
  runs its randomiser once, in the browser; React runs the same initializer on
  the server AND again during hydration, and `Math.random()` disagrees with
  itself across the two — a hydration mismatch React may settle by keeping the
  server values. A seeded PRNG makes both renders agree while leaving the
  shower in the server HTML. The default seed is shared, so two unseeded
  showers fall the same way; pass different seeds to separate them.

## Porting a component

Read `PORTING.md` first — folder shape, rune→hook mapping, the styling rules
that break silently, and the hard rules. The Svelte source under
`src/lib/fancy-ui/<slug>/` is always the reference.
