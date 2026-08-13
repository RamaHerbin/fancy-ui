/**
 * The contract between the `NavigationMenu` root and the compound pieces
 * nested inside it (`NavigationMenuList` down to `NavigationMenuLink`).
 *
 * Two separate contexts, not one. The root context below is shared by every
 * descendant and owns the single source of truth: which item (if any) is
 * open, the hover-intent timers, and the roving-tabindex position across the
 * trigger row. The item context is re-provided by each `NavigationMenuItem`
 * and only ever holds that one item's own identity — its `value` and the id
 * pair that links its trigger to its panel via `aria-controls` /
 * `aria-labelledby`. A `NavigationMenuTrigger` or `NavigationMenuContent`
 * reads both: the item context to know who it is, the root context to know
 * (and change) what is open.
 */

/** What the root publishes. Every compound piece reads it; only the root writes it. */
export interface NavigationMenuContext {
	/** The currently open item's value, or `""` when every panel is closed. */
	readonly value: string;
	/** Delay in ms before a hovered trigger opens its panel. */
	readonly openDelay: number;
	/** Delay in ms before a panel closes after the pointer leaves it and its trigger. */
	readonly closeDelay: number;
	/** The trigger row's element, once mounted. Every panel anchors against this, not against its own trigger. */
	readonly listRef: HTMLElement | null;
	/** The value that currently carries `tabindex="0"` on its trigger, or `null` before anything has registered. */
	readonly focusedValue: string | null;
	/** Registers the trigger row element that panels anchor against. */
	setListRef(element: HTMLElement | null): void;
	/** Looks up a trigger's own button element by its item value, once registered. */
	getTriggerElement(itemValue: string): HTMLElement | null;
	/** Joins the roving-focus order. Returns the matching unregister function; call it on destroy. */
	registerTrigger(itemValue: string): () => void;
	/** Opens `itemValue` immediately, closing whatever else was open. */
	open(itemValue: string): void;
	/** Closes the open panel immediately and returns focus to its trigger. */
	close(): void;
	/** Opens `itemValue` if it isn't already open, otherwise closes it. Used by a trigger's click. */
	toggle(itemValue: string): void;
	/**
	 * Pointer-intent open: starts the open delay, unless something else is
	 * already open, in which case it switches immediately with no delay — the
	 * pointer is moving along an already-open row, not arriving fresh.
	 */
	scheduleOpen(itemValue: string): void;
	/** Pointer-intent close: starts the close delay, giving the pointer time to travel into the panel. */
	scheduleClose(): void;
	/** Cancels a pending close — the pointer re-entered the trigger or the panel before the delay elapsed. */
	cancelClose(): void;
	/** Marks `itemValue` as owed a focus-into-panel move the next time its panel mounts. */
	requestFocus(itemValue: string): void;
	/** Consumes the focus request for `itemValue`, if there is one. Returns whether there was one. */
	consumeFocusRequest(itemValue: string): boolean;
	/** Closes `itemValue`'s panel without moving focus — used when focus tabs out of it on its own. */
	collapseIfOpen(itemValue: string): void;
	/** Marks `itemValue` as the roving-focus position, without moving DOM focus. */
	focus(itemValue: string): void;
	/**
	 * Moves the roving-focus position, and DOM focus, `delta` steps from
	 * `from` in DOM order, wrapping at both ends. If a panel is already open
	 * it follows the new focus immediately — the same "no re-delay" rule
	 * `scheduleOpen` applies to the pointer, applied to the keyboard too.
	 */
	move(from: string, delta: number): void;
	/** Moves the roving-focus position, and DOM focus, to the first or last trigger in DOM order. */
	moveToEdge(edge: "first" | "last"): void;
}

export const NAVIGATION_MENU_KEY: unique symbol = Symbol("navigation-menu-context");

/** What a `NavigationMenuItem` publishes to its own `NavigationMenuTrigger` and `NavigationMenuContent`. */
export interface NavigationMenuItemContext {
	/** This item's own value, as given to `NavigationMenuItem`. */
	readonly value: string;
	/** The trigger button's id — what the panel's `aria-labelledby` points at. */
	readonly triggerId: string;
	/** The panel's id — what the trigger's `aria-controls` points at while its panel exists. */
	readonly contentId: string;
}

export const NAVIGATION_MENU_ITEM_KEY: unique symbol = Symbol("navigation-menu-item-context");
