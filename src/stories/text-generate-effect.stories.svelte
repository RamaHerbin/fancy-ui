<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";

	const { Story } = defineMeta({
		title: "Text/TextGenerateEffect",
		component: TextGenerateEffect,
		tags: ["autodocs"],
		args: {
			words:
				"Svelte is a radical new approach to building user interfaces. It shifts work from the browser to a compile step that happens when you build your app.",
			filter: true,
			duration: 0.7,
			delay: 0,
			stagger: 200,
		},
		argTypes: {
			words: { control: "text", description: "Text to reveal word by word" },
			filter: { control: "boolean", description: "Apply blur filter during reveal animation" },
			duration: { control: "number", description: "Fade-in duration per word in seconds" },
			delay: { control: "number", description: "Initial delay before animation starts in ms" },
			stagger: { control: "number", description: "Delay between each word in ms" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="max-w-xl text-xl font-semibold">
		<TextGenerateEffect {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Fast Reveal" {template} args={{ duration: 0.3, stagger: 80 }} />

<Story name="Without Blur" {template} args={{ filter: false }} />
