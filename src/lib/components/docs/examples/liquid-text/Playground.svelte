<script lang="ts">
	import { LiquidText, type LiquidTextProps } from "$lib/fancy-ui/liquid-text";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	controls={[
		{ key: "text", type: "text", label: "Text" },
		{
			key: "fontSize",
			type: "range",
			label: "Font Size (0 = auto-fit)",
			min: 0,
			max: 280,
			step: 10,
		},
		{
			key: "fontWeight",
			type: "select",
			label: "Font Weight",
			options: [
				{ value: "400", label: "400" },
				{ value: "500", label: "500" },
				{ value: "600", label: "600" },
				{ value: "700", label: "700" },
				{ value: "800", label: "800" },
				{ value: "900", label: "900" },
			],
		},
		{ key: "lightColor", type: "color", label: "Light Color" },
		{ key: "darkColor", type: "color", label: "Dark Color" },
		{ key: "strength", type: "range", label: "Warp Strength", min: 0, max: 1, step: 0.05 },
		{ key: "radius", type: "range", label: "Splat Radius", min: 40, max: 400, step: 10 },
		{ key: "forceGain", type: "range", label: "Force Gain", min: 1, max: 40, step: 1 },
		{ key: "dissipation", type: "range", label: "Dissipation", min: 0.8, max: 0.999, step: 0.005 },
		{ key: "viscosity", type: "range", label: "Viscosity", min: 0, max: 20, step: 1 },
		{
			key: "chromaticRatio",
			type: "range",
			label: "Chromatic Ratio",
			min: 0,
			max: 1,
			step: 0.05,
		},
		{ key: "interactive", type: "boolean", label: "Interactive" },
	]}
	initialValues={{
		text: "Liquid",
		fontSize: 160,
		fontWeight: "700",
		lightColor: "#000000",
		darkColor: "#ffffff",
		strength: 0.5,
		radius: 160,
		forceGain: 17,
		dissipation: 0.98,
		viscosity: 4,
		chromaticRatio: 0.2,
		interactive: true,
	}}
>
	{#snippet preview(values)}
		<div class="bg-background relative h-40 w-full max-w-md overflow-hidden rounded-xl border">
			<LiquidText {...values as LiquidTextProps} />
		</div>
	{/snippet}
</PropsPlayground>
