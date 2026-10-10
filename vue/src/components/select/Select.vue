<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { Side, Align } from "../../internals/anchor-position.js";
import type { SelectOption } from "./types.js";

export type { SelectOption };

export interface SelectProps {
	/** The options to choose from, in order. */
	options: SelectOption[];
	/** The selected value, two-way through `v-model:value`. `""` means nothing is selected. */
	value?: string;
	/** Called with the new value whenever the selection changes. */
	onValueChange?: (value: string) => void;
	/** Shown in the trigger while nothing is selected. */
	placeholder?: string;
	/** Blocks opening and excludes the control from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Marks the control required. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
	invalid?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`. When set, a hidden input carries the value so the control participates in form submission. */
	name?: string;
	/** Accessible name — for a control with no visible Label next to it. */
	label?: string;
	/** Side of the trigger to place the panel on. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Additional CSS classes, merged onto the trigger. */
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
import SelectPanel from "./SelectPanel.vue";
import { SELECT_CONTEXT, type SelectContext } from "./types.js";

defineOptions({ name: "Select", inheritAttrs: false });

const props = withDefaults(defineProps<SelectProps>(), {
	disabled: false,
	required: false,
	invalid: false,
	side: "bottom",
	align: "start",
	sound: false,
});

// The counterpart of the source's bindable `value`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// when nobody is listening. That is what makes all three documented call
// shapes work off one implementation — a caller two-way binding `value`, a
// caller who passes only `onValueChange`, and a caller who passes both a plain
// value and that callback.
const value = defineModel<string>("value", { default: "" });

// Undefined outside a FormField — every value below then falls back to this
// component's own props instead of the context, so the control works standalone
// exactly as it does wrapped. The root is a real `<button>`, a labelable
// element, so a wrapping FormField's own `<Label for>` targets `controlId`
// directly — there is no `labelId`/`aria-labelledby` path to wire here the way
// a `role="radiogroup"` root would need.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? props.id);
const effectiveDisabled = computed(() => field?.disabled ?? props.disabled);
const effectiveRequired = computed(() => field?.required ?? props.required);
const effectiveInvalid = computed(() => field?.invalid ?? props.invalid);

// `useFancyId()`, the counterpart of the source's `$props.id()`, never the
// handler-time `uid()`: this seeds the panel and option ids, which must already
// agree with themselves on the very first server-rendered paint (the closed
// trigger renders with no `aria-controls` at all, but the ids it would point to
// once open still have to be stable across hydration, not generated fresh
// client-side).
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
const panel = useTemplateRef<InstanceType<typeof SelectPanel>>("panel");

const selectedIndex = computed(() => props.options.findIndex((o) => o.value === value.value));
const selectedOption = computed(() =>
	selectedIndex.value === -1 ? undefined : props.options[selectedIndex.value]
);

// A no-op while `sound` is false, so every call site below stays unguarded, and
// the preference is read inside the returned function rather than in a render
// path.
const playCue = useSoundCue(() => props.sound);

function isOptionEnabled(index: number): boolean {
	return !props.options[index]?.disabled;
}

// The one place `value` changes, in either direction (the model or
// onValueChange) — a plain function, not a watcher, so it never reads and
// writes `value` in the same reactive pass and never fights a caller's own
// two-way write.
/** Returns true when the value actually changed (and a `select` cue played). */
function setValue(next: string): boolean {
	if (value.value === next) return false;
	value.value = next;
	playCue("select");
	props.onValueChange?.(next);
	return true;
}

function commitIndex(index: number): boolean {
	// The root's disabled state gates every commit, not only the trigger's own
	// handlers: a panel still open (or still fading out) when `disabled` flips
	// true must not write `value` or call `onValueChange` on a disabled control.
	if (effectiveDisabled.value) return false;
	const option = props.options[index];
	if (!option || option.disabled) return false;
	return setValue(option.value);
}

// The single hook the listbox core calls whenever the active index moves, for
// any reason (arrow keys, Home/End, a pointer hover, typeahead). What "active"
// means depends entirely on whether the panel is open: while open it is only a
// highlight, scrolled into view but never written to `value` until something
// commits it (Enter, Tab, a click). While closed, there is no highlight to
// show — the only way this callback fires at all is closed-state typeahead, and
// a native <select> commits that immediately rather than merely remembering it,
// so this does too.
function handleActiveChange(index: number): void {
	if (!open.value) {
		commitIndex(index);
		return;
	}
	const row = panel.value?.ref?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
	row?.scrollIntoView?.({ block: "nearest" });
}

const listbox = useListbox({
	count: () => props.options.length,
	enabled: isOptionEnabled,
	onActiveChange: handleActiveChange,
});

// If `options` shrinks while the panel is open, a previously-valid
// `activeIndex` can end up pointing past the end of the new, shorter array.
// Nothing else re-checks this: the listbox module only reacts to explicit
// move/typeahead/setActive calls, not to `options.length` changing out from
// under it between them. Left uncorrected, `aria-activedescendant` below would
// keep citing an option id with no matching row left in the DOM — the same
// "attribute pointing at nothing" failure this wave already had to rule out for
// `aria-controls` while closed.
watch(
	[() => listbox.activeIndex, () => props.options.length],
	([activeIndex, count]) => {
		if (activeIndex !== -1 && activeIndex >= count) {
			listbox.setActive(-1);
		}
	},
	{ flush: "post" }
);

// A control disabled while its listbox is open closes it, silently — this is a
// programmatic change, not a user dismiss, so no `close` cue plays. Without it
// the portalled panel stays open and interactive under a disabled trigger.
watch(
	effectiveDisabled,
	(isDisabled) => {
		if (isDisabled && open.value) open.value = false;
	},
	{ flush: "post" }
);

function openPanel(fallbackEdge: "first" | "last"): void {
	if (effectiveDisabled.value) return;
	open.value = true;
	playCue("open");
	if (selectedIndex.value !== -1 && isOptionEnabled(selectedIndex.value)) {
		listbox.setActive(selectedIndex.value);
	} else {
		listbox.moveToEdge(fallbackEdge);
	}
}

// `reason` distinguishes a commit-flavoured close (a value was just picked — by
// click, Enter/Space, Tab, or closed-state typeahead) from a plain dismiss
// (Escape, an outside click, or the trigger toggling the panel shut with
// nothing highlighted). Only a dismiss plays the `close` cue — a commit already
// played `select` inside `setValue`/`commitIndex` above, and the contract is one
// cue per interaction, never both.
function closePanel(reason: "commit" | "dismiss" = "dismiss"): void {
	open.value = false;
	if (reason === "dismiss") playCue("close");
}

function commitActiveAndClose(): void {
	// The close reason follows the ACTUAL outcome: re-committing the value that
	// is already selected changes nothing, so it closes like a dismiss and is
	// not swallowed into silence.
	const committed = listbox.activeIndex !== -1 && commitIndex(listbox.activeIndex);
	closePanel(committed ? "commit" : "dismiss");
}

function handleTriggerClick(): void {
	if (effectiveDisabled.value) return;
	if (open.value) {
		closePanel();
	} else {
		openPanel("first");
	}
}

function labelAt(index: number): string {
	return props.options[index]?.label ?? "";
}

// A single, non-modified character — Space excluded, since it is handled as its
// own key below (both "open" and "commit", depending on `open`).
function isTypeaheadKey(event: KeyboardEvent): boolean {
	return (
		event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey
	);
}

// No Escape handling here on purpose — `SelectPanel`'s own dismiss layer
// already closes on Escape (and an outside click) via the document-level
// listener it owns; a second listener here would be the exact bug this wave
// already had to remove once. Because Escape only ever closes and closing never
// itself writes `value`, "Escape closes without changing the value" falls out
// for free: nothing in this component's own keydown handling below writes
// `value` for any key other than Enter/Space/Tab.
function handleTriggerKeydown(event: KeyboardEvent): void {
	if (effectiveDisabled.value) return;

	if (!open.value) {
		switch (event.key) {
			case "Enter":
			case " ":
			case "ArrowDown":
				event.preventDefault();
				openPanel("first");
				return;
			case "ArrowUp":
				event.preventDefault();
				openPanel("last");
				return;
			default:
				// Typing while closed selects by typeahead without opening — what a
				// native <select> does. `handleActiveChange` above is what turns the
				// resulting highlight into a real commit while `open` is false.
				if (isTypeaheadKey(event)) listbox.typeahead(event.key, labelAt);
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
		case "Tab":
			// Chosen behaviour (documented in the README): Tab commits the
			// highlighted option, exactly like Enter, but is never prevented —
			// focus still moves on to the next control the browser would have
			// picked anyway. The alternative (close without committing) would
			// silently discard a highlight the user very likely meant to pick, for
			// no benefit over this one.
			commitActiveAndClose();
			return;
		default:
			if (isTypeaheadKey(event)) listbox.typeahead(event.key, labelAt);
			return;
	}
}

// The source's getter object, built once in `setup` and never replaced: a
// consumer's `computed` runs each getter inside its own tracking scope, so the
// dependency is picked up exactly as the source's `$derived` picked it up.
const context: SelectContext = {
	get open() {
		return open.value;
	},
	get panelId() {
		return panelId;
	},
	get options() {
		return props.options;
	},
	get value() {
		return value.value;
	},
	get label() {
		return props.label;
	},
	get activeIndex() {
		return listbox.activeIndex;
	},
	get side() {
		return props.side;
	},
	get align() {
		return props.align;
	},
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
		closePanel(committed ? "commit" : "dismiss");
	},
	// Wrapped so a caller passing an event object can never leak it in as `reason`.
	close: () => closePanel("dismiss"),
};
SELECT_CONTEXT.provide(context);

const classes = computed(() =>
	cn(
		"ft-select-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid.value && "border-destructive/50",
		props.class
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
		:aria-label="props.label"
		:disabled="effectiveDisabled"
		:class="classes"
		@click="handleTriggerClick"
		@keydown="handleTriggerKeydown"
	>
		<span :class="cn('truncate', !selectedOption && 'text-muted-foreground')">{{
			selectedOption?.label ?? props.placeholder ?? ""
		}}</span>
		<span aria-hidden="true" class="ft-select-caret text-muted-foreground text-[9px]">▼</span>
	</button>

	<!--
		`.attr` on `value` is load-bearing rather than stylistic: an unmodified
		binding would set the DOM PROPERTY only, and a hidden input's property
		value is not carried by `cloneNode()` — the source writes the attribute,
		and so must this, or a form built from a copy of this node submits an
		empty field.
	-->
	<input
		v-if="props.name"
		type="hidden"
		:name="props.name"
		:value.attr="value"
		:disabled="effectiveDisabled"
	/>

	<!--
		Rendered unconditionally, with the mount gate inside it — this package's
		shape of the source's `{#if open}`. The panel has to survive `open`
		flipping false for the length of its own exit.
	-->
	<SelectPanel ref="panel" />
</template>

<style scoped>
.ft-select-trigger:focus-visible {
	--ft-field-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	border-color: var(--ft-field-accent);
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
}
</style>
