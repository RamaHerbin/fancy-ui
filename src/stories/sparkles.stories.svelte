<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Sparkles } from "$lib/fancy-ui/sparkles";

	const { Story } = defineMeta({
		title: "Backgrounds/Sparkles",
		component: Sparkles,
		tags: ["autodocs"],
		args: {
			background: "#0d47a1",
			particleColor: "#ffffff",
			minSize: 1,
			maxSize: 3,
			speed: 4,
			particleDensity: 120,
		},
		argTypes: {
			background: { control: "color", description: "Background color of the canvas container" },
			particleColor: { control: "color", description: "Color of the particles" },
			minSize: {
				control: { type: "range", min: 0.5, max: 5, step: 0.5 },
				description: "Minimum particle radius in pixels",
			},
			maxSize: {
				control: { type: "range", min: 1, max: 10, step: 0.5 },
				description: "Maximum particle radius in pixels",
			},
			speed: {
				control: { type: "range", min: 0, max: 12, step: 1 },
				description: "Particle speed multiplier",
			},
			particleDensity: {
				control: { type: "range", min: 20, max: 400, step: 20 },
				description: "Number of particles",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="h-64 w-[480px] overflow-hidden rounded-lg border">
		<Sparkles {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Dark & Gold" {template} args={{ background: "#000000", particleColor: "#fbbf24" }} />

<Story name="Dense & Fast" {template} args={{ particleDensity: 300, speed: 8, maxSize: 2 }} />

<Story
	name="Large Particles"
	{template}
	args={{ minSize: 2, maxSize: 6, particleDensity: 60, particleColor: "#a5f3fc" }}
/>
