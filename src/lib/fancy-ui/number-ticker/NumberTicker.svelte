<script lang="ts" module>
	/**
	 * NumberTicker - Animated number counter
	 *
	 * Animates a number from 0 to `value` (or vice versa) with easing.
	 * Triggers when the element enters the viewport via IntersectionObserver.
	 * Formatted using Intl.NumberFormat.
	 */
	export interface NumberTickerProps {
		/** Target number to animate to */
		value?: number;
		/** Animation direction: "up" counts 0→value, "down" counts value→0 */
		direction?: "up" | "down";
		/** Animation duration in ms */
		duration?: number;
		/** Delay before animation starts (ms) */
		delay?: number;
		/** Number of decimal places to display */
		decimalPlaces?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let {
		value = 0,
		direction = "up",
		duration = 1000,
		delay = 0,
		decimalPlaces = 0,
		class: className,
	}: NumberTickerProps = $props();

	let spanRef: HTMLSpanElement;
	let initialValue = $derived(direction === "down" ? value : 0);
	let displayValue = $state(0);
	let hasAnimated = false;
	let animationFrameId: number | null = null;

	// Set initial display value
	$effect(() => {
		if (!hasAnimated) {
			displayValue = initialValue;
		}
	});

	// Easing: easeOutCubic
	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	function animate(target: number) {
		const start = displayValue;
		const startTime = performance.now() + delay;

		function tick(now: number) {
			if (now < startTime) {
				animationFrameId = requestAnimationFrame(tick);
				return;
			}
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutCubic(progress);

			displayValue = start + (target - start) * easedProgress;

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(tick);
			}
		}

		animationFrameId = requestAnimationFrame(tick);
	}

	let formattedValue = $derived(
		new Intl.NumberFormat("en-US", {
			minimumFractionDigits: decimalPlaces,
			maximumFractionDigits: decimalPlaces,
		}).format(Number(displayValue.toFixed(decimalPlaces)))
	);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !hasAnimated) {
					hasAnimated = true;
					const target = direction === "down" ? 0 : value;
					animate(target);
					observer.disconnect();
				}
			},
			{ threshold: 0 }
		);

		observer.observe(spanRef);

		return () => {
			observer.disconnect();
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
		};
	});

	// Re-animate when value prop changes after initial animation
	let animTarget = $derived(direction === "down" ? 0 : value);
	$effect(() => {
		// Access derived to track changes
		const target = animTarget;
		if (hasAnimated) {
			animate(target);
		}
	});
</script>

<span
	bind:this={spanRef}
	class={cn(
		"number-ticker inline-block tracking-wider text-black tabular-nums dark:text-white",
		className
	)}
>
	{formattedValue}
</span>
