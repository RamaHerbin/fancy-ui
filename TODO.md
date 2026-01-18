# FancyUI - Project Foundation TODO

> A roadmap to build a scalable, idiomatic SvelteKit foundation for porting 100+ FancyUI components.

---

## Phase 1: Core Infrastructure

> **Dependencies**: None (start here)

### 1.1 Centralize Library Exports

- [x] **Update `src/lib/index.ts` to export utilities and types**
  - **Where**: `src/lib/index.ts`
  - **What**: Re-export `cn`, utility types, and fancy-ui components
  - **Why**: Enables clean imports like `import { cn, RainbowButton } from '$lib'`

- [x] **Create shared component types file**
  - **Where**: `src/lib/types.ts`
  - **What**: Define `BaseComponentProps`, `AnimatedComponentProps`, common event types
  - **Why**: Ensures type consistency across all ported components

### 1.2 Expand shadcn-svelte Primitives

> **Dependencies**: 1.1

- [x] **Add Card component**
  - **Where**: `src/lib/components/ui/card/`
  - **What**: Run `npx shadcn-svelte add card`
  - **Why**: Essential for demo page layouts and many FancyUI compositions

- [x] **Add Badge component**
  - **Where**: `src/lib/components/ui/badge/`
  - **What**: Run `npx shadcn-svelte add badge`
  - **Why**: Useful for status indicators in demo pages

- [x] **Add Separator component**
  - **Where**: `src/lib/components/ui/separator/`
  - **What**: Run `npx shadcn-svelte add separator`
  - **Why**: Common layout primitive for section dividers

- [x] **Add Tabs component**
  - **Where**: `src/lib/components/ui/tabs/`
  - **What**: Run `npx shadcn-svelte add tabs`
  - **Why**: Required for showing code examples alongside demos

### 1.3 Theme Enhancement

> **Dependencies**: None

- [x] **Add CSS custom properties for animations**
  - **Where**: `src/routes/layout.css`
  - **What**: Define `--animation-fast`, `--animation-normal`, `--animation-slow` tokens
  - **Why**: Centralizes animation timing for consistency across components

- [x] **Add gradient color tokens**
  - **Where**: `src/routes/layout.css`
  - **What**: Define `--gradient-start`, `--gradient-end`, rainbow color variables
  - **Why**: Many FancyUI components use gradient effects

- [x] **Create theme context store**
  - **Where**: `src/lib/stores/theme.ts`
  - **What**: Svelte store for theme state (dark/light), reduced-motion preference
  - **Why**: Enables runtime theme switching and respects user preferences

---

## Phase 2: Component Architecture

> **Dependencies**: Phase 1.1

### 2.1 Establish Component Template

- [x] **Create component folder template**
  - **Where**: `src/lib/fancy-ui/_template/`
  - **What**: Create skeleton files: `Component.svelte`, `types.ts`, `index.ts`, `README.md`
  - **Why**: Ensures consistent structure for all 100+ component ports

- [x] **Document component template usage**
  - **Where**: `src/lib/fancy-ui/_template/README.md`
  - **What**: Step-by-step guide for using template when porting
  - **Why**: Reduces friction and errors when contributors port components

### 2.2 Component Classification System

- [x] **Create component registry**
  - **Where**: `src/lib/fancy-ui/registry.ts`
  - **What**: TypeScript object mapping component names to metadata (category, status, dependencies)
  - **Why**: Enables programmatic component listing and filtering in demos

- [x] **Define component categories**
  - **Where**: `src/lib/fancy-ui/registry.ts`
  - **What**: Categories: `buttons`, `cards`, `backgrounds`, `text`, `layout`, `feedback`, `data-display`
  - **Why**: Organizes 100+ components into navigable groups

### 2.3 Shared Utilities

> **Dependencies**: 2.1

- [x] **Create animation utilities**
  - **Where**: `src/lib/utils/animation.ts`
  - **What**: Helpers for spring configs, easing functions, duration calculations
  - **Why**: Many FancyUI components share animation patterns

- [x] **Create geometry utilities**
  - **Where**: `src/lib/utils/geometry.ts`
  - **What**: Helpers for mouse position, angle calculation, distance
  - **Why**: Required for hover effects, spotlights, direction-aware components

