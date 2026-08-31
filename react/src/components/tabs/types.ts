/**
 * The contract between the tabs root and its list/trigger/content pieces.
 *
 * `Tabs` owns the active value and the roving-focus position; `TabsTrigger`
 * and `TabsContent` read both through context instead of a prop and a
 * callback threaded down by hand for each of them.
 *
 * The arrow-key sequence is never read off `register`/`unregister` order:
 * the root re-queries the live DOM at the moment a key is pressed, so
 * triggers that mount out of order, or that get reordered by a keyed list
 * after mounting, still step through in the order they actually appear on
 * screen. Registration order is used only as the pre-interaction fallback
 * for which trigger starts out tabbable — the same split `ToggleGroup` uses,
 * for the same reason.
 */

import { createContext } from "react";

/** What the root publishes. `TabsTrigger`/`TabsContent` read it; only the root writes it. */
export interface TabsContext {
	/** The active tab's value. */
	readonly value: string;
	/** The tablist's stacking axis and which arrow-key pair moves it. */
	readonly orientation: "horizontal" | "vertical";
	/** Whether arrowing to a trigger selects it immediately, or only moves focus. */
	readonly activation: "automatic" | "manual";
	/** Visual treatment, published so both `TabsList` and `TabsTrigger` render in step. */
	readonly variant: "underline" | "segmented";
	/** Whether `itemValue` is the active tab. */
	isSelected(itemValue: string): boolean;
	/** Makes `itemValue` the active tab and fires the root's `onValueChange`. */
	select(itemValue: string): void;
	/**
	 * Joins the roving-focus order. A trigger skips this entirely while disabled.
	 *
	 * Identity-stable for the life of the root: it is called from a trigger's own
	 * effect and therefore appears in that effect's dependency list. This is the
	 * React counterpart of the `untrack` the Svelte source wraps the body in —
	 * there, an effect that reads the registry it just mutated alternates between
	 * register and unregister until the scheduler gives up; here, a context member
	 * whose identity changed on every root render would re-run the same effect on
	 * every root render, unregistering and re-registering forever. The state
	 * updater is also a no-op returning the *same* array when nothing changes, so
	 * a duplicate register never schedules a render.
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
	 * skipping disabled triggers and wrapping at both ends, and moves DOM
	 * focus along with it. With `activation="automatic"` this also selects
	 * the trigger it lands on.
	 */
	move(from: string, delta: number): void;
	/**
	 * Moves the roving-focus position, and DOM focus, to the first or last
	 * enabled trigger in DOM order. With `activation="automatic"` this also
	 * selects it.
	 */
	moveToEdge(edge: "first" | "last"): void;
	/**
	 * Moves real DOM focus to `itemValue`'s trigger, if it is currently
	 * registered and enabled, and updates the roving-focus position to
	 * match. Distinct from `focus()`, which only updates the roving-focus
	 * position without touching DOM focus: this exists for the one case
	 * where DOM focus itself has to follow, because the element that held
	 * it just left the roving order — typically because it just became
	 * disabled out from under a keyboard user.
	 *
	 * Identity-stable, for the same reason as `register`: a trigger reads it
	 * from an effect's dependency list.
	 */
	focusElement(itemValue: string): void;
	/** The id a `TabsTrigger` for `itemValue` renders, and the matching `TabsContent`'s `aria-labelledby` target. */
	triggerId(itemValue: string): string;
	/** The id a `TabsContent` for `itemValue` renders, and the matching `TabsTrigger`'s `aria-controls` target. */
	panelId(itemValue: string): string;
}

/**
 * The context a list/trigger/panel reads to find its surrounding root. The
 * Svelte source publishes it under a `Symbol` context key; React's own context
 * object plays that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol:
 *
 * ```tsx
 * const tabs = useContext(TABS_KEY);
 * ```
 *
 * Read it as optional — a piece rendered outside a `Tabs` root gets
 * `undefined` rather than throwing.
 */
export const TABS_KEY = createContext<TabsContext | undefined>(undefined);
TABS_KEY.displayName = "TabsContext";
