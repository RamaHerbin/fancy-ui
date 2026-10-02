<script lang="ts" module>
	/**
	 * FlickeringGrid - Canvas-based grid with flickering opacity squares
	 *
	 * Uses ResizeObserver, IntersectionObserver, and requestAnimationFrame
	 * for performant rendering with automatic pause when off-screen.
	 */
	export interface FlickeringGridProps {
		/** Size of each grid square in pixels */
		squareSize?: number;
		/** Gap between squares in pixels */
		gridGap?: number;
		/** Probability of a square changing opacity each second (0-1) */
		flickerChance?: number;
		/** Color of the squares (hex format) */
		color?: string;
		/** Maximum opacity of squares (0-1) */
		maxOpacity?: number;
		/** Fixed width in pixels (defaults to container width) */
		width?: number;
		/** Fixed height in pixels (defaults to container height) */
		height?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount, untrack } from "svelte";
	import { createFlickeringGrid, type FlickeringGridEngine } from "./flickering-grid-core.js";

	let {
		squareSize = 4,
		gridGap = 6,
		flickerChance = 0.3,
		color = "#000000",
		maxOpacity = 0.3,
		width,
		height,
		class: className,
	}: FlickeringGridProps = $props();

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let engine: FlickeringGridEngine | null = null;

	onMount(() => {
		engine = createFlickeringGrid(
			{ container: containerEl, canvas: canvasEl },
			{ squareSize, gridGap, flickerChance, color, maxOpacity, width, height }
		);
		if (!engine) return;

		const resizeObserver = new ResizeObserver(() => {
			engine?.resize();
		});

		const intersectionObserver = new IntersectionObserver(
			([entry]) => {
				engine?.setInView(entry.isIntersecting);
			},
			{ threshold: 0 }
		);

		resizeObserver.observe(containerEl);
		intersectionObserver.observe(canvasEl);

		return () => {
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			engine?.destroy();
			engine = null;
		};
	});

	$effect(() => {
		const next = { squareSize, gridGap, flickerChance, color, maxOpacity, width, height };
		untrack(() => engine?.setOptions(next));
	});
</script>

<div bind:this={containerEl} class={cn("h-full w-full", className)}>
	<canvas bind:this={canvasEl} class="pointer-events-none"></canvas>
</div>
