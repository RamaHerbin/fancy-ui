<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount, untrack } from "svelte";
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

	onMount(() => {
		engine = createSparkles(
			{ canvas: canvasRef, container: containerRef },
			{ minSize, maxSize, speed, particleDensity, particleColor }
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
		untrack(() => engine?.setOptions({ particleColor: color }));
	});
</script>

<div
	bind:this={containerRef}
	class={cn("relative size-full overflow-hidden will-change-transform", className)}
	style:background
>
	<canvas bind:this={canvasRef} class="absolute inset-0 size-full" aria-hidden="true"></canvas>
</div>
