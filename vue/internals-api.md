# Vue internals API contract — `fancy-ui-vue`

**Status:** binding contract, written before the port. Every component port is written against
this document; §10 is the register of every place the Vue package deliberately differs from the
Svelte originals.
**Law:** `vue/PORTING.md`. Fidelity over improvement. Where this contract departs from the Svelte
*implementation*, it never departs from the Svelte *observable behaviour*, and every such
departure is listed in §10.

**Authoritative sources.** `src/lib/fancy-ui/_internals/**`, `src/lib/fancy-ui/sound/**` and the
component sources in this worktree are the behaviour reference. `react/src/internals/**` and
`react/src/sound/**` are the *divergence-parity* reference: where React already solved a problem
the Svelte scheduler created (the `focus-trap` `isVisible` ancestor walk, `anchor-position`'s
layout-box measurement and `reset()`, the `listbox` `setActive` range guard, the engine's
`MAX_LAYER_MS` clamp), Vue takes the React answer — because those four edits land back on Svelte
in wave 0 (plan ruling 7), so by the time this package compiles all three trees agree.
Two files are **copied out of `react/`, not re-derived**: `motion/animate.ts` and the
`createPresenceCore` state machine inside `motion/presence.ts` (§13).

**The two Vue facts that reshape the React contract.**

1. **There is one effect phase, not two.** `onMounted`, `flush: 'post'` watchers and template-ref
   assignment all land in the same pre-paint flush. React's `useLayoutEffect`/`useEffect` table
   collapses to a single rule (§4), and `useIsomorphicLayoutEffect`, `useIsHydrated` and
   `useConstant` have no analogue at all (§2).
2. **`<Transition>` delays DOM removal, not component teardown.** `onBeforeUnmount` and the
   effect-scope stop run at *leave start*. A scroll lock released on unmount would therefore
   release the instant the dialog begins to fade, leaving the page scrollable under a scrim still
   on screen — the exact bug `DialogSurface.svelte`'s comment block exists to prevent. So
   `usePresence` (React's framework-free `createPresenceCore`, verbatim, plus a ~40-line Vue
   binding) is still required, and `<Transition>` is **not** the presence mechanism (§5.3).

**Design angle.** Vue's reactivity is close enough to runes that the Svelte source usually ports
*in shape*, not just in behaviour: a getter object published through `setContext` becomes the same
getter object published through `provide`; a factory's `$state` becomes a `ref` and its signature
does not move. So this document is shorter than React's, and its rule is the opposite of React's:
**where React had to invent an ergonomic (a live ref, a snapshot cache, a `useSyncExternalStore`),
Vue keeps the Svelte surface.** The registered divergences are the places where that is not
possible, and they are few.

---

## 0. Contents

1. Conventions every component port must follow (C-1…C-12)
2. Foundations — `vue/src/internals/dom/`, and what React has that Vue does not
3. The load-bearing seven, plus `scroll-lock` and `id`
4. Effect-phase policy
5. The motion subsystem, and why presence is not `<Transition>`
6. The sound engine
7. SSR rules, per module
8. File layout, naming, CSS, barrel
9. Testing
10. Divergence register (D-V1…D-V20)
11. Build order
12. Remaining internals — one paragraph each
13. Shared-core identity gate

---

## 1. Conventions every component port must follow

Twelve rules. Short on purpose — they are meant to be memorised, and a port that breaks one is
wrong even if its tests pass.

### C-1 — An element composable takes a `WatchSource`, and never reads the element in `setup`

Every composable in §3 and §5 whose first argument is an element takes
`WatchSource<HTMLElement | null>` — Vue's own union of `Ref<T>` and `() => T` — and does its work
from `onMounted` or a `flush: 'post'` watcher on it. `useTemplateRef()` returns exactly that type.

```vue
<script setup lang="ts">
const panel = useTemplateRef<HTMLDivElement>("panel");
useFocusTrap(panel, () => ({ initialFocus, fallbackFocus }));
</script>
<template><div ref="panel" /></template>
```

Reading `panel.value` during `setup` is **forbidden**: it is `null` there and on the server, and
it stays `null` for any node created by `v-if="presence.mounted"` or by a conditional branch.
A composable that captures the element once instead of watching it never arms, silently.

### C-2 — Options keep the Svelte action's shape, and are passed as a getter

The second argument is always `() => Options`, never a plain object, and the option *fields* keep
whatever shape the Svelte action gave them — including getter fields
(`active: () => boolean`, `exclude: () => (HTMLElement | null)[]`, `count: () => number`,
`fallbackFocus: () => HTMLElement | null`). React flattened those to plain values because it had
to hold them in live refs (its D-6); Vue does not, so they stay (D-V14).

```ts
useDismissable(panel, () => ({ onDismiss, escape, outsideClick, exclude, active: () => open.value }));
```

The reason the Svelte header gives for `active` being a getter — an action's `update()` never runs
again once its branch goes inert — is gone in Vue, but the getter is kept anyway: it is the
Svelte surface, it costs nothing, and it makes the transposed `dismissable.test.ts` call the core
with the exact object literal it already has.

### C-3 — Contexts are the Svelte getter object, published under an `InjectionKey`

```ts
export const FIELD_KEY: InjectionKey<FieldContext> = Symbol("field-context");
// provider, inside setup, synchronously:
provide(FIELD_KEY, createFieldState({ controlId: () => controlId, /* … */ }));
// optional consumer:
const field = inject(FIELD_KEY, undefined);
```

A getter object ports **verbatim in shape**: a `computed` in a consumer that reads
`field.describedBy` runs the getter inside its own tracking scope, so the dependency is picked up
exactly as `$derived` picked it up. Optional contexts are read with `inject(KEY, undefined)` — the
explicit default is what suppresses Vue's "injection not found" dev warning and reproduces
`getContext()` returning `undefined` outside a provider. Required contexts go through
`createInternalContext(...).useRequired()` (§2), which throws a named error.
`provide` is only legal synchronously inside `setup` — never in `onMounted`, never in a watcher.

### C-4 — `defineExpose({ ref })` exactly where Svelte declares `ref = $bindable(null)`

```vue
<script setup lang="ts">
const root = useTemplateRef<HTMLDivElement>("root");
defineExpose({ ref: root });
</script>
```

108 components declare `ref = $bindable(null)`. `ref` is a reserved vnode key in Vue and cannot be
a prop or a `v-model`, so the element is published through the instance instead (D-V2), and
`<Name>Props` does **not** carry a `ref` field. Expose `ref` and nothing else. Never rely on
`$el`: it is wrong for a multi-root component and for a component whose root is a `<Teleport>` —
which is every overlay (Dialog, Select, GlowingEffect).

### C-5 — `data-state` vocabularies are not interchangeable

`Presence` renders three values (`"opening" | "open" | "closing"`) because `Presence.svelte` does.
Every **anchored surface** — dialog panel, dropdown content, popover, tooltip, select panel —
renders exactly two (`"open" | "closing"`): `anchored.ts` defines `SurfaceState` with two values
on purpose and `DialogSurface.svelte` writes a static `"open"`. Use `presence.state` for the
first, `presence.surfaceState` for the second. Rendering `data-state="opening"` on a panel is a
visible divergence.

### C-6 — Ids come from `useFancyId()`, and no id ever becomes a CSS selector

`useFancyId()` wraps Vue's `useId()` — the counterpart of `$props.id()`, which is what every
SSR-visible id in the Svelte sources uses. Its output is **not transformed**. Derive sub-ids by
suffixing one seed (`` `${id}-description` ``, `` `${id}-error` ``), exactly as `FormField` does.
The rendered shape differs from both other packages (D-V16); nothing may depend on it.
`uid()` is ported verbatim, throw included, and is only for an id minted inside an event handler.
Where a Svelte source wraps an id in `CSS.escape` before building a selector, keep the
`CSS.escape`.

### C-7 — Nothing may differ between a server render and its hydration

No `window` / `document` / `navigator` / `localStorage` / `matchMedia` read in `setup`, in a
`computed`, in a template, or in a `watchEffect`. No `Math.random()` or `Date.now()` on a render
path — keep the `seed` props and the `mulberry32` helpers the React port introduced, and take
`now` from `useNow()`. Media queries and the sound store hydrate in `onMounted` (§4, §6).
This rule is stricter in Vue than in React for a concrete reason: **Vue's production hydration
does not patch a text or attribute mismatch** — it warns in dev and leaves the server value in
place in production (verify). A React app self-corrects a wrong server value on the next commit;
a Vue app ships it.

### C-8 — `defineOptions({ name, inheritAttrs: false })` on every component

```vue
<script setup lang="ts">
defineOptions({ name: "ShimmerButton", inheritAttrs: false });
const attrs = useAttrs();
</script>
<template><button v-bind="attrs" :class="cn('…', props.class)"><slot /></button></template>
```

`name` is explicit on every SFC (plan ruling 5) so `check-dist-names.mjs` reads a real name rather
than the compiler's `__name` inference. `inheritAttrs: false` is set everywhere (D-V18) and
`v-bind="$attrs"` is written **only** on the element the Svelte source spreads `{...restProps}`
onto; the other 126 components are closed, exactly as they are in Svelte and React. A DOM
attribute the component *reads* (`disabled` is the live case) must become a declared prop — bare
`<X disabled>` reaches `$attrs` as `""`, which is falsy (D-V10).

### C-9 — Two script blocks: `<script setup>` for the component, `<script lang="ts">` for its types

```vue
<script lang="ts">
import type { HTMLAttributes } from "vue";
export interface ShimmerButtonProps {
  shimmerColor?: string;
  class?: HTMLAttributes["class"];
  sound?: boolean;
}
</script>
<script setup lang="ts">
defineOptions({ name: "ShimmerButton", inheritAttrs: false });
const { class: className, shimmerColor = "#ffffff", sound = false } = defineProps<ShimmerButtonProps>();
</script>
```

The sibling block is the mirror of Svelte's `<script module>`: it holds `export interface
<Name>Props` and module-level constants. Always an `interface`, never a type alias — the tooling
contract is that `<Name>Props` is importable from the package root and extendable by a consumer.
Both blocks compile into one module scope, so `defineProps<ShimmerButtonProps>()` with the
interface next door is legal (Vue ≥3.3).

### C-10 — Slots mirror snippets 1:1 and are typed with `defineSlots`

```vue
<script setup lang="ts">
defineSlots<{ default?: () => unknown; item?(props: { step: PlanStepData; index: number }): unknown }>();
</script>
<template>
  <slot name="item" :step="step" :index="index" />
  <div v-if="$slots.default"><slot /></div>
