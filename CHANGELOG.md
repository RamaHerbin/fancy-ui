# Changelog

## 1.0.0

### Major Changes

- 972b799: refactor(fluid-cursor): merge FluidCursorAdvanced into FluidCursor with new `contained` prop

### Minor Changes

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
