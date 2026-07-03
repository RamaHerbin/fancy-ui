<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { GradientButton } from "$lib/fancy-ui/gradient-button";

	const { Story } = defineMeta({
		title: "Buttons/GradientButton",
		component: GradientButton,
		tags: ["autodocs"],
		args: {
			duration: 2500,
			borderWidth: 2,
			borderRadius: 8,
			blur: 4,
			bgColor: "#000",
		},
		argTypes: {
			colors: { control: "object", description: "Gradient colors rotating around the border" },
			duration: {
				control: { type: "range", min: 500, max: 10000, step: 100 },
				description: "Rotation duration in ms",
			},
			borderWidth: {
				control: { type: "range", min: 1, max: 10, step: 1 },
				description: "Border thickness in px",
			},
			borderRadius: {
				control: { type: "range", min: 0, max: 40, step: 1 },
				description: "Border radius in px",
			},
			blur: {
				control: { type: "range", min: 0, max: 20, step: 1 },
				description: "Glow blur in px",
			},
			bgColor: { control: "color", description: "Content area background color" },
		},
	});
</script>

{#snippet template(args: any)}
	<GradientButton {...args}>
		<span class="px-2 text-sm font-medium text-white">Gradient Button</span>
	</GradientButton>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Custom Palette"
	{template}
	args={{ colors: ["#06b6d4", "#8b5cf6", "#ec4899", "#06b6d4"], duration: 4000 }}
/>

<Story name="Thick Border" {template} args={{ borderWidth: 5, blur: 10, borderRadius: 16 }} />
