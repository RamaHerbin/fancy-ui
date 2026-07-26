# Changelog

## 0.8.0

### Minor Changes

- 2cd6cc7: FluidCursor HDR mode: new `hdr` and `hdrBoost` props. When enabled, the simulation renders through a new WebGPU engine (WGSL port of the fluid solver) into an `rgba16float` / `display-p3` canvas with extended tone mapping — colors glow brighter than SDR white on HDR displays. Falls back automatically to the existing WebGL renderer (with a wide-gamut P3 backbuffer where supported), and rendering with `hdr` disabled is unchanged.

  Also: in `contained` mode the splat radius now auto-scales to viewport-equivalent size (capped at ~30% of the container height), so the effect no longer looks tiny inside small containers such as docs demos. Fullscreen and viewport-sized containers are unaffected.

- 38eaa22: LiquidGlass: add an automatic Safari fallback — WebKit cannot resolve SVG url() filter references inside backdrop-filter, so the chromatic displacement silently disappeared there. On Safari the component now renders a plain frosted blur instead, tunable via the new optional props `fallbackBlur` (default 20) and `fallbackSaturation` (default 180), mirroring FrostedGlass. Docs: both glass components' preview now showcases the landing-page navbar example.
- 37554b2: Add LiquidText component: big text that liquefies along the cursor's path via a raw-WebGL fluid solver, with chromatic-aberration fringing that relaxes back over time. Falls back to static styled text under reduced-motion, missing WebGL, or narrow viewports.

### Patch Changes

- 8771355: Docs: the Changelog page now renders straight from the repository's CHANGELOG.md, so it can never fall behind a release again, with translated page chrome in all 16 locales. The per-locale prose-page mechanism this replaces is removed along with its 48 localized files.
- 8771355: Docs: lock the localization system down — a CI parity gate (`pnpm check:i18n`) plus compile-time key checking (`satisfies Catalog`) across all 16 catalogs, typed `tCategory()`/`docTitle()` helpers replacing five unchecked casts and six hand-built title strings, and translated category/status badges in the component gallery (they were stuck in English next to translated headings).
- c5ff67a: Docs: redesign the getting-started Introduction page — a structured layout with a feature-pill row, a Philosophy card grid, a numbered Quick Start (install / import / use), a What's Included category grid, Next Steps links, and a Theme Generator call-to-action. Theme-aware (adapts to light/dark and the theme switcher) and wired through the i18n store. Docs-site only; no change to the published component API.
- 66e10d1: Docs & landing: live GitHub star count next to the GitHub links (fetched client-side, cached for 1h, hidden when the API is unreachable).
- 46737d9: Docs: the Installation page is redesigned as a first-class component (numbered install steps, prerequisite cards, anchored sections) following the docs design language, with all 16 locales translated via the message system.
- 5a0e389: Docs: add the Claude Code Open Source Program badge to the README.
- 3c404d5: fix(docs Sidebar): keep the sidebar docked on desktop under RTL locales

  Under RTL locales (`ar`, `fa`) the docs sidebar was pushed off-screen on desktop (`lg`+), leaving an empty `ps-64` gutter and no navigation. The desktop docking utility `lg:translate-x-0` and the mobile-drawer RTL transform `rtl:translate-x-full` compile to equal-specificity rules, so source order decides — and `rtl:translate-x-full` is emitted later, winning on RTL desktop. Adding an RTL-aware desktop override (`rtl:lg:translate-x-0`) restores the docked sidebar (mirrored to the right) while leaving the mobile drawer behaviour unchanged. Docs-site only — no change to the published component API.

- 8771355: Docs: the Theming page is redesigned as a first-class component (token pills, Theme Generator callout, anchored sections for every token group) following the docs design language, with all 16 locales translated via the message system.

## 0.7.0

### Minor Changes

