<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface BentoGridCardProps {
	name: string;
	description: string;
	href: string;
	cta: string;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import BentoFrame from "./BentoFrame.vue";

defineOptions({ name: "BentoGridCard", inheritAttrs: false });

const {
	name,
	description: desc,
	href,
	cta,
	class: className = "",
} = defineProps<BentoGridCardProps>();

defineSlots<{
	icon?: () => unknown;
	background?: () => unknown;
}>();
</script>

<template>
	<BentoFrame :class="['group col-span-3', className]" panel-class="justify-end">
		<!-- Not aria-hidden and not inert: the slot can hold real, interactive content, as it always could. -->
		<div v-if="$slots.background" class="absolute inset-0 -z-10 overflow-hidden">
			<slot name="background" />
		</div>

		<div class="bento-lift pointer-events-none relative z-10 flex flex-col gap-1 p-6">
			<div v-if="$slots.icon" class="bento-icon mb-3 size-11 [&_svg]:size-5">
				<slot name="icon" />
			</div>
			<h3 class="text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
				{{ name }}
			</h3>
			<p class="max-w-lg text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
				{{ desc }}
			</p>
			<a
				:href="href"
				class="bento-cta pointer-events-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-[var(--bento-accent,#8e9cff)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-neutral-100"
			>
				{{ cta }}
				<svg
					aria-hidden="true"
					viewBox="0 0 16 16"
					class="size-3.5 text-[var(--bento-accent,#8e9cff)]"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 8h9.5M8.5 4l4 4-4 4" />
				</svg>
			</a>
		</div>
	</BentoFrame>
</template>
