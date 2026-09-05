/**
 * The contract between the toggle group root and its items.
 *
 * `ToggleGroup` owns the selection and the roving-focus position; every item
 * reads and drives both through context instead of a prop and a callback
 * threaded down by hand for each of them. An item mounted outside a group
 * degrades to a plain, ungrouped button rather than throwing — see
 * `ToggleGroupItem`.
 *
 * The arrow-key sequence is never read off `register`/`unregister` order:
 * the root re-queries the live DOM at the moment a key is pressed, so items
 * that mount out of order, or that get reordered by a keyed list after
 * mounting, still step through in the order they actually appear on screen.
 * Registration order is used only as the pre-interaction fallback for which
 * item starts out tabbable.
 */

import { createContext } from "react";

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
	/**
	 * Joins the roving-focus order. An item skips this entirely while disabled.
	 *
	 * Identity-stable for the life of the root: it is called from an item's own
	 * effect and therefore appears in that effect's dependency list. This is
	 * the React counterpart of the `untrack` the Svelte source wraps the body
	 * in — there, an effect that reads the registry it just mutated alternates
	 * between register and unregister until the scheduler gives up; here, a
	 * context member whose identity changed on every root render would re-run
	 * the same effect on every root render, unregistering and re-registering
	 * forever. The state updater is also a no-op returning the *same* array
	 * when nothing changes, so a duplicate register never schedules a render.
	 */
	register(itemValue: string): void;
	/** Leaves the roving-focus order. Identity-stable, for the same reason as `register`. */
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

/**
 * The context an item reads to find its surrounding group. The Svelte source
 * publishes it under a `Symbol` context key; React's own context object plays
 * that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol:
 *
 * ```tsx
 * const group = useContext(TOGGLE_GROUP_KEY);
 * ```
 *
 * Read it as optional — an item rendered outside a `ToggleGroup` gets
 * `undefined` rather than throwing.
 */
export const TOGGLE_GROUP_KEY = createContext<ToggleGroupContext | undefined>(undefined);
TOGGLE_GROUP_KEY.displayName = "ToggleGroupContext";
