<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { NumberInput } from "$lib/fancy-ui/number-input";

	const { Story } = defineMeta({
		title: "Forms/NumberInput",
		component: NumberInput,
		tags: ["autodocs"],
		args: {
			value: 12,
			step: 1,
			disabled: false,
			readonly: false,
			required: false,
			invalid: false,
			label: "Quantity",
		},
		argTypes: {
			value: { control: "number", description: "Current value; null when empty" },
			min: { control: "number", description: "Lower bound" },
			max: { control: "number", description: "Upper bound" },
			step: { control: "number", description: "Increment size, including fractional steps" },
			disabled: { control: "boolean", description: "Blocks focus, typing and the step buttons" },
			readonly: { control: "boolean", description: "Blocks typing and the step buttons only" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Drives the error border and aria-invalid" },
			label: { control: "text", description: "Accessible name for standalone use" },
		},
	});
</script>

{#snippet template(args: any)}
	<NumberInput {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="With Limits" {template} args={{ value: 2, min: 1, max: 8, label: "Seats" }} />

<Story
	name="Fractional Steps"
	{template}
	args={{ value: 0.5, min: 0, max: 1, step: 0.1, label: "Opacity" }}
/>

<Story name="Empty" {template} args={{ value: null }} />

<Story name="Invalid" {template} args={{ invalid: true }} />

<Story name="Readonly" {template} args={{ readonly: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />
