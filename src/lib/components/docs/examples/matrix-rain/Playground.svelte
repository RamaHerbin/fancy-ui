<script lang="ts">
	import { MatrixRain } from "$lib/fancy-ui/matrix-rain";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "color", type: "color", label: "Color" },
		{ key: "speed", type: "range", label: "Speed", min: 0.2, max: 4, step: 0.1 },
		{ key: "density", type: "range", label: "Density", min: 0.5, max: 3, step: 0.1 },
		{ key: "glyphSize", type: "range", label: "Glyph Size (px)", min: 8, max: 32, step: 2 },
		{ key: "fadeOpacity", type: "range", label: "Fade Opacity", min: 0.01, max: 0.3, step: 0.01 },
	]}
	initialValues={{
		color: "#00ff41",
		speed: 1.0,
		density: 1.0,
		glyphSize: 16,
		fadeOpacity: 0.05,
	}}
>
	{#snippet preview(values)}
		<div class="h-64 w-full overflow-hidden rounded-lg">
			<MatrixRain
				color={values.color as string}
				speed={values.speed as number}
				density={values.density as number}
				glyphSize={values.glyphSize as number}
				fadeOpacity={values.fadeOpacity as number}
			/>
		</div>
	{/snippet}
</PropsPlayground>
