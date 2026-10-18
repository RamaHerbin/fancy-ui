<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface RadioGroupItemProps {
	/** This item's value — what the group's `value` becomes when it is picked. */
	value: string;
	/** Disables just this item, independent of the group's own `disabled`. */
	disabled?: boolean;
	/** Visible label text, rendered next to the control. Falls back to the default slot, then to `value`. */
	label?: string;
	/** Additional CSS classes, merged onto the wrapping `<label>`. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { RADIO_GROUP_KEY } from "./types.js";

defineOptions({ name: "RadioGroupItem", inheritAttrs: false });

const { value, disabled = false, label, class: className } = defineProps<RadioGroupItemProps>();

defineSlots<{
	/** Visible label content, in place of `label`/`value`. */
	default?: () => unknown;
}>();

const el = useTemplateRef<HTMLInputElement>("el");
defineExpose({ ref: el });

// Undefined outside a RadioGroup: the item then has no selection or
// shared `name` to take part in, and renders as a plain, unchecked,
// standalone radio rather than throwing.
const group = inject(RADIO_GROUP_KEY, undefined);

const isDisabled = computed(() => disabled || (group?.disabled ?? false));
const isChecked = computed(() => group?.isSelected(value) ?? false);

// Deliberately no `tabindex` anywhere on the input below. That is what
// leaves the browser's own sequential-focus-navigation algorithm for
// same-`name` radio groups in charge: the first item is the tab stop
// while none is checked, and the checked one becomes the tab stop the
// instant a selection exists — for free, and correctly, as long as
// nothing here overrides it.
//
// The native `disabled` attribute below is the real gate, but a
// synthetic `change` fired straight at the element — as a test does, and
// as some assistive tech does — walks straight past it, so the handler
// repeats the guard itself.
function handleChange() {
	if (isDisabled.value) return;
	group?.select(value);
}

const labelClasses = computed(() =>
	cn(
		"ft-radio-item inline-flex items-center gap-[10px] text-[13px] cursor-pointer",
		isDisabled.value && "cursor-not-allowed opacity-50",
		className
	)
);

// Echoes the group's invalid state on the still-unselected ring; the
// error text itself (with its own icon) lives in the surrounding
// FormField, so this border tint is a secondary cue, never the only one.
// Plain semantic Tailwind tokens, same as every other border on this
// input — only the brand accent below gets a local fallback, because
// unlike `--input`/`--destructive` it has no conventionally-named token a
// consumer's theme is likely to already define.
const controlClasses = computed(() =>
	cn(
		"ft-radio-item-control",
		group?.invalid && !isChecked.value ? "border-destructive" : "border-input"
	)
);
</script>

<template>
	<label :class="labelClasses">
		<input
			ref="el"
			type="radio"
			:class="controlClasses"
			:value="value"
			:checked="isChecked"
			:disabled="isDisabled"
			:required="group?.required"
			:name="group?.name"
			@change="handleChange"
		/>
		<slot>{{ label ?? value }}</slot>
	</label>
</template>

<style scoped>
.ft-radio-item-control {
	--ft-radio-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	appearance: none;
	flex: none;
	width: 18px;
	height: 18px;
	margin: 0;
	border-radius: 50%;
	border-style: solid;
	border-width: 1.5px;
	position: relative;
	cursor: pointer;
	/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout.
	   Colour is a state change, not motion, so it stays outside the
	   reduced-motion query — only the dot below travels. */
	transition: border-color var(--ft-duration-fast, 150ms)
		var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
}

.ft-radio-item-control:disabled {
	cursor: not-allowed;
}

.ft-radio-item-control:checked {
	border-color: var(--ft-radio-accent);
}

/*
 * The filled center is a pseudo-element, not a second DOM node — the
 * native input stays the only focusable, checkable element, per the
 * "restyle, don't replace" rule. It is also a shape change, not only a
 * colour change, so the checked state still reads without colour.
 *
 * The pseudo exists in both states, scaled to nothing while unchecked,
 * rather than only while `:checked` — a pseudo-element that does not
 * exist yet has no previous value to travel from, so a dot created on
 * selection could only ever appear, never grow.
 */
.ft-radio-item-control::after {
	content: "";
	position: absolute;
	inset: 0;
	margin: auto;
	width: 9px;
	height: 9px;
	border-radius: 50%;
	background: var(--ft-radio-accent);
	transform: scale(0);
}

.ft-radio-item-control:checked::after {
	transform: scale(1);
}

/*
 * `--ft-ease-out` and not `inout`: the dot arrives, it does not toggle
 * back and forth in place — what leaves is the previously-selected
 * item's own dot, one element over. Outside this query the two
 * `transform` rules above still apply, so reduced motion gets the dot
 * at full size the instant the item is selected.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-radio-item-control::after {
		/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.16, 1, 0.3, 1) = tokens.EASINGS.out */
		transition: transform var(--ft-radio-dot-duration, var(--ft-duration-fast, 150ms))
			var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	}
}

.ft-radio-item-control:focus-visible {
	outline: none;
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-radio-accent) 35%, transparent);
}
</style>
