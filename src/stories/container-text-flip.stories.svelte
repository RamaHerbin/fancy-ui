<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ContainerTextFlip } from "$lib/fancy-ui/container-text-flip";

	const { Story } = defineMeta({
		title: "Text/ContainerTextFlip",
		component: ContainerTextFlip,
		tags: ["autodocs"],
		args: {
			words: ["better", "modern", "beautiful", "awesome"],
			interval: 3000,
			animationDuration: 700,
		},
		argTypes: {
			words: { control: "object", description: "Array of words to cycle through" },
			interval: { control: "number", description: "Time between word changes in ms" },
			animationDuration: {
				control: "number",
				description: "Per-character animation duration in ms",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex items-center gap-4">
		<span class="text-4xl font-bold md:text-7xl">Build</span>
		<ContainerTextFlip {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Custom Words" {template} args={{ words: ["faster", "smarter", "bolder", "leaner"] }} />

<Story name="Fast Interval" {template} args={{ interval: 1200, animationDuration: 400 }} />
