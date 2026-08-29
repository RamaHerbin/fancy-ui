/**
 * The contract between the Combobox root and its portalled listbox panel.
 *
 * Combobox is a **closed set**: `options` is the only vocabulary of valid
 * values, and the root owns everything that decides which of them are
 * currently visible, which is active for keyboard navigation, and how a
 * click or Enter on a row resolves back into `value`. The panel only ever
 * reads this and calls back into it — it never touches `value` or `query`
 * directly, the same division a popover context draws between a root and its
 * content.
 */

import { createInternalContext } from "../../internals/dom/context.js";

/** One selectable option. `value` is what `Combobox` reads and writes; `label` is what a person sees and types against. */
export interface ComboboxOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface ComboboxContext {
	/** Whether the panel is open. Read by the panel's own exit transition to
	 *  tell an entrance from a departure — one bidirectional transition
	 *  cannot distinguish them on its own. Also the panel's dismissable
	 *  `active` gate: the instant this flips false the layer stops answering
	 *  Escape, so a second Escape during the fade reaches whatever is
	 *  underneath instead of being swallowed by a panel that is already
	 *  leaving. */
	readonly open: boolean;
	/** The panel's own id — also what the input's `aria-controls` points at while open. */
	readonly panelId: string;
	/** The real input element, once mounted — what the panel anchors against and excludes from outside-click dismissal. */
	readonly inputRef: HTMLInputElement | null;
	/** The options currently visible in the panel, already filtered by the current query. */
	readonly options: ComboboxOption[];
	/** The current query text, for computing each row's highlighted span. */
	readonly query: string;
	/** Index of the keyboard-active row within `options`, or -1 when none is active. */
	readonly activeIndex: number;
	/** Shown in place of the option list when `options` is empty. */
	readonly emptyMessage: string;
	/** The dom id a row at this index must carry, so `aria-activedescendant` can point at it. */
	optionId(index: number): string;
	/** Whether the row at this index is the keyboard-active one. */
	isActive(index: number): boolean;
	/** Commits `option` as the selection and closes the panel. No-ops for a disabled option. */
	selectOption(option: ComboboxOption): void;
	/** Closes the panel, resolving the query back to the current value's label (or clearing it). Routes Escape, outside click, and blur through the same rule. */
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
 * Read it with `COMBOBOX_KEY.useRequired()`: the panel is only ever rendered
 * by the root, so a missing provider is a programming error rather than a
 * degrade-gracefully case.
 */
export const COMBOBOX_KEY = createInternalContext<ComboboxContext>("COMBOBOX_KEY");
