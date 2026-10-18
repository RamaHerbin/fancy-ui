<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SliderProps {
	error?: boolean;
	class?: HTMLAttributes["class"];
	value?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Slider", inheritAttrs: false });

const { error = false, class: className } = defineProps<SliderProps>();

// `.number` on the binding reproduces the numeric coercion a range input's
// two-way binding has in the source; the raw DOM value is always a string.
const value = defineModel<number>("value", { default: 50 });

const attrs = useAttrs();
const input = useTemplateRef<HTMLInputElement>("input");
defineExpose({ ref: input });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.slider({ state: error ? "error" : undefined }));
</script>

<template>
	<input
		ref="input"
		type="range"
		v-model.number="value"
		:class="cn(parts.root, className)"
		:aria-invalid="error || undefined"
		v-bind="attrs"
	/>
</template>