- 8eb3ae6: feat: add FrostedGlass component — turbulence-noise glass refraction (alternative to LiquidGlass)
- b420f1c: Add multi-language support to the docs site: a language switcher in the header with 16 locales (en, fr, es, de, it, pt, pl, cs, ja, ko, zh-Hans, hi, id, tr, ar, fa), including full RTL layout for Arabic and Persian. UI chrome and the getting-started guides are translated (machine-translated drafts pending native review); the component registry stays English as the machine-facing source. Docs-site only — no change to the published component API.
- 7ed0256: Add a DaisyUI-style theme switcher to the docs header — a swatch dropdown to pick from named themes (Light, Dark, Cupcake, Emerald, Corporate, Retro, Cyberpunk, Synthwave, Dracula, Forest, Sunset, Ocean, Mono) plus System. Each theme applies site-wide via CSS-variable overrides, persists in localStorage, and toggles light/dark. Docs-site only — no change to the published component API.

### Patch Changes

- 8362a2b: Fix the Component Copilot system prompt: it taught the wrong install command (`pnpm add fancy-ui` / `import … from 'fancy-ui'`) instead of the real package `fancy-ui-svelte`, and a hardcoded "60+ components" that had drifted from the registry. The count is now derived from the registry so it never drifts again, and the prompt now documents the required `@import "fancy-ui-svelte/tailwind.css";` stylesheet line without which Tailwind generates none of the component classes. Docs-site only — no change to the published component API.
- d6a3f89: fix(pkg): ship `dist/utils` in the published package

  The `files` array listed the file `dist/utils.js` but not the `dist/utils/` directory, so `dist/utils/animation.js` (and `color.js`/`geometry.js`) were never published. Any consumer importing from the barrel pulled in `NoiseReveal`, whose `import ... from "../../utils/animation.js"` then failed to resolve at bundle time, breaking the consumer's build. Adding `dist/utils` to `files` restores the missing directory.

- 57f0650: chore: add Storybook 10 with SvelteKit integration for component development and documentation
- 724f108: Add an interactive Theme Generator page to the docs — tune OKLCh color, radius, motion, and rainbow-palette tokens with live sliders, preview components re-theme in real time, and copy the generated CSS.

## 0.6.0

### Minor Changes

- 6ede21f: Add NoiseReveal component: WebGL image reveal with a Perlin-noise dissolve mask, contracting radial gradient, and wave displacement, inspired by a Codrops shader effect
- 8be8831: Add LineReveal and EditorialEngine components powered by @chenglou/pretext:
  LineReveal staggers a line-by-line text reveal with lines computed by canvas
  text measurement instead of DOM splitting; EditorialEngine renders a live
  magazine layout (multi-column flow with cursor handoff, auto-fitted headline,
  drop cap, pullquotes) where text reflows in real time around draggable orbs
  with zero DOM reads.

### Patch Changes

- d17b72b: docs: clarify release pipeline and fix branch name in CONTRIBUTING.md
- 9410c20: Fix bundle correctness and tighten the dependency surface:
  - Export `Dock` (and `DockIcon`, `DockSeparator`) from the package entrypoint — the component was registered and shipped under `dist/`, but never re-exported, making it unreachable from `import { Dock } from "fancy-ui-svelte"`.
  - Remove the dead `fluid-cursor-advanced` registry entry left over from the merge into `FluidCursor` — the component folder no longer exists, so the registry was advertising a non-shippable slug.
  - Move `@vercel/analytics` from `dependencies` to `devDependencies` — it's only used by the docs site (`src/routes/+layout.svelte`) and was unnecessarily pulled into consumer installs.
  - Drop the no-op `rewriteRelativeImportExtensions` flag from `tsconfig.json` — it has no effect with `moduleResolution: bundler` + SvelteKit's build pipeline.
  - Fix README component count: `52`/`57` → `56`.
  - Add `pnpm check:registry` (and run it in CI) — parses `src/lib/fancy-ui/registry.ts`, `src/lib/fancy-ui/index.ts`, and the component folders, and fails if they drift. Catches both quoted (`"book": { ... }`) and bare-identifier (`book: { ... }`) registry keys.

