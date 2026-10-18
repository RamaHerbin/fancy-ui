<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TimePickerProps {
	/** The selected time, or `null` for none; two-way through `v-model:value`. Always "HH:mm", 24-hour — see the README. */
	value?: string | null;
	/** Called with the new value whenever a slot is picked. */
	onValueChange?: (value: string | null) => void;
	/** Minutes between generated slots. Defaults to 30. See the README for what happens when it doesn't divide the hour evenly. */
	step?: number;
	/** Earliest selectable slot ("HH:mm", inclusive). */
	min?: string;
	/** Latest selectable slot ("HH:mm", inclusive). */
	max?: string;
	/** Display only — the trigger and slot labels use a 12-hour clock with AM/PM when true. The value stays "HH:mm" either way. */
	hour12?: boolean;
	/** Blocks opening the panel; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Marks the field required for the surrounding form. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name` — when set, a hidden input carries the "HH:mm" value so the control participates in real form submission. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Shown in the trigger while no time is selected. */
	placeholder?: string;
	/** BCP 47 locale for slot and trigger-label formatting. Defaults to the runtime's own locale. */
	locale?: string;
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
import { computed, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { filterByBounds, formatSlotLabel, generateSlots, nearestIndex } from "./time-utils.js";
import TimePickerPanel from "./TimePickerPanel.vue";
import { TIME_PICKER_CONTEXT, type TimePickerContext } from "./types.js";

defineOptions({ name: "TimePicker", inheritAttrs: false });

const {
	onValueChange,
	step = 30,
	min,
	max,
	hour12 = false,
	disabled = false,
	required = false,
	invalid = false,
	id,
	name,
	label,
	placeholder = "Select a time",
	locale,
	class: className,
	sound = false,
} = defineProps<TimePickerProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. That is what makes all three documented call
// shapes work off one implementation — a caller two-way binding `value`, a
// caller who passes only `onValueChange`, and a caller who passes both a plain
// value and that callback.
const value = defineModel<string | null>("value", { default: null });

// Undefined outside a FormField — every value below then falls back to this
// component's own props instead of the context, so the control works
// standalone exactly as it does wrapped. The root is a real `<button>`, a
// labelable element, so a wrapping FormField's own `<Label for>` targets
// `controlId` directly.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

// `useFancyId()`, the counterpart of the source's `$props.id()`, never the
// handler-time `uid()`: this seeds the panel and option ids, which must
// already agree with themselves on the very first server-rendered paint.
const uid = useFancyId();
const panelId = `${uid}-listbox`;
function optionId(index: number): string {
	return `${uid}-option-${index}`;
}

const open = ref(false);

// Convention C-4: exactly where the source declares its bindable `ref`.
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
defineExpose({ ref: trigger });

// Nothing renders off this. It exists so the active row can be scrolled into
// view, which is DOM work, never a render input — so it is read through the
// panel's own exposed `ref` rather than mirrored into state here.
const panel = useTemplateRef<InstanceType<typeof TimePickerPanel>>("panel");

const slots = computed(() => filterByBounds(generateSlots(step), min, max));
const selectedIndex = computed(() => (value.value ? slots.value.indexOf(value.value) : -1));

// One formatted label per slot, computed once for the life of a grid rather
// than once per row draw. The panel calls `labelFor` for every row it renders,
// and every pointer hover re-renders it to move the highlight — without this,
// each hover rebuilds all 48 labels (1440 at `step: 1`), and each label builds
// its own `Intl.DateTimeFormat`. Nothing on screen changes for that work.
//
// Filled on demand rather than up front: a picker that is never opened only
// ever formats the trigger's own value, and paying for the whole grid at mount
// would be a worse trade than the one this removes. Thrown away wholesale
// whenever the grid or the formatting inputs change, so an entry can never
// outlive what produced it.
const labelCache = computed<Map<string, string>>(() => {
	// Read purely to register the dependencies the cache is keyed on; the map
	// itself starts empty on every one of them.
	void slots.value;
	void hour12;
	void locale;
	return new Map<string, string>();
});

// Still a function, so the context shape is unchanged. `value` can sit off the
// grid (a caller-supplied "14:05" against a 30-minute step), so the cache is
// keyed by slot rather than by index.
function labelFor(slot: string): string {
	const cache = labelCache.value;
	const cached = cache.get(slot);
	if (cached !== undefined) return cached;
	const formatted = formatSlotLabel(slot, hour12, locale);
	cache.set(slot, formatted);
	return formatted;
}

// A no-op while `sound` is false, so every call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// The single place `value` changes, in either direction (the model or
// onValueChange) — a plain function, not a watcher, so it never reads and
// writes `value` in the same reactive pass and never fights a caller's own
// two-way write.
/** Returns true when the value actually changed (and a `select` cue played). */
function setValue(next: string | null): boolean {
	if (value.value === next) return false;
	value.value = next;
	playCue("select");
	onValueChange?.(next);
	return true;
}

function commitIndex(index: number): boolean {
	const slot = slots.value[index];
	if (!slot) return false;
	return setValue(slot);
}

function scrollActiveIntoView(index: number): void {
	const row = panel.value?.ref?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
	row?.scrollIntoView?.({ block: "nearest" });
}

const listbox = useListbox({
	count: () => slots.value.length,
	onActiveChange: scrollActiveIntoView,
});

// `slots` is regenerated whenever `step`, `min` or `max` change, and the
// listbox module knows nothing about that: it only reacts to explicit
// move/typeahead/setActive calls, never to the grid changing shape between
// them. An index that was valid under the old grid therefore survives into the
// new one — pointing past the end of a shorter list, so `aria-activedescendant`
// below cites an option id with no row left in the DOM, or (a shifted grid: a
// later `min`, a coarser `step`) pointing at a completely different TIME than
// the one the user arrowed to, with the highlight silently jumping under them.
//
// So the index is reconciled against the time it named, not clamped as a
// number: the previous grid says which slot was active, and `nearestIndex`
// re-resolves that slot in the new grid exactly as `openPanel` resolves
// `value` — same slot if it survived, else the closest one at or after it, else
// the last, else -1 for a grid with no slots at all. A bounds change therefore
// lands the highlight where reopening the panel would.
//
// DIVERGENCE: the Svelte source has the same gap; this matches the React
// package, which closed it there for the same reason. `Select` clamps to -1
// instead, which is right for it — its options are an opaque caller-supplied
// list with no ordering to resolve a missing entry against, while these slots
// are times on a line.
watch(
	slots,
	(next, previous) => {
		const index = listbox.activeIndex;
		if (index === -1) return;
		const activeSlot = previous[index];
		listbox.setActive(activeSlot === undefined ? -1 : nearestIndex(next, activeSlot));
	},
	{ flush: "post" }
);

// The index owed a scroll as soon as the panel exists. The source spells this
// `tick().then(() => scrollActiveIntoView(index))`; here the panel is mounted
// by its own presence clock, so the request is parked and the watcher below
// pays it the instant the node appears.
//
// Always scrolled into view on open, not only relying on `onActiveChange` —
// that callback only fires when the index actually *changes*, and a reopen can
// land on the same index a previous session left active, which must still be
// visible the instant the panel appears rather than only after the next arrow
// press.
let pendingScroll: number | null = null;

// `open` is a source as well as the node: a reopen that lands while the
// previous panel is still finishing its exit reuses the very same node, so the
// node alone would never re-trigger this.
watch(
	[() => panel.value?.ref ?? null, open],
	([node]) => {
		const index = pendingScroll;
		if (index === null || !node) return;
		pendingScroll = null;
		scrollActiveIntoView(index);
	},
	{ flush: "post" }
);

function openPanel(): void {
	if (effectiveDisabled.value) return;
	open.value = true;
	playCue("open");
	const index = nearestIndex(slots.value, value.value);
	if (index === -1) return;
	listbox.setActive(index);
	pendingScroll = index;
}

// `reason` distinguishes a commit-flavoured close (a slot was just picked) from
// a plain dismiss (Escape, an outside click, or the trigger toggling the panel
// shut with nothing committed). Only a dismiss plays the `close` cue — a commit
// already played `select` inside `setValue` above, and the contract is one cue
// per interaction, never both.
function closePanel(reason: "commit" | "dismiss" = "dismiss"): void {
	open.value = false;
	if (reason === "dismiss") playCue("close");
}

function commitActiveAndClose(): void {
	const committed = listbox.activeIndex !== -1 && commitIndex(listbox.activeIndex);
	closePanel(committed ? "commit" : "dismiss");
}

function handleTriggerClick(): void {
	if (effectiveDisabled.value) return;
	if (open.value) closePanel();
	else openPanel();
	// Deliberate, not incidental: a plain `<button>` is only guaranteed to take
	// focus on click in some browsers (macOS Safari notably does not, by
	// default) — the same reason ToggleGroupItem's own click handler does this.
	// Focus needs to be on the trigger for the keyboard interactions below
	// (arrows, Home/End, Enter) to have anything to attach to right after a
	// mouse open.
	trigger.value?.focus();
}

// No Escape handling here on purpose — `TimePickerPanel`'s own dismiss layer
// already closes on Escape (and an outside click) via the document-level
// listener it owns; a second listener here would be the exact bug this wave
// already had to remove once. Because Escape only ever closes and closing never
// itself writes `value`, "Escape closes without committing" falls out for free.
function handleTriggerKeydown(event: KeyboardEvent): void {
	if (effectiveDisabled.value) return;

	if (!open.value) {
		switch (event.key) {
			case "Enter":
			case " ":
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				openPanel();
				return;
			default:
				return;
		}
	}

	switch (event.key) {
		case "ArrowDown":
			event.preventDefault();
			listbox.move(1);
			return;
		case "ArrowUp":
			event.preventDefault();
			listbox.move(-1);
			return;
		case "Home":
			event.preventDefault();
			listbox.moveToEdge("first");
			return;
		case "End":
			event.preventDefault();
			listbox.moveToEdge("last");
			return;
		case "Enter":
		case " ":
			event.preventDefault();
			commitActiveAndClose();
			return;
	}
}

// The source's getter object, built once in `setup` and never replaced: a
// consumer's `computed` runs each getter inside its own tracking scope, so the
// dependency is picked up exactly as the source's `$derived` picked it up.
const context: TimePickerContext = {
	get open() {
		return open.value;
	},
	get panelId() {
		return panelId;
	},
	get slots() {
		return slots.value;
	},
	get activeIndex() {
		return listbox.activeIndex;
	},
	labelFor,
	get triggerRef() {
		return trigger.value;
	},
	optionId,
	isSelected(index: number) {
		return index === selectedIndex.value;
	},
	isActive(index: number) {
		return index === listbox.activeIndex;
	},
	setActive(index: number) {
		listbox.setActive(index);
	},
	commit(index: number) {
		const committed = commitIndex(index);
		// A POINTER commit is the one path that can strand focus. Pressing a
		// row moves focus onto it (the row carries `tabindex="-1"`), and the
		// panel is portalled to `<body>`, so it has no focusable ancestor to
		// inherit focus once it goes inert for the exit and then unmounts —
		// `document.activeElement` would fall back to `<body>` and the next Tab
		// would restart from the top of the document. Dropping the row's
		// `tabindex` would NOT fix that: a click on a non-focusable element
		// blurs the trigger to `<body>` just the same. The
		// combobox-with-listbox-popup contract is that focus never leaves the
		// trigger, so put it back explicitly, before the close starts the exit.
		// The keyboard path is unaffected — focus was on the trigger the whole
		// time, and re-focusing an already-focused element is a no-op.
		trigger.value?.focus();
		closePanel(committed ? "commit" : "dismiss");
	},
	// Wrapped so a caller passing an event object can never leak it in as
	// `reason` — the source leans on `closePanel`'s own default parameter for
	// the same guarantee.
	close: () => closePanel("dismiss"),
};
TIME_PICKER_CONTEXT.provide(context);

const triggerLabel = computed(() => (value.value ? labelFor(value.value) : undefined));

const classes = computed(() =>
	cn(
		"ft-time-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);
</script>

<template>
	<button
		ref="trigger"
		:id="effectiveId"
		type="button"
		role="combobox"
		aria-haspopup="listbox"
		:aria-expanded="open"
		:aria-controls="open ? panelId : undefined"
		:aria-activedescendant="
			open && listbox.activeIndex !== -1 ? optionId(listbox.activeIndex) : undefined
		"
		:aria-invalid="effectiveInvalid ? 'true' : undefined"
		:aria-required="effectiveRequired ? 'true' : undefined"
		:aria-describedby="field?.describedBy"
		:aria-label="label"
		:disabled="effectiveDisabled"
		:class="classes"
		@click="handleTriggerClick"
		@keydown="handleTriggerKeydown"
	>
		<!--
			The object form of `v-bind`, not `:class="… ? undefined : '…'"`: a
			falsy class binding still writes `class=""`, and the source emits no
			attribute at all once a time is selected.
		-->
		<span v-bind="triggerLabel ? {} : { class: 'text-muted-foreground' }">
			{{ triggerLabel ?? placeholder }}
		</span>
		<span aria-hidden="true" class="text-muted-foreground">◷</span>
	</button>

	<!--
		`.attr` on `value` is load-bearing rather than stylistic: an unmodified
		binding would set the DOM PROPERTY only, and a hidden input's property
		value is not carried by `cloneNode()` — the source writes the attribute,
		and so must this, or a form built from a copy of this node submits an
		empty field.
	-->
	<input
		v-if="name"
		type="hidden"
		:name="name"
		:value.attr="value ?? ''"
		:disabled="effectiveDisabled"
	/>

	<!--
		Rendered unconditionally, with the mount gate inside it — this package's
		shape of the source's `{#if open}`. The panel has to survive `open`
		flipping false for the length of its own exit.
	-->
	<TimePickerPanel ref="panel" />
</template>

<style scoped>
.ft-time-picker-trigger:focus-visible {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-field-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}
</style>
