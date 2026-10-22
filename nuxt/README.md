# fancy-ui-nuxt

Nuxt module for [fancy-ui-vue](https://github.com/RamaHerbin/fancy-ui/tree/main/vue#readme): every component auto-imported under a `Fancy` prefix, the components' stylesheet added for you, and the sound composables auto-imported, all server-rendered.

> **Status: not yet published to npm.** The package is private in this repository for now, so `npm install fancy-ui-nuxt` will only work once it is published. Until then, try it from a clone of the repo (see [Try it from this repo](#try-it-from-this-repo)).

## Quick Start

### Install

After publication:

```bash
npm install fancy-ui-nuxt fancy-ui-vue
npm install -D tailwindcss @tailwindcss/vite
```

`fancy-ui-vue` is a peer dependency (`>=0.3.0 <1.0.0`): the app installs it, because its own CSS imports `fancy-ui-vue/tailwind.css`. Tailwind CSS 4 and its Vite plugin are the app's, too.

### Configure

```ts
// nuxt.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	modules: ["fancy-ui-nuxt"],
	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },
});
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css";
```

The module adds `fancy-ui-vue/styles.css` (keyframes and the components' scoped rules) after your own CSS, so those two lines are all `main.css` needs. They stay in your CSS because the module cannot provide them: `tailwind.css` works through Tailwind v4 at-rules (`@source` so Tailwind scans the shipped components, `@theme inline` for the colour tokens), which only take effect inside the stylesheet Tailwind compiles, your entry. `styles.css` alone does not give the look: most of a component's layout comes from the Tailwind utilities in its template, so without Tailwind a `<FancyBorderBeam>` ships its keyframes but its root stays static and collapses to zero height (covered by `test/styles.test.ts`).

### First component

```vue
<template>
	<FancyShimmerButton>Get started</FancyShimmerButton>
</template>
```

No import: every component of `fancy-ui-vue` is registered as `Fancy<Name>`, in PascalCase or kebab-case (`<fancy-badge>`), with its props typed from the package's declarations.

### Try it from this repo

```bash
git clone https://github.com/RamaHerbin/fancy-ui.git
cd fancy-ui
pnpm install
pnpm --filter fancy-ui-vue build
pnpm --filter fancy-ui-nuxt dev:prepare
pnpm --filter fancy-ui-nuxt dev   # the playground in nuxt/playground
```

## Options

Set under the `fancyUi` key:

```ts
export default defineNuxtConfig({
	modules: ["fancy-ui-nuxt"],
	fancyUi: {
		components: ["ShimmerButton", "BorderBeam"],
		prefix: "Fancy",
	},
});
```

| Option        | Type                  | Default   | What it does                                                                                                                                                                                                                                                                                                  |
| ------------- | --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components`  | `boolean \| string[]` | `true`    | `true` registers every component, an array registers only those export names (`"ShimmerButton"`, not `"FancyShimmerButton"`), `false` registers none. An unknown name logs a warning and is skipped; the build carries on.                                                                                    |
| `prefix`      | `string`              | `"Fancy"` | Prepended to each export name: `ShimmerButton` becomes `<FancyShimmerButton>`. Must be `""` (bare names, `<ShimmerButton>`) or a PascalCase word matching `/^[A-Z][A-Za-z0-9]*$/` (`"Ui"`, `"X"`). Anything else (`"fancy"`, `"my-ui"`) logs a warning and falls back to `"Fancy"`.                           |
| `css`         | `boolean`             | `true`    | Appends `fancy-ui-vue/styles.css` to `nuxt.options.css`. Skipped when the app already loads it, either as a `css` entry or as an `@import` in one of the stylesheets listed there (the manual setup), so it never ships twice. `false` leaves the CSS to you. The Tailwind lines stay in your CSS either way. |
| `composables` | `boolean`             | `true`    | Auto-imports the five sound composables: `useSound`, `useSoundCue`, `useSoundEnabled`, `useSoundStatus`, `useSoundFeedback`.                                                                                                                                                                                  |

## Lazy loading and hydration

Nuxt's `Lazy` prefix works on every registered component, together with its delayed-hydration props:

```vue
<template>
	<LazyFancyBorderBeam hydrate-on-visible />
</template>
```

Each component is registered through its own one-line re-export of `fancy-ui-vue`, so the client bundle carries only the components a page uses, not the library (`test/components.test.ts` builds a page with three components and checks that the rest never reach the client chunks). The re-exports all go through the package root, so there is one `fancy-ui-vue` module instance: injection keys and the sound engine stay shared between components and composables.

## Styles and themes

`fancy-ui-vue/tailwind.css` declares the 18 semantic colour tokens the components use (`background`, `foreground`, `primary`, `muted`, `border`, …) with light and dark defaults in `@layer base`, wired through `@theme inline`. Override them with an unlayered `:root` (and `.dark`) block in `main.css`; an app that already defines the same token set keeps its own colours.

Dark mode follows the operating-system preference by default. To control it, put `dark` or `light` on `<html>` (or any ancestor): both the `dark:` utilities and the components' `light-dark()` colours follow the class. The full token list and the mechanics are in the [fancy-ui-vue README](https://github.com/RamaHerbin/fancy-ui/tree/main/vue#setup).

## Server rendering

- **Components render on the server.** Nothing is registered client-only and no `<ClientOnly>` wrapper is needed: canvas, WebGL and other browser-only work start after mount. Portalled surfaces (dialogs, popovers, menus, the toaster) render their trigger on the server and their panel after hydration.
- **Seed the randomised components.** These draw their random layout from a `seed` prop (default `1`) so the server render and its hydration agree: `AnimatedBeam`, `ColourfulText`, `Meteors`, `SparklesText`, `StarField`, `TextRevealStars` (and `HyperText`, `StarsBackground`). `TextRevealCard` forwards `starsSeed` to its stars. Two instances with the same seed look alike; give each a different `seed` to tell them apart.
- **Sub-components need their parent.** Parts such as `PopoverContent` or `DropdownMenuItem` are registered like any component but are meant to sit inside their provider (`<FancyPopover>`, `<FancyDropdownMenu>`); a required part used on its own throws a named error, an optional one degrades.
- **Sound starts off on the server.** Sound preferences hydrate in `onMounted`, so `useSoundEnabled()` reads `false` in the server render.

## Compatibility

<!-- COMPAT: filled by orchestrator after consumer validation -->

- **Nuxt 4.** The module declares `^4.0.0`; the repo test suite runs on Nuxt 4.5.2.
- **Vue 3.5** (the `fancy-ui-vue` floor) and **Tailwind CSS 4**.
- **Node 20.19 or later.**

## Limits

- **Cameleon skins are not auto-registered.** Import them from `fancy-ui-vue/cameleon` yourself; several share a name with a root component (`Button`, `Badge`, `Input`, …).
- **Only components and the five composables are auto-imported.** Functions and constants such as `toast()`, `sound` and `cn` are imported explicitly: `import { toast } from "fancy-ui-vue"`. `toast()` needs a `<FancyToaster />` mounted to show anything.
- **`styles.css` is one global sheet.** It ships whole (about 90 KB gzipped for `fancy-ui-vue` 0.3.0) however few components the app uses; only the JavaScript is split per component.
- **Why the prefix.** The library uses generic names (`Button`, `Input`, `Dialog`, `Badge`, `Tooltip`), which would collide with an app's own components. Set `prefix: ""` only if nothing in the app shares those names.

## License

MIT
