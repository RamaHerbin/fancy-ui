<script lang="ts">
	import { ImageTrailCursor } from '$lib/inspira/image-trail-cursor';
	import type { VariantType } from '$lib/inspira/image-trail-cursor';

	const images = [
		'https://picsum.photos/seed/trail1/400/440',
		'https://picsum.photos/seed/trail2/400/440',
		'https://picsum.photos/seed/trail3/400/440',
		'https://picsum.photos/seed/trail4/400/440',
		'https://picsum.photos/seed/trail5/400/440',
		'https://picsum.photos/seed/trail6/400/440',
		'https://picsum.photos/seed/trail7/400/440',
		'https://picsum.photos/seed/trail8/400/440',
		'https://picsum.photos/seed/trail9/400/440',
		'https://picsum.photos/seed/trail10/400/440'
	];

	const variants: { type: VariantType; label: string; description: string }[] = [
		{ type: 'type1', label: 'Type 1', description: 'Fade & scale' },
		{ type: 'type2', label: 'Type 2', description: 'Brightness burst' },
		{ type: 'type3', label: 'Type 3', description: 'Float-up exit' },
		{ type: 'type4', label: 'Type 4', description: 'Momentum drift' },
		{ type: 'type5', label: 'Type 5', description: 'Rotation fling' },
		{ type: 'type6', label: 'Type 6', description: 'Speed-reactive' },
		{ type: 'type7', label: 'Type 7', description: 'Stacking trail' },
		{ type: 'type8', label: 'Type 8', description: '3D perspective' }
	];

	let selectedVariant: VariantType = $state('type1');
</script>

<svelte:head>
	<title>ImageTrailCursor - Inspira Svelte</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<div class="mb-8">
		<a href="/demo" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to components</a>
	</div>

	<h1 class="text-3xl font-bold mb-2">ImageTrailCursor</h1>
	<p class="text-muted-foreground mb-8">
		Cursor-following image trail with 8 animation variants. Move your cursor inside the area below.
	</p>

	<!-- Variant Selector -->
	<section class="mb-6">
		<h2 class="text-xl font-semibold mb-4">Variant</h2>
		<div class="flex flex-wrap gap-2">
			{#each variants as v}
				<button
					class="rounded-lg border px-3 py-2 text-sm transition-colors {selectedVariant === v.type
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-card hover:bg-accent'}"
					onclick={() => (selectedVariant = v.type)}
				>
					<span class="font-medium">{v.label}</span>
					<span class="ml-1 text-xs opacity-70">{v.description}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Interactive Area -->
	<section class="mb-12">
		<div class="relative rounded-lg border bg-card overflow-hidden h-[500px] cursor-crosshair">
			<ImageTrailCursor {images} variant={selectedVariant} />
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p class="text-muted-foreground/50 text-lg select-none">Move your cursor here</p>
			</div>
		</div>
	</section>
</div>
