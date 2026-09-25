<p align="center">
  <img src=".github/logo.png" alt="FancyUI" width="88" height="88" />
</p>

# fancy-ui

Animated UI components for **Svelte 5** and **React**, styled with Tailwind CSS v4.

[![npm fancy-ui-svelte](https://img.shields.io/npm/v/fancy-ui-svelte?label=fancy-ui-svelte&color=FF3E00)](https://www.npmjs.com/package/fancy-ui-svelte)
[![npm fancy-ui-react](https://img.shields.io/npm/v/fancy-ui-react?label=fancy-ui-react&color=149ECA)](https://www.npmjs.com/package/fancy-ui-react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Components](https://img.shields.io/badge/Components-146-8B5CF6)
![MIT License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <a href="https://www.anthropic.com/claude-code">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/claude-for-open-source-program-dark.svg">
      <img src=".github/claude-for-open-source-program.svg" alt="Claude for Open Source Program" width="280">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://fancy-ui.rama.app">
    <img src=".github/fancyui-reel.webp" alt="fancy-ui in motion: an HDR fluid cursor painting over the title, fireworks launched from a gradient button, a datamosh page transition, a before/after slider split by a blade of light and a rainbow-beam button" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://fancy-ui.rama.app"><strong>Live Demo &amp; Docs</strong></a>
  &nbsp;·&nbsp;
  <a href="https://fancy-ui.rama.app/docs/components">Browse components</a>
  &nbsp;·&nbsp;
  <a href="./react/README.md">React package</a>
</p>

## Features

- **146 components** &mdash; core primitives (forms, navigation, overlays) alongside buttons, text animations, backgrounds, cursors, AI/chat building blocks and a micro-interactions collection
- **Motion that feels physical** &mdash; beams of light, liquid-metal and neon borders, a physical flip card, a before/after slider with a motion trail, a datamosh page transition; springs and WebGL where they earn their keep
- **Svelte 5 runes** &mdash; built with `$state`, `$derived`, `$effect` and `$props`; snippets, no legacy syntax
- **React edition** &mdash; [`fancy-ui-react`](./react/README.md) ships the same components with the same names for React 18 and 19
- **Tailwind CSS v4** &mdash; one CSS import, theme tokens, light and dark themes
- **Accessible and SSR-safe** &mdash; keyboard support where it applies, `prefers-reduced-motion` respected, canvas and WebGL work deferred to mount
- **Opt-in sound** &mdash; eleven synthesised interface cues, a `SoundToggle` switch and a `soundFeedback` action; silent until the user turns it on
- **AI-ready docs** &mdash; `llms.txt`, a Markdown page per component and a JSON registry, so coding agents use the library correctly
- **Tested** &mdash; 4,500+ unit tests with Vitest and Testing Library

## Quick Start

**Install via npm:**

```bash
npm install fancy-ui-svelte
```

Add the Tailwind integration to your app's CSS (e.g. `src/app.css`):

```css
@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";
```

This single import tells Tailwind v4 to scan the library's components so all utility classes are generated automatically. No manual `@source` path needed.

Then import any component:

```svelte
<script lang="ts">
	import { RainbowButton, BorderBeam } from "fancy-ui-svelte";
</script>

<div class="relative overflow-hidden rounded-xl border p-8">
	<RainbowButton>Get started</RainbowButton>
	<BorderBeam />
</div>
```

<details>
<summary>Alternative: manual @source (without the CSS import)</summary>

```css
@import "tailwindcss";
@source "../node_modules/fancy-ui-svelte/dist";
```

The path is relative to your CSS file location.

</details>

**Or browse and copy a component:**

1. Find the component you need in the [live demo](https://fancy-ui.rama.app)
2. Copy the source from `src/lib/fancy-ui/[component-name]/`
3. Paste into your project

**Or clone the full demo locally:**

```bash
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui
pnpm install
pnpm dev
```

### React

```bash
npm install fancy-ui-react
```

```css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-react/tailwind.css";
```

```tsx
import "fancy-ui-react/styles.css";
import { RainbowButton } from "fancy-ui-react";

export function Hero() {
	return <RainbowButton>Get started</RainbowButton>;
}
```

Props keep their Svelte names; `class` becomes `className` and snippets become `ReactNode`. Setup details and the few deliberate differences are in the [React package README](./react/README.md).

## Using with AI agents (Claude Code, Cursor, Copilot)

The docs site serves documentation built for coding agents, following the [llms.txt](https://llmstxt.org) convention:

- [fancy-ui.rama.app/llms.txt](https://fancy-ui.rama.app/llms.txt) — setup guide, usage rules, and an index of every component
- [fancy-ui.rama.app/llms-full.txt](https://fancy-ui.rama.app/llms-full.txt) — full reference: import, props and a working example per component
- `https://fancy-ui.rama.app/docs/components/<slug>.md` — one component as Markdown, with every docs example (e.g. [compare.md](https://fancy-ui.rama.app/docs/components/compare.md)); each docs page also has a **Copy as Markdown** button
- [fancy-ui.rama.app/registry.json](https://fancy-ui.rama.app/registry.json) — every component as JSON: import names (Svelte and React), props, snippets, links

To make your coding agent use fancy-ui correctly, add this to your project's `CLAUDE.md`, `AGENTS.md`, or `.cursorrules`:

```markdown
## UI components

Use fancy-ui-svelte (Svelte 5 + Tailwind CSS v4) for animated UI components.
Setup and rules: https://fancy-ui.rama.app/llms.txt
One component (props + examples): https://fancy-ui.rama.app/docs/components/<slug>.md
Key rules: overlay/effect components (BorderBeam, GlowBorder, backgrounds, ...)
need a parent with `relative overflow-hidden`; cursor effects (FluidCursor,
SmoothCursor) mount once in the root +layout.svelte; Svelte 5 syntax only.
```

## Development

```bash
pnpm dev             # Start dev server
pnpm check           # Run Svelte type checker
pnpm check:registry  # Verify component registry parity (CI gate)
pnpm check:i18n      # Verify i18n message catalog parity (CI gate)
pnpm test            # Run tests
pnpm test:watch      # Run tests in watch mode
pnpm build           # Production build
pnpm storybook       # Component workshop on :6006
```

Component stories live in `src/stories/` — see the [Storybook section in CONTRIBUTING.md](./CONTRIBUTING.md#storybook).

## Project Structure

```
src/
├── lib/
│   ├── fancy-ui/          # UI components (one folder per component)
│   │   ├── rainbow-button/
│   │   │   ├── RainbowButton.svelte
│   │   │   ├── RainbowButton.test.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── registry.ts    # Component registry & metadata
│   │   └── index.ts       # Barrel exports
│   └── components/ui/     # shadcn-svelte primitives
└── routes/
    ├── +page.svelte       # Home page
    └── docs/              # Docs site (registry-driven component pages)
        └── components/[slug]/+page.svelte

tests/
└── e2e/                   # Playwright end-to-end tests

react/                     # fancy-ui-react: the React edition (own package, same components)
```

Component tests are colocated with their component (see `RainbowButton.test.ts` above); there is no separate top-level unit-test directory.

## Contributing

Contributions are welcome! 146 components and counting — PRs for new components, bug fixes, and improvements are appreciated.

### Adding a new component

1. Create the component folder under `src/lib/fancy-ui/`
2. Implement the component in idiomatic Svelte 5
3. Add a docs example under `src/lib/components/docs/examples/<slug>/` (`BasicUsage.svelte`)
4. Register it in `src/lib/fancy-ui/registry.ts`
5. Export it from `src/lib/fancy-ui/index.ts`

## Tech Stack

| Technology                                   | Version | Purpose             |
| -------------------------------------------- | ------- | ------------------- |
| [Svelte](https://svelte.dev)                 | 5       | UI framework        |
| [SvelteKit](https://svelte.dev/docs/kit)     | 2       | App framework       |
| [Tailwind CSS](https://tailwindcss.com)      | 4       | Styling             |
| [TypeScript](https://www.typescriptlang.org) | 5       | Type safety         |
| [Vitest](https://vitest.dev)                 | 4       | Testing             |
| [bits-ui](https://bits-ui.com)               | 2       | Headless primitives |
| [GSAP](https://gsap.com)                     | 3       | Advanced animations |

## Credits

Inspired by [Inspira UI](https://inspira-ui.com), [Aceternity UI](https://ui.aceternity.com) and [Magic UI](https://magicui.design).

## License

MIT
