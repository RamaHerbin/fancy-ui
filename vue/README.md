<p align="center">
  <img src="https://raw.githubusercontent.com/RamaHerbin/fancy-ui/main/.github/logo.png" alt="FancyUI" width="88" height="88" />
</p>

# fancy-ui-vue

Animated UI components for **Vue 3.5+**, styled with Tailwind CSS v4 &mdash; the Vue edition of [fancy-ui](https://github.com/RamaHerbin/fancy-ui#readme), ported component for component from the Svelte 5 reference and kept at parity by CI.

[![npm fancy-ui-vue](https://img.shields.io/npm/v/fancy-ui-vue?label=fancy-ui-vue&color=42B883)](https://www.npmjs.com/package/fancy-ui-vue)
![Vue](https://img.shields.io/badge/Vue-3.5+-42B883?logo=vuedotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Components](https://img.shields.io/badge/Components-151-8B5CF6)
![MIT License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <a href="https://www.anthropic.com/claude-code">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/RamaHerbin/fancy-ui/main/.github/claude-for-open-source-program-dark.svg">
      <img src="https://raw.githubusercontent.com/RamaHerbin/fancy-ui/main/.github/claude-for-open-source-program.svg" alt="Claude for Open Source Program" width="280">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://fancy-ui.rama.app">
    <img src="https://raw.githubusercontent.com/RamaHerbin/fancy-ui/main/.github/fancyui-reel.webp" alt="fancy-ui in motion: an HDR fluid cursor painting over the title, fireworks launched from a gradient button, a datamosh page transition, a before/after slider split by a blade of light and a rainbow-beam button" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://fancy-ui.rama.app"><strong>Live Demo &amp; Docs</strong></a>
  &nbsp;·&nbsp;
  <a href="https://fancy-ui.rama.app/docs/components">Browse components</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/RamaHerbin/fancy-ui#readme">Svelte package</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/RamaHerbin/fancy-ui/tree/main/react#readme">React package</a>
</p>

## Features

- **151 components** &mdash; core primitives (forms, navigation, overlays) alongside buttons, text animations, backgrounds, cursors, AI/chat building blocks and a micro-interactions collection
- **Motion that feels physical** &mdash; beams of light, liquid-metal and neon borders, a physical flip card, a before/after slider with a motion trail, a datamosh page transition; springs and WebGL where they earn their keep
- **Idiomatic Vue 3.5** &mdash; `<script setup>` single-file components, reactive props destructuring, `defineModel` for every bindable (`v-model:<name>`), snippets as named and scoped slots, `defineExpose` wherever the Svelte source exposes a `ref`; every other prop keeps its Svelte name
- **Same components, three frameworks** &mdash; All 151 components of `fancy-ui-svelte` are ported, under the same names and with the same visual contract; the [Svelte package](https://github.com/RamaHerbin/fancy-ui#readme) is the reference, [`fancy-ui-react`](https://github.com/RamaHerbin/fancy-ui/tree/main/react#readme) the React edition, and parity is checked in CI
- **Tailwind CSS v4** &mdash; one CSS import, semantic colour tokens, light and dark themes that follow the OS or a `.dark` class
- **Accessible and SSR-safe** &mdash; keyboard support where it applies, `prefers-reduced-motion` respected, a `seed` prop wherever the source randomises in render so server and client agree, clean hydration under Nuxt, canvas and WebGL work deferred to mount
- **Opt-in sound** &mdash; eleven synthesised interface cues, a `SoundToggle` switch and the `useSound` / `useSoundFeedback` composables; silent until the user turns it on
- **AI-ready docs** &mdash; `llms.txt` with a Vue section, a Markdown page per component and a JSON registry, so coding agents use the library correctly
- **Tested** &mdash; 5,600+ unit tests with Vitest and Vue Test Utils, a Vue 3.5 floor job and a Nuxt consumer app generated in CI

## Quick Start

**Install via npm:**

```bash
npm install fancy-ui-vue
```

Peer dependencies: `vue` 3.5.2 or later, `tailwindcss` 4. TypeScript is an optional peer at 5.0 or later.

Add the Tailwind integration and the stylesheet to your app's CSS (e.g. `app.css`):

```css
@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css";
@import "fancy-ui-vue/styles.css";
```

`tailwind.css` tells Tailwind v4 to scan the library's components so all utility classes are generated automatically, and declares the colour tokens the components use; `styles.css` carries the components' own keyframes and scoped rules. No manual `@source` path needed.

Then import any component:

```vue
<script setup lang="ts">
import { RainbowButton, BorderBeam } from "fancy-ui-vue";
</script>

<template>
	<div class="relative overflow-hidden rounded-xl border p-8">
		<RainbowButton>Get started</RainbowButton>
		<BorderBeam />
	</div>
</template>
```

Props keep their Svelte names; snippets become named slots and every bindable prop is a `v-model:<name>`. Every deliberate difference is listed under [Divergences](#divergences-from-the-svelte-api).

Importing one component from the package root costs the same as importing its own file: the rest tree-shakes away, so there are no per-component subpaths. The four entry points are listed under [Package shape](#package-shape).

**Or browse and copy a component:**

1. Find the component you need in the [live demo](https://fancy-ui.rama.app)
2. Copy the source from `vue/src/components/<slug>/` (plus whatever it imports from `vue/src/internals/`, `vue/src/sound/` and `vue/src/utils.ts`)
3. Paste into your project

**Or clone the full demo locally:**

```bash
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui
pnpm install
pnpm --filter fancy-ui-vue build
pnpm --filter fancy-ui-vue-example-nuxt dev   # http://localhost:3000
```

## Copy the source into your project

The npm package stays the canonical way to use these components. If you would rather own the code, every component is also published as a registry item by the docs site, and the ecosystem CLI installs it by URL:

```bash
npx shadcn-vue@latest add https://fancy-ui.rama.app/r/vue/rainbow-button.json
```

The index of all items is at <https://fancy-ui.rama.app/r/vue/registry.json>. The CLI writes the component folder and the shared modules it needs under a `fancy/` folder inside your project's `ui` alias (`components/ui` by default), keeping the package's own tree one level deeper so the relative imports stay untouched:

```
components/ui/fancy/utils.ts
components/ui/fancy/internals/…
components/ui/fancy/sound/…
components/ui/fancy/components/<slug>/…
```

Five shared items are pulled in automatically as needed: `utils`, `internals`, `internals-dom`, `internals-motion` and `sound`. Import from the copied folder:

```ts
import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";
```

The components carry their own styles (the `<style>` blocks of the single-file components, plus the CSS files the shared modules import), so the `fancy-ui-vue` imports from [Quick Start](#quick-start) are not needed; the components still expect the semantic colour tokens listed under [Setup](#setup), which a project set up by the same CLI already defines. Dark mode: the components' `light-dark()` colours follow `color-scheme`, which that setup does not declare, so add `:root { color-scheme: light dark } .dark { color-scheme: dark }` to your CSS for them to switch with the `dark` class. In Nuxt, keep the copied tree out of component auto-import: `components: { dirs: [{ path: "~/components", ignore: ["ui/fancy/**"] }] }`.

## Setup

### Tailwind and colour tokens

```css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css"; /* lets Tailwind scan the shipped sources */
@import "fancy-ui-vue/styles.css"; /* keyframes + component-scoped CSS */
```

Those two imports are the whole setup. `tailwind.css` also declares every semantic colour the components spend, the standard 18-token semantic set shared by the Tailwind component ecosystem: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`. None of them exist in Tailwind's default palette, and Tailwind v4 emits no rule at all for an undeclared colour name, so without them `bg-primary` and friends compile to nothing. They are wired with `@theme inline`, so the utilities resolve the variables at use time: an app that already defines that token set keeps its own colours automatically. The defaults ship in `@layer base`, which an unlayered `:root` in your app overrides whatever the import order.

### Dark mode

Out of the box the package follows the operating-system preference: `dark:` utilities and the components' `light-dark()` colours both switch with `prefers-color-scheme`, so an app that never touches dark mode already looks right on a dark desktop. To control it yourself, put `dark` or `light` on `<html>` (or on any ancestor of the subtree you want to force) and both halves follow the class instead:

```html
<html class="dark">
```

`tailwind.css` is what makes that work, in three parts: it declares the `.dark` token block, it declares a `dark` variant that matches a `.dark` ancestor OR the media query (unless a `.light` ancestor opts out), and it sets `color-scheme: light dark` on `:root` with `.dark` / `.light` overrides so the components' `light-dark()` colours &mdash; and the browser's own form controls, scrollbars and caret &mdash; resolve the same way. An app that declares its own `@custom-variant dark` after the import keeps its own definition.

### Server rendering

The package is written for SSR: the `examples/nuxt-app` consumer in this repo is generated in CI with `failOnError` on, so a component that breaks server rendering or hydration fails the build. Three rules follow from that and are worth knowing:

- Nothing portalled is emitted on the server. Dialogs, sheets, drawers, popovers, tooltips, menus, pickers and the toaster render their trigger only; the panel paints on the first post-hydration patch, whether it starts closed or open by default. `toast()` is a no-op outside the browser.
- Render-path randomness is seeded. Components that scatter stars, shuffle colours or scramble characters take a `seed` prop (default `1`), so the server and the client draw the same picture; vary `seed` to desynchronise two instances.
- Browser-only state lands after mount. Sound preferences hydrate in `onMounted`, relative timestamps and reduced-motion queries start one tick after mount, and generated ids come from Vue's `useId()` so they match across the server render and its hydration.

The details, component by component, are under [Divergences](#divergences-from-the-svelte-api).

### Package shape

Three things about the package's shape, because each of them is a decision rather than an oversight:

- **ESM only.** There is no `require` condition and no CJS build. A TypeScript project on `moduleResolution: node16` that emits CommonJS gets TS1479 on the bare import; the fix is on that side (`"module": "esnext"`, or a dynamic `import()`), not here.
- **Four entry points, no deep imports.** `fancy-ui-vue`, `fancy-ui-vue/cameleon`, `fancy-ui-vue/styles.css` and `fancy-ui-vue/tailwind.css`, plus `fancy-ui-vue/package.json` for tooling that resolves a manifest by specifier. Everything else is blocked by the exports map on purpose: the build keeps one module per source file, so importing one component from the package root tree-shakes the rest away, and the alternative would freeze `dist/`'s internal folder layout as public API.
- **0.x, so minors can break.** Until 1.0 a minor version may change a component's API; patches never do. Every deliberate difference from the Svelte package is listed under [Divergences](#divergences-from-the-svelte-api).

### Compatibility

- **Vue 3.5.2 or later.** 3.5 is the floor, not just the minimum peer range: the port relies on reactive props destructuring, `useTemplateRef`, `onWatcherCleanup` and `<Teleport defer>`. A CI job re-installs the workspace with Vue pinned to 3.5.2 and runs `check`, `test`, `build` and a consumer script against it.
- **TypeScript 5.0+.** Below it, the package's own declarations fail to parse and everything from it reads as `any`.
- **Tailwind CSS 4.** `tailwind.css` uses v4 at-rules (`@source`, `@theme inline`, `@custom-variant`) and has no v3 equivalent.
- **The cameleon subpath is barrel-only.** `fancy-ui-vue/cameleon` ships the skin engine, the primitives and the five skins. There is no `./cameleon/*` wildcard for a single skin, and the retro-OS component kit that the Svelte package publishes as `fancy-ui-svelte/cameleon/retro-kit` has no Vue counterpart.

## Using with AI agents (Claude Code, Cursor, Copilot)

The docs site serves documentation built for coding agents, following the [llms.txt](https://llmstxt.org) convention:

- [fancy-ui.rama.app/llms.txt](https://fancy-ui.rama.app/llms.txt) &mdash; setup guide, usage rules, a Vue section and an index of every component
- [fancy-ui.rama.app/llms-full.txt](https://fancy-ui.rama.app/llms-full.txt) &mdash; full reference: import, props and a working example per component
- `https://fancy-ui.rama.app/docs/components/vue/<slug>.md` &mdash; one component as Markdown, written for Vue: the names the Vue port takes (models, listeners, slots), its props and its Vue example when there is one (e.g. [vue/compare.md](https://fancy-ui.rama.app/docs/components/vue/compare.md)); each docs page also has a **Copy as Markdown** button
- [fancy-ui.rama.app/registry.json](https://fancy-ui.rama.app/registry.json) &mdash; every component as JSON: for each framework (Svelte, React, Vue) the import names, Markdown page, copy-source item and availability, plus props, snippets and links

To make your coding agent use fancy-ui correctly, add this to your project's `CLAUDE.md`, `AGENTS.md`, or `.cursorrules`:

```markdown
## UI components

Use fancy-ui-vue (Vue 3.5 + Tailwind CSS v4) for animated UI components.
Setup and rules: https://fancy-ui.rama.app/llms.txt (see the Vue section)
One component (props + examples): https://fancy-ui.rama.app/docs/components/<slug>.md
Key rules: import "fancy-ui-vue/styles.css" once; bindables are `v-model:<name>`
(no bare `v-model`); snippets are slots; overlay/effect components (BorderBeam,
GlowBorder, backgrounds, ...) need a parent with `relative overflow-hidden`;
cursor effects (FluidCursor, SmoothCursor) mount once in the root layout.
```

## Development

Workspace member of the repo's pnpm workspace &mdash; one `pnpm install` at the repo root covers it.

```bash
pnpm install                                   # at the repo root
pnpm --filter fancy-ui-vue test                # vitest + vue test utils
pnpm --filter fancy-ui-vue check               # vue-tsc --noEmit
pnpm --filter fancy-ui-vue check:matrix        # migration matrix held to the Svelte reference
pnpm --filter fancy-ui-vue build               # vite lib build + d.ts via vue-tsc, then the dist gates
pnpm --filter fancy-ui-vue test:scripts        # the gates' own regression tests (needs a build)
pnpm --filter fancy-ui-vue-example-nuxt dev    # the consumer app (examples/nuxt-app) on http://localhost:3000
pnpm check:props                               # at the repo root: every Svelte prop has a React and a Vue counterpart (CI gate)
pnpm check:cores                               # at the repo root: shared framework-free engines are byte-identical in the three packages (CI gate)
```

The consumer app under `examples/` is `nuxt-app`, which resolves `fancy-ui-vue` to `vue/dist`, so run `build` first. CI runs `nuxt generate` on it as the SSR/hydration gate: `failOnError` in its prerender block is what makes a broken page fail the build instead of being skipped. A second CI job, `vue-3-5`, re-installs the workspace with a job-local override pinning Vue to 3.5.2 (the peer floor) and runs `check`, `test`, `build` and `scripts/vue-floor-consumer.mjs` against it.

`build` does more than build. After Vite and `vue-tsc` it runs six scripts in `vue/scripts/`, each guarding something no other gate can see:

| Script                      | What it stops                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strip-dts-css-imports.mjs` | `vue-tsc` copies each component's `import "./x.css"` into its `.d.ts`, naming a file dist does not ship &mdash; one TS2307 per component for any consumer without `skipLibCheck` |
| `check-dist-names.mjs`      | a minified build shipping `AnimatedBeam` as `const ut = ...` in every consumer's devtools tree and stack traces                                                            |
| `prune-orphan-dts.mjs`      | a declaration under `dist/internals/` with no runtime module behind it, typing an import that cannot load                                                                  |
| `check-dist-shape.mjs`      | a test rig reaching the tarball, a declaration pointing at a file that is not there, an SFC without `<script setup>`, a bare import of a package nobody declared           |
| `smoke-dist.mjs`            | the built artifact never being executed: it imports every module with no DOM, server-renders each component export, and holds a gzip budget over the emitted JS and CSS    |
| `ensure-styles-css.mjs`     | the `./styles.css` subpath being declared while no stylesheet was emitted                                                                                                  |

`test:scripts` runs `dist-gates.test.mjs`, which tests the gates' own logic (what counts as a component, what the sweep counts) so a gate cannot go quiet without a test noticing. `check-matrix.mjs` (`check:matrix`) holds the migration matrix to the Svelte reference, and `vue-floor-consumer.mjs` is the CI-only floor check above; neither is part of `build`.

The output is **not minified**, for the reason `check-dist-names.mjs` exists: the consumer's bundler minifies over the whole app, and minifying here costs every component its name.

## Project Structure

```
vue/
├── src/
│   ├── components/        # UI components (one folder per component, same slugs as the Svelte source)
│   │   └── rainbow-button/
│   │       ├── RainbowButton.vue      # <script setup> + <style scoped>
│   │       ├── RainbowButton.test.ts
│   │       └── index.ts
│   ├── internals/         # Shared framework-free engines and Vue composables
│   ├── sound/             # Sound engine, themes, SoundToggle and the composables
│   ├── cameleon/          # Skin engine: FancyProvider, primitives, skins (fancy-ui-vue/cameleon)
│   ├── utils.ts           # cn()
│   └── index.ts           # Barrel exports
├── scripts/               # Dist gates and their tests, migration matrix check, Vue floor consumer
├── tailwind.css           # Tailwind v4 integration shipped to consumers
├── PORTING.md             # The law every port follows
├── internals-api.md       # Contract of the shared internals
└── migration-matrix.json  # Per-component parity record against the Svelte reference

examples/nuxt-app          # Nuxt consumer generated in CI (SSR/hydration gate)
```

Component tests are colocated with their component; there is no separate unit-test directory. The Svelte reference for every component lives at `src/lib/fancy-ui/<slug>/` at the repo root.

## Contributing

Contributions are welcome. A component exists in this package because it exists in the Svelte reference, so the flow starts there:

1. Implement or change the component in `src/lib/fancy-ui/<slug>/` (Svelte 5), with its tests
2. Port it to `vue/src/components/<slug>/` following [`PORTING.md`](./PORTING.md) &mdash; folder shape, rune→composable mapping, the styling rules that break silently, and the hard rules; the Svelte source is always the reference
3. Record any deliberate difference under [Divergences](#divergences-from-the-svelte-api) and update `migration-matrix.json`
4. Run the package gates (`check`, `test`, `build`, `check:matrix`, `test:scripts`) and the repo gates (`pnpm check:props`, `pnpm check:cores`) &mdash; CI fails on a missing port or a missing prop
5. Add a changeset (`pnpm changeset`)

The full walkthrough is in [CONTRIBUTING.md](https://github.com/RamaHerbin/fancy-ui/blob/main/CONTRIBUTING.md).

## Divergences from the Svelte API

Everything not listed here is a faithful transpose of the Svelte reference.
The first list states each package-level rule once, with the components and
names it touches; the second holds only what is specific to one component.
Components are named by their exported Vue name.

### Package-level rules

- **props**: `<Name>Props` hold the component's own props only, never a `ButtonHTMLAttributes`-style intersection or Svelte's `Omit<HTMLAttributes<…>, …>` fold-in, so native attributes are untyped. Every component sets `inheritAttrs: false` and writes `v-bind="attrs"` only where the Svelte source spreads `{...restProps}`, at the same position, so attributes the component sets after it (`data-state`, `data-position`, `data-panel-side`) still win.
  - These components forward native attributes and listeners (rules in [PORTING.md](https://github.com/RamaHerbin/fancy-ui/blob/main/vue/PORTING.md#native-attributes)): Autocomplete, BentoGrid, BentoGridCard, BentoGridItem, Book, BookDescription, BookHeader, BookTitle, BoxReveal, Button, Checkbox, Combobox, ComposerInput, ComposerModelPicker, ComposerSubmit, ConfettiButton, ContainerTextFlip, CopyButton, DatamoshTransition, DatePicker, DimSiblings, DropdownMenuItem, DropdownMenuSubTrigger, DropdownMenuTrigger, FileUpload, GradientButton, IconButton, InlineCitation, Input, InteractiveHoverButton, LetterPullup, LineHoverLink, Link, Magnetic (outer wrapper), MosaicGlow, NavbarLink, NavigationMenuLink, NavigationMenuTrigger, NeonBorder, NumberInput, PasswordInput, PixelLoader, Popover, Presence, Pressable, PulseBeam, RadioGroup, RadioGroupItem, RainbowButton, Reveal, RippleButton, ScrollProgress, SearchInput, Select, ShimmerButton, Skeleton, Slider, SourcesTrigger, StatusMorph, StickyScroll, Switch, TabsTrigger, TerminalBlock, Textarea, TextRoll, TimePicker, Toggle, ToggleGroupItem, TypingIndicator. Button, CopyButton and IconButton land them on the `<button>` (Button and IconButton on the `<a>` once `href` is set). Capture-phase listeners (`@click.capture`) are stripped while Button or IconButton is disabled or loading; the Svelte and React ports do not guard capture-phase listeners. Targets: Input, Textarea, PasswordInput, SearchInput and NumberInput → inner `<input>` / `<textarea>`; Link, LineHoverLink, NavbarLink, NavigationMenuLink and InlineCitation → their anchor (InlineCitation's marker is a `<button>` when unlinked), where the managed `aria-current`, `aria-disabled`, `tabindex`, `target`, `rel` and label win while they apply; Book, BookHeader, BookTitle and BookDescription → their own element; the other display components (BoxReveal, BentoGrid, BentoGridItem, BentoGridCard, ContainerTextFlip, LetterPullup, NeonBorder, PixelLoader, TerminalBlock, TypingIndicator) → their root, where managed `role`, `aria-live` and `data-state` win and a consumer `style` merges; Checkbox, Switch, Slider, RadioGroup, RadioGroupItem and FileUpload → their native input or group, where `@change` / `@input` are declared camelCase `onChange` (Slider also `onInput`); Select, Combobox, Autocomplete, DatePicker and TimePicker → trigger or input, with the component's invariants merged after the attributes. Triggers and items: DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSubTrigger, TabsTrigger, NavigationMenuTrigger, SourcesTrigger, Toggle, ToggleGroupItem, Popover (trigger button; `class` and `ref` still target the panel) and ComposerSubmit and ComposerModelPicker → their button, ComposerInput → textarea; they declare camelCase `onClick`, `onKeydown`, `onFocus`, `onMouseenter` and `onMouseleave` (skipped while disabled), and managed `role`, `type`, `aria-expanded`, `aria-controls`, `aria-selected`, `aria-pressed` and roving `tabindex` win. A consumer `style` merges with the component's own custom properties (`mergeProps`) instead of overwriting them the way a later `{...restProps}` would.
  - Every component not listed above is closed, exactly as in Svelte: an `id`, `data-*`, `aria-*` or `@click` put on it is dropped silently (`<Dialog id="x" data-foo="bar">` renders neither), which differs from Vue's default fallthrough.
- **boolean props**: a DOM attribute the component reads is a declared Boolean prop rather than a value read off `$attrs`, so a bare `<RippleButton disabled>` is `true`, not the falsy string `""` that would let the sound cue play: `disabled` on GradientButton, InteractiveHoverButton, RippleButton, ShimmerButton. Vue's Boolean casting applies to every Boolean prop: `<ChatMessageAction active="">` is `true` where Svelte renders `aria-pressed=""` (`active` keeps three states through an explicit `undefined` default), and ReasoningPanel's bare `open` is `true`.
- **class**: `class` is a declared prop typed `HTMLAttributes["class"]` (string, array or object) rather than `string`, merged once by `cn()` at the Svelte call site and argument position and never doubled through `$attrs`. Exceptions: ReviewCard (Marquee) declares no `class`, as in Svelte, so a `class` on it is dropped, and the renderless roots ContextMenu, DropdownMenu and DropdownMenuSub have none; LiquidGlass keeps `containerClass` a `string`; FrostedGlass's `class` still targets the content layer and `containerClass` the outer container.
- **ref**: Svelte's `ref = $bindable(null)` becomes `defineExpose({ ref })` on the same node. `ref` is a reserved vnode key, so it is absent from every `<Name>Props` and there is no `bind:ref` or `v-model:ref`: put a template ref on the component and read `.ref` (`wrapper.vm.ref` in tests).
  - Nodes worth knowing: Button, CopyButton and IconButton expose whichever of `<a>` / `<button>` `href` selected (CopyButton and IconButton forward Button's own `ref`); Popover re-exposes `PopoverContent`'s panel; Select, DatePicker, TimePicker and Tooltip expose the trigger; Checkbox, Combobox, Autocomplete, NumberInput, Slider (`<input type="range">`) and RadioGroupItem the native `<input>`; Textarea the `<textarea>`; Magnetic its static outer wrapper; Toast `.ft-toast` and Toaster `.ft-toaster`; Composer's parts the form, the textarea and the menu div; NavigationMenu, NavigationMenuList, NavigationMenuTrigger and NavigationMenuContent (NavigationMenuItem and NavigationMenuLink expose none, as in Svelte).
  - `null` while nothing renders: Presence and ComposerCommandMenu while closed, Skeleton in standalone mode with `loading=false`.
  - Confetti also exposes `fire()`: `const c = useTemplateRef('c'); c.value.fire()` replaces `bind:this` plus Svelte's `export function fire`.
  - DatamoshTransition also exposes `cover()`, `reveal()` and `play()`: `const t = useTemplateRef('t'); await t.value.cover()` replaces `bind:this` plus Svelte's `export function`s.
- **slots**: snippet props become slots, typed with `defineSlots` and absent from `<Name>Props`. `children` becomes the default slot (required where Svelte's `children: Snippet` is: BoxReveal, DimSiblings, Magnetic, Presence, Pressable, Reveal, ScrollAnchor), every other snippet a slot of the same name, and `{#if x}` guards become `v-if="$slots.x"`, so optional wrappers are still omitted when a slot is absent. A `<slot>` fallback also renders when a SUPPLIED slot renders nothing (ChatError with an empty default slot shows its built-in message), where Svelte's `{#if children}` would render an empty body.
  - Named slots: AlertDialog `#trigger`; ArtifactCard `#actions`; BentoGridItem `#header` `#icon` `#title` `#description`, BentoGridCard `#icon` `#background`; Button `#iconStart` `#iconEnd`; ChatEmptyState and ChatError `#icon`; ChatMessage `#avatar` `#actions` `#footer` (its default slot still replaces the body and makes `content` ignored); ChatPanel `#header` `#composer` `#emptyState`; CommandMenu, ComposerCommandMenu and ThreadList `#empty`; Compare `#firstContent` `#secondContent` `#handle` (an empty `#handle` suppresses the handlebar); Composer `#accessory`; ContainerScroll `#titleContent` `#cardContent`; Dialog `#footer` `#trigger`; Drawer and Sheet `#footer`; DropdownMenuItem and DropdownMenuSubTrigger `#icon`; Markdown `#trailingCursor` (StreamingText fills it while streaming); Navbar `#brand` `#actions`; Pagination `#previousLabel` `#nextLabel`; Popover `#trigger`; SidebarItem `#icon`, SidebarFooter `#avatar`; SmoothCursor `#cursor`; SourceCard `#icon`; StatusMorph `#idle`; TerminalBlock `#header`; TextRevealCard `#text` `#revealText`; ThinkingIndicator `#done`; ToolCall `#icon`.
  - Scoped slots, where Svelte's positional `Snippet<[A, B]>` arguments arrive as one named object: AgentPlan `#item="{ step, index }"`; AiDataTable `#cell="{ value, at }"` with `at` = `{ row, key }`; Breadcrumb `#item="{ item, index }"` (still replaces every crumb); CommandMenu `#icon="{ item }"`; HoverCard `#trigger="{ descriptionId }"`; InlineCitation `#preview="{ source }"`; PromptSuggestions `#item="{ suggestion, index }"`; SourcesList `#item="{ source, index }"`; StickyScroll required `#item="{ item, index, active }"` and `#panel="{ item, index }"`; SubagentList `#item="{ agent, index }"`; ThreadList `#item="{ thread, active }"`; Timeline `#content="{ item }"`; ToolCall `#input="{ value }"` and `#output="{ value }"`; ToolTimeline `#item="{ item, index }"`; WebSearch `#item="{ result, index }"`.
  - Svelte's `{:else}` content is the slot fallback: InteractiveHoverButton `text`, RadioGroupItem and ToggleGroupItem `label ?? value`, Pagination `‹ Previous` / `Next ›`.
- **v-model**: each Svelte bindable is a model of the same name, written `v-model:<name>`. There is no `modelValue` alias, so a bare `v-model` binds nothing. Every model is declared by `defineModel`. Most also stay listed, typed, in the exported `<Name>Props`; nine are declared by `defineModel` alone and are absent from it: Checkbox `checked` / `indeterminate`, RadioGroup `value`, StatusMorph `state`, Stepper `current`, Switch `checked`, Tabs `value`, Toggle `pressed`, ToggleGroup `value`. The documented call shapes all still work — two-way, the `onXChange` callback alone, or a plain value plus callback — and the callback fires after the model write, in Svelte's order. `v-model` on native inputs defers to IME composition, as the input element does.
  - `v-model:open`: AlertDialog, CommandMenu, ContextMenu, Dialog, Drawer, DropdownMenu, HoverCard, Popover, ReasoningPanel (tri-state: `undefined` until someone decides), Sheet, Sources, ToolCall.
  - `v-model:value`: Autocomplete, Combobox, Composer, ComposerModelPicker (no default, so an unset value falls back to the first model), DatePicker, Input, NavigationMenu, NumberInput, PasswordInput, RadioGroup, SearchInput, Select, Slider, Tabs, Textarea, TimePicker, ToggleGroup.
  - `v-model:checked`: Checkbox, Switch; `v-model:phase`: DatamoshTransition (output-only, see below); `v-model:indeterminate`: Checkbox; `v-model:state`: ApprovalCard, RecommendationCard, StatusMorph; `v-model:pressed`: Toggle; `v-model:current`: Stepper; `v-model:page`: Pagination; `v-model:files`: FileUpload; `v-model:attachments`: Composer; `v-model:collapsed`: CodeDiff; `v-model:activeIndex`: StickyScroll; `v-model:activeId`: ThreadList; `v-model:active`: VoiceInput; `v-model:query`: CommandMenu.
  - Passing the value AND an `@update:<name>` listener hands ownership to the parent, where Svelte's bindable always writes locally. A listener that never writes the value back leaves Dialog open (`data-state` stays `open` after `onOpenChange(false)`), Pagination unmoved, and ApprovalCard and RecommendationCard pending with live buttons (a one-tick latch still resolves a decision exactly once, even for two clicks in one tick). The rendered state never disagrees with the model, though: after a press the parent declined, Switch and RadioGroup put their native controls back on the model in the next tick (so `aria-checked`, the visible track and the callbacks all describe the model), and VoiceInput's start guard follows the model rather than a latch of its own. A value passed with no listener still drives itself. Exception: NavigationMenu keeps an eager internal mirror of `value`, so it moves even when `update:value` is ignored.
- **callbacks**: callback props stay props, called as `props.onX?.()` rather than emitted, so devtools shows no event pane for them. The compiler still turns a listener spelling into the prop: `@value-change`, `@open-change`, `@files-change`, `@stick-change`, `@toggle`, `@select`, `@enter-end` / `@exit-end` reach `onValueChange`, `onOpenChange`, `onCheckedChange` (Checkbox, Switch), `onCurrentChange` (Stepper), `onQueryChange` (CommandMenu), `onFilesChange` (FileUpload), `onStickChange` (ScrollAnchor), `onToggle` (ToolCall), `onSelect` (PromptSuggestions, called with `(suggestion, index)`) and Presence's `onEnterEnd` / `onExitEnd`. AppleCard's `onExpand` / `onCollapse` are passed as `:on-expand` / `:on-collapse`.
  - `@click` (the camelCase `onClick` prop) is a declared listener on Button, ChatMessageAction, CopyButton (no lowercase alias; it runs right after the copy starts), GradientButton, IconButton (forwarded to Button), InteractiveHoverButton, Link, NavbarLink, RippleButton and SidebarItem, called exactly once per activation and still behind the component's existing guards and press cue. Link, NavbarLink and the other anchor components pass their other native listeners (`@focus`, `@keydown`, …) through to the anchor too. The lowercase `onclick` prop (`:onclick="fn"`) stays as a deprecated alias, called only when `onClick` is absent. A closed component without a declared listener still drops `@click` with the other attributes.
  - Exceptions riding in `$attrs`: ShimmerButton's `onclick` is plain `@click` fallthrough, merged after the press cue in Svelte's order; ShimmerButton's `onpointermove` is likewise plain `@pointermove` fallthrough, merged after the component's own pointer tracking (which writes --mx/--my), as in Svelte; Reveal's `onfocusin` is a caller's `@focusin`, fired after the component's own handler.
- **context keys**: exported context keys are Vue injection keys, not bare `unique symbol`s for `setContext` / `getContext`; the context value shapes are unchanged.
  - Helper objects built by `createInternalContext` (`.key`, `.provide()`, `.useRequired()`, `.useOptional()`): `BUTTON_GROUP_CONTEXT` (Svelte's bare `BUTTON_GROUP_CONTEXT_KEY` symbol has no Vue export under that name), `CONTEXT_MENU_KEY` with the re-exported `MENU_KEY` / `SUB_KEY`, `NAVIGATION_MENU_KEY` / `NAVIGATION_MENU_ITEM_KEY`, `STEPPER_KEY`, `TABS_KEY`, `TOGGLE_GROUP_KEY`. A hand-written leaf calls `MENU_KEY.useRequired()` instead of `getContext(MENU_KEY)`.
  - Plain `InjectionKey` symbols, read with `inject(KEY, undefined)`: `AUTOCOMPLETE_KEY`, `COMBOBOX_KEY`, `POPOVER_KEY`, `RADIO_GROUP_KEY`, `SIDEBAR_KEY`, `SOURCES_CONTEXT_KEY`.
  - Outside its provider, a required part throws a NAMED error instead of reading `undefined`: the Autocomplete panel, `PopoverContent` (used standalone it now throws rather than rendering an unanchored panel), NavigationMenuList / Trigger / Content and the menu leaves. Optional parts degrade instead: Sidebar parts (`collapsed: false`), Sources parts, RadioGroupItem, and — where Svelte throws a TypeError — CardItem outside a `CardContainer` (Svelte calls the `card3d:mouseEntered` getter unguarded; Vue renders the rest transform, `translateX(0px) … rotateZ(0deg)`) and Dock's icons and separators (a frozen `magnify: false`, `orientation: "horizontal"` fallback: a lone icon renders at its resting 40px).
- **surfaces**: there is no `markSurfaceState`. `data-state` is an ordinary binding of the presence clock's two values, `"open"` / `"closing"` (never `"opening"`), and `inert` during an exit is written by the presence clock as an ATTRIBUTE (`toggleAttribute`), not the IDL property: `:not([inert])` selectors and assistive tech see it everywhere, but under jsdom assert `hasAttribute("inert")`, not `el.inert`. AlertDialog, Autocomplete, CommandMenu, ContextMenu, DatePicker, Dialog, Drawer, DropdownMenu, HoverCard, NavigationMenu, Popover, Toast; AnimatedTooltip and DirectionAwareHover run their exits on the same clock instead of a Svelte transition such as `transition:scale` (same timing and easing; the tooltip node appears one extra pre-paint render pass after the hover); Presence with `inert={false}` never writes the attribute at all. Collapsed regions carry a present-or-absent `inert` attribute: ReasoningPanel's trace, SourcesList (`<ul inert>`, never `inert="false"`), CodeDiff's body.
  - Autocomplete, Combobox and Popover render their panel part unconditionally and let it own the mount gate, where Svelte writes `{#if open}` one level up. A closed surface still emits nothing, on the server included (Combobox leaves a pair of empty fragment comments).
- **portal**: `<Portal>` (a `<Teleport>`) sits INSIDE the presence-mounted gate, the inverse of the React package's ordering: a closed surface emits nothing server-side, and the teleport attaches its children during the patch that creates them, so a focus trap never focuses a detached node (CommandMenu, Combobox, NavigationMenu and every portalled surface).
  - Nothing portalled is emitted on the server, open OR closed: `<Portal>` renders nothing on the server and on the hydration pass and portals synchronously on any later mount, so every portalled surface (Dialog, AlertDialog, Sheet, Drawer, Popover, Tooltip, HoverCard, Toaster, the menus and pickers) behaves the same whether it starts closed or open by default — server HTML holds the trigger only, the panel paints on the first post-hydration patch, and hydration is clean. The same contract as the React package; Svelte emits an open surface inline and relocates it on mount. `toast()` stays a no-op outside the browser.
  - Always-mounted nodes that Svelte portals from a `use:portal` action render in place and relocate to `document.body` one flush AFTER mount, as a new node rather than the moved original: ContextMenu's `.ft-context-menu-anchor` span (`<Portal :disabled>` flipped in `onMounted`) and StatusMorph's `<div role="status">` live region. Code reading `document.body.querySelector(…)` synchronously after mount must `await nextTick()` first.
- **timing**: DOM-reading watchers run with `flush: 'post'`, and Svelte's mount-time `$effect` becomes `onMounted` (an `immediate` watcher would run during server setup), so a few things land one tick after mount — still before paint, but a test must `await nextTick()`:
  - IntersectionObserver attachment: BoxReveal, Reveal, NoiseReveal (`trigger="view"`), StickyScroll rows (`activeIndex` cannot move before the first tick).
  - Roving tab stops: Tabs and ToggleGroup render `tabindex="-1"` on every item on the server and the first client render, then patch in the `0`.
  - Stepper registration: step numbers, `data-status`, `aria-current` and connectors repaint on the next tick; the `<li>` count is right immediately.
  - Auto-open: ReasoningPanel mounted mid-stream, ToolCall mounted with an already-failed call (after hydration when `open` is bound from outside).
  - PromptSuggestions' `$effect.pre` is a `flush: 'pre'` immediate watcher that runs in setup, before the first render (inert by construction).
- **ids**: generated ids come from `useFancyId()` (Vue's `useId()`) instead of `$props.id()` or `Math.random()`, and read `v-0`, `v-1`, …: Dialog and Drawer `v-0-title` / `v-0-description`, Select `v-N-listbox` / `v-N-option-K`, Tabs `v-0-trigger-account` / `v-0-panel-account`, ToolCall `v-0-header` / `v-0-body`, DropdownMenu `v-N-content` / `v-N-trigger`, FormField `v-0-control` (same `<base>-label` / `-description` / `-error` suffixes, and an explicit `id` yields identical ids), plus AnimatedBeam's gradient and filter ids (`beam-v-N`, `beam-v-N-glow` / `beam-v-N-bloom`), ContextMenu, ReasoningPanel headers, Sheet and SidebarGroup headings. They are stable across a server render and its hydration and serve only as `aria-*` targets: nothing may depend on the shape or use it as a CSS selector. Ids minted after mount come from an incrementing client-only counter: FrostedGlass `fg-dist-<n>`, LiquidGlass `lg-1`, `lg-2`, …. RadioGroup's generated `name` has its own bullet below.
- **seeds**: render-path `Math.random()` is replaced by a `seed` prop (default `1`) feeding a mulberry32 stream identical to the React package's, so a server render and its hydration agree. Two instances with no `seed` now look alike; vary `seed` to desynchronise them. ColourfulText (Fisher-Yates over the stream instead of a biased `sort`, so the exact order differs slightly); Compare's `StarField`; HyperText (scramble characters, seeded in setup so the server render emits them); SparklesText (streams `seed` and `seed + 1`; sparkle ids no longer include `Date.now()`); StarsBackground (the ~1600-entry box-shadow sky is in the server HTML, with no first-frame starless flash; the same `seed` + `starColor` names the same sky as React); TextRevealStars `seed` and TextRevealCard `starsSeed` (forwarded; unset inherits 1); No seed where randomness runs only after mount: BgFallingStars, FlickeringGrid.
- **clock**: `createNow` renders an empty sentinel label on the server and through hydration and starts in `onMounted` (a wrong clock value would otherwise survive Vue's production hydration), so relative timestamps appear one tick after mount where the Svelte package paints them immediately: ChatMessage (the `<time>`, and the row holding it when no `#actions` is given), ThreadList, ToolTimeline. `datetime` / `title` carry the exact time from the first render. DatePicker's `viewDate` / `focusedDate` likewise stay `null` until the first open instead of `new Date()` in setup.
- **styles**: `<style scoped>` replaces Svelte's scoping, with four visible consequences.
  - Scoped keyframes are renamed (ArtifactCard's `ft-artifact-sweep` becomes `ft-artifact-sweep-<scope-id>`, likewise AgentPlan and ApprovalCard): the animation is unaffected, but a consumer cannot redefine a keyframe by its source name; the documented custom properties (`--ft-artifact-sweep-duration`, …) are the override surface.
  - Keyframes referenced from an inline style or a custom property ship unscoped under their source names, from a second unscoped `<style>` block (or an all-unscoped one where nothing else needs scoping: ContainerTextFlip, LetterPullup): FlipWords (`flipFadeInWord`, `flipFadeInLetter`, `flipEnterWord`, `flipExitWord`), LineShadowText (`line-shadow`), TextRevealCard (`star-drift`), RainbowButton (`@keyframes rainbow` and `.animate-rainbow` are global, so a consumer's own `rainbow` keyframe or class collides). A parent's scoped selector can also still match a child component's root element.
  - Svelte's `:global(…)` descendants become `:deep(…)`: BlurReveal `:deep(*)`, Reveal `:deep(*:not([data-reveal-skip]))`. Overriding Magnetic's `.ft-magnetic::before` halo from a consumer's `<style scoped>` needs `:deep()`.
  - Inline custom properties are bound as a style object, never a string (a string goes through `cssText`, where jsdom drops custom properties), so the server-rendered attribute has no space after the colon (`style="--rainbow-speed:2s;"`, `--shimmer-color:#ffffff;`, `--blur-reveal-duration:1s;`, `touch-action:none;`). The parsed value is identical and hydration is clean: BlurReveal, BorderBeam, CopyButton, GlareCard, GlowBorder, GradientButton, ImageTrailCursor, LineShadowText, LiquidGlass, RainbowButton, ShimmerButton.
- **transitions**: Svelte `in:` / `out:` directives become `<Transition :css="false">` / `<TransitionGroup :css="false">` driving the shared `runTransition` sampler, with the same curves and durations. `@vue/test-utils` stubs both by default, which silently removes the motion and the `inert` exit window; a test that needs them passes `global: { stubs: { transition: false, 'transition-group': false } }`. Button (spinner ↔ `iconStart` cross-fade), FileUpload rows, FormField messages, SearchInput's clear button, StickyScroll's panel crossfade, Tabs' panel entrance, TextRoll cells, Toast / Toaster.
- **reduced motion**: `prefers-reduced-motion` is read through the shared `useReducedMotion()` composable instead of an inline `window.matchMedia(...)`, with the same query and the same mount-time answer: FireworksHdr, NoiseReveal, SmoothCursor (a genuine change is still routed through `setOptions({ reducedMotion })`). FireworksHdr keeps an unread `change` listener attached for its lifetime.
- **sound cues**: cues go through `useSoundCue`, which always forwards its options argument, so the controller sees `play("select", undefined)` where Svelte calls `play("select")`. Audibly identical; only a spy asserting exact arguments notices: AnimatedTestimonials, ArtifactCard and RainbowButton (`press`), Breadcrumb, Navbar, Pagination, PasswordInput, RecommendationCard (`select` / `close`), WebSearch (`select` / `open` / `close`).
- **markup**: Vue's template whitespace condensing, fragment anchors and dev-build comments change `textContent` and the raw server string, never layout — a test asserting exact text must `.trim()`. Breadcrumb's ellipsis glyph is padded with spaces; Stepper's bullet reads "3not started" where Svelte reads "3 not started"; DatePicker's trigger loses the space before its calendar emoji; BentoGridCard's CTA renders `Learn more →` tight; ToolCall's "Request" label and "Nothing recorded yet." placeholder gain surrounding spaces. Pagination's slot fallbacks carry `<!--[-->…<!--]-->` anchors in the server string, and its "hidden pages" comment and InlineCitation's template comments appear in dev builds. BlurReveal emits `class=""` when given no class; LiquidText omits an empty `font-family` rather than emitting `font-family:;`; Combobox's hidden submission input binds `value` with `.attr`, so a `cloneNode()` of it carries the value too.
- **types**: folder barrels export the `<Name>Props` type (the tooling contract) even where the Svelte `index.ts` exports only the component: `ContainerScrollProps`, `DirectionAwareHoverProps`, `FluidCursorProps` (also as `FluidCursorAdvancedProps` for the deprecated `FluidCursorAdvanced` alias), `LiquidGlassProps`, `MarqueeProps` and `ReviewCardProps`; StatusMorph also exports `StatusMorphState`. `AppleCardProps` is exported from `AppleCard.vue` but, as in Svelte, not from the folder's `index.ts`. `DropdownMenuSubProps` is an empty interface, kept for the contract.
- **fallbacks**: where the Svelte source throws on a missing browser API, the Vue port degrades quietly: BoxReveal reveals immediately with no `IntersectionObserver`; DisplacementText swallows three's `Error creating WebGL context` and leaves the labelled host (`role="img"`, `aria-label`) empty; EditorialEngine settles immediately with no `document.fonts`; FireworksHdr's `debug` is `false` outside a bundler (`import.meta.env?.DEV === true`). Missing providers are under **context keys**.
- **kept source behaviour**: Svelte behaviour is ported as-is, known quirks included, where the React package differs: ApprovalCard's `onApprove` / `onDeny` stay `() => void` (React widened them to `(state) => void`); Compare's `StarField` builds its sky once, ignoring later `starsCount` / `seed` changes; EditorialEngine tracks `pullquotes` by array identity (hoist an inline array to keep it stable); LogoCloud's cloned marquee tracks carry no `aria-hidden`; MatrixRain does not pause off-screen; ContainerTextFlip has no stale-interval guard; AnimatedTestimonials has no reduced-motion handling; FlipWords goes blank if `words` empties mid-exit (`(index + 1) % 0` stores `NaN`, plus a dev-only `[Vue warn]: VNode created with invalid key (NaN)`); Autocomplete and NavigationMenu publish the requested `data-align="start"` while `transform-origin` follows the resolved alignment; `DropdownMenuContent` keeps the source's `nextTick()` wait before moving the panel to its edge.
- **composables**: composables expose no `destroy()`; cleanup runs through `onScopeDispose`. Focus-trap composables return a handle (`returnFocusNow` / `rearm`) instead of imperative action methods. Media-query and similar composables keep an explicit `start` / `stop` pair and accept getter-shaped options, as the Svelte actions do.
- **hydration**: sound preferences hydrate explicitly in `onMounted` (`hydrateSound()`) rather than reading `localStorage` during setup, because Vue's production hydration does not patch an attribute mismatch introduced by an eagerly read client-only preference.
- **vue floor**: Vue 3.5 is the floor, not just the minimum peer range: the port relies on reactive props destructuring, `useTemplateRef`, `onWatcherCleanup` and `<Teleport defer>`.
- **upstream fixes**: a handful of proven bugs surfaced while porting `fancy-ui-react` were fixed on the Svelte source itself, and the Vue port inherits those fixes. The review of the Vue port surfaced more, fixed here first with Svelte parity pending (each listed under its component below): animated-testimonials, animated-tooltip, autocomplete, compare, confetti, copy-button, focus, inline-citation, number-input, rainbow-button, select, text-generate-effect, tooltip.
- **not listed**: implementation-only differences with no consumer surface (template duplication, style-object plumbing, internal helper types, test-fixture transpositions) are not recorded here. A component without a bullet below differs from Svelte only through the rules above.

### Per component

- **animated-beam**: `containerRef`, `fromRef` and `toRef` are typed `HTMLElement | null` rather than a required `HTMLElement`: a Vue template ref is `null` until the parent has mounted, so the idiomatic `:container-ref="container"` binding passes `null` on the first render. They are still required props (pass `null`, not nothing).
- **animated-beam**: Ids come from `useFancyId()` and read `beam-v-N`, with the `-glow` / `-bloom` filter suffixes. Svelte uses `beam-<$props.id()>`. Vue's `useId()` is unique within one app, not across separately mounted apps, so the uniqueness test mounts two beams in one app.
- **animated-beam**: The ResizeObserver arms on `onMounted` and again from a `flush: 'post'` watcher on `containerRef`. A parent's template ref is still `null` when a child's `onMounted` runs, a gap Svelte's `bind:this` does not have. The watcher also re-arms the observer when the container is swapped.
- **animated-testimonials**: the active testimonial is clamped when the list shrinks, and an empty list during a transition resets the index to 0 instead of `NaN` (upstream fix, Svelte parity pending).
- **animated-tooltip**: tooltip ids are generated per avatar (`useFancyId()`) instead of `animated-tooltip-${item.id}`, so `aria-describedby` stays a single token and stays unique across rows that share item ids (upstream fix, Svelte parity pending).
- **apple-card-carousel**: `AppleCardData.content` is a Vue component or render function (`Component` from `vue`, rendered through `<component :is>`) where Svelte takes a `Snippet`. It cannot become a slot because it lives inside an item of the `cards` array: pass `content: () => h('div', …)` or a small component.
- **autocomplete**: when the filtered list changes while open, the active option follows the highlighted suggestion by its text and clears when that suggestion is gone, so `aria-activedescendant` never points at a missing option (upstream fix, Svelte parity pending).
- **bento-grid**: the source's `:global(.dark) .bento-tile …` dark-theme rules are written `.dark .bento-tile …` in the scoped block, because the scoped compiler would reduce a selector containing `:global(...)` to a bare `.dark`. The rule targets the same elements with the same specificity.
- **bento-grid**: tile content parts (`.bento-lift`, `.bento-icon`, `.bento-cta`) are reached with `:deep()` from the internal BentoFrame, and the grid's reveal rules use `> :deep(*)`, in place of the source's `:global()`. The compiled selectors are unchanged apart from the scope attribute.
- **bento-grid**: the child indexing (`--bento-i`, `--bento-delay`, re-run by a MutationObserver) and the one-shot in-view observer run from `flush: 'post'` watchers on the grid's template ref, and reduced motion comes from `useReducedMotion()`, which is read in `onMounted`. The SSR output is the same as the source's: the class `bento-reveal` with `data-state="armed"`, and the tiles have no inline index properties until the watchers run on the client.
- **bento-grid**: BentoGridItem and BentoGridCard pass `[base, class]` to the internal frame's `cn()` where the source uses `[base, className].join(" ")`. The merged string is identical for string classes, and the port also accepts Vue's array and object class values.
- **border-beam**: The dark-theme rule `:global(.dark) .border-beam` is written as `.dark .border-beam` under the scoped compiler, which only scopes `.border-beam` and gives the same selector; a leading `:global()` would instead produce a bare `.dark` rule.
- **border-beam**: The `bb-travel` and `bb-ignite` keyframes stay in the scoped block. They are only referenced from scoped `animation` declarations, so the compiler renames them with the scope hash and rewrites those references consistently. This means an outside stylesheet cannot target the keyframes by their bare names.
- **compare**: autoplay keeps a single frame loop: `startAutoplay` stops the running loop first, so mount, hover leave, drag end and prop restarts no longer stack loops, and unmount cancels it (upstream fix, Svelte parity pending).
- **composer**: `ComposerCommandMenu` attaches its textarea `keydown` listener in the CAPTURE phase (in Vue every listener sits on the textarea itself, so a bubble-phase `stopPropagation()` would arrive too late to stop Enter-to-send). A consumer's own `keydown` listener on the textarea therefore runs after the menu's while it is open.
- **compare**: the callbacks are the camelCase props `onPercentageChange`, `onDragStart`, `onDragEnd`, `onHoverEnter`, `onHoverLeave`, so `@percentage-change`, `@drag-start`, `@drag-end`, `@hover-enter` and `@hover-leave` work. The lowercase `onpercentagechange`, `ondragstart`, `ondragend`, `onhoverenter`, `onhoverleave` stay as deprecated aliases (`:ondragstart="fn"`), called only when the camelCase prop is absent; the run-together `@dragstart` / `@hoverenter` spellings compile to `onDragstart` / `onHoverenter` and are dropped with the other attributes.
- **confetti**: Reassigning `options` and calling `fire()` in the same tick bursts with the PREVIOUS object: Vue hands a reassigned prop to the child only on the parent's next render, where Svelte bursts with the new one. Mutating the object already passed as `options` behaves identically, and the next `fire()` after the re-render uses the reassignment.
- **confetti**: `ConfettiButton` follows the same contract as Svelte: `type` defaults to `"button"` and is overridable through `attrs`, `class` is merged, native attributes are forwarded, and `onClick` is a declared prop (arrays accepted) called once after the burst.
- **container-scroll**: the source's `:global(.dark) .cs-root` and `:global(html:not(.dark)) .cs-root` selectors are written as plain ancestor selectors (`.dark .cs-root`, `html:not(.dark) .cs-root`) in the scoped style block, because the scoped compiler would otherwise emit the wrapped part alone; the matched elements and the values are identical.
- **context-menu**: `openAt` drops the source's imperative `anchorRef.style.setProperty("left"/"top")` writes and relies on the anchor span's `:style` binding landing ahead of the `flush: "post"` recompute. A consumer reading `ctx.anchorRef.style.left` synchronously inside `onOpenChange` sees the PREVIOUS coordinates in Vue and the new ones in Svelte.
- **copy-button**: `onCopy` reports the value captured when the copy started, not the prop's later value, when the prop changes while the clipboard write is pending (upstream fix, Svelte parity pending).
- **datamosh-transition**: `phase` is output-only: `v-model:phase` hears every change, but a value the parent writes back is ignored, where Svelte's bindable adopts it. `@covered` / `@revealed` (the `onCovered` / `onRevealed` props) are the callbacks; the lowercase `oncovered` / `onrevealed` stay as deprecated aliases, called only when the camelCase prop is absent. `cover()` / `reveal()` / `play()` are called through a template ref.
- **dim-siblings**: Svelte's child `:global(...)` selector becomes `:slotted(...)`: only direct children that arrived through the default slot dim. DOM injected into the root from outside the slot does not participate, where Svelte's rule would still catch it.
- **direction-aware-hover**: The two `:global()` rules keep their declarations verbatim but lose their document-wide reach: the `.group\/card` 44px min-box and the `prefers-reduced-motion: reduce` `transition-duration: 0.1s` override apply to this component's own elements plus its whole slot subtree, because every scoped style ships in the one `styles.css` each consumer imports once, and would otherwise force both on apps that never render the component. Under reduced motion the 0.1s override therefore reaches this component's slot content only, not the rest of the host page. Matches the React package's identical narrowing.
- **dock**: Svelte throws when a DockIcon or DockSeparator is mounted outside a Dock. The Vue port degrades instead, through a frozen fallback context: `magnify: false`, `orientation: "horizontal"`, the pointer at `Infinity` and `reflection: true` (the prop default). A lone icon renders at its resting 40px with the reflection hook, and a lone separator is a vertical `role=separator` hairline.
- **dock**: Svelte writes `:global(.dark) .dock-*` in its scoped styles. Vue writes them as plain `.dark .dock-*` ancestor selectors, which have the same reach and the same specificity.
- **flip-card**: `inert` is bound as `cond || undefined` rather than a bare boolean: when Vue patches an element with no `inert` DOM property (jsdom) it writes `inert="false"`, which would make the visible face inert, so false is mapped to no attribute; browser behaviour is unchanged.
- **flip-card**: Reduced motion is read through `useReducedMotion()`, which starts the media query in onMounted, instead of Svelte's `$effect(() => reduced.start())`, following the package's rule that SSR and hydration must render the same thing.
- **focus**: toggling `manualMode` after mount starts or stops the auto-cycle, and switching to manual returns focus to the first word (upstream fix, Svelte parity pending).
- **inline-citation**: a source url or `href` with no scheme (`docs.example.dev/guide`) gets `https://` added before the scheme check, the same as `SourceCard`, so the marker no longer resolves against the app origin (upstream fix, Svelte parity pending).
- **input**: `autocomplete` is widened to `string` in the props the component accepts; the exported `InputProps` still types it as the full autofill token union. The generated props type would otherwise exceed the type checker's union ceiling, so a token typo is no longer caught at the call site.
- **line-hover-link**: `aria-label` is spelled `ariaLabel` in `LineHoverLinkProps`: Vue camelises declared prop names, so the hyphenated Svelte key could never be read back off `props`. Both `ariaLabel="…"` and `aria-label="…"` reach the prop and emit `aria-label` on the anchor.
- **line-reveal**: Line height survives a font-only change. Svelte's `style:font` / `style:line-height` directives re-apply only the declaration whose value changed, so switching weight or family at the same size re-applies the `font` shorthand (which resets `line-height`) without the longhand, and the lines drift inside their fixed-height masks. Vue re-applies every key of the style object, `font` then `line-height`, on each patch, so that bug does not reproduce; the emitted style still reads `font: …; line-height: …`. Behavioural parity with the React port.
- **marquee**: the Web Animations upgrade is rebuilt when `class` changes, as in Svelte, but because `class` is typed `HTMLAttributes["class"]` here, a consumer passing an inline array or object class gets a new identity on every parent render and triggers a rebuild each time; the rebuild resumes from the current position, so nothing jumps visually. Pass a string, or hoist the array, to avoid the churn.
- **marquee**: ReviewCard's dark-mode rule is written `.dark .review-card` instead of the source's `:global(.dark) .review-card`, because the scoped compiler would swallow the whole selector inside `:global()`; the emitted selector has the same reach (`.dark` ancestor, scoped card).
- **navigation-menu**: `NavigationMenuContext` gains one readonly member the source has no counterpart for, `pendingFocusValue`: a Vue watcher's callback is untracked, so the panel names the pending focus request as an explicit watch source (`consumeFocusRequest()` is still the only way to take it). Without it, Enter on a trigger whose panel is already hover-open would not move focus into the panel.
- **number-input**: step precision counts the exponent of steps written in exponential notation (`1e-7`), so tiny fractional steps no longer round back to an integer (upstream fix, Svelte parity pending).
- **pagination**: when the visible run of pages shifts, the numbers glide with the list's CSS move transition (300ms, cubic-bezier(0.16, 1, 0.3, 1), off under reduced motion) instead of a JS-sampled expo-out FLIP; the sliding current-page pill is identical.
- **password-input**: Cross-fade exit easing differs from the source, package-wide and shared with the React port: the icon cross-fade's EXIT leg resolves to `JS_EASINGS.in`, because the presence core passes a real per-leg direction, where the source's bidirectional `transition:iconFade` reports direction "both" and eases both legs with `JS_EASINGS.out`.
- **pressable**: `PressableProps` no longer blocks the seven listeners the wrapper owns (`onpointerdown`, `onpointerup`, `onpointercancel`, `onpointerleave`, `onfocusout`, `onkeydown`, `onkeyup`): passed through `$attrs`, a same-named handler is MERGED and fires alongside the wrapper's own (caller's first) rather than being silently overridden. Put your own handlers for those on the child; the guidance is advisory here, not type-enforced.
- **pulse-beam**: the callbacks are the camelCase props `onFadeIn` / `onFadeOut` (`@fade-in` / `@fade-out`); the lowercase `onfadein` / `onfadeout` stay as deprecated aliases, called only when the camelCase prop is absent. The computed `--pb-*` custom properties win over a consumer `style`.
- **radio-group**: The generated `name` reads `v-0-name`, `v-1-name`, … from Vue's `useId()`, whose counter is per APP, not per page: two RadioGroups mounted in two SEPARATE Vue apps on one page both get `v-0-name` and fight over each other's selection. Inside one app they are distinct and SSR-stable. Consumers mounting several apps must set `app.config.idPrefix` per app, or pass an explicit `name`; the Svelte and React packages have no equivalent hazard.
- **rainbow-button**: a disabled `href` anchor calls `preventDefault()` on click, so it no longer navigates; the Svelte source only returns early, and `aria-disabled` / `tabindex=-1` do not stop a pointer click from following the href (upstream fix, Svelte parity pending).
- **reveal**: Changing `once`, `threshold` or `rootMargin` no longer tears down and rebuilds the observer: `useInView` routes them through the core's `update()`, and a spent `once: true` observer does not re-fire (same as the React port).
- **select**: a disabled Select rejects every commit, and closes its panel if it is disabled while open, so a portalled row click can no longer change the value or fire `onValueChange` on a disabled control (upstream fix, Svelte parity pending).
- **smooth-cursor**: The custom cursor is the `#cursor` slot rather than a snippet prop. The tip-versus-centre hotspot is recomputed from the slot's presence on every render, not held in a reactive derived value, because slot presence is not reactive in Vue.
- **smooth-cursor**: The gradient id for the default arrow comes from `useFancyId()` (`smooth-cursor-fill-v-N`), not `$props.id()`. The two id sources format their ids differently, but the id is SSR-stable and unique per instance in both packages.
- **smooth-cursor**: The prop watchers (`springConfig`, `labelSpring`, `rotate`, `idleFade`) and the label-element watcher fire only on change, never at mount. The engine gets the mount values as creation options, so the Svelte effects' first run, which re-applies the same values, is not repeated here.
- **terminal-text**: The stream is keyed on the CONTENT of `lines`, not the array's identity, so an inline `:lines="['a', 'b']"` (a fresh array on every parent re-render) does not clear the pending timeouts and restart the animation each time. The array is serialised, so `['ab']` and `['a', 'b']` never collide; an in-place mutation of a reactive `lines` array still restarts the stream. Remaining gap: a re-allocated array with equal content keeps the current stream running, where Svelte would restart it (same trade-off as the React port).
- **text-generate-effect**: a `words` change re-arms the reveal on the new spans and clears the previous run's timers, instead of leaving replacement words invisible (upstream fix, Svelte parity pending).
- **textarea**: `autocomplete` is widened to `string` in the props the component accepts; the exported `TextareaProps` still types it as the full autofill token union. The generated props type would otherwise exceed the type checker's union ceiling, so a token typo is no longer caught at the call site.
- **time-picker**: When `step`, `min` or `max` regenerate the slot grid, the highlight is reconciled against the time it named: the same slot if it survived, else the closest one at or after it, else the last, else nothing highlighted. The Svelte component leaves the raw index in place, which can point past the end of a shorter grid or at a different time than the one arrowed to. Matches the React package, which closed the same gap.
- **timeline**: the source's `:global(.dark) .tl-root` theme override is written as a plain `.dark .tl-root` ancestor selector in the scoped block. The rule and the result are the same.
- **timeline**: the items-count watcher (`watch(() => items.length, …, { flush: 'post' })`) does not run on mount, while the Svelte `$effect` does. The Svelte first run only queues a redundant microtask re-measure after `onMount` has already measured synchronously, so the rendered result is the same.
- **toast**: The entrance and exit move from `<Toast>` to `<Toaster>`: a `<Toast>` rendered directly by a consumer paints at rest and no longer animates itself in or out. Through `<Toaster>` the motion is unchanged — same preset, 300ms/8px arrival, 200ms/4px departure, same reduced-motion collapse (parity with the React port).
- **tool-call**: The auto-open for a failure is keyed on the `call.status` VALUE, not on the `call` object identity: handing the card a fresh `call` object whose status is still `"error"` does not re-fire the auto-open. Observable only when a consumer drives `open` from outside AND re-creates the `call` object (same as the React port).
- **tooltip**: the tooltip appends its id to the trigger's existing `aria-describedby` list and removes only that id on close, instead of overwriting the attribute and then deleting it; it also rewires its listeners and `aria-describedby` onto a replacement trigger when the slot swaps its first element (upstream fixes, Svelte parity pending).

## Tech Stack

| Technology                                   | Version | Purpose             |
| -------------------------------------------- | ------- | ------------------- |
| [Vue](https://vuejs.org)                    | 3.5     | UI framework        |
| [Tailwind CSS](https://tailwindcss.com)      | 4       | Styling             |
| [TypeScript](https://www.typescriptlang.org) | 5       | Type safety         |
| [Vite](https://vite.dev)                     | 7       | Library build       |
| [Vitest](https://vitest.dev)                 | 4       | Testing             |
| [GSAP](https://gsap.com)                     | 3       | Advanced animations |

## Credits

Inspired by [Inspira UI](https://inspira-ui.com), [Aceternity UI](https://ui.aceternity.com) and [Magic UI](https://magicui.design). The Svelte 5 implementation at the root of this repo is the reference every port follows.

## License

MIT