- 8bdd475: Add llms.txt and llms-full.txt endpoints serving LLM-friendly documentation generated from the component registry

## 0.5.0

### Minor Changes

- 972b799: refactor(fluid-cursor): merge FluidCursorAdvanced into FluidCursor with new `contained` prop

- f3f5f7d: feat(fluid-cursor-advanced): add singleton instance management with `allowMultiple` prop
- dec71f5: feat(docs): merge demo examples into doc pages
- ccab02c: Add neon synthwave glow effect to landing page code blocks

### Patch Changes

- 2e31372: chore: replace landing page with new design

## 0.4.1

### Patch Changes

- dee3bce: fix(confetti): rename manualstart prop to manualStart
- f94d734: Add interaction and autonomous animation props to FluidCursorAdvanced: `interactive`, `autoSplat`, `autoSplatInterval`, `pauseWhenHidden`, `splatOnMount`
- 945cf3f: Add FluidCursorAdvanced component that confines the WebGL fluid simulation to a parent container element
- 39803f1: add fluidColor, fluidColors, colorIntensity props and hex backColor support to FluidCursor
- 47d6f0d: add new root exports (FluidCursor, InteractiveGridPattern) and remove hardcoded `tracking-wider` from NumberTicker

## 0.4.0

### Minor Changes

- e1d3641: add Component Copilot AI chat demo at /demo/component-copilot
- c81e5f6: add MatrixRain and TerminalText components with interactive demo

## 0.3.0

### Minor Changes

- f40190a: feat(displacement-text): add 3D displacement text component
- 649870d: Add interactive props playground to demo pages

### Patch Changes

- f40190a: feat: add AppleCardCarousel component — horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App Store UI
- f40190a: fix compare corner overflow and broken animated-tooltip image
- f40190a: docs: update homepage quick start and roadmap for npm package release
- f40190a: fix(flip-words): prevent layout shift during word transition
- f40190a: feat: add LineHoverLink component — link with 11 animated underline hover effects, pure CSS
- f40190a: add npm package build pipeline — consumers can now install via `npm install fancy-ui`
- 265a76b: docs: mark v0.2 as released and update v0.3 roadmap status

## 0.2.1

### Patch Changes

- cb441e1: feat: add AppleCardCarousel component — horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App Store UI
- de83ffd: feat(displacement-text): add 3D displacement text component
- 76bfff4: feat: add LineHoverLink component — link with 11 animated underline hover effects, pure CSS
- db6f88e: add npm package build pipeline — consumers can now install via `npm install fancy-ui`

## 0.2.0

### Minor Changes

- 6e66ac4: Add AnimatedTestimonials component — testimonial carousel with smooth slide animations, direction-aware navigation arrows, and optional autoplay support.

### Patch Changes

- 5cc87d8: Set up changesets versioning workflow

