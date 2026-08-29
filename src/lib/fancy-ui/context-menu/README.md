# ContextMenu

A menu that opens at the pointer on right-click (and its keyboard
equivalents — the Menu key, Shift+F10), wrapping a region of content rather
than a single trigger button. Shares its item/separator/label/submenu
behaviour with `DropdownMenu` — see "Shared implementation" below — and
differs only in how it opens and where it anchors.

## Components

- `ContextMenu` — the root: owns `open` state, the last right-click's
  pointer coordinates, and a zero-size virtual anchor element; provides
  context, renders nothing visible of its own
- `ContextMenuTrigger` — wraps a region and listens for `contextmenu`
- `ContextMenuContent` — the portalled, positioned, dismissable panel
  (`role="menu"`), anchored to the virtual anchor rather than a real element
- `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuLabel`,
  `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent` — all
  re-exported from `dropdown-menu`; see "Shared implementation"

## Usage

```svelte
<script>
	import {
		ContextMenu,
		ContextMenuTrigger,
		ContextMenuContent,
		ContextMenuItem,
		ContextMenuSeparator,
	} from "fancy-ui-svelte";
</script>

<ContextMenu>
	<ContextMenuTrigger>
		<div class="rounded-md border p-8">Right-click this card</div>
	</ContextMenuTrigger>
	<ContextMenuContent>
		<ContextMenuItem onSelect={() => back()}>Previous</ContextMenuItem>
		<ContextMenuItem disabled onSelect={() => forward()}>Next</ContextMenuItem>
		<ContextMenuItem onSelect={() => reload()}>Reload</ContextMenuItem>
		<ContextMenuSeparator />
		<ContextMenuItem onSelect={() => save()}>Save page</ContextMenuItem>
	</ContextMenuContent>
</ContextMenu>
```

`open` is bindable, or drive it yourself with `onOpenChange` — the same
three ways every bindable prop in this library works, identical to
`DropdownMenu`'s own (see its README for all three forms spelled out).

Right-clicking the wrapped region _replaces_ an already-open menu rather
than stacking a second one — there is only ever one `ContextMenuContent`
per root, so a second right-click just repositions it. Right-clicking a
_different_ `ContextMenuTrigger` elsewhere opens that one's own, separate
`ContextMenu` instance, unrelated to this one.

## Shared implementation (see `dropdown-menu/README.md` too)

`ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuLabel`,
`ContextMenuSub`, `ContextMenuSubTrigger` and `ContextMenuSubContent` are
not separate files in this folder — `context-menu/index.ts` re-exports
`dropdown-menu`'s own `DropdownMenuItem`/`DropdownMenuSeparator`/etc. under
these names. Once a panel is open, the two families need identical
behaviour (arrow keys, Home/End, typeahead, hover-intent submenus,
"selecting anything closes the whole tree"), so it exists in one place
instead of two. `context-menu/types.ts` similarly imports `MenuContext`/
`MENU_KEY` and `SubContext`/`SUB_KEY` from `dropdown-menu/types.ts` rather
than redeclaring them — the same context contract, satisfied by either
family's own root+content.

What is **not** shared, because it is genuinely different:

- **The root.** `DropdownMenu` owns a `side`/`align`/`offset` relative to a
  real trigger element. `ContextMenu` owns the last right-click's pointer
  coordinates and a zero-size, `position: fixed` virtual anchor element
  moved to them — there is no real DOM element at a right-click for
  `anchorPosition` to measure.
- **The trigger.** `DropdownMenuTrigger` is a real `<button>` carrying
  `aria-haspopup`/`aria-expanded`/`aria-controls` — a control a user
  _activates_. `ContextMenuTrigger` wraps arbitrary content and listens for
  `contextmenu`; see Accessibility below for why it deliberately carries
  none of that ARIA.
