<script lang="ts">
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "color", type: "color", label: "Color" },
		{ key: "flickerChance", type: "range", label: "Flicker Chance", min: 0.01, max: 1, step: 0.01 },
		{ key: "maxOpacity", type: "range", label: "Max Opacity", min: 0.05, max: 1, step: 0.05 },
		{ key: "squareSize", type: "range", label: "Square Size", min: 1, max: 20, step: 1 },
		{ key: "gridGap", type: "range", label: "Grid Gap", min: 1, max: 20, step: 1 },
	]}
	initialValues={{
		color: "#000000",
		flickerChance: 0.3,
		maxOpacity: 0.3,
		squareSize: 4,
		gridGap: 6,
	}}
>
	{#snippet preview(values)}
		<div class="bg-background mx-auto h-64 w-full max-w-md overflow-hidden rounded-xl border">
			<FlickeringGrid
				color={values.color as string}
				flickerChance={values.flickerChance as number}
				maxOpacity={values.maxOpacity as number}
				squareSize={values.squareSize as number}
				gridGap={values.gridGap as number}
			/>
		</div>
	{/snippet}
</PropsPlayground>
