<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { DatePicker } from "$lib/fancy-ui/date-picker";

	const { Story } = defineMeta({
		title: "Forms/DatePicker",
		component: DatePicker,
		tags: ["autodocs"],
		args: {
			placeholder: "Pick a date",
			weekStartsOn: 1,
			disabled: false,
			required: false,
			invalid: false,
		},
		argTypes: {
			placeholder: {
				control: "text",
				description: "Shown in the trigger while no day is selected",
			},
			weekStartsOn: {
				control: "select",
				options: [0, 1],
				description: "0 for Sunday, 1 for Monday",
			},
			disabled: { control: "boolean", description: "Blocks opening the panel" },
			required: { control: "boolean", description: "Marks the field required" },
			invalid: { control: "boolean", description: "Drives the error border and aria-invalid" },
			locale: { control: "text", description: "BCP 47 locale for month/weekday/day formatting" },
		},
	});
</script>

{#snippet template(args: any)}
	<DatePicker {...args} class="w-[220px]" />
{/snippet}

<Story name="Default" {template} />

<Story name="Selected" {template} args={{ value: new Date() }} />

<Story
	name="Bounded range"
	{template}
	args={{ min: new Date(), max: new Date(Date.now() + 30 * 86400000) }}
/>

<Story
	name="Weekends disabled"
	{template}
	args={{ isDateDisabled: (date: Date) => date.getDay() === 0 || date.getDay() === 6 }}
/>

<Story name="Sunday-first week" {template} args={{ weekStartsOn: 0 }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Invalid" {template} args={{ invalid: true }} />
