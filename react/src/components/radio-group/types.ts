/**
 * The contract between the radio group root and its items.
 *
 * Unlike ToggleGroup, this context does not reimplement roving focus,
 * arrow-key navigation or the tab stop: every item is a real
 * `<input type="radio">` sharing one `name`, and the browser already gives
 * all three away for free, correctly, on every platform. This context only
 * carries what the browser cannot infer on its own — which value is
 * selected, the shared `name` those inputs must all carry, and the
 * group-level `disabled`/`required` an item's own attributes fold into.
 */

import { createContext } from "react";

/** What the root publishes. Items read it; only the root writes it. */
export interface RadioGroupContext {
	/**
	 * The `name` every item's native radio must share so the browser treats
	 * them as one group. Always a real string, generated per instance with
	 * `useFancyId()` when the caller omits `name` — see `RadioGroup` — so it
	 * is correct from the very first server-rendered paint, not just once
	 * hydrated.
	 */
	readonly name: string;
	/** The selected value, or `""` when nothing is selected. */
	readonly value: string;
	/** Disables every item, regardless of its own `disabled` prop. */
	readonly disabled: boolean;
	/** Marks every item's native radio `required`, so the group counts as one required control for native form validation. */
	readonly required: boolean;
	/** Whether the group (or its surrounding FormField) is in an error state. */
	readonly invalid: boolean;
	/** Whether `itemValue` is the current selection. */
	isSelected(itemValue: string): boolean;
	/** Makes `itemValue` the selection and fires the group's `onValueChange`. */
	select(itemValue: string): void;
}

/**
 * The context a `RadioGroupItem` reads to learn the shared `name`, the
 * selection and the group-level flags. The Svelte source publishes it under a
 * `Symbol` context key; React's own context object plays that role here, so
 * the exported name is kept and the value is a `React.Context` rather than a
 * symbol:
 *
 * ```tsx
 * const group = useContext(RADIO_GROUP_KEY);
 * ```
 *
 * Read it as optional — an item rendered outside a `RadioGroup` gets
 * `undefined` rather than throwing, and renders as a plain, unchecked,
 * standalone radio.
 */
export const RADIO_GROUP_KEY = createContext<RadioGroupContext | undefined>(undefined);
RADIO_GROUP_KEY.displayName = "RadioGroupContext";
