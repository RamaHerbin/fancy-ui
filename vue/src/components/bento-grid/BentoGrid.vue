<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BentoGridProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "BentoGrid", inheritAttrs: false });

const { class: className = "" } = defineProps<BentoGridProps>();

defineSlots<{
	default?: () => unknown;
}>();
</script>

<template>
	<div
		:class="
			cn(
				'mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3',
				className
			)
		"
	>
		<slot v-if="$slots.default" />
	</div>
</template>
