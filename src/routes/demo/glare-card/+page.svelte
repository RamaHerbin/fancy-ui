<script lang="ts">
	import { GlareCard } from '$lib/fancy-ui/glare-card';
</script>

<svelte:head>
	<title>GlareCard - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">GlareCard</h1>
	<p class="text-muted-foreground mb-8">
		A holographic trading card effect with mouse-tracking glare, rainbow foil, and 3D rotation.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<GlareCard>
				<div class="flex size-full flex-col items-center justify-center p-6 text-white">
					<h3 class="text-2xl font-bold">Holographic</h3>
					<p class="mt-2 text-sm text-slate-300">Move your mouse to see the effect</p>
				</div>
			</GlareCard>
		</div>
	</section>

	<!-- With Image -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Image Content</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<GlareCard>
				<img
					src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=500&fit=crop"
					alt="Laptop"
					class="size-full object-cover"
				/>
			</GlareCard>
		</div>
	</section>

	<!-- Multiple -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Multiple Cards</h2>
		<div class="flex flex-wrap justify-center gap-8 border rounded-lg p-10 bg-card">
			{#each ['Fire', 'Water', 'Earth'] as element, i}
				<GlareCard>
					<div
						class="flex size-full flex-col items-center justify-center p-6 text-white"
					>
						<span class="text-4xl mb-2">{['🔥', '💧', '🌍'][i]}</span>
						<h3 class="text-xl font-bold">{element}</h3>
						<p class="mt-1 text-xs text-slate-400">Elemental Card</p>
					</div>
				</GlareCard>
			{/each}
		</div>
	</section>
</div>
