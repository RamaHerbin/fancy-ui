<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	const { Story } = defineMeta({
		title: "Effects/BorderBeam",
		component: BorderBeam,
		tags: ["autodocs"],
		args: {
			size: 200,
			duration: 15,
			borderWidth: 1.5,
			anchor: 90,
			colorFrom: "#ffaa40",
			colorTo: "#9c40ff",
			delay: 0,
		},
		argTypes: {
			size: {
				control: { type: "range", min: 40, max: 400, step: 10 },
				description: "Size of the beam in pixels",
			},
			duration: {
				control: { type: "range", min: 2, max: 30, step: 1 },
				description: "Animation duration in seconds",
			},
			borderWidth: {
				control: { type: "range", min: 0.5, max: 6, step: 0.5 },
				description: "Border width in pixels",
			},
			anchor: {
				control: { type: "range", min: 0, max: 100, step: 5 },
				description: "Anchor position (0-100)",
			},
			colorFrom: { control: "color", description: "Gradient start color" },
			colorTo: { control: "color", description: "Gradient end color" },
			delay: { control: "number", description: "Animation delay in seconds" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative h-40 w-[420px] overflow-hidden rounded-xl border bg-neutral-950 p-6">
		<p class="text-center text-neutral-400">Content goes here</p>
		<BorderBeam {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Cyan Beam" {template} args={{ colorFrom: "#22d3ee", colorTo: "#3b82f6" }} />

<Story name="Fast & Thick" {template} args={{ duration: 5, borderWidth: 3 }} />

<Story name="Small Beam" {template} args={{ size: 80 }} />
