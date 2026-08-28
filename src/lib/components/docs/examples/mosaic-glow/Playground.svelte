<script lang="ts">
	import { MosaicGlow, type MosaicGlowIdle } from "$lib/fancy-ui/mosaic-glow";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "color", type: "color", label: "Color" },
		{ key: "background", type: "color", label: "Background" },
		{ key: "tileSize", type: "range", label: "Tile Size", min: 4, max: 32, step: 1 },
		{ key: "gap", type: "range", label: "Gap", min: 0, max: 6, step: 1 },
		{ key: "radius", type: "range", label: "Radius", min: 60, max: 320, step: 10 },
		{ key: "intensity", type: "range", label: "Intensity", min: 0, max: 1, step: 0.05 },
		{ key: "trail", type: "range", label: "Trail", min: 0, max: 1, step: 0.05 },
		{ key: "smoothing", type: "range", label: "Smoothing", min: 0, max: 1, step: 0.05 },
		{ key: "noise", type: "range", label: "Noise", min: 0, max: 1, step: 0.05 },
		{ key: "ambient", type: "range", label: "Ambient", min: 0, max: 1, step: 0.05 },
		{ key: "flicker", type: "boolean", label: "Flicker" },
		{
			key: "idle",
			type: "select",
			label: "Idle",
			options: [
				{ value: "drift", label: "Drift" },
				{ value: "none", label: "None" },
			],
		},
	]}
	initialValues={{
		color: "#f2c318",
		background: "#0a0a0a",
		tileSize: 18,
		gap: 2,
		radius: 170,
		intensity: 1,
		trail: 0.6,
		smoothing: 0.15,
		noise: 0.7,
		ambient: 0.35,
		flicker: true,
		idle: "drift",
	}}
>
	{#snippet preview(values)}
		<MosaicGlow
			class="h-72 w-full rounded-xl"
			color={values.color as string}
			background={values.background as string}
			tileSize={values.tileSize as number}
			gap={values.gap as number}
			radius={values.radius as number}
			intensity={values.intensity as number}
			trail={values.trail as number}
			smoothing={values.smoothing as number}
			noise={values.noise as number}
			ambient={values.ambient as number}
			flicker={values.flicker as boolean}
			idle={values.idle as MosaicGlowIdle}
		/>
	{/snippet}
</PropsPlayground>
