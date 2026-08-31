# `CommandMenu` — port notes

Ported from `src/lib/fancy-ui/command-menu/`. One file per source file:
`CommandMenu.tsx`, `match.ts` (verbatim), `types.ts` (verbatim), `index.ts`,
plus the colocated `command-menu.css` for the source's `<style>` block. The
register below is what PORTING.md's "port the bug and note it" discipline asks
for, applied to the mechanisms that could not be ported verbatim.

## Consumer-visible API differences

| Source                         | Here                                      | Why                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class`                        | `className`                               | House rule for every port.                                                                                                                                                                                  |
| `ref = $bindable(null)`        | `forwardRef<HTMLDivElement>`              | PORTING.md §"API contract".                                                                                                                                                                                 |
| `open` / `query` bindable      | controlled-or-uncontrolled props          | An internal copy seeded from the prop and re-synced during render when the CALLER changes it. `onOpenChange` / `onQueryChange` are how a value gets back out; there is no two-way binding channel in React. |
| `icon: Snippet<[CommandItem]>` | `icon?: (item: CommandItem) => ReactNode` | Snippets with parameters become render functions.                                                                                                                                                           |
| `empty: Snippet`               | `empty?: ReactNode`                       | A no-argument snippet is just a node.                                                                                                                                                                       |

Everything else — the `role="dialog"` + `aria-modal` panel, the combobox input
with `aria-activedescendant` into a flat display index space, group headings,
`<mark>` highlighting, the debounced `role="status"` count, the modal motion
rung (300 ms in / 200 ms out) and every Tailwind literal — is identical.

## Divergences from the source implementation

### `markSurfaceState` is gone; `data-state` is an ordinary attribute

The source writes `data-state="open"` as a STATIC literal and mutates it from
`onintrostart` / `onoutrostart`, because Svelte marks a closing `{#if}` branch
inert and its scheduler skips inert effects, so a reactive attribute inside a
closing block never reaches the DOM. React re-renders the exiting surface
normally, so this is `data-state={presence.surfaceState}` — two values only,
`"open" | "closing"`, never `"opening"` (internals contract C-5). Same DOM, same
CSS hooks. (Contract divergence D-2, inherited.)

### The portal-before-focus-trap ordering ceremony is gone

The source puts `use:portal` and `use:focusTrap` on the same element, portal
first, with a comment block explaining that `.focus()` on a detached node is a
silent no-op. `createPortal` commits children into the container before any
effect runs and refs populate before layout effects, so the node the trap
focuses is always connected. The hazard cannot recur. (Contract divergence
D-10, inherited.)

### `useScrollLock(presence.mounted)`, not a bare `useScrollLock()`

Same correction `DialogSurface` records. This component is mounted for as long
as a `CommandMenu` is anywhere in the tree, open or closed, so the contract's
bare call would lock the page forever. `presence.mounted` is the mounting scope
expressed as a boolean and stays true for the whole exit, so the release still
lands in the commit that unmounts the subtree — where the source action's
outro-delayed `destroy()` put it. Emphatically not `useScrollLock(open)`, which
releases at exit START and leaves the page scrollable under a scrim still on
screen.

### The `Portal` is hoisted above the presence gate

`usePortalTarget` resolves its container in a layout effect, so a `Portal` that
mounts in the same commit as the surface renders nothing on that pass — the
registered nodes would not exist when `usePresence`'s layout effect looks for
legs to start, the group settles with nothing attached, and the entrance is
silently skipped. `<Portal>` therefore stays mounted and its CHILDREN are what
`presence.mounted` gates. A `Portal` with no children renders nothing, so a
closed menu still costs no DOM. Pinned by _plays an entrance leg when it opens
from closed_.

### The listbox core is wired by hand, not through `useListbox`

The source passes `createListbox` two getters that read `query` live:

```ts
count: () => computeDisplayItems(computeFilteredItems(query)).length,
enabled: (i) => !computeDisplayItems(computeFilteredItems(query))[i]?.disabled,
```

and its `handleInput` relies on that freshness — it writes `query` and then
calls `listbox.moveToEdge("first")` in the same synchronous pass, with a
comment saying so. `useListbox` takes `count` as a plain number read from the
last COMMITTED render, which inside a React change handler is one keystroke
behind: the first surviving match would be resolved against the PRE-keystroke
list, so a keystroke that makes the new first row disabled (or empties the
list) would activate the wrong row.

`createListbox` is therefore called directly, with the same getter shape the
source passes, over refs; `setQuery` writes the query ref synchronously before
`moveToEdge` reads it. `activeIndex` is read with
`useSyncExternalStore(store.subscribe, …)` exactly as `useListbox` does, and
the store is destroyed on unmount (the source's `onDestroy`). Observable
behaviour is the source's, not a variant of it.

### `untrack` becomes an honest dependency array

The reset-on-reopen effect fires on `open` alone. In Svelte that needed
`untrack`, because Svelte follows reads through function calls and the effect
both reads and writes `query` (`effect_update_depth_exceeded`). Here every
other value the effect touches is reached through an identity-stable ref or
handle, so `[open, listbox, emitQueryChange]` is both honest and minimal — the
same "re-fires on `open`, not on a keystroke or an `items` swap" contract, with
no escape hatch.

### `match.ts`: one guard added for a stricter tsconfig

`react/tsconfig.json` enables `noUncheckedIndexedAccess`; the repo-root one does
not, which is exactly what `getMatchRange`'s own comment records. The `end`
computation reads `map[endFoldedIndex]` into a local and folds the `undefined`
case into the same `label.length` branch the bounds check already selects —
`nextStart` cannot be `undefined` while `endFoldedIndex < map.length` holds, so
the values out are unchanged in every case. The `start === undefined` guard the
source already carries is untouched.

### Dead `inputRef` dropped

The source binds `inputRef` and never reads it. Nothing renders off it and no
handler touches it, so it is not reproduced.

## Tests

All 55 assertions of `CommandMenu.test.ts` transpose one for one. The
`createRawSnippet` harnesses for `icon` / `empty` become plain JSX, `bind:open`
and `bind:query` become controlled wrapper components, and the transition
assertions read `FakeAnimation.instances` instead of spying on
`Element.prototype.animate` — the sampler builds the real animation inside the
leading dummy's `onfinish`, one microtask later, so each motion test drains the
leg before reading the keyframes it actually runs.

Three React-layer additions the internals contract §9.4 names for a
presence + portal + trap + lock + dismiss pairing sit at the end, clearly
marked: `data-state` never renders `"opening"`, the entrance leg actually
plays, and the scroll-lock / dismissable-stack leak counters return to rest
under StrictMode.
