# fancy-ui-vue

Vue counterpart of [`fancy-ui-svelte`](https://www.npmjs.com/package/fancy-ui-svelte) —
same components, same visual contract, ported from the Svelte 5 reference
implementation that lives at the root of this repo, built on Vue 3.5 and
Tailwind CSS v4.

Status: 0 of 144 components of `fancy-ui-svelte` are ported so far, alongside
the `sound` family; the cameleon skin engine (FancyProvider + primitives +
skins) will ship on the `fancy-ui-vue/cameleon` subpath. The Svelte package
remains the reference; each Vue component is a faithful transpose (see
`PORTING.md` for the law that governs ports), and every deliberate difference
is listed under [Divergences](#divergences-from-the-svelte-api) below.

## Install

```bash
npm install fancy-ui-vue
```

Peer dependencies: `vue` 3.5 or later, `tailwindcss` 4. TypeScript is an
optional peer at 5.0 or later.

## Tailwind setup

```css
/* app.css */
@import "tailwindcss";
@import "fancy-ui-vue/tailwind.css";
@import "fancy-ui-vue/styles.css";
```

`tailwind.css` points Tailwind's scanner at this package's shipped `dist/` so
every utility class the components use is generated in the consumer's build,
and declares the shared token set the components spend. `styles.css` carries
the components' own keyframes and scoped rules.

## Divergences from the Svelte API

Deliberate, package-level differences from the Svelte reference — everything
else is a faithful transpose. Per-component divergences are added here as
each component is ported.

- **`<Name>Props`** hold the component's own props only, never a
  `ButtonHTMLAttributes`-style intersection: native DOM attributes and
  listeners a component does not itself declare flow through `$attrs`
  instead. A `Name`Prop the component reads from the DOM (for example
  `disabled`) is declared as a real prop.
- **`class` is a declared prop** on every component so `cn(…, props.class)`
  applies exactly once and the value never doubles up through `$attrs`.
- **`ref` is exposed via `defineExpose({ ref })`**, on the same node Svelte's
  `ref = $bindable(null)` pointed at, and is absent from `<Name>Props` (`ref`
  is a reserved vnode key, not a prop).
- **Two-way bindables use `v-model:<name>`** with the name kept from the
  Svelte prop (for example `v-model:open`) — there is no default `modelValue`
  alias on the primary bindable.
- **Snippet arguments become scoped-slot object props.** A Svelte
  `Snippet<[A, B]>` becomes a named scoped slot receiving one props object,
  typed with `defineSlots`, rather than positional arguments.
- **Callback props stay props.** `onOpenChange`, `onSelect` and similar are
  called as `props.onX?.()` rather than emitted as Vue events, so devtools
  shows no event pane for them — a deliberate cost for parity with the
  Svelte and React callback shape.
- **Teleport is placed inside the presence-mounted subtree**, the inverse of
  the DOM-portal ordering on the React side: a closed surface emits nothing
  server-side, and Teleport resolves synchronously once the subtree mounts.
- **No `markSurfaceState` equivalent** — surface-state vocabularies
  (`data-state` values) are read directly from the presence binding.
- **Focus-trap composables return a handle** (`returnFocusNow` / `rearm`)
  instead of the imperative methods a Svelte action could expose, since a
  Vue composable has no directive lifecycle to hang them on.
- **Scoped-style keyframes referenced from an inline style or a custom
  property live in a second, unscoped `<style>` block** in the same
  component file, because `<style scoped>` always renames keyframe names.
  As a side effect, a parent's scoped selector can still match a child
  component's root element — permissive only, never used to reach further
  into a child's markup.
- **DOM attributes a component reads become declared Boolean props**
  (for example `disabled`) rather than being read off `$attrs`, so a bare
  `<X disabled>` behaves correctly instead of resolving to the falsy string
  `""`.
- **`v-model` on native inputs defers to IME composition** the way the
  underlying input element already does, rather than updating on every
  keystroke during composition.
- **Composables expose no `destroy()` method.** Cleanup runs through
  `onScopeDispose`, matching Vue's composable lifecycle rather than a
  Svelte action's `{ update, destroy }` return shape.
- **`DropdownMenuContent` keeps an explicit `nextTick()` wait** before
  moving the panel to its edge, matching the Svelte source's `tick()` call
  (the React port dropped the equivalent wait; the Vue port does not).
- **Media-query and similar composables keep an explicit `start`/`stop`
  pair** and accept getter-shaped options, matching the Svelte action's
  shape (the React port's hook-based rewrite of these two points is not
  carried over).
- **Sound preferences hydrate explicitly in `onMounted`** (`hydrateSound()`),
  rather than reading `localStorage` during setup, because Vue's production
  hydration does not patch an attribute mismatch introduced by an
  eagerly-read client-only preference.
- **Generated ids follow Vue's own `useId()` sequence** (`v-0`, `v-1`, …)
  rather than the Svelte or React id sequence — stable per render tree, not
  matched across frameworks.
- **A handful of proven bugs surfaced while porting `fancy-ui-react` were
  fixed upstream on the Svelte source itself**, and the Vue port inherits
  those fixes rather than reproducing the original Svelte behaviour.
- **`inheritAttrs: false` on every component**, with `v-bind="attrs"`
  written only where the Svelte source spreads rest props onto an element —
  parity with both the Svelte and React packages, not the Vue-idiomatic
  default.
- **Vue 3.5 is the floor**, not just the minimum peer range: the port relies
  on reactive props destructuring, `useTemplateRef`, `onWatcherCleanup` and
  `<Teleport defer>`, all introduced in 3.5.
- **`createNow`'s server-rendered label is a sentinel, not a real time.**
  The initial render emits an empty label (matching the React port's `NaN`
  sentinel) so the server-rendered and hydrated output agree by
  construction, rather than committing a wrong clock value that Vue's
  production hydration would otherwise leave in place.
