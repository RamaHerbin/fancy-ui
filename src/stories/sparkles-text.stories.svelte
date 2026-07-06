<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { SparklesText } from "$lib/fancy-ui/sparkles-text";

	const { Story } = defineMeta({
		title: "Text/SparklesText",
		component: SparklesText,
		tags: ["autodocs"],
		args: {
			text: "Sparkles",
			sparklesCount: 10,
			colors: { first: "#9E7AFF", second: "#FE8BBB" },
		},
		argTypes: {
			text: { control: "text", description: "Text to display" },
			sparklesCount: { control: "number", description: "Number of sparkle stars" },
			colors: { control: "object", description: "Two colors for sparkle stars" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex items-center justify-center p-8 text-4xl font-bold">
		<SparklesText {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Custom Colors"
	{template}
	args={{ text: "Magic", colors: { first: "#22d3ee", second: "#f97316" } }}
/>

<Story name="Lots Of Sparkles" {template} args={{ text: "Shine", sparklesCount: 30 }} />
