<script lang="ts">
	import { Ripple } from "$lib/fancy-ui/ripple";
</script>

<svelte:head>
	<title>Ripple - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Ripple</h1>
	<p class="text-muted-foreground mb-8">Concentric pulsing circles with ripple wave animation.</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Default</h2>
		<div class="bg-card relative h-96 overflow-hidden rounded-lg border">
			<Ripple />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Styled Circles</h2>
		<div class="bg-card relative h-96 overflow-hidden rounded-lg border">
			<Ripple
				circleClass="border-primary/30 bg-primary/5"
				numberOfCircles={5}
				baseCircleSize={150}
				spaceBetweenCircle={90}
			/>
		</div>
	</section>
</div>
