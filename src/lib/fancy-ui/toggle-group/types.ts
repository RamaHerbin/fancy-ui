/**
 * The contract between the toggle group root and its items.
 *
 * `ToggleGroup` owns the selection and the roving-focus position; every item
 * reads and drives both through `getContext` instead of a prop and a
 * callback threaded down by hand for each of them. An item mounted outside a
 * group degrades to a plain, ungrouped button rather than throwing — see
 * `ToggleGroupItem`.
 *
 * The arrow-key sequence is never read off `register`/`unregister` order:
 * the root re-queries the live DOM at the moment a key is pressed, so items
 * that mount out of order, or that get reordered by a keyed `{#each}` after
 * mounting, still step through in the order they actually appear on screen.
 * Registration order is used only as the pre-interaction fallback for which
 * item starts out tabbable.
 */

/** What the root publishes. Items read it; only the root writes it. */
export interface ToggleGroupContext {
	/** Whether one value can be active at a time, or several. */
	readonly type: "single" | "multiple";
	/** The active values, always as an array — `type="single"` just keeps at most one. */
	readonly value: string[];
	/** Disables every item, regardless of its own `disabled` prop. */
	readonly disabled: boolean;
	/** Sizes every item. */
	readonly size: "sm" | "md" | "lg";
	/** The rail's stacking axis. Both arrow-key pairs work in either orientation — see `move`. */
	readonly orientation: "horizontal" | "vertical";
	/** Whether `itemValue` is part of the current selection. */
	isSelected(itemValue: string): boolean;
	/** Activates or deactivates `itemValue`, following `type`'s rule. */
	toggle(itemValue: string): void;
	/** Joins the roving-focus order. An item skips this entirely while disabled. */
	register(itemValue: string): void;
	/** Leaves the roving-focus order. */
	unregister(itemValue: string): void;
	/** The value that currently carries `tabindex="0"`, or `null` before anything has registered. */
	readonly focusedValue: string | null;
	/** Marks `itemValue` as the roving-focus position, without moving DOM focus. */
	focus(itemValue: string): void;
	/**
	 * Moves the roving-focus position `delta` steps from `from` in DOM order,
	 * skipping disabled items and wrapping at both ends, and moves DOM focus
	 * along with it.
	 */
	move(from: string, delta: number): void;
	/** Moves the roving-focus position, and DOM focus, to the first or last enabled item in DOM order. */
	moveToEdge(edge: "first" | "last"): void;
}

export const TOGGLE_GROUP_KEY: unique symbol = Symbol("toggle-group-context");
