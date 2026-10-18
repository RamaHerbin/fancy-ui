import { createInternalContext, type InternalContext } from "../../internals/dom/context.js";
import type { Side, Align } from "../../internals/anchor-position.js";

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
	/** Whether the panel is open. Drives the panel's own presence clock: the
	 *  mount gate lives one level DOWN from the source's `{#if open}`, inside
	 *  the panel itself, which is why `open` has to arrive through the context
	 *  at all. It is also the panel's dismissable `active` gate — the instant
	 *  this flips false the layer stops answering Escape, so a second Escape
	 *  during the fade reaches whatever is underneath instead of being
	 *  swallowed by a panel that is already leaving. */
	readonly open: boolean;
	/** The panel's own id — also what the trigger's `aria-controls` points at while open. */
	readonly panelId: string;
	/** The options to render as rows, in order. */
	readonly options: SelectOption[];
	/** The current value, `""` when nothing is selected. */
	readonly value: string;
	/** The trigger's own accessible name (the `label` prop), so the portalled
	 *  panel can carry the same name as `aria-label` — without this, a screen
	 *  reader announces the listbox as unnamed the instant it expands, even
	 *  though the combobox itself is named. `undefined` renders no attribute
	 *  at all, matching the trigger's own `aria-label={label}`. */
	readonly label: string | undefined;
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

/**
 * The counterpart of the source's bare `SELECT_KEY` symbol: the same context
 * published through the package's own key-plus-bindings helper, so the panel
 * reads it with `useRequired()` and gets a named error instead of `undefined`
 * if it is ever rendered outside a `Select`. The value is the source's getter
 * object, built once in `Select`'s setup and never replaced.
 *
 * Internal: `index.ts` exports `Select` and its two public types only.
 */
export const SELECT_CONTEXT: InternalContext<SelectContext> =
	createInternalContext<SelectContext>("SelectContext");
