<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { HyperText } from "$lib/fancy-ui/hyper-text";

	const { Story } = defineMeta({
		title: "Text/HyperText",
		component: HyperText,
		tags: ["autodocs"],
		args: {
			text: "Hover me!",
			duration: 800,
			animateOnLoad: false,
		},
		argTypes: {
			text: { control: "text", description: "Text to display and scramble" },
			duration: { control: "number", description: "Total animation duration in ms" },
			animateOnLoad: { control: "boolean", description: "Whether to animate on initial load" },
		},
	});
</script>

{#snippet template(args: any)}
	<HyperText class="text-4xl font-bold" {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="Animate On Load" {template} args={{ text: "SCRAMBLE", animateOnLoad: true }} />

<Story name="Slow Scramble" {template} args={{ text: "Glitch", duration: 2000 }} />
