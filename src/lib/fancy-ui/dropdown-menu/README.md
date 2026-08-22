# DropdownMenu

A menu of actions or options that opens from a trigger button — the
conventional "kebab menu" / actions-menu pattern. Built on the real-DOM-focus
menu core (`_internals/menu.svelte.ts`), not the `aria-activedescendant`
model this library's own `Select`/`CommandMenu` use, because a `role="menu"`
surface is expected to move actual focus onto each item as you navigate —
that is the WAI-ARIA menu pattern, and what assistive technology expects
when it meets one.

## Components

- `DropdownMenu` — the root: owns `open` state and positioning options,
  provides context, renders nothing of its own
- `DropdownMenuTrigger` — the real `<button>` that opens/closes the menu
- `DropdownMenuContent` — the portalled, positioned, dismissable panel
  (`role="menu"`)
- `DropdownMenuItem` — a selectable row (`role="menuitem"`)
- `DropdownMenuSeparator` — a visual/semantic divider (`role="separator"`)
- `DropdownMenuLabel` — a non-interactive group heading
- `DropdownMenuSub` / `DropdownMenuSubTrigger` / `DropdownMenuSubContent` —
  a submenu that opens off one of the content's own rows

## Usage

```svelte
<script>
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
	} from "fancy-ui-svelte";
</script>

<DropdownMenu>
	<DropdownMenuTrigger>Options</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem shortcut="⌘R" onSelect={() => rename()}>Rename</DropdownMenuItem>
		<DropdownMenuItem shortcut="⌘D" onSelect={() => duplicate()}>Duplicate</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem variant="destructive" onSelect={() => remove()}>Delete</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
```

`open` is bindable, or drive it yourself with `onOpenChange` — a plain,
non-bound `open` plus that callback works too, the same three ways every
bindable prop in this library does:

```svelte
<DropdownMenu bind:open={menuOpen}>...</DropdownMenu>

<DropdownMenu onOpenChange={(open) => console.log("menu is now", open)}>...</DropdownMenu>

<DropdownMenu open={menuOpen} onOpenChange={(v) => (menuOpen = v)}>...</DropdownMenu>
```

### Submenus

```svelte
<DropdownMenuContent>
	<DropdownMenuItem onSelect={() => rename()}>Rename</DropdownMenuItem>
	<DropdownMenuSub>
		<DropdownMenuSubTrigger>More tools</DropdownMenuSubTrigger>
		<DropdownMenuSubContent>
			<DropdownMenuItem onSelect={() => screenshot()}>Screenshot</DropdownMenuItem>
			<DropdownMenuItem onSelect={() => inspect()}>Inspect</DropdownMenuItem>
		</DropdownMenuSubContent>
	</DropdownMenuSub>
</DropdownMenuContent>
```

Nesting works to any depth — a `DropdownMenuSub` inside a
`DropdownMenuSubContent` behaves the same as one at the top level; each
level gets its own menu-focus core and its own submenu-exclusivity, and
selecting an item at any depth closes the whole tree.

## Shared implementation (see `context-menu/README.md` too)

`ContextMenu` needs the exact same item/separator/label/submenu behaviour
once its own panel is open — the same keyboard model, the same hover-intent
timers, the same "selecting anything closes the whole tree" rule. Rather
than keep two copies in sync, that behaviour is implemented once, here, and
`context-menu` re-exports it under its own names:

- `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`,
  `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` —
  re-exported by `context-menu/index.ts` as `ContextMenuItem`,
  `ContextMenuSeparator`, `ContextMenuLabel`, `ContextMenuSub`,
  `ContextMenuSubTrigger`, `ContextMenuSubContent`. Same components, same
  files, imported across the folder boundary — not a second copy.
- `MenuContext`/`MENU_KEY` and `SubContext`/`SUB_KEY` (`types.ts`) — the
  context contract those components read. `context-menu/types.ts` imports
  and re-exports both rather than redeclaring them, so a `DropdownMenuItem`
  and a `ContextMenuItem` can sit under either family's content without
  either one needing to know which one it's in.
