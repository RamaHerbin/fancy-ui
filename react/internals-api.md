# React internals API contract — `fancy-ui-react`

**Status:** binding design contract, pre-implementation. Every one of the ~137 component
ports codes against this document and nothing else.
**Law:** `react/PORTING.md`. Fidelity over improvement. Where this contract departs from the
Svelte *implementation*, it never departs from the Svelte *observable behaviour*, and every
such departure is listed in §10.

**Authoritative sources.** `src/lib/fancy-ui/_internals/**` and `src/lib/fancy-ui/sound/**`
**as they exist in this worktree** (`feat/react-foundations`, post-#232). The shared checkout's
copies of `anchor-position.ts`, `dismissable.ts`, `focus-trap.ts` and `scroll-lock.ts` genuinely
differ; an agent reading the wrong tree will miss the dialog close protocol. The motion runtime
spec in §5 is transcribed from `node_modules/svelte/src/internal/client/dom/elements/transitions.js`
(`animate()`, lines 316–460, and `css_to_keyframe`, lines 51–63).

**Design angle: consumer ergonomics, bought without losing test transposition.**
The audience is not a reader of the Svelte source — it is the port authors who each write three
to six lines against this API. So: a Svelte getter becomes a plain value wherever the hook can
hold it in a live ref; a Svelte workaround for a Svelte scheduler constraint is not reproduced
as ceremony. But every module whose existing Svelte test calls the raw action or factory keeps
a framework-free core with the same name and the same body, so those test files transpose with
a changed import line and no React.

---

## 0. Contents

1. Conventions every component port must follow
2. Foundations — `internals/dom/`
3. The load-bearing seven, plus `scroll-lock` and `id`
4. Effect-phase policy
5. The motion subsystem, and the one transition mechanism
6. The sound engine
7. SSR rules, per module
8. File layout, naming, CSS, barrel
9. Testing
10. Divergence register
11. Build order
12. Remaining internals — one paragraph each

---

## 1. Conventions every component port must follow

Nine rules. They are short because they are meant to be memorised.

**C-1 — An element-consuming hook takes the NODE, never a ref.**
Every hook in §3 and §5 whose first argument is an element takes `T | null` — the live node —
and keys its effect on `[node]`. Get the node from `useElementRef()`:

```tsx
const [panel, panelRef] = useElementRef<HTMLDivElement>();
useFocusTrap(panel, { initialFocus, fallbackFocus });
// …
<div ref={panelRef} />
```

A `useRef` + `[]`-deps effect is **forbidden** for any node that is created by
`presence.mounted`, by an `{#if}`-equivalent conditional, or by a polymorphic root. In those
cases `ref.current` is still `null` when a `[]`-deps effect fires, the effect never re-runs, and
the trap never arms — silently. `useElementRef` costs one extra render at mount, before paint,
and removes the whole bug class.

**C-2 — Compose refs ABOVE the early return.**
`useComposedRefs(...)` is a hook. Call it at the top of the component body, never inside the
JSX that follows `if (!presence.mounted) return null;`. A conditional hook throws
*"Rendered more hooks than during the previous render"* the first time `mounted` flips.

**C-3 — Ref callbacks use a block body.**
`ref={(n) => { r.current = n; }}` — never `ref={(n) => (r.current = n)}`. React 19 types a
returned value as a cleanup function.

**C-4 — `forwardRef` exactly where the Svelte source declares `ref = $bindable`.**
Never React-19-only ref-as-prop; the peer range is `^18 || ^19`. Internal hook signatures use
the structural `ElementRef` from §2, never `React.RefObject` — `@types/react` 18 and 19 disagree
on `RefObject`'s mutable/readonly shape, `react/package.json` devDeps only `@types/react` 19, so
a consumer on 18 is never type-checked in CI.

**C-5 — `data-state` vocabularies are not interchangeable.**
`Presence` renders three values (`"opening" | "open" | "closing"`) because `Presence.svelte`
does. Every **anchored surface** — dialog panel, dropdown content, popover, tooltip, select
panel — renders exactly two (`"open" | "closing"`): `anchored.ts:180` defines `SurfaceState`
with two values on purpose, `DialogSurface.svelte:138` writes a static `"open"`, and
`Dialog.test.ts:322` asserts it. Use `presence.state` for the first, `presence.surfaceState`
for the second. Rendering `data-state="opening"` on a panel is a visible divergence.

**C-6 — Ids come from `useFancyId()`, and no id ever becomes a CSS selector.**
`useFancyId()` wraps React's `useId()` — the counterpart of `$props.id()`, which is what every
SSR-visible id in the Svelte sources uses. Its output contains delimiters (`:r0:` on 18, `«r0»`
on 19) that are legal in `id`/`aria-*` and in `getElementById`, and illegal in an unescaped
`querySelector`. The output is **not** transformed. Derive sub-ids by suffixing one seed
(`${id}-description`, `${id}-error`), exactly as `FormField` does. `uid()` is ported verbatim,
throw included, and is only for an id minted inside an event handler.

**C-7 — Nothing may differ between a server render and its hydration.**
No `window`/`document`/`navigator`/`localStorage`/`matchMedia` read in a render path or a lazy
`useState` initializer. No `Math.random()` or `Date.now()` in a render path — take a `now` prop
or read `useNow()`.

**C-8 — Tailwind literals, `<style>` blocks and `--ft-*` fallbacks follow PORTING.md §Styling
unchanged.** Class strings copied verbatim as static literals; a Svelte `<style>` block becomes
a colocated `.css` anchored on the component's root class; `prefers-reduced-motion` blocks
ported as-is; custom-property fallback literals re-typed by hand into the component's own `.css`
(`tokens.ts` is the source of truth and nothing enforces the match — this is inherited from the
Svelte side and is not a port defect).

**C-9 — `"use client"` is not written in source.**
`react/vite.config.ts` applies `banner: '"use client";'` to every emitted module under
`preserveModules`, and its own comment records that a source-level directive would not survive
Rollup. Do not add one, and do not "fix" the build config.

---

## 2. Foundations — `react/src/internals/dom/`

Six files. All dependency-free, all side-effect-free at module scope. They land first; nothing
else compiles without them.

### `types.ts`

```ts
/**
 * Structural ref type. NOT React.RefObject / React.MutableRefObject: those changed
 * shape between @types/react 18 and 19 (19 dropped the mutable/readonly split), and
 * this package's peer range is `^18 || ^19`. A structural type is assignable from
 * every variant either version emits.
 */
export type ElementRef<T extends Element = HTMLElement> = { readonly current: T | null };
```

### `use-element-ref.ts`

```ts
/**
 * The node, and the callback ref that publishes it. THE way a component hands an
 * element to an internals hook (convention C-1).
 *
 * Returns state, not a ref, so a hook keyed on `[node]` re-runs the moment the node
 * appears — which is the only correct behaviour for a node whose existence is
 * conditional (a presence-mounted panel, an `{#if}`-equivalent branch). The setter
 * identity is stable for the life of the component.
 */
export function useElementRef<T extends Element = HTMLElement>(): [T | null, RefCallback<T>];
```

### `use-event-callback.ts`

```ts
/**
 * A permanently identity-stable wrapper that always calls the most recent `fn`.
 * `undefined` yields a stable no-op returning `undefined`.
 *
 * The ref is written inside `useInsertionEffect`, NOT during render. Insertion effects
 * run before every layout effect, so a listener always sees the current callback, and
 * a concurrent render that React throws away can never publish a stale one. This is
 * the React counterpart of the getter-object call sites the Svelte sources use
 * (`createMenuFocus({ get loop() { return root.loop; } })`).
 *
 * Every `on*` option on every internals hook goes through this. It is also why
 * anchor-position's `newOpts.onPlacement !== options.onPlacement` reset branch is
 * unreachable from the hook path: the identity never changes.
 */
export function useEventCallback<A extends unknown[], R>(
	fn: ((...args: A) => R) | undefined
): (...args: A) => R | undefined;
```

### `use-live-ref.ts`

```ts
/**
 * A read-only ref mirroring `value`, written in `useInsertionEffect` for the same
 * reason as above. The React counterpart of a Svelte getter for a NON-callback value:
 * a long-lived closure (a document listener, an observer callback, a stack entry)
 * reads `ref.current` and sees the latest render's value without being rebuilt.
 */
export function useLiveRef<T>(value: T): { readonly current: T };
```

### `use-composed-refs.ts`

```ts
/** Merges any number of refs into one callback ref. Skips nullish entries. */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T>;

/** Non-hook form, for use inside an existing callback ref. */
export function assignRef<T>(ref: Ref<T> | undefined | null, node: T | null): void;
```

`assignRef` already exists inline at `react/src/components/ripple-button/RippleButton.tsx:24`.
Lift it here and have that component import it.

### `ssr.ts`

```ts
/** `useLayoutEffect` in the browser, `useEffect` on the server. See §4. */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect;

/**
 * `false` on the server AND during the hydration render, `true` from the first
 * post-hydration render on. useSyncExternalStore, not useState+useEffect: no extra
 * commit, and tear-free under concurrent rendering.
 *
 *   const emptySubscribe = () => () => {};
 *   useSyncExternalStore(emptySubscribe, () => true, () => false)
 */
export function useIsHydrated(): boolean;

/** Lazily create a per-instance value exactly once. StrictMode-safe only because every
 *  `create*` factory in this contract is allocation-only — no listeners, no timers. */
export function useConstant<T>(create: () => T): T;
```

### `context.ts`

```ts
/**
 * A typed context plus its two readers. `useRequired` throws a named error outside its
 * provider (the compound-component contract); `useOptional` returns `undefined` (the
 * degrade-gracefully contract — `getField()`, `ToggleGroupItem` outside a `ToggleGroup`).
 */
export function createInternalContext<T>(displayName: string): {
	Provider: React.Provider<T | undefined>;
	useRequired: () => T;
	useOptional: () => T | undefined;
};
```

House precedent is `react/src/cameleon/context.ts`, whose lesson is now a rule: **a context
value is a plain object rebuilt when its scalar inputs change, and the rebuild is what makes
consumers re-render.** Never `useMemo(..., [])` around something mutable.

---

## 3. The load-bearing seven, plus `scroll-lock` and `id`

### House shape

> **A hook takes the element as its first argument (C-1) and returns either nothing, a value
> the consumer renders, or an imperative handle. Option names, defaults and doc comments are
> copied from the Svelte source unchanged unless listed in §10.**

Five of these modules have a Svelte test file that calls the raw action
(`focus-trap.test.ts` at 720 lines, `dismissable.test.ts`, `anchor-position.test.ts`,
`in-view.test.ts`, `sound-feedback.test.ts`). Those five therefore ship a framework-free
**core** with the action's exact body and an `{ update, destroy }` handle, and the hook is a
thin binding on top. The test files transpose with a changed import line and zero React.

---

### 3.1 `internals/anchor-position.ts` + `internals/use-anchor-position.ts`

`anchor-position.ts` is **verbatim** minus the `svelte/action` import: `computePosition`,
`OPPOSITE_SIDE`, `isHorizontalSide`, `clamp`, `getDefaultViewport` (already returns `Infinity`
off-browser), `overflows`, `placeAt`, `resolveAlign` including its `extent <= 0` early return,
`Side`, `Align`, `ComputePositionOptions`, `ComputePositionResult`.

```ts
export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

export interface ComputePositionOptions {
	side?: Side; align?: Align; offset?: number;
	viewport?: { width: number; height: number }; flip?: boolean;
}
export interface ComputePositionResult { x: number; y: number; side: Side; align: Align }

export function computePosition(
	anchor: DOMRect,
	floating: { width: number; height: number },
	opts?: ComputePositionOptions
): ComputePositionResult;

/** Verbatim from the Svelte action's options. */
export interface AnchorPositionOptions {
	anchor: () => HTMLElement | null;
	side?: Side; align?: Align; offset?: number;
	onPlacement?: (side: Side, align: Align) => void;
}
export interface AnchorPositionHandle {
	update(options: AnchorPositionOptions): void;
	recompute(): void;
	destroy(): void;
}
/** The action body, unchanged: passive+capture `scroll`, passive `resize`, the
 *  `reportedSide`/`reportedAlign` dedupe, and the `onPlacement`-identity reset. */
export function attachAnchorPosition(node: HTMLElement, options: AnchorPositionOptions): AnchorPositionHandle;
```

```ts
// use-anchor-position.ts
export interface UseAnchorPositionOptions {
	/** The anchor. A node, a ref, or a getter for a moving/virtual target. */
	anchor: ElementRef<HTMLElement> | HTMLElement | null | (() => HTMLElement | null);
	side?: Side; align?: Align; offset?: number;
	/** Stop positioning without unmounting. Default true. */
	enabled?: boolean;
	/** Fires on first placement, then only when the resolved side or align actually
	 *  changes. Most consumers want the RETURN VALUE instead. */
	onPlacement?: (side: Side, align: Align) => void;
}
export interface ResolvedPlacement { readonly side: Side; readonly align: Align }

/** Positions `node` with `position: fixed` against a live anchor. Returns the placement
 *  as ACTUALLY resolved — flipped and/or clamped. */
export function useAnchorPosition(
	node: HTMLElement | null,
	options: UseAnchorPositionOptions
): ResolvedPlacement;
```

**Why it returns the placement.** Twelve anchored components repeat the identical five lines
today (`DropdownMenuContent.svelte:45–52,183–185` is the canonical instance):

```svelte
let resolvedSide = $state<Side>(root.side);
let resolvedAlign = $state<Align>(root.align);
use:anchorPosition={{ …, onPlacement: (s, a) => { resolvedSide = s; resolvedAlign = a; } }}
```

The return value collapses that to one line in `DropdownMenuContent`, `DropdownMenuSubContent`,
`PopoverContent`, `SelectPanel`, `Tooltip`, `HoverCard`, `TimePicker`, `DatePicker`, `Combobox`,
`Autocomplete`, `ContextMenuContent`, `NavigationMenu`. `onPlacement` is retained for
`SubContext.setPlacement`, which publishes upward into a parent context instead of rendering
locally.

**Seeding.** Initial state is `{ side: options.side ?? "bottom", align: options.align ?? "center" }`
— the *requested* values, matching `resolvedSide = $state<Side>(root.side)`. A hardcoded
`"bottom"` seed shows as a one-frame `transform-origin` jump on every open; only a real flip
may move the origin.

**Mechanics.** One `useIsomorphicLayoutEffect` keyed `[node, enabled]` mounts and destroys the
core; a second, keyed `[node, side, align, offset]`, calls `handle.update()`. `anchor` and
`onPlacement` go through `useEventCallback`/`useLiveRef`, so a scroll listener is never rebuilt
for a changed callback. `setPlacement` is called with a fresh object only when a value actually
changed, so a scroll storm produces zero re-renders.

**Interaction with React's `style` prop.** The core writes `position`, `left`, `top`
imperatively. React only removes style properties present in the *previous* `style` object, so
imperative writes survive re-renders. A port may write `style={{ transformOrigin: originFor(side, align) }}`
on the same element (mirroring `style:transform-origin`), but **must never** put `position`,
`left` or `top` in that object.

**SSR.** Nothing runs. The element renders unpositioned, exactly as in Svelte, and every
anchored surface is gated on an `open` that is false during SSR.

**Testing.** The pure half of `anchor-position.test.ts` transposes with no edits. The action
half transposes onto `attachAnchorPosition(node, opts)` + `handle.destroy()`. Add one React
test: a `side` prop change drives exactly one recompute; a StrictMode mount/unmount leaves zero
window listeners.

---

### 3.2 `internals/Portal.tsx`

The Svelte action *moves* an already-rendered node; `createPortal` *renders into* the target.
Same resulting DOM, different route.

```tsx
export interface PortalProps {
	/** Element, CSS selector, or undefined for `document.body`. A selector matching
	 *  nothing falls back to `document.body`. */
	target?: HTMLElement | string;
	/** Render children in place instead of portalling. */
	disabled?: boolean;
	children?: ReactNode;
}
export function Portal({ target, disabled, children }: PortalProps): ReactElement | null;

/** Verbatim `resolveTarget`. Exported for tests and for a consumer resolving its own. */
export function resolvePortalTarget(target?: HTMLElement | string): HTMLElement;

/** The mounted target, or null on the server and during hydration. */
export function usePortalTarget(target?: HTMLElement | string): HTMLElement | null;
```

**Mount gating.** `usePortalTarget` returns `null` unless `useIsHydrated()` is true, then
resolves the target in a layout effect. `Portal` renders `null` until it has one. This makes a
hydration mismatch structurally impossible and costs one extra client render for a surface open
during SSR — a case that does not occur, since every portalled surface is gated on an `open`
that starts false. Never a lazy `useState` initializer reading `document` (C-7).

**Two consequences, stated loudly.**

- **The portal-before-focus-trap ordering law dissolves.** `focus-trap.ts`'s header warns at
  length to put `use:portal` and `use:focusTrap` on the same element, portal first, because
  `.focus()` on a detached node is a silent no-op. `createPortal` commits children into the
  container before any effect runs, and refs populate before layout effects, so the node is
  always connected when `useFocusTrap` focuses it. The hazard cannot recur. Port `DialogSurface`
  without the ceremony and note it in the component README.
- **Synthetic event bubbling differs.** A React portal still bubbles *synthetic* events through
  the React tree; a Svelte-moved node's native events stop at `<body>`. Divergence D-1. Inert in
  practice: `useDismissable` listens natively on `document`, and no compound root that owns a
  portalled surface renders handlers of its own.

**Testing.** `portal.test.ts` becomes a `.test.tsx` asserting `document.body.contains(...)`, the
string-selector path, the miss→body fallback and removal on unmount. Drop the "node is moved
from its original parent" assertion — it is not true of the port — and replace it with "renders
into target, not into the React parent".

---

### 3.3 `internals/dismissable.ts`

The module-scope `Layer` interface, the `layers` array, `isTopLayer()`'s **downward scan past
inactive layers**, both handlers, and the deliberate ordering of the `isActive()` guard *before*
`stopImmediatePropagation()` are copied **verbatim, comments included**. This module's entire
value is the nested-overlay contract and it must not drift. A module-scope array declaration is
not a side effect; `sideEffects: ["**/*.css"]` stays honest.

```ts
export interface DismissableOptions {
	onDismiss: () => void;
	/** Escape dismisses. Default true. */
	escape?: boolean;
	/** A pointerdown outside dismisses. Default true. */
	outsideClick?: boolean;
	/** Elements that do not count as "outside" — typically the trigger.
	 *  The Svelte `exclude: () => (HTMLElement|null)[]` getter, resolved at event time. */
	exclude?: Array<ElementRef<HTMLElement> | HTMLElement | null | undefined> | (() => (HTMLElement | null)[]);
	/**
	 * Whether this layer is still LIVE. Pass the surface's `open`. Default true.
	 *
	 * A plain boolean where Svelte required a getter. The getter exists because an
	 * action's `update()` never runs again once its `{#if}` branch goes INERT and
	 * Svelte's scheduler skips inert effects, so a changed param never arrived. React
	 * re-renders the still-mounted exiting surface normally. Semantics are unchanged:
	 * a layer stays ON the stack for its whole exit and stops being TOP of it the
	 * instant `active` flips.
	 */
	active?: boolean;
	/** Whether the layer is registered at all. Default true. */
	enabled?: boolean;
}

export interface DismissableHandle { update(options: DismissableCoreOptions): void; destroy(): void }
/** The action body. `active`/`exclude` stay GETTERS here — this is the Svelte surface. */
export function attachDismissable(node: HTMLElement, options: DismissableCoreOptions): DismissableHandle;

export function useDismissable(node: HTMLElement | null, options: DismissableOptions): void;

/** Test-only. Not exported from index.ts. */
export function __dismissableLayerCount(): number;
```

**Rune → hook.** Neither `useState` nor `useSyncExternalStore` — this is behaviour, nothing it
owns is rendered. One `useEffect` keyed `[node, enabled]` attaches the core and returns
`destroy` as cleanup. `onDismiss` goes through `useEventCallback`; `active`, `escape`,
`outsideClick` and `exclude` through `useLiveRef`, and the hook hands the core getter closures
over those refs — so the layer's `isActive()` and both handlers read current values with zero
listener churn.

**Known limitation, documented rather than fixed.** React runs child effects before parent
effects, so two overlays mounting in the **same commit** push inside-out, inverting
`isTopLayer()`. Reaching it requires an ancestor overlay and a descendant overlay to open
together on first paint; in every real case a layer mounts when it opens and is portalled to
`document.body`, so push order equals open order. Sorting the stack by document order is
**not** done: it would change dismissal semantics for the ordinary case and is not what the
Svelte side does.

**StrictMode.** `attachDismissable` pushes exactly one layer and `destroy()` splices that layer
*by identity*, so the double cycle push → splice → push leaves a stack of one at the same depth.
`__dismissableLayerCount()` exists so the suite can assert the stack drains to 0.

---

### 3.4 `internals/focus-trap.ts`

`FOCUSABLE_SELECTOR`, `isVisible` (with its jsdom rationale), `getFocusableElements`,
`focusContainerFallback`, `focusInitial`, the Tab/Shift+Tab cycling handler, `rearm()`'s
`activeElement` recapture with its `document.body` exclusion, and the **three-step return chain**
(original element if connected → `fallbackFocus()` if connected → `document.body` with an
explicitly set `tabindex="-1"`) with its `returned` latch are all **verbatim**.

```ts
export interface FocusTrapOptions {
	initialFocus?: ElementRef<HTMLElement> | HTMLElement | null;
	/** Restore focus on unmount. Default true. Does not govern `returnFocusNow()` —
	 *  asking for the eager return IS asking for the return. (Verbatim contradiction rule.) */
	returnFocus?: boolean;
	fallbackFocus?: () => HTMLElement | null | undefined;
}

/**
 * The two functions the Svelte side hands out through `onActivate`. In React they are
 * simply RETURNED: a hook can return a value, an action cannot.
 */
export interface FocusTrapHandle {
	/** Runs the three-step return chain IMMEDIATELY and disarms the unmount return.
	 *  Idempotent. Called at the dismiss instant, by `usePresence`'s `onExitStart`. */
	returnFocusNow(): void;
	/** Undoes that latch and pulls focus back inside, recapturing the element it
	 *  displaced. Called at `onEnterStart` when a surface is reopened mid-exit. */
	rearm(): void;
}
export interface FocusTrapCoreHandle extends FocusTrapHandle {
	update(options?: FocusTrapOptions): void;
	destroy(): void;
}
export function attachFocusTrap(node: HTMLElement, options?: FocusTrapOptions): FocusTrapCoreHandle;

/** Identity-stable handle, safe in a dependency array. Mounts in a LAYOUT effect so
 *  focus lands before paint. */
export function useFocusTrap(node: HTMLElement | null, options?: FocusTrapOptions): FocusTrapHandle;
```

**Ruling: the handle is returned, `onActivate` is not ported, and `active: boolean` is
rejected.** `onActivate` exists only because a Svelte action has no return channel to its
template (`focus-trap.ts:83`). Returning the two functions is the *literal* port — same names,
same semantics, same two moments. An `active: boolean` prop would need a `[active]`-keyed effect
plus an `isFirst` ref to skip its own first run: more machinery to get wrong for the same two
moments, and it drops the `returnFocus: false` + eager-return contradiction rule the source
spells out. `DialogSurface`'s two module-level `let`s, two handler functions and `onActivate`
closure still collapse from ~25 lines to two — the ergonomic win survives intact.

**Why `rearm` is still needed in React.** A reopen mid-exit does **not** remount: `usePresence`
keeps `mounted` true through the whole exit, so the effect never re-ran and the `returned` latch
is still set. Identical hazard, identical fix. This is the strongest single argument for
`usePresence` keeping the node mounted rather than unmounting and re-mounting on reopen.

**StrictMode.** `previouslyFocused` is captured *inside* the effect, never in a render-phase
ref. The cycle is mount(focus panel) → cleanup(return focus to trigger) → mount(recapture the
trigger, focus panel): self-healing, at the cost of one extra focus round-trip in dev. A ref
that survives the double-invoke is deliberately **not** used — the second mount would believe it
had already returned.

**Testing.** The 720-line `focus-trap.test.ts` transposes onto `attachFocusTrap` with the
`onActivate` destructure becoming a handle read. Add: handle identity stability across
re-renders, layout-effect focus timing, StrictMode.

---

### 3.5 `internals/field.ts`

**`FieldContext` and `createFieldState` keep their exact Svelte names.** The interface is copied
byte-for-byte, including `valid?`'s optionality and the full doc comment explaining it. Its own
header calls it the frozen surface every control in that wave was built against; a hand-built
object literal that type-checks against the Svelte interface must type-check against this one.

```ts
export interface FieldContext {
	readonly controlId: string;
	readonly labelId?: string;
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
	readonly valid?: boolean;
	readonly required: boolean;
	readonly disabled: boolean;
}

/** The Svelte `FieldStateOptions`, with every getter replaced by its value. */
export interface FieldStateOptions {
	controlId: string;
	labelId: string | undefined;
	descriptionId: string;
	errorId: string;
	hasDescription: boolean;
	hasError: boolean;
	valid: boolean;
	required: boolean;
	disabled: boolean;
}

/** Pure. Same `describedBy` join order, same "error always wins" rule inside `valid`. */
export function createFieldState(options: FieldStateOptions): FieldContext;

export const FieldReactContext: React.Context<FieldContext | undefined>;
export function FieldProvider(props: { value: FieldContext; children?: ReactNode }): ReactNode;

/** The React `getField()`. Returns `undefined` outside a FormField, per contract. */
export function useField(): FieldContext | undefined;
```

**Rune → hook: `useMemo` on the nine scalars — and emphatically not a mount registration.**

```ts
const value = useMemo(
	() => createFieldState({ controlId, labelId, descriptionId, errorId,
		hasDescription, hasError, valid, required, disabled }),
	[controlId, labelId, descriptionId, errorId, hasDescription, hasError, valid, required, disabled]
);
```

Nine primitives, a field-by-field dep array (never the options object), so identity is stable
across unrelated parent re-renders and changes exactly when a consumer must re-render.

The header of `field.svelte.ts` argues at length that `describedBy` must be **derived on read**,
not registered from a mount `$effect`, so the server-rendered `aria-describedby` already points
at a paragraph the same pass rendered. That argument transfers word for word: a `useEffect`
registration does not run on the server either. Deriving inside `useMemo` puts
`aria-describedby` in the server HTML exactly as correct as it is after hydration. This is the
property the source cares most about and it is preserved exactly.

**Testing.** The pure half of `field.test.ts` transposes directly against `createFieldState`.
`FieldHarness.test.svelte` + `FieldConsumer.test.svelte` collapse into two components declared
at the top of `field.test.tsx` — a `.test.svelte` file exists only because Svelte components
need their own file. Keep the key case: a consumer with no provider observes `undefined` (which
is just `createContext`'s default, not a faked `setContext(KEY, undefined)`).

---

### 3.6 `internals/menu.ts`

`compareDocumentOrder` (with its identity case), `visibleTextOf` (with the `aria-hidden` skip),
`isDisabled` (with its native-`disabled` branch), `orderedItems()`'s `isConnected` filter,
`findNext`'s bounded walk, the `-1`-means-"one before the first" convention, `focusAt`,
`indexOfFocused`, `register` with its duplicate refusal, `move`, `moveToEdge`, `focusItem`,
`clear`, `clearBuffer`, `labelOf`, `typeahead` (repeat-character cycle, `buffer = lower`
collapse, the 500 ms `TYPEAHEAD_TIMEOUT_MS`) and `destroy` are **verbatim**. The single edit is
`let focusedElement = $state<HTMLElement | null>(null)` → a plain `let` plus a `notify()` at each
assignment, backed by a `Set<() => void>`.

```ts
export interface MenuFocusOptions {
	loop?: boolean;
	onFocusChange?: (index: number, element: HTMLElement) => void;
}

export interface MenuFocusState {
	/** Computed on read from the live ordered list, exactly like the Svelte getter. */
	readonly focusedIndex: number;
	register(element: HTMLElement): () => void;
	move(delta: number): void;
	moveToEdge(edge: "first" | "last"): void;
	focusItem(element: HTMLElement): void;
	clear(): void;
	typeahead(char: string): void;
	destroy(): void;
	/** Added for React. Notifies on every focusedElement change. */
	subscribe(listener: () => void): () => void;
}

/** Framework-free. Same name, same options shape (`loop` and `onFocusChange` read
 *  lazily on every call), so `menu.test.ts` transposes with no React at all. */
export function createMenuFocus(options?: MenuFocusOptions): MenuFocusState;

/** One store per mount; `destroy()` on unmount. The hook builds a getter object over
 *  live refs, so `loop: root.loop` as a PLAIN VALUE behaves identically to Svelte's
 *  `get loop() { … }`. The returned handle's identity NEVER changes — put it straight
 *  into a context value with no memo dance. */
export function useMenuFocus(options?: MenuFocusOptions): MenuFocusState;

/** A per-item callback ref. One line in each item component. */
export function useMenuItemRef(menu: MenuFocusState): RefCallback<HTMLElement>;

/** Opt-in, and discouraged for the reason the Svelte doc gives. getServerSnapshot: -1. */
export function useMenuFocusedIndex(menu: MenuFocusState): number;
```

**No React state by default.** `focusedElement` is `$state` in Svelte, but the module's own docs
forbid rendering off it: *"do not drive rendering off this number reactively. Use `:focus` or
`onFocusChange` for that."* Taken at its word: the handle is created once, never changes
identity, and no item re-renders when focus moves. Real DOM focus does the rendering via
`:focus` / `:focus-visible`, exactly as in Svelte. Components that genuinely must render off the
index opt in through `useMenuFocusedIndex`, which subscribes via `useSyncExternalStore` — the
right API here because the mutation source (`focusItem` from a `pointerenter`, `typeahead` from
a document keydown) is outside React's knowledge, and the snapshot is a number, so identity
stability is free.

**`useMenuItemRef` mechanics** (React 18 ref callbacks cannot return a cleanup — that is 19-only,
so the unregister is held locally):

```ts
const unregister = useRef<(() => void) | null>(null);
return useCallback((node: HTMLElement | null) => {
	unregister.current?.();
	unregister.current = node ? menu.register(node) : null;
}, [menu]);
```

Stable because `menu` is stable. It replaces per-item `$effect(() => focus.register(el))` in
`DropdownMenuItem`, `ContextMenuItem`, `DropdownMenuSubTrigger`, `NavigationMenuItem` and
`CommandMenuItem`. Registration order is irrelevant: `orderedItems()` sorts by
`compareDocumentPosition` at navigation time, which is what makes the source's central promise
— *items navigate in DOM order, not registration order* — survive React's mount ordering for
free.

**Two timing notes for `DropdownMenuContent`.**
`DropdownMenuContent.svelte:96` does `void tick().then(() => focus.moveToEdge(edge))` because
items register from their own mount `$effect`, which runs after the parent's. React runs child
effects **before** parent effects, so items are already registered when the parent's effect
runs: **drop the `tick()`** and say so in the component README (D-9).
Second: the Svelte side never calls `focus.destroy()` — a latent typeahead-timer leak. The hook
cannot forget (D-5).

---

### 3.7 `internals/listbox.ts`

`findNext`, the `NONE` sentinel, `commitActive`'s same-index no-op guard (the single write site
— which is what makes the `$state` → notify change a one-liner), `setActive`'s "a disabled index
is left alone, never activated" rule, `move`'s "-1 is not a position" rule, the edge walks, and
the whole typeahead block (repeat cycle, buffer collapse, the deliberate `"sse"` → `"se"`
decision) are **verbatim**.

```ts
export interface ListboxOptions {
	count: () => number;
	enabled?: (index: number) => boolean;
	onActiveChange?: (index: number) => void;
	loop?: boolean;
}
export interface ListboxState {
	readonly activeIndex: number;
	move(delta: number): void;
	moveToEdge(edge: "first" | "last"): void;
	setActive(index: number): void;
	typeahead(char: string, labelAt: (index: number) => string): void;
	destroy(): void;
	subscribe(listener: () => void): () => void;
}
/** Verbatim options shape — `listbox.test.ts` (458 lines, already pure) transposes
 *  with only the import path changed. */
export function createListbox(options: ListboxOptions): ListboxState;

export interface UseListboxOptions {
	/** A plain number. The hook wraps it in a live ref and hands the factory the
	 *  getter it expects, so a virtualised list that changes `count` between renders
	 *  is honoured at call time exactly as in Svelte. */
	count: number;
	enabled?: (index: number) => boolean;
	onActiveChange?: (index: number) => void;
	loop?: boolean;
}
export interface ListboxHandle {
	/** The active option for THIS render, or -1. */
	readonly activeIndex: number;
	move(delta: number): void;
	moveToEdge(edge: "first" | "last"): void;
	setActive(index: number): void;
	typeahead(char: string, labelAt: (index: number) => string): void;
}
export function useListbox(options: UseListboxOptions): ListboxHandle;
```

**This is the one index that must drive rendering**, and it is read with
`useSyncExternalStore(store.subscribe, () => store.activeIndex, () => -1)`. `Select` puts it in
`aria-activedescendant` and each row reads `isActive(index)`. The snapshot is a plain number, so
it is trivially stable; `getServerSnapshot` returns `-1`, which is the value the module starts at
on both sides, so server and hydration agree that nothing is active.

The methods are stable; only the returned object's identity changes with `activeIndex`
(`useMemo(..., [activeIndex])`). A two-context split (stable actions / changing index) is
**deliberately rejected**, not overlooked: it buys nothing at realistic option counts and doubles
the provider surface four components (`Select`, `Combobox`, `Autocomplete`, `TimePicker`) code
against.

`Select`'s clamp effect (*"activeIndex can end up pointing past the end of the new, shorter
array"*) stays in `Select`, as `useEffect(..., [options.length])`. It is component logic.

---

### 3.8 `internals/scroll-lock.ts`

`lockScroll()` is **verbatim**: the whole header comment (the `position: fixed` vs
`overflow: hidden` reasoning with its iOS rationale, the scrollbar-gutter measurement, the
skip-the-write-when-the-gutter-is-zero rule), the `LockedState` shape, the module `lockCount` and
`saved`, and the idempotent `released` latch.

```ts
export function lockScroll(): () => void; // verbatim

/**
 * Acquires while mounted and `enabled` (default true).
 *
 * TIMING RULE FOR PORTS: call it INSIDE the presence-mounted subtree — the panel
 * component `usePresence` keeps alive through the exit — and do NOT pass `open`.
 * The Svelte action's entire reason for existing is release timing: an `$effect`
 * keyed on `open` releases the instant `open` flips, leaving the page scrollable
 * under a scrim that is still on screen. Mounting scope is the React equivalent;
 * `enabled` exists only for non-animated surfaces (a `duration: 0` drawer, a
 * reduced-motion path).
 */
export function useScrollLock(enabled?: boolean): void;
```

`useIsomorphicLayoutEffect`, not `useEffect`: a post-paint lock is a visible one-frame scroll
jump on a long page.

**StrictMode.** acquire → release → acquire drives the refcount 1 → 0 → 1 within one commit,
before paint. The release restores the body styles and `scrollTo`s back; the second acquire
re-reads the now-restored `window.scrollY` and re-applies. Correct, and it works only because
`saved` is re-captured on each `lockCount === 0` transition and `released` is per-acquisition —
both already true in the Svelte source. The suite asserts `document.body.style.position === "fixed"`
*after* a StrictMode mount so a future refactor cannot leave it at 0.

---

### 3.9 `internals/use-id.ts`

```ts
/** SSR-stable id — the counterpart of `$props.id()`. THE only id source a port
 *  reaches for. Output is NOT transformed; see convention C-6. */
export function useFancyId(prefix?: string): string; // default prefix "fui"

/** Verbatim from id.ts, throw and all. Only for an id minted inside an event
 *  handler or an effect. Never call it in a render path. */
export function uid(prefix?: string): string;
```

`id.test.ts` transposes verbatim (monotonicity, prefix, and the server throw under
`@vitest-environment node`).

---

## 4. Effect-phase policy

The rule port authors get wrong most often, so it is a table rather than prose.

| Hook | Phase | Why |
|---|---|---|
| `useAnchorPosition`, `useFloat` | `useIsomorphicLayoutEffect` | A post-paint position is a visible jump from (0,0) |
| `useFocusTrap` | `useIsomorphicLayoutEffect` | Focus must land before the user's first frame |
| `useScrollLock` | `useIsomorphicLayoutEffect` | A post-paint lock is a visible scroll flash |
| `usePresence` (leg start, `inert`, unmount) | `useIsomorphicLayoutEffect` | Svelte starts intros pre-paint; a passive effect paints one frame at rest |
| `useAutoscroll` (pin) | `useIsomorphicLayoutEffect` | Writes `scrollTop`; a post-paint write is a visible jump |
| `useInView` | `useIsomorphicLayoutEffect` | The no-`IntersectionObserver` fail-visible branch calls `onChange(true)` synchronously in Svelte; a passive effect shows one frame of hidden content. Observer construction cost is negligible |
| `useDismissable` | `useEffect` | Document listeners and a stack push; nothing is visible in the first frame and no key can be pressed before it |
| `useSoundFeedback` | `useEffect` | Passive listeners only |
| `useMenuItemRef` registration | ref callback (commit) | Must survive React's detach-then-attach protocol |
| `hydrateSound()` | `useEffect` | Reads `localStorage`; must never run in a render path |

---

## 5. The motion subsystem — `react/src/internals/motion/`

### 5.1 The one mechanism, chosen once

`transitions.ts`'s `preset()` and `anchored.ts`'s `anchored()` are **css-only transitions with a
JS easing function**. `JS_EASINGS.out` is `expoOut`, which is not expressible as a CSS
`cubic-bezier` — `EASINGS.out = cubic-bezier(0.16, 1, 0.3, 1)` is a hand-matched CSS
*approximation* the sources keep, deliberately separate, for CSS-driven components. Three
candidate mechanisms:

| Candidate | Verdict |
|---|---|
| CSS class choreography (`data-state` + a stylesheet) | **Rejected.** It cannot express `css(t, u)` — a per-frame function of a runtime `distance`/`scale` floor — without hardcoding every preset × every param combination, which is the exact drift `presets.ts` exists to prevent. It also cannot reverse from an in-flight position, and it animates a visibly different curve. |
| A JS rAF loop writing `el.style` | **Rejected.** Off the compositor; reintroduces jank the current implementation does not have. |
| A motion library | **Rejected.** No new runtime dependencies (PORTING.md hard rules). |
| **WAAPI, driving the same sampled keyframes** | **Chosen.** |

The decisive fact: **Svelte's css transitions already are WAAPI.**
`svelte/src/internal/client/dom/elements/transitions.js`'s `animate()` samples `css(t, 1 - t)`
at `n = Math.ceil(duration / (1000 / 60))` points, converts each to a keyframe object, and hands
the array to `element.animate()`. Reproducing that algorithm against the *same* `cssFor()`
produces a byte-identical keyframe array and therefore a pixel-identical animation. Fidelity is
structural, not aspirational. It also inherits, free: the `duration: 0` fast path reduced motion
relies on, reversal smoothing from an in-flight position, and jsdom testability through the same
`Element.prototype.animate` stub the Svelte suite already uses.

**The porting rule that follows, and it is mechanical:**

| Svelte source uses | React port uses |
|---|---|
| `transition:` / `in:` / `out:` directive | `usePresence` + the ported transition factory |
| `<style>` block + `data-state` attribute | a colocated `.css` file + the same `data-state` attribute |

`Presence`, `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `HoverCard`, `Select`,
`DropdownMenu`, `ContextMenu`, `Sheet`, `Drawer`, `FormField`, `StickyScroll` and `Toast` take
the first row. `Reveal`, `Pressable`, `StatusMorph`, `Skeleton`, `SoundToggle` and `ContextRing`
take the second and need nothing here but `useReducedMotion`.

### 5.2 `motion/easing.ts`

```ts
/** The two curves `JS_EASINGS` names, inlined because the framework's easing module
 *  cannot become a runtime dependency of this package. Closed forms, copied
 *  byte-for-byte — do NOT "clean up" the endpoint guards; they are the shape of the
 *  curve at exactly the points `css()` is sampled at. */
export function expoIn(t: number): number;   // t === 0 ? t : 2 ** (10 * (t - 1))
export function expoOut(t: number): number;  // t === 1 ? t : 1 - 2 ** (-10 * t)
export const linear: (t: number) => number;  // (t) => t
```

`easing.test.ts` pins both curves at 0, 0.25, 0.5, 0.75, 1 against literal expected values.

### 5.3 `motion/tokens.ts`, `presets.ts`, `stagger.ts`, `haptics.ts`, `types.ts`

Verbatim, comments included. `tokens.ts` changes only its easing import
(`JS_EASINGS = { out: expoOut, in: expoIn }` from `./easing.js`) and keeps the whole header —
including the `micro`-has-no-JS-consumer note, the colour-transitions-are-exempt-from-reduced-motion
rule, and the warning that every component retypes the `--ft-*` literals into its own CSS
fallbacks with nothing enforcing the match. `presets.ts` keeps `PresetName`, `RevealPresetName`,
`PRESET_NAMES`, `PresetGeometry`, `PRESETS`. `stagger.ts` keeps `StaggerFrom`, `staggerDelay`,
`distanceFromOrigin`, the compression cap and the do-not-clamp-a-numeric-origin decision — and
no hook: it is called from render, into a `style` custom property. `haptics.ts` keeps
`HAPTIC_PATTERNS`, `HapticPattern`, `canVibrate`, `vibrate` including the `!== false` coercion
and the never-throws wrapper — no hook: it is called from click handlers.
`types.ts` is type-only, zero JS output under `verbatimModuleSyntax`.

### 5.4 `motion/transitions.ts` — **signature unchanged**

`cssFor`, `preset()`, `DEFAULT_DISTANCE = 16`, the resolution order and the direction-dependent
easing default are verbatim. The only edit is the type import: `TransitionConfig` from
`svelte/transition` becomes a locally declared, structurally identical interface.

```ts
export interface TransitionSpec {
	delay: number;
	duration: number;
	easing: (t: number) => number;
	/** `t` runs 0 (hidden) → 1 (visible); `u = 1 - t`. Receives ALREADY-EASED `t` —
	 *  the sampler applies `easing` before calling this, which is why `cssFor`
	 *  interpolates linearly in `t`. See the file header. */
	css: (t: number, u: number) => string;
}

export type TransitionDirection = "in" | "out" | "both";

/** A Svelte transition function's shape, preserved exactly — including the unused
 *  first parameter. `transitions.test.ts` and `anchored.test.ts` call these with
 *  `(node, params, options)` and must transpose 1:1. */
export type TransitionFn<P = unknown> = (
	node: Element,
	params?: P,
	options?: { direction: TransitionDirection }
) => TransitionSpec;

export interface PresetParams {
	duration?: number; delay?: number; distance?: number; easing?: (t: number) => number;
}

export function preset(name: PresetName): TransitionFn<PresetParams>;
```

The `tick` field of Svelte's `TransitionConfig` is omitted: nothing in this library uses it.
**Do not** drop the `node` parameter or flatten `options` into a positional `direction` — that
breaks the 1:1 transposition of two existing test files for no gain.

### 5.5 `motion/anchored.ts`

`prefersReducedMotion` (fresh `window.matchMedia` on every call, never memoised, never called
from a render path), the `ORIGINS` table with its physical-not-logical decision, `originFor`,
`ENTER_FLOOR = PRESETS.scale.scale ?? 0.92`, `EXIT_FLOOR = 1 - (1 - ENTER_FLOOR) / 2`,
`AnchoredParams`, `anchored()` (including `params.entering` winning outright over
`options.direction`, the never-delayed exit, and the `floor === 1` emits-no-transform rule) and
`SurfaceState` are **verbatim**.

**`markSurfaceState` is not ported.** It exists solely because Svelte marks a closing `{#if}`
branch INERT and its scheduler skips inert effects, so a reactive attribute inside a closing
block never reaches the DOM. React re-renders the exiting surface normally. Ports write
`data-state={presence.surfaceState}` as an ordinary attribute. Same DOM, same CSS hooks.
Divergence D-2. `SurfaceState` the type stays exported and stays two-valued (C-5).

### 5.6 `motion/animate.ts` — the sampler

A line-for-line port of `animate()`. This is the module that makes §5.1 faithful rather than
approximate, so its behaviour is specified exhaustively.

```ts
/** Svelte's `css_to_keyframe` + `css_property_to_camelcase`, exactly: split on `;`,
 *  split each part at the first `:`, BREAK (do not continue) on a malformed part,
 *  camelCase the property EXCEPT names starting with `--`, and special-case
 *  `float` → `cssFloat` and `offset` → `cssOffset`. */
export function cssToKeyframe(css: string): Keyframe;

export interface TransitionRun {
	/** Current eased position in `css()`'s own `t` space — Svelte's `get_t`. Read by
	 *  a reversing counterpart. */
	t(): number;
	/** Cancel without finishing. Cancels the animation, nulls its effect (Chromium
	 *  leak), and replaces `onfinish` with a no-op (a cancel can otherwise still fire
	 *  onfinish in rare cases). */
	abort(): void;
	/** Silences this run's `onFinish` without stopping it. Called on the counterpart
	 *  the instant a new leg starts. */
	deactivate(): void;
}

export function runTransition(
	element: Element,
	spec: TransitionSpec,
	to: 0 | 1,
	counterpart: TransitionRun | undefined,
	onFinish: () => void
): TransitionRun;
```

**The algorithm, in order. All six points are load-bearing.**

1. `counterpart?.deactivate()` runs first, before anything else.
2. **`spec.duration` falsy → `onFinish()` runs SYNCHRONOUSLY and `element.animate()` is never
   called.** The returned handle is `{ abort: noop, deactivate: noop, t: () => to }`. This is
   the reduced-motion fast path `anchored()` and `Presence` both rely on, and the one
   `transitions.test.ts` pins with "animate was never called". It is also why a reduced-motion
   close is synchronous: `mounted` flips inside the same layout effect, before paint.
3. **A leading dummy animation is ALWAYS created**, even when `delay` is 0:
   `element.animate(dummyKeyframes, { duration: delay, fill: "forwards" })`. Its keyframes are
   `[cssToKeyframe(css(0, 1)), cssToKeyframe(css(0, 1))]` **only** when this is a fresh intro
   (`to === 1` and no counterpart), and `[]` otherwise. Pinning the hidden state for the whole
   delay is what stops a delayed entrance painting one frame at rest first; keeping the dummy at
   `delay: 0` is what defers the real keyframes until the DOM has updated. Consequence for the
   port: **the main animation always starts asynchronously**, in the dummy's `onfinish`.
4. In the dummy's `onfinish`: cancel the dummy, then
   `t1 = counterpart?.t() ?? 1 - to`, then `counterpart?.abort()` — in that order, the read
   before the abort. Then `delta = to - t1`, `duration = spec.duration * Math.abs(delta)`.
5. If `duration > 0`: `n = Math.ceil(duration / (1000 / 60))` and the loop runs `i = 0` to
   `i <= n` **inclusive** (n+1 keyframes — `n` must be an integer or the `to` value is missed),
   with `t = t1 + delta * easing(i / n)` and `keyframes[i] = cssToKeyframe(css(t, 1 - t))`.
   The curve therefore lives entirely in the **sample positions**; the main animation is
   `element.animate(keyframes, { duration, fill: "forwards" })` — **no `easing` option and no
   `delay` option**.
6. `t()` returns `1 - to` before the dummy finishes, `t1 + delta * easing(currentTime / duration)`
   while running, and `to` after the main animation's `onfinish` — which then calls `onFinish()`.

**Two React-side lifecycle rules that follow, and both are visible if broken:**

- **On enter finish, abort the run.** Svelte does exactly this (`intro?.abort(); intro = undefined`
  inside the `introend` callback). It removes the `fill: forwards` so the element returns to its
  resting style — which *is* the visible end state by construction.
- **On exit finish, do NOT abort.** The node is still in the DOM until React processes the
  `mounted = false` state update one render later. Aborting drops fill-forwards and flashes the
  element back to visible for a frame. Let the finished animation hold the hidden state until
  the node is removed.

**No jsdom production fallback.** There is no `canAnimate() === false` `setTimeout` branch —
Svelte has none, and inventing one puts an untested code path in production. jsdom is handled by
the `Element.prototype.animate` stub in `test-setup.ts` (§9), which is mandatory.

### 5.7 `motion/presence.ts` — `usePresence`

```ts
export type PresenceState = "opening" | "open" | "closing";

export interface UsePresenceOptions {
	/**
	 * Animate an entrance when `open` is ALREADY true on the very first render.
	 * Default FALSE, reproducing two Svelte rules that happen to agree: a LOCAL
	 * `transition:` never plays on the initial render of the block that owns it
	 * (`run = !block || (block.f & EFFECT_RAN) !== 0`), and `hydrate()` defaults
	 * `intro: false`. A `<Presence open>` mounting for the first time therefore
	 * paints visible with no intro — identical to Svelte, and pinned by
	 * `Presence.test.ts`.
	 */
	appear?: boolean;
	/**
	 * Set `inert` on every attached node while closing, clear it on enter. Default
	 * true — Svelte sets `element.inert = true` itself, synchronously, immediately
	 * before dispatching `outrostart`, which is what keeps a closing panel from
	 * answering a click. `false` is the explicit opt-out (`PresenceProps.inert`).
	 */
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
	/** Three values. For `<Presence>` and anything else whose Svelte source uses three. */
	readonly state: PresenceState;
	/** Two values — `state === "closing" ? "closing" : "open"`. THE value every
	 *  anchored surface renders into `data-state` (convention C-5). */
	readonly surfaceState: SurfaceState;
	/** `=== open`. Pass to `active:` options and to params factories. */
	readonly entering: boolean;

	/** Attach the single animated element. */
	register<P>(transition: TransitionFn<P>, params?: P | ((entering: boolean) => P)): RefCallback<HTMLElement>;
	/** Attach one of several elements sharing this clock (Dialog's scrim + panel).
	 *  The subtree unmounts only when EVERY keyed exit has finished. */
	register<P>(key: string, transition: TransitionFn<P>, params?: P | ((entering: boolean) => P)): RefCallback<HTMLElement>;
}

export function usePresence(open: boolean, options?: UsePresenceOptions): PresenceHandle;
```

**Semantics.**

| moment | what happens |
|---|---|
| `open` false → true while unmounted | `mounted` → true, `state` → `"opening"`, `onEnterStart()` |
| each registered node attaches (layout effect) | `runTransition(node, spec(entering = true), 1, run[key], …)` |
| every registered enter finishes | each run aborted (§5.6), `state` → `"open"`, `onEnterEnd()` |
| `open` true → false | `onExitStart()` fires **synchronously in the layout effect**, `state` → `"closing"`, `inert` set unless opted out, each node runs toward `0`. `mounted` stays true. |
| every registered exit finishes | `mounted` → false; `state` resets to `"open"` (matching `Presence.svelte`'s reset, so the next open never carries a stale `"closing"` for a microtask); `onExitEnd()` |
| `open` flips true mid-exit | the in-flight `TransitionRun` is passed as `counterpart`, so `t1` is the current position and the entrance resumes from there. **The node is never unmounted** — which is why `onEnterStart` must call `trap.rearm()`. |
| reduced motion | the transition factory returns `duration: 0`; `runTransition` finishes synchronously; `mounted` flips in the same layout effect, before paint |

**Unmount rule.** `mounted` goes false only once *every* registered node's exit has settled —
Svelte's own rule that a branch is destroyed when its LAST transition finishes. This is what
makes `DialogSurface`'s scrim/panel pairing work: they share one clock, so the two leave together
and the destroy is a tie rather than a straggler.

**Cleanup timing, for free.** Because `usePresence` owns the unmount, every effect cleanup in
the subtree — `useScrollLock`'s release, `useDismissable`'s splice, `useFocusTrap`'s destroy path
— lands at the same instant the Svelte action's outro-delayed `destroy()` did. No other module
needs a "delay my teardown" mechanism. This is the payoff that justifies building the sampler
instead of hand-rolling per-component exit state.

**Params are read at leg start, never at render time.** `params` may be a value or a
`(entering: boolean) => P` factory; the factory form is the documented default, because
`Presence.svelte`'s central hazard is that `options.direction` reports `"both"` for a single
bidirectional `transition:` and cannot distinguish entering from leaving — `open` can. The
factory is stored in a per-key slot rewritten on every render and called at the instant each leg
starts, and `usePresence` passes `{ direction: entering ? "in" : "out" }` to the transition
function so `preset()`'s own easing default resolves correctly.

**One bidirectional transition per node, never a split in/out pair.** Reversal smoothing only
exists for a unified leg. Having one hook own both directions makes that structural rather than
a convention a port could break.

**Identity stability.** `register(...)` caches its `RefCallback` in a ref-held `Map` keyed by
`key` (default `"default"`), so it is stable across renders and React never detaches and
reattaches the node.

### 5.8 Worked example — the dialog exit, end to end

Every ordering constraint `DialogSurface.svelte`'s comment block spells out is honoured here by
construction. Note conventions C-1 (node, not ref), C-2 (composed refs above the early return)
and C-5 (`surfaceState`, two values).

```tsx
export const DialogSurface = forwardRef<HTMLDivElement, DialogSurfaceProps>(function DialogSurface(
	{ open, role, titleId, descriptionId, escape, outsideClick, onDismiss,
	  initialFocus = null, fallbackFocus, exclude, panelClass, children }, forwardedRef
) {
	// C-1: the NODE, not a ref — the panel is created by presence.mounted.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	// Returns the handle Svelte hands out through `onActivate`.
	const trap = useFocusTrap(panel, { initialFocus, fallbackFocus });

	const presence = usePresence(open, {
		// The two halves of the focus handshake, at the two moments Svelte puts them:
		// `onintrostart` → rearm, `onoutrostart` → returnFocusNow.
		onEnterStart: () => trap.rearm(),
		onExitStart: () => trap.returnFocusNow(),
	});

	// Dialog renders DialogSurface unconditionally (the `{#if open}` lives inside the
	// surface, exactly as in the Svelte source), so this component is mounted for the
	// Dialog's whole life — a bare `useScrollLock()` would lock the page forever.
	// Lock on `presence.mounted`: it stays true through the whole exit, so the release
	// still lands in the unmount commit, exactly like an action's outro-delayed
	// destroy(). Never `useScrollLock(open)` — that releases at exit START.
	// (Corrected by the wave-3 acceptance port; the transposed scroll-release test
	// fails against the previous bare call.)
	useScrollLock(presence.mounted);

	// `active: open` — a plain boolean where Svelte needed `() => open`.
	useDismissable(panel, { onDismiss, escape, outsideClick, exclude, active: open });

	// C-2: composed ABOVE the early return. Calling this inside the JSX below would be
	// a conditional hook and would throw the first time `mounted` flips.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register("panel", anchored, (entering) => ({
			entering, duration: DURATIONS.base, exitDuration: DURATIONS.exit,
		}))
	);
	const scrimRef = presence.register("scrim", anchored, (entering) => ({
		entering, scale: false, duration: DURATIONS.base, exitDuration: DURATIONS.exit,
	}));

	// `<Portal>` stays ABOVE the mounted gate, and the gate wraps its CHILDREN.
	// `usePortalTarget` resolves its container in a layout effect, so a Portal that
	// first mounts in the same commit as the surface renders null on that pass —
	// presence then finds no registered legs and the ENTRANCE ANIMATION IS SILENTLY
	// SKIPPED (every other assertion still passes, which is what makes it vicious).
	// Found by the wave-3 acceptance port; applies to EVERY usePresence + Portal
	// pairing: Popover, Tooltip, DropdownMenu, Select, HoverCard, ContextMenu, Sheet,
	// Drawer, Toast. Never write `if (!presence.mounted) return null` around a Portal.
	return (
		<Portal>
			{presence.mounted ? (
				<>
					<div ref={scrimRef} className="ft-dialog-scrim fixed inset-0 z-50 bg-black/60" aria-hidden="true" />
					<div
						ref={panelRef}
						role={role}
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						tabIndex={-1}
						data-state={presence.surfaceState}   {/* "open" | "closing" — never "opening" */}
						className={cn("ft-dialog-panel …verbatim Tailwind…", "focus-visible:outline-none", panelClass)}
					>
						{children}
					</div>
				</>
			) : null}
		</Portal>
	);
});
```

What happens on close, in order: `open` flips false → `usePresence`'s layout effect fires
`onExitStart`, so `trap.returnFocusNow()` runs the three-step return chain **immediately** (a
keyboard user does not wait out the 200 ms fade with focus stranded on `<body>`) → `state` goes
`"closing"`, `inert` is set, `data-state="closing"` renders and the CSS hooks match the Svelte
DOM exactly → both `anchored` legs run toward 0 on the shared clock → when the last one finishes,
`mounted` flips false → the subtree unmounts, and in that one commit the scroll lock releases,
the dismissable layer splices out and the focus trap's destroy path runs (already disarmed by
the `returned` latch, so focus moves exactly once). If `open` flips back true mid-fade, nothing
unmounts: the in-flight runs become counterparts, the entrance resumes from the current
position, and `onEnterStart` calls `trap.rearm()` to un-set the latch and recapture the — possibly
different — trigger.

### 5.9 Worked example — `Presence.tsx`

```tsx
const reduced = useReducedMotion();
const presence = usePresence(open, { inert, onEnterEnd, onExitEnd });
const rootRef = useComposedRefs(
	forwardedRef,
	presence.register(makePreset(preset), (entering) => ({
		duration: reduced ? 0 : entering ? duration : exitDuration,
		delay: reduced ? 0 : delay,
		distance: entering ? distance : distance / 2,
	}))
);
if (!presence.mounted) return null;
return (
	<div {...restProps} ref={rootRef} className={cn("ft-presence", className)} data-state={presence.state}>
		{children}
	</div>
);
```

Three values here, because `Presence.svelte` genuinely renders three. `presence.css` ports
verbatim.

### 5.10 `motion/media-query.ts`

```ts
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Live matchMedia state. `useSyncExternalStore`, and this is the archetype for
 * choosing it: a store React does not own, mutated outside React's knowledge, that
 * must not tear across a concurrent render — and `getServerSnapshot` returns
 * `fallback` for the server render AND the hydration render, which eliminates the
 * whole mismatch class. A useState+useEffect version has the same end state, one
 * extra committed frame, and a real mismatch the moment someone "optimises" the
 * initializer into a lazy read.
 *
 * `window.matchMedia(query)` is resolved FRESH on every subscribe and every snapshot,
 * never memoised at module or hook scope — verbatim from the Svelte header's
 * rationale: a test that overrides `window.matchMedia` wholesale must be visible to
 * the next call. `matches` is a boolean, so snapshot identity is a non-issue.
 */
