<script lang="ts" module>
	export interface FallingStarsBgProps {
		/** Star color: a hex string, or `currentColor` (default) to follow the text colour */
		color?: string;
		/** Number of stars */
		count?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount, untrack } from "svelte";
	import { createFallingStars, type FallingStarsEngine } from "./bg-falling-stars-core.js";

	let {
		color = "currentColor",
		count = 200,
		class: className = "",
	}: FallingStarsBgProps = $props();

	let canvas: HTMLCanvasElement;
	let engine: FallingStarsEngine | null = null;

	$effect(() => {
		const nextColor = color;
		untrack(() => engine?.setOptions({ color: nextColor }));
	});

	onMount(() => {
		engine = createFallingStars({ canvas }, { count, color });

		const resizeObserver = new ResizeObserver(() => engine?.resize());
		resizeObserver.observe(canvas);

		return () => {
			engine?.destroy();
			resizeObserver.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class={cn("absolute inset-0 h-full w-full", className)}></canvas>
