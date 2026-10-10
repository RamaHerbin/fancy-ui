<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { PartState } from "../types.js";

export interface SwitchProps {
	checked?: boolean;
	error?: boolean;
	demoState?: PartState;
	/** Read by the component, so it is declared rather than a fallthrough attribute. */
	disabled?: boolean;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useSkin } from "../context.js";

defineOptions({ name: "Switch", inheritAttrs: false });

const { error = false, disabled = false, demoState, class: className } = defineProps<SwitchProps>();

const checked = defineModel<boolean>("checked", { default: false });

const attrs = useAttrs();
const root = useTemplateRef<HTMLButtonElement>("root");
defineExpose({ ref: root });

const ctx = useSkin();
const parts = computed(() => ctx.skin.recipes.switch({ state: demoState }));

function toggle() {
	checked.value = !checked.value;
}
</script>

<template>
	<button
		ref="root"
		type="button"
		role="switch"
		:aria-checked="checked"
		:aria-invalid="error"
		:disabled="disabled"
		@click="toggle"
		:class="cn(parts.root, className)"
		v-bind="attrs"
	>
		<span :class="parts.thumb"></span>
	</button>
</template>
