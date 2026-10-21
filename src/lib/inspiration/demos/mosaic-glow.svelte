<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
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
		hdr={values.hdr !== false}
	/>
	<span
		class="finds-caption pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10.5px] tracking-[0.2em] text-white/55"
		aria-hidden="true">SWEEP THE TILES</span
	>
	<!-- Shown only while the HDR light layer is actually running on this display. -->
	<span
		class="finds-hdr pointer-events-none absolute top-3 right-3 rounded-full border border-white/25 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em] text-white/70"
		aria-hidden="true">HDR</span
	>
</div>

<style>
	.finds-caption {
		transition: opacity 400ms ease;
	}
	.finds-mosaic:hover .finds-caption {
		opacity: 0;
	}
	.finds-hdr {
		opacity: 0;
		transition: opacity 400ms ease;
	}
	.finds-mosaic:has(:global([data-hdr])) .finds-hdr {
		opacity: 1;
	}
</style>
