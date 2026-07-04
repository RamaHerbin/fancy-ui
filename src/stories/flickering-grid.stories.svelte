<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";

	const { Story } = defineMeta({
		title: "Backgrounds/FlickeringGrid",
		component: FlickeringGrid,
		tags: ["autodocs"],
		args: {
			squareSize: 4,
			gridGap: 6,
			flickerChance: 0.3,
			color: "#000000",
			maxOpacity: 0.3,
		},
		argTypes: {
			squareSize: {
				control: { type: "range", min: 1, max: 20, step: 1 },
				description: "Size of each grid square in pixels",
			},
			gridGap: {
				control: { type: "range", min: 0, max: 20, step: 1 },
				description: "Gap between squares in pixels",
			},
			flickerChance: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Probability of a square changing opacity each second (0-1)",
			},
			color: { control: "color", description: "Color of the squares (hex format)" },
			maxOpacity: {
				control: { type: "range", min: 0, max: 1, step: 0.05 },
				description: "Maximum opacity of squares (0-1)",
			},
			width: {
				control: "number",
				description: "Fixed width in pixels (defaults to container width)",
			},
			height: {
				control: "number",
				description: "Fixed height in pixels (defaults to container height)",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="h-72 w-[480px] overflow-hidden rounded-xl border bg-neutral-950">
		<FlickeringGrid {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Emerald" {template} args={{ color: "#10b981", maxOpacity: 0.5 }} />

<Story name="Large Squares" {template} args={{ squareSize: 10, gridGap: 10, color: "#6366f1" }} />

<Story name="Rapid Flicker" {template} args={{ flickerChance: 0.8, color: "#f43f5e" }} />
