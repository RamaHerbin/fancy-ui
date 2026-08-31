# `Popover` — port notes

`Popover` + `PopoverContent`, ported from `src/lib/fancy-ui/popover/`. The
register below is what PORTING.md's "port the bug and note it" discipline asks
for, applied to the mechanisms that could not be ported verbatim.

Both components are exported from `index.ts`, and so is `POPOVER_KEY` — the
Svelte `index.ts` exports its context key, so the React context object that
plays that role keeps the name.

## Structural divergences

### `PopoverContent` is rendered unconditionally

The source wraps it in `{#if open}` and lets its scheduler keep the branch
alive for the length of the outro. React has no such thing, so the panel owns
its own mount clock (`usePresence`) and `Popover` renders it on every render —
the same shape `Dialog`/`DialogSurface` uses. Two consequences, both wanted:

- The exit still plays, because `presence.mounted` stays true through it.
- The `Portal` is mounted from the root's own mount, so `usePortalTarget` has
  already resolved its container by the commit that opens the panel. Mounting
  the portal in that same commit would leave `usePresence` with no attached
  node to start a leg on and the entrance would be skipped outright (verified
  on `Dialog`; the guard here is _rises from the shared scale floor_).

A `Portal` with no children renders nothing, so a closed popover still costs
no DOM — `aria-controls` is absent and `.ft-popover-content` is not in the
document, exactly as before.

### `open` is an internal copy re-synced from the prop

The source declares `open = $bindable(false)`. React has no two-way channel,
so the component keeps its own copy, seeded from the prop and re-synced during
render whenever the CALLER changes it. That is what makes all three call
shapes the source's suite pins work off one implementation: a controlled
caller writing the value back, `onOpenChange` alone, and a plain unbound
`open` alongside `onOpenChange` (which must still open itself — a strict
controlled implementation would fail that case).

## Inherited divergences that apply here

From the internals contract's register (§10), unchanged:

- **D-1** — `Portal` renders through `createPortal` rather than moving a
  rendered node.
- **D-2** — `markSurfaceState` is not ported; `data-state` is an ordinary
  attribute carrying `SurfaceState`'s two values.
- **D-3** — `focusTrap`'s `onActivate(returnFocusNow, rearm)` is the hook's
  return value. The two halves are called at the same two moments the source
  calls them, from `usePresence`'s `onExitStart` / `onEnterStart`.
- **D-6** — `dismissable`'s `active` is a plain boolean here, not a getter.
- **D-10** — no portal-before-focus-trap ordering ceremony.
- **D-12** — `useElementRef` costs one extra render at the panel's mount,
  before paint.

## Ported as-is

`data-align` publishes the **requested** alignment while the transform origin
follows the **resolved** one. That is what the source does; it is deliberate
there (the attribute is the caller's own request, the origin is geometry) and
is reproduced rather than "fixed".
