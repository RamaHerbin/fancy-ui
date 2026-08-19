# CommandMenu

A modal search palette: a single search field over a flat vocabulary of `items`, filtered as you type, with grouped results, match highlighting, and full keyboard navigation through `aria-activedescendant` — focus never leaves the field. Portals to `document.body`, traps focus, dismisses on Escape and outside click, and locks the page's own scroll while open, the same plumbing `Dialog` uses.

Data-driven rather than a compound: filtering is a decision about the whole `items` array at once, so there is one component to hand a list to, not a tree of subcomponents each re-deriving the same filter.

## Usage

```svelte
<script lang="ts">
	import { CommandMenu, type CommandItem } from "fancy-ui-svelte";

	let open = $state(false);

	const items: CommandItem[] = [
		{ id: "button", label: "Button", group: "Core", meta: "Actions" },
		{ id: "icon-button", label: "Icon Button", group: "Core", meta: "Actions" },
		{ id: "rainbow-button", label: "Rainbow Button", group: "Fancy", meta: "Buttons" },
		{ id: "settings", label: "Settings" },
	];

	function handleSelect(item: CommandItem) {
		console.log("navigate to", item.id);
	}
</script>

<button onclick={() => (open = true)}>Open command menu</button>

<CommandMenu bind:open {items} onSelect={handleSelect} />
```

There is no built-in trigger or global keyboard shortcut — `open` is the whole interface. Wire a `keydown` listener yourself (⌘K, Ctrl+K, whatever suits the app) and flip `open`:

```svelte
<script lang="ts">
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			open = !open;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />
```

### Grouped items

Items with the same `group` string render under one uppercase heading, in the order that group name first appears in `items`. Items with no `group` at all render first, ungrouped:

```svelte
<CommandMenu
	{open}
	items={[
		{ id: "search", label: "Search everything" },
		{ id: "new-doc", label: "New document", group: "Create" },
		{ id: "new-folder", label: "New folder", group: "Create" },
		{ id: "profile", label: "Go to profile", group: "Navigate" },
	]}
/>
```

### Matching on more than the label

`keywords` extends what the default filter matches against, without ever being shown:

```svelte
<CommandMenu
	{open}
	items={[{ id: "billing", label: "Billing", keywords: ["invoice", "plan", "payment"] }]}
/>
```

### A custom filter

Replaces the default entirely — `keywords` is then only meaningful if your own `filter` reads it:

```svelte
<CommandMenu
	{open}
	{items}
	filter={(item, query) => item.label.toLowerCase().startsWith(query.toLowerCase())}
/>
```

## Props

| Prop            | Type                                            | Default          | Description                                                                       |
| --------------- | ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `open`          | `boolean`                                       | `false`          | Whether the menu is open. Bindable.                                               |
| `onOpenChange`  | `(open: boolean) => void`                       | —                | Fires whenever `open` changes — Escape, an outside click, or committing an item.  |
| `items`         | `CommandItem[]`                                 | —                | The full, unfiltered vocabulary. Required.                                        |
| `query`         | `string`                                        | `""`             | The current search text. Bindable. Reset every time the menu reopens — see below. |
| `onQueryChange` | `(query: string) => void`                       | —                | Fires whenever `query` changes.                                                   |
| `onSelect`      | `(item: CommandItem) => void`                   | —                | Called with the committed item, after that item's own `onSelect`.                 |
| `placeholder`   | `string`                                        | `"Search..."`    | Placeholder for the search field.                                                 |
| `emptyMessage`  | `string`                                        | `"No results"`   | Shown in place of the list when nothing matches.                                  |
| `label`         | `string`                                        | `"Command menu"` | Accessible name — for the dialog and for the search field. See Accessibility.     |
| `filter`        | `(item: CommandItem, query: string) => boolean` | see below        | Overrides the default filter entirely.                                            |
| `class`         | `string`                                        | —                | Additional CSS classes for the panel.                                             |
| `ref`           | `HTMLDivElement \| null`                        | `null`           | Bindable reference to the panel element.                                          |
| `icon`          | `Snippet<[CommandItem]>`                        | —                | Rendered before each row's label, given that row's item. Treated as decorative.   |
| `empty`         | `Snippet`                                       | —                | Rendered in place of the list when nothing matches, instead of `emptyMessage`.    |

`CommandItem` is:

```ts
interface CommandItem {
	id: string;
	label: string;
	/** Optional right-aligned secondary text — the category column in the mockup. */
	meta?: string;
	/** Optional group heading this item sits under. Items with no group render first, ungrouped. */
	group?: string;
	/** Extra terms the default filter matches against, alongside `label`. Never shown. */
	keywords?: string[];
	disabled?: boolean;
	/** Called when this item is committed, before the component's own `onSelect`. */
	onSelect?: () => void;
}
```

The default filter is case- and **diacritic**-insensitive: it folds both the query and `label`/`keywords` through `normalize("NFD")` plus a combining-marks strip before comparing, so `"cafe"` matches an item labelled `"Café"`.

