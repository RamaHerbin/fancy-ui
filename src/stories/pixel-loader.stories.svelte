<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { PixelLoader } from "$lib/fancy-ui/pixel-loader";

	const { Story } = defineMeta({
		title: "AI Chat/PixelLoader",
		component: PixelLoader,
		tags: ["autodocs"],
		args: {
			cols: 5,
			rows: 5,
			cellSize: 6,
			gap: 2,
			speed: 1.6,
			label: "Loading",
		},
		argTypes: {
			cols: { control: "number", description: "Number of pixel columns" },
			rows: { control: "number", description: "Number of pixel rows" },
			cellSize: { control: "number", description: "Size of a single pixel in px" },
			gap: { control: "number", description: "Space between pixels in px" },
			color: { control: "color", description: "Pixel colour, any CSS colour value" },
			speed: { control: "number", description: "Duration of one full pulse cycle in seconds" },
			label: { control: "text", description: "Accessible label announced by assistive tech" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex h-64 w-full items-center justify-center bg-zinc-950 text-zinc-300">
		<PixelLoader {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Large Matrix"
	{template}
	args={{ cols: 8, rows: 8, cellSize: 8, gap: 3, color: "#22d3ee", speed: 2.2, label: "Working" }}
/>

<Story
	name="Single Row"
	{template}
	args={{ cols: 12, rows: 1, cellSize: 5, gap: 3, speed: 1.2, label: "Streaming" }}
/>