export function useMediaQuery(query: string, fallback?: boolean): boolean;

/** `useMediaQuery(REDUCED_MOTION_QUERY, false)` — reduced motion is never assumed
 *  before the browser has been asked. */
export function useReducedMotion(): boolean;
```

`createMediaQuery`'s `start()`/`stop()` pair disappears: it exists only because Svelte has no
lifecycle-bound reactive primitive and the factory had to be constructible during SSR before any
effect ran. `useSyncExternalStore` *is* that lifecycle, with a hydration guarantee on top;
porting `start`/`stop` would be shipping a worse `useSyncExternalStore`. The consuming pattern
collapses from `Presence.svelte`'s three lines to `const reduced = useReducedMotion();`. The
`.current`-after-`stop()` nuance has no analogue and is recorded as D-4.

`prefersReducedMotion()` — the one-shot read used from inside transition bodies — stays a plain
function in `anchored.ts`, verbatim, with its "never at module scope or during render" warning
intact.

### 5.11 `motion/raf.ts` and `motion/in-view.ts`

```ts
export interface RafThrottled<A extends unknown[]> { (...args: A): void; cancel(): void }
/** Verbatim, including the store-latest-args choice over cancel-and-reschedule (so a
 *  continuous stream cannot starve the callback) and the per-call rAF availability check. */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): RafThrottled<A>;
