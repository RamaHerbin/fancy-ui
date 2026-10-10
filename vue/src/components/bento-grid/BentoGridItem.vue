<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BentoGridItemProps {
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import BentoFrame from "./BentoFrame.vue";

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
	<BentoFrame
		:class="['group/bento row-span-1', className]"
		panel-class="justify-between gap-4 p-4"
	>
		<slot v-if="$slots.header" name="header" />
		<div class="bento-lift relative">
			<div v-if="$slots.icon || $slots.title" class="mb-1.5 flex items-center gap-2.5">
				<div v-if="$slots.icon" class="bento-icon size-8 [&_svg]:size-4">
					<slot name="icon" />
				</div>
				<div
					v-if="$slots.title"
					class="min-w-0 font-sans text-[15px] font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
				>
					<slot name="title" />
				</div>
			</div>
			<div
				v-if="$slots.description"
				class="font-sans text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400"
			>
				<slot name="description" />
			</div>
		</div>
	</BentoFrame>
</template>
