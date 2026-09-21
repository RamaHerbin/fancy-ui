<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * BoxReveal - Sliding box reveal animation
 *
 * Content fades up while a colored box slides from left to right,
 * revealing the content underneath. Triggers when entering viewport
 * via IntersectionObserver.
 */
export interface BoxRevealProps {
	/** Color of the reveal box */
	color?: string;
	/** Animation duration in seconds */
	duration?: number;
	/** Delay before animation starts (seconds) */
	delay?: number;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useInView } from "../../internals/motion/use-in-view.js";

defineOptions({ name: "BoxReveal", inheritAttrs: false });

const {
	color = "#5046e6",
	duration = 0.5,
	delay = 0.25,
	class: className,
} = defineProps<BoxRevealProps>();

defineSlots<{
	default(): unknown;
}>();

const containerRef = useTemplateRef<HTMLDivElement>("containerRef");

const isInView = useInView(containerRef, () => ({ threshold: 0.1, once: true }));

const contentStyle = computed(() => ({
	opacity: isInView.value ? "1" : "0",
	transform: `translateY(${isInView.value ? 0 : 25}px)`,
	transition: `opacity ${duration}s ease ${delay * 2}s,transform ${duration}s ease ${delay * 2}s`,
}));

const overlayStyle = computed(() => ({
	background: `${color}`,
	left: isInView.value ? "100%" : "0%",
	transition: `left ${duration}s ease-in ${delay}s`,
}));
</script>

<template>
	<div ref="containerRef" :class="cn('box-reveal relative overflow-hidden', className)">
		<!-- Content (fades up) -->
		<div class="box-reveal-content" :style="contentStyle">
			<slot />
		</div>

		<!-- Sliding box overlay -->
		<div class="box-reveal-overlay absolute inset-0 z-20" :style="overlayStyle"></div>
	</div>
</template>
