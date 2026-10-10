<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { CommandItem } from "./types.js";

export type { CommandItem };

export interface CommandMenuProps {
	/** Whether the menu is open. Two-way through `v-model:open`. */
	open?: boolean;
	/** Fires whenever `open` changes, from Escape, an outside click, or committing an item. */
	onOpenChange?: (open: boolean) => void;
	/** The full, unfiltered vocabulary. */
	items: CommandItem[];
	/** The current search text. Two-way through `v-model:query`. Reset to `""` every time the menu reopens. */
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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { useFocusTrap } from "../../internals/use-focus-trap.js";
import { useScrollLock } from "../../internals/use-scroll-lock.js";
import { anchored } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { useListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { defaultFilter, getMatchRange } from "./match.js";

defineOptions({ name: "CommandMenu", inheritAttrs: false });

const {
	items,
	onOpenChange,
	onQueryChange,
	onSelect,
	placeholder = "Search...",
	emptyMessage = "No results",
	label = "Command menu",
	filter,
	class: className,
	sound = false,
} = defineProps<CommandMenuProps>();

// The counterparts of the source's bindable `open` / `query`: writable from
// inside, kept in step with a caller driving them from outside, and free to
// move on their own when nobody is listening. That is what makes every
// documented call shape work off one implementation — a caller two-way binding
// the value, a caller who passes only the change callback, and a caller who
// passes neither.
const open = defineModel<boolean>("open", { default: false });
const query = defineModel<string>("query", { default: "" });

defineSlots<{
	/** Rendered before each row's label, given that row's item. Treated as decorative — see the README. */
	icon?(props: { item: CommandItem }): unknown;
	/** Rendered in place of the list when nothing matches, instead of `emptyMessage`. */
	empty?(): unknown;
}>();

// How long the query has to sit still before the live region reports a
// fresh count — announcing on every keystroke would turn fast typing
// into a screen reader narrating a number after every character. See
// the README for the exact contract this settles on.
const ANNOUNCE_DEBOUNCE_MS = 300;

// `useFancyId()`, the counterpart of the source's `$props.id()`, never the
// handler-time `uid()` (which throws outside the browser): row and list ids
// are needed at SSR render time, and this is the seed every other control in
// the library uses for that.
const uid = useFancyId();
const listId = `${uid}-list`;
function optionId(index: number): string {
	return `${uid}-option-${index}`;
}

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher.
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
defineExpose({ ref: panel });

// Nothing renders off this. It exists so the active row can be scrolled into
// view, which is DOM work, never a render input.
const listEl = useTemplateRef<HTMLDivElement>("listEl");

function matches(item: CommandItem, q: string): boolean {
	return filter ? filter(item, q) : defaultFilter(item, q);
}

// A plain function, not only the `computed` below, so it can also be called
// fresh from `handleInput` in the same pass that just wrote `query` — and from
// the listbox's own `count`/`enabled` getters, which run at handler time. Same
// pattern the combobox's `computeFilteredOptions` uses.
function computeFilteredItems(q: string): CommandItem[] {
	return items.filter((item) => matches(item, q));
}

const filteredItems = computed(() => computeFilteredItems(query.value));

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

const displayItems = computed(() => computeDisplayItems(filteredItems.value));

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

const groups = computed(() => computeGroups(displayItems.value));

function handleActiveChange(index: number): void {
	// `Element.prototype.scrollIntoView` does not exist in jsdom —
	// optional-chaining the method itself (not just the element) makes
	// this a silent no-op there instead of a thrown TypeError, while a
	// real browser still scrolls the row into view exactly as intended.
	const row = listEl.value?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
	row?.scrollIntoView?.({ block: "nearest" });
}

// The getters are called fresh on every navigation, so they always describe the
// list as it is right now — including inside `handleInput`, which writes
// `query` and then moves the active row in the same synchronous pass. This is
// also what replaces the source's `untrack(...)`: nothing here runs inside a
// tracked scope, so reading `query` through these callbacks never makes it a
// dependency of the effect that writes it.
const listbox = useListbox({
	count: () => computeDisplayItems(computeFilteredItems(query.value)).length,
	enabled: (i) => !computeDisplayItems(computeFilteredItems(query.value))[i]?.disabled,
	loop: true,
	onActiveChange: handleActiveChange,
});

// Returns the two functions the source action hands out through `onActivate`:
// the eager return, and the re-arm. Its identity is stable from `setup`, so the
// two presence hooks below can name it before the trap has attached.
const trap = useFocusTrap(panel);

const presence = usePresence(() => open.value, {
	// The two halves of the focus handshake, at the two moments the source puts
	// them: intro start → rearm, outro start → returnFocusNow.
	//
	// `returnFocusNow` at the dismiss instant is the whole point: waiting for
	// the trap's own `destroy()` would leave a keyboard user on `<body>` for the
	// whole length of the fade, because the panel is marked `inert` the instant
	// the exit starts.
	//
	// `rearm` is the other half. A menu reopened DURING its fade reverses the
	// exit instead of remounting, so the trap is never re-created: without this
	// the panel would come back `aria-modal` and interactive with focus left on
	// whatever was focused before it opened, Tab walking the page rather than
	// the panel, and the eager return already spent for the life of the
	// instance.
	onEnterStart: () => trap.rearm(),
	onExitStart: () => trap.returnFocusNow(),
});

// LAW: release at exit END, never at exit start. `presence.mounted` stays true
// through the whole fade, so the page stays locked until the backdrop is
// actually gone instead of unlocking the instant `open` flips and leaving the
// page scrollable under a scrim still on screen — the source's reason for
// making the lock an action (whose `destroy()` is outro-delayed) rather than an
// `$effect`. NEVER `() => open.value`.
useScrollLock(() => presence.mounted);

// `active` stays a GETTER: the layer must stop being TOP of the stack the
// instant `open` flips, while remaining ON the stack for the whole exit, so a
// second Escape during the fade falls through to whatever is underneath.
useDismissable(panel, () => ({
	onDismiss: () => setOpen(false),
	active: () => open.value,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// ONE bidirectional leg per node, never a split enter/exit pair: a menu
// reopened mid-exit resumes from the position the close actually reached
// instead of snapping to invisible first. `entering` is the direction signal a
// single two-way transition cannot work out on its own. This is the MODAL rung
// (`base` in, `exit` out), not the anchored rung the dropdown and context menus
// are on: a centred, scrim-backed, focus-trapped surface belongs with Dialog,
// not with a menu hanging off a button.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register("panel", anchored, (entering) => ({
		entering,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}))
);

// The scrim fades on opacity alone (`scale: false`) — a full-viewport fixed
// element has no business acquiring a compositing layer for a transform it does
// not use. It shares the panel's clock exactly (one presence, two keys), so the
// two leave together and the "unmount the subtree when the LAST transition
// finishes" rule is a tie rather than a straggler.
const scrimRef = composeRefs<HTMLDivElement>(
	presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}))
);