- [x] **Create color utilities**
  - **Where**: `src/lib/utils/color.ts`
  - **What**: OKLCH manipulation, gradient generation, color interpolation
  - **Why**: Supports dynamic color effects in beam, glow, and gradient components

---

## Phase 3: Demo Infrastructure

> **Dependencies**: Phase 1.2, Phase 2.2

### 3.1 Demo Layout System

- [ ] **Create demo layout component**
  - **Where**: `src/routes/demo/+layout.svelte`
  - **What**: Shared layout with sidebar navigation, breadcrumbs, theme toggle
  - **Why**: Provides consistent navigation across all demo pages

- [ ] **Create sidebar navigation component**
  - **Where**: `src/lib/components/demo/Sidebar.svelte`
  - **What**: Collapsible sidebar listing all components by category
  - **Why**: Essential for browsing 100+ component demos

- [ ] **Create theme toggle component**
  - **Where**: `src/lib/components/demo/ThemeToggle.svelte`
  - **What**: Button to switch between light/dark modes
  - **Why**: Allows visual validation of components in both themes

### 3.2 Demo Page Template

> **Dependencies**: 3.1

- [ ] **Create reusable demo section component**
  - **Where**: `src/lib/components/demo/DemoSection.svelte`
  - **What**: Component with title, description, preview area, and optional code snippet
  - **Why**: Standardizes demo page structure, reduces boilerplate

- [ ] **Create code preview component**
  - **Where**: `src/lib/components/demo/CodePreview.svelte`
  - **What**: Syntax-highlighted code block with copy button
  - **Why**: Shows usage examples alongside live demos

- [ ] **Create props table component**
  - **Where**: `src/lib/components/demo/PropsTable.svelte`
  - **What**: Table displaying component props, types, defaults, descriptions
  - **Why**: Documents API for each component

### 3.3 Demo Index Enhancement

> **Dependencies**: 3.1, 2.2

- [ ] **Update demo index to use registry**
  - **Where**: `src/routes/demo/+page.svelte`
  - **What**: Generate component list dynamically from registry
  - **Why**: Automatically updates as new components are ported

- [ ] **Add category filtering**
  - **Where**: `src/routes/demo/+page.svelte`
  - **What**: Filter buttons/tabs to show components by category
  - **Why**: Improves navigation with many components

- [ ] **Add search functionality**
  - **Where**: `src/routes/demo/+page.svelte`
  - **What**: Search input to filter components by name
  - **Why**: Quick access to specific components

---

## Phase 4: Export & Distribution Setup

> **Dependencies**: Phase 2.1

### 4.1 Package Exports Configuration

- [ ] **Configure package.json exports field**
  - **Where**: `package.json`
  - **What**: Add `exports` field mapping subpaths to component entry points
  - **Why**: Enables tree-shaking and clean imports for library consumers

- [ ] **Add sideEffects field**
  - **Where**: `package.json`
  - **What**: Mark CSS files as side effects, components as side-effect-free
  - **Why**: Enables proper tree-shaking in bundlers

### 4.2 Build Configuration

- [ ] **Add library build script**
  - **Where**: `package.json`, `vite.config.ts`
  - **What**: Configure `svelte-package` or Vite library mode for building distributable
  - **Why**: Prepares project for npm publishing

- [ ] **Configure TypeScript declarations**
  - **Where**: `tsconfig.json`, `package.json`
  - **What**: Enable declaration generation, add `types` field
  - **Why**: Provides TypeScript support for library consumers

---

## Phase 5: Quality Assurance

> **Dependencies**: Phase 1, Phase 2

### 5.1 Linting & Formatting

- [ ] **Add ESLint configuration**
  - **Where**: `eslint.config.js`, `package.json`
  - **What**: Configure ESLint with Svelte and TypeScript plugins
  - **Why**: Enforces code consistency across all components

- [ ] **Add Prettier configuration**
  - **Where**: `.prettierrc`, `package.json`
  - **What**: Configure Prettier with Svelte plugin
  - **Why**: Consistent code formatting

- [ ] **Add lint script**
  - **Where**: `package.json`
  - **What**: Add `"lint": "eslint . && prettier --check ."` script
  - **Why**: Enables CI linting

### 5.2 Testing Setup

- [ ] **Install Vitest**
  - **Where**: `package.json`, `vite.config.ts`
  - **What**: Add vitest, @testing-library/svelte, jsdom
  - **Why**: Enables unit testing for components

