<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";

	const { Story } = defineMeta({
		title: "Text/BoxReveal",
		component: BoxReveal,
		tags: ["autodocs"],
		args: {
			color: "#5046e6",
			duration: 0.5,
			delay: 0.25,
		},
		argTypes: {
			color: { control: "color", description: "Color of the reveal box" },
			duration: { control: "number", description: "Animation duration in seconds" },
			delay: { control: "number", description: "Delay before animation starts in seconds" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="p-4">
		<BoxReveal {...args}>
			<h2 class="text-4xl font-bold">Box Reveal</h2>
		</BoxReveal>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Custom Color" {template} args={{ color: "#22d3ee" }} />

<Story name="Slow Animation" {template} args={{ duration: 1, delay: 0.5 }} />