All notable changes to fancy-ui will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note on 0.x versioning:** While the version is below 1.0.0, minor releases may
> include breaking changes. See the [versioning policy](CONTRIBUTING.md#versioning) for details.

---

## 0.1.0 — 2026-03-13

Initial public release — 50 components across 10 categories, built with Svelte 5 runes
and Tailwind CSS v4.

### Added

#### Buttons (5)

| Component              | Description                                   |
| ---------------------- | --------------------------------------------- |
| GradientButton         | Rotating conic-gradient rainbow border effect |
| InteractiveHoverButton | Hover effect revealing alternate content      |
| RainbowButton          | Animated rainbow gradient border effect       |
| RippleButton           | Click ripple effect                           |
| ShimmerButton          | Rotating conic-gradient shimmer border effect |

#### Cards (8)

| Component           | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| BentoGrid           | Bento-style grid layout with slot-based and props-based card variants        |
| Book                | 3D book component with cover, spine, and back face that opens on hover       |
| Card3D              | Interactive 3D perspective card with depth effects on child elements         |
| CardSpotlight       | Card with mouse-following radial gradient spotlight overlay                  |
| DirectionAwareHover | Image card with overlay that slides in from the mouse entry direction        |
| FlipCard            | Card that flips to reveal back content on hover using CSS 3D transforms      |
| GlareCard           | Holographic trading card effect with mouse-tracking glare and rainbow foil   |
| TextRevealCard      | Card that reveals text on horizontal mouse drag with animated star particles |

#### Text & Typography (12)

| Component          | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| BlurReveal         | Scroll-triggered blur-to-clear reveal animation with staggered children        |
| BoxReveal          | Content reveal with sliding colored box animation                              |
| ColourfulText      | Per-character color animation with shuffling colors                            |
| ContainerTextFlip  | Text container that cycles through words with per-character blur animation     |
| FlipWords          | Cycling word animation with per-letter fade-in and blur effects                |
| Focus              | Text component that cycles focus through words with blur and corner frame      |
| HyperText          | Character scramble effect that activates on hover                              |
| LetterPullup       | Staggered letter pull-up animation with wave entrance effect                   |
| LineShadowText     | Text with animated diagonal line shadow pattern that scrolls continuously      |
| NumberTicker       | Animated number counter with easing, triggered on viewport entry               |
| SparklesText       | Text with animated SVG sparkle stars overlay                                   |
| TextGenerateEffect | Typewriter-style text reveal that fades in words one by one with optional blur |

#### Backgrounds (4)

| Component       | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| FallingStarsBg  | Canvas-based 3D starfield with perspective projection, motion trails, and glow     |
| FlickeringGrid  | Canvas-based grid of squares with flickering opacity                               |
| Sparkles        | Canvas-based floating particle sparkle effect with configurable density and colors |
| StarsBackground | Animated starfield background with parallax mouse tracking                         |

#### Effects (14)

| Component              | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| AnimatedBeam           | Animated SVG beams connecting elements with smooth gradients                       |
| BorderBeam             | Animated beam effect that travels around borders                                   |
| Confetti               | Confetti celebration effect powered by canvas-confetti with button trigger support |
| FluidCursor            | WebGL fluid simulation that follows cursor movement                                |
| GlowBorder             | Animated glowing border effect with gradient support                               |
| GlowingEffect          | Mouse-proximity based glowing border effect with animated conic gradient           |
| ImageTrailCursor       | Cursor-following image trail with 8 animation variants                             |
| InteractiveGridPattern | SVG grid of squares that highlight on hover with smooth fade transitions           |
| LiquidGlass            | Glass-like visual effect using SVG filters for chromatic displacement              |
| Meteors                | Animated meteor shower effect with randomized positions and delays                 |
| NeonBorder             | Dual-color neon glow border effect with optional rotation animation                |
| Ripple                 | Concentric pulsing circles with ripple wave animation                              |
| SmoothCursor           | Physics-based smooth cursor with spring animations and rotation effects            |
| TracingBeam            | Vertical SVG beam that highlights scroll progress alongside content                |

#### Layout (2)

| Component       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| ContainerScroll | Scroll-driven animation that rotates and scales a card from tilted to flat |
| Marquee         | Infinite scrolling component for text, images, or cards                    |

#### Navigation (2)

| Component | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| Dock      | macOS-style dock with icon magnification on hover                    |
| Timeline  | Vertical timeline with scroll-driven progress line and sticky labels |

#### Data Display (1)

| Component | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| LogoCloud | Logo display with animated marquee, static grid, and icon variants |

#### Feedback (1)

| Component       | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| AnimatedTooltip | Avatar row with animated tooltips that follow mouse movement |

#### Media (1)

| Component | Description                                                    |
| --------- | -------------------------------------------------------------- |
| Compare   | Before/after image comparison slider with hover and drag modes |