- [ ] **Create test utilities**
  - **Where**: `src/lib/test-utils.ts`
  - **What**: Custom render function with theme provider, common test helpers
  - **Why**: Simplifies writing component tests

- [ ] **Add test script**
  - **Where**: `package.json`
  - **What**: Add `"test": "vitest"` and `"test:ci": "vitest run"` scripts
  - **Why**: Enables running tests locally and in CI

### 5.3 Accessibility Validation

- [ ] **Create a11y checklist template**
  - **Where**: `src/lib/fancy-ui/_template/a11y-checklist.md`
  - **What**: Checklist covering keyboard nav, ARIA, focus management, color contrast
  - **Why**: Ensures ported components maintain accessibility

- [ ] **Add axe-core for automated a11y testing**
  - **Where**: `package.json`, test setup
  - **What**: Install @axe-core/playwright or vitest-axe
  - **Why**: Catches accessibility regressions automatically

---

## Phase 6: Documentation

> **Dependencies**: Phase 3.2

### 6.1 Component Documentation

- [ ] **Create component README template**
  - **Where**: `src/lib/fancy-ui/_template/README.md`
  - **What**: Template covering: description, props, usage, porting notes, known issues
  - **Why**: Standardizes documentation across all components

- [ ] **Document RainbowButton as reference**
  - **Where**: `src/lib/fancy-ui/rainbow-button/README.md`
  - **What**: Complete documentation following template
  - **Why**: Serves as example for future component docs

### 6.2 Project Documentation

- [ ] **Create CONTRIBUTING.md**
  - **Where**: `CONTRIBUTING.md`
  - **What**: Guide for porting components, PR process, code standards
  - **Why**: Enables community contributions

- [ ] **Create CHANGELOG.md**
  - **Where**: `CHANGELOG.md`
  - **What**: Track component additions, breaking changes, fixes
  - **Why**: Communicates changes to library users

---

## Phase 7: CI/CD Pipeline

> **Dependencies**: Phase 5

### 7.1 GitHub Actions

- [ ] **Create CI workflow**
  - **Where**: `.github/workflows/ci.yml`
  - **What**: Run check, lint, test on PRs
  - **Why**: Prevents broken code from merging

- [ ] **Create preview deployment workflow**
  - **Where**: `.github/workflows/preview.yml`
  - **What**: Deploy demo site for PR preview (Vercel/Netlify)
  - **Why**: Enables visual review of component changes

### 7.2 Release Automation

- [ ] **Configure changesets**
  - **Where**: `.changeset/config.json`, `package.json`
  - **What**: Install @changesets/cli, configure for semantic versioning
  - **Why**: Automates version management and changelog generation

---

## Phase 8: Component Porting

> **Dependencies**: Phase 1, Phase 2, Phase 3.1
>
> This is the main work: porting 119 Vue components from `vendor/inspira/ui/` to Svelte.

### 8.1 Buttons (6 components)

- [x] **rainbow-button** - Animated rainbow gradient border button
- [ ] **gradient-button** - Button with gradient background
- [ ] **shimmer-button** - Button with shimmer effect
- [x] **ripple-button** - Button with ripple click effect
- [ ] **interactive-hover-button** - Button with hover interactions
- [ ] **neon-border** - Button/container with neon glow border

### 8.2 Cards & Containers (12 components)

- [ ] **card-3d** - 3D perspective card on hover
- [ ] **card-spotlight** - Card with mouse-following spotlight
- [ ] **glare-card** - Card with glare effect
- [ ] **flip-card** - Card that flips on hover
- [ ] **bento-grid** - Bento-style grid layout
- [ ] **compare** - Before/after image comparison slider
- [ ] **container-scroll** - Scroll-animated container
- [ ] **container-text-flip** - Text flip container
- [ ] **focus** - Focus-style card container
- [ ] **text-reveal-card** - Card with text reveal on hover
- [ ] **liquid-glass** - Glassmorphism card effect
- [ ] **book** - 3D book component

### 8.3 Text & Typography (18 components)

