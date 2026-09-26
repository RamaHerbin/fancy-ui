<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { MosaicGlow } from "$lib/fancy-ui/mosaic-glow";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="finds-mosaic relative h-full w-full overflow-hidden">
	<MosaicGlow
		class="absolute inset-0"
		color={values.color as string}
		tileSize={values.tileSize as number}
		radius={values.radius as number}
		background="#060606"
		idle="drift"
		interactive
	/>
	<span
		class="finds-caption pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10.5px] tracking-[0.2em] text-white/55"
		aria-hidden="true">SWEEP THE TILES</span
	>
</div>

<style>
	.finds-caption {
		transition: opacity 400ms ease;
	}
	.finds-mosaic:hover .finds-caption {
		opacity: 0;
	}
</style>