/** Stable identity for the component's life; `fn` latched; pending frame cancelled on unmount. */
export function useRafThrottle<A extends unknown[]>(fn: (...args: A) => void): RafThrottled<A>;
```

```ts
export interface InViewOptions {
	/** Disconnect after the first time the node becomes visible. Default true. */
	once?: boolean;
	threshold?: number | number[];   // DEFAULT_THRESHOLD = 0.1
	rootMargin?: string;             // DEFAULT_ROOT_MARGIN = "0px"
	root?: Element | Document | null;
	onChange: (inView: boolean, entry?: IntersectionObserverEntry) => void;
}
/** Law-2 core, verbatim: `observerInit`, `sameObserverInit`, the `current` indirection,
 *  the `firedOnce` flag with its full rationale, and the fail-visible branch that calls
 *  `onChange(true)` immediately when IntersectionObserver is absent. */
export function observeInView(node: Element, options: InViewOptions): { update(o: InViewOptions): void; destroy(): void };

/** Returns the current intersecting state; `onChange` still fires for consumers that
 *  need the entry. Layout effect (§4). */
export function useInView(node: Element | null, options?: Omit<InViewOptions, "onChange"> & {
	onChange?: InViewOptions["onChange"]; enabled?: boolean;
}): boolean;
```

The Svelte `update()` already distinguishes options that require a **new observer** (`threshold`,
`rootMargin`, `root` — the constructor arguments) from options read fresh on every fire (`once`,
`onChange`). That is exactly a dependency array plus two live refs:

```ts
useIsomorphicLayoutEffect(() => { /* attach core; return destroy */ },
	[node, enabled, JSON.stringify(threshold ?? 0.1), rootMargin, root]);
