import {
	Fragment,
	forwardRef,
	useCallback,
	useEffect,
	useInsertionEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useFocusTrap } from "../../internals/focus-trap.js";
import { useScrollLock } from "../../internals/scroll-lock.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { anchored } from "../../internals/motion/anchored.js";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { usePresence } from "../../internals/motion/presence.js";
import { createListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { defaultFilter, getMatchRange } from "./match.js";
import type { CommandItem } from "./types.js";
import "./command-menu.css";

export type { CommandItem };

export interface CommandMenuProps {
	/** Whether the menu is open. Controlled when given; the component keeps its own copy either way. */
	open?: boolean;
	/** Fires whenever `open` changes, from Escape, an outside click, or committing an item. */
	onOpenChange?: (open: boolean) => void;
	/** The full, unfiltered vocabulary. */
	items: CommandItem[];
	/** The current search text. Controlled when given. Reset to `""` every time the menu reopens. */
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
	className?: string;
	/** Rendered before each row's label, given that row's item. Treated as decorative — see the README. */
	icon?: (item: CommandItem) => ReactNode;
	/** Rendered in place of the list when nothing matches, instead of `emptyMessage`. */
	empty?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// How long the query has to sit still before the live region reports a
// fresh count — announcing on every keystroke would turn fast typing
// into a screen reader narrating a number after every character. See
// the README for the exact contract this settles on.
const ANNOUNCE_DEBOUNCE_MS = 300;

/**
 * Reorders the already-filtered items into the order they actually
 * render in: every ungrouped item first, then each group's items, in
 * the order that group name was first seen in `items` — never
 * alphabetized, never reordered relative to how the caller listed
 * things within a bucket. This is a *display* order, not `items`'s own
 * order, and it matters beyond rendering: it is also the flat index
 * space `optionId`, `aria-activedescendant`, and the listbox core all
 * share below, so "first" (on open, on Home) and "next" (ArrowDown)
 * mean the row that is visually first/next, not `items[0]`/`items[i+1]`
 * — those two can disagree the moment an ungrouped item sits after a
 * grouped one in `items`' own declaration order.
 */
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

interface GroupRow {
	item: CommandItem;
	index: number;
}
interface ItemGroup {
	name: string | null;
	rows: GroupRow[];
}

/**
 * `displayItems` is already ungrouped-first-then-grouped, so a single
 * left-to-right pass finds each heading's boundary just by watching
 * `item.group` change — no separate bucketing pass needed here, and
 * each row's `index` is simply its position in `displayItems`, the
 * same index space `optionId`/the listbox core use. A group only
 * exists here if at least one of its items survived filtering, so an
 * empty heading never renders.
 */
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

// -1 is the value the listbox core starts at, so the server render and the
// hydration render agree that nothing is active.
const getServerSnapshot = () => -1;

export const CommandMenu = forwardRef<HTMLDivElement, CommandMenuProps>(function CommandMenu(
	{
		open: openProp,
		onOpenChange,
		items,
		query: queryProp,
		onQueryChange,
		onSelect,
		placeholder = "Search...",
		emptyMessage = "No results",
		label = "Command menu",
		filter,
		className,
		icon,
		empty,
		sound = false,
	},
	forwardedRef
) {
	// The React shape of the source's `open = $bindable(false)` /
	// `query = $bindable("")`: an internal copy seeded from the prop,
	// re-synced during render whenever the CALLER changes the prop, and free
	// to move on its own in between. That is what makes every documented call
	// shape work off one implementation — a caller driving the value from its
	// own state, a caller who passes only the change callback, and a caller
	// who passes neither.
	//
	// Re-synced in the render path, not an effect: an effect would paint one
	// frame of the stale value first, and the pattern React documents for
	// "adjust state when a prop changes" is exactly this.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	const [query, setQueryState] = useState(queryProp ?? "");
	const [lastQueryProp, setLastQueryProp] = useState(queryProp);
	if (lastQueryProp !== queryProp) {
		setLastQueryProp(queryProp);
		setQueryState(queryProp ?? "");
	}

	// `useFancyId()`, not `uid()` (which throws outside the browser): row and
	// list ids are needed at SSR render time, and this is the seed every other
	// control in the library uses for that (convention C-6).
	const uid = useFancyId();
	const listId = `${uid}-list`;
	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	// Convention C-1: the NODE, not a ref. Both elements are created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the consuming hook's effect fires.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();
	const [listNode, setListNode] = useElementRef<HTMLDivElement>();

	function matches(item: CommandItem, q: string): boolean {
		return filter ? filter(item, q) : defaultFilter(item, q);
	}

	function computeFilteredItems(q: string): CommandItem[] {
		return items.filter((item) => matches(item, q));
	}

	const filteredItems = computeFilteredItems(query);
	const displayItems = computeDisplayItems(filteredItems);
	const groups = computeGroups(displayItems);

	// The React stand-in for the source's plain `computeFilteredItems(query)`
	// call inside `handleInput`. `query` is state here, so the re-render that
	// carries a keystroke has not happened yet when `handleInput` goes on to
	// call `listbox.moveToEdge("first")` in the same synchronous pass — the
	// listbox's `count`/`enabled` getters would still be describing the
	// PRE-keystroke list, which is exactly the stale read the source's comment
	// warns against. `setQuery` writes this ref synchronously, so the getters
	// below always see the query that is being handled right now.
	//
	// Written in an insertion effect for the committed value (never during
	// render, per `useLiveRef`'s own reasoning): a concurrent render React
	// throws away must not be able to publish a query that never committed.
	const queryRef = useRef(query);
	useInsertionEffect(() => {
		queryRef.current = query;
	}, [query]);
	const itemsRef = useLiveRef(items);
	const filterRef = useLiveRef(filter);

	const handleActiveChange = useEventCallback((index: number) => {
		// `Element.prototype.scrollIntoView` does not exist in jsdom —
		// optional-chaining the method itself (not just the element) makes
		// this a silent no-op there instead of a thrown TypeError, while a
		// real browser still scrolls the row into view exactly as intended.
		const row = listNode?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	});

	// The listbox core is wired by hand rather than through `useListbox`, and
	// the reason is the one above: `useListbox` takes `count` as a plain
	// number read from the last COMMITTED render, which is one keystroke
	// behind inside `handleInput`. The factory's own getter shape is what the
	// source passes, so passing it live getters over refs is the literal port.
	const listbox = useConstant(() => {
		const live = (): CommandItem[] => {
			const q = queryRef.current;
			const f = filterRef.current;
			return computeDisplayItems(
				itemsRef.current.filter((item) => (f ? f(item, q) : defaultFilter(item, q)))
			);
		};
		return createListbox({
			count: () => live().length,
			enabled: (index) => !live()[index]?.disabled,
			loop: true,
			onActiveChange: handleActiveChange,
		});
	});

	// The source's `onDestroy(() => listbox.destroy())`.
	useEffect(() => () => listbox.destroy(), [listbox]);

	// The one index in this component that has to drive rendering:
	// `aria-activedescendant` on the input, `aria-selected` on every row.
	const getSnapshot = useCallback(() => listbox.activeIndex, [listbox]);
	const activeIndex = useSyncExternalStore(listbox.subscribe, getSnapshot, getServerSnapshot);

	// Returns the two functions the source hands out through `onActivate`:
	// the eager return, and the re-arm.
	const trap = useFocusTrap(panel);

	const presence = usePresence(open, {
		// The two halves of the focus handshake, at the two moments the source
		// puts them: `onintrostart` → rearm, `onoutrostart` → returnFocusNow.
		//
		// `returnFocusNow` at the dismiss instant is the whole point: waiting
		// for the trap's own `destroy()` would leave a keyboard user on
		// `<body>` for the whole length of the fade, because the panel is
		// marked `inert` the instant the exit starts.
		//
		// `rearm` is the other half. A menu reopened DURING its fade reverses
		// the exit instead of remounting, so the trap is never re-created:
		// without this the panel would come back `aria-modal` and interactive
		// with focus left on whatever was focused before it opened, Tab
		// walking the page rather than the panel, and the eager return already
		// spent for the life of the instance.
		onEnterStart: () => trap.rearm(),
		onExitStart: () => trap.returnFocusNow(),
	});

	// Release timing, which is the only reason this is not keyed on `open`:
	// `presence.mounted` stays true for the whole exit, so the page stays
	// locked until the backdrop has actually finished fading instead of
	// unlocking the instant `open` flips and leaving the page scrollable under
	// a scrim still on screen — the source's reason for making the lock an
	// action (whose `destroy()` is outro-delayed) rather than an `$effect`.
	//
	// Not a bare `useScrollLock()`: this component is mounted for as long as a
	// `CommandMenu` is anywhere in the tree, open or closed, so a bare call
	// would lock the page forever. Emphatically not `useScrollLock(open)`
	// either — that releases at exit START.
	useScrollLock(presence.mounted);

	// `active: open` — a plain boolean where the source needed `() => open`.
	// The layer stays ON the stack for its whole exit and stops being TOP of
	// it the instant `open` flips, so a second Escape during the fade falls
	// through to whatever is underneath.
	useDismissable(panel, { onDismiss: () => setOpen(false), active: open });

	// Convention C-2: composed ABOVE any conditional. Calling this inside the
	// JSX branch below would be a conditional hook and would throw the first
	// time `mounted` flips.
	//
	// ONE bidirectional transition per surface, never a split in/out pair: a
	// reopen mid-exit hands the in-flight run over as the counterpart, so the
	// entrance resumes from where it is instead of snapping to invisible
	// first. `entering` is the direction signal the transition cannot work out
	// on its own. This is the MODAL rung (`base` in, `exit` out), not the
	// anchored rung the dropdown and context menus are on: a centred,
	// scrim-backed, focus-trapped surface belongs with Dialog, not with a menu
	// hanging off a button.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register("panel", anchored, (entering) => ({
			entering,
			duration: DURATIONS.base,
			exitDuration: DURATIONS.exit,
		}))
	);

	// The scrim fades on opacity alone (`scale: false`) — a full-viewport
	// fixed element has no business acquiring a compositing layer for a
	// transform it does not use. It shares the panel's clock exactly, so the
	// two leave together and the "destroy the subtree when the LAST transition
	// finishes" rule is a tie rather than a straggler.
	const scrimRef = presence.register("scrim", anchored, (entering) => ({
		entering,
		scale: false,
		duration: DURATIONS.base,
		exitDuration: DURATIONS.exit,
	}));

	const emitQueryChange = useEventCallback(onQueryChange);

	// Identity-stable, and a no-op while `sound` is falsy — the enabled check
	// lives inside the hook, so the call sites below read as the source's do.
	const playCue = useSoundCue(sound);

	// Whatever the very first paint's `query` was is worth keeping — a caller
	// that mounts the menu already open with a prefilled query is seeding it
	// on purpose. Only actual *reopenings* (closed, now open again) are what a
	// stale query is about, so this flips true the first time this instance
	// ever sees `open === true` and stays true forever after, exempting
	// exactly that one first transition.
	const hasOpenedBefore = useRef(false);

	// The `open` value this effect last acted on, `null` before it has ever
	// run. `hasOpenedBefore` alone is a latch that survives a StrictMode
	// remount, so a dev-mode double invoke would run the body twice for ONE
	// open and the second pass would take the reopen branch — wiping a query
	// the caller seeded on the very first mount and pushing `onQueryChange("")`
	// back at it. Keying the work on the open EDGE instead makes a repeated
	// invoke at an unchanged `open` a no-op, which is what makes the dev-only
	// remount indistinguishable from a single mount. Deliberately not a
	// cleanup that rewinds `hasOpenedBefore`: that would fire on every real
	// close and turn every reopen back into a first mount.
	const lastHandledOpen = useRef<boolean | null>(null);

	// The React counterpart of the source's `untrack` block: this effect
	// re-fires on `open` alone — not on a keystroke, not on an `items` swap.
	// Every other value it touches is reached through an identity-stable ref
	// or handle, so the dependency array below is both honest and minimal.
	useEffect(() => {
		if (lastHandledOpen.current === open) return;
		lastHandledOpen.current = open;
		if (!open) return;
		if (hasOpenedBefore.current) {
			queryRef.current = "";
			setQueryState("");
			emitQueryChange("");
		}
		hasOpenedBefore.current = true;
		listbox.setActive(-1);
		listbox.moveToEdge("first");
	}, [open, listbox, emitQueryChange]);

	// Debounced result-count announcement. Re-running this effect whenever the
	// result count (or `open`) changes clears whatever timer the previous run
	// scheduled — React runs the cleanup before the next run's body, exactly
	// once per change — so a burst of keystrokes keeps pushing the
	// announcement out rather than stacking up several, and the count that
	// finally lands is always the latest one. `null`, not `0`, before anything
	// has settled — the live region must stay silent while a debounce is
	// pending, not flash a misleading "0 results" for the first
	// `ANNOUNCE_DEBOUNCE_MS` even when the list is not actually empty.
	const [announcedCount, setAnnouncedCount] = useState<number | null>(null);
	const resultCount = filteredItems.length;
	useEffect(() => {
		if (!open) return;
		// Zero is announced immediately, not debounced like every other
		// count. The empty state is already visible on screen the instant
		// the count hits zero (the list already shows `emptyMessage`) —
		// waiting out the debounce here would leave the live region reporting
		// a stale "N results" while the list a screen reader user cannot see
		// already reads empty, which actively misleads rather than merely
		// lagging. A nonzero count carries no equivalent urgency: it is never
		// a contradiction of what's on screen, only a preview of it, so it
		// keeps the debounce that avoids narrating every keystroke.
		if (resultCount === 0) {
			setAnnouncedCount(0);
			return;
		}
		const timer = setTimeout(() => {
			setAnnouncedCount(resultCount);
		}, ANNOUNCE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [resultCount, open]);

	const resultsMessage =
		announcedCount === null ? "" : announcedCount === 1 ? "1 result" : `${announcedCount} results`;

	function setOpen(next: boolean, options: { silent?: boolean } = {}): void {
		if (open === next) return;
		setOpenState(next);
		onOpenChange?.(next);
		// No `open` cue here on purpose — this menu is opened programmatically
		// by the consumer (⌘K and the like), never by an interaction this
		// component itself handles, so there is no gesture here to attach one
		// to. Only a dismissal (Escape, an outside click) plays `close`; a
		// commit-driven close passes `{ silent: true }` from `commitItem` below
		// so a committed row's own `select` cue is the only one that plays —
		// the same commit/dismiss split `Select`'s panel close uses.
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
		if (query === next) return;
		queryRef.current = next;
		setQueryState(next);
		onQueryChange?.(next);
	}

	function handleInput(event: ChangeEvent<HTMLInputElement>): void {
		setQuery(event.currentTarget.value);
		// Re-activates the first (visually topmost) surviving match on every
		// keystroke — the listbox's getters read `queryRef`, which the line
		// above just wrote, not the state this render was built from.
		listbox.moveToEdge("first");
	}

	function handleKeydown(event: KeyboardEvent<HTMLInputElement>): void {
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
				// Reads `displayItems`, not `filteredItems`:
				// `listbox.activeIndex` is an index into the display order
				// (see `computeDisplayItems`), not into `items`' own
				// filtered-but-unreordered order.
				const active = displayItems[listbox.activeIndex];
				if (active) {
					event.preventDefault();
					commitItem(active);
				}
				break;
			}
			// No Escape case here on purpose — the panel's own dismiss layer
			// already closes on Escape via its document-level listener; a
			// second listener here would duplicate it.
		}
	}

	const classes = cn(
		"ft-command-menu border-border bg-popover text-popover-foreground fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border shadow-2xl",
		"focus-visible:outline-none",
		className
	);

	// The `Portal` stays mounted and its CHILDREN are what `presence.mounted`
	// gates. `usePortalTarget` resolves its container in a layout effect, so a
	// `Portal` that mounts in the same commit as the surface renders nothing
	// on that pass — the registered nodes would not exist yet when
	// `usePresence`'s own layout effect looks for legs to start, and the
	// entrance would be silently skipped. Hoisting the `Portal` above the gate
	// resolves the container once, at this component's own mount.
	//
	// No portal-before-focus-trap ordering ceremony either: `createPortal`
	// commits children into the container before any effect runs and refs
	// populate before layout effects, so the node the trap focuses is always
	// connected. The silent-no-op `.focus()` hazard the source's comment block
	// warns about cannot recur here.
	return (
		<Portal>
			{presence.mounted ? (
				<>
					<div
						ref={scrimRef}
						className="ft-command-menu-scrim fixed inset-0 z-50 bg-black/60"
						aria-hidden="true"
					/>
					{/*
						`data-state` is an ordinary React attribute carrying
						`surfaceState`'s TWO values — never `"opening"`
						(convention C-5). `inert` is not written by hand either:
						`usePresence` sets it on every registered node for the whole
						exit, which is exactly what a closing modal wants — and it is
						what keeps the live region below from announcing a stale count
						while the panel fades.
					*/}
					<div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-label={label}
						tabIndex={-1}
						className={classes}
						data-state={presence.surfaceState}
					>
						<div className="border-border flex h-[42px] shrink-0 items-center gap-[10px] border-b px-[14px]">
							<span aria-hidden="true" className="text-muted-foreground text-[13px]">
								⌕
							</span>
							<input
								type="text"
								role="combobox"
								aria-label={label}
								aria-haspopup="listbox"
								aria-expanded="true"
								aria-controls={listId}
								aria-autocomplete="list"
								aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
								placeholder={placeholder}
								value={query}
								className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13px] outline-none"
								onChange={handleInput}
								onKeyDown={handleKeydown}
							/>
							<kbd
								aria-hidden="true"
								className="text-muted-foreground border-border bg-accent ml-auto shrink-0 rounded-[4px] border px-[6px] py-[2px] font-mono text-[10px]"
							>
								esc
							</kbd>
						</div>

						<div
							ref={setListNode}
							id={listId}
							role="listbox"
							aria-label={label}
							className="flex min-h-0 flex-col gap-[2px] overflow-y-auto p-[8px]"
						>
							{filteredItems.length === 0
								? (empty ?? (
										<div
											role="presentation"
											className="ft-command-menu-empty text-muted-foreground rounded-[8px] px-[12px] py-[8px] text-[13px]"
										>
											{emptyMessage}
										</div>
									))
								: groups.map((group) => (
										<Fragment key={group.name ?? "__ft_ungrouped__"}>
											{group.name ? (
												<div
													role="presentation"
													className="ft-command-menu-heading text-muted-foreground/60 px-[12px] py-[4px] text-[10px] font-medium tracking-[.08em] uppercase"
												>
													{group.name}
												</div>
											) : null}
											{group.rows.map(({ item, index }) => {
												const range = getMatchRange(item.label, query);
												return (
													/*
														`onMouseDown` defends against a real browser's
														focus-follows-mousedown default action stealing
														focus onto this row before its own `onClick`
														commits — without it, that focus shift blurs the
														input first, which nothing here reacts to
														directly, but the whole point of this pattern is
														that focus never leaves the input at all. jsdom
														implements no such default action to suppress, so
														no test in this folder can watch this guard
														prevent that outcome — only that the call
														happens. Do not delete this as dead code on the
														strength of a green suite.
													*/
													<button
														key={item.id}
														type="button"
														id={optionId(index)}
														role="option"
														tabIndex={-1}
														disabled={item.disabled}
														aria-selected={activeIndex === index}
														aria-disabled={item.disabled ? "true" : undefined}
														className={cn(
															"ft-command-menu-row flex w-full items-center justify-between gap-3 rounded-[8px] px-[12px] py-[8px] text-left text-[13px]",
															activeIndex === index && !item.disabled
																? "bg-accent text-accent-foreground"
																: "text-foreground",
															item.disabled && "pointer-events-none opacity-50"
														)}
														onMouseDown={(event) => event.preventDefault()}
														onClick={() => commitItem(item)}
													>
														<span className="flex min-w-0 flex-1 items-center gap-2">
															{icon ? (
																<span aria-hidden="true" className="shrink-0">
																	{icon(item)}
																</span>
															) : null}
															<span className="min-w-0 truncate">
																{range ? (
																	<>
																		{item.label.slice(0, range.start)}
																		<mark>{item.label.slice(range.start, range.end)}</mark>
																		{item.label.slice(range.end)}
																	</>
																) : (
																	item.label
																)}
															</span>
														</span>
														{item.meta ? (
															<span className="shrink-0 text-[11px] opacity-60">{item.meta}</span>
														) : null}
													</button>
												);
											})}
										</Fragment>
									))}
						</div>

						{/* Always mounted while the panel is, whether or not the count has
						    settled — an element that only appears at the same moment its own
						    text does usually goes unread. Content is a debounced count,
						    never the item list itself. No `open ? … : ""` guard needed here:
						    this whole block only ever renders inside the presence gate, so
						    the region unmounting on close (not a text change) is what clears
						    it — see the "clears immediately on close" test. */}
						<div className="sr-only" role="status" aria-live="polite">
							{resultsMessage}
						</div>
					</div>
				</>
			) : null}
		</Portal>
	);
});

CommandMenu.displayName = "CommandMenu";
