<script lang="ts" module>
	export interface PixelLoaderProps {
		/** Number of pixel columns */
		cols?: number;
		/** Number of pixel rows */
		rows?: number;
		/** Size of a single pixel in px */
		cellSize?: number;
		/** Space between pixels in px */
		gap?: number;
		/** Pixel colour, any CSS colour value */
		color?: string;
		/** Duration of one full pulse cycle in seconds */
		speed?: number;
		/** Accessible label announced by assistive tech */
		label?: string;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		cols = 5,
		rows = 5,
		cellSize = 6,
		gap = 2,
		color = "var(--ft-pixel-color, currentColor)",
		speed = 1.6,
		label = "Loading",
		class: className,
		ref = $bindable(null),
	}: PixelLoaderProps = $props();

	// A zero or negative animation-duration invalidates the whole declaration.
	const cycle = $derived(Math.max(0.01, speed));

	// Delays are a pure function of (row, col) so the server and the client
	// render byte-identical markup — no Math.random, no post-hydration shuffle.
	// (row + col) walks the anti-diagonals, which reads as a wave crossing the
	// grid from the top-left corner to the bottom-right one.
	const delays = $derived.by(() => {
		const span = rows + cols;
		const step = cycle / span;
		const out: number[] = [];
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				out.push(((row + col) % span) * step);
			}
		}
		return out;
	});

	const rootStyle = $derived(
		[
			`--ft-pixel-cell-color: ${color}`,
			`--ft-pixel-speed: ${cycle}s`,
			`grid-template-columns: repeat(${cols}, ${cellSize}px)`,
			`grid-auto-rows: ${cellSize}px`,
			`gap: ${gap}px`,
		].join("; ")
	);
</script>

<div
	bind:this={ref}
	role="status"
	aria-live="polite"
	class={cn("inline-grid", className)}
	style={rootStyle}
>
	<span class="sr-only">{label}</span>
	{#each delays as delay, i (i)}
		<span class="ft-pixel" style="animation-delay: {delay}s"></span>
	{/each}
</div>

<style>
	.ft-pixel {
		background-color: var(--ft-pixel-cell-color);
		border-radius: 1px;
		/*
		 * Reduced motion holds every pixel at the mid-pulse value: the grid still
		 * reads as a loader, it just stops moving. Putting the animation entirely
		 * behind the no-preference query means there is nothing to override.
		 */
		opacity: 0.55;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ft-pixel {
			/* `backwards` keeps a delayed pixel dim instead of flashing at 0.55
			   until its turn comes around. */
			animation: ft-pixel-pulse var(--ft-pixel-speed) ease-in-out infinite backwards;
		}

		@keyframes ft-pixel-pulse {
			0%,
			100% {
				opacity: 0.15;
			}
			50% {
				opacity: 1;
			}
		}
	}
</style>
