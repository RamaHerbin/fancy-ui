<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { CommandItem } from "./types.js";

	export type { CommandItem };

	export interface CommandMenuProps {
		/** Whether the menu is open. Bindable. */
		open?: boolean;
		/** Fires whenever `open` changes, from Escape, an outside click, or committing an item. */
		onOpenChange?: (open: boolean) => void;
		/** The full, unfiltered vocabulary. */
		items: CommandItem[];
		/** The current search text. Bindable. Reset to `""` every time the menu reopens. */
		query?: string;
		/** Fires whenever `query` changes. */
		onQueryChange?: (query: string) => void;
		/** Called with the committed item — Enter on the active row, or a click. Fires after the item's own `onSelect`. */
		onSelect?: (item: CommandItem) => void;
		/** Placeholder for the search field. */
		placeholder?: string;
		/** Shown in place of the list when nothing matches. */
		emptyMessage?: string;
		/** Accessible name for the dialog (and its search field — see the README). */
		label?: string;
		/** Matches an item against the current query. Default: case- and diacritic-insensitive substring match on `label` plus `keywords`. */
		filter?: (item: CommandItem, query: string) => boolean;
		/** Additional CSS classes for the panel. */
		class?: string;
		/** Bindable reference to the panel element. */
		ref?: HTMLDivElement | null;
		/** Rendered before each row's label, given that row's item. Treated as decorative — see the README. */
		icon?: Snippet<[CommandItem]>;
		/** Rendered in place of the list when nothing matches, instead of `emptyMessage`. */
		empty?: Snippet;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { focusTrap } from "../_internals/focus-trap.js";
	import { dismissable } from "../_internals/dismissable.js";
	import { scrollLock } from "../_internals/scroll-lock.js";
	import { anchored, markSurfaceState } from "../_internals/motion/anchored.js";
	import { DURATIONS } from "../_internals/motion/tokens.js";
	import { createListbox } from "../_internals/listbox.svelte.js";
	import { defaultFilter, getMatchRange } from "./match.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		open = $bindable(false),
		onOpenChange,
		items,
		query = $bindable(""),
		onQueryChange,
		onSelect,
		placeholder = "Search...",
		emptyMessage = "No results",
		label = "Command menu",
		filter,
		class: className,
		ref = $bindable(null),
		icon,
		empty,
		sound = false,
	}: CommandMenuProps = $props();

	// How long the query has to sit still before the live region reports a
	// fresh count — announcing on every keystroke would turn fast typing
	// into a screen reader narrating a number after every character. See
	// the README for the exact contract this settles on.
	const ANNOUNCE_DEBOUNCE_MS = 300;

	// `$props.id()`, not `_internals/id.js`'s `uid()` (which throws outside
	// the browser): row and list ids are needed at SSR render time, and this
	// is the seed every other control in the library uses for that.
	const uid = $props.id();
	const listId = `${uid}-list`;
	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	let inputRef: HTMLInputElement | null = $state(null);
	let listRef: HTMLDivElement | null = $state(null);

	function matches(item: CommandItem, q: string): boolean {
		return filter ? filter(item, q) : defaultFilter(item, q);
	}

	// A plain function, not only the `$derived` below, so it can also be
	// called fresh from `handleInput` in the same pass that just wrote
	// `query` — reading the memoized `filteredItems` there instead would be
	// reading a derived in the same synchronous call that wrote its own
	// dependency, which risks the pre-write list. Same pattern
	// `combobox/Combobox.svelte`'s `computeFilteredOptions` uses.
	function computeFilteredItems(q: string): CommandItem[] {
		return items.filter((item) => matches(item, q));
	}

	const filteredItems = $derived(computeFilteredItems(query));

	// Reorders the already-filtered items into the order they actually
	// render in: every ungrouped item first, then each group's items, in
	// the order that group name was first seen in `items` — never
	// alphabetized, never reordered relative to how the caller listed
	// things within a bucket. This is a *display* order, not `items`'s own
	// order, and it matters beyond rendering: it is also the flat index
	// space `optionId`, `aria-activedescendant`, and the listbox core all
	// share below, so "first" (on open, on Home) and "next" (ArrowDown)
	// mean the row that is visually first/next, not `items[0]`/`items[i+1]`
	// — those two can disagree the moment an ungrouped item sits after a
	// grouped one in `items`' own declaration order.
	function computeDisplayItems(filtered: CommandItem[]): CommandItem[] {
		const ungrouped: CommandItem[] = [];
		const order: string[] = [];
		const byName = new Map<string, CommandItem[]>();
		for (const item of filtered) {
			if (!item.group) {
				ungrouped.push(item);
				continue;
			}
			let bucket = byName.get(item.group);
			if (!bucket) {
				bucket = [];
				byName.set(item.group, bucket);
				order.push(item.group);
			}
			bucket.push(item);
		}
		return [...ungrouped, ...order.flatMap((name) => byName.get(name)!)];
	}

	const displayItems = $derived(computeDisplayItems(filteredItems));

	interface GroupRow {
		item: CommandItem;
		index: number;
	}
	interface ItemGroup {
		name: string | null;
		rows: GroupRow[];
	}

	// `displayItems` is already ungrouped-first-then-grouped, so a single
	// left-to-right pass finds each heading's boundary just by watching
	// `item.group` change — no separate bucketing pass needed here, and
	// each row's `index` is simply its position in `displayItems`, the
	// same index space `optionId`/the listbox core use. A group only
	// exists here if at least one of its items survived filtering, so an
	// empty heading never renders.
	function computeGroups(display: CommandItem[]): ItemGroup[] {
		const groups: ItemGroup[] = [];
		let current: ItemGroup | null = null;
		display.forEach((item, index) => {
			const name = item.group ?? null;
			if (!current || current.name !== name) {
				current = { name, rows: [] };
				groups.push(current);
			}
			current.rows.push({ item, index });
		});
		return groups;
	}

	const groups = $derived(computeGroups(displayItems));

	function handleActiveChange(index: number): void {
		// `Element.prototype.scrollIntoView` does not exist in jsdom —
		// optional-chaining the method itself (not just the element) makes
		// this a silent no-op there instead of a thrown TypeError, while a
		// real browser still scrolls the row into view exactly as intended.
		const row = listRef?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	}

	const listbox = createListbox({
		count: () => computeDisplayItems(computeFilteredItems(query)).length,
		enabled: (i) => !computeDisplayItems(computeFilteredItems(query))[i]?.disabled,
		loop: true,
		onActiveChange: handleActiveChange,
	});

	onDestroy(() => listbox.destroy());

	// Handed over by `focusTrap` the moment the trap arms; called at
	// `outrostart`, which is the dismiss instant on EVERY close path
	// (Escape, an outside click on the scrim, committing a row, a caller's
	// own `bind:open` write). Waiting for the trap's own `destroy()` would
	// leave a keyboard user on `<body>` for the whole length of the fade,
	// because Svelte sets `inert` on this panel the instant the exit starts.
	let returnFocusNow: (() => void) | null = null;

	// The other half of that handover, called at `introstart`. A menu
	// reopened DURING its fade reverses the outro instead of remounting, so
	// `use:focusTrap` is never re-created: without this the panel would come
	// back `aria-modal` and interactive with focus left on whatever was
	// focused before it opened, Tab walking the page rather than the panel,
	// and the eager return already spent for the life of the instance.
	let rearmFocusTrap: (() => void) | null = null;

	function handleIntroStart(event: Event): void {
		markSurfaceState(event, "open");
		rearmFocusTrap?.();
	}

	function handleOutroStart(event: Event): void {
		markSurfaceState(event, "closing");
		returnFocusNow?.();
	}

	// Whatever the very first paint's `query` was is worth keeping — a
	// caller that mounts the menu already open with a prefilled query is
	// seeding it on purpose. Only actual *reopenings* (closed, now open
	// again) are what a stale query is about, so this flips true the first
	// time this instance ever sees `open === true` and stays true forever
	// after, exempting exactly that one first transition.
	let hasOpenedBefore = false;

	// The only *tracked* dependency here is `open` itself, read in the guard
	// below, outside `untrack`. Everything inside `untrack` matters: without
	// it, `listbox.moveToEdge("first")` reads `query` transitively (through
	// the `count`/`enabled` callbacks passed to `createListbox` above, which
	// close over `query`), and Svelte's dependency tracking follows reads
	// through function calls, not just lexical mentions — so `query` would
	// become a tracked dependency of this very effect. The next line then
	// writes `query`, which is exactly "an effect reads and writes the same
	// state": the write invalidates a dependency the effect itself just
	// read, so the effect reruns, reads `query` again, writes it again, and
	// so on — `effect_update_depth_exceeded`, reproduced by simply typing
	// into the field once `hasOpenedBefore` is true. `untrack` keeps every
	// read in here (of `query`, of `items`/`filter` through
	// `computeFilteredItems`, of `listRef` through `handleActiveChange`)
	// from registering as a dependency, so this effect really does re-fire
	// on `open` alone — not on a keystroke, not on an `items` swap.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			if (hasOpenedBefore) {
				query = "";
				onQueryChange?.("");
			}
			hasOpenedBefore = true;
			listbox.setActive(-1);
			listbox.moveToEdge("first");
		});
	});

	// Debounced result-count announcement. Re-running this effect whenever
	// `filteredItems.length` (or `open`) changes clears whatever timer the
	// previous run scheduled — Svelte guarantees the cleanup below runs
	// before the next run's body, exactly once per change — so a burst of
	// keystrokes keeps pushing the announcement out rather than stacking up
	// several, and the count that finally lands is always the latest one.
	// `null`, not `0`, before anything has settled — the live region must
	// stay silent while a debounce is pending, not flash a misleading
	// "0 results" for the first `ANNOUNCE_DEBOUNCE_MS` even when the list
	// is not actually empty.
	let announcedCount: number | null = $state(null);
	$effect(() => {
		const count = filteredItems.length;
		if (!open) return;
		// Zero is announced immediately, not debounced like every other
		// count. The empty state is already visible on screen the instant
		// `count` hits zero (the list already shows `emptyMessage`) — waiting
		// out the debounce here would leave the live region reporting a
		// stale "N results" while the list a screen reader user cannot see
		// already reads empty, which actively misleads rather than merely
		// lagging. A nonzero count carries no equivalent urgency: it is
		// never a contradiction of what's on screen, only a preview of it,
		// so it keeps the debounce that avoids narrating every keystroke.
		if (count === 0) {
			announcedCount = 0;
			return;
		}
		const timer = setTimeout(() => {
			announcedCount = count;
		}, ANNOUNCE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	const resultsMessage = $derived(
		announcedCount === null ? "" : announcedCount === 1 ? "1 result" : `${announcedCount} results`
	);

	function setOpen(next: boolean, options: { silent?: boolean } = {}): void {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
		// No `open` cue here on purpose — this menu is opened programmatically
		// by the consumer (⌘K and the like), never by an interaction this
		// component itself handles, so there is no gesture here to attach one
		// to. Only a dismissal (Escape, an outside click) plays `close`; a
		// commit-driven close passes `{ silent: true }` from `commitItem` below
		// so a committed row's own `select` cue is the only one that plays —
		// the same commit/dismiss split `Select`'s `closePanel` uses.
		if (sound && !next && !options.silent) soundFx.play("close");
	}

	function commitItem(item: CommandItem): void {
		if (item.disabled) return;
		if (sound) soundFx.play("select");
		item.onSelect?.();
		onSelect?.(item);
		setOpen(false, { silent: true });
	}

	function setQuery(next: string): void {
		if (query === next) return;
		query = next;
		onQueryChange?.(next);
	}

	function handleInput(event: Event & { currentTarget: HTMLInputElement }): void {
		setQuery(event.currentTarget.value);
		// Re-activates the first (visually topmost) surviving match on every
		// keystroke — calls the fresh function, not the `filteredItems`
		// derived, since `query` was just written above in this same pass.
		listbox.moveToEdge("first");
	}

	function handleKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				listbox.move(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				listbox.move(-1);
				break;
			case "Home":
				event.preventDefault();
				listbox.moveToEdge("first");
				break;
			case "End":
				event.preventDefault();
				listbox.moveToEdge("last");
				break;
			case "Enter": {
				// Safe to read the memoized `displayItems` here — unlike
				// `handleInput`, this handler never writes `query` first. Reads
				// `displayItems`, not `filteredItems`: `listbox.activeIndex` is
				// an index into the display order (see `computeDisplayItems`),
				// not into `items`' own filtered-but-unreordered order.
				const active = displayItems[listbox.activeIndex];
				if (active) {
					event.preventDefault();
					commitItem(active);
				}
				break;
			}
			// No Escape case here on purpose — the panel's own `dismissable`
			// below already closes on Escape via its document-level
			// listener; a second listener here would duplicate it.
		}
	}

	const classes = $derived(
		cn(
			"ft-command-menu border-border bg-popover text-popover-foreground fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border shadow-2xl",
			"focus-visible:outline-none",
			className
		)
	);
</script>

{#if open}
	<!--
		The scrim fades on opacity alone (`scale: false`) — a full-viewport
		fixed element has no business acquiring a compositing layer for a
		transform it does not use. It shares the panel's clock exactly, so
		the two leave together and Svelte's "destroy the branch when the LAST
		transition finishes" rule is a tie rather than a straggler.
	-->
	<div
		use:portal
		class="ft-command-menu-scrim fixed inset-0 z-50 bg-black/60"
		aria-hidden="true"
		transition:anchored={{
			entering: open,
			scale: false,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
	></div>
	<!--
		`use:portal` runs first and reparents this node to `document.body`
		before `use:focusTrap` mounts — both actions live on this one element
		specifically so their order is guaranteed by declaration order, not by
		however the framework happens to schedule effects across a
		parent/child pair. Getting this backwards (portal on an ancestor,
		focus-trap on a descendant) would let the trap call `.focus()` on a
		node not yet attached to `document` — a silent no-op everywhere,
		jsdom included. `dialog/DialogSurface.svelte` is the reference this
		follows.

		`use:scrollLock` sits here rather than on the scrim, and is an action
		rather than an `$effect`, for the release timing: an action's
		`destroy()` is delayed by the outro, so the page stays locked until
		the backdrop is actually gone instead of unlocking the instant `open`
		flips and leaving the page scrollable under a scrim still on screen.

		ONE bidirectional `transition:` directive per surface, never a split
		`in:`/`out:` pair: a bidirectional directive passes the in-flight
		counterpart's current position into the fresh call, so a menu
		reopened mid-exit continues from where it is instead of snapping to
		invisible first. `entering: open` is the direction signal — Svelte
		reports `direction: "both"` here and cannot distinguish the two on
		its own. This is the MODAL rung (`base` in, `exit` out), not the
		anchored rung the dropdown and context menus are on: a centred,
		scrim-backed, focus-trapped surface belongs with Dialog, not with a
		menu hanging off a button.

		The rung also retires a bug. The old `@keyframes` restated
		`translateX(-50%)` as a `transform` on a node whose centring comes
		from Tailwind v4's separate `translate` property; the two composed,
		so the panel drifted in from half its own width to the left.
		`transform: scale(…)` alone composes after `translate` and scales the
		panel about its own centre without touching the centring.

		`data-state` is a STATIC literal, changed only by `markSurfaceState`
		from the two handlers below. Svelte marks this branch inert before it
		plays the outro and the scheduler skips inert effects, so a reactive
		`data-state={…}` would never reach the DOM on a real close. `inert`
		itself is not written by hand: Svelte sets it on any element carrying
		a `transition:` for the whole exit, which is exactly what a closing
		modal wants — and it is what keeps the live region below from
		announcing a stale count while the panel fades.
	-->
	<div
		bind:this={ref}
		role="dialog"
		aria-modal="true"
		aria-label={label}
		tabindex="-1"
		class={classes}
		use:portal
		use:scrollLock
		use:focusTrap={{
			onActivate: (returnNow, rearm) => {
				returnFocusNow = returnNow;
				rearmFocusTrap = rearm;
			},
		}}
		use:dismissable={{ onDismiss: () => setOpen(false), active: () => open }}
		transition:anchored={{
			entering: open,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}}
		data-state="open"
		onintrostart={handleIntroStart}
		onoutrostart={handleOutroStart}
	>
		<div class="border-border flex h-[42px] shrink-0 items-center gap-[10px] border-b px-[14px]">
			<span aria-hidden="true" class="text-muted-foreground text-[13px]">⌕</span>
			<input
				bind:this={inputRef}
				type="text"
				role="combobox"
				aria-label={label}
				aria-haspopup="listbox"
				aria-expanded="true"
				aria-controls={listId}
				aria-autocomplete="list"
				aria-activedescendant={listbox.activeIndex >= 0 ? optionId(listbox.activeIndex) : undefined}
				{placeholder}
				value={query}
				class="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13px] outline-none"
				oninput={handleInput}
				onkeydown={handleKeydown}
			/>
			<kbd
				aria-hidden="true"
				class="text-muted-foreground border-border bg-accent ml-auto shrink-0 rounded-[4px] border px-[6px] py-[2px] font-mono text-[10px]"
			>
				esc
			</kbd>
		</div>

		<div
			bind:this={listRef}
			id={listId}
			role="listbox"
			aria-label={label}
			class="flex min-h-0 flex-col gap-[2px] overflow-y-auto p-[8px]"
		>
			{#if filteredItems.length === 0}
				{#if empty}
					{@render empty()}
				{:else}
					<div
						role="presentation"
						class="ft-command-menu-empty text-muted-foreground rounded-[8px] px-[12px] py-[8px] text-[13px]"
					>
						{emptyMessage}
					</div>
				{/if}
			{:else}
				{#each groups as group (group.name ?? "__ft_ungrouped__")}
					{#if group.name}
						<div
							role="presentation"
							class="ft-command-menu-heading text-muted-foreground/60 px-[12px] py-[4px] text-[10px] font-medium tracking-[.08em] uppercase"
						>
							{group.name}
						</div>
					{/if}
					{#each group.rows as { item, index } (item.id)}
						{@const range = getMatchRange(item.label, query)}
						<!--
							`onmousedown` defends against a real browser's
							focus-follows-mousedown default action stealing focus
							onto this row before its own `onclick` commits —
							without it, that focus shift blurs the input first,
							which nothing here reacts to directly, but the whole
							point of this pattern (see requirement 2 in the brief)
							is that focus never leaves the input at all. jsdom
							implements no such default action to suppress, so no
							test in this file can watch this guard prevent that
							outcome — only that the call happens. Do not delete
							this as dead code on the strength of a green suite;
							same reasoning `combobox/ComboboxPanel.svelte` documents
							for its own identical guard.
						-->
						<button
							type="button"
							id={optionId(index)}
							role="option"
							tabindex="-1"
							disabled={item.disabled}
							aria-selected={listbox.activeIndex === index}
							aria-disabled={item.disabled ? "true" : undefined}
							class={cn(
								"ft-command-menu-row flex w-full items-center justify-between gap-3 rounded-[8px] px-[12px] py-[8px] text-left text-[13px]",
								listbox.activeIndex === index && !item.disabled
									? "bg-accent text-accent-foreground"
									: "text-foreground",
								item.disabled && "pointer-events-none opacity-50"
							)}
							onmousedown={(event) => event.preventDefault()}
							onclick={() => commitItem(item)}
						>
							<span class="flex min-w-0 flex-1 items-center gap-2">
								{#if icon}
									<span aria-hidden="true" class="shrink-0">{@render icon(item)}</span>
								{/if}
								<span class="min-w-0 truncate">
									{#if range}
										{item.label.slice(0, range.start)}<mark
											>{item.label.slice(range.start, range.end)}</mark
										>{item.label.slice(range.end)}
									{:else}
										{item.label}
									{/if}
								</span>
							</span>
							{#if item.meta}
								<span class="shrink-0 text-[11px] opacity-60">{item.meta}</span>
							{/if}
						</button>
					{/each}
				{/each}
			{/if}
		</div>

		<!-- Always mounted while the panel is, whether or not the count has
		     settled — an element that only appears at the same moment its own
		     text does usually goes unread. Content is a debounced count,
		     never the item list itself. No `open ? … : ""` guard needed here:
		     this whole block only ever renders inside `{#if open}`, so the
		     region unmounting on close (not a text change) is what clears it —
		     see the "clears immediately on close" test. -->
		<div class="sr-only" role="status" aria-live="polite">{resultsMessage}</div>
	</div>
{/if}

<style>
	/*
	 * The nav accent has no semantic Tailwind token, so it is a scoped
	 * custom property with a `light-dark()` fallback, declared once here on
	 * the component root and read below via `var(--ft-nav-accent)`.
	 * `--ft-accent` itself is deliberately never redeclared — doing so would
	 * shadow whatever value a consumer set higher up the tree, the exact bug
	 * an earlier wave shipped in `Link`.
	 */
	.ft-command-menu {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-command-menu mark {
		background: transparent;
		color: var(--ft-nav-accent);
		font-weight: 600;
	}

	/*
	 * No `@keyframes` and no `@media (prefers-reduced-motion)` block here any
	 * more: both surfaces are driven by the shared JS transition on the
	 * markup above, which collapses its own duration to 0 when the user has
	 * asked for reduced motion — the framework then skips `element.animate()`
	 * entirely and the menu appears and disappears instantly, with the close
	 * staying synchronous.
	 *
	 * The keyframes this replaced also carried a bug worth naming: the
	 * panel's `from` restated `translateX(-50%)` as a `transform`, on a node
	 * whose centring comes from Tailwind v4's separate `translate` property.
	 * The two composed, so the panel drifted in from half its own width to
	 * the left. `transform: scale(…)` alone composes after `translate` and
	 * scales the panel about its own centre without touching the centring.
	 */
</style>
