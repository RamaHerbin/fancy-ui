<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface LabelProps {
	/** Explicit target id. Inside a FormField the field's own control id wins — see the README. */
	for?: string;
	/** Renders the required asterisk. Inside a FormField the field's own `required` wins. */
	required?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";

defineOptions({ name: "Label", inheritAttrs: false });

const { for: forProp, required = false, class: className } = defineProps<LabelProps>();

// The source's `children` snippet. Plain, unparameterised content.
defineSlots<{ default?: () => unknown }>();

// Convention C-4: exactly where the source declares its bindable `ref`.
const el = useTemplateRef<HTMLLabelElement>("el");
defineExpose({ ref: el });

// A surrounding FormField exists specifically so a caller never wires
// `for` by hand, so it is the authority over both of these whenever one
// is present — the same precedence every control in this wave follows
// for its own id/required/disabled. Standalone, with no FormField above,
// the plain props are all there is.
const field = useField();
const resolvedFor = computed(() => field?.controlId ?? forProp);
const resolvedRequired = computed(() => field?.required ?? required);
// Not a prop — `field.labelId` only exists to be carried on *this*
// element, so a control whose root isn't labelable (a `<div
// role="radiogroup">`, say) has an id to point its own `aria-labelledby`
// at. `undefined` outside a FormField: nothing needs to reach a
// standalone Label that way, `for` already does the job wherever it
// applies.
const labelId = computed(() => field?.labelId);

const classes = computed(() => cn("ft-label text-[13px] font-medium", className));

// The template's explicit single-space interpolation between the slot and the
// asterisk is the space the source's markup carries there: Vue's whitespace
// condensing drops a newline-bearing text node that Svelte collapses to one
// space, so without it the star would sit flush against the label text.
</script>

<template>
	<label ref="el" :id="labelId" :for="resolvedFor" :class="classes">
		<slot />{{ " "
		}}<span v-if="resolvedRequired" aria-hidden="true" class="text-destructive">*</span>
	</label>
</template>
