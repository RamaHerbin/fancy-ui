<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount, untrack } from "svelte";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import { createSparkles, type SparklesEngine } from "./sparkles-core.js";

	interface Props {
		background?: string;
		particleColor?: string;
		minSize?: number;
		maxSize?: number;
		speed?: number;
		particleDensity?: number;
		class?: string;
	}

	let {
		background = "#0d47a1",
		particleColor = "#ffffff",
		minSize = 1,
		maxSize = 3,
		speed = 4,
		particleDensity = 120,
		class: className = "",
	}: Props = $props();

	let containerRef: HTMLDivElement;
	let canvasRef: HTMLCanvasElement;
	let engine: SparklesEngine | null = null;

	// Started before the engine is created so the first frame already knows.
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	onMount(() => {
		engine = createSparkles(
			{ canvas: canvasRef, container: containerRef },
			{ minSize, maxSize, speed, particleDensity, particleColor, reducedMotion: reduced.current }
		);

		const resizeObserver = new ResizeObserver(() => engine?.resize());
		resizeObserver.observe(containerRef);

		return () => {
			resizeObserver.disconnect();
			engine?.destroy();
		};
	});

	$effect(() => {
		const color = particleColor;
		const reducedMotion = reduced.current;
		untrack(() => engine?.setOptions({ particleColor: color, reducedMotion }));
	});
</script>

<div
	bind:this={containerRef}
	class={cn("relative size-full overflow-hidden will-change-transform", className)}
	style:background
>
	<canvas bind:this={canvasRef} class="absolute inset-0 size-full" aria-hidden="true"></canvas>
</div>
