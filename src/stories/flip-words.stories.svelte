<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FlipWords } from "$lib/fancy-ui/flip-words";

	const { Story } = defineMeta({
		title: "Text/FlipWords",
		component: FlipWords,
		tags: ["autodocs"],
		args: {
			words: ["better", "faster", "stronger", "bolder"],
			duration: 3000,
		},
		argTypes: {
			words: { control: "object", description: "Array of words to cycle through" },
			duration: { control: "number", description: "Time each word stays visible in ms" },
		},
	});
</script>

{#snippet template(args: any)}
	<h2 class="text-4xl font-bold">
		Build
		<FlipWords {...args} />
		products
	</h2>
{/snippet}

<Story name="Default" {template} />

<Story name="Fast Cycling" {template} args={{ duration: 1200 }} />

<Story
	name="Multi-Word Phrases"
	{template}
	args={{ words: ["ship faster", "scale smarter", "build bolder"] }}
/>
