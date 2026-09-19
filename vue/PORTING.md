# Porting conventions — Svelte → Vue

Law for every component ported into `fancy-ui-vue`. The Svelte source under
`src/lib/fancy-ui/<slug>/` (and `src/lib/cameleon/`, `src/lib/_internals/`) is
the reference; the port's job is pixel-for-pixel fidelity, not improvement.
Port the Svelte bugs too, and note them — divergence is a maintenance tax paid
on every future change. Where this file is silent, mirror Svelte exactly.

## Folder shape

```
vue/src/components/<slug>/
├── <Name>.vue          # the component — ALWAYS with a <script setup> block
├── <Name>.test.ts      # transposed from the Svelte <Name>.test.ts
├── <slug>-core.ts      # engine components only: byte-identical Svelte copy
└── index.ts            # export { default as <Name> } …; export type { <Name>Props }
```

No colocated `.css`: a Svelte `<style>` block becomes `<style scoped>` in the
same SFC. The React package needs a global stylesheet plus an invented anchor
class per component; Vue's scoped compiler gives the guarantee Svelte's does,
so rules move verbatim and no class is invented.

Internals live at `vue/src/internals/` (Svelte's `_internals/`, no underscore)
and the cameleon engine at `vue/src/cameleon/`, mirroring the Svelte tree.
Export blocks in `vue/src/index.ts` are the registrar's, never a port agent's.

**Shared cores.** An engine component's framework-free `<slug>-core.ts` is
copied byte-for-byte from the Svelte folder — not reformatted, not re-imported.
A CI gate hashes every file listed in the root `shared-cores.json` across the
packages and fails on a one-byte drift; fixes land on Svelte first and are
copied down again. The wrapper owns markup, `class`, slots, a11y, the
reduced-motion gate, visibility gating and sound hooks — nothing else.

## API contract

- **`export interface <Name>Props`** — the exact name is a tooling contract
  (docs generation and design-tool sync key on it); `interface`, never a `type`
  alias. It lives in a sibling `<script lang="ts">` block of the same SFC (the
  mirror of Svelte's `<script module>`): one module scope, so
  `defineProps<<Name>Props>()` sees it and `index.ts` re-exports it.
- **It declares the component's own props only** — no intersection with, or
  `Omit` of, native attribute sets. The Svelte and React packages fold
  `ButtonHTMLAttributes` in; here that would make the compiler declare every
  native attribute as a prop and kill `$attrs` fallthrough. Native attrs and
  listeners flow through `$attrs` — one package-level divergence in the README.
- **`class` is a declared prop**, typed `HTMLAttributes["class"]`: legal (the
  reserved vnode keys are `key`, `ref`, `ref_for`, `ref_key`, `onVnode*`) and it
  pulls `class` out of `$attrs` so `cn()` applies it once. Merge with `cn()`
  from `../../utils.js` exactly where Svelte merges it — same call site,
  argument order and literals.
- **`defineOptions({ name: '<Name>', inheritAttrs: false })` on every SFC**; the
  name is read by a dist gate, closed attrs match Svelte. `v-bind="attrs"` goes
  **only** on the element Svelte spreads `{...restProps}` onto.
- **`defineExpose({ ref })` exactly where Svelte has `ref = $bindable(null)`**,
  on the same node, exposing nothing else; no Svelte ref, no Vue ref. `ref` is a
  reserved vnode key: neither prop nor model, absent from `<Name>Props`.
- **Every other `$bindable` is `defineModel('<name>')`**, Svelte's name kept,
  **no `modelValue` alias**. Where Svelte writes the bindable *and* calls a
  callback, do both, in Svelte's order.
- **Snippets become slots, 1:1**, typed with `defineSlots`; a `Snippet<[A, B]>`
  becomes a scoped slot whose tuple parameters turn into named object props.
- **Callback props stay props**, called as `props.onX?.(…)`; **never hand-write
  `defineEmits`**. Consumers still get `@open-change`, which the compiler turns
  into an `onOpenChange` prop.
- **A DOM attribute the component *reads* becomes a declared prop**: bare
  `<X disabled>` gives `$attrs.disabled === ""`, which is falsy.
- **Nothing may differ between a server render and its hydration.** No
  `window`/`document`/`navigator`/`localStorage`/`matchMedia` in setup, a
  `computed`, a template or a `watchEffect`; no `Math.random()`/`Date.now()` on
  a render path. Where Svelte randomises, take a `seed` prop and the
  deterministic PRNG, with the React package's defaults. Media queries and the
  sound store hydrate in `onMounted`; production hydration does not patch
  attribute mismatches, so a wrong value stays wrong on screen.

## Rune → Composition API

Vue ≥3.5, `<script setup lang="ts">`. `onMounted`, `flush: 'post'` watchers and
template-ref assignment all run pre-paint in one flush: there is no
layout-vs-passive effect split to reproduce.

| Svelte | Vue | Trap |
|---|---|---|
| `let { class: className, size = 200, ...restProps } = $props()` | `const { class: className, size = 200 } = defineProps<XProps>()` (reactive destructure) + `useAttrs()` | `...rest` here = remaining *declared* props, not DOM attrs. A destructured prop handed to `watch` or a composable is wrapped: `() => size` |
| `$state(x)` / `$state({…})` / `$state.raw` | `ref` / `reactive` or `ref<T[]>` / `shallowRef` | |
| `$derived` / `$derived.by` | `computed` | |
| `$effect(() => {…; return cleanup})` | `watch(src, (v, _, onCleanup) => {…}, { flush: 'post' })`; `watchPostEffect` only for truly dynamic deps | **never bare `watchEffect`**: flush is `'pre'` (before the DOM patch) and it runs once in SSR setup — a `document` read there breaks the server. `watch(src, cb)` without `immediate` never runs on the server |
| `$effect.pre` | `watch(src, cb, { flush: 'pre' })` | two sites in the census; everything else is `post` |
| `untrack(…)` | no API — `watch(explicitSource, cb)` | the callback body is untracked by construction |
| `onMount(() => {…; return cleanup})` / `onDestroy` | `onMounted(() => {…; onBeforeUnmount(cleanup)})` | `onBeforeUnmount`, never `onUnmounted` — DOM still attached, like an action's `destroy`; composables use `onScopeDispose` |
| `tick()` | `nextTick()` | not droppable: where Svelte awaits a tick before measuring, so do we |
| `bind:this={el}` | `useTemplateRef<HTMLDivElement>('el')` + `ref="el"` | `null` in setup and on the server |
| `ref = $bindable(null)` | `defineExpose({ ref: el })` on the node Svelte's `ref` pointed at | reserved vnode key: never a prop or model; `$el` is wrong for multi-root/Teleport roots |
| `open = $bindable(false)` | `defineModel<boolean>('open', { default: false })` → `v-model:open` | name kept; write the model **and** call the callback prop, Svelte's order. No `modelValue` alias |
| `setContext(KEY, ctx)` / `getContext(KEY)` | `provide(KEY, ctx)` / `inject(KEY, undefined)`, `const KEY: InjectionKey<T> = Symbol("…")` | getter-object contexts port **verbatim in shape** (a `computed` reading the getter stays tracked); `provide` only in setup, synchronously |
| `children?: Snippet` / named / `Snippet<[A,B]>` | `<slot/>` / `<slot name="x"/>` / scoped slot + `defineSlots<{ item?(p: { step; index }): unknown }>()` | tuple params become named object props (divergence); a snippet passed as a prop value becomes slot content |
| callback props `onOpenChange`, `onSelect`… | keep as props, call `props.onX?.()` | `defineEmits` is never hand-written |
| native `onclick` re-dispatched (cue, then `onclick?.(e)`) | `@click="handleClick"` written **before** `v-bind="attrs"` on the same element | listeners merge in source order; do not also call `attrs.onClick` or it fires twice |
| `restProps.disabled` read by the component | declare `disabled` as a Boolean prop, bind `:disabled` | bare `<X disabled>` gives `attrs.disabled === ""` — falsy |
| `use:foo={opts}` | `useFoo(el, () => opts)` over a verbatim `attachFoo(node, opts): { update, destroy }` core; **no directives** | a directive cannot return a handle (focus trap's `returnFocusNow`/`rearm`). Options keep the action's shape, getter fields included |
| `transition:x` on `{#if}` + `onintrostart`/`onoutroend` | `usePresence(() => open, { onEnterStart… })` + `presence.register(key, transition, params)`; `v-if="presence.mounted"`; `runTransition` from `internals/motion/animate.ts` | **not** `<Transition :css="false">`: it delays DOM removal but not teardown (`onBeforeUnmount` runs at leave *start*), gives no reversal position, and a scrim and its panel must share one clock |
| split `in:` / `out:` on keyed rows, `{#key}` | `<Transition :css="false" @enter="(el, done) => runTransition(el, spec, 1, undefined, done)" @leave="…0…">` / `<TransitionGroup>` | fine here: no cleanup dependents, no reversal |
| `data-state` + `markSurfaceState` | `:data-state="presence.surfaceState.value"`; `markSurfaceState` not ported | the vocabularies (`opening\|open\|closing` vs `open\|closing`) are not interchangeable |
| `use:portal` | `<Portal :target :disabled>` (`internals/Portal.vue`, a `<Teleport>`), **inside** the `v-if="presence.mounted"` gate | Teleport resolves synchronously — the React package keeps its portal outside the gate, here it goes inside. A closed surface emits nothing server-side |
| `$props.id()` | `useFancyId()` (wraps Vue's `useId()`); `uid()` verbatim for handler-time ids | keep `CSS.escape` where the source has it; ids read `v-N` |
| `.svelte.ts` rune modules | plain `.ts`: `$state` → `ref`/`reactive`/`shallowRef`, getters read `.value` | reactivity works outside components, so these keep their **exact Svelte signatures**, `start`/`stop` included |
| `svelte/elements` types | `ButtonHTMLAttributes`, `HTMLAttributes`, `AnchorHTMLAttributes` from `vue`; `FullAutoFill` declared locally | |
| `{...restProps}` | `defineOptions({ inheritAttrs: false })` + `v-bind="attrs"` on the same element | every other component also gets `inheritAttrs: false`, and no spread |
| `class:foo` / `style:x` / string `style` with custom properties | `:class="{ foo }"` / `:style="{ x }"` / **object** `:style="{ '--border-beam-size': size }"` | a string `style` goes through `cssText`, where jsdom drops custom properties and tests fail |
| `bind:value` on native inputs | `v-model` | `v-model` defers updates during IME composition; Svelte does not |
| `{#each items as it, i (key)}` / `{#each Array(n) as _, i (i)}` | `v-for="(it, i) in items" :key` / `v-for="(_, i) in n" :key="i"` | `v-for="n in 4"` yields 1…4 — always take the index |
| `<svelte:element this>` / `{#key}` | `<component :is>` / `:key` | |
| `<svelte:window>` / `<svelte:document>` | `addEventListener` in `onMounted`, removed in `onBeforeUnmount` | hand-rolled; no helper library |

**Effect-phase policy:** `flush: 'post'` or `onMounted` for everything
DOM-visible; `flush: 'pre'` only where Svelte used `$effect.pre`; sound
hydration and media-query `start()` in `onMounted`.

## Styling — the part that breaks silently

1. **Tailwind class strings are copied VERBATIM.** They ship as static literals
   and the consumer's Tailwind scans `dist/` for them (`tailwind.css` →
   `@source "./dist"`); never compute a class name from a variable, the scanner
   cannot see interpolations. With enough static nodes the compiler collapses a
   subtree into `createStaticVNode("<div class=\"…\">")`; that is fine and needs
   no action — the scanner reads class names out of the string literal (measured
   end to end against the example app), so leave static hoisting on.
2. **A Svelte `<style>` block becomes `<style scoped>` in the same SFC**, rules
   verbatim, class and keyframe names **identical** to the source: they are part
   of the visual contract and some are referenced from inline `style`
   attributes. Scoped styles aggregate into one `dist/styles.css`.
3. **`-global-` keyframe prefixes drop** (compiler syntax; keep the emitted
   name), and a keyframe referenced from an inline style or a custom property
   **cannot live in the scoped block** — the compiler renames keyframes and
   rewrites only the `animation:` references it sees. Move it to a **second,
   unscoped `<style>` block** in the same SFC. Rules reaching child or slot
   markup use `:deep()` / `:slotted()`; `:global()` maps to the same.
4. **Custom properties keep their local fallbacks; custom utilities are traps.**
   `animate-rainbow` is not stock Tailwind: trace it (`grep -rn` in `src/` at
   the repo root) to its `@theme`/keyframes definition and re-declare the
   equivalent in the component's own style block. Never depend on an app-level
   token existing.
5. **`prefers-reduced-motion` blocks are ported as-is.** Never drop one, in CSS
   or in script.
6. **Semantic colour names are declared once, in `vue/tailwind.css`.**
   `bg-background`, `bg-primary`, `text-primary-foreground`, `ring-ring` are not
   stock Tailwind either, but unlike rule 4's per-component utilities they are a
   shared vocabulary — redeclaring them per component would fight itself. The
   package stylesheet maps them with `@theme inline` and ships defaults in
   `@layer base`. A new semantic name in a ported component is added there too.

The shared stylesheets that are not SFC-scoped (markdown, stream-text, sound
toggle, cameleon, the skin sheets) stay plain `import "./x.css"` from their
`.ts` module, anchored on a root class.

## Tests

Vitest + `@testing-library/vue`, jsdom, globals on. Tests are `.ts` importing
the `.vue`; transpose assertion-for-assertion, add nothing speculative.

- `render(Cmp, { props })` is identical, `props.class` reaches the declared
  prop; pass `attrs` for anything meant to fall through.
- `createRawSnippet(...)` → `slots: { default: '<span>x</span>' }`; scoped →
  `slots: { item: '<template #item="{ step }">…</template>' }`.
- `await tick()` / `flushSync(...)` → `await nextTick()`; `fireEvent.*` is
  identical and already awaits it.
- `rerender(props)` **merges** where Svelte replaces — pass the full prop set.
- For an exposed ref, mount with `@vue/test-utils` and read `wrapper.vm.ref`.
- Context: `render(Cmp, { global: { provide: { [KEY]: v } } })` or an inline
  `defineComponent` + `h()`. The `*.test.svelte` harnesses are not ported; a
  `.test.vue` harness is only for a template too large to inline.
- Fake timers, `vi.stubGlobal("matchMedia")`, `document.body.querySelector(…)`
  carry over unchanged.
- SSR: `renderToString(createSSRApp(Cmp, props))` from `vue/server-renderer`,
  twice, asserted identical — every tier-3 component ships one.
- Leak suites mount and unmount twice and assert the counters return to zero
  (dismissable layers, `document.body.style.position === ""`, hover instances).
- Drop only what is rune-specific: `$state` proxy identity, `untrack`, action
  `update()` plumbing.

Run with `npx vitest run src/components/<slug>` from `vue/`.

## Hard rules for porting agents

- Work ONLY inside your assigned directories under `vue/src/`. The barrel, the
  matrix, the README and the manifest belong to the registrar.
- **Vue ≥3.5 APIs only**: reactive props destructure, `useId`,
  `useTemplateRef`, `onWatcherCleanup`, `<Teleport defer>` are the floor.
- **No helper libraries and no custom directives** — composables over verbatim
  `attach*` cores instead.
- **Never a bare `watchEffect`.** **Never `v-html`** — the markdown renderer
  walks its token tree through `<component :is>`.
- **Every SFC has a `<script setup>` block** — the dist-shape gate reads the
  source and fails without one. (It does not read the emitted filenames: under
  `preserveModules` a `<Name>.vue2.js` sibling is the NORMAL output for an SFC
  with `<style scoped>`, not a symptom.)
- NO installs, no `package.json`/config edits, no new dependencies. Allowed
  imports: `vue`, the component's own files, `../../utils.js`, the
  internals/cameleon modules, and the shared runtime deps the Svelte source
  already uses. Nothing may import `@vue/*` directly.
- Never edit a `<slug>-core.ts`: byte-identical copy, hashed across packages.
- Do not spawn sub-agents. Do not run tree-mutating git commands.
- No third-party product or library brand names in comments, code or docs —
  house rule; write what the code does, not where an idea came from.
- Anything you cannot reproduce exactly is a **divergence**: record it in
  `vue/README.md` under "## Divergences from the Svelte API" rather than
  silently changing the API.
- Before reporting done: the component appears in `vue/src/index.ts` and passes
  `npx vue-tsc --noEmit` plus its own vitest file.