</template>
```

`children?: Snippet` → default slot; a named snippet → a named slot with the same name;
`Snippet<[A, B]>` → a scoped slot whose *tuple becomes an object* (D-V4). `{#if children}` →
`v-if="$slots.default"`.

### C-11 — Callbacks stay props; every non-`ref` bindable becomes `defineModel`, name kept

```ts
const open = defineModel<boolean>("open", { default: false });
const { onOpenChange } = defineProps<DialogProps>();
function setOpen(next: boolean) { open.value = next; onOpenChange?.(next); }
```

`onOpenChange`, `onSelect`, `onDismiss` and friends remain **props**, called as `props.onX?.()`.
`defineEmits` is never hand-written; the only emits in the package are the implicit ones
`defineModel` declares. A consumer can still write `@open-change="…"` — the compiler turns it into
the `onOpenChange` prop. The cost is that these do not appear in devtools' event pane (D-V5).
`v-model:<name>` only, never a default `modelValue` alias (plan ruling 3, D-V3).

The one exception is a **native listener the component intercepts and re-dispatches**
(`ShimmerButton` plays a cue then calls `onclick?.(e)`): declare it with `defineEmits<{ click:
[MouseEvent] }>()` so `onClick` is removed from `$attrs` and no second listener is bound, and
write `@click="handleClick"` **before** `v-bind="attrs"` on the same element — Vue merges
listeners in source order.

### C-12 — Styling follows PORTING.md, with one Vue-only hazard

Tailwind class strings are copied verbatim as static literals; `cn()` keeps its exact argument
order; `prefers-reduced-motion` blocks are ported as-is; class names and `@keyframes` names are
unchanged and the `-global-` prefix is dropped. A Svelte `<style>` block becomes
`<style scoped>` in the same SFC, rules verbatim — Vue's scoping contract matches Svelte's closely
enough that no anchor class has to be invented (the 145-class invention React needed does not
happen here). Rules reaching child or slot markup use `:deep()` / `:slotted()`.

**The hazard:** Vue renames every `@keyframes` inside a scoped block and rewrites the
`animation:` shorthands that reference it — but it cannot rewrite a reference that lives in an
inline `style=` or in a custom property. A keyframe referenced that way must live in a **second,
unscoped `<style>` block** in the same SFC (D-V9). Second, a parent's scoped selector also matches
a child component's root element, so a scoped rule may only ever be permissive, never a reset.

---

## 2. Foundations — `vue/src/internals/dom/`

Three files, and that is the whole foundation layer. All dependency-free and side-effect-free at
module scope; they land first.

### `dom/compose-refs.ts`

```ts
import type { Ref } from "vue";

/** What Vue passes to a function `ref`: the element, the exposed instance, or null. */
export type ComposableRefTarget = Element | { $el?: unknown } | null;
export type RefLike<T> = ((el: T | null) => void) | Ref<T | null> | undefined | null;

/**
 * Merges any number of ref sinks into ONE function ref, and adapts Vue's loose
 * `ref` callback signature to the `(node: HTMLElement | null) => void` shape the
 * framework-free cores use. Skips nullish entries.
 *
 * Call it ONCE in `setup`. Its identity must not change between renders, or Vue
 * detaches and reattaches the node on every patch — which, for a node carrying a
 * presence leg, throws the in-flight animation away.
 */
export function composeRefs<T extends HTMLElement>(...refs: Array<RefLike<T>>): (el: ComposableRefTarget) => void;
```

One element takes one `ref` attribute, and `DialogSurface`'s panel needs two sinks: the presence
leg's function ref and the `useTemplateRef`-shaped ref the focus trap, the dismissable layer and
`defineExpose` all read. That is the entire reason this file exists; it is five lines.

### `dom/context.ts`

```ts
import { inject, provide, type InjectionKey } from "vue";

/**
 * A typed injection key plus its three bindings. `useRequired` throws a named
 * error outside its provider (the compound-component contract); `useOptional`
 * returns `undefined` (the degrade-gracefully contract — `getField()`,
 * `ToggleGroupItem` outside a `ToggleGroup`).
 */
export function createInternalContext<T>(displayName: string): {
  key: InjectionKey<T>;
  provide(value: T): void;
  useRequired(): T;
  useOptional(): T | undefined;
};
```

House rule, inherited from `cameleon/context.ts`: **a context value is the Svelte getter object,
built once in `setup` and never replaced.** Do not rebuild it in a `computed` and do not wrap it
in `reactive()` — the getters already read live sources, and a replacement object would make
every consumer's `computed` recompute for nothing.

### `internals/use-id.ts`

Not under `dom/` — it sits beside the other internals, mirroring `react/src/internals/use-id.ts`.

```ts
import { useId } from "vue";

/** SSR-stable id — the counterpart of `$props.id()`. THE only id source a port
 *  reaches for. Output is NOT transformed; see convention C-6. Must be called
 *  synchronously in `setup`. */
export function useFancyId(): string;

/** Verbatim from `_internals/id.ts`, throw and all. Only for an id minted inside
 *  an event handler. Never call it on a render path. */
export function uid(prefix?: string): string; // default prefix "fui"
```

`useFancyId()` returns Vue's `useId()` untransformed, so ids read `v-0`, `v-1`, … (D-V16) rather
than Svelte's `svelte-…` or React's `«r0»`. React's `prefix` parameter is dropped: Vue's generator
already namespaces per app instance, and a hand-added prefix would be a second, unenforced
convention. Multiple apps on one page are separated with `app.config.idPrefix` (verify), which is
a consumer concern and not this package's business.

### React foundations with no Vue analogue — the explicit list

| React file | Why Vue has nothing |
|---|---|
| `dom/types.ts` (`ElementRef`) | Existed only because `@types/react` 18 and 19 disagree on `RefObject`'s mutable/readonly shape across a `^18 \|\| ^19` peer range. Vue's peer range is a single major, and `Ref<T \| null>` / `WatchSource<T \| null>` are stable types. |
| `dom/use-element-ref.ts` | Its whole job was to turn a ref into *state* so a `[node]`-keyed effect re-runs when a conditional node appears. `watch(templateRef, cb, { flush: 'post' })` already does that, with no extra render (React's D-12 disappears). |
| `dom/use-event-callback.ts` | Existed to give a listener a permanently stable identity that still calls the newest closure. C-2's options getter *is* that: the core holds `() => options().onX?.()` and reads through on every call. |
| `dom/use-live-ref.ts` | Same reason. A getter over a `ref`/prop is the live read. |
| `dom/use-composed-refs.ts` | Survives in reduced form as `dom/compose-refs.ts`: no hook rules, no `assignRef` cleanup channel, built once in `setup`. |
| `dom/use-inert-attribute.ts` | Existed because React 18 drops `inert={true}` and React 19 rejects `inert=""`. Vue binds `:inert` as an ordinary attribute, and the only *dynamic* `inert` in this package is written imperatively by the presence core through `toggleAttribute`. |
| `dom/ssr.ts` — `useIsomorphicLayoutEffect` | Vue fact 1: there is one phase (§4). |
| `dom/ssr.ts` — `useIsHydrated` | Existed so `Portal` could render `null` on the server *and* the hydration render. Vue's `<Teleport>` resolves at patch time, and every portalled surface sits inside `v-if="presence.mounted"` (D-V6), so the hazard has no way in. |
| `dom/ssr.ts` — `useConstant` | `setup` runs exactly once per instance. A `const` is the constant. |
| `client-boundary` / `"use client"` banner | Vue has no server/client component split. `vue/vite.config.ts` is `react/vite.config.ts` minus that plugin. |
| `markSurfaceState` | Existed because Svelte's scheduler skips effects in an inert (outroing) branch. Vue's leaving subtree stays mounted and reactive under `usePresence`, so `:data-state="presence.surfaceState"` is an ordinary binding (D-V7). |
| all 73 `*.test.svelte` harnesses | A Svelte component needs its own file; a Vue test does not (§9.2). |

---

## 3. The load-bearing seven, plus `scroll-lock` and `id`

### House shape

> **A core is the Svelte action's body, verbatim, exported as `attachFoo(node, options)` returning
> `{ update?, destroy }`. A composable is `useFoo(el, () => options)`: it attaches from a
> `flush: 'post'` watcher on `el`, calls `handle.update()` from an explicit watcher over the option
> fields the core stores as locals, and disposes through `onScopeDispose` / `onBeforeUnmount`.
> Option names, defaults and doc comments are copied from the Svelte source unchanged unless listed
> in §10.**

Five of these modules have a Svelte test file that calls the raw action (`focus-trap.test.ts` at
720 lines, `dismissable.test.ts`, `anchor-position.test.ts`, `in-view.test.ts`,
`sound-feedback.test.ts`). Those five ship the core with the action's exact body, so the test files
transpose with a changed import line and no Vue at all (§9.3).

**No composable exposes `destroy()`** (D-V12) — teardown is `onScopeDispose`, the Vue equivalent of
"call it from the consumer's teardown", and it cannot be forgotten. That closes, among other things,
the latent typeahead-timer leak `DropdownMenuContent.svelte` has today (it never calls
`focus.destroy()`). The factories keep their `destroy()`.

---

### 3.1 `internals/anchor-position.ts` + `internals/use-anchor-position.ts`

**Verbatim from Svelte** (minus the `svelte/action` type import): `computePosition`,
`OPPOSITE_SIDE`, `isHorizontalSide`, `clamp`, `getDefaultViewport` (already returns `Infinity`
off-browser), `overflows`, `placeAt`, `resolveAlign` including its `extent <= 0` early return, and
the types `Side`, `Align`, `ComputePositionOptions`, `ComputePositionResult`.

**`attachAnchorPosition` comes from React**, because it carries the two edits wave 0 upstreams to
Svelte (D-14 → D-V17): the floating element is measured from `offsetWidth`/`offsetHeight` with the
rect as a fallback (the rect reports the box *after* transforms, and every anchored surface is
mid-entrance — pinned at `scale(0.92)` by the presence clock — the first time this runs), and
`destroy()` calls a `reset()` clearing the inline `position`/`left`/`top` it wrote.

```ts
export interface AnchorPositionOptions {
  anchor: () => HTMLElement | null;
  side?: Side; align?: Align; offset?: number;
  onPlacement?: (side: Side, align: Align) => void;
}
export interface AnchorPositionHandle { update(options: AnchorPositionOptions): void; recompute(): void; destroy(): void }
export function attachAnchorPosition(node: HTMLElement, options: AnchorPositionOptions): AnchorPositionHandle;

// use-anchor-position.ts
export interface UseAnchorPositionOptions {
  /** A node, a ref, or a getter for a moving/virtual target. Keeps the Svelte getter. */
  anchor: WatchSource<HTMLElement | null> | HTMLElement;
  side?: Side; align?: Align; offset?: number;
  /** Stop positioning without unmounting. Default true. */
  enabled?: boolean;
  /** Bumped to force a recompute when geometry moved but no option did — only
   *  `ContextMenuContent` passes one. */
  recomputeKey?: string | number;
  /** First placement, then only on a real change. Most consumers want the RETURN VALUE. */
  onPlacement?: (side: Side, align: Align) => void;
}
export interface ResolvedPlacement { readonly side: Side; readonly align: Align }

/** Positions `node` with `position: fixed` against a live anchor. Returns the placement as
 *  ACTUALLY resolved — flipped and/or clamped. */
export function useAnchorPosition(
  el: WatchSource<HTMLElement | null>,
  options: () => UseAnchorPositionOptions
): Readonly<Ref<ResolvedPlacement>>;
```

**Why it returns the placement.** Twelve anchored components repeat the same five lines today
(`DropdownMenuContent.svelte:45–52,183–185` is canonical): two `$state` locals and an `onPlacement`
that writes them. The ref collapses that to one line in all twelve. `onPlacement` is retained for
`SubContext.setPlacement`, which publishes upward into a parent context instead of rendering locally.

**Seeding.** The ref starts at the *requested* values —
`{ side: options().side ?? "bottom", align: options().align ?? "center" }` — matching
`resolvedSide = $state<Side>(root.side)`. A hardcoded `"bottom"` seed is a one-frame
`transform-origin` jump on every open.

**Mechanics.** One watcher keyed `[el, () => options().enabled ?? true]`, `flush: 'post'`, attaches
and destroys the core (plus `onScopeDispose`); a second over
`[() => options().side, () => options().align, () => options().offset, () => options().recomputeKey]`
calls `handle.update()`. `anchor` and `onPlacement` are never watched — the composable hands the core
getter closures over `options()`, which is why React's `useEventCallback`/`useLiveRef` layer has no
counterpart here. The placement is a `shallowRef` written only on a real change, so a scroll storm
produces zero re-renders.

**`:style` and SSR.** The core writes `position`/`left`/`top` imperatively; a port may bind
`:style="{ transformOrigin: originFor(side, align) }"` on the same element but **must never** put
those three in that object. On the server nothing runs and the element renders unpositioned, exactly
as in Svelte.

---

### 3.2 `internals/Portal.vue`

The Svelte action *moves* an already-rendered node; `<Teleport>` *renders into* the target. Same
resulting DOM, different route.

```vue
<script lang="ts">
export interface PortalProps {
  /** Element, CSS selector, or undefined for `document.body`. A selector matching nothing
   *  falls back to `document.body`. */
  target?: HTMLElement | string;
  /** Render children in place instead of portalling. */
  disabled?: boolean;
}
/** Verbatim `resolveTarget` from React's Portal.tsx. Browser-only. */
export function resolvePortalTarget(target?: HTMLElement | string): HTMLElement;
</script>

<script setup lang="ts">
defineOptions({ name: "Portal", inheritAttrs: false });
const props = defineProps<PortalProps>();
defineSlots<{ default?: () => unknown }>();

// Evaluated at patch time, never in a lazy initializer. On the server there is no document
// to resolve against and the selector is what Vue's SSR payload keys on, so the string is
// handed through; the client resolves the same string to the same element.
const to = computed(() =>
  typeof document === "undefined" ? "body" : resolvePortalTarget(props.target)
);
</script>

<template>
  <Teleport v-if="!disabled" :to="to"><slot /></Teleport>
  <slot v-else />
</template>
```

**Placement rule — the inverse of React's, and it is load-bearing.** `<Portal>` goes **inside**
`v-if="presence.mounted"`, not around it:

```vue
<template v-if="presence.mounted">
  <Portal>
    <div :ref="scrimRef" … />
    <div :ref="panelRef" … />
  </Portal>
</template>
```

React had to put `<Portal>` outside the gate because its `usePortalTarget` resolves in a layout
effect and renders `null` on its first pass, silently swallowing the registered legs and skipping the
entrance animation. `<Teleport>` has no such pass — it resolves its target during the patch that
creates it, so children are attached before any post-flush watcher runs. Leaving it outside the gate
instead costs a permanently-mounted empty container and an SSR payload for a closed surface, so the
gate goes outermost (D-V6). SSR: a closed surface emits nothing; an open one is emitted **inline in
the document body**, not into the `#teleports` payload. Measured on the example app's `/overlay`
page (`nuxt generate`, Nuxt 4.5): the teleported markup lands ahead of `#__nuxt`, wrapped in
`<!--teleport start anchor-->` / `<!--teleport anchor-->`, with `<!--teleport start--><!--teleport end-->`
left as the in-tree placeholder and `<div id="teleports">` emitted **empty**. So do not reach for
`#teleports` when reasoning about a portalled surface's server output, and do not treat an empty
`#teleports` as evidence that a Teleport failed to render.

---

### 3.3 `internals/dismissable.ts`

The module-scope `Layer` interface, the `layers` array, `isTopLayer()`'s **downward scan past
inactive layers**, both handlers, and the deliberate ordering of the `isActive()` guard *before*
`stopImmediatePropagation()` are copied **verbatim from Svelte, comments included**. This module's
entire value is the nested-overlay contract and it must not drift. A module-scope array declaration
is not a side effect; `sideEffects: ["**/*.css"]` stays honest.

```ts
export interface DismissableOptions {
  onDismiss: () => void;
  /** Escape dismisses. Default true. */
  escape?: boolean;
  /** A pointerdown outside dismisses. Default true. */
  outsideClick?: boolean;
  /** Elements that do not count as "outside" — typically the trigger. Getter, resolved at
   *  event time. Verbatim Svelte. */
  exclude?: () => (HTMLElement | null)[];
  /** Whether this layer is still LIVE. Pass `() => open`. Default always-active. Stays a
   *  GETTER (D-V14). */
  active?: () => boolean;
  /** Whether the layer is registered at all. Default true. Composable-level only. */
  enabled?: boolean;
}
export interface DismissableHandle { update(options: DismissableOptions): void; destroy(): void }
export function attachDismissable(node: HTMLElement, options: DismissableOptions): DismissableHandle;
export function useDismissable(el: WatchSource<HTMLElement | null>, options: () => DismissableOptions): void;
/** Test-only. Not exported from index.ts. */
export function __dismissableLayerCount(): number;
```

**Action → composable.** One watcher keyed `[el, () => options().enabled ?? true]`, `flush: 'post'`,
attaches the core; `onScopeDispose` destroys it. A second, over
`[() => options().onDismiss, () => options().escape, () => options().outsideClick]`, calls
`handle.update()` — those three are the fields the core stores as locals. `active` and `exclude` are
**not** watched and never need `update()`: they are getters the core calls at event time, which is
the whole point of the Svelte design and the reason a closing layer still answers correctly. Nothing
here is rendered, so no reactive state is created.

**Known limitation, documented rather than fixed.** Vue mounts children before parents, so two
overlays mounting in the **same** flush push inside-out, inverting `isTopLayer()`. Reaching it needs
an ancestor and a descendant overlay opening together on first paint; in every real case a layer
mounts when it opens and is portalled to `document.body`, so push order equals open order. Sorting
the stack by document order would change dismissal semantics for the ordinary case and is not what
Svelte does. (Identical to React's D-11; not a Vue-specific divergence.)

---

### 3.4 `internals/focus-trap.ts`

`FOCUSABLE_SELECTOR`, `getFocusableElements`, `focusContainerFallback`, `focusInitial`, the
Tab/Shift+Tab cycling handler, `rearm()`'s `activeElement` recapture with its `document.body`
exclusion, and the **three-step return chain** (original element if connected → `fallbackFocus()` if
connected → `document.body` with an explicitly set `tabindex="-1"`) with its `returned` latch are all
**verbatim from Svelte**.

`isVisible` takes React's version (D-13 → D-V17): it walks the ancestor chain for a `display: none`.
`display` does not inherit, so a control inside a hidden subtree looks focusable in isolation while
`.focus()` on it is a silent no-op — leaving focus outside the modal, the one thing the module exists
to prevent. `visibility` is still read from the element's own computed style, because it does inherit.

```ts
export interface FocusTrapOptions {
  initialFocus?: WatchSource<HTMLElement | null> | HTMLElement | null;
  /** Restore focus on unmount. Default true. Does NOT govern `returnFocusNow()` — asking for
   *  the eager return IS asking for the return. (Verbatim contradiction rule.) */
  returnFocus?: boolean;
  fallbackFocus?: () => HTMLElement | null | undefined;
}
/** The two functions Svelte hands out through `onActivate`. Vue simply RETURNS them: a
 *  composable can return a value, an action cannot (D-V8). */
export interface FocusTrapHandle {
  /** Runs the three-step return chain IMMEDIATELY and disarms the unmount return. Idempotent.
   *  Called at the dismiss instant, by `usePresence`'s `onExitStart`. */
  returnFocusNow(): void;
  /** Undoes that latch and pulls focus back inside, recapturing the element it displaced.
   *  Called at `onEnterStart` when a surface is reopened mid-exit. */
  rearm(): void;
}
export interface FocusTrapCoreHandle extends FocusTrapHandle { update(options?: FocusTrapOptions): void; destroy(): void }
export function attachFocusTrap(node: HTMLElement, options?: FocusTrapOptions): FocusTrapCoreHandle;
/** Identity-stable handle, safe to hand to `usePresence` in `setup`. Attaches from a
 *  post-flush watcher, so focus lands before paint. */
export function useFocusTrap(el: WatchSource<HTMLElement | null>, options?: () => FocusTrapOptions): FocusTrapHandle;
```

**The handle must be a stable façade.** `useFocusTrap` is called in `setup`, where the element is
still `null` and the core does not exist, and `usePresence`'s `onExitStart` closure is built in the
same `setup`. So the composable returns a small object created once —
`{ returnFocusNow() { core?.returnFocusNow(); }, rearm() { core?.rearm(); } }` — whose identity never
changes and whose methods are no-ops until the core attaches. Returning the core handle directly, or
a `computed`, is a port error.

**Ruling: `onActivate` is not ported, and `active: boolean` is rejected.** `onActivate` exists only
because a Svelte action has no return channel to its template (`focus-trap.ts:83`); returning the two
functions is the *literal* port. An `active` boolean would need its own watcher plus a first-run
guard for the same two moments, and it drops the `returnFocus: false` + eager-return contradiction
rule the source spells out. `DialogSurface`'s two module-level `let`s, two handlers and `onActivate`
closure collapse to two lines.

**Why `rearm` is still needed.** A reopen mid-exit does **not** remount: `usePresence` keeps
`mounted` true through the whole exit, so the core is still attached and the `returned` latch still
set. This is the strongest argument for `usePresence` keeping the node mounted — and against
`<Transition>`, which cannot keep it mounted at all (§5.3).

---

### 3.5 `internals/field.ts`

The module where Vue's shape fidelity pays off most: **the whole file ports verbatim.**
`FieldContext`, `FieldStateOptions` — *with its nine getter fields intact* — and `createFieldState`
are copied byte-for-byte from `field.svelte.ts`, comments included. React had to flatten the nine
getters to values and rebuild the object through a nine-entry `useMemo`; Vue does not.

```ts
export interface FieldContext {
  readonly controlId: string;
  readonly labelId?: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly valid?: boolean;        // optionality and its full doc comment kept verbatim
  readonly required: boolean;
  readonly disabled: boolean;
}
/** Verbatim. Every entry stays a getter. */
export interface FieldStateOptions {
  controlId: () => string;
  labelId: () => string | undefined;
  descriptionId: () => string;
  errorId: () => string;
  hasDescription: () => boolean;
  hasError: () => boolean;
  valid: () => boolean;
  required: () => boolean;
  disabled: () => boolean;
}
/** Verbatim: same `describedBy` join order, same "error always wins" rule inside `valid`. */
export function createFieldState(options: FieldStateOptions): FieldContext;

export const FIELD_KEY: InjectionKey<FieldContext>;
/** The Vue `getField()`. Returns `undefined` outside a FormField, per contract. */
export function useField(): FieldContext | undefined;   // inject(FIELD_KEY, undefined)
```

`FormField` publishes it in `setup`:

```ts
provide(FIELD_KEY, createFieldState({
  controlId: () => controlId,
  labelId: () => (props.label ? labelId : undefined),
  descriptionId: () => descriptionId,
  errorId: () => errorId,
  hasDescription: () => Boolean(props.description),
  hasError: () => Boolean(props.error),
  valid: () => props.valid === true,
  required: () => props.required === true,
  disabled: () => props.disabled === true,
}));
```

**Why this is not merely convenient but correct.** `field.svelte.ts`'s header argues that
`describedBy` must be **derived on read**, never registered from a mount effect, so the
server-rendered `aria-describedby` already points at a paragraph the same pass rendered. That
transfers untouched: `:aria-describedby="field?.describedBy"` runs the getter during render, on the
server as on the client, and the reads inside it are tracked by whatever computed or render effect
asked. There is no step between "the paragraph is in the DOM" and "the id is in the list".

**Consumers.** `const field = useField()` in `setup`; every read is a plain property access. Do not
spread the context and do not wrap it in `reactive()` — both freeze the getters into values at the
moment of the copy.

---

### 3.6 `internals/menu.ts`

`compareDocumentOrder` (with its identity case), `visibleTextOf` (with the `aria-hidden` skip),
`isDisabled` (with its native-`disabled` branch), `orderedItems()`'s `isConnected` filter,
`findNext`'s bounded walk, the `-1`-means-"one before the first" convention, `focusAt`,
`indexOfFocused`, `register` with its duplicate refusal, `move`, `moveToEdge`, `focusItem`, `clear`,
`clearBuffer`, `labelOf`, `typeahead` (repeat-character cycle, `buffer = lower` collapse, the 500 ms
`TYPEAHEAD_TIMEOUT_MS`) and `destroy` are **verbatim**. The single edit is
`let focusedElement = $state<HTMLElement | null>(null)` →
`const focusedElement = shallowRef<HTMLElement | null>(null)` plus `.value` at its read/write sites.
**`shallowRef`, not `ref`:** the value is a DOM element and must never be proxied.

```ts
export interface MenuFocusOptions {
  loop?: boolean;                                                 // read lazily on every call
  onFocusChange?: (index: number, element: HTMLElement) => void;  // read lazily on every call
}
export interface MenuFocusState {
  /** Computed on read from the live ordered list, exactly like the Svelte getter — and
   *  reactive here, because `focusedElement` is a ref. */
  readonly focusedIndex: number;
  register(element: HTMLElement): () => void;
  move(delta: number): void;
  moveToEdge(edge: "first" | "last"): void;
  focusItem(element: HTMLElement): void;
  clear(): void;
  typeahead(char: string): void;
  destroy(): void;
}
/** Signature unchanged, so `menu.test.ts` transposes with only the import path changed. */
export function createMenuFocus(options?: MenuFocusOptions): MenuFocusState;
/** One store per component; `destroy()` on scope dispose (D-V12). Identity NEVER changes —
 *  put it straight into a context value. */
export function useMenuFocus(options?: MenuFocusOptions): MenuFocusState;
/** One line in each item component: registers on mount, unregisters on scope dispose. */
export function useMenuItem(menu: MenuFocusState, el: WatchSource<HTMLElement | null>): void;
```

React's `subscribe()` / `useMenuFocusedIndex` / `useSyncExternalStore` layer is **not ported**: it
existed only because React cannot render off a plain mutable field. `focusedIndex` is a real reactive
getter here, and the module's own warning ports with the comment — *"do not drive rendering off this
number reactively. Use `:focus` or `onFocusChange` for that."* Registration order is irrelevant:
`orderedItems()` sorts by `compareDocumentPosition` at navigation time, which is what makes the
source's promise (*items navigate in DOM order, not registration order*) survive any mount ordering.

**`DropdownMenuContent`'s `tick()` stays as `nextTick()` (D-V13).** React dropped it (its D-9)
because React runs child effects before parent effects. Vue also mounts children first, but the call
site is not a parent mount hook: `moveToEdge(edge)` is invoked from the open handshake — a
`flush: 'post'` watcher that can run in the same flush that created the items — and scoped-slot items
may be created in a later flush. Keeping it is the fidelity-preserving choice; dropping it is a
behaviour change only a test may license.

---

### 3.7 `internals/listbox.ts`

`findNext`, the `NONE` sentinel, `commitActive`'s same-index no-op guard (the single write site,
which is what makes the `$state` → `ref` change a one-liner), `setActive`'s "a disabled index is left
alone, never activated" rule, `move`'s "-1 is not a position" rule, the edge walks, and the whole
typeahead block (repeat cycle, buffer collapse, the deliberate `"sse"` → `"se"` decision) are
**verbatim**. `setActive`'s range guard — an index outside `0..count()-1` rejected before `enabled`
is consulted — arrives with the Svelte file once wave 0 upstreams it (D-V17).

```ts
export interface ListboxOptions {
  count: () => number;                       // getter kept (D-V14)
  enabled?: (index: number) => boolean;
  onActiveChange?: (index: number) => void;
  loop?: boolean;
}
export interface ListboxState {
  readonly activeIndex: number;              // reactive getter over a ref
  move(delta: number): void;
  moveToEdge(edge: "first" | "last"): void;
  setActive(index: number): void;
  typeahead(char: string, labelAt: (index: number) => string): void;
  destroy(): void;
}
/** Verbatim options shape — `listbox.test.ts` (458 lines, already pure) transposes with only
 *  the import path changed. */
export function createListbox(options: ListboxOptions): ListboxState;
/** Create + `onScopeDispose(destroy)`. The returned state IS the handle: no second interface,
 *  no memo dance, no `subscribe`. */
export function useListbox(options: ListboxOptions): ListboxState;
```

This is the one index that must drive rendering, and in Vue that is free: `Select` binds
`:aria-activedescendant="optionId(listbox.activeIndex)"` and each row reads
`listbox.activeIndex === index`. React needed `useSyncExternalStore`, a `-1` server snapshot, a
`useMemo` on the handle and an explicit rejection of a two-context split; none of that exists here.
The server value is `-1`, the honest pre-interaction value on all three sides. `Select`'s clamp
effect (*"activeIndex can end up pointing past the end of the new, shorter array"*) stays in
`Select`, as `watch(() => options.length, …)`. It is component logic.

---

### 3.8 `internals/scroll-lock.ts`

`lockScroll()` is **verbatim**: the whole header comment (the `position: fixed` vs `overflow: hidden`
reasoning with its iOS rationale, the scrollbar-gutter measurement, the skip-the-write-when-the-
gutter-is-zero rule), the `LockedState` shape, the module `lockCount` and `saved`, and the idempotent
`released` latch.

```ts
export function lockScroll(): () => void;   // verbatim

/**
 * Acquires while mounted and `enabled()` (default true).
 *
 * TIMING RULE FOR PORTS: pass `() => presence.mounted` — the value that stays true through
 * the WHOLE exit — and NEVER `() => open`. The Svelte action's entire reason for existing is
 * release timing: an effect keyed on `open` releases the instant `open` flips, leaving the
 * page scrollable under a scrim still on screen.
 *
 * `onBeforeUnmount`, never `onUnmounted`: the DOM is still attached, which is what an
 * action's `destroy()` guarantees.
 */
export function useScrollLock(enabled: () => boolean = () => true): void {
  let release: (() => void) | null = null;
  onMounted(() => { if (enabled()) release = lockScroll(); });
  watch(enabled, (on) => {
    if (on && !release) release = lockScroll();
    else if (!on && release) { release(); release = null; }
  }, { flush: "post" });
  onBeforeUnmount(() => { release?.(); release = null; });
}
```

`onMounted`, not a post-flush watcher with `immediate`: both land in the same pre-paint flush, and
`onMounted` states the intent. A post-*paint* lock is a visible one-frame scroll jump on a long page.
The mount/unmount-twice leak suite (§9.4) works only because `saved` is re-captured on each
`lockCount === 0` transition and `released` is per-acquisition — both already true in the Svelte
source.

---

### 3.9 `internals/use-id.ts`

See §2. `id.test.ts` transposes verbatim (monotonicity, prefix, and the server throw under
`@vitest-environment node`), against `uid` only.

---

## 4. Effect-phase policy

**The whole rule, in one line: `flush: 'post'` or `onMounted` for everything DOM-visible;
`flush: 'pre'` only at the two `$effect.pre` sites; `watchEffect` never.**

React needs a two-row table (`useLayoutEffect` vs `useEffect`) because its passive phase runs after
paint. Vue has one phase that matters: `onMounted`, `flush: 'post'` watcher callbacks and template-ref
assignment all land in the same flush, before the browser paints (verify). So there is nothing to
choose between, and the rule is about *ordering within* that flush, not about which phase to pick.

**Why `watchEffect` is forbidden, in three parts.**

1. **Its default flush is `'pre'`** — it runs *before* the DOM patch, so any element read sees the
   previous frame's DOM. Every module in §3 exists to touch a node that this frame created.
2. **It runs once, immediately, during `setup` — including on the server** (verify). A
   `document` / `window` / `matchMedia` read inside one therefore executes in the SSR render and
   breaks C-7 and the Nitro import sweep at the same time. `watch(source, cb)` without `immediate`
   never runs on the server, which is exactly the property every module here relies on.
3. **Its dependency set is whatever it happened to touch.** Reading one field of an options object
   subscribes to every reactive value that read passed through, so an unrelated prop change
   re-runs the effect and thrashes a listener set. An explicit `watch([…])` states the deps the
   way an action's `update()` states them.

`watchPostEffect` is permitted only where the dependency set is genuinely dynamic, and only when
registered from inside `onMounted`, so the server never evaluates it. There are no such sites in
this scope; if a port thinks it has one, it is probably an explicit `watch` in disguise.

| Module | Phase | Why |
|---|---|---|
| `useAnchorPosition`, `useFloat` | `watch(el, …, { flush: 'post' })` | A post-paint position is a visible jump from (0,0) |
| `useFocusTrap` | `watch(el, …, { flush: 'post' })` | Focus must land before the user's first frame |
| `useScrollLock` | `onMounted` + `watch(enabled, …, { flush: 'post' })` | A post-paint lock is a visible scroll flash |
| `usePresence` driver | `onMounted` + `watch([open, mounted], …, { flush: 'post' })` | Legs must start before paint, and only once every registered node has attached |
| `usePresence` teardown | `onBeforeUnmount` | The DOM is still attached; matches an action's `destroy()` |
| `useAutoscroll` pin | `watch(el, …, { flush: 'post' })` | Writes `scrollTop`; a post-paint write is a visible jump |
| `useInView` | `watch(el, …, { flush: 'post' })` | The no-`IntersectionObserver` fail-visible branch calls `onChange(true)` synchronously in Svelte |
| `useDismissable` | `watch(el, …, { flush: 'post' })` | Document listeners and a stack push; nothing is visible in the first frame |
| `useSoundFeedback` | `watch(el, …, { flush: 'post' })` | Passive listeners only |
| menu / listbox item registration | `onMounted` (children mount before parents) | Must be registered before the parent's own post-flush work |
| `hydrateSound()` | `onMounted`, from `useSound()` | Reads `localStorage`; must never run on a render path (D-V15) |
| `createMediaQuery().start()` | `onMounted`, stopped in `onScopeDispose` | Reads `matchMedia`; returns `fallback` on the server and on the hydration render |
| `TabsTrigger`'s focus capture | `watch(source, cb, { flush: 'pre' })` | One of the two `$effect.pre` sites: it must read `document.activeElement` *before* this flush's DOM patch applies `disabled` |
| `PromptSuggestions`' generation bump | `watch(() => visible, cb, { flush: 'pre' })` | The other one: the re-key and the unhiding must land in the same DOM update, or the previous pills show for a frame |

Those two are the **only** `flush: 'pre'` sites in the package. A third one appearing in a port is a
review stop.

---

## 5. The motion subsystem — `vue/src/internals/motion/`

### 5.1 The one mechanism, chosen once

`transitions.ts`'s `preset()` and `anchored.ts`'s `anchored()` are **css-only transitions with a JS
easing function**. `JS_EASINGS.out` is `expoOut`, which is not expressible as a CSS `cubic-bezier`
— `EASINGS.out` is a hand-matched CSS *approximation* the sources keep, deliberately separate, for
CSS-driven components.

The decisive fact is unchanged from React's §5.1: **Svelte's css transitions already are WAAPI.**
Svelte's own `animate()` samples `css(t, 1 - t)` at `n = Math.ceil(duration / (1000 / 60))` points and
hands the resulting keyframe array to `element.animate()`. Running that algorithm against the same
`cssFor()` produces a byte-identical array and therefore a pixel-identical animation — fidelity is
structural, not aspirational. It also inherits the `duration: 0` reduced-motion fast path, reversal
from an in-flight position, a shared clock across several elements, and jsdom testability through the
`Element.prototype.animate` stub the Svelte suite already uses.

| Svelte source uses | Vue port uses |
|---|---|
| `transition:` on `{#if}` (22 sites) + `onintrostart` / `onoutrostart` (17) | `usePresence(() => open, { onEnterStart, … })` + `presence.register(key, transition, params)` + `v-if="presence.mounted"` |
| split `in:` / `out:` on keyed rows, `{#key}` (10 sites) | `<Transition :css="false">` / `<TransitionGroup :css="false">` with `runTransition` in the JS hooks (§5.5) |
| `<style>` block + `data-state` | `<style scoped>` in the same SFC + the same `data-state` attribute |

`Presence`, `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `HoverCard`, `Select`, `DropdownMenu`,
`ContextMenu`, `Sheet`, `Drawer`, `FormField`, `StickyScroll` and `Toast` take the first row.
`Reveal`, `Pressable`, `StatusMorph`, `Skeleton`, `SoundToggle` and `ContextRing` take the third and
need nothing here but `useReducedMotion`.

`motion/{types, presets, stagger, haptics, raf, tokens, transitions, anchored}` are verbatim from
Svelte (import lines only); `tokens.ts` takes its easing from `motion/easing.ts`, which is copied
from React because the framework's easing module cannot become a runtime dependency (D-7 → shared).
`prefersReducedMotion()` stays a plain function inside `anchored.ts`, verbatim, with its "never at
module scope or during render" warning intact.

### 5.2 `motion/animate.ts` — copied from React, byte-identical

`runTransition` and `cssToKeyframe` are **not re-derived**; the file is copied out of
`react/src/internals/motion/animate.ts` and listed in the identity manifest (§13). It imports only
`./transitions.js` (a type) and `./easing.js`, so it is framework-free by construction.

The six load-bearing points of the algorithm, restated so a reviewer can check a port against them
without opening the file:

1. `counterpart?.deactivate()` runs first, before anything else.
2. **`spec.duration` falsy → `onFinish()` runs SYNCHRONOUSLY and `element.animate()` is never
   called.** The handle is `{ abort: noop, deactivate: noop, t: () => to }`. This is the
   reduced-motion fast path, and it is why a reduced-motion close is synchronous: `mounted` flips
   inside the same flush.
3. **A leading dummy animation is ALWAYS created**, even at `delay: 0`. Its keyframes are
   `[cssToKeyframe(css(0, 1)), cssToKeyframe(css(0, 1))]` only for a fresh intro, `[]` otherwise.
   Consequence: **the main animation always starts asynchronously**, in the dummy's `onfinish`.
4. In that `onfinish`: cancel the dummy, then `t1 = counterpart?.t() ?? 1 - to`, then
   `counterpart?.abort()` — read before abort. Then `delta = to - t1`,
   `duration = spec.duration * Math.abs(delta)`.
5. `n = Math.ceil(duration / (1000 / 60))`, loop `i = 0 … n` **inclusive** (n+1 keyframes),
   `t = t1 + delta * easing(i / n)`. The curve lives entirely in the sample positions:
   `element.animate(keyframes, { duration, fill: "forwards" })` — **no `easing` option, no `delay`
   option**.
6. `t()` returns `1 - to` before the dummy finishes, `t1 + delta * easing(currentTime / duration)`
   while running, and `to` after the main animation's `onfinish`.

Two lifecycle rules follow, and both are visible if broken. **On enter finish, abort the run** —
that removes `fill: forwards` so the element returns to its resting style, which *is* the visible
end state. **On exit finish, do NOT abort** — the node stays in the DOM until the `mounted = false`
patch lands, and dropping fill-forwards flashes it back to visible for a frame. Both live inside
`createPresenceCore`, so a port gets them for free and must not re-implement them.

**No jsdom production fallback.** There is no `canAnimate() === false` `setTimeout` branch — Svelte
has none, and inventing one puts an untested code path in production. jsdom is handled by the
`Element.prototype.animate` stub in `test-setup.ts` (§9), which is mandatory.

### 5.3 `motion/presence.ts` — why not `<Transition>`, and the Vue binding

Vue ships a transition primitive. It is not used for presence, for four independent reasons — any
one of which alone would be disqualifying.

1. **Teardown at leave start.** `<Transition>` delays DOM *removal*; it does not delay component
   teardown. `onBeforeUnmount` runs and the effect scope stops when the leave begins. So a scroll
   lock, a dismissable layer and a focus trap inside the leaving subtree all release at the instant
   the fade starts — the page becomes scrollable under a scrim still on screen, and a second Escape
   reaches the dialog underneath. `DialogSurface.svelte`'s comment block names that bug explicitly
   as the reason `scrollLock` is an action and not an `$effect`. `usePresence` keeps the subtree
   mounted to the end, so every cleanup lands exactly where Svelte's outro-delayed `destroy()` put
   it, and **no other module in this package needs a "delay my teardown" mechanism**.
2. **No reversal position.** A dialog reopened during its 200 ms fade must resume from where the
   fade actually got to. `<Transition>` cancels the leave and starts a fresh enter from the far end
   — a visible snap. `runTransition`'s `counterpart` handoff (§5.2, point 4) is the whole
   mechanism, and it requires one bidirectional leg owned by one clock.
3. **No shared clock.** A dialog's scrim and panel are two elements that must leave together, with
   the subtree destroyed when the **last** one finishes — Svelte's own rule. Two `<Transition>`s are
   two independent clocks and a straggler.
4. **No pixel identity.** The port's promise is the same sampled keyframe array Svelte produces.
   `<Transition :css="false">` could call `runTransition` from its hooks, but that buys nothing over
   owning the clock and still loses 1–3.

So: **`createPresenceCore` is copied verbatim from `react/src/internals/motion/presence.ts`** —
the slot map, the shared `leg`, the `starting` guard, `settle()`'s last-one-wins rule, `beginEnter`
/ `beginExit`, the `inert` `toggleAttribute` writes, `sync()`'s two-pass mount, `teardown()`, and
the `pendingLeg` resume (harmless in Vue, which has no double-invoke, and kept because the file is
byte-shared) — and only the binding is written for Vue.

```ts
export type PresenceState = "opening" | "open" | "closing";

export interface UsePresenceOptions {
  /** Animate an entrance when `open` is ALREADY true on the very first render.
   *  Default FALSE, reproducing Svelte's rule that a LOCAL `transition:` never plays on
   *  the initial render of the block that owns it, and that hydration defaults intros off. */
  appear?: boolean;
  /** Set the `inert` ATTRIBUTE on every attached node while closing, clear it on enter.
   *  Default true — Svelte sets it itself, synchronously, before the outro starts, which is
   *  what keeps a closing panel from answering a click. Vue does not, so the core does. */
  inert?: boolean;
  onEnterStart?: () => void;
  onEnterEnd?: () => void;
  /** Fires at the dismiss instant, before the exit paints. */
  onExitStart?: () => void;
  onExitEnd?: () => void;
}

export interface PresenceHandle {
  /** Render the subtree while true. Stays true through the WHOLE exit. */
  readonly mounted: boolean;
  /** Three values. For `<Presence>` and anything else whose Svelte source renders three. */
  readonly state: PresenceState;
  /** Two values — `state === "closing" ? "closing" : "open"`. THE value every anchored
   *  surface renders into `data-state` (convention C-5). */
  readonly surfaceState: SurfaceState;
  /** `=== open`. Pass to `active:` options and to params factories. */
  readonly entering: boolean;
  register<P>(transition: TransitionFn<P>, params?: P | ((entering: boolean) => P)): PresenceRef;
  register<P>(key: string, transition: TransitionFn<P>, params?: P | ((entering: boolean) => P)): PresenceRef;
}

export function usePresence(open: () => boolean, options?: UsePresenceOptions): PresenceHandle;
```

The binding, in full:

```ts
export function usePresence(open: () => boolean, options: UsePresenceOptions = {}): PresenceHandle {
  const appear = options.appear ?? false;

  const mounted = ref(open());
  const state = ref<PresenceState>("open");

  // A getter, not a captured boolean: `inert` is read at the instant an exit starts.
  const inertRef = { get current() { return options.inert ?? true; } };

  // `setup` runs once, so this is the constant React needed `useConstant` for. The
  // callbacks are read through `options` on every call, which is the Vue equivalent of
  // `useEventCallback` — no stable-identity wrapper is required.
  const core = createPresenceCore({
    setMounted: (next) => { mounted.value = next; },
    setState: (next) => { state.value = next; },
    onEnterStart: () => options.onEnterStart?.(),
    onEnterEnd: () => options.onEnterEnd?.(),
    onExitStart: () => options.onExitStart?.(),
    onExitEnd: () => options.onExitEnd?.(),
    inertRef,
  });

  // First pass. `onMounted` is the same flush as a post watcher, and every registered
  // node's function ref has already been called by the time it runs.
  onMounted(() => { core.sync(open(), mounted.value, appear); });

  // The driver. `flush: 'post'` is mandatory: `sync()`'s open-from-closed branch sets
  // `mounted` and RETURNS, so the legs start on the pass after the subtree rendered —
  // and that pass is only correct once the new nodes have attached. `immediate` is
  // deliberately absent, which is also what keeps this from running on the server.
  watch([open, mounted], ([o, m]) => { core.sync(o, m, appear); }, { flush: "post" });

  // Separate from the driver precisely BECAUSE it tears down: giving the driver a
  // cleanup would abort every leg on each reversal, the one thing this exists to avoid.
  onBeforeUnmount(() => { core.teardown(); });

  return reactive({
    mounted,
    state,
    surfaceState: computed(() => (state.value === "closing" ? "closing" : "open")),
    entering: computed(() => open()),
    register: core.register,
  }) as PresenceHandle;
}
```

**`reactive(...)`, not a plain object of refs — and this is a rule, not a taste.** A plain object's
refs are not unwrapped in a template, so `v-if="presence.mounted"` would test a `Ref` object, which
is always truthy: the surface would mount forever and its entrance would never play, with every
other assertion still passing. `reactive()` unwraps on property access in both script and template,
so there is no `.value` to forget. **A `.value` after `presence.mounted` anywhere in a template or
`<script setup>` is a port error.**

**Semantics** (unchanged from React's §5.7, since the core is the same file):

| moment | what happens |
|---|---|
| `open` false → true while unmounted | `mounted` → true, `state` → `"opening"`, `onEnterStart()`; legs start on the next pass |
| each registered node attaches | `runTransition(node, spec(entering = true), 1, run[key], …)` |
| every registered enter finishes | each run aborted (§5.2), `state` → `"open"`, `onEnterEnd()` |
| `open` true → false | `onExitStart()` fires in the post-flush watcher, `state` → `"closing"`, `inert` set unless opted out, each node runs toward `0`. `mounted` stays true. |
| every registered exit finishes | `mounted` → false; `state` resets to `"open"` so the next open never carries a stale `"closing"`; `onExitEnd()` |
| `open` flips true mid-exit | the in-flight `TransitionRun` becomes the `counterpart`, so `t1` is the current position and the entrance resumes from there. **The node is never unmounted** — which is why `onEnterStart` must call `trap.rearm()`. |
| reduced motion | the transition factory returns `duration: 0`; `runTransition` finishes synchronously; `mounted` flips in the same flush, before paint |

**Params are read at leg start, never at render time.** `params` may be a value or a
`(entering: boolean) => P` factory, and the factory is the documented default: `Presence.svelte`'s
central hazard is that `options.direction` reports `"both"` for a bidirectional `transition:` and
cannot tell entering from leaving — `open` can. The core stores the factory in a per-key slot
rewritten on every render, calls it at the instant each leg starts, and passes
`{ direction: entering ? "in" : "out" }` down so `preset()`'s easing default resolves correctly.

**Identity stability.** `register(...)` caches its function ref in a per-key slot, so binding
`:ref="panelRef"` never causes Vue to detach and reattach the node. Build the composed ref **once
in `setup`** (§2, `composeRefs`); building it in the template or in a `computed` re-creates it on
every patch and throws the in-flight leg away.

### 5.4 The type of a registered ref

`register()` returns `(node: HTMLElement | null) => void`. Vue calls a function `ref` with
`(el, refs)` where `el` is `Element | ComponentPublicInstance | null`, so the extra argument is
ignored and the element type is wider than the core's parameter. `composeRefs` is the adapter as
well as the merger — it narrows once, in `setup`, and every SFC binds its result. A port that binds
`register(...)` straight to `:ref` may or may not satisfy `vue-tsc` (verify); binding through
`composeRefs` always does, and is required anyway wherever a template ref is also needed.

### 5.5 `<Transition :css="false">` — the narrow legal use

The 10 split `in:` / `out:` sites are keyed rows and `{#key}` blocks: a toast entering a list, a
row replaced by key. There, Vue's own transition is correct and `usePresence` would be overkill.

```vue
<TransitionGroup
  :css="false"
  @enter="(el, done) => runTransition(el as HTMLElement, spec(el, params, { direction: 'in' }), 1, undefined, done)"
  @leave="(el, done) => runTransition(el as HTMLElement, spec(el, params, { direction: 'out' }), 0, undefined, done)"
>
  <li v-for="item in items" :key="item.id">…</li>
</TransitionGroup>
```

Legal **only** when all three hold: (a) nothing in the row's subtree owns a teardown that must land
at exit end — no scroll lock, no dismissable layer, no focus trap; (b) no reversal is required — the
row is replaced, not re-opened mid-exit; (c) one element per row, so there is no shared clock to
keep. Any surface that fails one of those uses `usePresence`. Note that `done` is the `onFinish`
callback `runTransition` already takes, and that `@enter-cancelled` / `@leave-cancelled` must call
the run's `abort()`.

### 5.6 `motion/media-query.ts`

`createMediaQuery(query, fallback)` ports **verbatim** with `let current = $state(fallback)` →
`const current = ref(fallback)`: the frozen getter object, `start()`'s tear-down-then-rebuild, the
fresh `window.matchMedia(query)` on every `start()` (never cached — a test that overrides
`window.matchMedia` wholesale must be visible to the next call), and `stop()`'s deliberate "a
stopped query keeps the last real answer" rule all stay. **`start()`/`stop()` are kept** (D-V14);
React deleted them because `useSyncExternalStore` subsumed the lifecycle, and undoing that deletion
is what lets `media-query.test.ts` transpose.

```ts
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export interface MediaQueryState { readonly current: boolean; start(): () => void; stop(): void }
export function createMediaQuery(query: string, fallback?: boolean): MediaQueryState;   // verbatim
export function createReducedMotion(): MediaQueryState;                                 // verbatim

/** Starts in `onMounted`, stops in `onScopeDispose`. Returns `fallback` on the server
 *  AND through the hydration render — the mismatch class is eliminated by construction. */
export function useMediaQuery(query: string, fallback?: boolean): Readonly<Ref<boolean>>;
/** `useMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never assumed before
 *  the browser has been asked. */
export function useReducedMotion(): Readonly<Ref<boolean>>;
```

The consuming pattern collapses from `Presence.svelte`'s three lines to
`const reduced = useReducedMotion();` and `reduced.value` inside a params factory.

### 5.7 `motion/raf.ts` and `motion/in-view.ts`

`rafThrottle` is verbatim, including the store-latest-args choice over cancel-and-reschedule and
the per-call rAF availability check. No composable wrapper: its two consumers (`Magnetic`,
`ScrollProgress`) each build one inside `onMounted` and call `.cancel()` in the matching
`onBeforeUnmount`, which is the guarantee a wrapper would have provided.

`observeInView(node, options)` is the Law-2 core, verbatim: `observerInit`, `sameObserverInit`, the
`current` indirection, the `firedOnce` flag with its full rationale, and the fail-visible branch
that calls `onChange(true)` immediately when `IntersectionObserver` is absent.

```ts
export function observeInView(node: Element, options: InViewOptions): { update(o: InViewOptions): void; destroy(): void };
export function useInView(
  el: WatchSource<Element | null>,
  options?: () => Omit<InViewOptions, "onChange"> & { onChange?: InViewOptions["onChange"]; enabled?: boolean }
): Readonly<Ref<boolean>>;
```

The Svelte `update()` already distinguishes options that require a **new observer** (`threshold`,
`rootMargin`, `root`) from options read fresh on every fire (`once`, `onChange`) — which is exactly
a watch source list plus getter reads:
`watch([el, () => o().enabled, () => JSON.stringify(o().threshold ?? 0.1), () => o().rootMargin, () => o().root], …, { flush: 'post' })`.
`firedOnce` lives in a closure variable: it survives a rebuild but not an unmount, matching the
action's per-instance lifetime. SSR returns `false`, matching Svelte's un-run action; a consumer
needing the revealed state in server HTML uses the `initial="visible"` pattern `Reveal` already has.

### 5.8 Worked example — `Presence.vue`

```vue
<script lang="ts">
export interface PresenceProps {
  open: boolean;
  preset?: PresetName; duration?: number; exitDuration?: number; delay?: number; distance?: number;
  inert?: boolean;
  class?: HTMLAttributes["class"];
  onEnterEnd?: () => void;
  onExitEnd?: () => void;
}
</script>

<script setup lang="ts">
defineOptions({ name: "Presence", inheritAttrs: false });
const props = withDefaults(defineProps<PresenceProps>(), { preset: "fade", inert: true });
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

const root = useTemplateRef<HTMLDivElement>("root");
defineExpose({ ref: root });

const reduced = useReducedMotion();
const presence = usePresence(() => props.open, {
  inert: props.inert,
  onEnterEnd: () => props.onEnterEnd?.(),
  onExitEnd: () => props.onExitEnd?.(),
});

// Built ONCE in setup: stable identity, and it feeds both the template ref and the leg.
const rootRef = composeRefs(
  root,
  presence.register(makePreset(props.preset), (entering) => ({
    duration: reduced.value ? 0 : entering ? props.duration : props.exitDuration,
    delay: reduced.value ? 0 : props.delay,
    distance: entering ? props.distance : (props.distance ?? DEFAULT_DISTANCE) / 2,
  }))
);
</script>

<template>
  <div v-if="presence.mounted" :ref="rootRef" v-bind="attrs"
       :class="cn('ft-presence', props.class)" :data-state="presence.state">
    <slot />
  </div>
</template>
```

Three values here, because `Presence.svelte` genuinely renders three (C-5). The `<style scoped>`
block ports `presence.css` verbatim.

### 5.9 Worked example — `DialogSurface.vue`, against every ordering law

```vue
<script lang="ts">
export interface DialogSurfaceProps {
  open: boolean;
  role?: "dialog" | "alertdialog";
  titleId?: string; descriptionId?: string;
  escape?: boolean; outsideClick?: boolean;
  onDismiss: () => void;
  initialFocus?: HTMLElement | null;
  fallbackFocus?: () => HTMLElement | null | undefined;
  exclude?: () => (HTMLElement | null)[];
  panelClass?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
defineOptions({ name: "DialogSurface", inheritAttrs: false });
const props = withDefaults(defineProps<DialogSurfaceProps>(), { role: "dialog", initialFocus: null });
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

// C-1: a template ref, watched — the panel is created by `presence.mounted`.
const panel = useTemplateRef<HTMLDivElement>("panel");
// C-4: exactly where the Svelte source declares `ref = $bindable(null)`.
defineExpose({ ref: panel });

// Returns the identity-stable façade Svelte hands out through `onActivate`.
const trap = useFocusTrap(panel, () => ({
  initialFocus: props.initialFocus,
  fallbackFocus: props.fallbackFocus,
}));

const presence = usePresence(() => props.open, {
  // The two halves of the focus handshake, at the two moments Svelte puts them:
  // `onintrostart` → rearm, `onoutrostart` → returnFocusNow.
  onEnterStart: () => trap.rearm(),
  onExitStart: () => trap.returnFocusNow(),
});

// LAW: release at exit END, never at exit start. `presence.mounted` stays true through
// the whole fade, so the release lands in the same teardown an action's outro-delayed
// `destroy()` landed in. NEVER `() => props.open`.
useScrollLock(() => presence.mounted);

// `active` stays a getter (C-2): the layer must stop being TOP of the stack the instant
// `open` flips, while remaining ON the stack for the whole exit.
useDismissable(panel, () => ({
  onDismiss: props.onDismiss,
  escape: props.escape,
  outsideClick: props.outsideClick,
  exclude: props.exclude,
  active: () => props.open,
}));

// Built once, in setup. The panel needs both the template ref and the presence leg.
const panelRef = composeRefs(
  panel,
  presence.register("panel", anchored, (entering) => ({
    entering, duration: DURATIONS.base, exitDuration: DURATIONS.exit,
  }))
);
const scrimRef = presence.register("scrim", anchored, (entering) => ({
  entering, scale: false, duration: DURATIONS.base, exitDuration: DURATIONS.exit,
}));
</script>

<template>
  <!-- The mounted gate is OUTERMOST; `<Portal>` sits inside it (D-V6). -->
  <template v-if="presence.mounted">
    <Portal>
      <div :ref="scrimRef" class="ft-dialog-scrim fixed inset-0 z-50 bg-black/60" aria-hidden="true" />
      <div
        :ref="panelRef"
        v-bind="attrs"
        :role="props.role"
        aria-modal="true"
        :aria-labelledby="props.titleId"
        :aria-describedby="props.descriptionId"
        tabindex="-1"
        :data-state="presence.surfaceState"
        :class="cn('ft-dialog-panel …verbatim Tailwind…', 'focus-visible:outline-none', props.panelClass)"
      >
        <slot />
      </div>
    </Portal>
  </template>
</template>

<style scoped>
/* `.ft-dialog-panel { --ft-overlay-accent: … }` ported verbatim from the Svelte block. */
</style>
```

**The ordering laws of `DialogSurface.svelte`, and how each is satisfied:**

| Law (from the Svelte comment block) | How the Vue port satisfies it |
|---|---|
| The scrim fades on opacity alone (`scale: false`) and **shares the panel's clock exactly**, so the two leave together and the destroy is a tie, not a straggler | One `usePresence`, two keys. `settle()` returns early until *every* attached slot's leg has landed, so `mounted` flips once — the source's "destroy the branch when the LAST transition finishes" rule, verbatim |
| `use:portal` runs before `use:focusTrap` so the trap never calls `.focus()` on a detached node | Dissolved: `<Teleport>` attaches its children to the target during the patch that creates them, before any post-flush watcher or `onMounted` (verify), so the panel is always connected when the trap focuses it. Keep the note in the component README (mirrors React's D-10) |
| `use:scrollLock` is an action, not an `$effect`, **for the release timing** | `useScrollLock(() => presence.mounted)`. `presence.mounted` is the only correct source; `open` releases at exit start and is the bug the law names |
| ONE bidirectional `transition:`, never a split `in:`/`out:` pair, so a reopen mid-exit continues from where it is | `presence.register` owns one leg per key, and `runTransition` takes the in-flight run as its `counterpart`. A split pair is unreachable through this API |
| `entering: open` is what tells the transition which way it is going, because `direction` reports `"both"` | The params **factory** is called with `entering` at the instant each leg starts, and the core passes a real `"in"`/`"out"` to the transition function |
| `data-state` is a static literal changed by `markSurfaceState`, because the scheduler skips inert effects during an outro | Not ported (D-V7). `usePresence` keeps the subtree mounted and reactive, so `:data-state="presence.surfaceState"` is an ordinary binding emitting the same two values (C-5) |
| `inert` is not written by hand — Svelte sets it for the whole exit | Vue does not, so the presence core does, through `toggleAttribute("inert", …)` on every attached node at exit start, cleared on a reversal. `inert: false` is the explicit opt-out |
| `returnFocusNow` at `outrostart`; `rearm` at `introstart` | `onExitStart` / `onEnterStart`, wired to the stable trap façade built in the same `setup` |
| `bind:this={ref}` on the panel | `defineExpose({ ref: panel })`, with `composeRefs` feeding both the template ref and the leg (C-4) |

**What happens on close, in order.** `open` flips false → the post-flush driver fires
`onExitStart`, so `trap.returnFocusNow()` runs the three-step return chain **immediately** (a keyboard
user does not wait out the 200 ms fade with focus stranded on `<body>`) → `state` goes `"closing"`,
`inert` is set, `data-state="closing"` renders → both `anchored` legs run toward 0 on the shared clock
→ when the last finishes, `mounted` flips false → the subtree unmounts, and in that one teardown the
scroll lock releases, the dismissable layer splices out and the focus trap's destroy path runs
(already disarmed by the `returned` latch, so focus moves exactly once). If `open` flips back true
mid-fade nothing unmounts: the in-flight runs become counterparts and `onEnterStart` calls
`trap.rearm()`.

---

## 6. The sound engine — `vue/src/sound/`

**Location and names.** `sound/` is a **sibling** of `internals/` and `components/`, mirroring
`src/lib/fancy-ui/sound/`, because the Svelte barrel exports it publicly. The controller keeps the
name `sound.ts` — only the `.svelte` infix is dropped, as with `field.ts`, `menu.ts`, `listbox.ts`.

### 6.1 Copied verbatim

`types.ts` (`SOUND_CUES`, `SoundCue`, `SOUND_THEME_NAMES`, `SoundPlayOptions`, `SoundPreferences`,
`DEFAULT_SOUND_PREFERENCES`, `SoundPreferencesV1`, `SOUND_STORAGE_KEY`, the whole synthesis
description, `SoundEngineState`, `SOUND_MIN_INTERVAL_MS`, `SOUND_LIMITS`, `SoundStatus`),
`themes.ts` (`FANCY_SOUND_THEME`, `SOUND_THEMES`, `getSoundTheme`, `validateSoundTheme`),
`engine.ts` (all ~900 lines — no runes, no framework imports: allocates nothing on create, never
throws, `disposeGeneration` guarding async continuations, the deterministic xorshift noise fill,
the voice cap admitting a cue only if all its layers fit, and **no module-evaluation access to
`window` / `navigator` / `AudioContext`**), and `web-audio-mock.ts`.

This is the point of maximum leverage in the port: the risky Web Audio is not ported, it is moved,
and all four files are three-way identity-gated (§13). `engine.test.ts` and `themes.test.ts`
transpose with no Vue at all. The `MAX_LAYER_MS` clamp React added lands on Svelte in wave 0
(ruling 7 → D-V17), so the shared bytes already carry it.

### 6.2 `sound/sound.ts` — the singleton

**Module-scope singleton. No provider, no `app.provide`, no plugin.** Three reasons, in order of
weight: (1) the `sound` prop must work with zero setup — it is an ordinary boolean on `button`,
`checkbox`, `copy-button`, `dropdown-menu`, `radio-group`, `select` and `switch`, and a provider
would make `<Button sound />` silently do nothing in an unwrapped tree, a real API break against the
Svelte package; (2) the state is genuinely global — one `localStorage` key, one cross-tab `storage`
listener, one `AudioContext`; (3) `sound.play()` must be callable from code that is not inside a
component at all, which is the source's own stated reason for the singleton.

The whole file ports verbatim with two mechanical substitutions and **one design edit**:

- `let prefs = $state<SoundPreferences>({ … })` → `const prefs = reactive<SoundPreferences>({ … })`,
  `let status = $state<SoundStatus>(…)` → `const status = reactive<SoundStatus>(…)`. Getters read
  the fields directly; `SoundController`'s shape is unchanged.
- `assignPrefs`'s write-field-by-field rule is **kept**. Its Svelte reason (never replace the
  `$state` proxy) applies to `reactive()` for the same mechanical reason — a replacement proxy is a
  different object and existing readers track the old one — so the comment ports with only the word
  `$state` changed.
- The `untrack(…)` wrappers around lazy hydration **disappear, and the hydration moves** (D-V15).

**The design edit, stated exactly.** In Svelte, `ensure()` reads `localStorage` lazily on first
getter access, inside `untrack`, because that first access happens inside a `$derived` in
`SoundToggle`. Vue has no `untrack`, a write to a reactive value inside a `computed` is a bug (the
computed re-invalidates itself), and — decisively — **Vue's production hydration does not patch a
mismatched attribute** (verify), so a client that learns the stored preference during the hydration
render would ship the server's value anyway. So:

> **Getters never write. `hydrateSound()` is explicit, idempotent, and called from `useSound()`'s
> `onMounted`.** Every controller *method* still calls `ensure()` first, verbatim; `ensure()`'s
> storage branch is gated on the `hydrated` flag that `hydrateSound()` sets.

```ts
export const sound: SoundController;                               // shape unchanged
export function getSoundStatus(): SoundStatus;                     // non-reactive snapshot
export function parseStoredPreferences(raw: string | null): SoundPreferences;  // verbatim, pure
export function resetSoundForTests(): void;                        // not in index.ts
/** Idempotent. Reads localStorage, attaches the cross-tab listener, probes AudioContext
 *  support without constructing one. Called from `onMounted`, never on a render path. */
export function hydrateSound(): void;
```

Sequence, and it is the one the `SoundToggle.svelte` SVG comment was written for: the server renders
the frozen defaults → the client's first (hydration) render returns the same defaults, so no
mismatch is possible → `onMounted` reads storage → the reactive prefs change → the toggle re-renders
with the stored value, changing only opacity and scale on a DOM shape the server already produced.

React's `subscribeSound` / `getSoundSnapshot` / `getSoundServerSnapshot` / `SoundSnapshot` trio is
**not ported**: it exists only to feed `useSyncExternalStore` and to defeat its identity check.
Vue reads the reactive fields directly. `subscribe(run)` — the Svelte store contract, calling `run`
immediately then on every change — is kept unchanged, because the docs' Sound Lab uses it.

**Lazy `AudioContext`, unchanged.** None at module evaluation, none in `ensure()`, none in
`ensureEngine()`. The first `AudioContext` appears inside `engine.ensureContext()`, gated on
`navigator.userActivation?.isActive`, reached only from `play()` or `unlock()` — inside a user
gesture. The single-pending-cue mechanism (exactly one cue held while the context unlocks inside the
same gesture, replayed once running, bursts never queued) is copied line for line: it is the whole
reason the first click after a cold load makes a sound.

**Tree-shaking.** The module's top level is `let`/`const` declarations and function definitions — no
calls. `sideEffects: ["**/*.css"]` stays correct. An app importing `Button` pulls the store and the
engine whether or not it passes `sound` — the identical tax the other two packages pay. Port it
as-is; do not "fix" it during the port.

### 6.3 `sound/use-sound.ts`

```ts
/** A cue player for a component's own `sound` prop. Identity-stable, a no-op while
 *  `enabled()` is falsy. Reads `sound.enabled` only INSIDE the returned function, so it
 *  never becomes a reactive dependency of its caller's render — a Button must not
 *  re-render because the volume changed in a settings panel elsewhere on the page. */
export function useSoundCue(enabled: () => boolean | undefined): (cue: SoundCue, options?: SoundPlayOptions) => void;

/** For controls that RENDER the preference — SoundToggle, the Sound Lab. Runs
 *  `hydrateSound()` in `onMounted` and returns the live fields plus the methods. */
export function useSound(): {
  readonly enabled: boolean; readonly volume: number;
  readonly theme: SoundThemeName; readonly status: SoundStatus;
} & Pick<SoundController, "play" | "unlock" | "enable" | "disable" | "toggle" | "setEnabled" | "setVolume" | "setTheme">;

export function useSoundEnabled(): Readonly<Ref<boolean>>;
export function useSoundStatus(): Readonly<Ref<SoundStatus>>;
```

Porting a `sound`-prop consumer is two lines against the Svelte `if (sound) soundFx.play("press")`:

```ts
const playCue = useSoundCue(() => props.sound);
function handleClick(event: MouseEvent) { playCue("press"); emit("click", event); }
```

`DropdownMenu`'s `setOpen` becomes `if (!options.silent) playCue(next ? "open" : "close")` — the
`sound &&` guard moves into the composable so `silent` keeps its exact meaning. `CopyButton`'s
pre-await `if (sound && soundFx.enabled) void soundFx.unlock()` is ported as-is, reading
`sound.enabled` **directly** rather than through a composable: it needs the value at gesture time,
not at render time.

**The Vue-specific trap:** reading `sound.enabled` inside a `computed`, a template or a render
function *does* subscribe. React needed a comment explaining that `useSoundCue` deliberately does
not subscribe; here it falls out of where the read happens, so the rule is "read it inside the
handler, never in the template".

### 6.4 `sound/sound-feedback.ts`

```ts
export type SoundCueResolver = (event: Event) => SoundCue | null | undefined;
export type SoundCueSpec = SoundCue | SoundCueResolver;
export interface SoundFeedbackOptions {
  /** DOM event name → cue. REPLACES the defaults when given. */
  on?: Record<string, SoundCueSpec>;
  disabled?: boolean; volume?: number; pitch?: number; allowUntrusted?: boolean;
}
export const DEFAULT_SOUND_FEEDBACK_ON: Readonly<Record<string, SoundCue>>;
export function attachSoundFeedback(node: HTMLElement, options?: SoundFeedbackOptions): SoundFeedbackHandle;
export function useSoundFeedback(el: WatchSource<HTMLElement | null>, options?: () => SoundFeedbackOptions): void;
export function resetSoundFeedbackForTests(): void;          // not in index.ts
/** Test-only leak counter for the shared document-level pointermove listener. */
export function __soundFeedbackHoverInstances(): number;
```

Verbatim: `HOVER_EVENTS`, `HOVER_POINTER_TYPES`, `HOVER_RECENCY_MS = 150`, the shared
document-level `pointermove` tracking with its retain/release counter, `isDisabled`'s universal
`:disabled,[aria-disabled="true"],[data-disabled="true"]` guard, the four-part hover guard
(`isTrusted`, `pointerType` ∈ {mouse, pen}, `sourceCapabilities.firesTouchEvents`, the
pointer-recency window, plus the `relatedTarget`-inside-node re-entry check), `makeListener`,
`bind`, `unbind`, the swallow-resolver-errors rule, `{ passive: true }` listeners, and the rule that
this module never calls `preventDefault` / `stopPropagation`.

React's D-8 optimisation is kept: the composable's bind watcher is keyed on the **sorted, joined
event-name list**, so listeners rebind only when the set of event names actually changes; specs,
`disabled`, `volume`, `pitch` and `allowUntrusted` are read through the options getter at event
time. Observably identical to Svelte's unbind-and-rebind-everything `update()`, strictly less work.

### 6.5 `sound/SoundToggle.vue` + `sound/sound-toggle.css`

`SoundToggleProps`, `SoundToggleSize`, `SoundToggleVariant` keep their exact names
(`SoundToggleProps` is the tooling contract). `defineExpose({ ref })` because the Svelte props
declare `ref = $bindable(null)`. `SIZE_CLASSES` and `ICON_SIZE` stay `as const` maps of static
Tailwind literals in the sibling `<script lang="ts">` block; the whole `cn(...)` call is copied
byte-for-byte, argument order included.

`enabled` from `useSoundEnabled()`, `unsupported` from `useSoundStatus().value.engine === "unsupported"`,
and `effectiveDisabled = disabled || (unsupported && !enabled)` — keeping the rule that an
unsupported browser disables the control **only while sound is off**, so a stored "on" can always be
undone. `handleClick` is verbatim, including the explicit `effectiveDisabled` early return (the
native `disabled` attribute is not enough against a synthetic event dispatched at the element) and
the unlock-then-cue sequence that is the only place a confirmation cue plays.

> **The dual-glyph rule, and it is binding.** Both `<g class="ft-sound-toggle-glyph-on">` and
> `<g class="ft-sound-toggle-glyph-off">` are in the DOM **at all times**; which one shows is a pure
> CSS decision keyed off `data-state` on the button. Never `v-if` between them, never a computed
> icon component. The server renders `data-state="off"` with both groups present; `hydrateSound()`
> may immediately flip the attribute, and because Vue's production hydration does not patch a
> structural mismatch, the DOM **shape** must never have to change — only opacity and scale, on the
> very nodes the server already produced.

The `<style>` block becomes `sound-toggle.css`, imported from the SFC's `<script setup>` — **not** a
`<style scoped>` block: every rule is already anchored on `.ft-sound-toggle` /
`.ft-sound-toggle-glyph`, it is one of the 9 shared stylesheets (§8), and scoping it would rename
the keyframes referenced by the cross-fade. `light-dark()`, `color-mix()`, the
`--ft-sound-toggle-accent` fallback chain and the `@media (prefers-reduced-motion: no-preference)`
gate are copied unchanged.

---

## 7. SSR rules, per module

Three rules hold across every row: **no browser global in `setup`, a `computed` or a template; no
`Math.random()` / `Date.now()` on a render path; every DOM-touching watcher is `flush: 'post'` or
`onMounted` and therefore never runs on the server.**

| Module | Server render | Hydration hazard & its answer |
|---|---|---|
| `computePosition` | — (pure) | none; `getDefaultViewport()` already returns `Infinity` off-browser |
| `useAnchorPosition` | element, unpositioned | none — a post-flush watcher never runs on the server, same as an action |
| `Portal.vue` | nothing for a closed surface; inline body markup between `<!--teleport start anchor-->` / `<!--teleport anchor-->` for an open one (NOT the `#teleports` div, which Nuxt leaves empty — measured) | eliminated in practice — every portalled surface sits inside `v-if="presence.mounted"` and is gated on an `open` that starts false (D-V6); the payload path is pinned by `nuxt generate` — verified on the example app's `/overlay` page |
| `useDismissable` | nothing | none |
| `useScrollLock` | nothing | none; `lockScroll()` returns a no-op release off-browser |
| `useFocusTrap` | nothing; the façade exists and is inert | none |
| `createFieldState` / `useField` | **full value, `describedBy` included** | none, and this is the point: derived on read, so the server HTML's `aria-describedby` is already correct |
| `createMenuFocus` / `useMenuFocus` | a stable handle, no DOM; `focusedIndex` is `-1` | none |
| `createListbox` / `useListbox` | `activeIndex: -1` | none; `-1` is the honest pre-interaction value on all three sides |
| `useFancyId` | a real, stable id | none; Vue's `useId()` is SSR-stable |
| `uid()` | **throws** | by design, verbatim |
| `tokens` / `presets` / `stagger` / `types` / `easing` | pure data | none |
| `haptics` | `canVibrate()` → false | none; never called during render |
| `rafThrottle` | falls through to a sync call | none |
| `createMediaQuery` / `useMediaQuery` | `fallback`; `start()` is never called | eliminated — identical value from the server and the hydration render, the query starts in `onMounted` |
| `observeInView` / `useInView` | `false` | none; matches Svelte's un-run action |
| `preset` / `anchored` / `originFor` | pure | none |
| `prefersReducedMotion()` | `false` | must never be called from a render path — it is a transition-body helper |
| `runTransition` / `usePresence` | `mounted === open`, no leg ever runs | none; `appear` defaults false, so an open-on-mount surface paints at rest, matching Svelte's initial-render rule |
| `sound/engine`, `themes`, `types` | inert | none; zero module-evaluation globals |
| `sound.ts` | frozen defaults | eliminated — storage is never read on a render path; `hydrateSound()` runs in `onMounted` (D-V15) |
| `useSoundFeedback` | nothing | none |
| `SoundToggle.vue` | `data-state="off"`, **both glyph groups in the DOM** | eliminated — CSS picks the glyph; the DOM shape never changes (§6.5) |
| `StreamText.vue`, `Markdown.vue` | full token tree, no `v-html` | none; the parser is pure |

Two package-wide sweeps enforce this mechanically: `src/ssr-determinism.test.ts` (node env; render
each export twice, assert equal strings) and `src/ssr-hydration.test.ts` (jsdom; server HTML →
`container.innerHTML` → `createSSRApp(App).mount(container)` with `app.config.warnHandler`
collecting `/hydrat|mismatch/i`, asserted empty against a frozen `CANNOT_HYDRATE_UNDER_JSDOM` list).

---

## 8. File layout, naming, CSS, barrel

```
vue/src/internals/                # no barrel: every consumer deep-imports the module it needs
├── dom/
│   ├── compose-refs.ts           # composeRefs — the only ref helper Vue needs
│   └── context.ts                # createInternalContext
├── anchor-position.ts            # computePosition (VERBATIM svelte) + attachAnchorPosition (from react)
├── use-anchor-position.ts
├── Portal.vue                    # <Teleport> + resolvePortalTarget
├── dismissable.ts                # attachDismissable + useDismissable
├── focus-trap.ts                 # attachFocusTrap + useFocusTrap
├── scroll-lock.ts                # lockScroll (VERBATIM) + useScrollLock
├── field.ts                      # FieldContext + createFieldState (VERBATIM) + FIELD_KEY + useField
├── menu.ts                       # createMenuFocus + useMenuFocus + useMenuItem
├── listbox.ts                    # createListbox + useListbox
├── use-id.ts                     # useFancyId + uid
├── ai-types.ts
├── float.ts / use-float.ts
├── markdown.ts / Markdown.vue / MarkdownInline.vue / markdown.css
├── elapsed.ts, autoscroll.ts, relative-time.ts,
│   stream-text.ts / StreamText.vue / stream-text.css,
│   host.ts, calendar-core.ts, clipboard.ts, diff.ts, waveform-core.ts
└── motion/                       # no barrel here either
    ├── types.ts  tokens.ts  easing.ts  presets.ts  stagger.ts  haptics.ts
    ├── transitions.ts   anchored.ts    (verbatim)
    ├── animate.ts       # runTransition, cssToKeyframe — COPIED FROM react/
    ├── presence.ts      # createPresenceCore (from react/) + usePresence
    ├── raf.ts  in-view.ts  media-query.ts

vue/src/sound/                    # public, mirrors the Svelte tree
├── index.ts
├── types.ts  themes.ts  engine.ts  web-audio-mock.ts   (VERBATIM)
├── sound.ts                      # was sound.svelte.ts
├── use-sound.ts
├── sound-feedback.ts
├── SoundToggle.vue
└── sound-toggle.css
```

**Dropped `.svelte` infixes** — the infix marked "this file contains runes", and there are no runes
here: `field.svelte.ts` → `field.ts`, `menu.svelte.ts` → `menu.ts`, `listbox.svelte.ts` →
`listbox.ts`, `media-query.svelte.ts` → `media-query.ts`, `sound.svelte.ts` → `sound.ts`,
`elapsed.svelte.ts` → `elapsed.ts`, `clipboard.svelte.ts` → `clipboard.ts`, `stream-text.svelte.ts`
→ `stream-text.ts`. The leading underscore of `_internals` is dropped for the same reason the
`-global-` keyframe prefix is — and note that a shared core file may therefore never import from
this folder, because its path differs between the trees (§13).

**Naming translation table.**

| Svelte | Vue |
|---|---|
| action `foo` | `attachFoo(node, options)` core (where a test calls the action, or where React already has one) **+** `useFoo(el, () => options)` composable |
| `FooOptions` | `FooOptions` — unchanged; `UseFooOptions` only when the shape genuinely changed |
| factory `createFoo` | `createFoo` **kept, same signature**, `$state` → `ref`/`shallowRef`/`reactive` |
| context reader `getFoo()` | `useFoo()` |
| context key `FOO_KEY` (a `unique symbol`) | `FOO_KEY: InjectionKey<T> = Symbol("…")` — same symbol, now typed |
| `<Name>.svelte` | `<Name>.vue` |
| props type `<Name>Props` | `<Name>Props` — the tooling contract, exported from the sibling `<script lang="ts">` block |
| `.svelte.ts` rune module | plain `.ts` |
| `_internals/` | `internals/` |
| `-global-keyframe-name` | `keyframe-name` |
| pure function | same name, verbatim |

Pure functions keeping their exact names, exhaustively: `computePosition`, `lockScroll`, `uid`,
`staggerDelay`, `vibrate`, `canVibrate`, `rafThrottle`, `preset`, `anchored`, `originFor`,
`prefersReducedMotion`, `createFieldState`, `formatElapsed`, `formatRelativeTime`, `hostOf`,
`monogram`, `parseMarkdown`, `parseInline`, `sanitizeHref`, `parseUnifiedDiff`, `getMonthGrid`,
`addMonths`, `isSameDay`, `clampDate`, `formatISODate`, `computeFloatPosition`, `drawWaveformFrame`,
`fakeWaveSample`, `parseStoredPreferences`, `createSoundEngine`, `getSoundTheme`,
`validateSoundTheme`, `getSoundStatus`, `cssToKeyframe`, `runTransition`.
Types keeping their exact names: `Side`, `Align`, `PresetName`, `RevealPresetName`, `StaggerFrom`,
`HapticPattern`, `SoundCue`, `SoundThemeName`, `SoundPlayOptions`, **`FieldContext`**,
`SurfaceState`, `MenuFocusState`, `ListboxState`, `ComputePositionOptions`, `AnchoredParams`,
`PresetParams`, `InViewOptions`, `MediaQueryState`, `TransitionSpec`, `TransitionFn`.

**CSS.** Exactly three `.css` files exist in this scope, one per Svelte `<style>` block that is
already anchored on its own class and shared across components: `sound/sound-toggle.css`,
`internals/markdown.css`, `internals/stream-text.css` (three of the package's nine global
stylesheets). They stay `import "./x.css"` from the `.ts`/`<script setup>` that owns them.
Everything else is `<style scoped>` in its own SFC. **The motion subsystem ships no stylesheet** —
the choreography either runs through WAAPI or lives in the consuming component's own scoped block,
which is the same decision `tokens.ts`'s header records for the Svelte side. Inventing a shared
`motion.css` would be an improvement, which the law forbids.

**Barrel.** `vue/src/index.ts` mirrors the Svelte barrel's own lines and nothing more:

```ts
export * from "./sound/index.js";
export type * from "./internals/ai-types.js";
export type * from "./internals/motion/types.js";
```

plus the generated component export block. Nothing else from `internals/` is public; components
import it by relative path. No new subpath export is needed in `package.json` — sound ships through
the root barrel exactly as it does on the Svelte side.

---

## 9. Testing

Vitest + `@testing-library/vue` + `@vue/test-utils`, jsdom, globals on. Tests are `.ts` files that
import `.vue` components, so `include: ["src/**/*.test.ts"]` collects them and `*.test.vue`
template rigs are never collected. Run `npx vitest run src/internals/<module>` from `vue/`.

### 9.1 `src/test-setup.ts` is byte-identical to React's

It is copied, not re-derived, and listed in the identity manifest (§13) — it is framework-agnostic
by construction (a superset of the Svelte root `src/test-setup.ts`). What it must keep providing:

- **`Element.prototype.animate` — the `FakeAnimation` stub. Hard requirement, not optional.**
  `runTransition` calls the same API Svelte does, so the same fake works and every `usePresence`
  test needs it. It exposes `currentTime` (the reversal path's `t()` reads it), `playState`,
  `cancel()`, `effect`, and fires `onfinish` on a **microtask, never a timer** (fake-timer suites
  depend on that), with `cancel()` suppressing it.
- `FakeResizeObserver` (inert) and `FakeIntersectionObserver` exposing `.trigger(isIntersecting)`.
- `window.matchMedia`, settable per-test, whose `MediaQueryList` supports
  `addEventListener("change")`, guarded by `typeof window !== "undefined"` so the file also survives
  a `@vitest-environment node` suite.
- `navigator.vibrate` absent by default, so `canVibrate()` is false and the unsupported path is the
  default; installed per-test by the haptics suite.
- The two recording registries emptied before each test.

### 9.2 Harness files collapse

| Svelte harness | Vue replacement |
|---|---|
| `FieldHarness.test.svelte` + `FieldConsumer.test.svelte` | two inline `defineComponent` rigs at the top of `field.test.ts`, or `render(Cmp, { global: { provide: { [FIELD_KEY]: value } } })` |
| `ScrollLockHarness` + `ScrollLockPanel` | one inline `<Panel open>` built with `h()` in `scroll-lock.test.ts` |
| `TransitionsHarness.test.svelte` | an inline probe using `usePresence`; assert on the `animate` fake's recorded keyframes |
| `AnchoredHarness.test.svelte` | an inline surface with per-element `getBoundingClientRect` stubs |
| `SoundToggleHarness.test.svelte` | not needed — render `<SoundToggle>` directly |

All 73 `*.test.svelte` rigs disappear this way. A `*.test.vue` file is written **only** when the
template is genuinely large, and it is never collected by the runner.

### 9.3 Four test shapes, in order of preference

1. **Pure** — import the function, no Vue: `computePosition`, `staggerDelay`, `preset`/`cssFor`,
   `originFor`, `anchored()`, `cssToKeyframe`, `createFieldState`, `parseStoredPreferences`, easing,
   presets, tokens, haptics, markdown, diff, calendar-core, host, relative-time, waveform-core,
   float's geometry. The majority of the existing assertion count; transposes one-for-one.
2. **Core** — `attachX(node, opts)` against a hand-built `document.body` subtree, then
   `handle.destroy()`: `focus-trap.test.ts` (720 lines), `dismissable.test.ts`,
   `anchor-position.test.ts`, `in-view.test.ts`, `sound-feedback.test.ts` — import line only.
3. **Factory** — `createMenuFocus` / `createListbox` / `createElapsed` / `createCopy` /
   `createTextStream` / `createMediaQuery` / `createSoundEngine` driven directly. These need no
   component because Vue reactivity works outside one; `listbox.test.ts` (458 lines) transposes with
   zero edits beyond the import path.
4. **Composable / component** — `render()` from `@testing-library/vue`, or `mount()` from
   `@vue/test-utils` when the test needs `wrapper.vm.ref` after `defineExpose`.

**Transposition rules** (`@testing-library/svelte` → `@testing-library/vue`): `render(Cmp, { props })`
is identical and `props.class` reaches the declared prop; `createRawSnippet` (64 files) →
`slots: { default: html }`, scoped → `slots: { item: '<template #item="{ step }">…</template>' }`;
`await tick()` → `await nextTick()`, and the 16 `flushSync` sites are restructured rather than
translated; `fireEvent.*` is identical and already awaits `nextTick()`; `rerender(props)` exists but
**merges** where Svelte replaced, so pass the full prop set; `render().component` → `mount` +
`wrapper.vm.ref`; fake timers, `vi.stubGlobal("matchMedia")` and
`document.body.querySelector('[role=dialog]')` are identical. `.ssr.test.ts` files become
`renderToString(createSSRApp(Cmp, props))` from `vue/server-renderer`, asserted twice-identical.
**Drop only what is rune-specific**: `$state` proxy identity, `untrack` behaviour, `flushSync`, and
"the action's `update()` was called" plumbing where the Vue equivalent is a re-render.

### 9.4 Leak suites — the replacement for React's StrictMode tests

Vue has no double-invoke, so React's `renderStrict` helper has no counterpart. The same coverage is
bought with a **mount / unmount / mount / unmount** cycle, and every hook module ships one:

| Module | Assertion at rest |
|---|---|
| `dismissable` | `__dismissableLayerCount() === 0` after; exactly `1` while mounted |
| `scroll-lock` | `document.body.style.position === ""` after; `=== "fixed"` while mounted; `window.scrollY` restored |
| `focus-trap` | focus back on the trigger, and exactly one focus move on close (the `returned` latch) |
| `sound-feedback` | `__soundFeedbackHoverInstances() === 0` after |
| `in-view` / `autoscroll` | no orphaned observer (the fakes' registries empty) |
| `presence` | no in-flight `FakeAnimation`; `mounted` false; `state` back at `"open"` |
| `media-query` | the `MediaQueryList`'s `change` listener removed |

### 9.5 Per-module additions

| Module | What the Vue layer adds |
|---|---|
| `usePresence` | (a) `mounted` stays true through the exit; (b) `state` sequences `opening → open → closing`; (c) `duration: 0` finishes **synchronously** and `animate()` is never called; (d) reopening mid-exit produces a keyframe list whose first frame matches the in-flight `t`; (e) `inert` set on exit, cleared on re-enter; (f) with `appear` unset, an initially-open mount calls `animate()` zero times; (g) `surfaceState` never yields `"opening"`; (h) `presence.mounted` is a **boolean** in a template, not a `Ref` |
| `runTransition` | the ceil'd frame count (`n + 1` keyframes), the leading dummy at a non-zero delay, and the enter-finish abort / exit-finish no-abort rules |
| `useFocusTrap` | façade identity stability across re-renders; focus landing in the same flush as mount; the façade is inert before attach |
| `useAnchorPosition` | one recompute per `side` change; the seeded placement is the requested side, not `"bottom"` |
| `Portal.vue` | renders into target, not into the Vue parent; string-selector and miss→body paths; removal on unmount; nothing emitted server-side for a closed surface |
| SSR | `@vitest-environment node` files for `sound`, `motion/tokens`, `field`, `use-id`, asserting no browser global is touched at import and that the server paths return defaults |
| Hydration | the package-wide `ssr-hydration.test.ts` sweep, plus targeted suites for `field`, `sound/sound` and `motion/media-query` — the three modules where a server/client divergence is actually reachable |

---

## 10. Divergence register

Reproduced in `vue/README.md` under "## Divergences from the Svelte API", and in each affected
component's README, per PORTING.md's "port the bug and note it" discipline applied to mechanisms
that cannot be ported.

| # | Divergence | Why | Observable difference |
|---|---|---|---|
| **package-level** | `<Name>Props` is the component's **own** props only — never `Omit<ButtonHTMLAttributes, keyof BaseProps>` as Svelte and React spell it. Native attributes and listeners flow through `$attrs` | The intersection would make the SFC compiler enumerate every native attribute as a declared prop and kill fallthrough entirely | a consumer typing against `<Name>Props` no longer sees native attributes in that type, though they still work on the element |
| D-V1 | `class` is a declared prop (`class?: HTMLAttributes["class"]`) | Declaring it removes it from `$attrs`, so `cn(…, props.class)` applies it exactly once. Legal: the reserved vnode keys are only `key`, `ref`, `ref_for`, `ref_key`, `onVnode*` | none |
| D-V2 | `ref = $bindable(null)` → `defineExpose({ ref })`; `ref` is absent from `<Name>Props` | `ref` is a reserved vnode key and cannot be a prop or a model | a consumer reads the element through the component instance, not through a bound prop |
| D-V3 | `v-model:<name>` only; no default `modelValue` alias | Name fidelity and tooling parity with the other two packages. An alias is additive and can ship later without breaking | `<Dialog v-model="x">` does not bind; `<Dialog v-model:open="x">` does |
| D-V4 | `Snippet<[A, B]>` → a scoped slot whose params are an **object**, not a tuple | Vue slot props are named | per-component, listed in each README |
| D-V5 | Callbacks stay props (`onOpenChange`, `onSelect`, `onDismiss`); `defineEmits` is never hand-written | One law 145 ports can follow; `@open-change` still works through the compiler | these do not appear in devtools' event pane |
| D-V6 | `<Teleport>` sits **inside** `v-if="presence.mounted"`, and nothing is portalled server-side | Teleport resolves at patch time, so React's outside-the-gate rule inverts; an always-mounted Teleport would emit an SSR payload for a closed surface | portalled content is absent from server HTML (Svelte SSRs it inline and relocates on mount) — nil in practice, every portalled surface is gated on `open: false` |
| D-V7 | `markSurfaceState` is not ported; `data-state` is an ordinary binding | The Svelte helper exists only because its scheduler skips effects in an outroing branch | none — identical emitted values |
| D-V8 | `focusTrap`'s `onActivate(returnFocusNow, rearm)` becomes the composable's return value | A composable can return; an action cannot. Same two functions, same two moments | none |
| D-V9 | A keyframe referenced from an inline style or a custom property lives in a **second, unscoped `<style>`** block; a parent's scoped selector also matches a child's root element | Vue renames keyframes inside a scoped block and cannot rewrite a reference it does not parse | none if the rule is followed; a scoped rule reaching a child root must be permissive, never a reset |
| D-V10 | A DOM attribute the component *reads* becomes a declared Boolean prop (`disabled` is the live case) | `<X disabled>` reaches `$attrs` as `""`, which is falsy — the cue would play on a disabled button | none once declared; the prop appears in `<Name>Props` |
| D-V11 | `bind:value` → `v-model`, which defers updates during IME composition | Vue's documented `v-model` behaviour | a composing IME user's intermediate value is not published; the final value is |
| D-V12 | No composable exposes `destroy()`; teardown is `onScopeDispose` / `onBeforeUnmount` (factories keep theirs) | Unmount cleanup cannot be forgotten | none — it fixes a latent typeahead-timer leak in `DropdownMenuContent`, which never calls `focus.destroy()` |
| D-V13 | `DropdownMenuContent`'s `tick()` → `nextTick()`, **kept** (React dropped it, its D-9) | The call site is a post-flush handshake, not a parent mount hook, and scoped-slot items may be created in a later flush | none |
| D-V14 | `createMediaQuery`'s `start()`/`stop()` are kept, and every getter option (`active`, `exclude`, `count`, `loop`, `fallbackFocus`, `labelAt`, `enabled`) stays a getter — React's D-4 and D-6 are undone | Vue reactivity works outside a component and getters are the Svelte surface; flattening them would be a second, unnecessary translation | none; the Svelte test files transpose with an import-line change |
| D-V15 | `localStorage` hydration moves out of lazy getter access into an explicit `hydrateSound()`, called from `useSound()`'s `onMounted` | A getter that writes reactive state is a bug in Vue, and production hydration does not patch a mismatched attribute (verify) | none after mount; the first paint is the frozen defaults on both server and client, as it already is in React |
| D-V16 | Ids are Vue's `useId()` output (`v-0`, `v-1`, …), untransformed; `useFancyId()` takes no prefix | Vue's generator already namespaces per app; C-6 forbids transforming the output | rendered id strings differ from both other packages; nothing may depend on them |
| D-V17 | The four React core edits (focus-trap `isVisible` ancestor walk, anchor-position layout-box + `reset()`, listbox `setActive` range guard, engine `MAX_LAYER_MS` clamp) are present | They land on Svelte in wave 0 (plan ruling 7), so all three trees agree | as recorded in React's D-13/D-14 until wave 0 merges; none afterwards |
| D-V18 | `inheritAttrs: false` on every component, `v-bind="$attrs"` only where Svelte spreads `{...restProps}` | Parity with Svelte and React, both of which are closed by default. Not Vue-idiomatic | an undeclared attribute lands nowhere on the 126 closed components, exactly as in Svelte |
| D-V19 | Peer floor is `vue ^3.5.2` (3.5.2 is the first release whose `DefineComponent` type accepts the 20 arguments vue-tsc emits into every shipped `.vue.d.ts`) | Needs reactive props destructure, `useId`, `useTemplateRef`, `onWatcherCleanup`, `<Teleport defer>`; Nuxt 4 needs ≥3.5.40 anyway | the package does not install on Vue 3.4 |
| D-V20 | `createNow` returns the `NaN` sentinel until the clock starts (server, hydration render, first client render); `formatRelativeTime` renders a non-finite `now` as `""`. Second site: `createElapsed` seeds `NaN` when `since` is supplied (`0` without, as in the source) and `text` renders a non-finite duration as `""`; `useElapsed` starts the clock in `onMounted` | The client cannot reproduce the server's timestamp, and production hydration would leave a wrong label in place | the server HTML carries an empty relative label rather than a wrong one; it fills in before the first paint |

**Not a divergence, and recorded as such:** `Button`, `Checkbox`, `CopyButton`, `DropdownMenu`,
`RadioGroup`, `Select` and `Switch` each statically import the sound controller (and through it
`themes.ts`'s recipe data) purely to serve a `sound` prop that defaults to `false`. The identical
coupling exists on the Svelte side. Port it as-is.

---

## 11. Build order

Four steps. Nothing moves to the next until `pnpm --filter fancy-ui-vue run check` is clean and the
step's own vitest files are green.

**Step 1 — foundations and pure data (unblocks everything).**
`test-setup.ts` · `dom/{compose-refs,context}.ts` · `use-id.ts` · `anchor-position.ts` ·
`scroll-lock.ts` · `field.ts` · `menu.ts` · `listbox.ts` ·
`motion/{easing,tokens,presets,types,stagger,haptics,raf,transitions,anchored,animate}` ·
`sound/{types,themes,engine,web-audio-mock}` · `ai-types.ts` · `host.ts` · `calendar-core.ts` ·
`diff.ts` · `markdown.ts` · `relative-time.ts` · `waveform-core.ts` · `float.ts` geometry.
Almost all verbatim. Gate: every transposed pure and factory test file passes, and
`node scripts/check-shared-cores.mjs` is green at root for the files that exist.

**Step 2 — the composables, then `motion/presence.ts`.**
`use-anchor-position` · `Portal.vue` · `dismissable` · `use-scroll-lock` · `focus-trap` ·
`motion/{media-query,in-view}` · `use-float` · `elapsed` · `clipboard` · `autoscroll` ·
`stream-text` · `sound/{sound,use-sound,sound-feedback}` · then `motion/presence.ts`.
Gate: the leak suites (§9.4) and the three hydration suites green.

**Step 3 — the acceptance ports, in this order, before anything else is built on the contract.**
`Presence` → `Dialog` (i.e. `DialogSurface`) → `Select`. Together they exercise single-node and
multi-node presence, reversal, the reduced-motion synchronous close, `inert`, the focus-trap
handshake, scroll-lock release timing, dismissable layering, Teleport placement, both `data-state`
vocabularies, `defineExpose`, `defineModel`, a scoped slot, `useListbox` driving
`aria-activedescendant`, and conventions C-1 through C-5. **If any of the three is not
pixel-identical to its Svelte original under a side-by-side, fix this contract before porting
anything else.** `Markdown.vue` / `StreamText.vue` / `SoundToggle.vue` may land in parallel.

**Step 4 — wave A (81 standalone), then wave B (63 dependent), engines last.**
Wave B's engine wrappers import the shared `<slug>-core.ts` files, so that shard runs only after
wave 0's extraction PR is in `develop`. Each wrapper is additionally refuted against the core
contract: `create*` on mount, `setOptions` for live props only, `destroy()` idempotent, and the
wrapper's script body under ~80 lines.

---

## 12. Remaining internals — one paragraph each

All twelve live under `vue/src/internals/`, keep their exact file names minus the `.svelte` infix,
and introduce no conventions beyond §1.

**`markdown.ts` + `Markdown.vue` / `MarkdownInline.vue`.** The 620-line parser — `parseMarkdown`,
`parseInline`, `sanitizeHref`, and the `InlineToken`/`BlockToken`/`TableAlign` unions — is pure and
ports verbatim; `markdown.test.ts` (544 lines) and `markdown-security.test.ts` (292 lines) transpose
with no Vue, and the security suite is a merge gate, so it ports first. The two components render the
token tree recursively through `<component :is>` with a `:key` on every `v-for` child. **They must
never use `v-html`**: the parser's whole point is that no HTML string is ever constructed, and
converting a token-based sanitiser into an HTML-string one would make `sanitizeHref` decorative and
invalidate the entire security file. `sanitizeHref`'s `null` return still renders the link text with
no `href`.

**`ai-types.ts`.** Type-only — `ChatRole`, `StreamStatus`, `RunStatus`, `ChatMessageData`,
`ToolCallData`, `SourceData`, `SearchResultData`, `AttachmentData`, `PlanStepData`, `SubagentData`,
`ThreadData`, `CommandItemData`, `ModelOptionData`, `TokenUsageData`, `ToolTimelineItemData`.
Verbatim, zero JS output under `verbatimModuleSyntax`, re-exported from the barrel as
`export type * from "./internals/ai-types.js"`, mirroring the Svelte line.

**`float.ts` / `use-float.ts`.** The older sibling of `anchor-position.ts`: `FloatPlacement`,
`FloatRect`, `FloatSize`, `FloatOptions`, `computeFloatPosition`, `float`. `computeFloatPosition` is
pure and verbatim; the action becomes `attachFloat(node, options)` + `useFloat(el, () => options)`
shaped exactly like §3.1, `matchWidth` still writing the width before measuring. Its `anchor` keeps
the three-way union (element | fixed rect | getter) — the virtual-rect form is what caret anchoring
needs and is why both modules exist. **Do not merge it with `anchor-position`**: two implementations
exist on the Svelte side and fidelity means porting two.

**`elapsed.ts`.** `formatElapsed` is pure and verbatim. `createElapsed` keeps its body with `$state`
→ `ref`; `useElapsed(options)` returns `{ ms, text, running, start, stop }` with the interval
retained from `onMounted` and released in `onScopeDispose` — no timer is ever scheduled from a render
path, and the wall-clock-derived, never-accumulated tick is the invariant to preserve. `createNow`'s
whole point — one shared interval for fifty timestamps — survives as a module-scope factory plus
`useNow(refreshMs)`, whose initial value is D-V20: `NaN` until the clock starts (server, hydration
render, fresh client tree), because a real server timestamp is a mismatch Vue would not repair and
`Date.now()` on a render path breaks C-7. Consumers pass it straight to `formatRelativeTime` or check
`Number.isFinite`; `elapsed.ssr.test.ts` pins it.

**`autoscroll.ts`.** `scrollToBottom(node, behavior)` is pure and verbatim; the action becomes
`attachAutoscroll(node, options)` + `useAutoscroll(el, () => options)`. The `stuck` flag stays a
closure variable and must never become reactive state — the source's design is that stuck is a pure
function of distance from the bottom, recomputed per scroll event, with no programmatic-scroll flag
to get out of sync, so no `isProgrammaticScroll` may creep in. `onStickChange` fires only on flips.
Observers are created in the post-flush attach, where `pinOnConnect` also runs so the jump happens
before paint; its tests install controllable fakes locally rather than using the shared no-op stubs.

**`relative-time.ts`.** `RelativeTimeOptions` and `formatRelativeTime(date, opts)` — a pure
`Intl.RelativeTimeFormat` wrapper with an injectable `now`. Verbatim but for one guard: a non-finite
`now` (the `useNow` sentinel) returns `""`, which keeps a server render from printing a label
measured against the epoch and `Intl.RelativeTimeFormat` from throwing on `NaN`. Never call it with a
defaulted `Date.now()` during render (C-7): pair it with `useNow()` and pass an explicit `now`, which
is also how the Svelte consumers avoid a per-item interval.

**`stream-text.ts` + `StreamText.vue`.** `createTextStream(initial, opts)` keeps its body, and
critically its deliberately non-reactive `list`/`full` authoritative copies stay non-reactive — that
is *why* `push()` is safe to call from a watcher, and the identical hazard exists in Vue, where a
write to a tracked source during render would loop. `$state` on the exposed `segments`/`text` becomes
`ref`/`shallowRef`; `useTextStream(initial, options)` returns
`{ text, segments, push, flush, reset, done }`. `StreamSegment.id` stays the stable `:key`. The
pacing timer is owned by the composable and cancelled in `onScopeDispose`, and no `Math.random()`
appears anywhere in the pacing. `StreamText.vue` + `stream-text.css` keep the `fresh` class and the
animation names identical.

**`host.ts`.** `hostOf(url)` and `monogram(text)` — pure string functions, no DOM, verbatim, plain
`.test.ts`. Their reason for existing (never fetch a third-party favicon from a reader's browser) is
a contract, not an implementation detail: keep the header comment.

**`calendar-core.ts`.** `WeekStartsOn`, `MonthGridDay`, `getMonthGrid`, `addMonths`, `isSameDay`,
`clampDate`, `formatISODate` — pure date arithmetic, verbatim, tests verbatim. They take `Date`
arguments: a consumer takes "today" as a prop or reads it from `useNow`, never constructing a `Date`
during render.

**`clipboard.ts`.** `CopyState` and `createCopy(resetMs)` keep their bodies — including the `ticket`
counter guarding a permission prompt held open across an unmount, and the `destroyed` flag — with
`$state` → `ref`. `useCopy(resetMs = 2000)` returns `{ copied, copy }` and calls `destroy()` from
`onScopeDispose`, the direct analogue of the source's "call from the consumer's teardown". The
`ticket` guard is what makes it unmount-safe. `navigator.clipboard` is touched only inside `copy()`,
so the module stays SSR-safe just as the factory did.

**`diff.ts`.** `DiffLineType`, `DiffLine`, `DiffHunk`, `DiffFile`, `parseUnifiedDiff` — a pure
parser, verbatim, with its 9 KB of tests transposing assertion-for-assertion and no composable.

**`waveform-core.ts`.** `WaveformStyle`, `drawWaveformFrame(ctx, …)` and `fakeWaveSample(i, tMs)` —
pure canvas helpers taking a `CanvasRenderingContext2D`, verbatim. The consuming component owns the
`<canvas>` and the rAF loop through an `onMounted`-owned `requestAnimationFrame` or a `rafThrottle`
cancelled in `onBeforeUnmount`, and gets the context in `onMounted` rather than during render.
`fakeWaveSample` is deterministic in `(i, tMs)` — no `Math.random()` — so it satisfies C-7 as-is.

---

## 13. Shared-core identity gate

Some files in this package are not written, they are **copied**, and a copy that drifts is worse
than no copy at all. `scripts/check-shared-cores.mjs` at the repo root enforces that mechanically,
and this section states what this package owes it.

**The manifest.** `shared-cores.json` at the repo root, one entry per shared file:

```json
{ "file": "fancy-ui/mosaic-glow/mosaic-glow-core.ts",
  "svelte": "src/lib/fancy-ui/mosaic-glow/mosaic-glow-core.ts",
  "react":  "react/src/components/mosaic-glow/mosaic-glow-core.ts",
  "vue":    "vue/src/components/mosaic-glow/mosaic-glow-core.ts" }
```

The gate hashes every listed path that exists and fails with a unified diff on any inequality. Paths
differ only by tree root; `_internals` ↔ `internals` is mapped explicitly, which is why **a shared
file may never import from that folder** (§8). Vue entries are optional until this package lands,
and an entry may omit `svelte` entirely — that is how a file that exists only in the two port trees
(`motion/animate.ts`, `motion/easing.ts`, `motion/transitions.ts`, `test-setup.ts`) is gated
two-way. Identity is **byte-exact, three-way, with no stored-patch fallback** (plan ruling 6).

**Purity rules for a core file** — a file is only eligible for the manifest if all of these hold:

1. **Zero framework imports.** No `vue`, no `react`, no `svelte`, and no `@vue/*` / `svelte/*`
   subpath — including type-only imports, which is the usual way this rule is broken.
2. **No module-level DOM or `window` access**, so the file is safe to import on the server (the
   `smoke-dist.mjs` bare-Node sweep imports every emitted module and will catch a violation).
3. **No `Math.random()` / `Date.now()` outside the `create*` call**, seedable wherever the Svelte
   side is seedable.
4. **Imports limited to** the six runtime dependencies and sibling `*-core.ts` files in the same
   folder. Never `internals/` / `_internals/`.
5. **Compiles under `noUncheckedIndexedAccess`** with explicit guards or `!` — the Svelte root
   tsconfig is not changed, so strictness on the shared bytes is enforced by `react/` and `vue/`
   `check`.
6. **No `import.meta.env`**, and no `DEV` constant either: a diagnostics branch is not shareable.
7. WebGPU typing uses `/// <reference types="@webgpu/types" />`, with `@webgpu/types` a
   **devDependency** of `react/` and `vue/` (types only — outside the zero-dep rule).

**What this package contributes to the manifest.** The four sound files (`sound/types.ts`,
`themes.ts`, `engine.ts`, `web-audio-mock.ts`) are three-way. `motion/easing.ts`,
`motion/transitions.ts`, `motion/animate.ts` and `src/test-setup.ts` are two-way react↔vue
(`transitions.ts` differs from the Svelte original by exactly one line — the `TransitionConfig`
import replaced by a local `TransitionSpec` — so it cannot be three-way). Component cores from wave
0 are three-way as they land.

**`createPresenceCore` — the one open item, and it needs a decision before §11 step 2.** The state
machine is the most valuable shared byte in the package and the hardest to gate: today it lives
*inside* `react/src/internals/motion/presence.ts`, unexported, alongside React's own `usePresence`,
and it types its slot ref as `RefCallback<HTMLElement>` — a `react` type import. File-level hashing
cannot gate a function inside a file, so one of two things must happen:

- **Preferred:** a small React-side PR extracts `createPresenceCore`, `PresenceState`,
  `PresenceSlot` and `PresenceCoreDeps` into `react/src/internals/motion/presence-core.ts`, replaces
  `RefCallback<HTMLElement>` with a locally declared `type PresenceRef = (node: HTMLElement | null)
  => void`, and re-exports from `presence.ts` (no behaviour change, no changeset beyond an internal
  patch). Vue then copies that file byte-for-byte and the manifest gates it two-way.
- **Fallback, by analogy with plan ruling 8:** the Vue copy is listed `shared: false` and identity is
  held by a review diff plus a dedicated assertion in `check-shared-cores.mjs` comparing the
  extracted region. Accept this only as a temporary state, and record it in the matrix.

This document assumes the preferred path and writes `PresenceRef` accordingly (§5.3). If the
fallback is taken instead, nothing in §5 changes except the import path.