## Accessibility

- `role="dialog"` with `aria-modal="true"` and `aria-label={label}` (default `"Command menu"`). Focus moves into the search field on open and returns to whatever had focus before it opened, on close — Tab is trapped inside the panel.
- The search field is `role="combobox"` with `aria-expanded="true"` (the result list is always visible while the dialog is open, so this never toggles), `aria-controls` pointing at the list, and `aria-activedescendant` pointing at the active `role="option"` row. The list is `role="listbox"`. **Focus never leaves the field** — arrow keys, Home, End and Enter all act on the highlighted row without moving real DOM focus onto it; rows carry `tabindex="-1"` and are not reachable by Tab.
- The search field's accessible name is the same `label` prop as the dialog's, reused rather than introducing a second, undocumented prop for it — there is no visible `<label>` element in this layout for a `<label for>` to attach to instead.
- The matched substring inside each row's label is a real `<mark>` element (never `{@html}`) — the canonical element for "a run of text highlighted for its relevance to a search," per its HTML definition. It is deliberately **not** `aria-hidden`: hiding it would remove exactly the text it wraps from the row's accessible name, and it is real content, not decoration. A minority of screen readers additionally announce entering/leaving a `<mark>` region; that extra signal is treated as useful (it says _why_ a row matched), not suppressed.
- **Group headings are decorative**, `role="presentation"`, not associated with their rows through `aria-labelledby` or a nested `role="group"`. This mirrors `Combobox`/`Select`'s own flat-listbox pattern in this library, and is a deliberate, documented trade-off: cross-screen-reader support for grouped options inside a flat `listbox`/`option` pattern is inconsistent, so a plain visual heading over an otherwise-flat option list is the more reliably accessible choice. Each row's own text (including `meta`) is still read in full regardless of grouping.
- `icon` is rendered inside an `aria-hidden="true"` wrapper — it is assumed decorative. If your icon carries meaning nothing else on the row conveys, put that meaning in `label` (or `keywords`) too.
- Result-count changes are announced through a polite, always-mounted `role="status"` live region that reports **only the count** ("3 results"), never the row contents. A nonzero count waits for the query to sit still for 300ms before announcing, not after every keystroke — announcing on every character would turn fast typing into a screen reader narrating a number many times a second. A drop to **zero** is the one exception: it announces immediately, because the empty state is already visible on screen at that instant, and a debounced zero would leave the region reporting a stale nonzero count while the list a screen reader user cannot see already reads empty. See Implementation Notes for the exact mechanism. The region clears immediately (not debounced) the instant the menu closes.
- A disabled item (`disabled: true`) is skipped as part of a block by arrow/Home/End navigation — it can never become the active row — and a click or Enter on it does nothing. The native `disabled` attribute on its `<button>` is not trusted alone as the guard (a synthetic click can walk past it), so `commitItem` checks `item.disabled` explicitly too.

## Theming

| Custom property   | Read by                             | Fallback                                                                                |
| ----------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| `--ft-nav-accent` | The `<mark>` highlight's text color | `var(--ft-accent, light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75)))` |

`--ft-nav-accent` is declared exactly once, with the fallback above, on the **portalled panel element itself** — the same `<div>` that carries `use:portal` — and read below that declaration on the same element. `--ft-accent` itself is never redeclared here — only read through the fallback — so a value a consumer sets higher up the tree is never shadowed.

That "portalled" part is not incidental, and it changes where a consumer is allowed to set `--ft-accent`. `use:portal` moves the panel to `document.body` before it ever paints, so at render time it is no longer a DOM descendant of wherever `<CommandMenu>` was written in your markup — it inherits nothing from that spot, custom properties included. A wrapper placed around the `<CommandMenu>` element itself therefore does **nothing**:

```svelte
<!-- Has no effect: the dialog is not a descendant of this div by the time it renders. -->
<div style="--ft-accent: oklch(0.6 0.2 290)">
	<CommandMenu {open} {items} />
</div>
```

`--ft-accent` has to be set at or above `document.body` — typically `:root` in your global stylesheet — to reach a portalled surface:

```css
:root {
	--ft-accent: oklch(0.6 0.2 290);
}
```

The failure mode if you get this wrong is quiet, not loud: `color` (what `--ft-nav-accent` feeds the `<mark>` highlight through) is an inherited property, so an unresolved `var(--ft-nav-accent)` does not fall back to some default color or produce a visible error — it computes to whatever color the surrounding text already has, which is the panel's own foreground text color. The highlight looks like it vanished; nothing in the console says why. If a retint you set on a wrapper isn't reaching the palette, that wrapper is the first thing to check.

Everything else — the panel (`bg-popover`/`text-popover-foreground`/`border-border`), the active row (`bg-accent`/`text-accent-foreground`), muted text (`text-muted-foreground`) — reads the app's own semantic tokens, with no component-local overrides.

## Implementation Notes