```

The source's own comment — *"a component that passes an inline `onChange` closure creates a new
function identity on every render, and re-observing for that alone would throw away more than
intended"* — is precisely the React hazard this arrangement avoids, so it ports unchanged.
`firedOnce` lives in a ref: it survives a rebuild but not an unmount, matching the action's
per-instance lifetime exactly. SSR returns `false`, matching Svelte's un-run action; a consumer
needing the revealed state in server HTML uses the `initial="visible"` pattern `Reveal` already
has.

---

## 6. The sound engine — `react/src/sound/`

**Location and names.** `sound/` is a **sibling** of `internals/` and `components/`, mirroring
`src/lib/fancy-ui/sound/`, because the Svelte barrel exports it publicly
(`export * from "./sound/index.js"`). The controller file keeps the name `sound.ts` — only the
`.svelte` infix is dropped, exactly as with `field.ts`, `menu.ts`, `listbox.ts`.

### 6.1 Copied verbatim, zero edits

`types.ts` (`SOUND_CUES`, `SoundCue`, `SOUND_THEME_NAMES`, `SoundPlayOptions`,
`SoundPreferences`, `DEFAULT_SOUND_PREFERENCES`, `SoundPreferencesV1`, `SOUND_STORAGE_KEY`, the
whole synthesis description, `SoundEngineState`, `SOUND_MIN_INTERVAL_MS`, `SOUND_LIMITS`,
`SoundStatus`), `themes.ts` (`FANCY_SOUND_THEME`, `SOUND_THEMES`, `getSoundTheme`,
`validateSoundTheme`), `engine.ts` (all of it — no runes, no Svelte imports, and its documented
invariants survive by copying: allocates nothing on create, never throws, `disposeGeneration`
guarding async continuations, the deterministic xorshift noise fill, the voice cap admitting a
cue only if all its layers fit, and **no module-evaluation access to `window`/`navigator`/
`AudioContext`**), and `web-audio-mock.ts`.

This is the point of maximum leverage in the entire port: the risky ~900 lines of Web Audio are
not ported, they are moved. `engine.test.ts` and `themes.test.ts` transpose with no React at all.

### 6.2 `sound/sound.ts` — the singleton

**Decision: module-scope singleton + `useSyncExternalStore`. No provider, no context.** Three
reasons, in order of weight:

1. **The `sound` prop must work with zero setup.** It is an ordinary boolean prop on `button`,
   `checkbox`, `copy-button`, `dropdown-menu`, `radio-group`, `select` and `switch`. A provider
   would make `<Button sound />` silently do nothing in an unwrapped tree — a real API break
   against the Svelte package, landing as a support burden on seven components' users. The
   source's own stated reason for the singleton is that `sound.play()` must be callable from
   anywhere, including code that is not inside a React tree.
2. **The state is genuinely global** — one `localStorage` key, one cross-tab `storage` listener,
   one `AudioContext`. Two providers would be two truths for one key.
3. **Cost.** A provider re-renders its whole subtree on every volume change; the store
   re-renders only the components that subscribed (in practice `SoundToggle` and the docs' Sound
   Lab).

```ts
export interface SoundController {
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	readonly preferences: SoundPreferences;
	readonly status: SoundStatus;
	play(cue: SoundCue, options?: SoundPlayOptions): void;
	unlock(): Promise<boolean>;
	/** Also calls unlock() fire-and-forget — the enabling click IS the gesture. Plays nothing. */
	enable(): void;
	disable(): void;
	toggle(): boolean;
	setEnabled(enabled: boolean): void;
	setVolume(volume: number): void;
	setTheme(theme: SoundThemeName): void;
	/** Store contract, unchanged: calls `run` immediately, then on every change. */
	subscribe(run: (prefs: SoundPreferences) => void): () => void;
}
export const sound: SoundController;
export function getSoundStatus(): SoundStatus;
export function parseStoredPreferences(raw: string | null): SoundPreferences;  // verbatim
export function resetSoundForTests(): void;                                    // not in index.ts

