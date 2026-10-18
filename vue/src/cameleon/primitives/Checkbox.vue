<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface CheckboxProps {
	checked?: boolean;
	error?: boolean;
	demoState?: PartState;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Checkbox", inheritAttrs: false });

const { error = false, demoState, class: className } = defineProps<CheckboxProps>();

const checked = defineModel<boolean>("checked", { default: false });

defineSlots<{ default?: () => unknown }>();

const attrs = useAttrs();
const input = useTemplateRef<HTMLInputElement>("input");
defineExpose({ ref: input });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.checkbox({ state: demoState }));
</script>

<template>
	<label :class="cn(parts.root, className)">
		<input
			ref="input"
			type="checkbox"
			class="peer sr-only"
			v-model="checked"
			:aria-invalid="error"
			v-bind="attrs"
		/>
		<span :class="parts.box">
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3.5"
				aria-hidden="true"
			>
				<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
		<slot />
	</label>
</template>