- **`*Content`'s own anchoring call.** Same `anchorPosition` action, same
  flip/clamp behaviour, but pointed at `ContextMenu`'s virtual anchor
  instead of a trigger element, and defaulting to a smaller `offset` (`2`
  vs. `DropdownMenu`'s `4`) since it's hugging a pointer position, not
  clearing a visible button.

## Accessibility

- No `aria-haspopup`/`aria-expanded`/`aria-controls` on `ContextMenuTrigger`
  itself, unlike `DropdownMenuTrigger`. Those attributes describe a control
  an assistive-technology user _activates_ to open something; a wrapped
  region invoked by a pointer gesture (or its OS-level keyboard equivalents)
  isn't one — there's no ARIA role for "right-clickable region", and
  borrowing `role="button"` would claim an Enter/Space activation model this
  element doesn't actually offer.
- **How the keyboard path is distinguished from a real right-click, with one
  handler for both**: the Menu key and Shift+F10 both dispatch a `contextmenu`
  event — the same event a real right-click dispatches, so one `oncontextmenu`
  handler covers both — told apart by `event.button`. A `contextmenu` fired
  by the right mouse button reports `button === 2`; one synthesized by the
  keyboard reports `0`. That's not an inference from where the pointer
  probably wasn't (an earlier version of this component guessed from
  `clientX`/`clientY` both being `0`, which a real right-click at the
  viewport's literal corner could also produce) — it's what the event states
  about its own origin, so it holds everywhere, corner included. The keyboard
  path still has no real pointer position to open at, so it falls back to the
  trigger region's own `getBoundingClientRect()`, same as before.
- Content: `role="menu"`, no `aria-labelledby` — unlike `DropdownMenu`,
  there is no single persistent trigger element to point at as this panel's
  label (the "trigger" is a whole wrapped region, not a named control).
- Escape closes the menu and restores focus to whatever held it immediately
  before the menu opened (captured once, the moment it opens — not
  re-captured on a same-menu reposition, so a second right-click while
  already open doesn't overwrite it with the menu's own currently-focused
  item). Not modal, so this isn't `focusTrap`'s job; `ContextMenu` borrows
  the same "remember, then restore if still connected" reasoning
  `_internals/focus-trap.ts` itself uses for a modal surface, locally, since
  a non-modal surface can't reuse that module directly. An outside click
  goes through the same `dismissable` `onDismiss` callback as Escape (one
  callback for both, never two separate listeners), so it restores focus
  the same way.
- **If whatever held focus before the menu opened is gone by the time it
  closes, focus restoration is skipped, not redirected.** The `isConnected`
  check above means this doesn't throw, but — same reasoning as
  `DropdownMenu`'s own README note on removing its trigger while open —
  there is no defensible fallback target to invent for a non-modal surface,
  so focus is simply left wherever the browser puts it once the active
  element disappears. Not expected to come up in normal use (the pre-open
  focus target is usually a stable page control, not something removed by
  the act of opening a context menu on it), but not silently patched over
  either.
- Tab closes the menu and is never `preventDefault`ed — same reasoning as
  `DropdownMenu`'s own Tab handling; see its README for the full note and
  the jsdom caveat that comes with it.
- Item-level accessibility (`role="menuitem"`, disabled handling, the
  shortcut's `aria-hidden` `<kbd>`, separators, labels, submenu triggers) is
  identical to `DropdownMenu`'s own — see its README's Accessibility
  section; it isn't repeated here because the implementation is the exact
  same component, not a parallel one that happens to match.

## Props

### ContextMenu

| Prop           | Type                                     | Default    | Description                                                            |
| -------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `open`         | `boolean`                                | `false`    | Whether the menu is open. Bindable                                     |
| `onOpenChange` | `(open: boolean) => void`                | —          | Called whenever the menu opens or closes, however it happened          |
| `side`         | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Side of the pointer to place the menu on. Flips when it would overflow |
| `align`        | `"start" \| "center" \| "end"`           | `"start"`  | Alignment along the pointer's cross axis                               |
| `offset`       | `number`                                 | `2`        | Gap in pixels between the pointer and the menu                         |
| `loop`         | `boolean`                                | `true`     | Whether arrow-key navigation wraps at the ends                         |
| `children`     | `Snippet`                                | —          | The `ContextMenuTrigger` and `ContextMenuContent`                      |

### ContextMenuTrigger

| Prop       | Type                     | Default | Description                                                                   |
| ---------- | ------------------------ | ------- | ----------------------------------------------------------------------------- |
| `disabled` | `boolean`                | `false` | Leaves `contextmenu` alone entirely — the browser's native menu shows instead |
| `children` | `Snippet`                | —       | The wrapped region's content                                                  |
| `class`    | `string`                 | —       | Additional CSS classes, merged onto the wrapping element                      |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable reference to the wrapping element                                    |

### ContextMenuContent

Same shape as `DropdownMenuContent` (`children`, `class`, `ref`) — see
`dropdown-menu/README.md`.

### ContextMenuItem / ContextMenuSeparator / ContextMenuLabel / ContextMenuSub / ContextMenuSubTrigger / ContextMenuSubContent

Identical props to their `DropdownMenu*` counterparts — see
`dropdown-menu/README.md`'s Props section; these are the same components.

## Theming

This family declares no `--ft-nav-accent` of its own: unlike
`DropdownMenuTrigger`, `ContextMenuTrigger` is a plain wrapping element with
no focus-visible ring (right-click has no keyboard focus state of its own
to ring), so there is nothing here that reads the accent token. The shared
item components (`ContextMenuItem`/`Separator`/`Label`/`Sub`/`SubTrigger`/
`SubContent`) don't read it either — `--ft-nav-accent` is read in exactly
one place in the whole `dropdown-menu` folder, `DropdownMenuTrigger`'s own
focus ring, which isn't one of the components this family shares. Everything
here — panel, hover/focus row, destructive text, muted carets/shortcuts/
labels — uses the same semantic tokens `DropdownMenu` does.

`ContextMenuContent`/`ContextMenuSubContent` are portalled (`use:portal`),
same as their `DropdownMenu` counterparts, so they inherit no custom
property from an ancestor inside the page once mounted — only one set at or
above `body`. Neither reads `--ft-nav-accent`, so this doesn't currently
bite here; see `dropdown-menu/README.md`'s Theming section for the full
reasoning if you add a portalled read of the accent to either later.

## Motion

The panel rises over 150 ms on the shared arrival curve (`DURATIONS.fast` and
`JS_EASINGS.out`, the rung every floating surface in the library is on),
growing from a `0.92` floor, and reverses over the same 150 ms on the
departure curve (`JS_EASINGS.in`) — collapsing only to `0.96`, half the depth,
because leaving is a smaller gesture than arriving. The growth origin follows
the placement the panel actually got — flipped sides included, and the
cross-axis alignment as it ended up rather than as it was requested, since a
menu opened near a viewport edge is clamped sideways until the corner touching
the pointer is no longer the one asked for. Either way it appears to come out
of the click, and to fold back into it, rather than out of its own centre.
`data-side` / `data-align` carry the resolved side and the requested alignment
for consumers keying their own styling off placement.

One bidirectional Svelte transition drives both directions, not a keyframe, so
there is no `--ft-*` variable on the panel to retime it; reduced motion is the
one switch.

- This is the panel where the origin earns its keep. The anchor is a
  zero-size point at the pointer, so a right-click low in the viewport, or
  far to the right of it, flips the placement as a matter of routine — and
  the corner the menu grows from, and collapses back into, flips with it.
- Only `opacity` and `transform` animate, and only on the panel itself.
- A submenu opened from here is `dropdown-menu`'s `SubContent` (see "Shared
  implementation"), so it gets exactly the same motion, growing from the edge
  nearest the row that opened it and leaving on the same clock as the panel
  that owns it.
- **The close is not deferred, only the removal is.** `open` still flips the
  instant you dismiss, and `onOpenChange` fires once and immediately. What
  waits is the panel leaving the DOM.
- **Focus is never animated, and never waits.** The first item is focused in
  the same tick the panel mounts; on the way out, whatever had focus before
  the right-click gets it back at the dismiss instant rather than at the end
  of the fade — `ContextMenu`'s own `setOpen` does that, so this surface needs
  no focus trap. `data-state="closing"` is set on the panel for the length of
  the exit, and the framework marks it `inert` for the same window, so a menu
  on its way out cannot take a click.
- **A second Escape during the fade reaches whatever is underneath.** The
  dismiss layer stops answering the moment `open` is false, so it neither
  fires again nor swallows the key on its way to the surface below. A second
  right-click mid-fade reopens the same panel by reversing the exit, rather
  than stacking another one on top of it.
- **Reduced motion** — no animation at all in either direction; the panel
  simply appears and disappears, and the close is fully synchronous again,
  exactly as it was before this component animated out. Visibility never
  depended on the animation: `{#if root.open}` owns the panel's DOM existence,
  and the motion is layered on top of that.
- **Touch and coarse pointers** — unchanged; neither direction is
  pointer-gated. A long-press-driven `contextmenu` event opens exactly as a
  right-click does.

## Implementation notes

- The virtual anchor (`ContextMenu`'s own `<span class="ft-context-menu-anchor">`)
  is a zero-size, `position: fixed` element kept mounted for the whole
  lifetime of `ContextMenu`, not just while open, so it's already positioned
  and ready the instant `ContextMenuContent` asks `anchorPosition` for its
  rect. `anchorPosition`'s flip/clamp math needs nothing different for a
  zero-size anchor versus a real element's — a point still overflows and
  clamps at the viewport edges the same way a rect does. It's portalled
  (`use:portal`) too, same as `ContextMenuContent` itself: `position: fixed`
  resolves its containing block against the nearest ancestor establishing
  one — not just a `position` ancestor, but `transform`/`filter`/
  `perspective`/`will-change: transform`/`contain` too, several of which
  this library's own animated components use for their effects. Left
  un-portalled, a `<ContextMenu>` nested inside one would measure this
  span's rect relative to that ancestor instead of the viewport, and the
  panel would open away from the actual right-click — self-consistent
  (`anchorPosition` faithfully measures whatever rect the span reports) but
  silently wrong.
- `ContextMenuContent` carries no `focusTrap`/`lockScroll`, same as
  `DropdownMenuContent` — not modal, the rest of the page stays reachable.
- `{#if root.open}` gates the panel's entire DOM existence, same reasoning
  as `DropdownMenuContent` — the shared motion (one bidirectional
  `transition:anchored`, from `_internals/motion/anchored.js`) is layered
  on top, not load-bearing for whether the panel exists at all. The one
  thing the exit changes is _when_ the panel leaves: `root.open` still
  flips at the dismiss instant, but the node stays mounted (and `inert`)
  until the fade finishes.
- Item font-size lives on `ContextMenuContent` (`text-[12px]`, this
  family's own density), not on the shared item components — see
  `dropdown-menu/README.md`'s Implementation notes for the full reasoning,
  including why a nested `ContextMenuSubContent` needs
  `MenuContext.itemTextClass` rather than plain CSS inheritance to pick up
  the same 12px.
