<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Ripple } from "$lib/fancy-ui/ripple";

	const { Story } = defineMeta({
		title: "Effects/Ripple",
		component: Ripple,
		tags: ["autodocs"],
		args: {
			baseCircleSize: 210,
			baseCircleOpacity: 0.24,
			spaceBetweenCircle: 70,
			circleOpacityDowngradeRatio: 0.03,
			waveSpeed: 80,
			numberOfCircles: 7,
		},
		argTypes: {
			baseCircleSize: {
				control: { type: "range", min: 60, max: 320, step: 10 },
				description: "Diameter of the smallest (innermost) circle in pixels",
			},
			baseCircleOpacity: {
				control: { type: "range", min: 0, max: 1, step: 0.02 },
				description: "Opacity of the innermost circle",
			},
			spaceBetweenCircle: {
				control: { type: "range", min: 20, max: 140, step: 10 },
				description: "Extra pixels added to each successive circle",
			},
			circleOpacityDowngradeRatio: {
				control: { type: "range", min: 0, max: 0.1, step: 0.01 },
				description: "Opacity reduction per circle outward",
			},
			waveSpeed: {
				control: { type: "range", min: 0, max: 200, step: 10 },
				description: "Animation delay between circles in ms",
			},
			numberOfCircles: {
				control: { type: "range", min: 3, max: 12, step: 1 },
				description: "Number of circles to render",
			},
			circleClass: {
				control: "text",
				description: "Additional CSS classes applied to each circle",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-80 w-[480px] overflow-hidden rounded-lg border bg-neutral-950">
		<Ripple {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Many Circles" {template} args={{ numberOfCircles: 11, baseCircleSize: 140 }} />

<Story name="Bold & Slow" {template} args={{ baseCircleOpacity: 0.5, waveSpeed: 160 }} />

<Story name="Indigo Rings" {template} args={{ circleClass: "border-indigo-400 bg-indigo-500/5" }} />