// A no-op while `sound` is false, so every call site below stays unguarded, and
// the preference is read inside the returned function rather than on a render
// path.
const playCue = useSoundCue(() => sound);

// Whatever the very first paint's `query` was is worth keeping — a caller that
// mounts the menu already open with a prefilled query is seeding it on purpose.
// Only actual *reopenings* (closed, now open again) are what a stale query is
// about, so this flips true the first time this instance ever sees
// `open === true` and stays true forever after, exempting exactly that one
// first transition.
let hasOpenedBefore = false;

// The source's `$effect` whose one real dependency is `open`. A watch callback
// body is untracked by construction, which is what the source needed
// `untrack(...)` for: `listbox.moveToEdge("first")` reads `query` transitively
// through the `count`/`enabled` getters, and the very next line writes `query`
// — an effect reading and writing the same state. Here neither read registers,
// so this really does re-fire on `open` alone: not on a keystroke, not on an
// `items` swap.
//
// `onMounted` carries the first pass, because a watch with no `immediate` never
// runs on mount (which is also what keeps it off the server) while the source's
// effect does — and a menu mounted already open has to activate its first row.
function syncOpen(): void {
	if (!open.value) return;
	if (hasOpenedBefore) {
		query.value = "";
		onQueryChange?.("");
	}
	hasOpenedBefore = true;
	listbox.setActive(-1);
	listbox.moveToEdge("first");
}

onMounted(syncOpen);
watch(open, syncOpen, { flush: "post" });

// Debounced result-count announcement. Every change to the filtered list (or to
// `open`) clears whatever timer the previous pass scheduled, so a burst of
// keystrokes keeps pushing the announcement out rather than stacking up
// several, and the count that finally lands is always the latest one. `null`,
// not `0`, before anything has settled — the live region must stay silent while
// a debounce is pending, not flash a misleading "0 results" for the first
// `ANNOUNCE_DEBOUNCE_MS` even when the list is not actually empty.
const announcedCount = ref<number | null>(null);
let announceTimer: ReturnType<typeof setTimeout> | null = null;

function clearAnnounceTimer(): void {
	if (announceTimer !== null) {
		clearTimeout(announceTimer);
		announceTimer = null;
	}
}

