<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		baseCircleSize?: number;
		baseCircleOpacity?: number;
		spaceBetweenCircle?: number;
		circleOpacityDowngradeRatio?: number;
		circleClass?: string;
		waveSpeed?: number;
		numberOfCircles?: number;
		class?: string;
	}

	let {
		baseCircleSize = 210,
		baseCircleOpacity = 0.24,
		spaceBetweenCircle = 70,
		circleOpacityDowngradeRatio = 0.03,
		circleClass = "",
		waveSpeed = 80,
		numberOfCircles = 7,
		class: className = "",
	}: Props = $props();

	let circles = $derived(
		Array.from({ length: numberOfCircles }, (_, i) => ({
			size: baseCircleSize + i * spaceBetweenCircle,
			opacity: baseCircleOpacity - i * circleOpacityDowngradeRatio,
			delay: i * waveSpeed,
			borderStyle: i === numberOfCircles - 1 ? "dashed" : "solid",
		}))
	);
</script>

<div class={cn("absolute inset-0", className)} aria-hidden="true">
	{#each circles as circle, i (i)}
		<div
			class={cn(
				"animate-ripple-circle absolute rounded-full shadow-xl motion-reduce:animate-none",
				circleClass
			)}
			style="width: {circle.size}px; height: {circle.size}px; opacity: {circle.opacity}; animation-delay: {circle.delay}ms; border-style: {circle.borderStyle}; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1); border-width: 1px;"
		></div>
	{/each}
</div>

<style>
	:global {
		@keyframes ripple-effect {
			0%,
			100% {
				transform: translate(-50%, -50%) scale(1);
			}
			50% {
				transform: translate(-50%, -50%) scale(0.9);
			}
		}
	}

	.animate-ripple-circle {
		animation: ripple-effect 2s ease-in-out infinite;
	}
</style>
