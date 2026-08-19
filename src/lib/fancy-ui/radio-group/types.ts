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

/** What the root publishes. Items read it; only the root writes it. */
export interface RadioGroupContext {
	/**
	 * The `name` every item's native radio must share so the browser treats
	 * them as one group. Always a real string, generated per instance with
	 * `$props.id()` when the caller omits `name` — see `RadioGroup` — so it
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

export const RADIO_GROUP_KEY: unique symbol = Symbol("radio-group-context");
