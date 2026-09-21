<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { WeekStartsOn } from "../../internals/calendar-core.js";

export interface DatePickerProps {
	/** The selected date, or `null` for none; two-way through `v-model:value`. Always a local-midnight `Date` — see the README. */
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
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import {
	getMonthGrid,
	addMonths,
	isSameDay,
	clampDate,
	formatISODate,
} from "../../internals/calendar-core.js";
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

defineOptions({ name: "DatePicker", inheritAttrs: false });

const {
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
	sound = false,
} = defineProps<DatePickerProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening.
const value = defineModel<Date | null>("value", { default: null });

// Undefined outside a FormField — every value below then falls back to this
// component's own props instead of the context, so the control works
// standalone exactly as it does wrapped. A `<button>` is one of the
// elements `<label for>` can target, so this control uses `controlId`
// rather than `labelId`/`aria-labelledby`, the same choice Input makes.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

const uid = useFancyId();
const panelId = `${uid}-panel`;

const open = ref(false);

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher.
const panel = shallowRef<HTMLDivElement | null>(null);

// Convention C-4: exactly where the source declares its bindable `ref`.
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
defineExpose({ ref: trigger });

// The displayed month (only year/month are read off this) and the day
// currently carrying the grid's one `tabindex="0"` — the roving-focus
// position. Both are re-seeded from `value` (or today) every time the
// panel opens, in `openPanel` below, not derived from `value` directly:
// once open, paging through months must not snap back just because
// `value` itself hasn't changed yet.
//
// `null` while the panel has never been opened, rather than seeded with
// `new Date()` in `setup`: a "now" read on a render path is forbidden
// (convention C-7), and nothing reads either value until `openPanel` has
// seeded them anyway.
const viewDate = shallowRef<Date | null>(null);
const focusedDate = shallowRef<Date | null>(null);

// A no-op while `sound` is false, so every call site below stays unguarded,
// and the preference is read inside the returned function rather than in a
// render path.
const playCue = useSoundCue(() => sound);

function isDayDisabled(date: Date): boolean {
	return !isDayInRange(date, min, max) || (isDateDisabled?.(date) ?? false);
}

const weeks = computed(() =>
	viewDate.value
		? getMonthGrid(viewDate.value.getFullYear(), viewDate.value.getMonth(), weekStartsOn)
		: []
);
const weekdayNames = computed(() => getWeekdayNames(weekStartsOn, locale));
const monthLabel = computed(() =>
	viewDate.value ? formatMonthYear(viewDate.value, locale) : ""
);
const triggerLabel = computed(() => formatTriggerDate(value.value, locale));

/**
 * Everything one day cell renders, resolved once per cell — the shape of the
 * source's four `{@const}` bindings, which have no template counterpart here.
 * The emitted DOM is identical.
 */
interface DayCell {
	iso: string;
	inMonth: boolean;
	disabled: boolean;
	focused: boolean;
	selected: boolean;
	accessibleName: string;
	date: Date;
	dayOfMonth: number;
}

const rows = computed<DayCell[][]>(() => {
	const focused = focusedDate.value;
	const selected = value.value;
	return weeks.value.map((week) =>
		week.map((day) => ({
			iso: formatISODate(day.date),
			inMonth: day.inMonth,
			disabled: isDayDisabled(day.date),
			focused: focused ? isSameDay(day.date, focused) : false,
			selected: selected ? isSameDay(day.date, selected) : false,
			accessibleName: formatDayAccessibleName(day.date, locale),
			date: day.date,
			dayOfMonth: day.date.getDate(),
		}))
	);
});

// Re-focuses the DOM to whichever cell matches `focusedDate` whenever it
// (or `open`) changes, once the grid reflecting it has actually rendered —
// which is what a post-flush watcher keyed on the same values, plus the panel
// node itself, guarantees. Queried fresh via `data-ft-date` rather than cached
// refs — the same "requery live DOM" choice ToggleGroup's roving focus makes —
// so a month switch that swaps every cell out from under a stale ref is never
// an issue.
watch(
	[() => open.value, focusedDate, panel],
	([isOpen, focused, node]) => {
		if (!isOpen || !focused) return;
		node?.querySelector<HTMLElement>(`[data-ft-date="${formatISODate(focused)}"]`)?.focus();
	},
	{ flush: "post" }
);

function setFocusedDate(date: Date) {
	focusedDate.value = date;
	const view = viewDate.value;
	if (
		!view ||
		date.getFullYear() !== view.getFullYear() ||
		date.getMonth() !== view.getMonth()
	) {
		viewDate.value = new Date(date.getFullYear(), date.getMonth(), 1);
	}
}

function openPanel() {
	if (effectiveDisabled.value) return;
	const seed = value.value ? dayOnly(value.value) : dayOnly(new Date());
	viewDate.value = new Date(seed.getFullYear(), seed.getMonth(), 1);
	focusedDate.value = seed;
	open.value = true;
	playCue("open");
}

// Closing always returns focus to the trigger, whether the close came from
// Enter/click selecting a day, Escape, or an outside click — there is no
// focus trap here (see the README) to fall back on, and without this an
// Escape press would leave focus on a grid cell about to be removed from
// the DOM, which browsers resolve by dropping focus to `<body>` — a real
// loss for a keyboard user, not just a cosmetic one. A plain function, so it
// returns focus in the same tick as the dismiss — this component needs no
// focus-trap handle to satisfy the eager-return rule.
//
// `reason` distinguishes a commit-flavoured close (a day was just picked)
// from a plain dismiss (Escape, an outside click, the trigger toggling
// shut, or re-picking the day already in force). Only a dismiss plays the
// `close` cue — a real commit already played `select` inside `commit`
// above, and the contract is one cue per interaction, never both.
function closePanel(reason: "commit" | "dismiss" = "dismiss") {
	open.value = false;
	if (reason === "dismiss") playCue("close");
	trigger.value?.focus();
}

function toggle() {
	if (open.value) closePanel();
	else openPanel();
}

function commit(date: Date) {
	if (isDayDisabled(date)) return;
	// Captured before `value` is overwritten: re-picking the day already in
	// force changes nothing, so it closes like a dismiss (`close`) instead
	// of playing a second `select` for a no-op.
	const changed = !value.value || !isSameDay(value.value, date);
	value.value = date;
	if (changed) playCue("select");
	onValueChange?.(date);
	closePanel(changed ? "commit" : "dismiss");
}

function moveDays(delta: number) {
	if (!focusedDate.value) return;
	const direction = delta > 0 ? 1 : -1;
	const found = findEnabledDay(addDays(focusedDate.value, delta), direction, isDayDisabled);
	if (found) setFocusedDate(found);
}

function moveToWeekEdge(edge: "start" | "end") {
	if (!focusedDate.value) return;
	const found = findEnabledInRow(focusedDate.value, weekStartsOn, edge, isDayDisabled);
	if (found) setFocusedDate(found);
}

function moveMonths(n: number) {
	if (!focusedDate.value) return;
	const raw = addMonths(focusedDate.value, n);
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
	if (!focusedDate.value) return;
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
			commit(focusedDate.value);
			break;
		default:
			return;
	}
	event.preventDefault();
}

