<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { GlowingEffect } from "$lib/fancy-ui/glowing-effect";

	const { Story } = defineMeta({
		title: "Effects/GlowingEffect",
		component: GlowingEffect,
		tags: ["autodocs"],
		args: {
			blur: 0,
			inactiveZone: 0.7,
			proximity: 0,
			spread: 40,
			variant: "default",
			glow: true,
			disabled: false,
			movementDuration: 2,
			borderWidth: 1,
		},
		argTypes: {
			blur: {
				control: { type: "range", min: 0, max: 20, step: 1 },
				description: "Blur amount applied to the glow layer",
			},
			inactiveZone: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Fraction of element radius where glow is inactive",
			},
			proximity: {
				control: { type: "range", min: 0, max: 100, step: 5 },
				description: "Extra pixel range outside element bounds where glow activates",
			},
			spread: {
				control: { type: "range", min: 0, max: 90, step: 5 },
				description: "Angular spread of the conic gradient in degrees",
			},
			variant: {
				control: "select",
				options: ["default", "white"],
				description: "Color variant of the glow",
			},
			glow: { control: "boolean", description: "Always show glow regardless of mouse position" },
			disabled: { control: "boolean", description: "Disable the glow effect" },
			movementDuration: {
				control: { type: "range", min: 0.5, max: 5, step: 0.5 },
				description: "Duration of the glow movement in seconds",
			},
			borderWidth: {
				control: { type: "range", min: 1, max: 6, step: 1 },
				description: "Width of the glowing border in pixels",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative max-w-md rounded-xl border bg-neutral-950 p-8">
		<GlowingEffect {...args} />
		<h3 class="mb-2 text-lg font-semibold text-white">Hover near me</h3>
		<p class="text-neutral-400">Move your cursor near this card to see the glow effect.</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="White Variant" {template} args={{ variant: "white" }} />

<Story name="With Blur" {template} args={{ blur: 8, spread: 60 }} />

<Story name="Thick Border" {template} args={{ borderWidth: 3, spread: 60 }} />
