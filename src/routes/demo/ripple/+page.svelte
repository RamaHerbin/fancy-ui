<script lang="ts">
	import { Ripple } from "$lib/fancy-ui/ripple";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
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

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: 'numberOfCircles', type: 'range', label: 'Number of Circles', min: 1, max: 12, step: 1 },
				{ key: 'baseCircleSize', type: 'range', label: 'Base Circle Size', min: 50, max: 400, step: 10 },
				{ key: 'spaceBetweenCircle', type: 'range', label: 'Space Between', min: 20, max: 200, step: 10 },
				{ key: 'baseCircleOpacity', type: 'range', label: 'Base Opacity', min: 0.05, max: 0.8, step: 0.05 },
				{ key: 'waveSpeed', type: 'range', label: 'Wave Speed (ms)', min: 10, max: 300, step: 10 },
			]}
			initialValues={{ numberOfCircles: 7, baseCircleSize: 210, spaceBetweenCircle: 70, baseCircleOpacity: 0.24, waveSpeed: 80 }}
		>
			{#snippet preview(values)}
				<div class="relative h-80 w-full overflow-hidden rounded-xl border bg-card">
					<Ripple
						numberOfCircles={values.numberOfCircles as number}
						baseCircleSize={values.baseCircleSize as number}
						spaceBetweenCircle={values.spaceBetweenCircle as number}
						baseCircleOpacity={values.baseCircleOpacity as number}
						waveSpeed={values.waveSpeed as number}
					/>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