// --- the React store contract, the only new surface ---
export interface SoundSnapshot {
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	readonly status: SoundStatus;
}
export function subscribeSound(listener: () => void): () => void;
/** IDENTITY-CACHED — rebuilt only when something actually changed. */
export function getSoundSnapshot(): SoundSnapshot;
/** The frozen defaults. NEVER calls ensure(), never touches localStorage. */
export function getSoundServerSnapshot(): SoundSnapshot;
/** Idempotent. Reads localStorage, attaches the cross-tab listener, probes
 *  AudioContext support without constructing one. Called from an EFFECT, never a render. */
export function hydrateSound(): void;
```

**`$state` → fields + version counter.** `prefs` and `status` become plain module objects. Every
mutation path (`persist`, `handleStorage`, `enable`, `disable`, `setVolume`, `setTheme`,
`markPlayed`, the engine's `onStateChange`) ends by bumping a `version` and calling `notify()`,
which fans out to the existing `subscribers` set (preserving `subscribe()`'s public contract)
**and** the React listener set. `assignPrefs`'s write-field-by-field rule is kept — its Svelte
reason (never replace the `$state` proxy) is gone, but the engine mirrors read through the same
object and the two files stay diffable. The `untrack` wrappers disappear: they exist only because
Svelte rejects a `$state` write made while a derived is the active reaction (`ensure()` runs
lazily from inside `SoundToggle`'s `$derived`). React has no such rule; removing them is not a
behaviour change, and the comment is rewritten to record why they are gone.

**Snapshot caching is mandatory.** `useSyncExternalStore` calls `getSnapshot` on every render and
infinite-loops if the identity changes without a real change. `sound.preferences` and
`getSoundStatus()` return a fresh object every call *by design* and keep doing so — the cache is
additive, rebuilt only inside `notify()`. It also serves the purpose the Svelte `statusView`
getter object served: a reader depends only on what it actually touches, not on `lastPlayedAt`
being written on every cue.

**localStorage read timing — the precise rule:**

> **`ensure()` runs on every imperative entry point. It never runs on a render-path read.**

Every controller *method* calls `ensure()` first, verbatim. `getSoundSnapshot()` does **not** —
it returns the cache, which starts at the defaults. Hydration is triggered from `useSound()`'s
`useEffect(() => hydrateSound(), [])`. So: server renders defaults → the client's first render
returns the same defaults (no mismatch possible) → the effect reads storage → `notify()` → the
toggle re-renders with the stored value.

That is exactly the sequence `SoundToggle.svelte`'s SVG comment was written for: *"the server
renders off, the client may immediately learn the stored preference is on, and this way the DOM
shape never has to change to reflect it — only opacity/scale do, on the very node the server
already produced."* **Port that trick verbatim: both glyph groups stay in the DOM at all times,
selected by a CSS attribute selector.** It is load-bearing on the React side for the same reason.

**Lazy `AudioContext`, unchanged.** No context at module evaluation, none at `ensure()`, none at
`ensureEngine()` (which allocates nothing). The first `AudioContext` appears inside
`engine.ensureContext()`, gated on `navigator.userActivation?.isActive`, reached only from
`play()` or `unlock()` — i.e. inside a user gesture. The single-pending-cue mechanism (exactly
one cue held while the context unlocks inside the same gesture, replayed once running, bursts
never queued) is copied line for line: it is the whole reason the first click after a cold load
makes a sound.

**Tree-shaking.** The module's top level is `let`/`const` declarations and function definitions —
no calls. `sideEffects: ["**/*.css"]` stays correct. An app importing `Button` pulls the store and
the engine whether or not it passes `sound` — the identical tax the Svelte package pays. Port it
as-is; measure the packaged cost with the analysis toolkit and open a follow-up if it is
material. Do not "fix" it during the port.

### 6.3 `sound/use-sound.ts`

```ts
/**
 * A cue player for a component's own `sound` prop. Permanently identity-stable; a
 * no-op while `enabled` is falsy. DELIBERATELY DOES NOT SUBSCRIBE — a Button must not
 * re-render because the user changed the volume in a settings panel elsewhere on the
 * page. Whether a cue is audible is decided inside `sound.play()` at call time.
 */
