<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ColourfulText } from "$lib/fancy-ui/colourful-text";

	const { Story } = defineMeta({
		title: "Text/ColourfulText",
		component: ColourfulText,
		tags: ["autodocs"],
		args: {
			text: "colourful",
			startColor: "rgb(0, 0, 0)",
			duration: 0.5,
		},
		argTypes: {
			text: { control: "text", description: "Text to animate" },
			startColor: { control: "text", description: "Initial color before animation" },
			duration: {
				control: "number",
				description: "Transition duration in seconds for each character",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<h2 class="text-4xl font-bold">
		Make things <ColourfulText {...args} />
	</h2>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Custom Colors"
	{template}
	args={{ text: "vibrant", colors: ["#f97316", "#ec4899", "#8b5cf6", "#22d3ee"] }}
/>

<Story name="Fast Transition" {template} args={{ text: "flicker", duration: 0.15 }} />
