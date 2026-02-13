<script lang="ts">
	import { FlipCard } from '$lib/fancy-ui/flip-card';
</script>

<svelte:head>
	<title>FlipCard - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">FlipCard</h1>
	<p class="text-muted-foreground mb-8">
		A card that flips to reveal back content on hover using CSS 3D transforms.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage (Y-axis)</h2>
		<div class="flex justify-center border rounded-lg p-6 bg-card">
			<FlipCard>
				<div
					class="flex size-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
				>
					<p class="text-2xl font-bold text-white">Front</p>
				</div>
				{#snippet back()}
					<div class="flex size-full flex-col items-center justify-center">
						<p class="text-lg font-semibold">Back Side</p>
						<p class="mt-2 text-sm text-slate-400">Hover to flip</p>
					</div>
				{/snippet}
			</FlipCard>
		</div>
	</section>

	<!-- X-axis rotation -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">X-axis Rotation</h2>
		<div class="flex justify-center border rounded-lg p-6 bg-card">
			<FlipCard rotate="x">
				<div
					class="flex size-full items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500"
				>
					<p class="text-2xl font-bold text-white">Front</p>
				</div>
				{#snippet back()}
					<div class="flex size-full flex-col items-center justify-center">
						<p class="text-lg font-semibold">Flipped vertically!</p>
						<p class="mt-2 text-sm text-slate-400">rotate="x"</p>
					</div>
				{/snippet}
			</FlipCard>
		</div>
	</section>

	<!-- Multiple cards -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Multiple Cards</h2>
		<div class="flex flex-wrap justify-center gap-6 border rounded-lg p-6 bg-card">
			{#each ['from-rose-500 to-orange-500', 'from-emerald-500 to-teal-500', 'from-violet-500 to-indigo-500'] as gradient, i}
				<FlipCard>
					<div
						class="flex size-full items-center justify-center bg-gradient-to-br {gradient}"
					>
						<p class="text-2xl font-bold text-white">Card {i + 1}</p>
					</div>
					{#snippet back()}
						<div class="flex size-full flex-col items-center justify-center">
							<p class="text-lg font-semibold">Details #{i + 1}</p>
							<p class="mt-2 text-sm text-slate-400">More info here</p>
						</div>
					{/snippet}
				</FlipCard>
			{/each}
		</div>
	</section>
</div>
