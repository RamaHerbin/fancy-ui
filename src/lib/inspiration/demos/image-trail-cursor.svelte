<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { ImageTrailCursor, type VariantType } from "$lib/fancy-ui/image-trail-cursor";

	let { values }: { values: PlaygroundValues } = $props();

	const images = [1, 2, 3, 4, 5, 6].map((n) => `/landing/trail/0${n}.webp`);
</script>

<div class="finds-trail relative h-full w-full cursor-crosshair overflow-hidden bg-[#0b0b0d]">
	<span
		class="finds-caption pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10.5px] tracking-[0.2em] text-white/45"
		aria-hidden="true">MOVE TO LEAVE A TRAIL</span
	>
	<ImageTrailCursor {images} variant={values.variant as VariantType} class="absolute inset-0" />
</div>

<style>
	/* Card-sized stage: smaller frames than the full-width docs demo. */
	.finds-trail :global(.content__img) {
		width: 96px;
		border-radius: 8px;
	}
	.finds-caption {
		transition: opacity 400ms ease;
	}
	.finds-trail:hover .finds-caption {
		opacity: 0;
	}
</style>
