<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface SelectProps {
	error?: boolean;
	demoState?: PartState;
	class?: HTMLAttributes["class"];
	value?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Select", inheritAttrs: false });

const { error = false, demoState, class: className } = defineProps<SelectProps>();

const value = defineModel<string>("value", { default: "" });

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();
const select = useTemplateRef<HTMLSelectElement>("select");
defineExpose({ ref: select });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.select({ state: demoState }));
</script>

<template>
	<div :class="cn(parts.root, className)">
		<select ref="select" v-model="value" :class="parts.field" :aria-invalid="error" v-bind="attrs">
			<slot />
		</select>
		<span :class="parts.chevron" aria-hidden="true">
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
	</div>
</template>
