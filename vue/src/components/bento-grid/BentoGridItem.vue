<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BentoGridItemProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "BentoGridItem", inheritAttrs: false });

const { class: className = "" } = defineProps<BentoGridItemProps>();

defineSlots<{
	header?: () => unknown;
	icon?: () => unknown;
	title?: () => unknown;
	description?: () => unknown;
}>();
</script>

<template>
	<div
		:class="
			cn(
				'group/bento shadow-input row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-transparent bg-white p-4 transition duration-200 hover:shadow-xl dark:border-white/[0.2] dark:bg-black dark:shadow-none',
				className
			)
		"
	>
		<slot v-if="$slots.header" name="header" />
		<div class="transition duration-200 group-hover/bento:translate-x-2">
			<slot v-if="$slots.icon" name="icon" />
			<div
				v-if="$slots.title"
				class="my-2 font-sans font-bold text-neutral-600 dark:text-neutral-200"
			>
				<slot name="title" />
			</div>
			<div
				v-if="$slots.description"
				class="font-sans text-xs font-normal text-neutral-600 dark:text-neutral-300"
			>
				<slot name="description" />
			</div>
		</div>
	</div>
</template>