function handleDayClick(cell: DayCell) {
	if (cell.disabled) return;
	setFocusedDate(cell.date);
	commit(cell.date);
}

const presence = usePresence(() => open.value);

// The side and alignment the panel was ACTUALLY placed on, which differ from
// the requested ones whenever a flip avoided the viewport edge (side) or
// clamping slid the panel along the cross axis (align). `useAnchorPosition`
// seeds both with the REQUESTED values rather than a hardcoded "bottom", so
// an un-flipped panel reads the right growth origin on its very first frame
// and only a real flip ever moves it — the pair of `$state` locals the source
// feeds from `onPlacement`, collapsed into one ref.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => trigger.value,
	side: "bottom",
	align: "start",
	offset: 8,
}));

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade falls through to whatever is underneath.
useDismissable(panel, () => ({
	onDismiss: () => closePanel(),
	exclude: () => [trigger.value],
	active: () => open.value,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
//
// ONE bidirectional leg, never a split enter/exit pair: a calendar reopened
// mid-exit continues from where it is instead of snapping to invisible first.
// The factory is called with the direction at the instant each leg starts,
// which is what the source's `entering: open` is for — a single bidirectional
// transition instance reports `direction: "both"` and cannot tell the two
// apart on its own.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

const classes = computed(() =>
	cn(
		"ft-date-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);

function dayClasses(cell: DayCell): string {
	return cn(
		"ft-date-picker-day cursor-pointer rounded-[6px] px-1 py-1 text-center",
		!cell.inMonth && "text-muted-foreground",
		cell.disabled && "cursor-not-allowed opacity-40",
		cell.selected && "bg-accent text-accent-foreground"
	);
}
</script>

<template>
	<button
		ref="trigger"
		type="button"
		role="combobox"
		:id="effectiveId"
		:name="name"
		:class="classes"
		:disabled="effectiveDisabled"
		aria-haspopup="grid"
		:aria-expanded="open"
		:aria-controls="open ? panelId : undefined"
		:aria-required="effectiveRequired ? 'true' : undefined"
		:aria-invalid="effectiveInvalid ? 'true' : undefined"
		:aria-describedby="field?.describedBy"
		:aria-label="label"
		@click="toggle"
	>
		<!--
			The object form of `v-bind`, not `:class="… ? undefined : '…'"`: a
			falsy class binding still writes `class=""`, and the source emits no
			attribute at all once a date is selected.
		-->
		<span v-bind="triggerLabel ? {} : { class: 'text-muted-foreground' }">
			{{ triggerLabel ?? placeholder }}
		</span>
		<span aria-hidden="true" class="text-muted-foreground">📅</span>
	</button>

	<!--
		Real form participation for a control with no native input underneath.
		ISO (YYYY-MM-DD), the same shape a native `<input type="date">` submits.
		`disabled` mirrors the trigger's own effective disabled state, so a
		disabled DatePicker is excluded from submission exactly like a
		disabled native control would be.

		`value` is an UNMODIFIED binding, never `:value.attr`: Vue sets `value`
		on an `<input>` as the DOM PROPERTY, which is exactly what the source
		does — it compiles to `remove_input_defaults(input)` followed by
		`set_value(input, …)`, so a client-rendered source node carries no
		`value` ATTRIBUTE at all. `.attr` here would make the node serialise
		with `value="2026-07-24"` and make `form.reset()` restore the ISO date
		where the source restores `""`.
	-->
	<input
		v-if="name"
		type="hidden"
		:name="name"
		:value="value ? formatISODate(value) : ''"
		:disabled="effectiveDisabled"
	/>

	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the
		anchoring and dismiss watchers run. A closed calendar emits nothing at
		all, on the server included.

		`data-state` is an ORDINARY binding carrying `surfaceState`'s two values,
		never `"opening"` (convention C-5): the source writes it imperatively
		from a transition handler because its scheduler skips effects inside a
		branch it has marked inert, and a presence-mounted subtree here stays
		reactive for the whole exit. `inert` is never written by hand either —
		the presence clock sets the attribute on the registered node for the
		whole exit, which is what stops a day cell taking a click on its way out.

		`data-align` reports the REQUESTED alignment, as the source does, while
		the growth origin uses the RESOLVED one.
	-->
	<template v-if="presence.mounted && viewDate && focusedDate">
		<Portal>
			<div
				:ref="panelRef"
				:id="panelId"
				class="ft-date-picker-panel border-border bg-popover text-popover-foreground flex w-max flex-col gap-2 rounded-[10px] border p-[12px] shadow-lg outline-none"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				data-align="start"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<div class="flex items-center justify-between gap-2 text-[12px] font-semibold">
					<button
						type="button"
						class="ft-date-picker-nav text-muted-foreground cursor-pointer"
						aria-label="Previous month"
						@click="moveMonths(-1)"
					>‹</button>
					<span>{{ monthLabel }}</span>
					<button
						type="button"
						class="ft-date-picker-nav text-muted-foreground cursor-pointer"
						aria-label="Next month"
						@click="moveMonths(1)"
					>›</button>
				</div>

				<table
					role="grid"
					:aria-label="monthLabel"
					class="border-collapse text-[11px]"
					@keydown="handleGridKeydown"
				>
					<thead>
						<tr>
							<th
								v-for="(weekdayName, weekdayIndex) in weekdayNames"
								:key="weekdayIndex"
								role="columnheader"
								scope="col"
								class="text-muted-foreground px-1 py-1 font-normal"
							>
								{{ weekdayName }}
							</th>
						</tr>
					</thead>
					<tbody>
						<!--
							No explicit role="row": `<tr>` already has an implicit ARIA
							row role inside a table[role=grid] — restating it is flagged
							as redundant.
						-->
						<tr v-for="(week, weekIndex) in rows" :key="weekIndex">
							<td
								v-for="cell in week"
								:key="cell.iso"
								role="gridcell"
								:data-ft-date="cell.iso"
								:tabindex="cell.focused ? 0 : -1"
								:aria-selected="cell.selected"
								:aria-disabled="cell.disabled ? 'true' : undefined"
								:aria-label="cell.accessibleName"
								:class="dayClasses(cell)"
								@click="handleDayClick(cell)"
							>
								{{ cell.dayOfMonth }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</Portal>
	</template>

	<!--
		Always mounted, closed or open — an id inserted at the same moment as its
		text usually goes unread, so a screen reader hears the new month the
		instant paging lands, not only "something changed" a beat later.
	-->
	<div class="sr-only" role="status" aria-live="polite">{{ open ? monthLabel : "" }}</div>
</template>

<style scoped>
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
</style>