function scheduleAnnounce(): void {
	// Stands in for the source effect's cleanup, which the framework ran before
	// each next pass, exactly once per change.
	clearAnnounceTimer();
	const count = filteredItems.value.length;
	if (!open.value) return;
	// Zero is announced immediately, not debounced like every other count. The
	// empty state is already visible on screen the instant `count` hits zero
	// (the list already shows `emptyMessage`) — waiting out the debounce here
	// would leave the live region reporting a stale "N results" while the list a
	// screen reader user cannot see already reads empty, which actively misleads
	// rather than merely lagging. A nonzero count carries no equivalent urgency:
	// it is never a contradiction of what's on screen, only a preview of it, so
	// it keeps the debounce that avoids narrating every keystroke.
	if (count === 0) {
		announcedCount.value = 0;
		return;
	}
	announceTimer = setTimeout(() => {
		announcedCount.value = count;
	}, ANNOUNCE_DEBOUNCE_MS);
}

onMounted(scheduleAnnounce);
// The source's effect depends on the derived list itself, so it re-runs on every
// keystroke even when the count happens to be unchanged — a fresh array is a
// fresh value. Watching the computed rather than its length keeps that.
watch([filteredItems, open], scheduleAnnounce, { flush: "post" });
onBeforeUnmount(clearAnnounceTimer);

const resultsMessage = computed(() =>
	announcedCount.value === null
		? ""
		: announcedCount.value === 1
			? "1 result"
			: `${announcedCount.value} results`
);

function setOpen(next: boolean, options: { silent?: boolean } = {}): void {
	if (open.value === next) return;
	open.value = next;
	onOpenChange?.(next);
	// No `open` cue here on purpose — this menu is opened programmatically by
	// the consumer (⌘K and the like), never by an interaction this component
	// itself handles, so there is no gesture here to attach one to. Only a
	// dismissal (Escape, an outside click) plays `close`; a commit-driven close
	// passes `{ silent: true }` from `commitItem` below so a committed row's own
	// `select` cue is the only one that plays — the same commit/dismiss split
	// `Select`'s panel close uses.
	if (!next && !options.silent) playCue("close");
}

function commitItem(item: CommandItem): void {
	if (item.disabled) return;
	playCue("select");
	item.onSelect?.();
	onSelect?.(item);
	setOpen(false, { silent: true });
}

function setQuery(next: string): void {
	if (query.value === next) return;
	query.value = next;
	onQueryChange?.(next);
}

function handleInput(event: Event): void {
	setQuery((event.currentTarget as HTMLInputElement).value);
	// Re-activates the first (visually topmost) surviving match on every
	// keystroke — the listbox's getters call the filter fresh, so they see the
	// query written on the line above and never the pre-keystroke list.
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
			// Reads `displayItems`, not `filteredItems`: `listbox.activeIndex` is
			// an index into the display order (see `computeDisplayItems`), not
			// into `items`' own filtered-but-unreordered order.
			const active = displayItems.value[listbox.activeIndex];
			if (active) {
				event.preventDefault();
				commitItem(active);
			}
			break;
		}
		// No Escape case here on purpose — the panel's own dismiss layer already
		// closes on Escape via its document-level listener; a second listener
		// here would duplicate it.
	}
}