- `handleMenuContentKeydown` and `createOpenSubRegistry` (`menu-shared.ts`)
  — the ArrowUp/Down/Home/End/typeahead/Tab wiring a content panel needs,
  and the "only one submenu open per level" registry. Both
  `DropdownMenuContent` and `context-menu/ContextMenuContent` call these
  directly; `DropdownMenuSubContent` (shared, see above) calls them too.

What genuinely differs, and is **not** shared: the root (`DropdownMenu` owns
an anchor-relative `side`/`align`/`offset` against a real trigger element;
`ContextMenu` owns pointer coordinates and a virtual anchor), the trigger
(a real `<button>` with `aria-haspopup`, vs. a wrapped region listening for
`contextmenu`), and `*Content`'s own anchoring (`anchorPosition` against
`triggerRef` vs. against a zero-size point). See `context-menu/README.md`
for that side of the split.

## Accessibility

- Trigger: `aria-haspopup="menu"`, `aria-expanded` mirrors `open`,
  `aria-controls` present only while the content exists in the DOM (it
  doesn't mount until `open`, so a dangling reference for the entire closed
  lifetime — the bug this already cost one earlier wave — isn't possible
  here either).
- Content: `role="menu"`, `aria-labelledby` the trigger's own id. Not modal:
  no `focusTrap`, no `lockScroll` — the rest of the page stays reachable
  while the menu is open, an outside click just closes it first.
- Keyboard, on the trigger: Enter/Space/ArrowDown open and focus the first
  item; ArrowUp opens and focuses the last. Inside the content:
  ArrowDown/ArrowUp move (wrapping unless `loop={false}`), Home/End jump,
  and typeahead matches by each item's own text, all delegated to
  `_internals/menu.svelte.ts` — none of it reimplemented here.
- Escape closes the menu and returns focus to the trigger. Not modal, so
  this isn't `focusTrap`'s job (that primitive is reserved for modal
  surfaces) — `DropdownMenu` does it itself, in the one place `open`
  changes. An outside click goes through the exact same code path (both
  triggers land on the same `dismissable` `onDismiss` callback — a second,
  separate Escape listener is exactly what an earlier wave in this campaign
  had to remove), so it also returns focus to the trigger by default; in a
  real browser, clicking a genuinely focusable element right afterward
  simply re-focuses it a moment later via that click's own default action,
  so this doesn't fight a deliberate click elsewhere.
- **Removing the trigger from the DOM while its menu is open is
  unsupported, not silently handled.** Closing checks `triggerRef?.isConnected`
  before calling `.focus()` (the same idiom `_internals/focus-trap.ts` uses
  for its own fallback chain), so a vanished trigger doesn't throw — but
  there is no fallback target beyond that. Unlike a modal, a menu has
  nothing defensible to fall back to: `focus-trap.ts` can hand focus to a
  documented `fallbackFocus`, or last-resort `document.body`, because a
  modal's whole point is containing focus somewhere; a menu has no such
  container to contain it to, and inventing one (guessing at a nearby
  element) would move focus somewhere arbitrary rather than somewhere
  correct. Focus ends up wherever the browser puts it once the active
  element disappears — typically `<body>`. If your app removes a
  `DropdownMenuTrigger` while its own menu is open (a page transition, a
  list row being deleted out from under an open row menu), close the menu
  first.
- Tab closes the menu but is never `preventDefault`ed and never forces
  focus anywhere — the browser's own Tab traversal continues from wherever
  real DOM focus was left, rather than being cycled back into a trap. (jsdom
  does not implement default Tab-driven focus movement at all, so the test
  suite can only prove the menu closes and that this path — unlike
  Escape's — does not force focus onto the trigger; it cannot prove where a
  real browser lands afterward.)
