/**
 * The contract between the `TimePicker` trigger and its portalled listbox
 * panel — the same split `Select`/`SelectPanel` use, for the same reason:
 * the root owns the slot list, the value and where the active (highlighted)
 * index sits, and the panel only ever reads that or reports back through
 * `setActive`/`commit`.
 */
export interface TimePickerContext {
	/** The panel's own id — also what the trigger's `aria-controls` points at while open. */
	readonly panelId: string;
	/** The "HH:mm" slots to render as rows, in order. */
	readonly slots: string[];
	/** Index of the highlighted option, or -1 when nothing is active. */
	readonly activeIndex: number;
	/** Display label for a slot, honouring `hour12`/`locale`. */
	labelFor(slot: string): string;
	/** The real trigger button — what the panel anchors against and excludes from its own outside-click check. */
	readonly triggerRef: HTMLElement | null;
	/** The id a given option row must carry — also what `aria-activedescendant` points at while it's active. */
	optionId(index: number): string;
	/** Whether the slot at `index` is the current selection. */
	isSelected(index: number): boolean;
	/** Whether the slot at `index` is the highlighted (`aria-activedescendant`) one. */
	isActive(index: number): boolean;
	/** Highlights `index` without selecting it — a pointer hover, not a commit. */
	setActive(index: number): void;
	/** Selects the slot at `index` and closes the panel, the same way Enter does. */
	commit(index: number): void;
	/** Closes the panel without changing the value — what Escape and an outside click do. */
	close(): void;
}

export const TIME_PICKER_KEY: unique symbol = Symbol("time-picker-context");