const classes = computed(() =>
	cn(
		"ft-command-menu border-border bg-popover text-popover-foreground fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border shadow-2xl",
		"focus-visible:outline-none",
		className
	)
);
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it: the teleport
		resolves its target during the patch that creates its children, before any
		post-flush watcher or mounted hook, so the panel is always connected to the
		document by the time the focus trap calls `.focus()` on it. The source
		needed a declaration-order ceremony between two actions on this one element
		to guarantee the same thing; here it is structural. A closed surface emits
		no scrim and no panel at all, on the server included.

		`data-state` is an ordinary binding carrying the surface vocabulary's TWO
		values — never "opening". `inert` is not written by hand either: the
		presence clock sets the attribute on every registered node for the whole
		exit, which is exactly what a closing modal wants — and it is what keeps
		the live region below from announcing a stale count while the panel fades.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="scrimRef"
				class="ft-command-menu-scrim fixed inset-0 z-50 bg-black/60"
				aria-hidden="true"
			></div>
			<div
				:ref="panelRef"
				role="dialog"
				aria-modal="true"
				:aria-label="label"
				tabindex="-1"
				:class="classes"
				:data-state="presence.surfaceState"
			>
				<div
					class="border-border flex h-[42px] shrink-0 items-center gap-[10px] border-b px-[14px]"
				>
					<span aria-hidden="true" class="text-muted-foreground text-[13px]">⌕</span>
					<input
						type="text"
						role="combobox"
						:aria-label="label"
						aria-haspopup="listbox"
						aria-expanded="true"
						:aria-controls="listId"
						aria-autocomplete="list"
						:aria-activedescendant="
							listbox.activeIndex >= 0 ? optionId(listbox.activeIndex) : undefined
						"
						:placeholder="placeholder"
						:value="query"
						class="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13px] outline-none"
						@input="handleInput"
						@keydown="handleKeydown"
					/>
					<kbd
						aria-hidden="true"
						class="text-muted-foreground border-border bg-accent ml-auto shrink-0 rounded-[4px] border px-[6px] py-[2px] font-mono text-[10px]"
					>
						esc
					</kbd>
				</div>

				<div
					ref="listEl"
					:id="listId"
					role="listbox"
					:aria-label="label"
					class="flex min-h-0 flex-col gap-[2px] overflow-y-auto p-[8px]"
				>
					<template v-if="filteredItems.length === 0">
						<slot v-if="$slots.empty" name="empty" />
						<div
							v-else
							role="presentation"
							class="ft-command-menu-empty text-muted-foreground rounded-[8px] px-[12px] py-[8px] text-[13px]"
						>
							{{ emptyMessage }}
						</div>
					</template>
					<template v-else>
						<template v-for="group in groups" :key="group.name ?? '__ft_ungrouped__'">
							<div
								v-if="group.name"
								role="presentation"
								class="ft-command-menu-heading text-muted-foreground/60 px-[12px] py-[4px] text-[10px] font-medium tracking-[.08em] uppercase"
							>
								{{ group.name }}
							</div>
							<!--
								`mousedown` defends against a real browser's
								focus-follows-mousedown default action stealing focus
								onto this row before its own `click` commits —
								without it, that focus shift blurs the input first,
								which nothing here reacts to directly, but the whole
								point of this pattern is that focus never leaves the
								input at all. jsdom implements no such default action
								to suppress, so no test in this folder can watch this
								guard prevent that outcome — only that the call
								happens. Do not delete this as dead code on the
								strength of a green suite.
							-->
							<button
								v-for="{ item, index } in group.rows"
								:key="item.id"
								type="button"
								:id="optionId(index)"
								role="option"
								tabindex="-1"
								:disabled="item.disabled"
								:aria-selected="listbox.activeIndex === index"
								:aria-disabled="item.disabled ? 'true' : undefined"
								:class="
									cn(
										'ft-command-menu-row flex w-full items-center justify-between gap-3 rounded-[8px] px-[12px] py-[8px] text-left text-[13px]',
										listbox.activeIndex === index && !item.disabled
											? 'bg-accent text-accent-foreground'
											: 'text-foreground',
										item.disabled && 'pointer-events-none opacity-50'
									)
								"
								@mousedown="(event: MouseEvent) => event.preventDefault()"
								@click="commitItem(item)"
							>
								<span class="flex min-w-0 flex-1 items-center gap-2">
									<span v-if="$slots.icon" aria-hidden="true" class="shrink-0"
										><slot name="icon" :item="item"
									/></span>
									<span class="min-w-0 truncate">
										<!--
											A one-element `v-for` is this framework's stand-in for
											the source's template-local `const`: it names the match
											range for this subtree without recomputing it at each
											of the three reads below. The three text runs are
											written hard against each other, with every line break
											tucked inside an interpolation, because a whitespace-only
											text node between an interpolation and an element
											condenses to a real space — which would land inside the
											rendered label.
										-->
										<template
											v-for="range in [getMatchRange(item.label, query)]"
											:key="item.id"
										>
											<template v-if="range"
												>{{ item.label.slice(0, range.start)
												}}<mark>{{ item.label.slice(range.start, range.end) }}</mark
												>{{ item.label.slice(range.end) }}</template
											>
											<template v-else>{{ item.label }}</template>
										</template>
									</span>
								</span>
								<span v-if="item.meta" class="shrink-0 text-[11px] opacity-60">{{
									item.meta
								}}</span>
							</button>
						</template>
					</template>
				</div>

				<!-- Always mounted while the panel is, whether or not the count has
				     settled — an element that only appears at the same moment its own
				     text does usually goes unread. Content is a debounced count,
				     never the item list itself. No `open ? … : ""` guard needed here:
				     this whole block only ever renders inside the presence gate, so
				     the region unmounting on close (not a text change) is what clears
				     it — see the "clears immediately on close" test. -->
				<div class="sr-only" role="status" aria-live="polite">{{ resultsMessage }}</div>
			</div>
		</Portal>
	</template>
</template>

<style scoped>
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
 * asked for reduced motion — the sampler then skips `element.animate()`
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
