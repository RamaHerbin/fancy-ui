<script lang="ts">
	import { Ripple } from '$lib/fancy-ui/ripple';
</script>

<svelte:head>
	<title>Ripple - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Ripple</h1>
	<p class="text-muted-foreground mb-8">Concentric pulsing circles with ripple wave animation.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Default</h2>
		<div class="relative border rounded-lg bg-card h-96 overflow-hidden">
			<Ripple />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Styled Circles</h2>
		<div class="relative border rounded-lg bg-card h-96 overflow-hidden">
			<Ripple
				circleClass="border-primary/30 bg-primary/5"
				numberOfCircles={5}
				baseCircleSize={150}
				spaceBetweenCircle={90}
			/>
		</div>
	</section>
</div>
