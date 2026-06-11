<script lang="ts">
	import { Ripple } from "$lib/fancy-ui/ripple";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "numberOfCircles", type: "range", label: "Number of Circles", min: 1, max: 12, step: 1 },
		{
			key: "baseCircleSize",
			type: "range",
			label: "Base Circle Size",
			min: 50,
			max: 400,
			step: 10,
		},
		{
			key: "spaceBetweenCircle",
			type: "range",
			label: "Space Between",
			min: 20,
			max: 200,
			step: 10,
		},
		{
			key: "baseCircleOpacity",
			type: "range",
			label: "Base Opacity",
			min: 0.05,
			max: 0.8,
			step: 0.05,
		},
		{ key: "waveSpeed", type: "range", label: "Wave Speed (ms)", min: 10, max: 300, step: 10 },
	]}
	initialValues={{
		numberOfCircles: 7,
		baseCircleSize: 210,
		spaceBetweenCircle: 70,
		baseCircleOpacity: 0.24,
		waveSpeed: 80,
	}}
>
	{#snippet preview(values)}
		<div class="bg-card relative h-80 w-full overflow-hidden rounded-xl border">
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
