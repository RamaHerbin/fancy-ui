<script lang="ts">
	import { ImageTrailCursor } from "$lib/fancy-ui/image-trail-cursor";
	import type { VariantType } from "$lib/fancy-ui/image-trail-cursor";

	const images = [
		"https://picsum.photos/seed/trail1/400/440",
		"https://picsum.photos/seed/trail2/400/440",
		"https://picsum.photos/seed/trail3/400/440",
		"https://picsum.photos/seed/trail4/400/440",
		"https://picsum.photos/seed/trail5/400/440",
		"https://picsum.photos/seed/trail6/400/440",
	];

	const variants: { type: VariantType; label: string }[] = [
		{ type: "type1", label: "Fade & Scale" },
		{ type: "type2", label: "Brightness" },
		{ type: "type3", label: "Float-up" },
		{ type: "type4", label: "Momentum" },
		{ type: "type5", label: "Rotation" },
		{ type: "type6", label: "Speed-reactive" },
		{ type: "type7", label: "Stacking" },
		{ type: "type8", label: "3D Perspective" },
	];

	let selectedVariant: VariantType = $state("type1");
</script>

<div class="mb-4 flex flex-wrap gap-2">
	{#each variants as v}
		<button
			class="rounded-lg border px-3 py-1.5 text-sm transition-colors {selectedVariant === v.type
				? 'border-primary bg-primary text-primary-foreground'
				: 'border-border bg-card hover:bg-accent'}"
			onclick={() => (selectedVariant = v.type)}
		>
			{v.label}
		</button>
	{/each}
</div>
<div class="relative h-[400px] cursor-crosshair overflow-hidden rounded-lg border">
	<ImageTrailCursor {images} variant={selectedVariant} />
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<p class="text-muted-foreground/50 text-lg select-none">Move your cursor here</p>
	</div>
</div>
