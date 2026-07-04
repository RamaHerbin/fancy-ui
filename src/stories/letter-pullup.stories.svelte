<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { LetterPullup } from "$lib/fancy-ui/letter-pullup";

	const { Story } = defineMeta({
		title: "Text/LetterPullup",
		component: LetterPullup,
		tags: ["autodocs"],
		args: {
			words: "Letter Pullup",
			delay: 0.05,
		},
		argTypes: {
			words: {
				control: "text",
				description: "Text to animate (each character gets its own animation)",
			},
			delay: {
				control: "number",
				description: "Delay between each letter animation in seconds",
			},
		},
	});
</script>

<Story name="Default" args={{ words: "Letter Pullup" }} />

<Story name="Slower Stagger" args={{ words: "One by one", delay: 0.15 }} />

<Story name="Single Word" args={{ words: "FancyUI" }} />
