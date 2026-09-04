# `DropdownMenu` — port notes

Nine components plus `types.ts` and `menu-shared.ts`, ported from
`src/lib/fancy-ui/dropdown-menu/` — one file per source file. `index.ts`
mirrors the source barrel exactly: the nine components, their `*Props`, and the
three context keys with their contracts (`MENU_KEY`, `SUB_KEY`,
`DROPDOWN_MENU_KEY`, `MenuContext`, `MenuCloseOptions`, `SubContext`,
`DropdownMenuRootContext`).

## Port decisions worth knowing

### Three `setContext` keys become three `React.Context` objects

The source publishes each contract under a `unique symbol`. React's own context
object plays that role, so the exported names are kept and the values are
contexts rather than symbols. Each has a local `useX()` reader that throws
outside its provider (the compound-component contract) — the readers are not
public surface, the keys are, exactly as on the source side.

`DropdownMenuSubContent` shadows its parent's `MENU_KEY` for its own subtree
after capturing the parent's value, which is what lets a selection three
submenus deep close the whole tree in one hop and what makes `rootOpen`
compose down a chain of nested levels.

### `open` is the two-way prop pattern, not a controlled input

`open = $bindable(false)` becomes an internal copy seeded from the prop and
re-synced **during render** whenever the caller changes it. That keeps all three
documented call shapes working off one implementation: a caller that owns
`open`, a caller that passes only `onOpenChange`, and a caller that passes
neither. Same shape as the `Dialog` and `Popover` ports. `openRef` (a live ref)
is what `setOpen`'s `open === next` early return reads, so the guard is exact
inside a handler that has not re-rendered yet.

### `focusEdge` and `triggerRef` stay refs

Both are plain, deliberately non-reactive `let`s in the source, and nothing
renders off either: the content reads `triggerRef` lazily from an anchor getter
and an exclude getter that run at event time, and `focusEdge` is read once by
the effect that moves focus after the panel mounts. They are exposed on the
context as getters over refs, which is precisely what they are in the source.

### The `{#if}` moved down one level, in both panels

`DropdownMenuContent` and `DropdownMenuSubContent` each render their `Portal`
unconditionally and gate only its **children** on `presence.mounted`. A `Portal`
that first mounts in the same commit as the panel resolves its container in a
layout effect and renders nothing on that pass — `usePresence` would then find
no registered leg and the entrance would be silently skipped. Same shape as
`DialogSurface` and `SelectPanel`.

### `|global` has no React counterpart, and needs none

The source spells `DropdownMenuSubContent`'s transition `|global` so that
closing the ROOT collects the submenu's exit instead of letting it pop out at
full opacity beside a parent already fading. Here `live = sub.open &&
parentMenu.rootOpen` already folds the root's state in, so the submenu's own
presence clock starts its exit in the very commit the root's does. Both levels
fade together and each unmounts when its own last leg settles.

### One `createOpenSubRegistry` per level, through `useConstant`

Allocation-only (no listener, no timer), so `useConstant` is safe. It is never
shared across levels, which is what keeps a deeply nested submenu from closing
an unrelated one two levels up.

## Inherited divergences that apply here

- **D-1** — `Portal` renders through `createPortal` instead of moving a rendered
  node, so neither panel is in the server HTML. Nil in practice: both are gated
  on an `open` that starts false.
- **D-2** — `markSurfaceState` is not ported. `data-state` is an ordinary
  attribute carrying `presence.surfaceState`'s two values (`"open"` /
  `"closing"`, never `"opening"` — convention C-5). Same emitted DOM.
- **D-5** — `useMenuFocus` destroys its core on unmount, closing the typeahead
  timer the source's `DropdownMenuContent` never closed.
- **D-6** — the two dismiss layers take `active` as a plain boolean
  (`root.open`, `live`) where the source needed a getter. Semantics unchanged: a
  layer stays on the stack for its whole exit and stops being top of it the
  instant its predicate flips, so a second Escape during the fade reaches
  whatever sits underneath.
- **D-9** — the `tick()` before `focus.moveToEdge(edge)` is dropped in both
  panels. Items register from their own ref callbacks, which land in the commit
  that creates them, so the core is already populated. The effect is keyed on
  `presence.mounted` as well as `open`, because `mounted` is what flips in the
  commit that actually creates the items.
- **D-12** — `useElementRef` costs one extra render at mount for each panel,
  before paint.

### Post-open focus lands one frame after the panel paints

`DropdownMenuContent` and `DropdownMenuSubContent` move focus onto the first or
last item from a passive effect, where the source does it in a `tick()`
microtask — so the panel paints once before the focus ring arrives. Cosmetic:
the anchored entrance is still animating at that point. It is the port's house
pattern across both menu families rather than a per-component slip, and it is
recorded in `react/README.md` for `dropdown-menu` and `context-menu` alike.

## Not a divergence

The static import of the sound controller (and, through it, the theme recipe
data) to serve a `sound` prop that defaults to `false`. The identical coupling
exists on the source side and is ported as-is.

## Test notes

`DropdownMenuHarness.test.svelte` becomes the inline `<Harness>` component at
the top of `DropdownMenu.test.tsx`; every assertion transposes one-for-one.
Adjustments, all mechanical:

- `useSoundCue` forwards its optional second argument, so a cue assertion reads
  `toHaveBeenCalledWith("open", undefined)` where the source read
  `toHaveBeenCalledWith("open")`. The cue itself is unchanged.
- The source's `bind:open` round-trip becomes a controlled `open` +
  `onOpenChange` pair held in a caller's own state — the React spelling of the
  same contract.
- The placement-flip tests drive the `onPlacement` that `useAnchorPosition`
  handed the spied core, rather than the component's own callback: the hook owns
  that callback, and driving it exercises the same publish path (local placement
  state, and `SubContext.setPlacement` for the submenu). jsdom's zeroed rects
  can never produce a genuine flip.
- Keyframe assertions read `FakeAnimation.instances` where the source read the
  `animate` spy's `mock.contexts`, filtering out the sampler's leading dummy
  animation (which carries an empty keyframe list on an exit).
- One addition, marked under a `React layer` block: a StrictMode mount / open /
  open-submenu / close-both, asserting one panel per level, no duplicate item
  registrations, and that the dismiss stack drains to zero.

**Known coverage gap.** The six entrance/exit keyframe checks use
`toMatchObject` where the source suite pins each keyframe with `toEqual`. The
sampled objects carry exactly `opacity` and `transform` today, so the weaker
matcher would let a regression that starts animating a third property ship
green. The two equivalent assertions in the `ContextMenu` suite were tightened,
so the two suites now differ in strictness. Test-only — no consumer-visible
behaviour depends on it.
