/**
 * The contract between the Autocomplete root and its portalled suggestions
 * panel.
 *
 * Autocomplete is an **open field**: `value` is free text and every one of
 * its characters is already valid the moment it is typed. `suggestions` are
 * advisory only — the panel is a shortcut for finishing a value the user
 * could have typed out in full, never a constraint on what `value` may be.
 * The root owns the filtering, the active row, and what a click or Enter on
 * a row does to `value`; the panel only reads this and calls back into it.
 */

import { createInternalContext } from "../../internals/dom/context.js";

export interface AutocompleteContext {
	/** Whether the panel is open. Read by the panel's own exit transition to
	 *  tell an entrance from a departure — one bidirectional transition
	 *  instance reports `direction: "both"` and cannot distinguish them.
	 *  Also the panel's dismissable `active` gate: the instant this flips
	 *  false the layer stops answering Escape, so a second Escape during the
	 *  fade reaches whatever is underneath instead of being swallowed by a
	 *  panel that is already leaving. */
	readonly open: boolean;
	/** The panel's own id — also what the input's `aria-controls` points at while open. */
	readonly panelId: string;
	/** The real input element, once mounted — what the panel anchors against and excludes from outside-click dismissal. */
	readonly inputRef: HTMLInputElement | null;
	/** The suggestions currently visible in the panel, already filtered and capped at `maxSuggestions`. */
	readonly suggestions: string[];
	/** The current value, for computing each row's highlighted span. */
	readonly query: string;
	/** Index of the keyboard-active row within `suggestions`, or -1 when none is active — arrowing highlights a row without writing it into the field. */
	readonly activeIndex: number;
	/** The dom id a row at this index must carry, so `aria-activedescendant` can point at it. */
	optionId(index: number): string;
	/** Whether the row at this index is the keyboard-active one. */
	isActive(index: number): boolean;
	/** Commits `suggestion` into the field and closes the panel. */
	select(suggestion: string): void;
	/** Closes the panel without touching `value` — arrowing never wrote into the field, so there is nothing to restore. */
	close(): void;
}

/**
 * The context the root publishes to its panel.
 *
 * The Svelte source keys this on a `unique symbol` passed to
 * `setContext`/`getContext`; React's own context object plays that role here,
 * under the same name, because the Svelte `index.ts` exports the key — so it
 * keeps its public identity on both sides.
 *
 * Read it with `AUTOCOMPLETE_KEY.useRequired()`: the panel is only ever
 * rendered by the root, so a missing provider is a programming error rather
 * than a degrade-gracefully case.
 */
export const AUTOCOMPLETE_KEY = createInternalContext<AutocompleteContext>("AUTOCOMPLETE_KEY");
