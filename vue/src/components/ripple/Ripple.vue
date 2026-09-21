<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface RippleProps {
	baseCircleSize?: number;
	baseCircleOpacity?: number;
	spaceBetweenCircle?: number;
	circleOpacityDowngradeRatio?: number;
	circleClass?: string;
	waveSpeed?: number;
	numberOfCircles?: number;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "Ripple", inheritAttrs: false });

const {
	baseCircleSize = 210,
	baseCircleOpacity = 0.24,
	spaceBetweenCircle = 70,
	circleOpacityDowngradeRatio = 0.03,
	circleClass = "",
	waveSpeed = 80,
	numberOfCircles = 7,
	class: className = "",
} = defineProps<RippleProps>();

const circles = computed(() =>
	Array.from({ length: numberOfCircles }, (_, i) => ({
		size: baseCircleSize + i * spaceBetweenCircle,
		opacity: baseCircleOpacity - i * circleOpacityDowngradeRatio,
		delay: i * waveSpeed,
		borderStyle: i === numberOfCircles - 1 ? "dashed" : "solid",
	}))
);
</script>

<template>
	<div :class="cn('absolute inset-0', className)" aria-hidden="true">
		<div
			v-for="(circle, i) in circles"
			:key="i"
			:class="cn('animate-ripple-circle absolute rounded-full shadow-xl motion-reduce:animate-none', circleClass)"
			:style="`width: ${circle.size}px; height: ${circle.size}px; opacity: ${circle.opacity}; animation-delay: ${circle.delay}ms; border-style: ${circle.borderStyle}; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1); border-width: 1px;`"
		></div>
	</div>
</template>

<style>
@keyframes ripple-effect {
	0%,
	100% {
		transform: translate(-50%, -50%) scale(1);
	}
	50% {
		transform: translate(-50%, -50%) scale(0.9);
	}
}
</style>

<style scoped>
.animate-ripple-circle {
	animation: ripple-effect 2s ease-in-out infinite;
}
</style>
