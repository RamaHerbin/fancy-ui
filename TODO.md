# Inspira Svelte - Project Foundation TODO

> A roadmap to build a scalable, idiomatic SvelteKit foundation for porting 100+ InspiraUI components.

---

## Phase 1: Core Infrastructure

> **Dependencies**: None (start here)

### 1.1 Centralize Library Exports

- [x] **Update `src/lib/index.ts` to export utilities and types**
  - **Where**: `src/lib/index.ts`
  - **What**: Re-export `cn`, utility types, and inspira components
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
  - **Why**: Essential for demo page layouts and many InspiraUI compositions

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
  - **Why**: Many InspiraUI components use gradient effects

- [x] **Create theme context store**
  - **Where**: `src/lib/stores/theme.ts`
  - **What**: Svelte store for theme state (dark/light), reduced-motion preference
  - **Why**: Enables runtime theme switching and respects user preferences

---

## Phase 2: Component Architecture

> **Dependencies**: Phase 1.1

### 2.1 Establish Component Template

- [x] **Create component folder template**
  - **Where**: `src/lib/inspira/_template/`
  - **What**: Create skeleton files: `Component.svelte`, `types.ts`, `index.ts`, `README.md`
  - **Why**: Ensures consistent structure for all 100+ component ports

- [x] **Document component template usage**
  - **Where**: `src/lib/inspira/_template/README.md`
  - **What**: Step-by-step guide for using template when porting
  - **Why**: Reduces friction and errors when contributors port components

### 2.2 Component Classification System

- [ ] **Create component registry**
  - **Where**: `src/lib/inspira/registry.ts`
  - **What**: TypeScript object mapping component names to metadata (category, status, dependencies)
  - **Why**: Enables programmatic component listing and filtering in demos

- [ ] **Define component categories**
  - **Where**: `src/lib/inspira/registry.ts`
  - **What**: Categories: `buttons`, `cards`, `backgrounds`, `text`, `layout`, `feedback`, `data-display`
  - **Why**: Organizes 100+ components into navigable groups

### 2.3 Shared Utilities

> **Dependencies**: 2.1

- [ ] **Create animation utilities**
  - **Where**: `src/lib/utils/animation.ts`
  - **What**: Helpers for spring configs, easing functions, duration calculations
  - **Why**: Many InspiraUI components share animation patterns

- [ ] **Create geometry utilities**
  - **Where**: `src/lib/utils/geometry.ts`
  - **What**: Helpers for mouse position, angle calculation, distance
  - **Why**: Required for hover effects, spotlights, direction-aware components

- [ ] **Create color utilities**
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
  - **Where**: `src/lib/inspira/_template/a11y-checklist.md`
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
  - **Where**: `src/lib/inspira/_template/README.md`
  - **What**: Template covering: description, props, usage, porting notes, known issues
  - **Why**: Standardizes documentation across all components

- [ ] **Document RainbowButton as reference**
  - **Where**: `src/lib/inspira/rainbow-button/README.md`
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
| **P3** | 3.3, 4.1, 4.2 | Polish and distribution |
| **P3** | 5.2, 5.3 | Testing infrastructure |
| **P4** | 6.1, 6.2 | Documentation |
| **P4** | 7.1, 7.2 | Automation |

---

## Quick Start

Complete these 4 tasks first to unblock component porting:

1. [ ] **Phase 1.1** - Centralize exports (~30 min)
2. [ ] **Phase 1.2** - Add Card, Badge, Tabs (~15 min)
3. [ ] **Phase 2.1** - Component template (~45 min)
4. [ ] **Phase 3.1** - Demo layout with theme toggle (~1 hr)

After these tasks, the project is ready for scaling to 100+ components.