export function useSoundCue(enabled: boolean | undefined): (cue: SoundCue, options?: SoundPlayOptions) => void;

/** Subscribes. For controls that RENDER the preference — SoundToggle, the Sound Lab.
 *  Also runs `hydrateSound()` in an effect. */
export function useSound(): SoundSnapshot & Pick<SoundController,
	"play" | "unlock" | "enable" | "disable" | "toggle" | "setEnabled" | "setVolume" | "setTheme">;

export function useSoundEnabled(): boolean;
export function useSoundStatus(): SoundStatus;
```

Porting a `sound`-prop consumer is two lines against the Svelte `if (sound) soundFx.play("press")`:

```tsx
const playCue = useSoundCue(sound);
// onClick: () => { playCue("press"); onClick?.(event); }
```

`DropdownMenu`'s `setOpen` becomes `if (!options.silent) playCue(next ? "open" : "close")` — the
`sound &&` guard moves into the hook so `silent` keeps its exact meaning. `CopyButton`'s
pre-await `if (sound && soundFx.enabled) void soundFx.unlock()` is ported as-is, reading
`soundFx.enabled` **directly** rather than through a hook: it needs the value at gesture time,
not at render time.

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

/** Law-2 core, verbatim. */
export function attachSoundFeedback(node: HTMLElement, options?: SoundFeedbackOptions): { update(o?: SoundFeedbackOptions): void; destroy(): void };
export function useSoundFeedback(node: HTMLElement | null, options?: SoundFeedbackOptions): void;
export function resetSoundFeedbackForTests(): void;   // not in index.ts
/** Test-only leak counter for the shared document-level pointermove listener. */
export function __soundFeedbackHoverInstances(): number;
```

Verbatim: `HOVER_EVENTS`, `HOVER_POINTER_TYPES`, `HOVER_RECENCY_MS = 150`, the shared
document-level `pointermove` tracking with its retain/release counter, `isDisabled`'s universal
`:disabled,[aria-disabled="true"],[data-disabled="true"]` guard, the four-part hover guard
(`isTrusted`, `pointerType` ∈ {mouse, pen}, `sourceCapabilities.firesTouchEvents`, the
pointer-recency window, plus the `relatedTarget`-inside-node re-entry check), `makeListener`,
`bind`, `unbind`, the swallow-resolver-errors rule, `{ passive: true }` listeners, and the rule
that this module never calls `preventDefault`/`stopPropagation`.

**One deviation, in the consumer's favour (D-8).** The Svelte `update()` unbinds and rebinds
every listener whenever any option changes. In React `on` is typically an inline object literal,
so that would rebind on every render. The hook keys its bind effect on the **sorted, joined
event-name list** and resolves specs, `disabled`, `volume`, `pitch` and `allowUntrusted` through
a live ref. Listeners rebind only when the set of event names actually changes. Observably
identical, strictly less work.

### 6.5 `sound/SoundToggle.tsx` + `sound/sound-toggle.css`

`SoundToggleProps`, `SoundToggleSize`, `SoundToggleVariant` keep their exact names
(`SoundToggleProps` is the tooling contract). `forwardRef<HTMLButtonElement, SoundToggleProps>`
because the Svelte props declare `ref = $bindable(null)`. `class` → `className`.
`SIZE_CLASSES` and `ICON_SIZE` stay `as const` maps of static Tailwind literals; the whole
`cn(...)` call is copied byte-for-byte, argument order included.

`enabled` from `useSoundEnabled()`, `unsupported` from `useSoundStatus().engine === "unsupported"`,
and `effectiveDisabled = disabled || (unsupported && !enabled)` — keeping the rule that an
unsupported browser disables the control **only while sound is off**, so a stored "on" can always
be undone. `handleClick` is verbatim, including the explicit `effectiveDisabled` early return
(the native `disabled` attribute is not enough against a synthetic event dispatched at the
element) and the unlock-then-cue sequence that is the only place a confirmation cue plays.

The `<style>` block becomes `sound-toggle.css`, imported by the component. Every rule is already
anchored on `.ft-sound-toggle` / `.ft-sound-toggle-glyph`, so **no port-added anchor class is
needed** — the one case in this scope where PORTING.md rule 2's "ADD one" clause does not apply.
`light-dark()`, `color-mix()`, the `--ft-sound-toggle-accent` fallback chain and the
`@media (prefers-reduced-motion: no-preference)` gate are copied unchanged.

---

## 7. SSR rules, per module

Three rules hold across every row: **no browser global in a render path or a lazy `useState`
initializer; no `Math.random()`/`Date.now()` in a render path; every DOM-mutating effect follows
§4.**

| Module | Server render | Hydration hazard & its answer |
|---|---|---|
| `computePosition` | — (pure) | none; `getDefaultViewport()` already returns `Infinity` off-browser |
| `useAnchorPosition` | element, unpositioned | none — layout effects never run on the server, same as an action |
| `Portal` | `null` | **eliminated by design** — `null` on the server *and* the hydration render, then portal |
| `useDismissable` | nothing | none |
| `useScrollLock` | nothing | none; `lockScroll()` returns a no-op release off-browser |
| `useFocusTrap` | nothing | none |
| `createFieldState` / `useField` | **full value, `describedBy` included** | none, and this is the point: derived in the render path, so the server HTML's `aria-describedby` is already correct |
| `useMenuFocus` | a stable handle, no DOM | none; `useMenuFocusedIndex` server snapshot is `-1` |
| `useListbox` | `activeIndex: -1` | none; `-1` is the honest pre-interaction value on both sides |
| `useFancyId` | a real, stable id | none; `useId` is SSR-stable |
| `uid()` | **throws** | by design, verbatim |
| `tokens`/`presets`/`stagger`/`types`/`easing` | pure data | none |
| `haptics` | `canVibrate()` → false | none; never called during render |
| `rafThrottle` | falls through to a sync call | none |
| `useMediaQuery` | `fallback` via `getServerSnapshot` | **eliminated** — identical value from the server and the hydration render |
| `useInView` | `false` | none; matches Svelte's un-run action |
| `preset` / `anchored` / `originFor` | pure | none |
| `prefersReducedMotion()` | `false` | must never be called from a render path — it is a transition-body helper |
| `runTransition` / `usePresence` | `mounted === open`, no animation | none; `appear` defaults false, so an open-on-mount surface paints at rest with no intro, matching Svelte's initial-render rule |
| `sound/engine`, `themes`, `types` | inert | none; zero module-evaluation globals |
| `sound.ts` | `getSoundServerSnapshot()` = frozen defaults | **eliminated** — storage is never read in a render path |
| `useSoundFeedback` | nothing | none |
| `SoundToggle` | `data-state="off"`, both glyphs in the DOM | **eliminated** — CSS picks the glyph; the DOM shape never changes |

