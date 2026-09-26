<script lang="ts" module>
	export interface FallingStarsBgProps {
		/** Star color as hex string */
		color?: string;
		/** Number of stars */
		count?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount, untrack } from "svelte";
	import { createFallingStars, type FallingStarsEngine } from "./bg-falling-stars-core.js";

	let { color = "#FFF", count = 200, class: className = "" }: FallingStarsBgProps = $props();

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
