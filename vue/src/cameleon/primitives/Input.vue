<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface InputProps {
	error?: boolean;
	/** Force a visual state for the /skins state matrix. */
	demoState?: PartState;
	class?: HTMLAttributes["class"];
	value?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Input", inheritAttrs: false });

const { error = false, demoState, class: className } = defineProps<InputProps>();

const value = defineModel<string>("value", { default: "" });

const attrs = useAttrs();
const input = useTemplateRef<HTMLInputElement>("input");
defineExpose({ ref: input });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.input({ state: demoState }));
</script>

<template>
	<input
		ref="input"
		v-model="value"
		:class="cn(parts.root, className)"
		:aria-invalid="error"
		v-bind="attrs"
	/>
</template>
