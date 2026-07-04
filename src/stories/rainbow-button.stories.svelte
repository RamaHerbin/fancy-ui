<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";

	const { Story } = defineMeta({
		title: "Buttons/RainbowButton",
		component: RainbowButton,
		tags: ["autodocs"],
		args: {
			speed: 2,
		},
		argTypes: {
			speed: { control: { type: "number" }, description: "Animation speed in seconds" },
			href: { control: "text", description: "Render as anchor element when provided" },
		},
	});
</script>

{#snippet template(args: any)}
	<RainbowButton {...args}>Get Started</RainbowButton>
{/snippet}

<Story name="Default" {template} />

<Story name="Fast Animation" {template} args={{ speed: 1 }} />

<Story name="As Link" {template} args={{ href: "https://example.com" }} />
