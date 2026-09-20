<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface RadioProps {
	/** The currently selected value across this radio's group. */
	group?: string;
	value?: string;
	/** Read by the component (it falls back to `group`), so it is declared. */
	name?: string;
	error?: boolean;
	demoState?: PartState;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Radio", inheritAttrs: false });

const { value, name, error = false, demoState, class: className } = defineProps<RadioProps>();

const group = defineModel<string>("group");

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();
const input = useTemplateRef<HTMLInputElement>("input");
defineExpose({ ref: input });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.radio({ state: demoState }));
</script>

<template>
	<label :class="cn(parts.root, className)">
		<!-- radio invalidity belongs on the group, not the input; drive the demo
		     error visual off a data-attribute so we don't misuse aria-invalid.
		     name defaults to the group so same-group radios stay mutually exclusive
		     natively even when the parent doesn't share a bound group variable. -->
		<input
			ref="input"
			type="radio"
			class="peer sr-only"
			v-model="group"
			:name="name ?? group"
			:value="value"
			:data-invalid="error ? 'true' : undefined"
			v-bind="attrs"
		/>
		<span :class="parts.box"></span>
		<slot />
	</label>
</template>
