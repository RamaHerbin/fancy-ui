import { forwardRef, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import {
	getMonthGrid,
	addMonths,
	isSameDay,
	clampDate,
	formatISODate,
} from "../../internals/calendar-core.js";
import type { WeekStartsOn } from "../../internals/calendar-core.js";
import {
	addDays,
	dayOnly,
	findEnabledDay,
	findEnabledInRow,
	formatDayAccessibleName,
	formatMonthYear,
	formatTriggerDate,
	getWeekdayNames,
	isDayInRange,
} from "./date-utils.js";
import "./date-picker.css";

export interface DatePickerProps {
	/**
	 * The selected date, or `null` for none. Always a local-midnight `Date` —
	 * see the README.
	 *
	 * Controlled when passed (`null` included): the caller owns it and writes
	 * the value back from `onValueChange`. Left out entirely, the component
	 * keeps its own copy and still reports every change — the React spelling
	 * of the source's `$bindable(null)`.
	 */
	value?: Date | null;
	/** Called with the new value whenever a day is picked. */
	onValueChange?: (value: Date | null) => void;
	/** Earliest selectable day (inclusive), compared at day granularity. */
	min?: Date;
	/** Latest selectable day (inclusive), compared at day granularity. */
	max?: Date;
	/** 0 for Sunday, 1 for Monday. Defaults to 1, matching the mockup. */
	weekStartsOn?: WeekStartsOn;
	/** Blocks opening the panel; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Marks the field required for the surrounding form. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name` — when set, a hidden input carries the ISO date so the value participates in real form submission. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Shown in the trigger while no day is selected. */
	placeholder?: string;
	/** BCP 47 locale for month, weekday, day and trigger-label formatting. Defaults to the runtime's own locale. */
	locale?: string;
	/** Rejects individual days beyond `min`/`max` — e.g. weekends, holidays. */
	isDateDisabled?: (date: Date) => boolean;
	/** Additional CSS classes, merged onto the trigger button. */
	className?: string;
}

/**
 * A calendar picker behind a combobox trigger, with a portalled, anchored
 * panel and full roving-focus keyboard navigation over the day grid.
 *
 * The trigger button arrives through the ref channel rather than a `ref`
 * prop, per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the source reads only these props off `$props()`
 * and has no `...restProps`, so the port carries no wider attribute surface
 * than the component it mirrors.
 */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
	{
		value: valueProp,
		onValueChange,
		min,
		max,
		weekStartsOn = 1,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		placeholder = "Pick a date",
		locale,
		isDateDisabled,
		className,
	},
	forwardedRef
) {
	// Undefined outside a FormField — every `effective*` below then falls back
	// to this component's own props instead of the context, so the control
	// works standalone exactly as it does wrapped. A `<button>` is one of the
	// elements `<label for>` can target, so this control uses `controlId`
	// rather than `labelId`/`aria-labelledby`, the same choice Input makes.
	const field = useField();

	const effectiveId = field?.controlId ?? id;
	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;

	const uid = useFancyId();
	const panelId = `${uid}-panel`;

	// The source's `value = $bindable(null)`. React has no such channel, so
	// the prop is controlled when it is passed and this local copy takes over
	// when it is not. Either way `onValueChange` fires identically.
	const [uncontrolledValue, setUncontrolledValue] = useState<Date | null>(null);
	const isControlled = valueProp !== undefined;
	const value = isControlled ? valueProp : uncontrolledValue;

	const [open, setOpen] = useState(false);

	// Convention C-1: the NODE, not a ref, for both elements. The panel is
	// created by `presence.mounted`, so a `useRef` + `[]`-deps effect would
	// still be holding `null` when the positioning and dismissable effects
	// fire; the trigger is the anchor those effects read.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();
	const [triggerNode, setTriggerNode] = useElementRef<HTMLButtonElement>();
	const triggerRef = useComposedRefs(setTriggerNode, forwardedRef);

	// The displayed month (only year/month are read off this) and the day
	// currently carrying the grid's one `tabindex="0"` — the roving-focus
	// position. Both are re-seeded from `value` (or today) every time the
	// panel opens, in `openPanel` below, not derived from `value` directly:
	// once open, paging through months must not snap back just because
	// `value` itself hasn't changed yet.
	//
	// `null` while the panel has never been opened, rather than seeded with
	// `new Date()` at construction: a "now" read in a render path or lazy
	// initializer is forbidden (convention C-7), and nothing reads either
	// value until `openPanel` has seeded them anyway.
	const [viewDate, setViewDate] = useState<Date | null>(null);
	const [focusedDate, setFocusedDateState] = useState<Date | null>(null);

	function isDayDisabled(date: Date): boolean {
		return !isDayInRange(date, min, max) || (isDateDisabled?.(date) ?? false);
	}

	const weekdayNames = getWeekdayNames(weekStartsOn, locale);
	const monthLabel = viewDate ? formatMonthYear(viewDate, locale) : "";
	const triggerLabel = formatTriggerDate(value, locale);

	// Re-focuses the DOM to whichever cell matches `focusedDate` whenever it
	// (or `open`) changes, once the grid reflecting it has actually rendered —
	// which is what a passive effect keyed on the same values guarantees.
	// Queried fresh via `data-ft-date` rather than cached refs — the same
	// "requery live DOM" choice ToggleGroup's roving focus makes — so a month
	// switch that swaps every cell out from under a stale ref is never an
	// issue.
	useEffect(() => {
		if (!open || !focusedDate) return;
		panel?.querySelector<HTMLElement>(`[data-ft-date="${formatISODate(focusedDate)}"]`)?.focus();
	}, [open, focusedDate, panel]);

	function setFocusedDate(date: Date) {
		setFocusedDateState(date);
		setViewDate((view) =>
			!view || date.getFullYear() !== view.getFullYear() || date.getMonth() !== view.getMonth()
				? new Date(date.getFullYear(), date.getMonth(), 1)
				: view
		);
	}

	function openPanel() {
		if (effectiveDisabled) return;
		const seed = value ? dayOnly(value) : dayOnly(new Date());
		setViewDate(new Date(seed.getFullYear(), seed.getMonth(), 1));
		setFocusedDateState(seed);
		setOpen(true);
	}

	// Closing always returns focus to the trigger, whether the close came from
	// Enter/click selecting a day, Escape, or an outside click — there is no
	// focus trap here (see the README) to fall back on, and without this an
	// Escape press would leave focus on a grid cell about to be removed from
	// the DOM, which browsers resolve by dropping focus to `<body>` — a real
	// loss for a keyboard user, not just a cosmetic one. A plain function, so
	// it returns focus in the same tick as the dismiss — this component needs
	// no focus-trap handle to satisfy the eager-return rule.
	function closePanel() {
		setOpen(false);
		triggerNode?.focus();
	}

	function toggle() {
		if (open) closePanel();
		else openPanel();
	}

	function commit(date: Date) {
		if (isDayDisabled(date)) return;
		if (!isControlled) setUncontrolledValue(date);
		onValueChange?.(date);
		closePanel();
	}

	function moveDays(delta: number) {
		if (!focusedDate) return;
		const direction = delta > 0 ? 1 : -1;
		const found = findEnabledDay(addDays(focusedDate, delta), direction, isDayDisabled);
		if (found) setFocusedDate(found);
	}

	function moveToWeekEdge(edge: "start" | "end") {
		if (!focusedDate) return;
		const found = findEnabledInRow(focusedDate, weekStartsOn, edge, isDayDisabled);
		if (found) setFocusedDate(found);
	}

	function moveMonths(n: number) {
		if (!focusedDate) return;
		const raw = addMonths(focusedDate, n);
		let target = raw;
		// Ordinarily the fallback search follows the page direction (`n`'s
		// sign): paging forward and landing on a disabled day looks further
		// forward for the next enabled one. But when min/max clamping actually
		// pulled `target` back into range, the side it moved away from is
		// guaranteed disabled — that is exactly what `isDayDisabled`'s own
		// min/max check rejects — so continuing in the original direction
		// would walk straight back out of range and exhaust the whole bounded
		// search for nothing, silently leaving the keypress a no-op. Search
		// toward the interior instead: `raw` landed before `min` and got
		// pulled forward (`target > raw`) → keep searching forward; `raw`
		// landed after `max` and got pulled back (`target < raw`) → search
		// backward.
		let searchDirection: 1 | -1 = n >= 0 ? 1 : -1;
		if (min || max) {
			target = clampDate(raw, min, max);
			if (target.getTime() !== raw.getTime()) {
				searchDirection = target.getTime() > raw.getTime() ? 1 : -1;
			}
		}
		const found = isDayDisabled(target)
			? findEnabledDay(target, searchDirection, isDayDisabled)
			: target;
		if (found) setFocusedDate(found);
	}

	function handleGridKeydown(event: KeyboardEvent<HTMLTableElement>) {
		if (!focusedDate) return;
		switch (event.key) {
			case "ArrowRight":
				moveDays(1);
				break;
			case "ArrowLeft":
				moveDays(-1);
				break;
			case "ArrowDown":
				moveDays(7);
				break;
			case "ArrowUp":
				moveDays(-7);
				break;
			case "Home":
				moveToWeekEdge("start");
				break;
			case "End":
				moveToWeekEdge("end");
				break;
			case "PageUp":
				moveMonths(event.shiftKey ? -12 : -1);
				break;
			case "PageDown":
				moveMonths(event.shiftKey ? 12 : 1);
				break;
			case "Enter":
			case " ":
				commit(focusedDate);
				break;
			default:
				return;
		}
		event.preventDefault();
	}

	const presence = usePresence(open);

	// The placement as ACTUALLY resolved, which differs from the requested one
	// whenever a flip avoided the viewport edge (side) or clamping slid the
	// panel along the cross axis (align). `useAnchorPosition` seeds both with
	// the REQUESTED values, so an un-flipped panel reads the right growth
	// origin on its very first frame and only a real flip ever moves it.
	const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
		anchor: triggerNode,
		side: "bottom",
		align: "start",
		offset: 8,
	});

	// `active: open` — a plain boolean where the source needed `() => open`.
	// The layer stays ON the stack for its whole exit and stops being TOP of
	// it the instant `open` flips, so a second Escape during the fade is a
	// no-op and whatever is underneath gets it instead.
	useDismissable(panel, {
		onDismiss: closePanel,
		exclude: [triggerNode],
		active: open,
	});

	// Convention C-2: composed ABOVE the conditional below.
	//
	// ONE bidirectional leg, never a split in/out pair: a calendar reopened
	// mid-exit continues from where it is instead of snapping to invisible
	// first. The factory is called with the direction at the instant each leg
	// starts, which is what the source's `entering: open` is for — a single
	// bidirectional instance reports `direction: "both"` and cannot tell the
	// two apart on its own.
	const panelRef = useComposedRefs(
		setPanelNode,
		presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
	);

	const classes = cn(
		"ft-date-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid && "border-destructive/50",
		className
	);

	// Only year/month are ever read off `viewDate`; the grid is rebuilt fresh
	// each render, exactly as the source's `$derived` recomputes it.
	const weeks = viewDate
		? getMonthGrid(viewDate.getFullYear(), viewDate.getMonth(), weekStartsOn)
		: [];

	/*
		`data-state` on the panel is an ordinary React attribute (divergence
		D-2) carrying `surfaceState`'s TWO values — never `"opening"`
		(convention C-5). The source had to write it imperatively from a
		transition handler because its scheduler skips effects inside a branch
		it has marked inert; React re-renders an exiting surface normally.

		`inert` is not written by hand either: `usePresence` sets it on the
		registered node for the whole exit, so a day cell cannot take a click
		on its way out.

		`data-align` reports the REQUESTED alignment, as the source does,
		while the growth origin uses the RESOLVED one.
	*/
	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				role="combobox"
				id={effectiveId}
				name={name}
				className={classes}
				disabled={effectiveDisabled}
				aria-haspopup="grid"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				aria-required={effectiveRequired ? "true" : undefined}
				aria-invalid={effectiveInvalid ? "true" : undefined}
				aria-describedby={field?.describedBy}
				aria-label={label}
				onClick={toggle}
			>
				<span className={triggerLabel ? undefined : "text-muted-foreground"}>
					{triggerLabel ?? placeholder}
				</span>
				<span aria-hidden="true" className="text-muted-foreground">
					📅
				</span>
			</button>

			{name ? (
				/* Real form participation for a control with no native input
				   underneath. ISO (YYYY-MM-DD), the same shape a native
				   `<input type="date">` submits. `disabled` mirrors the
				   trigger's own effective disabled state, so a disabled
				   DatePicker is excluded from submission exactly like a
				   disabled native control would be. React's missing-onChange
				   warning exempts `type="hidden"`, so no handler is needed. */
				<input
					type="hidden"
					name={name}
					value={value ? formatISODate(value) : ""}
					disabled={effectiveDisabled}
				/>
			) : null}

			<Portal>
				{presence.mounted && viewDate && focusedDate ? (
					<div
						ref={panelRef}
						id={panelId}
						className="ft-date-picker-panel border-border bg-popover text-popover-foreground flex w-max flex-col gap-2 rounded-[10px] border p-[12px] shadow-lg outline-none"
						data-state={presence.surfaceState}
						data-side={resolvedSide}
						data-align="start"
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
					>
						<div className="flex items-center justify-between gap-2 text-[12px] font-semibold">
							<button
								type="button"
								className="ft-date-picker-nav text-muted-foreground cursor-pointer"
								aria-label="Previous month"
								onClick={() => moveMonths(-1)}
							>
								‹
							</button>
							<span>{monthLabel}</span>
							<button
								type="button"
								className="ft-date-picker-nav text-muted-foreground cursor-pointer"
								aria-label="Next month"
								onClick={() => moveMonths(1)}
							>
								›
							</button>
						</div>

						<table
							role="grid"
							aria-label={monthLabel}
							className="border-collapse text-[11px]"
							onKeyDown={handleGridKeydown}
						>
							<thead>
								<tr>
									{weekdayNames.map((weekdayName, weekdayIndex) => (
										<th
											key={weekdayIndex}
											role="columnheader"
											scope="col"
											className="text-muted-foreground px-1 py-1 font-normal"
										>
											{weekdayName}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{weeks.map((week, weekIndex) => (
									/* No explicit role="row": `<tr>` already has an
									   implicit ARIA row role inside a table[role=grid]
									   — restating it is flagged as redundant. */
									<tr key={weekIndex}>
										{week.map((day) => {
											const iso = formatISODate(day.date);
											const dayDisabled = isDayDisabled(day.date);
											const dayFocused = isSameDay(day.date, focusedDate);
											const daySelected = value ? isSameDay(day.date, value) : false;
											return (
												<td
													key={iso}
													role="gridcell"
													data-ft-date={iso}
													tabIndex={dayFocused ? 0 : -1}
													aria-selected={daySelected}
													aria-disabled={dayDisabled ? "true" : undefined}
													aria-label={formatDayAccessibleName(day.date, locale)}
													className={cn(
														"ft-date-picker-day cursor-pointer rounded-[6px] px-1 py-1 text-center",
														!day.inMonth && "text-muted-foreground",
														dayDisabled && "cursor-not-allowed opacity-40",
														daySelected && "bg-accent text-accent-foreground"
													)}
													onClick={() => {
														if (dayDisabled) return;
														setFocusedDate(day.date);
														commit(day.date);
													}}
												>
													{day.date.getDate()}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</Portal>

			{/* Always mounted, closed or open — an id inserted at the same moment
			    as its text usually goes unread, so a screen reader hears the new
			    month the instant paging lands, not only "something changed" a
			    beat later. */}
			<div className="sr-only" role="status" aria-live="polite">
				{open ? monthLabel : ""}
			</div>
		</>
	);
});

DatePicker.displayName = "DatePicker";
