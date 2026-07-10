<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { GlowBorder } from "$lib/fancy-ui/glow-border";

	const { Story } = defineMeta({
		title: "Effects/GlowBorder",
		component: GlowBorder,
		tags: ["autodocs"],
		args: {
			borderRadius: 10,
			color: "#FFF",
			borderWidth: 2,
			duration: 10,
		},
		argTypes: {
			borderRadius: {
				control: { type: "range", min: 0, max: 40, step: 1 },
				description: "Border radius in pixels",
			},
			color: { control: "color", description: "Glow color or array of colors for gradient" },
			borderWidth: {
				control: { type: "range", min: 1, max: 10, step: 1 },
				description: "Border width in pixels",
			},
			duration: {
				control: { type: "range", min: 2, max: 20, step: 1 },
				description: "Animation duration in seconds",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="relative flex h-40 w-64 items-center justify-center rounded-xl bg-neutral-950 p-6">
		<GlowBorder {...args} />
		<p class="text-center text-neutral-400">Content goes here</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Cyan Glow" {template} args={{ color: "#22d3ee" }} />

<Story name="Multi-Color Gradient" {template} args={{ color: ["#f472b6", "#a855f7", "#22d3ee"] }} />

<Story name="Thick & Fast" {template} args={{ borderWidth: 5, duration: 4, color: "#f59e0b" }} />
