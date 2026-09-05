# `Select` — port notes

`Select` + `SelectPanel` + `types.ts`, ported from `src/lib/fancy-ui/select/`
(one file per source file). `SelectPanel` and the context are not exported from
`index.ts`, matching the source barrel, which exports only `Select`,
`SelectProps` and `SelectOption`.

## Port decisions worth knowing

### `open` is state AND a synchronously-written ref

The one place this port cannot be a literal transcription. `openPanel()` flips
`open` and then, in the very next statement, moves the listbox's active index —
and `onActiveChange` branches on whether the panel is open, because a move while
CLOSED is closed-state typeahead and commits immediately, while a move while
OPEN is only a highlight.

The source reads its `open` rune there and sees the value it wrote one statement
earlier. A React render value would still be the pre-handler `false`, so every
keyboard open (ArrowDown / ArrowUp / Enter / Space) would take the typeahead
branch and silently **commit** the option it was only meant to highlight.
`setOpen()` therefore writes `openRef.current` alongside `setOpenState()`, and
`handleActiveChange` reads the ref. Six assertions in this folder's suite fail
without it (verified by reverting the ref and re-running).

Nothing else in the component needs the same treatment: `value` is written at
most once per handler, and `activeIndex` is never read after being moved within
one handler.

### `value` is the two-way prop pattern, not a controlled input

`value = $bindable("")` becomes an internal copy seeded from the prop and
re-synced **during render** whenever the caller changes the prop. That is what
keeps all three documented call shapes working off one implementation: a caller
that owns `value`, a caller that passes only `onValueChange`, and a caller that
passes a plain non-owned `value` plus a callback. Same shape as the `Dialog`
port's `open`.

### The `{#if open}` moved down one level

The source mounts `SelectPanel` inside `{#if open}` in `Select`. Here `Select`
renders `<SelectPanel>` unconditionally and the mount gate is `presence.mounted`
inside the panel — the panel has to outlive `open` for the length of its own
exit, and its `Portal` has to resolve a container **before** the commit that
opens it (a `Portal` first mounting in the same commit as the surface renders
nothing on that pass, and the entrance is then silently skipped). Same shape as
`DialogSurface`. `open` still travels through the context, exactly as it does in
the source.

### `data-align` publishes the REQUESTED alignment

`data-side` is the resolved side, `data-align` is the requested align, and the
`transform-origin` uses the resolved values for both. The asymmetry is the
source's, and is ported rather than fixed (fidelity over improvement). It is
invisible until a real viewport edge clamps the alignment.

### Ids and `CSS.escape`

One `useFancyId()` seed, suffixed into `${uid}-listbox` and `${uid}-option-${i}`
(convention C-6). The active row is scrolled into view with
`querySelector('#' + CSS.escape(optionId(index)))` — verbatim from the source,
and the escape is what makes it safe with `useId`'s delimiters in the string.

## Inherited divergences that apply here

- **D-1** — `Portal` renders through `createPortal` instead of moving a rendered
  node, so the panel is absent from server HTML. Nil in practice: the panel is
  gated on an `open` that starts false.
- **D-2** — `markSurfaceState` is not ported. `data-state` is an ordinary
  attribute carrying `presence.surfaceState`'s two values (`"open"` /
  `"closing"`, never `"opening"` — convention C-5). Same emitted DOM.
- **D-6** — the dismiss layer's `active` is a plain boolean (`ctx.open`) where
  the source needed `() => ctx.open`. Semantics unchanged: the layer stays on the
  stack for its whole exit and stops being top of it the instant `open` flips, so
  a second Escape during the fade reaches the layer underneath.
- **D-12** — `useElementRef` costs one extra render at mount for the trigger and
  for the panel, before paint.

## Not a divergence

The static import of the sound controller (and, through it, the theme recipe
data) to serve a `sound` prop that defaults to `false`. The identical coupling
exists on the source side and is ported as-is.

## Test notes

`SelectHarness.test.svelte` becomes the inline `<Harness>` component at the top
of `Select.test.tsx`. Two transposition adjustments, both mechanical:

- `fireEvent.pointerEnter` becomes `fireEvent.pointerOver`. React synthesises
  `onPointerEnter` from the native `pointerover`/`pointerout` pair, so a native
  `pointerenter` reaches no handler.
- `useSoundCue` forwards its optional second argument, so a cue assertion reads
  `toHaveBeenCalledWith("open", undefined)` where the source read
  `toHaveBeenCalledWith("open")`. The cue itself is unchanged.

Two tests are additions, both marked under a `React layer` block: the
highlight-without-committing guard described above, and a StrictMode
mount/open/close leaving exactly one panel and draining the dismiss stack.
