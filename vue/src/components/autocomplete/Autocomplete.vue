<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface AutocompleteProps {
	/** Candidate strings offered as the user types. Advisory only — any text is a valid value, matched or not. */
	suggestions: string[];
	/** The free-text value. Two-way through `v-model:value`. */
	value?: string;
	/** Called with the new value on every keystroke. */
	onValueChange?: (value: string) => void;
	/** Called only when a suggestion is committed via click or Enter — never fires from plain typing. */
	onSelect?: (suggestion: string) => void;
	/** Shown while the field is empty. */
	placeholder?: string;
	/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission — the visible value doubles as the submitted one, unlike Combobox. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Characters required before suggestions appear. */
	minLength?: number;
	/** Maximum number of suggestions shown at once. */
	maxSuggestions?: number;
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
import { computed, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import AutocompletePanel from "./AutocompletePanel.vue";
import { AUTOCOMPLETE_CONTEXT, type AutocompleteContext } from "./types.js";

defineOptions({ name: "Autocomplete", inheritAttrs: false });

const {
	suggestions,
	onValueChange,
	onSelect,
	placeholder,
	disabled = false,
	required = false,
	invalid = false,
	id,
	name,
	label,
	minLength = 1,
	maxSuggestions = 8,
	class: className,
	sound = false,
} = defineProps<AutocompleteProps>();

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening — so binding `v-model:value`, passing only
// `onValueChange`, or passing a plain `value` plus that callback all work off
// this one implementation.
const value = defineModel<string>("value", { default: "" });

// Undefined outside a FormField — every derived below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped. Same convention as Input.
const field = useField();

const uid = useFancyId();
const effectiveId = computed(() => field?.controlId ?? id ?? `${uid}-input`);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);
const panelId = `${uid}-listbox`;

const open = ref(false);

// A no-op while `sound` is false, so every call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => sound);

// Computed as a plain function, not only through the `computed` below, so it
// can also be called directly from handlers that just wrote `value` in the
// same pass (see `handleInput`) — reading the memoized `filteredSuggestions`
// there instead would mean reading a derived value in the same synchronous
// call that wrote its own dependency, which risks seeing the pre-write list.
function computeSuggestions(text: string): string[] {
	if (text.length < minLength) return [];
	const q = text.toLowerCase();
	return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, maxSuggestions);
}

const filteredSuggestions = computed(() => computeSuggestions(value.value));

const listbox = useListbox({
	// Recomputes directly for the same reason `Combobox` does — `move` can
	// run synchronously from `handleInput`, in the same pass that just
	// wrote `value`, and this must see that keystroke's result.
	count: () => computeSuggestions(value.value).length,
	loop: true,
});

// `useListbox` already destroys its typeahead timer on scope dispose, which is
// what the source's `onDestroy(listbox.destroy)` did by hand.

// If the suggestions the panel is showing become empty while it's open —
// the `suggestions` prop changes out from under an open panel, or `value`
// is set programmatically to something shorter than `minLength` — the
// panel closes itself rather than sit open and empty. Reads
// `filteredSuggestions`, writes `open`: two different pieces of state, not
// the same one read and written in one effect.
watch(
	() => filteredSuggestions.value.length,
	(length) => {
		if (length === 0) open.value = false;
	},
	{ flush: "post" }
);

// Exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLInputElement>("el");
defineExpose({ ref: el });

function optionId(index: number): string {
	return `${panelId}-option-${index}`;
}

// The only place a suggestion becomes the value. A plain function, not a
// watcher, so it doesn't fight a caller's own two-way write.
function commit(suggestion: string) {
	// Re-picking the suggestion already in force changes nothing — matching
	// the changed-only rule every other value-holding component follows
	// (Select, Tabs, DatePicker, ...) even where, as here, there is no
	// second cue to fall back on.
	const changed = value.value !== suggestion;
	value.value = suggestion;
	open.value = false;
	if (!effectiveDisabled.value && changed) playCue("select");
	onValueChange?.(suggestion);
	onSelect?.(suggestion);
}

function handleInput(event: Event) {
	if (effectiveDisabled.value) return;
	const next = (event.currentTarget as HTMLInputElement).value;
	value.value = next;
	onValueChange?.(next);
	open.value = computeSuggestions(next).length > 0;
	// No row auto-highlights on typing — only an explicit arrow key does,
	// so Enter right after typing never silently swaps in a suggestion the
	// user never navigated to.
	listbox.setActive(-1);
}

function handleFocus() {
	if (effectiveDisabled.value) return;
	if (computeSuggestions(value.value).length > 0) open.value = true;
}

function handleBlur() {
	// Free text needs no resolution on the way out, unlike Combobox — every
	// value is already valid, and arrowing never wrote into the field, so
	// there is nothing to revert. Blur only has to close the panel.
	open.value = false;
}

function handleKeydown(event: KeyboardEvent) {
	if (effectiveDisabled.value) return;
	switch (event.key) {
		case "ArrowDown":
			if (!open.value) {
				if (computeSuggestions(value.value).length > 0) {
					event.preventDefault();
					open.value = true;
					listbox.moveToEdge("first");
				}
				return;
			}
			event.preventDefault();
			listbox.move(1);
			break;
		case "ArrowUp":
			if (!open.value) return;
			event.preventDefault();
			listbox.move(-1);
			break;
		case "Enter": {
			if (!open.value) return;
			const active = filteredSuggestions.value[listbox.activeIndex];
			if (active) {
				event.preventDefault();
				commit(active);
			}
			break;
		}
	}
}

// The source's getter object, built once in `setup` and never replaced: a
// consumer's `computed` runs each getter inside its own tracking scope, so the
// dependency is picked up exactly as the source's `$derived` picked it up.
const context: AutocompleteContext = {
	get open() {
		return open.value;
	},
	get panelId() {
		return panelId;
	},
	get inputRef() {
		return el.value;
	},
	get suggestions() {
		return filteredSuggestions.value;
	},
	get query() {
		return value.value;
	},
	get activeIndex() {
		return listbox.activeIndex;
	},
	optionId,
	isActive(index: number) {
		return index === listbox.activeIndex;
	},
	select: commit,
	close() {
		open.value = false;
	},
};
AUTOCOMPLETE_CONTEXT.provide(context);

// A count, not the contents — see the panel's own note on why the list
// itself is never read out loud.
const resultsMessage = computed(() =>
	filteredSuggestions.value.length === 1
		? "1 suggestion"
		: `${filteredSuggestions.value.length} suggestions`
);

const classes = computed(() =>
	cn(
		"ft-autocomplete w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		className
	)
);
</script>

<template>
	<div class="ft-autocomplete-wrapper relative">
		<input
			ref="el"
			type="text"
			role="combobox"
			:id="effectiveId"
			:name="name"
			:placeholder="placeholder"
			:value="value"
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

		<!-- Always mounted, whether or not the panel is open — see Combobox's
		     identical note. Content is a count, never the suggestion text itself. -->
		<div class="sr-only" role="status" aria-live="polite">{{ open ? resultsMessage : "" }}</div>
	</div>

	<!--
		Rendered unconditionally where the source has `{#if open}`: the panel
		owns its own presence clock, so it is what keeps the list on screen for
		the length of the exit — the job the source's outro-delayed branch
		destruction did. The gate has not disappeared, it has moved one level
		down.
	-->
	<AutocompletePanel />
</template>

<style scoped>
.ft-autocomplete:focus-visible {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-field-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}
</style>
