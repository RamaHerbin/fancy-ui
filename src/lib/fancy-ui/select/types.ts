import type { Side, Align } from "../_internals/anchor-position.js";

/**
 * One selectable entry in a `Select`'s option list.
 *
 * A plain data shape, not a child component: `Select`'s whole API is driven
 * off an `options` array (closer to a native `<select>`'s `<option>` list
 * than to `RadioGroup`'s caller-composed items), so there is no
 * `SelectOption` component to import alongside it.
 */
export interface SelectOption {
	/** The value this option represents — what `Select`'s own `value` becomes when it is picked. */
	value: string;
	/** Visible text for this option, both in the trigger once selected and as a row in the panel. */
	label: string;
	/** Skips this option in keyboard navigation, typeahead, and pointer selection. */
	disabled?: boolean;
}

/**
 * The contract between the `Select` trigger and its portalled listbox panel.
 *
 * `Select` owns the value, the option list, and where the active (highlighted)
 * index sits — everything the panel only ever reads or reports back through
 * `setActive`/`commit`. The panel never assigns `value` itself; `commit`
 * routes back through the root so `onValueChange` and the closing of the
 * panel stay in the one place that already handles both for every other way
 * a selection can be made (Enter, Tab, closed-state typeahead).
 */
export interface SelectContext {
	/** The panel's own id — also what the trigger's `aria-controls` points at while open. */
	readonly panelId: string;
	/** The options to render as rows, in order. */
	readonly options: SelectOption[];
	/** The current value, `""` when nothing is selected. */
	readonly value: string;
	/** Index of the highlighted option, or -1 when nothing is active. */
	readonly activeIndex: number;
	/** Side of the trigger to place the panel on. */
	readonly side: Side;
	/** Alignment along the trigger's cross axis. */
	readonly align: Align;
	/** The real trigger button — what the panel anchors against and excludes from its own outside-click check. */
	readonly triggerRef: HTMLElement | null;
	/** The id a given option row must carry — also what `aria-activedescendant` points at while it's active. */
	optionId(index: number): string;
	/** Whether the option at `index` is the current selection. */
	isSelected(index: number): boolean;
	/** Whether the option at `index` is the highlighted (`aria-activedescendant`) one. */
	isActive(index: number): boolean;
	/** Highlights `index` without selecting it — a pointer hover, not a commit. */
	setActive(index: number): void;
	/** Selects the option at `index` and closes the panel, the same way Enter does. */
	commit(index: number): void;
	/** Closes the panel without changing the value — what Escape and an outside click do. */
	close(): void;
}

export const SELECT_KEY: unique symbol = Symbol("select-context");
