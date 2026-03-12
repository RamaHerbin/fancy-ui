# fancy-ui

Beautiful animation and UI components for **Svelte 5**.

![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Components](https://img.shields.io/badge/Components-52-8B5CF6)
![MIT License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <a href="https://svelte-ui-omega.vercel.app">
    <img src=".github/demo-gallery.png" alt="fancy-ui demo gallery" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://svelte-ui-omega.vercel.app"><strong>Live Demo</strong></a>
</p>

## Features

- **Svelte 5 Runes** &mdash; Built with `$state`, `$derived`, `$effect`, and `$props`
- **Tailwind CSS 4** &mdash; Utility-first styling with theme tokens
- **TypeScript** &mdash; Fully typed props and events
- **31 Components** &mdash; Buttons, text animations, backgrounds, effects, and more
- **Dark Mode** &mdash; All components support light and dark themes
- **Tested** &mdash; Component tests with Vitest and Testing Library

## Components

### Buttons

| Component | Description | Demo |
|-----------|-------------|------|
| RainbowButton | Animated rainbow gradient border effect | [Demo](https://svelte-ui-omega.vercel.app/demo/rainbow-button) |
| RippleButton | Ripple click effect | [Demo](https://svelte-ui-omega.vercel.app/demo/ripple-button) |
| ShimmerButton | Rotating conic-gradient shimmer border | [Demo](https://svelte-ui-omega.vercel.app/demo/shimmer-button) |
| GradientButton | Rotating conic-gradient rainbow border | [Demo](https://svelte-ui-omega.vercel.app/demo/gradient-button) |
| InteractiveHoverButton | Hover effect revealing alternate content | [Demo](https://svelte-ui-omega.vercel.app/demo/interactive-hover-button) |

### Cards

| Component | Description | Demo |
|-----------|-------------|------|
| DirectionAwareHover | Overlay slides in from mouse entry direction | [Demo](https://svelte-ui-omega.vercel.app/demo/direction-aware-hover) |

### Text & Typography

| Component | Description | Demo |
|-----------|-------------|------|
| BlurReveal | Scroll-triggered blur-to-clear reveal | [Demo](https://svelte-ui-omega.vercel.app/demo/blur-reveal) |
| ColourfulText | Per-character color animation | [Demo](https://svelte-ui-omega.vercel.app/demo/colourful-text) |
| FlipWords | Cycling word animation with per-letter effects | [Demo](https://svelte-ui-omega.vercel.app/demo/flip-words) |
| HyperText | Character scramble on hover | [Demo](https://svelte-ui-omega.vercel.app/demo/hyper-text) |
| LetterPullup | Staggered letter pull-up animation | [Demo](https://svelte-ui-omega.vercel.app/demo/letter-pullup) |
| NumberTicker | Animated number counter with easing | [Demo](https://svelte-ui-omega.vercel.app/demo/number-ticker) |
| SparklesText | Animated SVG sparkle stars overlay | [Demo](https://svelte-ui-omega.vercel.app/demo/sparkles-text) |
| BoxReveal | Sliding colored box reveal animation | [Demo](https://svelte-ui-omega.vercel.app/demo/box-reveal) |

### Backgrounds

| Component | Description | Demo |
|-----------|-------------|------|
| FallingStarsBg | Canvas 3D starfield with motion trails | [Demo](https://svelte-ui-omega.vercel.app/demo/bg-falling-stars) |
| StarsBackground | Starfield with parallax mouse tracking | [Demo](https://svelte-ui-omega.vercel.app/demo/bg-stars) |
| FlickeringGrid | Canvas grid with flickering opacity | [Demo](https://svelte-ui-omega.vercel.app/demo/flickering-grid) |

### Effects

| Component | Description | Demo |
|-----------|-------------|------|
| AnimatedBeam | SVG beams connecting elements | [Demo](https://svelte-ui-omega.vercel.app/demo/animated-beam) |
| BorderBeam | Beam effect traveling around borders | [Demo](https://svelte-ui-omega.vercel.app/demo/border-beam) |
| ImageTrailCursor | Cursor-following image trail (8 variants) | [Demo](https://svelte-ui-omega.vercel.app/demo/image-trail-cursor) |
| InteractiveGridPattern | SVG grid with hover highlights | [Demo](https://svelte-ui-omega.vercel.app/demo/interactive-grid-pattern) |
| FluidCursor | WebGL fluid simulation following cursor | [Demo](https://svelte-ui-omega.vercel.app/demo/fluid-cursor) |
| GlowBorder | Animated glowing border with gradients | [Demo](https://svelte-ui-omega.vercel.app/demo/glow-border) |
| Meteors | Animated meteor shower effect | [Demo](https://svelte-ui-omega.vercel.app/demo/meteors) |
| NeonBorder | Dual-color neon glow border | [Demo](https://svelte-ui-omega.vercel.app/demo/neon-border) |

### Layout

| Component | Description | Demo |
|-----------|-------------|------|
| Marquee | Infinite scrolling for text, images, or cards | [Demo](https://svelte-ui-omega.vercel.app/demo/marquee) |

### Navigation

| Component | Description | Demo |
|-----------|-------------|------|
| Timeline | Vertical timeline with scroll-driven progress | [Demo](https://svelte-ui-omega.vercel.app/demo/timeline) |
| Dock | macOS-style dock with icon magnification | [Demo](https://svelte-ui-omega.vercel.app/demo/dock) |

### Data Display

| Component | Description | Demo |
|-----------|-------------|------|
| LogoCloud | Marquee, grid, and icon logo layouts | [Demo](https://svelte-ui-omega.vercel.app/demo/logo-cloud) |

### Feedback

| Component | Description | Demo |
|-----------|-------------|------|
| AnimatedTooltip | Avatar row with mouse-following tooltips | [Demo](https://svelte-ui-omega.vercel.app/demo/animated-tooltip) |

### Media

| Component | Description | Demo |
|-----------|-------------|------|
| Compare | Before/after image comparison slider | [Demo](https://svelte-ui-omega.vercel.app/demo/compare) |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Import a component:

```svelte
<script lang="ts">
  import { RainbowButton } from '$lib/fancy-ui';
</script>

<RainbowButton>Click me</RainbowButton>
```

## Development

```bash
pnpm dev          # Start dev server
pnpm check        # Run Svelte type checker
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm build        # Production build
```

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
├── routes/
│   ├── +page.svelte       # Home page
│   └── demo/              # Component demo pages
│       └── [component]/+page.svelte
└── tests/
```

## Contributing

The library currently ships **31 components** with many more planned &mdash; contributions are welcome!

### Adding a new component

1. Create the component folder under `src/lib/fancy-ui/`
2. Implement the component in idiomatic Svelte 5
3. Add a demo page at `src/routes/demo/[slug]/+page.svelte`
4. Register it in `src/lib/fancy-ui/registry.ts`
5. Export it from `src/lib/fancy-ui/index.ts`

See [CLAUDE.md](./CLAUDE.md) for detailed conventions and Svelte 5 idioms.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Svelte](https://svelte.dev) | 5 | UI framework |
| [SvelteKit](https://svelte.dev/docs/kit) | 2 | App framework |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [Vitest](https://vitest.dev) | 4 | Testing |
| [bits-ui](https://bits-ui.com) | 2 | Headless primitives |
| [GSAP](https://gsap.com) | 3 | Advanced animations |

## Credits

Some components are adapted from [Inspira UI](https://inspira-ui.com).

## License

MIT