- [ ] **colourful-text** - Multi-colored text
- [ ] **flip-words** - Animated word flipper
- [ ] **hyper-text** - Hypertext scramble effect
- [ ] **letter-pullup** - Letters animate up on scroll
- [ ] **morphing-text** - Text morphing animation
- [ ] **radiant-text** - Glowing radiant text
- [ ] **sparkles-text** - Text with sparkle effects
- [ ] **spinning-text** - Circular spinning text
- [ ] **text-3d** - 3D extruded text
- [ ] **text-generate-effect** - Typewriter text generation
- [ ] **text-glitch** - Glitchy text effect
- [ ] **text-highlight** - Animated text highlight
- [ ] **text-hover-effect** - Text with hover animations
- [ ] **text-reveal** - Text reveal on scroll
- [ ] **text-scroll-reveal** - Scroll-triggered text reveal
- [ ] **line-shadow-text** - Text with line shadow
- [ ] **video-text** - Video masked text
- [ ] **blur-reveal** - Blur-to-reveal text

### 8.4 Backgrounds (18 components)

- [ ] **aurora-background** - Aurora borealis effect
- [ ] **bg-black-hole** - Black hole animation
- [ ] **bg-bubbles** - Floating bubbles
- [ ] **bg-falling-stars** - Falling stars animation
- [ ] **bg-neural** - Neural network visualization
- [ ] **bg-particle-whirlpool** - Particle whirlpool
- [ ] **bg-silk** - Silk fabric animation
- [ ] **bg-stars** - Starfield background
- [ ] **bg-stractium** - Abstract stratum effect
- [ ] **flickering-grid** - Flickering dot grid
- [ ] **particles-bg** - Particle system background
- [ ] **pattern-background** - Pattern/texture backgrounds
- [ ] **snowfall-bg** - Snowfall animation
- [ ] **wavy-background** - Wavy animated background
- [ ] **warp-background** - Warp speed effect
- [ ] **liquid-background** - Liquid/fluid background
- [ ] **cosmic-portal** - Cosmic portal effect
- [ ] **vortex** - Vortex swirl animation

### 8.5 Effects & Animations (20 components)

- [ ] **animated-beam** - SVG animated beam lines
- [x] **border-beam** - Animated border beam
- [ ] **glow-border** - Glowing border effect
- [ ] **glowing-effect** - General glow effect
- [ ] **meteors** - Meteor shower effect
- [ ] **sparkles** - Sparkle particle effect
- [ ] **confetti** - Confetti celebration
- [ ] **ripple** - Ripple wave effect
- [ ] **tracing-beam** - Scroll-tracing beam
- [ ] **lamp-effect** - Lamp lighting effect
- [ ] **lens** - Magnifying lens effect
- [ ] **box-reveal** - Box reveal animation
- [ ] **light-speed** - Light speed effect
- [ ] **orbit** - Orbiting elements
- [ ] **scratch-to-reveal** - Scratch card reveal
- [ ] **svg-mask** - SVG masking effects
- [ ] **animate-grid** - Animated grid
- [ ] **infinite-grid** - Infinite scrolling grid
- [ ] **interactive-grid-pattern** - Interactive grid
- [ ] **shader-toy** - Shader effects

### 8.6 Navigation & Layout (8 components)

- [ ] **dock** - macOS-style dock
- [ ] **morphing-tabs** - Morphing tab navigation
- [ ] **timeline** - Vertical timeline
- [ ] **scroll-island** - Scroll-aware floating island
- [ ] **marquee** - Infinite scrolling marquee
- [ ] **logo-cloud** - Logo carousel/cloud
- [ ] **logo-origami** - Origami-style logo reveal
- [ ] **halo-search** - Spotlight search UI

### 8.7 Data Display (12 components)

- [ ] **animated-circular-progressbar** - Circular progress
- [ ] **animated-list** - Animated list items
- [ ] **animated-testimonials** - Testimonial carousel
- [ ] **testimonial-slider** - Testimonial slider
- [ ] **file-tree** - File tree component
- [ ] **icon-cloud** - 3D icon cloud
- [ ] **number-ticker** - Animated number counter
- [ ] **balance-slider** - Balance/comparison slider
- [ ] **expandable-gallery** - Expandable image gallery
- [ ] **bending-gallery** - Bending gallery effect
- [ ] **photo-gallery** - Photo gallery grid
- [ ] **spring-calendar** - Spring-animated calendar

### 8.8 3D & WebGL (8 components)

- [ ] **globe** - 3D globe visualization
- [ ] **github-globe** - GitHub-style contribution globe
- [ ] **world-map** - Interactive world map
- [ ] **spline** - Spline 3D integration
- [ ] **particle-image** - Particle-based image
- [ ] **tetris** - Tetris game component
- [ ] **carousel-3d** - 3D carousel
- [ ] **apple-card-carousel** - Apple-style 3D carousel

