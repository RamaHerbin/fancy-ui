<script lang="ts">
	import { Sparkles } from '$lib/fancy-ui/sparkles';
</script>

<svelte:head>
	<title>Sparkles - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Sparkles</h1>
	<p class="text-muted-foreground mb-8">Canvas-based floating particle sparkle effect.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Default</h2>
		<div class="border rounded-lg overflow-hidden h-64">
			<Sparkles />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<div class="border rounded-lg overflow-hidden h-64">
			<Sparkles background="#1a0533" particleColor="#e879f9" speed={2} particleDensity={80} />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Dense & Fast</h2>
		<div class="border rounded-lg overflow-hidden h-64">
			<Sparkles background="#0c1222" particleColor="#fbbf24" speed={8} particleDensity={200} maxSize={4} />
		</div>
	</section>
</div>
