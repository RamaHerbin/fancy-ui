<script lang="ts" module>
	export interface MatrixRainProps {
		color?: string;
		speed?: number;
		density?: number;
		glyphSize?: number;
		fadeOpacity?: number;
		class?: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createMatrixRain, type MatrixRainEngine } from "./matrix-rain-core.js";

	let {
		color = "#00ff41",
		speed = 1.0,
		density = 1.0,
		glyphSize = 16,
		fadeOpacity = 0.05,
		class: className,
	}: MatrixRainProps = $props();

	let canvas: HTMLCanvasElement;
	let engine: MatrixRainEngine | null = null;

	// Mount only: the engine lives for the component's lifetime. Prop reads are
	// untracked so no prop change can tear it down — the relayout that a
	// glyphSize/density change used to cause is carried by setOptions below.
	$effect(() => {
		const initial = untrack(() => ({ color, speed, density, glyphSize, fadeOpacity }));
		engine = createMatrixRain({ canvas }, initial);
		if (!engine) return;

		const observer = new ResizeObserver(() => engine?.resize());
		observer.observe(canvas);

		return () => {
			observer.disconnect();
			engine?.destroy();
			engine = null;
		};
	});

	// Per-frame appearance props: applied in place, no relayout.
	$effect(() => {
		const next = { color, speed, fadeOpacity };
		untrack(() => engine?.setOptions(next));
	});

	// Layout props: the engine relayouts the column grid when either changes.
	$effect(() => {
		const next = { glyphSize, density };
		untrack(() => engine?.setOptions(next));
	});
</script>

<canvas bind:this={canvas} class={cn("block h-full w-full bg-black", className)}></canvas>
