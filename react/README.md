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

## Porting a component

Read `PORTING.md` first — folder shape, rune→hook mapping, the styling rules
that break silently, and the hard rules. The Svelte source under
`src/lib/fancy-ui/<slug>/` is always the reference.