---

## 8. File layout, naming, CSS, barrel

```
react/src/internals/
├── index.ts                      # internal barrel; NOT re-exported wholesale
├── dom/
│   ├── types.ts                  # ElementRef
│   ├── use-element-ref.ts
│   ├── use-event-callback.ts
│   ├── use-live-ref.ts
│   ├── use-composed-refs.ts      # + assignRef
│   ├── ssr.ts                    # useIsomorphicLayoutEffect, useIsHydrated, useConstant
│   └── context.ts                # createInternalContext
├── anchor-position.ts            # computePosition (VERBATIM) + attachAnchorPosition
├── use-anchor-position.ts
├── Portal.tsx
├── dismissable.ts                # attachDismissable + useDismissable
├── focus-trap.ts                 # attachFocusTrap + useFocusTrap
├── scroll-lock.ts                # lockScroll (VERBATIM) + useScrollLock
├── field.ts                      # createFieldState + FieldProvider + useField
├── menu.ts                       # createMenuFocus + useMenuFocus + useMenuItemRef
├── listbox.ts                    # createListbox + useListbox
├── use-id.ts                     # useFancyId + uid
├── ai-types.ts
├── float.ts / use-float.ts
├── markdown.ts / Markdown.tsx / MarkdownInline.tsx / markdown.css
├── use-elapsed.ts, use-autoscroll.ts, relative-time.ts,
│   use-text-stream.ts / StreamText.tsx / stream-text.css,
│   host.ts, calendar-core.ts, use-copy.ts, diff.ts, waveform-core.ts
└── motion/
    ├── index.ts
    ├── types.ts  tokens.ts  easing.ts  presets.ts  stagger.ts  haptics.ts
    ├── transitions.ts   anchored.ts        (verbatim)
    ├── animate.ts       # runTransition, cssToKeyframe
    ├── presence.ts      # usePresence
    ├── raf.ts           in-view.ts         media-query.ts

react/src/sound/                  # public, mirrors the Svelte tree
├── index.ts
├── types.ts  themes.ts  engine.ts  web-audio-mock.ts   (VERBATIM)
├── sound.ts                      # was sound.svelte.ts
├── use-sound.ts
├── sound-feedback.ts
├── SoundToggle.tsx
└── sound-toggle.css
```

**Dropped `.svelte` infixes** — the infix marked "this file contains runes", and the React files'
runes are gone: `field.svelte.ts` → `field.ts`, `menu.svelte.ts` → `menu.ts`,
`listbox.svelte.ts` → `listbox.ts`, `media-query.svelte.ts` → `media-query.ts`,
`sound.svelte.ts` → `sound.ts`, `elapsed.svelte.ts` → `elapsed.ts`,
`clipboard.svelte.ts` → `clipboard.ts`, `stream-text.svelte.ts` → `stream-text.ts`. The leading
underscore of `_internals` is dropped for the same reason the `-global-` keyframe prefix is.

**Naming rules.**

| Svelte | React |
|---|---|
| action `foo` | `attachFoo(node, options)` core (where a test calls the action) + `useFoo(node, options)` |
| `FooOptions` | `FooOptions` — unchanged when the shape is unchanged; `UseFooOptions` when it changed |
| factory `createFoo` | `createFoo` **kept, framework-free** + `useFoo(...)` wrapper |
| context reader `getFoo()` | `useFoo()` |
| context key `FOO_KEY` | `FooReactContext` + `useFoo()` |
| pure function | same name, verbatim |
| component | `<Name>Props` — the tooling contract |

Pure functions keeping their exact names, exhaustively: `computePosition`, `lockScroll`, `uid`,
`staggerDelay`, `vibrate`, `canVibrate`, `rafThrottle`, `preset`, `anchored`, `originFor`,
`prefersReducedMotion`, `createFieldState`, `formatElapsed`, `formatRelativeTime`, `hostOf`,
`monogram`, `parseMarkdown`, `parseInline`, `sanitizeHref`, `parseUnifiedDiff`, `getMonthGrid`,
`addMonths`, `isSameDay`, `clampDate`, `formatISODate`, `computeFloatPosition`,
`drawWaveformFrame`, `fakeWaveSample`, `parseStoredPreferences`, `createSoundEngine`,
`getSoundTheme`, `validateSoundTheme`, `getSoundStatus`.
Types keeping their exact names: `Side`, `Align`, `PresetName`, `RevealPresetName`,
`StaggerFrom`, `HapticPattern`, `SoundCue`, `SoundThemeName`, `SoundPlayOptions`,
**`FieldContext`**, `SurfaceState`, `MenuFocusState`, `ListboxState`, `ComputePositionOptions`,
`AnchoredParams`, `PresetParams`, `InViewOptions`.

**CSS.** Exactly three `.css` files exist in this scope, one per Svelte `<style>` block:
`sound/sound-toggle.css`, `internals/markdown.css`, `internals/stream-text.css`. **The motion
subsystem ships no stylesheet** — the choreography either runs through WAAPI or lives in the
consuming component's own `.css`, which is the same decision `tokens.ts`'s header records for
the Svelte side. Inventing a shared `motion.css` would be an improvement, which the law forbids.

**Barrel.** `react/src/index.ts` mirrors the Svelte barrel's own lines and nothing more:

```ts
export * from "./sound/index.js";
export type * from "./internals/ai-types.js";
export type * from "./internals/motion/types.js";
```

Nothing else from `internals/` is public; components import it by relative path. No new subpath
export is needed in `package.json` — sound ships through the root barrel exactly as it does on
the Svelte side.

---

## 9. Testing

Vitest + `@testing-library/react`, jsdom, globals on; `react/vitest.config.ts` unchanged. Run
`npx vitest run src/internals/<module>` from `react/`.

### 9.1 `react/src/test-setup.ts` must grow

It currently holds only the jest-dom import. This is the one shared source file the foundation PR
touches, and it must land before any consuming component is ported. Port the fakes from the
repo-root `src/test-setup.ts`, verbatim where possible:

- **`Element.prototype.animate` — the `FakeAnimation` stub. Hard requirement, not optional.**
  `runTransition` calls the same API Svelte does, so the same fake works and every
  `usePresence` test needs it. It must expose `currentTime` (the reversal path's `t()` reads
  it), `playState`, `cancel()`, `effect`, and fire `onfinish` on a **microtask, never a timer**
  (fake-timer suites depend on that), with `cancel()` suppressing it.
- `ResizeObserver` and `IntersectionObserver` stubs — the IO one exposing `.trigger(isIntersecting)`.
- `window.matchMedia`, settable per-test, whose `MediaQueryList` supports
  `addEventListener("change")`, guarded by `typeof window !== "undefined"` so the file also
  survives a `@vitest-environment node` suite.
- `navigator.vibrate` absent by default, so `canVibrate()` is false and the unsupported path is
  the default; installed per-test by the haptics suite.

### 9.2 Harness files disappear

Every `*.test.svelte` rig exists only because Svelte components must live in their own file.
React declares them inline.

| Svelte harness | React replacement |
|---|---|
| `FieldHarness.test.svelte` + `FieldConsumer.test.svelte` | two inline components in `field.test.tsx` |
| `ScrollLockHarness` + `ScrollLockPanel` | one inline `<Panel open>` in `scroll-lock.test.tsx` |
| `TransitionsHarness.test.svelte` | inline `<Probe open>` using `usePresence`; assert on the `animate` fake's recorded keyframes |
| `AnchoredHarness.test.svelte` | inline `<Surface>` with per-element `getBoundingClientRect` stubs |
| `SoundToggleHarness.test.svelte` | not needed — render `<SoundToggle>` directly |

Eight files removed from the port with no loss of coverage.

### 9.3 Four test shapes, in order of preference

1. **Pure** — import the function, no React. `computePosition`, `staggerDelay`, `preset`/`cssFor`,
   `originFor`, `anchored()`, `cssToKeyframe`, `createFieldState`, `parseStoredPreferences`,
   easing, presets, tokens, haptics, markdown, diff, calendar-core, host, relative-time,
   waveform-core, float's geometry. The majority of the existing assertion count; transposes
   one-for-one.
2. **Core** — `attachX(node, opts)` against a hand-built `document.body` subtree, then
   `handle.destroy()`. `focus-trap.test.ts` (720 lines), `dismissable.test.ts`,
   `anchor-position.test.ts`, `in-view.test.ts` and `sound-feedback.test.ts` already work this
   way; only the import line changes.
3. **Factory** — `createMenuFocus` / `createListbox` / `createElapsed` / `createCopy` /
   `createTextStream` / `createSoundEngine` driven directly, no React. `listbox.test.ts` (458
   lines) transposes with zero edits beyond the import path; `menu.test.ts` builds real elements
   with `document.createElement` and asserts on `document.activeElement`.
4. **Hook / component** — `renderHook` + `act()` for `useListbox`, `useMediaQuery`,
   `useMenuFocusedIndex`, `useElapsed`, `useCopy`, `useSound*`; `render()` for `Portal`,
   `FieldProvider`, `SoundToggle` and the `usePresence` probe.

### 9.4 Per-module additions

| Module | What the React layer adds |
|---|---|
| `usePresence` | (a) `mounted` stays true through the exit; (b) `state` sequences `opening → open → closing`; (c) `duration: 0` finishes **synchronously** and `animate()` is never called; (d) reopening mid-exit produces a keyframe list whose first frame matches the in-flight `t`; (e) `inert` set on exit, cleared on re-enter; (f) with `appear` unset, an initially-open mount calls `animate()` zero times; (g) `surfaceState` never yields `"opening"` |
| `runTransition` | the ceil'd frame count (`n + 1` keyframes), the leading dummy animation at a non-zero delay, and the enter-finish abort / exit-finish no-abort rules |
| `useFocusTrap` | handle identity stability across re-renders; layout-effect focus timing |
| `useAnchorPosition` | one recompute per `side` change; the seeded placement is the requested side, not `"bottom"` |
| `Portal` | renders into target, not the React parent; string-selector and miss→body paths; removal on unmount |
| StrictMode | a `renderStrict(ui)` helper, and one test per hook module asserting its leak counter returns to rest: `__dismissableLayerCount() === 0`, the scroll-lock refcount 0 with `document.body.style.position === ""` (and `=== "fixed"` while mounted), `__soundFeedbackHoverInstances() === 0`, no orphaned observer, focus back on the trigger |
| Hydration | three `renderToString` + `hydrateRoot` suites with a `console.error` spy asserted empty — `field`, `sound/sound`, `motion/media-query`. These are the only three modules where a server/client divergence is actually reachable |
| SSR | `@vitest-environment node` files for `sound`, `motion/tokens`, `field`, `use-id`, asserting no browser global is touched at import and that server-snapshot paths return defaults |

**Drop only what is Svelte-specific**: rune re-render assertions, `$state` proxy identity checks,
`untrack` behaviour, `flushSync`, and "the action's `update()` was called" plumbing where the
React equivalent is a re-render. Add nothing speculative beyond the four categories above.

---

## 10. Divergence register

Reproduced in `react/README.md` and in each affected component's README, per PORTING.md's "port
the bug and note it" discipline applied to mechanisms that cannot be ported.

