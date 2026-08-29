# `Autocomplete` — port notes

`Autocomplete` + `AutocompletePanel`, ported from `src/lib/fancy-ui/autocomplete/`.
`types.ts` and `match.ts` come across unchanged apart from the context key's
shape. `AutocompletePanel` is not exported from `index.ts` — an implementation
detail on this side too, exactly as on the Svelte one.

## Structural divergences

### The `{#if open}` gate moves one level down

The source is `{#if open}<AutocompletePanel />{/if}`, and Svelte's outro-delayed
branch destruction is what keeps the list on screen for the length of the exit.
`AutocompletePanel` is rendered unconditionally here and owns its own
`usePresence(ctx.open)` clock, which is the React mechanism for the same thing.
Hoisting the gate back into `Autocomplete` would put the panel's `Portal` in the
same commit as the surface, which resolves its container a layout effect too
late and skips the entrance outright — the identical reason `DialogSurface`
hoists its own `Portal` (see that folder's README). A `Portal` with no children
renders nothing, so a closed autocomplete still costs no DOM.

### The exiting panel keeps a snapshot of its rows

Svelte marks the closing `{#if}` branch INERT before playing the outro and its
scheduler skips inert effects, so the rows on screen during the exit are frozen
at whatever they were the instant the close began. That is the same mechanism
the source's `data-state` comment block describes. React re-renders an exiting
subtree normally, so `AutocompletePanel` holds an explicit snapshot of
`suggestions` / `query` / `activeIndex`, refreshed on every open render and
frozen while closing.

Without it the most common close this component has — a keystroke whose query
stops matching — would empty the list to a bare box halfway through its own
fade, since `ctx.suggestions` is already `[]` by then. Pinned by the one test in
this folder marked `PORT ADDITION`.

## Inherited divergences that apply here

| #    | What it means for this component                                                                                                                                                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | `createPortal` renders into `document.body` instead of relocating a rendered node. The panel is absent from server HTML; inert in practice, since `open` starts false. Synthetic events still bubble through the React tree, which nothing here relies on — `useDismissable` listens natively. |
| D-2  | `markSurfaceState` is not ported. `data-state` is an ordinary React attribute fed by `presence.surfaceState`; same two emitted values, `"open"` and `"closing"`.                                                                                                                              |
| D-6  | `dismissable`'s `active` is the plain boolean `ctx.open`. `exclude` keeps its getter form — the input node is genuinely dynamic and is resolved at event time.                                                                                                                                |
| D-12 | `useElementRef` costs one extra render at mount, for both the input and the panel. Not visible — it lands before paint.                                                                                                                                                                       |

The source's `onPlacement` closure over two `$state` variables collapses to
`useAnchorPosition`'s return value, seeded with the requested `bottom` / `start`
exactly as the source seeds its own.

## Other port decisions

- **`value = $bindable("")` → an internal copy re-seeded during render.** The
  prop seeds the copy and re-seeds it whenever the consumer actually changes
  it; between those the component's own copy is free to move. That is what a
  non-bound `$bindable` prop does, and it is what keeps all three call shapes
  working off one implementation — a consumer owning the value, a consumer
  passing only `onValueChange`, and a consumer passing a plain `value` it never
  updates. Note this differs from `ToggleGroup`'s strict controlled/uncontrolled
  split; the source suite has an explicit test for the third shape, which a
  strict split fails.
- **`ref` → `forwardRef`.** `AutocompleteProps` therefore has no `ref` field.
  The component also needs the input NODE for the panel's anchor and its
  outside-click exclusion, so the forwarded ref is composed with a
  `useElementRef` (convention C-1) rather than read out of it.
- **`data-align` is a static `"start"`.** Faithful to the source, which writes
  the literal even though `resolvedAlign` moves — `resolvedAlign` feeds only
  `transform-origin`. Port the bug and note it.
- **`AUTOCOMPLETE_KEY` is the React context object.** The Svelte `index.ts`
  exports the `unique symbol`, so the key keeps its public identity here;
  `createInternalContext` gives it `.Provider` / `.useRequired` /
  `.useOptional`. The panel reads it with `useRequired()` — it is only ever
  rendered by the root, so a missing provider is a programming error.
- **`prefers-reduced-motion` is not this component's business.** `anchored()`
  collapses its own duration to 0, `runTransition` then never calls
  `element.animate()`, and the close stays synchronous. The source's `<style>`
  block carries no reduced-motion rule of its own and is ported unchanged.
