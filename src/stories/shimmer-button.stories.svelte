<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";

	const { Story } = defineMeta({
		title: "Buttons/ShimmerButton",
		component: ShimmerButton,
		tags: ["autodocs"],
		args: {
			shimmerColor: "#ffffff",
			shimmerSize: "0.05em",
			borderRadius: "100px",
			shimmerDuration: "3s",
			background: "rgba(0, 0, 0, 1)",
		},
		argTypes: {
			shimmerColor: { control: "color", description: "Color of the shimmer highlight" },
			shimmerSize: { control: "text", description: "Thickness of the shimmer border" },
			borderRadius: { control: "text", description: "Button border radius" },
			shimmerDuration: { control: "text", description: "Duration of one shimmer cycle" },
			background: { control: "text", description: "Button background color" },
		},
	});
</script>

{#snippet template(args: any)}
	<ShimmerButton {...args}>
		<span class="text-sm font-medium whitespace-pre-wrap text-white">Shimmer Button</span>
	</ShimmerButton>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Custom Shimmer"
	{template}
	args={{ shimmerColor: "#22d3ee", shimmerDuration: "1.5s" }}
/>

<Story name="Rounded" {template} args={{ borderRadius: "12px", background: "#1e1b4b" }} />
