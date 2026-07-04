<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { InteractiveGridPattern } from "$lib/fancy-ui/interactive-grid-pattern";

	const { Story } = defineMeta({
		title: "Effects/InteractiveGridPattern",
		component: InteractiveGridPattern,
		tags: ["autodocs"],
		args: {
			width: 40,
			height: 40,
			squares: [24, 24],
		},
		argTypes: {
			width: {
				control: { type: "range", min: 10, max: 80, step: 5 },
				description: "Width of each square in pixels",
			},
			height: {
				control: { type: "range", min: 10, max: 80, step: 5 },
				description: "Height of each square in pixels",
			},
			squares: { control: "object", description: "Grid dimensions as [columns, rows]" },
			squaresClassName: {
				control: "text",
				description: "Additional CSS classes for individual squares",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div
		class="relative flex h-72 w-[480px] items-center justify-center overflow-hidden rounded-lg border bg-neutral-950"
	>
		<InteractiveGridPattern
			{...args}
			class="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]"
		/>
		<p class="z-10 text-lg font-medium text-neutral-400">Hover over the grid</p>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Fine Grid" {template} args={{ width: 20, height: 20, squares: [48, 48] }} />

<Story name="Large Cells" {template} args={{ width: 60, height: 60, squares: [16, 12] }} />

<Story name="Indigo Highlight" {template} args={{ squaresClassName: "hover:fill-indigo-400/40" }} />
