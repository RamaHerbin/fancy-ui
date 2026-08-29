# `Combobox` — port notes

`Combobox` + `ComboboxPanel`, ported from `src/lib/fancy-ui/combobox/`.
`types.ts` and `match.ts` carry over one-for-one; `match.ts` is byte-identical
apart from nothing at all.

`ComboboxPanel` is not exported from `index.ts` — an implementation detail on
the Svelte side too.

## Consumer-visible API differences

### `value` seeds a copy the component owns, and re-seeds when the caller changes it

The Svelte source declares `value = $bindable("")`, which behaves as *both*:
a `bind:value` consumer round-trips it, and a plain non-bound `value="react"`
seeds an internal copy the component then owns. React has no such channel, so
the prop SEEDS this port's own copy and re-seeds it whenever the consumer
actually changes it — the same spelling `Select`, `TimePicker` and
`Autocomplete` use, and the closest available match for a non-bound
`$bindable`. A consumer that writes `value` back from `onValueChange` is fully
controlled; one that never updates it still gets a field that selects, submits
and resolves-on-blur against the option it actually picked, exactly as the
Svelte component does. `onValueChange` fires identically either way.

### `class` → `className`, `ref` → the forwarded ref

Per PORTING.md. The Svelte `ref = $bindable(null)` becomes `forwardRef`, so
`<Combobox ref={…} />` yields the `<input>` element.

### `COMBOBOX_KEY` is a React context object, not a `Symbol`

The name is kept because the Svelte `index.ts` exports it. It is built with the
shared `createInternalContext` helper — the same as `SELECT_KEY`,
`AUTOCOMPLETE_KEY` and `TIME_PICKER_KEY` — so the panel reads it with
`COMBOBOX_KEY.useRequired()` and the root provides it with
`<COMBOBOX_KEY.Provider>`.

## Port notes worth keeping

### `createListbox`, not `useListbox`

`useListbox` reads `count` and `enabled` from live refs written in an insertion
effect, i.e. one commit behind. `handleInput` writes the query and then calls
`listbox.moveToEdge("first")` in the same turn, and those two callbacks must
see *that keystroke's* filtered list — the exact hazard the Svelte source's own
comment describes and sidesteps by passing getters that recompute. So this
component wires the framework-free core directly, with `count`/`enabled`
recomputing from a synchronously-written `queryRef`, and reads `activeIndex`
through `useSyncExternalStore`. Without it, typing a query that matches nothing
would leave `aria-activedescendant` pointing at a row that no longer exists.

### The panel is rendered unconditionally; `usePresence` owns the gate

The source writes `{#if open}<ComboboxPanel />{/if}` in the root and puts the
`transition:` on the panel. Here `Combobox` renders `<ComboboxPanel />` always,
and the panel keeps its `<Portal>` mounted with only the panel `<div>` gated on
`presence.mounted`. `usePortalTarget` resolves its container in a layout
effect, so a `Portal` first mounting in the same commit as the panel renders
nothing on that pass — the registered node would not exist when `usePresence`
looks for legs to start, and the entrance would be silently skipped while every
other assertion still passed. Same divergence the `Dialog` port records.

### `markSurfaceState` is not used (contract divergence D-2)

`data-state` is an ordinary React attribute carrying `presence.surfaceState`'s
two values. The source writes it imperatively from `onoutrostart` only because
Svelte marks a closing branch inert and its scheduler skips inert effects;
React re-renders the exiting surface normally. `inert` is likewise not written
by hand — `usePresence` sets it on the registered node for the whole exit.

### The panel freezes its rows for the length of the exit

Svelte destroys the `{#if open}` branch that owns the panel and marks it INERT
before playing the outro; its scheduler skips inert effects, so the rows on
screen during the exit are whatever they were the instant the close began.
React re-renders an exiting subtree normally, so `ComboboxPanel` keeps an
explicit snapshot of `options`/`query`/`activeIndex`, refreshed only while
`ctx.open` is true. It is load-bearing here rather than cosmetic: `close()`
resolves the query back to the selected option's label in the very turn it
flips `open`, and a query equal to the selection's own label is exactly the
case that filters nothing out — so without the snapshot a panel that closed
while showing "No results" would repopulate with the whole option list halfway
through its own fade. Pinned by the one port-added test in the suite,
"keeps the rows it was showing on screen for the length of the exit". Same
divergence the `Autocomplete` port records.

### `data-align` stays the static `"start"` the source emits

`ComboboxPanel.svelte` tracks `resolvedAlign` and feeds it to
`transform-origin`, but hardcodes `data-align="start"`. Ported as-is: it is a
source-side inconsistency, not a port defect, and the attribute is part of the
rendered contract a consumer's CSS may key on.

### Hidden submission input

No `readOnly` and no no-op `onChange` was added: React's controlled-value
warning exempts `type="hidden"`, verified against this folder's suite, so the
emitted DOM matches the source exactly.

## Styling

`combobox.css` is the source's `<style>` block verbatim, already anchored on
`.ft-combobox` — the first token of the input's own `cn()` call — so no
port-added anchor class was needed. The `--ft-accent` fallback literal is
re-typed by hand per PORTING.md's custom-property rule.