- **The query and active row reset on every reopen — except the very first mount.** A caller that mounts the menu already `open` with a prefilled `query` is seeding it on purpose, and that first paint is honored as-is. Every transition into `open = true` _after_ that first one resets `query` to `""` and re-activates the first row — a stale query or highlight surviving from the session before is a bug the caller has no way to work around, so it is not left as a possibility. If you need a menu that always starts pre-filtered, pass `query` as a plain (non-bound) prop rather than `bind:query` — the reopening behavior does not touch it if nothing ever writes it back.
- **That reset effect has to run its whole body inside `untrack(...)`, and this is not optional.** Its only intended dependency is `open`. But it also calls `listbox.moveToEdge("first")`, which reads `query` transitively through the `count`/`enabled` callbacks passed to `createListbox` — Svelte's dependency tracking follows a read through any function call made during an effect's synchronous execution, not just the names written directly inside the `$effect(...)` block. Without `untrack`, that transitive read makes `query` a real dependency of this effect, and the very next line writes `query` — an effect reading and writing the same state, which Svelte throws `effect_update_depth_exceeded` for the moment anything (a keystroke) writes `query` again from outside. Reproducible in one line: render the menu open, type one character, watch it throw.
- **The listbox's index space is display order, not `items`' own filtered order.** `computeDisplayItems` reorders the filtered items into ungrouped-first-then-grouped before anything else touches them, and that reordered array — not `items.filter(...)`'s own order — is what `optionId`, `aria-activedescendant`, and the listbox core's `count`/`enabled` all index into. Skipping this step (indexing by `items`' own order while rendering in display order) desyncs "first"/"next" from what is visually first/next the moment an ungrouped item doesn't already sit at the front of `items`.
- **`announcedCount` starts at `null`, not `0`.** The debounce means there is a real window, right after opening or after a keystroke, where nothing has been announced yet — and the live region has to stay silent through it, not say "0 results" for up to 300ms while a non-empty list is still being counted. `resultsMessage` folds `null` to `""` before the "1 result"/"N results" branching.
- **A drop to zero bypasses the debounce and announces synchronously; every nonzero count still waits.** The two paths are deliberately asymmetric, not an oversight: emptiness is the one state where lagging behind the visible screen actively misleads (the region would report results the list has already stopped showing), while a nonzero count is never a contradiction of what's on screen, only a preview of it, so it keeps the debounce that protects against narrating every keystroke.
- **Highlighting locates the match in the _original_ label, not the folded one, and that translation has to be counted in the same units the string search uses.** Folding for diacritic-insensitive search (`normalize("NFD")` plus a combining-marks strip) changes string length before the marks are stripped back off, so the position a match is found at inside the folded string is not automatically a safe index into the real label. `match.ts`'s `getMatchRange` builds an explicit offset map while folding and translates the found range back through it — proven against a label like `"Café Society"`, where searching the unaccented query `"afe soc"` must highlight the real `"afé Soc"`, not an off-by-one span. The map is built **per UTF-16 code unit**, not per codepoint: an astral character (outside the Basic Multilingual Plane — an emoji, say) is a single codepoint but two code units, the same width `String.prototype.indexOf` — what actually locates the match — counts in. A map built one entry per codepoint falls one entry short of `folded` for every astral character, and a lookup past its end reads `undefined`; `getMatchRange` guards that and returns `null` rather than a range with an `undefined` bound, since `label.slice(undefined, …)` silently coerces to `slice(0, …)` and would render the whole label twice instead of throwing where the bug could be seen.
- **Highlighting and filtering are independent, by construction.** `getMatchRange` always searches for a literal, folded substring of `label` on its own, regardless of what logic actually selected the item — so when a custom `filter` matches for an unrelated reason (a `keywords` hit, fuzzy logic), and there is no literal substring of `label` to point at, the row renders its label plain rather than fabricating a highlight the match had nothing to do with.
- **The debounced announcement is an `$effect` plus its own cleanup, not a hand-rolled timer variable.** Every time the filtered count (or `open`) changes, the effect reschedules a 300ms timer and Svelte runs the _previous_ run's cleanup — which clears that pending timer — before the new one starts. A burst of keystrokes keeps pushing the announcement out rather than stacking several up, and whatever count is in scope when a timer finally fires uninterrupted is the one that gets announced.
- **`row?.scrollIntoView?.(...)` is guarded on the method itself, not just the element**, because `Element.prototype.scrollIntoView` is not implemented in jsdom — calling it unconditionally would throw in every test that arrows through the list, even though real browsers implement it fine. The active row is looked up by id under the panel's own list element (`listRef.querySelector(...)`), the same pattern `Select.svelte`'s `handleActiveChange` uses.
- **Filtering functions are called fresh, not read from the memoized `filteredItems`, everywhere a write to `query` might have just happened in the same pass** (`handleInput`, the listbox's own `count`/`enabled` callbacks, the reopen-reset effect) — reading a `$derived` in the same synchronous call that just wrote its own dependency risks seeing the pre-write value. This is the same discipline `combobox/Combobox.svelte` documents for its own `computeFilteredOptions`.
