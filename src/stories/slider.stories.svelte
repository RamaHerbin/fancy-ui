<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Slider } from "$lib/fancy-ui/slider";

	const { Story } = defineMeta({
		title: "Forms/Slider",
		component: Slider,
		tags: ["autodocs"],
		args: {
			value: 60,
			min: 0,
			max: 100,
			step: 1,
			disabled: false,
			label: "Volume",
		},
		argTypes: {
			value: { control: "number", description: "Current value" },
			min: { control: "number", description: "Lower bound" },
			max: { control: "number", description: "Upper bound" },
			step: { control: "number", description: "Increment size, including fractional steps" },
			disabled: { control: "boolean", description: "Blocks dragging and keyboard interaction" },
			label: { control: "text", description: "Accessible name for standalone use" },
			showValue: { control: "boolean", description: "Shows a bubble that tracks the thumb" },
			showBounds: { control: "boolean", description: "Shows min and max as end labels" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-72">
		<Slider {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="With Value Bubble" {template} args={{ showValue: true }} />

<Story name="With Bounds" {template} args={{ showValue: true, showBounds: true }} />

<Story
	name="Fractional Step"
	{template}
	args={{ min: 0, max: 1, step: 0.1, value: 0.5, showValue: true }}
/>

<Story name="Disabled" {template} args={{ disabled: true, showValue: true }} />