- `DropdownMenuItem`: `role="menuitem"`, `tabindex="-1"`, a real `<button>`
  underneath (both `aria-disabled="true"` and native `disabled` are set
  together when `disabled` — the menu-focus core checks for either — and
  the click handler guards `disabled` again itself, since a synthetic click
  walks straight past a native `disabled` attribute regardless). A
  `shortcut` renders as a `<kbd aria-hidden="true">`: real DOM text (so it
  can be styled and is present for sighted users), marked `aria-hidden`
  because raw symbol glyphs like "⌘R" don't announce usefully as speech —
  the item's own label text already carries its meaningful accessible name.
- `DropdownMenuSeparator`: `role="separator"`, never registered with the
  menu-focus core, never focusable. `DropdownMenuLabel`: real (audible)
  text, not a menuitem, not focusable, not registered.
- `DropdownMenuSubTrigger`: `aria-haspopup="menu"`, `aria-expanded` mirrors
  its own submenu, `aria-controls` present only while it's open. It is
  _also_ a normal item in its parent's own navigation order (registered
  with the parent's menu-focus core), so arrow keys and typeahead reach it
  the same way any other row does. Opens on click, on ArrowRight, or after
  a short hover-intent delay; ArrowLeft (from inside the open submenu)
  closes it and returns focus to this row. ArrowRight/ArrowLeft keep that
  fixed meaning even after a flip moves the submenu to the caller's left —
  see `SubContext.resolvedSide`'s own doc comment in `types.ts`. Only the
  caret glyph (`›`/`‹`, `aria-hidden`) mirrors the actual side.

### On real-DOM-focus hover, and why nothing here fights it

`_internals/menu.svelte.ts`'s header comment explains why this whole family
moves real focus rather than `aria-activedescendant`: it's what a
`role="menu"` is expected to do. One consequence, worth stating explicitly
because a near-identical-looking case in this codebase does the _opposite_:
`DropdownMenuItem`'s `onmouseenter` calls `focus.focusItem(el)`, deliberately
moving real DOM focus on hover. `SelectPanel`'s own rows do the reverse (they
cancel the mousedown default action that would steal focus off the
`combobox` trigger) — because `Select` keeps focus on its trigger permanently
and only ever _points_ at the active row with `aria-activedescendant`. Menu
items have no separate "active" indicator to fall back on; the focused
element _is_ the highlight, so keeping a mouse user's hover and a keyboard
user's arrow-key position in sync requires exactly the opposite of Select's
trick. Nothing here needs a mousedown guard for that reason — but see the
next paragraph for where one _is_ implied and left untested.

**What jsdom cannot prove**: it does not implement focus-follows-mousedown
as a real browser default action (any element carrying a `tabindex`
attribute — including `-1` — normally receives focus on mousedown, whether
or not application code calls `.focus()`). Every item and sub-trigger in
this family already carries `tabindex="-1"` for the reasons above, so real
browsers will focus a hovered-then-mousedown'd item slightly before its own
`click` fires regardless of `onmouseenter` — consistent with, not a
workaround for, the intended behaviour, but not something this test suite's
jsdom environment can independently verify happened as a _browser default
action_ rather than only via the explicit `onmouseenter` handler.

## Props

### DropdownMenu

