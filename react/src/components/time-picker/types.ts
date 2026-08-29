import { createInternalContext } from "../../internals/dom/context.js";

/**
 * The contract between the `TimePicker` trigger and its portalled listbox
 * panel — the same split `Select`/`SelectPanel` use, for the same reason:
 * the root owns the slot list, the value and where the active (highlighted)
 * index sits, and the panel only ever reads that or reports back through
 * `setActive`/`commit`.
 */
export interface TimePickerContext {
	/** Whether the panel is open. Read by the panel's own presence clock, which
	 *  needs it to tell an entrance from a departure. Also the panel's
	 *  dismissable `active` gate: the instant this flips false the layer stops
	 *  answering Escape, so a second Escape during the fade reaches whatever is
	 *  underneath instead of being swallowed by a panel that is already
	 *  leaving. */
	readonly open: boolean;
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

/**
 * The React counterpart of the source's `TIME_PICKER_KEY` symbol: a context
 * object plus its readers, per the internals contract's naming table
 * (`FOO_KEY` → `FooReactContext` + `useFoo()`).
 *
 * Not re-exported from this folder's `index.ts`, because the source barrel
 * does not export `TIME_PICKER_KEY` either — the trigger/panel wiring is
 * private to the pair.
 */
export const TimePickerReactContext = createInternalContext<TimePickerContext>(
	"TimePicker context"
);

/** Reads the surrounding `TimePicker`'s context. Throws outside one, which is
 *  the compound-component contract: `TimePickerPanel` is only ever rendered by
 *  `TimePicker`, so there is no standalone-usage fallback to design for — the
 *  same as the source's `getContext(TIME_PICKER_KEY)` with no fallback branch. */
export const useTimePickerContext = TimePickerReactContext.useRequired;
