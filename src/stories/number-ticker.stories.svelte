<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";

	const { Story } = defineMeta({
		title: "Text/NumberTicker",
		component: NumberTicker,
		tags: ["autodocs"],
		args: {
			value: 1234,
			direction: "up",
			duration: 1000,
			delay: 0,
			decimalPlaces: 0,
		},
		argTypes: {
			value: { control: "number", description: "Target number to animate to" },
			direction: {
				control: "select",
				options: ["up", "down"],
				description: 'Animation direction: "up" counts 0→value, "down" counts value→0',
			},
			duration: { control: "number", description: "Animation duration in ms" },
			delay: { control: "number", description: "Delay before animation starts in ms" },
			decimalPlaces: { control: "number", description: "Number of decimal places to display" },
		},
	});
</script>

{#snippet template(args: any)}
	<NumberTicker class="text-6xl font-bold" {...args} />
{/snippet}

<Story name="Default" {template} />

<Story name="Count Down" {template} args={{ value: 100, direction: "down" }} />

<Story name="Decimal Places" {template} args={{ value: 42.75, decimalPlaces: 2 }} />