| Prop           | Type                                     | Default    | Description                                                            |
| -------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `open`         | `boolean`                                | `false`    | Whether the menu is open. Bindable                                     |
| `onOpenChange` | `(open: boolean) => void`                | —          | Called whenever the menu opens or closes, however it happened          |
| `side`         | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Side of the trigger to place the menu on. Flips when it would overflow |
| `align`        | `"start" \| "center" \| "end"`           | `"start"`  | Alignment along the trigger's cross axis                               |
| `offset`       | `number`                                 | `4`        | Gap in pixels between the trigger and the menu                         |
| `loop`         | `boolean`                                | `true`     | Whether arrow-key navigation wraps at the ends                         |
| `children`     | `Snippet`                                | —          | The `DropdownMenuTrigger` and `DropdownMenuContent`                    |
| `sound`        | `boolean`                                | `false`    | Plays `open`/`close`/`select` cues — see [Sound](#sound) below         |

### DropdownMenuTrigger

| Prop       | Type                        | Default | Description                              |
| ---------- | --------------------------- | ------- | ---------------------------------------- |
| `disabled` | `boolean`                   | `false` | Disables the trigger                     |
| `children` | `Snippet`                   | —       | The trigger's content                    |
| `class`    | `string`                    | —       | Additional CSS classes                   |
| `ref`      | `HTMLButtonElement \| null` | `null`  | Bindable reference to the trigger button |

### DropdownMenuContent

| Prop       | Type                     | Default | Description                                                                                   |
| ---------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `children` | `Snippet`                | —       | The `DropdownMenuItem`/`DropdownMenuSeparator`/`DropdownMenuLabel`/`DropdownMenuSub` children |
| `class`    | `string`                 | —       | Additional CSS classes, merged onto the panel                                                 |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable reference to the panel element                                                       |

### DropdownMenuItem

| Prop            | Type                         | Default     | Description                                                    |
| --------------- | ---------------------------- | ----------- | -------------------------------------------------------------- |
| `onSelect`      | `() => void`                 | —           | Called when the item is selected                               |
| `disabled`      | `boolean`                    | `false`     | Skipped by keyboard navigation and typeahead, inert to click   |
| `variant`       | `"default" \| "destructive"` | `"default"` | `"destructive"` renders in the destructive color               |
| `shortcut`      | `string`                     | —           | Display-only keyboard shortcut, rendered as a trailing `<kbd>` |
| `closeOnSelect` | `boolean`                    | `true`      | Whether selecting the item closes the whole menu               |
| `icon`          | `Snippet`                    | —           | Leading icon                                                   |
| `children`      | `Snippet`                    | —           | The item's label                                               |
| `class`         | `string`                     | —           | Additional CSS classes                                         |

### DropdownMenuSeparator / DropdownMenuLabel

Both take `class?: string`; `DropdownMenuLabel` also takes `children?: Snippet` for its text.

### DropdownMenuSub

| Prop       | Type      | Default | Description                                               |
| ---------- | --------- | ------- | --------------------------------------------------------- |
| `children` | `Snippet` | —       | The `DropdownMenuSubTrigger` and `DropdownMenuSubContent` |

### DropdownMenuSubTrigger

| Prop       | Type      | Default | Description                                                        |
| ---------- | --------- | ------- | ------------------------------------------------------------------ |
| `disabled` | `boolean` | `false` | Skipped by keyboard navigation and typeahead, inert to click/hover |
| `icon`     | `Snippet` | —       | Leading icon                                                       |
| `children` | `Snippet` | —       | The row's label                                                    |
| `class`    | `string`  | —       | Additional CSS classes                                             |

### DropdownMenuSubContent

Same shape as `DropdownMenuContent` (`children`, `class`, `ref`).

## Sound

Set `sound` on the root to opt into interface cues, off by default and
silent until the user has enabled sound in their own preferences:

```svelte
<DropdownMenu sound>
	<DropdownMenuTrigger>Options</DropdownMenuTrigger>
	<DropdownMenuContent>...</DropdownMenuContent>
</DropdownMenu>
```

`open`/`close` play when the trigger opens/closes the menu — by click,
keyboard, Escape, or an outside click. Selecting an item plays `select`
instead of `close`, never both: the item's own click handler plays `select`
first, then closes the menu silently (`{ silent: true }`), so one activation
is always exactly one cue. A submenu inherits the root's `sound` setting and
sounds like the panel it is: opening it plays `open`, closing it yourself
(ArrowLeft, Escape, the pointer leaving) plays `close`. Closes driven by the
parent stay silent — a selection several levels deep still plays a single
`select` while the whole tree closes in one hop, and a sibling submenu
opening closes this one without a cue of its own. `ContextMenu` has no `sound`
prop of its own yet; its shared items simply read `ctx.sound` as `undefined`
and stay silent.

## Theming

Declared once, on `DropdownMenuTrigger`'s own root — the one element in
this family with a focus-visible ring — and read nowhere else in this
folder:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

Override it by setting `--ft-accent` on an ancestor (never `--ft-nav-accent`
itself unless you mean to bypass that fallback chain — this component never
redeclares `--ft-accent` itself, so a consumer's own value on an ancestor
element is always respected):

```css
.my-app {
	--ft-accent: oklch(0.55 0.2 300);
}
```

**Why this is declared only on the trigger, not also on `DropdownMenuContent`/
`DropdownMenuSubContent`**: `use:portal` moves those panels to
`document.body`, so they are no longer DOM descendants of anything this
library rendered and inherit no custom property from an ancestor inside the
page — only one set at or above `body` itself. A property declared on a
component root that then gets portalled away would need to be redeclared on
the portalled element too, the way `TimePickerPanel`/`Autocomplete` do for
their own accent. This family never reads `--ft-nav-accent` inside a
portalled panel in the first place — the destructive variant below uses the
semantic `text-destructive` token instead, precisely so a portalled item's
color doesn't depend on a custom property that can't reach it — so there is
nothing to redeclare there. If you extend this family to read the accent
inside `DropdownMenuContent`, `DropdownMenuSubContent` or their `ContextMenu`
equivalents, declare `--ft-nav-accent` with the full fallback formula on that
element too; do not assume it inherits from the trigger.

Everything else uses semantic tokens a consumer's theme is already expected
to define: `bg-popover`/`text-popover-foreground`/`border-border` for the
panel, `bg-accent`/`text-accent-foreground` for the hovered/focused row,
`text-destructive` for the destructive variant, `text-muted-foreground` for
shortcuts/carets/group labels.

## Motion

The panel enters with a 150 ms opacity + scale rise (`DURATIONS.fast` and
`JS_EASINGS.out`, the shared rung every floating surface in the library is
on), growing from a `0.92` floor. The growth origin follows the side the panel
was actually placed on — flipped placements included — so it always appears to
come out of the trigger rather than out of its own centre. Exposed as
`data-side` / `data-align` for consumers that want to key their own styling
off the resolved placement.

The entrance is a Svelte transition rather than a keyframe, so there is no
`--ft-*` variable on the panel to retime it; reduced motion is the one switch.

- A submenu grows from the edge nearest the row that opened it, and that edge
  and the row's caret glyph read the one same `SubContext.resolvedSide`
  value: a submenu that flips to the left of its trigger turns the caret and
  moves the origin in the same update, never one without the other.
- Only `opacity` and `transform` animate, and only on the panel itself.
- **Focus is never animated.** Roving focus lands on the first (or last) item
  in the same tick the panel mounts, entrance running or not, so keyboard
  navigation is never waiting on a rise to finish.
- **Reduced motion** — no entrance animation at all; the panel simply appears.
  Visibility never depended on the animation: `{#if root.open}` /
  `{#if sub.open}` own the panel's DOM existence, and the entrance is layered
  on top of that.
- **Touch and coarse pointers** — unchanged; the entrance is not
  pointer-gated.
- Closing is instant.

## Implementation notes

- `computePosition`/the `anchorPosition` action (`_internals/anchor-position.js`)
  own all the flip-and-clamp maths; `DropdownMenuContent` only supplies the
  anchor element and the requested `side`/`align`/`offset`.
  `DropdownMenuSubContent` anchors to its own trigger with a fixed
  `side: "right"`, and reports a flip through `onPlacement` — new this wave
  — to `SubContext.resolvedSide`, which only `SubTrigger`'s caret glyph
  reads; the ArrowRight/ArrowLeft key mapping itself never changes meaning.
- `DropdownMenuContent`/`DropdownMenuSubContent` are portalled
  (`_internals/portal.js`) so they escape any ancestor `overflow: hidden` or
  stacking context the trigger happens to sit inside — same
  portal-before-dismissable-and-position ordering convention as
  `PopoverContent`/`SelectPanel`, even though nothing here calls `.focus()`
  on mount the way `focusTrap` does, so the ordering isn't load-bearing the
  same way; it's kept uniform anyway.
- `DropdownMenuSub`'s hover-intent timers (open: 150ms, close: 200ms) exist
  so a pointer travelling from the trigger row into its own submenu — which
  necessarily crosses empty space for an instant — doesn't flicker the
  submenu shut before it arrives, and so a pointer merely passing over a
  submenu trigger on its way elsewhere doesn't pop it open. `keepOpen()`
  (mouseenter on either the trigger or the content) cancels a pending close;
  `scheduleClose()` (mouseleave on either) starts one.
- A selection anywhere in a nested submenu closes the _entire_ tree in one
  hop, not level by level: every `MenuContext.closeAll` — root or any
  `SubContent`'s own — ultimately delegates to the root `DropdownMenu`'s own
  `close()`, and closing the root unmounts the whole subtree (every nested
  `DropdownMenuSub`/`DropdownMenuSubContent` goes with it), so there is
  nothing left for an intermediate level to close by hand.
- Only one submenu is ever open per level: opening one calls
  `closeSiblingSubs` against that level's own registry
  (`menu-shared.ts`'s `createOpenSubRegistry`) before it opens itself — the
  same exclusivity a native menu bar gives for free.
- `DropdownMenuItem` and `DropdownMenuSubTrigger` set no `data-typeahead-label`
  of their own — `_internals/menu.svelte.ts`'s typeahead already matches an
  item's _visible_ text, walking every text node except those inside an
  `aria-hidden="true"` subtree, and both components already put their icon,
  their shortcut/caret, and nothing else, behind `aria-hidden`. A row shaped
  like the mockup's ("✎ Rename ⌘R") types ahead correctly on "r" from that
  convention alone. `data-typeahead-label` is a real, supported attribute on
  the core — it's the right escape hatch for a consumer hand-building menu
  items who hasn't marked their own icons `aria-hidden`, or who wants
  typeahead to match different text than what's rendered — but it's a
  second, settable source of truth in front of a live computation, and
  computing it once at mount would go stale the moment a label changes
  without the item remounting (a count in the text, a toggled "Show/Hide"
  word). Since these two components already satisfy the convention the
  fallback relies on, they don't set it.
- `{#if root.open}`/`{#if sub.open}` gate every panel's entire DOM
  existence, not just its visual appearance — the shared entrance
  (`_internals/motion/anchored.js`, applied as an `in:` transition) is
  layered on top of that, so a panel that would only ever _appear_ via a
  transition still exists (and is reachable) under reduced motion; it just
  doesn't animate in. `in:` rather than `transition:` is deliberate too: an
  intro never delays unmount, so closing stays synchronous.
- `{#each}` blocks in this family's own examples key on each item's own
  identity (a label, a value), never a positional index — a reordering or a
  duplicate-looking label stays correct.
- **Item font-size lives on the panel, not the item.** The mockup specifies
  two distinct densities — 13px rows here, 12px under `ContextMenu` — and
  `DropdownMenuItem`/`DropdownMenuSubTrigger` (shared by both families) pin
  no size of their own; `font-size` inherits, so a top-level item picks it
  up from `DropdownMenuContent`'s own `text-[13px]` for free. A
  `DropdownMenuSubContent` can't rely on that same inheritance for its own
  items, though: it's portalled independently of the root panel, so once
  both are open they're DOM _siblings_ under `document.body`, not
  ancestor/descendant. `MenuContext.itemTextClass` (`types.ts`) exists to
  cross that specific gap — each root `*Content` sets it once
  (`"text-[13px]"` or `"text-[12px]"`), and every `*SubContent` reads its
  parent's value and forwards it unchanged to its own children, so density
  stays correct through arbitrarily deep nesting without either family
  duplicating the other's markup or adding a variant prop.