| # | Divergence | Why | Observable difference |
|---|---|---|---|
| D-1 | `Portal` uses `createPortal` instead of moving a rendered node | React has a first-class portal; moving nodes fights reconciliation | Portalled content is absent from the server HTML (Svelte SSRs it inline and relocates on mount) — nil in practice, every portalled surface is gated on `open: false`. **Synthetic** events still bubble through the React tree; inert, since `useDismissable` listens natively on `document` |
| D-2 | `markSurfaceState` not ported; `data-state` is an ordinary attribute | The Svelte helper exists only because its scheduler skips inert effects during an outro | none — identical emitted values |
| D-3 | `focusTrap`'s `onActivate(returnFocusNow, rearm)` becomes the hook's return value | A hook can return; an action cannot. Same two functions, same two moments | none |
| D-4 | `createMediaQuery`'s `start()`/`stop()` gone; the "a stopped query keeps its last real answer" nuance has no analogue | `useSyncExternalStore` subsumes the lifecycle and adds the hydration guarantee | none |
| D-5 | `destroy()` removed from `useMenuFocus` / `useListbox` / `useCopy` / `useTextStream`'s consumer surface (kept on the factories) | Unmount cleanup cannot be forgotten | none — it fixes a latent typeahead-timer leak in `DropdownMenuContent`, which never called `focus.destroy()` |
| D-6 | Every `() => value` option that React can hold live becomes `value` (`dismissable.active`, `listbox.count`, `menuFocus.loop`, `field`'s nine getters). Getter forms are still accepted where genuinely dynamic (`anchor`, `exclude`, `fallbackFocus`, `labelAt`, `enabled`) | The getters defeat Svelte's inert-effect scheduling; React re-renders normally and hooks hold live refs | none |
| D-7 | `JS_EASINGS` inlines `expoIn`/`expoOut` | No new runtime dependencies | none — byte-identical formulas, pinned by tests |
| D-8 | `useSoundFeedback` rebinds only when the **set of event names** changes | Svelte's `update()` rebinds wholesale; in React `on` is an inline literal, so that would thrash | none |
| D-9 | The `tick()`-before-`moveToEdge` wait in `DropdownMenuContent` is dropped | React runs child effects before parent effects, so items are already registered | none |
| D-10 | Portal-before-focus-trap ordering ceremony dropped | `createPortal` renders children already attached; effects run after commit | none — the silent-no-op `.focus()` hazard cannot occur |
| D-11 | `dismissable` layer push order can invert for two overlays mounting in the **same** commit | React runs child effects before parent effects. Documented, not sorted — a document-order sort would change dismissal semantics for the ordinary case | reachable only when an ancestor and a descendant overlay open together on first paint |
| D-12 | `useElementRef` costs one extra render at mount for every hook-using component | Eliminates the null-node-at-effect-time bug class by construction (C-1) | none visible; the extra render lands before paint |

**Not a divergence, and recorded as such:** `Button`, `Checkbox`, `CopyButton`, `DropdownMenu`,
`RadioGroup`, `Select` and `Switch` each statically import the sound controller (and through it
`themes.ts`'s recipe data) purely to serve a `sound` prop that defaults to `false`. The identical
coupling exists on the Svelte side. Port it as-is.

---

## 11. Build order

Three waves, each independently mergeable. Nothing merges without `npx tsc --noEmit` clean and
its own vitest file green.

**Wave 1 — foundations and pure data (unblocks everything).**
`test-setup.ts` extension · `dom/*` · `anchor-position.ts` (`computePosition` + core) ·
`scroll-lock.ts` (`lockScroll`) · `use-id.ts` ·
`motion/{easing,tokens,presets,types,stagger,haptics,raf,transitions}` ·
`sound/{types,themes,engine,web-audio-mock}` · `ai-types.ts` · `host.ts` · `calendar-core.ts` ·
`diff.ts` · `markdown.ts` · `relative-time.ts` · `waveform-core.ts` · `float.ts` geometry.
Almost all verbatim. Gate: the transposed pure and factory test files pass.

**Wave 2 — the hooks.**
`use-anchor-position` · `Portal` · `dismissable` · `use-scroll-lock` · `focus-trap` · `field` ·
`menu` · `listbox` · `motion/{animate, media-query, in-view, anchored}` · `use-float` ·
`use-elapsed` · `use-copy` · `use-autoscroll` · `use-text-stream` ·
`sound/{sound, use-sound, sound-feedback}`.
Gate: StrictMode leak-counter suites and the three hydration suites green.

**Wave 3 — `usePresence`, then the acceptance test for this whole contract.**
Land `motion/presence.ts`, then port **`Presence` and `DialogSurface`** before anything else.
Together they exercise single-node and multi-node presence, reversal, the reduced-motion
synchronous close, `inert`, the focus-trap handle handshake, scroll-lock release timing,
dismissable layering, portal, both `data-state` vocabularies, and conventions C-1 and C-2. If
both are pixel-identical to the Svelte originals under a side-by-side, the contract is proven and
the remaining ~135 ports are mechanical. **If either is not, fix the contract before anything
else is built on it.** `Markdown.tsx` / `StreamText.tsx` / `SoundToggle.tsx` may land in
parallel.

---

## 12. Remaining internals — one paragraph each

All twelve live under `react/src/internals/`, keep their exact file names minus the `.svelte`
infix, and introduce no conventions beyond §1.

**`markdown.ts` + `Markdown.svelte` / `MarkdownInline.svelte`.** The 620-line parser —
`parseMarkdown`, `parseInline`, `sanitizeHref`, and the `InlineToken`/`BlockToken`/`TableAlign`
unions — is pure and ports verbatim; `markdown.test.ts` (544 lines) and `markdown-security.test.ts`
(292 lines) transpose with no React, and the security suite is a merge gate, so it ports first.
The two Svelte components become `Markdown.tsx` / `MarkdownInline.tsx`, a recursive `switch` over
the token tree returning JSX with a `key` on every mapped child. **They must never use
`dangerouslySetInnerHTML`**: the parser's whole point is that no HTML string is ever constructed,
and converting a token-based sanitiser into an HTML-string one would move `sanitizeHref` from
load-bearing to decorative and invalidate the entire security file. `sanitizeHref`'s `null`
return still renders the link text with no `href`.

**`ai-types.ts`.** Type-only — `ChatRole`, `StreamStatus`, `RunStatus`, `ChatMessageData`,
`ToolCallData`, `SourceData`, `SearchResultData`, `AttachmentData`, `PlanStepData`,
`SubagentData`, `ThreadData`, `CommandItemData`, `ModelOptionData`, `TokenUsageData`,
`ToolTimelineItemData`. Copied verbatim, zero JS output under `verbatimModuleSyntax`, and
re-exported from `react/src/index.ts` as `export type * from "./internals/ai-types.js"`,
mirroring the Svelte barrel line-for-line. No hook, no new test beyond the existing type-level one.

**`float.ts`.** The older sibling of `anchor-position.ts`: `FloatPlacement`, `FloatRect`,
`FloatSize`, `FloatOptions`, `computeFloatPosition`, `float`. `computeFloatPosition` is pure and
verbatim; the action becomes `attachFloat(node, options)` + `useFloat(node, options)` shaped
exactly like §3.1 — same node-first signature, same layout effect plus passive listeners, same
returned resolved placement, `matchWidth` still writing the width before measuring. Its `anchor`
keeps the three-way union (element | fixed rect | getter); the virtual-rect form is what caret
anchoring needs and is the reason both modules exist. **Do not merge it with `anchor-position`** —
two implementations exist on the Svelte side and fidelity means porting two.

**`elapsed.svelte.ts`.** `formatElapsed` is pure and verbatim. `createElapsed` keeps its body
with `$state` → notifier, and `useElapsed(options)` returns `{ ms, text, running, start, stop }`
over `useSyncExternalStore` (snapshot: the number `ms`; `text` derived per render from it, as the
source's getter does). The wall-clock-derived, never-accumulated tick is the invariant to
preserve. `createNow`'s whole point — one shared interval for a list of fifty timestamps —
survives as a module-scope store plus `useNow(refreshMs)`, which is *more* natural in React than
in Svelte since every consumer subscribes to the same instance. No timer is ever scheduled from a
render — the interval is retained from a layout effect, as in Svelte.

The initial value is where the two diverge, and it is a registered divergence (see
`migration-matrix.json` and the README). Svelte's `createNow` seeds itself with `Date.now()` at
construction, so a Svelte server render ships real relative labels. React cannot: the client has
no way to reproduce the server's timestamp, so any real value in the server snapshot is a
hydration mismatch, and sampling the wall clock on a render path breaks C-7 besides. `useNow`
therefore returns the sentinel `NaN` until the clock starts — on the server, through the
hydration render, and for the first render of a fresh client tree — and `formatRelativeTime`
renders a non-finite `now` as `""`. The server HTML carries an empty label rather than a wrong
one ("in 57 years" is what a seed of `0` yields for a present-day timestamp), and the
layout-phase re-render fills it in before the first paint. Consumers must pass the value straight
to `formatRelativeTime` or check `Number.isFinite` before doing arithmetic with it;
`use-elapsed.ssr.test.ts` pins the behaviour.

**`autoscroll.ts`.** `scrollToBottom(node, behavior)` is pure and verbatim; the action becomes
`attachAutoscroll(node, options)` + `useAutoscroll(node, options)`. The `stuck` flag stays a
closure variable and must never become React state: the source's stated design is that stuck is a
pure function of distance from the bottom, recomputed on every scroll event, with no
programmatic-scroll flag to get out of sync — no `isProgrammaticScroll` may creep in during the
port. `onStickChange` fires only on flips, through a live ref. `MutationObserver`/`ResizeObserver`
are created in the effect, `pinOnConnect` runs in a layout effect so the jump happens before
paint, and its tests install controllable fakes locally rather than relying on the shared no-op
stubs.

**`relative-time.ts`.** `RelativeTimeOptions` and `formatRelativeTime(date, opts)` — a pure
`Intl.RelativeTimeFormat` wrapper with an injectable `now`. Verbatim but for one added guard: a
non-finite `now` (the `useNow` "clock not started" sentinel) returns `""`, which is what keeps a
server render from printing a label measured against the epoch and what keeps
`Intl.RelativeTimeFormat` from throwing on `NaN`. It must never be called
with a defaulted `Date.now()` during render (convention C-7), so consumers pair it with
`useNow()` and pass an explicit `now` — which is also how the Svelte consumers avoid a per-item
interval. Note it in the consuming components' READMEs.

**`stream-text.svelte.ts` + `StreamText.svelte`.** `createTextStream(initial, opts)` keeps its
body, and critically its deliberately non-rune `list`/`full` authoritative copies stay non-rune —
that is *why* `push()` is safe to call from an effect, and the identical hazard exists in React
where a store write during render would loop. `$state` on the exposed `segments`/`text` becomes
the notifier; `useTextStream(initial, options)` subscribes and returns
`{ text, segments, push, flush, reset, done }`, with the segment-list snapshot identity-cached so
React does not loop. `StreamSegment.id` stays the stable key and becomes the React `key`. The
pacing timer is owned by an effect and cancelled in its cleanup so StrictMode cannot double-start
it, and no `Math.random()` appears anywhere in the pacing. `StreamText.tsx` plus
`stream-text.css` keep the `fresh` class and animation names identical.

**`host.ts`.** `hostOf(url)` and `monogram(text)` — pure string functions, no DOM, verbatim,
plain `.test.ts`. Their reason for existing (never fetch a third-party favicon from a reader's
browser) is a contract, not an implementation detail: keep the header comment.

**`calendar-core.ts`.** `WeekStartsOn`, `MonthGridDay`, `getMonthGrid`, `addMonths`, `isSameDay`,
`clampDate`, `formatISODate` — pure date arithmetic, verbatim, tests verbatim. One porting note:
they take `Date` arguments and must be called with a caller-supplied date; a consumer must take
"today" as a prop or read it from `useNow`, never construct a `Date` during render.

**`clipboard.svelte.ts`.** `CopyState` and `createCopy(resetMs)` keep their bodies — including the
`ticket` counter guarding a permission prompt held open across an unmount, and the `destroyed`
flag — with `$state` → notifier. `useCopy(resetMs = 2000)` returns `{ copied, copy }` and calls
`destroy()` in its cleanup, the direct analogue of the source's "call from the consumer's
teardown". The `copied` snapshot is a boolean, so `useSyncExternalStore` is trivially safe, and
the `ticket` guard is exactly what makes the hook StrictMode- and unmount-safe, so it ports
unchanged. `navigator.clipboard` is touched only inside `copy()`, so the module stays SSR-safe
just as the factory did.

**`diff.ts`.** `DiffLineType`, `DiffLine`, `DiffHunk`, `DiffFile`, `parseUnifiedDiff` — a pure
parser, verbatim, with its 9 KB of tests transposing assertion-for-assertion and no hook.

**`waveform-core.ts`.** `WaveformStyle`, `drawWaveformFrame(ctx, …)` and `fakeWaveSample(i, tMs)`
— pure canvas-drawing helpers taking a `CanvasRenderingContext2D`, verbatim. The consuming
component owns the `<canvas>` node and the rAF loop, through `useRafThrottle` or an effect-owned
`requestAnimationFrame`, and gets the context from an effect rather than during render.
`fakeWaveSample` is deterministic in `(i, tMs)` — no `Math.random()` — so it satisfies convention
C-7 as-is.
