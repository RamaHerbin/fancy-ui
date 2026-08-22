<script lang="ts" module>
	export interface InteractiveGridPatternProps {
		/** Additional CSS classes for the SVG container */
		class?: string;
		/** Additional CSS classes for individual squares */
		squaresClassName?: string;
		/** Additional CSS classes controlling the square outline color */
		strokeClassName?: string;
		/** Width of each square in pixels */
		width?: number;
		/** Height of each square in pixels */
		height?: number;
		/** Grid dimensions [columns, rows] */
		squares?: [number, number];
		/** Whether squares respond to hover. When false, renders a static graph-paper grid with no listeners */
		interactive?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		squaresClassName,
		strokeClassName = "stroke-gray-400/30",
		width = 40,
		height = 40,
		squares = [24, 24] as [number, number],
		interactive = true,
	}: InteractiveGridPatternProps = $props();

	let hoveredSquare: number | null = $state(null);

	const cols = $derived(squares[0]);
	const rows = $derived(squares[1]);
	const totalSquares = $derived(cols * rows);
	const gridWidth = $derived(width * cols);
	const gridHeight = $derived(height * rows);

	function getX(index: number) {
		return (index % cols) * width;
	}

	function getY(index: number) {
		return Math.floor(index / cols) * height;
	}
</script>

<svg
	width={gridWidth}
	height={gridHeight}
	class={cn("absolute inset-0 h-full w-full border border-gray-400/30", className)}
>
	{#each { length: totalSquares } as _, index}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<rect
			x={getX(index)}
			y={getY(index)}
			{width}
			{height}
			class={cn(
				"interactive-grid-square transition-all duration-100 ease-in-out",
				strokeClassName,
				hoveredSquare === index ? "fill-gray-300/30" : "fill-transparent",
				squaresClassName
			)}
			onmouseenter={interactive ? () => (hoveredSquare = index) : undefined}
			onmouseleave={interactive ? () => (hoveredSquare = null) : undefined}
		/>
	{/each}
</svg>

<style>
	.interactive-grid-square:not(:hover) {
		transition-duration: 1000ms;
	}
</style>
