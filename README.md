# fancy-ui

Beautiful animation and UI components for **Svelte 5**.

![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Components](https://img.shields.io/badge/Components-61-8B5CF6)
![MIT License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <a href="https://fancy-ui.rama.app">
    <img src=".github/demo-gallery.png" alt="fancy-ui demo gallery" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://fancy-ui.rama.app"><strong>Live Demo</strong></a>
</p>

## Features

- **Svelte 5 Runes** &mdash; Built with `$state`, `$derived`, `$effect`, and `$props`
- **Tailwind CSS 4** &mdash; Utility-first styling with theme tokens
- **TypeScript** &mdash; Fully typed props and events
- **61 Components** &mdash; Buttons, text animations, backgrounds, effects, and more
- **Dark Mode** &mdash; All components support light and dark themes
- **Tested** &mdash; 600+ unit tests with Vitest and Testing Library

## Components

### Buttons

| Component              | Description                              | Demo                                                                       |
| ---------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| RainbowButton          | Animated rainbow gradient border effect  | [Demo](https://fancy-ui.rama.app/docs/components/rainbow-button)           |
| RippleButton           | Ripple click effect                      | [Demo](https://fancy-ui.rama.app/docs/components/ripple-button)            |
| ShimmerButton          | Rotating conic-gradient shimmer border   | [Demo](https://fancy-ui.rama.app/docs/components/shimmer-button)           |
| GradientButton         | Rotating conic-gradient rainbow border   | [Demo](https://fancy-ui.rama.app/docs/components/gradient-button)          |
| InteractiveHoverButton | Hover effect revealing alternate content | [Demo](https://fancy-ui.rama.app/docs/components/interactive-hover-button) |

### Cards

| Component           | Description                                                         | Demo                                                                    |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| AppleCardCarousel   | Horizontal card carousel with spring-animated full-screen expansion | [Demo](https://fancy-ui.rama.app/docs/components/apple-card-carousel)   |
| Card3D              | 3D tilt card with mouse tracking                                    | [Demo](https://fancy-ui.rama.app/docs/components/card-3d)               |
| CardSpotlight       | Spotlight effect following mouse                                    | [Demo](https://fancy-ui.rama.app/docs/components/card-spotlight)        |
| DirectionAwareHover | Overlay slides in from mouse entry direction                        | [Demo](https://fancy-ui.rama.app/docs/components/direction-aware-hover) |
| FlipCard            | Two-sided card with flip animation                                  | [Demo](https://fancy-ui.rama.app/docs/components/flip-card)             |
| GlareCard           | Glare reflection effect on hover                                    | [Demo](https://fancy-ui.rama.app/docs/components/glare-card)            |
| TextRevealCard      | Text reveal on hover                                                | [Demo](https://fancy-ui.rama.app/docs/components/text-reveal-card)      |

### Text & Typography

| Component          | Description                                                                    | Demo                                                                   |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| BlurReveal         | Scroll-triggered blur-to-clear reveal                                          | [Demo](https://fancy-ui.rama.app/docs/components/blur-reveal)          |
| BoxReveal          | Sliding colored box reveal animation                                           | [Demo](https://fancy-ui.rama.app/docs/components/box-reveal)           |
| ColourfulText      | Per-character color animation                                                  | [Demo](https://fancy-ui.rama.app/docs/components/colourful-text)       |
| ContainerTextFlip  | Text flipping inside a container                                               | [Demo](https://fancy-ui.rama.app/docs/components/container-text-flip)  |
| DisplacementText   | 3D text with WebGL displacement that follows the cursor using Three.js shaders | [Demo](https://fancy-ui.rama.app/docs/components/displacement-text)    |
| EditorialEngine    | Live magazine layout with multi-column text flowing around draggable orbs      | [Demo](https://fancy-ui.rama.app/docs/components/editorial-engine)     |
| FlipWords          | Cycling word animation with per-letter effects                                 | [Demo](https://fancy-ui.rama.app/docs/components/flip-words)           |
| HyperText          | Character scramble on hover                                                    | [Demo](https://fancy-ui.rama.app/docs/components/hyper-text)           |
| LetterPullup       | Staggered letter pull-up animation                                             | [Demo](https://fancy-ui.rama.app/docs/components/letter-pullup)        |
| LineReveal         | Staggered line-by-line text reveal                                             | [Demo](https://fancy-ui.rama.app/docs/components/line-reveal)          |
| LineShadowText     | Text with animated line shadow                                                 | [Demo](https://fancy-ui.rama.app/docs/components/line-shadow-text)     |
| LiquidText         | Big text that liquefies along the cursor's path via a WebGL fluid solver       | [Demo](https://fancy-ui.rama.app/docs/components/liquid-text)          |
| NumberTicker       | Animated number counter with easing                                            | [Demo](https://fancy-ui.rama.app/docs/components/number-ticker)        |
| SparklesText       | Animated SVG sparkle stars overlay                                             | [Demo](https://fancy-ui.rama.app/docs/components/sparkles-text)        |
| TerminalText       | Terminal-style text streamer with blinking cursor and glitch effect            | [Demo](https://fancy-ui.rama.app/docs/components/terminal-text)        |
| TextGenerateEffect | Word-by-word text generation effect                                            | [Demo](https://fancy-ui.rama.app/docs/components/text-generate-effect) |

### Backgrounds

| Component              | Description                                                                 | Demo                                                                       |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| FallingStarsBg         | Canvas 3D starfield with motion trails                                      | [Demo](https://fancy-ui.rama.app/docs/components/bg-falling-stars)         |
| FlickeringGrid         | Canvas grid with flickering opacity                                         | [Demo](https://fancy-ui.rama.app/docs/components/flickering-grid)          |
| InteractiveGridPattern | SVG grid with hover highlights                                              | [Demo](https://fancy-ui.rama.app/docs/components/interactive-grid-pattern) |
| MatrixRain             | Canvas-based falling glyph rain with configurable color, speed, and density | [Demo](https://fancy-ui.rama.app/docs/components/matrix-rain)              |
| StarsBackground        | Starfield with parallax mouse tracking                                      | [Demo](https://fancy-ui.rama.app/docs/components/bg-stars)                 |

### Effects & Animations

| Component        | Description                                                    | Demo                                                                 |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| AnimatedBeam     | SVG beams connecting elements                                  | [Demo](https://fancy-ui.rama.app/docs/components/animated-beam)      |
| BorderBeam       | Beam effect traveling around borders                           | [Demo](https://fancy-ui.rama.app/docs/components/border-beam)        |
| Confetti         | Configurable confetti burst                                    | [Demo](https://fancy-ui.rama.app/docs/components/confetti)           |
| FluidCursor      | WebGL fluid simulation following cursor                        | [Demo](https://fancy-ui.rama.app/docs/components/fluid-cursor)       |
| FrostedGlass     | Frosted glass surface with organic turbulence-noise refraction | [Demo](https://fancy-ui.rama.app/docs/components/frosted-glass)      |
| GlowBorder       | Animated glowing border with gradients                         | [Demo](https://fancy-ui.rama.app/docs/components/glow-border)        |
| GlowingEffect    | Glowing highlight on hover                                     | [Demo](https://fancy-ui.rama.app/docs/components/glowing-effect)     |
| ImageTrailCursor | Cursor-following image trail (8 variants)                      | [Demo](https://fancy-ui.rama.app/docs/components/image-trail-cursor) |
| LiquidGlass      | Liquid glass morphism effect                                   | [Demo](https://fancy-ui.rama.app/docs/components/liquid-glass)       |
| Meteors          | Animated meteor shower effect                                  | [Demo](https://fancy-ui.rama.app/docs/components/meteors)            |
| NeonBorder       | Dual-color neon glow border                                    | [Demo](https://fancy-ui.rama.app/docs/components/neon-border)        |
| Ripple           | Expanding ripple rings                                         | [Demo](https://fancy-ui.rama.app/docs/components/ripple)             |
| SmoothCursor     | Smooth lagging cursor follower                                 | [Demo](https://fancy-ui.rama.app/docs/components/smooth-cursor)      |
| Sparkles         | Particle sparkle canvas                                        | [Demo](https://fancy-ui.rama.app/docs/components/sparkles)           |
| TracingBeam      | Scroll-driven tracing beam                                     | [Demo](https://fancy-ui.rama.app/docs/components/tracing-beam)       |

### Layout

| Component       | Description                                   | Demo                                                               |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| BentoGrid       | Bento-style responsive grid layout            | [Demo](https://fancy-ui.rama.app/docs/components/bento-grid)       |
| Book            | 3D book flip animation                        | [Demo](https://fancy-ui.rama.app/docs/components/book)             |
| ContainerScroll | 3D scroll perspective container               | [Demo](https://fancy-ui.rama.app/docs/components/container-scroll) |
| Focus           | Focus-expand card layout                      | [Demo](https://fancy-ui.rama.app/docs/components/focus)            |
| Marquee         | Infinite scrolling for text, images, or cards | [Demo](https://fancy-ui.rama.app/docs/components/marquee)          |

### Navigation & Display

| Component            | Description                                                             | Demo                                                                    |
| -------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| AnimatedTestimonials | Testimonial carousel with smooth slide animations and optional autoplay | [Demo](https://fancy-ui.rama.app/docs/components/animated-testimonials) |
| AnimatedTooltip      | Avatar row with mouse-following tooltips                                | [Demo](https://fancy-ui.rama.app/docs/components/animated-tooltip)      |
| Compare              | Before/after image comparison slider                                    | [Demo](https://fancy-ui.rama.app/docs/components/compare)               |
| Dock                 | Icon dock where items magnify as the cursor approaches                  | [Demo](https://fancy-ui.rama.app/docs/components/dock)                  |
| LineHoverLink        | Link with 11 animated underline hover effects, pure CSS                 | [Demo](https://fancy-ui.rama.app/docs/components/line-hover-link)       |
| LogoCloud            | Marquee, grid, and icon logo layouts                                    | [Demo](https://fancy-ui.rama.app/docs/components/logo-cloud)            |
| NoiseReveal          | WebGL image reveal with a Perlin-noise dissolve mask                    | [Demo](https://fancy-ui.rama.app/docs/components/noise-reveal)          |
| Timeline             | Vertical timeline with scroll-driven progress                           | [Demo](https://fancy-ui.rama.app/docs/components/timeline)              |

## Quick Start

**Install via npm:**

```bash
npm install fancy-ui-svelte
```

Then import any component:

```ts
import { Marquee, BorderBeam, Confetti } from "fancy-ui-svelte";
```

Add the Tailwind integration to your app's CSS (e.g. `src/app.css`):

```css
@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";
```

This single import tells Tailwind v4 to scan the library's components so all utility classes are generated automatically. No manual `@source` path needed.

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

## Using with AI agents (Claude Code, Cursor, Copilot)

The docs site serves LLM-friendly documentation following the [llms.txt](https://llmstxt.org) convention:

- [fancy-ui.rama.app/llms.txt](https://fancy-ui.rama.app/llms.txt) — setup guide, usage rules, and component index
- [fancy-ui.rama.app/llms-full.txt](https://fancy-ui.rama.app/llms-full.txt) — full reference with every component's props

To make your coding agent use fancy-ui correctly, add this to your project's `CLAUDE.md`, `AGENTS.md`, or `.cursorrules`:

```markdown
## UI components

Use fancy-ui-svelte (Svelte 5 + Tailwind CSS v4) for animated UI components.
Full component and props reference: https://fancy-ui.rama.app/llms-full.txt
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
```

Component tests are colocated with their component (see `RainbowButton.test.ts` above); there is no separate top-level unit-test directory.

## Contributing

Contributions are welcome! 61 components and counting — PRs for new components, bug fixes, and improvements are appreciated.

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

---

<p align="center">
  <a href="https://www.anthropic.com/claude-code">
    <img src=".github/claude-for-open-source-program.svg" alt="Claude for Open Source Program" width="420" />
  </a>
</p>
