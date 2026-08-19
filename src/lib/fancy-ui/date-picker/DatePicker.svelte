<script lang="ts" module>
	import type { WeekStartsOn } from "../_internals/calendar-core.js";

	export interface DatePickerProps {
		/** The selected date, or `null` for none; bindable. Always a local-midnight `Date` — see the README. */
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
		class?: string;
		/** Bindable reference to the trigger button. */
		ref?: HTMLButtonElement | null;
	}
</script>

<script lang="ts">
	import { tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { anchorPosition } from "../_internals/anchor-position.js";
	import { portal } from "../_internals/portal.js";
	import { dismissable } from "../_internals/dismissable.js";
	import {
		getMonthGrid,
		addMonths,
		isSameDay,
		clampDate,
		formatISODate,
	} from "../_internals/calendar-core.js";
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

	let {
		value = $bindable(null),
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
		class: className,
		ref = $bindable(null),
	}: DatePickerProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. A `<button>` is one of the
	// elements `<label for>` can target, so this control uses `controlId`
	// rather than `labelId`/`aria-labelledby`, the same choice Input makes.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	const uid = $props.id();
	const panelId = `${uid}-panel`;

	let open = $state(false);
	let panelRef: HTMLDivElement | null = $state(null);

	// The displayed month (only year/month are read off this) and the day
	// currently carrying the grid's one `tabindex="0"` — the roving-focus
	// position. Both are re-seeded from `value` (or today) every time the
	// panel opens, in `openPanel` below, not derived from `value` directly:
	// once open, paging through months must not snap back just because
	// `value` itself hasn't changed yet.
	let viewDate = $state(dayOnly(new Date()));
	let focusedDate = $state(dayOnly(new Date()));

	function isDayDisabled(date: Date): boolean {
		return !isDayInRange(date, min, max) || (isDateDisabled?.(date) ?? false);
	}

	const weeks = $derived(getMonthGrid(viewDate.getFullYear(), viewDate.getMonth(), weekStartsOn));
	const weekdayNames = $derived(getWeekdayNames(weekStartsOn, locale));
	const monthLabel = $derived(formatMonthYear(viewDate, locale));
	const triggerLabel = $derived(formatTriggerDate(value, locale));

	// Re-focuses the DOM to whichever cell matches `focusedDate` whenever it
	// (or `open`) changes, once the grid reflecting it has actually rendered.
	// Queried fresh via `data-ft-date` rather than cached refs — the same
	// "requery live DOM" choice ToggleGroup's roving focus makes — so a month
	// switch that swaps every cell out from under a stale ref is never an
	// issue.
	$effect(() => {
		if (!open) return;
		const target = focusedDate;
		tick().then(() => {
			panelRef?.querySelector<HTMLElement>(`[data-ft-date="${formatISODate(target)}"]`)?.focus();
		});
	});

	function setFocusedDate(date: Date) {
		focusedDate = date;
		if (date.getFullYear() !== viewDate.getFullYear() || date.getMonth() !== viewDate.getMonth()) {
			viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
		}
	}

	function openPanel() {
		if (effectiveDisabled) return;
		const seed = value ? dayOnly(value) : dayOnly(new Date());
		viewDate = new Date(seed.getFullYear(), seed.getMonth(), 1);
		focusedDate = seed;
		open = true;
	}

	// Closing always returns focus to the trigger, whether the close came from
	// Enter/click selecting a day, Escape, or an outside click — there is no
	// focus trap here (see the README) to fall back on, and without this an
	// Escape press would leave focus on a grid cell about to be removed from
	// the DOM, which browsers resolve by dropping focus to `<body>` — a real
	// loss for a keyboard user, not just a cosmetic one.
	function closePanel() {
		open = false;
		ref?.focus();
	}

	function toggle() {
		if (open) closePanel();
		else openPanel();
	}

	function commit(date: Date) {
		if (isDayDisabled(date)) return;
		value = date;
		onValueChange?.(date);
		closePanel();
	}

	function moveDays(delta: number) {
		const direction = delta > 0 ? 1 : -1;
		const found = findEnabledDay(addDays(focusedDate, delta), direction, isDayDisabled);
		if (found) setFocusedDate(found);
	}

	function moveToWeekEdge(edge: "start" | "end") {
		const found = findEnabledInRow(focusedDate, weekStartsOn, edge, isDayDisabled);
		if (found) setFocusedDate(found);
	}

	function moveMonths(n: number) {
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

	function handleGridKeydown(event: KeyboardEvent) {
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

	const classes = $derived(
		cn(
			"ft-date-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);
</script>

<button
	bind:this={ref}
	type="button"
	role="combobox"
	id={effectiveId}
	{name}
	class={classes}
	disabled={effectiveDisabled}
	aria-haspopup="grid"
	aria-expanded={open}
	aria-controls={open ? panelId : undefined}
	aria-required={effectiveRequired ? "true" : undefined}
	aria-invalid={effectiveInvalid ? "true" : undefined}
	aria-describedby={field?.describedBy}
	aria-label={label}
	onclick={toggle}
>
	<span class={triggerLabel ? undefined : "text-muted-foreground"}>
		{triggerLabel ?? placeholder}
	</span>
	<span aria-hidden="true" class="text-muted-foreground">📅</span>
</button>

{#if name}
	<!-- Real form participation for a control with no native input underneath.
	     ISO (YYYY-MM-DD), the same shape a native `<input type="date">` submits.
	     `disabled` mirrors the trigger's own effective disabled state, so a
	     disabled DatePicker is excluded from submission exactly like a
	     disabled native control would be. -->
	<input
		type="hidden"
		{name}
		value={value ? formatISODate(value) : ""}
		disabled={effectiveDisabled}
	/>
{/if}

{#if open}
	<div
		bind:this={panelRef}
		id={panelId}
		class="ft-date-picker-panel border-border bg-popover text-popover-foreground flex w-max flex-col gap-2 rounded-[10px] border p-[12px] shadow-lg outline-none"
		use:portal
		use:anchorPosition={{ anchor: () => ref, side: "bottom", align: "start", offset: 8 }}
		use:dismissable={{ onDismiss: closePanel, exclude: () => [ref] }}
	>
		<div class="flex items-center justify-between gap-2 text-[12px] font-semibold">
			<button
				type="button"
				class="ft-date-picker-nav text-muted-foreground cursor-pointer"
				aria-label="Previous month"
				onclick={() => moveMonths(-1)}
			>
				‹
			</button>
			<span>{monthLabel}</span>
			<button
				type="button"
				class="ft-date-picker-nav text-muted-foreground cursor-pointer"
				aria-label="Next month"
				onclick={() => moveMonths(1)}
			>
				›
			</button>
		</div>

		<table
			role="grid"
			aria-label={monthLabel}
			class="border-collapse text-[11px]"
			onkeydown={handleGridKeydown}
		>
			<thead>
				<tr>
					{#each weekdayNames as weekdayName, weekdayIndex (weekdayIndex)}
						<th role="columnheader" scope="col" class="text-muted-foreground px-1 py-1 font-normal">
							{weekdayName}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each weeks as week, weekIndex (weekIndex)}
					<!-- No explicit role="row": `<tr>` already has an implicit ARIA
					     row role inside a table[role=grid] — restating it is flagged
					     as redundant. -->
					<tr>
						{#each week as day (formatISODate(day.date))}
							{@const dayDisabled = isDayDisabled(day.date)}
							{@const dayFocused = isSameDay(day.date, focusedDate)}
							{@const daySelected = value ? isSameDay(day.date, value) : false}
							<td
								role="gridcell"
								data-ft-date={formatISODate(day.date)}
								tabindex={dayFocused ? 0 : -1}
								aria-selected={daySelected}
								aria-disabled={dayDisabled ? "true" : undefined}
								aria-label={formatDayAccessibleName(day.date, locale)}
								class={cn(
									"ft-date-picker-day cursor-pointer rounded-[6px] px-1 py-1 text-center",
									!day.inMonth && "text-muted-foreground",
									dayDisabled && "cursor-not-allowed opacity-40",
									daySelected && "bg-accent text-accent-foreground"
								)}
								onclick={() => {
									if (dayDisabled) return;
									setFocusedDate(day.date);
									commit(day.date);
								}}
							>
								{day.date.getDate()}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Always mounted, closed or open — an id inserted at the same moment as its
     text usually goes unread, so a screen reader hears the new month the
     instant paging lands, not only "something changed" a beat later. -->
<div class="sr-only" role="status" aria-live="polite">{open ? monthLabel : ""}</div>

<style>
	.ft-date-picker-trigger:focus-visible,
	.ft-date-picker-day:focus-visible,
	.ft-date-picker-nav:focus-visible {
		--ft-date-picker-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-date-picker-trigger:focus-visible {
		border-color: var(--ft-date-picker-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-date-picker-accent) 25%, transparent);
	}

	.ft-date-picker-day:focus-visible,
	.ft-date-picker-nav:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-date-picker-accent) 35%, transparent);
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-date-picker-panel {
			animation: ft-date-picker-in 0.12s ease-out;
		}
	}

	@keyframes ft-date-picker-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
