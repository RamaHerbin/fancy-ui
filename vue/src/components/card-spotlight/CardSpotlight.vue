<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface CardSpotlightProps {
	/** Classes for the outer container */
	class?: HTMLAttributes["class"];
	/** Classes for the content wrapper */
	slotClass?: string;
	/** Radius of the spotlight gradient */
	gradientSize?: number;
	/** Color of the spotlight */
	gradientColor?: string;
	/** Opacity of the gradient overlay */
	gradientOpacity?: number;
}
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "CardSpotlight", inheritAttrs: false });

const {
	class: className = "",
	slotClass = "",
	gradientSize = 200,
	gradientColor = "#262626",
	gradientOpacity = 0.8,
} = defineProps<CardSpotlightProps>();

const mouseX = ref(-gradientSize * 10);
const mouseY = ref(-gradientSize * 10);

function handleMouseMove(e: MouseEvent) {
	const target = e.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	mouseX.value = e.clientX - rect.left;
	mouseY.value = e.clientY - rect.top;
}

function handleMouseLeave() {
	mouseX.value = -gradientSize * 10;
	mouseY.value = -gradientSize * 10;
}

const backgroundStyle = computed(
	() =>
		`radial-gradient(circle at ${mouseX.value}px ${mouseY.value}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`
);
</script>

<template>
	<div
		:class="
			cn(
				'group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white',
				className
			)
		"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	>
		<div :class="cn('relative z-10', slotClass)">
			<slot />
		</div>
		<div
			class="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
			:style="{ background: backgroundStyle, opacity: gradientOpacity }"
		></div>
	</div>
</template>
