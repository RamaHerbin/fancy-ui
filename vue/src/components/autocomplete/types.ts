import type { InjectionKey } from "vue";

import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";

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
export interface AutocompleteContext {
	/** Whether the panel is open. Drives the panel's own presence clock: the
	 *  mount gate lives one level DOWN from the source's `{#if open}`, inside
	 *  the panel itself, which is why `open` has to arrive through the context
	 *  at all. It is also what its entrance/exit leg reads to tell an arrival
	 *  from a departure — a single bidirectional transition reports its
	 *  direction as "both" and cannot distinguish them. Also the panel's
	 *  dismissable `active` gate: the instant this flips false the layer stops
	 *  answering Escape, so a second Escape during the fade reaches whatever is
	 *  underneath instead of being swallowed by a panel that is already
	 *  leaving. */
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
 * The same context published through the package's own key-plus-bindings
 * helper, so the panel reads it with `useRequired()` and gets a named error
 * instead of `undefined` if it is ever rendered outside an `Autocomplete`.
 * The value is the source's getter object, built once in the root's `setup`
 * and never replaced.
 */
export const AUTOCOMPLETE_CONTEXT: InternalContext<AutocompleteContext> =
	createInternalContext<AutocompleteContext>("AutocompleteContext");

/**
 * The public counterpart of the source's bare `AUTOCOMPLETE_KEY` symbol, kept
 * under the same name because it is part of this component's exported surface:
 * the key the context is published under, typed for `inject()`.
 */
export const AUTOCOMPLETE_KEY: InjectionKey<AutocompleteContext> = AUTOCOMPLETE_CONTEXT.key;
