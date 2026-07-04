<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { RippleButton } from "$lib/fancy-ui/ripple-button";

	const { Story } = defineMeta({
		title: "Buttons/RippleButton",
		component: RippleButton,
		tags: ["autodocs"],
		args: {
			rippleColor: "#ADD8E6",
			duration: 600,
		},
		argTypes: {
			rippleColor: { control: "color", description: "Color of the ripple effect" },
			duration: { control: { type: "number" }, description: "Animation duration in milliseconds" },
		},
	});
</script>

{#snippet template(args: any)}
	<RippleButton {...args}>Click me</RippleButton>
{/snippet}

<Story name="Default" {template} />

<Story name="Custom Color" {template} args={{ rippleColor: "#f472b6" }} />

<Story name="Slow Ripple" {template} args={{ duration: 1200, rippleColor: "#22d3ee" }} />
