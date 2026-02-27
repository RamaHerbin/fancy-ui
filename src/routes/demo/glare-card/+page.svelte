<script lang="ts">
	import { GlareCard } from "$lib/fancy-ui/glare-card";
</script>

<svelte:head>
	<title>GlareCard - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">GlareCard</h1>
	<p class="text-muted-foreground mb-8">
		A holographic trading card effect with mouse-tracking glare, rainbow foil, and 3D rotation.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
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
		<h2 class="mb-4 text-xl font-semibold">With Image Content</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
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
		<h2 class="mb-4 text-xl font-semibold">Multiple Cards</h2>
		<div class="bg-card flex flex-wrap justify-center gap-8 rounded-lg border p-10">
			{#each ["Fire", "Water", "Earth"] as element, i}
				<GlareCard>
					<div class="flex size-full flex-col items-center justify-center p-6 text-white">
						<span class="mb-2 text-4xl">{["🔥", "💧", "🌍"][i]}</span>
						<h3 class="text-xl font-bold">{element}</h3>
						<p class="mt-1 text-xs text-slate-400">Elemental Card</p>
					</div>
				</GlareCard>
			{/each}
		</div>
	</section>
</div>