### 8.9 Cursors & Interactions (6 components)

- [ ] **animated-tooltip** - Animated tooltip
- [ ] **direction-aware-hover** - Direction-aware hover effect
- [ ] **fluid-cursor** - Fluid cursor effect
- [ ] **smooth-cursor** - Smooth cursor follower
- [ ] **sleek-line-cursor** - Line cursor effect
- [ ] **tailed-cursor** - Cursor with tail
- [ ] **image-trail-cursor** - Image trail on cursor move

### 8.10 Media & Mockups (5 components)

- [ ] **iphone-mockup** - iPhone device mockup
- [ ] **safari-mockup** - Safari browser mockup
- [ ] **images-slider** - Image slider/carousel
- [ ] **link-preview** - Link preview card
- [ ] **liquid-logo** - Liquid morphing logo

### 8.11 Forms & Inputs (4 components)

- [ ] **input** - Styled input component
- [ ] **vanishing-input** - Input with vanishing placeholder
- [ ] **color-picker** - Color picker component
- [ ] **file-upload** - File upload component
- [ ] **multi-step-loader** - Multi-step loading indicator

---

## Dependency Graph

```
Phase 1.1 ──┬──► Phase 2.1 ──┬──► Phase 2.3
            │                │
            │                └──► Phase 4.1 ──► Phase 4.2
            │
            └──► Phase 2.2 ──┬──► Phase 3.1 ──► Phase 3.2 ──► Phase 3.3
                             │
                             └──► Phase 6.1

Phase 1.2 ─────────────────────► Phase 3.1

Phase 1.3 ─────────────────────► Phase 3.1

Phase 2.1 ─────────────────────► Phase 5.1 ──► Phase 5.2 ──► Phase 7.1

Phase 5 ───────────────────────► Phase 7.1 ──► Phase 7.2

Phase 3.2 ─────────────────────► Phase 6.1 ──► Phase 6.2
```

---

## Priority Matrix

| Priority | Phases | Rationale |
|----------|--------|-----------|
| **P0** | 1.1, 1.2 | Unlocks component development |
| **P1** | 2.1, 2.2 | Establishes scalable patterns |
| **P1** | 3.1, 3.2 | Enables visual validation |
| **P2** | 1.3, 2.3 | Supports complex components |
| **P2** | 5.1 | Code quality gates |
| **P2** | 8.1-8.5 | Core component porting |
| **P3** | 3.3, 4.1, 4.2 | Polish and distribution |
| **P3** | 5.2, 5.3 | Testing infrastructure |
| **P3** | 8.6-8.11 | Advanced component porting |
| **P4** | 6.1, 6.2 | Documentation |
| **P4** | 7.1, 7.2 | Automation |

---

## Quick Start

Complete these 4 tasks first to unblock component porting:

1. [x] **Phase 1.1** - Centralize exports
2. [x] **Phase 1.2** - Add Card, Badge, Tabs
3. [x] **Phase 2.1** - Component template
4. [ ] **Phase 3.1** - Demo layout with theme toggle

After these tasks, the project is ready for **Phase 8: Component Porting** (119 components).

### Porting Priority Order

#### Priority 0: Portfolio Components (actively used)

These components are used in the portfolio project and should be ported first:

| Component | Category | Status |
|-----------|----------|--------|
| rainbow-button | Buttons | Done |
| animated-tooltip | Cursors & Interactions | Done |
| blur-reveal | Text | Pending |
| bg-falling-stars | Backgrounds | Pending |
| fluid-cursor | Cursors & Interactions | Pending |
| image-trail-cursor | Cursors & Interactions | Pending |
| interactive-grid-pattern | Effects | Pending |
| marquee | Navigation & Layout | Pending |
| timeline | Navigation & Layout | Pending |
| animated-logo-cloud | Data Display | Pending |

#### General Priority Order

1. **Buttons** (8.1) - Simple, high-impact, validates workflow
2. **Effects** (8.5) - Core visual effects used by other components
3. **Text** (8.3) - Common text animations
4. **Cards** (8.2) - Container components
5. **Backgrounds** (8.4) - Decorative backgrounds
6. **Rest** (8.6-8.11) - Based on demand
