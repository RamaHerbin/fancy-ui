<script lang="ts">
import type { HTMLAttributes } from "vue";

export type RadioGroupOrientation = "horizontal" | "vertical";

export interface RadioGroupProps {
	/** Called with the new value whenever the selection changes. */
	onValueChange?: (value: string) => void;
	/**
	 * The `name` shared by every item's native radio input. Generated when
	 * omitted — see the README — so two groups on the same page never fight
	 * over each other's selection.
	 */
	name?: string;
	/** Disables every item in the group. */
	disabled?: boolean;
	/** Marks the group required for native form validation. */
	required?: boolean;
	/** Marks the group invalid — sets `aria-invalid` on the group. */
	invalid?: boolean;
	/** The list's stacking axis. */
	orientation?: RadioGroupOrientation;
	/**
	 * Accessible name for the group, standalone. Inside a `FormField` that
	 * rendered its own label, `field.labelId` wins instead — see the
	 * README — since this root is a `<div role="radiogroup">`, not
	 * something `<label for>` can target; only a FormField with no
	 * `label` of its own falls back to this prop.
	 */
	label?: string;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { RADIO_GROUP_KEY, type RadioGroupContext } from "./types.js";

defineOptions({ name: "RadioGroup", inheritAttrs: false });

const {
	onValueChange,
	name,
	disabled = false,
	required = false,
	invalid = false,
	orientation = "vertical",
	label,
	class: className,
	sound = false,
} = defineProps<RadioGroupProps>();

/** The selected value, two-way. `""` means nothing is selected. */
const value = defineModel<string>("value", { default: "" });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Standalone by default; a surrounding FormField wins for id, described-by,
// invalid, required and disabled so a caller never wires those by hand.
const field = useField();

// `internals/id.js`'s `uid()` is client-only by design (its counter
// can't agree between server and client) — deferring name generation to
// a mount watcher until mount would leave every radio without a `name` at
// all until hydration, and this component's own README asks for the
// opposite: two same-page groups must stay independent from first
// paint, not just after JS runs. `useFancyId()` gives the same
// one-generator-per-instance guarantee safely during SSR, and it is
// already how FormField (this same wave's other id-generating form
// primitive) solves this exact problem, for the same reason.
const uid = useFancyId();
const generatedName = `${uid}-name`;

const resolvedName = computed(() => name ?? generatedName);

const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? invalid);

const playCue = useSoundCue(() => sound);

// The only place `value` changes. A plain function called from an
// item's event handler, not a watcher — writing `value` there would
// mean reading and writing the same state in one pass, and would fight a
// caller's own `v-model:value` write.
function select(itemValue: string) {
	if (effectiveDisabled.value) return;
	const changed = value.value !== itemValue;
	value.value = itemValue;
	// The `sound &&` half of the Svelte guard lives inside `useSoundCue`.
	if (changed) playCue("select");
	onValueChange?.(itemValue);
}

const context: RadioGroupContext = {
	get name() {
		return resolvedName.value;
	},
	get value() {
		return value.value;
	},
	get disabled() {
		return effectiveDisabled.value;
	},
	get required() {
		return effectiveRequired.value;
	},
	get invalid() {
		return effectiveInvalid.value;
	},
	isSelected(itemValue) {
		return value.value === itemValue;
	},
	select,
};

provide(RADIO_GROUP_KEY, context);

const classes = computed(() =>
	cn(
		"ft-radio-group inline-flex",
		orientation === "vertical"
			? "flex-col gap-[10px]"
			: "flex-row flex-wrap gap-x-[20px] gap-y-[10px]",
		className
	)
);
</script>

<!--
	`controlId`/`<label for>` cannot label this element — a div with
	role="radiogroup" is not one of the elements `for` can target, ARIA role
	or not — so `field.labelId` (the id of the label FormField actually
	rendered) drives `aria-labelledby` instead. `field.labelId` is
	`undefined` both outside a FormField and inside one that rendered no
	label of its own, and in both of those cases the own `label` prop is
	what has to carry the accessible name — so `aria-label` only renders
	when there is no `labelId` to point at, never both at once.
-->
<template>
	<div
		ref="el"
		:id="field?.controlId"
		:class="classes"
		role="radiogroup"
		:data-orientation="orientation"
		:aria-label="field?.labelId ? undefined : label"
		:aria-labelledby="field?.labelId"
		:aria-describedby="field?.describedBy"
		:aria-invalid="effectiveInvalid ? 'true' : undefined"
		:aria-required="effectiveRequired ? 'true' : undefined"
	>
		<slot />
	</div>
</template>
