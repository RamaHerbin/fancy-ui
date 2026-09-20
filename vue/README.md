# fancy-ui-vue

Vue counterpart of [`fancy-ui-svelte`](https://www.npmjs.com/package/fancy-ui-svelte) —
same components, same visual contract, ported from the Svelte 5 reference
implementation that lives at the root of this repo, built on Vue 3.5 and
Tailwind CSS v4.

Status: 3 of 144 components of `fancy-ui-svelte` are ported so far, alongside
the `sound` family; the cameleon skin engine (FancyProvider + primitives +
skins) will ship on the `fancy-ui-vue/cameleon` subpath. The Svelte package
remains the reference; each Vue component is a faithful transpose (see
`PORTING.md` for the law that governs ports), and every deliberate difference
is listed under [Divergences](#divergences-from-the-svelte-api) below.

## Install

```bash
npm install fancy-ui-vue
```

Peer dependencies: `vue` 3.5.2 or later, `tailwindcss` 4. TypeScript is an
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
- **dialog**: The `children`, `footer` and `trigger` snippet props are slots: the dialog's body is the default slot, the action row is `#footer`, and the optional trigger is `#trigger`. `{#if trigger}` becomes `v-if="$slots.trigger"`, so the `display: contents` wrapper is still emitted only when a trigger is supplied.
- **dialog**: `open` is a two-way model rather than a bindable prop: write `v-model:open`. There is no `modelValue` alias. `onOpenChange` still fires on every change from any trigger, and a caller who passes `open` and no listener at all still gets a dialog that drives itself.
- **dialog**: NEW, and the one shape where the model is not the bindable: a caller who passes `open` AND an `@update:open` listener that never writes the value back gets a dialog that does NOT close itself. The model defers to the parent whenever a listener is present, so the panel stays mounted and `data-state` stays `open` while the callback has already reported `false`. The bindable prop updates the component's own view in that same shape. Real `v-model:open` (or `open` with no listener) is unaffected. Measured both ways.
- **dialog**: `ref` is not a prop. `ref` is a reserved vnode key in Vue, so the panel element is published on the instance (`defineExpose({ ref })`) and read through a template ref on `<Dialog>`; `DialogProps` carries no `ref` field.
- **dialog**: `class` is typed `HTMLAttributes["class"]` rather than `string`, so the array and object class forms a Vue consumer expects are accepted. It is still merged onto the panel through the same `cn()` call sites, in the same argument order.
- **dialog**: Native attributes and listeners put on `<Dialog>` land nowhere: neither source component spreads `{...restProps}`, so both are closed (`inheritAttrs: false`, no `v-bind="attrs"`). Package-level parity with the source, but it means `<Dialog id="x" data-foo="bar">` drops both silently.
- **dialog**: The panel's `data-state` is an ordinary reactive binding instead of a static literal rewritten imperatively at transition time. Same attribute, same two values (`open` / `closing`), same timing.
- **dialog**: `inert` on a closing panel is set by this package's presence clock as an ATTRIBUTE (`toggleAttribute`) rather than by the framework's own transition machinery. Same effect, and `hasAttribute("inert")` is what to assert against.
- **dialog**: Generated ids come from Vue's own id generator and read `v-0-title` / `v-0-description` instead of the source's shape. They are stable across a server render and its hydration; nothing may depend on the shape, and none of them is ever used as a CSS selector.
- **dialog**: Test-fixture divergence, recorded because the suite is part of the contract: the `falls back to document.body` case calls `trigger.focus()` before opening, which the source case does not. Without it the trap captures `document.body`, step 1 of the return chain succeeds on a still-connected node, and the case tests nothing.
- **dialog**: Internal (not a consumer surface): `DialogSurfaceProps` drops the source's `children` and `ref` fields — the panel's content is the default slot and the panel element is exposed, not a prop.
- **presence**: `PresenceProps` declares the component's own props only — native attributes and listeners (`id`, `role`, `aria-*`, `@click`, …) reach the root `<div>` through `$attrs` instead of through the props type, which the Svelte package folds in via `Omit<HTMLAttributes<HTMLDivElement>, …>`. Placement is unchanged: they are applied where Svelte spreads `{...restProps}`, so `data-state` still wins over a caller-supplied one.
- **presence**: `ref` is not a prop and there is no `bind:ref`. The root element is published on the component instance (`defineExpose({ ref })`); read it with a template ref on the component, e.g. `<Presence ref="panel" />` then `panel.value.ref`. It is `null` while closed and `null` again once a close settles, exactly as the bindable was.
- **presence**: The required `children` snippet becomes the required default slot: `<Presence :open="open"><div>…</div></Presence>`.
- **presence**: `inert={false}` never touches the `inert` attribute at all, instead of letting the framework set it and then overriding it back to `false` as the exit starts. The observable result is the same — no `inert` on a closing panel — but the attribute is never written and then unwritten. `inert` is also written as the ATTRIBUTE (`toggleAttribute`), never the IDL property, so `:not([inert])` selectors and assistive technology see it under every runtime including jsdom.
- **presence**: `onEnterEnd` / `onExitEnd` stay callback props rather than events; a consumer may equivalently write `@enter-end` / `@exit-end`, which the compiler turns back into the same props. They do not appear in the devtools event pane.
- **select**: **`value` is two-way through `v-model:value`** rather than `bind:value`. The Svelte prop name is kept and there is no `modelValue` alias; the three documented call shapes (two-way, `onValueChange` alone, plain value plus callback) all work off the one implementation, and `@value-change` also reaches `onValueChange` because the compiler turns it into that prop.
- **select**: **The trigger element is exposed as `defineExpose({ ref })`**, on the same `<button>` the Svelte `ref = $bindable(null)` pointed at, and `SelectProps` carries no `ref` field (`ref` is a reserved vnode key).
- **select**: **`class` is typed `HTMLAttributes["class"]` instead of `string`**, so an array or object class value is accepted as well as a string; it is still merged onto the trigger through the same single `cn()` call, in the same argument position.
- **select**: **The panel and option ids read `v-N-listbox` / `v-N-option-K`** rather than the Svelte id shape, because the seed comes from the package-level id helper. They are SSR-stable and are only ever `aria-controls` / `aria-activedescendant` targets — nothing may key CSS off them.
