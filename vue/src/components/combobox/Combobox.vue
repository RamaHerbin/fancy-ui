<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { ComboboxOption } from "./types.js";

export type { ComboboxOption };

export interface ComboboxProps {
	/** The closed set of selectable options. A value outside this list is never valid. */
	options: ComboboxOption[];
	/** The selected option's value, or "" when nothing is selected. Two-way through `v-model:value`. */
	value?: string;
	/** Called with the new value whenever the selection commits — a row click, Enter on the active row, or a caller writing `value` never fires this itself. */
	onValueChange?: (value: string) => void;
	/** Shown while the field is empty and nothing is selected. */
	placeholder?: string;
	/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name` — submitted via a hidden input carrying `value`, since the visible field displays the option's label, not its value. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Matches an option against the current query. Default: case-insensitive substring match on `label`. */
	filter?: (option: ComboboxOption, query: string) => boolean;
	/** Shown in the panel when no option matches the current query. */
	emptyMessage?: string;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import ComboboxPanel from "./ComboboxPanel.vue";
import { defaultFilter } from "./match.js";
import { COMBOBOX_KEY, type ComboboxContext } from "./types.js";

defineOptions({ name: "Combobox", inheritAttrs: false });

const {
	options,
	onValueChange,
	placeholder,
	disabled = false,
	required = false,
	invalid = false,
	id,
	name,
	label,
	filter,
	emptyMessage = "No results",
	class: className,
	sound = false,
} = defineProps<ComboboxProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. That is what makes all three documented call
// shapes work off one implementation — a caller two-way binding `value`, a
// caller who passes only `onValueChange`, and a caller who passes both a plain
// value and that callback.
const value = defineModel<string>("value", { default: "" });

// Undefined outside a FormField — every `effective*` below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped. Same convention as Input.
const field = useField();

const uid = useFancyId();
const effectiveId = computed(() => field?.controlId ?? id ?? `${uid}-input`);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);
const panelId = `${uid}-listbox`;

// Convention C-4: exactly where the source declares its bindable `ref`.
const inputEl = useTemplateRef<HTMLInputElement>("inputEl");
defineExpose({ ref: inputEl });

function findOption(val: string): ComboboxOption | undefined {
	return options.find((o) => o.value === val);
}

function matches(option: ComboboxOption, q: string): boolean {
	return filter ? filter(option, q) : defaultFilter(option.label, q);
}

// Filtering is computed as a plain function, not only as the `computed`
// below, so it can also be called directly from handlers that just wrote
// `query` in the same pass (see `handleInput`) — the source keeps this split
// because reading a memoized value there risks seeing the pre-write list, and
// it is kept here so the listbox callbacks read the same fresh function the
// source hands them rather than a rendering-time cache.
function computeFilteredOptions(q: string): ComboboxOption[] {
	// While the visible text still equals the selected option's own label —
	// true both before the user has touched the field at all and right
	// after a fresh selection — nothing is filtered out, so opening the
	// panel browses the whole list rather than the one row that happens to
	// still be typed in. The moment the visible text diverges from that
	// label, real filtering kicks in.
	const selectedLabel = findOption(value.value)?.label ?? "";
	if (q === selectedLabel) return options;
	return options.filter((o) => matches(o, q));
}

// The label of the currently selected option is also the field's resting
// text — computed once here, not through a watcher, so it is correct on the
// very first server-rendered paint too, not just after hydration.
const query = ref(findOption(value.value)?.label ?? "");
const open = ref(false);

const filteredOptions = computed(() => computeFilteredOptions(query.value));

const listbox = useListbox({
	// These recompute the filtered list directly, the same way
	// `computeFilteredOptions` is called from handlers, rather than reading
	// the `filteredOptions` computed above — `move`/`moveToEdge` can be
	// called synchronously from `handleInput`, in the same pass that just
	// wrote `query`, and these callbacks must see that keystroke's result.
	count: () => computeFilteredOptions(query.value).length,
	enabled: (i) => !computeFilteredOptions(query.value)[i]?.disabled,
	loop: true,
});

// Re-syncs the visible text whenever `value` changes for a reason other
// than this component's own `selectOption`/`resolveAndClose` below — those
// already set `query` themselves, synchronously, so in practice this only
// has real work to do when a caller changes `value` from outside (an initial
// `v-model:value`, or a later external write). `options` is read inside the
// callback, where nothing is tracked (the source's `untrack`), so a caller
// that recreates its options array on every render (a fresh array literal, a
// re-translated label set) does not retrigger this and stomp whatever the
// user is mid-typing — only `value` itself does.
watch(
	value,
	(current) => {
		query.value = findOption(current)?.label ?? "";
	},
	{ flush: "post" }
);

// A no-op while `sound` is false, so the call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

function optionId(index: number): string {
	return `${panelId}-option-${index}`;
}

function openPanel(): void {
	if (effectiveDisabled.value) return;
	open.value = true;
	const selectedIndex = filteredOptions.value.findIndex((o) => o.value === value.value);
	listbox.setActive(selectedIndex >= 0 ? selectedIndex : filteredOptions.value.length > 0 ? 0 : -1);
}

// The single place `value` and `query` change together as a direct
// consequence of the user picking a row — a plain function, not a watcher, so
// it doesn't fight a caller's own two-way write.
function selectOption(option: ComboboxOption): void {
	if (effectiveDisabled.value || option.disabled) return;
	// Re-picking the row already committed changes nothing — matching the
	// changed-only rule every other value-holding component follows
	// (Select, Tabs, DatePicker, ...) even where, as here, there is no
	// second cue to fall back on.
	const changed = value.value !== option.value;
	value.value = option.value;
	query.value = option.label;
	open.value = false;
	if (changed) playCue("select");
	onValueChange?.(option.value);
}

// A closed set has to resolve on the way out: whatever is left in the
// field either names a real option (already handled by `selectOption`) or
// it doesn't, and in that case the field reverts to the last valid
// selection's label — or clears, when there wasn't one. Escape, an
// outside click (both via the panel's own dismiss layer) and a plain blur all
// funnel through this one function, so every way of leaving the field
// agrees on the same outcome.
function resolveAndClose(): void {
	if (!open.value) return;
	open.value = false;
	query.value = findOption(value.value)?.label ?? "";
}

// A plain `Event`, narrowed at the read: Vue types an `<input>`'s `onInput` as
// `(payload: InputEvent) => void`, so the source's
// `Event & { currentTarget: HTMLInputElement }` parameter would not satisfy it.
function handleInput(event: Event): void {
	if (effectiveDisabled.value) return;
	query.value = (event.currentTarget as HTMLInputElement).value;
	open.value = true;
	listbox.moveToEdge("first");
}

function handleFocus(): void {
	openPanel();
}

function handleBlur(): void {
	resolveAndClose();
}

function handleKeydown(event: KeyboardEvent): void {
	if (effectiveDisabled.value) return;
	switch (event.key) {
		case "ArrowDown":
			event.preventDefault();
			if (!open.value) {
				openPanel();
				return;
			}
			listbox.move(1);
			break;
		case "ArrowUp":
			event.preventDefault();
			if (!open.value) {
				openPanel();
				return;
			}
			listbox.move(-1);
			break;
		case "Home":
			if (!open.value) return;
			event.preventDefault();
			listbox.moveToEdge("first");
			break;
		case "End":
			if (!open.value) return;
			event.preventDefault();
			listbox.moveToEdge("last");
			break;
		case "Enter": {
			if (!open.value) return;
			const active = filteredOptions.value[listbox.activeIndex];
			if (active) {
				event.preventDefault();
				selectOption(active);
			}
			break;
		}
	}
}

// The source's getter object, built once in `setup` and never replaced: a
// consumer's `computed` runs each getter inside its own tracking scope, so the
// dependency is picked up exactly as the source's `$derived` picked it up.
const context: ComboboxContext = {
	get open() {
		return open.value;
	},
	get panelId() {
		return panelId;
	},
	get inputRef() {
		return inputEl.value;
	},
	get options() {
		return filteredOptions.value;
	},
	get query() {
		return query.value;
	},
	get activeIndex() {
		return listbox.activeIndex;
	},
	get emptyMessage() {
		return emptyMessage;
	},
	optionId,
	isActive(index: number) {
		return index === listbox.activeIndex;
	},
	selectOption,
	// Wrapped so a caller passing an event object can never leak it in as an argument.
	close: () => resolveAndClose(),
};
provide(COMBOBOX_KEY, context);

// A count, not the contents — see the panel's own note on why the list
// itself is never read out loud.
const resultsMessage = computed(() =>
	filteredOptions.value.length === 1 ? "1 result" : `${filteredOptions.value.length} results`
);

const classes = computed(() =>
	cn(
		"ft-combobox w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);
</script>

<template>
	<div class="ft-combobox-wrapper relative">
		<input
			ref="inputEl"
			type="text"
			role="combobox"
			:id="effectiveId"
			:placeholder="placeholder"
			:value="query"
			:disabled="effectiveDisabled"
			:required="effectiveRequired"
			:aria-invalid="effectiveInvalid ? 'true' : undefined"
			:aria-describedby="field?.describedBy"
			:aria-label="field?.labelId ? undefined : label"
			:aria-expanded="open"
			aria-haspopup="listbox"
			aria-autocomplete="list"
			:aria-controls="open ? panelId : undefined"
			:aria-activedescendant="
				open && listbox.activeIndex >= 0 ? optionId(listbox.activeIndex) : undefined
			"
			:class="classes"
			@input="handleInput"
			@focus="handleFocus"
			@blur="handleBlur"
			@keydown="handleKeydown"
		/>

		<!--
			The visible input displays the option's *label*, so it cannot also
			carry `name` without submitting the label text instead of the actual
			value — this hidden input carries the real submission pair instead,
			the same reason a native `<select>` submits its `value` and not its
			displayed text. `required` stays off it (a `type="hidden"` input is
			barred from constraint validation in every browser) and lives on the
			visible input above instead, where a real validation UI can attach to
			it.

			`.attr` on `value` is load-bearing rather than stylistic: an
			unmodified binding would set the DOM PROPERTY only, and a hidden
			input's property value is not carried by `cloneNode()` — so a form
			built from a copy of this node would submit an empty field.
		-->
		<input
			v-if="name"
			type="hidden"
			:name="name"
			:value.attr="value"
			:disabled="effectiveDisabled"
		/>

		<!--
			Always mounted, whether or not the panel is open — an element that
			only appears at the same moment its own text does usually goes
			unannounced. Content is a count, never the option list itself, so
			fast typing doesn't turn into a screen reader narrating every
			keystroke's worth of rows.
		-->
		<div class="sr-only" role="status" aria-live="polite">{{ open ? resultsMessage : "" }}</div>
	</div>

	<!--
		Rendered unconditionally, with the mount gate inside it — this package's
		shape of the source's `{#if open}`. The panel has to survive `open`
		flipping false for the length of its own exit.
	-->
	<ComboboxPanel />
</template>

<style scoped>
.ft-combobox:focus-visible {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-field-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}
</style>
