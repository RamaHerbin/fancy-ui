<script lang="ts">
import type { HTMLAttributes } from "vue";

export type SwitchSize = "sm" | "md" | "lg";

export interface SwitchProps {
	/** Called with the new value whenever the switch is activated. */
	onCheckedChange?: (checked: boolean) => void;
	/** Blocks interaction; excluded from form submission. Overridden by a surrounding FormField. */
	disabled?: boolean;
	/** Native `required`. Overridden by a surrounding FormField. */
	required?: boolean;
	/** Element id. Overridden by a surrounding FormField's own `controlId`. */
	id?: string;
	/** Native `name`, read on form submission. */
	name?: string;
	/** Form value submitted while on. */
	value?: string;
	/**
	 * Accessible name, rendered as `aria-label`. Typically for a control
	 * with no visible default-slot text; also applies alongside slot content
	 * that renders no text of its own (e.g. an icon), since the two aren't
	 * mutually exclusive and there is no way to detect from here whether
	 * arbitrary slot content renders text. Skip this when the default slot
	 * already supplies the visible label text — passing both means
	 * `aria-label` wins the accessible name and the visible text is
	 * announced by nothing.
	 */
	label?: string;
	/** Track/knob size. */
	size?: SwitchSize;
	/** Additional CSS classes, merged onto the wrapping `<label>`. */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off
	 * by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "Switch", inheritAttrs: false });

const {
	onCheckedChange,
	disabled = false,
	required = false,
	id,
	name,
	value,
	label,
	size = "md",
	class: className,
	sound = false,
} = defineProps<SwitchProps>();

/** Whether the switch is on. */
const checked = defineModel<boolean>("checked", { default: false });

defineSlots<{
	/** Visible label text, rendered beside the track. */
	default?: () => unknown;
}>();

const el = useTemplateRef<HTMLInputElement>("ref");
defineExpose({ ref: el });

// Undefined outside a FormField — every computed below then falls back to
// this component's own props instead of the context, so the control works
// standalone exactly as it does wrapped. Switch has no own `invalid` prop
// (a switch takes effect immediately; there is usually nothing to
// validate), but it still surfaces aria-invalid when a surrounding
// FormField says the field is invalid.
const field = useField();

const effectiveId = computed(() => field?.controlId ?? id);
const effectiveDisabled = computed(() => field?.disabled ?? disabled);
const effectiveRequired = computed(() => field?.required ?? required);
const effectiveInvalid = computed(() => field?.invalid ?? false);

// The native `disabled` attribute already blocks real interaction, but a
// synthetic event dispatched straight at the element — as a test does —
// walks past that guard, so the handler repeats it.
function handleChange(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	if (effectiveDisabled.value) {
		// A disabled control must never let its visible state drift from the
		// app's own model. A real browser already refuses to run the
		// default toggle action on a disabled checkbox, but a synthetic
		// event dispatched straight at the element — as a test does — can
		// still mutate the DOM property directly, so the handler puts it
		// back rather than trusting the guard above alone.
		input.checked = checked.value;
		return;
	}
	const next = input.checked;
	checked.value = next;
	if (sound) soundFx.play(next ? "toggle-on" : "toggle-off");
	onCheckedChange?.(next);
}

const wrapperClasses = computed(() =>
	cn(
		"ft-switch-wrap inline-flex items-center gap-[10px] text-[13px]",
		effectiveDisabled.value ? "cursor-not-allowed opacity-50" : "cursor-pointer",
		className
	)
);
</script>

<template>
	<label :class="wrapperClasses">
		<input
			ref="ref"
			type="checkbox"
			role="switch"
			:data-size="size"
			class="ft-switch"
			:id="effectiveId"
			:name="name"
			:value="value"
			:checked="checked"
			:disabled="effectiveDisabled"
			:required="effectiveRequired"
			:aria-checked="checked"
			:aria-invalid="effectiveInvalid ? 'true' : undefined"
			:aria-describedby="field?.describedBy"
			:aria-label="label"
			@change="handleChange"
		/>
		<slot />
	</label>
</template>

<style scoped>
/*
 * The native input IS the track — restyled, not replaced. The knob is a
 * `::after` pseudo-element on it rather than a second DOM node, so the
 * input stays the only focusable, checkable thing (same rule
 * RadioGroupItem's own filled centre follows).
 */
.ft-switch {
	--ft-switch-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	/* One local INTERNAL alias so the token pair is typed once rather than four
	   times. Declared here, on the control itself, so a value inherited from an
	   ancestor never reaches it — it is deliberately not a theming knob, and the
	   README says so. Retiming a Switch is done through --ft-duration-fast /
	   --ft-ease-inout, which this reads and which do inherit.
	   150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout.
	   `inout` and not `out`: a switch is a reversible state flip, not an
	   arrival — the knob travels the same way in both directions. */
	--ft-switch-motion: var(--ft-duration-fast, 150ms)
		var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	appearance: none;
	flex: none;
	margin: 0;
	border-radius: 999px;
	background-color: var(--color-input, rgba(154, 163, 178, 0.3));
	position: relative;
	cursor: pointer;
	vertical-align: middle;
	/* Colour is a state change, not motion (the knob's slide below is the
	   only thing here that travels), so it stays outside the reduced-motion
	   query — the same rule Toggle's and Input's own colour transitions
	   follow. */
	transition: background-color var(--ft-switch-motion);
}

.ft-switch::after {
	content: "";
	position: absolute;
	top: 3px;
	left: 3px;
	border-radius: 50%;
	background-color: var(--color-muted-foreground, #9aa3b2);
	transition: background-color var(--ft-switch-motion);
}

.ft-switch:checked {
	background-color: var(--ft-switch-accent);
}

.ft-switch:checked::after {
	background-color: white;
}

.ft-switch:disabled {
	cursor: not-allowed;
}

.ft-switch:focus-visible {
	outline: none;
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-switch-accent) 25%, transparent);
}

/*
 * Geometry per size — exact pixel values, not the closest Tailwind scale
 * step, so the three sizes stay proportioned to each other and the
 * knob's travel always lands exactly on
 * track width − knob size − 2 × inset.
 */
.ft-switch[data-size="sm"] {
	width: 32px;
	height: 18px;
}
.ft-switch[data-size="sm"]::after {
	width: 12px;
	height: 12px;
}
.ft-switch[data-size="sm"]:checked::after {
	transform: translateX(14px);
}

.ft-switch[data-size="md"] {
	width: 40px;
	height: 22px;
}
.ft-switch[data-size="md"]::after {
	width: 16px;
	height: 16px;
}
.ft-switch[data-size="md"]:checked::after {
	transform: translateX(18px);
}

.ft-switch[data-size="lg"] {
	width: 48px;
	height: 26px;
}
.ft-switch[data-size="lg"]::after {
	width: 20px;
	height: 20px;
}
.ft-switch[data-size="lg"]:checked::after {
	transform: translateX(22px);
}

/*
 * The knob's slide is the only motion here — colour changes above are
 * exempt from reduced-motion the same way Toggle's and Input's own
 * hover/pressed colour transitions are, but a moving element needs the
 * opt-out. Under reduced motion the knob still lands in the right place,
 * it just snaps instead of sliding.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-switch::after {
		transition:
			background-color var(--ft-switch-motion),
			transform var(--ft-switch-motion);
	}
}
</style>
